// Expansão de coleção (Mega Expansão): acessórios 3D, skins elementais/cósmicas,
// rastros, padrões, mutações de DNA equilibradas, novos dinossauros e biomas.
// Contrato §2: cada entrada possui { id único, kind: 'help' | 'neutral', category, name, ... }.

export const NEW_ACCESSORY_ARCHETYPES = [
  { id: 'lunar_helmet', name: 'Capacete Lunar', price: 950, rarity: 'Rara', theme: 'lunar' },
  { id: 'aztec_headdress', name: 'Cocar Asteca', price: 1600, rarity: 'Épica', theme: 'aztec' },
  { id: 'spore_crown', name: 'Coroa de Esporos', price: 1100, rarity: 'Rara', theme: 'biolum' },
  { id: 'obsidian_pauldrons', name: 'Ombreiras de Obsidiana', price: 2400, rarity: 'Épica', theme: 'obsidian' },
  { id: 'magma_core_pack', name: 'Reator de Magma', price: 3200, rarity: 'Épica', theme: 'magma' },
  { id: 'orbital_thruster', name: 'Propulsor Orbital', price: 5400, rarity: 'Lendária', theme: 'orbital' },
  { id: 'crystal_visor', name: 'Visor de Quartzo', price: 1400, rarity: 'Rara', theme: 'crystal' },
  { id: 'chrono_wings', name: 'Asas Temporais', price: 9200, rarity: 'Lendária', theme: 'chrono' },
  { id: 'fossil_shield', name: 'Escudo Fóssil', price: 1850, rarity: 'Épica', theme: 'fossil' },
  { id: 'solar_mantle', name: 'Manto Solar', price: 4800, rarity: 'Lendária', theme: 'solar' },
  { id: 'abyss_fins', name: 'Barbatanas Abissais', price: 1250, rarity: 'Rara', theme: 'abyss' },
  { id: 'thunder_crest', name: 'Crista Trovão', price: 2600, rarity: 'Épica', theme: 'storm' },
  { id: 'jade_amulet', name: 'Amuleto de Jade', price: 1300, rarity: 'Rara', theme: 'aztec' },
  { id: 'nebula_ring', name: 'Anel Nebulosa', price: 8800, rarity: 'Lendária', theme: 'cosmic' },
  { id: 'bone_pauldrons', name: 'Ombreiras Ósseas', price: 900, rarity: 'Rara', theme: 'fossil' },
  { id: 'cyber_turret', name: 'Torreta Cyber', price: 6200, rarity: 'Lendária', theme: 'orbital' },
  { id: 'feather_plume', name: 'Pluma Imperial', price: 750, rarity: 'Comum', theme: 'aztec' },
  { id: 'void_horns', name: 'Chifres do Vazio', price: 11800, rarity: 'Mítica', theme: 'cosmic' }
];

export const NEW_SKIN_ARCHETYPES = [
  { id: 'lunar_regolith', name: 'Elemental: Regolito Lunar', badge: '🌙', rarity: 'Rara', price: 1100, primary: '#94a3b8', secondary: '#e2e8f0', eye: '#38bdf8', spots: '#475569', spikes: '#cbd5e1', pattern: 'spots', desc: 'Revestimento mineral prateado de crateras lunares.' },
  { id: 'aztec_gold', name: 'Elemental: Ouro Asteca', badge: '🏛️', rarity: 'Épica', price: 2200, primary: '#ca8a04', secondary: '#fef08a', eye: '#14b8a6', spots: '#713f12', spikes: '#2dd4bf', pattern: 'tribal', desc: 'Placas cerimoniais de ouro batido com incrustações de jade.' },
  { id: 'biolum_neon', name: 'Elemental: Selva Biolum', badge: '🍄', rarity: 'Épica', price: 2400, primary: '#0f766e', secondary: '#99f6e4', eye: '#a3e635', spots: '#115e59', spikes: '#22d3ee', pattern: 'neon', emissiveBoost: 0.25, desc: 'Escamas fosforescentes inspiradas nos esporos da selva noturna.' },
  { id: 'obsidian_glass', name: 'Elemental: Vidro Obsidiana', badge: '🖤', rarity: 'Épica', price: 2600, primary: '#27272a', secondary: '#a1a1aa', eye: '#f43f5e', spots: '#18181b', spikes: '#fb7185', pattern: 'crystalline', desc: 'Carapaça vulcânica vitrificada com arestas rubi.' },
  { id: 'magma_forge', name: 'Elemental: Forja Magmática', badge: '🌋', rarity: 'Lendária', price: 4800, primary: '#991b1b', secondary: '#fed7aa', eye: '#fde047', spots: '#450a0a', spikes: '#fb923c', pattern: 'magma_veins', emissiveBoost: 0.3, desc: 'Veios incandescentes correm sob escamas de basalto.' },
  { id: 'orbital_chrome', name: 'Cósmica: Cromo Orbital', badge: '🛰️', rarity: 'Lendária', price: 5200, primary: '#475569', secondary: '#f1f5f9', eye: '#22d3ee', spots: '#1e293b', spikes: '#38bdf8', pattern: 'circuit', isMecha: false, desc: 'Liga aeroespacial polida com circuitos holográficos.' },
  { id: 'nebula_drift', name: 'Cósmica: Deriva Nebulosa', badge: '🌌', rarity: 'Lendária', price: 6500, primary: '#6d28d9', secondary: '#f5d0fe', eye: '#38bdf8', spots: '#312e81', spikes: '#f472b6', pattern: 'cosmic', emissiveBoost: 0.32, desc: 'Reflexos estelares violetas do espaço profundo.' },
  { id: 'emerald_venom', name: 'Elemental: Veneno Esmeralda', badge: '🧪', rarity: 'Rara', price: 1200, primary: '#15803d', secondary: '#bbf7d0', eye: '#bef264', spots: '#14532d', spikes: '#84cc16', pattern: 'scales', desc: 'Pigmentação tóxica de predadores das selvas úmidas.' },
  { id: 'aurora_frost', name: 'Elemental: Aurora Glacial', badge: '❄️', rarity: 'Épica', price: 2800, primary: '#0284c7', secondary: '#e0f2fe', eye: '#5eead4', spots: '#0c4a6e', spikes: '#a5f3fc', pattern: 'gradient', emissiveBoost: 0.2, desc: 'Cristais árticos tingidos pela luz da aurora.' },
  { id: 'solar_flare', name: 'Cósmica: Erupção Solar', badge: '☀️', rarity: 'Lendária', price: 5800, primary: '#ea580c', secondary: '#fef3c7', eye: '#ffffff', spots: '#7c2d12', spikes: '#facc15', pattern: 'stripes', emissiveBoost: 0.32, desc: 'Brilho coronário dourado de tempestades solares.' },
  { id: 'void_eclipse', name: 'Cósmica: Eclipse do Vazio', badge: '🌑', rarity: 'Mítica', price: 9500, primary: '#1e1b4b', secondary: '#c4b5fd', eye: '#f43f5e', spots: '#09090b', spikes: '#a855f7', pattern: 'cosmic', emissiveBoost: 0.38, desc: 'Escamas abissais do eclipse com bordas ultravioleta.' },
  { id: 'fossil_ivory', name: 'Elemental: Marfim Fóssil', badge: '🦴', rarity: 'Rara', price: 1050, primary: '#d6d3d1', secondary: '#fafaf9', eye: '#f59e0b', spots: '#78716c', spikes: '#a8a29e', pattern: 'scales', desc: 'Tonalidade calcária preservada por milhões de anos.' }
];

export const NEW_TRAIL_ARCHETYPES = [
  { id: 'lunar_dust', name: 'Poeira Lunar', price: 750, rarity: 'Rara', color: '#cbd5e1' },
  { id: 'aztec_sparks', name: 'Centelhas Astecas', price: 1400, rarity: 'Épica', color: '#facc15' },
  { id: 'biolum_spores', name: 'Esporos Biolum', price: 1600, rarity: 'Épica', color: '#2dd4bf' },
  { id: 'obsidian_shards', name: 'Estilhaços Obsidiana', price: 2100, rarity: 'Épica', color: '#fb7185' },
  { id: 'magma_embers', name: 'Brasas do Núcleo', price: 3200, rarity: 'Lendária', color: '#ff5722' },
  { id: 'orbital_plasma', name: 'Plasma Orbital', price: 4200, rarity: 'Lendária', color: '#38bdf8' },
  { id: 'frost_crystals', name: 'Cristais de Geada', price: 900, rarity: 'Rara', color: '#bae6fd' },
  { id: 'venom_mist', name: 'Névoa Ácida', price: 1100, rarity: 'Rara', color: '#84cc16' },
  { id: 'void_rift', name: 'Fenda do Vazio', price: 7500, rarity: 'Mítica', color: '#a855f7' },
  { id: 'chrono_glint', name: 'Brilho Temporal', price: 6400, rarity: 'Lendária', color: '#c084fc' },
  { id: 'coral_bubbles', name: 'Bolhas de Coral', price: 850, rarity: 'Rara', color: '#67e8f9' },
  { id: 'thunder_arcs', name: 'Arcos Elétricos', price: 3800, rarity: 'Lendária', color: '#fde047' }
];

export const NEW_PATTERN_ARCHETYPES = [
  { id: 'scales', label: 'Escamas' },
  { id: 'circuit', label: 'Circuito' },
  { id: 'cosmic', label: 'Cósmico' },
  { id: 'tribal', label: 'Tribal' },
  { id: 'magma_veins', label: 'Veios de Magma' },
  { id: 'crystalline', label: 'Cristalino' }
];

function pct(val) {
  return `${Math.round(Math.abs(val) * 100)}%`;
}

export const NEW_MUTATION_ARCHETYPES = [
  {
    id: 'lunar_bones',
    name: 'Ossos Lunares',
    badge: '🌙',
    rarity: 'Rara',
    cost: 950,
    desc: 'Estrutura óssea ultraleve: saltos mais altos e planagem estendida, mas maior suscetibilidade a rajadas e empurrões.',
    mods: { jumpMult: 0.12, stabilityBonus: -0.09 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const jumpMult = +(0.11 * l).toFixed(2);
      const stamSave = +(0.09 * l).toFixed(2);
      const stabPen = -(0.09 * l).toFixed(2);
      const atkPen = +(1 - 0.05 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { jumpMult, staminaSave: stamSave, stabilityBonus: stabPen, attackPowerMult: atkPen },
        pros: [`+${pct(jumpMult)} altura de salto lunar`, `-${pct(stamSave)} gasto de estamina aérea`],
        cons: [`-${pct(stabPen)} estabilidade contra vento e impactos`, `-${pct(0.05 * l)} potência de ataque corpo a corpo`]
      };
    }
  },
  {
    id: 'obsidian_scales',
    name: 'Escamas de Obsidiana',
    badge: '🛡️',
    rarity: 'Épica',
    cost: 1650,
    desc: 'Blindagem vítrea vulcânica: estabilidade e potência de investida superiores, ao custo de peso na corrida e no salto.',
    mods: { stabilityBonus: 0.16, speedMult: -0.04, jumpMult: -0.05 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const stab = +(0.16 * l).toFixed(2);
      const atk = +(1 + 0.09 * l).toFixed(2);
      const spdPen = -(0.04 * l).toFixed(2);
      const jmpPen = -(0.05 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { stabilityBonus: stab, attackPowerMult: atk, speedMult: spdPen, jumpMult: jmpPen },
        pros: [`+${pct(stab)} resistência a gelo/lama/vento`, `+${pct(0.09 * l)} potência no ataque [Q] e colisões`],
        cons: [`-${pct(spdPen)} velocidade máxima pelo peso vítreo`, `-${pct(jmpPen)} altura de salto`]
      };
    }
  },
  {
    id: 'biolum_glands',
    name: 'Glândulas Bioluminescentes',
    badge: '✨',
    rarity: 'Rara',
    cost: 1100,
    desc: 'Fotorreceptores químicos ampliam fúria e atração de ovos, mas exigem maior consumo de estamina.',
    mods: { furyBonus: 0.14, eggBonus: 0.1, stamRegenDelta: -0.06 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const fury = +(0.13 * l).toFixed(2);
      const egg = +(0.09 * l).toFixed(2);
      const stamPen = -(0.06 * l).toFixed(2);
      const cdPen = +(1 + 0.04 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { furyBonus: fury, eggBonus: egg, stamRegenDelta: stamPen, cooldownMult: cdPen, emissive: '#2dd4bf' },
        pros: [`+${pct(fury)} ganho de Fúria`, `+${pct(egg)} bônus de ovos coletados`],
        cons: [`-${pct(stamPen)} regeneração de estamina`, `+${pct(0.04 * l)} tempo de recarga da habilidade`]
      };
    }
  },
  {
    id: 'magma_heart',
    name: 'Coração Magmático',
    badge: '🌋',
    rarity: 'Épica',
    cost: 1900,
    desc: 'Metabolismo geotérmico impulsiona ataque e fúria, mas sofre forte resfriamento na água e drena estamina no ar.',
    mods: { attackPowerMult: 1.14, furyBonus: 0.12, waterSpeedMult: -0.1 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const atk = +(1 + 0.12 * l).toFixed(2);
      const fury = +(0.11 * l).toFixed(2);
      const waterPen = -(0.1 * l).toFixed(2);
      const airCost = +(1 + 0.08 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { attackPowerMult: atk, furyBonus: fury, waterSpeedMult: waterPen, airStaminaCostMult: airCost, emissive: '#ff5722' },
        pros: [`+${pct(0.12 * l)} potência de ataque [Q]`, `+${pct(fury)} carga de Fúria`],
        cons: [`-${pct(waterPen)} velocidade na água`, `+${pct(0.08 * l)} gasto de estamina aérea`]
      };
    }
  },
  {
    id: 'orbital_gyro',
    name: 'Giroscópio Orbital',
    badge: '🛰️',
    rarity: 'Épica',
    cost: 2100,
    desc: 'Micro-estabilizadores garantem trocas de faixa precisas e firmeza total, porém elevam recarga e reduzem salto.',
    mods: { laneSpeedMult: 0.15, stabilityBonus: 0.14, jumpMult: -0.05 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const lane = +(0.14 * l).toFixed(2);
      const stab = +(0.14 * l).toFixed(2);
      const jmpPen = -(0.05 * l).toFixed(2);
      const cdPen = +(1 + 0.06 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { laneSpeedMult: lane, stabilityBonus: stab, jumpMult: jmpPen, cooldownMult: cdPen, emissive: '#38bdf8' },
        pros: [`+${pct(lane)} agilidade de troca de faixa`, `+${pct(stab)} estabilidade em terreno hostil`],
        cons: [`-${pct(jmpPen)} altura de salto`, `+${pct(0.06 * l)} tempo de recarga da habilidade`]
      };
    }
  },
  {
    id: 'chrono_synapse',
    name: 'Sinapse Temporal',
    badge: '⏳',
    rarity: 'Lendária',
    cost: 2800,
    desc: 'Acelera recarga de habilidades e potência ativa, cobrando menor regeneração de estamina e leve redução de score base.',
    mods: { cooldownMult: 0.9, abilityPowerMult: 1.08, stamRegenDelta: -0.07 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const cdMult = +(Math.max(0.68, 1 - 0.08 * l)).toFixed(2);
      const power = +(1 + 0.07 * l).toFixed(2);
      const stamPen = -(0.07 * l).toFixed(2);
      const scorePen = -(0.04 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { cooldownMult: cdMult, abilityPowerMult: power, stamRegenDelta: stamPen, scoreMult: scorePen, emissive: '#c084fc' },
        pros: [`-${pct(1 - cdMult)} recarga da habilidade ativa`, `+${pct(0.07 * l)} duração/potência da habilidade`],
        cons: [`-${pct(stamPen)} regeneração de estamina`, `-${pct(scorePen)} pontuação passiva base`]
      };
    }
  },
  {
    id: 'abyssal_gills',
    name: 'Brânquias Abissais',
    badge: '🫧',
    rarity: 'Rara',
    cost: 1050,
    desc: 'Adaptação pelágica profunda: acelera fortemente na água, mas reduz velocidade e salto em pistas secas.',
    mods: { waterSpeedMult: 0.14, speedMult: -0.04, jumpMult: -0.04 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const water = +(0.14 * l).toFixed(2);
      const stab = +(0.1 * l).toFixed(2);
      const spdPen = -(0.04 * l).toFixed(2);
      const jmpPen = -(0.04 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { waterSpeedMult: water, stabilityBonus: stab, speedMult: spdPen, jumpMult: jmpPen, emissive: '#06b6d4' },
        pros: [`+${pct(water)} velocidade de nado na água`, `+${pct(stab)} estabilidade em correntezas`],
        cons: [`-${pct(spdPen)} velocidade em pista seca`, `-${pct(jmpPen)} altura de salto terrestre`]
      };
    }
  },
  {
    id: 'apex_adrenaline',
    name: 'Adrenalina Alfa',
    badge: '⚡',
    rarity: 'Lendária',
    cost: 3000,
    desc: 'Sobrecarga metabólica de alto risco: grande ganho de pontuação e velocidade, mas estamina aérea e estabilidade caem.',
    mods: { scoreMult: 0.14, speedMult: 0.06, stabilityBonus: -0.08 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const score = +(0.12 * l).toFixed(2);
      const spd = +(0.05 * l).toFixed(2);
      const stabPen = -(0.08 * l).toFixed(2);
      const airCost = +(1 + 0.1 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { scoreMult: score, speedMult: spd, stabilityBonus: stabPen, airStaminaCostMult: airCost, emissive: '#facc15' },
        pros: [`+${pct(score)} multiplicador de pontuação`, `+${pct(spd)} velocidade de corrida`],
        cons: [`-${pct(stabPen)} estabilidade lateral`, `+${pct(0.1 * l)} gasto de estamina ao saltar/planar`]
      };
    }
  }
];

const ACC_FINISHES = [
  { suffix: 'base', label: 'Padrão', priceMult: 1.0 },
  { suffix: 'gilded', label: 'Dourado', priceMult: 1.35 },
  { suffix: 'prism', label: 'Prismático', priceMult: 1.75 }
];

const SKIN_FINISHES = [
  { suffix: 'matte', label: 'Fosco', priceMult: 1.0 },
  { suffix: 'metallic', label: 'Metálico', priceMult: 1.25 },
  { suffix: 'holo', label: 'Holográfico', priceMult: 1.55 },
  { suffix: 'relic', label: 'Relíquia', priceMult: 1.85 }
];

const TRAIL_TIERS = [
  { suffix: 'spark', label: 'Centelha', priceMult: 1.0 },
  { suffix: 'surge', label: 'Surtos', priceMult: 1.4 },
  { suffix: 'nova', label: 'Nova', priceMult: 1.9 }
];

const PATTERN_PALETTES = [
  { suffix: 'ember', label: 'Brasa' },
  { suffix: 'abyss', label: 'Abismo' },
  { suffix: 'verdant', label: 'Verdejante' },
  { suffix: 'astral', label: 'Astral' }
];

function buildCollectionVariants() {
  const out = [];

  // 18 acessórios x 3 acabamentos = 54 entradas
  for (const acc of NEW_ACCESSORY_ARCHETYPES) {
    for (const fin of ACC_FINISHES) {
      out.push({
        id: `col_acc_${acc.id}_${fin.suffix}`,
        kind: 'help',
        category: 'accessory',
        name: fin.suffix === 'base' ? acc.name : `${acc.name} (${fin.label})`,
        baseId: acc.id,
        rarity: acc.rarity,
        price: Math.round(acc.price * fin.priceMult),
        theme: acc.theme
      });
    }
  }

  // 12 skins x 4 acabamentos = 48 entradas
  for (const skin of NEW_SKIN_ARCHETYPES) {
    for (const fin of SKIN_FINISHES) {
      out.push({
        id: `col_skin_${skin.id}_${fin.suffix}`,
        kind: 'help',
        category: 'skin',
        name: fin.suffix === 'matte' ? skin.name : `${skin.name} • ${fin.label}`,
        baseId: skin.id,
        rarity: skin.rarity,
        price: Math.round(skin.price * fin.priceMult),
        primary: skin.primary,
        pattern: skin.pattern
      });
    }
  }

  // 12 rastros x 3 intensidades = 36 entradas
  for (const tr of NEW_TRAIL_ARCHETYPES) {
    for (const tier of TRAIL_TIERS) {
      out.push({
        id: `col_trail_${tr.id}_${tier.suffix}`,
        kind: 'help',
        category: 'trail',
        name: tier.suffix === 'spark' ? tr.name : `${tr.name} (${tier.label})`,
        baseId: tr.id,
        rarity: tr.rarity,
        price: Math.round(tr.price * tier.priceMult),
        color: tr.color
      });
    }
  }

  // 6 padrões x 4 paletas = 24 entradas
  for (const pat of NEW_PATTERN_ARCHETYPES) {
    for (const pal of PATTERN_PALETTES) {
      out.push({
        id: `col_pat_${pat.id}_${pal.suffix}`,
        kind: 'help',
        category: 'pattern',
        name: `Padrão ${pat.label} — ${pal.label}`,
        baseId: pat.id,
        rarity: 'Rara',
        price: 600
      });
    }
  }

  // 8 mutações x 4 níveis (cada um com trade-off explícito) = 32 entradas
  for (const mut of NEW_MUTATION_ARCHETYPES) {
    for (let lv = 1; lv <= 4; lv++) {
      const tier = mut.computeTier(lv);
      out.push({
        id: `col_mut_${mut.id}_t${lv}`,
        kind: 'help',
        category: 'mutation',
        name: `${mut.name} ${tier.tierLabel}`,
        baseId: mut.id,
        tier: lv,
        rarity: mut.rarity,
        cost: mut.cost,
        pros: tier.pros,
        cons: tier.cons,
        mods: tier.mods
      });
    }
  }

  return out;
}

export const COLLECTION_VARIANTS = buildCollectionVariants();

export const NEW_DINO_IDS = [
  { id: 'dino_acrocanthosaurus', dinoId: 'acrocanthosaurus', kind: 'neutral', category: 'dino', name: 'Acrocanthosaurus', habitat: 'land' },
  { id: 'dino_concavenator', dinoId: 'concavenator', kind: 'neutral', category: 'dino', name: 'Concavenator', habitat: 'land' },
  { id: 'dino_amargasaurus', dinoId: 'amargasaurus', kind: 'neutral', category: 'dino', name: 'Amargasaurus', habitat: 'land' },
  { id: 'dino_edmontonia', dinoId: 'edmontonia', kind: 'neutral', category: 'dino', name: 'Edmontonia', habitat: 'land' },
  { id: 'dino_corythosaurus', dinoId: 'corythosaurus', kind: 'neutral', category: 'dino', name: 'Corythosaurus', habitat: 'land' },
  { id: 'dino_plesiosaurus', dinoId: 'plesiosaurus', kind: 'neutral', category: 'dino', name: 'Plesiosaurus', habitat: 'aquatic' },
  { id: 'dino_kronosaurus', dinoId: 'kronosaurus', kind: 'neutral', category: 'dino', name: 'Kronosaurus', habitat: 'aquatic' },
  { id: 'dino_archelon', dinoId: 'archelon', kind: 'neutral', category: 'dino', name: 'Archelon', habitat: 'aquatic' },
  { id: 'dino_hatzegopteryx', dinoId: 'hatzegopteryx', kind: 'neutral', category: 'dino', name: 'Hatzegopteryx', habitat: 'flying' },
  { id: 'dino_archaeopteryx', dinoId: 'archaeopteryx', kind: 'neutral', category: 'dino', name: 'Archaeopteryx', habitat: 'flying' },
  { id: 'dino_microraptor', dinoId: 'microraptor', kind: 'neutral', category: 'dino', name: 'Microraptor', habitat: 'flying' },
  { id: 'dino_indominus_voxel', dinoId: 'indominus_voxel', kind: 'neutral', category: 'dino', name: 'Indominus Voxel', habitat: 'land' },
  { id: 'dino_chrono_wyvern', dinoId: 'chrono_wyvern', kind: 'neutral', category: 'dino', name: 'Chrono Wyvern', habitat: 'flying' }
];

export const NEW_BIOME_IDS = [
  { id: 'biome_lunar_crater', biomeId: 'lunar_crater', kind: 'neutral', category: 'biome', name: 'Cratera Lunar', bossId: 'colosso_cosmico' },
  { id: 'biome_aztec_temple', biomeId: 'aztec_temple', kind: 'neutral', category: 'biome', name: 'Templo Asteca', bossId: 'titan_fossil' },
  { id: 'biome_bioluminescent_jungle', biomeId: 'bioluminescent_jungle', kind: 'neutral', category: 'biome', name: 'Selva Bioluminescente', bossId: 'kraken_abissal' },
  { id: 'biome_obsidian_desert', biomeId: 'obsidian_desert', kind: 'neutral', category: 'biome', name: 'Deserto de Obsidiana', bossId: 'rei_megalodon' },
  { id: 'biome_magma_core', biomeId: 'magma_core', kind: 'neutral', category: 'biome', name: 'Núcleo Magmático', bossId: 'fenix_vulcanica' },
  { id: 'biome_orbital_station', biomeId: 'orbital_station', kind: 'neutral', category: 'biome', name: 'Estação Orbital', bossId: 'imperador_cibernetico' }
];
