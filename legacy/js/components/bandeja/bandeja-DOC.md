# Bandeja Unificada

## Descrição
Widget flutuante com dois painéis intercambiáveis: **Rolador de Dados** e **Chat**. Suporta drag-and-drop livre com snap automático às bordas da tela. Ponto de entrada único: `iniciarBandeja(user)`.

## Arquivos
| Arquivo | Responsabilidade |
|---|---|
| `bandeja.html` | Markup da bandeja, header, switch de abas e os dois painéis |
| `bandeja.js` | Orquestrador: drag, snap, toggle, switch de painéis |
| `rolador-logic.js` | Lógica do rolador de dados (submódulo) |
| `chat-logic.js` | Lógica do chat (submódulo) |

## Ponto de Entrada

```js
import { iniciarBandeja } from './js/components/bandeja/bandeja.js';
iniciarBandeja(user); // user = { id, email }
```

---

## bandeja.js — Orquestrador

### `iniciarBandeja(user)`
Inicializa toda a bandeja: cria os submódulos, configura drag e switch de painéis.

**Estado inicial:** colada no fundo da tela (`dock-bottom collapsed`).

### Drag & Snap
- **Drag começa** no `mousedown` do `#bandejaHeader` (exceto ao clicar em `.switch-btn`)
- Um movimento > 5px retira as classes de dock e libera a bandeja
- **Snap** (`snapToNearestEdge`) é chamado no `mouseup`:
  - `distBottom < 80px` → `dock-bottom` (colapsa em barra horizontal)
  - `distLeft < 80px` → `dock-side` (colapsa em bolinha na esquerda)
  - `distRight < 80px` → `dock-side` (colapsa em bolinha na direita)
  - Caso contrário → flutua livre (ajustado para não sair da tela)

### Toggle (abrir/fechar)
- Click no header sem arrastar (duração < 200 ms e `hasMoved === false`) alterna `collapsed`
- Ao abrir: calcula `scrollHeight` para animar altura; posiciona para cima se perto do fundo
- Ao fechar via `dock-side`: colapsa para 50×50 px; via `dock-bottom`: colapsa para 45px de altura

### Switch de Painéis
| Aba | ID do Painel | Ícone ativado |
|---|---|---|
| `rolador` | `#painelRolador` | `fa-dice-d20` |
| `chat` | `#painelChat` | `fa-comment` |

Ao trocar para `chat`, `chatApi.ativar()` é chamado para conectar o listener Realtime.

### Comunicação entre submódulos
```
rolador-logic → onRolar(dados) → chatApi.enviarRolagem(dados)
```
O resultado de cada rolagem é automaticamente postado no chat da sessão.

### `SESSION_ID`
Fixo como `'mesa-principal'`. Para suportar múltiplas mesas, parametrize este valor em `iniciarBandeja`.

### Elementos HTML necessários
```
#bandeja | #bandejaHeader | #bandejaIcon | #bandejaIconLeft
#bandejaTitulo
#painelRolador | #painelChat
.switch-btn[data-tab="rolador"] | .switch-btn[data-tab="chat"]
```

---

## rolador-logic.js — Rolador de Dados

### `iniciarRolador(user, { onRolar })`
Gerencia seleção de dados, preview de fórmula e execução da rolagem.

**Fluxo da rolagem:**
1. Usuário clica em botões `.dice-btn[data-faces]` → dados são empilhados em `dadosSelecionados[]`
2. Botão `+/-` (`#btnToggleSign`) alterna `modoNegativo` (dados subtraídos)
3. `#inputModificador` adiciona bônus fixo
4. Ao clicar em `#btnRolarTray`:
   - Cada dado é rolado (`Math.random() * faces + 1`)
   - 1 → `<span class="crit-fail">`, `faces` → `<span class="crit-success">`
   - Total e detalhes exibidos em `#txtTotal` e `#txtDetalhes`
   - `apiPatch(/users/:id, { ultimaRolagem: '...' })` salva no perfil
   - `onRolar({ total, detalhes, modificador })` notifica o orquestrador
5. `dadosSelecionados` é limpo após rolar

**Para adicionar um novo tipo de dado:** adicione um botão no HTML com `data-faces="<N>"` — zero código extra necessário.

**Elementos HTML necessários:**
```
#diceContainer | #btnToggleSign | #txtTotal | #txtDetalhes
#inputModificador | #btnLimparTray | #btnRolarTray
.dice-btn[data-faces]   (ex: data-faces="4", "6", "8", "10", "12", "20")
```

---

## chat-logic.js — Chat

### `iniciarChat(user, SESSION_ID)`
Gerencia envio/recebimento de mensagens de texto e rolagens. Retorna `{ ativar, desativar, enviarRolagem }`.

**Carga e Realtime:**
- `ativar()` faz `apiGet(/mensagens/:sessionId)` e abre canal Supabase `chat-${SESSION_ID}`
- A cada `postgres_changes` na tabela `mensagens`, re-busca e re-renderiza
- `desativar()` cancela o canal

**Envio de texto:**
- `#sendChatBtn` ou Enter no `#chatInput` → `apiPost(/mensagens/:sessionId, { nome, mensagem, tipo: 'texto' })`
- Comando `/limpar` → `apiDelete(/mensagens/:sessionId)` após confirmação

**Envio de rolagem (chamado pelo orquestrador):**
```js
chatApi.enviarRolagem({ total, detalhes, modificador });
// → apiPost(/mensagens/:sessionId, { nome, tipo: 'rolagem', total, detalhes, modificador })
```

**Renderização de mensagens:**
| Tipo | Exibição |
|---|---|
| `'texto'` | `HH:MM Nome: mensagem` |
| `'rolagem'` | Box com total em destaque + detalhes de cada dado (`crit-fail`/`crit-success`) |

O nome do remetente é buscado via `apiGet(/users/:id)` no início; fallback para o e-mail.

**Elementos HTML necessários:**
```
#chatInput | #sendChatBtn | #chatMessages
```
