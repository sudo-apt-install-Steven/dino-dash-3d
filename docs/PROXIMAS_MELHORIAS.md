# Próximas Melhorias Sugeridas (Requerem Decisão do Autor)

1. **Ativação dos Provedores Google e Discord no Painel Supabase/Cloud (`Parte 1.5`):**
   - O fluxo PKCE, vínculo de contas (`linkIdentity`) e LGPD já estão 100% prontos no código; basta inserir o *Client ID* e *Client Secret* nos painéis seguindo [docs/CONFIGURACAO_OAUTH.md](CONFIGURACAO_OAUTH.md).
2. **Chave de LLM Dedicada nas Secrets da Edge Function (`Parte 3`):**
   - Configurar `GEMINI_API_KEY` ou provedor compatível em `Supabase Dashboard > Edge Functions > Secrets` para ativar geração neural ilimitada além do Mestre Multi-Agente Procedural já integrado.
3. **Torneios Sazonais Ranqueados da Arena X1 com Replay na Nuvem:**
   - Expandir o replay local já funcional para um mural semanal dos 10 melhores duelos X1 validados por *Edge Function*.
4. **Editor Comunitário de Aventuras Ilustradas (Campanhas Compartilháveis por Código):**
   - Permitir exportar roteiros criados no `CampaignCreator` como códigos curtos (apenas presets e eventos validados por schema, mantendo zero texto livre entre jogadores conforme ECA Digital).
