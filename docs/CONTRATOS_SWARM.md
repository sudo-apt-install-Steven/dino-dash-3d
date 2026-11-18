# Contratos de Dados & Fronteiras de Arquivos — Swarm (Fases 3, 4, 5 e 6)

> Definido pelo **Orquestrador** antes da execução paralela. Nenhum agente pode editar arquivos fora do seu escopo sem avisar no quadro do swarm.

---

## 1. Mapa de Donos de Arquivos (Zero Colisão)

| Agente | Branch | Escopo Exclusivo de Arquivos |
| --- | --- | --- |
| `artista3d` | `evolucao/fase-3-arte` | `src/models/**`, `src/dinos/DinoFactory.js`, `src/dinos/DinoAnimator.js`, `src/events/BossModels.js`, `docs/ARTE.md`, `docs/antes-depois/**` |
| `gameplay` | `evolucao/fase-4-conteudo` | `src/content/**`, `src/events/BossManager.js`, `src/events/AdvancedEvents.js`, `src/systems/Metagame.js`, `src/game/Game.js`, `src/ui/PartyModals.js`, `docs/CONTEUDO.md` |
| `uiux` | `evolucao/fase-5-mobile-web` | `src/styles/**`, `src/ui/HUD.js`, `src/systems/PerfMonitor.js`, `public/manifest.webmanifest`, `public/sw.js`, `public/icons/**`, `docs/mobile/**` |
| `mobile` | `evolucao/fase-6-expo` | `mobile/**` (Expo TypeScript + WebView bridge + PoC `expo-gl` + `mobile/README.md`) |
| `qa` | (leitura/validação) | `tests/**` (validação de build, unitários, Playwright, verificação cruzada) |

---

## 2. Contratos de Dados Compartilhados

### 2.1 Contrato de Animação & Modelos (`artista3d` ↔ `gameplay`)
- `DinoAnimator.update(dt, state)` aceita:
  - `state`: `{ speed, grounded, vy, ducking, sliding, swimming, dead, victory, hurt, locomotion, diveDepth, forceLand, giantScale, laneLean }`
- `BossModels.buildBossModel(bossId)` retorna `{ root: THREE.Group, setPhase?: (phase: 1 | 2 | 3) => void }` para suportar visual distinto nas 3 fases do boss sem quebrar chamadas legadas.
- Galeria de Modelos (`src/models/ModelGallery.js`) exporta `openModelGallery(container, onClose)` como módulo independente.

### 2.2 Contrato de Conteúdo Data-Driven (`gameplay`)
- `src/content/balance.json`: concentra multiplicadores globais (velocidade, aceleração, recompensas de boss, XP).
- `src/content/bosses.json`: lista de bosses com `{ id, name, biomeId, hp, phases: [{ hpThreshold, pattern, telegraphSec }], rewardEggs }`.
- `src/content/missions.json`: missões diárias, semanais e campanha `{ id, scope, title, target, metric, rewardEggs }`.
- `src/content/seasonal_events.json`: eventos por intervalo de data `{ id, name, startMM, startDD, endMM, endDD, accent, bonusMult }`.

### 2.3 Contrato de HUD & Qualidade Adaptativa (`uiux` ↔ `gameplay`)
- `HUD.js` mantém todos os IDs existentes (`#touch-controls`, `#hud-bottom-bar`, `#hud-predator-intro`, `#touch-attack-btn`, `#touch-ability-btn`, `#touch-radial-btn`, `#touch-fury-btn`, `#touch-item-btn`, `#touch-transmute-btn`).
- `PerfMonitor.js` expõe preset de qualidade `'auto' | 'low' | 'medium' | 'high'` e ajusta `renderer.setPixelRatio` / densidade de partículas automaticamente sem alterar física.

### 2.4 Contrato WebView Bridge (`mobile` ↔ Web App)
Mensagens JSON via `window.ReactNativeWebView?.postMessage(JSON.stringify({ type, payload }))`:
- Web → Expo: `HAPTIC_IMPACT` (`light|medium|heavy`), `SHARE_SCORE` (`{ score, biome }`), `SAVE_SYNC` (`{ snapshot }`), `SCHEDULE_DAILY_REMINDER` (`{ hour, minute }`), `SET_ORIENTATION` (`landscape|portrait|auto`).
- Expo → Web: `NATIVE_READY`, `OFFLINE_STATUS` (`{ online: boolean }`), `DEEP_LINK` (`{ room, transport }`).
