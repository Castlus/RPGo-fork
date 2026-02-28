# Componente InventÃ¡rio

## DescriÃ§Ã£o
Gerencia o inventÃ¡rio do personagem: criar, editar, excluir itens; equipar/desequipar; filtrar por categoria; controle de peso. PersistÃªncia via API REST + Supabase Realtime.

## Arquivos
| Arquivo | Responsabilidade |
|---|---|
| `inventario.html` | Markup das seÃ§Ãµes, cards e modais |
| `inventario.js` | Toda a lÃ³gica â€” exports `setupInventoryUI`, `carregarInventario` |

## FunÃ§Ãµes Exportadas

### `setupInventoryUI(uid)`
Configura a UI: abas, botÃ£o de filtro equipados, modal de criaÃ§Ã£o/ediÃ§Ã£o e seus listeners.  
**NÃ£o** carrega dados â€” deve ser chamada antes de `carregarInventario`.

### `carregarInventario(uid)`
Faz a carga inicial dos itens e abre o canal Supabase Realtime. MantÃ©m o estado local (`inventarioState.itens`) sincronizado e chama `renderizarItens()` a cada mudanÃ§a.

**ParÃ¢metros:**
- `uid` â€” `string` â€” ID Supabase do usuÃ¡rio

**Fluxo de `carregarInventario`:**
1. `apiGet(/users/${uid}/inventario)` â†’ preenche `inventarioState.itens` â†’ `renderizarItens()`
2. Canal Supabase `inventario-${uid}` re-busca a cada `postgres_changes` na tabela `itens`

**Listeners gerenciados por `setupInventoryUI`:**
- BotÃ£o *Novo Item* â†’ abre `#modalItem` limpo
- BotÃ£o *Salvar* â†’ `apiPost` (novo) ou `apiPatch` (ediÃ§Ã£o)
- Ãcone equipar/favoritar â†’ `apiPatch(/users/${uid}/inventario/:id, { equipado | favorito })`
- Ãcone ðŸ—‘ â†’ `apiDelete` apÃ³s confirmaÃ§Ã£o via `confirmar()`

**Estado interno (`inventarioState`):**
```js
{
  itens: [],                       // cache local
  mostrarEquipados: false,         // filtro ativo
  uid: null,
  categoriaAtual: 'section-arsenal'
}
```

**Elementos HTML necessÃ¡rios:**
```
#btnNovoItem | #btnSalvarItem | #btnFecharModalItem | #modalItem
#btnToggleEquipados
.btn-category[data-target]        â€” botÃµes de categoria
#newItemName | #newItemWeight | #newItemType | #newItemTags | #newItemDesc
#newItemDamage | #newItemMod      â€” campos de arma (ocultos por default)
#newItemAC | #newItemDexPenalty   â€” campos de armadura (ocultos por default)
```

**Para adicionar um novo tipo de item:**
1. Adicione a opÃ§Ã£o no `<select id="newItemType">`
2. Crie os campos especÃ­ficos no HTML e ligue-os ao `selectType.addEventListener('change')`
3. Inclua o novo tipo na allowlist do backend (`backend/src/routes/inventario.js`)

## Schema de Dados (tabela `itens`)
```
id           â€” UUID
personagem_id â€” string (FK)
nome         â€” string   â† obrigatÃ³rio
peso         â€” float
tipo         â€” 'comum' | 'arma' | 'armadura'
tags         â€” string
descricao    â€” string
dano         â€” string   (somente arma, ex: '1d8')
modificador  â€” int      (somente arma)
ca           â€” int      (somente armadura)
penalidade_des â€” int    (somente armadura)
equipado     â€” boolean
favorito     â€” boolean
```

## Categorias de exibiÃ§Ã£o
| Categoria | `data-target` | CritÃ©rio |
|---|---|---|
| Destaques | `section-favorito` | `item.favorito === true` |
| Arsenal | `section-arsenal` | `item.tipo === 'arma'` |
| Armaria | `section-armaria` | `item.tipo === 'armadura'` |
| Mochila | `section-mochila` | demais tipos |

SeÃ§Ãµes vazias sÃ£o ocultadas automaticamente. A categoria ativa Ã© salva em `inventarioState.categoriaAtual`.

## Uso
```js
import { setupInventoryUI, carregarInventario } from './js/components/inventory/inventario.js';

// Chamar após carregar o HTML do componente no DOM
setupInventoryUI(uid);
carregarInventario(uid);
```

## Controle de Peso
- `#valPeso` / `#maxPeso` / `#fillPeso` exibem peso total vs. `cargaMaxima` do personagem
- `#msgSobrecarga` aparece quando peso > 50% da capacidade, muda de cor em 75% e 100%
- `cargaMaxima` é buscada via `apiGet(/users/:uid)` ao inicializar
