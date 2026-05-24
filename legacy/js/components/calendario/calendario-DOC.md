# Componente Calendário

Calendário por mesa com visão dupla: leitura pros jogadores, CRUD completo pro narrador.
Eventos futuros ficam ocultos pros jogadores até a data atual alcançar o dia do evento.

## API pública

```js
import { setupCalendarioUI, carregarCalendario } from './calendario.js';

setupCalendarioUI(mesaId, isNarrador)   // wireup de modais/botões (no-op se !isNarrador)
carregarCalendario(mesaId, personagem)  // fetch inicial + render + realtime
```

- Se `mesaId` for falsy, mostra estado vazio "entre numa mesa".
- `isNarrador` é detectado em `ficha.js` via `personagem.mesa?.userId === user.id`. Em
  `narrador.js` é sempre `true` (a página já restringe).

## Onde fica montado

- **Ficha** ([ficha.html](../../../ficha.html)): tab "Calendário" (índice 4) → `#calendarioContainer`.
- **Narrador** ([narrador.html](../../../narrador.html)): modal full-screen acionado por
  `#btnAbrirCalendario`. Carregamento é lazy (só fetch o HTML na primeira abertura).

## Estado interno

Mantido em `calendarioState` (singleton no módulo):
- `mesaId`, `calendarioId`, `config`, `dataAtualDias`
- `eventos[]` (já filtrados por papel pelo backend), `tiposClima[]`
- `isNarrador`, `canal` (subscription Supabase), `editandoEventoId`

## Engine de datas

Lógica pura em [js/utils/calendario-utils.js](../../utils/calendario-utils.js), espelho de
[backend/src/calendario/engine.js](../../../backend/src/calendario/engine.js). **Se mudar
a API/lógica em um, atualize o outro.** São arquivos pequenos (~100 linhas) e separados
por simplicidade — extrair pra módulo compartilhado seria over-engineering pro tamanho atual.

Conceitos:
- `dataDias`: Int absoluto desde dia 0 do calendário (Ano 1, Mês 1, Dia 1).
- Conversão pra `{ ano, mes, dia, nomeMes, diaSemana, estacao }` é derivada de `config`.
- Fase da lua: `(dataDias % cicloLuaDias) / cicloLuaDias`, mapeado em 8 fases nominais.

## Backend

Endpoints em [backend/src/routes/calendario.js](../../../backend/src/routes/calendario.js)
montados sob `/api/mesas/:mesaId/calendario`. Lazy-create no primeiro GET com template
gregoriano default. Middleware `requireMesaNarrador` ([mesa-access.js](../../../backend/src/middleware/mesa-access.js))
bloqueia escrita pra quem não é narrador da mesa.

## Realtime

Inscreve **após** o GET inicial (precisa do `calendarioId`):
- `calendarios` filtro `mesa_id=eq.${mesaId}`
- `eventos_calendario` filtro `calendario_id=eq.${calendarioId}`
- `tipos_clima` filtro `calendario_id=eq.${calendarioId}`

Qualquer evento dispara `recarregar()` (refetch + re-render). Tabelas precisam de
`REPLICA IDENTITY FULL` e estar habilitadas no Realtime do Supabase Dashboard (ver
header do schema.prisma).

## Templates

Disponíveis em [backend/src/calendario/templates.js](../../../backend/src/calendario/templates.js):
- `gregoriano`: 12 meses tradicionais (28-31d), 4 estações hemisfério sul, lua 29.5d.
- `op`: 360 dias (12×30) com meses temáticos de One Piece, semana de 7 dias temáticos,
  ano inicial 1500 (Era do Pirata Rei).

Junto vem `TIPOS_CLIMA_DEFAULT` (7 tipos: Sol forte, Nublado, Chuva fraca, Tempestade,
Neve, Vento intenso, Neblina densa) com pesos pré-configurados por estação.

## Limitações conhecidas

- **Last-write-wins**: se o narrador editar a config em duas abas ao mesmo tempo, a
  última salva ganha. Sem versionamento otimista.
- **Mudar `config.meses`**: eventos preservam `dataDias` absoluto, então mudar o
  tamanho dos meses faz a interpretação "ano/mês/dia" deslocar. Comportamento
  consciente — o aviso aparece no modal Configurar.
- **Sorteio de clima não é determinístico** — não há `seed` exposto. Adicionar como
  extensão futura se necessário pra replay.
