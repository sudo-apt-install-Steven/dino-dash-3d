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
    archetype: 'Terror Alado',
    color: '#3b0764',
    accent: '#c084fc',
    belly: '#1e1b4b',
    eyeColor: '#f472b6',
    introDuration: 6.5,
    lore: 'Plana sobre picos nevados e mergulha com asas de envergadura dupla e grito ultrassônico.',
    counterTip: 'Pule com precisão sobre pedras baixas; velocidade constante afasta Vexwing.'
  },
  {
    id: 'blightjaw',
    name: 'Blightjaw',
    title: 'Mandíbula Tóxica',
    biome: 'fossil_graveyard',
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
    archetype: 'Anfíbio Fluvial',
    color: '#0f766e',
    accent: '#2dd4bf',
    belly: '#99f6e4',
    eyeColor: '#facc15',
    introDuration: 6.5,
    lore: 'Híbrido anfíbio de focinho longo serrilhado e crista dorsal em leme que caça às margens do rio.',
    counterTip: 'Aproveite Troncos no Rio e rampas para disparar à frente rapidamente.'
  },
  {
    id: 'chronotail',
    name: 'Chronotail',
    title: 'Cauda do Tempo',
    biome: 'alien_factory',
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
    archetype: 'Leviatã Terrestre',
    color: '#1e1b4b',
    accent: '#38bdf8',
    belly: '#0f172a',
    eyeColor: '#00f5d4',
    introDuration: 6.6,
    lore: 'Predador abissal de antena bioluminescente na fronte e bocarra desproporcional repleta de presas.',
    counterTip: 'Foque nos desvios limpos; cada 20m de vantagem despista Mawcrest!'
  }
];

export function getPredatorSpec(id) {
  return PREDATOR_CATALOG.find((p) => p.id === id) || PREDATOR_CATALOG[0];
}

export function getPredatorForBiome(biomeId) {
  return PREDATOR_CATALOG.find((p) => p.biome === biomeId) || PREDATOR_CATALOG[0];
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
  } else if (spec.id === 'mawcrest') {
    lure = pivotAt(headPivot, 0, 0.56, -0.6);
    vox(lure, 0.1, 0.5, 0.1, 0, 0.22, -0.22, bodyMat);
    vox(lure, 0.28, 0.28, 0.28, 0, 0.48, -0.5, eyeMat);
  } else if (spec.id === 'gorgeraptor') {
    // Gola de leque no pescoço
    vox(headPivot, 1.48, 0.95, 0.14, 0, 0.25, 0.08, accentMat);
  }

  // Braços/Garras (ou pinças no Dunescourge, asas duplas no Vexwing)
  let wingL = null;
  let wingR = null;
  if (spec.id === 'vexwing') {
    wingL = pivotAt(body, -0.62, 0.25, -0.1);
    vox(wingL, 1.85, 0.12, 0.85, -0.92, 0, 0.1, bodyMat);
    vox(wingL, 1.65, 0.08, 0.32, -0.85, 0.04, 0.45, accentMat);
    wingR = pivotAt(body, 0.62, 0.25, -0.1);
    vox(wingR, 1.85, 0.12, 0.85, 0.92, 0, 0.1, bodyMat);
    vox(wingR, 1.65, 0.08, 0.32, 0.85, 0.04, 0.45, accentMat);
  } else {
    const clawLen = spec.id === 'dunescourge' || spec.id === 'cryoclaw' ? 0.72 : 0.45;
    vox(body, 0.24, 0.24, clawLen, -0.68, -0.14, -0.85, bodyMat);
    vox(body, 0.14, 0.14, 0.28, -0.68, -0.18, -0.98 - clawLen * 0.45, accentMat);
    vox(body, 0.24, 0.24, clawLen, 0.68, -0.14, -0.85, bodyMat);
    vox(body, 0.14, 0.14, 0.28, 0.68, -0.18, -0.98 - clawLen * 0.45, accentMat);
  }

  // Pernas articuladas robustas
  const legL = pivotAt(root, -0.52, 0.92, 0.12);
  vox(legL, 0.42, 0.72, 0.48, 0, -0.34, 0, bodyMat);
  vox(legL, 0.48, 0.22, 0.68, 0, -0.82, -0.1, bellyMat);

  const legR = pivotAt(root, 0.52, 0.92, 0.12);
  vox(legR, 0.42, 0.72, 0.48, 0, -0.34, 0, bodyMat);
  vox(legR, 0.48, 0.22, 0.68, 0, -0.82, -0.1, bellyMat);

  // Cauda articulada multi-segmentos (+ anéis crono / clava / aguilhão)
  const tail = pivotAt(body, 0, 0.12, 1.05);
  vox(tail, 0.72, 0.62, 0.88, 0, 0, 0.44, bodyMat);
  vox(tail, 0.48, 0.42, 0.88, 0, 0.06, 1.25, bodyMat);
  if (spec.id === 'ironhide_rex') {
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

  return {
    root,
    spec,
    parts: { body, headPivot, jaw, legL, legR, tail, wingL, wingR, lure },
    phase: 0,
    update(dt, roarScale = 0) {
      this.phase += dt * 11;
      const swing = Math.sin(this.phase) * 0.52;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      body.position.y = 1.38 + Math.abs(Math.sin(this.phase)) * 0.14;
      tail.rotation.y = Math.sin(this.phase * 0.7) * 0.24;
      jaw.rotation.x = 0.18 + Math.abs(Math.sin(this.phase * 0.9)) * 0.32 + roarScale * 0.35;
      if (wingL && wingR) {
        const flap = Math.sin(this.phase * 1.1) * 0.52;
        wingL.rotation.z = flap;
        wingR.rotation.z = -flap;
      }
      if (lure) {
        lure.rotation.y += dt * 3.5;
      }
    }
  };
}
