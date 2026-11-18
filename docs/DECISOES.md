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
