// Catálogo de 13 Dinossauros Limitados / Exclusivos de Evento e Modos Especiais.
// Todos possuem isLimited: true, gachaExcluded: true e unlockCondition estruturada.

export const LIMITED_DINO_CATALOG = [
  {
    id: 'scary_raptor',
    name: 'Raptor Fóssil Estelar',
    publicName: 'Raptor Fóssil Estelar',
    personalName: 'Scary Monsters',
    rarity: 'Mítica',
    eventTag: 'Edição Limitada: Corrida de Aço',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Corrida de Aço / Masmorra Andar 2',
      target: 2
    },
    dinoClass: 'carnivore',
    stats: { speed: 10, jump: 9, hp: 4, defense: 6, attack: 9 },
    ability: {
      name: 'Infecção Fóssil',
      desc: 'Transforma obstáculos à frente em fósseis frágeis que concedem ovos extras e impulso de velocidade.',
      cooldown: 8.0,
      duration: 2.6
    },
    passive: 'Faro Fóssil: +20% velocidade em combos acima de 5 e chance de converter inimigos menores em aliados.',
    colors: {
      primary: '#1fb6c8',
      secondary: '#8ef3f5',
      spots: '#1d3b8b',
      spikes: '#facc15',
      eye: '#fde047'
    },
    roarPitch: 275,
    fact: {
      pt: 'Um predador ágil de escamas turquesa e reflexos dourados capaz de petrificar rivais com um único corte.',
      en: 'An agile turquoise-scaled predator with golden reflexes capable of fossilizing rivals with a single slash.'
    }
  },
  {
    id: 'dracorex_solar',
    name: 'Dracorex Solar',
    rarity: 'Lendária',
    eventTag: 'Edição Limitada: Eclipse Dourado',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Eclipse Dourado',
      target: 1
    },
    dinoClass: 'mystic',
    stats: { speed: 8, jump: 7, hp: 5, defense: 5, attack: 8 },
    ability: {
      name: 'Raio Solar',
      desc: 'Dispara um feixe solar concentrado que incinera obstáculos à frente por 2s.',
      cooldown: 9.0,
      duration: 2.0
    },
    passive: 'Halo: +1 escudo a cada 3.000m',
    colors: {
      primary: '#e9a41a',
      secondary: '#ffe9a8',
      spots: '#b5700b',
      spikes: '#ffd65c',
      eye: '#fff6d0'
    },
    roarPitch: 190,
    fact: {
      pt: 'Dracorex dourado com cristas de raios e um halo de luz atrás da cabeça; a ponta da cauda brilha em laranja.',
      en: 'Golden Dracorex crowned with sunray crests and a luminous halo behind its head.'
    }
  },
  {
    id: 'nebulossauro',
    name: 'Nebulossauro',
    rarity: 'Épica',
    eventTag: 'Edição Limitada: Noite Estrelada',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Noite Estrelada',
      target: 1
    },
    dinoClass: 'mystic',
    stats: { speed: 6, jump: 8, hp: 6, defense: 4, attack: 7 },
    ability: {
      name: 'Trombeta Estelar',
      desc: 'Emite onda cósmica que atrai ovos próximos e empurra inimigos menores.',
      cooldown: 8.5,
      duration: 2.8
    },
    passive: 'Chuva de Estrelas no combo 10',
    colors: {
      primary: '#35216e',
      secondary: '#7b5cc9',
      spots: '#1e1146',
      spikes: '#ff5fa2',
      eye: '#6ee7f2'
    },
    roarPitch: 175,
    fact: {
      pt: 'Parassaurolofo de pele de galáxia repleta de estrelas brilhantes e crista ciano luminosa.',
      en: 'Galaxy-skinned Parasaurolophus speckled with glowing stars and a luminous cyan crest.'
    }
  },
  {
    id: 'cristaloceratops',
    name: 'Cristaloceratops',
    rarity: 'Mítica',
    eventTag: 'Edição Limitada: Geleira Viva',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Geleira Viva',
      target: 1
    },
    dinoClass: 'herbivore',
    stats: { speed: 5, jump: 5, hp: 8, defense: 9, attack: 8 },
    ability: {
      name: 'Carga de Cristal',
      desc: 'Investida prismática que estilhaça obstáculos e deixa um rastro congelante.',
      cooldown: 10.0,
      duration: 2.8
    },
    passive: 'Casco Prismático: reflete 1º dano',
    colors: {
      primary: '#1f6f8b',
      secondary: '#8fd8ea',
      spots: '#14485c',
      spikes: '#7ff0ff',
      eye: '#ffe08a'
    },
    roarPitch: 108,
    fact: {
      pt: 'Tricerátopo de cristal com babador de gemas azuis e três chifres translúcidos capazes de refratar impactos.',
      en: 'Crystal Triceratops with a sapphire-gem frill and three translucent horns that refract impacts.'
    }
  },
  {
    id: 'abissal_espectral',
    name: 'Abissal Espectral',
    rarity: 'Lendária',
    eventTag: 'Edição Limitada: Noite Espectral',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Noite Espectral',
      target: 1
    },
    dinoClass: 'aquatic',
    habitat: 'aquatic',
    swimProfile: 'submerge',
    stats: { speed: 8, jump: 6, hp: 5, defense: 6, attack: 9 },
    ability: {
      name: 'Maré Fantasma',
      desc: 'Submerge em forma espectral atravessando obstáculos e deixando redemoinhos abissais.',
      cooldown: 8.5,
      duration: 2.4
    },
    passive: 'Brânquias Etéreas: oxigênio infinito em mergulho e +20% velocidade submersa.',
    colors: {
      primary: '#0f2942',
      secondary: '#67e8f9',
      spots: '#081726',
      spikes: '#22d3ee',
      eye: '#a5f3fc'
    },
    roarPitch: 120,
    fact: {
      pt: 'Predador das fossas oceânicas que brilha com bioluminescência fantasmagórica nas águas profundas.',
      en: 'Abyssal trench predator glowing with ghostly bioluminescence in deep waters.'
    }
  },
  {
    id: 'pirofenix_rex',
    name: 'Pirofênix Rex',
    rarity: 'Mítica',
    eventTag: 'Edição Limitada: Solstício Vulcânico',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Solstício Vulcânico',
      target: 1
    },
    dinoClass: 'carnivore',
    stats: { speed: 8, jump: 7, hp: 6, defense: 6, attack: 10 },
    ability: {
      name: 'Explosão Fênix',
      desc: 'Libera uma onda de chamas solares que destrói todos os obstáculos próximos.',
      cooldown: 10.5,
      duration: 2.2
    },
    passive: 'Renascimento em Cinzas: revive 1 vez por partida com 50% de vida em explosão ígnea.',
    colors: {
      primary: '#c2410c',
      secondary: '#fed7aa',
      spots: '#7c2d12',
      spikes: '#facc15',
      eye: '#fef08a'
    },
    roarPitch: 92,
    fact: {
      pt: 'Tiranossauro forjado nas caldeiras vulcânicas cujas plumas flamejantes reacendem após quedas.',
      en: 'Tyrannosaur forged in volcanic calderas whose fiery plumes reignite after defeat.'
    }
  },
  {
    id: 'cryo_spino_aurora',
    name: 'Cryo-Spino Aurora',
    rarity: 'Lendária',
    eventTag: 'Edição Limitada: Aurora Boreal',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Aurora Boreal',
      target: 1
    },
    dinoClass: 'aquatic',
    habitat: 'amphibious',
    swimProfile: 'surface',
    stats: { speed: 8, jump: 7, hp: 6, defense: 7, attack: 8 },
    ability: {
      name: 'Vela Boreal',
      desc: 'Congela obstáculos em uma faixa frontal e cria ponte de gelo sobre perigos.',
      cooldown: 9.0,
      duration: 2.5
    },
    passive: 'Corrente Polar: imune a escorregões de gelo e +15% impulso em rios e mares.',
    colors: {
      primary: '#0284c7',
      secondary: '#e0f2fe',
      spots: '#0c4a6e',
      spikes: '#34d399',
      eye: '#5eead4'
    },
    roarPitch: 112,
    fact: {
      pt: 'Espinossauro ártico cuja vela dorsal reflete os tons esmeralda e ciano da aurora boreal.',
      en: 'Arctic Spinosaurus whose dorsal sail shimmers with emerald and cyan aurora hues.'
    }
  },
  {
    id: 'dragao_lunar',
    name: 'Dragão Lunar Voxel',
    rarity: 'Mítica',
    eventTag: 'Edição Limitada: Eclipse Lunar',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Eclipse Lunar',
      target: 1
    },
    dinoClass: 'flying',
    habitat: 'flying',
    stats: { speed: 9, jump: 10, hp: 5, defense: 5, attack: 9 },
    ability: {
      name: 'Sopro de Eclipse',
      desc: 'Voo rasante envolto em energia lunar que desintegra obstáculos aéreos e terrestres.',
      cooldown: 9.5,
      duration: 2.6
    },
    passive: 'Gravidade Selênica: planagem 35% mais longa e bônus dobrado em anéis aéreos.',
    colors: {
      primary: '#4338ca',
      secondary: '#e0e7ff',
      spots: '#1e1b4b',
      spikes: '#c084fc',
      eye: '#f8fafc'
    },
    roarPitch: 215,
    fact: {
      pt: 'Criatura alada esculpida em cristais lunares que cruza os céus silenciosamente durante eclipses.',
      en: 'Winged creature sculpted from lunar crystals that glides silently across eclipse skies.'
    }
  },
  {
    id: 'meca_indominus_zero',
    name: 'Mecha-Indominus Zero',
    rarity: 'Mítica',
    eventTag: 'Edição Limitada: Protocolo Cyber',
    isLimited: true,
    gachaExcluded: true,
    mecha: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Protocolo Cyber',
      target: 1
    },
    dinoClass: 'carnivore',
    stats: { speed: 9, jump: 8, hp: 7, defense: 8, attack: 10 },
    ability: {
      name: 'Sobrecarga Zero',
      desc: 'Ativa camuflagem óptica e dispara feixe de plasma que limpa todas as faixas à frente.',
      cooldown: 10.5,
      duration: 2.5
    },
    passive: 'Núcleo Quântico: -15% tempo de recarga ao destruir obstáculos em sequência.',
    colors: {
      primary: '#e2e8f0',
      secondary: '#334155',
      spots: '#0f172a',
      spikes: '#ef4444',
      eye: '#38bdf8'
    },
    roarPitch: 85,
    fact: {
      pt: 'Protótipo biomecatrônico de elite equipado com blindagem de titânio branco e reator de plasma.',
      en: 'Elite biomechatronic prototype clad in white titanium armor and a plasma core.'
    }
  },
  {
    id: 'lich_rex_dungeon',
    name: 'Lich-Rex das Criptas',
    rarity: 'Mítica',
    eventTag: 'Recompensa: Masmorra RPG',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'dungeon_floor',
      label: 'Recompensa Masmorra RPG Andar 5',
      target: 5
    },
    dinoClass: 'mystic',
    stats: { speed: 7, jump: 7, hp: 7, defense: 7, attack: 10 },
    ability: {
      name: 'Decreto Necrótico',
      desc: 'Conjura mãos ósseas que esmagam inimigos e absorvem energia vital.',
      cooldown: 9.5,
      duration: 2.4
    },
    passive: 'Filactério Ancestral: +2 de bônus em testes d20 na Masmorra e roubo de vida ao vencer batalhas.',
    colors: {
      primary: '#1e293b',
      secondary: '#cbd5e1',
      spots: '#09090b',
      spikes: '#22c55e',
      eye: '#4ade80'
    },
    roarPitch: 74,
    fact: {
      pt: 'Soberano imortal das catacumbas antigas, coroado com chamas espectrais esmeralda.',
      en: 'Undying sovereign of the ancient catacombs, crowned in emerald spectral fire.'
    }
  },
  {
    id: 'gladiador_carno',
    name: 'Gladiador Carnotauro',
    rarity: 'Lendária',
    eventTag: 'Recompensa: Arena X1',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'x1_wins',
      label: 'Recompensa Arena X1 — 3 Vitórias',
      target: 3
    },
    dinoClass: 'carnivore',
    stats: { speed: 9, jump: 7, hp: 6, defense: 7, attack: 10 },
    ability: {
      name: 'Investida da Arena',
      desc: 'Avanço blindado com chifres em brasa que quebra guardas e atordoa rivais.',
      cooldown: 8.0,
      duration: 2.0
    },
    passive: 'Sangue de Campeão: +18% dano no modo Arena X1 e recarga acelerada após contra-ataques.',
    colors: {
      primary: '#991b1b',
      secondary: '#f59e0b',
      spots: '#450a0a',
      spikes: '#fcd34d',
      eye: '#fef08a'
    },
    roarPitch: 102,
    fact: {
      pt: 'Campeão invicto do coliseu pré-histórico, adornado com placas de bronze e cicatrizes de batalha.',
      en: 'Undefeated champion of the prehistoric coliseum, clad in bronze plates and battle scars.'
    }
  },
  {
    id: 'crono_raptor',
    name: 'Crono-Raptor Temporal',
    rarity: 'Lendária',
    eventTag: 'Edição Limitada: Fenda Temporal',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Fenda Temporal',
      target: 1
    },
    dinoClass: 'carnivore',
    stats: { speed: 10, jump: 9, hp: 4, defense: 5, attack: 9 },
    ability: {
      name: 'Salto Cronológico',
      desc: 'Desacelera o tempo ao redor e avança em teleporte curto sem sofrer colisão.',
      cooldown: 8.5,
      duration: 2.2
    },
    passive: 'Paradoxo Seguro: reverte automaticamente o primeiro erro fatal a cada 4.000m.',
    colors: {
      primary: '#6d28d9',
      secondary: '#ddd6fe',
      spots: '#2e1065',
      spikes: '#38bdf8',
      eye: '#fde047'
    },
    roarPitch: 305,
    fact: {
      pt: 'Velociraptor que atravessou fendas temporais, deixando pós-imagens violetas por onde corre.',
      en: 'Velociraptor that stepped through temporal rifts, trailing violet afterimages as it sprints.'
    }
  },
  {
    id: 'florassauro_primavera',
    name: 'Florassauro Verdejante',
    rarity: 'Épica',
    eventTag: 'Edição Limitada: Primavera Jurássica',
    isLimited: true,
    gachaExcluded: true,
    unlockCost: 0,
    unlockCondition: {
      type: 'event',
      label: 'Evento Primavera Jurássica',
      target: 1
    },
    dinoClass: 'herbivore',
    stats: { speed: 7, jump: 7, hp: 7, defense: 7, attack: 6 },
    ability: {
      name: 'Desabrochar Vital',
      desc: 'Cria campo de pétalas que cura vida, restaura estamina e converte espinhos em frutas.',
      cooldown: 9.0,
      duration: 3.0
    },
    passive: 'Seiva Viva: frutas concedem o dobro de cura e +15% ovos bônus.',
    colors: {
      primary: '#16a34a',
      secondary: '#dcfce7',
      spots: '#14532d',
      spikes: '#f472b6',
      eye: '#fde047'
    },
    roarPitch: 165,
    fact: {
      pt: 'Guardião pacífico dos vales floridos, com pétalas luminosas que florescem ao longo do dorso.',
      en: 'Peaceful guardian of blooming valleys, adorned with luminous petals along its spine.'
    }
  }
];

export function getDinoDisplayName(spec, settings) {
  if (!spec) return '';
  if (spec.personalName && settings?.personalNames) {
    return spec.personalName;
  }
  return spec.name || spec.publicName || '';
}
