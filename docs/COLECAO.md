# Coleção — Mega Expansão (Dinossauros, Biomas & Personalização)

> Branch: `feat/exp-content-collection` · Catálogos: `src/dinos/DinoCatalog.js`, `src/world/Biomes.js`, `src/dinos/DinoCustomization.js`, `src/content/collection_expanded.js`

## 1. Resumo Quantitativo

| Categoria | Antes | Depois | Delta |
| --- | ---: | ---: | ---: |
| Dinossauros (`DINO_CATALOG`) | 37 | **50** | +13 |
| Biomas (`BIOMES`) | 19 | **25** | +6 |
| Acessórios 3D (`ACCESSORIES_SHOP`) | 59 | **77** | +18 |
| Skins (`SKIN_VARIANTS`) | 8 | **20** | +12 |
| Rastros (`TRAILS_SHOP`) | 4 | **16** | +12 |
| Padrões (`PATTERNS`) | 6 | **12** | +6 |
| Mutações de DNA (`MUTATIONS`) | 11 | **19** | +8 |
| Variantes de Coleção (`COLLECTION_VARIANTS`, `kind: 'help'`) | — | **194** | +194 |
| Entradas Neutras (`NEW_DINO_IDS` + `NEW_BIOME_IDS`) | — | **19** | +19 |

---

## 2. Novos Dinossauros (+13 Espécies, IDs 38–50)

Todos respeitam o estilo voxel procedural, silhueta distinta em `DinoFactory.js`, orçamento **<= 750 triângulos por dino** e balanceamento sem espécies quebradas/overpowered (soma de atributos entre 31 e 36; cooldowns entre 7,6s e 11,2s).

| # | ID | Nome | Classe / Habitat | Vel | Pulo | HP | Def | Atq | Soma | Habilidade Ativa (CD / Dur) | Passiva |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 38 | `acrocanthosaurus` | Acrocanthosaurus | Carnívoro / Terrestre | 7 | 6 | 4 | 7 | 9 | 33 | **Espinha Sísmica** (9.5s / 1.6s) — onda média + investida curta | Carapaça Espinhal (+15% pts em sequência) |
| 39 | `concavenator` | Concavenator | Carnívoro / Terrestre | 9 | 8 | 3 | 5 | 8 | 33 | **Impulso da Corcova** (8.2s / 1.6s) — turbo + 2 lâminas | Aerodinâmica Dorsal (+10% carga em salto perfeito) |
| 40 | `amargasaurus` | Amargasaurus | Herbívoro / Terrestre (Quad) | 6 | 6 | 4 | 9 | 7 | 32 | **Barreira Cervical** (10.5s / 2.4s) — leque de espinhos + ram | Paliçada Natural (-20% lama/vento) |
| 41 | `edmontonia` | Edmontonia | Herbívoro / Terrestre (Quad) | 5 | 5 | 5 | 10 | 7 | 32 | **Falange Blindada** (11.0s / 2.8s) — investida com espinhos | Ombros de Aço (+18 Fúria ao bloquear) |
| 42 | `corythosaurus` | Corythosaurus | Herbívoro / Terrestre | 8 | 8 | 3 | 6 | 6 | 31 | **Eco do Elmo** (8.8s / 2.6s) — pulso sônico + ímã + cura Coop | Ressonância Harmônica (+15% duração de ímã) |
| 43 | `plesiosaurus` | Plesiosaurus | Aquático / Superfície | 8 | 7 | 3 | 7 | 7 | 32 | **Redemoinho Marinho** (8.5s / 2.0s) — mergulho + onda radial | Correntes Ancestrais (+12% vel. na água) |
| 44 | `kronosaurus` | Kronosaurus | Aquático / Submerso | 8 | 6 | 4 | 8 | 9 | 35 | **Pressão Abissal** (10.0s / 2.1s) — investida pesada + onda | Mandíbula de Fossa (+20% pts destr. aquática) |
| 45 | `archelon` | Archelon | Aquático / Superfície | 6 | 6 | 5 | 10 | 6 | 33 | **Casco Oceânico** (11.2s / 2.8s) — deslize invulnerável curto | Carapaça Hidrodinâmica (-18% gasto O₂/estamina) |
| 46 | `hatzegopteryx` | Hatzegopteryx | Voador / Aéreo | 9 | 9 | 3 | 6 | 8 | 35 | **Rasante Imperial** (9.2s / 2.2s) — impulso + 2 rajadas + salto | Asas de Tempestade (-20% desvio de vento) |
| 47 | `archaeopteryx` | Archaeopteryx | Voador / Aéreo | 10 | 9 | 2 | 4 | 7 | 32 | **Turbilhão de Penas** (7.8s / 2.0s) — 3 lâminas + salto extra | Plumagem Leve (-15% estamina aérea) |
| 48 | `microraptor` | Microraptor | Voador / Aéreo | 10 | 10 | 2 | 4 | 6 | 32 | **Quatro Asas** (7.6s / 2.2s) — +2 saltos + ímã curto + turbo | Planador Quádruplo (+15% agilidade lateral) |
| 49 | `indominus_voxel` | Indominus Voxel | Místico / Híbrido Terrestre | 8 | 8 | 4 | 7 | 9 | 36 | **Camuflagem Predatória** (10.2s / 2.2s) — furtividade + onda | DNA Quimérico (+15% carga hab. + atrai ovos) |
| 50 | `chrono_wyvern` | Chrono Wyvern | Místico / Híbrido Voador | 9 | 9 | 3 | 6 | 8 | 35 | **Pulso Temporal** (10.5s / 2.3s) — onda + 3 plasma + ímã | Fenda Temporal (-8% CD efetivo + atrai ovos) |

---

## 3. Novos Biomas (+6 Biomas, IDs 20–25)

Transição suave de paleta e névoa via `World.applyTheme` / `World.applyBiome`, cenário emissivo em `SceneryInstancer.js` (zero alocações por frame) e 2 novos chunks modulares (`magma_vent`, `orbital_boost`) em `TrackChunks.js`.

| # | ID | Nome | Mecânica / Modificador | Boss Associado (`bossId`) | Fóssil |
| ---: | --- | --- | --- | --- | --- |
| 20 | `lunar_crater` | Cratera Lunar | `lowGravity: 0.52`, `craterQuake: true` | `colosso_cosmico` | Meteorito de Titânio |
| 21 | `aztec_temple` | Templo Asteca | `windBias: 0.85`, `templeTraps: true` | `titan_fossil` | Ídolo Solar de Jade |
| 22 | `bioluminescent_jungle` | Selva Bioluminescente | `currentForce: 1.0`, `sporeDrift: true` | `kraken_abissal` | Esporo Luminescente |
| 23 | `obsidian_desert` | Deserto de Obsidiana | `heatDrain: true`, `windBias: -1.65` | `rei_megalodon` | Dente de Obsidiana |
| 24 | `magma_core` | Núcleo Magmático | `heatDrain: true`, `subterranean: true`, `speedMod: 1.08` | `fenix_vulcanica` | Pluma de Magma |
| 25 | `orbital_station` | Estação Orbital | `lowGravity: 0.72`, `speedMod: 1.14` | `imperador_cibernetico` | Núcleo de Dobra |

---

## 4. Personalização & Mutações de DNA (Trade-offs Equilibrados)

`src/content/collection_expanded.js` exporta **194 entradas** em `COLLECTION_VARIANTS` (`kind: 'help'`, IDs únicos `col_*`):
- **54 acessórios** (18 arquétipos voxel 3D renderizados em `DinoFactory._attachAccessory` × 3 acabamentos)
- **48 skins** (12 arquétipos elementais/cósmicos em `SKIN_VARIANTS` × 4 acabamentos)
- **36 rastros** (12 arquétipos em `TRAILS_SHOP` × 3 intensidades)
- **24 padrões** (6 arquétipos em `PATTERNS` × 4 paletas)
- **32 mutações** (8 novas mutações de DNA em `MUTATIONS` × 4 níveis — toda vantagem tem custo explícito):

| Mutação | Vantagens (Prós) | Custos (Contras) |
| --- | --- | --- |
| `lunar_bones` | +Altura de salto, -estamina aérea | -Estabilidade contra vento/empurrões, -potência de ataque |
| `obsidian_scales` | +Estabilidade, +potência de ataque [Q] | -Velocidade máxima, -altura de salto |
| `biolum_glands` | +Ganho de Fúria, +bônus de ovos | -Regeneração de estamina, +tempo de recarga |
| `magma_heart` | +Potência de ataque [Q], +Fúria | -Velocidade na água, +gasto de estamina aérea |
| `orbital_gyro` | +Agilidade lateral, +estabilidade | -Altura de salto, +tempo de recarga |
| `chrono_synapse` | -Recarga da habilidade, +potência ativa | -Regeneração de estamina, -score passivo base |
| `abyssal_gills` | +Velocidade de nado, +estabilidade aquática | -Velocidade terrestre, -altura de salto |
| `apex_adrenaline` | +Multiplicador de score, +velocidade | -Estabilidade lateral, +gasto de estamina aérea |
