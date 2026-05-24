# modal-utils.js — Modais Customizados

## Descrição
Substitui `window.confirm` e `window.alert` por modais com a identidade visual da aplicação. Criação dinâmica no DOM; sem dependências externas.

## Funções Exportadas

### `confirmar(titulo, mensagem, textoBotaoSim?, textoBotaoNao?): Promise<boolean>`
Modal de confirmação com dois botões.

| Param | Tipo | Default |
|---|---|---|
| titulo | string | — |
| mensagem | string | — |
| textoBotaoSim | string | `'Confirmar'` |
| textoBotaoNao | string | `'Cancelar'` |

Resolve `true` (confirmou) ou `false` (cancelou/ESC/overlay).

```js
import { confirmar } from '../../utils/modal-utils.js';

const ok = await confirmar('Deletar Ação', 'Tem certeza?', 'Deletar', 'Cancelar');
if (ok) apiDelete(`/users/${uid}/acoes/${id}`);
```

### `notificar(titulo, mensagem, textoBot?): Promise<void>`
Modal de alerta com um único botão OK.

| Param | Tipo | Default |
|---|---|---|
| titulo | string | — |
| mensagem | string | — |
| textoBot | string | `'OK'` |

Resolve quando o usuário clica em OK, pressiona ENTER ou clica no overlay.

```js
import { notificar } from '../../utils/modal-utils.js';

await notificar('Sucesso', 'Ficha atualizada!');
```

## Comportamento
- Modais são inseridos diretamente no `<body>` e removidos após fechamento (sem vazamento de DOM)
- Teclas: `ESC` fecha `confirmar` com `false`; `ENTER` fecha `notificar`
- Clique no overlay fecha o modal (mesma regra de tecla)
- CSS das classes `.modal-confirmation` / `.modal-notification` está em `style.css`
- Botão de confirmação usa `var(--color-power)`; botão de notificação usa `var(--primary)`

## Adicionar um novo tipo de modal
Siga o padrão das funções existentes:
1. Crie o HTML dinamicamente dentro de um `new Promise`
2. Adicione ao `<body>`, ouça os cliques e chame `resolve()`
3. No fim, remova o elemento do DOM
4. Adicione as classes CSS correspondentes em `style.css`

