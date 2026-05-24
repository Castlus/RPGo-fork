# RPGo — Notas para o Claude

Ficha de RPG online (One Piece) com chat, rolador de dados, inventário e sistema de mesas (narrador + personagens) em tempo real.

## Stack
- **Frontend:** HTML/CSS/JS vanilla, ES Modules, sem framework. Servido como estático pelo próprio Express.
- **Backend:** Node.js + Express + Prisma. ESM (`"type": "module"` em [backend/package.json](backend/package.json)).
- **Banco/Auth/Realtime:** Supabase (Postgres + Auth + Realtime).
- **Deploy:** intenção é Vercel (front + back co-locados). Atualmente sem deploy ativo. Não reintroduzir Fly.io, Render ou Docker.

## Idioma
- Código, comentários, mensagens de erro, docs e nomes de variáveis em **português**.
- Nomes de campos: camelCase no JS, snake_case no banco via `@map()` no Prisma.

## Backend — padrão de rotas
Cada recurso é um router em [backend/src/routes/](backend/src/routes/), montado em [backend/src/index.js](backend/src/index.js). Rotas atuais:
- `/api/personagens` ([personagens.js](backend/src/routes/personagens.js))
- `/api/mesas` ([mesas.js](backend/src/routes/mesas.js))
- `/api/personagens/:uid/inventario` ([inventario.js](backend/src/routes/inventario.js))
- `/api/personagens/:uid/acoes` ([acoes.js](backend/src/routes/acoes.js))
- `/api/mensagens` ([mensagens.js](backend/src/routes/mensagens.js))

Convenções:
- **Auth:** sempre `requireAuth` (valida JWT localmente via JWKS, ver abaixo).
- **Ownership de personagem:** rotas que recebem `:uid` (personagem) usam `requirePersonagemAccess` (exportado de [personagens.js](backend/src/routes/personagens.js)). Permite acesso ao **dono** OU ao **narrador da mesa** em que o personagem está. Injeta `req.personagemInfo` (já com `include: { mesa: true }`) pra evitar refetch.
- **Sub-routers** (`/personagens/:uid/inventario`, `/acoes`): use `Router({ mergeParams: true })`.
- **PATCH** usa allow-list de campos; nunca passar `req.body` direto pro Prisma.
- **Prisma:** sempre importar `{ prisma }` de [backend/src/prisma.js](backend/src/prisma.js) (singleton). Nunca `new PrismaClient()` em route — exauriria o pool do PgBouncer.
- **Erros:** try/catch retornando `{ error: 'mensagem em português' }`. Códigos Prisma comuns: `P2002` → 409 (unique), `P2025` → 404 (não encontrado).
- **Ownership de registros filhos** (item, ação): incluir `personagemId: req.params.uid` no `where` do `update`/`delete` (defesa em profundidade, mesmo com `requirePersonagemAccess`).

## Auth — JWT local via JWKS
[backend/src/middleware/auth.js](backend/src/middleware/auth.js) valida o JWT do Supabase **localmente** com a lib `jose`, baixando as chaves públicas do endpoint JWKS (`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`) e cacheando em memória. **Não chamar `supabaseAdmin.auth.getUser(token)` no hot path** — é um round-trip remoto que adiciona 100-400ms (e mais com retry) em toda request.

`req.user` tem a shape `{ id, email, role, ...payload }`. O `id` é o `auth.users.id` do Supabase (era `payload.sub` no JWT).

## Frontend — organização
- Cada componente vive em `js/components/<nome>/` com `.html`, `.js`, opcional `.css` e `-DOC.md`.
- HTTP via wrapper [js/utils/api.js](js/utils/api.js) (`apiGet/Post/Patch/Delete`) — injeta Bearer token do Supabase automaticamente. **`API_BASE` é sempre `/api` relativo** (backend co-locado).
- Token do Supabase é cacheado em memória via `onAuthStateChange` (em [api.js](js/utils/api.js)). Não chamar `supabase.auth.getSession()` ou `getUser()` em hot path — usar o que já está cacheado ou receber via parâmetro.
- Cliente Supabase singleton em [js/utils/supabase-config.js](js/utils/supabase-config.js).
- **Realtime:** componentes (perfil, inventario, acoes, chat) se inscrevem em `postgres_changes` e refazem fetch ao receber update. Não fazer polling REST.
- **Carregamento da ficha:** [ficha.js](ficha.js) carrega o personagem **uma vez** e passa como parâmetro pros componentes (`carregarPerfil(uid, personagem, user)`, `carregarInventario(uid, personagem)`, `iniciarBandeja(user, sessionId, personagem)`). Componentes só refazem fetch se o parâmetro vier vazio.

## Schema / Banco
- Schema em [backend/prisma/schema.prisma](backend/prisma/schema.prisma).
- **Mudança importante:** `Personagem.id` é UUID auto-gerado (não é mais o UID do usuário). Quem é o dono é o campo `Personagem.userId` (referência ao `auth.users.id` do Supabase). `Personagem.mesaId` é nullable — null = sem mesa.
- Migrations: o time usa `prisma db push` (sem pasta `migrations/`). Após mudar o schema, rodar `npm run db:push` no `backend/`.
- Após criar/alterar tabela, rodar no SQL Editor do Supabase: `ALTER TABLE <t> REPLICA IDENTITY FULL` e publicar a tabela em Realtime (instruções no topo do schema).

## Performance — patterns a manter
- Backend: `compression` middleware ativo (gzip nas respostas JSON grandes — ex: `/mensagens` com até 200 itens).
- Backend: validação JWT local (sem round-trip Supabase no hot path).
- Backend: singleton Prisma (1 pool).
- Frontend: 1 fetch de personagem no load da ficha, repassado pros componentes via parâmetro.
- Frontend: token cacheado em [api.js](js/utils/api.js).

## Não fazer
- Não reintroduzir Firebase ([js/utils/firebase-config.js](js/utils/firebase-config.js) é órfão pendente de remoção; a migração pra Supabase já foi feita).
- Não recriar `fly.toml`, `Dockerfile`, `render.yaml` nem workflows de deploy pra esses provedores.
- Não commitar `.env` (gitignored em [.gitignore](.gitignore)).
- Não passar `req.body` direto pro Prisma em updates — sempre allow-list.
- Não criar `new PrismaClient()` em routes — sempre importar de [backend/src/prisma.js](backend/src/prisma.js).
- Não chamar `supabaseAdmin.auth.getUser(token)` no hot path do backend — validação JWT é local.
- Não chamar `supabase.auth.getSession()` ou `getUser()` em cada request do frontend — token tá cacheado.
- Não duplicar `apiGet('/personagens/:uid')` em componentes da ficha — receber via parâmetro.
- Não apontar `API_BASE` pra URL externa de backend separado — frontend e backend são co-locados.
