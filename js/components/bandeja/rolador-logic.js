/**
 * Lógica do Rolador de Dados — componente interno da Bandeja Unificada.
 *
 * @param {Object} user      - Objeto do usuário autenticado ({ uid })
 * @param {Object} dbRefs    - { db, ref, update }
 * @param {Object} callbacks - { onRolar(dadosRolagem) } — chamado após cada rolagem
 *                             para que o orquestrador (bandeja.js) envie ao chat
 */
export function iniciarRolador(user, dbRefs, callbacks = {}) {
    const { db, ref, update } = dbRefs;
    const { onRolar } = callbacks;

    let dadosSelecionados = [];
    let modoNegativo      = false;

    // Elementos
    const diceContainer = document.getElementById('diceContainer');
    const btnToggleSign = document.getElementById('btnToggleSign');
    const txtTotal      = document.getElementById('txtTotal');
    const txtDetalhes   = document.getElementById('txtDetalhes');
    const inputMod      = document.getElementById('inputModificador');
    const btnLimpar     = document.getElementById('btnLimparTray');
    const btnRolar      = document.getElementById('btnRolarTray');

    // --- PREVIEW DA FÓRMULA ---
    function atualizarPreview() {
        if (dadosSelecionados.length === 0 && Number(inputMod.value) === 0) {
            txtDetalhes.innerText = 'Selecione dados...';
            txtTotal.innerText    = '--';
            return;
        }
        let formula = '';
        dadosSelecionados.forEach((d, i) => {
            const op = i === 0
                ? (d.sinal === -1 ? '- ' : '')
                : (d.sinal === 1 ? ' + ' : ' - ');
            formula += `${op}1d${d.faces}`;
        });
        const mod = Number(inputMod.value);
        if (mod !== 0) {
            formula += dadosSelecionados.length > 0
                ? (mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`)
                : `${mod}`;
        }
        txtDetalhes.innerText = formula;
        txtTotal.innerText    = '??';
    }

    // --- ALTERNAR SINAL ---
    btnToggleSign.addEventListener('click', () => {
        modoNegativo = !modoNegativo;
        diceContainer.classList.toggle('negative-mode', modoNegativo);
        btnToggleSign.innerText = modoNegativo ? '-' : '+';
    });

    // --- SELEÇÃO DE DADOS ---
    document.querySelectorAll('.dice-btn[data-faces]').forEach(btn => {
        btn.addEventListener('click', () => {
            dadosSelecionados.push({ faces: Number(btn.dataset.faces), sinal: modoNegativo ? -1 : 1 });
            atualizarPreview();
        });
    });

    inputMod.addEventListener('input', atualizarPreview);

    // --- LIMPAR ---
    btnLimpar.addEventListener('click', () => {
        dadosSelecionados    = [];
        inputMod.value       = 0;
        txtTotal.innerText   = '--';
        txtDetalhes.innerText = 'Bandeja limpa';
        modoNegativo         = false;
        diceContainer.classList.remove('negative-mode');
        btnToggleSign.innerText = '+';
    });

    // --- ROLAR ---
    btnRolar.addEventListener('click', () => {
        if (dadosSelecionados.length === 0 && Number(inputMod.value) === 0) return;

        let total = 0;
        const resultadosHtml   = [];
        const detalhesFirebase = [];

        dadosSelecionados.forEach(d => {
            const resultado = Math.floor(Math.random() * d.faces) + 1;
            total += resultado * d.sinal;

            let resFormatado = `${resultado}`;
            if (resultado === 1)           resFormatado = `<span class="crit-fail">${resultado}</span>`;
            else if (resultado === d.faces) resFormatado = `<span class="crit-success">${resultado}</span>`;

            resultadosHtml.push({ texto: `(${resFormatado}) 1d${d.faces}`, sinal: d.sinal });
            detalhesFirebase.push({ faces: d.faces, sinal: d.sinal, resultado });
        });

        const mod = Number(inputMod.value);
        total += mod;

        let stringFinal = '';
        resultadosHtml.forEach((parte, i) => {
            const op = i === 0
                ? (parte.sinal === -1 ? '- ' : '')
                : (parte.sinal === 1 ? ' + ' : ' - ');
            stringFinal += `${op}${parte.texto}`;
        });
        if (mod !== 0) stringFinal += ` ${mod >= 0 ? '+' : '-'} ${Math.abs(mod)}`;

        // Exibe resultado local
        txtTotal.innerText    = total;
        txtDetalhes.innerHTML = `[${total}] = ${stringFinal}`;

        // Salva última rolagem no perfil do usuário
        update(ref(db, `users/${user.uid}`), {
            ultimaRolagem: `[${total}] = ${stringFinal.replace(/<[^>]*>?/gm, '')}`
        });

        // Notifica orquestrador para enviar ao chat
        if (typeof onRolar === 'function') {
            onRolar({ total, detalhes: detalhesFirebase, modificador: mod });
        }

        dadosSelecionados = [];
    });
}
