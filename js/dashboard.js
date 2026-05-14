import { apiGet, apiPost, supabase } from './utils/api.js';
import { configurarTemas } from './components/profile/perfil.js';

document.addEventListener('DOMContentLoaded', async () => {
    configurarTemas();

    const btnSair = document.getElementById('btnSair');
    const listaPersonagens = document.getElementById('listaPersonagens');
    const listaMesas = document.getElementById('listaMesas');

    // Deslogar
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // Carregar Personagens
    try {
        const personagens = await apiGet('/personagens');
        if (personagens.length === 0) {
            listaPersonagens.innerHTML = '<div style="color: var(--text-sec);">Você não tem personagens criados.</div>';
        } else {
            listaPersonagens.innerHTML = '';
            personagens.forEach(p => {
                const card = document.createElement('a');
                card.href = `ficha.html?charId=${p.id}`;
                card.className = 'card';
                card.innerHTML = `
                    <div class="card-banner" style="background-image: url('${p.fotoUrl || 'https://via.placeholder.com/400x200/1e1e1e/333333?text=Sem+Foto'}')"></div>
                    <div class="card-body">
                        <h3 class="card-title">${p.nome || 'Sem Nome'}</h3>
                        <p class="card-subtitle">Nível ${p.nivel || 1}</p>
                    </div>
                `;
                listaPersonagens.appendChild(card);
            });
        }
    } catch (e) {
        console.error(e);
        listaPersonagens.innerHTML = '<div style="color: red;">Erro ao carregar personagens.</div>';
    }

    // Carregar Mesas
    try {
        const mesas = await apiGet('/mesas');
        if (mesas.length === 0) {
            listaMesas.innerHTML = '<div style="color: var(--text-sec);">Você não é narrador de nenhuma mesa.</div>';
        } else {
            listaMesas.innerHTML = '';
            mesas.forEach(m => {
                const card = document.createElement('a');
                card.href = `narrador.html?mesaId=${m.id}`;
                card.className = 'card';
                const bannerStyle = m.bannerUrl ? `background-image: url('${m.bannerUrl}')` : 'background-color: var(--bg-surface); display:flex; justify-content:center; align-items:center; color:var(--text-sec); font-size: 2rem;';
                card.innerHTML = `
                    <div class="card-banner" style="${bannerStyle}">
                        ${!m.bannerUrl ? '<i class="fa-solid fa-map-location-dot"></i>' : ''}
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${m.nome || 'Mesa Sem Nome'}</h3>
                        <p class="card-subtitle"><i class="fa-solid fa-key"></i> Código: <strong>${m.codigoAcesso}</strong></p>
                    </div>
                `;
                listaMesas.appendChild(card);
            });
        }
    } catch (e) {
        console.error(e);
        listaMesas.innerHTML = '<div style="color: red;">Erro ao carregar mesas.</div>';
    }

    // Modal Nova Mesa
    const modalNovaMesa = document.getElementById('modalNovaMesa');
    document.getElementById('btnNovaMesa')?.addEventListener('click', () => {
        modalNovaMesa.style.display = 'flex';
    });
    document.getElementById('btnCancelarMesa')?.addEventListener('click', () => {
        modalNovaMesa.style.display = 'none';
    });

    document.getElementById('btnSalvarMesa')?.addEventListener('click', async () => {
        const inputNome = document.getElementById('nomeMesa');
        const inputBanner = document.getElementById('bannerMesa');
        const nome = inputNome.value.trim();
        const bannerUrl = inputBanner.value.trim();

        if (!nome) {
            alert('Nome da mesa é obrigatório.');
            inputNome.focus();
            return;
        }

        try {
            document.getElementById('btnSalvarMesa').disabled = true;
            document.getElementById('btnSalvarMesa').textContent = 'Criando...';
            
            await apiPost('/mesas', { nome, bannerUrl });
            window.location.reload(); // Recarrega para ver a mesa
        } catch (e) {
            console.error(e);
            alert('Erro ao criar mesa: ' + e.message);
            document.getElementById('btnSalvarMesa').disabled = false;
            document.getElementById('btnSalvarMesa').textContent = 'Criar';
        }
    });

});