# DINO DASH 3D — Auditoria Técnica Baseline (FASE 0)

> **Data da Auditoria:** 2026-11-18
> **Modo:** Somente leitura (nenhum arquivo de código alterado)
> **Commit Auditado:** `a5594f2` (`main`)
> **Domínio de Produção:** `https://dino-dash-3d-six.vercel.app/`

---

## 1. Mapa do Projeto

### 1.1 Stack Tecnológica
- **Renderização 3D:** Three.js `^0.170.0` (WebGL procedural voxel, `BoxGeometry` + `InstancedMesh` para cenário).
- **Bundler / Dev Server:** Vite `^6.0.0` (`vite.config.js` com `target: 'es2022'`, `sourcemap: false`, proxy LAN `/ws`, `/api/lan-info`, `/api/rooms` para `127.0.0.1:5174`, e banner proprietário em JS/CSS/HTML).
- **Frontend:** Vanilla JavaScript (ES Modules, sem framework UI), CSS modular (`src/styles/main.css`, `menus.css`, `controller.css`).
- **Multiplayer LAN:** Node.js + `ws` (`^8.23.0`) em `server/lan-host.js` (porta `5174`), QR Code via `qrcode` (`^1.5.4`).
- **Backend / Multiplayer Online:** `@supabase/supabase-js` (`^2.119.0`), PostgreSQL + RLS + Edge Functions Deno (`supabase/functions/*`) + Realtime Broadcast/Presence.
- **Hospedagem:** Vercel (`vercel.json` com rewrites SPA e headers HTTP de segurança).

### 1.2 Estrutura de Pastas
```text
d:\Dino 3D\
├── .github/                  # Dependabot config (.github/dependabot.yml) — sem workflows CI ainda
├── docs/                     # Documentação da evolução + docs/baseline/*.png
├── public/                   # manifest.webmanifest, sw.js, icons/dino-icon.svg
├── server/                   # lan-host.js (servidor WebSocket LAN autoritativo em memória)
├── src/
│   ├── main.js               # Bootstrap, DeviceDetector, query params (?room, ?controller), PWA
│   ├── audio/                # AudioEngine.js, MusicSequencer.js, Narrator.js, SoundEffects.js
│   ├── dinos/                # DinoCatalog.js (37), DinoFactory.js, DinoAnimator.js, DinoAbilities.js, DinoCustomization.js, Companion.js
│   ├── events/               # EventManager.js, CoreEvents.js, WorldEvents.js, AdvancedEvents.js, BossManager.js, BossModels.js, PredatorSystem.js, PredatorModels.js, UfoEvent.js
│   ├── game/                 # Game.js (~5208 linhas), Modes.js (17 modos), Difficulty.js
│   ├── models/               # VoxelLibrary.js, ClaudeVoxelModels.js
│   ├── net/                  # RoomClient.js, TransportLAN.js, TransportSupabase.js, QrGenerator.js
│   ├── security/             # DomainGuard.js, EdgeClient.js, Sanitize.js, Watermark.js
│   ├── styles/               # main.css, menus.css, controller.css
│   ├── systems/              # Input.js, Spawner.js, PhysicsCollision.js, ObjectPool.js, Particles.js, CameraRig.js, Save.js, GachaSystem.js, Cards.js, Items.js, Metagame.js, Progression.js, EconomySim.js, StatusSystem.js, OrientationManager.js, DeviceDetector.js, ClipRecorder.js, Replay.js, PerfMonitor.js, BotQA.js
│   ├── ui/                   # UI.js, Menus.js, HUD.js, TvHud.js, SelectionScreen.js, CustomizationScreen.js, GachaModal.js, CardModal.js, GuideModal.js, SettingsModal.js, MetagameModal.js, MinigamesUI.js, LegalModal.js, DebugModal.js, MultiplayerLobby.js, MobileController.js, PartyModals.js, SvgIcons.js
│   └── world/                # World.js, TrackChunks.js, SceneryInstancer.js, Biomes.js (19), DayNightCycle.js, Weather.js, BrightnessAudit.js
└── supabase/
    ├── schema.sql
    ├── migrations/           # 2026111401, 2026111402, 2026111403
    └── functions/            # start-run, finish-run, gacha-roll, room-sync, wallet-sync, submit-report, wipe-user-data, _shared/security.ts
```

### 1.3 Fluxo do Game Loop (`src/game/Game.js` L5026+)
1. `requestAnimationFrame(this._loop.bind(this))` agenda o próximo frame e aplica `fpsCap` opcional.
2. Calcula `dt = Math.min(0.05, Math.max(0.0001, (now - this.lastTime) / 1000))` (**dt variável clamped**, ainda sem *fixed timestep* dedicado para física).
3. `this.input.beginFrame()`, `_updateGlobalKeys()`, `this.ui.hud.tickTimers(dt)`.
4. Ramificações de estado:
   - `spotlightActive`: apenas `renderer.render(...)` e `endFrame()`.
   - `ui.controllerInstance` (modo controle remoto): pula loop 3D pesado.
   - `state === 'menu'`: atualiza `world`, `dayNight`, `particles` e `animator` dos dinos em vitrine.
   - `state === 'playing'`: se `multiplayerSession?.active && !isHost`, roda `_updateMultiplayerGuest(dt)`; caso contrário roda simulação autoritativa (física, `spawner`, `events`, `physics`, `particles`, `cameraRig`, broadcast de snapshots).
5. `this.renderer.render(this.scene, this.camera)` e `this.input.endFrame()`.

### 1.4 Dependências & `npm audit`
- **Dependências de produção (`package.json`):**
  - `@supabase/supabase-js`: `^2.119.0`
  - `qrcode`: `^1.5.4`
  - `three`: `^0.170.0`
  - `ws`: `^8.23.0`
- **DevDependencies:**
  - `vite`: `^6.0.0`
- **`npm audit` (executado em 2026-11-18):** **4 vulnerabilidades `high`** em devDependencies ligadas ao ecossistema Vite (`vite >=6.3.0-beta.0`, `fdir >=5.2.1`, `picomatch *`, `tinyglobby *`), todas com fix disponível (`npm audit fix`). **0 vulnerabilidades** em runtime/produção.
- **Pacotes mortos:** Nenhum pacote morto em `package.json`; todas as 4 dependências de produção e `vite` são importadas ativamente.

---

## 2. Inventário de Modelos e Assets

Todos os modelos e áudios são **gerados proceduralmente por código** (sem `.glb`, `.png` ou `.mp3` externos).

| Nome / Grupo | Onde é usado | Origem | Qualidade (1–5) | Design próprio? | Ação |
| --- | --- | --- | :---: | :---: | --- |
| **37 Dinossauros (`DinoFactory.js`)** | Menu, Seleção 3D, Corrida, Multiplayer | Procedural (`BoxGeometry` voxel) | 4 | Sim (silhuetas, cores e escalas por espécie) | **Manter / Melhorar** (refinar poses de vitória/derrota e animações secundárias na Fase 3) |
| **Acessórios 3D (20 itens em `DinoFactory.js` + `ClaudeVoxelModels.js`)** | Customização e corrida | Procedural voxel | 4 | Sim | **Manter** |
| **Ovos, Plataformas de Buff & Sinais (`ClaudeVoxelModels.js`)** | Pista, Gacha, Portais, Caixas | Procedural voxel com cache de geometria/material | 4.5 | Sim | **Manter** |
| **Obstáculos de Bosses (`buildClaudeBossObstacle`)** | Lutas contra Bosses (10 tipos) | Procedural voxel | 4 | Sim | **Manter / Melhorar** (telegrafia visual mais clara) |
| **14 Modelos de Bosses (`BossModels.js`)** | `BossManager.js` (14 chefes distintos) | Procedural voxel | 3.5 | Sim | **Melhorar** (estados visuais distintos entre fases 1/2/3 da luta) |
| **Predadores & Ninhos (`PredatorModels.js`)** | `PredatorSystem.js` (terrestre/aquático/aéreo) | Procedural voxel | 4 | Sim | **Manter** |
| **Obstáculos & Coletáveis da Pista (`VoxelLibrary.js` + `Spawner.js`)** | Corrida (cactos, rochas, troncos, poças, recifes, minas, águas-vivas, armadilhas) | Procedural voxel com `ObjectPool` | 3.5 | Parcial (alguns props básicos) | **Melhorar** (mais variação de silhueta em cactos/rochas e mesclagem de geometrias estáticas) |
| **Cenário dos 19 Biomas (`World.js`, `TrackChunks.js`, `SceneryInstancer.js`)** | Fundo, laterais, rio, nuvens, portais | Procedural com `InstancedMesh` | 4 | Sim | **Manter / Melhorar** (camadas extras de parallax em biomas avançados) |
| **Áudio & Trilha (`AudioEngine.js`, `MusicSequencer.js`, `SoundEffects.js`, `Narrator.js`)** | Menus, corrida, eventos, TTS | Procedural WebAudio API + SpeechSynthesis | 4 | Sim | **Manter** (adicionar camadas adaptativas por intensidade/boss na Fase 4) |
| **Ícone PWA (`public/icons/dino-icon.svg`)** | Favicon / Manifest PWA | SVG próprio | 4 | Sim | **Manter** (gerar variantes PNG 192x192 e 512x512 para instalabilidade PWA completa na Fase 5) |

---

## 3. Lista de Bugs (Lógicos, Visuais e Estruturais)

| ID | Severidade | Tipo | Descrição e Passos para Reproduzir | Arquivo(s) Suspeito(s) |
| --- | :---: | --- | --- | --- |
| **BUG-01** | **Alta** | UX / Mobile | **HUD de jogo no celular concentra botões no canto inferior direito:** Ao abrir o jogo em viewport mobile paisagem (`844x390`), apenas `Roda`, `1.8k`, `600pt` aparecem aglomerados à direita; faltam zonas ergonômicas de polegar (esquerda: mover/abaixar; direita: pular/habilidade/ataque ≥ 64px). | `src/ui/HUD.js`, `src/styles/menus.css` |
| **BUG-02** | **Alta** | Rede / Paridade | **`TransportSupabase.js` com paridade incompleta em `_broadcastRoomPatch` e `connectAndJoin`:** Falta propagar `roomName`, `maxPlayers`, `hasPassword`, `uniqueDinos` e enforcement de banidos no transporte Supabase em paridade total com `server/lan-host.js`. | `src/net/TransportSupabase.js` |
| **BUG-03** | **Média** | Física / Loop | **Game loop usa `dt` variável (`Math.min(0.05, ...)`):** Em quedas pontuais de FPS (`minFps ~20`), altura de salto e detecção de colisão de alta velocidade podem variar ligeiramente em relação a 60 FPS fixos. | `src/game/Game.js` (`_loop`) |
| **BUG-04** | **Média** | Bundle / Perf | **Bundle JS único de `1,609.6 KB` (`> 1200 KB` warning do Vite):** Falta `manualChunks` ou *code splitting* (ex.: separar `three` e módulos pesados de loja/editor/multiplayer) para acelerar o carregamento inicial em 3G/4G mobile. | `vite.config.js` |
| **BUG-05** | **Média** | Multiplayer | **Recursos pós-partida pendentes:** Ao terminar uma partida multiplayer, falta fluxo de **Revanche** mantendo a mesma sala/configurações, resumo detalhado (MVP, bosses, combo) e câmera livre para espectador eliminado. | `src/ui/PartyModals.js`, `src/game/Game.js` |
| **BUG-06** | **Média** | Qualidade / CI | **Sem suíte de testes automatizados nem CI no GitHub Actions:** Não há pasta `/tests` nem workflow `.github/workflows/ci.yml` executando lint, build e Playwright E2E automaticamente em PRs. | `.github/`, `package.json` |
| **BUG-07** | **Baixa** | PWA / Assets | **`manifest.webmanifest` / ícones PWA:** Apenas `dino-icon.svg`; navegadores Android/iOS exigem PNGs `192x192` e `512x512` (maskable) para prompt nativo confiável e splash de instalação. | `public/manifest.webmanifest`, `public/icons/` |
| **BUG-08** | **Baixa** | DevDeps | **`npm audit` reporta 4 vulnerabilidades `high` no Vite 6.x (`vite`, `fdir`, `picomatch`, `tinyglobby`)** — apenas em ambiente de build/dev, mas precisa atualização controlada. | `package.json`, `package-lock.json` |
| **BUG-09** | **Baixa** | Mobile Portrait | **Em retrato (`390x844`), card de introdução de predador ocupa grande porção vertical da tela** durante a corrida (observado no screenshot `mobile_play_portrait.png`). | `src/ui/HUD.js`, `src/styles/menus.css` |

---

## 4. Checagem das 96 Ideias Originais (`prompt-dino-dash-3d.md`)

Resumo consolidado por categoria em relação ao código atual:

| Categoria | Já Existe (Implementado) | Parcial | Falta |
| --- | --- | --- | --- |
| **Arte & Câmera** | Estilo voxel colorido, 3 camadas parallax (`SceneryInstancer`), poeira/partículas, fauna decorativa, UI chunky, 4 filtros de estilo, 6 câmeras (`C`), tremor, FOV dinâmico | Animações de vitória/derrota exclusivas por dino | **Modo Foto livre** com pausa no ar e exportação de imagem |
| **Loop & Combate** | Pulo + pulo carregado, abaixar, deslizar, dash 3 pistas, mergulho alternante + O2, voo com estamina, pisotear, rampas, bullet-time, Fúria, mochila (3 itens), power-ups, checkpoints fogueira, física de escombros, atalhos secretos, mapa de progresso | Ressonância de habilidade (pode ter feedback visual mais forte) | Fixed timestep na física |
| **Dinos & Coleção** | 37 dinos (inclui os 13+1 originais e extras), preview 3D, árvore de habilidades Lv1–10, mutações DNA, companheiros, montaria, personalização completa, loja, ovos misteriosos/Gacha 3D, álbum, passe de temporada, títulos/emblemas, casa do dino, minigame chocar ovo | — | Refino visual de alguns modelos base (Fase 3) |
| **Modos de Jogo (17)** | Solo, História (3 caps), Coop 2P (+ fusão), PvP 2P (+ handicap + replay), Controles Compartilhados, Equipes 2x2, Sabotagem, Captura o Ovo, Revezamento, Torneio 4–8P, Ondas, Contra-Relógio (Ghost), Caos, Hardcore, Desafio Diário, Zen, Dino Rival IA, Seed compartilhável | Multiplayer LAN/Supabase funcionando para gameplay, mas falta Revanche e Espectador livre; Local 2P precisa revalidação E2E pós-alterações | Editor de fases compartilhável (Fase 4 da Evolução) |
| **Eventos & Bosses** | Chuva de meteoros, manada, OVNI + minigame, tempestade de areia, vulcão, terremoto, bando pterodáctilos, dia/noite/eclipse, mercador, 14 bosses, chuva/pontes, perseguidor, fase voo, corredor lava, dia dos ovos, aurora/cometa, marés, 19 biomas | Clima e marés existem, mas alguns bosses podem ganhar fases mais distintas | Eventos sazonais por data + Evento Global Semanal via Supabase (Fase 4 da Evolução) |
| **Áudio, Acessibilidade & Extras** | WebAudio SFX + música que acelera, narrador PT-BR, hit-stop, remapeamento de teclas, modo 1 mão, daltonismo, texto grande, alto contraste, reduzir tremores, minigames (pesca, ritmo, chocar), Konami code | Tradução i18n parcial (PT-BR padrão, falta alternância completa EN/ES) | i18n completo (`pt-BR`, `en`, `es`) e PWA offline completo |

---

## 5. Baseline de Performance (Medido via Playwright Chrome Headless WebGL)

Medição executada em `http://127.0.0.1:4173/` (build atual `a5594f2`) durante 3,0 segundos de corrida ativa no Deserto Dourado:

| Métrica | Desktop (`1280x720`) | Mobile Emulado (`844x390` Landscape) |
| --- | :---: | :---: |
| **Tempo até Menu Interativo** | `3740 ms` (~2.5s efetivo) | `2646 ms` (~1.4s efetivo) |
| **FPS Médio** | **`59.0 FPS`** (`178` frames) | **`58.7 FPS`** (`176` frames) |
| **FPS Mínimo (pior spike)** | `20.1 FPS` (`maxMs: 49.8 ms`) | `20.0 FPS` (`maxMs: 50.0 ms`) |
| **Frame Time Médio** | `16.95 ms` | `17.04 ms` |
| **Draw Calls** | `151` | `153` |
| **Triângulos / Cena** | `9.270` | `9.294` |
| **Geometrias / Texturas em GPU** | `81` geometrias / `1` textura | `81` geometrias / `1` textura |
| **Memória JS Heap** | `36 MB` | `26 MB` |
| **Tamanho do Bundle (`dist/assets/`)** | `index-Bon7eabm.js`: `1.609,6 KB` \| `index-Fu9exGdU.css`: `44,3 KB` | Mesmo |
| **Erros de Console / `pageerror`** | **`0`** | **`0`** |

> **Observação:** Os spikes isolados de ~50ms ocorrem na inicialização de chunks/eventos logo após fechar o popup inicial; a média estabiliza em ~59 FPS (vsync 60Hz).

---

## 6. Baseline Visual (Screenshots Capturados)

Todos os screenshots foram salvos em `docs/baseline/`:
- `docs/baseline/desktop_menu.png` — Menu Principal 3D (1280x720)
- `docs/baseline/desktop_dinos.png` — Tela de Seleção/Evolução de Dinossauros (1280x720)
- `docs/baseline/desktop_lobby.png` — Lobby Multiplayer (1280x720)
- `docs/baseline/desktop_play_desert.png` — Corrida Solo no Deserto Dourado (1280x720)
- `docs/baseline/desktop_abyss.png` — Bioma Abismo Submerso (1280x720)
- `docs/baseline/desktop_volcano.png` — Bioma Vulcão em Erupção (1280x720)
- `docs/baseline/desktop_ice.png` — Bioma Era do Gelo (1280x720)
- `docs/baseline/desktop_alien.png` — Bioma Planeta Alienígena (1280x720)
- `docs/baseline/mobile_menu_portrait.png` — Menu Mobile Retrato (390x844)
- `docs/baseline/mobile_play_portrait.png` — Corrida Mobile Retrato (390x844)
- `docs/baseline/mobile_play_landscape.png` — Corrida Mobile Paisagem (844x390)

---

## 7. Auditoria de Segurança Inicial (Resumo)

- **Pontos Fortes Já Implementados:**
  - Zero segredos `service_role` no frontend; apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (em `.env` ignorado pelo git).
  - Headers HTTP rigorosos em `vercel.json` (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`).
  - Sanitização XSS centralizada (`src/security/Sanitize.js`), proteção de domínio (`DomainGuard.js`), e Edge Functions autoritativas (`start-run`, `finish-run`, `gacha-roll`, `room-sync`, `wallet-sync`, `submit-report`, `wipe-user-data`).
  - RLS endurecida nas migrations `2026111401`, `2026111402`, `2026111403`.
- **Lacunas para Fechar na Fase 2:**
  1. Atualizar Vite (`npm audit fix`) para eliminar os 4 alertas `high` em devDependencies.
  2. Completar paridade de validação/ban/senha em `TransportSupabase.js` e re-auditar `get_advisors` no Supabase.
  3. Configurar CI no GitHub Actions + regras de proteção de branch (`main` via PR), CodeQL e `SECURITY.md` formal.
  4. Gerar `docs/SEGURANCA.md` e `NEEDS_FROM_STEVEN.md` (ex.: 2FA/passkey no GitHub, branch protection se não houver permissão via CLI).
