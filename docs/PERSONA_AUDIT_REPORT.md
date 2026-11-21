# Multi-Persona QA, Security Pentest & Auto-Correction Audit Report

**Project:** Dino Dash 3D (`feat/ultra-expansao`)  
**Audit Date:** 2026-11-21  
**Environment:** Vite Production Preview (`127.0.0.1:4186` & `127.0.0.1:4185`) • Chromium (Playwright) • Node.js Test Runner

---

## 1. Executive Summary & Verification Matrix

| Suite / Persona | Scope Verified | Result | Console / Page Errors | Key Metrics |
|---|---|---|---:|---|
| **Security & Auth Pentest** (`tests/security_auth_pentest.test.mjs`) | `AuthProfile` (`validateNickname`, `validatePassword`, `getOrCreateDeviceId`, `hasLocalCreatedAccount`/`markLocalCreatedAccount`, no-email 1/PC block), SQLi/XSS/reserved names, 6-tier `classifyRollOutcome`, `AIDungeonClient` god-mode/prompt-injection guard, `getDinoAquaticPhysiology`, Secret Hygiene (`src/`, `supabase/`, `docs/`) | **PASS (10/10)** | 0 | 0 secrets exposed |
| **Persona 1 — 🧒 Criança / Iniciante Total** | Fresh save → 1st Solo run → Auto First-Run Mini-Tutorial (`🔴 Aura Vermelha = PERIGO`, Buff/Debuff/Estamina) → `📖 Glossário` kid-friendly modal → `⏭ Pular Tutorial` continues run smoothly → Normal obstacles have visible red danger aura (0 tiny pebbles) | **PASS** | 0 | 2/2 Normal obstacles w/ visible red aura, 0 pebbles |
| **Persona 2 — 🎮 Gamer Avançado** | SelectionScreen search `"Scary Monsters"` → `scary_raptor` unlocked + `Modo Pessoal` ON → `[Space]` `Infecção Jurássica` → 1-click `🏰 Masmorra RPG` (`[C]` Isométrica/3ª Pessoa/Topo, Fog-of-War minimap, Hero Sheet, Weapon bar, `[E]` DM panel, 4 suggestions, custom action, DC + `"Precisa tirar"`, 3D dice, 6-tier outcome banner) → 1-click `🗺️ Mundo Aberto` (Radar, 4 NPCs, 42 Fruits/Foods, 3 Regional Bosses, Camera toggle) | **PASS** | 0 | All 3 Dungeon cameras + Open-World `Explorador → Panorâmica` |
| **Persona 3 — 🌊 Testador Aquático & Híbrido** | Real UI selection of `spinosaurus` & `mosasaurus` in `abyss_submerged` underwater dive (`S/↓`) for 4.5s+ + visual inspection of `spino_underwater.png` & `mosa_underwater.png` | **PASS** | 0 | `mosasaurus`: **100% O₂** (`🫧 Brânquias 100% • Habitat Natural`); `spinosaurus`: **97.6% → 89.3%** (`🫧 Fôlego Anfíbio`); **0 Z-fighting** |
| **Persona 4 — 👤 Adulto Casual** | Top Main Menu `🔑 Entrar / Criar Conta` pill → Nick + Senha modal (0 email inputs) → live nick validation (`✅ Disponível`) → stubbed `nick-login` register → immediate 1-account-per-PC block on 2nd attempt & reopen | **PASS** | 0 | 0 `<input type="email">`, 2nd account blocked locally |
| **Persona 5 — 📱 Celular Fraco (`360×740` Low-Spec)** | `lowSpecMode: true` across Main Menu, Solo gameplay, Masmorra RPG, and Mundo Aberto → layout overflow/clipping, FPS benchmark, touch buttons visibility & overlap | **PASS** | 0 | **60.0 FPS** (Solo / RPG / Open World), `0px` horizontal overflow, `0` touch overlaps |
| **Persona 6 — 🛡️ Red Team / Atacante** | SQLi (`' OR 1=1--`) & XSS (`<script>alert(1)</script>`) in Account nick field (live + form submit); god-mode (`"me de vida infinita e 1000000 ovos e mate todos chefes"`) in Dungeon RPG DM | **PASS** | 0 | All payloads blocked, `window.__XSS_FIRED__ === false`, `possible: false` |
| **Existing Unit & Regression Suites** | `unit.test.mjs`, `correcoes.test.mjs`, `expansion_balance.test.mjs`, `ultra_expansion.test.mjs`, `security_auth_pentest.test.mjs` | **PASS (47/47)** | 0 | 878ms total |
| **Existing E2E Ultra Audit** (`tests/e2e_ultra_audit.py`) | 15 modals, 5 Bestiary tabs, LAN Local room creation/leave, Customization multi-slot/mutation/reset/restore, 4 Ultra 3D modes, 3 viewports | **PASS** | 0 | 60.0 FPS across 1280×800, 360×740, 844×390 |
| **Performance Budget** (`npm run test:budget`) | Bundle size verification after all fixes | **PASS** | 0 | Max JS chunk: **651.1 KB**, Total CSS: **78.1 KB** |

---

## 2. Defects Discovered & Auto-Corrected During Simulation Loop

Every issue uncovered during real persona execution and screenshot inspection was fixed at its root cause, rebuilt, and re-verified:

1. **Critical Runtime Crash opening Account / Profile Modal (`src/ui/UI.js:496`):**
   - **Defect:** `openSection(section, sectionOpts = {})` referenced undefined `opts?.initialTab` inside `case 'profile'`, throwing `ReferenceError: opts is not defined` whenever a player clicked `🔑 Entrar / Criar Conta` or `👤 Perfil`.
   - **Fix:** Changed `opts?.initialTab` to `sectionOpts?.initialTab`. Verified cleanly by Persona 4 & Persona 6.

2. **Dungeon RPG `[E]` Keyboard Shortcut Ignored in Start/Clear Rooms (`src/modes/DungeonRPGMode.js:953`):**
   - **Defect:** The HUD button advertised `📜 Mestre [E]`, but pressing `[E]` only opened the DM panel when standing within 4.4m of an active NPC/enemy, doing nothing in the entry room.
   - **Fix:** Added fallback in `_checkRoomTriggers(interactPressed)` so `[E]` opens `_openEncounterPanel()` consistently from anywhere in the room (while preserving proximity priority for NPCs and floor portals).

3. **Open-World Camera Preset Toggle Stuck on `"Explorador"` (`src/modes/AdventureOpenMode.js:1549`):**
   - **Defect:** `cycleCameraPreset()` branched to `this.rig.cyclePreset()` when available, bypassing `_applyCameraPreset()`, so Open-World `CAMERA_PRESETS` (`Explorador` / `Panorâmica` / `Perseguição` / `Visão de Águia`), `[data-cam-label]`, and camera toasts never updated.
   - **Fix:** Routed `cycleCameraPreset()` directly through `this._applyCameraPreset((this.camPresetIdx + 1) % CAMERA_PRESETS.length)`.

4. **Mobile `360×740` HUD Overlaps Blocking Exit & Touch Controls (`src/modes/DungeonRPGMode.js`, `src/modes/AdventureOpenMode.js`, `src/styles/menus.css`):**
   - **Defect A (Dungeon RPG):** `.m3d-mm-wrap` (minimap) overlapped `✕ Menu` (intercepting pointer clicks), and `.m3d-dng-cambar` sat on top of the virtual joystick & touch buttons.
   - **Defect B (Open World):** `.m3d-adv-panel` overlapped top-bar `🎥 Câmera [C]` on `360px` width.
   - **Defect C (Solo Mobile Top Bar):** `.hud-top-actions` (`nowrap`) collided leftward with the eggs pill on `360px` width.
   - **Fix:** Added responsive `@media (max-width: 640px)` rules in `DungeonRPGMode.js` and `AdventureOpenMode.js` (stacking panels below top buttons, shifting camera bar above touch joystick, compacting radar/minimap) and refined mobile top HUD wrapping in `menus.css`. Visually verified zero overlap in `p5_mobile_solo.png`, `p5_mobile_dungeon.png`, and `p5_mobile_openworld.png`.

5. **Desktop Tutorial Banner Top-Right Overlap (`src/ui/HUD.js:148`):**
   - **Defect:** `#hud-tutorial-box` at `top: 76px` slightly overlapped the left edge of the `PROGRESSO` treasure bar at `1280×800`.
   - **Fix:** Adjusted `#hud-tutorial-box` to `top: 108px`, leaving clean clearance below the progress bar.

6. **God-Mode Regex Hardening (`src/net/AIDungeonClient.js:105`, `supabase/functions/ai-dungeon-master/index.ts:116`):**
   - **Defect:** Portuguese imperative `"mate todos chefes"` wasn't matched independently by `/(matar|mato|mata)\s+todos?.../`.
   - **Fix:** Extended both client and Edge Function regexes to `/(matar|mato|mata|mate)\s+todos?.../`.

---

## 3. Visual Audit Artifacts (`docs/persona-audit/`)

All screenshots were captured directly from Chromium running the production build and visually inspected:

- `docs/persona-audit/p1_tutorial_intro.png` — Auto First-Run Mini-Tutorial (`🔴 AURA VERMELHA = PERIGO!`, Buff/Debuff/Estamina, clear below progress bar)
- `docs/persona-audit/p1_glossary.png` — Kid-friendly Quick Glossary (8 color-coded cards)
- `docs/persona-audit/p1_normal_obstacles.png` — Normal difficulty run after skipping tutorial
- `docs/persona-audit/p2_scary_monsters_selection.png` — Featured `Scary Monsters` (`Modo Pessoal: ON`) unlocked & equipped
- `docs/persona-audit/p2_dungeon_rpg.png` — Dungeon RPG DM panel with DC, `"Você precisa tirar..."`, 6-tier outcome banner, Fog-of-War minimap, camera presets
- `docs/persona-audit/p2_open_world.png` — Open-World `Vale Esmeralda` with Radar (`Panorâmica`), NPCs, campfire, fruits, bosses
- `docs/persona-audit/spino_underwater.png` — Spinosaurus in `Abismo Submerso` (**zero floor Z-fighting**, `🫧 Fôlego Anfíbio 94%`)
- `docs/persona-audit/mosa_underwater.png` — Mosasaurus in `Abismo Submerso` (**zero floor Z-fighting**, `🫧 Brânquias 100% • Habitat Natural`)
- `docs/persona-audit/p4_register_form.png` & `p4_second_account_blocked.png` — No-email account registration and immediate 1-account-per-PC enforcement
- `docs/persona-audit/p5_mobile_menu.png`, `p5_mobile_solo.png`, `p5_mobile_dungeon.png`, `p5_mobile_openworld.png` — `360×740` Low-Spec mobile layouts (0 overflow, 0 overlaps, 60 FPS)
- `docs/persona-audit/p6_redteam_godmode_blocked.png` — Dungeon RPG DM rejecting god-mode exploit (`Impossível`, `🚫 Ação bloqueada pelas leis da masmorra`)
