// Middleware de autenticação
// Verifica o JWT do Supabase usando o supabase-admin e injeta req.user
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Middleware que lê o Bearer token e verifica com Supabase.
 * Em caso de sucesso, injeta req.user = { id, email, ... }.
 */
export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Tenta validar o usuário com tentativas de reconexão (Retry) caso o IPv6/Cloudflare do Supabase trave
    let user = null;
    let error = null;
    for (let i = 0; i < 3; i++) {
        try {
            const result = await supabaseAdmin.auth.getUser(token);
            user = result.data?.user;
            error = result.error;
            if (user || error?.status === 401) break; // Se validou ou se é apenas um token ruim (não erro de rede), pare de tentar
        } catch (err) {
            console.warn(`Tentativa ${i + 1} de comunicação com o Supabase falhou (Timeout).`);
            if (i === 2) error = err; // Última tentativa salva o erro
        }
    }

    if (error || !user) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    req.user = user;
    next();
}

/**
 * Garante que o usuário autenticado só acesse/modifique seus próprios dados.
 * Deve ser usado após requireAuth e quando a rota tiver :uid.
 */
export function requireSelf(req, res, next) {
    if (req.user.id !== req.params.uid) {
        return res.status(403).json({ error: 'Acesso negado.' });
    }
    next();
}
