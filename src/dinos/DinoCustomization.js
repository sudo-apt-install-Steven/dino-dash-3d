// Personalização de cores, padrões, acessórios, rastros, presets, loja e mutações aleatórias.
import { Save } from '../systems/Save.js';
import {
  NEW_ACCESSORY_ARCHETYPES,
  NEW_SKIN_ARCHETYPES,
  NEW_TRAIL_ARCHETYPES,
  NEW_PATTERN_ARCHETYPES,
  NEW_MUTATION_ARCHETYPES
} from '../content/collection_expanded.js';

export const PATTERNS = [
  { id: 'solid', label: 'Liso' },
  { id: 'stripes', label: 'Listras' },
  { id: 'spots', label: 'Manchas' },
  { id: 'gradient', label: 'Degradê' },
  { id: 'camo', label: 'Camuflagem' },
  { id: 'neon', label: 'Neon' },
  ...NEW_PATTERN_ARCHETYPES
];

export const ACCESSORIES_SHOP = [
  { id: 'none', name: 'Sem Acessório', price: 0, rarity: 'Comum', category: 'accessory' },
  // Tier Comum (150 🥚)
  { id: 'cap', name: 'Boné Radical', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'scarf', name: 'Cachecol Veloz', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'bandana', name: 'Bandana Tribal', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'beanie', name: 'Gorro Polar', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'bowtie', name: 'Gravata Elegante', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'bell_collar', name: 'Coleira com Sino', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'flower_crown', name: 'Coroa de Flores', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'leaf_cape', name: 'Manto de Folhas', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'antenna', name: 'Antena Sismológica', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'monocle', name: 'Monóculo Dourado', price: 150, rarity: 'Comum', category: 'accessory' },
  // Tier Rara (600 🥚)
  { id: 'glasses', name: 'Óculos Escuros', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'backpack', name: 'Mochila Explorador', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'helmet', name: 'Capacete Jurássico', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'cowboy_hat', name: 'Chapéu do Deserto', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'explorer_hat', name: 'Chapéu Safári', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'snorkel', name: 'Máscara de Mergulho', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'chef_hat', name: 'Chapéu de Chef', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'headphones', name: 'Fone Jurássico', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'quiver', name: 'Aljava de Caçador', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'turtle_shell', name: 'Casco Protetor', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'gold_chain', name: 'Corrente de Ouro', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'spike_collar', name: 'Coleira de Espinhos', price: 600, rarity: 'Rara', category: 'accessory' },
  // Tier Épica (2.500 🥚)
  { id: 'tophat', name: 'Cartola Elegante', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'cape', name: 'Capa de Herói', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'wings', name: 'Asas Douradas', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'vr_visor', name: 'Visor Cyber', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'visor_neon', name: 'Visor Holográfico', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'viking_horn', name: 'Elmo Viking', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'wizard_hat', name: 'Chapéu Arcano', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'pirate_hat', name: 'Tricórnio Pirata', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'star_shades', name: 'Óculos Estelares', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'jetpack', name: 'Jetpack Turbo', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'bat_wings', name: 'Asas Noturnas', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'amber_medallion', name: 'Medalhão de Âmbar', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'lantern_neck', name: 'Lanterna de Caverna', price: 2500, rarity: 'Épica', category: 'accessory' },
  // Tier Lendária (10.000 🥚)
  { id: 'spikes', name: 'Ombreiras Alfa', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'aura_fire', name: 'Aura Vulcânica', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'crown', name: 'Coroa Real', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'halo', name: 'Auréola Celestial', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'angel_wings', name: 'Asas Celestiais', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'crystal_wings', name: 'Asas de Cristal', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'aura_ice', name: 'Aura Glacial', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'aura_lightning', name: 'Aura Tempestade', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'aura_galaxy', name: 'Aura Cósmica', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'orbital_eggs', name: 'Ovos Orbitais Místicos', price: 10000, rarity: 'Lendária', category: 'accessory' },
  // Novos Acessórios da Grande Atualização
  { id: 'diving_mask', name: 'Máscara Abissal', price: 650, rarity: 'Rara', category: 'accessory' },
  { id: 'sub_jetpack', name: 'Propulsor Submarino', price: 1800, rarity: 'Épica', category: 'accessory' },
  { id: 'star_cape', name: 'Manto Estelar', price: 2800, rarity: 'Épica', category: 'accessory' },
  { id: 'cyber_armor', name: 'Blindagem Cyber', price: 4200, rarity: 'Épica', category: 'accessory' },
  { id: 'mecha_wings', name: 'Asas Propulsoras Mecha', price: 8500, rarity: 'Lendária', category: 'accessory' },
  { id: 'floating_crystal', name: 'Cristal Terra Oca', price: 9500, rarity: 'Lendária', category: 'accessory' },
  { id: 'cosmic_horns', name: 'Chifres Cósmicos Alfa', price: 12000, rarity: 'Mítica', category: 'accessory' },
  // Linha Expansão Tática 3D
  { id: 'steam_goggles', name: 'Óculos Steampunk', price: 800, rarity: 'Rara', category: 'accessory' },
  { id: 'samurai_kabuto', name: 'Elmo Samurai', price: 950, rarity: 'Rara', category: 'accessory' },
  { id: 'dino_backpack_plush', name: 'Mochila T-Rex Bebê', price: 2200, rarity: 'Épica', category: 'accessory' },
  { id: 'royal_trident', name: 'Tridente Abissal', price: 3200, rarity: 'Épica', category: 'accessory' },
  { id: 'plasma_halo', name: 'Anel de Plasma', price: 7800, rarity: 'Lendária', category: 'accessory' },
  { id: 'comet_tail_rig', name: 'Propulsor Cometa', price: 11500, rarity: 'Mítica', category: 'accessory' },
  // Linha Mega Expansão 3D
  ...NEW_ACCESSORY_ARCHETYPES.map((a) => ({
    id: a.id,
    name: a.name,
    price: a.price,
    rarity: a.rarity,
    category: 'accessory',
    theme: a.theme
  }))
];

export const TRAILS_SHOP = [
  { id: 'dust', name: 'Poeira Clássica', price: 0, rarity: 'Comum', color: '#e8bc79' },
  { id: 'fire', name: 'Rastro de Fogo', price: 600, rarity: 'Rara', color: '#ff5e1a' },
  { id: 'stars', name: 'Chuva de Estrelas', price: 2500, rarity: 'Épica', color: '#ffd447' },
  { id: 'rainbow', name: 'Arco-Íris', price: 10000, rarity: 'Lendária', color: 'rainbow' },
  ...NEW_TRAIL_ARCHETYPES
];

export const SKIN_VARIANTS = [
  { id: 'normal', name: 'Padrão', badge: '🦖', rarity: 'Comum', price: 0, desc: 'Visual clássico da espécie.' },
  { id: 'unique_crimson', name: 'Cor Única: Rubi Vulcânico', badge: '❤️', rarity: 'Rara', price: 800, primary: '#dc2626', secondary: '#fecaca', eye: '#fef08a', spots: '#7f1d1d', spikes: '#fb923c', pattern: 'stripes', desc: 'Tonalidade escarlate exclusiva de caçador.' },
  { id: 'unique_cobalt', name: 'Cor Única: Safira Abissal', badge: '💙', rarity: 'Rara', price: 800, primary: '#2563eb', secondary: '#dbeafe', eye: '#22d3ee', spots: '#1e3a8a', spikes: '#7dd3fc', pattern: 'gradient', desc: 'Azul profundo brilhante dos mares jurássicos.' },
  { id: 'unique_amber', name: 'Cor Única: Âmbar Imperial', badge: '🧡', rarity: 'Épica', price: 1800, primary: '#d97706', secondary: '#fef3c7', eye: '#ffffff', spots: '#78350f', spikes: '#fde047', pattern: 'spots', desc: 'Dourado âmbar fossilizado raríssimo.' },
  { id: 'unique_jade', name: 'Cor Única: Jade Subterrânea', badge: '💚', rarity: 'Épica', price: 1800, primary: '#059669', secondary: '#a7f3d0', eye: '#fde047', spots: '#064e3b', spikes: '#5eead4', pattern: 'neon', desc: 'Brilho esmeralda extraído da Terra Oca.' },
  { id: 'shiny', name: 'Shiny Cintilante ✨', badge: '✨', rarity: 'Lendária', price: 0, gachaOnly: true, primary: '#fef08a', secondary: '#ffffff', eye: '#38bdf8', spots: '#f59e0b', spikes: '#f472b6', pattern: 'neon', emissiveBoost: 0.42, desc: 'Variante Shiny rara obtida no Gacha! Emite brilho estelar e +15% pontuação.' },
  { id: 'mecha', name: 'Mecânico / Cyber Bot 🤖', badge: '🤖', rarity: 'Mítica', price: 0, gachaOnly: true, primary: '#64748b', secondary: '#e2e8f0', eye: '#38bdf8', spots: '#1e293b', spikes: '#00f5d4', pattern: 'neon', isMecha: true, desc: 'Transformação robótica completa estilo Mecha-Titan com visor LED, placas metálicas e propulsores!' },
  { id: 'secret', name: 'Secreto Cósmico 🌌', badge: '🌌', rarity: 'Secreta', price: 0, gachaOnly: true, primary: '#5b21b6', secondary: '#f5d0fe', eye: '#00f5d4', spots: '#1e1b4b', spikes: '#f472b6', pattern: 'neon', emissiveBoost: 0.55, desc: 'Forma secreta ultra-rara do universo Terra Oca +25% Score e aura espacial!' },
  ...NEW_SKIN_ARCHETYPES
];

export const MAX_MUTATION_LEVEL = 4;

function pct(val) {
  return `${Math.round(Math.abs(val) * 100)}%`;
}

export const MUTATIONS = [
  {
    id: 'amber_core',
    name: 'Núcleo de Âmbar',
    badge: '🧬',
    rarity: 'Comum',
    cost: 0,
    desc: 'Condensa energia fóssil nas escamas: mais Fúria em cada coleta, com leve rigidez na corrida.',
    mods: { furyBonus: 0.12 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const furyBonus = +(0.12 * l).toFixed(2);
      const speedPenalty = l >= 2 ? -(0.02 * (l - 1)) : 0;
      return {
        tierLabel: `Nv.${l}`,
        mods: {
          furyBonus,
          speedMult: speedPenalty
        },
        pros: [`+${pct(furyBonus)} ganho de Fúria ao coletar ovos/quase-desvios`],
        cons: speedPenalty < 0
          ? [`-${pct(speedPenalty)} velocidade máxima pelo peso âmbar cristalizado`]
          : ['Sem penalidade no Nv.1 (peso cresce nos níveis 2–4)']
      };
    }
  },
  {
    id: 'extra_limbs',
    name: 'Membro Multípode (+Patas)',
    badge: '🦵',
    rarity: 'Rara',
    cost: 550,
    desc: 'Evolui pares extras de patas articuladas (+2 / +4 / +6 / +8 patas), permitindo até que aquáticos caminhem em terra!',
    mods: { laneSpeedMult: 0.14, jumpMult: -0.06, waterSpeedMult: -0.08, grantsLandWalk: true },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const patas = l * 2;
      const laneBonus = +(0.14 * l).toFixed(2);
      const stabilityBonus = +(Math.min(0.75, 0.18 * l)).toFixed(2);
      const attackBonus = +(0.10 * l).toFixed(2);
      const jumpPenalty = -(0.06 * l).toFixed(2);
      const waterPenalty = -(0.08 * l).toFixed(2);
      const airStamPenalty = +(0.12 * l).toFixed(2);
      return {
        tierLabel: `+${patas} Patas (Nv.${l})`,
        extraPairs: l,
        extraPatasCount: patas,
        mods: {
          extraPairs: l,
          grantsLandWalk: true,
          laneSpeedMult: laneBonus,
          stabilityBonus,
          attackPowerMult: +(1 + attackBonus).toFixed(2),
          jumpMult: jumpPenalty,
          waterSpeedMult: waterPenalty,
          airStaminaCostMult: +(1 + airStamPenalty).toFixed(2)
        },
        pros: [
          `+${patas} patas articuladas 3D: habilita aquáticos a andar em terra firme`,
          `+${pct(laneBonus)} agilidade lateral e +${pct(stabilityBonus)} estabilidade em gelo/lama/vento`,
          `+${pct(attackBonus)} potência no Ataque [Q] e pisoteio`
        ],
        cons: [
          `-${pct(jumpPenalty)} altura de pulo (massa muscular adicional)`,
          `-${pct(waterPenalty)} velocidade na água por arrasto das patas extras`,
          `+${pct(airStamPenalty)} gasto de estamina ao saltar/planar no ar`
        ]
      };
    }
  },
  {
    id: 'glow',
    name: 'Escamas Bioluminescentes',
    badge: '💡',
    rarity: 'Comum',
    cost: 450,
    desc: 'Ilumina biomas escuros e amplia a pontuação, exigindo leve custo metabólico de estamina.',
    mods: { scoreMult: 0.14, stamRegenPenalty: -0.04, emissive: '#5eead4' },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const scoreMult = +(0.14 + (l - 1) * 0.08).toFixed(2);
      const stamPen = -(0.04 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { scoreMult, stamRegenDelta: stamPen, emissive: '#5eead4' },
        pros: [`+${pct(scoreMult)} pontuação total na corrida e visibilidade no escuro`],
        cons: [`-${pct(stamPen)} regeneração de estamina pelo brilho contínuo`]
      };
    }
  },
  {
    id: 'fire_trail',
    name: 'Passos Flamejantes',
    badge: '🔥',
    rarity: 'Rara',
    cost: 850,
    desc: 'Acelera em terra e derrete gelo, mas superaquece levemente na água e no turbo.',
    mods: { speedMult: 0.07, waterSpeedMult: -0.06, emissive: '#f97316' },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const speedMult = +(0.07 * l).toFixed(2);
      const iceResist = +(Math.min(0.85, 0.22 * l)).toFixed(2);
      const waterPenalty = -(0.06 * l).toFixed(2);
      const stamDelta = -(0.05 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { speedMult, stabilityBonus: iceResist, waterSpeedMult: waterPenalty, stamRegenDelta: stamDelta, emissive: '#f97316' },
        pros: [
          `+${pct(speedMult)} velocidade terrestre com rastro ígneo`,
          `+${pct(iceResist)} resistência contra gelo e derrapagem`
        ],
        cons: [
          `-${pct(waterPenalty)} velocidade dentro da água (vaporização)`,
          `-${pct(stamDelta)} recuperação de estamina por calor intenso`
        ]
      };
    }
  },
  {
    id: 'bouncy',
    name: 'Tendões Elásticos',
    badge: '🦘',
    rarity: 'Rara',
    cost: 900,
    desc: 'Saltos muito mais altos com menos estamina no ar, ao custo de menor firmeza em rajadas laterais.',
    mods: { jumpMult: 0.14, staminaSave: 0.12, stabilityBonus: -0.06 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const jumpMult = +(0.12 * l).toFixed(2);
      const staminaSave = +(Math.min(0.55, 0.12 * l)).toFixed(2);
      const stabPen = -(0.07 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { jumpMult, staminaSave, stabilityBonus: stabPen },
        pros: [
          `+${pct(jumpMult)} altura de salto`,
          `-${pct(staminaSave)} consumo de estamina em saltos duplos`
        ],
        cons: [`+${pct(stabPen)} suscetibilidade ao vento lateral e empurrões na pista`]
      };
    }
  },
  {
    id: 'lucky_eggs',
    name: 'Olfato Fóssil',
    badge: '🥚',
    rarity: 'Épica',
    cost: 1600,
    desc: 'Fareja ovos extras e amplia atração próxima, pesando ligeiramente no impulso do salto.',
    mods: { eggBonus: 1, magnetBonus: 0.6, jumpMult: -0.04 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const eggBonus = l >= 3 ? 2 : 1;
      const magnetBonus = +(0.6 * l).toFixed(2);
      const jumpPen = -(0.04 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { eggBonus, magnetBonus, jumpMult: jumpPen },
        pros: [
          `+${eggBonus} ovo(s) extra por coleta na pista`,
          `+${magnetBonus.toFixed(1)}m raio natural de atração`
        ],
        cons: [`-${pct(jumpPen)} altura de pulo pelo acúmulo extra de reservas`]
      };
    }
  },
  {
    id: 'tiny_core',
    name: 'Encolhimento Ágil',
    badge: '🔬',
    rarity: 'Épica',
    cost: 1900,
    desc: 'Reduz a hitbox corporal e agiliza desvios, reduzindo um pouco o alcance corpo a corpo.',
    mods: { hitboxScale: 0.86, laneSpeedMult: 0.06, attackPowerMult: 0.92 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const shrink = +(0.12 + (l - 1) * 0.04).toFixed(2);
      const laneBonus = +(0.06 * l).toFixed(2);
      const atkPen = -(0.06 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { hitboxScale: +(1 - shrink).toFixed(2), laneSpeedMult: laneBonus, attackPowerMult: +(1 + atkPen).toFixed(2) },
        pros: [
          `-${pct(shrink)} tamanho de colisão contra obstáculos fechados`,
          `+${pct(laneBonus)} rapidez na troca de faixa`
        ],
        cons: [`-${pct(atkPen)} força de impacto físico no Ataque [Q] / pisoteio`]
      };
    }
  },
  {
    id: 'venom_spines',
    name: 'Espinhos Peçonhentos',
    badge: '☠️',
    rarity: 'Épica',
    cost: 2200,
    desc: 'Imunidade a toxinas e recarga ultrarrápida do Ataque [Q], com leve peso nos espinhos dorsais.',
    mods: { attackCdMult: 0.82, poisonResist: true, speedMult: -0.03 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const cdSave = Math.min(0.55, 0.14 * l);
      const atkBonus = +(0.08 * l).toFixed(2);
      const speedPen = -(0.03 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: {
          attackCdMult: +(1 - cdSave).toFixed(2),
          attackPowerMult: +(1 + atkBonus).toFixed(2),
          poisonResist: true,
          speedMult: speedPen
        },
        pros: [
          `Imune a veneno/lama + recarga de Ataque [Q] ${pct(cdSave)} mais rápida`,
          `+${pct(atkBonus)} potência no corte ácido/espinhos`
        ],
        cons: [`-${pct(speedPen)} velocidade máxima pelo peso das glândulas dorsais`]
      };
    }
  },
  {
    id: 'turbo_tail',
    name: 'Cauda Hidrodinâmica',
    badge: '⚡',
    rarity: 'Lendária',
    cost: 3400,
    desc: 'Turbina nado na água e recarga de estamina, alargando levemente a cauda atrás.',
    mods: { stamRegenMult: 1.18, waterSpeedMult: 0.08, hitboxScale: 1.04 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const regen = +(0.18 * l).toFixed(2);
      const waterSpeed = +(0.08 * l).toFixed(2);
      const hbPen = +(0.03 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { stamRegenMult: +(1 + regen).toFixed(2), waterSpeedMult: waterSpeed, hitboxScale: +(1 + hbPen).toFixed(2) },
        pros: [
          `+${pct(regen)} regeneração de estamina em terra e água`,
          `+${pct(waterSpeed)} propulsão em rios, mares e mergulhos`
        ],
        cons: [`+${pct(hbPen)} largura de hitbox na cauda estendida`]
      };
    }
  },
  {
    id: 'mecha_core',
    name: 'Implante Nano-Mecha',
    badge: '⚙️',
    rarity: 'Mítica',
    cost: 5200,
    desc: 'Escudos iniciais e Fúria prolongada com chassi metálico mais pesado na água e saltos.',
    mods: { startShield: 1, furyDurMult: 1.15, jumpMult: -0.05, waterSpeedMult: -0.04 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const startShield = l >= 3 ? 2 : 1;
      const furyDur = +(0.14 * l).toFixed(2);
      const jumpPen = -(0.045 * l).toFixed(3);
      const waterPen = -(0.04 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { startShield, furyDurMult: +(1 + furyDur).toFixed(2), jumpMult: jumpPen, waterSpeedMult: waterPen },
        pros: [
          `+${startShield} Escudo(s) inicial(is) em toda corrida`,
          `+${pct(furyDur)} duração da Fúria [F]`
        ],
        cons: [
          `-${pct(jumpPen)} altura de pulo e -${pct(waterPen)} velocidade na água (blindagem pesada)`
        ]
      };
    }
  },
  {
    id: 'cosmic_dna',
    name: 'DNA Híbrido Cósmico',
    badge: '🌌',
    rarity: 'Secreta',
    cost: 0,
    gachaOnly: true,
    desc: 'Pontuação estelar, ímã amplo e escudo cósmico com leve instabilidade gravitacional no ar.',
    mods: { scoreMult: 0.16, magnetBonus: 1.6, startShield: 1, airStaminaCostMult: 1.08 },
    computeTier(level = 1) {
      const l = Math.max(1, Math.min(4, level));
      const scoreMult = +(0.16 + (l - 1) * 0.08).toFixed(2);
      const magnetBonus = +(1.6 * l).toFixed(2);
      const startShield = l >= 4 ? 2 : 1;
      const airCostPen = +(0.07 * l).toFixed(2);
      return {
        tierLabel: `Nv.${l}`,
        mods: { scoreMult, magnetBonus, startShield, airStaminaCostMult: +(1 + airCostPen).toFixed(2) },
        pros: [
          `+${pct(scoreMult)} Score + +${magnetBonus.toFixed(1)}m ímã cósmico`,
          `+${startShield} Escudo inicial permanente`
        ],
        cons: [`+${pct(airCostPen)} consumo de estamina aérea por flutuação instável`]
      };
    }
  },
  ...NEW_MUTATION_ARCHETYPES
];

export function getSkinVariantDef(id) {
  return SKIN_VARIANTS.find((v) => v.id === id) || SKIN_VARIANTS[0];
}

export function isSkinVariantUnlocked(dinoId, variantId) {
  if (!variantId || variantId === 'normal') return true;
  const map = Save.data.unlockedSkins || {};
  const list = map[dinoId] || [];
  return list.includes(variantId) || (map['__all__'] || []).includes(variantId);
}

export function unlockSkinVariant(dinoId, variantId) {
  if (!Save.data.unlockedSkins) Save.data.unlockedSkins = {};
  const targetKey = dinoId || '__all__';
  if (!Array.isArray(Save.data.unlockedSkins[targetKey])) {
    Save.data.unlockedSkins[targetKey] = [];
  }
  const already = Save.data.unlockedSkins[targetKey].includes(variantId);
  if (!already) {
    Save.data.unlockedSkins[targetKey].push(variantId);
    Save.save();
  }
  return !already;
}

export function getEquippedSkinVariant(dinoId) {
  return Save.data.equippedSkinVariants?.[dinoId] || 'normal';
}

export function setEquippedSkinVariant(dinoId, variantId) {
  if (!Save.data.equippedSkinVariants) Save.data.equippedSkinVariants = {};
  Save.data.equippedSkinVariants[dinoId] = variantId || 'normal';
  Save.save();
}

export function applySkinVariantToColors(baseColors, variantId) {
  const v = getSkinVariantDef(variantId);
  if (!v || v.id === 'normal') return { ...baseColors };
  return {
    ...baseColors,
    primary: v.primary || baseColors.primary,
    secondary: v.secondary || baseColors.secondary,
    eye: v.eye || baseColors.eye,
    spots: v.spots || baseColors.spots,
    spikes: v.spikes || baseColors.spikes,
    pattern: v.pattern || baseColors.pattern || 'solid',
    skinVariant: v.id,
    isMecha: !!v.isMecha,
    isShiny: v.id === 'shiny',
    isSecret: v.id === 'secret'
  };
}

export function getMutationDef(id) {
  return MUTATIONS.find((m) => m.id === id) || null;
}

export function isMutationUnlocked(id) {
  return (Save.data.unlockedMutations || ['amber_core']).includes(id);
}

export function getMutationUnlockedLevel(id) {
  if (!isMutationUnlocked(id)) return 0;
  const lv = Number(Save.data.mutationLevels?.[id] || 1);
  return Math.max(1, Math.min(MAX_MUTATION_LEVEL, lv));
}

export function getMutationActiveLevel(id) {
  const maxLv = getMutationUnlockedLevel(id);
  if (maxLv <= 0) return 1;
  const active = Number(Save.data.mutationActiveTiers?.[id] || maxLv);
  return Math.max(1, Math.min(maxLv, active));
}

export function setMutationActiveLevel(id, tier) {
  const maxLv = getMutationUnlockedLevel(id);
  if (maxLv <= 0) return false;
  if (!Save.data.mutationActiveTiers) Save.data.mutationActiveTiers = {};
  Save.data.mutationActiveTiers[id] = Math.max(1, Math.min(maxLv, Math.floor(tier)));
  Save.save();
  return true;
}

export function getMutationUpgradeCost(mutOrId, currentLevel = 1) {
  const def = typeof mutOrId === 'string' ? getMutationDef(mutOrId) : mutOrId;
  if (!def || currentLevel >= MAX_MUTATION_LEVEL) return 0;
  const base = def.cost > 0 ? def.cost : 950;
  return Math.round(base * (0.55 + currentLevel * 0.55));
}

export function getMutationCrystalCost(mutOrId, currentLevel = 0) {
  const def = typeof mutOrId === 'string' ? getMutationDef(mutOrId) : mutOrId;
  if (!def) return 0;
  if (currentLevel >= MAX_MUTATION_LEVEL) return 0;
  if (currentLevel === 0) {
    if (def.rarity === 'lendária' || def.rarity === 'mítica' || (def.cost || 0) >= 1200) return 4;
    if (def.rarity === 'épica' || (def.cost || 0) >= 750) return 3;
    return 2;
  }
  return Math.min(4, currentLevel + 1);
}

export function synthesizeOrUpgradeMutationWithCrystals(id) {
  const def = getMutationDef(id);
  if (!def) return { ok: false, reason: 'Mutação desconhecida.' };
  const unlocked = isMutationUnlocked(id);
  const cur = unlocked ? getMutationUnlockedLevel(id) : 0;
  if (cur >= MAX_MUTATION_LEVEL) return { ok: false, reason: 'Nível máximo (4/4) já atingido!' };
  const cost = getMutationCrystalCost(def, cur);
  if ((Save.data.crystals || 0) < cost) {
    return { ok: false, reason: `Precisa de ${cost} 💎 para forjar ${def.name}!` };
  }
  Save.addCrystals(-cost);
  if (!unlocked) {
    unlockMutation(id);
    Save.data.equippedMutation = id;
    Save.save();
    return { ok: true, action: 'unlocked', level: 1, cost };
  }
  if (!Save.data.mutationLevels) Save.data.mutationLevels = {};
  if (!Save.data.mutationActiveTiers) Save.data.mutationActiveTiers = {};
  const nextLv = cur + 1;
  Save.data.mutationLevels[id] = nextLv;
  Save.data.mutationActiveTiers[id] = nextLv;
  Save.save();
  return { ok: true, action: 'upgraded', level: nextLv, cost };
}

export function upgradeMutation(id) {
  const def = getMutationDef(id);
  if (!def) return { ok: false, reason: 'Mutação desconhecida.' };
  if (!isMutationUnlocked(id)) return { ok: false, reason: 'Sintetize esta mutação primeiro!' };
  const cur = getMutationUnlockedLevel(id);
  if (cur >= MAX_MUTATION_LEVEL) return { ok: false, reason: 'Nível máximo (4/4) já atingido!' };
  const cost = getMutationUpgradeCost(def, cur);
  if ((Save.data.eggs || 0) < cost) {
    return { ok: false, reason: `Precisa de ${cost} 🥚 para evoluir ${def.name}!` };
  }
  Save.addEggs(-cost);
  if (!Save.data.mutationLevels) Save.data.mutationLevels = {};
  if (!Save.data.mutationActiveTiers) Save.data.mutationActiveTiers = {};
  const nextLv = cur + 1;
  Save.data.mutationLevels[id] = nextLv;
  Save.data.mutationActiveTiers[id] = nextLv;
  Save.save();
  return { ok: true, level: nextLv, cost };
}

export function getMutationComputedProfile(id, overrideTier = null) {
  const def = getMutationDef(id);
  if (!def) return null;
  const unlockedLv = Math.max(1, getMutationUnlockedLevel(id) || 1);
  const tier = overrideTier !== null
    ? Math.max(1, Math.min(MAX_MUTATION_LEVEL, overrideTier))
    : Math.max(1, Math.min(unlockedLv, getMutationActiveLevel(id)));
  const computed = typeof def.computeTier === 'function'
    ? def.computeTier(tier)
    : { tierLabel: `Nv.${tier}`, mods: { ...(def.mods || {}) }, pros: [def.desc], cons: [] };
  return {
    def,
    id: def.id,
    name: def.name,
    badge: def.badge,
    rarity: def.rarity,
    unlockedLevel: getMutationUnlockedLevel(id),
    activeLevel: tier,
    tierLabel: computed.tierLabel || `Nv.${tier}`,
    extraPairs: computed.extraPairs || 0,
    extraPatasCount: computed.extraPatasCount || 0,
    mods: computed.mods || {},
    pros: computed.pros || [],
    cons: computed.cons || []
  };
}

export function unlockMutation(id) {
  if (!Array.isArray(Save.data.unlockedMutations)) Save.data.unlockedMutations = ['amber_core'];
  const isNew = !Save.data.unlockedMutations.includes(id);
  if (isNew) {
    Save.data.unlockedMutations.push(id);
    if (!Save.data.mutationLevels) Save.data.mutationLevels = {};
    if (!Save.data.mutationActiveTiers) Save.data.mutationActiveTiers = {};
    Save.data.mutationLevels[id] = 1;
    Save.data.mutationActiveTiers[id] = 1;
    Save.save();
  }
  return isNew;
}

export function getActivePreset(playerKey = 'p1') {
  const cfg = Save.data.customization[playerKey] || Save.data.customization.p1;
  return cfg.presets[cfg.activePreset] || cfg.presets[0];
}

export function randomizePreset(preset) {
  const palette = ['#3fa34d', '#e05a2b', '#2d7dd2', '#8338ec', '#e9c46a', '#f72585', '#1f8a8c', '#ff9f1c'];
  const pick = () => palette[Math.floor(Math.random() * palette.length)];
  preset.useCustomColors = true;
  preset.primary = pick();
  preset.secondary = '#f8f0d8';
  preset.eye = Math.random() < 0.5 ? '#ffd54f' : '#ffffff';
  preset.spots = pick();
  preset.spikes = pick();
  preset.pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)].id;
  const unlockedAcc = Save.data.unlockedAccessories || ['none'];
  preset.accessory = unlockedAcc[Math.floor(Math.random() * unlockedAcc.length)];
  Save.save();
  return preset;
}

export function rollRandomMutation() {
  return MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
}

const FIXED_SKIN_THEMES = [
  { key: 'original', name: 'Original Fóssil', badge: '🌿' },
  { key: 'magma', name: 'Magma Alfa', badge: '🔥', primary: '#b91c1c', secondary: '#fde68a', eye: '#fbbf24', spots: '#450a0a', spikes: '#fb923c', pattern: 'stripes' },
  { key: 'glacial', name: 'Ártico Real', badge: '❄️', primary: '#0284c7', secondary: '#e0f2fe', eye: '#fef08a', spots: '#1e3a8a', spikes: '#bae6fd', pattern: 'gradient' }
];

const CUSTOM_SKIN_OVERRIDES = {
  trex: [
    { key: 'amber', name: 'Âmbar Supremo', badge: '💎', primary: '#d97706', secondary: '#fef3c7', eye: '#ef4444', spots: '#78350f', spikes: '#fbbf24', pattern: 'spots' },
    { key: 'cyber', name: 'Apex Neon', badge: '⚡', primary: '#1e293b', secondary: '#38bdf8', eye: '#22d3ee', spots: '#6366f1', spikes: '#00f5d4', pattern: 'neon' }
  ],
  raptor: [
    { key: 'blue', name: 'Alfa Índigo', badge: '💠', primary: '#1d4ed8', secondary: '#dbeafe', eye: '#facc15', spots: '#38bdf8', spikes: '#93c5fd', pattern: 'stripes' },
    { key: 'shadow', name: 'Caçador Sombrio', badge: '🌑', primary: '#312e81', secondary: '#e2e8f0', eye: '#f43f5e', spots: '#1e1b4b', spikes: '#a855f7', pattern: 'camo' }
  ],
  spinosaurus: [
    { key: 'abyssal', name: 'Leviatã Abissal', badge: '🌊', primary: '#0f766e', secondary: '#99f6e4', eye: '#fde047', spots: '#134e4a', spikes: '#2dd4bf', pattern: 'stripes' },
    { key: 'crimson', name: 'Vela Escarlate', badge: '🔥', primary: '#991b1b', secondary: '#fecaca', eye: '#fbbf24', spots: '#450a0a', spikes: '#f97316', pattern: 'gradient' }
  ],
  triceratops: [
    { key: 'ivory', name: 'Marfim Real', badge: '👑', primary: '#b45309', secondary: '#fef3c7', eye: '#ffffff', spots: '#78350f', spikes: '#fde047', pattern: 'spots' },
    { key: 'moss', name: 'Guardião Musgo', badge: '🍃', primary: '#3f6212', secondary: '#ecfccb', eye: '#a3e635', spots: '#1a2e05', spikes: '#84cc16', pattern: 'camo' }
  ],
  ghostgold: [
    { key: 'celestial', name: 'Espectro Astral', badge: '✨', primary: '#7c3aed', secondary: '#f5f3ff', eye: '#22d3ee', spots: '#4c1d95', spikes: '#fde047', pattern: 'neon' },
    { key: 'solar', name: 'Aura Solar', badge: '☀️', primary: '#f59e0b', secondary: '#fffbeb', eye: '#ffffff', spots: '#b45309', spikes: '#fef08a', pattern: 'gradient' }
  ]
};

export function getDinoSkins(dinoSpec) {
  const spec = typeof dinoSpec === 'string' ? { id: dinoSpec, colors: {} } : (dinoSpec || { id: 'trex', colors: {} });
  const base = spec.colors || { primary: '#3fa34d', secondary: '#c7e89b', eye: '#ffd54f', spots: '#1e5b2b', spikes: '#e87a24' };
  const orig = {
    id: `${spec.id}_original`,
    name: FIXED_SKIN_THEMES[0].name,
    badge: FIXED_SKIN_THEMES[0].badge,
    ...base,
    pattern: 'solid'
  };
  const customPair = CUSTOM_SKIN_OVERRIDES[spec.id];
  if (customPair) {
    return [orig, ...customPair.map((s) => ({ id: `${spec.id}_${s.key}`, ...s }))];
  }
  return [
    orig,
    { id: `${spec.id}_magma`, ...FIXED_SKIN_THEMES[1] },
    { id: `${spec.id}_glacial`, ...FIXED_SKIN_THEMES[2] }
  ];
}
