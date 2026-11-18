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
