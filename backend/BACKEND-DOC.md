# Backend — RPGo

## Stack
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express
- **ORM:** Prisma + PostgreSQL (Supabase)
- **Auth:** Supabase Auth (JWT verificado server-side)

## Estrutura
```
backend/
  src/
    index.js              ← entry point, monta o servidor
    middleware/
      auth.js             ← requireAuth, requireSelf
    routes/
      users.js            ← personagem (GET / POST / PATCH)
      inventario.js       ← itens (GET / POST / PATCH / DELETE)
      acoes.js            ← ações (GET / POST / DELETE)
      mensagens.js        ← mensagens (GET / POST / DELETE)
  prisma/
    schema.prisma         ← schema do banco
```

## Variáveis de Ambiente (`.env`)
```
DATABASE_URL          = postgres connection string (pooler/transation)
DIRECT_URL            = postgres connection string (direct, usado pelo Prisma migrate)
SUPABASE_URL          = https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY = service_role key (server-only, nunca expor no client)
CORS_ORIGINS          = https://seu-dominio.com,http://localhost:5500
PORT                  = 3001 (opcional)
```

## Rotas da API

### Personagem — `/api/users`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/users/:uid` | Retorna dados do personagem |
| POST | `/users` | Cria personagem (chamado por `criacao-personagem.html`) |
| PATCH | `/users/:uid` | Atualiza campos (parcial) |

**Campos aceitos no PATCH:**
`nome`, `nivel`, `hpAtual`, `hpMax`, `ppAtual`, `ppMax`, `cargaMaxima`, `ultimaRolagem`, `forca`, `destreza`, `constituicao`, `sabedoria`, `vontade`, `presenca`

Aceita também o formato legado `{ atributos: { forca, destreza, ... } }`.

---

### Inventário — `/api/users/:uid/inventario`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/users/:uid/inventario` | Lista itens (ordenados por nome) |
| POST | `/users/:uid/inventario` | Cria item |
| PATCH | `/users/:uid/inventario/:id` | Atualiza campos do item |
| DELETE | `/users/:uid/inventario/:id` | Remove item |

**Campos aceitos no PATCH:**
`nome`, `peso`, `tipo`, `tags`, `descricao`, `dano`, `modificador`, `ca`, `penalidadeDes`, `equipado`, `favorito`

---

### Ações — `/api/users/:uid/acoes`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/users/:uid/acoes` | Lista ações do personagem |
| POST | `/users/:uid/acoes` | Cria ação |
| DELETE | `/users/:uid/acoes/:id` | Remove ação |

---

### Mensagens — `/api/mensagens`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/mensagens/:sessionId` | Últimas 200 mensagens (ordem asc) |
| POST | `/mensagens/:sessionId` | Envia mensagem ou rolagem |
| DELETE | `/mensagens/:sessionId` | Apaga todas as mensagens da sessão |

---

### Health Check
```
GET /api/health → { ok: true, ts: "..." }
```

---

## Middleware de Autenticação

### `requireAuth`
Lê `Authorization: Bearer <token>`, verifica com `supabase.auth.getUser(token)` e injeta `req.user`.
Retorna `401` se token ausente, inválido ou expirado.

### `requireSelf`
Compara `req.user.id` com `req.params.uid`. Retorna `403` se diferente.
Impede que um usuário acesse/modifique dados de outro. **Sempre usado junto com `requireAuth`.**

---

## Schema do Banco (Prisma)

### `Personagem` → tabela `personagens`
| Campo | Tipo | Notas |
|---|---|---|
| id | String | PK = UID do Supabase Auth |
| nome | String | |
| nivel | Int | default 1 |
| hpAtual / hpMax | Int | |
| ppAtual / ppMax | Int | |
| cargaMaxima | Float | default 20 |
| ultimaRolagem | String? | |
| forca … presenca | Int | 6 atributos |

### `Item` → tabela `itens`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | gerado automaticamente |
| personagemId | String | FK → personagens.id (cascade delete) |
| nome | String | |
| peso | Float | |
| tipo | String | `'comum'` \| `'arma'` \| `'armadura'` |
| tags | String? | |
| descricao | String? | |
| dano | String? | somente arma |
| modificador | Int | somente arma |
| ca | Int | somente armadura |
| penalidadeDes | Int | somente armadura |
| equipado | Boolean | |
| favorito | Boolean | |

### `Acao` → tabela `acoes`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| personagemId | String | FK → personagens.id (cascade delete) |
| nome | String | |
| descricao | String | |
| tipo | String | `'padrao'` \| `'bonus'` \| `'power'` \| `'react'` |
| tag | String? | ex: `'1d8+2'` |

### `Mensagem` → tabela `mensagens`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| sessionId | String | identifica a mesa |
| uid | String | ID do remetente |
| nome | String | nome do personagem |
| mensagem | String? | texto (tipo='texto') |
| timestamp | DateTime | default now() |
| tipo | String? | `'texto'` \| `'rolagem'` |
| total | Int? | resultado total (rolagem) |
| modificador | Int? | bônus fixo (rolagem) |
| detalhes | Json? | array de `{ faces, sinal, resultado }` |

Índice composto: `(session_id, timestamp)` para queries de listagem.

---

## Setup Supabase Realtime
Após `npx prisma migrate dev`, rode no SQL Editor do Supabase:
```sql
ALTER TABLE personagens REPLICA IDENTITY FULL;
ALTER TABLE itens        REPLICA IDENTITY FULL;
ALTER TABLE acoes        REPLICA IDENTITY FULL;
ALTER TABLE mensagens    REPLICA IDENTITY FULL;
```
E publique cada tabela em **Supabase Dashboard → Database → Replication → Supabase Realtime**.

---

## Adicionar uma nova rota
1. Crie o arquivo em `backend/src/routes/<nome>.js`
2. Registre no `backend/src/index.js`:
   ```js
   import nomeRouter from './routes/<nome>.js';
   app.use('/api/<prefixo>', nomeRouter);
   ```
3. Use `requireAuth` (e `requireSelf` se a rota for por usuário)
4. Adicione entrada no schema Prisma se precisar de nova tabela → `npx prisma migrate dev`
