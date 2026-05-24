// Middleware de autenticação
// Verifica o JWT do Supabase localmente usando as chaves públicas (JWKS).
// Sem round-trip ao Supabase no hot path — o JWKS é cacheado em memória pela lib `jose`.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
    console.warn('⚠️  SUPABASE_URL não definido no .env — auth vai falhar 401.');
}

// O `jose` baixa as chaves públicas uma vez e cacheia; refaz fetch só quando expira.
const JWKS = SUPABASE_URL
    ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
    : null;

/**
 * Middleware que lê o Bearer token e verifica localmente com a chave pública do Supabase.
 * Em caso de sucesso, injeta req.user = { id, email, ... } na mesma shape esperada por requirePersonagemAccess.
 */
export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido.' });
    }

    if (!JWKS) {
        return res.status(500).json({ error: 'Auth não configurado no servidor.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            ...payload
        };
        next();
    } catch (err) {
        if (err.code === 'ERR_JWT_EXPIRED') {
            return res.status(401).json({ error: 'Token expirado.' });
        }
        return res.status(401).json({ error: 'Token inválido.' });
    }
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
