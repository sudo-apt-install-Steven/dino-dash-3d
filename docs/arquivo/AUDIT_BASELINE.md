# AUDIT BASELINE — DINO DASH 3D (FASE 0)

**Autor / Proprietário:** Steven Tayllon teixeira Jerônimo De Melos  
**Repositório GitHub:** `@sudo-apt-install-Steven/dino-dash-3d`  
**Domínio oficial:** `https://dino-dash-3d-six.vercel.app`  
**Commit de baseline:** `5b16cb1` (`backup/pre-hardening-baseline`)  
**Projeto Supabase:** `dino-dash-3d` (`nldbezalwdsapxfjkyww`, região `sa-east-1`, PostgreSQL `17.11`)

---

## 1. Snapshot e Rollback

- Snapshot pré-hardening preservado no commit `5b16cb1` (`chore: snapshot baseline gameplay before security and legal hardening`).
- Branch de segurança criada exatamente no baseline: `backup/pre-hardening-baseline` (`5b16cb1`).
- Build de produção baseline validada com sucesso (`npm run build`): `dist/assets/index-CB8oIRDD.js` (`1,496.95 kB`, `170` módulos em `7.51s`, exit code `0`).

---

## 2. Benchmark de Performance Baseline (60 FPS Target)

Medição executada antes de alterações de segurança/código via Playwright (`channel="msedge"`, headless com aceleração WebGL hardware, viewport `1280x800`, 3,5 s em corrida ativa):

| Cenário | Frames | FPS Médio | Frame Time Médio | p95 Frame Time | Erros em Runtime |
| --- | ---: | ---: | ---: | ---: | ---: |
| Hardware WebGL (Desktop 1280x800) | 211 | **60.21 FPS** | 16.61 ms | 16.9 ms | 0 |
| Software WebGL (SwiftShader fallback) | — | 9.72 FPS | — | — | 0 |

**Meta máxima permitida após todas as fases:** queda $\le 5\%$ em hardware WebGL ($\ge 57.20\text{ FPS}$).

---

## 3. Auditoria de Segredos no Histórico Git

Varredura completa em todo o histórico Git (`scratch/git_secret_scan.mjs`):
- **0 chaves reais, tokens, JWTs ou senhas** expostos em commits antigos ou no worktree atual.
- **3 ocorrências puramente documentais** do termo literal `service_role` no commit `0e3599b7` (`.env.example`, `README.md`, `dino-dash-3d-fase-online-e-novas-ideias.md`).

---

## 4. Auditoria de Código e Dependências (`agkit-vulnerability-scanner` + `npm audit`)

- `npm audit`: **0 CVEs** conhecidas.
- Licenças transitivas inspecionadas em `package-lock.json` (**104 pacotes**):
  - `MIT`: 94
  - `ISC`: 8
  - `BSD-3-Clause`: 1
  - `0BSD`: 1
  - Nenhuma dependência GPL/AGPL contaminante detectada.
- `security_scan.py` (79 arquivos analisados):
  - Crítico: **0**
  - Alto: **0**
  - Segredos em código: **0**
  - Médio (**48 ocorrências**): atribuições a `innerHTML` em módulos de UI que exigem higienização/escape (`escapeHtml`) contra XSS quando renderizam nomes de jogadores, salas ou entradas de rede.
  - Médio (**1 ocorrência**): ausência de cabeçalhos de segurança HTTP (`CSP`, `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) em `vercel.json`.
- `dependency_analyzer.py`: **0 achados (`[PASS]`)**.

---

## 5. Gaps Críticos de Segurança, Banco, Rede e Gameplay Identificados para Fases 1–6

| Área | Achado Verificado no Baseline | Fase Destino |
| --- | --- | --- |
| Propriedade Intelectual | Ausência de `LICENSE` proprietário, `NOTICE`, `THIRD_PARTY_LICENSES.md`, `AUTORIA.md` e `package.json` sem `"private": true` / `"license": "UNLICENSED"` | Fase 1 |
| Debug em Produção | Tecla `F9` e `DebugModal` (`onUnlockDevMode`) incluídos diretamente no bundle `dist/assets/index-CB8oIRDD.js` | Fase 2 |
| Proteção de Domínio & XSS | Sem `DomainGuard`, sem `escapeHtml` centralizado nos 48 `innerHTML` e comentários preservados no bundle | Fase 2 |
| Autoridade do Placar & Gacha | `dino_leaderboard` permite `INSERT` direto do cliente até `score <= 250000`; Gacha roda apenas no cliente | Fases 2 e 3 |
| RLS Supabase (`nldbezalwdsapxfjkyww`) | `dino_rooms` possui policy `DELETE` `"Remover sala inativa"` com `qual = true` e `UPDATE` sem `host_uid`; advisor `performance` aponta `auth_rls_initplan` | Fase 3 |
| Headers & Infra | `vercel.json` configura apenas `/sw.js`; repositório GitHub `sudo-apt-install-Steven/dino-dash-3d` consta como público (`"private": false`) | Fase 4 |
| Conformidade Brasil & Save | Ausência de Termos de Uso, Política LGPD com exclusão atômica de dados, Canal de Denúncia, travas ECA Digital (`VITE_LOOTBOX_REAL_MONEY=false`) e persistência tripla offline (`localStorage` + `IndexedDB` + Cookie) | Fase 5 |
| Gameplay & Mobile | Layout mobile de seleção rola ao selecionar dino; modo submerso aplica deslocamento vertical sem obstáculos aquáticos/câmera submersa real; troca `[X]` sem roda radial/pausa; `ACCESSORIES_SHOP` limitada; mascotes com ação limitada em corrida; curva sem fator de tempo | Fase 6A |
