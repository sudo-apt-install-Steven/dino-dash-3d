# DINO DASH 3D — Plano de Evolução (Fases 1 a 8)

> **Baseado em:** `PROMPT_EVOLUCAO_DINO_DASH_3D.md` e `docs/AUDIT.md`
> **Regra de Ouro:** Preservar 100% do feeling e do que já funciona. Cada fase usa sua própria branch (`evolucao/fase-N-nome`) a partir da tag `pre-evolucao` + branch de backup, entrando via PR.

---

## Resumo das Fases

| Fase | Nome | Modo de Execução | Branch Sugerida | Entregas Principais |
| :---: | --- | --- | --- | --- |
| **1** | **Estabilização & Performance** | `/goal` | `evolucao/fase-1-estabilizacao` | Fixed timestep na física, code splitting (`three` em chunk separado), correção de spikes de FPS, suíte de testes unitários + Playwright E2E (solo + local 2P + multiplayer), CI no GitHub Actions. |
| **2** | **Segurança Máxima** | `/goal` | `evolucao/fase-2-seguranca` | `npm audit fix` (Vite), paridade de validação/ban em `TransportSupabase.js`, revisão `get_advisors` Supabase, revisão CSP/headers Vercel, `SECURITY.md`, `docs/SEGURANCA.md`, `NEEDS_FROM_STEVEN.md`. |
| **3** | **Modelos, Arte e Animação** | `/swarm` (Artista 3D) | `evolucao/fase-3-arte-modelos` | `docs/ARTE.md`, refino visual dos 13 dinos clássicos + 14 bosses + obstáculos base, poses vitória/derrota, pós-processamento toggleável leve (vinheta/bloom sutil), cena `/debug/models` (Galeria de Modelos), screenshots em `docs/antes-depois/`. |
| **4** | **Conteúdo Novo (Data-Driven)** | `/swarm` (Gameplay) | `evolucao/fase-4-conteudo` | Diretório `/src/content/` data-driven, fases distintas de boss (3 fases telegrafadas), missões encadeadas, eventos sazonais por data + evento global semanal Supabase, Modo Foto livre, Revanche + Resumo pós-partida + Espectador livre no multiplayer, música adaptativa, `docs/CONTEUDO.md`. |
| **5** | **Responsividade & Mobile Web** | `/swarm` (UI/UX + QA) | `evolucao/fase-5-mobile-web` | Ergonomia touch (botões 64–72px esquerda/direita com `safe-area-inset`), centralização `.hud-bottom-bar`, ajuste do card de predador em retrato, qualidade gráfica adaptativa por FPS, ícones PNG + cache offline PWA completo, testes Playwright em matriz de viewports (`360x740`, `640x360`, `800x360`, `844x390`, `932x430`) em `docs/mobile/`. |
| **6** | **App Expo Go (`/mobile`)** | `/swarm` (Mobile) | `evolucao/fase-6-expo` | Etapa A: App Expo (TypeScript) com WebView + bridge (haptics, save, share, notificações diárias, orientação, offline). Etapa B: PoC nativa `expo-gl` + `@react-three/fiber/native` com benchmark FPS/memória comparativo. `expo-secure-store` + `/mobile/README.md`. |
| **7** | **Qualidade Final** | `/goal` | `evolucao/fase-7-qualidade` | i18n completo (`pt-BR`, `en`, `es`), acessibilidade completa, analytics opt-in sem PII, orçamentos de performance no CI, Lighthouse >= 90, `README.md`, `CHANGELOG.md`, `docs/ARQUITETURA.md`. |
| **8** | **Release & Produção** | `/goal` | `evolucao/fase-8-release` | Preview deployment Vercel + checklist completo (console limpo, headers, RLS anônimo/autenticado, fluxos E2E), PR final com métricas antes/depois, promoção para produção, `docs/RELATORIO_FINAL.md`. |

---

## Ordem Imediata Recomendada ao Sair da Fase 0
1. Criar tag `git tag pre-evolucao` e branch de backup no commit `a5594f2` antes de qualquer edição de código.
2. Executar **Fase 1 (Estabilização)** + **Fase 2 (Segurança)** sequencialmente com `/goal`.
3. Abrir `/swarm` para executar **Fases 3, 4, 5 e 6** em paralelo em worktrees isolados (respeitando donos de arquivos da seção 2 de `PROMPT_EVOLUCAO_DINO_DASH_3D.md`).
4. Consolidar e finalizar com **Fases 7 e 8**.
