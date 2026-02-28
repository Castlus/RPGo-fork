# Componente Actions (Ações)

## Descrição
Gerencia ações, técnicas e ataques do personagem, organizadas em 4 categorias (Padrão, Bônus, Poderosa, Reação). Persistência via API REST + atualização em tempo real via Supabase Realtime.

## Arquivos
| Arquivo | Responsabilidade |
|---|---|
| `acoes.html` | Markup das seções de lista e modal de criação |
| `acoes.js` | Toda a lógica — exports `carregarAcoes`, `setupTabsUI` |

## Funções Exportadas

### `carregarAcoes(uid)`
Busca ações do usuário via `GET /users/:uid/acoes`, renderiza os cards e escuta mudanças em tempo real.

**Parâmetros:**
- `uid` — `string` — ID Supabase do usuário

**Fluxo:**
1. `apiGet(/users/${uid}/acoes)` → renderiza cards nos containers
2. Abre canal Supabase `acoes-${uid}` e re-busca a cada evento `postgres_changes` na tabela `acoes`
3. Ao clicar no ícone 🗑 de um card → `apiDelete(/users/${uid}/acoes/:id)` após confirmação
4. Botão *Salvar* no modal → `apiPost(/users/${uid}/acoes, { nome, descricao, tipo, tag })`

**Containers HTML necessários:**
```
#lista-padrao | #lista-bonus | #lista-power | #lista-react
#btnNovaAcao  | #btnSalvarAcao | #btnFecharModal | #modalAcao
#newActionName | #newActionDesc | #newActionType | #newActionTag
```

**Para adicionar um novo tipo de ação:**
1. Adicione o valor no `<select id="newActionType">` em `acoes.html`
2. Crie o container `#lista-<tipo>` no HTML
3. Adicione a classe CSS `.type-<tipo>` em `style.css`

### `setupTabsUI()`
Configura a navegação entre abas Combate (`#view-combate`) e Inventário (`#view-inventario`) via classe `.tab`.

## Schema de Dados (tabela `acoes`)
```
id           — UUID (gerado pelo banco)
personagem_id — string (FK → personagens.id)
nome         — string    ← obrigatório
descricao    — string
tipo         — 'padrao' | 'bonus' | 'power' | 'react'
tag          — string    (ex: '1d8+2') — opcional
```

## Padrões Importantes
- **Clone-replace** no botão Salvar evita listeners duplicados ao reabrir o modal:
  ```js
  const novo = btn.cloneNode(true);
  btn.parentNode.replaceChild(novo, btn);
  novo.onclick = () => { ... };
  ```
- Deleção usa `confirmar()` de `modal-utils.js` em vez de `window.confirm`.
