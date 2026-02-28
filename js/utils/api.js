// ─── API Wrapper ─────────────────────────────────────────────────────────────
// Centraliza todas as chamadas HTTP para o backend Express + Prisma.
// Injeta automaticamente o Bearer token do Supabase em cada requisição.
//
import { supabase } from './supabase-config.js';

export { supabase };

// Em desenvolvimento (Live Server), o backend Express roda na porta 3001.
// Em produção (Render), o frontend é servido pelo mesmo servidor, então /api funciona.
export const API_BASE =
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3001/api'
        : '/api';

async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

async function handleResponse(res) {
    if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
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
