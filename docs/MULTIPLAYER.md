# Arquitetura Multiplayer — Dino Dash 3D

> Documento técnico de referência para modos de pista, sincronização Host–Convidado, câmera e regras de reviver (B4 & B5).

## 1. Modos de Pista Multiplayer (`trackMode`)

Configurável na criação da sala (`room.config.trackMode`) e com fallback em `Save.data.settings.mpTrackMode`:

| Modo | Comportamento Visual | Colisão entre Jogadores | Colisão com Obstáculos | Câmera |
| --- | --- | --- | --- | --- |
| **`parallel` (Padrão)** | Cada jogador corre em sua própria pista clonada lateralmente (`0, +24, -24, +48, ...`) com a mesma seed e obstáculos espelhados via `InstancedMesh` em `World.js`. | Nenhuma (pistas isoladas) | Isolada por pista (`pBox` deslocado por `-trackOffsetX` e `obs._hitBy` por jogador). | Foco exclusivo no jogador local e sua pista. |
| **`ghost`** | Todos na mesma pista; aliados aparecem semitransparentes (`opacity: 0.42`, `depthWrite: false`) e o jogador local sólido (`opacity: 1.0`). | Nenhuma | Independente por jogador (`obs._hitBy`). | Foco no jogador local. |
| **`classic`** | Todos na mesma pista, modelos sólidos, comportamento clássico. | Conforme modo (`pvp`, `capture_egg`, etc.) | Compartilhada na pista. | Compartilhada ou tela dividida (`split_h` / `split_v`). |

## 2. Sincronização Host ↔ Convidado (Mapa, Bioma & Obstáculos)

Para eliminar dessincronização entre o que o Host calcula e o que o Convidado enxerga:

1. **Host (`Game.js` ~18 Hz):**
   - Inclui no `state_snapshot`: `biomeId`, `trackMode`, `obstacles: this.spawner.serializeActiveObstacles()` (`{ uid, kind, x, y, z, hit }`), `boss` e estado completo de cada jogador (`trackOffsetX`, `oxygen`, `diveDepth`, `reviveWindowTimer`, `reviveCount`, `reviveCooldown`).
2. **Convidado (`_applyGuestSnapshot` & `Spawner.syncFromHostObstacles`):**
   - Se `biomeId !== currentBiome.id`, aplica o bioma e tema imediatamente.
   - Ativa `spawner.remoteSyncMode = true` (desabilita spawn local aleatório no convidado).
   - Sincroniza os obstáculos por `uid` e avança `z += (speed + extraSpeed) * dt` suavemente a 60 FPS entre snapshots.

## 3. Regras de Morte e Reviver (`V`)

Definidas em `balance.json` (`revive`) e configuráveis por sala (`multiplayerSession.reviveConfig`):

- **Aviso de queda:** Ao morrer, todos os vivos recebem `"<Nick> caiu!"` e a dica `"Pressione V para reviver <Nick>"` (ou botão touch contextual `#touch-revive-btn`).
- **Custo (`costType: "life_or_shield"`):** Consome **1 Escudo** se o revivente tiver, ou **1 Vida** (desde que tenha `hp > 1`; nunca sacrifica a última vida).
- **Cooldown pessoal:** `25s` por jogador revivente (`reviveCooldown`).
- **Janela de reviver:** `15s` após a morte (`reviveWindowTimer`); expirada a janela, o jogador permanece em modo espectador até o fim da rodada.
- **Limite por corrida:** Máximo de `2` revives por jogador caído (`reviveCount < 2`).
- **Pós-revive:** O aliado retorna na própria pista (`trackOffsetX + LANE_X[lane]`), com `1 ❤️`, `100% O₂` e `2.5s` de invulnerabilidade (`invulnTimer = 2.5`).
