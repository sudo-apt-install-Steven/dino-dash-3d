# Guia de Estilo Voxel & Orçamento de Arte — DINO DASH 3D

> Documento oficial de direção de arte procedural (Fase 3 — Modelos, Arte e Animação).

---

## 1. Princípios do Estilo Voxel Procedural

Todos os personagens, chefes, obstáculos e props do **DINO DASH 3D** são construídos **100% proceduralmente em Three.js** usando cubos escalonados a partir de uma geometria unitária compartilhada (`BoxGeometry(1, 1, 1)` — `SHARED_BOX` em `DinoFactory.js` / `BossModels.js` e `VOXEL_BOX` em `VoxelLibrary.js`).

### Regras Fundamentais
1. **Zero blocos isolados:** Todo objeto interativo ou obstáculo deve ser composto por **no mínimo 3 peças** (`countVoxelMeshes(obj) >= 3`) para garantir leitura de silhueta.
2. **Pivôs articulados explícitos:** Cabeça (`neckPivot`), mandíbula (`jaw` / `jawGroup`), membros (`hip` → `knee`/`outer`) e segmentos de cauda (`tailSegments`) usam `THREE.Group` dedicados para animação procedural limpa sem deformação de malha.
3. **Alinhamento de grid:** Proporções seguem múltiplos aproximados de `0.05` a `0.15` unidades de mundo (voxel base `~0.12u` para detalhes faciais, `0.25u–0.5u` para membros e `0.6u–1.2u` para torso).
4. **Materiais compartilhados e sem texturas pesadas:** Uso de `MeshStandardMaterial` com `roughness` e `metalness` calibrados por material (pele fosca `0.65`, metal mecha `0.78 / 0.26`, cristal/emissivo com `emissiveIntensity` controlado).

---

## 2. Escala Relativa (Dino × Obstáculos × Bosses × Cenário)

| Categoria | Altura Aproximada (unidades) | Largura / Pista | Papel na Leitura Visual |
| --- | :---: | :---: | --- |
| **Dinossauro Jogável (37 espécies)** | `1.5u – 2.6u` | `0.8u – 1.4u` | Foco central da câmera; silhueta nítida acima da linha do chão |
| **Obstáculos de Pista (Cactos, Rochas, Troncos)** | `0.8u – 2.2u` | `0.7u – 1.8u` | Contraste alto contra o piso; altura indica se é pulável ou exige `duck`/`slide` |
| **Obstáculos Aéreos (Pterossauros / Drones)** | `y = 1.4u – 2.4u` | `1.2u – 1.8u` | Exige abaixar (`duck`) ou trocar de pista |
| **Coletáveis (Ovos, Frutas, Caixas Power-up)** | `0.6u – 1.1u` | `0.6u – 0.8u` | Brilho emissivo e rotação contínua para atrair o olhar |
| **Bosses (14 chefes)** | `3.8u – 6.2u` | `2.6u – 4.8u` | Presença imponente no fundo da pista; partes destrutíveis visíveis |
| **Cenário / Parallax 3D** | `4.0u – 28.0u` | Fora das 3 pistas | Instanciado via `InstancedMesh` (`SceneryInstancer.js`), saturação reduzida para não competir com a pista |

---

## 3. Paleta, Contraste e Variantes por Bioma

### Regra de Contraste Jogador vs. Pista vs. Fundo
- **Jogador (Dinossauros):** Cores primárias saturadas (`#16a34a`, `#dc2626`, `#2563eb`, `#eab308`, etc.) com barriga/detalhes secundários mais claros ou escuros (`darkenHex(primary, 0.22)`).
- **Variantes de Skin (`DinoFactory.js`):**
  - `normal`: paleta nativa da espécie (`roughness: 0.65`, `metalness: 0.08`).
  - `shiny`: acabamento metálico dourado/brilhante (`metalness: 0.58`, `roughness: 0.22`, emissivo `#fde047` suave).
  - `mecha`: blindagem cromada (`metalness: 0.78`, `roughness: 0.26`, emissivo ciano `#0ea5e9`).
  - `secret`: aura púrpura mística (`emissive: #a855f7`, `emissiveIntensity: 0.36`).
- **Biomas (19 biomas):** O terreno e o parallax usam tons terrosos/atmosféricos dessaturados; obstáculos letais carregam acentos quentes (vermelho, laranja, neon tóxico) para telegrafia instantânea em alta velocidade.

---

## 4. Regras de Silhueta

1. **Reconhecimento em 100ms:** Cada grupo de dinossauros possui traço anatômico distinto na silhueta:
   - *Terópodes (T-Rex, Raptor, Spino)*: postura bípede inclinada, cauda contrabalanceada, cristas/velas dorsais.
   - *Ceratopsídeos / Estegossauros / Anquilossauros*: postura quadrúpede baixa, escudo cefálico com chifres, placas dorsais ou clava caudal.
   - *Saurópodes (Brachio, Diplodocus, Argentino)*: pescoço longo articulado e torso elevado.
   - *Voadores (Pteranodon, Quetzal, Tapejara, Dimorphodon)*: envergadura ampla com asas em 2 articulações (`hip` + `outer`).
   - *Aquáticos (Mosasaurus, Elasmosaurus, Dunkleosteus, Liopleurodon)*: corpo hidrodinâmico com 4 nadadeiras em remo (`isFlipper`).
2. **Expressão Facial Legível:** Olhos (`eyeGroups`) e sobrancelhas (`browGroups`) reagem dinamicamente a pulo, dash, rugido, dano e vitória.

---

## 5. Orçamento de Triângulos & Performance

Como cada cubo (`BoxGeometry(1, 1, 1)`) possui exatamente **12 triângulos**, o orçamento é altamente previsível e otimizado para 60 FPS em desktop e ≥ 30 FPS em mobile:

| Ativo | Quantidade de Modelos | Voxels / Meshes | Triângulos Medidos (Mín – Máx) | Média | Orçamento Máximo Permitido |
| --- | :---: | :---: | :---: | :---: | :---: |
| **Dinossauros (`DinoFactory.js`)** | 37 | 32 – 56 | `384 – 672` tris | `537` tris | `<= 900` tris / dino |
| **Bosses (`BossModels.js`)** | 14 | 20 – 49 | `240 – 588` tris | `357` tris | `<= 1.200` tris / boss |
| **Props & Obstáculos (`VoxelLibrary.js`)** | 6+ tipos | 5 – 15 | `60 – 180` tris | `~110` tris | `<= 300` tris / prop |
| **Cena Completa em Corrida** | — | — | `~9.270` tris (baseline) | — | `<= 25.000` tris / frame |
| **Draw Calls por Frame** | — | — | `~151` calls (baseline) | — | `<= 250` draw calls |

---

## 6. Contratos de Animação e Fases de Boss

### 6.1 `DinoAnimator.js`
`DinoAnimator.update(dt, state)` aceita:
```js
{
  speed, grounded, vy, ducking, sliding, swimming,
  dead, victory, hurt, locomotion, diveDepth,
  forceLand, giantScale, laneLean
}
```
- **`victory`**: pulo rítmico celebratório, braços/asas erguidos, cauda abanando, pescoço erguido e rugido triunfante.
- **`hurt`**: reação de impacto com tremor lateral (`rig.position.x`), recuo de torso/pescoço, mandíbula aberta em susto, olhos espremidos e piscar de invulnerabilidade (`hurtTimer`).
- **`dead`**: tombamento lateral progressivo (`deathProgress`).
- **Locomoções**: `'land'` (bípede/quadrúpede/multi-pernas), `'aquatic'` (nado em S + nadadeiras) e `'flying'` (batida de asa em 2 juntas).

### 6.2 `BossModels.js` — Fases Visuais (`setPhase(1 | 2 | 3)`)
`buildBossModel(bossId)` retorna `{ root, phase, setPhase(phase), setPhaseVisuals(hpRatio), updateAnimation(t, dt, animName) }`:
- **Fase 1 (`setPhase(1)`)**: Boss intacto, todas as partes destrutíveis visíveis, emissivo base (`0.25`), sem rachaduras, aura oculta.
- **Fase 2 (`setPhase(2)`)**: Metade das partes destrutíveis quebradas, rachaduras/cicatrizes visíveis, emissivo elevado (`1.05`), aura de energia inicial (`45%` opacidade).
- **Fase 3 (`setPhase(3)`)**: Todas as partes destrutíveis quebradas, rachaduras visíveis, emissivo máximo (`1.85`), aura de fúria em intensidade total.

---

## 7. Galeria de Modelos (`src/models/ModelGallery.js`)

Módulo independente que exporta `openModelGallery(container, onClose)` para inspeção visual de:
- Todos os **37 dinossauros** com troca de animação (`idle`, `run`, `jump`, `duck`, `slide`, `swim`, `fly`, `hurt`, `victory`, `dead`) e variante (`normal`, `shiny`, `mecha`, `secret`).
- Todos os **14 bosses** com troca de fase (`1`, `2`, `3`) e animações (`idle`, `roar`, `bite`, `tail_sweep`).
- Props da `VoxelLibrary.js`.
- Telemetria em tempo real de voxels e triângulos por modelo.
