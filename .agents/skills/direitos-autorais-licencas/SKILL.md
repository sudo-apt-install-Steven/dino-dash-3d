---
name: direitos-autorais-licencas
description: Proteção autoral de código-fonte, assets 3D/SVG/áudio, licenciamento proprietário UNLICENSED, conformidade com dependências OSS e guia oficial de registro no INPI (e-Software e e-Marcas).
---

# Direitos Autorais, Licenças & Registro INPI (`DINO DASH 3D`)

> [!CAUTION]
> **Aviso Legal:** Esta skill organiza boas práticas técnicas de propriedade intelectual e passos oficiais públicos do INPI. **Não substitui advogado(a) especialista em Propriedade Intelectual.** Estratégias de oposição de marcas, contratos de cessão ou notificações extrajudiciais (`DMCA` / violação autoral) devem passar por revisão jurídica (`[REVISÃO ADVOGADO]`).

## Fontes Oficiais Verificadas
- **Lei do Software — Lei nº 9.609/1998:** `https://www.planalto.gov.br` (proteção jurídica de programas de computador)
- **Lei de Direitos Autorais — Lei nº 9.610/1998:** `https://www.planalto.gov.br` (direitos morais e patrimoniais sobre obras intelectuais, arte 3D, áudio e roteiro)
- **Lei da Propriedade Industrial — Lei nº 9.279/1996:** `https://www.planalto.gov.br` (registro de marcas e concorrência desleal)
- **INPI — e-Software & e-Marcas:** `https://www.gov.br/inpi`

---

## Regras para Código-Fonte e Assets Proprietários

1. **Licença Proprietária (`LICENSE` + `package.json`):**
   - `LICENSE` raiz com **"Todos os direitos reservados"** em nome do titular humano (`Steven Tayllon teixeira Jerônimo De Melos`), proibindo cópia não autorizada, redistribuição, modificação derivativa, remoção de créditos e engenharia reversa fora das hipóteses legais.
   - `package.json` com `"private": true` e `"license": "UNLICENSED"`.
2. **Atribuição Automática no Build e HTML:**
   - Todo bundle JS/CSS compilado em `dist/` e o `index.html` final devem conter banner legal curto (`/*! DINO DASH 3D | Copyright (c) 2026 Steven Tayllon teixeira Jerônimo De Melos | Todos os direitos reservados */`), aplicado automaticamente via script/plugin no `vite.config.js`.
3. **Conformidade com Dependências de Terceiros (`NOTICE` & `THIRD_PARTY_LICENSES`):**
   - Cumprir rigorosamente as licenças MIT/Apache-2.0/BSD/ISC das bibliotecas usadas (`three`, `@supabase/supabase-js`, `qrcode`, `ws`, `vite`), mantendo arquivo `NOTICE` e `THIRD_PARTY_LICENSES.md` atualizados a cada nova dependência instalada.
4. **Prova de Autoria Humana (`AUTORIA.md`) & IA sob Direção Humana:**
   - Documentar cronologia (commits Git assinados/datados, arquivos de especificação `.md`, escolhas de direção de arte, balanceamento, regras e testes conduzidos por `Steven Tayllon teixeira Jerônimo De Melos`), deixando explícito que ferramentas de IA atuaram como instrumento sob direção, curadoria e autoria criativa humana — fundamental segundo entendimento atual sobre proteção autoral (`[REVISÃO ADVOGADO]`).

## Fluxo Oficial de Registro no INPI (`https://www.gov.br/inpi`)
- **e-Software (Lei 9.609/1998 — validade 50 anos):**
  1. Gerar arquivo `.zip` ou código-fonte consolidado e calcular resumo criptográfico **SHA-256** localmente (sem enviar segredos `.env`).
  2. Emitir e pagar GRU no Portal INPI (cadastro PF como autor pessoa física).
  3. Assinar digitalmente e protocolar no **e-Software** usando **certificado digital ICP-Brasil (e-CPF / Gov.br compatível aceito pelo sistema)**.
- **e-Marcas (Lei 9.279/1996 — proteção do nome `"DINO DASH 3D"`):**
  1. Realizar busca prévia de anterioridade no INPI nas **Classes de Nice 9** (software/jogos baixáveis) e **41** (entretenimento/jogos online).
  2. `[REVISÃO ADVOGADO]` Consultar especialista em marcas antes de protocolar pedido definitivo ou em caso de colidência fonética/gráfica.
