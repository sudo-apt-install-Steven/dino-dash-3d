// Tela de Personalização ao vivo 3D + Presets + Loja de Acessórios/Rastros + Ovos Misteriosos.
import { Save } from '../systems/Save.js';
import {
  PATTERNS,
  ACCESSORIES_SHOP,
  TRAILS_SHOP,
  SKIN_VARIANTS,
  MUTATIONS,
  getSkinVariantDef,
  isSkinVariantUnlocked,
  unlockSkinVariant,
  getEquippedSkinVariant,
  setEquippedSkinVariant,
  applySkinVariantToColors,
  getMutationDef,
  isMutationUnlocked,
  unlockMutation,
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

    const render = () => {
      const cfg = Save.data.customization[playerSlot];
      const preset = cfg.presets[cfg.activePreset];
      const dinoId = Save.data.selectedDino || 'trex';
      const dinoSpec = getDinoSpec(dinoId);
      const activeVariantId = playerSlot === 'p1' ? getEquippedSkinVariant(dinoId) : (preset.skinVariant || 'normal');
      const activeMutationId = Save.data.equippedMutation || 'amber_core';
      const effectiveColors = applySkinVariantToColors(dinoSpec.colors || {}, activeVariantId);
      const previewCfg = activeVariantId && activeVariantId !== 'normal'
        ? { ...preset, ...effectiveColors, useCustomColors: true }
        : preset;
      const eggStatus = ProgressionManager.getMysteryEggStatus();
      const rotatingShop = ProgressionManager.getRotatingShop();

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card">
            <div class="modal-header">
              <h2>🎨 Personalizar, Skins & Laboratório</h2>
              <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <span class="hud-pill">🥚 <strong>${Save.data.eggs}</strong></span>
                <span class="hud-pill" style="color:#38bdf8;">💎 <strong>${Save.data.crystals || 0}</strong></span>
                <span class="hud-pill" style="color:#fde047;">📦 <strong>${GachaSystem.getCrateCount()}</strong></span>
                <button class="chunky-btn orange" id="cust-open-gacha" style="padding:7px 12px; font-size:0.82rem;">🎲 Gacha 3D</button>
                <button class="chunky-btn secondary" id="cust-close">Concluir</button>
              </div>
            </div>

            <div class="tabs-row">
              <button class="tab-btn ${playerSlot === 'p1' ? 'active' : ''}" data-pslot="p1">Jogador 1</button>
              <button class="tab-btn ${playerSlot === 'p2' ? 'active' : ''}" data-pslot="p2">Jogador 2</button>
              <button class="tab-btn ${subTab === 'colors' ? 'active' : ''}" data-stab="colors">Cores & Padrões</button>
              <button class="tab-btn ${subTab === 'skins' ? 'active' : ''}" data-stab="skins">✨ Skins & Mecânico</button>
              <button class="tab-btn ${subTab === 'mutations' ? 'active' : ''}" data-stab="mutations">🧬 Mutações DNA</button>
              <button class="tab-btn ${subTab === 'shop' ? 'active' : ''}" data-stab="shop">Loja & Ovos</button>
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
                ${subTab === 'skins' ? `
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
                    <strong style="color:#5eead4;">🧬 Laboratório de Mutações Genéticas</strong>
                    <p style="font-size:0.8rem; color:#cbd5e1; margin:4px 0 0;">
                      Equipe até 1 Mutação Permanente antes de correr! Concedem bônus de velocidade, pulo, ovos extras, escudos ou recarga de ataque.
                    </p>
                  </div>
                  <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));">
                    ${MUTATIONS.map((m) => {
                      const owned = isMutationUnlocked(m.id);
                      const equipped = activeMutationId === m.id;
                      return `
                        <div class="item-card ${equipped ? 'selected' : ''}">
                          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                            <strong style="color:#fafafa;">${m.badge} ${m.name}</strong>
                            <small style="color:#5eead4;">${m.rarity}</small>
                          </div>
                          <p style="font-size:0.76rem; color:#cbd5e1; margin:4px 0 8px;">${m.desc}</p>
                          ${owned ? `
                            <button class="tab-btn ${equipped ? 'active' : ''}" data-equip-mut="${m.id}">
                              ${equipped ? '✔ Mutação Ativa' : 'Ativar Mutação'}
                            </button>
                          ` : (m.gachaOnly ? `
                            <button class="tab-btn" data-mut-gacha="${m.id}" style="border-color:#c084fc; color:#f5d0fe;">
                              🎲 Secreta no Gacha 3D
                            </button>
                          ` : `
                            <button class="tab-btn" data-buy-mut="${m.id}">
                              Sintetizar (${m.cost} 🥚)
                            </button>
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
                `}
              </div>
            </div>
          </div>
        </div>
      `;

      const box = container.querySelector('#cust-preview-box');
      if (preview) preview.destroy();
      preview = new DinoPreview3D(box, dinoId, { ...previewCfg, skinVariant: activeVariantId, mutation: activeMutationId });

      container.querySelector('#cust-open-gacha')?.addEventListener('click', () => {
        preview?.destroy();
        if (onOpenGacha) {
          onOpenGacha(() => render());
        } else {
          statusMsg = 'Abra o Gacha Fóssil pelo menu principal!';
          render();
        }
      });

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
        if (playerSlot === 'p1') setEquippedSkinVariant(dinoId, 'normal');
        Save.save();
        statusMsg = '🦎 Cores nativas da espécie restauradas!';
        if (onApplyCustom) onApplyCustom();
        render();
      });

      const refreshPreview = () => {
        Save.save();
        const curVar = playerSlot === 'p1' ? getEquippedSkinVariant(dinoId) : 'normal';
        const eff = applySkinVariantToColors(dinoSpec.colors || {}, curVar);
        const cfgLive = curVar !== 'normal' ? { ...preset, ...eff, useCustomColors: true } : preset;
        preview?.setDino(dinoId, { ...cfgLive, skinVariant: curVar, mutation: Save.data.equippedMutation || 'amber_core' });
        if (onApplyCustom) onApplyCustom();
      };

      if (subTab === 'skins') {
        container.querySelectorAll('[data-equip-variant]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const vid = btn.getAttribute('data-equip-variant');
            setEquippedSkinVariant(dinoId, vid);
            const vdef = getSkinVariantDef(vid);
            statusMsg = `${vdef.badge} Variante "${vdef.name}" equipada!`;
            if (onApplyCustom) onApplyCustom();
            render();
          });
        });
        container.querySelectorAll('[data-buy-variant]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const vid = btn.getAttribute('data-buy-variant');
            const vdef = getSkinVariantDef(vid);
            if ((Save.data.eggs || 0) < vdef.price) {
              statusMsg = `Ovos insuficientes (precisa ${vdef.price} 🥚)`;
              render();
              return;
            }
            Save.addEggs(-vdef.price);
            unlockSkinVariant(dinoId, vid);
            setEquippedSkinVariant(dinoId, vid);
            statusMsg = `🎉 ${vdef.badge} "${vdef.name}" desbloqueada e equipada!`;
            if (onApplyCustom) onApplyCustom();
            render();
          });
        });
        container.querySelectorAll('[data-variant-gacha]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (onOpenGacha) {
              preview?.destroy();
              onOpenGacha(() => render());
            } else {
              statusMsg = '🎲 Abra o Gacha Fóssil 3D para tentar conquistar essa variante rara!';
              render();
            }
          });
        });
      } else if (subTab === 'mutations') {
        container.querySelectorAll('[data-equip-mut]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const mid = btn.getAttribute('data-equip-mut');
            const mdef = getMutationDef(mid);
            Save.data.equippedMutation = mid;
            Save.save();
            statusMsg = `🧬 Mutação "${mdef?.name || mid}" ativada!`;
            if (onApplyCustom) onApplyCustom();
            render();
          });
        });
        container.querySelectorAll('[data-buy-mut]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const mid = btn.getAttribute('data-buy-mut');
            const mdef = getMutationDef(mid);
            if (!mdef) return;
            if ((Save.data.eggs || 0) < mdef.cost) {
              statusMsg = `Ovos insuficientes (precisa ${mdef.cost} 🥚)`;
              render();
              return;
            }
            Save.addEggs(-mdef.cost);
            unlockMutation(mid);
            Save.data.equippedMutation = mid;
            Save.save();
            statusMsg = `🧬 Mutação "${mdef.name}" sintetizada e equipada!`;
            if (onApplyCustom) onApplyCustom();
            render();
          });
        });
        container.querySelectorAll('[data-mut-gacha]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (onOpenGacha) {
              preview?.destroy();
              onOpenGacha(() => render());
            } else {
              statusMsg = '🎲 Essa Mutação Cósmica só nasce nos Ovos Fósseis do Gacha 3D!';
              render();
            }
          });
        });
      } else if (subTab === 'colors') {
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
      } else if (subTab === 'shop') {
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
