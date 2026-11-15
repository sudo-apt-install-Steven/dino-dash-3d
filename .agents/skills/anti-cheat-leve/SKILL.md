---
name: anti-cheat-leve
description: Arquitetura client-untrusted, validação autoritativa de economia/gacha/ranking em Supabase Edge Functions e anti-tamper leve mantendo >= 60 FPS sem control-flow flattening.
---

# Anti-Cheat Leve & Blindagem Client-Untrusted (`DINO DASH 3D`)

## Princípio Fundamental
**Tudo que roda no navegador do usuário pode ser inspecionado e alterado por quem entende DevTools ou intercepta requisições HTTP.** Portanto:
1. O cliente (`Three.js` + HUD) exibe gráficos, prevê colisões localmente para fluidez de 60 FPS e envia sinais/resumos ao servidor.
2. **O servidor (Supabase Edge Functions + Postgres RLS + `service_role`) é a única fonte de verdade** para ranking global, sorteios RNG de Gacha, saldos online e desbloqueios oficiais.

---

## Regras de Engenharia & Limite de Performance (`<= 5%` queda de FPS)

1. **Proibido Ofuscação Pesada no Loop 3D:**
   - **NUNCA** aplicar `controlFlowFlattening`, *dead-code injection*, *string encryption loops* em runtime ou proxying pesado sobre:
     - `src/game/Game.js` (`_updatePlaying`, `loop`)
     - `src/dinos/DinoAnimator.js`
     - `src/systems/PhysicsCollision.js`, `src/systems/Spawner.js`, `src/world/World.js`
   - Sempre medir FPS antes e depois com `PerfMonitor` + Playwright para garantir **variação máxima ≤ 5%** e **≥ 60 FPS** em PC comum.
2. **Hardening de Build Sem Perda de FPS:**
   - `sourcemap: false`, remoção de comentários de desenvolvimento, `mangle` de identificadores estático em build time (`esbuild`/`terser`), e remoção completa de menus/cheats (`F9` Debug, `godMode`, botões "+Ovos") via `if (import.meta.env.DEV)` para *tree-shaking* absoluto em produção.
3. **Validação Autoritativa em Edge Functions:**
   - **`start-run` / `finish-run`:** Ao iniciar partida online, servidor emite `runId` + `nonce` assinado com `timestamp` real do servidor. No encerramento, valida:
     - `elapsedServerMs` vs `score` e `distance` informados (aplicando limite matemático máximo de pontos/segundo + multiplicador de dificuldade do preset selecionado);
     - rejeita envios duplicados do mesmo `runId` (idempotência / anti-replay);
     - aplica *rate limiting* e grava anomalias suspeitas em `security_audit_logs`.
   - **`gacha-roll`:** RNG executado exclusivamente no servidor (`crypto.getRandomValues`), atualizando `pity` e inventário na transação Postgres.
4. **Trava de Domínio & Marca d'Água Forense:**
   - Validação de hostname autorizado (`window.location.hostname`) + cabeçalhos `CSP frame-ancestors 'none'` e `X-Frame-Options: DENY` + verificação de `Origin` nas Edge Functions.
   - Marca d'água invisível determinística em metadados de captura/exportação e assinatura discreta de build, ajudando a comprovar autoria sem impactar renderização WebGL.
