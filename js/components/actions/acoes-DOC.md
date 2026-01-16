# Componente Actions (Ações)

## Descrição
O componente **Actions** é responsável por gerenciar as ações, técnicas e ataques do personagem, organizadas em 4 categorias (Padrão, Bônus, Poderosa, Reação). Fornece funcionalidades para criar, exibir e deletar ações com sistema de tags de dano.

## Estrutura de Arquivos
- `acoes.html` - Template HTML com estrutura das seções de ações e modal de criação
- `acoes.js` - Lógica JavaScript com funções exportadas

## Funções Exportadas

### `carregarAcoes(uid, dbRefs)`
Carrega as ações do personagem do Firebase e as exibe organizadas por categoria.

**Parâmetros:**
- `uid` (string) - ID do usuário no Firebase
- `dbRefs` (object) - Objeto com referências do Firebase:
  - `db` - Instância do banco de dados
  - `ref` - Função para criar referências
  - `onValue` - Listener para mudanças em tempo real
  - `push` - Função para adicionar novos documentos
  - `remove` - Função para deletar documentos

**Funcionamento:**
1. Conecta ao nó `users/{uid}/acoes` no Firebase
2. Limpa os containers de ações antes de recarregar
3. Para cada ação, cria um card HTML com:
   - Título da ação
   - Descrição
   - Tag de dano/efeito (se existir)
   - Botão de delete
   - Classe CSS de tipo (type-padrao, type-bonus, etc)
4. Distribui as ações nos containers corretos:
   - `#lista-padrao` - Ações Padrão
   - `#lista-bonus` - Ações Bônus
   - `#lista-power` - Ações Poderosas
   - `#lista-react` - Reações
5. Adiciona listeners aos botões de delete
6. Configura o modal de nova ação com clone-replace para evitar duplicação de listeners

**Elementos Esperados no HTML:**
```
- #lista-padrao - Container para ações padrão
- #lista-bonus - Container para ações bônus
- #lista-power - Container para ações poderosas
- #lista-react - Container para reações
- #btnNovaAcao - Botão para abrir modal de nova ação
- #btnSalvarAcao - Botão para salvar nova ação
- #btnFecharModal - Botão para fechar modal
- #newActionName - Input para nome da ação
- #newActionDesc - Textarea para descrição
- #newActionType - Select para tipo de ação
- #newActionTag - Input para tag de dano
- #modalAcao - Modal overlay
```

### `setupTabsUI()`
Configura o sistema de abas de navegação (Combate, Missões, Inventário, Tripulação).

**Funcionamento:**
1. Seleciona todos os elementos `.tab` da página
2. Define mapeamento de abas para divs de conteúdo:
   - Aba 0 (Combate) → `#view-combate`
   - Aba 2 (Inventário) → `#view-inventario`
3. Para cada aba, adiciona listener de clique
4. Ao clicar:
   - Remove classe `active` de todas as abas
   - Adiciona classe `active` à aba clicada
   - Oculta todos os view-content
   - Mostra apenas o view-content correspondente

**Elementos Esperados no HTML:**
```
- .tab - Elementos de aba (deve haver múltiplos)
- #view-combate - Container de conteúdo de combate
- #view-inventario - Container de conteúdo de inventário
```

## Estrutura de Dados Firebase

### Nó Principal: `users/{uid}/acoes`
```javascript
{
  "id-acao-1": {
    nome: string,           // Nome da ação
    descricao: string,      // Descrição do efeito
    tipo: string,           // "padrao", "bonus", "power" ou "react"
    tag: string             // Tag de dano (ex: "1d8+2", "2d6")
  },
  "id-acao-2": {
    ...
  }
}
```

**Exemplo:**
```javascript
{
  "acao-001": {
    nome: "Soco Meteoro",
    descricao: "Ataque direto com toda força",
    tipo: "padrao",
    tag: "1d8+2"
  },
  "acao-002": {
    nome: "Haki Avançado",
    descricao: "Canaliza poder especial",
    tipo: "power",
    tag: "2d10"
  }
}
```

## Uso no Componente Principal

**Importação em ficha.js:**
```javascript
import { carregarAcoes, setupTabsUI } from "./js/components/actions/acoes.js";
```

**Inicialização no onAuthStateChanged:**
```javascript
const dbRefs = { db, ref, onValue, push, remove, update };

carregarAcoes(user.uid, dbRefs);
setupTabsUI();
```

## Características

### Cards de Ação
Cada ação é exibida em um card com:
- **Estilo por tipo**: Cada categoria tem cor diferente (padrao, bonus, power, react)
- **Título destacado**: Nome da ação em destaque
- **Descrição**: Explicação do efeito
- **Tag de dano**: Rótulo com dano ou efeito (opcional)
- **Botão de delete**: Ícone de lixeira no canto superior direito

### Modal de Criação
- Abre ao clicar em "+ Nova Ação"
- Campos:
  - Nome da ação (obrigatório)
  - Descrição (opcional)
  - Tipo (select com 4 opções)
  - Tag/Dano (opcional)
- Validação básica: avisa se tentar salvar sem nome
- Limpa os campos após salvar
- Usa padrão clone-replace para evitar múltiplos listeners

### Sistema de Abas
- Navegação entre Combate, Missões, Inventário e Tripulação
- Apenas uma aba ativa por vez
- Mostra/oculta conteúdo correspondente
- Estado visual com classe `.active`

### Delete com Confirmação
- Ao clicar no ícone de lixeira, abre diálogo de confirmação
- Se confirmado, deleta do Firebase
- Atualiza interface automaticamente via listener

## Estilos CSS Relacionados

**Classes principais:**
- `.action-card` - Card individual de ação
- `.type-padrao`, `.type-bonus`, `.type-power`, `.type-react` - Variações de estilo por tipo
- `.card-title` - Título da ação
- `.card-desc` - Descrição
- `.card-tags` - Container de tags
- `.tag`, `.tag-damage` - Tags de dano
- `.btn-delete` - Botão de delete
- `.tab` - Elemento de aba
- `.tab.active` - Aba ativa
- `.tab-content` - Container de conteúdo de aba
- `.section-header` - Cabeçalho de seção (com ícone)
- `.action-grid` - Grade para exibir ações

**Variáveis CSS:**
- `--color-padrao` - Cor para ações padrão
- `--color-bonus` - Cor para ações bônus
- `--color-power` - Cor para ações poderosas
- `--color-react` - Cor para reações

## Fluxo de Dados

### Carregamento de Ações
```
Firebase (users/{uid}/acoes)
    ↓
carregarAcoes()
    ↓
onValue() listener
    ↓
Limpa containers
    ↓
Para cada ação:
  - Cria HTML do card
  - Adiciona ao container correspondente
    ↓
Adiciona listeners aos botões delete
    ↓
Configura modal de nova ação
```

### Criação de Ação
```
Usuário clica em "+ Nova Ação"
    ↓
Modal abre
    ↓
Preenche campos
    ↓
Clica em "Salvar"
    ↓
Valida se nome está preenchido
    ↓
push() para Firebase
    ↓
Listener dispara
    ↓
Ação aparece no card correspondente
```

### Deletion de Ação
```
Usuário clica ícone de lixeira
    ↓
Confirmação: "Tem certeza que quer apagar essa técnica?"
    ↓
Se sim: remove() do Firebase
    ↓
Listener dispara
    ↓
Ação é removida do DOM
```

## Tratamento de Erros

- Se não houver ações, os containers ficarão vazios (esperado)
- Elementos do DOM são verificados com `getElementById` antes de usar
- Valores null/undefined em descrição e tag são ignorados (aceito)
- Se modal não existir, função continua funcionando

## Padrões de Implementação

### Clone-Replace para Listeners
```javascript
const btnSalvarAcao = document.getElementById('btnSalvarAcao');
const novoBtnSalvar = btnSalvarAcao.cloneNode(true);
btnSalvarAcao.parentNode.replaceChild(novoBtnSalvar, btnSalvarAcao);
novoBtnSalvar.onclick = () => { ... };
```
Este padrão garante que sempre há apenas um listener para o botão de salvar.

### onValue para Sincronização em Tempo Real
Usa `onValue` em vez de `get` para manter a interface sincronizada com mudanças em tempo real no banco de dados.

## Notas Importantes

1. **Ordem de Inicialização**: `carregarAcoes()` deve ser chamado antes de `setupTabsUI()` para garantir que os elementos existam.

2. **Reutilização de Modal**: O modal `#modalAcao` é definido em `acoes.html` e reutilizado para múltiplas criações.

3. **IDs de Ações**: Firebase gera automaticamente IDs para cada ação (push), usados para identificação e deleção.

4. **Confirmação de Delete**: Usa diálogo padrão do browser (`confirm()`), simples mas efetivo.

5. **Abas Compartilhadas**: A navegação de abas (`setupTabsUI`) funciona de forma global na página, afetando múltiplos componentes (Combate e Inventário).

## Integração com Outros Componentes

O componente de ações trabalha em conjunto com:
- **Perfil**: Exibe nome do personagem que tem essas ações
- **Inventário**: Compartilha sistema de abas para navegação
- **ficha.js**: Gerencia importação e inicialização do componente

## Validação e Constraints

- **Nome**: Obrigatório (validado no frontend)
- **Tipo**: Deve ser um dos 4 valores (padrao, bonus, power, react)
- **Descrição e Tag**: Opcionais, aceito strings vazias
- **Limite de ações**: Sem limite no Firebase (escalável)
