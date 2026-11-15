# AUTORIA, CRONOLOGIA & REGISTRO DE PROPRIEDADE INTELECTUAL (INPI)

> [!CAUTION]
> **Aviso Legal `[REVISÃO ADVOGADO]`:** Este documento organiza evidências técnicas de criação humana e um roteiro prático baseado nas orientações públicas oficiais do **INPI** (`https://www.gov.br/inpi`) e da legislação brasileira (Lei nº 9.609/1998, Lei nº 9.610/1998 e Lei nº 9.279/1996). **Não substitui consultoria jurídica formal** de advogado(a) especialista em Propriedade Intelectual.

---

## 1. Declaração de Titularidade e Criação Humana

- **Obra / Programa de Computador:** `DINO DASH 3D`
- **Titular e Autor Criativo:** **Steven Tayllon teixeira Jerônimo De Melos**
- **Conta GitHub Oficial:** `@sudo-apt-install-Steven` (`https://github.com/sudo-apt-install-Steven/dino-dash-3d`)
- **Domínio Oficial de Produção:** `https://dino-dash-3d-six.vercel.app`

### Papel das Ferramentas Assistidas por IA (`[REVISÃO ADVOGADO]`)
O conceito do jogo, direção de arte, seleção e curadoria de espécies/mecânicas (dinossauros terrestres, aquáticos e voadores, transmutação de híbridos, sistema de mutações evolutivas, gacha 3D, perseguição de predadores, balanceamento, UI mobile/desktop e validação funcional em testes reais) foram idealizados, especificados, revisados e aprovados por **Steven Tayllon teixeira Jerônimo De Melos**.  
Ferramentas de engenharia assistida por IA atuaram exclusivamente como **instrumentos auxiliares de codificação sob supervisão e direção criativa humana**, sem titularidade autônoma. Recomenda-se validação jurídica caso o titular pretenda litigar sobre trechos específicos em jurisdições estrangeiras (`[REVISÃO ADVOGADO]`).

---

## 2. Cronologia Verificável de Desenvolvimento (Histórico Git)

A cadeia de commits no repositório preserva a evolução cronológica da obra:

| Commit | Data | Marco Registrado |
| --- | --- | --- |
| `0e3599b` | 2026-11-13 | Versão inicial completa do Dino Dash 3D com Multiplayer LAN & Online, PWA e Bosses 3D |
| `77bb195` | 2026-11-13 | Ajuste de janela RLS de sala ativa no Supabase |
| `dd96d80` | 2026-11-13 | Balanceamento geral, 20 dinossauros, tutorial interativo, minigames e multiplayer competitivo |
| `49f9ce8` | 2026-11-14 | Expansão para 27 dinossauros, trechos de pista e modelos 3D/SVG integrados |
| `fbf2229` | 2026-11-14 | UX mobile, visibilidade do predador, teto de velocidade e detecção de GPU |
| `921a558` | 2026-11-14 | Balanceamento de pista, estamina/pulo duplo, cartas progressivas e UI touch/swipe |
| `707fb52` | 2026-11-14 | Mega atualização com gacha 3D, mutações, variantes, habitats, 4ª faixa e votação multiplayer |
| `5b16cb1` | 2026-11-14 | Snapshot baseline antes da blindagem de segurança e conformidade jurídica (`backup/pre-hardening-baseline`) |
| `b217968` | 2026-11-14 | Instalação das skills auditadas de segurança e legislação brasileira em `.agents/skills/` |
| `1ed819b` | 2026-11-14 | Auditoria baseline completa (`AUDIT_BASELINE.md`) e benchmark inicial de 60,21 FPS |

> **Dica de evidência:** Ative commits assinados (`git config --global commit.gpgsign true` via chave SSH ou GPG vinculada à sua conta GitHub `@sudo-apt-install-Steven`) para reforçar a autoria criptográfica dos próximos commits.

---

## 3. Como Gerar o Pacote e o Resumo Digital (SHA-256) para o INPI (`e-Software`)

Nos termos da **Lei nº 9.609/1998**, o registro no INPI exige o depósito do **hash criptográfico (SHA-256)** de um arquivo contendo o código-fonte do programa (**nunca** inclua `.env`, chaves privadas ou segredos!).

Execute no PowerShell na raiz `d:\Dino 3D` (após concluir todas as fases e com working tree limpo):

```powershell
# 1. Exportar snapshot limpo apenas dos arquivos versionados pelo Git (sem node_modules, sem .env, sem dist)
$stamp = Get-Date -Format "yyyyMMdd"
$zipPath = "D:\Dino3D-INPI-Source-$stamp.zip"
git archive --format=zip --output="$zipPath" HEAD

# 2. Calcular o hash SHA-256 exato que será informado no formulário e-Software do INPI
$hash = Get-FileHash -Path "$zipPath" -Algorithm SHA256
Write-Output "Arquivo para guarda segura (cofre pessoal): $zipPath"
Write-Output "Resumo SHA-256 para o INPI e-Software: $($hash.Hash)"
```

> [!IMPORTANT]
> **Guarde o arquivo `.zip` original em local seguro (cofre / HD externo criptografado / nuvem privada com 2FA) sem modificá-lo!** Qualquer alteração de 1 byte muda o SHA-256; em eventual perícia judicial futura, você precisará apresentar o mesmo `.zip` cujo SHA-256 consta no certificado emitido pelo INPI.

---

## 4. Passo a Passo Oficial — Registro no INPI (`https://www.gov.br/inpi`)

### A) Registro de Programa de Computador (`e-Software` — Lei nº 9.609/1998)
Proteção válida por **50 anos** contados de 1º de janeiro do ano subsequente à publicação/criação.
1. Acesse **`https://www.gov.br/inpi`** e crie seu cadastro como **Pessoa Física** (Autor e Titular: `Steven Tayllon teixeira Jerônimo De Melos`).
2. Emita e pague a **GRU (Guia de Recolhimento da União)** referente a *Pedido de Registro de Programa de Computador* (há desconto oficial para Pessoa Física/MEI quando aplicável no portal do INPI).
3. Gere o arquivo `.zip` com `git archive` acima e anote o **SHA-256**.
4. Assine a **DV (Declaração de Veracidade)** e protocole no módulo **e-Software** usando seu **certificado digital ICP-Brasil (e-CPF / Gov.br compatível com o sistema)**, informando:
   - Título: `DINO DASH 3D`
   - Linguagens: `JavaScript (ES Modules)`, `HTML5`, `CSS3`, `GLSL / WebGL (Three.js)`, `SQL`
   - Tipo de programa: `ET-01` / Entretenimento / Jogo Eletrônico (ver tabela vigente no portal INPI)
   - Algoritmo hash: `SHA-256`

### B) Registro de Marca (`e-Marcas` — Lei nº 9.279/1996)
Protege o nome e logotipo **`DINO DASH 3D`** por **10 anos renováveis** em todo o território nacional.
1. No portal **`https://www.gov.br/inpi`**, acesse a **Busca Web de Marcas** e pesquise expressões exatas e fonéticas semelhantes (`DINO DASH`, `DINO DASH 3D`) antes de pagar qualquer guia.
2. Verifique as **Classes de Nice** recomendadas para jogos digitais:
   - **Classe 9:** Software de jogo eletrônico baixável / aplicativo web PWA / programa de computador gravado.
   - **Classe 41:** Serviços de entretenimento online; fornecimento de jogos eletrônicos online não baixáveis via rede mundial de computadores.
3. `[REVISÃO ADVOGADO]` Antes de protocolar ou caso surjam registros semelhantes na Classe 9 ou 41 (ex.: `"DINO..."` ou `"DASH..."`), consulte um(a) advogado(a) ou agente da propriedade industrial para avaliar risco de colidência ou necessidade de logotipo misto/figurativo.
