import { apiGet, apiPost, apiDelete, supabase } from './utils/api.js';
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

    // Inicia ambas as requisições em paralelo no background imediatamente
    const reqPersonagens = apiGet('/personagens');
    const reqMesas = apiGet('/mesas');

    // Carregar Personagens
    try {
        const personagens = await reqPersonagens;
        listaPersonagens.innerHTML = '';
        if (personagens.length > 0) {
            personagens.forEach(p => {
                const card = document.createElement('a');
                card.href = `ficha.html?charId=${p.id}`;
                card.className = 'card';
                card.innerHTML = `
                    <button class="btn-delete" data-id="${p.id}" data-type="personagens" title="Apagar Personagem"><i class="fa-solid fa-trash"></i></button>
                    <div class="card-banner" style="background-image: url('${p.fotoUrl || 'https://via.placeholder.com/400x200/1e1e1e/333333?text=Sem+Foto'}')"></div>
                    <div class="card-body">
                        <h3 class="card-title">${p.nome || 'Sem Nome'}</h3>
                        <p class="card-subtitle">Nível ${p.nivel || 1}</p>
                    </div>
                `;
                listaPersonagens.appendChild(card);
            });
        }
        
        // Adiciona botão no fim da grade preenchendo o espaço
        const btnCriarPersonagem = document.createElement('a');
        btnCriarPersonagem.href = 'criacao-personagem.html';
        btnCriarPersonagem.className = 'card';
        btnCriarPersonagem.style.cssText = 'display: flex; flex-direction: column; justify-content: center; align-items: center; text-decoration: none; border: 2px dashed var(--border); background: transparent; min-height: 200px; grid-column: 1 / -1;';
        btnCriarPersonagem.innerHTML = `
            <i class="fas fa-plus" style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"></i>
            <h3 class="card-title" style="margin:0;">Criar Novo Personagem</h3>
        `;
        listaPersonagens.appendChild(btnCriarPersonagem);

    } catch (e) {
        console.error(e);
        listaPersonagens.innerHTML = '<div style="color: red;">Erro ao carregar personagens.</div>';
    }

    // Carregar Mesas
    try {
        const mesas = await reqMesas;
        listaMesas.innerHTML = '';
        if (mesas.length > 0) {
            mesas.forEach(m => {
                const card = document.createElement('a');
                card.href = `narrador.html?mesaId=${m.id}`;
                card.className = 'card';
                const bannerStyle = m.bannerUrl ? `background-image: url('${m.bannerUrl}')` : 'background-color: var(--bg-surface); display:flex; justify-content:center; align-items:center; color:var(--text-sec); font-size: 2rem;';
                card.innerHTML = `
                    <button class="btn-delete" data-id="${m.id}" data-type="mesas" title="Apagar Mesa"><i class="fa-solid fa-trash"></i></button>
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
        
        // Adiciona botão de mesa no fim da grade
        const btnCriarMesa = document.createElement('div');
        btnCriarMesa.id = 'btnNovaMesa';
        btnCriarMesa.className = 'card';
        btnCriarMesa.style.cssText = 'display: flex; flex-direction: column; justify-content: center; align-items: center; text-decoration: none; border: 2px dashed var(--border); background: transparent; min-height: 200px; cursor: pointer; grid-column: 1 / -1;';
        btnCriarMesa.innerHTML = `
            <i class="fas fa-plus" style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"></i>
            <h3 class="card-title" style="margin:0;">Criar Nova Mesa</h3>
        `;
        listaMesas.appendChild(btnCriarMesa);

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

    // Lógica para Apagar Itens (Personagens ou Mesas)
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault(); // Impede o clique de abrir a ficha/mesa
            e.stopPropagation();

            const itemId = btn.getAttribute('data-id');
            const itemType = btn.getAttribute('data-type'); // "personagens" ou "mesas"
            const label = itemType === 'personagens' ? 'este personagem' : 'esta mesa';

            // Usando modal visual nativo SweetAlert para compatibilidade com o resto do sistema
            const confirmacao = await Swal.fire({
                title: 'Tem certeza?',
                text: `Deseja apagar ${label} permanentemente? A exclusão é irreversível.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, apagar!',
                cancelButtonText: 'Cancelar',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });
            
            if (confirmacao.isConfirmed) {
                try {
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Loading
                    btn.disabled = true;
                    
                    await apiDelete(`/${itemType}/${itemId}`);
                    
                    btn.closest('.card').remove();
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Apagado!',
                        text: 'A deleção foi concluída com sucesso.',
                        timer: 1500,
                        showConfirmButton: false,
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                    });
                } catch (error) {
                    console.error("Erro ao deletar:", error);
                    // O erro de HTML é devolvido quando a API não encontra a rota.
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro de Servidor',
                        text: 'Esta rota de exclusão ainda não existe no backend. Atualize a API.',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                    });
                    btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                    btn.disabled = false;
                }
            }
        });
    });

});