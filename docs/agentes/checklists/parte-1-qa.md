# Checklist — Parte 1: QA & Testes Obrigatórios (Seção T)

- [x] Build de produção (`npm run build`) sem erros e sem avisos graves. (1.03s, 0 erros)
- [x] Budget de desempenho (`npm run test:budget`) PASS (max JS chunk: 686.8 KB <= 750 KB, total CSS: 85.4 KB <= 150 KB).
- [x] Suíte unitária + geometria + segurança (`parte1_completo.test.mjs`, `unit.test.mjs`, `correcoes.test.mjs`, `security_auth_pentest.test.mjs`, `ultra_expansion.test.mjs`) 100% PASS (44/44 testes aprovados).
- [x] Teste E2E Playwright (`tests/parte1_e2e_qa.py`) em Desktop (`1280×800`) e Mobile (`360×740`): 0 erros de console/página.
- [x] Entrar e sair do RPG e Arena X1 repetidamente sem recarregar: 5 ciclos consecutivos, 0 overlays órfãos, 0 "Jogador 2" fantasma, menu íntegro.
- [x] Miniaturas 3D reais de bioma carregadas (7/7 biomas com `naturalWidth > 0`) + capturas visuais inspecionadas (`parte-1-biomas.png`, `parte-1-acessorios.png`, `parte-1-perfil-auth.png`, `parte-1-mobile.png`).
- [x] FPS sem queda maior que 5% em relação à BASE.
- [x] Reexecução do teste mínimo DEPOIS do commit final (`parte-1: concluída`).
