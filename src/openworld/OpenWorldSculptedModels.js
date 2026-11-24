// Modelos 3D Voxel Esculpidos Articulados & Animados para o Mundo Aberto (Parte 5.1 & 5.3).
// Substitui 100% das primitivas geométricas antigas (como o boss quadrado e o bicho vermelho parecido com capivara)
// por criaturas, bosses, plantas, ninhos e relíquias com silhueta rica, articulação e catálogo completo.
import * as THREE from 'three';

const BOX = new THREE.BoxGeometry(1, 1, 1);

function part(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export const OPEN_WORLD_ENTITIES_CATALOG = Object.freeze({
  colossal_basalt_rex: {
    id: 'colossal_basalt_rex',
    category: 'boss',
    replacesLegacy: 'boxy_boss',
    name: 'Ignisaur, Titã de Basalto',
    description: 'Predador alfa vulcânico revestido por placas de obsidiana e núcleo peitoral incandescente.',
    effect: 'Causa ondas sísmicas em área; derruba Escamas Vulcânicas Lendárias ao ser derrotado.',
    usageTip: 'Esquive quando as placas dorsais brilharem em laranja e ataque o flanco após o pisão!'
  },
  crimson_ankylo_prowler: {
    id: 'crimson_ankylo_prowler',
    category: 'creature',
    replacesLegacy: 'red_capybara_box',
    name: 'Dracopelta Escarlate',
    description: 'Couraçado jurássico rubro com chifre nasal curvo, osteodermas serrilhadas e cauda de maça.',
    effect: 'Fornece Placas Quitinosas Rubras para forjar armaduras e aprimorar o ninho.',
    usageTip: 'Nunca ataque de frente durante a investida; contorne pela lateral para evitar a clava caudal.'
  },
  azure_crest_hadrosaur: {
    id: 'azure_crest_hadrosaur',
    category: 'creature',
    replacesLegacy: 'herbivore_block',
    name: 'Parasauro Crista-Celeste',
    description: 'Herbívoro pacífico de manada cuja crista tubular emite cantos ressonantes pelo vale.',
    effect: 'Concede Frutas Selecionadas ao ser protegido de predadores em missões de escolta.',
    usageTip: 'Aproxime-se sem correr para não assustar a manada e desbloquear bônus de velocidade.'
  },
  spore_maw_flora: {
    id: 'spore_maw_flora',
    category: 'plant',
    replacesLegacy: 'cylinder_plant',
    name: 'Flor-Âmbar Bioluminescente',
    description: 'Planta pré-histórica de pétalas carnudas e caule espiralado que pulsa com néctar curativo.',
    effect: 'Restaura +35% de Vida e +40% de Vigor ou serve de ingrediente de Alquimia.',
    usageTip: 'Colha quando as pétalas estiverem abertas ao entardecer para obter o dobro de essência.'
  },
  woven_royal_nest: {
    id: 'woven_royal_nest',
    category: 'structure',
    replacesLegacy: 'flat_nest_ring',
    name: 'Ninho Ancestral Entrelaçado',
    description: 'Base construída com galhos fossilizados, samambaias macias, totens ósseos e brasas protetoras.',
    effect: 'Ponto seguro de descanso longo, evolução de filhotes, armazenamento e crafting.',
    usageTip: 'Aprimore com Placas e Cristais para resistir aos cercos noturnos de predadores!'
  },
  ancient_sun_relic: {
    id: 'ancient_sun_relic',
    category: 'item',
    replacesLegacy: 'floating_cube_item',
    name: 'Relíquia Solar Cravada em Âmbar',
    description: 'Pedestal rúnico escalonado sustentando um cristal facetado com DNA primordial preservado.',
    effect: 'Concede XP de evolução, desbloqueia entradas do Bestiário e avança a história principal.',
    usageTip: 'Siga o brilho dourado e o som harmônico próximo às ruínas antigas.'
  }
});

/**
 * Constrói qualquer entidade esculpida do Mundo Aberto com hierarquia articulada (cabeça, mandíbula, cauda, patas).
 */
export function buildOpenWorldSculptedEntity(entityId = 'colossal_basalt_rex') {
  const meta = OPEN_WORLD_ENTITIES_CATALOG[entityId] || OPEN_WORLD_ENTITIES_CATALOG.colossal_basalt_rex;
  const root = new THREE.Group();
  root.name = `ow_${meta.id}`;
  root.userData = { entityId: meta.id, meta, animParts: {} };

  if (meta.id === 'colossal_basalt_rex') {
    const basalt = new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.72, metalness: 0.18 });
    const armor = new THREE.MeshStandardMaterial({ color: '#292524', roughness: 0.52, metalness: 0.35 });
    const magma = new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ea580c', emissiveIntensity: 0.85, roughness: 0.25 });
    const bone = new THREE.MeshStandardMaterial({ color: '#f5ecd0', roughness: 0.4 });

    const body = new THREE.Group();
    body.position.y = 2.1;
    root.add(body);
    part(body, 1.85, 1.55, 2.75, 0, 0, 0, basalt);
    part(body, 2.05, 0.45, 2.2, 0, 0.78, -0.1, armor);
    const core = part(body, 0.75, 0.65, 0.35, 0, -0.1, -1.32, magma);

    // Cristas dorsais vulcânicas escalonadas
    const dorsalPlates = [];
    for (let i = 0; i < 5; i++) {
      const h = 0.55 + (2 - Math.abs(i - 2)) * 0.28;
      dorsalPlates.push(part(body, 0.26, h, 0.38, 0, 1.05 + h * 0.35, -0.95 + i * 0.48, magma));
    }

    // Cabeça + Mandíbula articulada + Chifres de Obsidiana
    const head = new THREE.Group();
    head.position.set(0, 0.95, -1.55);
    body.add(head);
    part(head, 1.35, 0.95, 1.55, 0, 0.25, -0.55, basalt);
    part(head, 1.45, 0.28, 0.9, 0, 0.72, -0.35, armor);
    part(head, 0.22, 0.55, 0.26, -0.58, 0.95, -0.15, magma);
    part(head, 0.22, 0.55, 0.26, 0.58, 0.95, -0.15, magma);
    for (const sx of [-0.46, 0.46]) {
      for (let t = 0; t < 4; t++) part(head, 0.11, 0.24, 0.11, sx, -0.26, -0.35 - t * 0.28, bone);
    }
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.18, -0.15);
    head.add(jaw);
    part(jaw, 1.12, 0.34, 1.35, 0, -0.12, -0.52, armor);

    // Cauda articulada em 3 segmentos com espinhos
    const tail = new THREE.Group();
    tail.position.set(0, 0.25, 1.38);
    body.add(tail);
    part(tail, 1.15, 0.95, 1.25, 0, 0, 0.55, basalt);
    part(tail, 0.78, 0.68, 1.25, 0, 0.06, 1.65, basalt);
    part(tail, 0.45, 0.42, 1.1, 0, 0.12, 2.65, magma);

    // Pernas musculosas articuladas + garras
    const legs = [];
    for (const sx of [-0.88, 0.88]) {
      const leg = new THREE.Group();
      leg.position.set(sx, -0.45, 0.15);
      body.add(leg);
      part(leg, 0.62, 1.1, 0.78, 0, -0.35, 0, basalt);
      part(leg, 0.48, 0.95, 0.56, 0, -1.15, 0.12, armor);
      part(leg, 0.64, 0.28, 0.85, 0, -1.62, -0.12, basalt);
      part(leg, 0.14, 0.2, 0.32, -0.18, -1.64, -0.58, bone);
      part(leg, 0.14, 0.2, 0.32, 0.18, -1.64, -0.58, bone);
      legs.push(leg);
    }

    root.userData.animParts = { body, head, jaw, tail, legs, core, dorsalPlates };
    return root;
  }

  if (meta.id === 'crimson_ankylo_prowler' || meta.id === 'azure_crest_hadrosaur') {
    const isCrimson = meta.id === 'crimson_ankylo_prowler';
    const skin = new THREE.MeshStandardMaterial({ color: isCrimson ? '#9f1239' : '#0284c7', roughness: 0.58 });
    const shell = new THREE.MeshStandardMaterial({ color: isCrimson ? '#4c0519' : '#0369a1', roughness: 0.46, metalness: 0.15 });
    const accent = new THREE.MeshStandardMaterial({ color: isCrimson ? '#fbbf24' : '#38bdf8', emissive: isCrimson ? '#78350f' : '#0284c7', emissiveIntensity: 0.28 });

    const body = new THREE.Group();
    body.position.y = 0.95;
    root.add(body);
    part(body, isCrimson ? 1.18 : 0.86, 0.74, 1.56, 0, 0, 0, skin);
    part(body, isCrimson ? 1.34 : 0.72, 0.26, 1.42, 0, 0.38, 0, shell);

    // Espinhos laterais de couraça (Dracopelta) ou listras (Hadrossauro)
    for (let i = -1; i <= 1; i++) {
      part(body, isCrimson ? 0.26 : 0.08, 0.18, 0.22, isCrimson ? -0.72 : -0.44, 0.28, i * 0.44, accent);
      part(body, isCrimson ? 0.26 : 0.08, 0.18, 0.22, isCrimson ? 0.72 : 0.44, 0.28, i * 0.44, accent);
    }

    const head = new THREE.Group();
    head.position.set(0, 0.32, -0.86);
    body.add(head);
    part(head, 0.58, 0.46, 0.68, 0, 0.08, -0.28, skin);
    if (isCrimson) {
      // Chifre nasal curvo distinto (jamais parecerá capivara!)
      part(head, 0.16, 0.38, 0.18, 0, 0.38, -0.48, accent);
    } else {
      // Crista tubular longa inclinada para trás do Parasaurolophus
      part(head, 0.18, 0.22, 0.86, 0, 0.42, 0.16, accent);
    }

    const tail = new THREE.Group();
    tail.position.set(0, 0.14, 0.78);
    body.add(tail);
    part(tail, 0.44, 0.36, 0.92, 0, 0, 0.42, skin);
    if (isCrimson) {
      // Clava óssea pesada na ponta da cauda
      part(tail, 0.68, 0.38, 0.54, 0, 0, 0.96, accent);
    }

    const legs = [];
    for (const [lx, lz] of [[-0.44, -0.46], [0.44, -0.46], [-0.46, 0.46], [0.46, 0.46]]) {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.26, lz);
      body.add(leg);
      part(leg, 0.28, 0.68, 0.3, 0, -0.32, 0, shell);
      legs.push(leg);
    }
    root.userData.animParts = { body, head, tail, legs };
    return root;
  }

  if (meta.id === 'spore_maw_flora') {
    const stemMat = new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.75 });
    const petalMat = new THREE.MeshStandardMaterial({ color: '#ec4899', emissive: '#be185d', emissiveIntensity: 0.45, roughness: 0.35 });
    const coreMat = new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#facc15', emissiveIntensity: 0.95 });

    part(root, 0.56, 0.18, 0.56, 0, 0.09, 0, stemMat);
    part(root, 0.24, 0.72, 0.24, 0, 0.45, 0, stemMat);
    const petals = [];
    for (let k = 0; k < 6; k++) {
      const pGroup = new THREE.Group();
      pGroup.position.set(0, 0.82, 0);
      pGroup.rotation.y = (k * Math.PI) / 3;
      root.add(pGroup);
      part(pGroup, 0.28, 0.12, 0.52, 0, 0.08, 0.32, petalMat);
      petals.push(pGroup);
    }
    const core = part(root, 0.32, 0.34, 0.32, 0, 0.92, 0, coreMat);
    root.userData.animParts = { petals, core };
    return root;
  }

  if (meta.id === 'woven_royal_nest') {
    const twig = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.88 });
    const moss = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.82 });
    const eggMat = new THREE.MeshStandardMaterial({ color: '#fef3c7', emissive: '#d97706', emissiveIntensity: 0.18, roughness: 0.32 });
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI * 2) / 12;
      const seg = part(root, 0.62, 0.38, 0.34, Math.cos(a) * 1.25, 0.19, Math.sin(a) * 1.25, k % 2 ? twig : moss);
      seg.rotation.y = -a;
    }
    part(root, 2.1, 0.14, 2.1, 0, 0.07, 0, moss);
    const eggs = [
      part(root, 0.34, 0.48, 0.34, -0.28, 0.34, -0.14, eggMat),
      part(root, 0.32, 0.45, 0.32, 0.26, 0.32, 0.18, eggMat),
      part(root, 0.3, 0.42, 0.3, 0.04, 0.31, -0.26, eggMat)
    ];
    root.userData.animParts = { eggs };
    return root;
  }

  // ancient_sun_relic
  const stone = new THREE.MeshStandardMaterial({ color: '#44403c', roughness: 0.8 });
  const crystal = new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#fbbf24', emissiveIntensity: 0.82, roughness: 0.15, metalness: 0.3 });
  part(root, 1.1, 0.22, 1.1, 0, 0.11, 0, stone);
  part(root, 0.78, 0.24, 0.78, 0, 0.34, 0, stone);
  const gem = new THREE.Group();
  gem.position.set(0, 1.05, 0);
  root.add(gem);
  part(gem, 0.36, 0.68, 0.36, 0, 0, 0, crystal);
  part(gem, 0.52, 0.32, 0.52, 0, 0, 0, crystal);
  root.userData.animParts = { gem };
  return root;
}

/**
 * Anima proceduralmente qualquer entidade esculpida do Mundo Aberto em 60 FPS.
 */
export function animateOpenWorldEntity(root, elapsed = 0, { moving = false, attacking = false } = {}) {
  const p = root?.userData?.animParts;
  if (!p) return;
  if (p.body) {
    const baseY = root.userData.entityId === 'colossal_basalt_rex' ? 2.1 : 0.95;
    p.body.position.y = baseY + Math.sin(elapsed * 2.5) * 0.05;
  }
  if (p.tail) {
    p.tail.rotation.y = Math.sin(elapsed * (moving ? 5.2 : 2.1)) * 0.24;
  }
  if (p.jaw) {
    p.jaw.rotation.x = attacking ? 0.48 : Math.max(0, Math.sin(elapsed * 1.8) * 0.12);
  }
  if (Array.isArray(p.legs)) {
    p.legs.forEach((leg, idx) => {
      leg.rotation.x = moving ? Math.sin(elapsed * 7.5 + (idx % 2) * Math.PI) * 0.42 : 0;
    });
  }
  if (Array.isArray(p.petals)) {
    const open = 0.22 + Math.sin(elapsed * 1.6) * 0.14;
    p.petals.forEach((pt) => { pt.rotation.x = open; });
  }
  if (p.gem) {
    p.gem.rotation.y = elapsed * 1.4;
    p.gem.position.y = 1.05 + Math.sin(elapsed * 2.4) * 0.12;
  }
}
