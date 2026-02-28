# js/utils/api.js — API Wrapper

## Descrição
Centraliza todas as chamadas HTTP ao backend Express. Injeta automaticamente o Bearer token do Supabase em cada requisição. Exporta também a instância `supabase` para uso direto (Realtime, auth).

## Exports

### `supabase`
Instância do Supabase client (re-exportada de `supabase-config.js`). Usada pelos componentes para canais Realtime (`supabase.channel()`).

### `API_BASE`
URL base da API REST:
- **Dev** (`localhost` / `127.0.0.1`): `http://localhost:3001/api`
- **Prod** (Render): `/api` (mesmo servidor)

Não é necessário alterar manualmente; a detecção é automática via `window.location.hostname`.

### Funções HTTP

Todas as funções são `async`, lançam `Error` se a resposta não for `2xx`, e retornam o JSON parseado.

| Função | HTTP | Uso |
|---|---|---|
| `apiGet(path)` | GET | Buscar dados |
| `apiPost(path, body)` | POST | Criar recurso |
| `apiPatch(path, body)` | PATCH | Atualizar campos parciais |
| `apiDelete(path)` | DELETE | Remover recurso |

```js
import { apiGet, apiPost, apiPatch, apiDelete, supabase } from '../../utils/api.js';

// Exemplos
const personagem = await apiGet(`/users/${uid}`);
const item = await apiPost(`/users/${uid}/inventario`, { nome: 'Espada', tipo: 'arma' });
await apiPatch(`/users/${uid}`, { hpAtual: 15 });
await apiDelete(`/users/${uid}/acoes/${id}`);
```

## Autenticação
Cada chamada chama `supabase.auth.getSession()` internamente e adiciona o header:
```
Authorization: Bearer <access_token>
```
Se não houver sessão ativa, o header é omitido (a rota retornará 401).

## Tratamento de Erros
`handleResponse` lança `Error` com o corpo da resposta ou `HTTP <status>`. Os componentes devem capturar com `.catch()` ou `try/catch`.

## supabase-config.js
Onde as credenciais do Supabase ficam. Ao trocar de projeto Supabase, atualize apenas `SUPABASE_URL` e `SUPABASE_ANON` nesse arquivo.
