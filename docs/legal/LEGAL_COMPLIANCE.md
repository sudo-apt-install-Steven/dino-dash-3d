# Conformidade Jurídica e Privacidade (Brasil) — DINO DASH 3D

> [!CAUTION]
> **Aviso Legal (`[REVISÃO ADVOGADO]`):** Este documento descreve a arquitetura técnica de conformidade implementada no software **DINO DASH 3D** segundo a legislação brasileira vigente. **Não substitui revisão jurídica formal por advogado(a) inscrito(a) na OAB** antes de habilitar monetização comercial com dinheiro real, publicidade comportamental ou operação empresarial em larga escala.

---

## 1. Identificação da Obra e do Controlador

- **Aplicação:** DINO DASH 3D (`https://dino-dash-3d-six.vercel.app`)
- **Autor / Controlador:** Steven Tayllon teixeira Jerônimo De Melos
- **Repositório de Origem:** `@sudo-apt-install-Steven/dino-dash-3d`
- **Classificação Indicativa Recomendada:** **Livre (0+)** — Corrida / Ação Fantástica Pré-Histórica, sem violência realista, sem compras em dinheiro real nesta versão.

---

## 2. Fontes Legislativas Oficiais Utilizadas

- **LGPD — Lei nº 13.709/2018:** Minimização (Art. 6º, III), bases legais (Art. 7º, V e IX), proteção de crianças e adolescentes no melhor interesse (Art. 14) e direitos do titular (Art. 18, incisos V e VI — portabilidade/eliminação).
- **Enunciado CD/ANPD nº 1/2023:** Critérios para tratamento de dados pessoais de crianças e adolescentes sempre guiado pelo melhor interesse.
- **ECA Digital — Lei nº 15.211/2025 ("Lei Felca", Arts. 20 e 21):** Proibição de *loot boxes* comerciais voltadas a crianças/adolescentes e exigência de salvaguardas em interações sociais online.
- **Marco Legal dos Games — Lei nº 14.852/2024:** Classificação etária clara, transparência sobre sorteios virtuais e canais de denúncia.
- **CDC — Lei nº 8.078/1990:** Transparência pré-contratual (aplicável se compras futuras forem ativadas `[REVISÃO ADVOGADO]`).

---

## 3. Política de Dados & Persistência Tripla Sem Rastreamento

### O que armazenamos
1. **No navegador do usuário (Persistência Resiliente em 3 Camadas):**
   - `localStorage` (`dino_dash_3d_save_v1`): recordes, dinossauros/acessórios desbloqueados, configurações visuais e de acessibilidade, apelido escolhido e identificador pseudônimo aleatório (`playerActorId`).
   - `IndexedDB` (`DinoDash3DDB`): cópia espelho resiliente do progresso local para recuperação caso o `localStorage` seja limpo parcialmente.
   - **Cookie funcional estritamente necessário (`dd3d_chk`, `SameSite=Lax`, sem fins publicitários):** resumo compacto (recorde, ovos, dinossauros iniciais, `playerActorId`) apenas para restauração offline resiliente.
   - **Política anti-IP/Wi-Fi:** Nunca utilizamos endereço IP, SSID ou BSSID Wi-Fi para vincular ou unificar progresso local entre dispositivos.
2. **Na nuvem (Supabase — somente quando o usuário joga conectado / envia placar ou cria sala):**
   - Apelido sanitizado, pontuação/distância/ovos de corridas verificadas, códigos temporários de sala (`dino_rooms` expiram em ~20 min), logs antifraude de rolagens de Gacha gratuito e denúncias enviadas voluntariamente (`abuse_reports`).
   - IPs em Edge Functions são transformados imediatamente em **hash SHA-256 truncado unidirecional** apenas para auditoria de segurança contra ataques/spam, sem armazenamento de IP em texto claro.

### O que NÃO coletamos
- Jamais coletamos CPF, RG, endereço residencial, telefone, localização GPS, câmera, microfone, histórico de navegação externa ou cookies de rastreamento/anúncios.

---

## 4. Direitos do Titular e ECA Digital no Código

- **Exportar Dados (Portabilidade — LGPD Art. 18, V):** Disponível dentro do jogo em **Configurações → Exportar Save JSON** e na tela **Termos & Privacidade**.
- **Excluir Meus Dados (Art. 18, VI):** Botão em 1 clique (**Excluir Meus Dados**) limpa `localStorage`, banco `IndexedDB` (`DinoDash3DDB`), Cookie `dd3d_chk`, além de acionar a Edge Function `wipe-user-data` para remover registros vinculados no Supabase.
- **Gacha 3D Gratuito & Desativação Voluntária:**
  - Nesta etapa, o Gacha funciona **100% com moeda virtual gratuita obtida jogando** (`VITE_LOOTBOX_REAL_MONEY=false`), exibindo todas as probabilidades exatas (`46% Comum`, `27% Rara`, `14% Épica`, `7% Lendária`, `4% Mítica`, `2% Secreta`).
  - O usuário ou responsável pode **desativar voluntariamente as Caixas Gacha** nas Configurações a qualquer momento.
- **Canal de Denúncia:** Acessível pelo Menu Principal e Extras (`abuse_reports` via Edge Function `submit-report` com rate limiting).

---

## 5. Itens que Exigem `[REVISÃO ADVOGADO]` Antes de Monetizar ou Expandir

1. `[REVISÃO ADVOGADO]` Redação jurídica definitiva de Termos de Uso, Política de Privacidade e aviso de cookies caso seja ativada publicidade ou loja comercial.
2. `[REVISÃO ADVOGADO]` Enquadramento do sistema Gacha / caixas pagas sob a **Lei nº 15.211/2025 (Art. 20)** e decretos regulamentadores antes de alterar `VITE_LOOTBOX_REAL_MONEY`.
3. `[REVISÃO ADVOGADO]` Mecanismo juridicamente aceito de verificação etária (18+) e consentimento parental verificável (**LGPD Art. 14** + **ANPD**) para funcionalidades sociais avançadas ou transações pagas.
4. `[REVISÃO ADVOGADO]` Adequação fiscal (MEI/ME/CNAE/NFS-e) e cláusulas de direito de arrependimento (CDC Art. 49) ao processar pagamentos.
