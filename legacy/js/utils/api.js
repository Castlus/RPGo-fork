// ─── API Wrapper ─────────────────────────────────────────────────────────────
// Centraliza todas as chamadas HTTP para o backend Express + Prisma.
// Injeta automaticamente o Bearer token do Supabase em cada requisição.
//
import { supabase } from './supabase-config.js';

export { supabase };

// Backend co-locado com o frontend — path relativo serve em dev e em qualquer deploy futuro.
export const API_BASE = '/api';

// Cache do token para evitar o dispendioso `getSession` em todas as requisições
let cachedToken = null;

// Escuta mudanças de estado (login/logout/refresh local)
supabase.auth.onAuthStateChange((event, session) => {
    cachedToken = session?.access_token || null;
});

// Força a primeira busca de token no carregamento da API
supabase.auth.getSession().then(({ data: { session } }) => {
    cachedToken = session?.access_token || null;
});

async function authHeaders() {
    // Se o token ainda não estiver em memória por causa do boot, faz um fallback
    if (!cachedToken) {
        const { data: { session } } = await supabase.auth.getSession();
        cachedToken = session?.access_token || null;
    }
    
    return {
        'Content-Type': 'application/json',
        ...(cachedToken ? { 'Authorization': `Bearer ${cachedToken}` } : {})
    };
}

async function handleResponse(res) {
    if (!res.ok) {
        const body = await res.text();
        const err = new Error(body || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

export async function apiGet(path) {
    const headers = await authHeaders();
    return handleResponse(await fetch(`${API_BASE}${path}`, { headers }));
}

export async function apiPost(path, body) {
    const headers = await authHeaders();
    return handleResponse(await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    }));
}

export async function apiPatch(path, body) {
    const headers = await authHeaders();
    return handleResponse(await fetch(`${API_BASE}${path}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
    }));
}

export async function apiDelete(path) {
    const headers = await authHeaders();
    return handleResponse(await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers
    }));
}
