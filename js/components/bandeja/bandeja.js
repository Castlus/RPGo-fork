/**
 * Bandeja Unificada — Orquestrador de drag/snap/dock + troca de painéis.
 *
 * Delega a lógica de rolagem para rolador-logic.js
 * e a lógica de chat para chat-logic.js.
 *
 * @param {Object} user    - Objeto do usuário autenticado ({ id, email })
 */
import { iniciarRolador } from './rolador-logic.js';
import { iniciarChat }    from './chat-logic.js';
export function iniciarBandeja(user) {
    const SESSION_ID = 'mesa-principal';


    // =========================================================
    // ELEMENTOS
    // =========================================================
    const bandeja    = document.getElementById('bandeja');
    const header     = document.getElementById('bandejaHeader');
    const icon       = document.getElementById('bandejaIcon');
    const iconLeft   = document.getElementById('bandejaIconLeft');

    // =========================================================
    // VARIÁVEIS DE ARRASTO
    // =========================================================
    let isDragging = false, hasMoved = false, dragStartTime = 0;
    let startX, startY, initialLeft, initialTop;

    // Estado inicial: barra na base da tela
    bandeja.classList.add('dock-bottom', 'collapsed');
    atualizarIcone();

    // =========================================================
    // SWITCH DE PAINÉIS
    // =========================================================
    let abaAtiva = 'rolador';
    const titulo = document.getElementById('bandejaTitulo');

    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            trocarAba(btn.dataset.tab);
        });
    });

    function trocarAba(tab) {
        abaAtiva = tab;
        document.querySelectorAll('.switch-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.getElementById('painelRolador').classList.toggle('active', tab === 'rolador');
        document.getElementById('painelChat').classList.toggle('active', tab === 'chat');
        iconLeft.className = tab === 'rolador' ? 'fas fa-dice-d20' : 'fas fa-comment';
        if (titulo) titulo.textContent = tab === 'rolador' ? 'Rolador' : 'Chat';
        if (tab === 'chat') chatApi.ativar();
    }

    // =========================================================
    // DRAG — MOUSEDOWN
    // =========================================================
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.switch-btn')) return; // switch não arrasta
        isDragging = true;
        hasMoved = false;
        dragStartTime = Date.now();
        startX = e.clientX;
        startY = e.clientY;
        const rect = bandeja.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop  = rect.top;
        header.style.cursor = 'grabbing';
    });

    // =========================================================
    // DRAG — MOUSEMOVE
    // =========================================================
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            hasMoved = true;
            const isCollapsed = bandeja.classList.contains('collapsed');
            bandeja.classList.remove('dock-bottom', 'dock-side');
            bandeja.style.transition = isCollapsed
                ? 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease'
                : 'none';
            bandeja.style.left   = `${initialLeft}px`;
            bandeja.style.top    = `${initialTop}px`;
            bandeja.style.bottom = 'auto';
            bandeja.style.right  = 'auto';
        }

        if (hasMoved) {
            const W = window.innerWidth, H = window.innerHeight;
            const newLeft = Math.max(0, Math.min(initialLeft + dx, W - bandeja.offsetWidth));
            const newTop  = Math.max(0, Math.min(initialTop  + dy, H - bandeja.offsetHeight));
            bandeja.style.left   = `${newLeft}px`;
            bandeja.style.top    = `${newTop}px`;
            bandeja.style.bottom = 'auto';
            bandeja.style.right  = 'auto';
        }
    });

    // =========================================================
    // DRAG — MOUSEUP (soltar → snap)
    // =========================================================
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        header.style.cursor = 'grab';
        bandeja.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        if (hasMoved) {
            snapToNearestEdge();
            setTimeout(() => { hasMoved = false; }, 50);
        }
    });

    // =========================================================
    // TOGGLE — ABRIR / FECHAR (click no header)
    // =========================================================
    header.addEventListener('click', (e) => {
        if (e.target.closest('.switch-btn')) return; // já tratado no switch
        const clickDuration = Date.now() - dragStartTime;
        if (hasMoved || clickDuration >= 200) return;

        const willOpen    = bandeja.classList.contains('collapsed');
        const isFloating  = !bandeja.classList.contains('dock-bottom') && !bandeja.classList.contains('dock-side');
        const bandejaBody = bandeja.querySelector('.bandeja-body');

        if (willOpen) {
            // --- ABRINDO ---
            const rect  = bandeja.getBoundingClientRect();
            const startH = bandeja.offsetHeight;
            const startW = bandeja.offsetWidth;

            bandeja.style.transition = 'none';
            bandeja.classList.remove('collapsed');
            bandeja.style.height   = 'auto';
            bandeja.style.width    = '320px';
            bandeja.style.overflow = 'hidden';
            if (bandejaBody) bandejaBody.style.overflow = 'hidden';

            const targetHeight = bandeja.scrollHeight;
            const W = window.innerWidth, H = window.innerHeight;

            // Posicionamento inteligente: abre para cima se perto do fundo
            if (H - rect.top < 350 && rect.bottom > H - rect.top) {
                bandeja.style.bottom = `${H - rect.bottom}px`;
                bandeja.style.top    = 'auto';
            } else {
                bandeja.style.top    = `${rect.top}px`;
                bandeja.style.bottom = 'auto';
            }
            if (isFloating && rect.left + 320 > W) {
                bandeja.style.left = `${Math.max(0, W - 320 - 10)}px`;
            }

            // Anima
            bandeja.style.height = `${startH}px`;
            bandeja.style.width  = `${startW}px`;
            bandeja.offsetHeight; // força reflow
            bandeja.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
            bandeja.style.height = `${targetHeight}px`;
            bandeja.style.width  = '320px';

            setTimeout(() => {
                if (!bandeja.classList.contains('collapsed')) {
                    bandeja.style.height   = 'auto';
                    bandeja.style.width    = '';
                    bandeja.style.overflow = '';
                    if (bandejaBody) bandejaBody.style.overflow = '';
                }
            }, 300);

            // Ativa chat se painel estiver visível
            if (abaAtiva === 'chat') chatApi.ativar();

        } else {
            // --- FECHANDO ---
            const bandejaBody2 = bandeja.querySelector('.bandeja-body');
            bandeja.style.height   = `${bandeja.offsetHeight}px`;
            bandeja.style.width    = `${bandeja.offsetWidth}px`;
            bandeja.style.overflow = 'hidden';
            if (bandejaBody2) bandejaBody2.style.overflow = 'hidden';

            bandeja.offsetHeight; // força reflow
            bandeja.classList.add('collapsed');
            bandeja.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

            if (bandeja.classList.contains('dock-side')) {
                bandeja.style.height = '50px';
                bandeja.style.width  = '50px';
            } else {
                bandeja.style.height = '45px';
                bandeja.style.width  = '320px';
            }

            setTimeout(() => {
                if (bandeja.classList.contains('collapsed')) {
                    bandeja.style.height   = '';
                    bandeja.style.width    = '';
                    bandeja.style.overflow = '';
                    if (bandejaBody2) bandejaBody2.style.overflow = '';
                }
            }, 300);
        }

        atualizarIcone();
    });

    // =========================================================
    // SNAP TO NEAREST EDGE
    // =========================================================
    function snapToNearestEdge() {
        const rect = bandeja.getBoundingClientRect();
        const W = window.innerWidth, H = window.innerHeight;
        const distLeft   = rect.left;
        const distRight  = W - (rect.left + rect.width);
        const distBottom = H - (rect.top  + rect.height);
        const snapThreshold = 80, safeMargin = 20;

        bandeja.classList.remove('dock-bottom', 'dock-side');

        if (distBottom < snapThreshold) {
            bandeja.classList.add('dock-bottom', 'collapsed');
            bandeja.style.top    = `${H - 45}px`;
            bandeja.style.left   = `${Math.max(0, Math.min(rect.left, W - 320))}px`;
            bandeja.style.bottom = 'auto';
            bandeja.style.right  = 'auto';
            setTimeout(() => {
                if (bandeja.classList.contains('dock-bottom') && !isDragging) {
                    bandeja.style.top    = 'auto';
                    bandeja.style.bottom = '0';
                }
            }, 300);

        } else if (distLeft < snapThreshold) {
            bandeja.classList.add('dock-side', 'collapsed');
            bandeja.style.left   = '0';
            bandeja.style.right  = 'auto';
            bandeja.style.bottom = 'auto';
            bandeja.style.top    = `${Math.max(safeMargin, Math.min(rect.top, H - 100))}px`;

        } else if (distRight < snapThreshold) {
            bandeja.classList.add('dock-side', 'collapsed');
            bandeja.style.right  = '0';
            bandeja.style.left   = 'auto';
            bandeja.style.bottom = 'auto';
            bandeja.style.top    = `${Math.max(safeMargin, Math.min(rect.top, H - 100))}px`;

        } else {
            // Flutuando
            let finalLeft = rect.left;
            if (finalLeft + 320 > W) finalLeft = W - 320 - safeMargin;
            bandeja.style.left  = `${Math.max(safeMargin, finalLeft)}px`;
            bandeja.style.right = 'auto';
            if (rect.top + 400 > H) {
                bandeja.style.bottom = `${Math.max(safeMargin, H - rect.bottom)}px`;
                bandeja.style.top    = 'auto';
            } else {
                bandeja.style.top    = `${rect.top}px`;
                bandeja.style.bottom = 'auto';
            }
        }

        atualizarIcone();
    }

    // =========================================================
    // ATUALIZAR ÍCONE
    // =========================================================
    function atualizarIcone() {
        const isCollapsed = bandeja.classList.contains('collapsed');
        const isSide      = bandeja.classList.contains('dock-side');
        const isBottom    = bandeja.classList.contains('dock-bottom');

        if (isSide && isCollapsed) {
            // Bolinha lateral: mostra ícone da aba ativa
            icon.className = abaAtiva === 'chat' ? 'fas fa-comment' : 'fas fa-dice-d20';
        } else if (!isCollapsed) {
            // Aberta: X para fechar (ou chevron se em baixo)
            icon.className = isBottom ? 'fas fa-chevron-down' : 'fas fa-times';
        } else {
            // Collapsed em baixo ou flutuando: chevron para abrir
            icon.className = 'fas fa-chevron-up';
        }
    }

    // =========================================================
    // INICIALIZAR SUBMÓDULOS
    // =========================================================
    const chatApi = iniciarChat(user, SESSION_ID);
    iniciarRolador(user, {
        onRolar: (dados) => chatApi.enviarRolagem(dados)
    });
}

