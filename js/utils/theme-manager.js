/**
 * theme-manager.js
 * Gerencia temas visuais (presets + customizados) da ficha de personagem.
 */

export const TEMAS_PRESET = [
    {
        id: 'light',
        nome: 'Claro',
        icone: '☀️',
        dark: false,
        vars: {
            '--primary':    '#5a3a22',
            '--bg-page':    '#f0f2f5',
            '--bg-card':    '#ffffff',
            '--bg-surface': '#f8f9fa',
            '--text-main':  '#2c3e50',
            '--text-sec':   '#7f8c8d',
            '--border':     '#e0e0e0',
            '--bg-button':  '#eeeeee',
            '--text-button':'#000000',
        }
    },
    {
        id: 'dark',
        nome: 'Escuro',
        icone: '🌙',
        dark: true,
        vars: {
            '--primary':    '#8d5b36',
            '--bg-page':    '#121212',
            '--bg-card':    '#1e1e1e',
            '--bg-surface': '#252525',
            '--text-main':  '#e0e0e0',
            '--text-sec':   '#a0a0a0',
            '--border':     '#444444',
            '--bg-button':  '#333333',
            '--text-button':'#e0e0e0',
        }
    },
    {
        id: 'ocean',
        nome: 'Oceano',
        icone: '🌊',
        dark: false,
        vars: {
            '--primary':    '#0077b6',
            '--bg-page':    '#e0f2fe',
            '--bg-card':    '#ffffff',
            '--bg-surface': '#f0f9ff',
            '--text-main':  '#03045e',
            '--text-sec':   '#4a90a4',
            '--border':     '#bae6fd',
            '--bg-button':  '#e0f2fe',
            '--text-button':'#03045e',
        }
    },
    {
        id: 'noite',
        nome: 'Noite',
        icone: '🌌',
        dark: true,
        vars: {
            '--primary':    '#7c3aed',
            '--bg-page':    '#0d0d1a',
            '--bg-card':    '#16162a',
            '--bg-surface': '#1e1e35',
            '--text-main':  '#e8e8ff',
            '--text-sec':   '#8888bb',
            '--border':     '#333355',
            '--bg-button':  '#1e1e35',
            '--text-button':'#e8e8ff',
        }
    },
    {
        id: 'pirata',
        nome: 'Pirata',
        icone: '🏴‍☠️',
        dark: true,
        vars: {
            '--primary':    '#c8973a',
            '--bg-page':    '#1a1209',
            '--bg-card':    '#231810',
            '--bg-surface': '#2e2015',
            '--text-main':  '#e8d5a3',
            '--text-sec':   '#a08060',
            '--border':     '#4a3020',
            '--bg-button':  '#2e2015',
            '--text-button':'#e8d5a3',
        }
    },
    {
        id: 'floresta',
        nome: 'Floresta',
        icone: '🌿',
        dark: false,
        vars: {
            '--primary':    '#2d6a4f',
            '--bg-page':    '#f0f7f4',
            '--bg-card':    '#ffffff',
            '--bg-surface': '#e8f5e9',
            '--text-main':  '#1b4332',
            '--text-sec':   '#52796f',
            '--border':     '#b7e4c7',
            '--bg-button':  '#e8f5e9',
            '--text-button':'#1b4332',
        }
    }
];

/**
 * Aplica um conjunto de variáveis CSS na raiz do documento.
 * @param {Object} vars - Mapa de variável CSS → valor
 * @param {boolean} isDark - Se true, ativa a classe dark-mode no body
 */
export function aplicarTema(vars, isDark) {
    const root = document.documentElement;
    for (const [key, val] of Object.entries(vars)) {
        root.style.setProperty(key, val);
    }
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

/**
 * Persiste o temaId ativo no localStorage.
 * @param {string} temaId - ID do tema (preset ou custom-timestamp)
 */
export function salvarTemaAtivo(temaId) {
    localStorage.setItem('temaId', temaId);
    // Retrocompatibilidade
    const tema = TEMAS_PRESET.find(t => t.id === temaId);
    if (tema) localStorage.setItem('theme', tema.dark ? 'dark' : 'light');
}

// ─── Lista de temas customizados ────────────────────────────────────────────

/**
 * Retorna todos os temas customizados salvos.
 * @returns {Array<{id, nome, icone, vars, dark}>}
 */
export function getTemasCustom() {
    try {
        return JSON.parse(localStorage.getItem('temasCustomList') || '[]');
    } catch (_) { return []; }
}

/**
 * Adiciona um tema customizado à lista e o salva.
 * @param {string} nome
 * @param {Object} vars
 * @param {boolean} dark
 * @returns {string} id gerado
 */
export function adicionarTemaCustom(nome, vars, dark) {
    const lista = getTemasCustom();
    const id = `custom-${Date.now()}`;
    lista.push({ id, nome: nome || 'Meu Tema', icone: '✨', vars, dark });
    localStorage.setItem('temasCustomList', JSON.stringify(lista));
    return id;
}

/**
 * Atualiza um tema customizado existente na lista.
 * @param {string} id
 * @param {string} nome
 * @param {Object} vars
 * @param {boolean} dark
 */
export function atualizarTemaCustom(id, nome, vars, dark) {
    const lista = getTemasCustom().map(t =>
        t.id === id ? { ...t, nome, vars, dark } : t
    );
    localStorage.setItem('temasCustomList', JSON.stringify(lista));
}

/**
 * Remove um tema customizado da lista pelo id.
 * @param {string} id
 */
export function removerTemaCustom(id) {
    const lista = getTemasCustom().filter(t => t.id !== id);
    localStorage.setItem('temasCustomList', JSON.stringify(lista));
    // Se era o tema ativo, volta para light
    if (localStorage.getItem('temaId') === id) {
        const luz = TEMAS_PRESET.find(t => t.id === 'light');
        if (luz) aplicarTema(luz.vars, luz.dark);
        salvarTemaAtivo('light');
    }
}

/**
 * Lê o tema salvo e o aplica. Deve ser chamado o mais cedo possível
 * (antes do primeiro render) para evitar flash.
 */
export function carregarTema() {
    const temaId = localStorage.getItem('temaId');

    // Tema na lista customizada
    if (temaId && temaId.startsWith('custom-')) {
        const tema = getTemasCustom().find(t => t.id === temaId);
        if (tema) { aplicarTema(tema.vars, tema.dark); return; }
    }

    // Tema preset
    if (temaId) {
        const tema = TEMAS_PRESET.find(t => t.id === temaId);
        if (tema) { aplicarTema(tema.vars, tema.dark); return; }
    }

    // Retrocompatibilidade: chave 'theme' antiga (dark / light)
    if (localStorage.getItem('theme') === 'dark') {
        const dark = TEMAS_PRESET.find(t => t.id === 'dark');
        if (dark) aplicarTema(dark.vars, true);
    }
}
