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
| **Parte 4** | Interface RPG Ilustrado, Mapa 2D Ilustrado, Modo 3D Cinemático, Regras Completas & Mesa Multiplayer (2.4, 2.6, 2.8) | **CONCLUÍDA** | 2026-11-24 | `parte-4: concluída` | `parte-4-concluida` | 60/60 PASS (Ficha, Níveis 1..20, Death Saves, Mapa SVG Fog of War, Mesa Virtual Multiplayer 2..6P) | Seguir para a **Parte 5** (Mundo Aberto - redesenho total de modelos primitivos, ecossistema vivo e história). |
| **Parte 5** | Mundo Aberto (redesenho total de modelos primitivos + ecossistema vivo + história) | **EM ANDAMENTO** | 2026-11-24 | `wip` | — | Base Parte 4 PASS | Redesenhar modelos primitivos, adicionar ecossistema com IA de presas e predadores, ciclos de vida e história. |
| **Parte 6** | Arena X1 Estilo Jogo de Luta (rounds, golpes, combos, armas, modo treino, torre) | NÃO INICIADA | — | — | — | — | Aguarda Parte 5 |
| **Parte 7** | Controles (Gamepad Xbox/PS/Switch + remapeamento + 1 teclado 2P + menus por gamepad) & Multiplayer | NÃO INICIADA | — | — | — | — | Aguarda Parte 6 |
| **Parte 8** | Conteúdo Novo (Dinos limitados, Seletor de Cor Completo com transparência limitada, eventos, PT-BR) | NÃO INICIADA | — | — | — | — | Aguarda Parte 7 |
| **Parte 9** | Organização do Projeto, Arquivos `.md`, Pastas por Domínio & `docs/INDICE.md` | NÃO INICIADA | — | — | — | — | Aguarda Parte 8 |
| **Parte 10** | Auto-Melhoria Contínua, Segurança/Pentest, Bot QA, CI/CD & Deploy Auditado | NÃO INICIADA | — | — | — | — | Aguarda Parte 9 |

---

## Detalhamento — Parte 4 (CONCLUÍDA)
- [x] **2.8 Regras e Sistemas de RPG de Mesa Completos (`src/modes/TabletopRPGRules.js`):** 6 Atributos (FOR, AGI, VIG, AST, INS, PRE), 12 Perícias, 8 Arquétipos de dinossauro (Predador, Guardião, Batedor, Xamã, Alfa, Curandeiro, Domador, Construtor), Progressão formal de Níveis 1 a 20 e tabela de XP, 6 Condições de status com ícones, Testes de salvaguarda contra a morte (Death Saves 3/3 e crítico d20 = 20) e descansos curto/longo.
- [x] **2.6 Mapa 2D Ilustrado & Fog of War (`src/modes/TabletopIllustratedMap.js`):** Mapa procedural vetorial SVG em camadas com nós interligados, viagem controlada por rotas, descoberta e névoa de guerra em regiões não exploradas.
- [x] **2.4 Mesa Virtual Multiplayer Cooperativa (`src/modes/TabletopMultiplayerSession.js`):** Suporte a 2 a 6 jogadores sincronizados, ordem de iniciativa de grupo com alternância de turnos, votação em decisões de grupo e emotes rápidos de mesa.
- [x] **Testes Automatizados (`tests/parte4_rpg_interface_regras_mesa.test.mjs`):** 4/4 testes cobrindo todas as mecânicas com 100% de aprovação.
