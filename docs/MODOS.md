# Modos de Jogo — DINO DASH 3D

Catálogo oficial dos **22 modos de jogo** definidos em `src/game/Modes.js` e executados pelo motor em `src/game/Game.js` (com suporte a Pódio/Votação em `src/ui/PartyModals.js`).

> **Nota sobre o Modo Infinito:** Os chefes (bosses) continuam aparecendo normalmente no modo infinito padrão (`solo`, `coop`, etc.), independentemente do modo dedicado `boss_fight`.

---

## Novos Modos da Expansão

### 1. `raid` — 🐉 Raid Colossal
- **Categoria:** Desafios & Boss (`boss_challenge`) | **Jogadores:** Solo, Coop Local (2P) ou Multiplayer (LAN/Online) | **Ranking:** Sim
- **Tooltip:** Destrua todas as barras de vida do colosso enquanto adapta-se aos afixos rotativos e sobe no placar de DPS.
- **Regras e Mecânicas:**
  - Chefe colossal com **4 barras de vida** sequenciais (escaladas pelo número de jogadores e dificuldade).
  - **Afixos rotativos** a cada 22s (`RAID_AFFIXES`):
    - 🔥 *Frenesi Colossal* (+14% velocidade e pressão)
    - 🛡️ *Escamas Blindadas* (-25% dano direto, mas +50% em sinergia/pontos fracos)
    - ⚡ *Tempestade do Vazio* (raios telegrafados nas faixas)
    - 🐺 *Alcateia Alfa* (predadores mais agressivos)
    - 🪐 *Fluxo Gravitacional* (gravidade reduzida)
    - ☠️ *Aura Peçonhenta* (impactos aplicam veneno)
  - **Placar de Dano (DPS)** por jogador exibido durante a Raid e no Pódio Multiplayer.
  - **Sinergia de ataque:** acertar o chefe dentro de 2s após um aliado ativa bônus de sinergia (+35% dano, ou +50% sob *Escamas Blindadas*).

### 2. `boss_fight` — 👑 Boss Fight / Boss Rush
- **Categoria:** Desafios & Boss (`boss_challenge`) | **Jogadores:** Solo, Coop Local ou Multiplayer | **Ranking:** Sim
- **Tooltip:** Combate direto contra chefes sem espera. No modo infinito padrão, os chefes continuam aparecendo normalmente.
- **Regras e Mecânicas:**
  - Configurável via `game.setBossFightConfig({ submode: 'single' | 'rush', targetBossId })`:
    - **Duelo Direto (`single`):** chama `BossManager.startBossById` (fallback `startBoss`) contra o chefe escolhido.
    - **Boss Rush (`rush`):** chama `BossManager.startBossRush` quando disponível ou executa sequência gerenciada de 5 chefes, curando +1 vida entre cada combate.

### 3. `free_roam` — 🧪 Livre / Sandbox
- **Categoria:** Livre & Sandbox (`sandbox`) | **Jogadores:** Solo, Coop Local ou Multiplayer | **Ranking:** **Não** (sem ranking, sem conquistas validadas e sem caixas Gacha)
- **Tooltip:** Teclas `[1]`/`[2]` velocidade, `[3]` trocar bioma, `[4]` onda de obstáculos, `[5]` invocar boss.
- **Controles & API:**
  - `[1]` / `[2]` ou `game.setFreeRoamSpeed(mult)`: ajusta velocidade entre 40% e 220%.
  - `[3]` ou `game.setFreeRoamBiome(biomeId)`: troca de bioma em tempo real.
  - `[4]` ou `game.spawnFreeRoamEntity('wave')`: gera obstáculo/catálogo sob demanda.
  - `[5]` ou `game.spawnFreeRoamEntity('boss')`: invoca chefe sob demanda.
  - Sem morte: colisões exibem feedback sandbox sem encerrar a corrida.

### 4. `race` — 🏁 Corrida (Linha de Chegada)
- **Categoria:** Competitivos (`competitive`) | **Jogadores:** Solo (com 2 rivais IA), Coop Local ou Multiplayer (LAN/Online) | **Ranking:** Sim
- **Tooltip:** Cruze a linha de chegada primeiro! Checkpoints a cada 1.000m recarregam estamina e turbo.
- **Regras e Mecânicas:**
  - Distância configurável via `game.setRaceDistance(5000 | 10000)` (**5.000m** ou **10.000m**).
  - **Barra de posição 1º/2º/3º** atualizada em tempo real (`HUD.setRaceHud`) e sincronizada no Multiplayer.
  - **Checkpoints** a cada 1.000m concedem recarga total de estamina e breve impulso de turbo.
  - Em modo solo, 2 corredores IA (*Veloz IA* e *Titã IA*) disputam o pódio ao lado do jogador.

### 5. `competition` — 🏅 Competição (Liga)
- **Categoria:** Competitivos (`competitive`) | **Jogadores:** Solo ou Multiplayer | **Ranking:** Sim (validado)
- **Tooltip:** Sem handicap, sem reviver por cristal e sem facilidades: todos correm na mesma seed semanal de liga.
- **Regras e Mecânicas:**
  - **Seed competitiva fixa** semanal gerada por `getCompetitionSeed()` (`LEAGUE-AAAA-Wss`).
  - Regras padronizadas: proíbe dificuldade Fácil (mínimo Normal), desativa desaceleração adaptativa, desativa reviver por cristal e ignora pistas customizadas.
  - **Danger Tier acelerado** (`score * 1.45 + 600`) para escalada competitiva real.
  - Submete pontuação validada com `competitive: true` e seed oficial.

---

## Refino do Modo Cooperativo (`coop`)

- **Sinergia de Ataque em Boss/Raid:** golpes em chefe/ponto fraco dentro de 2s de um aliado aplicam **+35% de dano** e recarga bônus de habilidade.
- **Reviver Tático:**
  - **Proximidade:** permanecer próximo ao aliado caído por 2,5s revive com +1 escudo e 2,5s de invulnerabilidade.
  - **Tecla `[V]`:** reviver instantâneo gastando 1 escudo ou 1 vida extra (funciona tanto em Coop Local 2P quanto em Multiplayer com pistas paralelas).
- **Pistas Paralelas & Sync Multiplayer:** preserva `trackMode: 'parallel'`, `Spawner.syncFromHostObstacles` e `biomeId` no snapshot host → convidado.

---

## Tabela Completa dos 22 Modos

| ID | Nome | Categoria | Tier | Jogadores | Ranking | Descrição / Tooltip |
| --- | --- | --- | --- | --- | --- | --- |
| `solo` | Solo Clássico | Clássicos | Essencial | 1P | Sim | Corrida infinita com cartas, biomas, eventos, chefes e ranking local. |
| `coop` | Coop Local (2P) | Cooperativos | Essencial | 2P / MP | Sim | Score somado, sinergia de ataque em boss/raid, reviver tático e fusão. |
| `pvp` | PvP Local (2P) | Competitivos | Essencial | 2P / MP | Não | Duelo na pista com empurrões, obstáculos no rival, melhor de 3 e handicap. |
| `shared_controls` | Controles Compartilhados | Cooperativos | Essencial | 2P (1 dino) | Não | Jogador A move faixas e Jogador B pula/abaixa/habilidade, com rodízio a cada 60s. |
| `race` | Corrida (Linha de Chegada) | Competitivos | Essencial | 1P+IA / MP | Sim | Linha de chegada (5.000m/10.000m), barra 1º/2º/3º e checkpoints. |
| `story` | Modo História | Clássicos | Avançado | 1P | Sim | Campanha em 3 capítulos: Deserto → Vulcão → Planeta Alienígena. |
| `time_trial` | Contra-Relógio (Ghost) | Competitivos | Avançado | 1P | Sim | Corra contra o fantasma do seu melhor recorde. |
| `tournament` | Torneio Local (4–8P) | Competitivos | Avançado | 4–8P | Não | Chaveamento eliminatório alternando no mesmo teclado. |
| `teams_2v2` | Equipes 2x2 | Cooperativos | Avançado | 2x2 | Não | Duas duplas competem em rodadas somando pontuação. |
| `sabotage` | Modo Sabotagem (2P) | Competitivos | Avançado | 2P / MP | Não | Quem cair primeiro vira fantasma e lança cactos no rival. |
| `capture_egg` | Captura o Ovo (PvP) | Competitivos | Avançado | 2P / MP | Não | Segure o Ovo Dourado por mais tempo em 30s; esbarrar rouba o ovo. |
| `relay` | Corrida de Revezamento | Cooperativos | Avançado | 2P | Não | Jogadores revezam o controle a cada 16s passando o bastão. |
| `raid` | Raid Colossal | Desafios & Boss | Avançado | 1P / Coop / MP | Sim | Bosses colossais com 4 barras de vida, afixos rotativos e placar DPS. |
| `boss_fight` | Boss Fight / Boss Rush | Desafios & Boss | Avançado | 1P / Coop / MP | Sim | Duelo direto contra um chefe escolhido ou sequência Boss Rush. |
| `competition` | Competição (Liga) | Competitivos | Avançado | 1P / MP | Sim | Seed competitiva semanal fixa, regras padronizadas e Danger Tier acelerado. |
| `chaos` | Modo Caos | Clássicos | Bônus | 1P | Sim | Mutadores aleatórios mudam a física e os controles a cada 25s. |
| `hardcore` | Modo Hardcore | Desafios & Boss | Bônus | 1P | Sim | Apenas 1 vida, sem escudo inicial, mas Score x5. |
| `wave_survival` | Sobrevivência de Ondas | Desafios & Boss | Bônus | 1P | Sim | Ondas intensas de inimigos e chefes a cada 3 ondas. |
| `daily_challenge` | Desafio Diário | Competitivos | Bônus | 1P | Sim | Pista com semente fixa pela data de hoje igual para todos. |
| `zen` | Modo Zen | Livre & Sandbox | Bônus | 1P | Não | Sem morte! Relaxe coletando ovos e apreciando as paisagens. |
| `rival_ai` | Dino Rival (IA) | Competitivos | Bônus | 1P | Sim | Corra contra um dino IA com personalidade própria. |
| `free_roam` | Livre / Sandbox | Livre & Sandbox | Bônus | 1P / Coop / MP | Não | Controle de bioma, velocidade e spawn sob demanda, sem ranking/conquistas. |

---

## Integrações do Motor (`Game.js` — Contrato §3)

- **Danger Tier:** `DifficultyManager.getDangerTier(score)` (com fallback monotônico) aplica `speedBonus`, `densityBonus`, `eventFreqBonus` e `predatorAggro` em tempo real e notifica `HUD.setDangerTier`.
- **Predadores:** `PredatorSystem` recebe `spawnPredatorHazard`, `applyStatus`, `damagePlayer` e `onPredatorTelegraph` no contexto de eventos; telégrafos atualizam `HUD.setPredatorTelegraph` e aplicam dano real ao jogador na faixa atingida.
- **Debuffs:** `StatusSystem.tickDebuffs(player, dt, ctx)` aplica `speedMult`, `laneMult`, `controlsReversed`, `abilityLocked`, `visionMult` e `gravityMult`, além de atualizar `HUD.setActiveDebuffs` com throttle de 5 Hz.
- **Spawner de Catálogo:** `Spawner.spawnFromCatalog` é acionado sob demanda no `free_roam` e nos perigos de predador quando disponível.
