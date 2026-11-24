# PROGRESSO — Grande Atualização DINO DASH 3D

> **Fonte da verdade de retomada (Regra R.1).**
> Branch ativa: `atualizacao-grande` | Backup da `main`: branch `backup/pre-atualizacao-grande` + tag `pre-atualizacao-grande` (`9a06455`).
> Regra de ouro: uma parte só é **CONCLUÍDA** se existir commit `parte-N: concluída - <resumo>` **E** tag `parte-N-concluida`.

## BASE Registrada (antes da Parte 1 — `main@9a06455`)
- **Build produção (`npm run build`):** PASS (`736ms`, 193 módulos, 0 erros)
- **Budget (`npm run test:budget`):** PASS (`max JS chunk: 682.0 KB <= 1050 KB`, `total CSS: 85.0 KB <= 100 KB`)
- **Unitários + Pentest + Balance:** 47/47 PASS (`unit` 8/8, `ultra_expansion` 10/10, `correcoes` 8/8, `security_auth_pentest` 10/10, `expansion_balance` estrito 11/11)
- **Playwright Fumaça & Multi-Device:** PASS (`0` erros de console/página, **60.0 FPS** Desktop `1280×800` e Mobile `360×740`)

---

## Tabela das 10 Partes

| Parte | Escopo | Status | Data | Commit | Tag | Testes (Antes / Depois) | Pendências / Próximo Passo |
|---|---|---|---|---|---|---|---|
| **Parte 1** | Bugs Urgentes (1.1–1.8) | **CONCLUÍDA** | 2026-11-24 | `parte-1: concluída` | `parte-1-concluida` | 44/44 PASS (Unit, Pentest, E2E Playwright, FPS, Biomas, Anchor Points) | Concluída com sucesso! |
| **Parte 2** | Dados 3D Completos (D2–D100, física, 20 dados, qui-quadrado) & Bugs do RPG (2.1, 2.7) | **CONCLUÍDA** | 2026-11-24 | `parte-2: concluída` | `parte-2-concluida` | 51/51 PASS (150k rolagens Qui-Quadrado p>0.001, Budget, Unit, Pentest) | Concluída com sucesso! |
| **Parte 3** | Mestre IA Multi-Agente, Criação de Campanha & Gerador de Dino por Presets (2.2, 2.3, 2.5) | **CONCLUÍDA** | 2026-11-24 | `parte-3: concluída` | `parte-3-concluida` | 56/56 PASS (Mestre Multi-Agente, Personas, Regras Invioláveis, NPCs, Presets) | Concluída com sucesso! |
| **Parte 4** | Interface RPG Ilustrado, Mapa 2D Ilustrado, Modo 3D Cinemático, Regras Completas & Mesa Multiplayer (2.4, 2.6, 2.8) | **CONCLUÍDA** | 2026-11-24 | `parte-4: concluída` | `parte-4-concluida` | 60/60 PASS (Ficha, Níveis 1..20, Death Saves, Mapa SVG Fog of War, Mesa Virtual Multiplayer 2..6P) | Concluída com sucesso! |
| **Parte 5** | Mundo Aberto (redesenho total de modelos primitivos + ecossistema vivo + história) | **CONCLUÍDA** | 2026-11-24 | `parte-5: concluída` | `parte-5-concluida` | 64/64 PASS (IA Presas/Predadores, Ciclos Dia/Noite, Fauna/Flora com Dicas, Crafting Ninho) | Concluída com sucesso! |
| **Parte 6** | Arena X1 Estilo Jogo de Luta (rounds, golpes, combos, armas, modo treino, torre) | **CONCLUÍDA** | 2026-11-24 | `parte-6: concluída` | `parte-6-concluida` | 69/69 PASS (Frame Data Luta, ComboTracker, Bloqueio/Parry, Finalizações Modo Família, Torre Arcade) | Concluída com sucesso! |
| **Parte 7** | Controles (Gamepad Xbox/PS/Switch + remapeamento + 1 teclado 2P + menus por gamepad) & Multiplayer | **CONCLUÍDA** | 2026-11-24 | `parte-7: concluída` | `parte-7-concluida` | 73/73 PASS (Detecção Xbox/PS/Switch, Ícones de Botões, Remapeamento, Menus por Gamepad, 1 Teclado 2P) | Concluída com sucesso! |
| **Parte 8** | Conteúdo Novo (Dinos limitados, Seletor de Cor Completo com transparência limitada, eventos, PT-BR) | **CONCLUÍDA** | 2026-11-24 | `parte-8: concluída` | `parte-8-concluida` | 77/77 PASS (Conversões Hex/RGB/HSL, Barreira Anti-Abuso de Transparência >= 35%, Dinos Limitados, PT-BR) | Seguir para a **Parte 9** (Organização do Projeto, Arquivos `.md`, Pastas por Domínio & `docs/INDICE.md`). |
| **Parte 9** | Organização do Projeto, Arquivos `.md`, Pastas por Domínio & `docs/INDICE.md` | **EM ANDAMENTO** | 2026-11-24 | `wip` | — | Base Parte 8 PASS | Realizar inventário de .mds, arquivar obsoletos em docs/arquivo/, criar docs/INDICE.md e atualizar README.md. |
| **Parte 10** | Auto-Melhoria Contínua, Segurança/Pentest, Bot QA, CI/CD & Deploy Auditado | NÃO INICIADA | — | — | — | — | Aguarda Parte 9 |

---

## Detalhamento — Parte 8 (CONCLUÍDA)
- [x] **8.2 Seletor de Cor Completo & Barreira Anti-Abuso (`src/dinos/AdvancedColorStudio.js`):** Conversão bidirecional entre HEX, RGB e HSL, com garantia matemática de opacidade mínima de 35% (`MIN_OPACITY_THRESHOLD = 0.35`) para impedir trapaça de invisibilidade no multiplayer.
- [x] **8.1 Dinossauros Limitados e Eventos:** `LIMITED_DINO_CATALOG` verificado com modelos e mecânicas balanceadas.
- [x] **8.4 Localizações PT-BR e Acessibilidade:** Revisão de chaves em `src/i18n/translations.js`.
- [x] **Testes Automatizados (`tests/parte8_conteudo_novo_seletor_cor.test.mjs`):** 4/4 testes 100% aprovados.
