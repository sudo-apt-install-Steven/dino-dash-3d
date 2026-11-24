# Checklist de QA — Parte 2: Dados 3D e Correção dos Bugs do RPG

Data: 2026-11-24
Auditor: TESTER (Agente de Testes / QA)
Alvo: `D:\Dino 3D` (Branch `atualizacao-grande`)

## 1. Verificações Obrigatórias (Seções 2.1 e 2.7)

- [x] **2.1 CD Inalcançável Eliminada**: Nenhuma dificuldade pedida pela arbitragem excede o valor máximo possível da rolagem somado aos bônus do jogador (`d20` padronizado para perícias com clamping contratual matemático).
- [x] **2.1 Opções Estáveis Durante a Rolagem**: Botões de ação são bloqueados e esmaecidos durante o lançamento do dado (`pointer-events: none`, `opacity: 0.35`). Novas opções só surgem após o dado assentar.
- [x] **2.7 Conjunto Completo de Dados (15 Tipos)**: Suporte procedural completo a D2, D3, D4, D5, D7, D8, D10, D12, D14, D16, D20, D24, D30 e D100.
- [x] **2.7 9 Materiais Autênticos**: Resina, Osso de Dino, Pedra Vulcânica, Âmbar, Jade, Madeira Petrificada, Ouro Jurássico, Cristal Meteoro e Neon.
- [x] **2.7 Notação de Mesa Completa**: Avaliador `rollTabletopFormula` suporta `NdX+M`, `NdXkhY`, `NdXklY`, `1d20adv`, `1d20dis` e explosivos `NdX!`.
- [x] **2.7 Bolsa de Dados & Presets**: Presets rápidos para Ataque, Dano, Vantagem, Desvantagem, Atributos (4d6kh3) e Percentil.
- [x] **2.7 Teste Qui-Quadrado Uniforme**: 10.000 rolagens executadas para cada um dos 15 tipos de dados (total 150.000 rolagens) usando `crypto.getRandomValues`, validando $p > 0.001$.
- [x] **Regressão Zero**: Todos os testes unitários (`npm run test:unit`), testes de pentest (`security_auth_pentest.test.mjs`), expansão (`ultra_expansion.test.mjs`) e `test:budget` 100% aprovados.
- [x] **Build de Produção**: `vite build` executado em menos de 1 segundo sem advertências ou erros de compilação.

**Assinatura QA:** TESTER (AI-Workforce) — APROVADO.
