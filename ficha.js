import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// SEGURANÇA
onAuthStateChanged(auth, (user) => {
    if (user) {
        carregarFicha(user.uid);
        configurarEdicao('valHp', 'hpAtual', 'maxHp', user.uid);
        configurarEdicao('valPp', 'ppAtual', 'maxPp', user.uid);
        
        // Inicializa a lógica da bandeja passando o user para salvar rolagem
        configurarEdicao('valNivel', 'nivel', 'null', user.uid);
        iniciarBandejaDados(user);
        iniciarChat(user);
        configurarTema(); // <--- INICIA O TEMA
    } else {
        window.location.href = "index.html";
    }
});

// --- SISTEMA DE TEMA (DARK MODE) ---
function configurarTema() {
    const btnTheme = document.getElementById('btnToggleTheme');
    const body = document.body;
    
    // 1. Verifica preferência salva
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        btnTheme.className = "fas fa-sun";
    }

    // 2. Alternar Tema
    if(btnTheme) {
        btnTheme.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                btnTheme.className = "fas fa-sun";
            } else {
                localStorage.setItem('theme', 'light');
                btnTheme.className = "fas fa-moon";
            }
        });
    }
}

function carregarFicha(uid) {
    const fichaRef = ref(db, 'users/' + uid);

    // DADOS
    onValue(fichaRef, (snapshot) => {
        const dados = snapshot.val();
        if(!dados) return;

        const elNome = document.getElementById('displayNome');
        if(elNome) elNome.innerText = dados.nome;
        
        // NOVO: Carrega o Nível (ou 1 se não tiver salvo)
        const elNivel = document.getElementById('valNivel');
        if(elNivel) elNivel.innerText = dados.nivel || 1;
        
        // VIDA
        const elValHp = document.getElementById('valHp');
        const elMaxHp = document.getElementById('maxHp');
        const elFillHp = document.getElementById('fillHp');

        if(elValHp) elValHp.innerText = dados.hpAtual;
        if(elMaxHp) elMaxHp.innerText = dados.hpMax;
        if(elFillHp) {
            const pctHp = (dados.hpAtual / dados.hpMax) * 100;
            elFillHp.style.width = `${Math.max(0, Math.min(100, pctHp))}%`;
        }

        // PP
        const atualPP = dados.ppAtual || dados.enAtual || 0;
        const maxPP = dados.ppMax || dados.enMax || 1;
        document.getElementById('valPp').innerText = atualPP;
        document.getElementById('maxPp').innerText = maxPP;
        document.getElementById('fillPp').style.width = `${Math.max(0, Math.min(100, (atualPP / maxPP) * 100))}%`;

        // ATRIBUTOS
        if(dados.atributos) {
            const setAttr = (id, val) => {
                const el = document.getElementById(id);
                if(el) el.innerText = val || 0;
            };
            setAttr('attr-forca', dados.atributos.forca);
            setAttr('attr-destreza', dados.atributos.destreza);
            setAttr('attr-constituicao', dados.atributos.constituicao);
            setAttr('attr-sabedoria', dados.atributos.sabedoria);
            setAttr('attr-vontade', dados.atributos.vontade);
            setAttr('attr-presenca', dados.atributos.presenca);
        }
    });

    // AÇÕES (CARDS)
    const acoesRef = ref(db, 'users/' + uid + '/acoes');
    onValue(acoesRef, (snapshot) => {
        const acoes = snapshot.val();
        
        document.getElementById('lista-padrao').innerHTML = "";
        document.getElementById('lista-bonus').innerHTML = "";
        document.getElementById('lista-power').innerHTML = "";
        document.getElementById('lista-react').innerHTML = "";

        if (acoes) {
            Object.entries(acoes).forEach(([id, acao]) => {
                const cardHTML = `
                    <div class="action-card type-${acao.tipo}">
                        <div>
                            <div class="card-title">${acao.nome}</div>
                            <div class="card-desc">${acao.descricao}</div>
                        </div>
                        <div class="card-tags">
                            ${acao.tag ? `<span class="tag tag-damage">${acao.tag}</span>` : ''}
                        </div>
                        <i class="fas fa-trash btn-delete" data-id="${id}" style="position: absolute; top: 15px; right: 15px; color: #ddd; cursor: pointer;"></i>
                    </div>
                `;
                const container = document.getElementById(`lista-${acao.tipo}`);
                if(container) container.innerHTML += cardHTML;
            });

            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if(confirm("Tem certeza que quer apagar essa técnica?")) {
                        const idParaDeletar = e.target.getAttribute('data-id');
                        remove(ref(db, 'users/' + uid + '/acoes/' + idParaDeletar));
                    }
                });
            });
        }
    });

    // NOVA AÇÃO
    const btnSalvarAcao = document.getElementById('btnSalvarAcao');
    const novoBtnSalvar = btnSalvarAcao.cloneNode(true);
    btnSalvarAcao.parentNode.replaceChild(novoBtnSalvar, btnSalvarAcao);

    novoBtnSalvar.onclick = () => {
        const nome = document.getElementById('newActionName').value;
        const desc = document.getElementById('newActionDesc').value;
        const tipo = document.getElementById('newActionType').value;
        const tag = document.getElementById('newActionTag').value;

        if(nome) {
            push(acoesRef, {
                nome: nome, descricao: desc, tipo: tipo, tag: tag
            });
            document.getElementById('newActionName').value = "";
            document.getElementById('newActionDesc').value = "";
            document.getElementById('newActionTag').value = "";
            document.getElementById('modalAcao').style.display = 'none';
        } else {
            alert("Dê um nome para sua ação!");
        }
    };

    // EDITAR FICHA
    const modalFicha = document.getElementById('modalFicha');
    const btnEditar = document.getElementById('btnEditarFicha');
    const btnFecharFicha = document.getElementById('btnFecharFicha');
    const btnSalvarFicha = document.getElementById('btnSalvarFicha');

    if(btnEditar) btnEditar.onclick = () => {
        document.getElementById('editHpMax').value = document.getElementById('maxHp').innerText;
        document.getElementById('editPpMax').value = document.getElementById('maxPp').innerText;
        document.getElementById('editFor').value = document.getElementById('attr-forca').innerText;
        document.getElementById('editDes').value = document.getElementById('attr-destreza').innerText;
        document.getElementById('editCon').value = document.getElementById('attr-constituicao').innerText;
        document.getElementById('editSab').value = document.getElementById('attr-sabedoria').innerText;
        document.getElementById('editVon').value = document.getElementById('attr-vontade').innerText;
        document.getElementById('editPre').value = document.getElementById('attr-presenca').innerText;
        modalFicha.style.display = 'flex';
    };

    if(btnFecharFicha) btnFecharFicha.onclick = () => { modalFicha.style.display = 'none'; };

    if(btnSalvarFicha) btnSalvarFicha.onclick = () => {
        const atualizacao = {
            hpMax: Number(document.getElementById('editHpMax').value),
            ppMax: Number(document.getElementById('editPpMax').value),
            atributos: {
                forca: Number(document.getElementById('editFor').value),
                destreza: Number(document.getElementById('editDes').value),
                constituicao: Number(document.getElementById('editCon').value),
                sabedoria: Number(document.getElementById('editSab').value),
                vontade: Number(document.getElementById('editVon').value),
                presenca: Number(document.getElementById('editPre').value)
            }
        };
        update(fichaRef, atualizacao).then(() => {
            alert("Ficha atualizada!");
            modalFicha.style.display = 'none';
        });
    };
}

// MODAIS
const modal = document.getElementById('modalAcao');
const btnNova = document.getElementById('btnNovaAcao');
const btnFechar = document.getElementById('btnFecharModal');

if(btnNova) btnNova.onclick = () => { modal.style.display = 'flex'; };
if(btnFechar) btnFechar.onclick = () => { modal.style.display = 'none'; };

document.getElementById('btnSair').addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
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

// =========================================================
// 🎲 LÓGICA DA BANDEJA (SMART DOCKING)
// =========================================================
function iniciarChat(user) {
    const tray = document.getElementById('chatTray');
    const header = document.getElementById('chatHeader');
    const icon = document.getElementById('chatIcon');
    const chatLog = document.getElementById('chatLog');
    const inputChat = document.getElementById('chatInput');
    const btnEnviar = document.getElementById('btnEnviarChat');
    const chatRef = ref(db, 'chat_global');

    // Resizers
    const resizeW = document.getElementById('resizeW');
    const resizeE = document.getElementById('resizeE');
    const resizeN = document.getElementById('resizeN');

    // ESTADO INICIAL: Bola na Direita
    tray.className = "chat-tray collapsed dock-side"; 
    tray.style.top = "200px"; 
    tray.style.right = "0px";
    tray.style.left = "auto";
    icon.className = "fas fa-comment-dots";

    // --- ARRASTO ---
    let isDragging = false;
    let hasMoved = false;
    let dragOffsetX = 0, dragOffsetY = 0;

    header.addEventListener('mousedown', (e) => {
        // Se estiver aberto e dockado, não arrasta pelo header
        const isCollapsed = tray.classList.contains('collapsed');
        const isDocked = tray.classList.contains('dock-side') || tray.classList.contains('dock-bottom');
        if (!isCollapsed && isDocked) return;

        isDragging = true;
        hasMoved = false;
        
        const rect = tray.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        header.style.cursor = 'grabbing';
        // NÃO removemos a transição aqui para permitir o morph Bola->Barra
        // tray.style.transition = 'none'; 
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        if (!hasMoved) {
            // Sensibilidade do arrasto
            if (Math.abs(e.clientX - (tray.getBoundingClientRect().left + dragOffsetX)) > 5 || 
                Math.abs(e.clientY - (tray.getBoundingClientRect().top + dragOffsetY)) > 5) {
                 
                 hasMoved = true;

                 // === MÁGICA DA ANIMAÇÃO ===
                 // Remove o dock-side/bottom. O CSS vai animar de Bola -> Barra automaticamente
                 tray.classList.remove('dock-bottom', 'dock-side');
                 
                 // Garante que está fechado (Barra)
                 tray.classList.add('collapsed');
                 
                 // Limpa tamanhos para o CSS da Barra pegar
                 tray.style.width = ''; 
                 tray.style.height = '';

                 // Ajusta offset (O mouse estava na bola, agora está na barra)
                 // Para não pular, centralizamos o mouse na barra
                 icon.className = "fas fa-comment-dots";
            }
        }

        if (hasMoved) {
            let newLeft = e.clientX - dragOffsetX;
            let newTop = e.clientY - dragOffsetY;

            // Limites da tela
            const w = window.innerWidth;
            const h = window.innerHeight;
            // Pega tamanho atual (que está animando para barra)
            const cw = 300; // Largura da barra
            const ch = 45;  // Altura da barra

            newLeft = Math.max(0, Math.min(newLeft, w - cw));
            newTop = Math.max(0, Math.min(newTop, h - ch));

            tray.style.left = `${newLeft}px`;
            tray.style.top = `${newTop}px`;
            tray.style.right = 'auto'; 
            tray.style.bottom = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'grab';
            if (hasMoved) snapToNearestEdge();
            else toggleChat();
        }
    });

    // --- SNAP (Imã) ---
    function snapToNearestEdge() {
        const rect = tray.getBoundingClientRect();
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        const distRight = w - rect.right;
        const distLeft = rect.left;
        const distBottom = h - rect.bottom;
        const snapLimit = 100;

        tray.classList.remove('dock-bottom', 'dock-side');
        tray.style.width = ''; tray.style.height = '';

        if (distRight < snapLimit) { // Direita -> Bola
            tray.classList.add('dock-side', 'collapsed');
            tray.style.left = 'auto'; tray.style.right = '0';
            tray.style.top = `${Math.max(0, Math.min(rect.top, h - 50))}px`;
            icon.className = "fas fa-comment-dots";
        } 
        else if (distLeft < snapLimit) { // Esquerda -> Bola
            tray.classList.add('dock-side', 'collapsed');
            tray.style.right = 'auto'; tray.style.left = '0';
            tray.style.top = `${Math.max(0, Math.min(rect.top, h - 50))}px`;
            icon.className = "fas fa-comment-dots";
        }
        else if (distBottom < snapLimit) { // Baixo -> Barra
            tray.classList.add('dock-bottom', 'collapsed');
            tray.style.top = 'auto'; tray.style.bottom = '0';
            let targetLeft = Math.max(0, Math.min(rect.left, w - 300));
            tray.style.left = `${targetLeft}px`;
            icon.className = "fas fa-chevron-up";
        }
    }

    // --- CLIQUE ---
    function toggleChat() {
        const isCollapsed = tray.classList.contains('collapsed');
        if (isCollapsed) { // Abrir
            tray.classList.remove('collapsed');
            if (!tray.style.width) tray.style.width = "350px"; // Default
            if (!tray.style.height) tray.style.height = "450px";
            
            // Ícones
            if (tray.classList.contains('dock-bottom')) icon.className = "fas fa-chevron-down";
            else icon.className = "fas fa-minus";
            
            chatLog.scrollTop = chatLog.scrollHeight;
        } else { // Fechar
            tray.classList.add('collapsed');
            tray.style.width = ''; tray.style.height = ''; // Limpa para CSS assumir
            
            if (tray.classList.contains('dock-side')) icon.className = "fas fa-comment-dots";
            else if (tray.classList.contains('dock-bottom')) icon.className = "fas fa-chevron-up";
            else { 
                // Se flutuando, vira Barra por padrão (comportamento rolador)
                icon.className = "fas fa-comment-dots"; 
            }
        }
    }

    // --- RESIZE (Mantido) ---
    setupResize(resizeW, 'w'); setupResize(resizeE, 'e'); setupResize(resizeN, 'n'); 
    function setupResize(handle, dir) {
        if(!handle) return;
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            const startX = e.clientX; const startY = e.clientY;
            const startW = parseInt(document.defaultView.getComputedStyle(tray).width, 10);
            const startH = parseInt(document.defaultView.getComputedStyle(tray).height, 10);
            const startLeft = tray.getBoundingClientRect().left;
            function doDrag(e) {
                if (dir === 'w') { 
                    const newW = startW + (startX - e.clientX);
                    if (newW > 300 && newW < window.innerWidth - 20) {
                        tray.style.width = newW + 'px';
                        if (tray.style.right !== "0px") tray.style.left = `${startLeft - (startX - e.clientX)}px`;
                    }
                }
                else if (dir === 'e') {
                    const newW = startW + (e.clientX - startX);
                    if (newW > 300 && newW < window.innerWidth - 20) tray.style.width = newW + 'px';
                }
                else if (dir === 'n') {
                    const newH = startH + (startY - e.clientY);
                    if (newH > 150 && newH < window.innerHeight - 50) tray.style.height = newH + 'px';
                }
            }
            function stopDrag() { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); }
            document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', stopDrag);
        });
    }

    // --- FIREBASE ---
    onValue(chatRef, (snapshot) => {
        const msgs = snapshot.val();
        if (!msgs) return;
        chatLog.innerHTML = "";
        Object.values(msgs).sort((a,b)=>a.horario-b.horario).forEach(msg => {
            const time = new Date(msg.horario).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            const div = document.createElement('div');
            div.className = 'msg-line';
            div.innerHTML = msg.tipo==='rolagem' 
                ? `<span class="msg-timestamp">[${time}]</span> <span class="msg-author">${msg.nome}</span> rolou: <div class="msg-roll-box">${msg.conteudo.detalhes} = <b>${msg.conteudo.total}</b></div>`
                : `<span class="msg-timestamp">[${time}]</span> <span class="msg-author">${msg.nome}</span>: <span class="msg-content">${msg.conteudo}</span>`;
            chatLog.appendChild(div);
        });
        chatLog.scrollTop = chatLog.scrollHeight;
    });

    const enviar = () => {
        const t = inputChat.value.trim();
        if(!t) return;
        const n = document.getElementById('displayNome').innerText || "Eu";
        push(chatRef, { tipo:'texto', nome:n, uid:user.uid, horario:Date.now(), conteudo:t });
        inputChat.value="";
    };
    if(btnEnviar) btnEnviar.addEventListener('click', enviar);
    if(inputChat) inputChat.addEventListener('keypress', (e) => { if(e.key==='Enter') enviar(); });
}
// =========================================================
// Fim chat
// =========================================================