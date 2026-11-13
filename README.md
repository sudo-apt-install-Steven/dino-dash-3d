# DINO DASH 3D

Releitura 3D voxel procedural em **Three.js + Vite** do clássico Dino Run — totalmente procedural (modelos voxel, animações, iluminação e áudio WebAudio sem assets externos), com **Multiplayer LAN & Online estilo Jackbox** (TV/PC como tela principal + celulares como controles pessoais via QR Code), PWA instalável e auditoria completa de bosses 3D.

---

## Como Rodar Localmente (Solo & Multiplayer LAN sem internet)

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar o servidor LAN + o jogo (2 terminais na pasta do projeto)

**Terminal 1 — Servidor WebSocket LAN (`:5174`):**
```bash
npm run host
```

**Terminal 2 — Aplicação Web (`:5173`):**
```bash
npm run dev
```

Abra no navegador do PC/TV: **`http://localhost:5173`**

> O servidor LAN (`server/lan-host.js`) expõe `/api/lan-info`, `/api/rooms` e `/ws` na porta `5174` (com proxy automático no `vite.config.js`). Ao criar uma sala no PC, o endereço `localhost` é automaticamente traduzido para o IPv4 local da sua máquina no QR Code.

---

## Como Jogar Multiplayer via QR Code (Modelo Jackbox)

1. No menu principal do PC/TV, clique em **`🌐 MULTIPLAYER LAN / ONLINE (QR CELULAR)`**.
2. Escolha **LAN Local** (mesmo Wi-Fi, zero internet) ou **Online** (Supabase Realtime).
3. Clique em **Criar Sala**: a TV/PC gera um **QR Code** e um **código de 4 letras** + link com `?controller=1&room=XXXX`.
4. Nos celulares (conectados ao mesmo Wi-Fi no modo LAN, ou em qualquer rede no modo Online):
   - Escaneie o QR Code (ou abra `http://<IP-DO-PC>:5173/?controller=1&room=XXXX`).
   - Escolha o apelido e conecte.
   - O celular exibe o controle tátil tematizado (botões + gestos de deslize, escolha de cartas de habilidade sem pausar a TV, e ações/apostas de espectador se for eliminado).
5. No PC/TV, adicione Bots opcionalmente e clique em **`INICIAR CORRIDA MULTIPLAYER`** (suporta **2 a 8 jogadores** na mesma pista).

---

## Controles (PC)

| Tecla | Ação |
| --- | --- |
| `W` / `↑` | Pular (segure para salto alto / planar na queda) |
| `S` / `↓` | Abaixar / queda rápida |
| `A` / `D` ou `←` / `→` | Trocar de faixa |
| `Espaço` | Habilidade especial do dinossauro |
| `Q` | Ataque corpo-a-corpo (também ativa no botão HUD e controle móvel) |
| `F` | Modo Fúria |
| `Shift` | Bullet-Time |
| `E` | Usar item equipado na mochila |
| `C` | Alternar câmera (`3ª Pessoa`, etc.) |
| `P` | Pausar |
| `R` | Reiniciar rapidamente após Game Over |
| `F9` | Abrir painel de Depuração (spawnar bosses/eventos, trocar bioma, God Mode) |
| `1` / `2` / `3` | Emotes rápidos |
| Botão `🎥 Clipe` | Gravar clipe `.webm` da partida |

*(Todas as teclas principais de gameplay podem ser remapeadas em **Configurações**.)*

---

## Performance & PWA

- Na primeira abertura, o jogo executa um benchmark rápido (`PerfMonitor.runQuickBenchmark`) com tela de carregamento temática para calibrar qualidade automática visando **60 FPS** em PCs comuns e celulares.
- Você pode ativar a qualquer momento **`💻 Meu PC é Fraco`** ou **Auto-Qualidade** no Menu Principal ou em Configurações.
- Inclui `public/sw.js` e manifest PWA para instalação e cache offline estático.

---

## Auditoria e Redesenho 3D dos Bosses (`src/events/BossModels.js`)

Todos os 5 chefes foram redesenhados com anatomia voxel articulada, fases visuais de dano, aura de fúria e partes destrutíveis (nenhum cubo genérico):

| ID | Boss | Título | Anatomia & Mecânicas |
| --- | --- | --- | --- |
| `alpha_trex` | **T-Rex Alfa** | Rei dos Predadores | Crânio com mandíbula articulada e presas, olhos brilhantes, cicatrizes, crista dorsal, garras, cauda em 3 segmentos e 4 partes destrutíveis |
| `scorpion_king` | **Rei Escorpião** | Soberano das Dunas | Carapaça segmentada, coroa dourada com rubi, 6 pernas articuladas, 2 pinças gigantes e cauda curva em 5 gomos com ferrão tóxico |
| `storm_eagle` | **Águia Tempestade** | Senhora dos Ventos | Corpo aerodinâmico, crista branca, bico curvo dourado, asas duplas com penas elétricas, cauda em leque e garras de raio |
| `mother_ufo` | **Mãe OVNI** | Nave-Mãe Extraterrestre | Disco multi-camadas chanfrado, cúpula translúcida com núcleo pulsante, anel giratório com 6 luzes, torre de antena e 3 canhões inferiores destrutíveis |
| `plesiosaur` | **Plesiossauro Gigante** | Leviatã Abissal | Corpo hidrodinâmico bioluminescente, 4 nadadeiras em remo, pescoço em 4 segmentos, mandíbula denteada e placas dorsais destrutíveis |

---

## Deploy na Nuvem (GitHub + Supabase + Vercel)

### 1. Variáveis de Ambiente & Supabase (Online Multiplayer)
Copie `.env.example` para `.env` e preencha apenas com a **chave pública anon (`VITE_SUPABASE_ANON_KEY`)** — **nunca** use `service_role` no frontend:
```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```
Execute o schema SQL [`supabase/schema.sql`](./supabase/schema.sql) no seu projeto Supabase para criar as tabelas `dino_rooms` e `dino_leaderboard` com políticas RLS habilitadas.

### 2. Vercel (Frontend Estático + PWA)
O arquivo [`vercel.json`](./vercel.json) já está configurado para Vite (`npm run build` -> `dist`), rewrites de SPA preservando `/sw.js` e headers de cache do Service Worker. Cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas Environment Variables do projeto na Vercel.

---

## Solução de Problemas (Troubleshooting)

- **Celular não conecta na LAN:** Verifique se PC e celular estão no mesmo Wi-Fi e se o Firewall do Windows libera conexões de entrada TCP nas portas **`5173`** e **`5174`**. Confirme se `npm run host` está em execução no terminal.
- **Modo Online indisponível:** Sem `.env` configurado com Supabase, o jogo opera normalmente em Solo, Local Coop e **LAN Local**.
- **Queda de FPS em notebook/PC antigo:** Ative **`💻 Meu PC é Fraco`** no menu inicial ou em Configurações.
