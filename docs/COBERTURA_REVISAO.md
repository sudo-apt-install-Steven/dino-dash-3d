# Cobertura de Revisão Total (C1 & C3) — DINO DASH 3D

> Responsável: `@bughunt_qa` (Auditoria + Red Team + Revisor)
> Meta C2.4: 100% dos arquivos de código do repositório mapeados e auditados nos 12 domínios de C1, com todas as perguntas do checklist C3 respondidas.

---

## 1. Cobertura de Arquivos por Domínio (C1 — 100%)

### Domínio 1: Orquestrador & Infraestrutura / Config
- `package.json` — Scripts (`dev`, `host`, `build`, `preview`, `test:unit`, `test:budget`), dependências (`three`, `@supabase/supabase-js`, `qrcode`, `ws`, `vite`).
- `vite.config.js` — Build Vite e chunking.
- `index.html` — Shell HTML, metadados PWA e mount points.
- `vercel.json` — Headers de segurança e roteamento SPA.
- `src/main.js` — Bootstrap da aplicação, roteamento `?debug=models`, inicialização de `Game` e tratamento global de erros.

### Domínio 2: Lógica Core
- `src/game/Game.js` — Game loop (`dt` clampado em `0.05s`), física, colisão, pontuação, pausa (`visibilitychange`, `KeyP`), reinício, ataque `Q`, reviver `V`, oxigênio, multiplayer. (**Bugs:** `BUG-B2-01`, `BUG-B4-01`, `BUG-B4-02`, `BUG-B5-01`, `BUG-B6-01`)
- `src/game/Difficulty.js` — Presets `easy`, `normal`, `hard`, `insane` (`minSafePaths`, `showRedHazardSignage`).
- `src/game/Modes.js` — 17 modos de jogo (`solo`, `coop`, `pvp`, `zen`, `capture_egg`, `teacher`, etc.).
- `src/systems/PhysicsCollision.js` — AABB/hitbox de obstáculos e jogadores.
- `src/systems/Spawner.js` — Pool e spawn de obstáculos, moedas/ovos, bolhas de oxigênio, sync de obstáculos no MP. (**Bug:** `BUG-B4-02`)
- `src/systems/ObjectPool.js` — Reutilização de objetos sem alocação contínua.
- `src/systems/Input.js` — Teclado P1/P2, gamepad, atalhos (`KeyQ`, `KeyV`, `KeyP`, etc.).

### Domínio 3: Combate & Boss
- `src/events/BossManager.js` — 14 bosses, fases 1/2/3, ataques telegrafados, `weakOrb`, dano e recompensas. (**Bugs:** `BUG-B1-01`, `BUG-C3-02`)
- `src/events/BossModels.js` — Modelos voxel dos bosses com `setPhase(1|2|3)`.
- `src/events/PredatorSystem.js` — Predadores perseguidores, intros e retorno em emboscada dupla.
- `src/events/PredatorModels.js` — Modelos voxel dos predadores.
- `src/dinos/DinoAbilities.js` — Habilidades especiais por espécie e limpeza de ondas (`dispose()`).
- `src/systems/StatusSystem.js` — Fraquezas elementais de boss, veneno, lama, status temporários.

### Domínio 4: Eventos & Progressão
- `src/events/EventManager.js` — Agendador de eventos, catálogo e modos. (**Bugs:** `BUG-B3-01`, `BUG-C3-03`)
- `src/events/CoreEvents.js` — Meteoros, manada de herbívoros, bando de pterodáctilos, mercador.
- `src/events/WorldEvents.js` — Terremoto, tsunami, estampida reversa, enigma das ruínas, nevoeiro, tempestade magnética, enxame aéreo, chuva de cristais, gravidade lunar, duelo NPC.
- `src/events/AdvancedEvents.js` — Fase de voo e corredor de lava.
- `src/events/UfoEvent.js` — Minigame OVNI com escape (`mashBreak`).
- `src/content/balance.json` — Balanceamento centralizado (`bossCombat`, `playerAttack`, `eventScheduler`, `revive`, `oxygen`).
- `src/content/bosses.json` — Definições data-driven de bosses e fases.
- `src/content/missions.json` — Missões de campanha e semanais.
- `src/content/seasonal_events.json` — Eventos sazonais por data.
- `src/content/achievements.json` — 65 conquistas data-driven nas 9 categorias + 4 tiers de troféus.
- `src/content/ContentLoader.js` — Validação e leitura de conteúdo JSON.
- `src/systems/Achievements.js` — Sistema de conquistas, toast enfileirado e anti-exploit (`debug`/`imported`).
- `src/systems/Progression.js` — Desbloqueio progressivo na corrida, níveis e XP.
- `src/systems/Cards.js` — Cartas de upgrade durante a corrida.
- `src/systems/Items.js` — Itens coletáveis e consumíveis.
- `src/systems/Metagame.js` — Campanha, missões semanais, eventos sazonais, estatísticas. (**Achado:** `BUG-C3-01`)
- `src/systems/GachaSystem.js` — Sistema de caixas fósseis e pity (desativável para ECA Digital).
- `src/systems/EconomySim.js` — Simulação de economia de ovos e cristais.

### Domínio 5: Multiplayer
- `src/net/RoomClient.js` — Gerenciamento de sala, host/guest, snapshots e eventos `mp_revive` / `pause_request`.
- `src/net/TransportLAN.js` — WebSocket LAN.
- `src/net/TransportSupabase.js` — Realtime broadcast/presence Supabase.
- `src/net/QrGenerator.js` — Geração de QR code para controle via celular.
- `server/lan-host.js` — Servidor WebSocket local para partidas LAN.
- `src/ui/PartyModals.js` — Resumo pós-partida, revanche e câmera livre de espectador.
- `src/ui/MultiplayerLobby.js` — Criação/entrada de sala e opções da sala. (**Bug:** `BUG-D1-01`)

### Domínio 6: Água & Habitats
- `src/world/World.js` — Pista, rios, ambiente submerso (`underwaterEnvGroup`, `waterSurfaceGroup`, `waterLaneGroup`). (**Bug:** `BUG-B7-01`)
- `src/world/TrackChunks.js` — Chunks procedurais terrestres, aquáticos e abissais. (**Bug:** `BUG-B7-01`)
- `src/world/Biomes.js` — 19 biomas e suas paletas/bosses.
- `src/world/Weather.js` — Clima dinâmico (vento, chuva, cinzas).
- `src/world/DayNightCycle.js` — Ciclo dia/noite, eclipse e aurora.
- `src/dinos/Companion.js` — Companheiros que coletam ovos/frutas/bolhas de oxigênio.

### Domínio 7: Render & Visual
- `src/systems/CameraRig.js` — Câmera principal, shake e suporte a multiplayer/espectador.
- `src/systems/Particles.js` — Sistema de partículas (poeira, explosões, bolhas).
- `src/world/SceneryInstancer.js` — Cenário instanciado (`InstancedMesh`) para manter >= 60 FPS.
- `src/world/BrightnessAudit.js` — Auditoria de brilho e contraste.
- `src/dinos/DinoCatalog.js` — Catálogo das 37 espécies com stats e habitats.
- `src/dinos/DinoCustomization.js` — Presets, cores, padrões e acessórios.
- `src/dinos/DinoFactory.js` — Construção voxel procedural dos 37 dinos. (**Bug:** `BUG-E-01`)
- `src/dinos/DinoAnimator.js` — Animações (`run`, `jump`, `duck`, `roar`, `victory`, `hurt`, `attack`). (**Bug:** `BUG-E-01`)
- `src/models/ClaudeVoxelModels.js` — Obstáculos voxel temáticos de boss.
- `src/models/VoxelLibrary.js` — Primitivas voxel e `weakOrb`.
- `src/models/ModelGallery.js` — Galeria interativa `?debug=models`. (**Bug:** `BUG-E-01`)
- `src/systems/PerfMonitor.js` — Monitoramento de FPS e qualidade adaptativa (`auto`/`low`/`medium`/`high`).

### Domínio 8: UI/UX
- `src/ui/HUD.js` — HUD de corrida, barra de O₂, boss bar, cooldowns, banners, pause overlay. (**Bug:** `BUG-B8-01`)
- `src/ui/Menus.js` — Menu principal e navegação. (**Bug:** `BUG-D5-01`)
- `src/ui/UI.js` — Orquestrador de telas e modais.
- `src/ui/SettingsModal.js` — Configurações de vídeo, áudio, acessibilidade e controles. (**Bug:** `BUG-D5-01`)
- `src/ui/SelectionScreen.js` — Seleção de dinossauro e bioma.
- `src/ui/CustomizationScreen.js` — Customização visual do dino.
- `src/ui/CardModal.js` — Seleção de cartas in-game.
- `src/ui/GachaModal.js` — Abertura de caixas fósseis.
- `src/ui/GuideModal.js` — Guia do jogo e controles.
- `src/ui/MetagameModal.js` — Missões, campanha e eventos sazonais.
- `src/ui/MinigamesUI.js` — Minigames rápidos.
- `src/ui/DebugModal.js` — Painel `?debug=1` (exclusivo `DEV`). (**Bug:** `BUG-B0-01`)
- `src/ui/LegalModal.js` — Termos, LGPD, ECA Digital e exclusão de dados.
- `src/ui/ProfileModal.js` — Perfil do jogador (foto dino 3D, bio, vitrine, stats, privacidade).
- `src/ui/AchievementsModal.js` — Galeria de conquistas com progresso, filtros e busca.
- `src/ui/SaveModal.js` — Interface visível de Importar/Exportar Save com preview e backup.
- `src/ui/SvgIcons.js` — Ícones vetoriais inline.
- `src/i18n/translations.js` — Traduções `pt-BR`, `en`, `es`. (**Achado:** `BUG-C3-03`)
- `src/styles/main.css` — Estilos globais e HUD.
- `src/styles/menus.css` — Estilos de menus e botões touch.

### Domínio 9: Mobile & Acessibilidade
- `src/ui/MobileController.js` — Controle remoto via celular (QR code).
- `src/styles/controller.css` — Estilos do controle remoto mobile.
- `src/ui/TvHud.js` — Modo TV com HUD ampliado.
- `src/systems/DeviceDetector.js` — Detecção de touch/mobile/desktop.
- `src/systems/OrientationManager.js` — Gerenciamento de orientação retrato/paisagem.
- `public/manifest.webmanifest` — Manifesto PWA.
- `public/sw.js` — Service Worker com cache offline.
- `public/icons/dino-icon.svg`, `public/icons/icon-192.png`, `public/icons/icon-512.png` — Ícones PWA.
- `mobile/App.tsx`, `mobile/app.json`, `mobile/package.json`, `mobile/tsconfig.json`, `mobile/index.ts`, `mobile/metro.config.js`, `mobile/.env.example`, `mobile/README.md`, `mobile/POC_COMPARATIVO.md` — App Expo Go.
- `mobile/src/components/WebViewGame.tsx`, `mobile/src/components/NativeDinoPoc.tsx`, `mobile/src/components/OfflineFallback.tsx` — Componentes Expo.
- `mobile/src/config/env.ts`, `mobile/src/services/deepLink.ts`, `mobile/src/services/notifications.ts`, `mobile/src/services/orientation.ts`, `mobile/src/services/secureStorage.ts`, `mobile/src/services/supabase.ts`, `mobile/src/types/bridge.ts` — Serviços e bridge Expo.

### Domínio 10: Save & Dados
- `src/systems/Save.js` — Persistência em 3 camadas (`localStorage`, `IndexedDB`, cookie checkpoint), `exportJson` (`schemaVersion: 4` + checksum), `importJson` (anti-prototype-pollution, backup, `imported: true`), `wipeAllLocalData`. (**Bug `BUG-D6-01` corrigido**)
- `src/systems/AuthProfile.js` — Autenticação Supabase (`nick + senha`, email, OAuth Google/Discord), perfil local/nuvem e migração convidado→conta.
- `src/systems/Replay.js` — Gravação e reprodução de ghost/replay.
- `src/systems/ClipRecorder.js` — Gravação de clipes curtos.

### Domínio 11: Backend & Segurança + Áudio/QA
- `src/security/DomainGuard.js` — Proteção de domínio permitido.
- `src/security/EdgeClient.js` — Cliente autenticado para Supabase Edge Functions.
- `src/security/Sanitize.js` — `escapeHtml`, `sanitizeNickname`, `sanitizeRoomCode`, `sanitizeRoomPassword`, `sanitizeHexColor`.
- `src/security/Watermark.js` — Marca d'água de autoria.
- `supabase/schema.sql` — Schema base SQL.
- `supabase/migrations/2026111401_authoritative_runs_and_gacha.sql` — Runs autoritativos e gacha.
- `supabase/migrations/2026111402_hardened_rooms_leaderboard_and_reports.sql` — Salas, ranking e denúncias.
- `supabase/migrations/2026111403_dual_gacha_pity_and_crystals.sql` — Pity duplo e cristais.
- `supabase/migrations/2026111801_accounts_profiles_achievements.sql` — Perfis, conquistas e RLS.
- `supabase/functions/_shared/security.ts` — Helpers de segurança (CORS, rate limit, auth).
- `supabase/functions/start-run/index.ts`, `finish-run/index.ts`, `gacha-roll/index.ts`, `room-sync/index.ts`, `submit-report/index.ts`, `wallet-sync/index.ts`, `wipe-user-data/index.ts`, `nick-login/index.ts` — Edge Functions autoritativas.
- `src/audio/AudioEngine.js`, `MusicSequencer.js`, `Narrator.js`, `SoundEffects.js` — Áudio procedural WebAudio e narrador.
- `src/systems/Telemetry.js` — Telemetria opt-in e painel de erros.
- `src/systems/BotQA.js` — Bot QA automatizado.

### Domínio 12: Testes (Red Team / QA)
- `tests/unit.test.mjs` — Testes unitários base.
- `tests/perf_budget.mjs` — Orçamento de performance e bundle size.
- `tests/e2e_smoke.py` — Smoke test E2E Playwright.
- `tests/correcoes.test.mjs` — Testes de regressão da rodada de correções (B1–B6, D4, D6).
- `tests/redteam_fuzz.py` — Fuzz/Monkey testing Playwright.

---

## 2. Respostas ao Checklist C3 (Auditoria Completa)

1. **Pausar, minimizar, trocar de aba ou segundo plano:**
   - `Game.js:275-280` registra `visibilitychange` e chama `this.togglePause(true)` quando `document.hidden` é verdadeiro. Ao retomar (`togglePause(false)`), `this.lastTime = performance.now()` evita salto de `dt`.
2. **FPS baixo ou muito alto (60/144/240 Hz) — física depende de frame rate?**
   - Não depende: `Game.js:5080` clampa `dt = Math.min(0.05, Math.max(0.0001, (now - this.lastTime) / 1000))`, mantendo gravidade, velocidade e cooldowns invariantes em 60/144/240 Hz.
3. **Redimensionar/rotacionar a tela no meio da partida:**
   - `Game.js:170-181` escuta `window.resize` e `OrientationManager.onChange`, atualizando aspecto da câmera e tamanho do `WebGLRenderer`. Validado também via `tests/redteam_fuzz.py`.
4. **1, 2, 3, 4 ou mais jogadores e entrada/saída/desconexão no meio:**
   - No baseline havia colisão visual e dessincronização de obstáculos/bioma (`BUG-B4-01`, `BUG-B4-02`) e reviver sem limites (`BUG-B5-01`). Com as correções de `mp_water_core` (pistas paralelas/ghost, sync de obstáculos/bioma e regras de reviver com custo/cooldown/janela/limite), o fluxo fica consistente para 1–4 jogadores.
5. **Todos os modos (normal, difícil, professor, espelhado, TV) e dinos híbridos:**
   - `EventManager.js:73` filtra eventos para `TEACHER_FRIENDLY_EVENTS` quando `teacherMode` está ativo. Dinos híbridos (`hybrid: { enabled, head, body, tail }`) tinham bug visual na água (`BUG-B7-01`) corrigido em `World.js`/`TrackChunks.js`.
6. **Estados sem saída (soft lock), NaN/undefined/negativos, divisão por zero, vazamento de memória (30+ min):**
   - `ObjectPool` evita alocação contínua de obstáculos. `DinoAbilities` faz `dispose()` de ondas. Identificado `BUG-C3-02` em `BossManager.hazardShots` (baixo impacto, `remove` da cena sem `dispose` explícito). Nenhuma divisão por zero ou NaN observado em `Save`, `PhysicsCollision` ou `Game` loop.
7. **Save corrompido, versão antiga, vazio ou enorme:**
   - Baseline `Save.importJson` aceitava qualquer objeto sem proteção contra `__proto__` ou limite de tamanho (`BUG-D6-01`). Corrigido pela frente `accounts_save_ach` com validação de schema, checksum, anti-prototype-pollution, backup automático e migração de versões antigas.
8. **Relógio do aparelho alterado (missões diárias):**
   - `Metagame.js:124` usa `new Date()` local (`BUG-C3-01`). Mitigado no backend: conquistas/recompensas que afetam ranking são validadas server-side e saves importados recebem `imported: true`.
9. **Todo texto e dica em `pt-BR`, `en` e `es`? Texto cortado?**
   - `src/i18n/translations.js` cobre menus em `pt-BR`, `en` e `es`, mas banners dinâmicos de `EventManager.js` ainda possuem strings em português (`BUG-C3-03`).
10. **Algum recurso depende só de mouse ou só de teclado?**
    - Na UI de menus e configurações (`BUG-D5-01`) e nos botões contextuais de ataque/reviver/respirar no mobile (`BUG-B8-01`), havia lacunas de toque/gamepad endereçadas por `ui_mobile_menus`.
11. **Jogador novo, criança, professor, daltonismo, celular fraco ou TV:**
    - Há presets de daltonismo (`colorblind`), `largeText`, `highContrast`, `reduceShake`, `teacherMode`, `tvScale`, `PerfMonitor` adaptativo e opção `disableGachaVoluntary` (ECA Digital). Dicas contextuais de 1ª vez (`BUG-D7`) adicionadas para Q, V e O₂.
12. **Exploit ou trapaça no ranking?**
    - Runs autoritativos e gacha validados em Edge Functions (`start-run`, `finish-run`, `gacha-roll`). Conquistas e saves importados/debug são bloqueados de pontuar em ranking (`BUG-D4-01`, `BUG-D6-01`).
