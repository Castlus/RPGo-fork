import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { iniciarBandejaDados } from "./js/components/dice tray/rolador.js";
import { setupInventoryUI, carregarInventario } from "./js/components/inventory/inventario.js";
import { carregarPerfil, configurarTema } from "./js/components/profile/perfil.js";
import { carregarAcoes, setupTabsUI } from "./js/components/actions/acoes.js";
import { iniciarChatTray } from "./js/components/chat/chat.js";

const firebaseConfig = {
    apiKey: "AIzaSyBkp8ZUYMCfRokbpMl2fBGTvfMxzzvgaeY",
    authDomain: "rpgo-onepiece.firebaseapp.com",
    databaseURL: "https://rpgo-onepiece-default-rtdb.firebaseio.com",
    projectId: "rpgo-onepiece",
    storageBucket: "rpgo-onepiece.firebasestorage.app",
    messagingSenderId: "726770644982",
    appId: "1:726770644982:web:7c06f46940cc5142c3f9d7",
    measurementId: "G-HSBMTMB5XK"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Expõe Firebase para uso no componente da bandeja
window.dbRef = ref;
window.updateDB = update;

// Carrega o componente da bandeja de dados
async function carregarComponenteBandeja() {
    const container = document.getElementById('diceTrayContainer');
    if (container) {
        try {
            const response = await fetch('./js/components/dice tray/rolador.html');
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

// Carrega o componente de Chat
async function carregarComponenteChat() {
    const container = document.getElementById('chatTrayContainer');
    if (container) {
        try {
            const response = await fetch('./js/components/chat/chat.html');
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar componente de chat:', error);
        }
    }
}

// SEGURANÇA
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Aguarda o carregamento dos componentes
        await carregarComponenteBandeja();
        await carregarComponentePerfil();
        await carregarComponenteAcoes();
        await carregarComponenteInventario();
        await carregarComponenteChat();
        
        // Passa os refs do Firebase para os componentes
        const dbRefs = { db, ref, onValue, push, remove, update };
        
        // Inicializa componentes
        carregarPerfil(user.uid, dbRefs);
        configurarTema();
        carregarAcoes(user.uid, dbRefs);
        setupTabsUI();
        
        setupInventoryUI(user.uid, dbRefs);
        carregarInventario(user.uid, dbRefs);

        configurarEdicao('valHp', 'hpAtual', 'maxHp', user.uid);
        configurarEdicao('valPp', 'ppAtual', 'maxPp', user.uid);
        configurarEdicao('maxPeso', 'cargaMaxima', 'null', user.uid);
        configurarEdicao('valNivel', 'nivel', 'null', user.uid);
        
        // Inicializa a lógica da bandeja passando o user para salvar rolagem
        iniciarBandejaDados(user);
        
        // Inicializa o chat
        iniciarChatTray(user, dbRefs);
    } else {
        window.location.href = "index.html";
    }
});

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

            update(ref(db, 'users/' + uid), { [campoBanco]: novoValor });
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { salvar(); input.blur(); } });
        input.addEventListener('blur', salvar, { once: true });
    });
}

// Logout
document.addEventListener('DOMContentLoaded', () => {
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', () => {
            signOut(auth).then(() => { window.location.href = "index.html"; });
        });
    }
});

// =========================================================
// FIM DO ARQUIVO
// =========================================================
