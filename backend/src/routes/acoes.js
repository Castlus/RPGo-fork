import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireSelf } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

// GET /users/:uid/acoes
router.get('/', requireAuth, requireSelf, async (req, res) => {
    try {
        const acoes = await prisma.acao.findMany({
            where: { personagemId: req.params.uid }
        });
        res.json(acoes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /users/:uid/acoes
router.post('/', requireAuth, requireSelf, async (req, res) => {
    const { nome, descricao, tipo, tag } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    try {
        const acao = await prisma.acao.create({
            data: {
                personagemId: req.params.uid,
                nome,
                descricao: descricao || '',
                tipo: tipo || 'padrao',
                tag: tag || ''
            }
        });
        res.status(201).json(acao);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /users/:uid/acoes/:id
router.delete('/:id', requireAuth, requireSelf, async (req, res) => {
    try {
        await prisma.acao.delete({
            where: { id: req.params.id, personagemId: req.params.uid }
        });
        res.json({ ok: true });
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'Ação não encontrada.' });
        res.status(500).json({ error: e.message });
    }
});

export default router;
