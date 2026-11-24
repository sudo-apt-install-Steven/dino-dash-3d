# Checklist de QA — Parte 6: Arena X1 Estilo Jogo de Luta

Data: 2026-11-24
Auditor: TESTER (Agente de Testes / QA)
Alvo: `D:\Dino 3D` (Branch `atualizacao-grande`)

## 1. Verificações Obrigatórias (Parte 6)

- [x] **Frame Data & Tipos de Golpes (`FightingEngine.js`)**: Leve, Médio, Pesado, Agarrão/Arremesso (indefensável), Especial de Espécie e Ataque Supremo com custos de Fúria e tempos de startup/recovery balanceados.
- [x] **Sistema de Combos & Cancelamentos (`ComboTracker`)**: Detecção dinâmica de encadeamento com janela de tempo de 850ms e cancelamentos de combo (Triplo Impacto Primal e Cancelamento Especial).
- [x] **Mecânicas de Defesa, Bloqueio e Parry**: Bloqueio reduz o dano a 25%; Parry perfeito anula 100% do dano e induz 20 frames de vulnerabilidade (stagger) no atacante.
- [x] **Finalizações Dramáticas ("Dino Finishers")**: Implementadas com chave de alternância obrigatória para Modo Família (garantindo ausência de sangue e conformidade etária).
- [x] **Torre de Desafios (Arcade Tower) & Armas de Dino**: 5 andares temáticos com modificadores de combate e 4 armas originais (Garras de Aço, Presas de Quartzo, Clava Óssea, Chifres de Magma).
- [x] **Testes Automatizados**: `tests/parte6_arena_x1_luta.test.mjs` criado e 100% PASS (5/5 testes).
- [x] **Regressão Zero e Performance**: 33/33 testes automatizados aprovados em todas as suítes, budget verificado e build limpo em 725ms.

**Assinatura QA:** TESTER (AI-Workforce) — APROVADO.
