// Galeria de Conquistas & Troféus (D4): progresso geral, troféus bronze/prata/ouro/platina, filtros e busca.
import {
  Achievements,
  ACHIEVEMENT_CATEGORIES,
  TROPHY_TIERS,
  RARITY_META
} from '../systems/Achievements.js';
import { Save } from '../systems/Save.js';
import { escapeHtml } from '../security/Sanitize.js';
import { attachModalHelp } from './Menus.js';

export class AchievementsModal {
  static renderInto(container, { onClose } = {}) {
    let categoryFilter = 'all';
    let statusFilter = 'all'; // 'all' | 'unlocked' | 'locked'
    let trophyFilter = 'all';
    let searchQuery = '';

    const render = () => {
      const summary = Achievements.getSummary();
      const all = Achievements.getAll();
      const q = searchQuery.trim().toLowerCase();

      const filtered = all.filter((a) => {
        if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
        if (trophyFilter !== 'all' && a.trophy !== trophyFilter) return false;
        const unlocked = Achievements.isUnlocked(a.id);
        if (statusFilter === 'unlocked' && !unlocked) return false;
        if (statusFilter === 'locked' && unlocked) return false;
        if (q) {
          const hay = `${a.name} ${a.desc} ${a.category}`.toLowerCase();
          if (a.hidden && !unlocked) return false;
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 860px;">
            <div class="modal-header">
              <h2>🏆 Conquistas &amp; Troféus (${summary.unlocked}/${summary.total})</h2>
              <button class="chunky-btn secondary" id="ach-close">Voltar</button>
            </div>

            ${Save.isImportedSave() ? `
              <div class="item-card" style="border-color:#f59e0b; background:rgba(120,53,15,0.3); font-size:0.8rem; color:#fde68a;">
                ⚠️ <strong>Save Importado:</strong> conquistas validadas no servidor não contam para rankings globais neste save.
              </div>
            ` : ''}

            <div class="item-card" style="gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <strong style="color:#ffd447;">Progresso Geral: ${summary.unlocked} / ${summary.total} (${summary.pct}%)</strong>
                <div style="display:flex; gap:8px; flex-wrap:wrap; font-size:0.8rem;">
                  ${Object.values(TROPHY_TIERS).map((t) => {
                    const st = summary.byTrophy[t.id] || { unlocked: 0, total: 0 };
                    return `<span class="hud-pill" style="border-color:${t.color}; color:${t.color};">${t.icon} ${t.label}: ${st.unlocked}/${st.total}</span>`;
                  }).join('')}
                </div>
              </div>
              <div class="meter-bar" style="height:12px;">
                <div class="meter-fill" style="width:${summary.pct}%; background:linear-gradient(90deg, #f59e0b, #58d63a);"></div>
              </div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <input type="search" id="ach-search" class="text-input" value="${escapeHtml(searchQuery)}" placeholder="🔍 Buscar conquista..." style="flex:1 1 200px;" />
              <select id="ach-status-filter" class="select-input" style="width:auto;">
                <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>Todas (${summary.total})</option>
                <option value="unlocked" ${statusFilter === 'unlocked' ? 'selected' : ''}>Desbloqueadas (${summary.unlocked})</option>
                <option value="locked" ${statusFilter === 'locked' ? 'selected' : ''}>Bloqueadas (${summary.total - summary.unlocked})</option>
              </select>
              <select id="ach-trophy-filter" class="select-input" style="width:auto;">
                <option value="all" ${trophyFilter === 'all' ? 'selected' : ''}>Todos Troféus</option>
                ${Object.values(TROPHY_TIERS).map((t) => `<option value="${t.id}" ${trophyFilter === t.id ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
              </select>
            </div>

            <div class="tabs-row" id="ach-cat-tabs" style="gap:5px;">
              <button class="tab-btn ${categoryFilter === 'all' ? 'active' : ''}" data-acat="all">Todas</button>
              ${ACHIEVEMENT_CATEGORIES.map((c) => {
                const st = summary.byCategory[c.id] || { unlocked: 0, total: 0 };
                return `<button class="tab-btn ${categoryFilter === c.id ? 'active' : ''}" data-acat="${c.id}">${c.icon} ${c.label} (${st.unlocked}/${st.total})</button>`;
              }).join('')}
            </div>

            <div class="cards-grid" style="max-height:48vh; overflow-y:auto; padding-right:4px;">
              ${filtered.length === 0 ? `<p style="color:#d8c2a6; grid-column:1/-1;">Nenhuma conquista encontrada para este filtro.</p>` : ''}
              ${filtered.map((a) => {
                const unlocked = Achievements.isUnlocked(a.id);
                const prog = Achievements.getProgress(a.id);
                const trophy = TROPHY_TIERS[a.trophy] || TROPHY_TIERS.bronze;
                const rarity = RARITY_META[a.rarity] || RARITY_META.comum;
                const isSecretLocked = a.hidden && !unlocked;
                const rwParts = [];
                if (a.reward?.xp) rwParts.push(`+${a.reward.xp} XP`);
                if (a.reward?.eggs) rwParts.push(`+${a.reward.eggs} 🥚`);
                if (a.reward?.crystals) rwParts.push(`+${a.reward.crystals} 💎`);
                if (a.reward?.title) rwParts.push(`🎖️ "${a.reward.title}"`);

                return `
                  <div class="item-card ${unlocked ? 'selected' : ''}" style="opacity:${unlocked ? 1 : 0.78}; border-color:${unlocked ? trophy.color : 'var(--panel-border)'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                      <div style="display:flex; gap:8px; align-items:center;">
                        <span style="font-size:1.55rem; line-height:1;">${isSecretLocked ? '🔒' : escapeHtml(a.icon || '🏆')}</span>
                        <div>
                          <strong style="color:${unlocked ? '#ffd447' : '#f5ead7'}; font-size:0.92rem;">
                            ${isSecretLocked ? 'Conquista Secreta ???' : escapeHtml(a.name)}
                          </strong>
                          <div style="font-size:0.72rem; color:${rarity.color}; font-weight:700;">
                            ${trophy.icon} ${trophy.label} • ${rarity.label}
                          </div>
                        </div>
                      </div>
                      <span style="font-size:0.75rem; color:${unlocked ? '#6ee7b7' : '#a8a29e'}; font-weight:800;">
                        ${unlocked ? '✔ Liberada' : `${prog.current}/${prog.target}`}
                      </span>
                    </div>
                    <p style="font-size:0.78rem; color:#d8c2a6; margin:4px 0;">
                      ${isSecretLocked ? 'Continue explorando os segredos do Dino Dash 3D para revelar!' : escapeHtml(a.desc)}
                    </p>
                    <div class="meter-bar" style="height:7px;">
                      <div class="meter-fill" style="width:${prog.pct}%; background:${unlocked ? '#58d63a' : trophy.color};"></div>
                    </div>
                    ${rwParts.length ? `<small style="color:#fde68a; font-size:0.72rem;">Recompensa: ${escapeHtml(rwParts.join(' • '))}</small>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

      container.querySelector('#ach-close')?.addEventListener('click', () => onClose?.());
      container.querySelector('#ach-search')?.addEventListener('input', (e) => {
        searchQuery = e.target.value || '';
        render();
        const inp = container.querySelector('#ach-search');
        if (inp) {
          inp.focus();
          inp.setSelectionRange(inp.value.length, inp.value.length);
        }
      });
      container.querySelector('#ach-status-filter')?.addEventListener('change', (e) => {
        statusFilter = e.target.value;
        render();
      });
      container.querySelector('#ach-trophy-filter')?.addEventListener('change', (e) => {
        trophyFilter = e.target.value;
        render();
      });
      container.querySelectorAll('[data-acat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          categoryFilter = btn.getAttribute('data-acat');
          render();
        });
      });

      attachModalHelp(container, 'Acompanhe todas as 65 conquistas em 9 categorias, filtre por troféu (Bronze, Prata, Ouro, Platina) e ganhe recompensas e títulos!');
    };

    render();
  }
}
