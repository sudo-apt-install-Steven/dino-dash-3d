# Guia de Conteúdo Data-Driven — DINO DASH 3D (Fase 4)

Documentação do sistema de conteúdo orientado a dados em `src/content/`, fases de boss telegrafadas, eventos sazonais por data, melhorias de metajogo e recursos pós-partida / espectador no multiplayer.

---

## 1. Estrutura Data-Driven (`src/content/`)

Todo o balanceamento, catálogo de bosses, missões e calendário sazonal está centralizado em arquivos JSON carregados por `src/content/ContentLoader.js`:

| Arquivo | Responsabilidade | Contrato |
| --- | --- | --- |
| `src/content/balance.json` | Multiplicadores globais de velocidade, aceleração, recompensas de boss, XP e combate de boss | `{ speed, rewards, xp, bossCombat }` |
| `src/content/bosses.json` | Definição dos 14 bosses com HP, bioma, 3 fases e recompensas | `[{ id, name, biomeId, hp, phases: [{ hpThreshold, pattern, telegraphSec }], rewardEggs }]` |
| `src/content/missions.json` | Missões diárias, desafios semanais e nós da campanha | `[{ id, scope: 'daily' \| 'weekly' \| 'campaign', title, target, metric, rewardEggs }]` |
| `src/content/seasonal_events.json` | Eventos sazonais ativados automaticamente por intervalo de data | `[{ id, name, startMM, startDD, endMM, endDD, accent, bonusMult }]` |
| `src/content/ContentLoader.js` | API estática de leitura, consulta por data/escopo/bioma e validação de schema | `getBalance()`, `getBossById()`, `getMissions()`, `getActiveSeasonalEvent()`, `validateContent()` |

### Como adicionar um novo Boss ou Missão
1. **Novo Boss**: adicione uma entrada em `src/content/bosses.json` com `id`, `name`, `biomeId`, `hp`, `phases` (3 objetos com `hpThreshold`, `pattern`, `telegraphSec`) e `rewardEggs`.
2. **Nova Missão**: adicione uma entrada em `src/content/missions.json` com `scope` (`daily`, `weekly` ou `campaign`), `target`, `metric` e `rewardEggs`.
3. **Novo Evento Sazonal**: adicione uma entrada em `src/content/seasonal_events.json` com `startMM`/`startDD` e `endMM`/`endDD` (inclusive faixas que cruzam o ano novo, ex.: `12/20` a `01/05`).

---

## 2. Balanceamento Global (`src/content/balance.json`)

Os valores padrão preservam integralmente o *feeling* original do jogo (`1.0x`):

- `speed.initialSpeedMultiplier`: `1.0` (multiplicador sobre `difficulty.initialSpeed`)
- `speed.maxSpeedMultiplier`: `1.0` (multiplicador sobre `difficulty.maxSpeed`)
- `speed.accelMultiplier`: `1.0` (multiplicador sobre `difficulty.accel`)
- `rewards.bossRewardMult`: `1.0`
- `rewards.bossScoreBonus`: `750`
- `rewards.bossDefaultEggs`: `55`
- `rewards.bossDefaultCrystals`: `3`
- `rewards.prestigeStepMult`: `0.25` (+25% por nível de prestígio)
- `bossCombat.baseAttackCooldownSec`: `1.85` / `minAttackCooldownSec`: `0.85` / `defaultTelegraphSec`: `0.85`

---

## 3. Fases de Boss Telegrafadas (`BossManager.js`)

- Cada boss possui **3 fases** determinadas por `computeBossPhase(hpRatio, phases)`:
  - **Fase 1** (`hpRatio > 0.66`): padrão inicial, telegrafia mais longa (`~0.85s–0.90s`).
  - **Fase 2** (`0.33 < hpRatio <= 0.66`): ataques mais rápidos (`0.9x` cooldown) e telegrafia reduzida (`~0.72s`).
  - **Fase 3** (`hpRatio <= 0.33`): modo fúria (`0.8x` cooldown, maior chance de varredura multi-faixa) e telegrafia curta (`~0.58s`).
- **Telegrafia Visual**: antes de disparar o ataque, `BossManager` exibe marcadores pulsantes no chão nas faixas-alvo (`telegraphMarkers`), executa animação de preparação e dispara o callback `ctx.onBossTelegraph`.
- **Integração com Modelos 3D**: chama `bossRig.setPhase?.(phase)` (contrato Fase 3) mantendo fallback para `bossRig.setPhaseVisuals?.(hpRatio)`.

---

## 4. Sazonalidade & Metajogo (`Metagame.js`)

- `Metagame.getActiveSeason(date)`: quando `Save.data.season === 'auto'`, consulta `ContentLoader.getActiveSeasonalEvent(date)`.
- `Metagame.getActiveSeasonInfo(date)` e `Metagame.getSeasonBonusMultiplier(date)`: retornam metadados (`name`, `accent`, `bonusMult`, `active`).
- `Metagame.getMissionsCatalog(scope)` e `Metagame.getCampaignProgress()`: expõem o catálogo data-driven de missões e progresso dos nós desbloqueados da campanha.

---

## 5. Multiplayer: Revanche, Resumo Pós-Partida e Espectador (`PartyModals.js`, `Game.js`)

- **Revanche na Mesma Sala**: botão `🔄 Revanche (Mesma Sala)` no pódio reinicia a partida mantendo `room`, `botCount`, `mpMode`, `difficultyId` e flags de configuração da sala; `🔁 Próxima Rodada` aplica os votos de bioma/modo quando selecionados.
- **Resumo Detalhado Pós-Partida**: exibe duração (`mm:ss`), distância total, bioma, dificuldade, combo máximo e tabela por jogador com dino utilizado, pontuação, ovos, stomps, acertos PvP, status de sobrevivência (`💀`), ping e recompensa de ovos.
- **Câmera Livre para Espectador Eliminado**: quando o jogador local é eliminado em uma partida multiplayer enquanto há outros competidores vivos, `Game.js` ativa automaticamente `spectatorMode` e permite movimentação livre com `WASD`/Setas (pan), `E`/`Espaço` e `Q`/`Shift` (altura) e `Tab` (alternar jogador focado).

---

## 6. Testes e Verificação Manual

### Testes Automatizados
- Build de produção: `npm run build`
- Testes unitários: `npm run test:unit`
- Validação de conteúdo em Node: `ContentLoader.validateContent()`

### Roteiro de Teste Manual
1. **Conteúdo Data-Driven**: iniciar uma corrida solo e verificar velocidade inicial/aceleração idênticas ao baseline.
2. **Boss Telegrafado**: alcançar um boss (ou testar via pista de testes/evento) e confirmar marcação vermelha/amarela pulsante nas faixas antes do ataque e transição para Fases 2 e 3 ao atingir 66% e 33% de HP.
3. **Eventos Sazonais**: alterar a data do sistema (ou testar `Metagame.getActiveSeason(new Date('2026-10-15'))`) e verificar ativação de `halloween`, `birthday`, `xmas`, `new_year`, `carnival` e `summer_sun`.
4. **Multiplayer (Revanche, Resumo e Espectador)**: iniciar partida multiplayer com bots/jogadores, ser eliminado antes do fim para validar a câmera livre (`WASD`/`Q`/`E`/`Tab`), finalizar a partida para inspecionar o resumo detalhado no pódio e clicar em `🔄 Revanche (Mesma Sala)` confirmando que sala e regras são preservadas.
