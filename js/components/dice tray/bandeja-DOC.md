# ⚠️ DOCUMENTAÇÃO DEPRECIADA

Este componente (`dice tray/rolador.js`) foi **substituído** pela bandeja unificada em `js/components/bandeja/`.

**Documentação atual:** [`js/components/bandeja/bandeja-DOC.md`](../bandeja/bandeja-DOC.md)

---

*(Conteúdo abaixo é histórico e não reflete o código atual)*

# Componente Dice Tray (Bandeja de Dados) — DEPRECIADO

## Estrutura

O componente de Bandeja de Dados foi componentizado para melhor manutenção e reutilização.

### Arquivos do Componente

- **[rolador.html](rolador.html)** - Template HTML da interface da bandeja
- **[rolador.js](rolador.js)** - Lógica do componente (módulo exportado)

## Como Usar

### Importação em outro arquivo

```javascript
import { iniciarBandejaDados } from "./js/components/dice tray/rolador.js";
```

### Integração no HTML

1. Adicione um container no seu HTML onde a bandeja deve aparecer:

```html
<div id="diceTrayContainer"></div>
```

2. Carregue o HTML do componente dinamicamente:

```javascript
async function carregarComponenteBandeja() {
    const container = document.getElementById('diceTrayContainer');
    if (container) {
        const response = await fetch('./js/components/dice tray/rolador.html');
        const html = await response.text();
        container.innerHTML = html;
    }
}

await carregarComponenteBandeja();
```

3. Inicialize a lógica passando o objeto `user`:

```javascript
iniciarBandejaDados(user);
```

### Salvamento de Rolagens no Firebase

O componente espera que as seguintes variáveis globais estejam disponíveis:

```javascript
window.dbRef = ref;       // Função ref do Firebase
window.updateDB = update; // Função update do Firebase
```

Quando um dado é rolado, a rolagem é automaticamente salva no campo `ultimaRolagem` do usuário no Firebase.

## Funcionalidades

- ✅ **Smart Docking** - A bandeja se gruda automaticamente nas bordas quando arrastada próximo delas
- ✅ **Animações Suaves** - Expansão/colapso com transições CSS
- ✅ **Modo Negativo** - Toggle para adicionar/subtrair dados
- ✅ **Modificador** - Campo para adicionar/subtrair um valor fixo
- ✅ **Crit Visual** - Dados 1 aparecem em vermelho, dados máximos em verde
- ✅ **Salva no Firebase** - Ultima rolagem é registrada automaticamente

## Exemplo de Uso Completo

Veja [ficha.js](../../ficha.js) e [ficha.html](../../ficha.html) para um exemplo completo de integração.
