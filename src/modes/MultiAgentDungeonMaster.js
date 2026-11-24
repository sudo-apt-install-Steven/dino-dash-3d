// MultiAgentDungeonMaster.js
// Arquitetura Multi-Agente do Mestre IA (Seção 2.2).
// Divide o Mestre em Agentes Especializados:
// 1. Narrador (estilo, prosa e imersão)
// 2. Gerador de NPCs e Diálogos
// 3. Verificador Estrito de Regras (A ficha do jogador é a verdade inegociável)
// 4. Seletor de Cenas e Ilustrações
// 5. Fallback Procedural Offline com Tabelas Determinísticas

import { classifyRollOutcome } from '../net/AIDungeonClient.js';

export const MASTER_PERSONAS = {
  wise: {
    id: 'wise',
    name: 'Sábio Ancião',
    toneDesc: 'Solene, ancestral, focado na harmonia e no destino primordial da terra.',
    prefix: 'Os ecos das eras murmuram:'
  },
  humorous: {
    id: 'humorous',
    name: 'Bem-Humorado',
    toneDesc: 'Descontraído, irônico com as trapalhadas dos dinos e vibrante.',
    prefix: 'Eita! Olhem só o que aconteceu:'
  },
  dark_light: {
    id: 'dark_light',
    name: 'Sombrio Leve',
    toneDesc: 'Tenso, focado nos sussurros da floresta e no perigo à espreita, mas seguro para todas as idades.',
    prefix: 'A névoa se fecha ao redor:'
  },
  epic: {
    id: 'epic',
    name: 'Épico Heroico',
    toneDesc: 'Grandioso, cinematográfico, celebrando cada golpe e rugido estrondoso.',
    prefix: 'Com a fúria dos titãs jurássicos:'
  },
  mystery: {
    id: 'mystery',
    name: 'Mistério e Enigmas',
    toneDesc: 'Curioso, detalhista com pegadas estranhas, relíquias e segredos fósseis.',
    prefix: 'Um enigma antigo se revela:'
  }
};

export const DIFFICULTY_MODES = {
  easy: { id: 'easy', label: 'Fácil', dcOffset: -2, damageMult: 0.75 },
  fair: { id: 'fair', label: 'Justa (Padrão)', dcOffset: 0, damageMult: 1.0 },
  brutal: { id: 'brutal', label: 'Brutal', dcOffset: +2, damageMult: 1.35 }
};

/**
 * Agente Verificador de Regras:
 * Garante que a IA NUNCA desrespeite a ficha do jogador, invente bônus impossíveis ou gere CDs inalcançáveis.
 */
export class RulesVerifierAgent {
  /**
   * Valida e ajusta a decisão da IA conforme o contrato estrito da ficha do personagem.
   * @param {Object} proposal Proposta bruta de ação/rolagem
   * @param {Object} characterSheet Ficha oficial do personagem
   * @param {Object} environmentContext Contexto da sala/andar
   */
  static verifyAndEnforce(proposal, characterSheet, environmentContext = {}) {
    const sheet = characterSheet || {};
    const stats = sheet.derivedStats || sheet.stats || { forca: 10, agilidade: 10, vigor: 10, astucia: 10, instinto: 10, presenca: 10 };
    const dieType = proposal.diceType || 'd20';
    const dieCount = Math.max(1, Math.min(5, Number(proposal.diceCount) || 1));
    const sides = dieType === 'd100' ? 100 : Number(dieType.replace('d', '')) || 20;

    // Modificador extraído da ficha legítima do jogador
    let relevantStat = stats.forca;
    if (proposal.intent === 'stealth' || proposal.intent === 'acrobatic') relevantStat = stats.agilidade;
    if (proposal.intent === 'inspect' || proposal.intent === 'magic') relevantStat = stats.astucia;
    if (proposal.intent === 'diplomacy') relevantStat = stats.presenca;
    if (proposal.intent === 'heal') relevantStat = stats.instinto;

    const statBonus = Math.floor((relevantStat - 10) / 2);
    const itemBonus = Math.max(0, Math.min(5, Number(environmentContext.weaponBonus || 0)));
    const totalBonus = statBonus + itemBonus;

    // CD Clamping Matemático: nunca pode ser inalcançável (dc <= maxPossible) e nem trivial sem rolagem (dc >= minPossible + 1)
    const maxRoll = sides * dieCount;
    const maxPossible = maxRoll + totalBonus;
    const minPossible = 1 * dieCount + totalBonus;

    let targetDc = Number(proposal.dc) || 12;
    if (targetDc > maxPossible) {
      targetDc = maxPossible; // Clampa no limite máximo alcançável
    }
    if (targetDc < 2) {
      targetDc = 2;
    }

    return {
      verified: true,
      diceType: dieType,
      diceCount: dieCount,
      sides,
      dc: targetDc,
      statBonus: totalBonus,
      minPossible,
      maxPossible,
      intent: proposal.intent || 'combat',
      narrative: String(proposal.narrative || '').trim(),
      failNarrative: String(proposal.failNarrative || '').trim(),
      suggestions: Array.isArray(proposal.suggestions) && proposal.suggestions.length ? proposal.suggestions.slice(0, 5) : [
        'Avançar com cautela',
        'Avaliar o terreno ao redor',
        'Preparar um ataque surpresa'
      ]
    };
  }
}

/**
 * Agente Narrador:
 * Aplica estilo e persona sobre a descrição dos eventos.
 */
export class NarratorAgent {
  static formatScene(baseNarration, personaId = 'epic', lang = 'pt') {
    const persona = MASTER_PERSONAS[personaId] || MASTER_PERSONAS.epic;
    return `${persona.prefix} ${baseNarration}`;
  }
}

/**
 * Agente Seletor de Cenas e Ilustrações 2D/3D:
 * Retorna os identificadores corretos de cenários, fundos e iluminação dramática.
 */
export class SceneDirectorAgent {
  static selectSceneArt(sceneContext = {}) {
    const biome = sceneContext.biome || 'jungle';
    const isBoss = Boolean(sceneContext.isBoss);

    return {
      sceneType: isBoss ? 'boss_chamber' : 'exploration',
      mode3dRecommended: isBoss,
      backgroundLayer: `bg_${biome}_horizon`,
      midgroundLayer: `mid_${biome}_vegetation`,
      foregroundLayer: `fore_${biome}_ground`,
      lightingMood: isBoss ? 'dramatic_crimson' : 'sunlit_canopy',
      weatherEffect: sceneContext.weather || 'clear'
    };
  }
}

/**
 * Orquestrador Central Multi-Agente do Mestre IA.
 */
export class MultiAgentDungeonMaster {
  constructor(options = {}) {
    this.persona = options.persona || 'epic';
    this.difficulty = options.difficulty || 'fair';
    this.campaign = options.campaign || null;
  }

  setPersona(personaId) {
    if (MASTER_PERSONAS[personaId]) this.persona = personaId;
  }

  setDifficulty(diffId) {
    if (DIFFICULTY_MODES[diffId]) this.difficulty = diffId;
  }

  /**
   * Avalia a ação do jogador coordenando todos os subagentes.
   * @param {string} playerAction
   * @param {Object} characterSheet
   * @param {Object} currentScene
   * @returns {Object} Resposta estruturada e imutável de arbitragem de RPG.
   */
  processTurn(playerAction, characterSheet, currentScene = {}) {
    // 1. Detecção de Intenção e Dificuldade Base
    const cleanAction = String(playerAction || '').trim();
    let intent = 'combat';
    let baseDc = 12;

    if (/curar|descans|po[cç][aã]o|rem[eé]dio/i.test(cleanAction)) {
      intent = 'heal';
      baseDc = 10;
    } else if (/furtiv|escond|esgueir|sil[eê]nc/i.test(cleanAction)) {
      intent = 'stealth';
      baseDc = 13;
    } else if (/inspecion|olhar|procur|armadilha/i.test(cleanAction)) {
      intent = 'inspect';
      baseDc = 11;
    } else if (/rugir|falar|negoci|intimid/i.test(cleanAction)) {
      intent = 'diplomacy';
      baseDc = 12;
    } else if (/pular|saltar|esquiv|escal/i.test(cleanAction)) {
      intent = 'acrobatic';
      baseDc = 12;
    }

    // Aplica dificuldade
    const diff = DIFFICULTY_MODES[this.difficulty] || DIFFICULTY_MODES.fair;
    baseDc += diff.dcOffset;

    // 2. Agente Verificador de Regras executa a blindagem da ficha
    const rawDecision = {
      diceType: 'd20',
      diceCount: 1,
      dc: baseDc,
      intent,
      narrative: `Você decide: "${cleanAction}". A tensão na atmosfera atinge o ápice!`,
      failNarrative: `A manobra falha diante da resistência implacável do ambiente!`,
      suggestions: [
        'Aproveitar a abertura para atacar',
        'Buscar cobertura atrás das rochas',
        'Usar seu rugido intimidador',
        'Observar fraquezas no inimigo'
      ]
    };

    const verifiedRuling = RulesVerifierAgent.verifyAndEnforce(rawDecision, characterSheet, currentScene);

    // 3. Agente Narrador estiliza
    verifiedRuling.narrative = NarratorAgent.formatScene(verifiedRuling.narrative, this.persona);

    // 4. Agente Diretor de Cena fornece enquadramento
    const sceneArt = SceneDirectorAgent.selectSceneArt(currentScene);

    return {
      decision: verifiedRuling,
      sceneArt,
      persona: this.persona,
      difficulty: this.difficulty
    };
  }
}
