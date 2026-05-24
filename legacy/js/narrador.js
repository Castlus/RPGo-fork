import { supabase, apiGet } from './utils/api.js';
import { iniciarBandeja } from './components/bandeja/bandeja.js';
import { configurarTemas } from './components/profile/perfil.js';

const params = new URLSearchParams(window.location.search);
const mesaId = params.get('mesaId') || params.get('mesa');

if (!mesaId) {
    alert("Mesa não encontrada");
    window.location.href = 'dashboard.html';
}

let mesaAtual = null;

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Carrega dados da Mesa
        mesaAtual = await apiGet(`/mesas/${mesaId}`);
        
        // Verifica se é o dono da mesa (Narrador)
        if (mesaAtual.userId !== session.user.id) {
            alert("Acesso negado: Você não é o narrador desta mesa.");
            window.location.href = 'dashboard.html';
            return;
        }

        renderMesaDetails(mesaAtual);
        renderPersonagens(mesaAtual.personagens || []);

        // Inicializa a Bandeja com Chat/Dados na sala da mesa
        const container = document.getElementById('bandejaContainer');
        if (container) {
            const resp = await fetch('./js/components/bandeja/bandeja.html');
            container.innerHTML = await resp.text();
            iniciarBandeja(session.user, mesaId);
        }

        // Traz a mecânica dos temas
        await configurarTemas();

        // Configura Supabase Realtime (Requer REPLICA IDENTITY FULL ou similar config no Supabase)
        setupRealtime();

        // Link pro calendário (página dedicada)
        const btnCal = document.getElementById('btnAbrirCalendario');
        if (btnCal) btnCal.href = `calendario.html?mesaId=${encodeURIComponent(mesaId)}`;

    } catch (error) {
        console.error(error);
        alert("Erro ao carregar dados da mesa.");
    }
}

function renderMesaDetails(mesa) {
    document.getElementById('mesaNome').innerText = mesa.nome;
    document.getElementById('txtCodigo').innerText = mesa.codigoAcesso;

    const banner = document.getElementById('mesaBanner');
    if (mesa.bannerUrl) {
        banner.src = mesa.bannerUrl;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }

    // Copiar código
    document.getElementById('mesaCodigo').addEventListener('click', () => {
        navigator.clipboard.writeText(mesa.codigoAcesso);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Código copiado!',
            showConfirmButton: false,
            timer: 2000
        });
    });
}

function renderPersonagens(lista) {
    const grid = document.getElementById('gridPersonagens');
    grid.innerHTML = '';

    if (lista.length === 0) {
        grid.innerHTML = '<p style="color: #666; grid-column: 1/-1;">Nenhum jogador conectado nesta mesa ainda.</p>';
        return;
    }

    lista.forEach(char => {
        const pctHp = (char.hpAtual / char.hpMax) * 100;
        const pctPp = (char.ppAtual / char.ppMax) * 100;

        grid.innerHTML += `
            <div class="char-card-narrador" id="char-${char.id}">
                <div class="char-header">
                    <img src="${char.fotoUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + char.id}" class="char-avatar">
                    <div class="char-title">
                        <h3>${char.nome}</h3>
                        <span>Nível ${char.nivel}</span>
                    </div>
                </div>

                <div class="bar-group-mini">
                    <div class="bar-label-mini">
                        <span><i class="fas fa-heart"></i> Vida</span>
                        <span id="hp-txt-${char.id}">${char.hpAtual} / ${char.hpMax}</span>
                    </div>
                    <div class="progress-track-mini">
                        <div class="progress-fill-mini fill-hp" id="hp-fill-${char.id}" style="width: ${Math.min(pctHp, 100)}%;"></div>
                    </div>
                </div>

                <div class="bar-group-mini">
                    <div class="bar-label-mini">
                        <span><i class="fas fa-bolt"></i> Poder</span>
                        <span id="pp-txt-${char.id}">${char.ppAtual} / ${char.ppMax}</span>
                    </div>
                    <div class="progress-track-mini">
                        <div class="progress-fill-mini fill-pp" id="pp-fill-${char.id}" style="width: ${Math.min(pctPp, 100)}%;"></div>
                    </div>
                </div>
            </div>
        `;
    });
}

function setupRealtime() {
    // Inscreve no canal do Supabase
    supabase.channel(`mesa-${mesaId}`)
        .on(
            'postgres_changes',
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'Personagem',
                filter: `mesa_id=eq.${mesaId}`
            },
            (payload) => {
                const raw = payload.new;
                atualizarCardLocal({
                    id: raw.id,
                    hpAtual: raw.hp_atual,
                    hpMax: raw.hp_max,
                    ppAtual: raw.pp_atual,
                    ppMax: raw.pp_max
                });
            }
        )
        .subscribe();
}

function atualizarCardLocal(char) {
    const card = document.getElementById(`char-${char.id}`);
    if (!card) return; // Talvez recarregar pagina se jogador novo entrar, ou ouvir INSERT!

    // Atualiza hp
    const hpTxt = document.getElementById(`hp-txt-${char.id}`);
    const hpFill = document.getElementById(`hp-fill-${char.id}`);
    if (hpTxt) hpTxt.innerText = `${char.hpAtual} / ${char.hpMax}`;
    if (hpFill) hpFill.style.width = `${Math.min((char.hpAtual / char.hpMax) * 100, 100)}%`;

    // Atualiza pp
    const ppTxt = document.getElementById(`pp-txt-${char.id}`);
    const ppFill = document.getElementById(`pp-fill-${char.id}`);
    if (ppTxt) ppTxt.innerText = `${char.ppAtual} / ${char.ppMax}`;
    if (ppFill) ppFill.style.width = `${Math.min((char.ppAtual / char.ppMax) * 100, 100)}%`;
}

// Adicionando um listener de INSERT para adicionar no grid on the fly
supabase.channel(`mesa-inserts-${mesaId}`)
    .on(
        'postgres_changes',
        { 
            event: 'UPDATE', // Quando o char se associa à mesa, é um UPDATE na tabela Personagem preenchendo mesa_id
            schema: 'public', 
            table: 'Personagem',
            filter: `mesa_id=eq.${mesaId}`
        },
        (payload) => {
            const raw = payload.new;
            const card = document.getElementById(`char-${raw.id}`);
            if (!card) {
                // Jogador acabou de entrar na mesa
                apiGet(`/mesas/${mesaId}`).then(data => {
                    renderPersonagens(data.personagens || []);
                });
            }
        }
    )
    .subscribe();

init();