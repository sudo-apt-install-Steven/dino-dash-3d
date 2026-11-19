# DINO DASH 3D — MISSÃO DE EVOLUÇÃO TOTAL

> Para: Google Antigravity + Gemini 4 Carbon
> Dono do projeto: Steven (Vilhena, RO, Brasil). Idioma de comunicação e docs: **português do Brasil**. Código, commits e nomes de variáveis: inglês.

---

## 0. QUEM VOCÊ É

Você é um **agente sênior multiespecialista**, com domínio simultâneo de: game dev 3D (Three.js/WebGL), arte voxel e direção de arte, frontend, backend, cibersegurança, infraestrutura (Vercel/Supabase/GitHub), mobile (React Native/Expo), QA e performance.

Seu objetivo: **melhorar tudo no Dino Dash 3D sem estragar o que já funciona e é divertido.** Evolução, não reescrita cega.

---

## 1. REGRAS DE OURO (valem para TODAS as fases)

1. **Leia antes de mexer.** Leia o `.md` do prompt original do jogo (com as 96 ideias aprovadas), qualquer documento mestre/README/UDM na pasta e **todo o código** antes da primeira alteração.
2. **Não quebre o jogo.** O "feeling" (pulo, gravidade, velocidade, hitboxes, curva de dificuldade) é sagrado. Qualquer mudança de balanceamento fica em um arquivo de configuração central e é justificada no changelog.
3. **Segurança do repositório de trabalho:**
   - Antes de tudo: `git tag pre-evolucao` + branch de backup.
   - Uma branch por fase (`evolucao/fase-N-nome`), commits pequenos e descritivos (Conventional Commits).
   - Nunca `push --force`, nunca commit direto em `main`. Tudo entra por Pull Request.
4. **Produção é intocável sem checkpoint:**
   - **Supabase:** nada de `DROP`, `TRUNCATE`, `DELETE` em massa ou migration destrutiva no projeto de produção. Teste em branch/projeto de desenvolvimento. Migrations sempre versionadas em `/supabase/migrations`.
   - **Vercel:** use apenas *preview deployments* durante o trabalho. Produção só no fim, com checklist da Fase 8 aprovado.
   - **GitHub:** configurações de segurança são aplicadas, mas nada que apague histórico ou acesso do dono.
5. **Segredos:** nunca imprima, comite ou coloque chaves em logs/prompts. Use `.env.local` + `.env.example` sem valores. Se encontrar segredo vazado no código ou no histórico: remova, avise em `NEEDS_FROM_STEVEN.md` e recomende rotação.
6. **Autonomia total, com honestidade.** Execute as mudanças você mesmo (não me devolva só instruções). Quando precisar de algo que só eu posso dar (chave de API, login, decisão de negócio), **não pare**: registre em `NEEDS_FROM_STEVEN.md` e continue com o que dá para fazer.
7. **Pesquise e instale ferramentas.** Faça deep research na web e no GitHub por MCPs, plugins, skills e bibliotecas úteis (testes, lint, segurança, otimização 3D, geração de assets). Instale e configure. Para MCPs, só instale; as chaves de API ficam comigo.
8. **Prove, não afirme.** Cada entrega precisa de evidência: build passando, testes passando, screenshots antes/depois, métricas de FPS/tamanho. Rode o jogo de verdade (navegador headless/Playwright) e olhe o resultado.
9. **Design sem "cara de IA".** Nada de gradientes roxos genéricos, cards todos iguais, emojis como ícones, fontes padrão. Quero identidade própria: imersivo, às vezes 3D, inovador, profissional e limpo (sem poluição visual).
10. **Decisão ambígua e irreversível?** Escolha a opção mais conservadora, registre o motivo em `docs/DECISOES.md` e siga em frente.

---

## 2. COMO TRABALHAR (swarm + goal)

- Comece sempre gerando um **Plan** (artefato de plano) para a fase, depois execute com **/goal** (autonomia até o fim, verificando). Use subagentes paralelos e worktrees separados.
- Nas fases paralelizáveis use **/swarm**. Papéis sugeridos:

| Agente | Responsabilidade | Dono de |
|---|---|---|
| Orquestrador | Plano, integração, resolução de conflitos, relatórios | `docs/`, merges |
| Auditor | Mapear código, assets, bugs, dívida técnica | `docs/AUDIT.md` |
| Segurança | Código, Supabase, Vercel, GitHub | `/supabase`, `vercel.json`, `.github/`, `SECURITY.md` |
| Artista 3D | Modelos, animações, materiais, partículas | `/src/assets`, `/src/models` |
| Gameplay | Mecânicas, bosses, missões, modos, eventos | `/src/game`, `/src/content` |
| UI/UX | HUD, menus, responsividade, acessibilidade | `/src/ui`, CSS |
| Mobile | PWA e app Expo | `/mobile` |
| QA | Testes, regressão visual, performance | `/tests`, CI |

- **Cada agente trabalha na sua branch/worktree** e só edita seus arquivos. Mudança em arquivo de outro dono = mensagem no quadro compartilhado do swarm.
- Contratos entre agentes (formato de dados de bosses/missões/modelos) são definidos pelo Orquestrador **antes** da implementação.
- Fique atento à cota/créditos; se apertar, priorize na ordem: segurança > correção de bugs > modelos > conteúdo novo > extras.

---

## 3. FASE 0 — AUDITORIA (somente leitura)

Gere `docs/AUDIT.md` com:

1. **Mapa do projeto:** stack, estrutura de pastas, fluxo do game loop, dependências (versão, vulnerabilidades, pacotes mortos).
2. **Inventário de modelos e assets** em tabela: `nome | onde é usado | origem (próprio/procedural/importado/placeholder) | qualidade 1–5 | tem design próprio? | ação (manter/melhorar/refazer)`.
3. **Lista de bugs** (lógicos e visuais) com passos para reproduzir, severidade e arquivo suspeito.
4. **Checagem das 96 ideias originais:** o que já existe, o que está parcial, o que falta.
5. **Baseline de performance:** FPS médio e mínimo (desktop e mobile emulado), tempo de carregamento, tamanho do bundle, memória, draw calls.
6. **Baseline visual:** screenshots de todas as telas e biomas, desktop e mobile.
7. **Auditoria de segurança inicial** (resumo; detalhes na Fase 2).

**Pare e apresente o plano das próximas fases em `docs/PLANO.md`** (para eu revisar rapidamente). Se eu não responder, siga o plano.

---

## 4. FASE 1 — ESTABILIZAÇÃO

- Corrigir **todos** os bugs da auditoria, começando pelos que travam ou quebram a jogabilidade.
- Resolver bugs visuais: z-fighting, sombras, clipping de modelos, texturas esticadas, UI cortada, flicker, escala errada, câmera atravessando objetos, partículas que não somem.
- Performance: *instancing*, *object pooling* (obstáculos, partículas, tiros, moedas), LOD, *frustum culling*, atlas/compressão de texturas, geometrias mescladas, `dispose()` correto (sem vazamento de memória), game loop com *fixed timestep* para física estável em qualquer FPS.
- Qualidade de código: TypeScript estrito (se o projeto permitir migração gradual), ESLint + Prettier, estrutura modular, remoção de código morto, comentários onde necessário.
- Testes: unitários (lógica de jogo, geração de obstáculos, pontuação), E2E com **Playwright** (menu → jogar → morrer → reiniciar), teste de regressão visual por screenshot.
- CI no GitHub Actions: lint + testes + build em todo PR.

**Pronto quando:** build limpo, testes verdes, zero erros no console, 60 FPS estáveis em desktop mediano.

---

## 5. FASE 2 — SEGURANÇA (prioridade máxima)

### 5.1 Código
- Auditar XSS/injeção (nicknames, chat, nomes de fase), sanitizar toda entrada de usuário.
- **CSP rígida**, sem `unsafe-eval` se possível; SRI em scripts externos.
- Dependências: `npm audit`, remover pacotes abandonados, travar versões (lockfile), Dependabot.
- Nada de lógica de pontuação confiável no cliente: **o servidor valida** (ver 5.2).
- Proteção contra abuso: rate limit, limites de tamanho de payload, validação de schema (Zod) em todas as bordas.
- Scan de segredos no código e no histórico (gitleaks/trufflehog).

### 5.2 Supabase
- **RLS ligada em TODAS as tabelas**, políticas de menor privilégio (leitura pública só onde faz sentido; escrita só do próprio usuário).
- Rodar `get_advisors` (segurança e performance) e corrigir tudo.
- `service_role` **jamais** no cliente; só `anon` no frontend.
- Ranking/leaderboard: pontuação enviada via **Edge Function** que valida (tempo de partida × pontos plausíveis, seed da partida, rate limit por usuário/IP), nunca insert direto pelo cliente.
- Índices, constraints (`CHECK`, `NOT NULL`, `UNIQUE`), tipos corretos, soft-delete onde fizer sentido, backups/PITR documentados.
- Auth: confirmação de e-mail, política de senha, limites de tentativa, redirect URLs restritas.
- Tudo via migrations versionadas e testadas em branch de dev.

### 5.3 Vercel
- Headers de segurança: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`.
- Variáveis de ambiente separadas por ambiente (Production/Preview/Development), nenhuma exposta com `NEXT_PUBLIC_`/`VITE_` que seja secreta.
- Proteção de previews, regras de firewall/WAF e rate limit onde o plano permitir, domínio com HTTPS forçado.
- Logs/observabilidade: conferir runtime logs e erros após cada deploy de preview.

### 5.4 GitHub
- Proteção da `main`: PR obrigatório, CI obrigatório, sem force push, histórico linear.
- Secret scanning + push protection, Dependabot (alerts + updates), CodeQL, `CODEOWNERS`, `SECURITY.md`, template de PR/issue.
- Recomendar (em `NEEDS_FROM_STEVEN.md`) 2FA/passkey, chaves SSH/PAT com escopo mínimo e expiração.

**Pronto quando:** `docs/SEGURANCA.md` lista cada risco encontrado, a correção aplicada e como verificar. Zero alertas críticos/altos abertos.

---

## 6. FASE 3 — MODELOS, ARTE E ANIMAÇÃO

1. **Guia de estilo** (`docs/ARTE.md`): estilo voxel coerente, tamanho do voxel, paleta por bioma, escala relativa (dino × obstáculos × cenário), regras de silhueta e contraste.
2. Para cada item do inventário marcado "refazer" ou "melhorar": **refazer com design próprio**, com silhueta reconhecível, detalhes, materiais e variação.
3. Prioridade de arte:
   - Os **13 dinossauros**: cada um com silhueta única, paleta própria e animações (correr, pular, abaixar, tomar dano, parado, vitória, derrota). Sem "mesmo modelo com outra cor".
   - Obstáculos (cactos, pedras, pterossauros, troncos, lava, gelo, etc.) com variações.
   - Cenário por bioma: camadas de parallax 3D, vegetação, céu dinâmico (ciclo dia/noite, clima), partículas ambientais.
   - UI e ícones com identidade própria.
4. Técnica: preferir geração **procedural/voxel em código** ou `.glb` leves; instancing, materiais compartilhados, texturas compactadas. Orçamento de triângulos por modelo documentado.
5. Visual de impacto sem custo alto: pós-processamento leve e *toggleável* (bloom sutil, vinheta), sombras suaves, partículas de poeira/impacto, *screen shake* configurável, câmera com FOV dinâmico por velocidade.
6. Criar uma **cena de debug "Galeria de Modelos"** (`/debug/models`) para ver, girar e testar todas as animações de cada modelo.

**Pronto quando:** nenhum modelo placeholder restante; screenshots antes/depois de todos os modelos em `docs/antes-depois/`.

---

## 7. FASE 4 — CONTEÚDO NOVO

Tudo **data-driven** (JSON/TS em `/src/content`) para eu adicionar conteúdo sem mexer em engine. Respeitar e completar as 96 ideias originais antes de acrescentar as abaixo.

### 7.1 Bosses (cada um com 3 fases de luta, padrões telegrafados, recompensa e cinemática curta)
- **Tiranossauro Mecânico:** laser, pisões que criam ondas, troca de armadura.
- **Rainha Meganeura:** enxames de insetos, ovos que explodem, voo em padrões.
- **Leviatã do Pântano:** emerge de lamaçais, tentáculos, névoa que reduz visão.
- **Golem de Lava:** mapa muda com rios de lava, rochas rolantes, fase de superaquecimento.
- **Guardião do Gelo:** piso escorregadio, estalactites, congela controles por instantes.
- **Pterossauro Tempestade:** raios previsíveis, rajadas laterais, luta em múltiplas pistas.
- **Boss secreto** (desbloqueio por conquista oculta).

### 7.2 Missões e progressão
- Missões diárias, semanais e de campanha encadeadas (com narrativa leve).
- Conquistas e troféus, bestiário/colecionáveis de dinos e criaturas.
- XP, níveis, prestígio, moeda do jogo, loja rotativa **apenas com itens cosméticos** (chapéus, trilhas, auras, skins), sem pay-to-win.
- Cartas de atributos balanceadas e com raridade.

### 7.3 Eventos
- Novos eventos dinâmicos: aurora boreal (buff), eclipse, migração de manada, tempestade de areia, chuva de meteoros evoluída, invasão de OVNI com minigame, tempestade elétrica, maré de lava.
- **Eventos sazonais** com calendário (Halloween, Natal, Ano Novo, aniversário do jogo), ativados por data.
- **Evento global semanal** (comunidade soma metros/pontos via Supabase Realtime) com recompensa coletiva.

### 7.4 Modos
- Boss Rush, Time Attack, **Desafio Diário com seed única** (todos jogam a mesma corrida), Hardcore (1 vida), Zen (sem morrer, foco em estética), Endless melhorado.
- **Corrida de Ghost:** correr contra o replay de outros jogadores/amigos.
- **Editor de fases** simples com compartilhamento por código via Supabase.
- Torneio semanal com ranking e recompensas cosméticas.
- Multiplayer local (Coop, PvP, controles compartilhados) refinado e testado.

### 7.5 Extras de qualidade de vida
- Modo Foto (câmera livre, filtros, exportar imagem).
- Música e SFX **adaptativos** (WebAudio, camadas que reagem à intensidade/boss), com mixagem de volumes.
- Tutorial interativo curto, dicas de carregamento, tela de estatísticas e histórico de partidas.
- Cloud save (Supabase) + save local com migração de versão.
- Replays curtos da melhor corrida.

**Pronto quando:** cada item entregue tem testes de lógica + teste manual descrito em `docs/CONTEUDO.md` e balanceamento listado em um único arquivo de config.

---

## 8. FASE 5 — RESPONSIVIDADE E PORT PARA CELULAR (web)

- Refazer media queries e layout: de 320px a 4K, retrato e paisagem, dobráveis e *notch*.
- `100dvh`, `env(safe-area-inset-*)`, impedir zoom/scroll/pull-to-refresh acidentais, `touch-action` correto.
- **Controles touch** de verdade: swipe (pular/abaixar), botões virtuais configuráveis (tamanho/posição), opção de giroscópio, áreas de toque confortáveis (≥ 44px), *haptics* quando disponível.
- **Qualidade gráfica adaptativa:** detectar FPS e ajustar pixel ratio, sombras e partículas automaticamente; presets Baixo/Médio/Alto/Auto.
- **PWA:** manifest, ícones, service worker com cache offline do jogo, instalável.
- Suporte a teclado remapeável e gamepad.
- Testar com Playwright em matriz de viewports e emulação de dispositivos; salvar screenshots em `docs/mobile/`.

**Pronto quando:** jogável sem cortes de UI em todos os tamanhos da matriz, e ≥ 30 FPS estáveis em celular de entrada (emulado com CPU throttling).

---

## 9. FASE 6 — APP EXPO GO

Criar `/mobile` com **Expo (SDK estável mais recente) + TypeScript**, rodando no **Expo Go** (sem módulos nativos customizados).

- **Etapa A (obrigatória, entregar primeiro):** app Expo que carrega o jogo em `WebView` (build local empacotado ou URL da Vercel), com *bridge* de mensagens para: haptics, salvar progresso, compartilhar score, notificações locais (desafio diário), controle de orientação e tela cheia, tratamento de offline.
- **Etapa B (experimento medido):** versão com renderização nativa (`expo-gl` + `@react-three/fiber/native`) em uma cena de prova de conceito. Compare FPS/memória com a Etapa A e **recomende com dados** qual caminho seguir.
- Login Supabase com `expo-secure-store`; deep links; ícone, splash e nome do app com identidade do jogo.
- Documentar em `/mobile/README.md`: como rodar no Expo Go (QR code), variáveis de ambiente, e o caminho futuro para EAS Build / dev client / publicação.

**Pronto quando:** `npx expo start` abre o jogo jogável no Expo Go em Android e iOS, com progresso sincronizado.

---

## 10. FASE 7 — QUALIDADE FINAL

- Acessibilidade: modo daltônico, remapeamento de teclas, reduzir movimento/flashes, tamanho de fonte, contraste.
- Internacionalização: **pt-BR, en, es** com arquivos de tradução.
- Analytics **opt-in e respeitando privacidade** (sem dados pessoais), painel de erros.
- Orçamentos de performance verificados no CI (tamanho de bundle, tempo de carregamento, FPS mínimo).
- Lighthouse (PWA, performance, acessibilidade, boas práticas) ≥ 90 onde aplicável.
- Documentação: `README.md` completo, `CHANGELOG.md`, `docs/ARQUITETURA.md`, guia de como adicionar boss/missão/modo/modelo.

---

## 11. FASE 8 — RELEASE

1. Deploy de **preview** na Vercel, checklist completo: sem erros no console, logs limpos, headers de segurança ok, RLS testada com usuário anônimo e autenticado, fluxo completo de jogo testado.
2. Abrir PR final com resumo, screenshots, métricas antes/depois.
3. Só após o checklist: promover para produção.
4. Gerar `docs/RELATORIO_FINAL.md`: o que mudou, métricas antes/depois, riscos restantes, próximos passos sugeridos.

---

## 12. ENTREGAS OBRIGATÓRIAS (arquivos)

`docs/AUDIT.md` · `docs/PLANO.md` · `docs/ARTE.md` · `docs/SEGURANCA.md` · `docs/CONTEUDO.md` · `docs/DECISOES.md` · `docs/RELATORIO_FINAL.md` · `NEEDS_FROM_STEVEN.md` · `SECURITY.md` · `CHANGELOG.md` · `.env.example`

---

## 13. COMECE AGORA

1. Gere um Plan e execute a **Fase 0** (somente leitura). Gere `docs/AUDIT.md` e `docs/PLANO.md`.
2. Em seguida, com `/goal`, faça a Fase 1 e a Fase 2.
3. Depois use `/swarm` para as Fases 3, 4, 5 e 6 em paralelo, seguindo os donos de arquivos da seção 2.
4. Termine com as Fases 7 e 8.

**Lembrete final:** melhorar sem estragar. Na dúvida entre ousar e preservar o que já é divertido, preserve e adicione por cima (feature flags), e me mostre a diferença.
