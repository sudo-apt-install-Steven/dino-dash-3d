# DINO DASH 3D — Relatório de Segurança (FASE 2)

> **Data:** 2026-11-18
> **Branch:** `evolucao/fase-2-seguranca`
> **Responsável:** Auditoria & Hardening Fase 2

---

## 1. Matriz de Riscos Encontrados, Correções e Verificação

| ID | Área | Risco Encontrado | Correção Aplicada | Como Verificar | Status |
| --- | --- | --- | --- | --- | :---: |
| **SEC-01** | Dependências (`vite`) | Vite `6.2.7` possuía vulnerabilidades `high` no dev server (`GHSA-9jrq-w75r-8gcw`, `GHSA-rq7h-c2jc-7f22`, `GHSA-fx2h-pf6j-xcff`). | Atualizado para Vite `^8.3.8`. Build de produção validado em `786ms`. Restam apenas 4 avisos dev-only transitivos do `picomatch` (ReDoS em globbing local, fora do bundle de produção). | `npm audit --omit=dev` -> **0 vulnerabilidades**. | ✅ |
| **SEC-02** | Rede / Supabase (`TransportSupabase.js`) | `_broadcastRoomPatch()` não propagava `roomName`, `maxPlayers` e `hasPassword`, causando dessincronia de regras de sala online. | Incluídos `roomName`, `maxPlayers` e `hasPassword` no patch de sincronização em `src/net/TransportSupabase.js`. | Inspecionar `_broadcastRoomPatch` em `src/net/TransportSupabase.js` e rodar `npm run build`. | ✅ |
| **SEC-03** | Banco de Dados / Supabase (`nldbezalwdsapxfjkyww`) | Verificação de políticas RLS e exposições anônimas pós-últimas alterações. | Executado `get_advisors(security)` e `get_advisors(performance)` ao vivo no Supabase. | `get_advisors(security)` retornou **`[]` (0 alertas)**; `get_advisors(performance)` retornou apenas 3 `INFO` (`unused_index`), sem `WARN`/`ERROR`. | ✅ |
| **SEC-04** | Código / XSS | Risco de injeção HTML via nicknames, códigos de sala ou cores customizadas. | `src/security/Sanitize.js` (`escapeHtml`, `sanitizeNickname`, `sanitizeRoomCode`, `sanitizeRoomPassword`, `sanitizeHexColor`) coberto por testes unitários automatizados. | `npm run test:unit` (6/6 passando). | ✅ |
| **SEC-05** | Infra Vercel (`vercel.json`) | Necessidade de headers rígidos em produção e preview. | `vercel.json` verificado com CSP (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), HSTS (`preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. | Inspecionar `vercel.json` e headers HTTP da resposta Vercel. | ✅ |
| **SEC-06** | Governança GitHub | Ausência de `SECURITY.md`, `CODEOWNERS`, template de PR e workflow de segurança automatizado. | Criados `SECURITY.md`, `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md` e `.github/workflows/security.yml`. | Conferir arquivos em `.github/` e raiz; workflow roda `npm audit --omit=dev` + grep de segredos em todo PR. | ✅ |

---

## 2. Verificações Executadas na Fase 2
- `npm audit --omit=dev`: **0 vulnerabilidades** (`info: 0, low: 0, moderate: 0, high: 0, critical: 0`).
- `supabase get_advisors(security)`: **0 alertas**.
- `npm run test:unit`: **6/6 testes passando**.
- `npm run build`: **0 erros, 0 warnings** (`786ms`).
- **Pendências manuais do dono:** Registradas em `NEEDS_FROM_STEVEN.md` (2FA/passkey no GitHub, ativação de Branch Protection na `main`, CodeQL via UI do GitHub).
