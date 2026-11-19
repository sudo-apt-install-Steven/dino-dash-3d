# Changelog — DINO DASH 3D

Todas as mudanças relevantes da Missão de Evolução Total estão documentadas abaixo.

## [1.2.0] — 2026-11-18 (Evolução Fases 0 a 8)

### Adicionado
- **Fase 0 (Auditoria & Baseline):** `docs/AUDIT.md`, `docs/PLANO.md` e 11 screenshots baseline (`docs/baseline/`).
- **Fase 1 (Estabilização & Performance):**
  - *Fixed timestep* de `1/60s` no loop de simulação (`src/game/Game.js`).
  - *Code splitting* em `vite.config.js` (`vendor-three`, `vendor-net`, `index`).
  - Suíte de testes unitários (`tests/unit.test.mjs`), E2E (`tests/e2e_smoke.py`) e CI (`.github/workflows/ci.yml`).
- **Fase 2 (Segurança):**
  - Atualização para Vite `^8.3.8` (`0` vulnerabilidades de produção em `npm audit --omit=dev`).
  - `SECURITY.md`, `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/security.yml`, `docs/SEGURANCA.md` e `NEEDS_FROM_STEVEN.md`.
- **Fase 3 (Modelos, Arte e Animação):**
  - Guia de arte e orçamento de triângulos em `docs/ARTE.md` + comparativos em `docs/antes-depois/`.
  - `setPhase(1|2|3)` nos 14 bosses (`src/events/BossModels.js`).
  - Animações `hurt` e `victory` em `src/dinos/DinoAnimator.js`.
  - Galeria interativa de modelos 3D (`src/models/ModelGallery.js`) acessível em `/debug/models` ou `/?debug=models`.
- **Fase 4 (Conteúdo Data-Driven):**
  - Catálogos JSON em `src/content/` (`balance.json`, `bosses.json`, `missions.json`, `seasonal_events.json`) + `ContentLoader.js`.
  - 3 fases de boss com telegrafia visual nas pistas (`BossManager.js`), revanche mantendo sala/config, resumo detalhado pós-partida e câmera livre de espectador (`PartyModals.js`, `Game.js`).
- **Fase 5 (Responsividade & Mobile Web):**
  - Ergonomia touch 64–72px dividida esquerda/direita com `safe-area-inset` e `.hud-bottom-bar` centralizada.
  - Qualidade gráfica adaptativa por FPS (`auto`, `low`, `medium`, `high`) em `PerfMonitor.js`.
  - PWA instalável com `icon-192.png`, `icon-512.png` e Service Worker `v7` offline (`public/sw.js`).
- **Fase 6 (App Expo Go em `/mobile`):**
  - App Expo SDK 58 + TypeScript com Etapa A (`WebViewGame.tsx` + bridge `expo-secure-store`, haptics, share, notificações, orientação, offline) e Etapa B (`NativeDinoPoc.tsx` em `expo-gl`).
- **Fase 7 & 8 (Qualidade Final & Release):**
  - Internacionalização (`pt-BR`, `en`, `es`) em `src/i18n/translations.js`.
  - Telemetria anônima opt-in + Painel de Erros em `src/systems/Telemetry.js` e `SettingsModal.js`.
  - Verificador de orçamento de bundle no CI (`tests/perf_budget.mjs`).
  - Documentação `docs/ARQUITETURA.md`, `docs/DECISOES.md` e `docs/RELATORIO_FINAL.md`.

### Corrigido
- Conflito de setas (`ArrowKeys`) entre P1 e P2 no modo multiplayer local no mesmo teclado (`Game.js`).
- Roteamento de comandos de convidados no multiplayer online/LAN e preservação de inputs de texto durante auto-refresh do lobby (`MultiplayerLobby.js`, `RoomClient.js`).
- Paridade de metadados (`roomName`, `maxPlayers`, `hasPassword`) em `TransportSupabase.js`.
