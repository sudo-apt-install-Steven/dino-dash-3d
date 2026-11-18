# Documentação do Sistema de Eventos Dinâmicos (B3)

> Referências: `src/events/EventManager.js`, `src/events/CoreEvents.js`, `src/events/WorldEvents.js`, `src/events/AdvancedEvents.js`, `src/content/balance.json`

## 1. Diagnóstico: Por que nenhum evento disparava até 60.000 pts?
1. **Cooldown baseado em tempo congelado por Predadores/Boss:** Em `EventManager.js` antigo, `this.cooldown` iniciava em `26s` e rearmava para `28–42s`, mas só decrementava quando `!hasActiveMajorEvent`. Como `PredatorSystem` disparava a cada `1600 pts` (durando `14.5s` cada), a contagem regressiva de tempo dos eventos era constantemente interrompida antes de zerar.
2. **Ausência de fila durante Boss/Intro:** Quando um evento deveria ocorrer durante uma luta de chefe ou introdução de predador, ele era simplesmente descartado ou adiado indefinidamente.
3. **Sem garantia de intervalo por pontuação e sem controle de repetição:** Não havia agendamento por faixa de pontuação nem trava contra repetir o mesmo evento duas vezes seguidas.

## 2. Solução Data-Driven Implementada
1. **Configuração em `src/content/balance.json` (`eventScheduler`):**
   - `firstEventMinScore: 1600`, `firstEventMaxScore: 2600` (1º evento garantido entre 1.500 e 3.000 pts).
   - `intervalMinScore: 1600`, `intervalMaxScore: 3600` (eventos seguintes entre 1.500 e 4.000 pts).
   - `maxConcurrent: 1`, `warningLeadSec: 2.2`, `noRepeatLastCount: 1`, `progressiveUnlock: true`.
2. **Fila durante Boss e Intro de Predador:**
   - Se `nextEventScore` for atingido durante `bosses.activeBoss` ou `predators.state === 'intro'`, o evento é enfileirado em `eventQueue` e disparado imediatamente após o término do bloqueio.
3. **Pesos, Desbloqueio Progressivo e Zero Repetição Consecutiva:**
   - `_pickWeightedEvent(score)` aplica pesos por fase da corrida (`early` / `mid` / `late`), respeita `minScore` quando `progressiveUnlocks` está ativo, respeita `teacherMode` e exclui `this.lastEventId`.
4. **Catálogo de 12 Eventos Principais (Sem Troca de Bioma):**
   1. `meteor` — Chuva de Meteoros (sombras no chão antes do impacto)
   2. `herd` — Manada de Herbívoros (carona ou desvio)
   3. `electric_storm` — Tempestade Elétrica (raios telegrafados + para-raios bônus)
   4. `sandstorm` — Tempestade de Areia (vento lateral e neblina)
   5. `ufo` — OVNI Capturador (feixe + quebra por toque/Espaço)
   6. `earthquake` — Terremoto & Fissuras (fissuras na pista, sem portal forçado de bioma)
   7. `eclipse` — Eclipse Sombrio (redução de luz + bônus de ovos)
   8. `aurora` — Aurora Boreal (buff de `1.5x` pontos por 10s)
   9. `egg_day` — Chuva de Ovos Dourados
   10. `egg_rush` — Fuga de Ovos Raros
   11. `lava_corridor` — Travessia / Corredor de Lava
   12. `pterosaur_swarm` — Enxame Aéreo de Pterossauros

## 3. Validação Headless (`EventManager.simulateEventsTo60k`)
Simulação de 0 a 60.000 pts (incluindo janelas simuladas de intro de predador e lutas de boss):
- `ok: true`
- `totalEvents: 23` (meta: `>= 12`)
- `uniqueEvents: 10`
- `firstEventScore: 2004` (meta: `1500–3000`)
- `maxConsecutiveRepeat: 0`
- `firedDuringBossOrIntro: 0`
- `biomeSwapTriggered: false`
