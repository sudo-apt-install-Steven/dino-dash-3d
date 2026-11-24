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
| **Parte 2** | Dados 3D Completos (D2–D100, física, 20 dados, qui-quadrado) & Bugs do RPG (2.1, 2.7) | **CONCLUÍDA** | 2026-11-24 | `parte-2: concluída` | `parte-2-concluida` | 51/51 PASS (150k rolagens Qui-Quadrado p>0.001, Budget, Unit, Pentest) | Seguir para a **Parte 3** (Mestre IA Multi-Agente, Criação de Campanha & Gerador de Dino por Presets 2.2, 2.3, 2.5). |
| **Parte 3** | Mestre IA Multi-Agente, Criação de Campanha & Gerador de Dino por Presets (2.2, 2.3, 2.5) | **EM ANDAMENTO** | 2026-11-24 | `wip` | — | Base Parte 2 PASS | Implementar Mestre IA Multi-Agente (narrador, npcs, regras, ilustrador), fluxo de criação de campanha e gerador por presets combináveis. |
| **Parte 4** | Interface RPG Ilustrado, Mapa 2D Ilustrado, Modo 3D Cinemático, Regras Completas & Mesa Multiplayer (2.4, 2.6, 2.8) | NÃO INICIADA | — | — | — | — | Aguarda Parte 3 |
| **Parte 5** | Mundo Aberto (redesenho total de modelos primitivos + ecossistema vivo + história) | NÃO INICIADA | — | — | — | — | Aguarda Parte 4 |
| **Parte 6** | Arena X1 Estilo Jogo de Luta (rounds, golpes, combos, armas, modo treino, torre) | NÃO INICIADA | — | — | — | — | Aguarda Parte 5 |
| **Parte 7** | Controles (Gamepad Xbox/PS/Switch + remapeamento + 1 teclado 2P + menus por gamepad) & Multiplayer | NÃO INICIADA | — | — | — | — | Aguarda Parte 6 |
| **Parte 8** | Conteúdo Novo (Dinos limitados, Seletor de Cor Completo com transparência limitada, eventos, PT-BR) | NÃO INICIADA | — | — | — | — | Aguarda Parte 7 |
| **Parte 9** | Organização do Projeto, Arquivos `.md`, Pastas por Domínio & `docs/INDICE.md` | NÃO INICIADA | — | — | — | — | Aguarda Parte 8 |
| **Parte 10** | Auto-Melhoria Contínua, Segurança/Pentest, Bot QA, CI/CD & Deploy Auditado | NÃO INICIADA | — | — | — | — | Aguarda Parte 9 |

---

## Detalhamento — Parte 2 (CONCLUÍDA)
- [x] **2.1 CD Inalcançável Eliminada (`src/net/AIDungeonClient.js`):** Testes de perícia padronizados em `d20`, com clamping matemático garantindo que nenhuma CD exceda a rolagem máxima permitida pelos dados somada aos modificadores do jogador.
- [x] **2.1 Opções Estáveis Durante a Rolagem (`src/modes/DungeonRPGMode.js`):** Durante o lançamento dos dados, as opções de ação são esmaecidas e travadas com `pointer-events: none; opacity: 0.35`. Novas opções só surgem após o dado assentar.
- [x] **2.7 15 Tipos de Dados 3D Procedurais (`src/modes/DiceRoller3D.js`):** Modelagem procedural e suporte completo para D2, D3, D4, D5, D7, D8, D10, D12, D14, D16, D20, D24, D30 e D100.
- [x] **2.7 9 Materiais Autênticos (`src/modes/DiceRoller3D.js`):** Resina, Osso de Dino, Pedra Vulcânica, Âmbar, Jade, Madeira Petrificada, Ouro Jurássico, Cristal Meteoro e Neon.
- [x] **2.7 Notação de Mesa Completa & Bolsa de Presets (`src/modes/DiceRoller3D.js`):** Avaliador `rollTabletopFormula` (suportando `NdX+M`, `NdXkhY`, `NdXklY`, `1d20adv`, `1d20dis`, `NdX!`) e presets rápidos para mesa.
- [x] **2.7 Teste Qui-Quadrado em 10.000 rolagens (`tests/parte2_dados_qui_quadrado.test.mjs`):** 150.000 rolagens verificadas com gerador criptográfico uniforme `crypto.getRandomValues`, validando $p > 0.001$.
