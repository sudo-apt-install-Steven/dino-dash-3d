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
| **Parte 1** | Bugs Urgentes (1.1–1.8) | **CONCLUÍDA** | 2026-11-24 | `parte-1: concluída` | `parte-1-concluida` | 44/44 PASS (Unit, Pentest, E2E Playwright, FPS, Biomas, Anchor Points) | Concluída com sucesso! Seguir para a **Parte 2** (Dados 3D D2–D100 + Física Rapier/Three.js + Qui-Quadrado + Bugs do RPG 2.1 & 2.7). |
| **Parte 2** | Dados 3D Completos (D2–D100, física, 20 dados, qui-quadrado) & Bugs do RPG (2.1, 2.7) | **EM ANDAMENTO** | 2026-11-24 | `wip` | — | Base Parte 1 PASS | Iniciar modelagem e física dos dados D2–D100, rolagens 3D, distribuição estatística e correções do RPG 2.1/2.7 |
| **Parte 3** | Mestre IA Multi-Agente, Criação de Campanha & Gerador de Dino por Presets (2.2, 2.3, 2.5) | NÃO INICIADA | — | — | — | — | Aguarda Parte 2 |
| **Parte 4** | Interface RPG Ilustrado, Mapa 2D Ilustrado, Modo 3D Cinemático, Regras Completas & Mesa Multiplayer (2.4, 2.6, 2.8) | NÃO INICIADA | — | — | — | — | Aguarda Parte 3 |
| **Parte 5** | Mundo Aberto (redesenho total de modelos primitivos + ecossistema vivo + história) | NÃO INICIADA | — | — | — | — | Aguarda Parte 4 |
| **Parte 6** | Arena X1 Estilo Jogo de Luta (rounds, golpes, combos, armas, modo treino, torre) | NÃO INICIADA | — | — | — | — | Aguarda Parte 5 |
| **Parte 7** | Controles (Gamepad Xbox/PS/Switch + remapeamento + 1 teclado 2P + menus por gamepad) & Multiplayer | NÃO INICIADA | — | — | — | — | Aguarda Parte 6 |
| **Parte 8** | Conteúdo Novo (Dinos limitados, Seletor de Cor Completo com transparência limitada, eventos, PT-BR) | NÃO INICIADA | — | — | — | — | Aguarda Parte 7 |
| **Parte 9** | Organização do Projeto, Arquivos `.md`, Pastas por Domínio & `docs/INDICE.md` | NÃO INICIADA | — | — | — | — | Aguarda Parte 8 |
| **Parte 10** | Auto-Melhoria Contínua, Segurança/Pentest, Bot QA, CI/CD & Deploy Auditado | NÃO INICIADA | — | — | — | — | Aguarda Parte 9 |

---

## Detalhamento — Parte 1 (CONCLUÍDA)
- [x] **1.1 Barras de rolagem temáticas finas (`src/styles/main.css`):** `scrollbar-width: thin`, `scrollbar-color`, `::-webkit-scrollbar` 6px dourado/obsidiana arredondado, mantendo rolagem por mouse/toque/teclado.
- [x] **1.2 Voltar ao menu sem quebrar UI (`src/game/Game.js`):** limpeza completa em `_disposeFreeMode()` e `openMainMenu()` removendo `#mode3d-overlay`/`.m3d-root`/`.m3d-dice-layer`, classes de body, restaurando `camera.fov`/`up`, tema do bioma e overlays.
- [x] **1.3 Remover "Jogador 2" fantasma após Arena X1 (`src/game/Game.js`):** `startQuickMode` salva `_returnModeId`, `openMainMenu()` restaura modo 1P (`solo` / modo anterior) e reseta `input` + roster de jogadores.
- [x] **1.4 Nick padrão aleatório e divertido (`src/systems/Save.js`):** `generateRandomDinoNick()` com `crypto.getRandomValues` (ex.: `DinoVeloz482`, `TrexRoxo19`), sanitização automática contra `"steven teste"` / dados de teste.
- [x] **1.5 Login OAuth completo (Email/Senha + Google + Discord + vínculos + redirecionamento localhost/Vercel + guia de painel + LGPD):** `AuthProfile.js` com PKCE, `ProfileModal.js` com abas unificadas, exportação e exclusão LGPD, e documentação detalhada em `docs/CONFIGURACAO_OAUTH.md`.
- [x] **1.6 Sistema de Pontos de Encaixe (`anchor points`) por dino (cabeça, pescoço, costas, quadril, cauda, patas):** `DinoAnchors.js` e `VoxelAccessories.js` corrigem coleira de espinhos no pescoço e mochila centrada no dorso dorsal sem vazar na cauda em todos os dinos.
- [x] **1.7 Preview REAL de mapa/bioma:** `BiomePreviewRenderer.js` com renderizador WebGL efêmero offscreen gerando dioramas 3D reais nos seletores de biomas (`Menus.js`, `MultiplayerLobby.js`).
- [x] **1.8 Revisão Independente + Subagente de QA + Teste completo (T) + commit `parte-1: concluída` + tag `parte-1-concluida`.**

## PRÓXIMO PASSO EXATO (Para Retomada Imediata)
1. Na branch `atualizacao-grande`, ler `PROGRESSO.md` e o checklist `docs/agentes/checklists/parte-1-chefe.md`.
2. Abrir subagentes em worktrees para finalizar **1.5** (OAuth Google/Discord + Email/Senha + vínculo + LGPD em `AuthProfile.js`, `ProfileModal.js`, `nick-login/index.ts`), **1.6** (Anchor Points por postura/espécie em `VoxelAccessories.js` + `DinoFactory.js` corrigindo coleira de espinhos e mochila + script de galeria automática Playwright), e **1.7** (miniaturas reais de bioma em `Menus.js` / `Biomes.js`).
3. Rodar **Subagente Revisor Independente** + **Subagente QA** (build, unitários, regressão de 20× entrar/sair RPG & Arena X1, galeria de acessórios, FPS >= 95% da base), emitir relatórios em `docs/agentes/relatorios/`, criar commit `parte-1: concluída - <resumo>` + tag `parte-1-concluida` e fazer `git push`.
4. Seguir imediatamente para a **Parte 2** (Dados 3D D2–D100 + correção dos bugs do RPG).
