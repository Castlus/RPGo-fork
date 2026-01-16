# Componente Profile (Perfil)

## Descrição
O componente **Profile** é responsável por exibir e gerenciar as informações do personagem, incluindo nome, nível, pontos de vida (HP), pontos de poder (PP) e atributos base do RPG.

## Estrutura de Arquivos
- `perfil.html` - Template HTML com estrutura da sidebar, barras de stats e modal de edição
- `perfil.js` - Lógica JavaScript com funções exportadas

## Funções Exportadas

### `carregarPerfil(uid, dbRefs)`
Carrega as informações do personagem do Firebase e atualiza a interface em tempo real.

**Parâmetros:**
- `uid` (string) - ID do usuário no Firebase
- `dbRefs` (object) - Objeto com referências do Firebase:
  - `db` - Instância do banco de dados
  - `ref` - Função para criar referências
  - `onValue` - Listener para mudanças em tempo real
  - `update` - Função para atualizar dados

**Funcionamento:**
1. Conecta ao nó `users/{uid}` no Firebase
2. Atualiza os elementos visuais com os dados do personagem:
   - Nome do personagem (`displayNome`)
   - Nível (`valNivel`)
   - Vida atual e máxima (`valHp`, `maxHp`)
   - Pontos de Poder atual e máximo (`valPp`, `maxPp`)
   - Atributos (FOR, DES, CON, INT, VON, PRE)
   - Barras de progresso de HP e PP

3. Configura o modal de edição de atributos:
   - Botão de editar (engrenagem) abre o modal
   - Preenchimento automático dos campos com valores atuais
   - Salva alterações no Firebase
   - Fechamento do modal após sucesso

**Elementos Esperados no HTML:**
```
- #displayNome - Nome do personagem
- #valNivel - Nível
- #valHp, #maxHp - Vida
- #fillHp - Barra de progresso de vida
- #valPp, #maxPp - Pontos de Poder
- #fillPp - Barra de progresso de PP
- #attr-forca, #attr-destreza, #attr-constituicao, #attr-sabedoria, #attr-vontade, #attr-presenca - Valores dos atributos
- #btnEditarFicha - Botão para abrir modal
- #modalFicha - Modal de edição
- #editHpMax, #editPpMax - Inputs para vida e PP máximos
- #editFor, #editDes, #editCon, #editSab, #editVon, #editPre - Inputs de atributos
```

### `configurarTema()`
Gerencia o sistema de dark mode da aplicação.

**Funcionamento:**
1. Recupera a preferência de tema salva em `localStorage`
2. Aplica a classe `dark-mode` ao body se preferência for 'dark'
3. Atualiza o ícone do botão de tema (lua/sol) conforme o modo
4. Configura o listener para alternar entre light/dark mode
5. Persiste a preferência no localStorage

**Elementos Esperados no HTML:**
```
- #btnToggleTheme - Botão para alternar tema (ícone)
```

**Armazenamento:**
- Chave localStorage: `theme`
- Valores: `'dark'` ou `'light'`

## Estrutura de Dados Firebase

### Nó Principal: `users/{uid}`
```javascript
{
  nome: string,                    // Nome do personagem
  nivel: number,                   // Nível do personagem
  hpAtual: number,                 // Pontos de vida atual
  hpMax: number,                   // Pontos de vida máximos
  ppAtual: number,                 // Pontos de poder atual
  ppMax: number,                   // Pontos de poder máximos
  atributos: {
    forca: number,                 // FOR
    destreza: number,               // DES
    constituicao: number,           // CON
    sabedoria: number,              // INT (Sabedoria)
    vontade: number,                // VON
    presenca: number                // PRE
  }
}
```

## Uso no Componente Principal

**Importação em ficha.js:**
```javascript
import { carregarPerfil, configurarTema } from "./js/components/profile/perfil.js";
```

**Inicialização no onAuthStateChanged:**
```javascript
const dbRefs = { db, ref, onValue, push, remove, update };

carregarPerfil(user.uid, dbRefs);
configurarTema();
```

## Características

### Edição Otimista
Os campos numéricos da sidebar (Nível, HP, PP) possuem clique para edição inline, permitindo alterações rápidas sem abrir o modal.

### Barras de Progresso
- Sincronizadas em tempo real com os valores do Firebase
- Limitadas entre 0-100% mesmo que o valor ultrapasse o máximo

### Modal de Edição
- Abre ao clicar no botão de engrenagem
- Preenchimento automático com valores atuais
- Validação e atualização simultânea de vários campos
- Mensagem de sucesso após salvar

### Dark Mode
- Preferência persistida entre sessões
- Ícone visual indica estado (lua = light, sol = dark)
- Transição suave entre temas

## Estilos CSS Relacionados

O componente usa as seguintes classes e variáveis CSS (definidas em `style.css`):

**Classes principais:**
- `.sidebar` - Container principal
- `.profile-header` - Cabeçalho com avatar e nome
- `.bar-group` - Grupo de barra de progresso
- `.attr-grid` - Grade de atributos
- `.attr-card` - Card individual de atributo

**Variáveis CSS:**
- `--primary` - Cor primária
- `--color-power` - Cor para atributos/poder
- `--text-main`, `--text-sec` - Cores de texto
- `--bg-main`, `--bg-sidebar` - Cores de fundo

**Dark Mode:**
- Classe `.dark-mode` aplicada ao `body`
- Inverte cores automáticamente via CSS

## Fluxo de Dados

```
Firebase (users/{uid})
    ↓
carregarPerfil()
    ↓
onValue() listener
    ↓
Atualiza elementos do DOM
    ↓
Modal de edição
    ↓
update() no Firebase
    ↓
Listener dispara novamente
```

## Tratamento de Erros

- Se elementos do DOM não existirem, a função simplesmente não os atualiza
- Valores null/undefined são tratados com fallbacks (ex: `dados.nivel || 1`)
- Alterações no Firebase são persistidas imediatamente

## Notas Importantes

1. **Sincronização em Tempo Real**: O componente usa `onValue` que dispara em qualquer mudança, mantendo a interface sempre sincronizada com o banco de dados.

2. **Compatibilidade com Edição Inline**: O componente trabalha em conjunto com a função `configurarEdicao()` (em ficha.js) para permitir edição direta dos valores numéricos.

3. **Modal Reutilizável**: O `modalFicha` é definido em ficha.html e reutilizado por este componente para edições em massa.

4. **Persistência de Tema**: O localStorage garante que o tema escolhido pelo usuário seja mantido mesmo após fechamento e reabertura da aplicação.
