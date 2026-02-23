import { supabase, apiGet, apiPatch } from './js/utils/api.js';
import { iniciarBandeja } from "./js/components/bandeja/bandeja.js";
import { setupInventoryUI, carregarInventario } from "./js/components/inventory/inventario.js";
import { carregarPerfil, configurarTema } from "./js/components/profile/perfil.js";
import { carregarAcoes, setupTabsUI } from "./js/components/actions/acoes.js";

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

// INICIALIZAÇÃO — usa getSession() para carga única, sem re-disparos
(async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        window.location.href = 'index.html';
        return;
    }

    const user = session.user;

    // Verifica se o personagem existe; se não, redireciona para criação
    try {
        await apiGet(`/users/${user.id}`);
    } catch (e) {
        window.location.href = 'criacao-personagem.html';
        return;
    }

    // Aguarda o carregamento dos componentes HTML
    await carregarComponenteBandeja();
    await carregarComponentePerfil();
    await carregarComponenteAcoes();
    await carregarComponenteInventario();

    // Inicializa componentes
    carregarPerfil(user.id);
    configurarTema();
    carregarAcoes(user.id);
    setupTabsUI();

    setupInventoryUI(user.id);
    carregarInventario(user.id);

    configurarEdicao('valHp', 'hpAtual', 'maxHp', user.id);
    configurarEdicao('valPp', 'ppAtual', 'maxPp', user.id);
    configurarEdicao('maxPeso', 'cargaMaxima', 'null', user.id);
    configurarEdicao('valNivel', 'nivel', 'null', user.id);

    iniciarBandeja(user);

    // Logout — botão carregado dinamicamente dentro do perfil.html
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
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

            apiPatch(`/users/${uid}`, { [campoBanco]: novoValor });
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { salvar(); input.blur(); } });
        input.addEventListener('blur', salvar, { once: true });
    });
}

// =========================================================
// FIM DO ARQUIVO
// =========================================================