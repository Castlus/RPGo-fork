/**
 * Inicializa a lógica da Bandeja de Chat com Firebase e detecção de colisão
 * @param {Object} user - Objeto do usuário com propriedade uid para salvar mensagens no Firebase
 * @param {Object} dbRefs - Objeto com { db, ref, onValue, push, remove, update }
 */
export function iniciarChatTray(user, dbRefs) {
    const { db, ref, onValue, push, remove } = dbRefs;
    
    console.log('iniciarChatTray chamado para user:', user.uid);
    // ELEMENTOS
    const chatTray = document.getElementById('chatTray');
    const header = document.getElementById('chatTrayHeader');
    const body = document.getElementById('chatTrayBody');
    const closeBtn = document.getElementById('closeChatTray');
    const diceTray = document.getElementById('diceTray');
    
    // VARIÁVEIS DE ARRASTO
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let hasMoved = false;
    let dragStartTime = 0;

    // Estado Inicial: Grudado em baixo
    chatTray.classList.add('dock-bottom', 'collapsed');
    body.style.display = 'none';

    // --- TOGGLE: ABRIR/FECHAR BANDEJA ---
    header.addEventListener('click', (e) => {
        // Não ativa se foi um drag ou clique no botão close
        if (isDragging || hasMoved || e.target === closeBtn || e.target.parentElement === closeBtn) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const isCollapsed = chatTray.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Abre
            console.log('Abrindo chat pelo header');
            chatTray.classList.remove('collapsed');
            body.style.display = 'flex';
            chatTray.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
            
            // Carrega mensagens quando abre
            carregarMensagens();
        } else {
            // Fecha
            chatTray.classList.add('collapsed');
            body.style.display = 'none';
        }
    });

    // --- FECHAR BANDEJA (botão chevron-down) ---
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Se está collapsed (círculo), ao clicar no chevron-down abre
        if (chatTray.classList.contains('collapsed')) {
            chatTray.classList.remove('collapsed');
            body.style.display = 'flex';
            chatTray.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
            
            // Carrega mensagens quando abre
            carregarMensagens();
        } else {
            // Se está aberto, fecha
            chatTray.classList.add('collapsed');
            body.style.display = 'none';
        }
    });

    // --- ENVIAR MENSAGEM ---
    // Espera os elementos ficarem disponíveis no DOM
    let tentativas = 0;
    const setupChatListeners = setInterval(() => {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendChatBtn');
        
        if (chatInput && sendBtn) {
            clearInterval(setupChatListeners);
            console.log('Chat listeners configurados');
            
            sendBtn.addEventListener('click', enviarMensagem);
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    enviarMensagem();
                }
            });
        }
        
        tentativas++;
        if (tentativas > 50) {
            clearInterval(setupChatListeners);
            console.error('Chat elements não encontrados após múltiplas tentativas');
        }
    }, 100);

    // --- FUNÇÃO: LIMPAR TODAS AS MENSAGENS ---
    function limparMensagens() {
        const messagesRef = ref(db, `chats/${user.uid}/mensagens`);
        
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
            const messagesRef = ref(db, `chats/${user.uid}/mensagens`);
            
            console.log('Enviando para Firebase...');
            
            push(messagesRef, {
                uid: user.uid,
                nome: user.displayName || user.email || 'Anônimo',
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
    function carregarMensagens() {
        const messagesRef = ref(db, `chats/${user.uid}/mensagens`);
        const messagesContainer = document.getElementById('chatMessages');

        if (!messagesContainer) {
            console.error('Messages container not found');
            return;
        }

        console.log('Carregando mensagens do Firebase...');

        onValue(messagesRef, (snapshot) => {
            console.log('Snapshot recebido:', snapshot.exists());
            
            if (!snapshot.exists()) {
                console.log('Nenhuma mensagem encontrada');
                messagesContainer.innerHTML = '<p style="color: #999; text-align: center; font-size: 0.9rem;">Nenhuma mensagem ainda...</p>';
                return;
            }

            const dados = snapshot.val();
            console.log('Dados recebidos:', dados);
            
            if (!dados) {
                console.log('Dados vazios');
                return;
            }

            let html = '';
            let count = 0;

            Object.entries(dados).forEach(([key, msg]) => {
                if (!msg || !msg.timestamp) {
                    console.log('Mensagem inválida:', msg);
                    return;
                }

                count++;
                const hora = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const isSent = msg.uid === user.uid;
                const nomeExibido = isSent ? 'Você' : msg.nome;
                
                // Verifica se é uma rolagem de dados
                if (msg.tipo === 'rolagem' && msg.detalhes) {
                    let detalhesHtml = '';
                    
                    // Constrói a string de detalhes
                    msg.detalhes.forEach((d, idx) => {
                        const sinalTexto = d.sinal === -1 ? '-' : '+';
                        detalhesHtml += `<span class="roll-detail">${sinalTexto} ${d.resultado}d${d.faces}</span>`;
                    });
                    
                    // Adiciona modificador se existir
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

            console.log('Mensagens renderizadas:', count);
            
            if (html) {
                messagesContainer.innerHTML = html;
                // Auto-scroll para a última mensagem
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, (error) => {
            console.error('Erro ao carregar mensagens:', error);
        });
    }

    // --- LÓGICA DE ARRASTAR (MOUSEDOWN) ---
    header.addEventListener('mousedown', (e) => {
        if (e.target === closeBtn || e.target.parentElement === closeBtn) return;
        
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
        const rect = chatTray.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Distâncias para as bordas
        const distLeft = rect.left;
        const distRight = windowWidth - (rect.left + rect.width);
        const distBottom = windowHeight - (rect.top + rect.height);
        
        const snapThreshold = 80;
        const safeMargin = 20;

        // Limpa classes antigas
        chatTray.classList.remove('dock-bottom', 'dock-side');
        
        if (distBottom < snapThreshold) {
            // GRUDA EM BAIXO
            chatTray.classList.add('dock-bottom');
            chatTray.classList.add('collapsed');
            body.style.display = 'none';
            
            // Mantém posição horizontal do usuário
            chatTray.style.bottom = '0';
            chatTray.style.top = 'auto';
            chatTray.style.transform = 'none';

        } else if (distLeft < snapThreshold) {
            // GRUDA ESQUERDA
            chatTray.classList.add('dock-side');
            chatTray.classList.add('collapsed');
            body.style.display = 'none';
            
            chatTray.style.right = 'auto';
            chatTray.style.left = '0';
            chatTray.style.bottom = 'auto';
            
            let targetTop = Math.max(safeMargin, Math.min(rect.top, windowHeight - 100));
            chatTray.style.top = `${targetTop}px`;

        } else if (distRight < snapThreshold) {
            // GRUDA DIREITA
            chatTray.classList.add('dock-side');
            chatTray.classList.add('collapsed');
            body.style.display = 'none';
            
            chatTray.style.left = 'auto';
            chatTray.style.right = '0';
            chatTray.style.bottom = 'auto';
            
            let targetTop = Math.max(safeMargin, Math.min(rect.top, windowHeight - 100));
            chatTray.style.top = `${targetTop}px`;

        } else {
            // FLUTUANDO
            let finalLeft = rect.left;
            if (finalLeft + 300 > windowWidth) {
                finalLeft = windowWidth - 300 - safeMargin;
            }
            chatTray.style.left = `${Math.max(safeMargin, finalLeft)}px`;
            chatTray.style.right = 'auto';

            let finalTop = rect.top;
            if (finalTop + 300 > windowHeight) {
                chatTray.style.bottom = `${Math.max(safeMargin, windowHeight - rect.bottom)}px`;
                chatTray.style.top = 'auto';
            } else {
                chatTray.style.top = `${finalTop}px`;
                chatTray.style.bottom = 'auto';
            }
        }
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
