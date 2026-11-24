# Checklist — Parte 1: Revisor Independente

- [x] **1.1 Barras de rolagem:** Sem barras nativas brutas; `scrollbar-width: thin`, `scrollbar-color` e `::-webkit-scrollbar` temáticos em `src/styles/main.css`; rolagem funcional por mouse/toque/teclado.
- [x] **1.2 Saída limpa de modos/RPG:** `_disposeFreeMode()` + `openMainMenu()` limpam overlays (`#mode3d-overlay`, `.m3d-root`, `.m3d-dice-layer`), classes de body, `camera.fov`/`up`, bioma e overlays sem quebrar o menu.
- [x] **1.3 Sem "Jogador 2" fantasma após Arena X1:** `startQuickMode` preserva `_returnModeId`, `openMainMenu()` restaura modo 1P e reseta controles/jogadores.
- [x] **1.4 Nick padrão aleatório e divertido:** `generateRandomDinoNick()` usa `crypto.getRandomValues`, filtra palavras impróprias e substitui nicks de teste (`steven teste`).
- [x] **1.5 OAuth & Auth completo:** PKCE habilitado, redirect URLs localhost + Vercel, tradução PT-BR de erros, login por apelido ou e-mail/senha, recuperação de senha, vínculo Google + Discord (`linkIdentity`), exportar e excluir dados (LGPD Art. 18), guia exato `docs/CONFIGURACAO_OAUTH.md` sem nenhum segredo no repo.
- [x] **1.6 Pontos de encaixe (`DinoAnchors.js`):** Coleira de espinhos anexada ao `neckPivot` e mochila montada sobre o dorso (nunca no rabo) em TODAS as posturas e espécies.
- [x] **1.7 Preview REAL de biomas:** Miniaturas 3D reais via `BiomePreviewRenderer.js` em todos os seletores de mapa (`Menus.js` e `MultiplayerLobby.js`), com contexto WebGL efêmero (0 vazamento).
- [x] **Segurança & Higiene:** Zero chaves/segredos, zero formas geométricas cruas novas, código limpo.
