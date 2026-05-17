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

        const elAvatar = document.getElementById('displayAvatar');
        if (elAvatar && dados.fotoUrl) elAvatar.src = dados.fotoUrl;

        // Mostrar User Email (se disponível no objeto retornado ou via auth)
        // Por padrão o Prisma não traz o email em /users/:uid pois fica na auth.users, 
        // mas podemos buscar o email da session ativa do Supabase.
        supabase.auth.getUser().then(({ data }) => {
            const elBtnInfo = document.getElementById('btnInfoUser');
            if (elBtnInfo && data?.user) {
                elBtnInfo.title = `Logado como: ${data.user.email}`;
                elBtnInfo.onclick = () => alert(`Você está logado(a) como:\n${data.user.email}`);
            }
        });

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

    apiGet(`/personagens/${uid}`).then(renderizarDados).catch(console.error);

    supabase.channel(`personagem-${uid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'personagens', filter: `id=eq.${uid}` },
            async () => { const d = await apiGet(`/personagens/${uid}`).catch(() => null); renderizarDados(d); })
        .subscribe();

    // ENTRAR EM MESA
    const btnEntrarMesa = document.getElementById('btnEntrarMesa');
    if (btnEntrarMesa) {
        btnEntrarMesa.onclick = async () => {
            const { value: codigo } = await Swal.fire({
                title: 'Entrar em Mesa',
                input: 'text',
                inputLabel: 'Código de Acesso da Mesa',
                inputPlaceholder: 'Digite o código de 6 caracteres',
                showCancelButton: true,
                confirmButtonColor: 'var(--primary)',
                confirmButtonText: 'Entrar'
            });

            if (codigo) {
                try {
                    await apiPost('/mesas/join', {
                        codigo: codigo.trim(),
                        personagemId: window.personagemAtual.id
                    });
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Sucesso',
                        text: 'Personagem vinculado à mesa!',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro',
                        text: error.message || 'Código inválido ou mesa não encontrada.'
                    });
                }
            }
        };
    }

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
        await apiPatch(`/personagens/${uid}`, payload)
            .then(() => { notificar("Sucesso", "Ficha atualizada!"); modalFicha.style.display = 'none'; })
            .catch(e  => notificar("Erro", e.message));
    };

    // -- CROP DE AVATAR --
    const modalCrop       = document.getElementById('modalCropAvatar');
    const btnUploadAvatar = document.getElementById('btnUploadAvatar');
    const btnFecharCrop   = document.getElementById('btnFecharCrop');
    const btnSalvarCrop   = document.getElementById('btnSalvarCrop');
    const btnCropRotate   = document.getElementById('btnCropRotate');
    const btnCropReset    = document.getElementById('btnCropReset');
    
    const dropzone        = document.getElementById('avatarDropzone');
    const inputAvatarFile = document.getElementById('inputAvatarFile');
    const cropperContainer= document.getElementById('cropperContainer');
    const imageToCrop     = document.getElementById('imageToCrop');
    
    let cropper = null;

    if (btnUploadAvatar) btnUploadAvatar.onclick = () => {
        modalCrop.style.display = 'flex';
        resetCropState();
    };

    if (btnFecharCrop) btnFecharCrop.onclick = () => modalCrop.style.display = 'none';

    function resetCropState() {
        dropzone.style.display = 'block';
        cropperContainer.style.display = 'none';
        btnSalvarCrop.style.display = 'none';
        if (cropper) { cropper.destroy(); cropper = null; }
        inputAvatarFile.value = '';
    }

    function initCropper(file) {
        if (!file || !file.type.startsWith('image/')) return notificar('Erro', 'Por favor, selecione uma imagem válida.');
        const reader = new FileReader();
        reader.onload = (e) => {
            imageToCrop.src = e.target.result;
            dropzone.style.display = 'none';
            cropperContainer.style.display = 'block';
            btnSalvarCrop.style.display = 'block';
            
            if (cropper) cropper.destroy();
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 1, // Circular shape enforced via aspect ratio 1:1
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: false,
                center: false,
                highlight: false,
                cropBoxMovable: false,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(file);
    }

    // Handlers do dropzone e file input
    if (dropzone) {
        dropzone.onclick = () => inputAvatarFile.click();
        dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add('dragover'); };
        dropzone.ondragleave = () => dropzone.classList.remove('dragover');
        dropzone.ondrop = (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) initCropper(e.dataTransfer.files[0]);
        };
    }
    
    if (inputAvatarFile) {
        inputAvatarFile.onchange = (e) => {
            if (e.target.files.length) initCropper(e.target.files[0]);
        };
    }
    
    // Paste listener (Ctrl+V) limitando ao modal
    document.addEventListener('paste', (e) => {
        if (modalCrop && modalCrop.style.display !== 'none' && e.clipboardData.files.length) {
            initCropper(e.clipboardData.files[0]);
            e.preventDefault();
        }
    });

    if (btnCropRotate) btnCropRotate.onclick = () => cropper && cropper.rotate(90);
    if (btnCropReset) btnCropReset.onclick = () => cropper && cropper.reset();

    if (btnSalvarCrop) btnSalvarCrop.onclick = async () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
        if (!canvas) return;

        btnSalvarCrop.innerText = 'Criptografando...';
        btnSalvarCrop.disabled = true;

        canvas.toBlob(async (blob) => {
            try {
                btnSalvarCrop.innerText = 'Enviando...';
                const fileName = `avatar_${uid}_${Date.now()}.png`;
                const { data, error } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, blob, { contentType: 'image/png', upsert: true });
                
                if (error) throw error;
                
                const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                const fotoUrl = publicData.publicUrl;

                btnSalvarCrop.innerText = 'Salvando no perfil...';
                await apiPatch(`/personagens/${uid}`, { fotoUrl });
                notificar('Sucesso', 'Sua foto foi atualizada!');
                
                const elAvatar = document.getElementById('displayAvatar');
                if (elAvatar) elAvatar.src = fotoUrl;
                modalCrop.style.display = 'none';
            } catch (err) {
                console.error('Erro no upload ou banco:', err);
                notificar('Erro', typeof err === 'object' && err.message ? err.message : 'Falha ao salvar foto.');
            } finally {
                btnSalvarCrop.innerText = 'Salvar';
                btnSalvarCrop.disabled = false;
            }
        }, 'image/png', 0.9);
    };
}

