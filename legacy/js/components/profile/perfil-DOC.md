# Componente Profile (Perfil)

## DescriÃ§Ã£o
Exibe e edita as informaÃ§Ãµes do personagem (nome, nÃ­vel, HP, PP, atributos) e gerencia o sistema de temas visuais. SincronizaÃ§Ã£o em tempo real via Supabase Realtime.

## Arquivos
| Arquivo | Responsabilidade |
|---|---|
| `perfil.html` | Sidebar com stats e modal de ediÃ§Ã£o |
| `perfil.js` | Exports `carregarPerfil` e `configurarTemas` |

## FunÃ§Ãµes Exportadas

### `carregarPerfil(uid)`
Busca dados do personagem via `GET /users/:uid` e atualiza os elementos da sidebar. Escuta mudanÃ§as em tempo real.

**ParÃ¢metros:**
- `uid` â€” `string` â€” ID Supabase do usuÃ¡rio

**Fluxo:**
1. `apiGet(/users/${uid})` â†’ `renderizarDados()`
2. Canal Supabase `personagem-${uid}` escuta `UPDATE` na tabela `personagens` e re-renderiza
3. BotÃ£o *Editar* â†’ abre `#modalFicha` preenchido com valores atuais
4. BotÃ£o *Salvar* â†’ `apiPatch(/users/${uid}, payload)` â†’ notifica sucesso

**Elementos HTML necessÃ¡rios:**
```
#displayNome | #valNivel
#valHp | #maxHp | #fillHp
#valPp | #maxPp | #fillPp
#attr-forca | #attr-destreza | #attr-constituicao
#attr-sabedoria | #attr-vontade | #attr-presenca
#btnEditarFicha | #btnFecharFicha | #btnSalvarFicha | #modalFicha
#editHpMax | #editPpMax
#editFor | #editDes | #editCon | #editSab | #editVon | #editPre
```

**Para adicionar um novo atributo:**
1. Adicione o campo no schema Prisma (`backend/prisma/schema.prisma`)
2. Rode `npx prisma migrate dev`
3. Inclua na allowlist de `PATCH /users/:uid` (`backend/src/routes/users.js`)
4. Adicione o elemento `#attr-<novo>` em `perfil.html` e o bind em `renderizarDados()`

### `configurarTemas()`
Abre/fecha o painel de temas (`#modalTemas`), renderiza chips de temas preset e customizados, e permite criar/editar/excluir temas customizados.

**IntegraÃ§Ã£o com `theme-manager.js`:**
```js
import { TEMAS_PRESET, aplicarTema, salvarTemaAtivo,
         getTemasCustom, adicionarTemaCustom,
         atualizarTemaCustom, removerTemaCustom } from '../../utils/theme-manager.js';
```
- Temas sÃ£o salvos em `localStorage` (chave `temasCustom`, `temaId`)
- `aplicarTema(vars, dark)` aplica CSS variables no `:root` e classe `dark` no `body`

**Elementos HTML necessÃ¡rios:**
```
#btnPaleta | #modalTemas | #btnFecharTemas
#temaChips | #btnSalvarCustom
```

## Schema relevante (tabela `personagens`)
```
id | nome | nivel | hpAtual | hpMax | ppAtual | ppMax
forca | destreza | constituicao | sabedoria | vontade | presenca
ultimaRolagem | cargaMaxima
```

## Temas Preset disponÃ­veis
`light` · `dark` · `ocean` · `noite` · `pirata` (definidos em `theme-manager.js`)

Para adicionar um preset, inclua um novo objeto no array `TEMAS_PRESET` em `theme-manager.js` seguindo a estrutura:
```js
{ id, nome, icone, dark: boolean, vars: { '--primary', '--bg-page', '--bg-card',
  '--bg-surface', '--text-main', '--text-sec', '--border' } }
```
