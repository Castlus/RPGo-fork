import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireSelf } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /users/:uid — retorna o personagem
router.get('/:uid', requireAuth, requireSelf, async (req, res) => {
    try {
        const personagem = await prisma.personagem.findUnique({
            where: { id: req.params.uid }
        });
        if (!personagem) return res.status(404).json({ error: 'Personagem não encontrado.' });
        res.json(personagem);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /users — cria um novo personagem (chamado por criacao-personagem.html)
router.post('/', requireAuth, async (req, res) => {
    const uid = req.user.id;
    const { nome, hpMax, ppMax, forca = 0, destreza = 0, constituicao = 0,
            sabedoria = 0, vontade = 0, presenca = 0 } = req.body;

    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    try {
        const personagem = await prisma.personagem.create({
            data: {
                id: uid,
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
        // P2002 = unique constraint (usuário já tem personagem)
        if (e.code === 'P2002') return res.status(409).json({ error: 'Personagem já existe.' });
        res.status(500).json({ error: e.message });
    }
});

// PATCH /users/:uid — atualiza campos do personagem (edição parcial)
router.patch('/:uid', requireAuth, requireSelf, async (req, res) => {
    const allowed = [
        'nome', 'nivel', 'hpAtual', 'hpMax', 'ppAtual', 'ppMax',
        'cargaMaxima', 'ultimaRolagem',
        'forca', 'destreza', 'constituicao', 'sabedoria', 'vontade', 'presenca'
    ];

    // Aceita também o formato { atributos: { forca, ... } } vindo do front legado
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
        if (e.code === 'P2025') return res.status(404).json({ error: 'Personagem não encontrado.' });
        res.status(500).json({ error: e.message });
    }
});

export default router;
