// 1. IMPORTAÇÕES LIMPAS (Sem duplicação)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// 2. SEGURANÇA: Verifica se está logado
onAuthStateChanged(auth, (user) => {
    if (user) {
        carregarFicha(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

// 3. FUNÇÃO PRINCIPAL
function carregarFicha(uid) {
    const fichaRef = ref(db, 'users/' + uid);

    // Carrega dados do Personagem
    onValue(fichaRef, (snapshot) => {
        const dados = snapshot.val();
        if(!dados) return;

        // --- SIDEBAR ---
        document.getElementById('displayNome').innerText = dados.nome;
        
        // Vida
        document.getElementById('txtHp').innerText = `${dados.hpAtual} / ${dados.hpMax}`;
        const pctHp = (dados.hpAtual / dados.hpMax) * 100;
        document.getElementById('fillHp').style.width = `${pctHp}%`;

        // Energia (PP)
        // Garante que lê ppAtual, ou enAtual ou 0
        const atualPP = dados.ppAtual || dados.enAtual || 0;
        const maxPP = dados.ppMax || dados.enMax || 1;

        document.getElementById('txtPp').innerText = `${atualPP} / ${maxPP}`;
        const pctPp = (atualPP / maxPP) * 100;
        document.getElementById('fillPp').style.width = `${pctPp}%`;

        // Atributos
        if(dados.atributos) {
            document.getElementById('attr-forca').innerText = dados.atributos.forca || 0;
            document.getElementById('attr-destreza').innerText = dados.atributos.destreza || 0;
            document.getElementById('attr-constituicao').innerText = dados.atributos.constituicao || 0;
            document.getElementById('attr-sabedoria').innerText = dados.atributos.sabedoria || 0;
            document.getElementById('attr-vontade').innerText = dados.atributos.vontade || 0;
            document.getElementById('attr-presenca').innerText = dados.atributos.presenca || 0;
        }
    });

    // --- CARDS DE AÇÃO ---
    const acoesRef = ref(db, 'users/' + uid + '/acoes');

    onValue(acoesRef, (snapshot) => {
        const acoes = snapshot.val();
        
        // Limpa as gavetas
        document.getElementById('lista-padrao').innerHTML = "";
        document.getElementById('lista-bonus').innerHTML = "";
        document.getElementById('lista-power').innerHTML = "";
        const listaReact = document.getElementById('lista-react');
        if(listaReact) listaReact.innerHTML = "";

        if (acoes) {
            Object.entries(acoes).forEach(([id, acao]) => {
                
                const cardHTML = `
                    <div class="action-card type-${acao.tipo}">
                        <div>
                            <div class="card-title">
                                ${acao.nome}
                            </div>
                            <div class="card-desc">${acao.descricao}</div>
                        </div>
                        
                        <div class="card-tags">
                            ${acao.tag ? `<span class="tag tag-damage">${acao.tag}</span>` : ''}
                        </div>

                        <i class="fas fa-trash btn-delete" 
                           data-id="${id}" 
                           style="position: absolute; top: 15px; right: 15px; color: #ddd; cursor: pointer;">
                        </i>
                    </div>
                `;

                const container = document.getElementById(`lista-${acao.tipo}`);
                if(container) {
                    container.innerHTML += cardHTML;
                }
            });

            // Re-ativar botões de deletar
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

    // --- MODAL LÓGICA ---
    // Agora que 'uid' existe, definimos o comportamento do botão salvar
    const btnSalvarAcao = document.getElementById('btnSalvarAcao');
    
    // Removemos eventos antigos para não duplicar cliques se a função rodar 2x
    const novoBtnSalvar = btnSalvarAcao.cloneNode(true);
    btnSalvarAcao.parentNode.replaceChild(novoBtnSalvar, btnSalvarAcao);

    novoBtnSalvar.onclick = () => {
        const nome = document.getElementById('newActionName').value;
        const desc = document.getElementById('newActionDesc').value;
        const tipo = document.getElementById('newActionType').value;
        const tag = document.getElementById('newActionTag').value;

        if(nome) {
            push(acoesRef, {
                nome: nome,
                descricao: desc,
                tipo: tipo,
                tag: tag
            });
            
            // Limpa e fecha
            document.getElementById('newActionName').value = "";
            document.getElementById('newActionDesc').value = "";
            document.getElementById('newActionTag').value = "";
            document.getElementById('modalAcao').style.display = 'none';
        } else {
            alert("Dê um nome para sua ação!");
        }
    };
}

// 4. OUTROS EVENTOS
const modal = document.getElementById('modalAcao');
const btnNova = document.getElementById('btnNovaAcao');
const btnFechar = document.getElementById('btnFecharModal');

// Abrir Modal
if(btnNova) btnNova.onclick = () => { modal.style.display = 'flex'; };

// Fechar Modal
if(btnFechar) btnFechar.onclick = () => { modal.style.display = 'none'; };

// Botão Sair
document.getElementById('btnSair').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
});