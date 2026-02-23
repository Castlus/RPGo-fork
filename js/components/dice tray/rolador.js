/**
 * Inicializa a lógica da Bandeja de Dados (Dice Tray)
 * @param {Object} user - Objeto do usuário autenticado com propriedade id
 */
import { apiPatch } from "../../utils/api.js";
export function iniciarBandejaDados(user) {
    let dadosSelecionados = [];
    let modoNegativo = false;
    
    // ELEMENTOS
    const tray = document.getElementById('diceTray');
    const header = document.getElementById('diceTrayHeader');
    const icon = document.getElementById('trayIcon'); // Ícone da setinha
    
    // VARIÁVEIS DE ARRASTO
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let hasMoved = false;
    let dragStartTime = 0;

    // Estado Inicial: Grudado em baixo
    tray.classList.add('dock-bottom', 'collapsed');

    // --- LÓGICA DE ARRASTAR (MOUSEDOWN) ---
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        hasMoved = false;
        dragStartTime = Date.now();
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = tray.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        header.style.cursor = 'grabbing';
    });

    // --- MOVIMENTO (MOUSEMOVE) ---
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Só considera movimento se passar de 5px
        if (!hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            hasMoved = true;
            
            // Verifica estado atual
            const isCollapsed = tray.classList.contains('collapsed');
            
            // Remove classes de dock
            tray.classList.remove('dock-bottom', 'dock-side');
            
            if (isCollapsed) {
                tray.style.transition = 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease';
                icon.className = "fas fa-dice-d20"; 
            } else {
                tray.style.transition = 'none'; 
            }

            // Aplica posição inicial corrigida
            tray.style.left = `${initialLeft}px`;
            tray.style.top = `${initialTop}px`;
            tray.style.bottom = 'auto';
            tray.style.right = 'auto';
        }

        if (hasMoved) {
            // Calcula nova posição
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // REGRA 1: NÃO SAIR DA TELA
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // Usa o tamanho atual da bandeja (seja bolinha ou aberta)
            const currentWidth = tray.offsetWidth;
            const currentHeight = tray.offsetHeight;

            // Clampa (limita) os valores dentro da janela
            newLeft = Math.max(0, Math.min(newLeft, windowWidth - currentWidth));
            newTop = Math.max(0, Math.min(newTop, windowHeight - currentHeight));

            // Aplica posição
            tray.style.left = `${newLeft}px`;
            tray.style.top = `${newTop}px`;
            
            // Remove ancoragens antigas
            tray.style.bottom = 'auto';
            tray.style.right = 'auto';
        }
    });

    // --- SOLTAR (MOUSEUP) ---
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        header.style.cursor = 'grab';
        
        // Restaura a transição suave para o efeito de "snap"
        tray.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

        if (hasMoved) {
            snapToNearestEdge();
        }
    });

    // --- FUNÇÃO: GRUDAR NA BORDA MAIS PRÓXIMA ---
    function snapToNearestEdge() {
        const rect = tray.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Distâncias para as bordas
        const distLeft = rect.left;
        const distRight = windowWidth - (rect.left + rect.width);
        const distBottom = windowHeight - (rect.top + rect.height);
        
        const snapThreshold = 80; 
        const safeMargin = 20;
        const estimatedHeight = 400; // Altura estimada da bandeja aberta

        // Limpa classes antigas
        tray.classList.remove('dock-bottom', 'dock-side');
        
        if (distBottom < snapThreshold) {
            // GRUDA EM BAIXO
            tray.classList.add('dock-bottom');
            tray.classList.add('collapsed');
            
            const collapsedHeight = 45; 
            const targetTop = windowHeight - collapsedHeight;
            
            tray.style.bottom = 'auto'; 
            tray.style.top = `${targetTop}px`;
            tray.style.left = `${Math.max(0, Math.min(rect.left, windowWidth - 300))}px`;
            tray.style.right = 'auto';
            
            icon.className = "fas fa-chevron-up"; 

            // Depois da animação, fixa no bottom para responsividade
            setTimeout(() => {
                if (tray.classList.contains('dock-bottom') && !isDragging) {
                    tray.style.top = 'auto';
                    tray.style.bottom = '0';
                }
            }, 300);

        } else if (distLeft < snapThreshold) {
            // GRUDA ESQUERDA
            tray.classList.add('dock-side');
            tray.classList.add('collapsed');
            
            tray.style.right = 'auto';
            tray.style.left = '0'; 
            tray.style.bottom = 'auto';
            
            // Ajusta Top para ficar visível
            let targetTop = Math.max(safeMargin, Math.min(rect.top, windowHeight - 100));
            tray.style.top = `${targetTop}px`;

            icon.className = "fas fa-dice-d20";

        } else if (distRight < snapThreshold) {
            // GRUDA DIREITA
            tray.classList.add('dock-side');
            tray.classList.add('collapsed');
            
            tray.style.left = 'auto';
            tray.style.right = '0'; 
            tray.style.bottom = 'auto';
            
            let targetTop = Math.max(safeMargin, Math.min(rect.top, windowHeight - 100));
            tray.style.top = `${targetTop}px`;

            icon.className = "fas fa-dice-d20";

        } else {
            // FLUTUANDO
            
            // Ajusta Horizontal
            let finalLeft = rect.left;
            if (finalLeft + 300 > windowWidth) {
                finalLeft = windowWidth - 300 - safeMargin;
            }
            tray.style.left = `${Math.max(safeMargin, finalLeft)}px`;
            tray.style.right = 'auto';

            // Ajusta Vertical
            // Expande pra CIMA se necessário
            if (rect.top + estimatedHeight > windowHeight) {
                const bottomPos = windowHeight - rect.bottom;
                tray.style.bottom = `${Math.max(safeMargin, bottomPos)}px`;
                tray.style.top = 'auto';
            } else {
                tray.style.top = `${rect.top}px`;
                tray.style.bottom = 'auto';
            }
            
            // Ajusta ícone conforme estado
            if (tray.classList.contains('collapsed')) {
                icon.className = "fas fa-dice-d20";
            } else {
                icon.className = "fas fa-times";
            }
        }
    }

    // --- CLIQUE (ABRIR/FECHAR) ---
    header.addEventListener('click', () => {
        // Clique rápido sem arrastar
        const clickDuration = Date.now() - dragStartTime;
        
        if (!hasMoved && clickDuration < 200) {
            const willOpen = tray.classList.contains('collapsed');
            const isFloating = !tray.classList.contains('dock-bottom') && !tray.classList.contains('dock-side');
            const trayBody = tray.querySelector('.tray-body');

            if (willOpen) {
                // --- ABRINDO ---
                const rect = tray.getBoundingClientRect();
                const startHeight = tray.offsetHeight;
                const startWidth = tray.offsetWidth;
                
                // Mede tamanho final
                tray.style.transition = 'none';
                tray.classList.remove('collapsed');
                tray.style.height = 'auto';
                tray.style.width = '300px';
                tray.style.overflow = 'hidden';
                if(trayBody) trayBody.style.overflow = 'hidden';
                
                const targetHeight = tray.scrollHeight;
                
                // Posicionamento Inteligente
                const windowHeight = window.innerHeight;
                const windowWidth = window.innerWidth;
                
                const spaceBelow = windowHeight - rect.top;
                const spaceAbove = rect.bottom; 
                
                // Expande para cima se pouco espaço
                if (spaceBelow < 350 && spaceAbove > spaceBelow) {
                    const bottomPos = windowHeight - rect.bottom;
                    tray.style.bottom = `${bottomPos}px`;
                    tray.style.top = 'auto';
                } else {
                    tray.style.top = `${rect.top}px`;
                    tray.style.bottom = 'auto';
                }

                // Correção Horizontal
                if (isFloating) {
                    const expandedWidth = 300;
                    if (rect.left + expandedWidth > windowWidth) {
                        const newLeft = windowWidth - expandedWidth - 10;
                        tray.style.left = `${Math.max(0, newLeft)}px`;
                    }
                }

                // Inicia animação
                tray.style.height = `${startHeight}px`;
                tray.style.width = `${startWidth}px`;
                
                tray.offsetHeight; // Força reflow
                
                tray.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
                tray.style.height = `${targetHeight}px`;
                tray.style.width = '300px';

                // Limpa estilos
                setTimeout(() => {
                    if (!tray.classList.contains('collapsed')) {
                        tray.style.height = 'auto';
                        tray.style.width = '';
                        tray.style.overflow = '';
                        if(trayBody) trayBody.style.overflow = '';
                    }
                }, 300);

            } else {
                // --- FECHANDO ---
                tray.style.height = `${tray.offsetHeight}px`;
                tray.style.width = `${tray.offsetWidth}px`;
                tray.style.overflow = 'hidden';
                if(trayBody) trayBody.style.overflow = 'hidden';
                
                tray.offsetHeight; // Força reflow

                tray.classList.add('collapsed');
                tray.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
                
                if (tray.classList.contains('dock-side')) {
                    tray.style.height = '50px';
                    tray.style.width = '50px';
                } else {
                    tray.style.height = '45px';
                    tray.style.width = '300px';
                }

                // Limpa estilos
                setTimeout(() => {
                    if (tray.classList.contains('collapsed')) {
                        tray.style.height = '';
                        tray.style.width = '';
                        tray.style.overflow = '';
                        if(trayBody) trayBody.style.overflow = '';
                    }
                }, 300);
            }
            
            // Atualiza ícone
            const isCollapsed = tray.classList.contains('collapsed');
            const isBottom = tray.classList.contains('dock-bottom');

            if (!isBottom) {
                icon.className = isCollapsed ? "fas fa-dice-d20" : "fas fa-times";
            } else {
                if (isCollapsed) {
                    const rect = tray.getBoundingClientRect();
                    if (rect.top < window.innerHeight / 2) icon.className = "fas fa-chevron-down";
                    else icon.className = "fas fa-chevron-up";
                } else {
                    icon.className = "fas fa-chevron-up"; 
                }
            }
        }
    });

    // =========================================================
    // LÓGICA DE ROLAGEM
    // =========================================================
    const diceContainer = document.getElementById('diceContainer');
    const btnToggleSign = document.getElementById('btnToggleSign');
    const txtTotal = document.getElementById('txtTotal');
    const txtDetalhes = document.getElementById('txtDetalhes');
    const inputMod = document.getElementById('inputModificador');

    function atualizarPreview() {
        if(dadosSelecionados.length === 0 && Number(inputMod.value) === 0) {
            txtDetalhes.innerText = "Selecione dados...";
            txtTotal.innerText = "--";
            return;
        }
        let formula = "";
        dadosSelecionados.forEach((d, index) => {
            const nomeDado = `1d${d.faces}`;
            let operador = "";
            if (index === 0) {
                if (d.sinal === -1) operador = "- ";
            } else {
                operador = d.sinal === 1 ? " + " : " - ";
            }
            formula += `${operador}${nomeDado}`;
        });
        const mod = Number(inputMod.value);
        if(mod !== 0) {
            if(dadosSelecionados.length > 0) formula += mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`;
            else formula += `${mod}`;
        }
        txtDetalhes.innerText = formula;
        txtTotal.innerText = "??";
    }

    btnToggleSign.addEventListener('click', () => {
        modoNegativo = !modoNegativo;
        if(modoNegativo) {
            diceContainer.classList.add('negative-mode');
            btnToggleSign.innerText = "-";
        } else {
            diceContainer.classList.remove('negative-mode');
            btnToggleSign.innerText = "+";
        }
    });

    document.querySelectorAll('.dice-btn[data-faces]').forEach(btn => {
        btn.addEventListener('click', () => {
            const faces = Number(btn.getAttribute('data-faces'));
            const sinal = modoNegativo ? -1 : 1;
            dadosSelecionados.push({ faces, sinal });
            atualizarPreview();
        });
    });

    inputMod.addEventListener('input', atualizarPreview);

    document.getElementById('btnLimparTray').addEventListener('click', () => {
        dadosSelecionados = [];
        inputMod.value = 0;
        txtTotal.innerText = "--";
        txtDetalhes.innerText = "Bandeja limpa";
        modoNegativo = false;
        diceContainer.classList.remove('negative-mode');
        btnToggleSign.innerText = "+";
    });

    document.getElementById('btnRolarTray').addEventListener('click', () => {
        if(dadosSelecionados.length === 0 && Number(inputMod.value) === 0) return;

        let total = 0;
        let partesTexto = [];

        dadosSelecionados.forEach(d => {
            const resultado = Math.floor(Math.random() * d.faces) + 1;
            total += (resultado * d.sinal);
            let resFormatado = resultado;
            if (resultado === 1) resFormatado = `<span class="crit-fail">${resultado}</span>`;
            else if (resultado === d.faces) resFormatado = `<span class="crit-success">${resultado}</span>`;
            partesTexto.push({ texto: `(${resFormatado}) 1d${d.faces}`, sinal: d.sinal });
        });

        const mod = Number(inputMod.value);
        total += mod;

        let stringFinal = "";
        partesTexto.forEach((parte, index) => {
            let operador = "";
            if (index === 0) {
                if (parte.sinal === -1) operador = "- ";
            } else {
                operador = parte.sinal === 1 ? " + " : " - ";
            }
            stringFinal += `${operador}${parte.texto}`;
        });

        if (mod !== 0) stringFinal += ` ${mod >= 0 ? '+' : '-'} ${Math.abs(mod)}`;

        txtTotal.innerText = total;
        txtDetalhes.innerHTML = `[${total}] = ${stringFinal}`;

        const textoLimpo = `[${total}] = ${stringFinal.replace(/<[^>]*>?/gm, '')}`;
        
        // Salva a última rolagem no backend
        if (user && user.id) {
            apiPatch(`/users/${user.id}`, { ultimaRolagem: textoLimpo }).catch(console.error);
        }
        
        dadosSelecionados = [];
    });
}
