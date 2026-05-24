import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import personagensRouter from './routes/personagens.js';
import mesasRouter      from './routes/mesas.js';
import inventarioRouter from './routes/inventario.js';
import acoesRouter      from './routes/acoes.js';
import mensagensRouter  from './routes/mensagens.js';
import calendarioRouter from './routes/calendario.js';

const app  = express();
const PORT = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Compressão de respostas (gzip) ─────────────────────────────────────────
app.use(compression());

// ─── Parsing ────────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Rotas API ───────────────────────────────────────────────────────────────
app.use('/api/personagens',                 personagensRouter);
app.use('/api/mesas',                       mesasRouter);
app.use('/api/personagens/:uid/inventario', inventarioRouter);
app.use('/api/personagens/:uid/acoes',      acoesRouter);
app.use('/api/mensagens',                   mensagensRouter);
app.use('/api/mesas/:mesaId/calendario',    calendarioRouter);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ─── Frontend estático ───────────────────────────────────────────────────────
// Raiz do projeto: backend/src/index.js → backend/ → raiz/
const frontendPath = join(__dirname, '..', '..');
app.use(express.static(frontendPath));

// SPA fallback — qualquer rota não-API devolve o index.html
app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅  RPGo rodando em http://localhost:${PORT}`);
});
