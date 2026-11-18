// Modal Visível de Dados & Save (D6): Exportar JSON (schema + checksum), Importar com pré-visualização,
// proteção contra XSS/prototype pollution, backup automático e restauração.
import { Save, SAVE_SCHEMA_VERSION } from '../systems/Save.js';
import { escapeHtml } from '../security/Sanitize.js';
import { attachModalHelp } from './Menus.js';

export class SaveModal {
  static renderInto(container, { onClose, onAfterImport, onOpenLegal } = {}) {
    let pendingRawText = null;
    let pendingPreview = null;
    let showPasteBox = false;
    let statusMsg = '';
    let statusTone = '#6ee7b7';

    const render = () => {
      const d = Save.data;
      const backupInfo = Save.getAutoBackupInfo();
      const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 720px;">
            <div class="modal-header">
              <h2>💾 Dados &amp; Save (v${SAVE_SCHEMA_VERSION})</h2>
              <button class="chunky-btn secondary" id="save-close">Voltar</button>
            </div>

            ${statusMsg ? `
              <div class="item-card" style="border-color:${statusTone}; color:${statusTone}; font-size:0.85rem; padding:10px 12px;">
                ${escapeHtml(statusMsg)}
              </div>
            ` : ''}

            <div class="item-card" style="gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <strong style="color:#ffd447;">📊 Seu Progresso Atual neste Dispositivo</strong>
                <span class="hud-pill" style="font-size:0.75rem; color:${Save.isImportedSave() ? '#fbbf24' : '#6ee7b7'};">
                  ${Save.isImportedSave() ? '📥 Save Importado (local)' : '✅ Progresso Original'}
                </span>
              </div>
              <div class="stat-grid">
                <div class="stat-tile"><span class="label">Recorde (HI)</span><span class="val">${Save.getHighScore()}</span></div>
                <div class="stat-tile"><span class="label">Nível / Passe</span><span class="val">Nv.${d.seasonPass?.level || 1}</span></div>
                <div class="stat-tile"><span class="label">Ovos / Cristais</span><span class="val">${d.eggs || 0} 🥚 • ${d.crystals || 0} 💎</span></div>
                <div class="stat-tile"><span class="label">Dinos / Conquistas</span><span class="val">${(d.unlockedDinos || []).length} 🦖 • ${(d.achievements || []).length} 🏆</span></div>
              </div>
              <small style="color:#d8c2a6;">
                Persistido em 3 camadas locais (localStorage + IndexedDB + Cookie de recuperação).
              </small>
            </div>

            <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
              <div class="item-card" style="gap:8px;">
                <strong style="color:#6ee7b7;">📤 Exportar Save</strong>
                <p style="font-size:0.8rem; color:#d8c2a6;">
                  Gera um arquivo <code>.json</code> com versão do schema e checksum de integridade para guardar seu progresso com segurança.
                </p>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:auto;">
                  <button type="button" class="chunky-btn" id="save-export-btn" style="flex:1;">💾 Baixar JSON</button>
                  ${canShare ? `<button type="button" class="chunky-btn secondary" id="save-share-btn">📲 Compartilhar</button>` : ''}
                </div>
              </div>

              <div class="item-card" style="gap:8px;">
                <strong style="color:#38bdf8;">📥 Importar Save</strong>
                <p style="font-size:0.8rem; color:#d8c2a6;">
                  Valida estrutura, tipos e checksum, exibe pré-visualização e cria <strong>backup automático</strong> antes de aplicar.
                </p>
                <input type="file" id="save-import-file" accept=".json,application/json" class="hidden" />
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:auto;">
                  <button type="button" class="chunky-btn orange" id="save-pick-file" style="flex:1;">📂 Escolher Arquivo</button>
                  <button type="button" class="chunky-btn secondary" id="save-toggle-paste">📋 Colar JSON</button>
                </div>
              </div>
            </div>

            ${showPasteBox ? `
              <div class="item-card" style="gap:8px; border-color:#38bdf8;">
                <strong style="color:#7dd3fc;">📋 Colar conteúdo JSON do Save</strong>
                <textarea id="save-paste-area" class="text-input" rows="4" placeholder='Cole aqui o conteúdo do arquivo .json...'></textarea>
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                  <button type="button" class="chunky-btn secondary" id="save-paste-cancel">Cancelar</button>
                  <button type="button" class="chunky-btn" id="save-paste-validate">🔍 Pré-visualizar</button>
                </div>
              </div>
            ` : ''}

            ${pendingPreview ? `
              <div id="save-import-preview" class="item-card" style="border-color:#ffd447; background:rgba(66,32,6,0.55); gap:8px;">
                <strong style="color:#ffd447;">🔍 Pré-visualização do Save antes de Aplicar</strong>
                <div class="stat-grid">
                  <div class="stat-tile"><span class="label">Jogador</span><span class="val" style="font-size:0.95rem;">${escapeHtml(pendingPreview.summary.nickname)}</span></div>
                  <div class="stat-tile"><span class="label">Recorde / Nível</span><span class="val" style="font-size:0.95rem;">${pendingPreview.summary.highScore} • Nv.${pendingPreview.summary.level}</span></div>
                  <div class="stat-tile"><span class="label">Ovos / Cristais</span><span class="val" style="font-size:0.95rem;">${pendingPreview.summary.eggs} 🥚 • ${pendingPreview.summary.crystals} 💎</span></div>
                  <div class="stat-tile"><span class="label">Dinos / Conquistas</span><span class="val" style="font-size:0.95rem;">${pendingPreview.summary.unlockedDinosCount} 🦖 • ${pendingPreview.summary.achievementsCount} 🏆</span></div>
                </div>
                <div style="font-size:0.78rem; color:#fde68a;">
                  Schema v${pendingPreview.schemaVersion} ${pendingPreview.isLegacy ? '(Legado — será migrado)' : '• Checksum verificado ✅'} • Um backup automático do seu save atual será criado antes de sobrescrever.
                </div>
                ${(pendingPreview.warnings || []).map((w) => `<div style="font-size:0.76rem; color:#fcd34d;">⚠️ ${escapeHtml(w)}</div>`).join('')}
                <div style="display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
                  <button type="button" class="chunky-btn secondary" id="save-confirm-cancel">Cancelar</button>
                  <button type="button" class="chunky-btn" id="save-confirm-apply">✅ Confirmar e Aplicar Save</button>
                </div>
              </div>
            ` : ''}

            <div class="item-card" style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="color:#f5ead7;">🛡️ Backup Automático &amp; Privacidade</strong>
                <div style="font-size:0.76rem; color:#d8c2a6;">
                  ${backupInfo
                    ? `Último backup pré-importação: ${new Date(backupInfo.backedUpAt).toLocaleString('pt-BR')} (HI ${backupInfo.highScore}, ${backupInfo.eggs} 🥚)`
                    : 'Nenhum backup automático criado ainda (criado automaticamente ao importar).'}
                </div>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${backupInfo ? `<button type="button" class="chunky-btn secondary" id="save-restore-backup">↩️ Restaurar Backup</button>` : ''}
                <button type="button" class="chunky-btn secondary" id="save-open-legal" style="border-color:#22c55e; color:#86efac;">🛡️ LGPD &amp; Excluir Dados</button>
              </div>
            </div>
          </div>
        </div>
      `;

      container.querySelector('#save-close')?.addEventListener('click', () => onClose?.());
      container.querySelector('#save-open-legal')?.addEventListener('click', () => onOpenLegal?.());

      container.querySelector('#save-export-btn')?.addEventListener('click', () => {
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
        statusMsg = `✅ Save exportado com sucesso (Schema v${SAVE_SCHEMA_VERSION} + Checksum)!`;
        render();
      });

      container.querySelector('#save-share-btn')?.addEventListener('click', async () => {
        try {
          const jsonText = Save.exportJson();
          const file = new File([jsonText], `dino-dash-3d-save-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: 'Dino Dash 3D Save', files: [file] });
          } else {
            await navigator.share({ title: 'Dino Dash 3D Save', text: jsonText });
          }
          statusTone = '#6ee7b7';
          statusMsg = '✅ Save compartilhado com sucesso!';
          render();
        } catch (err) {
          if (err?.name !== 'AbortError') {
            statusTone = '#fca5a5';
            statusMsg = 'Não foi possível compartilhar neste navegador; use "Baixar JSON".';
            render();
          }
        }
      });

      const fileInput = container.querySelector('#save-import-file');
      container.querySelector('#save-pick-file')?.addEventListener('click', () => fileInput?.click());
      fileInput?.addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const text = await f.text();
        const check = Save.previewImport(text);
        if (!check.ok) {
          pendingRawText = null;
          pendingPreview = null;
          statusTone = '#fca5a5';
          statusMsg = `⚠️ ${check.error}`;
        } else {
          pendingRawText = text;
          pendingPreview = check;
          statusMsg = '';
        }
        fileInput.value = '';
        render();
      });

      container.querySelector('#save-toggle-paste')?.addEventListener('click', () => {
        showPasteBox = !showPasteBox;
        render();
      });
      container.querySelector('#save-paste-cancel')?.addEventListener('click', () => {
        showPasteBox = false;
        render();
      });
      container.querySelector('#save-paste-validate')?.addEventListener('click', () => {
        const text = container.querySelector('#save-paste-area')?.value || '';
        const check = Save.previewImport(text);
        if (!check.ok) {
          pendingRawText = null;
          pendingPreview = null;
          statusTone = '#fca5a5';
          statusMsg = `⚠️ ${check.error}`;
        } else {
          pendingRawText = text;
          pendingPreview = check;
          showPasteBox = false;
          statusMsg = '';
        }
        render();
      });

      container.querySelector('#save-confirm-cancel')?.addEventListener('click', () => {
        pendingRawText = null;
        pendingPreview = null;
        render();
      });

      container.querySelector('#save-confirm-apply')?.addEventListener('click', () => {
        if (!pendingRawText) return;
        const res = Save.importJson(pendingRawText);
        pendingRawText = null;
        pendingPreview = null;
        if (res.ok) {
          statusTone = '#6ee7b7';
          statusMsg = '✅ Save importado com sucesso! Backup do save anterior foi salvo automaticamente.';
          onAfterImport?.();
        } else {
          statusTone = '#fca5a5';
          statusMsg = `⚠️ ${res.error}`;
        }
        render();
      });

      container.querySelector('#save-restore-backup')?.addEventListener('click', () => {
        const res = Save.restoreAutoBackup();
        if (res.ok) {
          statusTone = '#6ee7b7';
          statusMsg = '✅ Backup automático restaurado com sucesso!';
          onAfterImport?.();
        } else {
          statusTone = '#fca5a5';
          statusMsg = `⚠️ ${res.error}`;
        }
        render();
      });

      attachModalHelp(container, 'Exporte seu save em JSON com checksum de verificação, importe com pré-visualização segura ou restaure seu último backup automático.');
    };

    render();
  }
}
