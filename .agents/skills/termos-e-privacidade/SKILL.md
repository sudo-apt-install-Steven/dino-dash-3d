---
name: termos-e-privacidade
description: Estrutura técnica e textual de Termos de Uso, Política de Privacidade (LGPD), Classificação Indicativa, Canal de Denúncia e Fluxo de Exclusão Completa de Dados em jogos web.
---

# Termos de Uso, Privacidade & Exclusão de Dados (`DINO DASH 3D`)

> [!CAUTION]
> **Aviso Legal:** Os modelos gerados no aplicativo servem como implementação transparente de boas práticas da LGPD e do Marco Legal dos Games. **Devem passar por revisão final de advogado(a) (`[REVISÃO ADVOGADO]`)** antes de ativar pagamentos reais, publicidade segmentada ou contas nominativas completas.

## Fontes Oficiais
- **LGPD (Lei nº 13.709/2018):** `https://www.planalto.gov.br` (Arts. 6º, 7º, 9º, 14 e 18)
- **ANPD (Guia Orientativo & Enunciado nº 1/2023):** `https://www.gov.br/anpd`
- **Marco Legal dos Games (Lei nº 14.852/2024):** `https://www.planalto.gov.br`

---

## Requisitos Obrigatórios no Jogo

1. **Transparência Clara (PT-BR acessível sem sair do jogo):**
   - Modais/telas acessíveis pelo Menu Principal, Configurações e Rodapé exibindo:
     - Identificação do **Controlador / Responsável:** `Steven Tayllon teixeira Jerônimo De Melos` + canal de contato/denúncia.
     - Quais dados são armazenados localmente (`localStorage`, `IndexedDB`, Cookie funcional de recuperação de progresso) e na nuvem quando joga online (apelido escolhido, pontuação de ranking, código de sala temporária, ID anônimo de sessão).
     - **O que NÃO coletamos:** CPF, telefone, endereço, localização GPS, câmera, microfone, endereço Wi-Fi/IP para vincular progresso local.
     - **Finalidade & Base Legal:** Execução de funcionalidades solicitadas pelo jogador (salvar progresso local, sincronizar partidas multiplayer, prevenir fraudes/abusos no ranking — Art. 7º, V e IX LGPD, respeitando proteção reforçada de menores).
     - Retenção e expiração automática (salas temporárias expiram em 15 min–4h; logs de auditoria têm janela limitada).
2. **Persistência Multi-Camada Local vs Privacidade:**
   - Ao sincronizar salvamento entre `localStorage`, `IndexedDB` e Cookies técnicos estritamente necessários (`SameSite=Lax`), informar o jogador na Política de Privacidade e **jamais rastrear terceiros com cookies publicitários**.
   - **Nunca usar SSID Wi-Fi, BSSID ou endereço IP para vincular contas locais** (famílias, escolas e lan houses compartilham o mesmo IP/Wi-Fi).
3. **Exclusão Efetiva de Dados ("Direito ao Esquecimento" — Art. 18, VI LGPD):**
   - Um único clique em **"Excluir Meus Dados"** deve apagar atomicamente:
     - `localStorage` do domínio;
     - banco `IndexedDB` do jogo;
     - Cookies gravados pelo jogo;
     - registros associados no Supabase (via Edge Function autenticada pelo token da sessão atual), confirmando a exclusão ao usuário.
4. **Canal de Denúncia & Moderação:**
   - Formulário simples e seguro dentro do jogo para denunciar apelido ofensivo, comportamento abusivo, bug crítico ou dúvida LGPD, salvando somente os metadados necessários com rate limit para evitar spam.
