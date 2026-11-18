# DINO DASH 3D — RODADA DE CAÇA A BUGS, REVISÃO TOTAL E NOVOS SISTEMAS

> Para: Antigravity App 2.0 (Gemini 4 Argon)
> Complementa o `PROMPT_EVOLUCAO_DINO_DASH_3D.md`. Se houver conflito, **este documento vence** nos itens que ele cita.
> Idioma dos docs e da conversa: português do Brasil. Código e commits: inglês.

---

## 0. COMO LER ESTE DOCUMENTO

Você é um **time de agentes sêniores** (game dev 3D, gameplay, rede/multiplayer, UI/UX de jogos, mobile, backend/segurança, QA). Trabalhe em **paralelo com /swarm** (ou subagentes paralelos, se o /swarm não estiver disponível).

Este arquivo tem:
- **Parte A:** regras de ouro.
- **Parte B:** problemas que eu já encontrei jogando (prioridade máxima).
- **Parte C:** revisão total de lógica por swarm de caça a bugs.
- **Parte D:** novos sistemas (contas, perfil, conquistas, save visível, menus de jogo).
- **Parte E:** regra "só troque se ficar melhor" para designs e animações.
- **Parte F:** execução, entregas e critérios de pronto.

Trabalhe em **ordem de prioridade** e mantenha `docs/PROGRESSO.md` sempre atualizado (o que foi feito, o que falta, onde parou). Se a cota acabar no meio, outro agente precisa conseguir continuar só lendo esse arquivo.

---

## PARTE A — REGRAS DE OURO

1. **Leia primeiro** o prompt original, os docs do projeto e o código todo antes de editar.
2. **Não estrague o jogo.** Antes de começar: `git tag pre-correcoes`. Uma branch por frente (`fix/...`, `feat/...`), commits pequenos, PRs. Nunca `force push`, nunca direto na `main`.
3. **Todo bug corrigido ganha um teste** (unitário ou E2E) ou, quando for visual, um screenshot antes/depois em `docs/bugs/`.
4. **Reproduza antes de corrigir.** Sem reprodução, descreva a hipótese em `docs/BUGS.md` e marque como "não reproduzido".
5. **Dados em config, não no código.** Valores de balanceamento (vida do boss, dano, cooldowns, intervalos de eventos, custo de reviver, oxigênio) ficam em **um arquivo de configuração central**, comentado, para eu ajustar fácil.
6. **Segurança:** nunca imprima/comite chaves. Senhas nunca são tratadas por código próprio (use Supabase Auth). Supabase e Vercel: só dev/preview até o fim. Nada de `DROP`/`DELETE` em massa em produção.
7. **Autonomia:** execute as mudanças, não me devolva só instruções. O que só eu posso fazer (chaves de OAuth, SMTP, decisões) vai para `NEEDS_FROM_STEVEN.md` e você segue com o resto.
8. **Design sem "cara de site/IA":** menus devem parecer **jogo** (ver Parte D5).
9. **Ferramentas de debug só em desenvolvimento** (ver B0). Elas **não podem existir no build de produção**.

---

## PARTE B — PROBLEMAS CONHECIDOS (corrigir primeiro)

### B0. Ferramentas de teste (fazer ANTES de tudo, para conseguir validar o resto)
Crie um **painel de debug** ativado por `?debug=1` (ou tecla), **removido do build de produção**, com:
- Definir pontuação/distância (ex.: pular direto para 60.000 pts).
- Forçar evento específico, forçar boss, forçar predador, forçar bioma.
- Modo invencível, vida/escudo infinitos, tempo x2/x4.
- Matar um jogador (para testar reviver), adicionar jogadores simulados (2 a 4).
- Overlay com: FPS, estado do spawner de eventos (próximo evento, cooldown, pesos), oxigênio, estado do boss, jogadores vivos/mortos.
- Log de eventos do jogo em tempo real.

### B1. Boss demora demais (mesmo no modo Normal)
- Medir o tempo atual da luta (média de 5 partidas simuladas) e **registrar em `docs/BOSS.md`**.
- Meta de duração no **Normal: 60 a 90 s** (Fácil: ~45–60 s, Difícil: ~90–120 s), em **config**.
- Ajustar vida do boss, janelas de vulnerabilidade, tempo parado entre ataques e cooldowns. A luta deve ter ritmo: telegrafar → atacar → janela de dano → repetir, sem tempos mortos longos.
- Garantir que o boss **não** fica invulnerável ou "preso" em estado sem saída (checar a máquina de estados inteira).
- Teste automatizado: simulação headless da luta com um "bot" que ataca sempre, verificando que o boss morre dentro da meta.

### B2. O ataque (tecla Q) não faz nada
- Investigar o fluxo completo: input → habilidade → hitbox → dano → feedback.
- **O jogador deve conseguir atacar o boss** (e inimigos/obstáculos quando fizer sentido).
- Definir em config: dano, alcance/forma da hitbox, cooldown, custo (se houver), animação, som, partículas, *hit stop* leve, número de dano e barra de vida do boss reagindo.
- Mostrar o cooldown no HUD e uma **dica na primeira vez** que o boss aparece ("Pressione Q para atacar").
- Revisar se cada dinossauro precisa de ataque próprio (ex.: investida, mordida, cauda). Se já existir diferenciação, garantir que funciona; se não, adicionar variação leve por tipo.
- No **celular**, o ataque precisa de botão touch (ver B8).
- Testes: dano aplicado, cooldown respeitado, não atacar enquanto morto/reviver, funciona em multiplayer (cada jogador causa dano e o servidor/host contabiliza uma vez).

### B3. Eventos não acontecem (60k pontos e só boss + predador)
**Eu quero EVENTOS, não troca de mapa/bioma.** Eventos são situações temporárias no meio da corrida que mudam a jogabilidade.

1. **Diagnosticar:** por que nenhum evento disparou até 60k (condição errada, probabilidade, flag desligada, evento só no modo X, cooldown travado, bug de contagem de distância, boss/predador bloqueando o spawner). Documentar a causa em `docs/EVENTOS.md`.
2. **Reescrever/validar o agendador de eventos** (data-driven):
   - Gatilhos por distância/pontos/tempo, com **intervalo mínimo e máximo** configuráveis.
   - Primeiro evento garantido por volta dos **1.500–3.000 pts** (config), depois a cada **faixa de 1.500–4.000 pts** com variação.
   - Pesos por evento e por fase da corrida; **sem repetir o mesmo evento duas vezes seguidas**.
   - Eventos **não** disparam durante boss nem durante o intro de predador (fila de espera: dispara logo depois).
   - Um evento por vez (no máximo 2 simultâneos só se forem compatíveis, definido em config).
   - Respeitar a opção "Desbloqueio Progressivo na Corrida" (eventos mais fortes só depois).
3. **Catálogo de eventos** (implementar todos que ainda não existam; cada um com aviso visual/sonoro 2–3 s antes, duração, recompensa/risco, e fim claro). Sugestões:
   - Chuva de meteoros (áreas marcadas no chão antes de cair)
   - Manada em fuga (dinos NPC cruzam a pista; desviar ou subir)
   - Tempestade elétrica (raios telegrafados, com para-raios que dão bônus)
   - Tempestade de areia (visão reduzida, vento empurra de lado)
   - Invasão de OVNI (minigame, já previsto)
   - Maré de lava / terremoto (pista treme, fendas)
   - Eclipse (escuro, vaga-lumes marcam o caminho, bônus de moedas)
   - Aurora (buff curto de velocidade/escudo para quem coletar orbes)
   - Chuva de moedas / ouro (evento positivo)
   - Fuga de ovos (coletar ovos raros, predador atraído)
   - Ponte quebrando / travessia (pular em plataformas)
   - Enxame de insetos / pterossauros em formação
4. **Experiência:** banner de aviso estiloso, sem poluir; sons; opção de reduzir efeitos (acessibilidade); funcionar igual em multiplayer (mesma seed/estado para todos).
5. **Debug:** `?debug=1` permite forçar cada evento; teste E2E que simula chegar a 60k e confirma que **pelo menos N eventos** ocorreram.

### B4. Multiplayer: dinossauros atrapalham uns aos outros
Com 3+ jogadores os dinos se sobrepõem e atrapalham. Implementar **modos de pista** (opção da sala, padrão = o melhor para a maioria):
- **Pistas paralelas (padrão recomendado):** cada jogador corre na **própria pista**, que é um clone idêntico (mesmos obstáculos/eventos, mesma seed). Eu vejo as outras pistas ao lado (lateral/ao fundo, com leve escala menor e/ou transparência), mas **o foco visual e a câmera são do meu dinossauro**.
- **Modo Ghost:** todos na mesma pista, mas os outros jogadores aparecem **semitransparentes e sem colisão** entre si. O meu aparece sólido na minha tela.
- **Clássico (opcional):** o comportamento atual, para quem gosta do caos, com colisão leve ou nenhuma (config).
- Câmera: manter a opção "Câmera Única Compartilhada (Clássico)" e **adicionar câmera por jogador** quando for tela dividida/pistas paralelas (verificar o que já existe antes de criar).
- Garantir que **hitboxes e dano** continuam justos: cada jogador só colide com os obstáculos da **própria** pista.
- Testar com 2, 3 e 4 jogadores (inclusive misturando teclado, gamepad e celulares como controle via QR).

### B5. Jogador morre: aviso, dica e reviver (V) equilibrado
1. **Aviso para os vivos:** quando alguém morre, aparece na tela de todos os vivos uma notificação com o **nick do jogador** ("**Nick** caiu!") com animação curta, estilo jogo, sem cobrir a ação.
2. **Dica de reviver:** mostrar para os vivos "Pressione **V** para reviver **Nick**" (no celular, botão contextual — ver B8), com indicador de distância/tempo restante.
3. **Limitação (o V não pode ser de graça).** Implementar como opções configuráveis (padrão = combinação abaixo) e **expostas nas opções da sala multiplayer**:
   - **Custo:** reviver custa **1 vida OU 1 escudo** de quem revive (se não tiver, não pode).
   - **Cooldown pessoal** para reviver (ex.: 20–30 s, config).
   - **Janela de tempo:** o morto só pode ser revivido nos primeiros X s (ex.: 15 s); depois fica espectando até a próxima "rodada"/checkpoint (definir regra clara).
   - **Limite por corrida** (ex.: máx. 2 revives por jogador, config).
   - **Revive com invulnerabilidade curta (2–3 s)** e vida reduzida, para não morrer de novo na hora.
   - Cancelar se quem está tentando reviver for atingido (opcional, config).
4. Tela do jogador morto: espectar um aliado vivo, ver tempo da janela de reviver, mensagem clara do que fazer.
5. Casos de borda: todos morrem; dois tentam reviver o mesmo; reviver durante boss/evento; jogador desconecta enquanto morto; reviver em pista paralela (a posição do reviver deve ser coerente).

### B6. Oxigênio/mergulho confuso (X + impulso é longo demais)
Problema: no abismo submerso o oxigênio cai, e recuperar exige **X** e depois impulso, o que é pouco intuitivo (sem dica) e pior no celular.
- **Dica automática** na primeira vez que o dinossauro submerge e quando o oxigênio fica baixo ("Suba para respirar" / "Pressione ___"), com a **barra de oxigênio** bem visível e alerta sonoro/visual progressivo (verde → amarelo → vermelho pulsando).
- **Simplificar a mecânica:** respirar deve ser **uma ação só** (um botão contextual "Respirar/Subir" ou subir nadando até a superfície repõe oxigênio automaticamente). Manter X como atalho opcional se fizer sentido, mas o caminho principal precisa ser curto e óbvio.
- Opcional: **bolhas de ar/ bolsões de oxigênio** coletáveis no caminho (reduz a frustração).
- Definir em config: consumo por segundo, recarga, dano por falta de ar, tempo de graça.
- Funcionar igual em **PC, celular e gamepad**, e em multiplayer (cada jogador tem o seu oxigênio).
- Teste: submergir e verificar dica, consumo, recarga, morte por falta de ar e prevenção de "loop infinito" sem saída.

### B7. Bug visual da água ao submergir / trocar de habitat (dinos híbridos)
- Quando o dino abaixa na água (submerge) as **texturas da água bugam** enquanto submerso.
- Investigar: *z-fighting*, transparência/ordem de renderização (`renderOrder`, `depthWrite`, `transparent`), câmera dentro do plano da água, culling de faces (`side`), planos de near/far, reflexos/refração.
- Implementar um **efeito submerso correto** (por exemplo: quando a câmera/dino está abaixo da superfície, trocar para material de "visão subaquática" com névoa azulada, partículas de bolhas e raios de luz; superfície vista de baixo com `DoubleSide` bem tratado).
- Testar a **transição** entrando/saindo da água, trocando de habitat (terra ↔ água) com dinos híbridos, e em todos os biomas com água.
- Prova: screenshots antes/depois em `docs/bugs/agua/`.

### B8. Controles no celular (revisão completa)
- Mapear **todas** as ações do jogo (pular, abaixar, atacar Q, reviver V, respirar/mergulhar, habilidades, pausa, troca de câmera, etc.) e garantir **equivalente touch**.
- **Botões contextuais**: só aparecem quando fazem sentido (ex.: "Reviver Nick" ao lado de um aliado caído; "Respirar" quando submerso; "Atacar" na luta contra boss).
- Posição/tamanho **configurável**, modo canhoto, botões ≥ 44px, sem sobreposição, sem esconder a ação, feedback tátil.
- Testar em retrato e paisagem, vários tamanhos (320px a tablet), e no fluxo de **celular como controle via QR** (conferir latência, reconexão, quem controla qual dino).

---

## PARTE C — REVISÃO TOTAL DE LÓGICA (caça a bugs em massa com /swarm)

Eu quero que **todos os agentes revisem TODA a lógica do jogo, sem exceção**, pensando em **todos os tipos de usuário**.

### C1. Formação do swarm (cada agente com seu domínio, trabalhando em worktrees separados)
| Agente | Revisa |
|---|---|
| Orquestrador | Plano, `docs/BUGS.md`, priorização, integração dos PRs, conflitos |
| Lógica Core | Game loop, física, colisão, pontuação, dificuldade, spawn de obstáculos, pausa, reinício |
| Combate & Boss | Ataques, dano, boss, predadores, intros, máquina de estados, vitória/derrota |
| Eventos & Progressão | Agendador de eventos, desbloqueio progressivo, biomas, missões, cartas, moedas, loja, gacha |
| Multiplayer | Salas, sincronização, pistas, câmera, reviver, desconexão/reconexão, QR/controle por celular |
| Água & Habitats | Oxigênio, mergulho, habitats, dinos híbridos, bugs visuais da água |
| Render & Visual | Z-fighting, sombras, câmeras, clipping, partículas, materiais, memória de GPU, `dispose()` |
| UI/UX | Menus, HUD, tooltips, navegação por teclado/gamepad/toque, textos, tradução |
| Mobile & Acessibilidade | Controles touch, responsividade, orientação, modo TV, modo espelhado, daltonismo, reduzir movimento |
| Save & Dados | Importar/Exportar, versões de save, corrupção, migração, convidado ↔ conta |
| Backend & Segurança | Auth, Supabase (RLS), Edge Functions, Vercel, validação, anti-cheat, LGPD |
| Red Team (QA caótico) | "Joga" o jogo com **Playwright** usando entradas aleatórias (*monkey/fuzz testing*), aperta tudo, redimensiona, troca de aba, perde conexão, e tenta quebrar |
| Revisor | Lê **cada diff** de cada agente antes do merge, procurando regressão |

### C2. Método obrigatório
1. **Fase de caça (somente leitura + testes):** cada agente lê seu domínio, escreve testes que **falham** quando há bug, e registra em `docs/BUGS.md`:
   `ID | domínio | descrição | como reproduzir | severidade (crítico/alto/médio/baixo) | arquivo | status`.
2. **Fase de correção:** corrigir por severidade (crítico → baixo). Cada correção referencia o ID do bug. O teste que falhava passa a passar.
3. **Fase de verificação cruzada:** o Revisor e o Red Team **reexecutam** tudo depois das correções para caçar regressões.
4. **Meta mínima de cobertura de revisão:** cada arquivo de código do jogo deve ter sido lido por pelo menos um agente; registrar a lista em `docs/COBERTURA_REVISAO.md`.

### C3. Checklist de perguntas que TODO agente precisa responder sobre o seu domínio
- O que acontece se o jogador **pausar**, minimizar, trocar de aba, ou a aba ficar em segundo plano?
- O que acontece com **FPS baixo ou muito alto** (60/144/240 Hz)? A física depende de frame rate?
- O que acontece ao **redimensionar/rotacionar** a tela no meio da partida?
- O que acontece com **1, 2, 3, 4 ou mais** jogadores? E se alguém **entrar/sair/desconectar** no meio?
- O que acontece com **todos os modos** (normal, difícil, professor, espelhado, TV, etc.) e **todos os dinossauros**, principalmente os **híbridos**?
- Há **estados sem saída** (soft lock)? Há **valores NaN/undefined/negativos**? **Divisão por zero**? **Vazamento de memória** em partidas longas (30+ min)?
- O que acontece se o **save** estiver corrompido, de versão antiga, vazio ou enorme?
- O que acontece se o **relógio do aparelho** for alterado (missões diárias)?
- Todo texto e dica está em **pt-BR, en e es**? Há texto cortado?
- Algum recurso **depende só de mouse** ou **só de teclado**?
- Um **jogador novo**, uma **criança**, um **professor** (modo aula), alguém com **daltonismo**, alguém em **celular fraco** ou **TV** conseguiria entender e jogar?
- Há algo que **dá vantagem injusta** (exploit) ou que **dá para trapacear** no ranking?

---

## PARTE D — NOVOS SISTEMAS

### D1. Opções da sala multiplayer (trazer parte dos "Extras" das configurações)
Ao **criar sala**, mostrar opções relevantes (agrupadas e bem explicadas), por exemplo:
- **Modo de pista:** Paralelas (recomendado) / Ghost / Clássico.
- **Câmera multiplayer:** (usar as que já existem nas configurações).
- **Regras de reviver:** custo, cooldown, janela, limite por corrida (ver B5).
- **Dificuldade da sala**, quantidade de jogadores, sala pública/privada com código.
- **Modo TV de Sala (HUD maior)**, **Modo Espelhado**, **Intros dos Predadores** (sempre/nunca/só na primeira vez), **Dicas Visuais sobre Obstáculos**.
- **Modo Professor/Aula (Livre)** quando fizer sentido para sala de aula.
- Itens que **não** fazem sentido por sala (idioma, narrador pessoal, exportar save) ficam só nas configurações pessoais.
- **Tooltips:** ao passar o mouse (e em **toque longo** no celular) cada opção mostra uma explicação curta do que faz. O botão de ajuda "?" ao lado também abre a mesma explicação.
- O host define as regras; os convidados **veem** as regras antes de entrar.

### D2. Contas e login (Supabase Auth)
Requisitos:
- **Criar conta:** nick, e-mail, senha e confirmar senha. Validar força da senha, nick único (3–16 caracteres, sem ofensas, filtro de palavrões em pt-BR/en/es), e-mail válido.
- **Login:** por **nick + senha** (e também por e-mail + senha). Como o Supabase autentica por e-mail, implementar a busca nick → e-mail **no servidor** (Edge Function/RPC), **sem expor e-mails** de outros usuários e **sem revelar** se um nick/e-mail existe (mensagem de erro genérica; evitar enumeração de usuários).
- **E-mail de confirmação** da conta e **e-mail de boas-vindas** ("sua conta foi criada"), via Supabase Auth + provedor de e-mail (SMTP/Resend). Listar o que preciso configurar em `NEEDS_FROM_STEVEN.md`.
- **Recuperar senha** por e-mail.
- **Modo convidado/local continua existindo**; o jogo inteiro deve funcionar sem conta. Ao criar conta, **migrar o progresso local** para a conta (com confirmação e backup antes).
- **Vincular contas** (Discord, Google; outros se fizer sentido) para **login rápido**, usando OAuth do Supabase (`signInWithOAuth` / vincular identidade a uma conta existente). Não armazenar tokens de terceiros no cliente além do necessário.
- **Segurança:** RLS em todas as tabelas; **rate limit** em login/cadastro; proteção contra força bruta; sessão com refresh seguro; logout em todos os dispositivos; excluir conta (ver D8).
- **Idade e privacidade (jogo pode ter público jovem):** coletar o mínimo de dados; **não** pedir dados desnecessários; textos de consentimento e termos claros; respeitar LGPD e a regra do ECA Digital já usada no jogo (caixas gacha desativáveis). Fluxo de **aviso/consentimento adequado** para menores, conforme o que o jogo já faz, e listar dúvidas jurídicas em `NEEDS_FROM_STEVEN.md` (você **não** é advogado; sinalize onde um profissional deve revisar).
- Testes: cadastro, login, erro de senha, nick duplicado, e-mail não confirmado, recuperação, vínculo OAuth, migração de progresso, convidado → conta.

### D3. Perfil do jogador
Botão **Perfil** no menu inicial, abrindo uma tela estilizada como jogo, com:
- **Foto de perfil = um dinossauro** renderizado do jogo, com **ângulo e zoom personalizáveis** (preview 3D ao vivo, girar/aproximar e escolher a pose). Armazene os **parâmetros** (dino, ângulo, zoom, skin) e gere a imagem a partir deles; se salvar imagem, limite de tamanho e tipo.
- **Alterar nickname** (com as mesmas regras de D2, limite de trocas, ex.: 1 a cada 7 dias, em config).
- **Biografia** curta (limite de caracteres, filtro de ofensas, sanitizada contra XSS).
- **Troféus e conquistas** em destaque (escolher alguns para exibir, "vitrine").
- **Estatísticas:** melhor pontuação, distância total, partidas, bosses derrotados, tempo de jogo, dino favorito.
- Nível/XP, títulos desbloqueáveis, banners/molduras (cosméticos).
- Privacidade: opção de **perfil público/privado**.
- **Funciona também para convidado** (perfil local), com convite para criar conta e sincronizar.

### D4. Sistema de conquistas e troféus
- **Data-driven** (`/src/content/achievements`): id, nome, descrição, categoria, raridade (comum/raro/épico/lendário), requisito, recompensa (cosmético/XP/título), ícone, oculta ou não.
- Categorias: Corrida, Bosses, Eventos, Predadores, Multiplayer/Co-op (ex.: reviver aliados), Exploração (biomas, habitats, mergulho), Coleção (dinos, skins), Maestria (sem dano, speedrun), Segredos.
- Quantidade inicial: **pelo menos 60 conquistas** equilibradas (fáceis → muito difíceis) + **troféus** por marcos (ex.: bronze/prata/ouro/platina).
- **Notificação (toast)** estilizada ao desbloquear, tela de **Galeria de Conquistas** com progresso (ex.: 7/20), filtros e busca.
- **Local para convidado; sincronizado para conta.** Conquistas que afetam ranking/recompensas são **validadas no servidor**; as puramente locais podem ser locais.
- Prevenção de exploit (não dar conquista duas vezes, não contar partidas em modo debug/importado).
- Testes de lógica para cada tipo de requisito.

### D5. Menus e opções com cara de JOGO (não de site)
- **Redesenhar menus, seletores, caixas de seleção, listas, abas, popups e botões** como UI de jogo: moldura/estilo próprio coerente com o tema (o marrom/âmbar atual pode ser a base), cantos e bordas com personalidade, ícones próprios, **animações de hover/foco/clique**, **sons de UI**, transições, partículas leves.
- Substituir `<select>`/`checkbox` "de navegador" por **componentes customizados** de jogo (toggles tipo interruptor, seletores com setas ◀ ▶, sliders estilizados).
- **Navegação por teclado, gamepad e toque** em todos os menus, com foco visível.
- **Tooltips** com explicações em todas as opções (ver D1).
- Organização: agrupar por abas/categorias (Jogabilidade, Vídeo, Áudio, Acessibilidade, Multiplayer, Conta/Dados); **não esconder** itens importantes atrás de "Mostrar mais opções…".
- Manter consistência em todo o jogo (menus, HUD, popups de descoberta, loja, perfil).
- Regra da Parte E vale aqui: **só substituir um visual se o novo for claramente melhor** (mostrar antes/depois).

### D6. Importar/Exportar Save visível e confiável
- Hoje está "escondido". **Colocar em lugares óbvios**: no menu principal (ex.: "Dados & Save"), no **Perfil** e nas **Configurações** (aba Conta/Dados), com ícones claros.
- **Exportar:** gera arquivo `.json` com nome e data, com **versão do schema** e checksum. Mostrar mensagem de sucesso.
- **Importar:** validar **schema, versão, tamanho máximo e tipos**; **mostrar um resumo/pré-visualização** (nível, moedas, dinos, conquistas) antes de aplicar; **criar backup automático** do save atual antes de sobrescrever; permitir **cancelar**; mensagens de erro claras e em português.
- **Segurança:** o JSON importado é **entrada não confiável** (proteger contra *prototype pollution*, valores absurdos, XSS em nick/bio). Dados importados **não** entram em rankings/conquistas validadas no servidor (marcar como "importado").
- Migração de versões antigas de save, com testes (incluindo save corrompido/vazio/enorme).
- Funcionar em **PC e celular** (no celular, usar o seletor de arquivos e compartilhamento).

### D7. Ajustes de conteúdo e de tutoriais ligados aos problemas acima
- Dicas contextuais (primeira vez): atacar o boss (Q), mergulhar/respirar, reviver aliado (V), eventos (o que cada aviso significa).
- Popups de descoberta continuam, mas **sem poluir** (fila, no máximo um por vez, opção para desativar).

### D8. LGPD, dados e exclusão
- Manter e **melhorar** a tela "LGPD, Termos & Excluir Dados": agora também **excluir conta e dados na nuvem** (com confirmação), **exportar meus dados**, e **política de privacidade** legível.
- Explicar de forma simples o que é salvo localmente e o que vai para a nuvem.

---

## PARTE E — REGRA: "SÓ TROQUE SE FICAR MELHOR"

Vale para **designs de modelos, UI e animações**:
1. **Não substitua** um visual/animação que já está bom. Antes de mudar, tire **screenshot/gravação do atual**.
2. Crie o novo **ao lado** (feature flag) e compare **lado a lado**. **Só troque** se o novo for **claramente melhor**; caso contrário, **mantenha o atual** e registre em `docs/DECISOES.md` o que foi comparado e por quê.
3. **Estilo voxel é mantido.** Nada de mudar o estilo.
4. **Dinossauros:** o design geral **está bom**. O que fazer é **retocar e diferenciar**:
   - Nenhum dino pode parecer "o mesmo modelo com outra cor". Em especial **Carnotauro × T-rex**: diferenciar silhueta e detalhes.
   - **Chifres 3D de verdade** (o chifre do Carnotauro hoje é só um pontinho): volume, ponta, curvatura, e detalhes de sobrancelha/crânio.
   - **Mãozinhas/braços** melhores (garras, dedos, proporção) e detalhes como cicatrizes, listras, penas, espinhos, cristas, padrões de pele, cauda e dentes, **de acordo com cada espécie**.
   - Atualizar a **Galeria de Modelos** (`/debug/models`) para comparar antes/depois.
5. **Animações:** melhorar (corrida, pulo, abaixar, ataque, dano, morte, reviver, nado, vitória) **somente se a nova versão for melhor**: mais fluida, com antecipação/impacto/sobreposição, *easing* melhor, sem "deslizar", e **sem aumentar o custo de performance**. Comparar lado a lado (gravação curta) antes de trocar.
6. **Meta:** cada alteração deve deixar o jogo **melhor que antes**. Se não deixar, não entra.

---

## PARTE F — EXECUÇÃO, ENTREGAS E "PRONTO QUANDO"

### Ordem de execução
1. **B0** (ferramentas de debug) → permite testar tudo.
2. **Parte C, fase de caça** (swarm) em paralelo com **B1–B8**.
3. **Correções por severidade**, começando por B2 (Q), B3 (eventos), B1 (boss), B4/B5 (multiplayer), B6/B7 (água/oxigênio), B8 (mobile).
4. **Parte D** (D6 save visível → D5 menus → D1 opções da sala → D4 conquistas → D2 contas → D3 perfil → D8).
5. **Parte E** (retoques de dinos e animações).
6. **Verificação cruzada** final (Revisor + Red Team) e relatório.

### Entregas (arquivos)
`docs/PROGRESSO.md` · `docs/BUGS.md` · `docs/COBERTURA_REVISAO.md` · `docs/BOSS.md` · `docs/EVENTOS.md` · `docs/MULTIPLAYER.md` · `docs/DECISOES.md` · `docs/bugs/` (screenshots) · `NEEDS_FROM_STEVEN.md` · `CHANGELOG.md` atualizado · `docs/RELATORIO_CORRECOES.md` (resumo: bugs achados/corrigidos, métricas antes/depois, riscos restantes).

### Pronto quando (checklist final)
- [ ] Boss no Normal termina em **60–90 s** (testado por simulação).
- [ ] **Q ataca e causa dano**, com feedback e cooldown, no PC e no celular.
- [ ] Chegando a **60k pts** ocorrem **vários eventos** diferentes, sem troca de bioma; nenhum evento durante boss/intro.
- [ ] Multiplayer com 3–4 jogadores: sem atrapalhar uns aos outros (**pistas paralelas / ghost**), foco na minha pista.
- [ ] Aviso de morte com **nick** + dica de **V**; reviver com **custo/cooldown/janela/limite**; casos de borda tratados.
- [ ] Oxigênio: **dica automática**, ação única de respirar, funciona no celular; **sem bug visual da água** ao submergir e ao trocar de habitat.
- [ ] Controles touch completos, com botões contextuais.
- [ ] Revisão total feita (**cobertura registrada**), todos os bugs críticos/altos corrigidos com teste.
- [ ] Opções da sala multiplayer com tooltips; menus com cara de jogo e navegação por teclado/gamepad/toque.
- [ ] **Importar/Exportar Save** visível, validado, com backup e pré-visualização.
- [ ] **Contas** (cadastro, login nick+senha, e-mail, recuperar senha, vincular Discord/Google), **perfil** com foto de dino 3D, bio, troféus; convidado continua funcionando.
- [ ] **60+ conquistas** e galeria funcionando.
- [ ] Dinos diferenciados (chifres 3D, mãos, detalhes) e animações melhoradas **somente onde ficou melhor** (antes/depois documentado).
- [ ] Debug **ausente** no build de produção; zero erros no console; testes verdes; deploy **apenas em preview**.

**Lembrete final:** reproduza antes de corrigir, teste depois de corrigir, e **não troque o que já está bom**. Se a cota acabar, atualize o `docs/PROGRESSO.md` e pare em um estado estável (build passando).
