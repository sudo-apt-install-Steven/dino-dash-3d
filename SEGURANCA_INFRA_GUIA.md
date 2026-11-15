# Guia Operacional de Blindagem de Infraestrutura — DINO DASH 3D

> **Proprietário:** Steven Tayllon teixeira Jerônimo De Melos  
> **GitHub:** `@sudo-apt-install-Steven` (`https://github.com/sudo-apt-install-Steven/dino-dash-3d`)  
> **Domínio Oficial:** `https://dino-dash-3d-six.vercel.app`

Este guia reúne as ações exclusivas de painel (que dependem do login do proprietário em GitHub, Vercel, Supabase e Cloudflare) para fechar a proteção de infraestrutura ponta a ponta.

---

## 1. GitHub (Proteção de Código-Fonte & Autoria)

1. **Tornar o Repositório Privado (se desejar fechar o código-fonte):**
   - Acesse `github.com/sudo-apt-install-Steven/dino-dash-3d` → **Settings** → role até **Danger Zone** → **Change repository visibility** → **Make private**.
   - **Importante:** A Vercel continua fazendo deploy normalmente de repositórios privados pela GitHub App conectada.
2. **Ativar Autenticação em Dois Fatores (2FA):**
   - **GitHub Profile Settings** → **Password and authentication** → **Enable 2FA** (aplicativo autenticador / passkey).
3. **Branch Protection na `main`:**
   - **Settings** → **Branches** → **Add branch ruleset** para `main`:
     - Marcar *Restrict deletions* e *Block force pushes*;
     - Recomendado: *Require a pull request before merging* (ou ao menos bloquear histórico reescrito para preservar carimbos cronológicos de autoria).
4. **Secret Scanning & Dependabot:**
   - **Settings** → **Code security and analysis** → habilitar:
     - *Dependabot alerts* e *Dependabot security updates* (já acompanhado de `.github/dependabot.yml`);
     - *Secret scanning* e *Push protection* (bloqueia qualquer `git push` acidental contendo chaves).

---

## 2. Vercel (Proteção de Previews, Domínio & Versão Gratuita vs Privada)

1. **Variáveis de Ambiente de Produção (`Settings → Environment Variables`):**
   - `VITE_SUPABASE_URL`: URL pública do projeto Supabase (`nldbezalwdsapxfjkyww`).
   - `VITE_SUPABASE_ANON_KEY`: apenas a chave pública (`sb_publishable_...`). **Jamais** colocar `service_role` na Vercel!
   - `VITE_ALLOWED_DOMAINS`: `dino-dash-3d-six.vercel.app` (adicione domínio customizado separado por vírgula se registrar um `.com.br`).
   - `VITE_LOOTBOX_REAL_MONEY`: `false` (obrigatório na versão aberta gratuita).
   - `VITE_APP_EDITION`: `public`.
   - `VITE_ENABLE_ANON_AUTH`: `true` **somente após** ativar *Anonymous Sign-Ins* no painel do Supabase (item 3.1 abaixo).
2. **Bloquear URLs de Preview Públicas Não Autorizadas:**
   - **Settings** → **Deployment Protection** → **Vercel Authentication** (Standard Protection): exigir login da sua conta Vercel para abrir URLs `*.vercel.app` de preview/commit, deixando somente a Production URL (`dino-dash-3d-six.vercel.app`) aberta ao público.
3. **Estratégia Dual (Site Gratuito vs Ambiente Privado/Futuro Comercial):**
   - Caso crie um projeto privado na Vercel para testar economia/recursos novos antes de publicar:
     - Aponte outro domínio fechado com `Deployment Protection` ativado e `VITE_APP_EDITION=private`.
     - Nunca habilite `VITE_LOOTBOX_REAL_MONEY=true` sem antes cumprir verificação jurídica (`LEGAL_COMPLIANCE.md` `[REVISÃO ADVOGADO]`) e configurar secret `LOOTBOX_REAL_MONEY=true` apenas nesse backend separado.

---

## 3. Supabase (Auth, Edge Function Secrets & Rotação)

1. **Habilitar Login Anônimo Criptográfico:**
   - **Supabase Dashboard** → **Authentication** → **Providers / Settings** → habilitar **Allow anonymous sign-ins**.
   - Depois de ativar no painel, defina `VITE_ENABLE_ANON_AUTH=true` na Vercel e faça redeploy — cada jogador passa a ter `auth.uid()` verificado por JWT além de `x-dino-player-id`.
2. **Edge Function Secrets (`Project Settings → Edge Functions → Secrets`):**
   - Definir explicitamente:
     - `DINO_RUN_HMAC_SECRET`: gere uma string aleatória de 64 caracteres (`openssl rand -hex 32`) exclusiva para assinar tokens de partida (`start-run` / `finish-run`).
     - `ALLOWED_ORIGINS`: `https://dino-dash-3d-six.vercel.app` (e seu domínio próprio, se houver).
     - `LOOTBOX_REAL_MONEY`: `false`.
3. **Rate Limits de Auth:**
   - **Authentication → Rate Limits**: manter limites conservadores para envio de Magic Link / OTP e criação de sessões anônimas.
4. **Rotação de Chaves em Caso de Vazamento:**
   - Se uma chave privada ou token vazar em algum momento:
     - No Supabase: **Project Settings → API Keys → Rotate keys** (`service_role` e assinatura JWT) e atualize `DINO_RUN_HMAC_SECRET`.
     - Na Vercel/GitHub: revogue tokens pessoais (PAT) antigos imediatamente.

---

## 4. Cloudflare Free (WAF, Anti-Bot & DDoS sem Custo Extra)

Quando utilizar domínio próprio (ex.: `dinodash3d.com.br`) apontado para a Vercel:

1. **DNS + SSL:**
   - Configure registros CNAME/A no Cloudflare com **nuvem laranja ativada (Proxied)**;
   - Em **SSL/TLS → Overview**, selecione **Full (Strict)**.
2. **Bot Fight Mode & Anti-Scraper:**
   - **Security → Bots**: ative **Bot Fight Mode** (gratuito) para frear varreduras automatizadas.
3. **Custom WAF Rules (até 5 regras gratuitas no plano Free):**
   - Bloquear países/ASNs de ataque caso sofra DDoS direcionado;
   - Desafio JS (*Managed Challenge*) se detectar requisições suspeitas com User-Agent vazio ou ferramentas de scraping agressivo;
   - Regra de **Rate Limiting Free**: limitar picos repetitivos por IP em endpoints críticos.
4. **Cloudflare Turnstile (Gratuito):**
   - Recomendado caso futuramente abra cadastro com e-mail, torneios com premiação ou submissão em eventos oficiais — evita bots sem CAPTCHA visual invasivo.
