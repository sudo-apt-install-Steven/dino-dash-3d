---
name: leis-brasil-games
description: Conformidade jurídica brasileira aplicada a jogos eletrônicos web/3D (LGPD, ECA Digital / Lei Felca, Marco Legal dos Games e CDC), com fontes oficiais e marcação do que exige advogado.
---

# Leis do Brasil para Jogos Eletrônicos (`DINO DASH 3D`)

> [!CAUTION]
> **Aviso Legal Obrigatório:** Esta skill sintetiza referências legislativas oficiais vigentes para orientar arquitetura técnica e conformidade preliminar de software. **Não substitui assessoria jurídica de advogado(a) inscrito(a) na OAB.** Pontos marcados com `[REVISÃO ADVOGADO]` devem obrigatoriamente ser validados por profissional habilitado antes de ativar monetização real ou operação comercial em escala.

## Fontes Oficiais Verificadas
- **LGPD — Lei nº 13.709/2018:** Portal da Legislação (`https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm`)
- **ECA Digital — Lei nº 15.211/2025 ("Lei Felca"):** Estatuto Digital da Criança e do Adolescente (`https://www.planalto.gov.br` — Arts. 20 e 21)
- **Marco Legal dos Games — Lei nº 14.852/2024:** Marco Legal da Indústria de Jogos Eletrônicos (`https://www.planalto.gov.br`)
- **CDC — Lei nº 8.078/1990:** Código de Defesa do Consumidor (`https://www.planalto.gov.br`)
- **ANPD — Enunciado CD/ANPD nº 1/2023 & Guias:** Autoridade Nacional de Proteção de Dados (`https://www.gov.br/anpd`)

---

## Regras Técnicas e Jurídicas Aplicáveis

### 1. ECA Digital — Lei nº 15.211/2025 (Arts. 20 e 21)
- **Art. 20 (*Loot Boxes* / Caixas de Recompensa):** Veda expressamente o oferecimento de caixas de recompensa (*loot boxes*) em jogos eletrônicos direcionados a crianças e adolescentes ou de acesso provável por eles.
  - **Estágio Atual (Sem Dinheiro Real):** Gacha operando exclusivamente com moeda gratuita obtida jogando ("Ovos 🥚") não envolve pagamento em moeda corrente, mas o projeto deve manter **feature flag arquitetural (`VITE_LOOTBOX_REAL_MONEY=false`)**, divulgação transparente de probabilidades e **bloqueio preventivo 18+ / desativação voluntária nas configurações**.
  - **Estágio Futuro (Com Dinheiro Real):** `[REVISÃO ADVOGADO]` Proibido habilitar compras pagas com aleatoriedade para menores ou sem separação estrita / verificação confiável de maioridade (18+) e adequação da classificação indicativa conforme regulamentação vigente do Ministério da Justiça / Planalto.
- **Art. 21 (Interações Sociais / Multiplayer Online):** Jogos acessáveis por menores com chat, áudio, vídeo ou troca de conteúdos devem oferecer salvaguardas de moderação e proteção parental.
  - **Implementação obrigatória:** Desativar chat de texto livre irrestrito ou áudio/vídeo aberto para jogadores sem verificação; priorizar **frases rápidas / emotes pré-definidos**, filtro local+remoto de termos impróprios em apelidos, botão de denúncia (`abuse_reports`) e opção de silenciar/ocultar nomes públicos.

### 2. Marco Legal dos Jogos Eletrônicos — Lei nº 14.852/2024
- **Classificação Indicativa & Transparência:** Exibir claramente dentro do jogo a classificação indicativa recomendada e alertas sobre eventuais mecânicas de sorteio, compras integradas (quando houver) e interação online.
- **Canal de Denúncia e Contato:** Manter canal acessível no menu e após partidas para reportar abusos, vulnerabilidades ou solicitar suporte/privacidade.

### 3. LGPD — Lei nº 13.709/2018 + Enunciado CD/ANPD nº 1/2023
- **Minimização (Art. 6º, III):** Coletar o estritamente necessário — apenas apelido voluntário, preferências locais, estado de partida e identificador anônimo de sessão/dispositivo. **Jamais** coletar CPF, RG, endereço residencial, telefone, geolocalização precisa ou microfone/câmera.
- **Crianças e Adolescentes (Art. 14 + Enunciado CD/ANPD nº 1/2023):** Sempre priorizar o **melhor interesse da criança e do adolescente**. Para quaisquer dados além do estritamente funcional anônimo (ex.: futuro cadastro por e-mail/pagamentos), `[REVISÃO ADVOGADO]` exige fluxo de consentimento específico e destacado por um dos pais ou responsável legal.
- **Direitos do Titular (Art. 18):** Botão direto in-game para **Exportar** ou **Excluir Meus Dados** (limpando `localStorage`, `IndexedDB`, Cookies e registros vinculados no Supabase).

## Lista de Itens que Exigem Revisão de Advogado `[REVISÃO ADVOGADO]`
1. Enquadramento exato de caixas de recompensa gratuitas versus pagas sob a **Lei nº 15.211/2025 (Art. 20)** e decretos regulamentadores antes de liberar loja com dinheiro real.
2. Método juridicamente aceito de verificação etária (18+) e consentimento parental verificável (**LGPD Art. 14** + **ANPD**) na versão paga.
3. Redação final dos **Termos de Uso**, **Política de Privacidade** e contratos de **CDC** (direito de arrependimento em 7 dias, estornos e regras de itens digitais) antes de processar pagamentos.
4. Enquadramento tributário e emissão de notas fiscais (MEI/ME/Lucro Presumido — usar apoio jurídico e contábil ao monetizar).
