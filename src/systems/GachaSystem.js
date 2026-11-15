// Sistema de Gacha / Caixa Fóssil 3D com raridades, pity e miniaturas reais.
import { Save } from './Save.js';
import { DINO_CATALOG } from '../dinos/DinoCatalog.js';
import { requestAuthoritativeGachaRoll, LOOTBOX_REAL_MONEY_ENABLED } from '../security/EdgeClient.js';
import {
  ACCESSORIES_SHOP,
  MUTATIONS,
  SKIN_VARIANTS,
  TRAILS_SHOP,
  unlockMutation,
  unlockSkinVariant
} from '../dinos/DinoCustomization.js';

export const GACHA_RARITIES = [
  { id: 'comum', name: 'Comum', color: 0xb4b2a9, hex: '#b4b2a9', bg: '#27272a', fg: '#e4e4e7', np: 25, weight: 46, dupEggs: 35 },
  { id: 'rara', name: 'Rara', color: 0x378add, hex: '#378add', bg: '#0c2d48', fg: '#7dd3fc', np: 40, weight: 27, dupEggs: 75 },
  { id: 'épica', name: 'Épica', color: 0x7f77dd, hex: '#7f77dd', bg: '#231942', fg: '#c4b5fd', np: 52, weight: 14, dupEggs: 140 },
  { id: 'lendária', name: 'Lendária (Shiny)', color: 0xf5c518, hex: '#f5c518', bg: '#422006', fg: '#fde047', np: 65, weight: 7, dupEggs: 260 },
  { id: 'mítica', name: 'Mítica (Mecânico)', color: 0xe24b4a, hex: '#e24b4a', bg: '#450a0a', fg: '#fca5a5', np: 82, weight: 4, dupEggs: 440 },
  { id: 'secreta', name: 'Secreta Cósmica', color: 0xc084fc, hex: '#c084fc', bg: '#2e1065', fg: '#f5d0fe', np: 96, weight: 2, dupEggs: 720 }
];

export const GACHA_EGG_ROLL_COST = 240;
export const GACHA_CRYSTAL_CATALYST_COST = 3;

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export class GachaSystem {
  static getCrateCount() {
    return Math.max(0, Math.floor(Save.data.fossilCrates || 0));
  }

  static addCrates(count = 1) {
    const n = Math.max(0, Math.floor(count));
    if (!n) return 0;
    Save.data.fossilCrates = Math.max(0, (Save.data.fossilCrates || 0) + n);
    Save.save();
    return Save.data.fossilCrates;
  }

  static computeRunCrates(score, diff = null, eligible = true) {
    if (!eligible || score < 350) return 0;
    const mult = diff?.gachaMult ?? 1.0;
    const weightedScore = score * mult;
    if (weightedScore < 500) return 0;
    if (weightedScore < 1800) return 1;
    if (weightedScore < 5200) return 2;
    if (weightedScore < 12000) return 3;
    return 4;
  }

  static getPityState() {
    const epic = Math.max(0, Math.min(8, Math.floor(Save.data.gachaPityEpic ?? Save.data.gachaPity ?? 0)));
    const shiny = Math.max(0, Math.min(14, Math.floor(Save.data.gachaPityShiny ?? Save.data.gachaPity ?? 0)));
    return {
      epic,
      epicMax: 9,
      epicRemaining: 9 - epic,
      shiny,
      shinyMax: 15,
      shinyRemaining: 15 - shiny
    };
  }

  static _applyDualPityAfterTier(tierId) {
    const isEpicOrBetter = tierId === 'épica' || tierId === 'lendária' || tierId === 'mítica' || tierId === 'secreta';
    const isShinyOrBetter = tierId === 'lendária' || tierId === 'mítica' || tierId === 'secreta';
    const curEpic = Math.max(0, Math.min(8, Math.floor(Save.data.gachaPityEpic ?? Save.data.gachaPity ?? 0)));
    const curShiny = Math.max(0, Math.min(14, Math.floor(Save.data.gachaPityShiny ?? Save.data.gachaPity ?? 0)));
    const nextEpic = isEpicOrBetter ? 0 : Math.min(8, curEpic + 1);
    const nextShiny = isShinyOrBetter ? 0 : Math.min(14, curShiny + 1);
    Save.data.gachaPityEpic = nextEpic;
    Save.data.gachaPityShiny = nextShiny;
    Save.data.gachaPity = nextEpic;
  }

  static rollRarity(forceMinIdx = 0, { useCrystalCatalyst = false } = {}) {
    const epicPity = Math.max(0, Math.min(8, Math.floor(Save.data.gachaPityEpic ?? Save.data.gachaPity ?? 0)));
    const shinyPity = Math.max(0, Math.min(14, Math.floor(Save.data.gachaPityShiny ?? Save.data.gachaPity ?? 0)));
    if ((epicPity >= 8 || useCrystalCatalyst) && forceMinIdx < 2) forceMinIdx = 2;
    if (shinyPity >= 14 && forceMinIdx < 3) forceMinIdx = 3;

    const eligible = GACHA_RARITIES.slice(forceMinIdx).map((tier, idx) => {
      const absIdx = forceMinIdx + idx;
      const weight = useCrystalCatalyst && absIdx >= 3 ? tier.weight * 2 : tier.weight;
      return { tier, weight };
    });
    const total = eligible.reduce((sum, entry) => sum + entry.weight, 0);
    let r = Math.random() * total;
    for (const entry of eligible) {
      r -= entry.weight;
      if (r <= 0) return entry.tier;
    }
    return eligible[0].tier;
  }

  static _grantRewardForTier(tier) {
    const stats = Save.data.gachaStats || { pulls: 0, shinies: 0, mechas: 0, secrets: 0 };
    stats.pulls = (stats.pulls || 0) + 1;
    Save.data.gachaStats = stats;

    const lockedDinos = DINO_CATALOG.filter((d) => !(Save.data.unlockedDinos || []).includes(d.id) && d.id !== 'ghostgold');
    const selectedDino = Save.data.selectedDino || 'trex';
    const featuredDino = pickRandom(DINO_CATALOG.filter((d) => d.id !== 'ghostgold'));

    const grantSkin = (dinoId, variantId, prefix) => {
      const v = SKIN_VARIANTS.find((x) => x.id === variantId) || SKIN_VARIANTS[0];
      const dinoSpec = DINO_CATALOG.find((d) => d.id === dinoId) || featuredDino;
      const isNew = unlockSkinVariant(dinoId, variantId);
      let dupEggs = 0;
      if (!isNew) {
        dupEggs = tier.dupEggs;
        Save.addEggs(dupEggs);
      }
      if (variantId === 'shiny') stats.shinies = (stats.shinies || 0) + 1;
      if (variantId === 'mecha') stats.mechas = (stats.mechas || 0) + 1;
      if (variantId === 'secret') stats.secrets = (stats.secrets || 0) + 1;
      Save.save();
      return {
        kind: 'skin',
        tier,
        isNew,
        dupEggs,
        title: `${prefix || v.name} (${dinoSpec.name})`,
        desc: isNew ? v.desc : `Skin repetida convertida em +${dupEggs} ovos!`,
        preview: {
          modelKind: 'dino',
          dinoId: dinoSpec.id,
          skinVariant: variantId,
          accessoryId: 'none'
        }
      };
    };

    const grantMutation = (mut) => {
      const isNew = unlockMutation(mut.id);
      let dupEggs = 0;
      if (!isNew) {
        dupEggs = tier.dupEggs;
        Save.addEggs(dupEggs);
      } else {
        Save.data.equippedMutation = mut.id;
        Save.save();
      }
      return {
        kind: 'mutation',
        tier,
        isNew,
        dupEggs,
        title: `Mutação: ${mut.badge} ${mut.name}`,
        desc: isNew ? `${mut.desc} (Equipada automaticamente!)` : `Mutação repetida → +${dupEggs} ovos!`,
        preview: {
          modelKind: 'mutation',
          mutationId: mut.id,
          colorHex: tier.hex
        }
      };
    };

    const grantAccessory = (acc) => {
      const unlocked = Save.data.unlockedAccessories || [];
      const isNew = !unlocked.includes(acc.id);
      let dupEggs = 0;
      if (isNew) {
        unlocked.push(acc.id);
        Save.data.unlockedAccessories = unlocked;
        Save.save();
      } else {
        dupEggs = tier.dupEggs;
        Save.addEggs(dupEggs);
      }
      return {
        kind: 'accessory',
        tier,
        isNew,
        dupEggs,
        title: `Acessório: ${acc.name}`,
        desc: isNew ? 'Desbloqueado no Camarim!' : `Item repetido → +${dupEggs} ovos!`,
        preview: {
          modelKind: 'accessory',
          accessoryId: acc.id,
          colorHex: tier.hex
        }
      };
    };

    const grantDino = (spec) => {
      const isNew = !(Save.data.unlockedDinos || []).includes(spec.id);
      let dupEggs = 0;
      if (isNew) {
        Save.data.unlockedDinos.push(spec.id);
        Save.save();
      } else {
        dupEggs = tier.dupEggs;
        Save.addEggs(dupEggs);
      }
      return {
        kind: 'dino',
        tier,
        isNew,
        dupEggs,
        title: `Dino: ${spec.name}`,
        desc: isNew ? `${spec.ability.name} — Pronto para correr!` : `Espécie repetida → +${dupEggs} ovos!`,
        preview: {
          modelKind: 'dino',
          dinoId: spec.id,
          skinVariant: 'normal',
          accessoryId: 'none'
        }
      };
    };

    if (tier.id === 'secreta') {
      const r = Math.random();
      if (r < 0.34 && !(Save.data.unlockedDinos || []).includes('ghostgold')) {
        const ghost = DINO_CATALOG.find((d) => d.id === 'ghostgold') || featuredDino;
        stats.secrets = (stats.secrets || 0) + 1;
        return grantDino(ghost);
      }
      if (r < 0.68) {
        const mut = MUTATIONS.find((m) => m.id === 'cosmic_dna') || pickRandom(MUTATIONS);
        stats.secrets = (stats.secrets || 0) + 1;
        return grantMutation(mut);
      }
      return grantSkin(Math.random() < 0.55 ? selectedDino : featuredDino.id, 'secret', 'Secreto Cósmico 🌌');
    }

    if (tier.id === 'mítica') {
      const r = Math.random();
      if (r < 0.62) {
        return grantSkin(Math.random() < 0.5 ? selectedDino : featuredDino.id, 'mecha', 'Mecânico Cyber 🤖');
      }
      if (r < 0.85) {
        const mut = MUTATIONS.find((m) => m.id === 'mecha_core') || pickRandom(MUTATIONS);
        return grantMutation(mut);
      }
      const mythicDino = lockedDinos.find((d) => d.price >= 2400) || featuredDino;
      return grantDino(mythicDino);
    }

    if (tier.id === 'lendária') {
      const r = Math.random();
      if (r < 0.55) {
        return grantSkin(Math.random() < 0.5 ? selectedDino : featuredDino.id, 'shiny', 'Shiny ✨');
      }
      if (r < 0.8) {
        const mut = MUTATIONS.find((m) => m.id === 'turbo_tail') || pickRandom(MUTATIONS);
        return grantMutation(mut);
      }
      const epicDino = pickRandom(lockedDinos.length ? lockedDinos : DINO_CATALOG);
      return grantDino(epicDino);
    }

    if (tier.id === 'épica') {
      const r = Math.random();
      if (r < 0.35) {
        return grantSkin(Math.random() < 0.5 ? selectedDino : featuredDino.id, Math.random() < 0.5 ? 'unique_amber' : 'unique_jade');
      }
      if (r < 0.72) {
        const epicMuts = MUTATIONS.filter((m) => m.rarity === 'Épica' || m.rarity === 'Rara');
        return grantMutation(pickRandom(epicMuts));
      }
      if (lockedDinos.length > 0) {
        return grantDino(pickRandom(lockedDinos));
      }
      return grantAccessory(pickRandom(ACCESSORIES_SHOP.filter((a) => a.price >= 900)));
    }

    if (tier.id === 'rara') {
      const r = Math.random();
      if (r < 0.42) {
        return grantSkin(selectedDino, Math.random() < 0.5 ? 'unique_crimson' : 'unique_cobalt');
      }
      if (r < 0.75) {
        const rareAcc = ACCESSORIES_SHOP.filter((a) => a.id !== 'none' && a.price <= 1200);
        return grantAccessory(pickRandom(rareAcc));
      }
      return grantMutation(pickRandom(MUTATIONS.filter((m) => m.rarity === 'Rara' || m.rarity === 'Comum')));
    }

    // Comum: acessórios básicos, mutação comum ou pacote de ovos + trail
    const r = Math.random();
    if (r < 0.45) {
      const basicAcc = ACCESSORIES_SHOP.filter((a) => a.id !== 'none' && a.price <= 600);
      return grantAccessory(pickRandom(basicAcc));
    }
    if (r < 0.75) {
      const commonMut = MUTATIONS.find((m) => m.id === 'glow') || MUTATIONS[0];
      return grantMutation(commonMut);
    }
    const fireTrail = TRAILS_SHOP[1];
    if (fireTrail && !(Save.data.unlockedTrails || []).includes(fireTrail.id)) {
      Save.data.unlockedTrails.push(fireTrail.id);
      Save.save();
      return {
        kind: 'trail',
        tier,
        isNew: true,
        dupEggs: 0,
        title: `Rastro: ${fireTrail.name}`,
        desc: 'Desbloqueado para personalizar suas pegadas!',
        preview: { modelKind: 'mutation', mutationId: 'fire_trail', colorHex: fireTrail.color }
      };
    }
    const bonus = 45;
    Save.addEggs(bonus);
    return {
      kind: 'eggs',
      tier,
      isNew: true,
      dupEggs: 0,
      title: `+${bonus} Ovos Fósseis`,
      desc: 'Reforço direto para sua coleção!',
      preview: { modelKind: 'dino', dinoId: featuredDino.id, skinVariant: 'normal', accessoryId: 'none' }
    };
  }

  static openCrate({ useEggs = false, useCrystalCatalyst = false } = {}) {
    if (useEggs) {
      if ((Save.data.eggs || 0) < GACHA_EGG_ROLL_COST) {
        return { ok: false, error: `Precisa de ${GACHA_EGG_ROLL_COST} ovos.` };
      }
      if (useCrystalCatalyst && (Save.data.crystals || 0) < GACHA_CRYSTAL_CATALYST_COST) {
        return { ok: false, error: `Catalisador requer ${GACHA_CRYSTAL_CATALYST_COST} Cristais 💎.` };
      }
      Save.addEggs(-GACHA_EGG_ROLL_COST);
    } else {
      if ((Save.data.fossilCrates || 0) <= 0) {
        return { ok: false, error: 'Sem Caixas Fósseis disponíveis. Corra ou use ovos!' };
      }
      if (useCrystalCatalyst && (Save.data.crystals || 0) < GACHA_CRYSTAL_CATALYST_COST) {
        return { ok: false, error: `Catalisador requer ${GACHA_CRYSTAL_CATALYST_COST} Cristais 💎.` };
      }
      Save.data.fossilCrates = Math.max(0, (Save.data.fossilCrates || 0) - 1);
    }
    if (useCrystalCatalyst) {
      Save.data.crystals = Math.max(0, (Save.data.crystals || 0) - GACHA_CRYSTAL_CATALYST_COST);
    }

    const tier = this.rollRarity(0, { useCrystalCatalyst });
    this._applyDualPityAfterTier(tier.id);
    Save.save();
    return {
      ok: true,
      reward: this._grantRewardForTier(tier),
      usedCatalyst: useCrystalCatalyst,
      pityState: this.getPityState()
    };
  }

  static async openCrateAsync({ useEggs = false, useCrystalCatalyst = false, supabaseClient = null } = {}) {
    if (LOOTBOX_REAL_MONEY_ENABLED) {
      return { ok: false, error: 'Compras pagas em lootbox requerem verificação 18+ ativa.' };
    }
    if (useEggs && (Save.data.eggs || 0) < GACHA_EGG_ROLL_COST) {
      return { ok: false, error: `Precisa de ${GACHA_EGG_ROLL_COST} ovos.` };
    }
    if (!useEggs && (Save.data.fossilCrates || 0) <= 0) {
      return { ok: false, error: 'Sem Caixas Fósseis disponíveis. Corra ou use ovos!' };
    }
    if (useCrystalCatalyst && (Save.data.crystals || 0) < GACHA_CRYSTAL_CATALYST_COST) {
      return { ok: false, error: `Catalisador requer ${GACHA_CRYSTAL_CATALYST_COST} Cristais 💎.` };
    }

    if (supabaseClient && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
      const pityNow = this.getPityState();
      const authRes = await requestAuthoritativeGachaRoll(supabaseClient, {
        useEggs,
        useCrystalCatalyst,
        crateCount: Save.data.fossilCrates || 0,
        eggs: Save.data.eggs || 0,
        crystals: Save.data.crystals || 0,
        pity: pityNow.epic,
        pityEpic: pityNow.epic,
        pityShiny: pityNow.shiny,
        ownedRewards: [
          ...(Save.data.unlockedDinos || []),
          ...(Save.data.unlockedAccessories || []),
          ...(Save.data.unlockedMutations || [])
        ]
      });
      if (authRes.ok && authRes.tierId) {
        const tier = GACHA_RARITIES.find((r) => r.id === authRes.tierId) || GACHA_RARITIES[0];
        if (useEggs) Save.addEggs(-GACHA_EGG_ROLL_COST);
        else Save.data.fossilCrates = Math.max(0, (Save.data.fossilCrates || 0) - 1);
        if (useCrystalCatalyst) {
          Save.data.crystals = Number.isFinite(authRes.remainingCrystals)
            ? authRes.remainingCrystals
            : Math.max(0, (Save.data.crystals || 0) - GACHA_CRYSTAL_CATALYST_COST);
        }
        if (Number.isFinite(authRes.pityEpicAfter) && Number.isFinite(authRes.pityShinyAfter)) {
          Save.data.gachaPityEpic = authRes.pityEpicAfter;
          Save.data.gachaPityShiny = authRes.pityShinyAfter;
          Save.data.gachaPity = authRes.pityEpicAfter;
        } else {
          this._applyDualPityAfterTier(tier.id);
        }
        Save.save();
        return {
          ok: true,
          reward: this._grantRewardForTier(tier),
          serverVerified: true,
          usedCatalyst: useCrystalCatalyst,
          pityState: this.getPityState()
        };
      }
      if (!authRes.offline && authRes.error && /limite|rate|429|insuficiente|bloqueado|cristais/i.test(authRes.error)) {
        return { ok: false, error: authRes.error };
      }
    }

    return this.openCrate({ useEggs, useCrystalCatalyst });
  }

  static rollPreviewTier(tierIndex = 0) {
    const tier = GACHA_RARITIES[Math.max(0, Math.min(GACHA_RARITIES.length - 1, tierIndex))];
    return this._grantRewardForTier(tier);
  }
}
