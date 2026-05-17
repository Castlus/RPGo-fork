import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Middleware de autorização para Personagem
// Verifica se o usuário é o dono ou narrador da mesa
export async function requirePersonagemAccess(req, res, next) {
    try {
        const personagem = await prisma.personagem.findUnique({
            where: { id: req.params.uid },
            include: { mesa: true }
        });
        
        if (!personagem) {
            return res.status(404).json({ error: 'Personagem não encontrado.' });
        }

        const isDono = personagem.userId === req.user.id;
        const isNarrador = personagem.mesa?.userId === req.user.id;

        if (!isDono && !isNarrador) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        req.personagemInfo = personagem; // Guardar para não precisar buscar dnv
        next();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// GET /personagens — retorna os personagens do usuário logado
router.get('/', requireAuth, async (req, res) => {
    try {
        const personagens = await prisma.personagem.findMany({
            where: { userId: req.user.id }
        });
        res.json(personagens);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /personagens/:uid — retorna o personagem
router.get('/:uid', requireAuth, requirePersonagemAccess, async (req, res) => {
    res.json(req.personagemInfo);
});

// POST /personagens — cria um novo personagem
router.post('/', requireAuth, async (req, res) => {
    const { nome, hpMax, ppMax, forca = 0, destreza = 0, constituicao = 0,
            sabedoria = 0, vontade = 0, presenca = 0 } = req.body;

    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    try {
        const personagem = await prisma.personagem.create({
            data: {
                userId: req.user.id,
                nome,
                hpMax: Number(hpMax) || 0,
                hpAtual: Number(hpMax) || 0,
                ppMax: Number(ppMax) || 0,
                ppAtual: Number(ppMax) || 0,
                nivel: 1,
                forca: Number(forca),
                destreza: Number(destreza),
                constituicao: Number(constituicao),
                sabedoria: Number(sabedoria),
                vontade: Number(vontade),
                presenca: Number(presenca)
            }
        });
        res.status(201).json(personagem);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PATCH /personagens/:uid — atualiza campos do personagem (edição parcial)
router.patch('/:uid', requireAuth, requirePersonagemAccess, async (req, res) => {
    const allowed = [
        'nome', 'nivel', 'hpAtual', 'hpMax', 'ppAtual', 'ppMax',
        'cargaMaxima', 'ultimaRolagem', 'fotoUrl',
        'forca', 'destreza', 'constituicao', 'sabedoria', 'vontade', 'presenca',
        'mesaId' // Permitir atualizar a mesa do personagem
    ];

    let data = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (req.body.atributos) {
        const a = req.body.atributos;
        Object.assign(data, {
            forca: a.forca,
            destreza: a.destreza,
            constituicao: a.constituicao,
            sabedoria: a.sabedoria,
            vontade: a.vontade,
            presenca: a.presenca
        });
    }

    try {
        const personagem = await prisma.personagem.update({
            where: { id: req.params.uid },
            data
        });
        res.json(personagem);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /personagens/:uid - apaga um personagem especifico
router.delete('/:uid', requireAuth, requirePersonagemAccess, async (req, res) => {
    try {
        await prisma.personagem.delete({
            where: { id: req.params.uid }
        });
        res.status(200).json({ message: "Personagem removido com sucesso." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
