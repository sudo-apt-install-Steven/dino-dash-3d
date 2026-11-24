# Guia de Configuração OAuth (Google + Discord + Vínculo de Contas) — Dino Dash 3D

O código do cliente ([AuthProfile.js](../src/systems/AuthProfile.js), [ProfileModal.js](../src/ui/ProfileModal.js) e [TransportSupabase.js](../src/net/TransportSupabase.js)) já implementa:
- Fluxo **PKCE** com retorno automático e limpeza da URL (`initOAuthCallbackListener`)
- Login com **E-mail/Senha**, **Apelido/Senha**, **Google** e **Discord**
- **Vínculo de múltiplas contas** (Google + Discord no mesmo perfil via `linkIdentity`)
- **Recuperação de senha**, **Sair local/global**, **Exportar Dados (LGPD Art. 18)** e **Excluir Conta (LGPD)**
- Mensagens de erro traduzidas para português

Para que os botões **Google** e **Discord** funcionem em produção e localmente, ative os provedores nos 3 painéis abaixo com os URLs exatos:

---

## 1. Painel do Supabase Auth (`nldbezalwdsapxfjkyww`)
1. Acesse: `https://supabase.com/dashboard/project/nldbezalwdsapxfjkyww/auth/url-configuration`
2. **Site URL:**
   - `https://dino-dash-3d-six.vercel.app`
3. **Redirect URLs (copie e adicione todas):**
   - `https://dino-dash-3d-six.vercel.app`
   - `https://dino-dash-3d-six.vercel.app/**`
   - `http://localhost:5173`
   - `http://localhost:5173/**`
   - `http://localhost:4173`
   - `http://localhost:4173/**`
4. Acesse: `https://supabase.com/dashboard/project/nldbezalwdsapxfjkyww/auth/providers`
   - Ative **Enable Manual Linking** (em Auth > Settings > Security) para permitir vincular **Google + Discord** no mesmo perfil!

---

## 2. Google Cloud Console (OAuth 2.0)
1. Acesse: `https://console.cloud.google.com/apis/credentials`
2. Crie (ou abra) um **OAuth 2.0 Client ID** do tipo **Web application**.
3. Em **Authorized JavaScript origins**, adicione:
   - `https://dino-dash-3d-six.vercel.app`
   - `http://localhost:5173`
4. Em **Authorized redirect URIs**, adicione EXATAMENTE:
   - `https://nldbezalwdsapxfjkyww.supabase.co/auth/v1/callback`
5. Copie o **Client ID** e o **Client Secret** e cole em:
   - `https://supabase.com/dashboard/project/nldbezalwdsapxfjkyww/auth/providers` -> **Google** -> Ativar -> Salvar.

---

## 3. Discord Developer Portal (OAuth2)
1. Acesse: `https://discord.com/developers/applications`
2. Crie (ou abra) sua aplicação **Dino Dash 3D** -> aba **OAuth2**.
3. Em **Redirects**, adicione EXATAMENTE:
   - `https://nldbezalwdsapxfjkyww.supabase.co/auth/v1/callback`
4. Copie o **Client ID** e o **Client Secret** e cole em:
   - `https://supabase.com/dashboard/project/nldbezalwdsapxfjkyww/auth/providers` -> **Discord** -> Ativar -> Salvar.

> **Segurança:** Nunca coloque Client Secrets no código do jogo ou no `.env` do frontend. Eles ficam exclusivamente no painel do Supabase Auth.
