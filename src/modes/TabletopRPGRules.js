// TabletopRPGRules.js
// Sistema completo de Regras do RPG de Mesa Ilustrado Dino Dash 3D (Seção 2.8).
// Contém:
// - 6 Atributos (Força, Agilidade, Vigor, Astúcia, Instinto, Presença)
// - 12 Perícias clássicas
// - 8 Arquétipos de Dinossauro com árvores de habilidades
// - Sistema de Níveis 1 a 20 e progressão de XP
// - Condições de Status com ícones
// - Sistema de Descanso Curto e Longo
// - Testes de Salvaguarda contra a Morte (Death Saves 3 sucessos / 3 falhas)

export const ATTRIBUTES = [
  { id: 'forca', label: 'Força', abbr: 'FOR', desc: 'Poder físico, mordidas, investidas e salto pesado' },
  { id: 'agilidade', label: 'Agilidade', abbr: 'AGI', desc: 'Velocidade, esquiva, equilíbrio e reflexos rápidos' },
  { id: 'vigor', label: 'Vigor', abbr: 'VIG', desc: 'Resistência a dano, veneno, clima severo e vitalidade' },
  { id: 'astucia', label: 'Astúcia', abbr: 'AST', desc: 'Inteligência prática, armadilhas, memória e conhecimento arcaico' },
  { id: 'instinto', label: 'Instinto', abbr: 'INS', desc: 'Percepção sensorial, intuição primal, cura natural e sobrevivência' },
  { id: 'presenca', label: 'Presença', abbr: 'PRE', desc: 'Imponência, rugidos aterrorizantes, liderança de bando e moral' }
];

export const SKILLS = [
  { id: 'atletismo', name: 'Atletismo', attr: 'forca', icon: '💪' },
  { id: 'acrobacia', name: 'Acrobacia', attr: 'agilidade', icon: '🤸' },
  { id: 'furtividade', name: 'Furtividade', attr: 'agilidade', icon: '👣' },
  { id: 'rastreamento', name: 'Rastreamento', attr: 'instinto', icon: '🐾' },
  { id: 'percepcao', name: 'Percepção', attr: 'instinto', icon: '👁️' },
  { id: 'sobrevivencia', name: 'Sobrevivência', attr: 'instinto', icon: '🌿' },
  { id: 'medicina_natural', name: 'Medicina Natural', attr: 'instinto', icon: '🧪' },
  { id: 'intimidacao', name: 'Intimidação', attr: 'presenca', icon: '🦁' },
  { id: 'lideranca', name: 'Liderança', attr: 'presenca', icon: '👑' },
  { id: 'persuasao', name: 'Persuasão', attr: 'presenca', icon: '💬' },
  { id: 'investigacao', name: 'Investigação', attr: 'astucia', icon: '🔍' },
  { id: 'conhecimento_ancestral', name: 'Conhecimento Ancestral', attr: 'astucia', icon: '📜' }
];

export const DINO_ARCHETYPES = [
  {
    id: 'predador',
    name: 'Predador Apex',
    role: 'Dano Físico & Finalização',
    icon: '🦖',
    keyStat: 'forca',
    abilities: [
      { id: 'mordida_feroz', name: 'Mordida Feroz', cost: 0, cd: 0, dice: '1d10+FOR', desc: 'Ataque devastador perfurante.' },
      { id: 'frenesi_sangrento', name: 'Frenesi Sangrento', cost: 2, cd: 3, desc: 'Garante vantagem em todas as jogadas de ataque por 2 turnos.' }
    ]
  },
  {
    id: 'guardiao',
    name: 'Guardião Couraçado',
    role: 'Tanque & Proteção de Aliados',
    icon: '🛡️',
    keyStat: 'vigor',
    abilities: [
      { id: 'parede_escamas', name: 'Muralha de Escamas', cost: 1, cd: 2, desc: 'Concede redução de 5 de dano para si e aliados adjacentes.' },
      { id: 'investida_esmagadora', name: 'Investida Esmagadora', cost: 0, cd: 1, dice: '1d8+FOR', desc: 'Golpe que atordoa o inimigo se falhar no teste de VIG.' }
    ]
  },
  {
    id: 'batedor',
    name: 'Batedor Veloz',
    role: 'Furtividade, Exploração & Críticos',
    icon: '⚡',
    keyStat: 'agilidade',
    abilities: [
      { id: 'ataque_sombra', name: 'Golpe das Sombras', cost: 1, cd: 1, dice: '2d6+AGI', desc: 'Causa dano crítico se usado furtivamente.' },
      { id: 'passo_fantasma', name: 'Passo Fantasma', cost: 0, cd: 2, desc: 'Desengaja sem tomar contra-ataques.' }
    ]
  },
  {
    id: 'xama',
    name: 'Xamã Primal',
    role: 'Magia da Terra & Auras',
    icon: '🔮',
    keyStat: 'astucia',
    abilities: [
      { id: 'raio_meteoro', name: 'Chama do Meteoro', cost: 3, cd: 2, dice: '3d6+AST', desc: 'Disparo de fogo cósmico em área.' },
      { id: 'aura_cura', name: 'Pulso da Mãe Terra', cost: 2, cd: 3, desc: 'Cura 2d8 de vida de um aliado.' }
    ]
  },
  {
    id: 'alfa',
    name: 'Alfa da Manada',
    role: 'Buffs & Comando em Combate',
    icon: '👑',
    keyStat: 'presenca',
    abilities: [
      { id: 'rugido_comando', name: 'Rugido Inspirador', cost: 1, cd: 2, desc: 'Concede +2 em testes a todos os aliados por 2 rodadas.' },
      { id: 'olhar_dominante', name: 'Olhar Dominante', cost: 1, cd: 3, desc: 'Intimida um inimigo forçando teste contra pânico.' }
    ]
  },
  {
    id: 'curandeiro',
    name: 'Curandeiro das Ervas',
    role: 'Suporte & Regeneração',
    icon: '🌿',
    keyStat: 'instinto',
    abilities: [
      { id: 'balsamo_primal', name: 'Bálsamo Primal', cost: 1, cd: 0, dice: '1d6+INS', desc: 'Remove sangramento e cura ferimentos leves.' },
      { id: 'raiz_vida', name: 'Raiz da Vida', cost: 3, cd: 4, desc: 'Revive um aliado caído com metade da vida.' }
    ]
  },
  {
    id: 'domador',
    name: 'Domador de Bestas',
    role: 'Invocação & Companheiros',
    icon: '🦅',
    keyStat: 'presenca',
    abilities: [
      { id: 'chamar_bando', name: 'Chamado da Revoada', cost: 2, cd: 3, dice: '2d4+PRE', desc: 'Pterossauros mergulham em rasante sobre o alvo.' }
    ]
  },
  {
    id: 'construtor',
    name: 'Construtor de Ninhos',
    role: 'Barricadas, Trampas & Suprimentos',
    icon: '🪵',
    keyStat: 'astucia',
    abilities: [
      { id: 'erguer_trincheira', name: 'Barricada de Troncos', cost: 1, cd: 2, desc: 'Cria cobertura total contra projéteis.' },
      { id: 'armadilha_espinho', name: 'Armadilha de Espinhos', cost: 1, cd: 1, dice: '1d10', desc: 'Imobiliza e causa sangramento.' }
    ]
  }
];

export const STATUS_CONDITIONS = {
  poisoned: { id: 'poisoned', label: 'Envenenado', icon: '☣️', color: '#10b981', effect: '-2 de vida por rodada e desvantagem em Força' },
  stunned: { id: 'stunned', label: 'Atordoado', icon: '💫', color: '#f59e0b', effect: 'Perde o próximo turno e não pode reagir' },
  frightened: { id: 'frightened', label: 'Assustado', icon: '😨', color: '#8b5cf6', effect: 'Não pode avançar em direção à fonte do medo' },
  bleeding: { id: 'bleeding', label: 'Sangrando', icon: '🩸', color: '#ef4444', effect: '-3 de vida ao se mover ou atacar vigorosamente' },
  frozen: { id: 'frozen', label: 'Congelado', icon: '❄️', color: '#38bdf8', effect: 'Velocidade reduzida pela metade e vulnerabilidade a impacto' },
  inspired: { id: 'inspired', label: 'Inspirado', icon: '⭐', color: '#fbbf24', effect: '+1d6 adicional na próxima rolagem de qualquer teste' }
};

export const XP_TABLE = [
  0,      // Nível 1
  300,    // Nível 2
  900,    // Nível 3
  2700,   // Nível 4
  6500,   // Nível 5
  14000,  // Nível 6
  23000,  // Nível 7
  34000,  // Nível 8
  48000,  // Nível 9
  64000,  // Nível 10
  85000,  // Nível 11
  100000, // Nível 12
  120000, // Nível 13
  140000, // Nível 14
  165000, // Nível 15
  195000, // Nível 16
  225000, // Nível 17
  265000, // Nível 18
  305000, // Nível 19
  355000  // Nível 20
];

export function getLevelFromXp(xp) {
  const currentXp = Math.max(0, Number(xp) || 0);
  let lvl = 1;
  for (let i = 0; i < XP_TABLE.length; i++) {
    if (currentXp >= XP_TABLE[i]) lvl = i + 1;
    else break;
  }
  return Math.min(20, lvl);
}

/**
 * Cria uma Ficha de Personagem Completa para o RPG.
 */
export function createCharacterSheet(params = {}) {
  const archetypeId = params.archetypeId || 'predador';
  const archetype = DINO_ARCHETYPES.find(a => a.id === archetypeId) || DINO_ARCHETYPES[0];
  const stats = params.stats || { forca: 14, agilidade: 12, vigor: 14, astucia: 10, instinto: 12, presenca: 10 };

  const vigor = stats.vigor || 10;
  const maxHp = 20 + Math.floor((vigor - 10) / 2) * 4;

  return {
    name: params.name || 'Dino Aventureiro',
    species: params.species || 'T-Rex',
    archetypeId: archetype.id,
    archetypeName: archetype.name,
    level: 1,
    xp: 0,
    hp: maxHp,
    maxHp,
    stamina: 10,
    maxStamina: 10,
    stats: { ...stats },
    skills: [...(params.proficientSkills || ['atletismo', 'intimidacao'])],
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    inventorySlots: 10,
    inventory: [
      { id: 'flesh_ration', name: 'Carne Curada', count: 2, heal: 10 },
      { id: 'torch_fossil', name: 'Tocha Resinosa', count: 1 }
    ],
    equippedWeapon: { id: 'claws_primal', name: 'Garras Primordiais', bonus: 1, damageDice: '1d8' },
    equippedArmor: { id: 'thick_hide', name: 'Couro Espesso', defense: 2 },
    journal: ['A jornada se inicia nos ermos pré-históricos.']
  };
}

/**
 * Executa salvaguarda contra morte (Death Save) quando HP <= 0.
 * @param {Object} sheet
 * @param {number} rawD20Roll
 */
export function processDeathSave(sheet, rawD20Roll) {
  if (sheet.hp > 0) return { alive: true, stable: true };

  const roll = Number(rawD20Roll) || 10;
  if (roll === 20) {
    sheet.hp = 1;
    sheet.deathSaves = { successes: 0, failures: 0 };
    return { outcome: 'critical_recovery', msg: 'Sucesso Crítico! Você recupera a consciência com 1 HP!' };
  }
  if (roll === 1) {
    sheet.deathSaves.failures += 2;
  } else if (roll >= 10) {
    sheet.deathSaves.successes += 1;
  } else {
    sheet.deathSaves.failures += 1;
  }

  if (sheet.deathSaves.failures >= 3) {
    return { outcome: 'dead', msg: 'Suas forças se esvaem... Você pereceu.' };
  }
  if (sheet.deathSaves.successes >= 3) {
    sheet.hp = 1;
    sheet.deathSaves = { successes: 0, failures: 0 };
    return { outcome: 'stabilized', msg: 'Você se estabilizou e respira com dificuldade.' };
  }

  return {
    outcome: 'pending',
    successes: sheet.deathSaves.successes,
    failures: sheet.deathSaves.failures
  };
}

/**
 * Realiza descanso (Curto ou Longo)
 */
export function restCharacter(sheet, type = 'short') {
  if (type === 'long') {
    sheet.hp = sheet.maxHp;
    sheet.stamina = sheet.maxStamina;
    sheet.conditions = sheet.conditions.filter(c => c !== 'stunned' && c !== 'bleeding');
    sheet.deathSaves = { successes: 0, failures: 0 };
    return { type: 'long', msg: 'Descanso Longo concluído: Vida e vigor totalmente recuperados!' };
  }

  // Descanso Curto
  const healAmount = Math.max(5, Math.floor(sheet.maxHp * 0.35));
  sheet.hp = Math.min(sheet.maxHp, sheet.hp + healAmount);
  sheet.stamina = Math.min(sheet.maxStamina, sheet.stamina + 5);
  return { type: 'short', healed: healAmount, msg: `Descanso Curto: Recuperou ${healAmount} HP e 5 de Vigor.` };
}
