import { supabase, apiGet, apiPatch } from './js/utils/api.js';
import { iniciarBandeja } from "./js/components/bandeja/bandeja.js";
import { setupInventoryUI, carregarInventario } from "./js/components/inventory/inventario.js";
import { carregarPerfil, configurarTemas } from "./js/components/profile/perfil.js";
import { carregarAcoes, setupTabsUI } from "./js/components/actions/acoes.js";
import { setupCalendarioUI, carregarCalendario } from "./js/components/calendario/calendario.js";

// Força recarga quando a página é restaurada do bfcache (back/forward navigation)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
});

// Carrega o componente da bandeja (rolador + chat)
async function carregarComponenteBandeja() {
    const container = document.getElementById('bandejaContainer');
    if (container) {
        try {
            const response = await fetch('./js/components/bandeja/bandeja.html');
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar componente da bandeja:', error);
        }
    }
}

// Carrega o componente do inventário
async function carregarComponenteInventario() {
    const container = document.getElementById('inventarioContainer');
    if (container) {
        try {
            const response = await fetch('./js/components/inventory/inventario.html');
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar componente do inventário:', error);
        }
    }
}

// Carrega o componente de Perfil
async function carregarComponentePerfil() {
    const container = document.getElementById('perfilContainer');
    if (container) {
        try {
            const response = await fetch('./js/components/profile/perfil.html');
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar componente de perfil:', error);
        }
    }
}

// Carrega o componente de Ações
async function carregarComponenteAcoes() {
    const container = document.getElementById('acoesContainer');
    if (container) {
        try {
            const response = await fetch('./js/components/actions/acoes.html');
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar componente de ações:', error);
        }
    }
}

// Carrega o componente de Calendário
async function carregarComponenteCalendario() {
    const container = document.getElementById('calendarioContainer');
    if (container) {
        try {
            const response = await fetch('./js/components/calendario/calendario.html');
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar componente do calendário:', error);
        }
    }
}

// INICIALIZAÇÃO — usa getSession() para carga única, sem re-disparos
(async () => {
    let user;
    let personagemAtual = null;
    const urlParams = new URLSearchParams(window.location.search);
    const charId = urlParams.get('charId');

    if (!charId) {
        window.location.href = 'dashboard.html';
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        window.location.href = 'index.html';
        return;
    }

    user = session.user;

    // Verifica se o personagem existe; se não, redireciona
    try {
        personagemAtual = await apiGet(`/personagens/${charId}`);
    } catch (e) {
        if (e.status === 404 || e.status === 403) {
            alert("Personagem não encontrado ou acesso negado.");
            window.location.href = 'dashboard.html';
            return;
        } else {
            console.error("Erro interno do servidor backend:", e.message);
            alert("Erro de conexão com o banco de dados. Tente novamente mais tarde.");
            return;
        }
    }

    // Aguarda o carregamento dos componentes HTML em paralelo (drástica redução de tempo)
    await Promise.all([
        carregarComponenteBandeja(),
        carregarComponentePerfil(),
        carregarComponenteAcoes(),
        carregarComponenteInventario(),
        carregarComponenteCalendario()
    ]);

    // Inicializa componentes passando o personagem já carregado (evita refetch em perfil/inventario/chat)
    carregarPerfil(charId, personagemAtual, user);
    configurarTemas();
    carregarAcoes(charId);
    setupTabsUI();

    setupInventoryUI(charId);
    carregarInventario(charId, personagemAtual);

    // Calendário na ficha é sempre visão de jogador (somente leitura).
    // Narrador edita pela página dedicada calendario.html.
    setupCalendarioUI(personagemAtual?.mesaId, false);
    carregarCalendario(personagemAtual?.mesaId, personagemAtual);

    configurarEdicao('valHp', 'hpAtual', 'maxHp', charId);
    configurarEdicao('valPp', 'ppAtual', 'maxPp', charId);
    configurarEdicao('maxPeso', 'cargaMaxima', 'null', charId);
    configurarEdicao('valNivel', 'nivel', 'null', charId);

    // O SESSION_ID será o código de acesso da mesa, ou charId caso não tenha mesa (apenas dados próprios)
    const sessionId = personagemAtual?.mesa?.id || charId;
    iniciarBandeja(user, sessionId, personagemAtual);

    // Logout — botão carregado dinamicamente dentro do perfil.html
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            window.location.href = 'dashboard.html';
        });
    }

    // Redireciona ao fazer logout em outra aba
    supabase.auth.onAuthStateChange((_event, s) => {
        if (!s) window.location.href = 'index.html';
    });
})();

// EDIÇÃO OTIMISTA
function configurarEdicao(elementoId, campoBanco, elementoMaxId, uid) {
    const spanValor = document.getElementById(elementoId);
    if(!spanValor) return; 
    
    spanValor.addEventListener('click', function() {
        const valorAtualTexto = spanValor.innerText;
        const input = document.createElement('input');
        input.type = 'text'; input.value = ""; input.placeholder = valorAtualTexto;
        input.className = 'input-edit-stat';
        spanValor.parentNode.replaceChild(input, spanValor);
        input.focus();

        const salvar = () => {
            let entrada = input.value.trim();
            const elMax = document.getElementById(elementoMaxId);
            const valorMax = elMax ? Number(elMax.innerText) : 9999;
            const valorAtual = Number(valorAtualTexto);
            let novoValor = valorAtual;

            if (entrada === "") {
                if (input.parentNode) input.parentNode.replaceChild(spanValor, input);
                return;
            }
            if (entrada.startsWith('+') || entrada.startsWith('-')) {
                novoValor = valorAtual + Number(entrada);
            } else {
                novoValor = Number(entrada);
            }
            if (novoValor > valorMax) novoValor = valorMax;
            spanValor.innerText = novoValor;
            if (input.parentNode) input.parentNode.replaceChild(spanValor, input);

            // Atualização visual otimista das barras (vida e pp)
            if (elementoId === 'valHp') {
                const fill = document.getElementById('fillHp');
                if (fill) fill.style.width = `${Math.max(0, Math.min(100, (novoValor / valorMax) * 100))}%`;
            } else if (elementoId === 'valPp') {
                const fill = document.getElementById('fillPp');
                if (fill) fill.style.width = `${Math.max(0, Math.min(100, (novoValor / valorMax) * 100))}%`;
            }

            apiPatch(`/personagens/${uid}`, { [campoBanco]: novoValor });
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { salvar(); input.blur(); } });
        input.addEventListener('blur', salvar, { once: true });
    });
}

// =========================================================
// FIM DO ARQUIVO
// =========================================================