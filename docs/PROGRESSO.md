# Progresso da Rodada de Correções & Novos Sistemas (`PROMPT_CORRECOES_DINO_DASH_3D.md`)

> Atualizado continuamente pelo Orquestrador — **CONCLUÍDO (100% verificado)**.

## Status Geral
- **Tag de Segurança:** `pre-correcoes` + branch `backup/pre-correcoes` criadas.
- **Branch Integrada:** `feat/correcoes-integradas` (commit QA `5c4abc6` + atualização final) / `evolucao/fase-8-release` (PR #3).

## Checklist de Execução (Parte F)
- [x] **0. Preparação:** Tag `pre-correcoes`, `docs/PROGRESSO.md` e `docs/CONTRATOS_CORRECOES.md`.
- [x] **1. Frente `combat_events` (`4a15b18`):** B0 (`?debug=1` dev-only ausente em prod), B1 (Boss `78.8s` média no Normal + `docs/BOSS.md`), B2 (Ataque `Q` funcional), B3 (Agendador de 12 eventos até 60k + `docs/EVENTOS.md`).
- [x] **2. Frente `mp_water_core` (`47c7303`):** B4 (Pistas paralelas / Ghost / Clássico + sync host→convidado de `biomeId` e `Spawner.syncFromHostObstacles` + `docs/MULTIPLAYER.md`), B5 (Morte com nick + `V` reviver com custo/cooldown/janela/limite), B6 (Oxigênio 1 ação + dica), B7 (Correção visual da água submersa + `docs/bugs/agua/`).
- [x] **3. Frente `ui_mobile_menus` (`8c05f1f`):** B8 (Botões touch contextuais), D1 (Opções da sala + tooltips), D5 (Menus estilo jogo com toggles/seletores `◀ ▶` e foco visível), D7 (Dicas contextuais sem poluir).
- [x] **4. Frente `accounts_save_ach` (`404b14e`):** D2 (Contas Supabase Auth nick+senha / e-mail / OAuth / migração), D3 (Perfil com dino 3D customizável), D4 (65 conquistas + troféus), D6 (Import/Export save visível com preview e backup), D8 (LGPD exclusão conta + nuvem).
- [x] **5. Frente `art_dinos` (`e5e11cf`):** Parte E (Chifres 3D Carnotauro × T-Rex, mãos/garras, animação ataque Q e comparativos lado a lado em `docs/bugs/dinos/` e `docs/DECISOES.md`).
- [x] **6. Frente `bughunt_qa` (`5c4abc6`):** Parte C completa (`docs/BUGS.md` 16/16 fechados, `docs/COBERTURA_REVISAO.md` 100%, `tests/correcoes.test.mjs` 8/8, `tests/redteam_fuzz.py`, `docs/RELATORIO_CORRECOES.md`).
- [x] **7. Integração Final, Build, Push GitHub/Preview & Desligamento do PC.**
