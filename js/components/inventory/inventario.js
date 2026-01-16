/**
 * Configura a interface do inventário
 * @param {string} uid - ID do usuário no Firebase
 * @param {Object} dbRefs - Objeto com funções Firebase { ref, onValue, push, remove, update }
 */
import { notificar, confirmar } from "../../utils/modal-utils.js";

export function setupInventoryUI(uid, dbRefs) {
    const { ref, onValue } = dbRefs;
    
    // ABAS
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

    // MODAL ITEM
    const btnNovoItem = document.getElementById('btnNovoItem');
    const modalItem = document.getElementById('modalItem');
    const btnFecharItem = document.getElementById('btnFecharModalItem');
    const btnSalvarItem = document.getElementById('btnSalvarItem');
    const selectType = document.getElementById('newItemType');
    const weaponFields = document.getElementById('weaponFields');
    const modalTitle = modalItem.querySelector('h2');

    // Controle de edição
    let editingItemId = null;

    if(selectType) {
        selectType.addEventListener('change', () => {
            if(selectType.value === 'arma') {
                weaponFields.style.display = 'grid';
            } else {
                weaponFields.style.display = 'none';
            }
        });
    }

    // Abrir Modal
    window.abrirModalItem = (item = null, id = null) => {
        modalItem.style.display = 'flex';
        if(item) {
            // Edição
            editingItemId = id;
            modalTitle.innerText = "Editar Item";
            document.getElementById('newItemName').value = item.nome;
            document.getElementById('newItemWeight').value = item.peso;
            document.getElementById('newItemType').value = item.tipo;
            document.getElementById('newItemTags').value = item.tags || "";
            document.getElementById('newItemDesc').value = item.descricao || "";
            
            if(item.tipo === 'arma') {
                weaponFields.style.display = 'grid';
                document.getElementById('newItemDamage').value = item.dano || "";
                document.getElementById('newItemMod').value = item.modificador || "";
            } else {
                weaponFields.style.display = 'none';
            }
        } else {
            // Novo
            editingItemId = null;
            modalTitle.innerText = "Novo Item";
            document.getElementById('newItemName').value = "";
            document.getElementById('newItemTags').value = "";
            document.getElementById('newItemDesc').value = "";
            document.getElementById('newItemWeight').value = "1.0";
            document.getElementById('newItemDamage').value = "";
            document.getElementById('newItemMod').value = "";
            weaponFields.style.display = 'none';
            selectType.value = 'comum';
        }
    };

    if(btnNovoItem) btnNovoItem.onclick = () => { window.abrirModalItem(); };
    if(btnFecharItem) btnFecharItem.onclick = () => { modalItem.style.display = 'none'; };

    if(btnSalvarItem) {
        // Evita duplicação de listeners
        const novoBtn = btnSalvarItem.cloneNode(true);
        btnSalvarItem.parentNode.replaceChild(novoBtn, btnSalvarItem);
        
        novoBtn.onclick = () => {
            const nome = document.getElementById('newItemName').value;
            const peso = document.getElementById('newItemWeight').value;
            const tipo = document.getElementById('newItemType').value;
            const tags = document.getElementById('newItemTags').value;
            const desc = document.getElementById('newItemDesc').value;
            const dano = document.getElementById('newItemDamage').value;
            const mod = document.getElementById('newItemMod').value;
            
            if(nome) {
                const itemData = {
                    nome, 
                    peso: Number(peso), 
                    tipo, 
                    tags, 
                    descricao: desc, 
                    dano: tipo === 'arma' ? dano : '',
                    modificador: tipo === 'arma' ? Number(mod) : 0,
                    // Mantém estado equipado
                    equipado: editingItemId ? undefined : false 
                };

                // Remove undefined keys
                Object.keys(itemData).forEach(key => itemData[key] === undefined && delete itemData[key]);

                if(editingItemId) {
                    dbRefs.update(ref(dbRefs.db, 'users/' + uid + '/inventario/' + editingItemId), itemData);
                } else {
                    dbRefs.push(ref(dbRefs.db, 'users/' + uid + '/inventario'), itemData);
                }

                modalItem.style.display = 'none';
            } else {
                notificar("Campo Obrigatório", "Nome é obrigatório para criar um item!");
            }
        };
    }
}

/**
 * Carrega e exibe o inventário do usuário
 * @param {string} uid - ID do usuário no Firebase
 * @param {Object} dbRefs - Objeto com funções Firebase { db, ref, onValue, remove, update }
 */
export function carregarInventario(uid, dbRefs) {
    const { db, ref, onValue, remove, update } = dbRefs;
    
    const invRef = ref(db, 'users/' + uid + '/inventario');
    const cargaRef = ref(db, 'users/' + uid + '/cargaMaxima');

    // Carrega Carga Máxima
    onValue(cargaRef, (snapshot) => {
        const max = snapshot.val() || 20;
        const elMax = document.getElementById('maxPeso');
        if(elMax) elMax.innerText = max;
    });
    
    onValue(invRef, (snapshot) => {
        const itens = snapshot.val();
        const lista = document.getElementById('lista-inventario');
        const slotArma = document.getElementById('slot-arma').querySelector('.slot-content');
        const slotArmadura = document.getElementById('slot-armadura').querySelector('.slot-content');
        
        if(!lista) return;

        lista.innerHTML = "";
        slotArma.innerHTML = "";
        slotArmadura.innerHTML = "";
        
        let pesoTotal = 0;

        if(itens) {
            Object.entries(itens).forEach(([id, item]) => {
                pesoTotal += Number(item.peso) || 0;
                
                const itemHTML = `
                    <div class="action-card type-comum collapsed expandable-card" data-id="${id}" style="border-left: 4px solid ${item.equipado ? 'var(--primary)' : '#ccc'}; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div class="card-title" style="margin-bottom: 0;">${item.nome} ${item.equipado ? '<i class="fas fa-check-circle" style="color: var(--primary); margin-left: 5px;"></i>' : ''}</div>
                            <div style="font-size: 0.8rem; color: var(--text-sec); font-weight: bold;">${item.peso} PC</div>
                        </div>
                        ${item.tipo === 'arma' && item.dano ? `<div style="font-size: 0.85rem; color: var(--color-power); font-weight: bold; margin-top: 2px;">⚔️ ${item.dano} ${item.modificador ? (item.modificador > 0 ? `+${item.modificador}` : item.modificador) : ''}</div>` : ''}
                        <div class="card-desc" style="margin-top: 5px;">${item.descricao}</div>
                        <div class="card-tags" style="margin-top: 5px;">
                            ${item.tags ? item.tags.split(',').map(t => `<span class="tag tag-damage">${t.trim()}</span>`).join('') : ''}
                        </div>
                        <div class="card-actions" style="margin-top: 10px; display: flex; gap: 5px; justify-content: flex-end; align-items: center;">
                            ${(item.tipo === 'arma' || item.tipo === 'armadura') ? 
                                `<button class="btn-equip" data-id="${id}" data-tipo="${item.tipo}" data-equipado="${item.equipado}" style="background: var(--bg-button); color: var(--text-button); border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">${item.equipado ? 'Desequipar' : 'Equipar'}</button>` 
                                : ''}
                            <i class="fas fa-edit btn-edit-item" data-id="${id}" style="color: var(--text-sec); cursor: pointer; margin-left: 5px;"></i>
                            <i class="fas fa-trash btn-delete-item" data-id="${id}" style="color: #ff6b6b; cursor: pointer; margin-left: 10px;"></i>
                        </div>
                    </div>
                `;

                if(item.equipado) {
                    // Renderiza no Slot
                    const slotHTML = `
                        <div style="width: 100%; padding: 10px;">
                            <div style="font-weight: bold; color: var(--primary); font-size: 1.1rem;">${item.nome}</div>
                            ${item.tipo === 'arma' && item.dano ? `<div style="font-size: 0.9rem; color: var(--color-power); font-weight: bold; margin: 5px 0;">⚔️ ${item.dano} ${item.modificador ? (item.modificador > 0 ? `+${item.modificador}` : item.modificador) : ''}</div>` : ''}
                            <div style="font-size: 0.8rem; color: var(--text-sec); margin-bottom: 5px;">${item.tags || ''}</div>
                            <div style="font-size: 0.8rem; font-weight: bold; color: var(--text-main);">${item.peso} PC</div>
                            <button class="btn-equip" data-id="${id}" data-tipo="${item.tipo}" data-equipado="true" style="margin-top: 8px; font-size: 0.8rem; padding: 4px 12px; background: var(--bg-button); color: var(--text-button); border: none; border-radius: 4px; cursor: pointer;">Desequipar</button>
                        </div>
                    `;
                    if(item.tipo === 'arma') slotArma.innerHTML = slotHTML;
                    if(item.tipo === 'armadura') slotArmadura.innerHTML = slotHTML;
                } else {
                    // Renderiza na Mochila
                    lista.innerHTML += itemHTML;
                }
            });
        }
        
        atualizarPeso(pesoTotal);
        
        // Listeners
        document.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmado = await confirmar(
                    "Deletar Item",
                    "Tem certeza que quer apagar este item?",
                    "Deletar",
                    "Cancelar"
                );
                if(confirmado) {
                    remove(ref(db, 'users/' + uid + '/inventario/' + e.target.getAttribute('data-id')));
                }
            });
        });

        document.querySelectorAll('.btn-edit-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.getAttribute('data-id');
                const item = itens[id];
                window.abrirModalItem(item, id);
            });
        });

        document.querySelectorAll('.btn-equip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.getAttribute('data-id');
                const tipo = e.target.getAttribute('data-tipo');
                const estaEquipado = e.target.getAttribute('data-equipado') === 'true';
                
                // Desequipa outros do mesmo tipo
                if(!estaEquipado) {
                    Object.entries(itens || {}).forEach(([k, v]) => {
                        if(v.tipo === tipo && v.equipado) {
                            update(ref(db, 'users/' + uid + '/inventario/' + k), { equipado: false });
                        }
                    });
                }

                update(ref(db, 'users/' + uid + '/inventario/' + id), { equipado: !estaEquipado });
            });
        });

        // Expandir/Recolher
        document.querySelectorAll('.expandable-card').forEach(card => {
            card.addEventListener('click', () => {
                card.classList.toggle('collapsed');
                card.classList.toggle('expanded');
            });
        });
    });
}

/**
 * Atualiza a exibição do peso do inventário
 * @param {number} pesoTotal - Peso total do inventário
 */
function atualizarPeso(pesoTotal) {
    const elValPeso = document.getElementById('valPeso');
    const elMaxPeso = document.getElementById('maxPeso');
    const elFillPeso = document.getElementById('fillPeso');
    const msgSobrecarga = document.getElementById('msgSobrecarga');
    
    const maxPeso = Number(elMaxPeso.innerText) || 20;
    elValPeso.innerText = pesoTotal.toFixed(1);
    
    const pct = (pesoTotal / maxPeso) * 100;
    elFillPeso.style.width = `${Math.min(100, pct)}%`;
    
    // Cores Progressivas
    if (pct >= 100) {
        elFillPeso.style.background = '#ff4444';
        msgSobrecarga.style.display = 'block';
        msgSobrecarga.innerHTML = '<i class="fas fa-exclamation-triangle"></i> LIMITE ATINGIDO!';
    } else if (pct > 50) {
        // Sobrecarga
        if (pct >= 90) elFillPeso.style.background = '#ff4444';
        else if (pct >= 75) elFillPeso.style.background = 'orangered';
        else elFillPeso.style.background = 'var(--color-power)';
        
        msgSobrecarga.style.display = 'block';
        msgSobrecarga.innerHTML = '<i class="fas fa-weight-hanging"></i> SOBRECARGA';
    } else if (pct >= 25) {
        elFillPeso.style.background = 'var(--color-bonus)';
        msgSobrecarga.style.display = 'none';
    } else {
        elFillPeso.style.background = 'var(--color-react)';
        msgSobrecarga.style.display = 'none';
    }
}
