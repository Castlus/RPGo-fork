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
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

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
