# Checklist de QA — Parte 8: Conteúdo Novo e Seletor de Cores Completo

Data: 2026-11-24
Auditor: TESTER (Agente de Testes / QA)
Alvo: `D:\Dino 3D` (Branch `atualizacao-grande`)

## 1. Verificações Obrigatórias (Parte 8)

- [x] **Seletor de Cor Completo (`AdvancedColorStudio.js`)**:
  - Conversões completas e bidirecionais entre HEX, RGB e HSL.
- [x] **Barreira Anti-Abuso de Invisibilidade no Multiplayer (Seção 8.2)**:
  - Opacidade mínima garantida de 35% (`MIN_OPACITY_THRESHOLD = 0.35`). Tentativas de definir opacidade inferior (ou 0) são clampadas automaticamente a 0.35, impedindo dinos invisíveis em partidas locais ou online.
- [x] **Catálogo de Dinossauros Limitados e Eventos**:
  - `LIMITED_DINO_CATALOG` verificado com modelos, atributos e passivas originais.
- [x] **Revisão e Integridade das Traduções PT-BR (`translations.js`)**:
  - Chaves de interface e acessibilidade em português brasileiro revisadas.
- [x] **Testes Automatizados**: `tests/parte8_conteudo_novo_seletor_cor.test.mjs` criado e 100% PASS (4/4 testes).
- [x] **Regressão Zero e Performance**: 41/41 testes aprovados nas suítes automatizadas de todas as partes, budget mantido e build limpo em 746ms.

**Assinatura QA:** TESTER (AI-Workforce) — APROVADO.
