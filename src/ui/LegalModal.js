// Modais de Conformidade Jurídica (Brasil): Termos, Privacidade (LGPD), ECA Digital e Canal de Denúncia.
import { Save } from '../systems/Save.js';
import { AuthProfile } from '../systems/AuthProfile.js';
import { getSupabaseClient } from '../net/TransportSupabase.js';
import { LOOTBOX_REAL_MONEY_ENABLED, submitAbuseReport } from '../security/EdgeClient.js';
import { escapeHtml } from '../security/Sanitize.js';

export class LegalModal {
  static renderInto(container, { initialTab = 'terms', onOpenSettings, onAfterWipe, onClose } = {}) {
    let tab = ['terms', 'privacy', 'eca', 'report'].includes(initialTab) ? initialTab : 'terms';
    let wipeStepConfirm = false;
    let statusMsg = '';
    let statusTone = '#6ee7b7';

    const triggerDownloadJson = () => {
      const jsonText = Save.exportJson();
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dino-dash-3d-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      statusTone = '#6ee7b7';
      statusMsg = '✅ Cópia JSON exportada para o seu dispositivo (Portabilidade LGPD Art. 18, V).';
      render();
    };

    const render = () => {
      const actorShort = escapeHtml(String(Save.data.playerActorId || 'local').slice(0, 14));
      const gachaDisabled = !!Save.data.settings?.disableGachaVoluntary;
      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 760px;">
            <div class="modal-header">
              <h2>🛡️ Termos, Privacidade (LGPD) &amp; Segurança</h2>
              <button class="chunky-btn secondary" id="legal-close">Voltar</button>
            </div>

            <div class="tabs-row" id="legal-tabs">
              <button class="tab-btn ${tab === 'terms' ? 'active' : ''}" data-ltab="terms">📜 Termos</button>
              <button class="tab-btn ${tab === 'privacy' ? 'active' : ''}" data-ltab="privacy">🔒 Privacidade (LGPD)</button>
              <button class="tab-btn ${tab === 'eca' ? 'active' : ''}" data-ltab="eca">🟢 Classificação &amp; ECA</button>
              <button class="tab-btn ${tab === 'report' ? 'active' : ''}" data-ltab="report">🚨 Canal de Denúncia</button>
            </div>

            ${statusMsg ? `
              <div class="item-card" style="padding:10px 12px; border-color:${statusTone}; color:${statusTone}; font-size:0.84rem; margin-top:4px;">
                ${escapeHtml(statusMsg)}
              </div>
            ` : ''}

            <div style="overflow:auto; max-height:60vh; padding-right:4px; display:flex; flex-direction:column; gap:10px;">
              ${tab === 'terms' ? `
                <div class="item-card" style="font-size:0.86rem; line-height:1.5; color:#f5ead7;">
                  <strong style="color:#ffd447;">1. Titularidade e Licença de Uso</strong>
                  <p>
                    O software <strong>DINO DASH 3D</strong> é obra intelectual proprietária de
                    <strong>Steven Tayllon teixeira Jerônimo De Melos</strong> (Lei nº 9.609/98 e Lei nº 9.610/98).
                    É concedida licença gratuita, pessoal e intransferível para uso recreativo diretamente no domínio oficial
                    <code>dino-dash-3d-six.vercel.app</code> (ou servidor LAN local privado do usuário).
                  </p>
                  <strong style="color:#ffd447; margin-top:6px;">2. Condutas Proibidas</strong>
                  <p>
                    É vedado clonar, redistribuir comercialmente, fraudar o ranking com automações/bots, explorar falhas
                    para adulterar pontuações ou inserir conteúdo ofensivo em apelidos e salas públicas.
                  </p>
                  <strong style="color:#ffd447; margin-top:6px;">3. Aviso de Revisão Jurídica [REVISÃO ADVOGADO]</strong>
                  <p style="color:#d6d3d1; font-size:0.8rem;">
                    Estes termos operam em versão recreativa gratuita sem compras reais. Antes de qualquer monetização comercial,
                    a redação final deverá passar por advogado(a) habilitado(a) na OAB conforme o CDC e o Marco Legal dos Games.
                  </p>
                </div>
              ` : ''}

              ${tab === 'privacy' ? `
                <div class="item-card" style="font-size:0.85rem; line-height:1.5; color:#f5ead7;">
                  <strong style="color:#6ee7b7;">Controlador: Steven Tayllon teixeira Jerônimo De Melos</strong>
                  <p>
                    Em conformidade com a <strong>LGPD (Lei nº 13.709/2018)</strong> e o <strong>Enunciado CD/ANPD nº 1/2023</strong>,
                    coletamos o mínimo técnico necessário:
                  </p>
                  <ul style="margin:4px 0 6px 18px; padding:0; display:flex; flex-direction:column; gap:4px; color:#e5d3bc;">
                    <li><strong>Salvo apenas no seu dispositivo (Modo Convidado / Local):</strong> progresso da corrida, ovos, dinossauros, conquistas, configurações e backup automático em <code>localStorage</code>, <code>IndexedDB (DinoDash3DDB)</code> e Cookie técnico <code>dd3d_chk</code> (<code>SameSite=Lax</code>, sem rastreamento publicitário).</li>
                    <li><strong>Enviado para a nuvem (Supabase — somente quando conectado ou online):</strong> apelido, e-mail de autenticação (opcional, se criar conta), foto/parâmetros do perfil, bio, conquistas sincronizadas, pontuação verificada no ranking e código temporário de sala (~20 min). Identificador pseudônimo local: <code>${actorShort}...</code>.</li>
                    <li><strong>O que NÃO coletamos:</strong> CPF, RG, telefone, endereço residencial, GPS, câmera, microfone ou histórico de navegação.</li>
                  </ul>
                  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                    <button type="button" class="chunky-btn secondary" id="legal-export-json">💾 Exportar Meus Dados (JSON)</button>
                    <button type="button" class="chunky-btn secondary" id="legal-wipe-ask" style="border-color:#ef4444; color:#fca5a5;">🗑️ Excluir Conta &amp; Dados (LGPD Art. 18)</button>
                  </div>
                  ${wipeStepConfirm ? `
                    <div id="legal-wipe-confirm-box" class="item-card" style="margin-top:8px; border-color:#ef4444; background:rgba(127,29,29,0.35);">
                      <strong style="color:#fecaca;">⚠️ Confirmar Exclusão Definitiva?</strong>
                      <p style="font-size:0.8rem; color:#fee2e2;">
                        Isso apagará permanentemente seu progresso local (<code>localStorage</code>, <code>IndexedDB</code> e Cookie de recuperação)
                        e solicitará remoção dos registros vinculados no Supabase. Não pode ser desfeito!
                      </p>
                      <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" class="chunky-btn" id="legal-wipe-confirm" style="background:linear-gradient(180deg,#ef4444,#b91c1c); border-color:#fecaca;">Confirmar Exclusão Total</button>
                        <button type="button" class="chunky-btn secondary" id="legal-wipe-cancel">Cancelar</button>
                      </div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              ${tab === 'eca' ? `
                <div class="item-card" style="font-size:0.85rem; line-height:1.5; color:#f5ead7;">
                  <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <span style="display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:10px; background:#16a34a; color:#fff; font-weight:900; font-size:1.1rem; border:2px solid #bbf7d0;">L</span>
                    <div>
                      <strong style="color:#bbf7d0;">Classificação Indicativa Recomendada: LIVRE (0+)</strong>
                      <div style="font-size:0.78rem; color:#d6d3d1;">Marco Legal dos Games (Lei nº 14.852/2024) • ECA Digital (Lei nº 15.211/2025)</div>
                    </div>
                  </div>
                  <p style="margin-top:8px;">
                    • <strong>Caixas Gacha 100% Gratuitas:</strong> nesta etapa (<code>VITE_LOOTBOX_REAL_MONEY=${String(LOOTBOX_REAL_MONEY_ENABLED)}</code>),
                    todas as caixas usam apenas Ovos virtuais conquistados jogando, sem dinheiro real, e exibem todas as probabilidades exatas
                    (46% Comum, 27% Rara, 14% Épica, 7% Lendária, 4% Mítica, 2% Secreta).<br/>
                    • <strong>Segurança em Interações:</strong> salas multiplayer usam códigos temporários, moderação e filtros de sanitização (Art. 21 ECA Digital).
                  </p>
                  <div class="field-row" style="margin-top:6px;">
                    <span>🎲 Desativar Caixas Gacha Voluntariamente (Controle Parental / ECA Digital)</span>
                    <input type="checkbox" id="legal-disable-gacha" ${gachaDisabled ? 'checked' : ''} />
                  </div>
                  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
                    <button type="button" class="chunky-btn secondary" id="legal-open-settings" style="padding:7px 12px; font-size:0.8rem;">⚙️ Abrir Configurações Completas</button>
                  </div>
                </div>
              ` : ''}

              ${tab === 'report' ? `
                <form id="legal-report-form" class="item-card" style="font-size:0.85rem; gap:8px;">
                  <strong style="color:#fde68a;">🚨 Canal de Denúncia, Moderação &amp; Privacidade</strong>
                  <p style="font-size:0.8rem; color:#d8c2a6;">
                    Relate apelidos impróprios em salas, suspeita de trapaça no ranking, bug de segurança ou solicitações de dados.
                  </p>
                  <div class="field-row">
                    <span>Categoria</span>
                    <select id="rep-category">
                      <option value="ofensa">Apelido ou conduta imprópria</option>
                      <option value="trapaca">Suspeita de trapaça / cheat</option>
                      <option value="bug_seguranca">Falha ou bug de segurança</option>
                      <option value="privacidade">Solicitação de Privacidade (LGPD)</option>
                      <option value="outro">Outro motivo</option>
                    </select>
                  </div>
                  <div class="field-row">
                    <span>Apelido citado (opcional)</span>
                    <input type="text" id="rep-target" class="text-input" maxlength="24" placeholder="Ex.: JogadorXYZ" />
                  </div>
                  <div class="field-row">
                    <span>Código da sala (opcional)</span>
                    <input type="text" id="rep-room" class="text-input" maxlength="4" style="text-transform:uppercase;" placeholder="Ex.: A7K2" />
                  </div>
                  <label style="display:flex; flex-direction:column; gap:4px;">
                    <span>Descrição (mín. 8 caracteres)</span>
                    <textarea id="rep-desc" class="text-input" rows="4" maxlength="1000" required placeholder="Descreva o ocorrido sem informar senhas ou dados pessoais sensíveis..."></textarea>
                  </label>
                  <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
                    <button type="submit" class="chunky-btn" id="rep-submit">📨 Enviar Denúncia</button>
                  </div>
                </form>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      container.querySelector('#legal-close')?.addEventListener('click', () => onClose?.());
      container.querySelectorAll('#legal-tabs [data-ltab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          tab = btn.getAttribute('data-ltab');
          wipeStepConfirm = false;
          render();
        });
      });

      container.querySelector('#legal-export-json')?.addEventListener('click', triggerDownloadJson);
      container.querySelector('#legal-wipe-ask')?.addEventListener('click', () => {
        wipeStepConfirm = true;
        render();
      });
      container.querySelector('#legal-wipe-cancel')?.addEventListener('click', () => {
        wipeStepConfirm = false;
        render();
      });
      container.querySelector('#legal-wipe-confirm')?.addEventListener('click', async () => {
        const btn = container.querySelector('#legal-wipe-confirm');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Excluindo...';
        }
        const res = await AuthProfile.deleteAccountAndCloudData();
        const cloudMsg = res?.cloudStatus || 'offline';
        wipeStepConfirm = false;
        statusTone = '#6ee7b7';
        statusMsg = `✅ Dados locais e conta/nuvem apagados completamente (${cloudMsg}).`;
        onAfterWipe?.();
        render();
      });

      container.querySelector('#legal-disable-gacha')?.addEventListener('change', (e) => {
        if (!Save.data.settings) Save.data.settings = {};
        Save.data.settings.disableGachaVoluntary = !!e.target.checked;
        Save.save();
        statusTone = '#ffd447';
        statusMsg = e.target.checked
          ? '🛡️ Caixas Gacha desativadas voluntariamente neste dispositivo.'
          : '🎲 Caixas Gacha reativadas para uso gratuito com Ovos do jogo.';
        render();
      });

      container.querySelector('#legal-open-settings')?.addEventListener('click', () => onOpenSettings?.());

      container.querySelector('#legal-report-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = container.querySelector('#rep-submit');
        const category = container.querySelector('#rep-category')?.value || 'outro';
        const targetPlayerName = container.querySelector('#rep-target')?.value || '';
        const roomCode = container.querySelector('#rep-room')?.value || '';
        const description = (container.querySelector('#rep-desc')?.value || '').trim();
        if (description.length < 8) {
          statusTone = '#fca5a5';
          statusMsg = 'Descreva o ocorrido com pelo menos 8 caracteres.';
          render();
          return;
        }
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Enviando...';
        }
        const client = getSupabaseClient();
        const res = await submitAbuseReport(client, { category, targetPlayerName, roomCode, description });
        if (res?.ok) {
          statusTone = '#6ee7b7';
          statusMsg = `✅ Denúncia registrada com protocolo ${String(res.reportId || '').slice(0, 8)}!`;
        } else {
          statusTone = '#fca5a5';
          statusMsg = `⚠️ ${res?.error || 'Não foi possível enviar agora (tente novamente online).'}`;
        }
        render();
      });
    };

    render();
  }
}
