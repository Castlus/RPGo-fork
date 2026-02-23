/**
 * Carrega e gerencia as ações do personagem
 * @param {string} uid - ID do usuário no Firebase
 * @param {Object} dbRefs - Objeto com funções Firebase { db, ref, onValue, push, remove }
 */
import { confirmar, notificar } from "../../utils/modal-utils.js";

export function carregarAcoes(uid, dbRefs) {
    const { db, ref, onValue, push, remove } = dbRefs;
    
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
                btn.addEventListener('click', async (e) => {
                    const idParaDeletar = e.target.getAttribute('data-id');
                    const confirmado = await confirmar(
                        "Deletar Ação",
                        "Tem certeza que quer apagar essa técnica?",
                        "Deletar",
                        "Cancelar"
                    );
                    if(confirmado) {
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
            notificar("Campo Obrigatório", "Dê um nome para sua ação!");
        }
    };

    // MODAIS
    const modal = document.getElementById('modalAcao');
    const btnNova = document.getElementById('btnNovaAcao');
    const btnFechar = document.getElementById('btnFecharModal');

    if(btnNova) btnNova.onclick = () => { modal.style.display = 'flex'; };
    if(btnFechar) btnFechar.onclick = () => { modal.style.display = 'none'; };
}

/**
 * Configura as abas de navegação do perfil
 */
export function setupTabsUI() {
    const tabs = document.querySelectorAll('.tab');
    const views = {
        0: 'view-combate',
        2: 'view-inventario'
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            Object.values(views).forEach(id => {
                const el = document.getElementById(id);
                if(el) el.style.display = 'none';
            });

            const viewId = views[index];
            if(viewId) {
                const el = document.getElementById(viewId);
                if(el) el.style.display = 'block';
            }
        });
    });
}
