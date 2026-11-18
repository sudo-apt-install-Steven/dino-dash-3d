# Contratos & Fronteiras de Arquivos — Mega Expansão (Swarm)

> Base: branch `feat/mega-expansao` (tag `pre-expansao`). Nenhum worker toca em arquivo de outro dono. Dependência cruzada = mensagem no quadro.

## 1. Donos de arquivos

| Worker | Branch | Arquivos exclusivos |
| --- | --- | --- |
| `balance_predators` | `feat/exp-balance-predators` | `src/game/Difficulty.js`, `src/events/PredatorSystem.js`, `src/events/PredatorModels.js`, `src/events/BossManager.js`, `src/events/BossModels.js`, `src/content/threat_variants.js`, `src/content/bosses.json`, `docs/BALANCEAMENTO.md` |
| `hazards_debuffs` | `feat/exp-hazards-debuffs` | `src/content/catalog_expanded.js`, `src/content/hazards_catalog.json`, `src/content/debuffs_catalog.json`, `src/content/events_expanded.json`, `src/content/helpers_catalog.json`, `src/content/balance.json`, `src/content/ContentLoader.js`, `src/systems/StatusSystem.js`, `src/systems/Spawner.js`, `src/systems/Cards.js`, `src/events/EventManager.js`, `src/events/WorldEvents.js`, `src/events/AdvancedEvents.js`, `src/events/CoreEvents.js`, `src/models/VoxelLibrary.js`, `docs/CATALOGO.md` |
| `modes_engine` | `feat/exp-modes-engine` | `src/game/Modes.js`, `src/game/Game.js`, `src/ui/PartyModals.js`, `docs/MODOS.md` |
| `content_dinos_biomes` | `feat/exp-content-collection` | `src/dinos/DinoCatalog.js`, `src/dinos/DinoFactory.js`, `src/dinos/DinoAnimator.js`, `src/dinos/DinoAbilities.js`, `src/dinos/DinoCustomization.js`, `src/world/Biomes.js`, `src/world/World.js`, `src/world/TrackChunks.js`, `src/world/SceneryInstancer.js`, `src/content/collection_expanded.js`, `docs/COLECAO.md` |
| `ui_ux_polish` | `feat/exp-ui-polish` | `src/ui/Menus.js`, `src/ui/HUD.js`, `src/ui/SelectionScreen.js`, `src/ui/UI.js`, `src/ui/CustomizationScreen.js`, `src/styles/**` |
| `qa_verifier` | (inherit) | `tests/expansion_balance.test.mjs`, `tests/e2e_smoke.py`, `tests/redteam_fuzz.py`, `docs/RELATORIO_EXPANSAO.md`, `docs/BUGS.md` |

## 2. Contratos de dados (exports obrigatórios)

Toda entrada de catálogo tem a forma `{ id: string único, kind: 'threat' | 'help' | 'neutral', category: string, name: string, ... }`.

- `src/content/catalog_expanded.js` (`hazards_debuffs`): exporta `HAZARD_VARIANTS`, `DEBUFF_VARIANTS`, `EVENT_VARIANTS` (todas `kind:'threat'`) e `HELPER_VARIANTS` (`kind:'help'`); também `getHazardArchetypes()` / `rollHazard(rng, ctx)` para o Spawner.
- `src/content/threat_variants.js` (`balance_predators`): exporta `PREDATOR_ENCOUNTER_VARIANTS` e `BOSS_AFFIX_VARIANTS` (`kind:'threat'`).
- `src/content/collection_expanded.js` (`content_dinos_biomes`): exporta `COLLECTION_VARIANTS` (acessórios, skins, rastros, mutações novas; `kind:'help'`), `NEW_DINO_IDS`, `NEW_BIOME_IDS` (`kind:'neutral'`).
- **Metas verificadas pelo QA:** total de entradas (threat + help) >= 1000; `threat` >= 55%; `help` <= 45% (alvo ~30%); nenhum `id` duplicado; DINO_CATALOG >= 50; BIOMES >= 25.

## 3. Contratos de integração com `Game.js` (dono: `modes_engine`)

Os demais workers **não editam `Game.js`**. Eles expõem APIs e `modes_engine` as conecta:
- `PredatorSystem.update(dt, speed, score, players, ctx)` passa a emitir `ctx.spawnPredatorHazard?.({ type, lane, x, telegraphSec, damage })`, `ctx.applyStatus?.(player, id, dur)`, `ctx.damagePlayer?.(player, reason)`.
- `Spawner.spawnFromCatalog(rng, ctx)` e `StatusSystem.tickDebuffs(player, dt, ctx)` (que devolve efeitos: `speedMult`, `laneMult`, `controlsReversed`, `abilityLocked`, `visionMult`, `gravityMult`).
- `Difficulty.getDangerTier(score)` retorna `{ tier, speedBonus, densityBonus, eventFreqBonus, predatorAggro }`.
- Novos modos em `Modes.js`: `raid`, `boss_fight`, `free_roam`, `race`, `competition` (+ refino de `coop`). O boss continua aparecendo no modo infinito padrão.
- `HUD.js` expõe `setDangerTier(tier)`, `setActiveDebuffs(list)`, `setPredatorTelegraph(info)` (chamados por `Game.js`).

## 4. Regras gerais
- 60 FPS: usar `ObjectPool`, `InstancedMesh`, catálogos data-driven gerados por matriz (arquétipo × variante × afixo); nada de alocação por frame.
- Balanceamento só em `src/content/balance.json` / `Difficulty.js`, comentado.
- Todo item novo tem teste ou verificação headless; `npm run build` e `npm run test:unit` verdes antes de cada commit; chunk JS <= 1050 KB.
