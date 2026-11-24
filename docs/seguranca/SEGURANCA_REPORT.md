# Relatório Final de Segurança, Conformidade Legal, Gameplay & Performance — DINO DASH 3D

**Proprietário e Autor:** Steven Tayllon teixeira Jerônimo De Melos  
**Repositório GitHub:** `@sudo-apt-install-Steven/dino-dash-3d`  
**Domínio Oficial de Produção:** `https://dino-dash-3d-six.vercel.app`  
**Projeto Supabase:** `dino-dash-3d` (`nldbezalwdsapxfjkyww`, região `sa-east-1`, PostgreSQL `17.11`)  
**Commit de Baseline (Pré-Hardening):** `5b16cb1` (branch `backup/pre-hardening-baseline`)  
**Último Commit de Código Verificado:** `a1c63b4` (branch `main`)

---

## 1. Resumo Executivo

Todas as fases planejadas de proteção jurídica, blindagem técnica (cliente, banco de dados PostgreSQL/RLS, Edge Functions autoritativas, host LAN WebSocket e cabeçalhos HTTP na Vercel), correções avançadas de gameplay/UX mobile e auditoria final foram concluídas e validadas sem degradação de desempenho:

- **Meta de FPS (Hardware WebGL Desktop `1280x800`):**
  - **Baseline (`5b16cb1`):** `60.21 FPS` (`211` frames em 3,5 s, `16.61 ms` médio, `16.9 ms` p95, `0` erros) — limite mínimo aceitável ($\le 5\%$ de queda): `57.20 FPS`.
  - **Final Pós-Todas-Fases (`a1c63b4`):** **`60.22 FPS`** (`211` frames em 3,5 s, **`16.61 ms`** médio, **`16.8 ms`** p95, **`0` erros**) — variação de `+0.01 FPS` (desempenho preservado integralmente).
- **Build de Produção (`npm run build`):** `176` módulos compilados com sucesso em `7.61s` (`dist/assets/index-oDLnRHHL.js` `1,528.42 kB` | `dist/assets/index-Dum34KFV.css` `33.00 kB`), zero erros.
- **Dependências (`npm audit --omit=dev`):** **`0` vulnerabilidades conhecidas**.
- **Supabase Security Advisors (`get_advisors` type `security`):** **`0` avisos / lints de segurança**.

---

## 2. Histórico Consolidado das Fases

| Fase | Escopo Entregue | Commit |
| --- | --- | --- |
| **Pré-Fase & Fase 0** | Skills auditadas + snapshot rollback `backup/pre-hardening-baseline` + benchmark WebGL e varredura de segredos em todo histórico Git (`AUDIT_BASELINE.md`). | `b217968`, `5b16cb1`, `1ed819b` |
| **Fase 1** | Proteção de Propriedade Intelectual (`LICENSE` proprietária UNLICENSED, `NOTICE`, `THIRD_PARTY_LICENSES.md`, `AUTORIA.md` e banner de autoria no build Vite). | `854cbcf` |
| **Fase 2** | Guardião de Domínio/Anti-Iframe (`DomainGuard.js`), sanitização anti-XSS (`Sanitize.js`), remoção de painel de debug/F9 no bundle de produção, e Edge Functions autoritativas (`start-run`, `finish-run`, `gacha-roll`, `wallet-sync`) com assinatura HMAC-SHA256 e plausibilidade server-side. | `5e3a4b0` |
| **Fase 3** | Fechamento de RLS e remoção de privilégios anônimos de escrita/leitura sensível nas tabelas do Postgres (`dino_leaderboard`, `dino_rooms`, `dino_room_secrets`, `player_wallets`, `run_sessions`, `gacha_audit_logs`, `abuse_reports`), Edge Function `room-sync` com segredo de host e hardening do servidor `server/lan-host.js` (CORS, antitravessia, cabeçalhos e sanitização). | `b6dac0d` |
| **Fase 4** | Cabeçalhos de segurança na Vercel (`vercel.json` com CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control` e `/sw.js`), `.env.example`, `.github/dependabot.yml` e guia operacional (`SEGURANCA_INFRA_GUIA.md`). | `2c3b146` |
| **Fase 5** | Conformidade jurídica brasileira (`LEGAL_COMPLIANCE.md` e `LegalModal.js`), Canal de Denúncia (`submit-report`), Eliminação Total de Dados (`wipe-user-data`), exportação JSON de save e Persistência Tripla resiliente (`localStorage` + `IndexedDB` `DinoDash3DDB` + cookie funcional `dd3d_chk`), totalmente independente de IP ou Wi-Fi. | `4a322f5` |
| **Fase 6A & 6B** | Correções avançadas de gameplay/UX mobile + auditoria E2E, segurança, advisors e relatório final. | `a1c63b4` + relatório final |

---

## 3. Melhorias de Gameplay, UX Mobile & Bugs Críticos Corrigidos (Fase 6A)

1. **Seleção de Dinossauros Mobile Fixa Sem Pulo de Scroll (`SelectionScreen.js`, `menus.css`):**
   - Layout reestruturado com área de palco 3D + botões principais fixos no topo (`.sel-stage-col`), painel de detalhes rolável isolado no meio (`.sel-details-col`) e filtros/lista de dinossauros ancorados na base (`.sel-bottom-dock`), preservando posições sem rolar a tela ao clicar entre espécies bloqueadas e desbloqueadas.
2. **Realismo Subaquático & Remoção de Invencibilidade em Mergulho (`PhysicsCollision.js`, `Spawner.js`, `HUD.js`, `Game.js`):**
   - Alinhamento da caixa de colisão submersa ao recuo visual real (`diveOffset = 0.32` em `inSubmerged`);
   - Remoção do bloqueio indevido que tornava `p.diveTimer > 0` imune em `_damagePlayer` e colisão de quebra;
   - Obstáculos e coletáveis aquáticos com pooling dedicado (`coral_reef`, `abyss_mine`, `jellyfish_swarm`, `whirlpool_vortex`, `oxygen_bubble`);
   - Sistema real de **Oxigênio (`#hud-oxygen-pill`)** com drenagem contínua sob a água para espécies não-aquáticas (mitigável com `diving_mask`, `snorkel`, `steam_goggles` ou bolhas de O₂).
3. **Roda Tática `[X]` (Pause-on-Open Radial Wheel — `HUD.js`, `Input.js`, `Game.js`):**
   - Pressionar `[X]` no teclado ou tocar em `🧭` (`#touch-radial-btn` / `#btn-radial-wheel`) pausa momentaneamente score/obstáculos e abre seleção rápida em 4 quadrantes (`[1/↑] Habitat`, `[2/→] Mochila`, `[3/↓] Mascote`, `[4/←] Foco Tático`) com recarga de `4.5s`.
4. **Mascotes Especializados Úteis (`Companion.js`, `HUD.js`, `Game.js`):**
   - Papéis automáticos por espécie (`hunter`, `guardian`, `siren`, `scout`), coleta autônoma de ovos/frutas/bolhas de oxigênio, habilidades passivas periódicas e comando tático sob demanda (`#hud-companion-pill`).
5. **6 Novos Acessórios 3D Voxel (`DinoCustomization.js`, `DinoFactory.js`):**
   - `steam_goggles` (800 🥚), `samurai_kabuto` (950 🥚), `dino_backpack_plush` (2.200 🥚), `royal_trident` (3.200 🥚), `plasma_halo` (7.800 🥚) e `comet_tail_rig` (11.500 🥚).
6. **Curva Suave por Tempo + Score Damped (`Game.js`):**
   - Aceleração balanceada combinando tempo de corrida (`62%`) e score amortecido (`38%`), evitando saltos bruscos de velocidade em combos precoces.
7. **2 Bugs de Fluxo Descobertos e Corrigidos na Auditoria E2E:**
   - **Warmup/Hidratação fechando modais (`UI.refreshMainMenuIfIdle()`, `main.js`):** O callback assíncrono do benchmark inicial ou hidratação via `IndexedDB` não sobrescreve mais sub-telas abertas (`Dinossauros`, `Mapas`, `Personalização`, `Gacha`, etc.).
   - **Seleção de Bioma Inicial no Modo Sequencial (`Game.js`):** Corrigido o cálculo de `targetIdx` em `sequenceBiomes` para respeitar `this.startBiomeId` (evitando reset imediato para `desert` no `score = 0` ao escolher `abyss_submerged`, `jurassic_river` ou outros biomas) e evitar conflito simultâneo com `randomPortalMode` ou `hollow_earth`.

---

## 4. Verificação Executada Pós-Última Edição (`a1c63b4`)

### 4.1. Playwright E2E Desktop & Mobile (`verify_phase6_e2e.py` contra `vite preview`)
Resultado completo: **`"ok": true`**, **`0` erros de console / `pageerror`**:

- **Segurança no Navegador:**
  - `iframeBlocked: true` — incorporação em `<iframe>` bloqueada pelo `DomainGuard` (`Incorporação em Iframe Bloqueada`).
  - `debugStripped: true` — `#btn-debug` inexistente e atalho `F9` não renderiza `Painel de Depuração`.
- **Loja & Acessórios 3D:**
  - `newAccessoriesPresent: true` (`6/6` novos acessórios visíveis na aba **Loja & Ovos**); acessório `plasma_halo` equipado com renderização no modelo (`headPlusTorsoChildren: 33`).
- **Bioma Abissal Submerso, Oxigênio, Mascote, Dano & Curva (`abyss_submerged` + `jurassic_river`):**
  - `biomeId: "abyss_submerged"`, `inSubmerged: true`, `o2PillVisible: true`, oxigênio drenando em corrida real (`95.06` → `86.65` em ~1,6 s).
  - `companionActive: true`, `companionRole: "hunter"`, `#hud-companion-pill` exibindo `🦴 T-Rex • Pronto!`.
  - `submergedNoGodMode`: `hpBeforeDmg: 3` → `after: 2` (`dmgAppliedDuringDive: true`).
  - `abyssAfter.speedAfter`: `14.82` → `15.53` (`runTime: 2.57`).
  - `biomeId: "jurassic_river"`, `poolsHaveUnderwater: true`.
- **Roda Tática `[X]` (Desktop & Touch):**
  - Tecla `KeyX`: `open: true`, `domVisible: true`, `scoreAtOpen: 19.45` === `scoreDuringPause: 19.45` (`scoreFrozenWhileOpen: true`).
  - Atalho `Digit4` (Foco): fecha roda (`domHiddenAfter: true`), aplica cooldown (`cooldownAfter: 4.28s`).
  - Mobile (`375x812`): `touchRadialOk: true` (`#touch-radial-btn` abre e `#radial-cancel` fecha).
- **Persistência Tripla & Eliminação LGPD:**
  - `tripleSaved`: `localStorage: true`, `dd3d_chk cookie: true`, `IndexedDB (DinoDash3DDB): true`.
  - `recoveredFromIdb: true` após remoção manual de `localStorage` e cookie seguida de `reload`.
  - `afterWipe`: `localStorage: false`, `cookie: false`, `IndexedDB: false` após acionar **Excluir Meus Dados**.
- **Responsividade Mobile Real (`375x812` & `390x844`):**
  - `zeroHorizontalOverflow: true` (`overflowX: 0`).
  - `375x812`: `#sel-preview-box` (`y=131`), `#sel-confirm` (`y=289`), `#sel-dino-list` (`y=664`) idênticos antes e após selecionar classe `aquatic`, item bloqueado e troca para `raptor` (`0px` de deslocamento).
  - `390x844`: `#sel-preview-box` (`y=133`), `#sel-confirm` (`y=291`), `#sel-dino-list` (`y=694`) estacionários (`0px` de deslocamento).

### 4.2. Auditoria de Backend Autorizado, Banco Supabase & Servidor LAN

- **Edge Functions implantadas e `ACTIVE` no Supabase (`list_edge_functions`):**
  `start-run`, `finish-run`, `gacha-roll`, `wallet-sync`, `room-sync`, `submit-report`, `wipe-user-data` (7 funções ativas).
- **Testes ao vivo (`verify_phase2.mjs`, `verify_phase3.mjs`, `verify_phase5.mjs`):**
  - Origem não autorizada (`https://evil-clone.example`) em `start-run`: bloqueada com **HTTP `403`** (`Origem não autorizada.`).
  - Partida autoritativa (`start-run`): **HTTP `200`** com `runId`, `nonce`, `sig`.
  - Score adulterado (`9.999.999` em `finish-run`): rejeitado com **HTTP `422`** (`Pontuação rejeitada por verificação de plausibilidade do servidor.`).
  - Gacha e Carteira (`gacha-roll` / `wallet-sync`): **HTTP `200`** com cálculo no servidor.
  - Restrição direta REST anon (`POST dino_leaderboard`, `POST dino_rooms`, `DELETE dino_rooms`): bloqueada com **HTTP `401`** (`42501 permission denied`), enquanto `GET dino_rooms` para sala privada retorna `[]`.
  - Hijack de sala em `room-sync` por outro ator: bloqueado com **HTTP `403`**.
  - `server/lan-host.js`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, traversal `/../.env` bloqueado, apelido XSS sanitizado (`Host<script>Test` → `HostscriptTest`, `A<script>B` → `AscriptB`).
  - Canal LGPD (`submit-report` & `wipe-user-data`): descrição curta rejeitada (**HTTP `400`**), denúncia válida gravada (**HTTP `200`**), eliminação total confirmada (**HTTP `200`** nas 5 tabelas: `gacha_audit_logs`, `run_sessions`, `player_wallets`, `abuse_reports`, `dino_room_secrets`).
- **Supabase Advisors (`get_advisors`):**
  - `security`: **`0` lints**.
  - `performance`: **`3` notices de nível `INFO`** (`unused_index` em `dino_leaderboard_score_idx`, `idx_security_audit_created`, `idx_player_wallets_auth_uid`, esperados em base recém-criada com baixo volume).
- **Varredura de Segredos e Bundle:**
  - Nenhum segredo em `src/`, `server/`, `public/` nem em `dist/assets/index-oDLnRHHL.js` (`hasDebugPanel: false`, `hasDebugModal: false`, `hasServiceRole: false`).
  - Histórico Git completo (`git_secret_scan.mjs`): `0` tokens, JWTs privados ou chaves de API expostos (`27` ocorrências exclusivamente textuais/documentais de `service_role` em docs, `.env.example`, schemas SQL e backend `_shared/security.ts`).

---

## 5. Conformidade Jurídica Brasileira & Propriedade Intelectual

Os documentos e fluxos in-game atendem às diretrizes técnicas aplicáveis de **LGPD (Lei nº 13.709/2018)**, **Enunciado CD/ANPD nº 1/2023**, **ECA Digital / Lei Felca (Lei nº 15.211/2025)**, **Marco Legal dos Games (Lei nº 14.852/2024)** e **CDC (Lei nº 8.078/1990)**, com detalhamento em `LEGAL_COMPLIANCE.md`, `AUTORIA.md`, `LICENSE`, `NOTICE` e `THIRD_PARTY_LICENSES.md`.

Pontos que permanecem explicitamente marcados com **`[REVISÃO ADVOGADO]`** antes de qualquer monetização real, publicidade comportamental ou expansão comercial:

1. `[REVISÃO ADVOGADO]` Validação jurídica definitiva de Termos de Uso, Política de Privacidade e aviso de cookies caso seja ativada publicidade ou venda direta no site.
2. `[REVISÃO ADVOGADO]` Enquadramento regulatório de Gacha/caixas caso `VITE_LOOTBOX_REAL_MONEY` passe a `true` no futuro, sob a **Lei nº 15.211/2025 (Arts. 20–21)** e eventual decreto federal.
3. `[REVISÃO ADVOGADO]` Verificação etária formal (18+) e consentimento parental verificável (**LGPD Art. 14**) antes de liberar chat aberto ou pagamentos.
4. `[REVISÃO ADVOGADO]` Estruturação fiscal/tributária e política comercial de arrependimento (**CDC Art. 49**) para eventual loja com dinheiro real.

---

## 6. Próximos Passos Manuais Recomendados no Painel (Proprietário)

Conforme detalhado em `SEGURANCA_INFRA_GUIA.md`, dependem exclusivamente do acesso autenticado nas suas contas:

1. **GitHub:** Ativar **2FA**, proteger branch `main` contra *force push*/deleção, ativar *Secret scanning* + *Push protection*, e decidir se manterá o repositório privado.
2. **Vercel:** Confirmar variáveis de produção (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ALLOWED_DOMAINS=dino-dash-3d-six.vercel.app`, `VITE_LOOTBOX_REAL_MONEY=false`, `VITE_APP_EDITION=public`) e ativar **Vercel Authentication (Deployment Protection)** para URLs de preview/staging.
3. **Supabase Dashboard:**
   - Em *Edge Functions → Secrets*, manter `DINO_RUN_HMAC_SECRET` exclusivo, `ALLOWED_ORIGINS=https://dino-dash-3d-six.vercel.app` e `LOOTBOX_REAL_MONEY=false`.
   - Opcionalmente habilitar **Allow anonymous sign-ins** em *Authentication* antes de definir `VITE_ENABLE_ANON_AUTH=true` na Vercel.
4. **Registro Oficial de Autoria (INPI):** Protocolar código-fonte (`e-Software`) e marca (`e-Marcas`) quando desejar formalizar o registro no Brasil.
