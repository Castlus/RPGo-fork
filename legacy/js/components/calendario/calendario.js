// Calendário por mesa — visão jogador (leitura) + visão narrador (CRUD).
// API pública:
//   setupCalendarioUI(mesaId, isNarrador)  — wireup de modais/botões (no-op se !isNarrador)
//   carregarCalendario(mesaId, personagem) — fetch inicial + render + realtime
//
// Estado: calendarioState (mesaId, calendarioId, config, dataAtualDias, eventos[], tiposClima[], isNarrador).

import { supabase, apiGet, apiPatch, apiPost, apiDelete } from "../../utils/api.js";
import { confirmar, notificar } from "../../utils/modal-utils.js";
import {
    dataParaDias, diasParaData, fasesLua, dataRelativa
} from "../../utils/calendario-utils.js";

const calendarioState = {
    mesaId: null,
    calendarioId: null,
    config: null,
    dataAtualDias: 0,
    eventos: [],
    tiposClima: [],
    isNarrador: false,
    canal: null,
    editandoEventoId: null,
    // Mês visualizado no grid (independente da data atual)
    mesVisaoAno: null,
    mesVisaoMes: null,
    // Lista de eventos: padrão 6 dias, expandido 30 dias (frente p/ narrador, trás p/ jogador)
    expandirEventos: false
};

// Janelas (em dias, contando o atual) pra lista de eventos.
// Narrador: pra frente. Jogador: pra trás.
const JANELA_EVENTOS_PADRAO = 6;
const JANELA_EVENTOS_EXPANDIDO = 30;

// ──────────────────────────────────────────────────────────────────────────────
// SETUP UI — listeners de botões e modais. No-op pro jogador.
// ──────────────────────────────────────────────────────────────────────────────

export function setupCalendarioUI(mesaId, isNarrador) {
    calendarioState.isNarrador = !!isNarrador;

    // Botão expandir/recolher janela de eventos — serve narrador (futuro) e jogador (passado)
    document.getElementById('btnExpandirEventos')?.addEventListener('click', () => {
        calendarioState.expandirEventos = !calendarioState.expandirEventos;
        renderizar();
    });

    if (!isNarrador) return;

    // Elementos exclusivos do narrador (chip de ações no header, "+ evento", gerador climático)
    const botoesNarrador = document.getElementById('calendarioBotoesNarrador');
    if (botoesNarrador) botoesNarrador.style.display = 'inline-flex';

    const headerAcoes = document.getElementById('calEventosHeaderAcoes');
    if (headerAcoes) headerAcoes.style.display = 'inline-flex';

    const gerador = document.getElementById('calGeradorClima');
    if (gerador) gerador.style.display = 'flex';

    document.getElementById('btnDiaMenos')?.addEventListener('click', () => avancarDias(-1));
    document.getElementById('btnDiaMais') ?.addEventListener('click', () => avancarDias(+1));

    document.getElementById('btnNovoEvento')?.addEventListener('click', () => abrirModalEvento());
    document.getElementById('btnConfigCalendario')?.addEventListener('click', abrirModalConfig);
    document.getElementById('btnTiposClima')?.addEventListener('click', abrirModalTiposClima);
    document.getElementById('btnGerarClima')?.addEventListener('click', abrirModalGerarClima);

    // Edição inline do dia (estilo configurarEdicao em ficha.js)
    const elDia = document.getElementById('calDia');
    if (elDia) {
        elDia.addEventListener('click', editarDataInline);
    }

    wireupModalEvento();
    wireupModalConfig();
    wireupCustomCalendario();
    wireupModalTiposClima();
    wireupModalGerarClima();
}

// ──────────────────────────────────────────────────────────────────────────────
// CARGA + RENDER + REALTIME
// ──────────────────────────────────────────────────────────────────────────────

export async function carregarCalendario(mesaId, personagem) {
    calendarioState.mesaId = mesaId;

    const containerSemMesa = document.getElementById('calendarioSemMesa');
    const containerConteudo = document.getElementById('calendarioConteudo');

    if (!mesaId) {
        if (containerSemMesa)  containerSemMesa.style.display = 'block';
        if (containerConteudo) containerConteudo.style.display = 'none';
        return;
    }

    if (containerSemMesa)  containerSemMesa.style.display = 'none';
    if (containerConteudo) containerConteudo.style.display = 'flex';

    wireupGridNav();
    await recarregar();
    inscreverRealtime();
}

async function recarregar() {
    try {
        const d = await apiGet(`/mesas/${calendarioState.mesaId}/calendario`);
        calendarioState.calendarioId  = d.calendario.id;
        calendarioState.config        = d.calendario.config;
        calendarioState.dataAtualDias = d.calendario.dataAtualDias;
        calendarioState.eventos       = d.eventos || [];
        calendarioState.tiposClima    = d.tiposClima || [];
        renderizar();
    } catch (e) {
        console.error('Erro ao carregar calendário:', e);
    }
}

function inscreverRealtime() {
    if (calendarioState.canal) return;
    const mesaId = calendarioState.mesaId;
    const calId  = calendarioState.calendarioId;

    calendarioState.canal = supabase.channel(`calendario-${mesaId}`)
        .on('postgres_changes', {
            event: '*', schema: 'public', table: 'calendarios',
            filter: `mesa_id=eq.${mesaId}`
        }, recarregar)
        .on('postgres_changes', {
            event: '*', schema: 'public', table: 'eventos_calendario',
            filter: `calendario_id=eq.${calId}`
        }, recarregar)
        .on('postgres_changes', {
            event: '*', schema: 'public', table: 'tipos_clima',
            filter: `calendario_id=eq.${calId}`
        }, recarregar)
        .subscribe();
}

// ──────────────────────────────────────────────────────────────────────────────
// RENDER
// ──────────────────────────────────────────────────────────────────────────────

function renderizar() {
    const { config, dataAtualDias, eventos, isNarrador } = calendarioState;
    if (!config) return;

    const data = dataParaDias(dataAtualDias, config);
    setText('calAno',       data.ano);
    setText('calNomeMes',   data.nomeMes);
    setText('calDia',       data.dia);
    setText('calDiaSemana', data.diaSemana);
    setText('calEstacao',   data.estacao);

    // Sub do chip de estação: "mês X de Y" dentro da estação atual
    const estacaoAtual = config.estacoes.find(e => e.nome === data.estacao);
    if (estacaoAtual) {
        const total = mesesNaEstacao(estacaoAtual, config.meses.length);
        const pos = posicaoMesNaEstacao(data.mes, estacaoAtual, config.meses.length);
        setText('calEstacaoSub', `mês ${pos}/${total}`);
    } else {
        setText('calEstacaoSub', '—');
    }

    // Inicializa mês visualizado no atual se ainda não foi.
    if (calendarioState.mesVisaoAno == null) {
        calendarioState.mesVisaoAno = data.ano;
        calendarioState.mesVisaoMes = data.mes;
    }
    renderizarGrid();

    // Lua: emoji + nome + posição no ciclo (ex: "12/29")
    const lua = fasesLua(dataAtualDias, config.cicloLuaDias);
    const ciclo = config.cicloLuaDias || 29.5;
    const diaCiclo = Math.floor(lua.fracao * ciclo) + 1;
    setText('calLuaEmoji', lua.emoji);
    setText('calLuaNome',  lua.nome);
    setText('calLuaSub',   `${diaCiclo}/${Math.round(ciclo)}`);

    // Chip de clima: pega evento climático de hoje, se existir
    const climaHoje = eventos.find(e => e.dataDias === dataAtualDias && e.tipo === 'climatico');
    if (climaHoje) {
        const tipoClima = calendarioState.tiposClima.find(t => t.id === climaHoje.tipoClimaId);
        const icone = tipoClima?.icone || '🌤️';
        const el = document.getElementById('calClimaHoje');
        if (el) el.innerHTML = `<span>${escaparHtml(icone)}</span> ${escaparHtml(climaHoje.titulo)}`;
        setText('calClimaHojeSub', tipoClima?.nome || 'visível');
    } else {
        setText('calClimaHoje', '—');
        setText('calClimaHojeSub', 'sem registro');
    }

    // Header de eventos
    const tituloEventos = document.getElementById('calTituloEventos');
    if (tituloEventos) {
        tituloEventos.innerText = isNarrador ? 'PRÓXIMOS EVENTOS' : 'DIÁRIO DE BORDO';
    }

    const badge = document.getElementById('calVisaoBadge');
    if (badge) {
        badge.innerText = isNarrador ? 'VISÃO DO MESTRE' : 'VISÃO DO JOGADOR';
        badge.classList.toggle('narrador', !!isNarrador);
    }

    const lista = document.getElementById('calListaEventos');
    const vazio = document.getElementById('calSemEventos');
    const countEl = document.getElementById('calEventosCount');
    const btnExpandir = document.getElementById('btnExpandirEventos');
    if (!lista) return;

    if (!eventos.length) {
        lista.innerHTML = '';
        if (vazio) vazio.style.display = 'block';
        if (countEl) countEl.innerText = '0';
        if (btnExpandir) btnExpandir.style.display = 'none';
        return;
    }
    if (vazio) vazio.style.display = 'none';

    // Janela: padrão 6 dias, expandido 30. Narrador olha pra frente, jogador pra trás.
    const janela = calendarioState.expandirEventos ? JANELA_EVENTOS_EXPANDIDO : JANELA_EVENTOS_PADRAO;
    let exibidos;
    let totalNaDirecao = 0;
    if (isNarrador) {
        const limite = dataAtualDias + janela;
        const futuros = eventos.filter(e => e.dataDias >= dataAtualDias);
        totalNaDirecao = futuros.length;
        exibidos = futuros
            .filter(e => e.dataDias < limite)
            .sort((a, b) => a.dataDias - b.dataDias);
    } else {
        // Jogador: dia atual e até (janela - 1) dias anteriores. Backend já barra futuros e ocultos.
        const limite = dataAtualDias - janela;
        const passados = eventos.filter(e => e.dataDias <= dataAtualDias);
        totalNaDirecao = passados.length;
        exibidos = passados
            .filter(e => e.dataDias > limite)
            .sort((a, b) => b.dataDias - a.dataDias); // mais recente primeiro
    }

    if (countEl) countEl.innerText = String(exibidos.length);
    if (exibidos.length === 0) {
        // Hint específico pra direção da janela
        const txt = isNarrador
            ? `Nenhum evento nos próximos ${janela} dias.`
            : `Nenhum evento nos últimos ${janela} dias.`;
        lista.innerHTML = `<div class="cal-empty">${txt}</div>`;
    } else {
        lista.innerHTML = exibidos.map(ev => renderEventoRow(ev, dataAtualDias, config, isNarrador)).join('');
    }

    // Botão "Ver mais / Recolher" — aparece se há eventos além da janela atual
    if (btnExpandir) {
        const expandido = calendarioState.expandirEventos;
        const direcao = isNarrador ? 'PRÓXIMOS' : 'ÚLTIMOS';
        const foraDaJanela = totalNaDirecao > exibidos.length;
        if (expandido || foraDaJanela) {
            btnExpandir.style.display = 'flex';
            if (expandido) {
                btnExpandir.innerHTML = `<i class="fas fa-chevron-up"></i> RECOLHER (${direcao} ${JANELA_EVENTOS_PADRAO} DIAS)`;
            } else {
                const restante = totalNaDirecao - exibidos.length;
                btnExpandir.innerHTML = `<i class="fas fa-chevron-down"></i> VER ${direcao} ${JANELA_EVENTOS_EXPANDIDO} DIAS (+${restante})`;
            }
        } else {
            btnExpandir.style.display = 'none';
        }
    }

    // Sub do gerador climático (só narrador)
    const geradorSub = document.getElementById('calGeradorSub');
    if (geradorSub && isNarrador) {
        const total = calendarioState.tiposClima.length;
        geradorSub.innerText = `perfil: ${data.estacao} · ${total} tipo(s) de clima · sorteia por intervalo`;
    }

    if (isNarrador) wireupEventoActions();
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function mesesNaEstacao(estacao, totalMeses) {
    if (estacao.mesInicio <= estacao.mesFim) {
        return estacao.mesFim - estacao.mesInicio + 1;
    }
    return (totalMeses - estacao.mesInicio + 1) + estacao.mesFim;
}

function posicaoMesNaEstacao(mes, estacao, totalMeses) {
    if (estacao.mesInicio <= estacao.mesFim) {
        return mes - estacao.mesInicio + 1;
    }
    if (mes >= estacao.mesInicio) return mes - estacao.mesInicio + 1;
    return (totalMeses - estacao.mesInicio + 1) + mes;
}

// ──────────────────────────────────────────────────────────────────────────────
// GRID MENSAL
// ──────────────────────────────────────────────────────────────────────────────

function wireupGridNav() {
    document.getElementById('btnMesAnterior')?.addEventListener('click', () => mudarMes(-1));
    document.getElementById('btnMesProximo') ?.addEventListener('click', () => mudarMes(+1));
    document.getElementById('btnIrHoje')     ?.addEventListener('click', () => {
        const hoje = dataParaDias(calendarioState.dataAtualDias, calendarioState.config);
        calendarioState.mesVisaoAno = hoje.ano;
        calendarioState.mesVisaoMes = hoje.mes;
        renderizarGrid();
    });
}

function mudarMes(delta) {
    const config = calendarioState.config;
    if (!config) return;
    let mes = calendarioState.mesVisaoMes + delta;
    let ano = calendarioState.mesVisaoAno;
    if (mes < 1)                       { mes = config.meses.length; ano -= 1; }
    if (mes > config.meses.length)     { mes = 1; ano += 1; }
    calendarioState.mesVisaoAno = ano;
    calendarioState.mesVisaoMes = mes;
    renderizarGrid();
}

function renderizarGrid() {
    const { config, dataAtualDias, mesVisaoAno, mesVisaoMes, eventos, isNarrador } = calendarioState;
    if (!config || mesVisaoAno == null) return;

    // Header de dias da semana
    const wkContainer = document.getElementById('calGridWeekdays');
    if (wkContainer) {
        wkContainer.innerHTML = config.diasSemana
            .map(d => `<div>${escaparHtml((d || '').slice(0, 3))}</div>`)
            .join('');
    }

    // Título do mês (split em nome + ano)
    const nomeMes = config.meses[mesVisaoMes - 1]?.nome || '?';
    setText('calMesVisaoNome', nomeMes);
    setText('calMesVisaoAno', mesVisaoAno);

    // Monta células do grid
    const grid = document.getElementById('calGrid');
    if (!grid) return;

    const diasMes = config.meses[mesVisaoMes - 1].dias;
    const primeiroDias = diasParaData({ ano: mesVisaoAno, mes: mesVisaoMes, dia: 1 }, config);
    const semanaLen = config.diasSemana.length;
    const offset = (((config.diaSemanaEpoch ?? 0) + primeiroDias) % semanaLen + semanaLen) % semanaLen;

    // Indexa eventos por dataDias
    const porDia = new Map();
    for (const e of eventos) {
        if (!porDia.has(e.dataDias)) porDia.set(e.dataDias, []);
        porDia.get(e.dataDias).push(e);
    }

    let html = '';
    // Padding inicial
    for (let i = 0; i < offset; i++) {
        html += `<div class="cal-dia cal-dia-vazio"></div>`;
    }
    for (let d = 1; d <= diasMes; d++) {
        const dataDias = diasParaData({ ano: mesVisaoAno, mes: mesVisaoMes, dia: d }, config);
        const isHoje = dataDias === dataAtualDias;
        const isPassado = dataDias < dataAtualDias;
        const isFuturo  = dataDias > dataAtualDias;
        const eventosDia = porDia.get(dataDias) || [];

        const classes = ['cal-dia'];
        if (isHoje) classes.push('cal-dia-hoje');
        else if (isPassado) classes.push('cal-dia-passado');
        else if (isNarrador && isFuturo) classes.push('cal-dia-futuro-narrador');

        const climatico = eventosDia.find(e => e.tipo === 'climatico');
        const narrativo = eventosDia.find(e => e.tipo === 'narrativo');
        const narrativos = eventosDia.filter(e => e.tipo === 'narrativo');

        const iconeClima = climatico
            ? escaparHtml(calendarioState.tiposClima.find(t => t.id === climatico.tipoClimaId)?.icone || '🌤️')
            : '';

        // Row 1: dia + ícone de clima
        const topoHtml = `
            <div class="cal-dia-topo">
                <span class="cal-dia-num">${String(d).padStart(2, '0')}</span>
                ${iconeClima ? `<span class="cal-dia-icone-clima">${iconeClima}</span>` : ''}
            </div>
        `;

        // Row 2: 1 evento narrativo (mais relevante), truncado
        let meioHtml = '<div class="cal-dia-evento-meio">';
        if (narrativo) {
            const cls = isFuturo ? 'evento-mini-narrativo evento-mini-futuro' : 'evento-mini-narrativo';
            meioHtml += `
                <div class="cal-dia-evento-mini ${cls}">
                    <span class="cal-dia-evento-dot"></span>
                    <span>${escaparHtml(narrativo.titulo)}</span>
                </div>
            `;
        }
        meioHtml += '</div>';

        // Row 3: emoji da lua + contagem de eventos extras
        const luaDia = fasesLua(dataDias, config.cicloLuaDias);
        const extras = narrativos.length > 1 ? `+${narrativos.length - 1}` : '';
        const baseHtml = `
            <div class="cal-dia-base">
                <span class="cal-dia-lua" title="${escaparHtml(luaDia.nome)}">${luaDia.emoji}</span>
                ${extras ? `<span class="cal-dia-extras">${extras}</span>` : ''}
            </div>
        `;

        html += `
            <div class="${classes.join(' ')}" data-dias="${dataDias}">
                ${topoHtml}
                ${meioHtml}
                ${baseHtml}
            </div>
        `;
    }
    grid.innerHTML = html;

    // Narrador pode clicar num dia pra setar como data atual (ou abrir editor de evento).
    if (isNarrador) {
        grid.querySelectorAll('.cal-dia:not(.cal-dia-vazio)').forEach(el => {
            el.addEventListener('click', () => {
                const dias = Number(el.getAttribute('data-dias'));
                if (Number.isFinite(dias)) setarDataAtual(dias);
            });
        });
    }
}

function renderEventoRow(ev, refDias, config, isNarrador) {
    const futuro = ev.dataDias > refDias;
    const tipoClima = ev.tipoClimaId
        ? calendarioState.tiposClima.find(t => t.id === ev.tipoClimaId)
        : null;
    const icone = ev.tipo === 'climatico'
        ? (tipoClima?.icone || '🌤️')
        : '📜';
    const data = dataParaDias(ev.dataDias, config);
    const rel = dataRelativa(ev.dataDias, refDias);
    const tipoLabel = ev.tipo === 'climatico' ? 'CLIMA' : 'NARRATIVO';
    const tipoClass = ev.tipo === 'climatico' ? 'tipo-climatico' : 'tipo-narrativo';

    // Status: OCULTO (sempre escondido pro jogador) > AGENDADO (futuro) > VISÍVEL
    let statusHtml;
    if (ev.oculto) {
        statusHtml = '<span class="cal-evento-oculto-tag"><i class="fas fa-eye-slash"></i> OCULTO</span>';
    } else if (futuro) {
        statusHtml = '<span class="cal-evento-status status-futuro">AGENDADO</span>';
    } else {
        statusHtml = '<span class="cal-evento-status status-visivel">VISÍVEL</span>';
    }

    const acoes = isNarrador ? `
        <div class="cal-evento-acoes">
            <i class="fas fa-edit cal-acao-edit" data-id="${ev.id}" title="Editar"></i>
            <i class="fas fa-trash cal-acao-delete" data-id="${ev.id}" title="Excluir"></i>
        </div>
    ` : '';

    const rowClasses = ['cal-evento-row'];
    if (futuro) rowClasses.push('cal-evento-futuro');
    if (ev.oculto) rowClasses.push('cal-evento-oculto-row');

    return `
        <div class="${rowClasses.join(' ')}">
            <div class="cal-evento-dia">
                <span class="cal-evento-dia-num">${String(data.dia).padStart(2, '0')}</span>
                <span class="cal-evento-dia-rel">${escaparHtml(rel)}</span>
            </div>
            <div class="cal-evento-corpo">
                <div class="cal-evento-titulo-linha">
                    <span class="cal-evento-icone-inline">${escaparHtml(icone)}</span>
                    <span class="cal-evento-titulo">${escaparHtml(ev.titulo)}</span>
                </div>
                <div class="cal-evento-meta">
                    <span class="cal-evento-tipo-tag ${tipoClass}">${tipoLabel}</span>
                    <span>${escaparHtml(data.nomeMes)}, ano ${data.ano}</span>
                </div>
                ${ev.descricao ? `<div class="cal-evento-descricao">${escaparHtml(ev.descricao)}</div>` : ''}
            </div>
            ${statusHtml}
            ${acoes}
        </div>
    `;
}

function escaparHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

// ──────────────────────────────────────────────────────────────────────────────
// AÇÕES DO NARRADOR — avançar data, edição inline
// ──────────────────────────────────────────────────────────────────────────────

// Aplica mudança local + renderiza imediato. Em paralelo envia ao servidor; se falhar, reverte.
// Mantém a UI fluida mesmo em conexões lentas.
function mutacaoOtimista({ aplicar, reverter, executar, onErro }) {
    aplicar();
    renderizar();
    executar().catch(e => {
        console.error(e);
        reverter();
        renderizar();
        if (onErro) onErro(e);
        else notificar('Erro', 'Não foi possível salvar a mudança. Foi revertido.');
    });
}

function setarDataAtual(novosDias) {
    const antes = calendarioState.dataAtualDias;
    if (antes === novosDias) return;
    mutacaoOtimista({
        aplicar:  () => { calendarioState.dataAtualDias = novosDias; },
        reverter: () => { calendarioState.dataAtualDias = antes; },
        executar: () => apiPatch(`/mesas/${calendarioState.mesaId}/calendario`, { dataAtualDias: novosDias })
    });
}

function avancarDias(delta) {
    setarDataAtual(calendarioState.dataAtualDias + delta);
}

function editarDataInline() {
    const spanDia = document.getElementById('calDia');
    if (!spanDia) return;
    const valorAtual = spanDia.innerText;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = '';
    input.placeholder = valorAtual;
    input.className = 'input-edit-stat';
    spanDia.parentNode.replaceChild(input, spanDia);
    input.focus();

    const salvar = () => {
        const entrada = input.value.trim();
        if (input.parentNode) input.parentNode.replaceChild(spanDia, input);
        if (entrada === '') return;

        const config = calendarioState.config;
        const atual = dataParaDias(calendarioState.dataAtualDias, config);
        let novoDia;
        if (entrada.startsWith('+') || entrada.startsWith('-')) {
            avancarDias(Number(entrada));
            return;
        }
        novoDia = Number(entrada);
        if (!Number.isFinite(novoDia) || novoDia < 1) return;
        const diasMes = config.meses[atual.mes - 1].dias;
        if (novoDia > diasMes) novoDia = diasMes;

        const novoDias = diasParaData({ ano: atual.ano, mes: atual.mes, dia: novoDia }, config);
        setarDataAtual(novoDias);
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { salvar(); input.blur(); } });
    input.addEventListener('blur', salvar, { once: true });
}

// ──────────────────────────────────────────────────────────────────────────────
// MODAL EVENTO
// ──────────────────────────────────────────────────────────────────────────────

function abrirModalEvento(evento = null) {
    const config = calendarioState.config;
    if (!config) return;

    calendarioState.editandoEventoId = evento?.id || null;

    document.getElementById('modalEventoTitulo').innerText = evento ? 'Editar Evento' : 'Novo Evento';
    document.getElementById('eventoTipo').value = evento?.tipo || 'narrativo';
    document.getElementById('eventoTitulo').value = evento?.titulo || '';
    document.getElementById('eventoDescricao').value = evento?.descricao || '';
    document.getElementById('eventoOculto').checked = !!evento?.oculto;

    const refDias = evento ? evento.dataDias : calendarioState.dataAtualDias;
    const ref = dataParaDias(refDias, config);
    document.getElementById('eventoAno').value = ref.ano;
    document.getElementById('eventoMes').value = ref.mes;
    document.getElementById('eventoDia').value = ref.dia;

    atualizarSelectTipoClima(evento?.tipoClimaId || null);
    atualizarWrapperTipoClima();

    document.getElementById('modalEvento').style.display = 'flex';
}

function atualizarSelectTipoClima(selecionadoId) {
    const select = document.getElementById('eventoTipoClima');
    if (!select) return;
    select.innerHTML = calendarioState.tiposClima.map(t =>
        `<option value="${t.id}" ${selecionadoId === t.id ? 'selected' : ''}>${escaparHtml(t.nome)}</option>`
    ).join('');
}

function atualizarWrapperTipoClima() {
    const wrapper = document.getElementById('eventoTipoClimaWrapper');
    const tipo = document.getElementById('eventoTipo').value;
    if (wrapper) wrapper.style.display = (tipo === 'climatico') ? 'block' : 'none';
}

function wireupModalEvento() {
    document.getElementById('eventoTipo')?.addEventListener('change', atualizarWrapperTipoClima);
    document.getElementById('btnFecharEvento')?.addEventListener('click', () => {
        document.getElementById('modalEvento').style.display = 'none';
    });

    const btnSalvar = document.getElementById('btnSalvarEvento');
    if (!btnSalvar) return;
    const novo = btnSalvar.cloneNode(true);
    btnSalvar.parentNode.replaceChild(novo, btnSalvar);
    novo.addEventListener('click', salvarEvento);
}

function salvarEvento() {
    const config = calendarioState.config;
    const titulo = document.getElementById('eventoTitulo').value.trim();
    if (!titulo) { notificar('Campo obrigatório', 'Título é obrigatório.'); return; }

    const tipo = document.getElementById('eventoTipo').value;
    const descricao = document.getElementById('eventoDescricao').value;
    const oculto = document.getElementById('eventoOculto').checked;
    const ano = Number(document.getElementById('eventoAno').value);
    const mes = Number(document.getElementById('eventoMes').value);
    const dia = Number(document.getElementById('eventoDia').value);
    if (!Number.isFinite(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
        notificar('Data inválida', 'Preencha ano, mês e dia.'); return;
    }
    const dataDias = diasParaData({ ano, mes, dia }, config);
    const tipoClimaId = tipo === 'climatico'
        ? (document.getElementById('eventoTipoClima').value || null)
        : null;

    const corpo = { tipo, titulo, descricao, dataDias, tipoClimaId, oculto };
    const editandoId = calendarioState.editandoEventoId;
    document.getElementById('modalEvento').style.display = 'none';

    if (editandoId) {
        // Update otimista: troca no array local
        const idx = calendarioState.eventos.findIndex(e => e.id === editandoId);
        if (idx === -1) { notificar('Erro', 'Evento não encontrado.'); return; }
        const antes = calendarioState.eventos[idx];
        const depois = { ...antes, ...corpo };
        mutacaoOtimista({
            aplicar:  () => { calendarioState.eventos[idx] = depois; },
            reverter: () => { calendarioState.eventos[idx] = antes; },
            executar: () => apiPatch(`/mesas/${calendarioState.mesaId}/calendario/eventos/${editandoId}`, corpo),
            onErro:   () => notificar('Erro', 'Não foi possível salvar o evento.')
        });
    } else {
        // Insert otimista com ID temporário; substitui pelo real quando o servidor responder
        const tempId = `tmp-${crypto.randomUUID()}`;
        const novo = { id: tempId, ...corpo, criadoEm: new Date().toISOString() };
        calendarioState.eventos.push(novo);
        renderizar();
        apiPost(`/mesas/${calendarioState.mesaId}/calendario/eventos`, corpo)
            .then(real => {
                const i = calendarioState.eventos.findIndex(e => e.id === tempId);
                if (i !== -1) calendarioState.eventos[i] = real;
                renderizar();
            })
            .catch(e => {
                console.error(e);
                calendarioState.eventos = calendarioState.eventos.filter(e => e.id !== tempId);
                renderizar();
                notificar('Erro', 'Não foi possível salvar o evento.');
            });
    }
}

function wireupEventoActions() {
    document.querySelectorAll('.cal-acao-edit').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-id');
            const ev = calendarioState.eventos.find(e => e.id === id);
            if (ev) abrirModalEvento(ev);
        });
    });
    document.querySelectorAll('.cal-acao-delete').forEach(el => {
        el.addEventListener('click', async () => {
            const id = el.getAttribute('data-id');
            const ok = await confirmar('Excluir evento', 'Tem certeza que quer apagar este evento?', 'Excluir', 'Cancelar');
            if (!ok) return;

            // Delete otimista: remove local e restaura se servidor recusar
            const idx = calendarioState.eventos.findIndex(e => e.id === id);
            if (idx === -1) return;
            const removido = calendarioState.eventos[idx];
            mutacaoOtimista({
                aplicar:  () => { calendarioState.eventos.splice(idx, 1); },
                reverter: () => { calendarioState.eventos.splice(idx, 0, removido); },
                executar: () => apiDelete(`/mesas/${calendarioState.mesaId}/calendario/eventos/${id}`),
                onErro:   () => notificar('Erro', 'Não foi possível excluir o evento.')
            });
        });
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// MODAL CONFIG (template + custom)
// ──────────────────────────────────────────────────────────────────────────────

function abrirModalConfig() {
    document.getElementById('modalConfigCalendario').style.display = 'flex';
    // Default tab: a mais usada (data atual)
    selecionarTabConfig('cal-tab-data');
    preencherDataAtualFromState();
    preencherCustomFromState();
}

function preencherDataAtualFromState() {
    const c = calendarioState.config;
    if (!c) return;
    const data = dataParaDias(calendarioState.dataAtualDias, c);

    // Popula select de meses com os nomes do config atual
    const selMes = document.getElementById('dataAtualMes');
    if (selMes) {
        selMes.innerHTML = c.meses.map((m, i) =>
            `<option value="${i + 1}" ${data.mes === i + 1 ? 'selected' : ''}>${escaparHtml(m.nome)}</option>`
        ).join('');
    }

    document.getElementById('dataAtualAno').value = data.ano;
    document.getElementById('dataAtualDia').value = data.dia;
}

// Cache local pra edição da aba "Customizar" — sai do calendarioState.config (clone) e
// vira o payload do save. Permite remover/adicionar/editar sem texto técnico.
let customEdit = null;

function preencherCustomFromState() {
    const c = calendarioState.config;
    if (!c) return;
    customEdit = {
        meses: c.meses.map(m => ({ nome: m.nome, dias: m.dias })),
        diasSemana: [...c.diasSemana],
        estacoes: c.estacoes.map(e => ({ nome: e.nome, mesInicio: e.mesInicio, mesFim: e.mesFim }))
    };
    renderCustomMeses();
    renderCustomDiasSemana();
    renderCustomEstacoes();
    document.getElementById('customCicloLua').value        = c.cicloLuaDias;
    document.getElementById('customDiaSemanaEpoch').value  = c.diaSemanaEpoch ?? 0;
    document.getElementById('customAnoEpoch').value        = c.anoEpoch ?? 1;
}

// ─── Custom: Meses ────────────────────────────────────────────────────────────

function renderCustomMeses() {
    const container = document.getElementById('customMesesLista');
    const count = document.getElementById('customMesesCount');
    if (!container) return;
    const totalDias = customEdit.meses.reduce((s, m) => s + (Number(m.dias) || 0), 0);
    if (count) count.innerText = `${customEdit.meses.length} ${customEdit.meses.length === 1 ? 'mês' : 'meses'} · ${totalDias} dias no ano`;

    container.innerHTML = customEdit.meses.map((m, idx) => `
        <div class="cal-mes-row" data-idx="${idx}">
            <div class="cal-mes-numero">${idx + 1}</div>
            <input type="text" class="cal-mes-nome-input" data-campo="nome" data-idx="${idx}"
                   value="${escaparHtml(m.nome)}" placeholder="Nome do mês">
            <input type="number" class="cal-mes-dias-input" data-campo="dias" data-idx="${idx}"
                   value="${m.dias}" min="1" max="365" title="Dias no mês">
            <button type="button" class="cal-row-delete-btn" data-idx="${idx}" title="Remover">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            const idx = Number(input.getAttribute('data-idx'));
            const campo = input.getAttribute('data-campo');
            if (campo === 'dias') {
                customEdit.meses[idx].dias = Math.max(1, Math.floor(Number(input.value) || 1));
                // só re-renderiza o count, não a lista (preserva foco)
                const totalDias = customEdit.meses.reduce((s, m) => s + (Number(m.dias) || 0), 0);
                if (count) count.innerText = `${customEdit.meses.length} ${customEdit.meses.length === 1 ? 'mês' : 'meses'} · ${totalDias} dias no ano`;
            } else {
                customEdit.meses[idx].nome = input.value;
            }
        });
    });

    container.querySelectorAll('.cal-row-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.getAttribute('data-idx'));
            customEdit.meses.splice(idx, 1);
            // Estações podem ter mesInicio/Fim apontando pra mês removido — recalibra
            for (const e of customEdit.estacoes) {
                if (e.mesInicio > customEdit.meses.length) e.mesInicio = Math.max(1, customEdit.meses.length);
                if (e.mesFim    > customEdit.meses.length) e.mesFim    = Math.max(1, customEdit.meses.length);
            }
            renderCustomMeses();
            renderCustomEstacoes();
        });
    });
}

// ─── Custom: Dias da semana ───────────────────────────────────────────────────

function renderCustomDiasSemana() {
    const container = document.getElementById('customDiasSemanaTags');
    if (!container) return;
    container.innerHTML = customEdit.diasSemana.map((d, idx) => `
        <span class="cal-tag" data-idx="${idx}">
            <span class="cal-tag-numero">${idx}</span>
            ${escaparHtml(d)}
            <button type="button" class="cal-tag-remove" data-idx="${idx}" title="Remover">
                <i class="fas fa-times"></i>
            </button>
        </span>
    `).join('');

    container.querySelectorAll('.cal-tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.getAttribute('data-idx'));
            customEdit.diasSemana.splice(idx, 1);
            renderCustomDiasSemana();
        });
    });
}

// ─── Custom: Estações ─────────────────────────────────────────────────────────

function renderCustomEstacoes() {
    const container = document.getElementById('customEstacoesLista');
    if (!container) return;
    const opcoesMes = customEdit.meses.map((m, i) =>
        `<option value="${i + 1}">${i + 1}. ${escaparHtml(m.nome)}</option>`
    ).join('');

    container.innerHTML = customEdit.estacoes.map((e, idx) => {
        const cruza = Number(e.mesInicio) > Number(e.mesFim);
        return `
            <div class="cal-estacao-row" data-idx="${idx}">
                <input type="text" class="cal-estacao-input" data-campo="nome" data-idx="${idx}"
                       value="${escaparHtml(e.nome)}" placeholder="Nome">
                <select class="cal-estacao-input" data-campo="mesInicio" data-idx="${idx}" title="Mês de início">${opcoesMes}</select>
                <select class="cal-estacao-input" data-campo="mesFim" data-idx="${idx}" title="Mês de fim">${opcoesMes}</select>
                <button type="button" class="cal-row-delete-btn" data-idx="${idx}" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
                ${cruza ? `<span class="cal-estacao-cruza"><i class="fas fa-arrow-rotate-right"></i> cruza a virada do ano</span>` : ''}
            </div>
        `;
    }).join('');

    // Setar selects com valor correto
    customEdit.estacoes.forEach((e, idx) => {
        const ini = container.querySelector(`select[data-campo="mesInicio"][data-idx="${idx}"]`);
        const fim = container.querySelector(`select[data-campo="mesFim"][data-idx="${idx}"]`);
        if (ini) ini.value = e.mesInicio;
        if (fim) fim.value = e.mesFim;
    });

    container.querySelectorAll('input.cal-estacao-input').forEach(input => {
        input.addEventListener('input', () => {
            const idx = Number(input.getAttribute('data-idx'));
            customEdit.estacoes[idx].nome = input.value;
        });
    });
    container.querySelectorAll('select.cal-estacao-input').forEach(sel => {
        sel.addEventListener('change', () => {
            const idx = Number(sel.getAttribute('data-idx'));
            const campo = sel.getAttribute('data-campo');
            customEdit.estacoes[idx][campo] = Number(sel.value);
            renderCustomEstacoes(); // re-renderiza pra atualizar o "cruza ano"
        });
    });

    container.querySelectorAll('.cal-row-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.getAttribute('data-idx'));
            customEdit.estacoes.splice(idx, 1);
            renderCustomEstacoes();
        });
    });
}

function selecionarTabConfig(targetId) {
    document.querySelectorAll('.cal-tab-modal').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-target') === targetId);
    });
    ['cal-tab-data', 'cal-tab-template', 'cal-tab-custom'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === targetId) ? 'flex' : 'none';
    });
}

let templateSelecionado = null;

function wireupModalConfig() {
    document.querySelectorAll('.cal-tab-modal').forEach(t => {
        t.addEventListener('click', () => selecionarTabConfig(t.getAttribute('data-target')));
    });
    document.querySelectorAll('.cal-template-card').forEach(card => {
        card.addEventListener('click', () => {
            templateSelecionado = card.getAttribute('data-template');
            document.querySelectorAll('.cal-template-card').forEach(c => c.classList.remove('selecionado'));
            card.classList.add('selecionado');
        });
    });
    document.getElementById('btnFecharConfig')?.addEventListener('click', () => {
        document.getElementById('modalConfigCalendario').style.display = 'none';
        templateSelecionado = null;
    });
    const btnSalvar = document.getElementById('btnSalvarConfig');
    if (!btnSalvar) return;
    const novo = btnSalvar.cloneNode(true);
    btnSalvar.parentNode.replaceChild(novo, btnSalvar);
    novo.addEventListener('click', salvarConfig);
}

async function salvarConfig() {
    const tabAtiva = document.querySelector('.cal-tab-modal.active')?.getAttribute('data-target');
    try {
        if (tabAtiva === 'cal-tab-data') {
            const ano = Number(document.getElementById('dataAtualAno').value);
            const mes = Number(document.getElementById('dataAtualMes').value);
            const dia = Number(document.getElementById('dataAtualDia').value);
            if (!Number.isFinite(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
                notificar('Data inválida', 'Preencha ano, mês e dia.');
                return;
            }
            const config = calendarioState.config;
            const diasMes = config.meses[mes - 1]?.dias;
            if (!diasMes) { notificar('Mês inválido', 'Selecione um mês válido.'); return; }
            const diaClamp = Math.max(1, Math.min(dia, diasMes));
            const novosDias = diasParaData({ ano, mes, dia: diaClamp }, config);

            document.getElementById('modalConfigCalendario').style.display = 'none';
            setarDataAtual(novosDias); // otimista
            return;
        }
        if (tabAtiva === 'cal-tab-template') {
            if (!templateSelecionado) {
                notificar('Selecione um template', 'Clique em um dos cards de template.');
                return;
            }
            const resetar = document.getElementById('chkResetarTipos').checked;
            await apiPost(`/mesas/${calendarioState.mesaId}/calendario/aplicar-template`, {
                template: templateSelecionado,
                resetarTiposClima: resetar
            });
        } else {
            const config = lerCustomConfig();
            if (!config) return; // erro já notificado
            await apiPatch(`/mesas/${calendarioState.mesaId}/calendario`, { config });
        }
        document.getElementById('modalConfigCalendario').style.display = 'none';
        templateSelecionado = null;
        await recarregar();
    } catch (e) {
        console.error(e);
        notificar('Erro', 'Não foi possível salvar a configuração.');
    }
}

function lerCustomConfig() {
    if (!customEdit) return null;

    // Sanitiza nomes/dias dos meses
    const meses = customEdit.meses
        .map(m => ({ nome: (m.nome || '').trim(), dias: Math.max(1, Math.floor(Number(m.dias) || 0)) }))
        .filter(m => m.nome && m.dias > 0);

    const diasSemana = customEdit.diasSemana.map(d => (d || '').trim()).filter(Boolean);

    // Valida estações: mesInicio e mesFim precisam estar no range dos meses
    const totalMeses = meses.length;
    const estacoes = customEdit.estacoes
        .map(e => ({
            nome: (e.nome || '').trim(),
            mesInicio: Number(e.mesInicio),
            mesFim:    Number(e.mesFim)
        }))
        .filter(e => e.nome
            && Number.isInteger(e.mesInicio) && e.mesInicio >= 1 && e.mesInicio <= totalMeses
            && Number.isInteger(e.mesFim)    && e.mesFim    >= 1 && e.mesFim    <= totalMeses);

    const cicloLuaDias   = Number(document.getElementById('customCicloLua').value);
    const diaSemanaEpoch = Number(document.getElementById('customDiaSemanaEpoch').value);
    const anoEpoch       = Number(document.getElementById('customAnoEpoch').value);

    if (!meses.length) {
        notificar('Configuração inválida', 'Adicione pelo menos um mês.'); return null;
    }
    if (!diasSemana.length) {
        notificar('Configuração inválida', 'Adicione pelo menos um dia da semana.'); return null;
    }
    if (!estacoes.length) {
        notificar('Configuração inválida', 'Adicione pelo menos uma estação válida.'); return null;
    }
    if (!(cicloLuaDias > 0)) {
        notificar('Configuração inválida', 'Ciclo lunar deve ser maior que 0.'); return null;
    }
    return { meses, diasSemana, estacoes, cicloLuaDias, diaSemanaEpoch, anoEpoch };
}

function wireupCustomCalendario() {
    document.getElementById('btnAddMes')?.addEventListener('click', () => {
        if (!customEdit) return;
        const n = customEdit.meses.length + 1;
        customEdit.meses.push({ nome: `Mês ${n}`, dias: 30 });
        renderCustomMeses();
        renderCustomEstacoes(); // selects de mês mudaram
    });

    const inputDia = document.getElementById('customDiaSemanaInput');
    document.getElementById('btnAddDiaSemana')?.addEventListener('click', () => {
        if (!customEdit) return;
        const nome = (inputDia?.value || '').trim();
        if (!nome) return;
        customEdit.diasSemana.push(nome);
        inputDia.value = '';
        renderCustomDiasSemana();
    });
    inputDia?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btnAddDiaSemana')?.click();
        }
    });

    document.getElementById('btnAddEstacao')?.addEventListener('click', () => {
        if (!customEdit) return;
        customEdit.estacoes.push({ nome: 'Nova estação', mesInicio: 1, mesFim: 1 });
        renderCustomEstacoes();
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// MODAL TIPOS DE CLIMA
// ──────────────────────────────────────────────────────────────────────────────

function abrirModalTiposClima() {
    document.getElementById('modalTiposClima').style.display = 'flex';
    renderizarTiposClima();
    renderizarPesosNovoTipo();
}

const PESOS_PRESET = [0, 1, 2, 3, 5];

function renderPilulasPeso(valor, estacao, tipoId) {
    const v = Number(valor) || 0;
    const ehPreset = PESOS_PRESET.includes(v);
    const labelZero = '—';
    const pilulas = PESOS_PRESET.map(p => {
        const ativo = p === v;
        const cls = ['cal-peso-pilula'];
        if (ativo) cls.push(p === 0 ? 'ativo-0' : 'ativo');
        return `<button type="button" class="${cls.join(' ')}" data-tipo-id="${tipoId}" data-estacao="${escaparHtml(estacao)}" data-valor="${p}">${p === 0 ? labelZero : p}</button>`;
    }).join('');
    const inputVal = ehPreset ? '' : v;
    return `
        ${pilulas}
        <input type="number" min="0" class="cal-peso-pilula-custom"
               data-tipo-id="${tipoId}" data-estacao="${escaparHtml(estacao)}"
               value="${inputVal}" placeholder="…" title="Valor customizado">
    `;
}

function renderTipoCard(t) {
    const estacoes = calendarioState.config.estacoes;
    return `
        <div class="cal-tipo-item" data-id="${t.id}">
            <div class="cal-tipo-cabecalho">
                <input type="text" class="cal-tipo-icone-input" data-campo="icone" data-id="${t.id}"
                       value="${escaparHtml(t.icone || '')}" placeholder="🌤️" maxlength="4">
                <div class="cal-tipo-nome-bloco">
                    <input type="text" class="cal-tipo-nome-input" data-campo="nome" data-id="${t.id}"
                           value="${escaparHtml(t.nome || '')}" placeholder="Nome do clima">
                    <input type="text" class="cal-tipo-descricao-input" data-campo="descricao" data-id="${t.id}"
                           value="${escaparHtml(t.descricao || '')}" placeholder="Descrição (opcional)">
                </div>
                <button type="button" class="cal-tipo-delete-btn" data-id="${t.id}" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="cal-tipo-pesos">
                <div class="cal-tipo-pesos-titulo">FREQUÊNCIA POR ESTAÇÃO</div>
                ${estacoes.map(e => `
                    <div class="cal-tipo-peso-row">
                        <span class="cal-tipo-peso-label">${escaparHtml(e.nome)}</span>
                        <div class="cal-tipo-peso-pilulas">
                            ${renderPilulasPeso(t.pesosPorEstacao?.[e.nome], e.nome, t.id)}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderizarTiposClima() {
    const container = document.getElementById('listaTiposClima');
    if (!container) return;
    if (!calendarioState.tiposClima.length) {
        container.innerHTML = '<div class="cal-empty">Nenhum tipo cadastrado. Use o botão abaixo pra criar o primeiro.</div>';
        return;
    }
    container.innerHTML = calendarioState.tiposClima.map(renderTipoCard).join('');

    // Delete
    container.querySelectorAll('.cal-tipo-delete-btn').forEach(el => {
        el.addEventListener('click', async () => {
            const id = el.getAttribute('data-id');
            const ok = await confirmar('Excluir tipo de clima', 'Eventos antigos vão perder a referência (mas não serão apagados). Continuar?', 'Excluir', 'Cancelar');
            if (!ok) return;

            const idx = calendarioState.tiposClima.findIndex(t => t.id === id);
            if (idx === -1) return;
            const removido = calendarioState.tiposClima[idx];
            mutacaoOtimista({
                aplicar:  () => {
                    calendarioState.tiposClima.splice(idx, 1);
                    renderizarTiposClima();
                },
                reverter: () => {
                    calendarioState.tiposClima.splice(idx, 0, removido);
                    renderizarTiposClima();
                },
                executar: () => apiDelete(`/mesas/${calendarioState.mesaId}/calendario/tipos-clima/${id}`),
                onErro:   () => notificar('Erro', 'Não foi possível excluir o tipo.')
            });
        });
    });

    // Edição inline de nome/ícone/descrição — salva no blur ou Enter
    container.querySelectorAll('.cal-tipo-nome-input, .cal-tipo-icone-input, .cal-tipo-descricao-input').forEach(input => {
        const salvar = () => {
            const id = input.getAttribute('data-id');
            const campo = input.getAttribute('data-campo');
            const tipo = calendarioState.tiposClima.find(t => t.id === id);
            if (!tipo) return;
            const valorAntes = tipo[campo];
            const valorDepois = input.value.trim() || null;
            if (valorAntes === valorDepois) return;
            // Nome obrigatório
            if (campo === 'nome' && !valorDepois) {
                input.value = valorAntes || '';
                notificar('Campo obrigatório', 'Nome do tipo não pode ficar vazio.');
                return;
            }
            mutacaoOtimista({
                aplicar:  () => { tipo[campo] = valorDepois; },
                reverter: () => { tipo[campo] = valorAntes; input.value = valorAntes || ''; },
                executar: () => apiPatch(`/mesas/${calendarioState.mesaId}/calendario/tipos-clima/${id}`, {
                    [campo]: valorDepois
                }),
                onErro:   () => notificar('Erro', 'Não foi possível salvar a alteração.')
            });
        };
        input.addEventListener('blur', salvar);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
    });

    // Pílulas de peso (presets)
    container.querySelectorAll('.cal-peso-pilula').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-tipo-id');
            const estacao = btn.getAttribute('data-estacao');
            const valor = Number(btn.getAttribute('data-valor'));
            atualizarPesoTipo(id, estacao, valor);
        });
    });

    // Input custom de peso
    container.querySelectorAll('.cal-peso-pilula-custom').forEach(input => {
        input.addEventListener('change', () => {
            const id = input.getAttribute('data-tipo-id');
            const estacao = input.getAttribute('data-estacao');
            const valor = Math.max(0, Math.floor(Number(input.value) || 0));
            atualizarPesoTipo(id, estacao, valor);
        });
    });
}

function atualizarPesoTipo(tipoId, estacao, valorDepois) {
    const tipo = calendarioState.tiposClima.find(t => t.id === tipoId);
    if (!tipo) return;
    const pesosAntes = { ...(tipo.pesosPorEstacao || {}) };
    const pesosDepois = { ...pesosAntes, [estacao]: valorDepois };
    if (pesosAntes[estacao] === valorDepois) return;
    // Atualiza só o row do peso (não re-renderiza a lista inteira pra preservar foco)
    mutacaoOtimista({
        aplicar:  () => {
            tipo.pesosPorEstacao = pesosDepois;
            atualizarUIPesoRow(tipoId, estacao, valorDepois);
        },
        reverter: () => {
            tipo.pesosPorEstacao = pesosAntes;
            atualizarUIPesoRow(tipoId, estacao, pesosAntes[estacao] || 0);
        },
        executar: () => apiPatch(`/mesas/${calendarioState.mesaId}/calendario/tipos-clima/${tipoId}`, {
            pesosPorEstacao: pesosDepois
        }),
        onErro:   () => notificar('Erro', 'Não foi possível salvar o peso.')
    });
}

function atualizarUIPesoRow(tipoId, estacao, valor) {
    const seletor = `[data-tipo-id="${tipoId}"][data-estacao="${CSS.escape(estacao)}"]`;
    const card = document.querySelector(`.cal-tipo-item[data-id="${tipoId}"]`);
    if (!card) return;
    card.querySelectorAll(`.cal-peso-pilula${seletor}`).forEach(btn => {
        const v = Number(btn.getAttribute('data-valor'));
        btn.classList.remove('ativo', 'ativo-0');
        if (v === valor) btn.classList.add(v === 0 ? 'ativo-0' : 'ativo');
    });
    const input = card.querySelector(`input.cal-peso-pilula-custom${seletor}`);
    if (input) {
        input.value = PESOS_PRESET.includes(valor) ? '' : valor;
    }
}

function renderizarPesosNovoTipo() {
    const container = document.getElementById('novoTipoPesos');
    if (!container || !calendarioState.config) return;
    container.innerHTML = `
        <div class="cal-tipo-pesos">
            <div class="cal-tipo-pesos-titulo">FREQUÊNCIA POR ESTAÇÃO</div>
            ${calendarioState.config.estacoes.map(e => `
                <div class="cal-tipo-peso-row">
                    <span class="cal-tipo-peso-label">${escaparHtml(e.nome)}</span>
                    <div class="cal-tipo-peso-pilulas">
                        ${PESOS_PRESET.map(p => {
                            const ativo = p === 0;
                            const cls = ['cal-peso-pilula', 'novoTipoPesoPilula'];
                            if (ativo) cls.push('ativo-0');
                            return `<button type="button" class="${cls.join(' ')}" data-estacao="${escaparHtml(e.nome)}" data-valor="${p}">${p === 0 ? '—' : p}</button>`;
                        }).join('')}
                        <input type="number" min="0" class="cal-peso-pilula-custom novoTipoPesoCustom"
                               data-estacao="${escaparHtml(e.nome)}" value="" placeholder="…">
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Wireup local — atualiza visual e guarda valor em data-valor-atual no row
    container.querySelectorAll('.novoTipoPesoPilula').forEach(btn => {
        btn.addEventListener('click', () => {
            const estacao = btn.getAttribute('data-estacao');
            const v = Number(btn.getAttribute('data-valor'));
            setNovoTipoPeso(estacao, v);
        });
    });
    container.querySelectorAll('.novoTipoPesoCustom').forEach(input => {
        input.addEventListener('change', () => {
            const estacao = input.getAttribute('data-estacao');
            const v = Math.max(0, Math.floor(Number(input.value) || 0));
            setNovoTipoPeso(estacao, v);
        });
    });
}

function setNovoTipoPeso(estacao, valor) {
    const seletor = `[data-estacao="${CSS.escape(estacao)}"]`;
    document.querySelectorAll(`.novoTipoPesoPilula${seletor}`).forEach(btn => {
        const v = Number(btn.getAttribute('data-valor'));
        btn.classList.remove('ativo', 'ativo-0');
        if (v === valor) btn.classList.add(v === 0 ? 'ativo-0' : 'ativo');
        btn.dataset.valorAtual = valor;
    });
    const input = document.querySelector(`input.novoTipoPesoCustom${seletor}`);
    if (input) {
        input.value = PESOS_PRESET.includes(valor) ? '' : valor;
        input.dataset.valorAtual = valor;
    }
}

function wireupModalTiposClima() {
    document.getElementById('btnFecharTipos')?.addEventListener('click', () => {
        document.getElementById('modalTiposClima').style.display = 'none';
    });

    const btnMostrar = document.getElementById('btnMostrarNovoTipo');
    const btnCancelar = document.getElementById('btnCancelarNovoTipo');
    const form = document.getElementById('novoTipoForm');

    btnMostrar?.addEventListener('click', () => {
        if (!form) return;
        btnMostrar.style.display = 'none';
        form.style.display = 'flex';
        document.getElementById('novoTipoNome')?.focus();
    });
    btnCancelar?.addEventListener('click', () => {
        if (!form || !btnMostrar) return;
        form.style.display = 'none';
        btnMostrar.style.display = 'flex';
        // Limpa
        document.getElementById('novoTipoNome').value = '';
        document.getElementById('novoTipoIcone').value = '';
        document.getElementById('novoTipoDescricao').value = '';
        renderizarPesosNovoTipo();
    });

    const btnAdd = document.getElementById('btnAdicionarTipo');
    if (!btnAdd) return;
    const novo = btnAdd.cloneNode(true);
    btnAdd.parentNode.replaceChild(novo, btnAdd);
    novo.addEventListener('click', adicionarTipoClima);
}

function lerPesosNovoTipo() {
    const pesos = {};
    for (const e of calendarioState.config.estacoes) {
        const seletor = `[data-estacao="${CSS.escape(e.nome)}"]`;
        const customInput = document.querySelector(`input.novoTipoPesoCustom${seletor}`);
        const customVal = customInput?.value !== '' ? Number(customInput?.value) : null;
        if (Number.isFinite(customVal) && customVal !== null) {
            pesos[e.nome] = customVal;
            continue;
        }
        // Senão, olha qual pílula está ativa
        const ativa = document.querySelector(`.novoTipoPesoPilula${seletor}.ativo, .novoTipoPesoPilula${seletor}.ativo-0`);
        pesos[e.nome] = ativa ? Number(ativa.getAttribute('data-valor')) : 0;
    }
    return pesos;
}

function adicionarTipoClima() {
    const nome = document.getElementById('novoTipoNome').value.trim();
    if (!nome) { notificar('Campo obrigatório', 'Nome é obrigatório.'); return; }
    const icone = document.getElementById('novoTipoIcone').value.trim() || null;
    const descricao = document.getElementById('novoTipoDescricao').value.trim() || null;
    const pesos = lerPesosNovoTipo();

    // Insert otimista
    const tempId = `tmp-${crypto.randomUUID()}`;
    const novo = { id: tempId, nome, icone, descricao, pesosPorEstacao: pesos };
    calendarioState.tiposClima.push(novo);
    renderizarTiposClima();

    // Fecha form e limpa
    const form = document.getElementById('novoTipoForm');
    const btnMostrar = document.getElementById('btnMostrarNovoTipo');
    if (form) form.style.display = 'none';
    if (btnMostrar) btnMostrar.style.display = 'flex';
    document.getElementById('novoTipoNome').value = '';
    document.getElementById('novoTipoIcone').value = '';
    document.getElementById('novoTipoDescricao').value = '';
    renderizarPesosNovoTipo();

    apiPost(`/mesas/${calendarioState.mesaId}/calendario/tipos-clima`, {
        nome, icone, descricao, pesosPorEstacao: pesos
    })
        .then(real => {
            const i = calendarioState.tiposClima.findIndex(t => t.id === tempId);
            if (i !== -1) calendarioState.tiposClima[i] = real;
            renderizarTiposClima();
            renderizar();
        })
        .catch(e => {
            console.error(e);
            calendarioState.tiposClima = calendarioState.tiposClima.filter(t => t.id !== tempId);
            renderizarTiposClima();
            notificar('Erro', 'Não foi possível adicionar o tipo.');
        });
}

// ──────────────────────────────────────────────────────────────────────────────
// MODAL GERAR CLIMA
// ──────────────────────────────────────────────────────────────────────────────

function abrirModalGerarClima() {
    const config = calendarioState.config;
    if (!config) return;
    const hoje = dataParaDias(calendarioState.dataAtualDias, config);
    document.getElementById('gerarInicioAno').value = hoje.ano;
    document.getElementById('gerarInicioMes').value = hoje.mes;
    document.getElementById('gerarInicioDia').value = hoje.dia;
    document.getElementById('gerarFimAno').value = hoje.ano;
    document.getElementById('gerarFimMes').value = hoje.mes;
    document.getElementById('gerarFimDia').value = config.meses[hoje.mes - 1].dias;
    document.getElementById('modalGerarClima').style.display = 'flex';
}

function wireupModalGerarClima() {
    document.getElementById('btnFecharGerar')?.addEventListener('click', () => {
        document.getElementById('modalGerarClima').style.display = 'none';
    });
    const btn = document.getElementById('btnConfirmarGerar');
    if (!btn) return;
    const novo = btn.cloneNode(true);
    btn.parentNode.replaceChild(novo, btn);
    novo.addEventListener('click', confirmarGerarClima);
}

async function confirmarGerarClima() {
    const config = calendarioState.config;
    const ler = (id) => Number(document.getElementById(id).value);
    const inicio = diasParaData({ ano: ler('gerarInicioAno'), mes: ler('gerarInicioMes'), dia: ler('gerarInicioDia') }, config);
    const fim    = diasParaData({ ano: ler('gerarFimAno'),    mes: ler('gerarFimMes'),    dia: ler('gerarFimDia') },    config);
    const sobrescrever = document.getElementById('gerarSobrescrever').checked;

    if (fim < inicio) {
        notificar('Intervalo inválido', 'A data de fim deve ser igual ou posterior à de início.');
        return;
    }
    try {
        const r = await apiPost(`/mesas/${calendarioState.mesaId}/calendario/gerar-clima`, {
            dataInicio: inicio, dataFim: fim, sobrescrever
        });
        document.getElementById('modalGerarClima').style.display = 'none';
        notificar('Clima gerado', `${r.criados} evento(s) criado(s). ${r.ignorados} dia(s) sem clima.`);
        await recarregar();
    } catch (e) {
        console.error(e);
        notificar('Erro', 'Não foi possível gerar o clima.');
    }
}
