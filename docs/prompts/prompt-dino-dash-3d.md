# PROMPT: DINO DASH 3D (para colar no Gemini)

Você é um desenvolvedor sênior de jogos web, especialista em Three.js, arte voxel procedural e game design. Crie o jogo **DINO DASH 3D**, uma releitura em 3D do Chrome Dino, em **UM ÚNICO ARQUIVO HTML** (HTML + CSS + JS inline), pronto para rodar como artefato em chat web.

O projeto é grande. **Siga a ordem de prioridade da seção 14 (Essencial → Avançado → Bônus)**: primeiro entregue um jogo que abra, rode e seja divertido; depois adicione as camadas seguintes. Nunca sacrifique a jogabilidade base por causa de recursos extras.

---

## 0. REGRAS TÉCNICAS (OBRIGATÓRIAS)
- Three.js via CDN (cdnjs.cloudflare.com ou cdn.jsdelivr.net/npm). Nenhum outro asset externo: **todos os modelos, texturas e sons são gerados por código** (voxels com BoxGeometry/InstancedMesh, áudio via WebAudio API).
- Não usar `localStorage` sem try/catch; o jogo deve funcionar mesmo se ele falhar (guardar progresso em memória como fallback).
- Código organizado em módulos/classes no mesmo arquivo: `Game`, `Input`, `Player`, `DinoFactory`, `World`, `Biomes`, `Spawner`, `Events`, `Bosses`, `Cards`, `Items`, `Missions`, `UI`, `Audio`, `CameraRig`, `Particles`, `Save`.
- Meta: 60 FPS em notebook comum. InstancedMesh para decoração, object pooling para obstáculos/partículas, `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, sombras apenas para jogadores e obstáculos próximos. Menu de qualidade (baixa/média/alta).
- Responsivo (desktop e celular), canvas em tela cheia, pausa automática ao perder o foco.
- Entregue o código **completo e funcional**, sem "..." nem trechos omitidos. Se for muito grande, entregue em partes numeradas, cada uma completa e encaixável, avisando o que vem na próxima.
- Antes de finalizar, revise: erros de sintaxe, variáveis indefinidas, loop de jogo, reinício de partida sem vazamento de memória.

## 1. DIREÇÃO DE ARTE
- Estilo **voxel/cúbico low-poly colorido** (tipo Crossy Road/Minecraft), luz quente de deserto ao pôr do sol, brilho leve simulado (sprites), névoa atmosférica para profundidade.
- Cenário base (Deserto): pista de areia dourada com **rio azul** ao lado, cactos voxel (alguns com flor rosa), pedras, ossos de fóssil, árvores secas, mesas e mesetas laranja ao fundo, sol grande, nuvens cúbicas, pedrinhas na borda da pista.
- Parallax em 3 camadas. Poeira nos pés, ao pular e pousar. Fauna decorativa viva (pequenos dinos e insetos que reagem à passagem do jogador).
- UI no estilo do logo: letras grossas 3D verde/laranja com contorno marrom, botões chunky. Fonte pixel/arredondada via Google Fonts (com fallback seguro).
- **Dinossauros bem elaborados**: cada um com dezenas de cubos (corpo, pescoço, cabeça, mandíbula, olhos grandes, cauda segmentada, patas e braços articulados). Animações procedurais: correr, pular (esticar/encolher), abaixar, deslizar, dano (piscar), vitória, morte (tombar e cubos se espalhando).
- **Filtros de estilo** selecionáveis: padrão, retrô 8-bit, neon pôr do sol, preto e branco clássico do Chrome Dino.

## 2. LOOP PRINCIPAL
- Corrida infinita: o mundo se move, o dino fica no lugar.
- Ações: **pular** (toque curto) e **pulo carregado** (segurar = mais alto, gasta energia), **abaixar**, **deslizar** (abaixar em movimento passa por baixo de obstáculos e ganha velocidade), **dash lateral entre 3 pistas**, **habilidade especial** (com recarga), **bullet-time** (tempo lento, com recarga).
- **Pisotear inimigos pequenos** (escorpiões etc.) dá pontos. **Pulo em pedras altas/parede** permite pulo extra. **Rampas** dão voo com acrobacias que rendem pontos.
- Obstáculos: cactos (pequenos, grandes, grupos), escorpiões, águias voando alto e baixo, troncos rolando, pedras, poças de lava em fases avançadas, ninhos de ovos (coletáveis), armadilhas de caçadores alienígenas (redes, minas, drones).
- **Score** no topo (formato `HI 00194  00070`), por distância e combos. **Combo de estilo**: passar perto de obstáculo, pisotear e encadear ações aumenta um multiplicador (x2, x3...) com texto flutuante "QUASE!".
- **Ovos coletáveis** com **cadeia de bônus** (coletar em sequência aumenta o valor); ovos servem para loja, passe e desbloqueios.
- **Velocidade aumenta gradualmente** com curva suave e limite por dificuldade; medidor de velocidade; FOV aumenta com a velocidade.
- **Modo Fúria**: barra enche com combos; ao ativar, o dino fica gigante e invencível por alguns segundos.
- **Ressonância de habilidade**: usar a habilidade no momento perfeito dá efeito extra.
- **Mochila de itens** (até 3): isca, bomba de fumaça, escudo portátil, tocha etc.
- **Power-ups na pista**: escudo, ímã de ovos, turbo, relógio (câmera lenta), foguete, cura, bomba.
- Vidas/escudo conforme modo e dificuldade; invencibilidade curta após dano. **Checkpoints com fogueira**: permitem reviver uma vez por partida em dificuldades altas.
- **Física de impacto**: obstáculos destruídos viram cubos que quicam e podem atingir outros inimigos.
- **Atalhos secretos** (caverna, túnel sob o rio) com recompensas.
- **Mapa de progresso** tipo "mapa do tesouro" mostrando o bioma atual, o próximo e os checkpoints.
- Game over com resumo: score, distância, ovos, combo máximo, cartas, missões; reinício rápido (tecla R).

## 3. OS 13 DINOSSAUROS + 1 SECRETO
Atributos: Velocidade, Pulo, Vida, Defesa, Energia da habilidade. Cada um com modelo único, passiva e habilidade ativa. Classes com bônus passivo: **Carnívoros, Herbívoros e Aquáticos**.
1. **T-Rex** – equilibrado. *Rugido* (afasta/atordoa pequenos obstáculos e aves).
2. **Velociraptor** – muito rápido, pouca vida. *Investida Relâmpago* (dash invencível).
3. **Triceratops** – tanque. *Carga de Chifres* (destrói obstáculos à frente por 3s).
4. **Stegosaurus** – defesa alta. *Cauda de Espinhos* (explosão de espinhos ao redor).
5. **Ankylosaurus** – resistente. *Casco de Aço* (imune por 4s, mais lento).
6. **Spinosaurus** – anfíbio, corre no rio sem lentidão. *Mergulho* (atravessa obstáculos sob a água).
7. **Brachiosaurus** – gigante, pulo alto. *Pisão Sísmico* (onda de choque que mata inimigos).
8. **Dilophosaurus** – pequeno e ágil. *Cuspe de Veneno* (projétil + nuvem tóxica).
9. **Parasaurolophus** – suporte. *Trombeta Sônica* (atrai ovos/moedas e cura aliados no coop).
10. **Compsognathus** – minúsculo (hitbox pequena), frágil. *Salto Duplo + Furtividade*.
11. **Carnotaurus** – agressivo, bom em PvP. *Investida Brutal* (empurra o rival e causa dano).
12. **Pachycephalosaurus** – cabeçada. *Marretada* (quebra obstáculos sólidos, atordoa rival).
13. **Therizinosaurus** – garras gigantes. *Corte Duplo* (destrói em arco e rebate projéteis).
14. **Dino Dourado/Fantasma (secreto)** – desbloqueado por conquista difícil; habilidade única.

Tela de seleção: dino girando em 3D (arrastar para rotacionar), barras de atributos, descrição da habilidade, botão "Testar" numa mini pista.
**Progressão por dino:** árvore de habilidades do nível 1 ao 10 com upgrades da habilidade. **Mutações aleatórias** por partida (brilha no escuro, rastro de fogo etc.). **Filhotes companheiros**: um mini-dino segue o jogador e ajuda (pega ovos, bloqueia dano). **Montaria**: domar e montar um herbívoro da manada por tempo limitado.

## 4. PERSONALIZAÇÃO E COLEÇÃO
- Cor primária, secundária (barriga/detalhes), cor do olho, cor de manchas/listras, cor de espinhos/chifres.
- Padrões: liso, listras, manchas, degradê, camuflagem, neon.
- Acessórios cúbicos: chapéu (cartola, boné, coroa, capacete), óculos, capa, mochila, cachecol, asas de brinquedo.
- Rastros (poeira, fogo, arco-íris, estrelas), efeito de pouso e de morte customizáveis.
- Preview 3D ao vivo, botão "Aleatório", até 3 presets por jogador.
- **Loja de skins e acessórios** com raridades e prévia 3D. **Ovos misteriosos**: abrir ovos dá skin/cor/acessório aleatório com animação.
- **Álbum de dinos**: coleção com ficha técnica e curiosidades reais de cada espécie.
- **Passe de temporada local**: 50 níveis de recompensas (cores, acessórios, rastros).
- **Títulos e emblemas** (ex.: "Caçador de OVNI") exibidos no menu e no PvP.
- **Casa do dino**: espaço decorável para exibir troféus e skins, e **cidade pré-histórica (hub)** com NPCs e a loja.
- **Minigame de chocar o ovo**: criar um filhote entre partidas que vira companheiro.

## 5. MODOS DE JOGO
- **Solo** (clássico, infinito, ranking local).
- **Modo História**: campanha curta em capítulos (fuga do meteoro, travessia dos biomas, chegada ao refúgio) com cenas e falas.
- **Coop local (2 jogadores)**: score somado, reviver o parceiro ficando perto por 3s, combos de habilidades (ex.: Rugido + Investida = super-explosão), **fusão** dos dois dinos num super dino por 10s.
- **PvP local**: pistas paralelas ou mesma pista, itens que lançam obstáculos no rival, pisão e empurrão, melhor de 3 rounds. **Handicap automático** para equilibrar (o mais fraco ganha pequena vantagem). **Replay cinematográfico** dos melhores momentos.
- **Controles compartilhados (um teclado, papéis divididos)**: Jogador A controla a movimentação lateral/pistas, Jogador B controla pulo, abaixar e habilidades. Vida e score compartilhados. **Rodízio de papéis** automático a cada minuto (opcional). Mostrar na tela quem faz o quê.
- **Modo Equipes 2x2** (duas duplas competem no mesmo teclado).
- **Modo Sabotagem**: quem morreu vira fantasma e joga obstáculos no outro.
- **Captura o Ovo** (PvP): segurar o ovo dourado por mais tempo.
- **Corrida de revezamento**: os jogadores se alternam, com um ovo/tocha como "bastão".
- **Torneio local** com chaveamento para 4 a 8 jogadores alternando no mesmo teclado.
- **Sobrevivência de Ondas** (arena, ondas de inimigos e eventos), **Contra-Relógio** (com fantasma/ghost do seu melhor recorde), **Modo Caos** (regras mudam a cada 30s: gravidade invertida, controles trocados, dino gigante), **Modo Hardcore** (uma vida, score x5), **Desafio Diário** (semente fixa por data), **Modo Zen** (sem morte).
- **Seed compartilhável**: código da pista para outro jogador jogar a mesma.
- **Modo Dino Rival**: um dino controlado pela IA com personalidade (provocador, tímido, trapaceiro) que comenta a corrida e pode virar amigo ou inimigo.
- Controles padrão: P1 = W/A/S/D + Espaço para habilidade; P2 = setas + Enter. Suporte a **gamepad** e **toque** (botões virtuais). Tela de remapeamento. **Emotes rápidos** (comemorar, zoar, pedir ajuda). Placar de rivalidade entre jogadores.

## 6. PROGRESSÃO E CARTAS
- A cada marco de score (500, 1500, 3000, 5000…) o jogo **pausa e oferece 3 cartas** (escolher 1; opção de rerrolar 1 vez). Raridades: comum, rara, épica, lendária.
- Exemplos: pulo mais alto, escudo extra, ímã de ovos, dash mais frequente, cooldown reduzido, vida +1, sorte maior, bônus de score, tamanho menor, metade do dano, habilidade turbinada, mini-dinos companheiros, chuva de ovos, tempo lento por 5s.
- Sinergias e "maldições" opcionais (poder alto com penalidade) em dificuldades altas.
- **Evolução visual** do dino em marcos grandes (maior, aura, espinhos, crista, brilho), mantendo as cores personalizadas.
- **Missões diárias** (ex.: "escape de 2 OVNIs") que dão ovos. **Conquistas** (ex.: "Escapei do OVNI", "10 cartas lendárias", "Rei do rio").

## 7. EVENTOS DINÂMICOS (com aviso na tela e som)
1. **Chuva de meteoros**: sombras vermelhas avisam o impacto; crateras ficam por alguns segundos.
2. **Manada de herbívoros**: manada gigante cruza a pista com brechas; é possível pegar carona (bônus).
3. **OVNI**: disco voador com feixe de luz tenta capturar. **Minigame de fuga** (10–15s): desviar de raios, fugir de alienígenas, apertar rápido para quebrar o feixe. Sucesso = recompensa; falha = perde vida e é solto mais à frente. No coop, o parceiro pode resgatar.
4. **Tempestade de areia**: visibilidade reduzida, vento empurra.
5. **Erupção de vulcão**: bolas de fogo, pista rachando.
6. **Terremoto**: câmera treme, rochas caem, altura da pista muda.
7. **Bando de pterodáctilos** em padrões de ataque.
8. **Ciclo dia/noite/eclipse**: afeta iluminação e dificuldade; vaga-lumes e estrelas à noite; **eclipse sombrio** (só se vê perto, lanterna ajuda).
9. **Mercador de ovos**: NPC raro que troca ovos por cartas ou cura.
10. **Bosses** (ver seção 8).
11. **Chuva**, **ponte sobre o rio**, **corrida contra a manada de raptors**.
12. **Perseguidor gigante**: um T-Rex alfa ou tubarão pré-histórico persegue o jogador, com distância indicada na tela.
13. **Fase de voo**: um pterodáctilo carrega o jogador por um trecho aéreo coletando ovos.
14. **Corredor de lava**: chão desmorona e é preciso pular entre plataformas.
15. **Dia dos Ovos**: chuva de ovos dourados por tempo limitado.
16. **Aurora e cometa raro**: evento visual que dá bônus.
- **Clima que afeta o jogo de verdade**: chuva deixa a pista escorregadia, vento altera o pulo, calor drena energia. Estações do ano mudam o visual (neve, flores, folhas).
- **Marés do rio**: o nível sobe e desce, mudando por onde dá para correr.

## 8. BOSSES E INIMIGOS ESPECIAIS
- **Rei Escorpião** (cauda e areia movediça), **Águia Tempestade** (raios e furacões), **Mãe OVNI** (nave com drones e fase de plataforma), **T-Rex Alfa** (persegue e rosna, fases de raiva), mais um boss por bioma, todos com barra de vida, padrões e **pontos fracos** que exigem ordem de ataque.
- **Inimigos elite** com aura, mais vida e recompensa. **Emboscadas inteligentes** que se adaptam ao estilo do jogador.
- Cada boss derrotado dá troféu para a Casa do dino.

## 9. MAPAS / BIOMAS (cada um com mecânica própria)
O jogador pode escolher mapa livre ou sequência; por padrão o bioma muda a cada ~1000 pontos com transição suave e **portal**. Cada mapa tem uma **regra/modificador** e um **boss** próprio.
- **Deserto** (base): rio ao lado, cactos, escorpiões, águias.
- **Rio Jurássico (aquático):** a pista vira rio; os dinos nadam, desviam de troncos e peixes gigantes e pulam entre vitórias-régias; correntezas empurram para os lados; aquáticos (Spinosaurus) ganham bônus, os demais ficam mais lentos.
- **Floresta Jurássica:** pista estreita entre árvores gigantes, cipós para se balançar sobre buracos, folhagem que esconde obstáculos, raptors emboscando das laterais.
- **Vulcão em Erupção:** rios de lava, plataformas de pedra que afundam, bombas vulcânicas, calor nas rachaduras causando dano se ficar parado.
- **Era do Gelo:** pista escorregadia, mamutes cruzando, avalanches vindo de trás, lagos de gelo fino que racham; ficar parado congela e atrasa a habilidade; aurora boreal.
- **Pântano Sombrio:** lama que desacelera, crocodilos pré-históricos saltando da água, neblina densa, vaga-lumes marcando o caminho seguro.
- **Cemitério de Fósseis:** esqueletos gigantes que se levantam, costelas viram arcos para passar por baixo, ossos rolando, fantasmas de dinos à noite.
- **Planeta Alienígena:** gravidade baixa (pulos enormes e planados), pista suspensa no espaço, asteroides, raios do OVNI, plataformas que mudam a gravidade.
- **Cidade Pré-Histórica em Ruínas:** templos, pontes quebradas, armadilhas de dardos, portas que fecham, estátuas que viram inimigos (estilo runner de templo).
- **Montanha Nevada (escalada):** trecho vertical subindo de plataforma em plataforma, pedras caindo, vento lateral.
- **Caverna de Cristais:** quase tudo escuro iluminado por cristais, eco sonoro revela obstáculos, morcegos gigantes.
- **Savana da Grande Migração:** milhares de herbívoros correndo junto; dá para montar em um, mas a manada esmaga quem sair da rota.
- **Praia e Mar Aberto:** ondas que empurram, caranguejos gigantes, ilhas que surgem com as marés, plesiossauro gigante como boss.
- **Deserto de Tempestade:** tornados que puxam o dino, areia movediça, miragens falsas.
- **Fábrica Alienígena (laboratório):** esteiras que aceleram/desaceleram, lasers rotativos, portais de teleporte, robôs capturadores.

## 10. DIFICULDADE
- **Fácil / Normal / Difícil / Insano / Personalizado** (sliders: velocidade inicial, aceleração, densidade de obstáculos, frequência de eventos, vidas, dano no PvP, ativar/desativar cada evento).
- Dificuldade adaptativa opcional. Cada nível dá multiplicador de score diferente.
- Tutorial interativo curto na primeira partida; dicas de carregamento com **curiosidades reais** sobre cada dinossauro, em tom divertido.

## 11. CÂMERA
- Tecla **C** alterna: *3ª pessoa atrás*, *lateral clássica*, *isométrica*, *topo*, *1ª pessoa* e *cinemática dinâmica* (muda sozinha em eventos).
- Suavização, tremor em impactos, FOV dinâmico. No multiplayer, a câmera enquadra todos os jogadores, com **tela dividida opcional**.
- **Modo foto/cinema**: câmera livre, pausa no ar, filtros para tirar prints.

## 12. ÁUDIO, EFEITOS E ACESSIBILIDADE
- Trilha e efeitos sintetizados (pulo, ovo, dano, **rugido próprio de cada dino**, meteoro, OVNI, carta, evolução, vitória). Música acelera com a velocidade. Volume separado (música/efeitos) e mudo. **Minigame de ritmo** opcional (pular/abaixar no compasso para bônus).
- **Narrador divertido** opcional que reage a eventos (ex.: "QUE SALTO!", "Ai, doeu!", falas por evento), em Português.
- Efeitos visuais: hit-stop, números de combo, explosão de cubos, rastros, brilho de lendárias, tela vermelha com pouca vida.
- **Acessibilidade:** controles remapeáveis, modo de uma mão, texto grande, alto contraste, daltonismo, redução de tremores, vibração configurável.

## 13. MENUS E EXTRAS
- Menu principal 3D (dino correndo ao fundo): Jogar, Modo, Dinossauro, Personalizar, Mapas, Dificuldade, Loja, Álbum, Casa do dino, Missões, Conquistas, Recordes, Configurações.
- Configurações: qualidade gráfica, sombras, partículas, FOV, sensibilidade, idioma **Português (padrão)** e Inglês, filtros de estilo.
- Pausa (P/Esc), estatísticas, ranking local.
- **Minigames:** pesca de ovos no rio, ritmo, chocar o ovo.
- Easter eggs (código Konami, dino secreto, ovo dourado raro).

## 14. ORDEM DE IMPLEMENTAÇÃO (PRIORIDADE)
**ESSENCIAL (entregar primeiro, jogável e polido):** loop principal, pulo/abaixar/dash/deslizar, 13 dinos com modelos e habilidades, personalização básica de cores, modos Solo/Coop/PvP/Controles compartilhados, score e velocidade progressiva, cartas por marco, eventos (meteoros, manada, OVNI com minigame), mapas Deserto + Rio Jurássico + Vulcão + Gelo + Alienígena, dificuldades, troca de câmera, áudio básico, menus, combo, Fúria, filhotes companheiros, mutações, clima dinâmico, missões diárias, loja de skins.

**AVANÇADO (adicionar em seguida):** demais biomas, bosses, mochila de itens, árvore de habilidades, montaria, modo História, Contra-Relógio com ghost, Torneio, Equipes 2x2, Sabotagem, Captura o Ovo, revezamento, fusão no coop, passe de temporada, álbum, ovos misteriosos, casa do dino, replay, seed compartilhável, atalhos secretos, perseguidor, fase de voo, física de impacto.

**BÔNUS (se sobrar espaço):** Modo Caos, Hardcore, Sobrevivência de Ondas, Dino Rival com personalidade, minigames (pesca, ritmo, chocar), narrador, filtros de estilo, modo foto, emotes, hub/cidade, estações do ano, marés, aurora/cometa, easter eggs, acessibilidade extra.

Se precisar cortar algo por limite de tamanho, **nunca remova o Essencial**.

## 15. FORMA DE ENTREGA
1. Comece com um resumo curto da arquitetura e dos controles.
2. Entregue o código completo (em partes numeradas se necessário, cada parte encaixável).
3. Termine com a lista do que foi implementado, do que ficou para a próxima parte e sugestões de melhoria.
Priorize sempre: o jogo **abre, roda e é jogável**.
