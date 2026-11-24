# Checklist de QA — Parte 4: Interface do RPG, Mapa 2D, Regras de Mesa e Mesa Multiplayer

Data: 2026-11-24
Auditor: TESTER (Agente de Testes / QA)
Alvo: `D:\Dino 3D` (Branch `atualizacao-grande`)

## 1. Verificações Obrigatórias (Seções 2.4, 2.6 e 2.8)

- [x] **2.8 Regras e Sistemas de RPG de Mesa Completos (`TabletopRPGRules.js`)**:
  - 6 Atributos fundamentais: Força, Agilidade, Vigor, Astúcia, Instinto, Presença.
  - 12 Perícias balanceadas mapeadas por atributo.
  - 8 Arquétipos de dinossauro (Predador, Guardião, Batedor, Xamã, Alfa, Curandeiro, Domador, Construtor) com habilidades ativas, passivas e recargas.
  - Progressão de Níveis 1 a 20 e tabela formal de XP.
  - 6 Condições de status com ícones e penalidades (Envenenado, Atordoado, Assustado, Sangrando, Congelado, Inspirado).
  - Regras de Salvaguarda contra Morte (Death Saves: 3 falhas = morte, 3 sucessos = estabilizado, d20 natural recupera 1 HP).
  - Sistema de Descanso Curto e Descanso Longo com recuperação proporcional de HP e vigor.
- [x] **2.6 Mapa 2D Ilustrado & Fog of War (`TabletopIllustratedMap.js`)**:
  - Mapa vetorial procedural SVG de alta qualidade com nós de regiões interligados, biomas variados (Selva, Pântano, Cristais, Ruínas, Neve, Vulcão).
  - Sistema de viagem entre nós conectados com revelação dinâmica e névoa de guerra em regiões inexploradas.
- [x] **2.4 Mesa Virtual Multiplayer Cooperativa (`TabletopMultiplayerSession.js`)**:
  - Suporte a 2 a 6 jogadores simultâneos por sala.
  - Sistema de Iniciativa de Combate em grupo com rotação estrita de turnos.
  - Votação democrática sincronizada em decisões de exploração com apuração automática de maioria.
  - Emotes e frases rápidas temáticas para comunicação segura e respeitosa.
- [x] **Testes Automatizados**: `tests/parte4_rpg_interface_regras_mesa.test.mjs` criado e 100% PASS (4/4 testes).
- [x] **Regressão Zero e Performance**: 24/24 testes aprovados nas suítes automatizadas de todas as partes, budget mantido e build de produção limpo em 725ms.

**Assinatura QA:** TESTER (AI-Workforce) — APROVADO.
