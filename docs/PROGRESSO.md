# Progresso da Rodada de Correções & Novos Sistemas (`PROMPT_CORRECOES_DINO_DASH_3D.md`)

> Atualizado continuamente pelo Orquestrador para permitir retomada imediata a qualquer momento.

## Status Geral
- **Tag de Segurança:** `pre-correcoes` + branch `backup/pre-correcoes` criadas.
- **Branch Base:** `evolucao/fase-8-release`

## Checklist de Execução (Parte F)
- [x] **0. Preparação:** Tag `pre-correcoes`, `docs/PROGRESSO.md` e `docs/CONTRATOS_CORRECOES.md`.
- [ ] **1. Frente `combat_events` (`fix/b0-b3-combat-events`):** B0 (`?debug=1` dev-only), B1 (Boss 60–90s no Normal + `docs/BOSS.md`), B2 (Ataque `Q` funcional), B3 (Agendador de 12 eventos até 60k + `docs/EVENTOS.md`).
- [ ] **2. Frente `mp_water_core` (`fix/b4-b7-mp-water-core`):** B4 (Pistas paralelas / Ghost / Clássico + `docs/MULTIPLAYER.md`), B5 (Morte com nick + `V` reviver com custo/cooldown/janela/limite), B6 (Oxigênio 1 ação + dica), B7 (Correção visual da água submersa + `docs/bugs/agua/`).
- [ ] **3. Frente `ui_mobile_menus` (`feat/b8-d1-d5-ui-mobile`):** B8 (Botões touch contextuais), D1 (Opções da sala + tooltips), D5 (Menus estilo jogo com toggles/seletores `◀ ▶` e foco visível), D7 (Dicas contextuais sem poluir).
- [ ] **4. Frente `accounts_save_ach` (`feat/d2-d4-d6-d8-accounts`):** D2 (Contas Supabase Auth nick+senha / e-mail / OAuth / migração), D3 (Perfil com dino 3D customizável), D4 (60+ conquistas + troféus), D6 (Import/Export save visível com preview e backup), D8 (LGPD exclusão conta + nuvem).
- [ ] **5. Frente `art_dinos` (`feat/part-e-dinos-anim`):** Parte E (Chifres 3D Carnotauro × T-Rex, mãos/garras, animações comparadas lado a lado).
- [ ] **6. Frente `bughunt_qa` (Parte C):** Revisão total dos 12 domínios (`docs/BUGS.md`, `docs/COBERTURA_REVISAO.md`, `tests/correcoes.test.mjs`, `tests/redteam_fuzz.py`, `docs/RELATORIO_CORRECOES.md`).
- [ ] **7. Integração Final, Build, Deploy (GitHub/Supabase/Vercel) & Desligamento do PC.**
