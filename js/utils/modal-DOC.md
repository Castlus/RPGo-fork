# Sistema de Modais Customizados

## Descrição
O sistema de **Modais Customizados** substitui as confirmações padrão do navegador (`confirm()`, `alert()`) por modais styled com a identidade visual da aplicação. Fornece uma experiência de usuário mais limpa, consistente e profissional.

## Estrutura de Arquivos
- `modal-utils.js` - Módulo com funções exportadas para criar modais

## Funções Exportadas

### `confirmar(titulo, mensagem, textoBotaoSim, textoBotaoNao)`
Exibe um modal de confirmação com dois botões de ação.

**Parâmetros:**
- `titulo` (string) - Título do modal
- `mensagem` (string) - Mensagem de confirmação
- `textoBotaoSim` (string, opcional) - Texto do botão de confirmar (padrão: "Confirmar")
- `textoBotaoNao` (string, opcional) - Texto do botão de cancelar (padrão: "Cancelar")

**Retorno:**
- `Promise<boolean>` - Resolve `true` se usuário clicar em "Sim", `false` se cancelar

**Exemplo:**
```javascript
import { confirmar } from "../../utils/modal-utils.js";

// Ao deletar uma ação
const confirmado = await confirmar(
    "Deletar Ação",
    "Tem certeza que quer apagar essa técnica?",
    "Deletar",
    "Cancelar"
);

if (confirmado) {
    remove(ref(db, 'users/' + uid + '/acoes/' + idParaDeletar));
}
```

**Características:**
- Modal com overlay semi-transparente
- Dois botões: Cancelar (cinza) e Confirmar (colorido)
- Fechável pressionando **ESC**
- Fechável clicando no overlay (retorna false)
- Animação de entrada suave

---

### `notificar(titulo, mensagem, textoBot)`
Exibe um modal de notificação/sucesso com um único botão.

**Parâmetros:**
- `titulo` (string) - Título do modal
- `mensagem` (string) - Mensagem a exibir
- `textoBot` (string, opcional) - Texto do botão (padrão: "OK")

**Retorno:**
- `Promise<void>` - Resolve quando usuário clicar no botão ou pressionar ENTER

**Exemplo:**
```javascript
import { notificar } from "../../utils/modal-utils.js";

// Ao salvar ficha com sucesso
await notificar(
    "Sucesso",
    "Ficha atualizada com sucesso!"
);
```

**Características:**
- Modal com overlay semi-transparente
- Um botão de ação (primário - marrom)
- Fechável pressionando **ENTER**
- Fechável clicando no overlay
- Animação de entrada suave

---

### `erro(titulo, mensagem, textoBot)`
Exibe um modal de erro com um único botão de fechamento.

**Parâmetros:**
- `titulo` (string) - Título do modal
- `mensagem` (string) - Mensagem de erro
- `textoBot` (string, opcional) - Texto do botão (padrão: "Fechar")

**Retorno:**
- `Promise<void>` - Resolve quando usuário clicar no botão ou pressionar ESC

**Exemplo:**
```javascript
import { erro } from "../../utils/modal-utils.js";

// Em caso de erro no Firebase
await erro(
    "Erro ao Salvar",
    "Não foi possível salvar as alterações. Tente novamente."
);
```

**Características:**
- Modal com overlay semi-transparente
- Um botão de ação (vermelho)
- Ícone de alerta no título
- Fechável pressionando **ESC**
- Fechável clicando no overlay
- Animação de entrada suave

---

## Uso nos Componentes

### Em acoes.js (Delete com confirmação)
```javascript
import { confirmar, notificar } from "../../utils/modal-utils.js";

document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const idParaDeletar = e.target.getAttribute('data-id');
        const confirmado = await confirmar(
            "Deletar Ação",
            "Tem certeza que quer apagar essa técnica?",
            "Deletar",
            "Cancelar"
        );
        if(confirmado) {
            remove(ref(db, 'users/' + uid + '/acoes/' + idParaDeletar));
        }
    });
});

// Campo obrigatório
if(!nome) {
    notificar("Campo Obrigatório", "Dê um nome para sua ação!");
}
```

### Em perfil.js (Sucesso ao atualizar)
```javascript
import { notificar } from "../../utils/modal-utils.js";

update(fichaRef, atualizacao).then(() => {
    notificar("Sucesso", "Ficha atualizada com sucesso!");
    modalFicha.style.display = 'none';
});
```

### Em inventario.js (Delete e validação)
```javascript
import { notificar, confirmar } from "../../utils/modal-utils.js";

// Validação de campo obrigatório
if(!nome) {
    notificar("Campo Obrigatório", "Nome é obrigatório para criar um item!");
}

// Delete com confirmação
btn.addEventListener('click', async (e) => {
    const confirmado = await confirmar(
        "Deletar Item",
        "Tem certeza que quer apagar este item?",
        "Deletar",
        "Cancelar"
    );
    if(confirmado) {
        remove(ref(db, 'users/' + uid + '/inventario/' + itemId));
    }
});
```

---

## Estilos CSS

Os modais usam estilos definidos em `style.css` com classes:

**Classes principais:**
- `.modal-confirmation` - Container do modal de confirmação
- `.modal-overlay-confirm` - Overlay semi-transparente
- `.modal-box-confirm` - Box do conteúdo
- `.modal-notification`, `.modal-overlay-notify`, `.modal-box-notify` - Notificação
- `.modal-error`, `.modal-overlay-error`, `.modal-box-error` - Erro

**Propriedades:**
- Z-index: 9999 (acima de todos os elementos)
- Position: fixed (não scrollável)
- Animação: slideUp (200ms)
- Backdrop: rgba(0, 0, 0, 0.5)
- Suporte a dark mode automático

### Customizar Cores de Botões

No HTML gerado, os botões usam:

**Confirmação:**
- Cancelar: `background: #ccc` (cinza)
- Confirmar: `background: var(--color-power)` (laranja)

**Notificação:**
- OK: `background: var(--primary)` (marrom)

**Erro:**
- Fechar: `background: #d32f2f` (vermelho)

Para customizar, modifique as cores CSS em `style.css` ou ajuste as classes nos botões.

---

## Atalhos de Teclado

| Modal | Tecla | Ação |
|-------|-------|------|
| Confirmação | ESC | Cancela (retorna false) |
| Confirmação | Click no overlay | Cancela (retorna false) |
| Notificação | ENTER | Fecha (resolve) |
| Notificação | Click no overlay | Fecha (resolve) |
| Erro | ESC | Fecha (resolve) |
| Erro | Click no overlay | Fecha (resolve) |

---

## Animações

### slideUp
Animação padrão de todos os modais:
- Duração: 300ms
- Timing: ease-out
- Efeito: Desliza para cima + fade in

```css
@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
```

### Hover dos Botões
- Transform: translateY(-2px) - Levanta levemente
- Box-shadow: 0 5px 15px rgba(0,0,0,0.2) - Sombra aumenta
- Transição: 0.2s ease

---

## Dark Mode

Os modais herdam automaticamente os estilos do dark mode:

```css
body.dark-mode .modal-box-confirm,
body.dark-mode .modal-box-notify,
body.dark-mode .modal-box-error {
    background: var(--bg-card);    /* Fundo escuro */
    color: var(--text-main);        /* Texto claro */
}
```

**Resultado:**
- Em light mode: Fundo branco, texto escuro
- Em dark mode: Fundo cinza escuro, texto claro
- Transição suave entre temas

---

## Fluxo de Funcionamento

### Confirmação
```
Usuário clica em deletar
    ↓
confirmar() chamado
    ↓
Modal criado dinamicamente
    ↓
Usuário escolhe: "Sim" ou "Cancelar"
    ↓
Modal removido do DOM
    ↓
Promise resolve com true/false
    ↓
Código continua baseado no resultado
```

### Notificação
```
Evento dispara (ex: salvo com sucesso)
    ↓
notificar() chamado
    ↓
Modal criado dinamicamente
    ↓
Usuário clica "OK" ou pressiona ENTER
    ↓
Modal removido do DOM
    ↓
Promise resolve
    ↓
Próximo código executa
```

---

## Tratamento de Erros

Os modais tratam automaticamente:
- **Overlay click**: Fecha o modal apropriadamente
- **Teclas de atalho**: ESC e ENTER funcionam conforme esperado
- **Múltiplos modais**: Cada um tem seu próprio z-index (9999)
- **DOM removal**: Listeners são limpos automaticamente
- **Promise resolution**: Sempre resolve, nunca rejeita

---

## Responsividade

Os modais são responsivos para mobile:

```css
.modal-box-confirm,
.modal-box-notify,
.modal-box-error {
    max-width: 400px;
    width: 90%;              /* 90% da tela em mobile */
    padding: 30px;
    border-radius: 12px;
}
```

---

## Performance

**Vantagens:**
- ✅ Criação dinâmica (não ocupa espaço no DOM inicial)
- ✅ Limpeza automática (removidos após fechar)
- ✅ Sem dependências externas (vanilla JavaScript)
- ✅ Lightweight: ~4KB minificado

**Impacto:**
- Z-index 9999 garante que fique acima de tudo
- Overlay backdrop previne interação com página por trás
- Listeners automáticos não causam memory leaks

---

## Exemplos Completos

### Deletar com Confirmação
```javascript
async function deletarItem(itemId) {
    const confirmado = await confirmar(
        "Remover Item",
        `Deseja remover "${itemNome}"?`,
        "Remover",
        "Manter"
    );
    
    if (confirmado) {
        try {
            await removerDoFirebase(itemId);
            await notificar(
                "Item Removido",
                "O item foi removido com sucesso."
            );
        } catch (err) {
            await erro(
                "Erro ao Remover",
                "Não foi possível remover o item. Tente novamente."
            );
        }
    }
}
```

### Validação de Formulário
```javascript
async function salvarPersonagem(dados) {
    if (!dados.nome) {
        await notificar(
            "Campo Obrigatório",
            "O nome do personagem é obrigatório!"
        );
        return;
    }
    
    if (!dados.nivel || dados.nivel < 1) {
        await notificar(
            "Valor Inválido",
            "O nível deve ser no mínimo 1!"
        );
        return;
    }
    
    // Salvar dados...
    await notificar("Sucesso", "Personagem salvo com sucesso!");
}
```

### Fluxo com Múltiplos Modais
```javascript
async function processarAcao() {
    // 1. Confirmar ação
    const confirmado = await confirmar(
        "Executar Ação",
        "Isso pode levar alguns segundos. Deseja continuar?",
        "Continuar",
        "Cancelar"
    );
    
    if (!confirmado) return;
    
    // 2. Mostrar notificação de carregamento (ou spinner)
    try {
        // 3. Executar ação
        await executarOperacaoLonga();
        
        // 4. Mostrar sucesso
        await notificar(
            "Operação Concluída",
            "A ação foi executada com sucesso!"
        );
    } catch (erro) {
        // 5. Mostrar erro
        await erro(
            "Operação Falhou",
            erro.message || "Ocorreu um erro na operação."
        );
    }
}
```

---

## Compatibilidade

| Navegador | Suporte |
|-----------|---------|
| Chrome | ✅ 100% |
| Firefox | ✅ 100% |
| Safari | ✅ 100% |
| Edge | ✅ 100% |
| Opera | ✅ 100% |
| IE 11 | ⚠️ Parece functions |

**Dependências JavaScript:**
- Promise (nativa em ES6+)
- Nenhuma biblioteca externa
- Vanilla JavaScript puro

---

## Notas Importantes

1. **Async/Await Required**: As funções retornam Promises, use `await` ou `.then()`
2. **DOM Ready**: Os modais são criados dinamicamente, portanto trabalham em qualquer momento
3. **Z-index Global**: 9999 garante que fique acima de tudo (inclusive outros z-index altos)
4. **No Body Classes**: Não modifica classes do body, apenas cria elementos temporários
5. **ESC Key Handling**: Listeners são únicos (removidos após modal fechar)

---

## Customização Avançada

### Adicionar Novo Tipo de Modal

```javascript
export function sucesso(titulo, mensagem, textoBot = "OK") {
    return new Promise((resolve) => {
        const modalHTML = `
            <div class="modal-success" id="modalSucesso">
                <div class="modal-overlay-success">
                    <div class="modal-box-success">
                        <h2><i class="fas fa-check-circle"></i> ${titulo}</h2>
                        <p>${mensagem}</p>
                        <button>${textoBot}</button>
                    </div>
                </div>
            </div>
        `;
        // ... resto da implementação
    });
}
```

Depois adicione CSS em `style.css`:
```css
.modal-success { /* ... */ }
.modal-overlay-success { /* ... */ }
.modal-box-success { 
    /* ... */
    border-left: 4px solid #4caf50; 
}
.modal-box-success h2 { color: #4caf50; }
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Modal não aparece | Verifique se `body` existe no DOM |
| Promise não resolve | Certifique-se de usar `await` |
| Estilos não funcionam | Verifique se `style.css` está carregado |
| Botão não responde | Verifique o z-index do modal |
| Sobreposição com outros modais | Aumentar z-index de ambos ou usar um por vez |

