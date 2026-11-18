# Política de Segurança — DINO DASH 3D

## Versões Suportadas
| Branch / Ambiente | Suporte |
| --- | --- |
| `main` (Produção Vercel) | Ativo |
| `evolucao/*` | Em desenvolvimento |

## Reportando Vulnerabilidades
Se você encontrar qualquer falha de segurança (XSS, bypass de RLS, vazamento de chaves, manipulação de placar/economia), **não abra uma issue pública**.

Entre em contato diretamente com o mantenedor:
- **Autor:** Steven Tayllon teixeira Jerônimo De Melos
- **GitHub:** `@sudo-apt-install-Steven`

## Arquitetura de Segurança Adotada
- **Frontend sem segredos:** Apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são públicas no navegador; `service_role` nunca entra no cliente.
- **Economia & Placar Autoritativos:** Validação via Supabase Edge Functions (`start-run`, `finish-run`, `gacha-roll`, `room-sync`, `wallet-sync`) com assinatura HMAC-SHA256 e plausibilidade server-side.
- **RLS Estrita:** Row Level Security habilitada em todas as tabelas PostgreSQL (`0` alertas em `get_advisors`).
- **Headers HTTP (Vercel):** CSP restrita, HSTS (`preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` e `Permissions-Policy`.
- **Sanitização de Entrada:** `src/security/Sanitize.js` (`escapeHtml`, `sanitizeNickname`, `sanitizeRoomCode`, `sanitizeRoomPassword`, `sanitizeHexColor`).
