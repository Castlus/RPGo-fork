import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /mensagens/:sessionId — retorna últimas 200 mensagens ordenadas por timestamp
router.get('/:sessionId', requireAuth, async (req, res) => {
    try {
        const mensagens = await prisma.mensagem.findMany({
            where: { sessionId: req.params.sessionId },
            orderBy: { timestamp: 'asc' },
            take: 200
        });
        res.json(mensagens);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /mensagens/:sessionId — envia uma nova mensagem ou rolagem de dados
router.post('/:sessionId', requireAuth, async (req, res) => {
    const uid = req.user.id;
    const { nome, mensagem, tipo, total, modificador, detalhes } = req.body;

    if (!tipo && !mensagem) {
        return res.status(400).json({ error: 'mensagem é obrigatória para tipo texto.' });
    }

    try {
        const nova = await prisma.mensagem.create({
            data: {
                sessionId: req.params.sessionId,
                uid,
                nome: nome || 'Anônimo',
                mensagem: mensagem || null,
                tipo: tipo || 'texto',
                total: total != null ? Number(total) : null,
                modificador: modificador != null ? Number(modificador) : null,
                detalhes: detalhes || null
            }
        });
        res.status(201).json(nova);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /mensagens/:sessionId — apaga TODAS as mensagens da sessão (comando /limpar)
router.delete('/:sessionId', requireAuth, async (req, res) => {
    try {
        const { count } = await prisma.mensagem.deleteMany({
            where: { sessionId: req.params.sessionId }
        });
        res.json({ ok: true, deletadas: count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
