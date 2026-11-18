# Documentação de Combate & Bosses (B1 e B2)

> Referências: `src/events/BossManager.js`, `src/content/balance.json`, `src/content/bosses.json`

## 1. Diagnóstico (Antes)
- **B1 (Boss demorava demais):** O HP antigo era baseado em acertos de `weakOrb` (4 a 7 orbes), que surgiam em `z = -72` e levavam vários segundos para chegar até o jogador. Não havia janela de vulnerabilidade clara nem recepção de ataque corpo a corpo `[Q]`.
- **B2 (Ataque Q não fazia nada):** `_performMeleeAttack` em `Game.js` verificava apenas obstáculos quebráveis do `Spawner` e rivais PvP, sem chamar `BossManager`. Além disso, o boss ficava posicionado em `z = -33`, fora do alcance corpo a corpo.

## 2. Solução Implementada
1. **Configuração Centralizada (`src/content/balance.json`):**
   - `bossCombat`: `targetDurationSec` (`easy: 52s`, `normal: 75s`, `hard: 105s`), `vulnerabilityWindowSec: 4.5`, `idleBetweenAttacksSec: 1.4`, `attackExecSec: 0.55`, `baseHpPerTier: 350`, `hpScaleByDifficulty`, `offWindowDamageMult: 0.45`, `weakOrbDamageMult: 2.5`.
   - `playerAttack`: `damage: 28`, `cooldownSec: 0.65`, `rangeZ: 18`, `rangeX: 2.6`, `hitStopSec: 0.045`.
2. **Máquina de Estados Determinística (`BossManager.js`):**
   - Ciclo explícito: `intro (1.65s)` → `idle (1.4s)` → `telegraph (0.58s–0.90s por fase)` → `attack (0.55s)` → `vulnerable (4.5s)` → `idle`.
   - Cada estado possui `stateTimer` finito e transição garantida, eliminando qualquer *soft-lock* ou invulnerabilidade permanente.
   - Na fase `vulnerable`, o boss avança para `z = -14.5` (dentro do alcance `rangeZ = 18` do ataque `[Q]`) e reduz a oscilação lateral.
3. **Recepção de Ataque `[Q]` (`receivePlayerAttack` / `handlePlayerAttack`):**
   - Valida alcance (`rangeZ`, `rangeX`), aplica dano cheio (`28 * attackPowerMult`) durante `vulnerable` (ou `45%` fora da janela), bônus elemental (`+50%`), transição de fase (`computeBossPhase`), partículas, *shake* e derrota.
   - Orbes de ponto fraco (`_hitBossWeakPoint`) permanecem ativos como dano explosivo (`2.5x` do ataque base).

## 3. Resultados da Simulação Headless (`BossManager.simulateBossFightHeadless`)
Simulação executada com `alpha_trex` (HP tier 6 → 2.100 HP no Normal) e bot atacando com `[Q]` a cada `0.65s` na janela `vulnerable` (5 execuções por dificuldade):

| Dificuldade | Meta | Resultado (5 runs) | Hits | Travamentos |
| --- | --- | --- | --- | --- |
| **Fácil (`easy`)** | 45–60 s | **55.5 s** (5/5 OK) | 50 | 0 |
| **Normal (`normal`)** | 60–90 s | **78.8 s** (5/5 OK) | 73 | 0 |
| **Difícil (`hard`)** | 90–120 s | **110.1 s** (5/5 OK) | 104 | 0 |
