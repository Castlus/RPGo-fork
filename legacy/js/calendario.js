// Página dedicada do calendário (narrador) — montada a partir de calendario.html.
// Reusa o componente em js/components/calendario/.

import { supabase, apiGet } from './utils/api.js';
import { setupCalendarioUI, carregarCalendario } from './components/calendario/calendario.js';

const params = new URLSearchParams(window.location.search);
const mesaId = params.get('mesaId') || params.get('mesa');

if (!mesaId) {
    alert('Mesa não encontrada.');
    window.location.href = 'dashboard.html';
}

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
        window.location.href = 'index.html';
        return;
    }

    let mesa;
    try {
        mesa = await apiGet(`/mesas/${mesaId}`);
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar dados da mesa.');
        window.location.href = 'dashboard.html';
        return;
    }

    // Apenas o narrador (dono da mesa) acessa essa página por enquanto.
    if (mesa.userId !== session.user.id) {
        alert('Acesso negado: só o narrador da mesa pode abrir o calendário por aqui.');
        window.location.href = 'dashboard.html';
        return;
    }

    // Topo
    document.getElementById('mesaNomeTopo').innerText = mesa.nome;
    document.getElementById('btnVoltarMesa').href = `narrador.html?mesaId=${encodeURIComponent(mesaId)}`;

    // Injeta o HTML do componente calendário e inicializa
    const container = document.getElementById('calendarioContainer');
    const resp = await fetch('./js/components/calendario/calendario.html');
    container.innerHTML = await resp.text();

    const view = container.querySelector('#view-calendario');
    if (view) view.style.display = 'block';

    setupCalendarioUI(mesaId, true);
    await carregarCalendario(mesaId, mesa);
}

init();
