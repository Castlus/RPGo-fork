/**
 * Inicializa a lógica da Bandeja de Chat com Firebase e detecção de colisão.
 * O chat é compartilhado entre todos os jogadores via SESSION_ID fixo ('mesa-principal').
 *
 * @param {Object} user    - Objeto do usuário autenticado ({ uid, displayName, email })
 * @param {Object} dbRefs  - Referências Firebase: { db, ref, onValue, push, remove, query, orderByChild }
 *
 * REQUISITO: o HTML do componente (chat.html) deve ser injetado no DOM
 * ANTES desta função ser chamada (ver carregarComponenteChat em ficha.js).
 */
export function iniciarChatTray(user, dbRefs) {
    const { db, ref, get, onValue, push, remove, query, orderByChild } = dbRefs;

    // ID da sessão compartilhada entre todos os jogadores.
    // Todos leem e escrevem no mesmo nó do Firebase.
    // Para suporte a múltiplas mesas no futuro, basta tornar esse valor dinâmico.
    const SESSION_ID = 'mesa-principal';

    // Nome do personagem buscado do Firebase (fallback para e-mail)
    let nomePersonagem = user.email || 'Anônimo';
    get(ref(db, `users/${user.uid}`)).then((snap) => {
        if (snap.exists() && snap.val().nome) {
            nomePersonagem = snap.val().nome;
        }
    }).catch(() => {});

    console.log('iniciarChatTray chamado para user:', user.uid);
    // ELEMENTOS
    const chatTray = document.getElementById('chatTray');
    const header   = document.getElementById('chatTrayHeader');
    const icon     = document.getElementById('chatIcon');
    const diceTray = document.getElementById('diceTray');

    // VARIÁVEIS DE ARRASTO
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let hasMoved = false;
    let dragStartTime = 0;

    // Estado Inicial: Grudado em baixo
    chatTray.classList.add('dock-bottom', 'collapsed');
    atualizarIcone();

    // --- TOGGLE: ABRIR/FECHAR BANDEJA ---
    // Comportamento idêntico ao Dice Tray: anima expansão/colapso e atualiza ícone.
    header.addEventListener('click', () => {
        const clickDuration = Date.now() - dragStartTime;
        if (!hasMoved && clickDuration < 200) {
            const willOpen   = chatTray.classList.contains('collapsed');
            const isFloating = !chatTray.classList.contains('dock-bottom') && !chatTray.classList.contains('dock-side');
            const chatBody   = chatTray.querySelector('.chat-body');

            if (willOpen) {
                // --- ABRINDO ---
                const rect        = chatTray.getBoundingClientRect();
                const startHeight = chatTray.offsetHeight;
                const startWidth  = chatTray.offsetWidth;

                chatTray.style.transition = 'none';
                chatTray.classList.remove('collapsed');
                chatTray.style.height   = 'auto';
                chatTray.style.width    = '320px';
                chatTray.style.overflow = 'hidden';
                if (chatBody) chatBody.style.overflow = 'hidden';

                const targetHeight = chatTray.scrollHeight;

                // Posicionamento inteligente
                const windowHeight = window.innerHeight;
                const windowWidth  = window.innerWidth;
                if (windowHeight - rect.top < 350 && rect.bottom > windowHeight - rect.top) {
                    chatTray.style.bottom = `${windowHeight - rect.bottom}px`;
                    chatTray.style.top    = 'auto';
                } else {
                    chatTray.style.top    = `${rect.top}px`;
                    chatTray.style.bottom = 'auto';
                }
                if (isFloating && rect.left + 320 > windowWidth) {
                    chatTray.style.left = `${Math.max(0, windowWidth - 320 - 10)}px`;
                }

                // Anima
                chatTray.style.height = `${startHeight}px`;
                chatTray.style.width  = `${startWidth}px`;
                chatTray.offsetHeight;
                chatTray.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
                chatTray.style.height = `${targetHeight}px`;
                chatTray.style.width  = '320px';

                setTimeout(() => {
                    if (!chatTray.classList.contains('collapsed')) {
                        chatTray.style.height = 'auto';
                        chatTray.style.width  = '';
                        chatTray.style.overflow = '';
                        if (chatBody) chatBody.style.overflow = '';
                    }
                }, 300);

                carregarMensagens();

            } else {
                // --- FECHANDO ---
                chatTray.style.height   = `${chatTray.offsetHeight}px`;
                chatTray.style.width    = `${chatTray.offsetWidth}px`;
                chatTray.style.overflow = 'hidden';
                if (chatBody) chatBody.style.overflow = 'hidden';

                chatTray.offsetHeight;
                chatTray.classList.add('collapsed');
                chatTray.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

                if (chatTray.classList.contains('dock-side')) {
                    chatTray.style.height = '50px';
                    chatTray.style.width  = '50px';
                } else {
                    chatTray.style.height = '45px';
                    chatTray.style.width  = '320px';
                }

                setTimeout(() => {
                    if (chatTray.classList.contains('collapsed')) {
                        chatTray.style.height   = '';
                        chatTray.style.width    = '';
                        chatTray.style.overflow = '';
                        if (chatBody) chatBody.style.overflow = '';
                    }
                }, 300);
            }

            atualizarIcone();
        }
    });

    // --- ENVIAR MENSAGEM ---
    // O HTML do chat é injetado antes de iniciarChatTray ser chamado (ver ficha.js),
    // portanto os elementos já estão no DOM — sem necessidade de setInterval.
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');

    if (chatInput && sendBtn) {
        sendBtn.addEventListener('click', enviarMensagem);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                enviarMensagem();
            }
        });
    } else {
        console.error('Chat: #chatInput ou #sendChatBtn não encontrados no DOM.');
    }

    // --- FUNÇÃO: LIMPAR TODAS AS MENSAGENS ---
    function limparMensagens() {
        const messagesRef = ref(db, `sessions/${SESSION_ID}/mensagens`);
        
        const confirmacao = confirm('Tem certeza que deseja apagar TODAS as mensagens? Esta ação não pode ser desfeita.');
        
        if (confirmacao) {
            remove(messagesRef).then(() => {
                console.log('✓ Todas as mensagens foram apagadas');
                alert('✓ Histórico de mensagens apagado com sucesso');
            }).catch((error) => {
                console.error('Erro ao apagar mensagens:', error);
                alert('✗ Erro ao apagar mensagens: ' + error.message);
            });
        }
    }

    // --- FUNÇÃO: ENVIAR MENSAGEM PARA FIREBASE ---
    function enviarMensagem() {
        const chatInput = document.getElementById('chatInput');
        const mensagem = chatInput.value.trim();
        
        console.log('Tentando enviar mensagem:', mensagem);
        
        if (!mensagem) {
            console.log('Mensagem vazia');
            return;
        }

        // VERIFICA SE É O COMANDO /limpar
        if (mensagem.toLowerCase() === '/limpar') {
            chatInput.value = '';
            chatInput.focus();
            limparMensagens();
            return;
        }

        try {
            const timestamp = new Date().toISOString();
            const messagesRef = ref(db, `sessions/${SESSION_ID}/mensagens`);
            
            console.log('Enviando para Firebase...');
            
            push(messagesRef, {
                uid: user.uid,
                nome: nomePersonagem,
                mensagem: mensagem,
                timestamp: timestamp
            }).then(() => {
                console.log('Mensagem enviada com sucesso');
                chatInput.value = '';
                chatInput.focus();
            }).catch((error) => {
                console.error('Erro ao enviar mensagem:', error);
                alert('Erro ao enviar: ' + error.message);
            });
        } catch (error) {
            console.error('Erro na função enviarMensagem:', error);
            alert('Erro: ' + error.message);
        }
    }

    // --- FUNÇÃO: CARREGAR MENSAGENS ---
    // Guarda a função de cancelamento do listener ativo.
    // Deve ser chamada antes de registrar um novo listener para evitar duplicação
    // (e consequente renderização múltipla de mensagens a cada abertura do chat).
    let unsubscribeMensagens = null;

    function carregarMensagens() {
        const messagesContainer = document.getElementById('chatMessages');

        if (!messagesContainer) {
            console.error('Chat: #chatMessages não encontrado no DOM.');
            return;
        }

        // Cancela o listener anterior antes de registrar um novo
        if (unsubscribeMensagens) {
            unsubscribeMensagens();
            unsubscribeMensagens = null;
        }

        // Ordena por timestamp para garantir ordem cronológica independente da chave Firebase
        const mensagensQuery = query(
            ref(db, `sessions/${SESSION_ID}/mensagens`),
            orderByChild('timestamp')
        );

        unsubscribeMensagens = onValue(mensagensQuery, (snapshot) => {
            if (!snapshot.exists()) {
                messagesContainer.innerHTML = '<p style="color: #999; text-align: center; font-size: 0.9rem;">Nenhuma mensagem ainda...</p>';
                return;
            }

            const dados = snapshot.val();
            if (!dados) return;

            let html = '';

            Object.entries(dados).forEach(([key, msg]) => {
                if (!msg || !msg.timestamp) return;

                const hora = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const isSent = msg.uid === user.uid;
                const nomeExibido = isSent ? 'Você' : msg.nome;
                
                // Renderiza mensagem de rolagem de dados
                if (msg.tipo === 'rolagem' && msg.detalhes) {
                    let detalhesHtml = '';
                    msg.detalhes.forEach((d) => {
                        const sinalTexto = d.sinal === -1 ? '-' : '+';
                        detalhesHtml += `<span class="roll-detail">${sinalTexto} ${d.resultado}d${d.faces}</span>`;
                    });
                    if (msg.modificador && msg.modificador !== 0) {
                        const modSinal = msg.modificador >= 0 ? '+' : '-';
                        detalhesHtml += `<span class="roll-detail">${modSinal} ${Math.abs(msg.modificador)}</span>`;
                    }
                    html += `
                        <div class="chat-message roll-message">
                            <div class="roll-header">${hora} <strong>${nomeExibido}</strong></div>
                            <div class="roll-box">
                                <div class="roll-total">${msg.total}</div>
                                <div class="roll-details">${detalhesHtml}</div>
                            </div>
                        </div>
                    `;
                } else {
                    // Mensagem de texto normal
                    html += `<div class="chat-message">${hora} <strong>${nomeExibido}</strong>: ${msg.mensagem}</div>`;
                }
            });

            if (html) {
                messagesContainer.innerHTML = html;
                // Auto-scroll para a última mensagem
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, (error) => {
            console.error('Chat: erro ao carregar mensagens:', error);
        });
    }

    // --- FUNÇÃO: ATUALIZAR ÍCONE CONFORME ESTADO E POSIÇÃO ---
    function atualizarIcone() {
        const isCollapsed = chatTray.classList.contains('collapsed');
        const isBottom    = chatTray.classList.contains('dock-bottom');
        const isSide      = chatTray.classList.contains('dock-side');

        if (isSide && isCollapsed) {
            // Bolinha lateral → ícone de chat centralizado
            icon.className = 'fas fa-comment';
        } else if (!isCollapsed) {
            // Aberto em qualquer posição: X para fechar
            icon.className = isBottom ? 'fas fa-chevron-down' : 'fas fa-times';
        } else {
            // Collapsed em baixo ou flutuando → chevron para abrir
            icon.className = 'fas fa-chevron-up';
        }
    }

    // --- LÓGICA DE ARRASTAR (MOUSEDOWN) ---
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        hasMoved = false;
        dragStartTime = Date.now();
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = chatTray.getBoundingClientRect();
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
            const isCollapsed = chatTray.classList.contains('collapsed');
            
            // Remove classes de dock
            chatTray.classList.remove('dock-bottom', 'dock-side');
            
            if (isCollapsed) {
                // Se estava recolhido, anima a transformação para barra
                chatTray.style.transition = 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease';
            } else {
                // Se estava aberto, sem transição
                chatTray.style.transition = 'none';
            }

            // Aplica posição inicial corrigida
            chatTray.style.left = `${initialLeft}px`;
            chatTray.style.top = `${initialTop}px`;
            chatTray.style.bottom = 'auto';
            chatTray.style.right = 'auto';
        }

        if (hasMoved) {
            // Calcula nova posição
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // REGRA 1: NÃO SAIR DA TELA
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            const currentWidth = chatTray.offsetWidth;
            const currentHeight = chatTray.offsetHeight;

            // Clampa (limita) os valores dentro da janela
            newLeft = Math.max(0, Math.min(newLeft, windowWidth - currentWidth));
            newTop = Math.max(0, Math.min(newTop, windowHeight - currentHeight));

            // REGRA 2: DETECTA COLISÃO COM DICE TRAY
            if (detectarColisao(newLeft, newTop, currentWidth, currentHeight)) {
                // Se vai colidir, não aplica a posição
                return;
            }

            // Aplica posição
            chatTray.style.left = `${newLeft}px`;
            chatTray.style.top = `${newTop}px`;
            
            // Remove ancoragens antigas
            chatTray.style.bottom = 'auto';
            chatTray.style.right = 'auto';
        }
    });

    // --- SOLTAR (MOUSEUP) ---
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        header.style.cursor = 'grab';
        
        // Restaura a transição suave para o efeito de "snap"
        chatTray.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

        if (hasMoved) {
            snapToNearestEdge();
            
            // Reseta hasMoved com delay para o click não disparar toggle
            setTimeout(() => {
                hasMoved = false;
            }, 50);
        }
    });

    // --- FUNÇÃO: GRUDAR NA BORDA MAIS PRÓXIMA ---
    function snapToNearestEdge() {
        const rect        = chatTray.getBoundingClientRect();
        const windowWidth  = window.innerWidth;
        const windowHeight = window.innerHeight;

        const distLeft   = rect.left;
        const distRight  = windowWidth  - (rect.left + rect.width);
        const distBottom = windowHeight - (rect.top  + rect.height);

        const snapThreshold = 80;
        const safeMargin    = 20;

        chatTray.classList.remove('dock-bottom', 'dock-side');

        if (distBottom < snapThreshold) {
            // GRUDA EM BAIXO
            chatTray.classList.add('dock-bottom', 'collapsed');

            // Anima do top calculado, depois fixa em bottom:0 (responsividade)
            const collapsedHeight = 45;
            chatTray.style.top   = `${windowHeight - collapsedHeight}px`;
            chatTray.style.left  = `${Math.max(0, Math.min(rect.left, windowWidth - 320))}px`;
            chatTray.style.bottom = 'auto';
            chatTray.style.right  = 'auto';

            setTimeout(() => {
                if (chatTray.classList.contains('dock-bottom') && !isDragging) {
                    chatTray.style.top    = 'auto';
                    chatTray.style.bottom = '0';
                }
            }, 300);

        } else if (distLeft < snapThreshold) {
            // GRUDA ESQUERDA
            chatTray.classList.add('dock-side', 'collapsed');
            chatTray.style.left   = '0';
            chatTray.style.right  = 'auto';
            chatTray.style.bottom = 'auto';
            chatTray.style.top    = `${Math.max(safeMargin, Math.min(rect.top, windowHeight - 100))}px`;

        } else if (distRight < snapThreshold) {
            // GRUDA DIREITA
            chatTray.classList.add('dock-side', 'collapsed');
            chatTray.style.right  = '0';
            chatTray.style.left   = 'auto';
            chatTray.style.bottom = 'auto';
            chatTray.style.top    = `${Math.max(safeMargin, Math.min(rect.top, windowHeight - 100))}px`;

        } else {
            // FLUTUANDO
            let finalLeft = rect.left;
            if (finalLeft + 320 > windowWidth) finalLeft = windowWidth - 320 - safeMargin;
            chatTray.style.left  = `${Math.max(safeMargin, finalLeft)}px`;
            chatTray.style.right = 'auto';

            if (rect.top + 300 > windowHeight) {
                chatTray.style.bottom = `${Math.max(safeMargin, windowHeight - rect.bottom)}px`;
                chatTray.style.top    = 'auto';
            } else {
                chatTray.style.top    = `${rect.top}px`;
                chatTray.style.bottom = 'auto';
            }
        }

        atualizarIcone();
    }

    // --- FUNÇÃO: DETECTAR COLISÃO COM DICE TRAY ---
    function detectarColisao(newLeft, newTop, newWidth, newHeight) {
        if (!diceTray || diceTray.style.display === 'none') return false;

        const diceRect = diceTray.getBoundingClientRect();
        
        // Posição absoluta do diceTray relativa à viewport
        const diceLeft = diceRect.left;
        const diceTop = diceRect.top;
        const diceWidth = diceRect.width;
        const diceHeight = diceRect.height;

        // Verifica se há sobreposição (AABB collision detection)
        const overlap = !(
            newLeft + newWidth < diceLeft ||
            newLeft > diceLeft + diceWidth ||
            newTop + newHeight < diceTop ||
            newTop > diceTop + diceHeight
        );

        return overlap;
    }
}
