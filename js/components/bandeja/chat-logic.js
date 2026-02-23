/**
 * Lógica do Chat — componente interno da Bandeja Unificada.
 *
 * @param {Object} user    - Objeto do usuário autenticado ({ uid, email })
 * @param {Object} dbRefs  - { db, ref, get, onValue, push, remove, query, orderByChild }
 * @param {string} SESSION_ID - ID da sessão compartilhada
 */
export function iniciarChat(user, dbRefs, SESSION_ID) {
    const { db, ref, get, onValue, push, remove, query, orderByChild } = dbRefs;

    // Nome do personagem buscado do Firebase (fallback para e-mail)
    let nomePersonagem = user.email || 'Anônimo';
    get(ref(db, `users/${user.uid}`)).then((snap) => {
        if (snap.exists() && snap.val().nome) nomePersonagem = snap.val().nome;
    }).catch(() => {});

    let unsubscribeMensagens = null;

    // --- ELEMENTOS ---
    const chatInput = document.getElementById('chatInput');
    const sendBtn   = document.getElementById('sendChatBtn');

    sendBtn.addEventListener('click', enviarMensagem);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); enviarMensagem(); }
    });

    // --- ENVIAR MENSAGEM DE TEXTO ---
    function enviarMensagem() {
        const mensagem = chatInput.value.trim();
        if (!mensagem) return;

        if (mensagem.toLowerCase() === '/limpar') {
            chatInput.value = '';
            if (confirm('Apagar TODAS as mensagens? Esta ação não pode ser desfeita.')) {
                remove(ref(db, `sessions/${SESSION_ID}/mensagens`));
            }
            return;
        }

        push(ref(db, `sessions/${SESSION_ID}/mensagens`), {
            uid:       user.uid,
            nome:      nomePersonagem,
            mensagem,
            timestamp: new Date().toISOString()
        }).then(() => { chatInput.value = ''; chatInput.focus(); })
          .catch((err) => alert('Erro ao enviar: ' + err.message));
    }

    // --- ENVIAR ROLAGEM DE DADOS (chamado externamente pelo bandeja.js) ---
    function enviarRolagem({ total, detalhes, modificador }) {
        push(ref(db, `sessions/${SESSION_ID}/mensagens`), {
            uid:        user.uid,
            nome:       nomePersonagem,
            tipo:       'rolagem',
            total,
            detalhes,
            modificador,
            timestamp:  new Date().toISOString()
        }).catch((err) => console.error('Erro ao enviar rolagem:', err));
    }

    // --- CARREGAR / ESCUTAR MENSAGENS ---
    function ativar() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        if (unsubscribeMensagens) { unsubscribeMensagens(); unsubscribeMensagens = null; }

        const q = query(
            ref(db, `sessions/${SESSION_ID}/mensagens`),
            orderByChild('timestamp')
        );

        unsubscribeMensagens = onValue(q, (snapshot) => {
            if (!snapshot.exists()) {
                container.innerHTML = '<p style="color:#999;text-align:center;font-size:0.9rem;">Nenhuma mensagem ainda...</p>';
                return;
            }

            let html = '';
            Object.entries(snapshot.val()).forEach(([, msg]) => {
                if (!msg || !msg.timestamp) return;
                const hora = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const nome = msg.uid === user.uid ? 'Você' : msg.nome;

                if (msg.tipo === 'rolagem' && msg.detalhes) {
                    // Firebase deserializa arrays como objetos — Object.values garante iteração correta
                    const detalhes = Object.values(msg.detalhes);
                    let stringDados = '';
                    detalhes.forEach((d, i) => {
                        const op = i === 0
                            ? (d.sinal === -1 ? '- ' : '')
                            : (d.sinal === 1 ? ' + ' : ' - ');
                        let res = `${d.resultado}`;
                        if (d.resultado === 1)             res = `<span class="crit-fail">${d.resultado}</span>`;
                        else if (d.resultado === d.faces)  res = `<span class="crit-success">${d.resultado}</span>`;
                        stringDados += `${op}(${res}) 1d${d.faces}`;
                    });
                    if (msg.modificador && msg.modificador !== 0) {
                        stringDados += ` ${msg.modificador >= 0 ? '+' : '-'} ${Math.abs(msg.modificador)}`;
                    }
                    html += `
                        <div class="chat-message roll-message">
                            <div class="roll-header">${hora} <strong>${nome}</strong></div>
                            <div class="roll-box">
                                <div class="roll-total">${msg.total}</div>
                                <div class="roll-details">[${msg.total}] = ${stringDados}</div>
                            </div>
                        </div>`;
                } else {
                    html += `<div class="chat-message">${hora} <strong>${nome}</strong>: ${msg.mensagem}</div>`;
                }
            });

            if (html) {
                container.innerHTML = html;
                container.scrollTop = container.scrollHeight;
            }
        }, (err) => console.error('Chat: erro ao carregar mensagens:', err));
    }

    // --- DESATIVAR LISTENER ---
    function desativar() {
        if (unsubscribeMensagens) { unsubscribeMensagens(); unsubscribeMensagens = null; }
    }

    // Retorna API pública para o orquestrador
    return { ativar, desativar, enviarRolagem };
}
