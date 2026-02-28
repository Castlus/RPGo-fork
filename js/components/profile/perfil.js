/**
 * Carrega o perfil do personagem
 * @param {string} uid - ID do usuário (Supabase)
 */
import { notificar } from "../../utils/modal-utils.js";
import { supabase, apiGet, apiPatch } from "../../utils/api.js";
import {
    TEMAS_PRESET,
    aplicarTema,
    salvarTemaAtivo,
    getTemasCustom,
    adicionarTemaCustom,
    atualizarTemaCustom,
    removerTemaCustom,
} from "../../utils/theme-manager.js";

export function carregarPerfil(uid) {
    function renderizarDados(dados) {
        if (!dados) return;

        const elNome = document.getElementById('displayNome');
        if (elNome) elNome.innerText = dados.nome;

        const elNivel = document.getElementById('valNivel');
        if (elNivel) elNivel.innerText = dados.nivel || 1;

        // VIDA
        const elValHp = document.getElementById('valHp');
        const elMaxHp = document.getElementById('maxHp');
        const elFillHp = document.getElementById('fillHp');
        if (elValHp) elValHp.innerText = dados.hpAtual;
        if (elMaxHp) elMaxHp.innerText = dados.hpMax;
        if (elFillHp) {
            const pctHp = (dados.hpAtual / dados.hpMax) * 100;
            elFillHp.style.width = `${Math.max(0, Math.min(100, pctHp))}%`;
        }

        // PP
        const atualPP = dados.ppAtual || 0;
        const maxPP   = dados.ppMax   || 1;
        document.getElementById('valPp').innerText  = atualPP;
        document.getElementById('maxPp').innerText  = maxPP;
        document.getElementById('fillPp').style.width = `${Math.max(0, Math.min(100, (atualPP / maxPP) * 100))}%`;

        // ATRIBUTOS
        const setAttr = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val || 0; };
        setAttr('attr-forca',        dados.forca);
        setAttr('attr-destreza',     dados.destreza);
        setAttr('attr-constituicao', dados.constituicao);
        setAttr('attr-sabedoria',    dados.sabedoria);
        setAttr('attr-vontade',      dados.vontade);
        setAttr('attr-presenca',     dados.presenca);
    }

    apiGet(`/users/${uid}`).then(renderizarDados).catch(console.error);

    supabase.channel(`personagem-${uid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'personagens', filter: `id=eq.${uid}` },
            async () => { const d = await apiGet(`/users/${uid}`).catch(() => null); renderizarDados(d); })
        .subscribe();

    // EDITAR FICHA
    const modalFicha     = document.getElementById('modalFicha');
    const btnEditar      = document.getElementById('btnEditarFicha');
    const btnFecharFicha = document.getElementById('btnFecharFicha');
    const btnSalvarFicha = document.getElementById('btnSalvarFicha');

    if (btnEditar) btnEditar.onclick = () => {
        document.getElementById('editHpMax').value = document.getElementById('maxHp').innerText;
        document.getElementById('editPpMax').value = document.getElementById('maxPp').innerText;
        document.getElementById('editFor').value   = document.getElementById('attr-forca').innerText;
        document.getElementById('editDes').value   = document.getElementById('attr-destreza').innerText;
        document.getElementById('editCon').value   = document.getElementById('attr-constituicao').innerText;
        document.getElementById('editSab').value   = document.getElementById('attr-sabedoria').innerText;
        document.getElementById('editVon').value   = document.getElementById('attr-vontade').innerText;
        document.getElementById('editPre').value   = document.getElementById('attr-presenca').innerText;
        modalFicha.style.display = 'flex';
    };

    if (btnFecharFicha) btnFecharFicha.onclick = () => { modalFicha.style.display = 'none'; };

    if (btnSalvarFicha) btnSalvarFicha.onclick = async () => {
        const payload = {
            hpMax:        Number(document.getElementById('editHpMax').value),
            ppMax:        Number(document.getElementById('editPpMax').value),
            forca:        Number(document.getElementById('editFor').value),
            destreza:     Number(document.getElementById('editDes').value),
            constituicao: Number(document.getElementById('editCon').value),
            sabedoria:    Number(document.getElementById('editSab').value),
            vontade:      Number(document.getElementById('editVon').value),
            presenca:     Number(document.getElementById('editPre').value)
        };
        await apiPatch(`/users/${uid}`, payload)
            .then(() => { notificar("Sucesso", "Ficha atualizada!"); modalFicha.style.display = 'none'; })
            .catch(e  => notificar("Erro", e.message));
    };
}

/**
 * Configura o painel de seleção e criação de temas
 */
export function configurarTemas() {
    const btnPaleta      = document.getElementById('btnPaleta');
    const modalTemas     = document.getElementById('modalTemas');
    const btnFecharTemas = document.getElementById('btnFecharTemas');
    const temaChips      = document.getElementById('temaChips');
    const btnSalvarCustom = document.getElementById('btnSalvarCustom');

    let editingId = null; // null = criando novo; string = editando tema existente

    const PICKERS = {
        '--primary':    'cpPrimary',
        '--bg-page':    'cpBgPage',
        '--bg-card':    'cpBgCard',
        '--bg-surface': 'cpBgSurface',
        '--text-main':  'cpTextMain',
        '--text-sec':   'cpTextSec',
        '--border':     'cpBorder',
    };

    function getTemaAtual() {
        return localStorage.getItem('temaId') || 'light';
    }

    function rgbToHex(color) {
        if (!color) return '#000000';
        color = color.trim();
        if (color.startsWith('#')) {
            return color.length === 4
                ? '#' + [...color.slice(1)].map(c => c + c).join('')
                : color;
        }
        const m = color.match(/\d+/g);
        if (!m) return '#000000';
        return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }

    function criarChipBtn(tema, isAtivo, isCustom) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative';

        const btn = document.createElement('button');
        btn.style.cssText = [
            'padding: 12px 8px',
            'border-radius: 10px',
            'cursor: pointer',
            'width: 100%',
            `border: 2px solid ${isAtivo ? tema.vars['--primary'] : 'transparent'}`,
            `background: ${tema.vars['--bg-card']}`,
            `color: ${tema.vars['--text-main']}`,
            'font-weight: 600',
            'font-size: 0.82rem',
            `box-shadow: ${isAtivo
                ? `0 0 0 3px ${tema.vars['--primary']}55, inset 0 0 0 1px ${tema.vars['--border']}`
                : `inset 0 0 0 1px ${tema.vars['--border']}`}`,
            'transition: 0.15s',
        ].join(';');

        const pontos = ['--primary', '--bg-page', '--border']
            .map(v => `<div style="width:10px;height:10px;border-radius:50%;background:${tema.vars[v]};border:1px solid ${tema.vars['--border']}"></div>`)
            .join('');

        btn.innerHTML = `
            <div style="font-size:1.5rem;margin-bottom:4px">${tema.icone}</div>
            <div style="color:${tema.vars['--primary']};margin-bottom:6px;word-break:break-word">${tema.nome}</div>
            <div style="display:flex;gap:4px;justify-content:center">${pontos}</div>
        `;

        btn.onclick = () => {
            aplicarTema(tema.vars, tema.dark);
            salvarTemaAtivo(tema.id);
            renderChips();
        };
        wrap.appendChild(btn);

        // Botões de ação (só temas customizados)
        if (isCustom) {
            const btnStyle = [
                'position:absolute',
                'width:18px', 'height:18px',
                'border-radius:50%', 'border:none',
                'background:rgba(0,0,0,0.35)', 'color:white',
                'font-size:0.7rem', 'line-height:1',
                'cursor:pointer', 'display:flex',
                'align-items:center', 'justify-content:center',
                'padding:0',
            ].join(';');

            // Excluir
            const del = document.createElement('button');
            del.innerHTML = '&times;';
            del.title = 'Excluir tema';
            del.style.cssText = btnStyle + ';top:4px;right:4px';
            del.onclick = (e) => {
                e.stopPropagation();
                removerTemaCustom(tema.id);
                if (editingId === tema.id) {
                    editingId = null;
                    _resetFormulario();
                }
                renderChips();
            };
            wrap.appendChild(del);

            // Editar
            const edit = document.createElement('button');
            edit.innerHTML = '&#9998;'; // ✎
            edit.title = 'Editar tema';
            edit.style.cssText = btnStyle + ';top:4px;right:26px';
            edit.onclick = (e) => {
                e.stopPropagation();
                editingId = tema.id;

                // Preenche pickers com as cores do tema
                for (const [varName, inputId] of Object.entries(PICKERS)) {
                    const input = document.getElementById(inputId);
                    if (input) input.value = rgbToHex(tema.vars[varName] || '#000000');
                }

                // Preenche nome
                const inputNome = document.getElementById('cpNome');
                if (inputNome) inputNome.value = tema.nome;

                // Atualiza label do botão
                if (btnSalvarCustom) {
                    btnSalvarCustom.innerHTML = '<i class="fas fa-save"></i> Atualizar Tema';
                }

                // Abre o details
                const details = document.getElementById('temaDetails');
                if (details) {
                    details.setAttribute('open', '');
                    details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            };
            wrap.appendChild(edit);
        }

        return wrap;
    }

    function renderChips() {
        if (!temaChips) return;
        const ativo = getTemaAtual();
        temaChips.innerHTML = '';

        // Presets
        TEMAS_PRESET.forEach(tema => {
            temaChips.appendChild(criarChipBtn(tema, tema.id === ativo, false));
        });

        // Customizados
        const customizados = getTemasCustom();
        if (customizados.length > 0) {
            const sep = document.createElement('div');
            sep.style.cssText = 'grid-column:1/-1;font-size:0.75rem;font-weight:600;color:var(--text-sec);padding-top:6px;border-top:1px solid var(--border);';
            sep.textContent = 'Meus Temas';
            temaChips.appendChild(sep);
            customizados.forEach(tema => {
                temaChips.appendChild(criarChipBtn(tema, tema.id === ativo, true));
            });
        }
    }

    function syncPickers() {
        const root = getComputedStyle(document.documentElement);
        for (const [varName, inputId] of Object.entries(PICKERS)) {
            const input = document.getElementById(inputId);
            if (input) input.value = rgbToHex(root.getPropertyValue(varName).trim()) || '#000000';
        }
    }

    function _resetFormulario() {
        editingId = null;
        const inputNome = document.getElementById('cpNome');
        if (inputNome) inputNome.value = '';
        if (btnSalvarCustom) btnSalvarCustom.innerHTML = '<i class="fas fa-save"></i> Salvar como Tema';
        const details = document.getElementById('temaDetails');
        if (details) details.removeAttribute('open');
    }

    if (btnPaleta) {
        btnPaleta.addEventListener('click', () => {
            renderChips();
            syncPickers();
            modalTemas.style.display = 'flex';
        });
    }

    if (btnFecharTemas) {
        btnFecharTemas.addEventListener('click', () => { modalTemas.style.display = 'none'; });
    }

    if (modalTemas) {
        modalTemas.addEventListener('click', e => {
            if (e.target === modalTemas) modalTemas.style.display = 'none';
        });
    }

    if (btnSalvarCustom) {
        btnSalvarCustom.addEventListener('click', () => {
            const customVars = {};
            for (const [varName, inputId] of Object.entries(PICKERS)) {
                const input = document.getElementById(inputId);
                if (input) customVars[varName] = input.value;
            }
            // Vars derivadas
            customVars['--bg-button']   = customVars['--bg-surface'];
            customVars['--text-button'] = customVars['--text-main'];
            customVars['--bg-slot']     = customVars['--bg-surface'];
            customVars['--border-slot'] = customVars['--border'];

            // Detecta dark pela luminância do fundo
            const hex = customVars['--bg-page'] || '#ffffff';
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const isDark = (0.299 * r + 0.587 * g + 0.114 * b) < 128;

            const nome = (document.getElementById('cpNome')?.value || '').trim() || 'Meu Tema';

            let idAtivo;
            if (editingId) {
                atualizarTemaCustom(editingId, nome, customVars, isDark);
                idAtivo = editingId;
            } else {
                idAtivo = adicionarTemaCustom(nome, customVars, isDark);
            }

            aplicarTema(customVars, isDark);
            salvarTemaAtivo(idAtivo);
            _resetFormulario();
            renderChips();
        });
    }
}
