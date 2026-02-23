/**
 * Carrega o perfil do personagem
 * @param {string} uid - ID do usuário no Firebase
 * @param {Object} dbRefs - Objeto com funções Firebase { db, ref, onValue, update }
 */import { notificar } from "../../utils/modal-utils.js";
export function carregarPerfil(uid, dbRefs) {
    const { db, ref, onValue, update } = dbRefs;
    const fichaRef = ref(db, 'users/' + uid);

    // DADOS DO PERFIL
    onValue(fichaRef, (snapshot) => {
        const dados = snapshot.val();
        if(!dados) return;

        const elNome = document.getElementById('displayNome');
        if(elNome) elNome.innerText = dados.nome;
        
        // Carrega o Nível
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
            notificar("Sucesso", "Ficha atualizada com sucesso!");
            modalFicha.style.display = 'none';
        });
    };
}

/**
 * Configura o sistema de tema (Dark Mode)
 */
export function configurarTema() {
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
