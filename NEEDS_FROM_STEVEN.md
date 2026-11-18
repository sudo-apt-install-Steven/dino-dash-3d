# Ações Manuais Necessárias — Steven

Itens que dependem exclusivamente de permissões da sua conta no GitHub / Vercel / Supabase:

1. **GitHub — Proteção da Branch `main`:**
   - Acesse `Settings -> Branches -> Add branch protection rule` para `main`:
     - Marque **Require a pull request before merging**
     - Marque **Require status checks to pass before merging** (`verify` e `security`)
     - Bloqueie `force push` e deleção de branch.

2. **GitHub — Segurança da Conta & Repositório:**
   - Confirme **2FA / Passkey** ativo na sua conta GitHub.
   - Em `Settings -> Code security and analysis`: ative **Secret scanning**, **Push protection** e **CodeQL analysis** (caso o repositório seja público/elegível).

3. **Vercel — Variáveis de Ambiente:**
   - Confirme no painel da Vercel que apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão expostas ao frontend (nunca `SUPABASE_SERVICE_ROLE_KEY`).

4. **Supabase — Migration & Edge Function `nick-login` (D2/D3/D4):**
   - Execute a migration `supabase/migrations/2026111801_accounts_profiles_achievements.sql` no projeto Supabase (via `supabase db push` ou SQL Editor).
   - Faça deploy da Edge Function `nick-login`: `supabase functions deploy nick-login`.
   - Confirme que `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` estão disponíveis nas Edge Functions (padrão do Supabase).

5. **Supabase Auth — Provedor de E-mail (SMTP / Resend) (D2):**
   - O Supabase Auth gratuito tem limite baixo de e-mails no remetente padrão. Para e-mails confiáveis de **confirmação de conta**, **boas-vindas** e **recuperação de senha**:
     - Crie uma conta no **Resend** (ou outro SMTP) e verifique seu domínio.
     - No painel do Supabase: `Authentication -> SMTP Settings` -> ative **Custom SMTP** com os dados do Resend (`smtp.resend.com`, porta `465`, usuário `resend`, senha = API Key).
     - Em `Authentication -> Email Templates`: personalize em português os templates de **Confirm signup**, **Reset password** e opcionalmente um webhook/boas-vindas.

6. **Supabase Auth — OAuth Google e Discord (D2):**
   - **Google:**
     - Acesse [Google Cloud Console](https://console.cloud.google.com/) -> `APIs & Services -> Credentials -> Create OAuth Client ID (Web application)`.
     - Adicione como Authorized Redirect URI: `https://<SEU-PROJETO>.supabase.co/auth/v1/callback`.
     - Cole `Client ID` e `Client Secret` em `Supabase -> Authentication -> Providers -> Google`.
   - **Discord:**
     - Acesse [Discord Developer Portal](https://discord.com/developers/applications) -> `OAuth2 -> Redirects`.
     - Adicione `https://<SEU-PROJETO>.supabase.co/auth/v1/callback`.
     - Cole `Client ID` e `Client Secret` em `Supabase -> Authentication -> Providers -> Discord`.
   - Em `Supabase -> Authentication -> URL Configuration`: adicione `https://dino-dash-3d-six.vercel.app` (e URLs de preview) em **Redirect URLs**.

7. **Checklist Jurídico `[REVISÃO ADVOGADO]` — ECA Digital (Lei nº 15.211/2025) & LGPD (Lei nº 13.709/2018):**
   > **Nota:** Estes pontos foram estruturados tecnicamente no jogo, mas **devem ser revisados por advogado(a) habilitado(a) na OAB** antes de qualquer expansão comercial ou coleta ampliada de dados.
   - **[REVISÃO ADVOGADO] Consentimento de Menores (LGPD Art. 14 & ECA Digital):**
     - Hoje há uma checkbox declaratória (`is_minor_consent`) no cadastro e modo convidado sem conta obrigatória. Avaliar se o fluxo exige verificação parental adicional (ex.: e-mail do responsável para menores de 12/13 anos conforme Art. 14, §1º da LGPD e diretrizes do ECA Digital).
   - **[REVISÃO ADVOGADO] Classificação Indicativa & Caixas Gacha:**
     - O jogo mantém `VITE_LOOTBOX_REAL_MONEY=false` (apenas Ovos virtuais gratuitos) e opção de desativar caixas Gacha voluntariamente. Caso haja monetização futura, revisar restrições do ECA Digital para loot boxes para menores.
   - **[REVISÃO ADVOGADO] Termos de Uso, Política de Privacidade & Retenção:**
     - Validar prazos de retenção de logs de segurança (`security_audit_logs`, `abuse_reports`), texto completo da Política de Privacidade e canal de contato do Encarregado (DPO) em `LegalModal.js`.
