# DINO DASH 3D — RODADA DE BALANCEAMENTO, CLAREZA, CONTEÚDO E INTRO DO PREDADOR

Este arquivo contém SOMENTE ideias novas e correções. Você já tem os arquivos anteriores; leia este como complemento. Onde houver conflito, este arquivo manda.

Objetivo: um jogo **bonito, justo, fácil de entender para qualquer pessoa** e com muito mais variedade. Pense sempre em quem joga pela primeira vez.

**Como trabalhar:** em fases pequenas. No fim de cada fase, rode o jogo, teste de verdade (visual e jogabilidade), resuma em poucas linhas e pare esperando "continuar". Nunca quebre o que já funciona. Se algo for inviável, explique e proponha a melhor alternativa.

---

## 1. CORREÇÕES URGENTES

### 1.1 Mapas escuros demais (corrigir TODOS os biomas existentes)
- Cada mapa passa a ter **brilho mínimo obrigatório**. Escuro pode ser estilo, mas nunca falta de visibilidade.
- O dino do jogador sempre com contorno de luz (rim light), sombra circular e marcador de faixa brilhando sob ele.
- A pista sempre contrasta com o dino (cor ou faixas luminosas); evitar vermelho escuro sobre fundo escuro.
- Em noite, eclipse e tempestade: escurecer só céu e fundo; a pista continua clara, com luz própria (lava, vaga-lumes, lanternas, cristais).
- Névoa colorida por bioma (laranja no vulcão, azul no gelo etc.), nunca preta. Chuva e partículas transparentes perto do jogador e da pista.
- Obstáculos com contorno leve visível de longe. HUD com fundo semitransparente legível em qualquer cenário.
- Transição de bioma gradual (~5s) com o nome do mapa em letras grandes.
- Slider de brilho e modo "Visão clara" nas configurações.
- Debug: captura automática de cada bioma e clima com relatório de luminosidade média, para achar mapas escuros. Corrigir todos que estiverem abaixo do mínimo.

### 1.2 Tudo precisa se explicar sozinho
- **Código de cores fixo:** verde = bom/cura, azul = proteção, amarelo = coletável, laranja = velocidade, roxo = misterioso, vermelho = perigo.
- **Formas por função além da cor:** coisas boas são redondas e brilhantes; perigos são pontiagudos com listras vermelhas.
- Ícone flutuante sobre cada elemento (gota verde, floco, chama, raio). Elementos coletáveis (com aura) bem diferentes de poças e zonas perigosas (chão marcado).
- **Primeira vez que algo aparece:** rótulo curto ("VENENO: dano contínuo, evite!") que some sozinho e nunca se repete (guardar como visto).
- **Plataforma de velocidade:** faixa laranja com setas (>>>) animadas, raio, brilho pulsante e som de whoosh. **Trampolim:** mola/folha gigante com seta para cima. **Lama:** marrom com bolhas e ícone de caracol. **Gelo:** azul claro brilhante com flocos e rachaduras.
- **Perigos mortais:** contorno vermelho, ossos ou listras e som de alerta ao se aproximar. Aviso no chão antes de meteoro, onda ou ataque de boss (sombra vermelha e seta).
- **Portal:** hoje parece um quadrado achatado e ninguém sabe o que faz. Redesenhar como anel de pedra com runas e partículas; a cor indica o destino (azul = próximo mapa, dourado = bônus de ovos, roxo = surpresa). Ao chegar perto aparece um texto curto explicando. A barra de progresso do portal ganha legenda ("Próximo mapa em 3000") e explicação no primeiro uso.
- Cada pílula do HUD com ícone e dica ao tocar/passar o mouse. HUD agrupado em blocos (vida e escudo / habilidades / progresso), com menos itens soltos.
- **Sistema único de status:** Veneno (dano contínuo), Gelo (lentidão), Fogo (queima), Raio (atordoa), Lama (lento), Escudo, Fúria, Turbo. Cada um com ícone, cor, nome e duração sobre o dino e no HUD. Itens que curam status (antídoto, folha quente). Guia que desbloqueia cada elemento ao encontrá-lo.
- Elementos podem ser usados de propósito contra inimigos; cada boss com fraqueza elemental explicada na barra de vida; reações visuais claras (vapor, choque, queimadura).

### 1.3 Feedback de dano e cura
- Perdeu **coração**: bordas da tela em vermelho + tremor leve da câmera. Perdeu **escudo**: bordas em azul + estilhaço azul.
- Pausa curtíssima (~80 ms) e som diferente para coração e escudo; o ícone no HUD estilhaça ao perder.
- Cura: vinheta verde suave e partículas de coração. Vida baixa: borda vermelha pulsando devagar (com opção de desligar).
- Invencibilidade após dano: dino piscando, com contador visual pequeno.
- Efeito de coleta diferente por raridade (som e partículas). Status sobre o dino com ícone e duração.
- **Tela de morte:** mostra a causa ("Você morreu para: Escorpião") e uma dica de como evitar; câmera lenta curta e botão de jogar de novo imediato.

### 1.4 Menu inicial limpo
- Menu principal só com: **Jogar agora, Multiplayer, Dinossauros, Personalização, Extras**.
- **Extras** abre os demais: **Tutorial (primeiro, com destaque)**, Loja, Missões, Conquistas, Guia, Estatísticas, Configurações, Depuração (escondida: aparece com 5 toques no logo ou modo desenvolvedor), Créditos.
- Selo "Comece por aqui" no tutorial na primeira vez e "Novo!" em itens desbloqueados.
- "Jogar agora" usa o último dino, mapa e dificuldade, com um link pequeno "mudar". Configurações em abas (Gráficos, Som, Controles, Acessibilidade, Conta); opções avançadas recolhidas em "Mostrar mais".
- Pausa enxuta: Continuar, Reiniciar, Como jogar, Configurações, Sair. Botão "?" em cada tela. Dicas de teclas só nas primeiras partidas, depois recolhidas num ícone. Tela de resultado com 3 botões grandes: Jogar de novo, Trocar dino, Menu.
- Tutorial jogável de ~2 minutos, com recompensa de ovos e opção de pular.

---

## 2. INTRO DO PREDADOR (abertura de cada partida)

No início de CADA partida, uma animação curta (6–8 segundos, pulável com qualquer tecla/toque) mostra um **predador geneticamente modificado** perseguindo o dinossauro do jogador. Quando a animação termina, a corrida começa, com o predador ainda vindo logo atrás.

### Regras
- **A cada partida sorteia-se um predador diferente** entre os da lista abaixo (opção de fixar um no menu "Extras"). Reinício rápido (tecla R) pula a intro.
- Cada predador tem **modelo voxel próprio, detalhado e original**, silhueta única, animação de corrida e rugido. Nada de formas genéricas.
- Cada um tem uma **entrada diferente** (rompe uma cerca, salta de um penhasco, emerge da névoa, surge do rio, desce de uma nave, sai de uma erupção etc.).
- Durante a corrida, o predador permanece ao fundo como **medidor de perigo** (substitui a fome/energia): se aproxima quando o jogador erra, recua quando acerta; se alcançar, tira um coração. Mostrar a distância dele de forma clara.
- O predador sorteado pode reaparecer como boss de fim de bioma (versão maior e com fases), dando coerência à partida.
- Opção de desligar a intro nas configurações e de não repetir as primeiras vezes que o jogador já viu.

### Predadores modificados (TODOS ORIGINAIS, criar design próprio; não copiar personagens de filmes ou jogos existentes)
Crie estes híbridos inventados, cada um com tema, cores e mecânica próprios:
1. **Cindermaw** – híbrido de lava; corpo rochoso rachado com brasas, deixa rastro de fogo.
2. **Glaciodon** – híbrido de gelo; armadura de cristais azuis, congela o chão atrás de si.
3. **Venomara** – cauda com ferrão venenoso e crista colorida; cospe névoa tóxica.
4. **Spectraptor** – camuflagem que pisca (some e aparece); garras longas.
5. **Thornadon** – blindado, cheio de espinhos e chifres, investida pesada.
6. **Tempestyx** – asas curtas e crista elétrica; solta raios e salta longe.
7. **Oblivirex** – gigante escuro, olhos brilhantes e mandíbula enorme; o mais assustador.
8. **Hydravex** – várias cabeças pequenas que se movem de forma independente.
9. **Mirage Rex** – corpo translúcido com distorção; deixa imagens falsas.
10. **Ironclaw Alpha** – metade biológico, metade placas metálicas; garras enormes.
11. **Necrorex** – coberto de ossos e armadura de fósseis, olhos verdes.
12. **Gorgantus** – quadrúpede massivo com chifres e cauda de maça.
13. **Ravagewing** – predador alado e terrestre, mergulha do céu.
14. **Mawcrest** – crista gigante com luz pulsante e rugido que balança a câmera.
- Mais predadores podem ser adicionados depois. Cada um com ficha no Guia (nome, tema, fraqueza, curiosidade).

---

## 3. ECONOMIA E BALANCEAMENTO
- **Problema:** hoje uma partida rende ~6.000 ovos e os itens custam 3–24. Corrigir:
- Meta: uma partida de ~3 min rende **150 a 400 ovos**. Reduzir valor e quantidade de ovos espalhados.
- Preços iniciais (ajustar com testes): comum ~150, raro ~600, épico ~2.500, lendário ~10.000. Primeira compra em 1–2 partidas; um lendário em ~40.
- Ovos com valor variável (comum 1, dourado 5, raro 25, bem escasso). Teto por partida com retorno decrescente para evitar farm.
- Bônus de desempenho (distância, combos, bosses) vale mais que catar ovos.
- Duas moedas: **ovos** (comum) e **cristais** (raros, vêm de bosses e missões, para itens premium).
- Upgrades com preço crescente (+40% por nível). Missões e conquistas com recompensas fixas. Loja que rotaciona (itens do dia/semana).
- **Debug de economia:** simulador de 100 partidas mostrando ganho médio, tempo até cada compra e ovos por minuto.
- **Equilíbrio entre dinos:** tabela de pulo, vida, velocidade, habilidade e custo; nenhum domina em todos os modos. Debug registra quais dinos, cartas e bosses mais vencem e mais matam.
- Curva de dificuldade com picos (evento) e vales (descanso), em vez de linear. Dificuldade adaptativa: morrer muito cedo reduz a pressão; ir muito bem aumenta eventos. Calmaria de alguns segundos após evento grande.

## 4. FOME/ENERGIA: SUBSTITUIR
- A mecânica de fome/energia é inútil (o dino está sempre alimentado). **Remover** e usar a barra para algo de decisão: **estamina de pulo/dash** que recarrega sozinha, ou **energia de habilidade** carregada por combos.
- A dificuldade passa a vir de **mais eventos, mais bosses e do predador ao fundo** (medidor de perigo), não de uma barra de fome.
- Risco versus recompensa: caminhos perigosos dão mais ovos e pontos. Calor/frio por bioma só como modificador temporário, nunca como barra permanente.

## 5. ONBOARDING PARA PESSOAS COMUNS
- **Tutorial da primeira habilidade:** ao receber a primeira habilidade da partida, o jogo pausa, desfoca o fundo e destaca o botão com seta e brilho.
  - Habilidades de uso repetido: o desfoque sai ao usar o botão, espaço, WASD ou depois de ~5 s.
  - Habilidades de uso único: tocar no botão destacado **não gasta** a habilidade, só sai do modo.
- Dicas curtas e visuais (ícone + ~5 palavras), nunca repetidas. Modo "Iniciante" nas primeiras partidas (menos obstáculos, mais checkpoints).
- Cartas com ícone e texto de 1 linha mostrando o efeito (+20% pulo), com preview de "mais risco, mais recompensa".
- Aviso visual antes de cada perigo. Primeiras partidas guiadas com missões simples ("pule 3 cactos").

## 6. MODO "MEU PC É FRACO" DE VERDADE
- Hoje só muda a distância de renderização. Passa a aplicar: render scale 0.6–0.75, sem sombras, sem pós-processamento, menos partículas, sem neblina densa e clima pesado, **LOD automático** (modelos distantes e menos cubos), menos objetos ativos e opção de limitar a 30 FPS.
- Teste de desempenho automático que escolhe o perfil (Alto, Médio, Baixo). Validar com medição de FPS antes e depois.

## 7. MODELOS PRÓPRIOS PARA TUDO
- **Regra do projeto:** nenhum acessório, obstáculo, item, evento, boss, inimigo ou elemento pode ser só um cubo ou uma esfera. Cada um precisa de **modelo voxel com silhueta própria e detalhes**.
- Faça uma **auditoria completa** e liste tudo que ainda é primitivo; refaça um por um, começando pelo que o jogador mais vê.
- Acessórios com encaixe correto por tamanho de dino e variações de cor. Itens especiais com design próprio (escudo de casco, ímã de ovo, relógio de areia, foguete de osso). Obstáculos com variações e animação. Biblioteca de modelos reutilizáveis (instâncias) para economizar processamento.

---

## 8. METAS DE VARIEDADE (CONTEÚDO)
Cada item novo com modelo, regra e explicação próprios.

- **Dinossauros: de 13 para 20+.** Sugestões: Giganotosaurus, Utahraptor, Megalosaurus, Iguanodon, Gallimimus, Deinonychus, Allosaurus, Baryonyx, Ouranosaurus, Kentrosaurus. Cada um com habilidade e passiva próprias; 2–3 skins fixas por dino.
- **Mapas: 10+ jogáveis**, com regra e boss próprios: Rio Jurássico, Floresta, Vulcão, Gelo, Pântano, Cemitério de Fósseis, Planeta Alienígena, Ruínas, Caverna de Cristais, Savana da Migração, Praia/Mar, Deserto de Tempestade, Fábrica Alienígena, Montanha. Fósseis colecionáveis, placas com nome, lore curta e clima por mapa.
- **Bosses: no mínimo 12**, cada um com mecânica única (não só mais vida): T-Rex Alfa, Rei Escorpião, Águia Tempestade, Mãe OVNI, Hidra do Pântano (cabeças que regeneram), Golem de Lava, Mamute Glacial, Aranha Gigante das Cavernas, Plesiossauro Abissal, Quimera de Fósseis, Rei Pterodáctilo, Guardião de Pedra das Ruínas. Mais os predadores da seção 2 como bosses. Mini-bosses curtos entre os grandes.
- **Eventos: no mínimo 22**: tempestade de raios, enxame de insetos, chuva ácida, avalanche, ponte quebrando, rio cheio, gêiser, rachadura de terra, estampida, manada reversa, caçadores, ninho de pterodáctilo, nevoeiro tóxico, eclipse, portal dimensional, meteoro gigante, tornado, migração de aves, areia movediça, cometa de ovos, mercador, chuva de frutas, corrida contra raptors. Todos com aviso claro.
- **Obstáculos: 20+ tipos**: cactos variados, escorpiões, aves, troncos, pedras, crateras, espinhos, lama, poças de lava, gelo fino, redes, minas, ossos rolando, cipós, plantas carnívoras, morcegos, crocodilos, paredes de pedra, pêndulos, lasers alienígenas. Cada um com modelo e comportamento próprios.
- **Habilidades: 20+**, uma por dino ou classe, com versão carregada (segurar) e níveis que sobem com o uso durante a partida.
- **Itens especiais: 12+**, **status e elementos** conforme a seção 1.2, **acessórios: 40+** (temas pirata, espacial, samurai, mágico etc.).

---

## 9. JOGABILIDADE E EXPERIÊNCIA
- Trechos de pista desenhados à mão (chunks) embaralhados, para garantir justiça; nunca gerar combinação impossível.
- Oásis (ponto de descanso com carta ou compra rápida); escolhas de risco com placa clara; mini-objetivos por partida ("destrua 5 cactos"); modo Perfeito (sem dano, multiplicador cresce); combos de movimento (pulo + ataque no ar); "Quase!" com câmera lenta mínima; habilidades com versão carregada; contador visível para itens de uso único.
- Boss rush opcional; pontes sobre o rio que caem se demorar; eventos de ajudar filhotes a atravessar; expressões do dino (susto, comemoração, dor); desafios por mapa com 1–3 estrelas.
- Multiplayer/celular: vibração e borda vermelha/azul ao levar dano; nome e cor flutuando sobre cada dino; votação de mapa e boss entre rodadas; convite por link; resultado pessoal no celular; modo plateia com votos limitados; emotes; aviso de sala cheia e fila.
- Mundo e som: nome do mapa em letras grandes, NPCs de cenário, som e música por bioma e intensidade, easter eggs por mapa, boss que deixa marcas no cenário, mascote inimigo por mapa.
- Acessibilidade: modo daltônico com formas e ícones, reduzir tremor e flashes, fonte e contraste ajustáveis, narrador opcional dos avisos.
- Qualidade: bot que joga sozinho 100 partidas para achar bugs, mapas impossíveis e economia quebrada; relatórios de QA no debug (economia, legibilidade, mortes por causa); checklist por mapa, boss e evento antes de dar como pronto; telemetria local (tempo até a primeira morte e onde mais se morre).

---

## 10. ORDEM SUGERIDA DE TRABALHO
1. **Legibilidade** (1.1) e **indicadores/explicações** (1.2), incluindo o portal.
2. **Feedback de dano** (1.3) e **menu inicial** (1.4).
3. **Economia** (seção 3) e **substituição da energia** (seção 4).
4. **Onboarding** (seção 5) e **modo PC fraco** (seção 6).
5. **Intro do predador** (seção 2), começando com 3 predadores e expandindo.
6. **Auditoria de modelos próprios** (seção 7), refazendo o que for primitivo.
7. **Conteúdo novo**: dinos, mapas, bosses, eventos, obstáculos, habilidades, itens, acessórios (seção 8), sempre com modelos próprios.
8. Polimento, acessibilidade e QA (seção 9).

Ao final de cada etapa: rode, teste, resuma e pare esperando "continuar".
