// Middlewares de autorização para Mesa.
// Devem ser usados após `requireAuth` e em rotas com :mesaId (ou :id).
//
// requireMesaMembro:
//   - Carrega a mesa, valida que existe, e injeta `req.mesa` + `req.isNarradorDaMesa`.
//   - Permite acesso ao narrador OU a qualquer jogador com personagem nessa mesa.
//
// requireMesaNarrador:
//   - Deve vir DEPOIS de `requireMesaMembro` (depende de `req.isNarradorDaMesa`).
//   - Bloqueia jogador comum, permite só o narrador.
import { prisma } from '../prisma.js';

export async function requireMesaMembro(req, res, next) {
    try {
        const mesaId = req.params.mesaId || req.params.id;
        const mesa = await prisma.mesa.findUnique({ where: { id: mesaId } });
        if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada.' });

        const isNarrador = mesa.userId === req.user.id;
        let isJogador = false;
        if (!isNarrador) {
            const p = await prisma.personagem.findFirst({
                where: { mesaId, userId: req.user.id },
                select: { id: true }
            });
            isJogador = !!p;
        }

        if (!isNarrador && !isJogador) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        req.mesa = mesa;
        req.isNarradorDaMesa = isNarrador;
        next();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export function requireMesaNarrador(req, res, next) {
    if (!req.isNarradorDaMesa) {
        return res.status(403).json({ error: 'Apenas o narrador.' });
    }
    next();
}
