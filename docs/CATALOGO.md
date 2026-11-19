# Catálogo Expandido — Hazards, Debuffs, Eventos & Helpers (Mega Expansão)

> Fonte única de verdade: `src/content/catalog_expanded.js` (alimentado por `hazards_catalog.json`, `debuffs_catalog.json`, `events_expanded.json`, `helpers_catalog.json` e `balance.json`).

## 1. Resumo Quantitativo & Razão Threat / Help

| Categoria | Export | `kind` | Arquétipos | Variantes na Matriz | % do Catálogo Local |
| --- | --- | --- | ---: | ---: | ---: |
| Obstáculos Móveis/Telegrafados | `HAZARD_VARIANTS` | `threat` | 28 | **420** (28 × 5 biomas × 3 afixos) | 49,3% |
| Debuffs Mecânicos Reais | `DEBUFF_VARIANTS` | `threat` | 24 | **144** (24 × 6 origens/severidades) | 16,9% |
| Eventos Dinâmicos (sem troca de bioma) | `EVENT_VARIANTS` | `threat` | 36 | **144** (36 × 4 níveis de Danger Tier) | 16,9% |
| Ajudas Balanceadas (Cartas/Pactos/Relíquias/Itens) | `HELPER_VARIANTS` | `help` | 48 | **144** (4 famílias × 12 × 3 raridades) | 16,9% |
| **Total Ameaças (`threat`)** | — | `threat` | 88 | **708** | **83,1%** |
| **Total Ajudas (`help`)** | — | `help` | 48 | **144** | **16,9%** (< 30%) |
| **TOTAL GERAL (`catalog_expanded.js`)** | — | — | **136** | **852** | **100,0%** |

- **Razão Threat : Help** = **708 : 144** (**4,92 : 1** — **83,1% ameaças** vs **16,9% ajudas**).
- **IDs únicos**: 100% validados por `ContentLoader.validateContent()`.

---

## 2. Arquétipos de Obstáculos Móveis & Telegrafados (28)

Implementados em `src/systems/Spawner.js` com `ObjectPool` (zero alocação por frame), modelos voxel multi-partes em `src/models/VoxelLibrary.js` (`buildVoxelExpandedHazard`), aviso visual no solo (`telegraphMesh`) antes do dano e garantia de caminho seguro (`_canBlockLane` / `minSafeLanes >= 1`).

1. `oscillating_laser` — Laser Oscilante (`oscillate_y`, `burn`)
2. `lane_saw` — Serra Troca-Faixa (`lane_patrol`, `bleed`)
3. `telegraphed_geyser` — Gêiser Telegrafado (`erupt_telegraph`, `burn`)
4. `magnetic_mine` — Mina Magnética (`track_lock`, `magnet_repel`)
5. `quicksand_pit` — Areia Movediça (`ground_zone`, `stamina_drain`)
6. `double_wall_gap` — Parede Dupla com Fresta (`static_gap`, `slow_react`)
7. `sliding_block` — Bloco Deslizante (`lane_patrol`, `quake_stagger`)
8. `emerging_tentacle` — Tentáculo Emergente (`erupt_telegraph`, `exhaustion`)
9. `sonic_crystal` — Cristal Sônico (`pulse_ring`, `camera_tilt`)
10. `seeker_drone` — Drone Perseguidor (`track_lock`, `tunnel_vision`)
11. `bone_pendulum` — Pêndulo de Ossos (`pendulum_swing`, `bleed`)
12. `retractable_spike` — Estaca Retrátil (`erupt_telegraph`, `bleed`)
13. `corrosive_cloud` — Nuvem Corrosiva (`hover_drift`, `brittle_armor`)
14. `inverted_gravity_field` — Campo de Gravidade Invertida (`ground_zone`, `heavy_gravity`)
15. `net_trap` — Armadilha de Rede (`ground_zone`, `exhaustion`)
16. `shockwave_emitter` — Onda de Choque (`pulse_ring`, `quake_stagger`)
17. `fragmented_meteor` — Meteoro Fragmentado (`drop_telegraph`, `burn`)
18. `frost_obelisk` — Obelisco Gélido (`pulse_ring`, `frostbite`)
19. `magma_fissure` — Fissura de Magma (`erupt_telegraph`, `burn`)
20. `void_rift` — Fenda do Vazio (`hover_drift`, `blind_fog`)
21. `plasma_turret` — Torre de Plasma (`oscillate_y`, `shield_shatter`)
22. `crusher_pillar` — Pilar Esmagador (`oscillate_y`, `slow_react`)
23. `spore_mine` — Mina de Esporos (`pulse_ring`, `reverse_controls`)
24. `static_pylon` — Pilone Estático (`pulse_ring`, `static_shock`)
25. `acid_geyser` — Gêiser Ácido (`erupt_telegraph`, `shield_shatter`)
26. `phantom_decoy` — Miragem Fantasma (`hover_drift`, `phantom_hazards`)
27. `quake_totem` — Totem Sísmico (`pulse_ring`, `quake_stagger`)
28. `blood_thorn` — Espinho Sanguíneo (`static_gap`, `predator_scent`)

---

## 3. Debuffs Mecânicos Reais (24 novos + 2 legados = 26 debuffs vs 7 buffs)

Implementados em `src/systems/StatusSystem.js` com `StatusSystem.tickDebuffs(player, dt, ctx)` retornando `{ speedMult, laneMult, controlsReversed, abilityLocked, visionMult, gravityMult, scoreMult, cooldownMult, damageTakenMult, cameraTilt, magnetRepel, phantomHazards, predatorAggroBonus, activeDebuffs }` sem alocações por frame.

| ID | Nome | Efeito Mecânico | Contra-jogada |
| --- | --- | --- | --- |
| `bleed` | Sangramento | Dreno contínuo de estamina (`-7.5/s`) | Fruta, Antídoto (E) ou Fogueira |
| `burn` | Queimadura | Dreno de estamina (`-9/s`) e `+15%` dano | Água, Gelo ou Fruta |
| `frostbite` | Congelamento | `speedMult 0.82`, `laneMult 0.72` | Fogo, Tocha Solar ou Turbo |
| `blind_fog` | Névoa Cega | `visionMult 0.45` | Tocha Solar ou aguardar dissipar |
| `reverse_controls` | Controles Invertidos | `controlsReversed: true` | Inverter esquiva ou Antídoto (E) |
| `heavy_gravity` | Gravidade Pesada | `gravityMult 1.55`, `speedMult 0.94` | Esquivar por faixa |
| `silence_ability` | Silêncio | `abilityLocked: true` | Esquiva pura ou Antídoto (E) |
| `stamina_drain` | Dreno de Estamina | `-14 estamina/s` | Cristais ou Frutas |
| `brittle_armor` | Armadura Frágil | `damageTakenMult 1.5` | Evitar impactos até dissipar |
| `tunnel_vision` | Visão em Túnel | `visionMult 0.55` | Faixa central ou Tocha |
| `slippery_lanes` | Faixas Escorregadias | `laneMult 0.58` | Antecipar trocas ou usar Fogo |
| `cooldown_curse` | Maldição de Recarga | `cooldownMult 1.65` | Cristais ou Antídoto (E) |
| `magnet_repel` | Repulsão Magnética | `magnetRepel: true` | Coleta direta na faixa |
| `camera_tilt` | Vertigem | `cameraTilt 0.16`, `laneMult 0.88` | Guiar pelos marcadores do chão |
| `shield_shatter` | Quebra-Escudo | Remove 1 escudo ao aplicar, `+25%` dano | Esquiva pura do telégrafo |
| `score_tax` | Imposto Sombrio | `scoreMult 0.70` | Coletar ovos dourados |
| `slow_react` | Reação Lenta | `speedMult 0.88`, `laneMult 0.75` | Turbo ou Antídoto (E) |
| `phantom_hazards` | Miragens | `phantomHazards: true`, `visionMult 0.82` | Ler apenas telégrafo sólido no chão |
| `quake_stagger` | Abalo Sísmico | `laneMult 0.72` + tremor periódico | Pular no ritmo do tremor |
| `static_shock` | Choque Estático | `speedMult 0.90`, `abilityLocked: true` | Evitar água elétrica / Antídoto (E) |
| `oxygen_leak` | Vazamento de O2 | `-12 O2/s` | Bolhas de ar ou superfície |
| `exhaustion` | Exaustão | `speedMult 0.84`, `laneMult 0.84`, `-6 stam/s` | Fruta ou Oásis |
| `hex_random` | Feitiço Caótico | Alterna inversão / gravidade / silêncio | Antídoto (E) ou Fruta |
| `predator_scent` | Cheiro de Presa | `predatorAggroBonus +0.45` | Água ou Fogueira |

---

## 4. Eventos Dinâmicos (36 Arquétipos Agendáveis)

Expandidos de 12 para **36 arquétipos** em `EventManager.js` + `WorldEvents.js` + `AdvancedEvents.js` + `CoreEvents.js`, mantendo:
- **Zero troca de bioma**
- **Zero repetição consecutiva**
- **Bloqueio e fila durante Boss ou Intro de Predador**
- **Intensidade escalada pelo `ctx.dangerTier`**
- **`EventManager.simulateEventsTo60k()` 100% verde**

---

## 5. Blindagem de Modo Perfeito, Supremo & Caps (`Cards.js` + `balance.json`)

- **Modo Perfeito (`p.isPerfectMode`)**:
  - `maxShields = 0`, `maxHp = 1`, `postHitInvulnBonus = 0`.
  - Cartas/ajudas que concedem escudos ou vidas extras são filtradas em `drawThreeCards()` e bloqueadas também em `apply()` e `enforcePlayerCaps()`.
- **Modo Supremo (`difficultyId === 'supreme'`)**:
  - `maxShields = 1`, `maxHp = 3`, `postHitInvulnBonus = 0`.
- **Caps globais anti-build invencível**:
  - `scoreCardMult <= 2.25`, `cooldownMult >= 0.55`, `jumpMult <= 1.35`, `laneSpeedMult <= 1.65`, `cardScaleMult >= 0.85`, `abilityPowerMult <= 1.85`, `eggValueMult <= 2.0`, `furyChargeMult <= 2.2`.
- **Pactos Jurássicos**: bônus acompanhados de penalidade obrigatória (ex.: `-1 Vida máx.`, `blockShields: true`, `+20% duração de debuffs`).
