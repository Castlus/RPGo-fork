/**
 * Carrega o perfil do personagem
 * @param {string} uid - ID do usuário (Supabase)
 */
import { notificar } from "../../utils/modal-utils.js";
import { supabase, apiGet, apiPatch } from "../../utils/api.js";

export { configurarTemas } from './temas.js';

export function carregarPerfil(uid) {
    function renderizarDados(dados) {
        if (!dados) return;

        const elNome = document.getElementById('displayNome');
        if (elNome) elNome.innerText = dados.nome;

        const elNivel = document.getElementById('valNivel');
        if (elNivel) elNivel.innerText = dados.nivel || 1;

        // VIDA
        const elValHp = document.getElementById('valHp');
        const elMaxHp = document.getElementById('maxHp');
        const elFillHp = document.getElementById('fillHp');
        if (elValHp) elValHp.innerText = dados.hpAtual;
        if (elMaxHp) elMaxHp.innerText = dados.hpMax;
        if (elFillHp) {
            const pctHp = (dados.hpAtual / dados.hpMax) * 100;
            elFillHp.style.width = `${Math.max(0, Math.min(100, pctHp))}%`;
        }

        // PP
        const atualPP = dados.ppAtual || 0;
        const maxPP   = dados.ppMax   || 1;
        document.getElementById('valPp').innerText  = atualPP;
        document.getElementById('maxPp').innerText  = maxPP;
        document.getElementById('fillPp').style.width = `${Math.max(0, Math.min(100, (atualPP / maxPP) * 100))}%`;

        // ATRIBUTOS
        const setAttr = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val || 0; };
        setAttr('attr-forca',        dados.forca);
        setAttr('attr-destreza',     dados.destreza);
        setAttr('attr-constituicao', dados.constituicao);
        setAttr('attr-sabedoria',    dados.sabedoria);
        setAttr('attr-vontade',      dados.vontade);
        setAttr('attr-presenca',     dados.presenca);
    }

    apiGet(`/users/${uid}`).then(renderizarDados).catch(console.error);

    supabase.channel(`personagem-${uid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'personagens', filter: `id=eq.${uid}` },
            async () => { const d = await apiGet(`/users/${uid}`).catch(() => null); renderizarDados(d); })
        .subscribe();

    // EDITAR FICHA
    const modalFicha     = document.getElementById('modalFicha');
    const btnEditar      = document.getElementById('btnEditarFicha');
    const btnFecharFicha = document.getElementById('btnFecharFicha');
    const btnSalvarFicha = document.getElementById('btnSalvarFicha');

    if (btnEditar) btnEditar.onclick = () => {
        document.getElementById('editHpMax').value = document.getElementById('maxHp').innerText;
        document.getElementById('editPpMax').value = document.getElementById('maxPp').innerText;
        document.getElementById('editFor').value   = document.getElementById('attr-forca').innerText;
        document.getElementById('editDes').value   = document.getElementById('attr-destreza').innerText;
        document.getElementById('editCon').value   = document.getElementById('attr-constituicao').innerText;
        document.getElementById('editSab').value   = document.getElementById('attr-sabedoria').innerText;
        document.getElementById('editVon').value   = document.getElementById('attr-vontade').innerText;
        document.getElementById('editPre').value   = document.getElementById('attr-presenca').innerText;
        modalFicha.style.display = 'flex';
    };

    if (btnFecharFicha) btnFecharFicha.onclick = () => { modalFicha.style.display = 'none'; };

    if (btnSalvarFicha) btnSalvarFicha.onclick = async () => {
        const payload = {
            hpMax:        Number(document.getElementById('editHpMax').value),
            ppMax:        Number(document.getElementById('editPpMax').value),
            forca:        Number(document.getElementById('editFor').value),
            destreza:     Number(document.getElementById('editDes').value),
            constituicao: Number(document.getElementById('editCon').value),
            sabedoria:    Number(document.getElementById('editSab').value),
            vontade:      Number(document.getElementById('editVon').value),
            presenca:     Number(document.getElementById('editPre').value)
        };
        await apiPatch(`/users/${uid}`, payload)
            .then(() => { notificar("Sucesso", "Ficha atualizada!"); modalFicha.style.display = 'none'; })
            .catch(e  => notificar("Erro", e.message));
    };
}

