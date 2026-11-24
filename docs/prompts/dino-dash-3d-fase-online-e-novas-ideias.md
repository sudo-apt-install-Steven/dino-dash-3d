# DINO DASH 3D — EXPANSÃO: MULTIPLAYER ONLINE/LAN, CELULAR COMO CONTROLE, DEPLOY E 100 NOVAS IDEIAS

Este arquivo COMPLEMENTA a especificação principal (prompt-dino-dash-3d.md). Leia os dois. Onde houver conflito, este arquivo manda.

Você é um desenvolvedor sênior. Implemente, configure e publique o que está descrito aqui no projeto existente. Trabalhe em fases, teste cada uma rodando o jogo e, no fim de cada fase, resuma em poucas linhas o que foi feito. Nunca quebre o que já funciona.

---

## PARTE A — ARQUITETURA DO MULTIPLAYER (modelo "Jackbox")

**Conceito:** o PC/TV é a "tela principal" e cada celular é o controle e a tela pessoal do jogador. Isso resolve o problema de celular e PC estarem em redes diferentes.

### Tela principal (PC/TV)
- Mostra o jogo principal com TODOS os dinossauros na mesma pista. NÃO mostrar uma tela por jogador.
- Câmera que enquadra o grupo; dá zoom automático em quem está sofrendo ou brilhando; ao tocar/clicar no ranking, a câmera segue aquele jogador (modo foco).
- Ranking lateral com ícone do dino, apelido, cor e variação de posição (↑↓).
- Painel de avisos de eventos (meteoros, OVNI, boss, manada) em letras grandes.
- Modo "TV de sala": textos grandes e legíveis a distância.
- QR code e código da sala sempre visíveis no lobby.
- Quem morreu vira espectador e pode ajudar/sabotar (limitado).
- Replay automático das melhores jogadas ao fim da rodada.

### Celular (controle + tela pessoal)
- Abre pelo QR code, sem instalar nada. Também funciona digitando o código da sala.
- Tema visual **jurássico**: fundo marrom terroso com textura de pedra, botões em formato de osso ou casca de ovo, e **vetores SVG de arranhões de garra** como bordas e divisores.
- Botões grandes: pular, abaixar, dash lateral, habilidade especial. Layout canhoto/destro ajustável. Vibração ao toque (se suportada).
- Mostra o dino do jogador, apelido e cor em destaque, barra de vida, energia e cooldowns.
- Escolha de cartas aparece só no celular, sem pausar o jogo dos outros.
- Slots da mochila de itens, indicador de latência/conexão, tela de espera animada, aviso para girar para paisagem.
- Impedir zoom, seleção de texto, duplo toque e bloqueio acidental da tela; manter a tela acesa (Wake Lock API quando disponível).
- Instalável como **PWA** (ícone temático).

### Rede (funciona com PC e celulares em redes diferentes)
- Usar **Supabase Realtime** (canais de Broadcast + Presence), um canal por sala. O PC é o **host**: roda a simulação oficial e recebe os comandos dos celulares; os celulares enviam apenas comandos (pulo, abaixar, dash, habilidade, escolha de carta) e recebem estado resumido.
- A **Vercel hospeda só o site estático**; ela não deve ser usada para manter WebSocket. Confirme isso na documentação atual antes de decidir.
- Enviar mensagens só quando o estado do botão muda (limitar a taxa) para economizar a cota gratuita do Supabase. Interpolação no lado do host/cliente para suavizar atrasos.
- Salas por código curto de 4 letras, públicas ou privadas, com expiração automática de salas inativas.
- Apelido e avatar sem login (temporários). Login opcional via Supabase Auth para salvar progresso. Ranking global opcional (Supabase Database) com proteção básica contra trapaça (validar no host, limites de pontuação).
- Reconexão automática se o Wi-Fi cair. Host migrável: se o PC cair, outro dispositivo assume (se viável; senão registrar como pendência).
- Tela de teste de conexão antes de começar.
- **Modo LAN offline (alternativa):** além do Supabase, incluir um servidor WebSocket local simples (`npm run host`) para jogar na mesma rede sem internet.
- Suportar de 2 a 8 jogadores, lobby com "pronto", emotes e chat rápido, modo espectador com câmera livre.

---

## PARTE B — DEPLOY, GITHUB, VERCEL E SUPABASE

Configure e publique tudo. Se alguma etapa exigir login, token ou autorização minha, PARE e me peça exatamente o que fazer, passo a passo; nunca invente credenciais.

1. **Git/GitHub:** inicializar o repositório, criar `.gitignore` (node_modules, .env, builds), commits organizados por fase e subir para um repositório novo no GitHub.
2. **Supabase:** criar/configurar o projeto necessário (Realtime; Database e Auth só se forem usados), com políticas de segurança (RLS) corretas. Usar **apenas a chave pública (anon)** no código do navegador. **NUNCA colocar a service_role key, tokens ou senhas no código nem no repositório.** Criar `.env.example` (sem valores reais) e documentar as variáveis.
3. **Vercel:** configurar o projeto, variáveis de ambiente, build e deploy de produção, com domínio/URL curto. Página de entrada com a mensagem "Escaneie para jogar".
4. **README:** como rodar localmente, como publicar, variáveis de ambiente, como jogar com celulares e solução de problemas.
5. Validar: abrir o link publicado no PC, entrar com um celular em rede diferente (dados móveis) e confirmar que o controle funciona.

---

## PARTE C — DESEMPENHO EM PCs COMUNS (OBRIGATÓRIO)

- Meta de 60 FPS em computadores convencionais (sem placa de vídeo dedicada).
- Qualidade automática que detecta o FPS e reduz sombras, partículas e distância de renderização; menu "Meu PC é fraco" com um clique para gráficos leves; benchmark rápido na primeira abertura.
- InstancedMesh, pooling, limitar objetos ativos, tela de carregamento rápida e temática com dicas dos dinos.
- Evitar vazamento de memória ao reiniciar partidas; testar sessões longas.

---

## PARTE D — AUDITORIA E REDESENHO DOS BOSSES

Faça uma auditoria visual de TODOS os bosses e inimigos especiais: abra cada modelo e verifique se tem design próprio (silhueta única, partes articuladas, detalhes e cores com intenção) ou se é só um bloco/cubo genérico. Redesenhe qualquer um genérico.

**Prioridade máxima: DINO ALFA PREDADOR GIGANTE (boss principal)**
- Corpo voxel detalhado: cabeça com mandíbula articulada e dentes, olhos brilhantes, cicatrizes, crista/espinhos, braços curtos, pernas fortes, cauda segmentada.
- Animações procedurais: andar pesado, rugido com tremor de câmera e onda de choque, mordida, rabada e investida.
- Fases visuais: ao perder vida, fica mais agressivo (aura vermelha, rachaduras, armadura quebrando); partes destrutíveis (dentes, armadura, chifres).
- Introdução cinematográfica curta, barra de vida estilizada com nome e título ("Rei dos Predadores").
- Boss de equipe no multiplayer: exige que todos ataquem juntos. Troféus e itens exclusivos ao derrotar cada boss.
- Manter 60 FPS. No fim, entregue uma lista: cada boss, se já tinha design próprio ou foi refeito, e o que mudou.

---

## PARTE E — 100 NOVAS IDEIAS (numeradas de 97 a 196)

Implemente por prioridade: primeiro as partes A–D, depois as ideias abaixo, começando pelas marcadas ★.

### Multiplayer em LAN/online (97–106)
97. ★ Lobby com código de sala: um jogador cria a sala e os outros entram pelo navegador.
98. ★ Servidor embutido para LAN (`npm run host`) via WebSocket, sem internet.
99. ★ QR code para entrar pelo celular.
100. ★ Celular como controle virtual, no estilo Jackbox.
101. 4 a 8 jogadores, cada um no seu dispositivo.
102. Lobby com "pronto", chat rápido e emotes.
103. Modo espectador com câmera livre.
104. ★ Sincronização com seed compartilhada e interpolação, para não travar com Wi-Fi ruim.
105. Reconexão automática se cair o Wi-Fi.
106. ★ Eliminação por tempo: a cada 30s o último colocado sai até sobrar um campeão; tela final com ranking, MVP e ping.

### Mecânicas de jogabilidade (107–120)
107. Gancho/cipó para atravessar buracos.
108. Planar com cauda ou asas curtas (alguns dinos).
109. Rolar em bola nas descidas de rampa.
110. Surfar em tronco no rio.
111. Carrinho de mina em trechos de caverna.
112. Zonas de gravidade alternada.
113. Cactos que atiram espinhos e outros obstáculos reativos.
114. Ovos elementais (fogo, gelo, raio, veneno) com efeitos diferentes.
115. Tesouros escondidos, com mapa de fósseis para desenterrar.
116. Fome/energia: comer frutas na pista recupera energia.
117. Reações entre elementos (gelo + fogo = vapor; raio + água = choque em área).
118. Ataque básico (cabeçada/rabada) que quebra obstáculos pequenos.
119. Nível de "Procurado": quanto mais você destrói, mais caçadores aparecem.
120. Bifurcações na pista: escolher esquerda ou direita, com riscos e recompensas diferentes.

### Eventos e mundo (121–130)
121. Estampida reversa: uma manada vem por trás.
122. Tsunami: onda gigante vinda do rio.
123. Cometa raro que cruza o céu e dá bônus.
124. Portal dimensional para uma fase bônus de ovos.
125. Ninho de pterodáctilo: proteger os filhotes de ataques.
126. Caçadores primitivos (humanos voxel) com lanças, em evento raro.
127. Enigma de ruínas: acertar a sequência de plataformas para abrir o caminho.
128. Nevoeiro tóxico (item de máscara protege).
129. Chuva de frutas: evento positivo que cura e dá energia.
130. Duelo com um dino NPC no caminho, como mini-boss.

### Progressão e metajogo (131–140)
131. Prestígio (rebirth): reiniciar o progresso em troca de bônus permanentes.
132. Árvore de talentos global, válida para todos os dinos.
133. Mapa-múndi da campanha com nós e rotas alternativas.
134. Eventos sazonais (Halloween, Natal, aniversário) com skins temáticas.
135. Ghosts de amigos por seed: correr contra o fantasma do recorde de outro jogador na mesma pista.
136. Times locais com cor e emblema próprios.
137. Estatísticas com gráficos (distância, mortes, habilidades mais usadas).
138. Desafios semanais com recompensas maiores.
139. Editor de pistas: criar e compartilhar mapas por seed ou arquivo.
140. Editor de híbridos: montar seu dino misturando cabeça, corpo e cauda de espécies diferentes.

### Polimento e ferramentas (141–146)
141. ★ Qualidade automática para manter 60 FPS.
142. Gravar clipes curtos para exportar.
143. Trilha em camadas: percussão e tensão entram conforme velocidade e perigo.
144. Cenas curtas de abertura de boss e de vitória.
145. Modo espelhado (pista e controles invertidos) como desafio.
146. ★ Painel de depuração (modo deus, pular bioma, spawnar evento) para testes.

### Controle no celular, tema jurássico (147–158)
147. ★ Fundo marrom terroso com textura de pedra e botões de osso ou casca de ovo.
148. ★ Arranhões de garra em vetor (SVG) como bordas e divisores.
149. Feedback de vibração nos botões.
150. Layout canhoto/destro ajustável.
151. Joystick/arrastar para pistas laterais (opcional).
152. Tela de espera animada com o dino escolhido.
153. Dino, nome e cor do jogador em destaque.
154. ★ Seletor de cartas na tela do celular, com raridade e brilho.
155. Mochila de itens como slots no celular.
156. Indicador de latência e conexão.
157. Aviso para girar para o modo paisagem.
158. Impedir zoom e bloqueio acidental da tela.

### Tela principal PC/TV (159–166)
159. Modo "TV de sala" com letras grandes.
160. QR code e código da sala sempre visíveis no lobby.
161. Câmera com zoom no jogador que mais sofre ou brilha.
162. Placar com ícones dos dinos e variações de posição (↑↓).
163. Replay automático das melhores jogadas ao fim da rodada.
164. Painel de eventos com aviso de meteoros, OVNI e boss.
165. Telão de espectadores: quem morreu ganha tela de ajuda ou sabotagem.
166. Modo foco: tocar no ranking faz a câmera seguir aquele jogador.

### Rede e Supabase (167–175)
167. Salas por código curto de 4 letras.
168. Salas públicas e privadas.
169. Host migrável: se o PC cair, outro dispositivo assume.
170. Limitar a taxa de mensagens para economizar a cota do Supabase.
171. Tela de teste de conexão antes de começar.
172. Nomes e avatares sem login, com apelido temporário.
173. Login opcional (Supabase Auth) para salvar progresso.
174. Ranking global opcional (Supabase Database) com proteção básica contra trapaça.
175. Expiração automática de salas inativas.

### Deploy e performance (176–182)
176. ★ Script de deploy na Vercel e arquivo de variáveis de ambiente de exemplo.
177. Domínio curto e página de entrada com "Escaneie para jogar".
178. PWA: instalar no celular como app, com ícone temático.
179. ★ Modo de baixa qualidade automática detectando FPS.
180. Carregamento rápido com tela de loading temática e dicas dos dinos.
181. Teste automático de desempenho (benchmark) na primeira abertura.
182. Menu "Meu PC é fraco" com um clique para gráficos leves.

### Bosses e design (183–190)
183. ★ Auditoria de todos os bosses: nenhum pode ser um bloco genérico.
184. ★ Dino alfa predador gigante (boss principal), conforme a Parte D.
185. Fases do boss com mudança visual (raiva, armadura quebrada, aura).
186. Partes destrutíveis (dentes, armadura, chifres).
187. Introdução cinematográfica curta para cada boss.
188. Barra de vida estilizada com nome e título.
189. Boss de equipe no multiplayer, exigindo ataque conjunto.
190. Troféus e itens exclusivos ao derrotar cada boss.

### Extras de festa (191–196)
191. Modo festa: minijogos curtos entre rodadas, usando os celulares.
192. Pergunta-relâmpago de curiosidades de dinos no celular, para bônus.
193. Apostas: apostar ovos em quem vence a rodada.
194. Torcida: espectadores no celular jogam pedras ou itens, com limite.
195. Skins comemorativas por vitória em LAN/online.
196. Modo professor/aula: versão leve e sem violência para escolas.

---

## PARTE F — ORDEM DE TRABALHO SUGERIDA
1. Plano curto e estrutura de pastas (me mostre antes de codar).
2. Rede básica: lobby, código de sala, QR code, celular enviando comandos, host recebendo (Supabase Realtime) + teste local.
3. Controle jurássico no celular + tela principal PC/TV + ranking.
4. Deploy: GitHub → Supabase → Vercel, validando com celular em outra rede.
5. Desempenho em PCs comuns (qualidade automática, modo fraco, benchmark).
6. Auditoria e redesenho dos bosses (dino alfa predador gigante primeiro).
7. Ideias ★ restantes, depois as demais por ordem de impacto.

Ao final de cada etapa: rode, teste, resuma em poucas linhas e pare esperando minha confirmação para continuar. Se algo for inviável (por exemplo limite do plano gratuito do Supabase ou da Vercel), explique o problema e proponha a melhor alternativa em vez de ignorar.
