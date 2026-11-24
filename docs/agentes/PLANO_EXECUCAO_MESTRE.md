# Plano de Execução Mestre & Fronteiras Anti-Conflito (Multi-Agente)

> **Para todos os agentes trabalhando na branch `atualizacao-grande`:**
> Antes de editar qualquer arquivo, leia `PROGRESSO.md` + `git log -n 5` + `git tag`.

## Particionamento de Domínios (Zero Colisão de Merge)
1. **`src/styles/design-tokens.css` & `src/ui/MotionEngine.js`:** Sistema de Design Obsidian/Âmbar + Motion GPU compartilhado.
2. **`src/dice/` (`Parte 2`):**
   - `DiceNotationParser.js` — Parser completo (`2d6+3`, `4d6kh3`, `4d6dl1`, `1d20adv`, `1d20dis`, `1d8!`, `2d10r1`), cálculo exato de probabilidade de sucesso (`computeSuccessProbability`) e validador `ensureReachableDC` (zero CD inalcançável!).
   - `DiceGeometries.js` — 15 modelos 3D com numeração gravada legível (`d2` moeda Ovo/Pegada, `d3, d4, d5, d6, d7, d8, d10, d12, d14, d16, d20, d24, d30, d100` par percentil + esfera 100 faces).
   - `DiceSkins.js` — 13 skins PBR/emissivas (translúcido, resina, osso, pedra, cristal, gema, metal, ouro, madeira, lava, gelo, galáxia, edição limitada).
   - `DicePhysicsTray.js` — Bandeja física (feltro/madeira/couro) até 20 dados simultâneos sem sobreposição, detecção de dado *cocked* e pouso exato por quatérnion pré-simulado sobre resultado criptográfico (`crypto.getRandomValues`).
   - `DiceBagUI.js` — Bolsa de dados por toque/teclado/gamepad, presets salvos, entrada de dado físico e fallback 2D leve.
3. **`src/rpg/` (`Partes 3 e 4`):**
   - `TabletopStateMachine.js`, `SceneIllustrator2D.js`, `IllustratedMap2D.js`, `DinoPresetBuilder.js`, `MasterAgents.js`, `CharacterSheetSystem.js`, `SafeCampaignSave.js`, `TabletopUI.js`.
4. **`src/openworld/` & `src/arena/` (`Partes 5 e 6`):**
   - `OpenWorldSculptedModels.js`, `FightingAnimator.js`, `ArenaMovesets.js`, `DinoWeapons.js`.
5. **`src/ui/ColorStudioPicker.js` & `src/systems/GamepadRemapper.js` (`Partes 7 e 8`).**
6. **`Partes 9 e 10`:** Inventário `.md` (`docs/arquivo/INDICE.md`), reorganização final e auditoria contínua (`docs/relatorios/AUTOCORRECAO_REPORT.md`).
