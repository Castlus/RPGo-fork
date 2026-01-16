/**
 * Sistema de Modais Customizados
 * Substitui confirmações e alertas do navegador por modais da aplicação
 */

/**
 * Exibe um modal de confirmação
 * @param {string} titulo - Título do modal
 * @param {string} mensagem - Mensagem de confirmação
 * @param {string} textoBotaoSim - Texto do botão de sim (padrão: "Confirmar")
 * @param {string} textoBotaoNao - Texto do botão de não (padrão: "Cancelar")
 * @returns {Promise<boolean>} Resolve true se confirmar, false se cancelar
 */
export function confirmar(titulo, mensagem, textoBotaoSim = "Confirmar", textoBotaoNao = "Cancelar") {
    return new Promise((resolve) => {
        // Cria o modal dinamicamente
        const modalHTML = `
            <div class="modal-confirmation" id="modalConfirmacao">
                <div class="modal-overlay-confirm" onclick="if(event.target === this) document.getElementById('modalConfirmacao').remove();">
                    <div class="modal-box-confirm">
                        <h2>${titulo}</h2>
                        <p>${mensagem}</p>
                        <div style="margin-top: 20px; text-align: right; display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="btnNao" style="background: #ccc; color: black; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                ${textoBotaoNao}
                            </button>
                            <button id="btnSim" style="background: var(--color-power); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                ${textoBotaoSim}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = modalHTML;
        const modal = container.firstElementChild;
        document.body.appendChild(modal);

        const btnSim = document.getElementById('btnSim');
        const btnNao = document.getElementById('btnNao');

        btnSim.addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });

        btnNao.addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });

        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEsc);
                modal.remove();
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

/**
 * Exibe um modal de sucesso/notificação
 * @param {string} titulo - Título do modal
 * @param {string} mensagem - Mensagem a exibir
 * @param {string} textoBot - Texto do botão (padrão: "OK")
 * @returns {Promise<void>} Resolve quando o usuário clicar OK
 */
export function notificar(titulo, mensagem, textoBot = "OK") {
    return new Promise((resolve) => {
        const modalHTML = `
            <div class="modal-notification" id="modalNotificacao">
                <div class="modal-overlay-notify" onclick="if(event.target === this) document.getElementById('modalNotificacao').remove(); document.getElementById('modalNotificacao').resolve?.();">
                    <div class="modal-box-notify">
                        <h2>${titulo}</h2>
                        <p>${mensagem}</p>
                        <div style="margin-top: 20px; text-align: right;">
                            <button id="btnOk" style="background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                ${textoBot}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = modalHTML;
        const modal = container.firstElementChild;
        modal.resolve = resolve;
        document.body.appendChild(modal);

        const btnOk = document.getElementById('btnOk');

        btnOk.addEventListener('click', () => {
            modal.remove();
            resolve();
        });

        // Fechar com ENTER
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                document.removeEventListener('keydown', handleEnter);
                modal.remove();
                resolve();
            }
        };
        document.addEventListener('keydown', handleEnter);
    });
}

/**
 * Exibe um modal de erro
 * @param {string} titulo - Título do modal
 * @param {string} mensagem - Mensagem de erro
 * @param {string} textoBot - Texto do botão (padrão: "Fechar")
 * @returns {Promise<void>} Resolve quando o usuário fechar
 */
export function erro(titulo, mensagem, textoBot = "Fechar") {
    return new Promise((resolve) => {
        const modalHTML = `
            <div class="modal-error" id="modalErro">
                <div class="modal-overlay-error" onclick="if(event.target === this) document.getElementById('modalErro').remove(); document.getElementById('modalErro').resolve?.();">
                    <div class="modal-box-error">
                        <h2 style="color: #d32f2f;"><i class="fas fa-exclamation-circle"></i> ${titulo}</h2>
                        <p>${mensagem}</p>
                        <div style="margin-top: 20px; text-align: right;">
                            <button id="btnFechar" style="background: #d32f2f; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                ${textoBot}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = modalHTML;
        const modal = container.firstElementChild;
        modal.resolve = resolve;
        document.body.appendChild(modal);

        const btnFechar = document.getElementById('btnFechar');

        btnFechar.addEventListener('click', () => {
            modal.remove();
            resolve();
        });

        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEsc);
                modal.remove();
                resolve();
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}
