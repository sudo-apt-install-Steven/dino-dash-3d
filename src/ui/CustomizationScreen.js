// Tela de Personalização ao vivo 3D + Presets + Loja de Acessórios/Rastros + Ovos Misteriosos.
import { Save } from '../systems/Save.js';
import {
  PATTERNS,
  ACCESSORIES_SHOP,
  TRAILS_SHOP,
  randomizePreset
} from '../dinos/DinoCustomization.js';
import { ProgressionManager, MYSTERY_EGG_COST } from '../systems/Progression.js';
import { DinoPreview3D } from './SelectionScreen.js';
import { attachModalHelp } from './Menus.js';
import { renderEggSvg } from './SvgIcons.js';

export class CustomizationScreen {
  static renderInto(container, { onClose, onApplyCustom }) {
    let playerSlot = 'p1';
    let subTab = 'colors'; // 'colors' | 'shop'
    let preview = null;
    let statusMsg = '';

    const render = () => {
      const cfg = Save.data.customization[playerSlot];
      const preset = cfg.presets[cfg.activePreset];
      const dinoId = Save.data.selectedDino || 'trex';
      const eggStatus = ProgressionManager.getMysteryEggStatus();
      const rotatingShop = ProgressionManager.getRotatingShop();

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card">
            <div class="modal-header">
              <h2>🎨 Personalizar & Loja</h2>
              <div style="display:flex; gap:8px; align-items:center;">
                <span class="hud-pill">🥚 Ovos: <strong>${Save.data.eggs}</strong></span>
                <span class="hud-pill" style="color:#38bdf8;">💎 <strong>${Save.data.crystals || 0}</strong></span>
                <button class="chunky-btn secondary" id="cust-close">Concluir</button>
              </div>
            </div>

            <div class="tabs-row">
              <button class="tab-btn ${playerSlot === 'p1' ? 'active' : ''}" data-pslot="p1">Jogador 1</button>
              <button class="tab-btn ${playerSlot === 'p2' ? 'active' : ''}" data-pslot="p2">Jogador 2</button>
              <button class="tab-btn ${subTab === 'colors' ? 'active' : ''}" data-stab="colors">Cores & Padrões</button>
              <button class="tab-btn ${subTab === 'shop' ? 'active' : ''}" data-stab="shop">Loja & Ovos Misteriosos</button>
            </div>

            ${statusMsg ? `<div class="hud-pill" style="color:#ffd447; text-align:center;">${statusMsg}</div>` : ''}

            <div class="preview-split">
              <div>
                <div class="preview-canvas-box" id="cust-preview-box"></div>
                <div class="tabs-row" style="margin-top:10px; justify-content:center;">
                  ${[0, 1, 2].map((idx) => `
                    <button class="tab-btn ${cfg.activePreset === idx ? 'active' : ''}" data-preset="${idx}">
                      Preset ${idx + 1}
                    </button>
                  `).join('')}
                </div>
                <div style="display:flex; gap:8px; margin-top:10px;">
                  <button class="chunky-btn orange" id="cust-random" style="flex:1;">🎲 Aleatório</button>
                  <button class="chunky-btn secondary" id="cust-native" style="padding:12px 14px;">Cores Nativas</button>
                </div>
              </div>

              <div id="cust-right">
                ${subTab === 'colors' ? `
                  <div class="field-row"><span>Cor Primária</span><input type="color" id="c-primary" value="${preset.primary}" /></div>
                  <div class="field-row"><span>Secundária (Barriga)</span><input type="color" id="c-secondary" value="${preset.secondary}" /></div>
                  <div class="field-row"><span>Cor dos Olhos</span><input type="color" id="c-eye" value="${preset.eye}" /></div>
                  <div class="field-row"><span>Manchas / Listras</span><input type="color" id="c-spots" value="${preset.spots}" /></div>
                  <div class="field-row"><span>Espinhos / Chifres</span><input type="color" id="c-spikes" value="${preset.spikes}" /></div>
                  <div class="field-row">
                    <span>Padrão de Pele</span>
                    <select id="c-pattern">
                      ${PATTERNS.map((p) => `<option value="${p.id}" ${preset.pattern === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
                    </select>
                  </div>
                  <div class="field-row">
                    <span>Acessório Desbloqueado</span>
                    <select id="c-acc">
                      ${ACCESSORIES_SHOP.filter((a) => Save.data.unlockedAccessories.includes(a.id)).map((a) => `
                        <option value="${a.id}" ${preset.accessory === a.id ? 'selected' : ''}>${a.name}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="field-row">
                    <span>Rastro de Corrida</span>
                    <select id="c-trail">
                      ${TRAILS_SHOP.filter((t) => Save.data.unlockedTrails.includes(t.id)).map((t) => `
                        <option value="${t.id}" ${preset.trail === t.id ? 'selected' : ''}>${t.name}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="field-row">
                    <span>Efeito de Pouso</span>
                    <select id="c-landing">
                      <option value="dust" ${(preset.landingEffect || 'dust') === 'dust' ? 'selected' : ''}>Poeira Clássica</option>
                      <option value="sparks" ${preset.landingEffect === 'sparks' ? 'selected' : ''}>Faíscas Laranjas</option>
                      <option value="shockwave" ${preset.landingEffect === 'shockwave' ? 'selected' : ''}>Onda Dourada</option>
                    </select>
                  </div>
                  <div class="field-row">
                    <span>Efeito de Morte</span>
                    <select id="c-death">
                      <option value="cubes" ${(preset.deathEffect || 'cubes') === 'cubes' ? 'selected' : ''}>Explosão de Cubos</option>
                      <option value="fireworks" ${preset.deathEffect === 'fireworks' ? 'selected' : ''}>Fogos Coloridos</option>
                      <option value="ghost" ${preset.deathEffect === 'ghost' ? 'selected' : ''}>Névoa Fantasma</option>
                    </select>
                  </div>
                ` : `
                  <div class="item-card" style="margin-bottom:10px; border-color:#38bdf8;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                      <div>
                        <strong style="color:#38bdf8;">🔄 Loja Rotativa (-20% em destaques)</strong>
                        <div style="font-size:0.76rem; color:#bae6fd;">Atualiza em ${rotatingShop.refreshIn}</div>
                      </div>
                      <div style="display:flex; gap:6px;">
                        <button class="tab-btn" id="rot-reroll-cryst" style="padding:4px 8px; font-size:0.75rem;">🔄 2 💎</button>
                        <button class="tab-btn" id="rot-reroll-egg" style="padding:4px 8px; font-size:0.75rem;">🔄 120 🥚</button>
                      </div>
                    </div>
                    <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));">
                      ${rotatingShop.offers.map((o) => {
                        const bought = rotatingShop.purchasedIds.includes(o.offerId);
                        return `
                          <div class="item-card">
                            <small style="color:#ffd447;">${o.rarity} • -${o.discountPct}%</small>
                            <strong>${o.name}</strong>
                            <button class="tab-btn ${bought ? '' : 'active'}" data-buy-rot="${o.offerId}" ${bought ? 'disabled' : ''}>
                              ${bought ? '✅ Comprado' : `Comprar (${o.price} 🥚)`}
                            </button>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                  <div class="item-card rarity-lendária" style="margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                      <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:220px;">
                        ${renderEggSvg('surpresa', 36)}
                        <div>
                          <strong>Ovo Misterioso</strong>
                          <p style="font-size:0.8rem; color:#d8c2a6;">
                            ${eggStatus.collectionComplete
                              ? `Coleção 100% completa! Abrir devolve ${eggStatus.dupRefund} 🥚 + ${eggStatus.dupXp} XP + 1 💎 (sem farm infinito).`
                              : `Sorteia 1 acessório ou rastro faltante (restam ${eggStatus.totalRemaining} na coleção)!`}
                          </p>
                        </div>
                      </div>
                      <button class="chunky-btn" id="buy-mystery">Abrir (${MYSTERY_EGG_COST} 🥚)</button>
                    </div>
                  </div>
                  <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));">
                    ${ACCESSORIES_SHOP.filter((a) => a.price > 0).map((a) => {
                      const owned = Save.data.unlockedAccessories.includes(a.id);
                      return `
                        <div class="item-card rarity-${a.rarity.toLowerCase()}">
                          <small style="color:#ffd447;">${a.rarity}</small>
                          <strong>${a.name}</strong>
                          <button class="tab-btn ${owned ? 'active' : ''}" data-buy-acc="${a.id}">
                            ${owned ? (preset.accessory === a.id ? 'Equipado' : 'Equipar') : `Comprar (${a.price} 🥚)`}
                          </button>
                        </div>
                      `;
                    }).join('')}
                    ${TRAILS_SHOP.filter((t) => t.price > 0).map((t) => {
                      const owned = Save.data.unlockedTrails.includes(t.id);
                      return `
                        <div class="item-card rarity-${t.rarity.toLowerCase()}">
                          <small style="color:#ffd447;">${t.rarity} • Rastro</small>
                          <strong>${t.name}</strong>
                          <button class="tab-btn ${owned ? 'active' : ''}" data-buy-trail="${t.id}">
                            ${owned ? (preset.trail === t.id ? 'Equipado' : 'Equipar') : `Comprar (${t.price} 🥚)`}
                          </button>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      `;

      const box = container.querySelector('#cust-preview-box');
      if (preview) preview.destroy();
      preview = new DinoPreview3D(box, dinoId, preset);

      container.querySelectorAll('[data-pslot]').forEach((b) => {
        b.addEventListener('click', () => {
          playerSlot = b.getAttribute('data-pslot');
          render();
        });
      });

      container.querySelectorAll('[data-stab]').forEach((b) => {
        b.addEventListener('click', () => {
          subTab = b.getAttribute('data-stab');
          render();
        });
      });

      container.querySelectorAll('[data-preset]').forEach((b) => {
        b.addEventListener('click', () => {
          cfg.activePreset = Number(b.getAttribute('data-preset'));
          Save.save();
          if (onApplyCustom) onApplyCustom();
          render();
        });
      });

      container.querySelector('#cust-random').addEventListener('click', () => {
        randomizePreset(preset);
        statusMsg = '🎨 Visual aleatório aplicado!';
        if (onApplyCustom) onApplyCustom();
        render();
      });

      container.querySelector('#cust-native')?.addEventListener('click', () => {
        preset.useCustomColors = false;
        Save.save();
        statusMsg = '🦎 Cores nativas da espécie restauradas!';
        if (onApplyCustom) onApplyCustom();
        render();
      });

      const refreshPreview = () => {
        Save.save();
        preview?.setDino(dinoId, preset);
        if (onApplyCustom) onApplyCustom();
      };

      if (subTab === 'colors') {
        const bind = (id, key) => {
          const el = container.querySelector(id);
          if (el) el.addEventListener('input', () => { preset.useCustomColors = true; preset[key] = el.value; refreshPreview(); });
        };
        bind('#c-primary', 'primary');
        bind('#c-secondary', 'secondary');
        bind('#c-eye', 'eye');
        bind('#c-spots', 'spots');
        bind('#c-spikes', 'spikes');
        container.querySelector('#c-pattern')?.addEventListener('change', (e) => { preset.pattern = e.target.value; refreshPreview(); });
        container.querySelector('#c-acc')?.addEventListener('change', (e) => { preset.accessory = e.target.value; refreshPreview(); });
        container.querySelector('#c-trail')?.addEventListener('change', (e) => { preset.trail = e.target.value; refreshPreview(); });
        container.querySelector('#c-landing')?.addEventListener('change', (e) => { preset.landingEffect = e.target.value; refreshPreview(); });
        container.querySelector('#c-death')?.addEventListener('change', (e) => { preset.deathEffect = e.target.value; refreshPreview(); });
      } else {
        container.querySelector('#buy-mystery')?.addEventListener('click', () => {
          const res = ProgressionManager.openMysteryEgg();
          statusMsg = res.ok ? `🎉 Você abriu: ${res.rewardName}!` : res.reason;
          render();
        });

        container.querySelector('#rot-reroll-cryst')?.addEventListener('click', () => {
          const res = ProgressionManager.rerollRotatingShop(true);
          statusMsg = res.ok ? '🔄 Loja rotativa atualizada!' : res.reason;
          render();
        });

        container.querySelector('#rot-reroll-egg')?.addEventListener('click', () => {
          const res = ProgressionManager.rerollRotatingShop(false);
          statusMsg = res.ok ? '🔄 Loja rotativa atualizada!' : res.reason;
          render();
        });

        container.querySelectorAll('[data-buy-rot]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const res = ProgressionManager.buyRotatingOffer(btn.getAttribute('data-buy-rot'));
            statusMsg = res.ok ? `🎉 Oferta adquirida: ${res.offer.name}!` : res.reason;
            if (onApplyCustom) onApplyCustom();
            render();
          });
        });

        container.querySelectorAll('[data-buy-acc]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-buy-acc');
            const item = ACCESSORIES_SHOP.find((x) => x.id === id);
            if (!Save.data.unlockedAccessories.includes(id)) {
              if (Save.data.eggs < item.price) {
                statusMsg = `Ovos insuficientes (precisa ${item.price} 🥚)`;
                render();
                return;
              }
              Save.addEggs(-item.price);
              Save.data.unlockedAccessories.push(id);
            }
            preset.accessory = id;
            Save.save();
            statusMsg = `${item.name} equipado!`;
            if (onApplyCustom) onApplyCustom();
            render();
          });
        });

        container.querySelectorAll('[data-buy-trail]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-buy-trail');
            const item = TRAILS_SHOP.find((x) => x.id === id);
            if (!Save.data.unlockedTrails.includes(id)) {
              if (Save.data.eggs < item.price) {
                statusMsg = `Ovos insuficientes (precisa ${item.price} 🥚)`;
                render();
                return;
              }
              Save.addEggs(-item.price);
              Save.data.unlockedTrails.push(id);
            }
            preset.trail = id;
            Save.save();
            statusMsg = `Rastro ${item.name} equipado!`;
            if (onApplyCustom) onApplyCustom();
            render();
          });
        });
      }

      container.querySelector('#cust-close').addEventListener('click', () => {
        preview?.destroy();
        if (onApplyCustom) onApplyCustom();
        if (onClose) onClose();
      });
      attachModalHelp(container, 'Personalize cores, padrões de pele, acessórios e rastros para P1/P2 em até 3 presets salvos ou compre na Loja.');
    };

    render();
    return () => preview?.destroy();
  }
}
