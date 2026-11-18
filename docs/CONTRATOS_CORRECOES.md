# Contratos & Fronteiras de Arquivos — Swarm `PROMPT_CORRECOES_DINO_DASH_3D.md`

> Nenhum worker pode tocar em arquivos fora do seu escopo exclusivo.

## 1. Escopo Exclusivo por Worker

| Worker | Branch | Arquivos Exclusivos |
| --- | --- | --- |
| `combat_events` | `fix/b0-b3-combat-events` | `src/ui/DebugModal.js`, `src/content/balance.json`, `src/content/ContentLoader.js`, `src/events/BossManager.js`, `src/events/EventManager.js`, `src/events/CoreEvents.js`, `src/events/WorldEvents.js`, `src/events/AdvancedEvents.js`, `docs/BOSS.md`, `docs/EVENTOS.md` |
| `mp_water_core` | `fix/b4-b7-mp-water-core` | `src/game/Game.js`, `src/world/World.js`, `src/world/TrackChunks.js`, `src/systems/CameraRig.js`, `docs/MULTIPLAYER.md`, `docs/bugs/agua/**` |
| `ui_mobile_menus` | `feat/b8-d1-d5-ui-mobile` | `src/ui/HUD.js`, `src/ui/MultiplayerLobby.js`, `src/ui/SettingsModal.js`, `src/ui/Menus.js`, `src/styles/menus.css`, `src/styles/main.css` |
| `accounts_save_ach` | `feat/d2-d4-d6-d8-accounts` | `src/content/achievements.json`, `src/systems/Achievements.js`, `src/systems/AuthProfile.js`, `src/systems/Save.js`, `src/ui/ProfileModal.js`, `src/ui/AchievementsModal.js`, `src/ui/SaveModal.js`, `src/ui/LegalModal.js`, `src/ui/UI.js`, `supabase/migrations/2026111801_accounts_profiles_achievements.sql`, `supabase/functions/nick-login/index.ts`, `NEEDS_FROM_STEVEN.md` |
| `art_dinos` | `feat/part-e-dinos-anim` | `src/dinos/DinoFactory.js`, `src/dinos/DinoAnimator.js`, `src/models/ModelGallery.js`, `docs/DECISOES.md`, `docs/bugs/dinos/**` |
| `bughunt_qa` | (inherit) | `docs/BUGS.md`, `docs/COBERTURA_REVISAO.md`, `docs/RELATORIO_CORRECOES.md`, `tests/correcoes.test.mjs`, `tests/redteam_fuzz.py` |

## 2. Contratos de Integração
1. **`balance.json` & `ContentLoader.js` (`combat_events`):**
   - `balance.json` inclui blocos `bossCombat` (`targetDurationSec: { easy: 52, normal: 75, hard: 105 }`, `vulnerabilityWindowSec: 4.5`, `idleBetweenAttacksSec: 1.4`), `playerAttack` (`damage: 28`, `cooldownSec: 0.65`, `rangeZ: 18`, `rangeX: 2.6`, `hitStopSec: 0.045`), `eventScheduler` (`firstEventMinScore: 1600`, `firstEventMaxScore: 2600`, `intervalMinScore: 1600`, `intervalMaxScore: 3600`, `maxConcurrent: 1`), `revive` (`costType: "life_or_shield"`, `cooldownSec: 25`, `windowSec: 15`, `maxPerRun: 2`, `invulnSec: 2.5`), `oxygen` (`drainPerSec: 7.5`, `rechargePerSec: 38`, `lowThreshold: 30`, `graceSec: 2.0`, `drownDamagePerTick: 1`).
2. **`DebugModal.js` (`combat_events` ↔ `mp_water_core`):**
   - `DebugModal.mountIfDev(game)` só ativa quando `import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === '1'`. Em produção (`import.meta.env.PROD`), retorna `null` sem montar DOM.
3. **`HUD.js` (`ui_mobile_menus` ↔ `mp_water_core`):**
   - `hud.setContextualTouchState({ canAttackBoss, reviveTargetNick, canBreathe, attackCooldownPct, oxygenPct })` mostra/oculta botões touch contextuais (`#touch-revive-btn`, `#touch-breathe-btn`, destaque em `#touch-attack-btn`) e atualiza alerta progressivo de O2.
4. **`Menus.js` ↔ `UI.js` (`ui_mobile_menus` ↔ `accounts_save_ach`):**
   - `Menus.js` inclui botões com `data-nav="profile"`, `data-nav="achievements"` e `data-nav="save_data"`. `UI.js` abre `ProfileModal`, `AchievementsModal` e `SaveModal` para esses `data-nav`.
