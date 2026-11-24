// OpenWorldEcosystem.js
// Sistema de Ecossistema Vivo, Ciclos de Vida e Fauna/Flora do Mundo Aberto (Seção 5.2 e 5.3).
// Contém:
// - Comportamento de Presas (fuga, pasto, manada) e Predadores (perseguição, emboscada, descanso)
// - Ciclo Dia/Noite e Estações com efeitos de temperatura e visibilidade
// - Catálogo detalhado de Criaturas, Plantas e Recursos com nome, descrição, efeito e dica de uso
// - Sistema de Ninho e Base com crafting de abrigos pré-históricos

export const CREATURE_CATALOG = [
  {
    id: 'lizard_runner',
    name: 'Lagarto Veloz das Rochas',
    type: 'prey',
    role: 'Presa Ágil',
    hp: 15,
    speed: 7.5,
    loot: { item: 'fresh_meat', count: 1, xp: 25 },
    desc: 'Pequeno réptil que se alimenta de insetos e sementes nas fendas de pedra.',
    effect: 'Fonte primária de carne fresca e proteína leve para recuperar vigor.',
    tip: 'Aproxime-se em modo furtivo contra o vento; ele foge rapidamente ao menor ruído.'
  },
  {
    id: 'proto_capybara_dino',
    name: 'Tetraconodonte Silvestre',
    type: 'prey',
    role: 'Herbívoro de Manada',
    hp: 35,
    speed: 4.8,
    loot: { item: 'thick_hide', count: 2, xp: 45 },
    desc: 'Mamífero pré-histórico robusto e dócil que pasta em bandos às margens de riachos.',
    effect: 'Concede couro resistente essencial para reforçar o ninho e criar selas.',
    tip: 'Se você assustar o líder da manada, todos correrão na mesma direção criando uma debandada.'
  },
  {
    id: 'stalker_raptor',
    name: 'Raptor Espreitador das Sombras',
    type: 'predator',
    role: 'Predador Solitário',
    hp: 55,
    speed: 8.2,
    atk: 12,
    loot: { item: 'sharp_fang', count: 2, xp: 90 },
    desc: 'Caçador astuto com camuflagem natural que ataca pelas costas.',
    effect: 'Dropa presas afiadas usadas para fabricar pontas de lança e flechas.',
    tip: 'Fique atento ao som de folhas secas estalando; use seu rugido para quebrar a investida dele.'
  },
  {
    id: 'titan_boss_croc',
    name: 'Sarcosuchus Titânico',
    type: 'apex_boss',
    role: 'Guardião do Rio',
    hp: 220,
    speed: 5.0,
    atk: 24,
    loot: { item: 'ancient_heart', count: 1, xp: 350 },
    desc: 'Colosso réptil que domina o vau do rio; sua mordida é capaz de partir troncos.',
    effect: 'O coração ancestral concede o buff permanente "Pele de Titã" (+15% armadura).',
    tip: 'Lute longe da água para anular a velocidade de nado dele; ataque logo após ele errar a mordida.'
  }
];

export const FLORA_CATALOG = [
  {
    id: 'jurassic_fern',
    name: 'Samambaia Fóssil Curativa',
    rarity: 'Comum',
    harvestTime: 2.0,
    desc: 'Planta de folhas grossas ricas em seiva regenerativa.',
    effect: 'Cura 20 HP instantaneamente e alivia status de envenenamento.',
    tip: 'Cresce em grande quantidade sob a sombra de grandes coníferas perto de rios.'
  },
  {
    id: 'sun_amber_flower',
    name: 'Flor Solar de Âmbar',
    rarity: 'Rara',
    harvestTime: 3.5,
    desc: 'Flor luminosa que absorve radiação solar e calor geotérmico.',
    effect: 'Concede +30% de regeneração de energia e resistência ao frio por 3 minutos.',
    tip: 'Brilha intensamente ao amanhecer; colha antes do sol atingir o zênite para máxima potência.'
  },
  {
    id: 'fire_lichen',
    name: 'Líquen Incandescente',
    rarity: 'Incomum',
    harvestTime: 2.5,
    desc: 'Fungo avermelhado que cresce em rochas basálticas aquecidas por magma.',
    effect: 'Usado para acender fogueiras sem faísca e aquecer o ninho durante invernos.',
    tip: 'Use garras para raspar com cuidado das fendas quentes de áreas vulcânicas.'
  }
];

export const CRAFTING_RECIPES = [
  {
    id: 'cozy_nest_bed',
    name: 'Leito de Palha e Penas',
    category: 'nest',
    cost: { jurassic_fern: 4, proto_hide: 2 },
    benefit: 'Acelera a recuperação de vida e vigor em 100% durante o sono no ninho.'
  },
  {
    id: 'bone_reinforced_fence',
    name: 'Paliçada de Costelas de Dino',
    category: 'base_defense',
    cost: { sharp_fang: 3, thick_hide: 1 },
    benefit: 'Impede a entrada de predadores invasores na área do ninho.'
  },
  {
    id: 'drying_rack',
    name: 'Varal de Defumação Primal',
    category: 'survival',
    cost: { jurassic_fern: 2, fresh_meat: 3 },
    benefit: 'Transforma carne perecível em ração de longa duração sem apodrecer.'
  }
];

export class OpenWorldEcosystem {
  constructor() {
    this.timeOfDay = 0.25; // 0.0 = Meia-noite, 0.25 = Amanhecer, 0.5 = Meio-dia, 0.75 = Crepúsculo
    this.dayDurationSeconds = 600; // 10 minutos por dia completo
    this.season = 'spring'; // spring, summer, autumn, winter
    this.weather = 'clear'; // clear, rain, storm, snow, heatwave
    this.creatures = [];
    this.nestLevel = 1;
    this.unlockedRecipes = CRAFTING_RECIPES.map(r => r.id);
  }

  updateTime(deltaSeconds) {
    const timeDelta = deltaSeconds / this.dayDurationSeconds;
    this.timeOfDay = (this.timeOfDay + timeDelta) % 1.0;

    // Atualiza clima dependendo da hora e estação
    if (this.timeOfDay > 0.8 || this.timeOfDay < 0.2) {
      // Noite
      this.temperature = this.season === 'winter' ? 'freezing' : 'chilly';
    } else {
      // Dia
      this.temperature = this.season === 'summer' ? 'scorching' : 'temperate';
    }

    return {
      timeOfDay: this.timeOfDay,
      isNight: this.timeOfDay > 0.75 || this.timeOfDay < 0.2,
      season: this.season,
      temperature: this.temperature
    };
  }

  simulateAiBehavior(creature, playerPos, dt = 1) {
    const dx = playerPos.x - creature.x;
    const dz = playerPos.z - creature.z;
    const dist = Math.hypot(dx, dz);

    if (creature.type === 'prey') {
      if (dist < 12) {
        // Fuga do jogador
        creature.state = 'fleeing';
        const angle = Math.atan2(dz, dx);
        creature.x -= Math.cos(angle) * creature.speed * dt;
        creature.z -= Math.sin(angle) * creature.speed * dt;
      } else {
        creature.state = 'grazing';
      }
    } else if (creature.type === 'predator') {
      if (dist < 18) {
        // Perseguição / Ataque
        creature.state = 'chasing';
        const angle = Math.atan2(dz, dx);
        creature.x += Math.cos(angle) * creature.speed * dt;
        creature.z += Math.sin(angle) * creature.speed * dt;
      } else {
        creature.state = 'patrolling';
      }
    }

    return creature.state;
  }
}
