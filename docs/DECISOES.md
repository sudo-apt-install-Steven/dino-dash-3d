# Registro de Decisões Técnicas (ADRs) — DINO DASH 3D

> Conforme a Regra de Ouro #10 de `PROMPT_EVOLUCAO_DINO_DASH_3D.md`, decisões ambíguas ou com risco de regressão adotam a alternativa mais conservadora que preserva o feeling e a estabilidade do jogo.

---

## ADR-01: Manutenção de ES Modules Vanilla + JSDoc em vez de Migração Forçada do Core para TypeScript
- **Contexto:** `src/` possui ~50 módulos JavaScript (incluindo `Game.js` com ~5.200 linhas) em produção.
- **Decisão:** Manter `src/` em ES Modules JavaScript puro com validação via testes unitários (`node:test`) e E2E (`Playwright`), e utilizar **TypeScript estrito** no novo app `/mobile` (Expo SDK 58).
- **Motivo:** Evitar regressões sutis no loop WebGL/Three.js e preservar 100% do feeling de corrida já validado.

## ADR-02: Fixed Timestep (`1/60s`) com Preservação de `justPressed`
- **Contexto:** Monitores de 120/144 Hz ou quedas pontuais de frame podiam alterar a física com `dt` variável.
- **Decisão:** O loop de `playing` acumula `dt` em passos fixos de `1 / 60s` (limite de 4 subpassos por frame), chamando `this.input.endFrame()` apenas quando pelo menos 1 passo fixo executa.
- **Motivo:** Física 100% determinística a 60Hz sem perder cliques/pulos rápidos entre frames de alta taxa de atualização.

## ADR-03: Etapa A (WebView + Bridge Nativo) como Caminho Recomendado no Expo Go (`/mobile`)
- **Contexto:** A Fase 6 avaliou a Etapa A (`react-native-webview` + bridge completo) contra a Etapa B (`expo-gl` + `@react-three/fiber/native`).
- **Decisão:** Adotar a **Etapa A** como caminho principal de produção no app Expo e manter a **Etapa B** como cena PoC comparativa selecionável na UI do app (`mobile/POC_COMPARATIVO.md`).
- **Motivo:** A Etapa A entrega 100% de paridade imediata com os 37 dinos, 19 biomas, multiplayer e UI HTML/CSS existentes a 58–60 FPS, com haptics, `expo-secure-store` e notificações nativas via bridge.

## ADR-04: Telemetria Estritamente Opt-in e Local/Anônima
- **Contexto:** Conformidade com LGPD e ECA Digital exige zero coleta de dados pessoais por padrão.
- **Decisão:** `Telemetry.js` inicia com `analyticsOptIn = false` por padrão e armazena apenas contadores agregados locais e um buffer circular de até 25 erros de runtime sem PII.

## ADR-05: Parte E — Diferenciação Anatômica Voxel (Carnotauro × T-Rex), Animação de Ataque (Q) e Comparador na Galeria
- **Contexto:** Na galeria `/debug/models` (`docs/bugs/dinos/antes_trex.png` vs `docs/bugs/dinos/antes_carnotaurus.png`), Carnotauro e T-Rex compartilhavam silhueta quase idêntica (44v/528 tris vs 46v/552 tris), com chifres do Carnotauro reduzidos a dois bastões verticais simples, além de ausência de animação dedicada de ataque (`Q`) e transição instantânea ao reviver.
- **Decisão ("SÓ TROQUE SE FICAR MELHOR"):**
  1. **Carnotauro (`src/dinos/DinoFactory.js`):** substituído por silhueta distinta com focinho mais curto e alto (`headH=0.62, headD=0.62`), crista supraorbital, chifres 3D volumétricos em 3 estágios (base larga inclinada + meio curvo + ponta afiada), fileira dupla de osteodermos dorsais + tubérculos laterais e braços vestigiais curtos (`63 voxels / 756 tris`, dentro do teto de `<= 900 tris` de `docs/ARTE.md`).
  2. **T-Rex (`src/dinos/DinoFactory.js`):** crânio massivo retangular com cristas lacrimais/nasais, dentição superior e inferior visível, braços articulados com antebraço e 2 dedos/garras e base da cauda mais pesada (`59 voxels / 708 tris`).
  3. **Demais espécies (`src/dinos/DinoFactory.js`):** 3 garras em foice distintas no *Therizinosaurus*, 3 dedos/garras + garra em foice erguida no pé dos dromeossaurídeos (*Velociraptor*, *Deinonychus*, *Utahraptor*), 3 garras e cristas supraorbitais refinadas em *Allosaurus*/*Giganotosaurus*, e focinho estreito em *Spinosaurus*/*Baryonyx*.
  4. **Animações (`src/dinos/DinoAnimator.js`):** adicionada animação dedicada de ataque (`triggerAttack` / `state.attacking`) em 3 fases (antecipação → impacto → recuperação) com 4 variantes por espécie (`bite`, `headbutt`, `lunge`, `tail`), além de reviver suave (`deathProgress` interpolado sem estalo) e onda hidrodinâmica contínua no nado, sem alocações por frame (zero custo extra de FPS).
  5. **Galeria (`src/models/ModelGallery.js`):** adicionada pose `Ataque (Q)`, correção de `pointer-events: auto` no overlay, câmera inicial frontal 3/4 (`camYaw=2.55`) e modo **Comparar Lado a Lado** (`#mg-compare-btn`).
- **Comparativo Visual:** Screenshots antes/depois registrados em `docs/bugs/dinos/` (`antes_*.png`, `depois_trex.png`, `depois_carnotaurus.png`, `depois_carnotaurus_attack.png`, `depois_compare_trex_carnotaurus.png`). Todos os modelos comparados mostraram ganho claro de leitura de silhueta mantendo o estilo voxel e o orçamento `<= 900 tris/dino`.
