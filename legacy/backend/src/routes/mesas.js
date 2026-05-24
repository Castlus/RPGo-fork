import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// Função utilitária para gerar código alfanumérico
function generateCodigoAcesso() {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); // Gera 6 caracteres hexadecimais
}

// POST /mesas — cria uma nova mesa
router.post('/', requireAuth, async (req, res) => {
    const { nome, bannerUrl } = req.body;

    if (!nome) return res.status(400).json({ error: 'Nome da mesa é obrigatório.' });

    try {
        let codigoAcesso = generateCodigoAcesso();
        
        // Garante que o código seja único
        let isUnique = false;
        while (!isUnique) {
            const existing = await prisma.mesa.findUnique({ where: { codigoAcesso } });
            if (!existing) {
                isUnique = true;
            } else {
                codigoAcesso = generateCodigoAcesso();
            }
        }

        const mesa = await prisma.mesa.create({
            data: {
                userId: req.user.id,
                nome,
                codigoAcesso,
                bannerUrl
            }
        });

        res.status(201).json(mesa);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /mesas — retorna as mesas que o usuário é Narrador
router.get('/', requireAuth, async (req, res) => {
    try {
        const mesas = await prisma.mesa.findMany({
            where: { userId: req.user.id }
        });
        res.json(mesas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /mesas/:id — retorna os dados da mesa e seus personagens (restrito ao Narrador)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const mesa = await prisma.mesa.findUnique({
            where: { id: req.params.id },
            include: { personagens: true }
        });

        if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada.' });
        if (mesa.userId !== req.user.id) return res.status(403).json({ error: 'Apenas o narrador pode ver a mesa.' });

        res.json(mesa);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /mesas/:id/personagens — retorna todos os personagens de uma mesa (restrito ao Narrador)
router.get('/:id/personagens', requireAuth, async (req, res) => {
    try {
        const mesa = await prisma.mesa.findUnique({
            where: { id: req.params.id },
            include: { personagens: true }
        });

        if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada.' });
        if (mesa.userId !== req.user.id) return res.status(403).json({ error: 'Apenas o narrador pode listar os personagens.' });

        res.json(mesa.personagens);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /mesas/join — Permite um personagem entrar numa mesa sabendo o código de acesso
router.post('/join', requireAuth, async (req, res) => {
    const { codigo, personagemId } = req.body;

    if (!codigo || !personagemId) {
        return res.status(400).json({ error: 'Código e personagemId são obrigatórios.' });
    }

    try {
        const personagem = await prisma.personagem.findUnique({ where: { id: personagemId } });
        if (!personagem || personagem.userId !== req.user.id) {
            return res.status(403).json({ error: 'Personagem inválido ou sem permissão.' });
        }

        const mesa = await prisma.mesa.findUnique({ where: { codigoAcesso: codigo } });
        if (!mesa) {
            return res.status(404).json({ error: 'Código de mesa inválido.' });
        }

        const atualizado = await prisma.personagem.update({
            where: { id: personagemId },
            data: { mesaId: mesa.id }
        });

        res.json({ message: 'Entrou na mesa com sucesso.', mesa });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /mesas/:id - apaga uma mesa
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const mesa = await prisma.mesa.findUnique({ where: { id: req.params.id } });
        if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada.' });
        
        if (mesa.userId !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        await prisma.mesa.delete({
            where: { id: req.params.id }
        });
        res.status(200).json({ message: "Mesa removida com sucesso." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;