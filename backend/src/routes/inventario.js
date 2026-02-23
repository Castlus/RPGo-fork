import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireSelf } from '../middleware/auth.js';

const router = Router({ mergeParams: true }); // herda :uid do parent
const prisma = new PrismaClient();

// GET /users/:uid/inventario
router.get('/', requireAuth, requireSelf, async (req, res) => {
    try {
        const itens = await prisma.item.findMany({
            where: { personagemId: req.params.uid },
            orderBy: { nome: 'asc' }
        });
        res.json(itens);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /users/:uid/inventario
router.post('/', requireAuth, requireSelf, async (req, res) => {
    const { nome, peso, tipo, tags, descricao, dano, modificador, ca, penalidadeDes } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    try {
        const item = await prisma.item.create({
            data: {
                personagemId: req.params.uid,
                nome,
                peso: Number(peso) || 0,
                tipo: tipo || 'comum',
                tags: tags || '',
                descricao: descricao || '',
                dano: dano || '',
                modificador: Number(modificador) || 0,
                ca: Number(ca) || 0,
                penalidadeDes: Number(penalidadeDes) || 0
            }
        });
        res.status(201).json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PATCH /users/:uid/inventario/:id
router.patch('/:id', requireAuth, requireSelf, async (req, res) => {
    const allowed = ['nome', 'peso', 'tipo', 'tags', 'descricao', 'dano',
                     'modificador', 'ca', 'penalidadeDes', 'equipado', 'favorito'];
    const data = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    try {
        // Garante que o item pertence a este usuário
        const item = await prisma.item.update({
            where: { id: req.params.id, personagemId: req.params.uid },
            data
        });
        res.json(item);
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'Item não encontrado.' });
        res.status(500).json({ error: e.message });
    }
});

// DELETE /users/:uid/inventario/:id
router.delete('/:id', requireAuth, requireSelf, async (req, res) => {
    try {
        await prisma.item.delete({
            where: { id: req.params.id, personagemId: req.params.uid }
        });
        res.json({ ok: true });
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'Item não encontrado.' });
        res.status(500).json({ error: e.message });
    }
});

export default router;
