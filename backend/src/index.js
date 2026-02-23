import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import usersRouter      from './routes/users.js';
import inventarioRouter from './routes/inventario.js';
import acoesRouter      from './routes/acoes.js';
import mensagensRouter  from './routes/mensagens.js';

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

// ─── Parsing ────────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Rotas API ───────────────────────────────────────────────────────────────
app.use('/api/users',                 usersRouter);
app.use('/api/users/:uid/inventario', inventarioRouter);
app.use('/api/users/:uid/acoes',      acoesRouter);
app.use('/api/mensagens',             mensagensRouter);

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
