# Validação Visual — Antes & Depois (Fase 3: Modelos, Arte e Animação)

Screenshots capturados em WebGL (`1280x720`, Playwright + Edge SwiftShader) validando a **Galeria de Modelos 3D** (`src/models/ModelGallery.js`), as animações **`victory` / `hurt`** (`src/dinos/DinoAnimator.js`) e os **estados visuais de Fase 1–3 dos Bosses** (`src/events/BossModels.js`).

## Arquivos Capturados

| Arquivo | Descrição |
| --- | --- |
| `antes_galeria_dinos.png` | Referência baseline da tela de seleção de dinos antes da Fase 3 |
| `depois_galeria_dinos_run.png` | Nova Galeria de Modelos 3D (`openModelGallery`) com telemetria de voxels/triângulos e animação `run` |
| `depois_dino_victory.png` | Dino executando animação `victory` (salto rítmico, braços/asas erguidos, rugido triunfante) |
| `depois_dino_hurt.png` | Dino executando animação `hurt` (recuo, expressão de susto/dor, tremor lateral) |
| `depois_boss_fase1.png` | Boss `T-Rex Alfa` na **Fase 1** via `setPhase(1)` (armadura/chifres intactos, sem rachaduras/aura) |
| `depois_boss_fase3.png` | Boss `T-Rex Alfa` na **Fase 3** via `setPhase(3)` (partes destrutíveis quebradas, rachaduras luminosas, aura de fúria ativa) |
