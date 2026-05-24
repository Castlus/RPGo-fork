import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMesaMembro, requireMesaNarrador } from '../middleware/mesa-access.js';
import { dataParaDias, estacaoDoMes, sortearTipoClima } from '../calendario/engine.js';
import { TEMPLATES, TEMPLATE_GREGORIANO, TIPOS_CLIMA_DEFAULT } from '../calendario/templates.js';

const router = Router({ mergeParams: true }); // herda :mesaId

// Todas as rotas exigem auth + membro da mesa.
router.use(requireAuth, requireMesaMembro);

// ─── Helpers internos ──────────────────────────────────────────────────────────

// Cria um Calendario gregoriano default pra esta mesa.
// Tolera P2002 (outra request criou em paralelo) e retorna o que já existe.
async function criarCalendarioLazy(mesaId) {
    try {
        return await prisma.calendario.create({
            data: {
                mesaId,
                config: TEMPLATE_GREGORIANO,
                dataAtualDias: 0,
                tiposClima: {
                    create: TIPOS_CLIMA_DEFAULT.map(t => ({
                        nome: t.nome,
                        descricao: t.descricao,
                        icone: t.icone,
                        pesosPorEstacao: t.pesos
                    }))
                }
            }
        });
    } catch (e) {
        if (e.code === 'P2002') {
            return prisma.calendario.findUnique({ where: { mesaId } });
        }
        throw e;
    }
}

function eventosVisiveis(eventos, dataAtualDias, isNarrador) {
    if (isNarrador) return eventos;
    return eventos.filter(e => !e.oculto && e.dataDias <= dataAtualDias);
}

// Validação leve de `config` no PATCH. Não exaustiva — confia no narrador.
function validarConfig(config) {
    if (!config || typeof config !== 'object') return 'config inválido.';
    if (!Array.isArray(config.meses) || config.meses.length === 0) return 'config.meses inválido.';
    for (const m of config.meses) {
        if (!m.nome || typeof m.nome !== 'string') return 'config.meses[].nome inválido.';
        if (!Number.isInteger(m.dias) || m.dias < 1) return 'config.meses[].dias inválido.';
    }
    if (!Array.isArray(config.diasSemana) || config.diasSemana.length === 0) return 'config.diasSemana inválido.';
    if (!Array.isArray(config.estacoes) || config.estacoes.length === 0) return 'config.estacoes inválido.';
    if (!(Number(config.cicloLuaDias) > 0)) return 'config.cicloLuaDias inválido.';
    return null;
}

// ─── GET / ─────────────────────────────────────────────────────────────────────
// Retorna calendário (cria lazy), tipos de clima e eventos visíveis ao requisitante.
router.get('/', async (req, res) => {
    try {
        let calendario = await prisma.calendario.findUnique({
            where: { mesaId: req.params.mesaId },
            include: { tiposClima: { orderBy: { nome: 'asc' } } }
        });

        if (!calendario) {
            await criarCalendarioLazy(req.params.mesaId);
            calendario = await prisma.calendario.findUnique({
                where: { mesaId: req.params.mesaId },
                include: { tiposClima: { orderBy: { nome: 'asc' } } }
            });
        }

        const eventosTodos = await prisma.eventoCalendario.findMany({
            where: { calendarioId: calendario.id },
            orderBy: { dataDias: 'asc' }
        });
        const eventos = eventosVisiveis(eventosTodos, calendario.dataAtualDias, req.isNarradorDaMesa);

        const { tiposClima, ...calendarioBase } = calendario;
        res.json({ calendario: calendarioBase, tiposClima, eventos, isNarrador: req.isNarradorDaMesa });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── PATCH / ───────────────────────────────────────────────────────────────────
// Edita dataAtualDias e/ou config completa.
router.patch('/', requireMesaNarrador, async (req, res) => {
    const allowed = ['dataAtualDias', 'config'];
    const data = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    if (data.dataAtualDias !== undefined && !Number.isInteger(data.dataAtualDias)) {
        return res.status(400).json({ error: 'dataAtualDias deve ser inteiro.' });
    }
    if (data.config !== undefined) {
        const erro = validarConfig(data.config);
        if (erro) return res.status(400).json({ error: erro });
    }

    try {
        const calendario = await prisma.calendario.update({
            where: { mesaId: req.params.mesaId },
            data
        });
        res.json(calendario);
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'Calendário não encontrado.' });
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /aplicar-template ────────────────────────────────────────────────────
// Substitui `config` por um template conhecido. Opcionalmente recria tipos de clima default.
router.post('/aplicar-template', requireMesaNarrador, async (req, res) => {
    const { template, resetarTiposClima } = req.body;
    const tpl = TEMPLATES[template];
    if (!tpl) return res.status(400).json({ error: 'Template desconhecido.' });

    try {
        const calendario = await prisma.calendario.update({
            where: { mesaId: req.params.mesaId },
            data: { config: tpl }
        });

        if (resetarTiposClima) {
            await prisma.tipoClima.deleteMany({ where: { calendarioId: calendario.id } });
            await prisma.tipoClima.createMany({
                data: TIPOS_CLIMA_DEFAULT.map(t => ({
                    calendarioId: calendario.id,
                    nome: t.nome,
                    descricao: t.descricao,
                    icone: t.icone,
                    pesosPorEstacao: t.pesos
                }))
            });
        }

        res.json({ ok: true, calendario });
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'Calendário não encontrado.' });
        res.status(500).json({ error: e.message });
    }
});

// ─── Tipos de clima ────────────────────────────────────────────────────────────

// Helper pra obter calendarioId desta mesa (com checagem).
async function calendarioIdDaMesa(mesaId) {
    const c = await prisma.calendario.findUnique({
        where: { mesaId },
        select: { id: true }
    });
    return c?.id ?? null;
}

router.post('/tipos-clima', requireMesaNarrador, async (req, res) => {
    const { nome, descricao, icone, pesosPorEstacao } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    try {
        const calendarioId = await calendarioIdDaMesa(req.params.mesaId);
        if (!calendarioId) return res.status(404).json({ error: 'Calendário não encontrado.' });

        const tipo = await prisma.tipoClima.create({
            data: {
                calendarioId,
                nome,
                descricao: descricao || null,
                icone: icone || null,
                pesosPorEstacao: pesosPorEstacao || {}
            }
        });
        res.status(201).json(tipo);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/tipos-clima/:id', requireMesaNarrador, async (req, res) => {
    const allowed = ['nome', 'descricao', 'icone', 'pesosPorEstacao'];
    const data = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    try {
        const calendarioId = await calendarioIdDaMesa(req.params.mesaId);
        if (!calendarioId) return res.status(404).json({ error: 'Calendário não encontrado.' });

        const tipo = await prisma.tipoClima.update({
            where: { id: req.params.id, calendarioId },
            data
        });
        res.json(tipo);
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'Tipo de clima não encontrado.' });
        res.status(500).json({ error: e.message });
    }
});

router.delete('/tipos-clima/:id', requireMesaNarrador, async (req, res) => {
    try {
        const calendarioId = await calendarioIdDaMesa(req.params.mesaId);
        if (!calendarioId) return res.status(404).json({ error: 'Calendário não encontrado.' });

        await prisma.tipoClima.delete({
            where: { id: req.params.id, calendarioId }
        });
        res.json({ ok: true });
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'Tipo de clima não encontrado.' });
        res.status(500).json({ error: e.message });
    }
});

// ─── Eventos ───────────────────────────────────────────────────────────────────

router.post('/eventos', requireMesaNarrador, async (req, res) => {
    const { tipo, titulo, descricao, dataDias, tipoClimaId, oculto } = req.body;
    if (!tipo || !['climatico', 'narrativo'].includes(tipo)) {
        return res.status(400).json({ error: "tipo deve ser 'climatico' ou 'narrativo'." });
    }
    if (!titulo) return res.status(400).json({ error: 'Título é obrigatório.' });
    if (!Number.isInteger(dataDias)) return res.status(400).json({ error: 'dataDias deve ser inteiro.' });
    if (oculto !== undefined && typeof oculto !== 'boolean') {
        return res.status(400).json({ error: 'oculto deve ser booleano.' });
    }

    try {
        const calendarioId = await calendarioIdDaMesa(req.params.mesaId);
        if (!calendarioId) return res.status(404).json({ error: 'Calendário não encontrado.' });

        const evento = await prisma.eventoCalendario.create({
            data: {
                calendarioId,
                tipo,
                titulo,
                descricao: descricao || null,
                dataDias,
                tipoClimaId: tipoClimaId || null,
                oculto: !!oculto
            }
        });
        res.status(201).json(evento);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/eventos/:id', requireMesaNarrador, async (req, res) => {
    const allowed = ['titulo', 'descricao', 'dataDias', 'tipoClimaId', 'tipo', 'oculto'];
    const data = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (data.tipo && !['climatico', 'narrativo'].includes(data.tipo)) {
        return res.status(400).json({ error: "tipo deve ser 'climatico' ou 'narrativo'." });
    }
    if (data.dataDias !== undefined && !Number.isInteger(data.dataDias)) {
        return res.status(400).json({ error: 'dataDias deve ser inteiro.' });
    }
    if (data.oculto !== undefined && typeof data.oculto !== 'boolean') {
        return res.status(400).json({ error: 'oculto deve ser booleano.' });
    }

    try {
        const calendarioId = await calendarioIdDaMesa(req.params.mesaId);
        if (!calendarioId) return res.status(404).json({ error: 'Calendário não encontrado.' });

        const evento = await prisma.eventoCalendario.update({
            where: { id: req.params.id, calendarioId },
            data
        });
        res.json(evento);
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'Evento não encontrado.' });
        res.status(500).json({ error: e.message });
    }
});

router.delete('/eventos/:id', requireMesaNarrador, async (req, res) => {
    try {
        const calendarioId = await calendarioIdDaMesa(req.params.mesaId);
        if (!calendarioId) return res.status(404).json({ error: 'Calendário não encontrado.' });

        await prisma.eventoCalendario.delete({
            where: { id: req.params.id, calendarioId }
        });
        res.json({ ok: true });
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'Evento não encontrado.' });
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /gerar-clima ─────────────────────────────────────────────────────────
// Itera dias de [dataInicio..dataFim], sorteia tipo de clima ponderado pela estação daquele dia
// e cria EventoCalendario com tipo='climatico'. Se sobrescrever=true, apaga eventos climáticos
// existentes no intervalo antes de criar.
router.post('/gerar-clima', requireMesaNarrador, async (req, res) => {
    const { dataInicio, dataFim, sobrescrever } = req.body;
    if (!Number.isInteger(dataInicio) || !Number.isInteger(dataFim)) {
        return res.status(400).json({ error: 'dataInicio e dataFim devem ser inteiros.' });
    }
    if (dataFim < dataInicio) {
        return res.status(400).json({ error: 'dataFim deve ser ≥ dataInicio.' });
    }
    const intervalo = dataFim - dataInicio + 1;
    if (intervalo > 3650) {
        return res.status(400).json({ error: 'Intervalo máximo é 3650 dias.' });
    }

    try {
        const calendario = await prisma.calendario.findUnique({
            where: { mesaId: req.params.mesaId },
            include: { tiposClima: true }
        });
        if (!calendario) return res.status(404).json({ error: 'Calendário não encontrado.' });

        if (sobrescrever) {
            await prisma.eventoCalendario.deleteMany({
                where: {
                    calendarioId: calendario.id,
                    tipo: 'climatico',
                    dataDias: { gte: dataInicio, lte: dataFim }
                }
            });
        }

        const novos = [];
        let ignorados = 0;
        for (let d = dataInicio; d <= dataFim; d++) {
            const { mes } = dataParaDias(d, calendario.config);
            const estacao = estacaoDoMes(mes, calendario.config);
            const tipo = sortearTipoClima(calendario.tiposClima, estacao);
            if (!tipo) { ignorados++; continue; }
            novos.push({
                calendarioId: calendario.id,
                tipo: 'climatico',
                titulo: tipo.nome,
                descricao: tipo.descricao || null,
                dataDias: d,
                tipoClimaId: tipo.id
            });
        }

        if (novos.length > 0) {
            await prisma.eventoCalendario.createMany({ data: novos });
        }

        res.json({ criados: novos.length, ignorados });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
