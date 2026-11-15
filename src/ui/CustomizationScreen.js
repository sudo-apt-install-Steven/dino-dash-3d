// Tela de Personalização ao vivo 3D + Presets + Loja de Acessórios/Rastros + Ovos Misteriosos.
import { Save } from '../systems/Save.js';
import {
  PATTERNS,
  ACCESSORIES_SHOP,
  TRAILS_SHOP,
  SKIN_VARIANTS,
  MUTATIONS,
  MAX_MUTATION_LEVEL,
  getSkinVariantDef,
  isSkinVariantUnlocked,
  unlockSkinVariant,
  getEquippedSkinVariant,
  setEquippedSkinVariant,
  applySkinVariantToColors,
  getMutationDef,
  isMutationUnlocked,
  unlockMutation,
  getMutationUnlockedLevel,
  getMutationActiveLevel,
  setMutationActiveLevel,
  getMutationUpgradeCost,
  upgradeMutation,
  getMutationCrystalCost,
  synthesizeOrUpgradeMutationWithCrystals,
  getMutationComputedProfile,
  randomizePreset
} from '../dinos/DinoCustomization.js';
import { ProgressionManager, MYSTERY_EGG_COST } from '../systems/Progression.js';
import { GachaSystem } from '../systems/GachaSystem.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { DinoPreview3D } from './SelectionScreen.js';
import { attachModalHelp } from './Menus.js';
import { renderEggSvg } from './SvgIcons.js';

export class CustomizationScreen {
  static renderInto(container, { onClose, onApplyCustom, onOpenGacha }) {
    let playerSlot = 'p1';
    let subTab = 'colors'; // 'colors' | 'skins' | 'mutations' | 'shop'
    let preview = null;
    let statusMsg = '';

    const buildPreviewState = () => {
      const cfg = Save.data.customization[playerSlot];
      const preset = cfg.presets[cfg.activePreset];
      const dinoId = Save.data.selectedDino || 'trex';
      const dinoSpec = getDinoSpec(dinoId);
      const activeVariantId = playerSlot === 'p1' ? getEquippedSkinVariant(dinoId) : (preset.skinVariant || 'normal');
      const activeMutationId = Save.data.equippedMutation || 'amber_core';
      const activeMutationTier = getMutationActiveLevel(activeMutationId);
      const effectiveColors = applySkinVariantToColors(dinoSpec.colors || {}, activeVariantId);
      const previewCfg = activeVariantId && activeVariantId !== 'normal'
        ? { ...preset, ...effectiveColors, useCustomColors: true }
        : preset;
      return { cfg, preset, dinoId, dinoSpec, activeVariantId, activeMutationId, activeMutationTier, previewCfg };
    };

    const initial = buildPreviewState();
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card" id="cust-modal-card">
          <div class="modal-header">
            <h2>🎨 Personalizar, Skins & Laboratório</h2>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <span class="hud-pill">🥚 <strong id="cust-eggs-val">${Save.data.eggs}</strong></span>
              <button type="button" class="hud-pill" id="cust-cryst-info-btn" title="Clique para ver todas as utilidades dos Diamantes 💎" style="color:#38bdf8; cursor:pointer; border:1px solid rgba(56,189,248,0.5);">💎 <strong id="cust-cryst-val">${Save.data.crystals || 0}</strong> <small style="opacity:0.8;">ℹ️</small></button>
              <span class="hud-pill" style="color:#fde047;">📦 <strong id="cust-crate-val">${GachaSystem.getCrateCount()}</strong></span>
              <button class="chunky-btn orange" id="cust-open-gacha" style="padding:7px 12px; font-size:0.82rem;">🎲 Gacha 3D</button>
              <button class="chunky-btn secondary" id="cust-close">Concluir</button>
            </div>
          </div>

          <div class="tabs-row" id="cust-tabs-row">
            <button class="tab-btn active" data-pslot="p1">Jogador 1</button>
            <button class="tab-btn" data-pslot="p2">Jogador 2</button>
            <button class="tab-btn active" data-stab="colors">Cores & Padrões</button>
            <button class="tab-btn" data-stab="skins">✨ Skins & Mecânico</button>
            <button class="tab-btn" data-stab="mutations">🧬 Mutações DNA</button>
            <button class="tab-btn" data-stab="shop">Loja & Ovos</button>
          </div>

          <div class="hud-pill" id="cust-status-pill" style="color:#ffd447; text-align:center; display:none;"></div>

          <div class="preview-split">
            <div>
              <div class="preview-canvas-box" id="cust-preview-box"></div>
              <div class="tabs-row" id="cust-preset-row" style="margin-top:10px; justify-content:center;">
                ${[0, 1, 2].map((idx) => `
                  <button class="tab-btn ${initial.cfg.activePreset === idx ? 'active' : ''}" data-preset="${idx}">
                    Preset ${idx + 1}
                  </button>
                `).join('')}
              </div>
              <div style="display:flex; gap:8px; margin-top:10px;">
                <button class="chunky-btn orange" id="cust-random" style="flex:1;">🎲 Aleatório</button>
                <button class="chunky-btn secondary" id="cust-native" style="padding:12px 14px;">Cores Nativas</button>
              </div>
            </div>

            <div id="cust-right"></div>
          </div>
        </div>
      </div>
    `;

    const modalCard = container.querySelector('#cust-modal-card');
    const previewBox = container.querySelector('#cust-preview-box');
    preview = new DinoPreview3D(
      previewBox,
      initial.dinoId,
      { ...initial.previewCfg, skinVariant: initial.activeVariantId, mutation: initial.activeMutationId },
      { mutationTier: initial.activeMutationTier, forceLand: initial.activeMutationId === 'extra_limbs' }
    );
    preview.setDino(
      initial.dinoId,
      { ...initial.previewCfg, skinVariant: initial.activeVariantId, mutation: initial.activeMutationId },
      { mutationTier: initial.activeMutationTier, forceLand: initial.activeMutationId === 'extra_limbs' }
    );

    const refreshPreview = () => {
      Save.save();
      const st = buildPreviewState();
      preview?.setDino(
        st.dinoId,
        { ...st.previewCfg, skinVariant: st.activeVariantId, mutation: st.activeMutationId },
        { mutationTier: st.activeMutationTier, forceLand: st.activeMutationId === 'extra_limbs' }
      );
      if (onApplyCustom) onApplyCustom();
    };

    const render = ({ updatePreview = true } = {}) => {
      const savedCardScroll = modalCard ? modalCard.scrollTop : 0;
      const { cfg, preset, dinoId, dinoSpec, activeVariantId, activeMutationId, activeMutationTier, previewCfg } = buildPreviewState();
      const eggStatus = ProgressionManager.getMysteryEggStatus();
      const rotatingShop = ProgressionManager.getRotatingShop();

      container.querySelector('#cust-eggs-val').textContent = Save.data.eggs;
      container.querySelector('#cust-cryst-val').textContent = Save.data.crystals || 0;
      container.querySelector('#cust-crate-val').textContent = GachaSystem.getCrateCount();

      const statusEl = container.querySelector('#cust-status-pill');
      if (statusMsg) {
        statusEl.textContent = statusMsg;
        statusEl.style.display = '';
      } else {
        statusEl.style.display = 'none';
      }

      container.querySelectorAll('[data-pslot]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-pslot') === playerSlot));
      container.querySelectorAll('[data-stab]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-stab') === subTab));
      container.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('active', Number(b.getAttribute('data-preset')) === cfg.activePreset));

      const rightEl = container.querySelector('#cust-right');
      rightEl.innerHTML = subTab === 'skins' ? `
        <div class="item-card" style="margin-bottom:10px; border-color:#f59e0b;">
          <strong style="color:#fde047;">✨ Variantes Especiais — ${dinoSpec.name}</strong>
          <p style="font-size:0.8rem; color:#d4d4d8; margin:4px 0 0;">
            Desbloqueie Cores Únicas com ovos ou conquiste formas <strong>Shiny ✨</strong>, <strong>Mecânico 🤖</strong> e <strong>Secreta Cósmica 🌌</strong> no Gacha Fóssil 3D!
          </p>
        </div>
        <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));">
          ${SKIN_VARIANTS.map((v) => {
            const owned = isSkinVariantUnlocked(dinoId, v.id);
            const equipped = activeVariantId === v.id;
            return `
              <div class="item-card ${equipped ? 'selected' : ''}" style="border-color:${v.primary || '#52525b'};">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                  <strong style="color:#fafafa;">${v.badge} ${v.name}</strong>
                  <small style="color:#fde047;">${v.rarity}</small>
                </div>
                <p style="font-size:0.76rem; color:#a1a1aa; margin:4px 0 8px;">${v.desc}</p>
                ${owned ? `
                  <button class="tab-btn ${equipped ? 'active' : ''}" data-equip-variant="${v.id}">
                    ${equipped ? '✔ Equipada' : 'Equipar Variante'}
                  </button>
                ` : (v.gachaOnly ? `
                  <button class="tab-btn" data-variant-gacha="${v.id}" style="border-color:#c084fc; color:#f5d0fe;">
                    🎲 Exclusiva do Gacha 3D
                  </button>
                ` : `
                  <button class="tab-btn" data-buy-variant="${v.id}">
                    Comprar (${v.price} 🥚)
                  </button>
                `)}
              </div>
            `;
          }).join('')}
        </div>
      ` : subTab === 'mutations' ? `
        <div class="item-card" style="margin-bottom:10px; border-color:#5eead4;">
          <strong style="color:#5eead4;">🧬 Laboratório de Mutações Evolutivas (Nv.1–4)</strong>
          <p style="font-size:0.8rem; color:#cbd5e1; margin:4px 0 0;">
            Evolua até Nv.4 para amplificar poder (como <strong>+2/+4/+6/+8 Patas</strong>!). Toda mutação traz <strong>Prós reais</strong> e <strong>Contras realistas</strong> na física.
          </p>
        </div>
        <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(225px, 1fr));">
          ${MUTATIONS.map((m) => {
            const owned = isMutationUnlocked(m.id);
            const equipped = activeMutationId === m.id;
            const unlockedLv = owned ? getMutationUnlockedLevel(m.id) : 0;
            const activeLv = owned ? getMutationActiveLevel(m.id) : 1;
            const profile = getMutationComputedProfile(m.id, activeLv);
            const nextCost = getMutationUpgradeCost(m, unlockedLv);
            const crystalCost = getMutationCrystalCost(m, unlockedLv);
            const isMax = unlockedLv >= MAX_MUTATION_LEVEL;
            return `
              <div class="item-card ${equipped ? 'selected' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
                  <strong style="color:#fafafa;">${m.badge} ${m.name}</strong>
                  <small style="color:#5eead4;">${m.rarity} ${owned ? `• ${profile?.tierLabel || `Nv.${activeLv}`}` : ''}</small>
                </div>
                <p style="font-size:0.74rem; color:#cbd5e1; margin:4px 0 4px;">${m.desc}</p>
                <div class="mut-tradeoff-list">
                  ${(profile?.pros || []).map((p) => `<div class="mut-pro">+ ${p}</div>`).join('')}
                  ${(profile?.cons || []).map((c) => `<div class="mut-con">- ${c}</div>`).join('')}
                </div>
                ${owned && unlockedLv > 1 ? `
                  <div style="display:flex; gap:4px; flex-wrap:wrap; margin:6px 0;">
                    ${[1, 2, 3, 4].filter((lv) => lv <= unlockedLv).map((lv) => `
                      <button class="tab-btn ${activeLv === lv ? 'active' : ''}" data-mut-tier="${m.id}:${lv}" style="padding:3px 7px; font-size:0.7rem;">
                        ${m.id === 'extra_limbs' ? `+${lv * 2} Patas` : `Nv.${lv}`}
                      </button>
                    `).join('')}
                  </div>
                ` : ''}
                ${owned ? `
                  <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
                    <button class="tab-btn ${equipped ? 'active' : ''}" data-equip-mut="${m.id}" style="flex:1;">
                      ${equipped ? '✔ Ativa' : 'Ativar'}
                    </button>
                    <button class="tab-btn" data-upgrade-mut="${m.id}" ${isMax ? 'disabled' : ''} style="border-color:#f59e0b; color:#fde047;">
                      ${isMax ? 'MAX Nv.4' : `⬆ Nv.${unlockedLv + 1} (${nextCost} 🥚)`}
                    </button>
                    ${!isMax ? `
                      <button class="tab-btn" data-cryst-mut="${m.id}" title="Evoluir instantaneamente usando Cristais 💎" style="border-color:#38bdf8; color:#7dd3fc;">
                        💎 Nv.${unlockedLv + 1} (${crystalCost} 💎)
                      </button>
                    ` : ''}
                  </div>
                ` : (m.gachaOnly ? `
                  <button class="tab-btn" data-mut-gacha="${m.id}" style="border-color:#c084fc; color:#f5d0fe; margin-top:6px;">
                    🎲 Secreta no Gacha 3D
                  </button>
                ` : `
                  <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
                    <button class="tab-btn" data-buy-mut="${m.id}" style="flex:1;">
                      Sintetizar (${m.cost} 🥚)
                    </button>
                    <button class="tab-btn" data-cryst-mut="${m.id}" title="Desbloquear sem gastar Ovos usando Cristais 💎" style="border-color:#38bdf8; color:#7dd3fc;">
                      💎 Forjar (${crystalCost} 💎)
                    </button>
                  </div>
                `)}
              </div>
            `;
          }).join('')}
        </div>
      ` : subTab === 'colors' ? `
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
      `;

      if (updatePreview) {
        preview?.setDino(
          dinoId,
          { ...previewCfg, skinVariant: activeVariantId, mutation: activeMutationId },
          { mutationTier: activeMutationTier, forceLand: activeMutationId === 'extra_limbs' }
        );
      }

      if (subTab === 'skins') {
        rightEl.querySelectorAll('[data-equip-variant]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const vid = btn.getAttribute('data-equip-variant');
            setEquippedSkinVariant(dinoId, vid);
            const vdef = getSkinVariantDef(vid);
            statusMsg = `${vdef.badge} Variante "${vdef.name}" equipada!`;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });
        rightEl.querySelectorAll('[data-buy-variant]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const vid = btn.getAttribute('data-buy-variant');
            const vdef = getSkinVariantDef(vid);
            if ((Save.data.eggs || 0) < vdef.price) {
              statusMsg = `Ovos insuficientes (precisa ${vdef.price} 🥚)`;
              render({ updatePreview: false });
              return;
            }
            Save.addEggs(-vdef.price);
            unlockSkinVariant(dinoId, vid);
            setEquippedSkinVariant(dinoId, vid);
            statusMsg = `🎉 ${vdef.badge} "${vdef.name}" desbloqueada e equipada!`;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });
        rightEl.querySelectorAll('[data-variant-gacha]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (onOpenGacha) {
              preview?.destroy();
              onOpenGacha(() => render({ updatePreview: true }));
            } else {
              statusMsg = '🎲 Abra o Gacha Fóssil 3D para tentar conquistar essa variante rara!';
              render({ updatePreview: false });
            }
          });
        });
      } else if (subTab === 'mutations') {
        rightEl.querySelectorAll('[data-equip-mut]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const mid = btn.getAttribute('data-equip-mut');
            const mdef = getMutationDef(mid);
            Save.data.equippedMutation = mid;
            Save.save();
            statusMsg = `🧬 Mutação "${mdef?.name || mid}" ativada!`;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });
        rightEl.querySelectorAll('[data-mut-tier]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const [mid, lvStr] = btn.getAttribute('data-mut-tier').split(':');
            const lv = setMutationActiveLevel(mid, Number(lvStr));
            Save.data.equippedMutation = mid;
            Save.save();
            const prof = getMutationComputedProfile(mid, lv);
            statusMsg = `🧬 ${prof?.tierLabel || `Nv.${lv}`} selecionado!`;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });
        rightEl.querySelectorAll('[data-upgrade-mut]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const mid = btn.getAttribute('data-upgrade-mut');
            const res = upgradeMutation(mid);
            if (!res.ok) {
              statusMsg = res.reason;
              render({ updatePreview: false });
              return;
            }
            Save.data.equippedMutation = mid;
            Save.save();
            const prof = getMutationComputedProfile(mid, res.level);
            statusMsg = `⚡ Evoluído para ${prof?.tierLabel || `Nv.${res.level}`}!`;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });
        rightEl.querySelectorAll('[data-cryst-mut]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const mid = btn.getAttribute('data-cryst-mut');
            const res = synthesizeOrUpgradeMutationWithCrystals(mid);
            if (!res.ok) {
              statusMsg = res.reason;
              render({ updatePreview: false });
              return;
            }
            const prof = getMutationComputedProfile(mid, res.level);
            statusMsg = `💎 Forja de Cristal (-${res.cost} 💎): ${prof?.tierLabel || `Nv.${res.level}`} ativada!`;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });
        rightEl.querySelectorAll('[data-buy-mut]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const mid = btn.getAttribute('data-buy-mut');
            const mdef = getMutationDef(mid);
            if (!mdef) return;
            if ((Save.data.eggs || 0) < mdef.cost) {
              statusMsg = `Ovos insuficientes (precisa ${mdef.cost} 🥚)`;
              render({ updatePreview: false });
              return;
            }
            Save.addEggs(-mdef.cost);
            unlockMutation(mid);
            Save.data.equippedMutation = mid;
            Save.save();
            statusMsg = `🧬 Mutação "${mdef.name}" sintetizada e equipada!`;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });
        rightEl.querySelectorAll('[data-mut-gacha]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (onOpenGacha) {
              preview?.destroy();
              onOpenGacha(() => render({ updatePreview: true }));
            } else {
              statusMsg = '🎲 Essa Mutação Cósmica só nasce nos Ovos Fósseis do Gacha 3D!';
              render({ updatePreview: false });
            }
          });
        });
      } else if (subTab === 'colors') {
        const bind = (id, key) => {
          const el = rightEl.querySelector(id);
          if (el) el.addEventListener('input', () => { preset.useCustomColors = true; preset[key] = el.value; refreshPreview(); });
        };
        bind('#c-primary', 'primary');
        bind('#c-secondary', 'secondary');
        bind('#c-eye', 'eye');
        bind('#c-spots', 'spots');
        bind('#c-spikes', 'spikes');
        rightEl.querySelector('#c-pattern')?.addEventListener('change', (e) => { preset.pattern = e.target.value; refreshPreview(); });
        rightEl.querySelector('#c-acc')?.addEventListener('change', (e) => { preset.accessory = e.target.value; refreshPreview(); });
        rightEl.querySelector('#c-trail')?.addEventListener('change', (e) => { preset.trail = e.target.value; refreshPreview(); });
        rightEl.querySelector('#c-landing')?.addEventListener('change', (e) => { preset.landingEffect = e.target.value; refreshPreview(); });
        rightEl.querySelector('#c-death')?.addEventListener('change', (e) => { preset.deathEffect = e.target.value; refreshPreview(); });
      } else if (subTab === 'shop') {
        rightEl.querySelector('#buy-mystery')?.addEventListener('click', () => {
          const res = ProgressionManager.openMysteryEgg();
          statusMsg = res.ok ? `🎉 Você abriu: ${res.rewardName}!` : res.reason;
          render({ updatePreview: false });
        });

        rightEl.querySelector('#rot-reroll-cryst')?.addEventListener('click', () => {
          const res = ProgressionManager.rerollRotatingShop(true);
          statusMsg = res.ok ? '🔄 Loja rotativa atualizada!' : res.reason;
          render({ updatePreview: false });
        });

        rightEl.querySelector('#rot-reroll-egg')?.addEventListener('click', () => {
          const res = ProgressionManager.rerollRotatingShop(false);
          statusMsg = res.ok ? '🔄 Loja rotativa atualizada!' : res.reason;
          render({ updatePreview: false });
        });

        rightEl.querySelectorAll('[data-buy-rot]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const res = ProgressionManager.buyRotatingOffer(btn.getAttribute('data-buy-rot'));
            statusMsg = res.ok ? `🎉 Oferta adquirida: ${res.offer.name}!` : res.reason;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });

        rightEl.querySelectorAll('[data-buy-acc]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-buy-acc');
            const item = ACCESSORIES_SHOP.find((x) => x.id === id);
            if (!Save.data.unlockedAccessories.includes(id)) {
              if (Save.data.eggs < item.price) {
                statusMsg = `Ovos insuficientes (precisa ${item.price} 🥚)`;
                render({ updatePreview: false });
                return;
              }
              Save.addEggs(-item.price);
              Save.data.unlockedAccessories.push(id);
            }
            preset.accessory = id;
            Save.save();
            statusMsg = `${item.name} equipado!`;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });

        rightEl.querySelectorAll('[data-buy-trail]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-buy-trail');
            const item = TRAILS_SHOP.find((x) => x.id === id);
            if (!Save.data.unlockedTrails.includes(id)) {
              if (Save.data.eggs < item.price) {
                statusMsg = `Ovos insuficientes (precisa ${item.price} 🥚)`;
                render({ updatePreview: false });
                return;
              }
              Save.addEggs(-item.price);
              Save.data.unlockedTrails.push(id);
            }
            preset.trail = id;
            Save.save();
            statusMsg = `Rastro ${item.name} equipado!`;
            if (onApplyCustom) onApplyCustom();
            render({ updatePreview: true });
          });
        });
      }

      if (modalCard) modalCard.scrollTop = savedCardScroll;
    };

    container.querySelector('#cust-cryst-info-btn')?.addEventListener('click', () => {
      statusMsg = '💎 Diamantes servem para: Catalisador no Gacha (3 💎 -> Épica+!), Forjar/Evoluir Mutações (2-4 💎), Atualizar Loja Rotativa (2 💎) e Renascer na corrida (2 💎)!';
      render({ updatePreview: false });
    });

    container.querySelector('#cust-open-gacha')?.addEventListener('click', () => {
      preview?.destroy();
      if (onOpenGacha) {
        onOpenGacha(() => render({ updatePreview: true }));
      } else {
        statusMsg = 'Abra o Gacha Fóssil pelo menu principal!';
        render({ updatePreview: false });
      }
    });

    container.querySelectorAll('[data-pslot]').forEach((b) => {
      b.addEventListener('click', () => {
        playerSlot = b.getAttribute('data-pslot');
        render({ updatePreview: true });
      });
    });

    container.querySelectorAll('[data-stab]').forEach((b) => {
      b.addEventListener('click', () => {
        subTab = b.getAttribute('data-stab');
        render({ updatePreview: false });
      });
    });

    container.querySelectorAll('[data-preset]').forEach((b) => {
      b.addEventListener('click', () => {
        const cfg = Save.data.customization[playerSlot];
        cfg.activePreset = Number(b.getAttribute('data-preset'));
        Save.save();
        if (onApplyCustom) onApplyCustom();
        render({ updatePreview: true });
      });
    });

    container.querySelector('#cust-random').addEventListener('click', () => {
      const { preset } = buildPreviewState();
      randomizePreset(preset);
      statusMsg = '🎨 Visual aleatório aplicado!';
      if (onApplyCustom) onApplyCustom();
      render({ updatePreview: true });
    });

    container.querySelector('#cust-native')?.addEventListener('click', () => {
      const { preset, dinoId } = buildPreviewState();
      preset.useCustomColors = false;
      if (playerSlot === 'p1') setEquippedSkinVariant(dinoId, 'normal');
      Save.save();
      statusMsg = '🦎 Cores nativas da espécie restauradas!';
      if (onApplyCustom) onApplyCustom();
      render({ updatePreview: true });
    });

    container.querySelector('#cust-close').addEventListener('click', () => {
      preview?.destroy();
      if (onApplyCustom) onApplyCustom();
      if (onClose) onClose();
    });

    attachModalHelp(container, 'Personalize cores, evolua mutações com Prós e Contras reais (incluindo +2/+4/+6/+8 Patas!), skins e rastros.');
    render({ updatePreview: false });
    return () => preview?.destroy();
  }
}
