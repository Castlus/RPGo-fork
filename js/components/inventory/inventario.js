/**
 * Configura a interface do inventário
 * @param {string} uid - ID do usuário (Supabase)
 */
import { notificar, confirmar } from "../../utils/modal-utils.js";
import { supabase, apiGet, apiPost, apiPatch, apiDelete } from "../../utils/api.js";

// Estado global do módulo para permitir re-renderização
let inventarioState = {
    itens: {},
    mostrarEquipados: false,
    uid: null,
    categoriaAtual: 'section-arsenal'
};

export function setupInventoryUI(uid) {
    
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

    // Navegação Categorias
    const categoryBtns = document.querySelectorAll('.btn-category');
    if(categoryBtns) {
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                inventarioState.categoriaAtual = btn.getAttribute('data-target');
                renderizarItens();
            });
        });
    }

    // BOTÃO TOGGLE EQUIPADOS
    const btnToggle = document.getElementById('btnToggleEquipados');
    if(btnToggle) {
        btnToggle.onclick = () => {
            inventarioState.mostrarEquipados = !inventarioState.mostrarEquipados;
            
            // Atualiza visual do botão via Classe (CSS lida com cores/tema)
            const span = btnToggle.querySelector('.btn-text');
            if(inventarioState.mostrarEquipados) {
                btnToggle.classList.add('active');
                span.innerText = "Ver Todos";
            } else {
                btnToggle.classList.remove('active');
                span.innerText = "Ver Equipados";
            }
            
            // Limpa estilos inline residuais se houver (por segurança)
            btnToggle.style.background = '';
            btnToggle.style.color = '';
            
            renderizarItens();
        };
    }

    // MODAL ITEM
    const btnNovoItem = document.getElementById('btnNovoItem');
    const modalItem = document.getElementById('modalItem');
    const btnFecharItem = document.getElementById('btnFecharModalItem');
    const btnSalvarItem = document.getElementById('btnSalvarItem');
    const selectType = document.getElementById('newItemType');
    const weaponFields = document.getElementById('weaponFields');
    const armorFields = document.getElementById('armorFields');
    const modalTitle = modalItem.querySelector('h2');

    // Controle de edição
    let editingItemId = null;

    if(selectType) {
        selectType.addEventListener('change', () => {
            if(selectType.value === 'arma') {
                weaponFields.style.display = 'grid';
                if(armorFields) armorFields.style.display = 'none';
            } else if(selectType.value === 'armadura') {
                weaponFields.style.display = 'none';
                if(armorFields) armorFields.style.display = 'grid';
            } else {
                weaponFields.style.display = 'none';
                if(armorFields) armorFields.style.display = 'none';
            }
        });
    }

    // Abrir Modal
    window.abrirModalItem = (item = null, id = null) => {
        modalItem.style.display = 'flex';
        
        // Reset campos específicos
        if(weaponFields) weaponFields.style.display = 'none';
        if(armorFields) armorFields.style.display = 'none';

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
            } else if (item.tipo === 'armadura') {
                if(armorFields) armorFields.style.display = 'grid';
                document.getElementById('newItemAC').value = item.ca || "";
                document.getElementById('newItemDexPenalty').value = item.penalidadeDes || "";
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
            document.getElementById('newItemAC').value = "";
            document.getElementById('newItemDexPenalty').value = "";
            
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
            const ca = document.getElementById('newItemAC').value;
            const penDes = document.getElementById('newItemDexPenalty').value;
            
            if(nome) {
                const itemData = {
                    nome, 
                    peso: Number(peso), 
                    tipo, 
                    tags, 
                    descricao: desc, 
                    dano: tipo === 'arma' ? dano : '',
                    modificador: tipo === 'arma' ? Number(mod) : 0,
                    ca: tipo === 'armadura' ? Number(ca) : 0,
                    penalidadeDes: tipo === 'armadura' ? Number(penDes) : 0,
                    // Mantém estado equipado e favorito
                    equipado: editingItemId ? undefined : false,
                    favorito: editingItemId ? undefined : false
                };

                // Remove undefined keys
                Object.keys(itemData).forEach(key => itemData[key] === undefined && delete itemData[key]);

                if(editingItemId) {
                    apiPatch(`/users/${uid}/inventario/${editingItemId}`, itemData);
                } else {
                    apiPost(`/users/${uid}/inventario`, itemData);
                }

                modalItem.style.display = 'none';
            } else {
                notificar("Campo Obrigatório", "Nome é obrigatório para criar um item!");
            }
        };
    }
}

// Converte array de itens (API) → objeto { id: item } usado internamente
function arrayParaMapa(arr) {
    return (arr || []).reduce((acc, item) => { acc[item.id] = item; return acc; }, {});
}

/**
 * Carrega e exibe o inventário do usuário
 * @param {string} uid - ID do usuário (Supabase)
 */
export function carregarInventario(uid) {
    // Atualiza estado global
    inventarioState.uid = uid;

    // Carga inicial: carga máxima vem do personagem, itens do inventário
    apiGet(`/users/${uid}`).then(p => {
        const elMax = document.getElementById('maxPeso');
        if (elMax) elMax.innerText = p.cargaMaxima || 20;
    }).catch(console.error);

    async function recarregar() {
        const itens = await apiGet(`/users/${uid}/inventario`).catch(() => []);
        inventarioState.itens = arrayParaMapa(itens);
        renderizarItens();
    }

    recarregar();

    // Realtime: re-renderiza em qualquer mudança no inventário
    supabase.channel(`inventario-${uid}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'itens',
            filter: `personagem_id=eq.${uid}`
        }, recarregar)
        .subscribe();
}

/**
 * Função interna para renderizar as listas baseado no estado atual
 */
function renderizarItens() {
    const { itens, mostrarEquipados, uid } = inventarioState;
    if(!uid) return; 

    // Containers
    const listaFavoritos = document.getElementById('lista-favoritos');
    const listaArsenal = document.getElementById('lista-arsenal');
    const listaArmaria = document.getElementById('lista-armaria');
    const listaMochila = document.getElementById('lista-mochila');
    
    const sectionFavoritos = document.getElementById('section-favoritos');
    const sectionArsenal = document.getElementById('section-arsenal');
    const sectionArmaria = document.getElementById('section-armaria');
    const sectionMochila = document.getElementById('section-mochila');
    
    // Cleanup lists
    if(listaFavoritos) listaFavoritos.innerHTML = "";
    if(listaArsenal) listaArsenal.innerHTML = "";
    if(listaArmaria) listaArmaria.innerHTML = "";
    if(listaMochila) listaMochila.innerHTML = "";
    
    let pesoTotal = 0;
    
    // Flags de visibilidade
    let hasFavorites = false;
    let hasArsenal = false;
    let hasArmaria = false;
    let hasMochila = false; // "Outros"

    // Buffers HTML
    let htmlFavoritos = "";
    let htmlArsenal = "";
    let htmlArmaria = "";
    let htmlMochila = "";

    if(itens) {
        Object.entries(itens)
        .sort((a, b) => (a[1].nome || "").localeCompare(b[1].nome || ""))
        .forEach(([id, item]) => {
            pesoTotal += Number(item.peso) || 0;
            
            // FILTRO DE VISUALIZAÇÃO
            if(mostrarEquipados && !item.equipado) {
                return; // Pula item se não estiver equipado no modo filtro
            }
            
            let itemHTML = `
                <div class="action-card type-comum collapsed expandable-card" data-id="${id}" style="cursor: pointer; box-shadow: ${item.favorito ? 'inset 0 0 0 2px #d4af37' : 'none'}; border-left: 4px solid ${item.equipado ? 'var(--primary)' : '#ccc'}; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div class="card-title" style="margin-bottom: 5px;">
                            <i class="fas fa-star btn-favorite-item" data-id="${id}" data-favorito="${!!item.favorito}" style="color: ${item.favorito ? '#d4af37' : '#ccc'}; cursor: pointer; margin-right: 5px; font-size: 0.9rem;"></i>
                            ${item.nome} ${item.equipado ? '<i class="fas fa-check-circle" style="color: var(--primary); margin-left: 5px;"></i>' : ''}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-sec); font-weight: bold; margin-left:10px; white-space: nowrap;">${item.peso} PC</div>
                    </div>
                    ${item.tipo === 'arma' && item.dano ? `<div style="font-size: 0.85rem; color: var(--color-power); font-weight: bold; margin-top: 8px;">⚔️ ${item.dano} ${item.modificador ? (item.modificador > 0 ? `+${item.modificador}` : item.modificador) : ''}</div>` : ''}
                    ${item.tipo === 'armadura' && item.ca ? `<div style="font-size: 0.85rem; color: #3498db; font-weight: bold; margin-top: 8px;">🛡️ CA ${item.ca > 0 ? '+' : ''}${item.ca} ${item.penalidadeDes ? `(DES ${item.penalidadeDes})` : ''}</div>` : ''}
                    <div class="card-desc" style="margin-top: 8px; pointer-events: none;">${item.descricao}</div>
                    <div class="card-tags" style="margin-top: 8px;">
                        ${item.tags ? item.tags.split(',').map(t => `<span class="tag tag-damage">${t.trim()}</span>`).join('') : ''}
                    </div>
                    <div class="card-actions" style="margin-top: 15px; display: flex; gap: 5px; justify-content: flex-end; align-items: center;">
                        ${(item.tipo === 'arma' || item.tipo === 'armadura') ? 
                            `<button class="btn-equip btn-rect outline ${item.equipado ? 'active' : ''}" data-id="${id}" data-tipo="${item.tipo}" data-equipado="${item.equipado}" style="font-size: 0.8rem; padding: 5px 10px;">
                                ${item.equipado ? 'Desequipar' : 'Equipar'}
                            </button>` 
                            : ''}
                        <i class="fas fa-edit btn-edit-item" data-id="${id}" style="color: var(--text-sec); cursor: pointer; margin-left: 5px;"></i>
                        <i class="fas fa-trash btn-delete-item" data-id="${id}" style="color: #ff6b6b; cursor: pointer; margin-left: 10px;"></i>
                    </div>
                </div>
            `;

            // Lógica de Distribuição
            if(!mostrarEquipados && item.favorito) {
                htmlFavoritos += itemHTML;
                hasFavorites = true;
            } else {
                if (item.tipo === 'arma') {
                    htmlArsenal += itemHTML;
                    hasArsenal = true;
                } else if (item.tipo === 'armadura') {
                    htmlArmaria += itemHTML;
                    hasArmaria = true;
                } else {
                    htmlMochila += itemHTML;
                    hasMochila = true;
                }
            }
        });
    }
    
    // Inserção no DOM
    if(listaFavoritos) listaFavoritos.innerHTML = htmlFavoritos;
    if(listaArsenal) listaArsenal.innerHTML = htmlArsenal;
    if(listaArmaria) listaArmaria.innerHTML = htmlArmaria;
    
    if(listaMochila) {
            if (!hasFavorites && !hasArsenal && !hasArmaria && !hasMochila) {
                listaMochila.innerHTML = '<div style="color: #666; font-style: italic; padding: 20px;">Inventário vazio...</div>';
            } else {
                listaMochila.innerHTML = htmlMochila;
            }
    }
    
    // CONTROLE DE VISIBILIDADE DAS SEÇÕES
    const containerCategories = document.getElementById('inventory-categories');
    
    // Atualizar botões ativos da categoria
    if(containerCategories) {
        const btns = containerCategories.querySelectorAll('.btn-category');
        btns.forEach(b => {
            if(b.getAttribute('data-target') === inventarioState.categoriaAtual) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    }

    if(mostrarEquipados) {
        if(containerCategories) containerCategories.style.display = 'none';

        if(sectionFavoritos) sectionFavoritos.style.display = 'none'; 
        if(sectionArsenal) sectionArsenal.style.display = hasArsenal ? 'block' : 'none';
        if(sectionArmaria) sectionArmaria.style.display = hasArmaria ? 'block' : 'none';
        if(sectionMochila) sectionMochila.style.display = hasMochila ? 'block' : 'none';
    } else {
        if(containerCategories) containerCategories.style.display = 'flex';

        // Favoritos sempre aparece se tiver itens
        if(sectionFavoritos) sectionFavoritos.style.display = hasFavorites ? 'block' : 'none';
        
        // Exibe apenas a categoria selecionada
        if(sectionArsenal) sectionArsenal.style.display = (inventarioState.categoriaAtual === 'section-arsenal') ? 'block' : 'none';
        if(sectionArmaria) sectionArmaria.style.display = (inventarioState.categoriaAtual === 'section-armaria') ? 'block' : 'none';
        if(sectionMochila) sectionMochila.style.display = (inventarioState.categoriaAtual === 'section-mochila') ? 'block' : 'none';
        
        // Se Inventário Vazio Total
        if(!hasFavorites && !hasArsenal && !hasArmaria && !hasMochila && sectionMochila) {
             // Força mochila para mostrar msg de vazio
             if(sectionMochila.style.display === 'none') sectionMochila.style.display = 'block';
        }
    }

    atualizarPeso(pesoTotal);
    setupItemListeners(uid, itens);
}

function setupItemListeners(uid, itens) {

    document.querySelectorAll('.btn-favorite-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const isFav = e.target.getAttribute('data-favorito') === 'true';
            const card = btn.closest('.action-card');
            
            if(card) {
                card.style.boxShadow = !isFav ? 'inset 0 0 0 2px #d4af37' : 'none';
                btn.style.color = !isFav ? '#d4af37' : '#ccc';
            }

            const id = e.target.getAttribute('data-id');
            apiPatch(`/users/${uid}/inventario/${id}`, { favorito: !isFav });
        });
    });

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
                apiDelete(`/users/${uid}/inventario/${e.target.getAttribute('data-id')}`);
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
            
            if(!estaEquipado) {
                // Se for armadura, só pode ter uma equipada por vez
                if (tipo === 'armadura') {
                    Object.entries(itens || {}).forEach(([k, v]) => {
                        if(v.tipo === tipo && v.equipado) {
                            apiPatch(`/users/${uid}/inventario/${k}`, { equipado: false });
                        }
                    });
                }
            }

            apiPatch(`/users/${uid}/inventario/${id}`, { equipado: !estaEquipado });
        });
    });

    document.querySelectorAll('.expandable-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if(e.target.closest('button') || e.target.closest('.fa-edit') || e.target.closest('.fa-trash') || e.target.closest('.fa-star')) return;

            const desc = card.querySelector('.card-desc');
            const tags = card.querySelector('.card-tags');
            const isCollapsed = card.classList.contains('collapsed');
            
            if(isCollapsed) {
                // EXPANDIR
                card.classList.remove('collapsed');
                card.classList.add('expanded');

                const descHeight = desc.scrollHeight;
                
                desc.style.maxHeight = '3em';
                if(tags) {
                    tags.style.maxHeight = '0px';
                    tags.style.opacity = '0';
                    tags.style.marginTop = '0px';
                }

                desc.offsetHeight; // force reflow

                desc.style.transition = `max-height ${Math.min(0.4 + (descHeight / 1000) * 0.4, 1.2)}s ease`;
                requestAnimationFrame(() => {
                    desc.style.maxHeight = descHeight + "px";
                });

                if(tags) {
                    tags.style.transition = 'all 0.4s ease';
                    requestAnimationFrame(() => {
                        tags.style.maxHeight = tags.scrollHeight + "px";
                        tags.style.opacity = '1';
                        tags.style.marginTop = '8px';
                    });
                }

            } else {
                // RECOLHER
                desc.style.maxHeight = desc.scrollHeight + "px";
                if(tags) {
                    tags.style.maxHeight = tags.scrollHeight + "px";
                    tags.style.marginTop = "8px";
                    tags.style.opacity = "1";
                }
                
                desc.offsetHeight; 
                
                desc.style.transition = 'max-height 0.3s ease';
                if(tags) tags.style.transition = 'all 0.3s ease';

                requestAnimationFrame(() => {
                    desc.style.maxHeight = '3em';
                    if(tags) {
                        tags.style.maxHeight = '0px';
                        tags.style.opacity = '0';
                        tags.style.marginTop = '0px';
                    }
                });

                setTimeout(() => {
                    if(!card.classList.contains('expanded')) return; 
                    card.classList.remove('expanded');
                    card.classList.add('collapsed');
                    
                    desc.style.maxHeight = null; 
                    desc.style.transition = ''; 
                    
                    if(tags) {
                        tags.style.maxHeight = null;
                        tags.style.marginTop = null;
                        tags.style.opacity = null;
                        tags.style.transition = '';
                    }
                }, 300);
            }
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
