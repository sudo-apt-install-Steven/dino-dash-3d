# Balanceamento — Mega Expansão (Dificuldade, Predadores & Bosses)

> Branch: `feat/exp-balance-predators` | Responsável: `balance_predators`

## 1. Diagnóstico do Problema Original

Jogadores conseguiam atingir ~2.000.000 pontos em **Supremo + Modo Perfeito** com facilidade excessiva por três causas principais:
1. **Bug do `paceBonus` em `PredatorSystem.js` (~L347):** a fórmula antiga `speed >= 25.5 ? 1.15 : ...` comparava a velocidade atual contra um valor fixo (`25.5`). Como Insano (`initialSpeed: 24`) e Supremo (`initialSpeed: 26`) já começavam acima de `25.5`, o predador **recuava sozinho desde o primeiro segundo**, nunca ameaçava o jogador e ainda concedia `+180 pts` e `+40 ovos` de graça ao ser "despistado".
2. **Curva estática após o `maxSpeed`:** não havia escalonamento contínuo por pontuação (Danger Tier), deixando corridas longas (100k–2M pts) estagnadas no mesmo teto de densidade e frequência de eventos.
3. **Pressão de ameaça baixa em `hard`+:** predadores não possuíam ataques ativos telegrafados e chefes não possuíam afixos de combate em dificuldades altas.

---

## 2. Recalibração dos Presets de Dificuldade (`src/game/Difficulty.js`)

| Preset | initialSpeed (Antes → Depois) | maxSpeed (Antes → Depois) | accel (Antes → Depois) | density (Antes → Depois) | eventFreq (Antes → Depois) | scoreMult (Antes → Depois) | predatorAggro | minSafePaths |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `easy` | 16 → 16 | 29 → 29 | 0.009 → 0.009 | 0.72 → 0.72 | 0.68 → 0.68 | 0.8 → 0.8 | 0.72 | 2 |
| `normal` | 18 → 18 | 35 → 36 | 0.013 → 0.0135 | 0.96 → 0.98 | 1.0 → 1.0 | 1.0 → 1.0 | 1.00 | 2 |
| `hard` | 21 → 22 | 42 → 46 | 0.018 → 0.022 | 1.28 → 1.42 | 1.35 → 1.50 | 1.5 → 1.45 | 1.35 | 1 |
| `insane` | 24 → 25.5 | 48 → 54 | 0.024 → 0.030 | 1.55 → 1.78 | 1.65 → 1.90 | 2.5 → 2.15 | 1.68 | 1 |
| `supreme` | 26 → 28 | 54 → 62 | 0.028 → 0.038 | 1.72 → 2.08 | 1.85 → 2.25 | 3.4 → 2.85 | 2.00 | 1 |

**Justificativas:**
- **Normal permanece justo:** `minSafePaths = 2`, 3 vidas, `predatorAggro = 1.0` e duração de luta contra chefes preservada em **60–90s**.
- **Difícil/Insano/Supremo:** aumento real de aceleração, velocidade máxima, densidade e agressividade dos predadores, combinado à redução moderada do `scoreMult` em Supremo (`3.4 → 2.85`) para que a pontuação reflita sobrevivência real em vez de inflação passiva.
- **Invariante de justiça:** `getEffectiveMinSafePaths(presetId)` sempre garante `>= minSafePaths` rotas livres (`>= 2` em Fácil/Normal, `>= 1` em Difícil+).

---

## 3. Escalonamento Contínuo — `getDangerTier(score)`

Interpolação suave (*smoothstep*) entre marcos, estritamente monotônica (sem saltos bruscos) e com crescimento logarítmico contínuo acima de 5M pts:

| Tier | Pontuação | Rótulo | `speedBonus` | `densityBonus` | `eventFreqBonus` | `predatorAggro` |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | Calmo | +0.0 | +0.00 | +0.00 | 1.00× |
| 2 | 10.000 | Alerta | +1.6 | +0.08 | +0.08 | 1.08× |
| 3 | 25.000 | Tenso | +3.4 | +0.17 | +0.16 | 1.18× |
| 4 | 50.000 | Hostil | +5.5 | +0.28 | +0.26 | 1.30× |
| 5 | 100.000 | Perigoso | +8.0 | +0.42 | +0.38 | 1.46× |
| 6 | 250.000 | Predatório | +11.2 | +0.60 | +0.54 | 1.66× |
| 7 | 500.000 | Letal | +14.8 | +0.80 | +0.72 | 1.90× |
| 8 | 1.000.000 | Cataclísmico | +18.8 | +1.02 | +0.92 | 2.18× |
| 9 | 1.500.000 | Extinção | +22.0 | +1.20 | +1.10 | 2.42× |
| 10 | 2.000.000 | Abissal | +25.2 | +1.38 | +1.28 | 2.68× |
| 11 | 3.000.000 | Impossível | +28.5 | +1.56 | +1.46 | 2.95× |
| 12+ | 5.000.000+ | Ômega | +32.0+ | +1.75+ | +1.65+ | 3.25×+ |

No patamar de 1M–2M pts em Supremo + Modo Perfeito (1 vida, sem escudos extras), a combinação de `+18.8..25.2` de velocidade, densidade `+1.02..1.38` e predadores com agressividade `2.0 × 2.18..2.68` torna a corrida a 2M pts um desafio extremo que exige domínio completo de desvios e gerenciamento de estamina.

---

## 4. Correção e Evolução do `PredatorSystem.js`

### Antes vs. Depois

| Mecânica | Antes | Depois |
| --- | --- | --- |
| `paceBonus` em cruzeiro | Fixo (`speed >= 25.5 → +1.15`, recuava sozinho em Insano/Supremo) | Relativo à velocidade de cruzeiro da dificuldade + Danger Tier + mutador; predador sempre fecha distância em cruzeiro (`-0.42 * aggro`) e só afasta com Turbo/Dash ou Isca |
| Recompensa ao escapar | `+180 pts` e `+40 ovos` mesmo por timeout | `+45 pts` / `+8 ovos` apenas se despistado por distância (`>= 8.8m`); timeout dá apenas `+25 pts` e `0 ovos` |
| Ataques ativos | Nenhum (apenas mordida se `distance <= 1.75`) | **5 ataques ativos telegrafados** (aviso visual + HUD `0.75s` antes) |

### Os 5 Ataques Ativos Telegrafados (`0.75s` de aviso)
1. **Bote de Faixa (`lane_lunge`):** telegrafa a faixa atual do jogador e investe; emite `spawnPredatorHazard` e `damagePlayer` se o alvo permanecer na faixa.
2. **Cuspe Ácido (`venom_spit`):** dispara projétil telegrafado na faixa; aplica `applyStatus('poison', 3.0)` e dano ao atingir.
3. **Onda de Rugido (`roar_wave`):** drena `28` de estamina (`38` se Voltaico), aplica `stun_slow` e encurta a distância do predador.
4. **Corte de Flanco (`flank_cut`):** bloqueia uma faixa por `2.5s` (preservando `minSafePaths`) e causa dano a quem entrar/permanecer nela.
5. **Chamado da Matilha (`pack_call` — `hard`+ / Tier >= 4):** cerca até `3 - minSafePaths` faixas (sempre deixando ao menos 1 rota segura), emitindo múltiplos hazards coordenados.

### +8 Novos Predadores Alfa (`src/events/PredatorModels.js`)
Total expandido de 19 para **27 predadores** (14 terrestres, 7 aquáticos, 6 voadores), todos dentro do orçamento de **<= 750 tris** (máximo medido: `504 tris` no `tempest_wyvern`):
- **Terrestres:** `pyro_carno` (Pyrocarno Alfa), `obsidian_spino` (Espinossauro Obsidiana)
- **Aquáticos:** `abyss_mosa` (Mosassauro Abissal), `reef_barracuda` (Xiphactinus Alfa), `trench_nautilus` (Náutilo Titânico)
- **Voadores:** `tempest_wyvern` (Serpe da Tempestade), `solar_phoenix_raptor` (Falcão-Sáurio Solar), `frost_pteron` (Pterodonte Glacial)
- **+10 Mutadores de Caça:** `frenzied`, `stalker`, `armored`, `venomous`, `voltaic`, `glacial`, `pack_alpha`, `void_touched`, `relentless`, `ambusher`.

---

## 5. Chefes (+6 Novos -> 20 Total), Afixos & Modos Dedicados

### Novos Bosses (`src/content/bosses.json` + `src/events/BossModels.js`)

| ID | Nome | Bioma | HP Tier | Duração Normal (`simulateBossFightHeadless`) |
| --- | --- | --- | --- | --- |
| `abyssal_kraken` | Kraken Abissal | `deep_ocean` | 6 | 80.50s (meta 60–90s ✔) |
| `volcanic_phoenix` | Fênix Vulcânica | `volcano` | 6 | 78.80s (meta 60–90s ✔) |
| `king_megalodon` | Rei Megalodon | `ocean_surface` | 6 | 80.35s (meta 60–90s ✔) |
| `cyber_emperor` | Imperador Cibernético | `cyber_city` | 6 | 80.15s (meta 60–90s ✔) |
| `fossil_titan` | Titã Fóssil | `fossil_graveyard` | 6 | 79.00s (meta 60–90s ✔) |
| `cosmic_colossus` | Colosso Cósmico | `alien_planet` | 6 | 80.35s (meta 60–90s ✔) |

- **Afixos de Boss (`src/content/threat_variants.js`):** 10 afixos (`Enfurecido`, `Blindado`, `Sombrio`, `Tempestuoso`, `Convocador`, `Vampírico`, `Fundido`, `Glacial`, `Arcano`, `Colossal`) aplicados em `hard`+/Danger Tier alto ou via `opts.affixId` (Normal padrão permanece sem afixo para garantir a janela 60–90s).
- **APIs para `modes_engine`:** `BossManager.startBossById(id, opts)` (suporta `mode: 'boss_fight' | 'raid'`, `affixId`, `hpMult`, `playerCount`) e `BossManager.startBossRush(opts)` (sequência de chefes com `advanceBossRush(ctx)`). O spawn automático no modo infinito padrão segue preservado.
- **Catálogo `threat_variants.js`:** `135` entradas em `PREDATOR_ENCOUNTER_VARIANTS` (`>= 80`) + `200` entradas em `BOSS_AFFIX_VARIANTS` (`>= 120`) = **335 variantes `kind: 'threat'`** com IDs únicos.
