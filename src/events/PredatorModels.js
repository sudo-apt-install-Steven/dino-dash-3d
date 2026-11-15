// Catálogo e Modelagem Voxel Procedural dos 14 Predadores Originais (Etapa 5 / Seção 2).
import * as THREE from 'three';

const SHARED_BOX = new THREE.BoxGeometry(1, 1, 1);

function vox(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(SHARED_BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function pivotAt(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export const PREDATOR_CATALOG = [
  {
    id: 'cindermaw',
    name: 'Cindermaw',
    title: 'Fauces de Brasa',
    biome: 'volcano',
    habitat: 'land',
    archetype: 'Titã Magmático',
    color: '#991b1b',
    accent: '#fb923c',
    belly: '#450a0a',
    eyeColor: '#fde047',
    introDuration: 6.5,
    lore: 'Nascido em fendas vulcânicas; suas placas dorsais brilham como lava viva antes de investir.',
    counterTip: 'Corra rápido com Turbo ou desvie para longe quando a distância cair abaixo de 6m.'
  },
  {
    id: 'cryoclaw',
    name: 'Cryoclaw',
    title: 'Garras de Gelo',
    biome: 'ice_age',
    habitat: 'land',
    archetype: 'Raptor Glacial',
    color: '#0284c7',
    accent: '#bae6fd',
    belly: '#e0f2fe',
    eyeColor: '#22d3ee',
    introDuration: 6.5,
    lore: 'Predador ártico com cristas de cristal congelado e garras em foice capazes de rachar geleiras.',
    counterTip: 'Use Shift com estamina cheia para cruzar áreas estreitas sem perder velocidade.'
  },
  {
    id: 'voltspire',
    name: 'Voltspire',
    title: 'Espinho Voltaico',
    biome: 'storm_desert',
    habitat: 'land',
    archetype: 'Caçador Elétrico',
    color: '#1e3a8a',
    accent: '#facc15',
    belly: '#172554',
    eyeColor: '#fef08a',
    introDuration: 6.5,
    lore: 'Carrega bobinas naturais nas costas que captam raios da tempestade para acelerar em arrancadas.',
    counterTip: 'Ative seu Poder [Espaço] ou ataque [Q] em obstáculos para ganhar carga rápida.'
  },
  {
    id: 'mirefang',
    name: 'Mirefang',
    title: 'Presa do Pântano',
    biome: 'dark_swamp',
    habitat: 'land',
    archetype: 'Fera Venenosa',
    color: '#14532d',
    accent: '#84cc16',
    belly: '#1e293b',
    eyeColor: '#bef264',
    introDuration: 6.5,
    lore: 'Espreita sob a névoa pantanosa com bolsas bioluminescentes de veneno e mandíbula dupla.',
    counterTip: 'Evite poças de lama que cortam sua velocidade durante a perseguição.'
  },
  {
    id: 'razorcrest',
    name: 'Razorcrest',
    title: 'Crista Navalha',
    biome: 'jurassic_forest',
    habitat: 'land',
    archetype: 'Predador de Selva',
    color: '#15803d',
    accent: '#ef4444',
    belly: '#fef3c7',
    eyeColor: '#fbbf24',
    introDuration: 6.5,
    lore: 'Ágil caçador da floresta fechada com duas lâminas escarlates no crânio para abrir caminho.',
    counterTip: 'Quebre cactos e troncos com [Q] em vez de colidir para manter velocidade alta.'
  },
  {
    id: 'ironhide_rex',
    name: 'Ironhide Rex',
    title: 'Couraça de Ferro',
    biome: 'ruined_city',
    habitat: 'land',
    archetype: 'Colosso Blindado',
    color: '#334155',
    accent: '#94a3b8',
    belly: '#1e293b',
    eyeColor: '#f97316',
    introDuration: 6.8,
    lore: 'Sobrevivente mutado em ruínas metálicas; carrega ombreiras de aço rebitadas e clava na cauda.',
    counterTip: 'Guarde 1 Escudo para absorver uma mordida caso ele alcance você nos desvios.'
  },
  {
    id: 'vexwing',
    name: 'Vexwing',
    title: 'Asa Sombria',
    biome: 'snowy_mountain',
    habitat: 'flying',
    archetype: 'Terror Alado',
    color: '#3b0764',
    accent: '#c084fc',
    belly: '#1e1b4b',
    eyeColor: '#f472b6',
    introDuration: 6.5,
    lore: 'Plana sobre picos nevados e mergulha com asas de envergadura dupla e grito ultrassônico.',
    counterTip: 'Ganhe altitude com W/↑ e use Turbo para quebrar o ângulo de mergulho do Vexwing.'
  },
  {
    id: 'blightjaw',
    name: 'Blightjaw',
    title: 'Mandíbula Tóxica',
    biome: 'fossil_graveyard',
    habitat: 'land',
    archetype: 'Necrófago Ósseo',
    color: '#3f3f46',
    accent: '#a3e635',
    belly: '#d6d3d1',
    eyeColor: '#84cc16',
    introDuration: 6.6,
    lore: 'Coberto por placas ósseas do cemitério fóssil e um crânio exposto com brilho radioativo.',
    counterTip: 'Colete Speed Pads e Esferas de Fogo para queimar qualquer penalidade de lentidão.'
  },
  {
    id: 'siltstalker',
    name: 'Siltstalker',
    title: 'Rastejante do Lodo',
    biome: 'jurassic_river',
    habitat: 'aquatic',
    swimType: 'plesio_eel',
    archetype: 'Leviatã Fluvial',
    color: '#0f766e',
    accent: '#2dd4bf',
    belly: '#99f6e4',
    eyeColor: '#facc15',
    introDuration: 6.5,
    lore: 'Predador aquático esguio com nadadeiras em remo e cauda em leme que caça nas correntezas.',
    counterTip: 'Alterne profundidade ou salte sobre cristas d’água para disparar à frente rapidamente.'
  },
  {
    id: 'chronotail',
    name: 'Chronotail',
    title: 'Cauda do Tempo',
    biome: 'alien_factory',
    habitat: 'land',
    archetype: 'Anomalia Crono',
    color: '#4c1d95',
    accent: '#e879f9',
    belly: '#0f172a',
    eyeColor: '#38bdf8',
    introDuration: 6.7,
    lore: 'Anomalia forjada em reatores alienígenas; anéis giratórios na cauda distorcem o espaço ao redor.',
    counterTip: 'Acelere no centro limpo e evite armadilhas roxas enquanto os anéis giram.'
  },
  {
    id: 'glarebeast',
    name: 'Glarebeast',
    title: 'Fera Ofuscante',
    biome: 'crystal_cavern',
    habitat: 'land',
    archetype: 'Predador de Cristal',
    color: '#164e63',
    accent: '#67e8f9',
    belly: '#083344',
    eyeColor: '#ffffff',
    introDuration: 6.5,
    lore: 'Seu dorso e ombros brotam aglomerados de quartzo prismático que refletem luz estonteante.',
    counterTip: 'Mantenha o ritmo sem tropeços nas estalagmites de cristal.'
  },
  {
    id: 'gorgeraptor',
    name: 'Gorgeraptor',
    title: 'Raptor Voraz',
    biome: 'migration_savanna',
    habitat: 'land',
    archetype: 'Alfa de Matilha',
    color: '#b45309',
    accent: '#fde047',
    belly: '#fef3c7',
    eyeColor: '#ef4444',
    introDuration: 6.4,
    lore: 'Alfa veloz das savanas migratórias com gola eriçada em leque e salto muscular descomunal.',
    counterTip: 'Combine trocas ágeis [A/D] com Pulo Duplo sobre cactos largos.'
  },
  {
    id: 'dunescourge',
    name: 'Dunescourge',
    title: 'Flagelo das Dunas',
    biome: 'desert',
    habitat: 'land',
    archetype: 'Quitinoso das Areias',
    color: '#92400e',
    accent: '#f59e0b',
    belly: '#fde68a',
    eyeColor: '#ff4757',
    introDuration: 6.5,
    lore: 'Carapaça segmentada de deserto com pinças dianteiras de quitina e cauda em chicote farpado.',
    counterTip: 'Use Ataque [Q] e Isca/Turbo para abrir vantagem nas dunas douradas.'
  },
  {
    id: 'mawcrest',
    name: 'Mawcrest',
    title: 'Crista Abissal',
    biome: 'beach_sea',
    habitat: 'aquatic',
    swimType: 'leviathan',
    archetype: 'Leviatã Abissal',
    color: '#1e1b4b',
    accent: '#38bdf8',
    belly: '#0f172a',
    eyeColor: '#00f5d4',
    introDuration: 6.6,
    lore: 'Predador abissal de antena bioluminescente na fronte e 4 nadadeiras de alta impulsão.',
    counterTip: 'Foque nos desvios limpos; cada 20m de vantagem despista Mawcrest!'
  },
  {
    id: 'kraken_fossil',
    name: 'Kraken Fóssil',
    title: 'Guardião dos Recifes',
    biome: 'ocean_surface',
    habitat: 'aquatic',
    swimType: 'cephalopod',
    archetype: 'Cefalópode Blindado',
    color: '#0f766e',
    accent: '#2dd4bf',
    belly: '#99f6e4',
    eyeColor: '#facc15',
    introDuration: 6.5,
    lore: 'Cefalópode pré-histórico de tentáculos articulados que persegue quem rouba seus ovos abissais.',
    counterTip: 'Combine saltos curtos e Turbo para quebrar o alcance dos tentáculos.'
  },
  {
    id: 'kronos_abyssal',
    name: 'Kronossauro Alfa',
    title: 'Terror dos Mares',
    biome: 'deep_ocean',
    habitat: 'aquatic',
    swimType: 'leviathan',
    archetype: 'Pliossauro Colossal',
    color: '#0c4a6e',
    accent: '#22d3ee',
    belly: '#e0f2fe',
    eyeColor: '#fde047',
    introDuration: 6.5,
    lore: 'Pliossauro gigante de mandíbula esmagadora e quatro grandes remos que domina águas abertas.',
    counterTip: 'Use Turbo aquático e alternância de profundidade para escapar da investida submersa.'
  },
  {
    id: 'mecha_stalker',
    name: 'Stalker Mecânico',
    title: 'Sentinela Ômega',
    biome: 'mecha_city',
    habitat: 'land',
    archetype: 'Caçador Cibernético',
    color: '#334155',
    accent: '#f43f5e',
    belly: '#64748b',
    eyeColor: '#38bdf8',
    introDuration: 6.5,
    lore: 'Predador robótico com visor térmico e propulsores traseiros projetado para recuperar núcleos furtados.',
    counterTip: 'Ataque [Q] ou use Bullet-Time [Shift] quando seu visor piscar em vermelho.'
  },
  {
    id: 'sky_harpy',
    name: 'Harpia Celeste',
    title: 'Soberana das Nuvens',
    biome: 'sky_canyon',
    habitat: 'flying',
    archetype: 'Rapina Colossal',
    color: '#4338ca',
    accent: '#f59e0b',
    belly: '#e0e7ff',
    eyeColor: '#fef08a',
    introDuration: 6.4,
    lore: 'Mergulha dos cânions celestes assim que sente seu ovo dourado deixar o ninho.',
    counterTip: 'Mantenha velocidade alta e evite tropeçar para não dar janela de mergulho.'
  },
  {
    id: 'quetzal_tyrant',
    name: 'Tirano Quetzal',
    title: 'Soberano dos Ventos',
    biome: 'sky_canyon',
    habitat: 'flying',
    archetype: 'Pterossauro Alfa',
    color: '#7f1d1d',
    accent: '#f59e0b',
    belly: '#fef3c7',
    eyeColor: '#fbbf24',
    introDuration: 6.4,
    lore: 'Pterossauro apex de bico em lança e crista solar que intercepta invasores em pleno voo.',
    counterTip: 'Alterne faixas aéreas e rasantes rápidos quando a sombra alada se aproximar.'
  }
];

export function normalizePredatorHabitat(habitat = 'land') {
  if (habitat === 'aquatic' || habitat === 'flying' || habitat === 'land') return habitat;
  if (habitat === 'amphibious') return 'aquatic';
  return 'land';
}

export function getPredatorsForHabitat(habitat = 'land') {
  const norm = normalizePredatorHabitat(habitat);
  const filtered = PREDATOR_CATALOG.filter((p) => (p.habitat || 'land') === norm);
  return filtered.length ? filtered : PREDATOR_CATALOG;
}

export function getPredatorSpec(id) {
  return PREDATOR_CATALOG.find((p) => p.id === id) || PREDATOR_CATALOG[0];
}

export function getPredatorForBiome(biomeId, habitat = null) {
  if (habitat) {
    const pool = getPredatorsForHabitat(habitat);
    const biomeMatch = pool.find((p) => p.biome === biomeId);
    if (biomeMatch) return biomeMatch;
    return pool[0];
  }
  return PREDATOR_CATALOG.find((p) => p.biome === biomeId) || PREDATOR_CATALOG[0];
}

export function pickRandomPredator(excludeId = null, habitat = null) {
  const basePool = habitat ? getPredatorsForHabitat(habitat) : PREDATOR_CATALOG;
  const pool = excludeId && basePool.length > 1
    ? basePool.filter((p) => p.id !== excludeId)
    : basePool;
  return pool[Math.floor(Math.random() * pool.length)] || basePool[0] || PREDATOR_CATALOG[0];
}

export function buildPredatorEggProp(accentColor = '#facc15') {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({
    color: '#fffbeb',
    roughness: 0.35,
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.55
  });
  const spotMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.95
  });
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.46), shellMat);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.32), shellMat);
  top.position.y = 0.32;
  const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.5), spotMat);
  spot1.position.y = 0.04;
  const spot2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.14), spotMat);
  spot2.position.y = -0.08;
  g.add(core, top, spot1, spot2);
  return g;
}

export function buildPredatorNestProp(habitat = 'land', accentColor = '#facc15') {
  const g = new THREE.Group();
  const norm = normalizePredatorHabitat(habitat);
  if (norm === 'aquatic') {
    const coralMat = new THREE.MeshStandardMaterial({
      color: '#0f766e',
      roughness: 0.6,
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.25
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.28, 1.48), coralMat);
    base.position.y = 0.14;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.36, 1.12), coralMat);
    rim.position.y = 0.24;
    g.add(base, rim);
    return g;
  }
  if (norm === 'flying') {
    const cliffMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.72 });
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9, transparent: true, opacity: 0.85 });
    const perch = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.24, 1.42), cliffMat);
    perch.position.y = 0.12;
    const fluff = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.14, 1.66), cloudMat);
    fluff.position.y = 0.04;
    g.add(perch, fluff);
    return g;
  }
  const twigMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.22, 1.36), twigMat);
  rim.position.y = 0.12;
  g.add(rim);
  return g;
}

export function buildPredatorModel(id) {
  const spec = getPredatorSpec(id);
  const root = new THREE.Group();
  root.name = `predator_${spec.id}`;

  const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.56, metalness: spec.id === 'ironhide_rex' ? 0.55 : 0.12 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: spec.belly, roughness: 0.68 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.accent,
    roughness: 0.35,
    emissive: new THREE.Color(spec.accent),
    emissiveIntensity: 0.35
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: spec.eyeColor,
    emissive: new THREE.Color(spec.eyeColor),
    emissiveIntensity: 1.4
  });
  const toothMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.25 });

  // Tronco principal multi-camadas + peitoral + ombros blindados
  const body = pivotAt(root, 0, 1.38, 0);
  vox(body, 1.25, 1.05, 2.05, 0, 0, 0, bodyMat);
  vox(body, 0.92, 0.28, 1.85, 0, -0.48, 0.04, bellyMat);
  vox(body, 1.38, 0.55, 0.85, 0, 0.18, -0.58, accentMat);
  vox(body, 0.42, 0.5, 0.55, -0.72, 0.28, -0.55, accentMat);
  vox(body, 0.42, 0.5, 0.55, 0.72, 0.28, -0.55, accentMat);

  // Crista dorsal / placas específicas de espécie
  for (let i = 0; i < 4; i++) {
    const h = spec.id === 'cindermaw' || spec.id === 'glarebeast' ? 0.52 - i * 0.06 : 0.36;
    vox(body, 0.24, h, 0.32, 0, 0.62 + h * 0.35, -0.6 + i * 0.48, accentMat);
  }

  // Cabeça inclinada para frente + mandíbula articulada + dentes + olhos luminosos
  const headPivot = pivotAt(body, 0, 0.52, -1.08);
  vox(headPivot, 0.95, 0.68, 1.22, 0, 0.16, -0.45, bodyMat);
  vox(headPivot, 0.78, 0.42, 0.88, 0, 0.18, -1.05, bodyMat);
  // Olhos
  vox(headPivot, 0.16, 0.16, 0.16, -0.45, 0.32, -0.62, eyeMat);
  vox(headPivot, 0.16, 0.16, 0.16, 0.45, 0.32, -0.62, eyeMat);

  // Mandíbula inferior articulada + fileira de presas
  const jaw = pivotAt(headPivot, 0, -0.1, -0.25);
  vox(jaw, 0.76, 0.24, 1.15, 0, -0.08, -0.65, bellyMat);
  for (const sx of [-0.26, -0.09, 0.09, 0.26]) {
    vox(headPivot, 0.1, 0.16, 0.1, sx, -0.05, -1.32, toothMat);
    vox(jaw, 0.09, 0.14, 0.09, sx, 0.08, -1.05, toothMat);
  }

  // Características únicas na cabeça / tronco
  let lure = null;
  if (spec.id === 'razorcrest' || spec.id === 'cindermaw' || spec.id === 'ironhide_rex') {
    vox(headPivot, 0.14, 0.65, 0.38, -0.28, 0.68, -0.35, accentMat);
    vox(headPivot, 0.14, 0.65, 0.38, 0.28, 0.68, -0.35, accentMat);
  } else if (spec.id === 'cryoclaw' || spec.id === 'glarebeast' || spec.id === 'voltspire') {
    vox(headPivot, 0.22, 0.72, 0.42, 0, 0.68, -0.45, accentMat);
    vox(headPivot, 0.16, 0.48, 0.24, -0.34, 0.56, -0.22, accentMat);
    vox(headPivot, 0.16, 0.48, 0.24, 0.34, 0.56, -0.22, accentMat);
  } else if (spec.id === 'mawcrest' || spec.id === 'kraken_fossil' || spec.id === 'kronos_abyssal') {
    lure = pivotAt(headPivot, 0, 0.56, -0.6);
    vox(lure, 0.1, 0.5, 0.1, 0, 0.22, -0.22, bodyMat);
    vox(lure, 0.28, 0.28, 0.28, 0, 0.48, -0.5, eyeMat);
    if (spec.id === 'kronos_abyssal') {
      vox(headPivot, 0.28, 0.34, 1.25, 0, 0.45, -0.65, accentMat);
    }
  } else if (spec.id === 'quetzal_tyrant') {
    vox(headPivot, 0.14, 0.62, 1.05, 0, 0.66, 0.08, accentMat);
    vox(headPivot, 0.28, 0.24, 1.32, 0, 0.14, -1.28, accentMat);
  } else if (spec.id === 'mecha_stalker') {
    vox(headPivot, 1.05, 0.24, 0.65, 0, 0.34, -0.68, eyeMat);
    vox(body, 0.45, 0.55, 0.85, -0.78, 0.42, 0.22, accentMat);
    vox(body, 0.45, 0.55, 0.85, 0.78, 0.42, 0.22, accentMat);
  } else if (spec.id === 'gorgeraptor') {
    // Gola de leque no pescoço
    vox(headPivot, 1.48, 0.95, 0.14, 0, 0.25, 0.08, accentMat);
  }

  const isAquatic = spec.habitat === 'aquatic';
  const isFlying = spec.habitat === 'flying';

  // Braços/Garras (ou pinças no Dunescourge, asas amplas nos voadores, nadadeiras nos aquáticos)
  let wingL = null;
  let wingR = null;
  const flippers = [];
  const tentacles = [];

  if (isFlying) {
    wingL = pivotAt(body, -0.58, 0.28, -0.1);
    vox(wingL, 2.25, 0.12, 0.92, -1.12, 0, 0.12, bodyMat);
    vox(wingL, 1.95, 0.08, 0.36, -1.05, 0.04, 0.48, accentMat);
    vox(wingL, 0.95, 0.07, 0.42, -2.35, -0.02, 0.25, bellyMat);
    wingR = pivotAt(body, 0.58, 0.28, -0.1);
    vox(wingR, 2.25, 0.12, 0.92, 1.12, 0, 0.12, bodyMat);
    vox(wingR, 1.95, 0.08, 0.36, 1.05, 0.04, 0.48, accentMat);
    vox(wingR, 0.95, 0.07, 0.42, 2.35, -0.02, 0.25, bellyMat);
    // Garras aéreas recolhidas (sem pernas bípedes de corrida terrestre)
    for (const sx of [-0.42, 0.42]) {
      vox(body, 0.22, 0.22, 0.52, sx, -0.52, 0.32, bodyMat);
      vox(body, 0.14, 0.14, 0.28, sx, -0.58, 0.62, accentMat);
    }
  } else if (isAquatic) {
    if (spec.swimType === 'cephalopod') {
      for (const sx of [-0.62, -0.24, 0.24, 0.62]) {
        const tent = pivotAt(body, sx, -0.22, 0.72);
        vox(tent, 0.24, 0.22, 1.35, 0, -0.05, 0.68, bodyMat);
        vox(tent, 0.16, 0.16, 0.95, 0, -0.12, 1.62, accentMat);
        tentacles.push(tent);
      }
      // Sifões laterais hidrodinâmicos
      vox(body, 0.28, 0.28, 0.85, -0.78, 0.1, -0.15, accentMat);
      vox(body, 0.28, 0.28, 0.85, 0.78, 0.1, -0.15, accentMat);
    } else {
      const fConfigs = [
        { x: -0.68, z: -0.52, s: -1 },
        { x: 0.68, z: -0.52, s: 1 },
        { x: -0.62, z: 0.55, s: -1 },
        { x: 0.62, z: 0.55, s: 1 }
      ];
      for (const fc of fConfigs) {
        const fl = pivotAt(body, fc.x, -0.32, fc.z);
        vox(fl, 1.15, 0.1, 0.46, fc.s * 0.56, -0.04, 0.08, bodyMat);
        vox(fl, 0.85, 0.08, 0.28, fc.s * 0.72, -0.04, 0.24, accentMat);
        flippers.push({ pivot: fl, side: fc.s, front: fc.z < 0 });
      }
    }
  } else {
    const clawLen = spec.id === 'dunescourge' || spec.id === 'cryoclaw' ? 0.72 : 0.45;
    vox(body, 0.24, 0.24, clawLen, -0.68, -0.14, -0.85, bodyMat);
    vox(body, 0.14, 0.14, 0.28, -0.68, -0.18, -0.98 - clawLen * 0.45, accentMat);
    vox(body, 0.24, 0.24, clawLen, 0.68, -0.14, -0.85, bodyMat);
    vox(body, 0.14, 0.14, 0.28, 0.68, -0.18, -0.98 - clawLen * 0.45, accentMat);
  }

  // Pernas articuladas robustas APENAS para predadores terrestres
  let legL = null;
  let legR = null;
  if (!isAquatic && !isFlying) {
    legL = pivotAt(root, -0.52, 0.92, 0.12);
    vox(legL, 0.42, 0.72, 0.48, 0, -0.34, 0, bodyMat);
    vox(legL, 0.48, 0.22, 0.68, 0, -0.82, -0.1, bellyMat);

    legR = pivotAt(root, 0.52, 0.92, 0.12);
    vox(legR, 0.42, 0.72, 0.48, 0, -0.34, 0, bodyMat);
    vox(legR, 0.48, 0.22, 0.68, 0, -0.82, -0.1, bellyMat);
  } else {
    body.position.y = isAquatic ? 1.02 : 1.52;
  }

  // Cauda articulada multi-segmentos (+ leme caudal para aquáticos, estabilizador aéreo para voadores)
  const tail = pivotAt(body, 0, 0.12, 1.05);
  vox(tail, 0.72, 0.62, 0.88, 0, 0, 0.44, bodyMat);
  vox(tail, 0.48, 0.42, 0.88, 0, 0.06, 1.25, bodyMat);
  if (isAquatic) {
    vox(tail, 0.16, 1.18, 0.72, 0, 0.08, 1.98, accentMat);
  } else if (isFlying) {
    vox(tail, 1.38, 0.1, 0.65, 0, 0.06, 1.88, accentMat);
  } else if (spec.id === 'ironhide_rex') {
    vox(tail, 0.75, 0.58, 0.68, 0, 0.1, 1.85, accentMat);
  } else if (spec.id === 'chronotail') {
    vox(tail, 0.95, 0.95, 0.16, 0, 0.08, 1.1, accentMat);
    vox(tail, 0.75, 0.75, 0.16, 0, 0.12, 1.65, eyeMat);
  } else if (spec.id === 'dunescourge') {
    vox(tail, 0.34, 0.55, 0.34, 0, 0.38, 1.72, accentMat);
    vox(tail, 0.22, 0.26, 0.42, 0, 0.68, 1.55, eyeMat);
  } else {
    vox(tail, 0.26, 0.24, 0.68, 0, 0.1, 1.92, accentMat);
  }

  // Anel luminoso vermelho de ameaça para diferenciar claramente Caçador vs Jogador
  const threatMat = new THREE.MeshBasicMaterial({
    color: '#ff2e4c',
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide
  });
  const threatRing = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.46, 24), threatMat);
  threatRing.rotation.x = -Math.PI / 2;
  threatRing.position.set(0, 0.05, 0);
  root.add(threatRing);

  return {
    root,
    spec,
    parts: { body, headPivot, jaw, legL, legR, tail, wingL, wingR, flippers, tentacles, lure, threatRing },
    phase: 0,
    update(dt, roarScale = 0, mode = 'chase') {
      if (threatRing) {
        const pulse = 0.5 + 0.5 * Math.sin(this.phase * 2.2);
        threatMat.opacity = 0.48 + pulse * 0.4;
        threatRing.scale.setScalar(0.95 + pulse * 0.12);
      }
      const isIntro = mode === 'intro';
      const speedMult = isIntro ? 4.4 : (isAquatic ? 8.2 : isFlying ? 7.8 : 11.0);
      this.phase += dt * speedMult;
      const breathe = Math.sin(this.phase * 1.4);
      const roarPulse = Math.max(0, Math.sin(this.phase * 1.8));

      if (isAquatic) {
        body.position.y = 1.02 + Math.sin(this.phase * 0.85) * (isIntro ? 0.08 : 0.14);
        body.rotation.x = isIntro ? 0.04 + roarScale * 0.06 * roarPulse : Math.sin(this.phase * 0.75) * 0.07;
        body.rotation.z = Math.cos(this.phase * 0.55) * 0.08;
        headPivot.rotation.x = isIntro ? -0.14 * roarScale * (0.4 + 0.6 * roarPulse) : 0.04;
        headPivot.rotation.z = Math.sin(this.phase * 0.8) * 0.06;
        tail.rotation.y = Math.sin(this.phase * 1.15) * (isIntro ? 0.35 : 0.48);
        jaw.rotation.x = -(isIntro
          ? (0.16 + roarScale * (0.28 + roarPulse * 0.36))
          : (0.14 + Math.abs(Math.sin(this.phase * 0.8)) * 0.30 + roarScale * 0.32));
        for (const fl of flippers) {
          const offset = fl.front ? 0 : Math.PI * 0.65;
          const stroke = Math.sin(this.phase * 0.95 + offset);
          fl.pivot.rotation.z = fl.side * (0.18 + stroke * (isIntro ? 0.24 : 0.42));
          fl.pivot.rotation.x = stroke * 0.22;
        }
        for (let i = 0; i < tentacles.length; i++) {
          const tent = tentacles[i];
          tent.rotation.x = Math.sin(this.phase * 1.1 + i * 0.9) * (isIntro ? 0.22 : 0.38);
          tent.rotation.y = Math.cos(this.phase * 0.85 + i * 0.7) * 0.25;
        }
        if (lure) lure.rotation.y += dt * 4.0;
        return;
      }

      if (isFlying) {
        body.position.y = 1.52 + Math.sin(this.phase * 0.95) * (isIntro ? 0.10 : 0.18);
        body.rotation.x = isIntro ? 0.05 + roarScale * 0.07 * roarPulse : -0.08;
        body.rotation.z = Math.sin(this.phase * 0.5) * 0.09;
        headPivot.rotation.x = isIntro ? -0.15 * roarScale * (0.4 + 0.6 * roarPulse) : 0.06;
        headPivot.rotation.z = Math.sin(this.phase * 2.2) * 0.05;
        tail.rotation.y = Math.sin(this.phase * 0.65) * 0.18;
        tail.rotation.x = Math.cos(this.phase * 0.95) * 0.14;
        jaw.rotation.x = -(isIntro
          ? (0.14 + roarScale * (0.28 + roarPulse * 0.34))
          : (0.16 + Math.abs(Math.sin(this.phase * 0.9)) * 0.30 + roarScale * 0.35));
        if (wingL && wingR) {
          const flap = Math.sin(this.phase * (isIntro ? 1.15 : 1.35)) * (isIntro ? 0.48 : 0.62);
          wingL.rotation.z = flap + (isIntro ? 0.18 : 0.08);
          wingR.rotation.z = -flap - (isIntro ? 0.18 : 0.08);
        }
        return;
      }

      if (isIntro) {
        if (legL && legR) {
          legL.rotation.x = 0.14 + Math.max(0, Math.sin(this.phase * 0.9)) * 0.10;
          legR.rotation.x = -0.14 - Math.max(0, -Math.sin(this.phase * 0.9)) * 0.10;
        }
        body.position.y = 1.38 + breathe * 0.04;
        body.rotation.x = 0.06 + roarScale * 0.08 * roarPulse;
        headPivot.rotation.x = -0.16 * roarScale * (0.4 + 0.6 * roarPulse);
        headPivot.rotation.z = Math.sin(this.phase * 3.1) * 0.07 * roarScale;
        tail.rotation.y = Math.sin(this.phase * 0.9) * 0.34;
        jaw.rotation.x = -(0.14 + roarScale * (0.28 + roarPulse * 0.36));
        if (lure) lure.rotation.y += dt * 4.2;
        return;
      }

      const swing = Math.sin(this.phase) * 0.52;
      if (legL && legR) {
        legL.rotation.x = swing;
        legR.rotation.x = -swing;
      }
      body.position.y = 1.38 + Math.abs(Math.sin(this.phase)) * 0.14;
      body.rotation.x = 0;
      headPivot.rotation.x = 0;
      headPivot.rotation.z = 0;
      tail.rotation.y = Math.sin(this.phase * 0.7) * 0.24;
      jaw.rotation.x = -(0.18 + Math.abs(Math.sin(this.phase * 0.9)) * 0.32 + roarScale * 0.35);
      if (lure) lure.rotation.y += dt * 3.5;
    }
  };
}
