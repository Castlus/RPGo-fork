/**
 * temas.js
 * Componente autônomo do gerenciador de temas.
 * Carrega temas.html, injeta no <body> e configura toda a lógica.
 *
 * Uso: importar e chamar configurarTemas() após o DOM estar pronto.
 */
import {
    TEMAS_PRESET,
    aplicarTema,
    salvarTemaAtivo,
    getTemasCustom,
    adicionarTemaCustom,
    atualizarTemaCustom,
    removerTemaCustom,
} from '../../utils/theme-manager.js';

/** Injeta o HTML do modal no body (idempotente). */
async function _injetarHTML() {
    if (document.getElementById('modalTemas')) return; // já injetado
    const res  = await fetch(new URL('./temas.html', import.meta.url));
    const html = await res.text();
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    document.body.appendChild(wrap.firstElementChild);
}

/**
 * Inicializa o gerenciador de temas.
 * Deve ser chamado uma única vez após carregar o HTML do perfil.
 */
export async function configurarTemas() {
    await _injetarHTML();

    const btnPaleta      = document.getElementById('btnPaleta');
    const modalTemas     = document.getElementById('modalTemas');
    const btnFecharTemas = document.getElementById('btnFecharTemas');
    const temaChips      = document.getElementById('temaChips');
    const btnSalvarCustom = document.getElementById('btnSalvarCustom');

    let editingId = null;

    const PICKERS = {
        '--primary':           'cpPrimary',
        '--bg-page':           'cpBgPage',
        '--bg-card':           'cpBgCard',
        '--bg-surface':        'cpBgSurface',
        '--text-main':         'cpTextMain',
        '--text-sec':          'cpTextSec',
        '--border':            'cpBorder',
        '--bg-sidebar':        'cpBgSidebar',
        '--sidebar-text-main': 'cpSidebarTextMain',
        '--sidebar-text-sec':  'cpSidebarTextSec',
    };

    // ─── Utilitários ────────────────────────────────────────────────────────

    function getTemaAtual() {
        return localStorage.getItem('temaId') || 'light';
    }

    function rgbToHex(color) {
        if (!color) return '#000000';
        color = color.trim();
        if (color.startsWith('#')) {
            return color.length === 4
                ? '#' + [...color.slice(1)].map(c => c + c).join('')
                : color;
        }
        const m = color.match(/\d+/g);
        if (!m) return '#000000';
        return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }

    // ─── Chips de tema ──────────────────────────────────────────────────────

    function criarChipBtn(tema, isAtivo, isCustom) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative';

        const btn = document.createElement('button');
        btn.style.cssText = [
            'padding: 12px 8px',
            'border-radius: 10px',
            'cursor: pointer',
            'width: 100%',
            `border: 2px solid ${isAtivo ? tema.vars['--primary'] : 'transparent'}`,
            `background: ${tema.vars['--bg-card']}`,
            `color: ${tema.vars['--text-main']}`,
            'font-weight: 600',
            'font-size: 0.82rem',
            `box-shadow: ${isAtivo
                ? `0 0 0 3px ${tema.vars['--primary']}55, inset 0 0 0 1px ${tema.vars['--border']}`
                : `inset 0 0 0 1px ${tema.vars['--border']}`}`,
            'transition: 0.15s',
        ].join(';');

        const pontos = ['--primary', '--bg-page', '--border']
            .map(v => `<div style="width:10px;height:10px;border-radius:50%;background:${tema.vars[v]};border:1px solid ${tema.vars['--border']}"></div>`)
            .join('');

        btn.innerHTML = `
            <div style="font-size:1.5rem;margin-bottom:4px">${tema.icone}</div>
            <div style="color:${tema.vars['--primary']};margin-bottom:6px;word-break:break-word">${tema.nome}</div>
            <div style="display:flex;gap:4px;justify-content:center">${pontos}</div>
        `;

        btn.onclick = () => {
            aplicarTema(tema.vars, tema.dark);
            salvarTemaAtivo(tema.id);
            renderChips();
        };
        wrap.appendChild(btn);

        if (isCustom) {
            const btnStyle = [
                'position:absolute', 'width:18px', 'height:18px',
                'border-radius:50%', 'border:none',
                'background:rgba(0,0,0,0.35)', 'color:white',
                'font-size:0.7rem', 'line-height:1', 'cursor:pointer',
                'display:flex', 'align-items:center', 'justify-content:center', 'padding:0',
            ].join(';');

            const del = document.createElement('button');
            del.innerHTML = '&times;';
            del.title = 'Excluir tema';
            del.style.cssText = btnStyle + ';top:4px;right:4px';
            del.onclick = (e) => {
                e.stopPropagation();
                removerTemaCustom(tema.id);
                if (editingId === tema.id) { editingId = null; _resetFormulario(); }
                renderChips();
            };
            wrap.appendChild(del);

            const edit = document.createElement('button');
            edit.innerHTML = '&#9998;';
            edit.title = 'Editar tema';
            edit.style.cssText = btnStyle + ';top:4px;right:26px';
            edit.onclick = (e) => {
                e.stopPropagation();
                editingId = tema.id;
                for (const [varName, inputId] of Object.entries(PICKERS)) {
                    const input = document.getElementById(inputId);
                    if (input) input.value = rgbToHex(tema.vars[varName] || '#000000');
                }
                const inputNome = document.getElementById('cpNome');
                if (inputNome) inputNome.value = tema.nome;
                if (btnSalvarCustom) btnSalvarCustom.innerHTML = '<i class="fas fa-save"></i> Atualizar Tema';
                const details = document.getElementById('temaDetails');
                if (details) {
                    details.setAttribute('open', '');
                    details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            };
            wrap.appendChild(edit);
        }

        return wrap;
    }

    function renderChips() {
        if (!temaChips) return;
        const ativo = getTemaAtual();
        temaChips.innerHTML = '';

        TEMAS_PRESET.forEach(tema => {
            temaChips.appendChild(criarChipBtn(tema, tema.id === ativo, false));
        });

        const customizados = getTemasCustom();
        if (customizados.length > 0) {
            const sep = document.createElement('div');
            sep.style.cssText = 'grid-column:1/-1;font-size:0.75rem;font-weight:600;color:var(--text-sec);padding-top:6px;border-top:1px solid var(--border);';
            sep.textContent = 'Meus Temas';
            temaChips.appendChild(sep);
            customizados.forEach(tema => temaChips.appendChild(criarChipBtn(tema, tema.id === ativo, true)));
        }
    }

    // ─── Pickers & Preview ──────────────────────────────────────────────────

    function syncPickers() {
        const root = getComputedStyle(document.documentElement);
        for (const [varName, inputId] of Object.entries(PICKERS)) {
            const input = document.getElementById(inputId);
            if (input) input.value = rgbToHex(root.getPropertyValue(varName).trim()) || '#000000';
        }
        _updatePreview();
    }

    function _updatePreview() {
        const get = (id) => { const el = document.getElementById(id); return el ? el.value : '#888888'; };
        const primary     = get('cpPrimary');
        const bgPage      = get('cpBgPage');
        const bgCard      = get('cpBgCard');
        const bgSurface   = get('cpBgSurface');
        const textMain    = get('cpTextMain');
        const textSec     = get('cpTextSec');
        const border      = get('cpBorder');
        const bgSidebar   = get('cpBgSidebar');
        const sideTxtMain = get('cpSidebarTextMain');
        const sideTxtSec  = get('cpSidebarTextSec');

        const applyStyles = (id, styles) => {
            const el = document.getElementById(id);
            if (el) Object.assign(el.style, styles);
        };

        applyStyles('temaPreview',    { borderColor: border });
        applyStyles('pvSidebar',      { background: bgSidebar });
        applyStyles('pvName',         { color: sideTxtMain });
        applyStyles('pvLevel',        { color: sideTxtSec });
        applyStyles('pvBarBg',        { background: border });
        ['pvAttr','pvAttr2'].forEach(id => applyStyles(id, { background: bgSurface, border: `1px solid ${border}` }));
        ['pvAttrLabel','pvAttrLabel2'].forEach(id => applyStyles(id, { color: sideTxtSec }));
        ['pvAttrVal','pvAttrVal2'].forEach(id  => applyStyles(id, { color: primary }));
        applyStyles('pvPage',         { background: bgPage });
        applyStyles('pvTab',          { background: bgCard, color: primary });
        applyStyles('pvTabInactive',  { color: textSec });
        applyStyles('pvCard',         { background: bgCard, border: `1px solid ${border}`, borderLeft: `3px solid ${primary}` });
        applyStyles('pvCardTitle',    { color: textMain });
        applyStyles('pvCardDesc',     { color: textSec });
    }

    function _resetFormulario() {
        editingId = null;
        const inputNome = document.getElementById('cpNome');
        if (inputNome) inputNome.value = '';
        if (btnSalvarCustom) btnSalvarCustom.innerHTML = '<i class="fas fa-save"></i> Salvar como Tema';
        const details = document.getElementById('temaDetails');
        if (details) details.removeAttribute('open');
    }

    // ─── Event listeners ────────────────────────────────────────────────────

    if (btnPaleta) {
        btnPaleta.addEventListener('click', () => {
            renderChips();
            syncPickers();
            modalTemas.style.display = 'flex';
        });
    }

    const temaDetailsEl = document.getElementById('temaDetails');
    if (temaDetailsEl) {
        temaDetailsEl.addEventListener('input', () => _updatePreview());
    }

    if (btnFecharTemas) {
        btnFecharTemas.addEventListener('click', () => { modalTemas.style.display = 'none'; });
    }

    if (modalTemas) {
        modalTemas.addEventListener('click', e => {
            if (e.target === modalTemas) modalTemas.style.display = 'none';
        });
    }

    if (btnSalvarCustom) {
        btnSalvarCustom.addEventListener('click', () => {
            const customVars = {};
            for (const [varName, inputId] of Object.entries(PICKERS)) {
                const input = document.getElementById(inputId);
                if (input) customVars[varName] = input.value;
            }
            customVars['--bg-button']   = customVars['--bg-surface'];
            customVars['--text-button'] = customVars['--text-main'];
            customVars['--bg-slot']     = customVars['--bg-surface'];
            customVars['--border-slot'] = customVars['--border'];

            const hex = customVars['--bg-page'] || '#ffffff';
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const isDark = (0.299 * r + 0.587 * g + 0.114 * b) < 128;

            const nome = (document.getElementById('cpNome')?.value || '').trim() || 'Meu Tema';

            let idAtivo;
            if (editingId) {
                atualizarTemaCustom(editingId, nome, customVars, isDark);
                idAtivo = editingId;
            } else {
                idAtivo = adicionarTemaCustom(nome, customVars, isDark);
            }

            aplicarTema(customVars, isDark);
            salvarTemaAtivo(idAtivo);
            _resetFormulario();
            renderChips();
        });
    }
}
