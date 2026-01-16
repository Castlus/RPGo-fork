# Componente Inventário

## Estrutura

O componente de Inventário foi componentizado para melhor manutenção e reutilização.

### Arquivos do Componente

- **[inventario.html](inventario.html)** - Template HTML da interface do inventário
- **[inventario.js](inventario.js)** - Lógica do componente (módulos exportados)

## Como Usar

### Importação em outro arquivo

```javascript
import { setupInventoryUI, carregarInventario } from "./js/components/inventory/inventario.js";
```

### Integração no HTML

1. Adicione um container no seu HTML onde o inventário deve aparecer:

```html
<div id="inventarioContainer"></div>
```

2. Carregue o HTML do componente dinamicamente:

```javascript
async function carregarComponenteInventario() {
    const container = document.getElementById('inventarioContainer');
    if (container) {
        const response = await fetch('./js/components/inventory/inventario.html');
        const html = await response.text();
        container.innerHTML = html;
    }
}

await carregarComponenteInventario();
```

3. Inicialize a lógica do inventário passando o `uid` e um objeto com as funções Firebase:

```javascript
const dbRefs = { db, ref, onValue, push, remove, update };

setupInventoryUI(uid, dbRefs);
carregarInventario(uid, dbRefs);
```

## Funções Exportadas

### `setupInventoryUI(uid, dbRefs)`
Configura a interface do inventário, incluindo:
- Abas de navegação
- Modal de novo/edição de item
- Listeners para botões

**Parâmetros:**
- `uid` (string): ID do usuário no Firebase
- `dbRefs` (Object): Objeto contendo funções Firebase
  - `ref`: função ref do Firebase
  - `onValue`: função onValue do Firebase
  - `push`: função push do Firebase
  - `remove`: função remove do Firebase
  - `update`: função update do Firebase

### `carregarInventario(uid, dbRefs)`
Carrega e exibe o inventário do usuário em tempo real.

**Parâmetros:**
- `uid` (string): ID do usuário no Firebase
- `dbRefs` (Object): Objeto contendo funções e referências Firebase

## Funcionalidades

-  **Gerenciamento de Itens** - Criar, editar e deletar itens
-  **Sistema de Equipamento** - Equipar/desequipar armas e armaduras
-  **Slots de Equipamento** - Exibição de arma principal e armadura
-  **Sistema de Peso** - Controle de carga com feedback visual
-  **Aviso de Sobrecarga** - Indicador progressivo de peso
-  **Expandir/Recolher** - Cards de itens recolhíveis para melhor visualização
-  **Tipos de Item** - Suporte para Item Comum, Arma e Armadura
-  **Dados de Arma** - Dano e modificadores para armas

## Estrutura de Dados do Item

```javascript
{
    nome: string,              // Nome do item
    peso: number,              // Peso em PC
    tipo: string,              // 'comum', 'arma', 'armadura'
    tags: string,              // Tags separadas por vírgula
    descricao: string,         // Descrição/efeitos
    dano: string,              // Ex: "1d8" (apenas para armas)
    modificador: number,       // Bônus de dano (apenas para armas)
    equipado: boolean          // Se está equipado
}
```

## Exemplo de Uso Completo

Veja [ficha.js](../../ficha.js) e [ficha.html](../../ficha.html) para um exemplo completo de integração.
