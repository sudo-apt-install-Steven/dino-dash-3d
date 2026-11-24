// ===== CORE (shared logic: guardrail, clamp, 6-tier dice classifier, deterministic local DM) =====
export const DICE_TYPES = ['d2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd10', 'd12', 'd14', 'd16', 'd20', 'd24', 'd30', 'd100'];
const DICE_SIDES = { d2: 2, d3: 3, d4: 4, d5: 5, d6: 6, d7: 7, d8: 8, d10: 10, d12: 12, d14: 14, d16: 16, d20: 20, d24: 24, d30: 30, d100: 100 };

export const ROLL_OUTCOME_TIERS = {
  critical: {
    tier: 'critical', rank: 6, success: true, isCrit: true, isFumble: false,
    icon: '🌟', label: 'CRÍTICO!', color: '#fbbf24', effectMult: 2.0, nextRollBonus: 1, counterDmgMult: 0
  },
  great_success: {
    tier: 'great_success', rank: 5, success: true, isCrit: false, isFumble: false,
    icon: '🔥', label: 'SUCESSO COM SOBRA!', color: '#34d399', effectMult: 1.4, nextRollBonus: 2, counterDmgMult: 0
  },
  narrow_success: {
    tier: 'narrow_success', rank: 4, success: true, isCrit: false, isFumble: false,
    icon: '✅', label: 'SUCESSO POR POUCO!', color: '#22d3ee', effectMult: 1.0, nextRollBonus: 0, counterDmgMult: 0
  },
  minor_fail: {
    tier: 'minor_fail', rank: 3, success: false, isCrit: false, isFumble: false,
    icon: '⚠️', label: 'FALHA MENOR', color: '#f59e0b', effectMult: 0.4, nextRollBonus: 0, counterDmgMult: 0.5
  },
  fail: {
    tier: 'fail', rank: 2, success: false, isCrit: false, isFumble: false,
    icon: '❌', label: 'FALHA', color: '#f87171', effectMult: 0, nextRollBonus: 0, counterDmgMult: 1.0
  },
  critical_fail: {
    tier: 'critical_fail', rank: 1, success: false, isCrit: false, isFumble: true,
    icon: '💀', label: 'FALHA CRÍTICA!', color: '#ef4444', effectMult: 0, nextRollBonus: 0, counterDmgMult: 1.75
  }
};

const TIER_FLAVOR = {
  pt: {
    critical: 'Execução lendária! O golpe brilha com poder jurássico (2.0× efeito + ovos extras e faísca na arma)!',
    great_success: 'Vitória dominante! Efeito amplificado (1.4×) e +2 de vantagem na próxima rolagem!',
    narrow_success: 'Por um triz! Sua manobra funciona dramaticamente no limite!',
    minor_fail: 'Passou raspando! Efeito parcial ou contra-ataque bem reduzido.',
    fail: 'A manobra falha e a masmorra cobra seu preço.',
    critical_fail: 'Desastre épico! Você perde o equilíbrio e abre a guarda totalmente!'
  },
  en: {
    critical: 'Legendary execution! 2.0x power plus bonus eggs and weapon spark!',
    great_success: 'Dominant success! 1.4x effect plus +2 advantage on your next roll!',
    narrow_success: 'Just by a hair! Your move succeeds dramatically!',
    minor_fail: 'Narrow miss! Partial grazing effect or reduced counter-damage.',
    fail: 'Your action fails and the foe seizes the opening.',
    critical_fail: 'Dramatic fumble! Extra counter-damage or trap trigger!'
  },
  es: {
    critical: '¡Ejecución legendaria! 2.0x efecto más huevos extra y chispa de arma!',
    great_success: '¡Éxito sobrado! 1.4x efecto y +2 de ventaja en tu próxima tirada!',
    narrow_success: '¡Por los pelos! Tu maniobra triunfa dramáticamente!',
    minor_fail: 'Fallo leve: roza el objetivo con daño reducido.',
    fail: 'La acción falla y el enemigo contraataca.',
    critical_fail: '¡Pifia crítica! Contraataque devastador o trampa activada!'
  }
};

/**
 * Classifica o resultado de uma rolagem de dados de RPG de mesa em 6 tiers distintos.
 * @param {number} rawRoll - Valor bruto do dado (sem bônus)
 * @param {number} sides - Número de lados do dado (ex.: 20 para d20)
 * @param {number} total - Total final (rawRoll + bônus)
 * @param {number} dc - Classe de Dificuldade (meta)
 */
export function classifyRollOutcome(rawRoll, sides, total, dc) {
  const raw = Number(rawRoll) || 1;
  const s = Math.max(2, Number(sides) || 20);
  const tot = Number.isFinite(Number(total)) ? Number(total) : raw;
  const target = Number.isFinite(Number(dc)) ? Number(dc) : 10;
  const margin = tot - target;

  let base;
  if ((raw === s && s >= 6) || tot >= target + 8) {
    base = ROLL_OUTCOME_TIERS.critical;
  } else if ((raw === 1 && s >= 4) || tot <= target - 9) {
    base = ROLL_OUTCOME_TIERS.critical_fail;
  } else if (tot >= target + 4) {
    base = ROLL_OUTCOME_TIERS.great_success;
  } else if (tot >= target) {
    base = ROLL_OUTCOME_TIERS.narrow_success;
  } else if (tot >= target - 4) {
    base = ROLL_OUTCOME_TIERS.minor_fail;
  } else {
    base = ROLL_OUTCOME_TIERS.fail;
  }

  return { ...base, rawRoll: raw, sides: s, total: tot, dc: target, margin };
}

export function getTierNarrative(tier, lang = 'pt') {
  const l = lang && TIER_FLAVOR[lang] ? lang : 'pt';
  return TIER_FLAVOR[l][tier] || TIER_FLAVOR.pt.narrow_success;
}

const GOD_MODE_PATTERNS = [
  /infinite\s*(hp|health|life|lives|eggs|gold|mana)/i,
  /(hp|vida|saude|saúde)\s*(infinit|ilimitad)/i,
  /vida\s*infinita/i,
  /\d{5,}\s*(eggs|ovos|huevos|gold|ouro|coins|moedas|hp)/i,
  /\b1[\s_,.]?000[\s_,.]?000\b/,
  /(become|turn into|me tornar?|virar|convertirme en|ser)\s+(a\s+|um\s+|uma\s+|un\s+)?(god|deus|dios)/i,
  /\b(i am|eu sou|soy)\s+(a\s+|um\s+|un\s+)?(god|deus|dios)\b/i,
  /kill\s+all\s+(the\s+)?bosse?s?/i,
  /(matar|mato|mata|mate)\s+todos?\s+(os\s+|los\s+)?(chefes|bosses|jefes)/i,
  /(instantly|instantaneamente|instantáneamente).*(kill|matar)|(kill|matar).*(instantly|instantaneamente|instantáneamente)/i,
  /ignore\s+(all\s+|the\s+|your\s+|previous\s+)*(system\s+)?(prompt|instructions?|rules?)/i,
  /(ignore|ignora|ignorar)\s+(o\s+|el\s+|as\s+|las\s+)?(prompt|instru[cç][oõ]es|instrucciones|regras|reglas)/i,
  /system\s*prompt/i,
  /jailbreak|developer\s*mode|modo\s*deus|god\s*mode|\bdan\b\s*mode/i,
  /unlock\s+(all|everything)\b.*(store|shop)?|unlock\s+all\s+(the\s+)?(store|shop)/i,
  /(desbloquear|desbloquea)\s+(tod[oa]s?|tudo)\s+(a\s+|la\s+)?(loja|tienda|store)/i,
  /(set|give|add)\s+(me\s+)?(my\s+)?(eggs|hp|gold)\s+(to|=)\s*\d{4,}/i
];

export function sanitizeActionText(raw, maxLen = 220) {
  return String(raw == null ? '' : raw)
    .replace(/[\u0000-\u001F\u007F<>`{}\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function isGodModeExploit(text) {
  const t = String(text || '');
  const folded = t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return GOD_MODE_PATTERNS.some((re) => re.test(t) || re.test(folded));
}

function clampInt(v, lo, hi, fallback) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

function cleanLine(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001F\u007F<>`{}\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function ctxFloor(ctx) {
  return clampInt(ctx && ctx.floor, 1, 999, 1);
}

function detectLang(text, hint) {
  const h = String(hint || '').toLowerCase();
  if (h.startsWith('pt')) return 'pt';
  if (h.startsWith('es')) return 'es';
  if (h.startsWith('en')) return 'en';
  const t = String(text || '').toLowerCase();
  if (/[ãõç]|\b(eu|vou|para|com|uma?|ataco|atacar|furtivo|curar|esconder)\b/.test(t)) return 'pt';
  if (/[ñ¿¡]|\b(yo|voy|con|una?|ataco|atacar|sigilo|curar|esconder|el|la)\b/.test(t)) return 'es';
  return 'en';
}

const SUGGESTIONS = {
  en: ['Strike the enemy with my claws', 'Sneak behind the nearest rock', 'Roar to intimidate the foe', 'Inspect the room for traps'],
  pt: ['Atacar o inimigo com as garras', 'Esgueirar-me atrás da rocha', 'Rugir para intimidar o inimigo', 'Inspecionar a sala atrás de armadilhas'],
  es: ['Atacar al enemigo con mis garras', 'Esconderme tras la roca', 'Rugir para intimidar al enemigo', 'Inspeccionar la sala en busca de trampas']
};

const INTENTS = [
  { id: 'heal', re: /\b(heal|cure|bandage|rest|drink|potion|curar|curo|descansar|descanso|po[cç][aã]o|poci[oó]n|vendar|beber)\b/i, die: 'd20', dc: 11, stat: 1 },
  { id: 'inspect', re: /\b(inspect|search|investigate|look|examine|trap|disarm|check|inspecionar|investigar|procurar|examinar|armadilha|desarmar|olhar|buscar|trampa|desarmar|revisar|mirar)\b/i, die: 'd20', dc: 12, stat: 1 },
  { id: 'stealth', re: /\b(sneak|stealth|hide|shadow|silent|quietly|ambush|esgueirar|furtiv[oa]?|esconder|sombra|silencio|sorrateir[oa]|emboscada|sigilo|sigiloso|escond[eo]r?me|acechar)\b/i, die: 'd20', dc: 13, stat: 2 },
  { id: 'acrobatic', re: /\b(jump|leap|dodge|climb|roll|flip|dash|vault|swing|pular|saltar|esquivar|escalar|rolar|correr|pulo|salto|esquivo|trepar|rodar)\b/i, die: 'd20', dc: 12, stat: 2 },
  { id: 'diplomacy', re: /\b(roar|talk|persuade|intimidate|negotiate|convince|bargain|taunt|rugir|rugido|falar|persuadir|intimidar|negociar|convencer|provocar|hablar|persuadir|negociar|convencer)\b/i, die: 'd20', dc: 11, stat: 1 },
  { id: 'magic', re: /\b(magic|spell|cast|fire|ice|lightning|ability|power|special|magia|feiti[cç]o|lan[cç]ar|fogo|gelo|raio|habilidade|poder|especial|hechizo|conjuro|lanzar|fuego|hielo|rayo)\b/i, die: 'd20', dc: 12, stat: 2 },
  { id: 'combat', re: /\b(attack|strike|hit|slash|bite|claw|punch|kick|stomp|smash|fight|tail|atacar|ataco|golpear|golpe|morder|mordida|garra|garras|chutar|pisotear|lutar|cauda|rabo|pelear|patada|cola|pisar)\b/i, die: 'd20', dc: 11, stat: 2 }
];

const IMPOSSIBLE = /\b(fly to the moon|teleport|time travel|resurrect all|destroy the (world|universe)|voar at[eé] a lua|teletransport|viajar no tempo|destruir o (mundo|universo)|volar a la luna|viaje en el tiempo|destruir el (mundo|universo))\b/i;

const NARR = {
  en: {
    cheat: 'The dungeon laughs. Such power cannot be wished into being; try a real action.',
    impossible: 'The laws of the dungeon forbid that. Try something a brave dino can actually do.',
    win: {
      combat: 'Your strike lands true and the enemy staggers back!',
      stealth: 'You melt into the shadows and strike unseen.',
      acrobatic: 'You move with feral grace and find the perfect opening.',
      diplomacy: 'Your roar echoes; the foe hesitates and gives ground.',
      magic: 'Primal energy crackles and surges at your target!',
      inspect: 'Your sharp eyes spot a hidden detail that turns the tide.',
      heal: 'You catch your breath and feel strength returning.',
      generic: 'Fortune smiles on your bold move.'
    },
    lose: {
      combat: 'Your swing goes wide and the enemy counters.',
      stealth: 'A loose pebble gives you away.',
      acrobatic: 'You stumble mid-move and lose your footing.',
      diplomacy: 'The foe only snarls back, unimpressed.',
      magic: 'The energy fizzles and sparks back at you.',
      inspect: 'You find nothing but dust and shadows.',
      heal: 'The remedy is spoiled and does little.',
      generic: 'Fate turns against you this time.'
    }
  },
  pt: {
    cheat: 'A masmorra ri. Esse poder não pode ser desejado; tente uma ação real.',
    impossible: 'As leis da masmorra proíbem isso. Tente algo que um dino corajoso possa fazer.',
    win: {
      combat: 'Seu golpe acerta em cheio e o inimigo cambaleia!',
      stealth: 'Você some nas sombras e ataca sem ser visto.',
      acrobatic: 'Você se move com graça selvagem e acha a brecha perfeita.',
      diplomacy: 'Seu rugido ecoa; o inimigo hesita e recua.',
      magic: 'A energia primal estala e atinge o alvo!',
      inspect: 'Seus olhos atentos notam um detalhe que vira o jogo.',
      heal: 'Você recupera o fôlego e sente a força voltar.',
      generic: 'A sorte sorri para sua jogada ousada.'
    },
    lose: {
      combat: 'Seu golpe passa longe e o inimigo contra-ataca.',
      stealth: 'Uma pedrinha solta denuncia você.',
      acrobatic: 'Você tropeça no meio do movimento.',
      diplomacy: 'O inimigo apenas rosna, sem se impressionar.',
      magic: 'A energia falha e volta contra você.',
      inspect: 'Você só encontra poeira e sombras.',
      heal: 'O remédio estava estragado e pouco ajuda.',
      generic: 'O destino vira contra você desta vez.'
    }
  },
  es: {
    cheat: 'La mazmorra se ríe. Ese poder no se obtiene deseándolo; prueba una acción real.',
    impossible: 'Las leyes de la mazmorra lo prohíben. Intenta algo que un dino valiente pueda hacer.',
    win: {
      combat: '¡Tu golpe acierta y el enemigo retrocede tambaleándose!',
      stealth: 'Te fundes en las sombras y atacas sin ser visto.',
      acrobatic: 'Te mueves con gracia salvaje y hallas el hueco perfecto.',
      diplomacy: 'Tu rugido resuena; el enemigo duda y cede terreno.',
      magic: '¡La energía primal crepita y golpea a tu objetivo!',
      inspect: 'Tus ojos agudos notan un detalle que cambia todo.',
      heal: 'Recuperas el aliento y sientes volver la fuerza.',
      generic: 'La fortuna sonríe a tu osada jugada.'
    },
    lose: {
      combat: 'Tu golpe falla y el enemigo contraataca.',
      stealth: 'Una piedrecita suelta te delata.',
      acrobatic: 'Tropiezas a mitad del movimiento.',
      diplomacy: 'El enemigo solo gruñe, impasible.',
      magic: 'La energía se apaga y rebota contra ti.',
      inspect: 'Solo encuentras polvo y sombras.',
      heal: 'El remedio estaba echado a perder.',
      generic: 'El destino te da la espalda esta vez.'
    }
  }
};

function emptyDecision(extra) {
  return Object.assign({
    possible: false,
    diceType: 'd20',
    diceCount: 1,
    dc: 10,
    statBonus: 0,
    enemyDamage: 0,
    playerHeal: 0,
    eggReward: 0,
    playerDamage: 0,
    narrative: '',
    failNarrative: '',
    suggestions: [],
    intent: 'none'
  }, extra || {});
}

export function clampDecisionToContract(decision, ctx) {
  const d = decision && typeof decision === 'object' ? decision : {};
  const floor = ctxFloor(ctx);
  const lang = detectLang('', ctx && ctx.lang);
  const diceType = DICE_TYPES.includes(String(d.diceType).toLowerCase()) ? String(d.diceType).toLowerCase() : 'd20';
  const sides = DICE_SIDES[diceType];
  const diceCount = clampInt(d.diceCount, 1, 3, 1);
  const maxRoll = sides * diceCount;
  const statBonus = clampInt(d.statBonus, -2, 6, 0);
  // Regra 2.1: Nenhuma CD pode ser inalcançável com o dado e modificadores usados.
  const maxPossible = maxRoll + statBonus;
  const dcCeil = Math.max(2, Math.min(95, maxPossible));
  const dc = clampInt(d.dc, 2, dcCeil, Math.min(dcCeil, 10));
  const possible = d.possible === true || d.possible === 'true';
  let suggestions = Array.isArray(d.suggestions)
    ? d.suggestions.map((s) => cleanLine(s, 60)).filter(Boolean).slice(0, 4)
    : [];
  const fillers = SUGGESTIONS[lang] || SUGGESTIONS.en;
  for (let i = 0; suggestions.length < 4 && i < fillers.length; i++) {
    if (!suggestions.includes(fillers[i])) suggestions.push(fillers[i]);
  }
  const out = {
    possible,
    diceType,
    diceCount,
    dc,
    statBonus: clampInt(d.statBonus, -2, 6, 0),
    enemyDamage: clampInt(d.enemyDamage, 0, 4 + Math.min(6, floor), 0),
    playerHeal: clampInt(d.playerHeal, 0, 2, 0),
    eggReward: clampInt(d.eggReward, 0, 25 + floor * 10, 0),
    playerDamage: clampInt(d.playerDamage, 0, 1 + Math.floor(floor / 3), 0),
    narrative: cleanLine(d.narrative, 240),
    failNarrative: cleanLine(d.failNarrative, 240),
    suggestions,
    intent: cleanLine(d.intent || 'none', 20) || 'none'
  };
  if (!possible) {
    out.enemyDamage = 0;
    out.playerHeal = 0;
    out.eggReward = 0;
  }
  if (d.provider) out.provider = cleanLine(d.provider, 24) || 'local-dm';
  if (d.flagged) out.flagged = true;
  return out;
}

export function evaluateLocalDungeonAction(ctx) {
  const c = ctx && typeof ctx === 'object' ? ctx : {};
  const text = sanitizeActionText(c.actionText);
  const lang = detectLang(text, c.lang);
  const N = NARR[lang];
  const floor = ctxFloor(c);
  const base = { suggestions: SUGGESTIONS[lang].slice(), provider: 'local-dm' };

  if (!text) {
    return clampDecisionToContract(emptyDecision({ ...base, narrative: N.impossible, intent: 'empty' }), c);
  }
  if (isGodModeExploit(String(c.actionText || ''))) {
    return clampDecisionToContract(emptyDecision({ ...base, narrative: N.cheat, intent: 'cheat', flagged: true }), c);
  }
  if (IMPOSSIBLE.test(text)) {
    return clampDecisionToContract(emptyDecision({ ...base, narrative: N.impossible, intent: 'impossible' }), c);
  }

  const hit = INTENTS.find((i) => i.re.test(text));
  const intent = hit ? hit.id : 'generic';
  const die = hit ? hit.die : 'd20';
  const baseDc = hit ? hit.dc : 11;
  const stat = hit ? hit.stat : 0;
  const weaponBonus = clampInt(c.weaponBonus, 0, 4, 0);
  const dc = baseDc + Math.min(6, Math.floor((floor - 1) / 2));
  const hasEnemy = c.enemy !== null && c.enemy !== undefined && c.enemy !== false;
  const offensive = ['combat', 'stealth', 'acrobatic', 'diplomacy', 'magic'].includes(intent) || intent === 'generic';
  const wName = cleanLine(c.weaponName || '', 40);
  const winLine = wName && offensive && weaponBonus > 0 && lang === 'pt'
    ? `${N.win[intent]} (${wName} +${weaponBonus})`
    : N.win[intent];

  return clampDecisionToContract({
    possible: true,
    diceType: die,
    diceCount: intent === 'magic' && floor >= 5 ? 2 : 1,
    dc,
    statBonus: stat + weaponBonus + (floor >= 6 ? 1 : 0),
    enemyDamage: offensive ? (hasEnemy || c.enemy === undefined ? 2 + Math.floor(floor / 2) + Math.floor(weaponBonus / 2) : 0) : 0,
    playerHeal: intent === 'heal' ? 2 : 0,
    eggReward: intent === 'inspect' ? 5 + floor * 3 : intent === 'heal' ? 0 : 3 + floor * 2,
    playerDamage: intent === 'heal' || intent === 'inspect' ? 0 : 1 + Math.floor(floor / 3),
    narrative: winLine,
    failNarrative: N.lose[intent],
    suggestions: base.suggestions,
    intent,
    provider: 'local-dm'
  }, c);
}
// ===== END CORE =====


const CLIENT_TIMEOUT_MS = 9000;

function looksValid(res) {
  return !!res && typeof res === 'object' && typeof res.possible === 'boolean' && DICE_TYPES.includes(res.diceType);
}

export class AIDungeonClient {
  /**
   * @param {{ supabase?: any, getPlayerId?: () => string, baseUrl?: string, anonKey?: string }} [opts]
   */
  constructor(opts = {}) {
    this.supabase = opts.supabase || null;
    this.getPlayerId = opts.getPlayerId || (() => 'local-player');
    this.baseUrl = opts.baseUrl || import.meta.env?.VITE_SUPABASE_URL || '';
    this.anonKey = opts.anonKey || import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  }

  async _headers() {
    const headers = { 'Content-Type': 'application/json', apikey: this.anonKey, 'x-dino-player-id': String(this.getPlayerId() || 'local-player') };
    try {
      const { data } = (await this.supabase?.auth?.getSession?.()) || {};
      if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    } catch { /* anonymous */ }
    return headers;
  }

  async evaluateAction(ctx) {
    const safeCtx = ctx && typeof ctx === 'object' ? ctx : {};
    // Cheap local guard first: never spend a network call on exploits.
    if (isGodModeExploit(String(safeCtx.actionText || ''))) return evaluateLocalDungeonAction(safeCtx);
    if (!this.baseUrl || !this.anonKey) return evaluateLocalDungeonAction(safeCtx);
    try {
      const res = await fetch(`${this.baseUrl}/functions/v1/ai-dungeon-master`, {
        method: 'POST',
        headers: await this._headers(),
        body: JSON.stringify({
          actionText: sanitizeActionText(safeCtx.actionText),
          floor: safeCtx.floor,
          hp: safeCtx.hp ?? safeCtx.playerHp,
          maxHp: safeCtx.maxHp ?? safeCtx.playerMaxHp,
          enemy: safeCtx.enemy ?? null,
          weaponBonus: clampInt(safeCtx.weaponBonus, 0, 4, 0),
          weaponName: cleanLine(safeCtx.weaponName || '', 40) || undefined,
          roomType: cleanLine(safeCtx.roomType || '', 20) || undefined,
          npcName: cleanLine(safeCtx.npcName || '', 40) || undefined,
          lang: safeCtx.lang,
          mode: 'evaluate'
        }),
        signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS)
      });
      if (!res.ok) return evaluateLocalDungeonAction(safeCtx);
      const json = await res.json();
      const decision = json?.decision || json;
      if (!looksValid(decision)) return evaluateLocalDungeonAction(safeCtx);
      const clamped = clampDecisionToContract(decision, safeCtx);
      clamped.provider = String(json?.provider || decision.provider || 'remote').slice(0, 24);
      return clamped;
    } catch {
      return evaluateLocalDungeonAction(safeCtx);
    }
  }

  async getSuggestions(ctx) {
    const safeCtx = ctx && typeof ctx === 'object' ? ctx : {};
    const lang = detectLang('', safeCtx.lang);
    if (!this.baseUrl || !this.anonKey) return SUGGESTIONS[lang].slice();
    try {
      const res = await fetch(`${this.baseUrl}/functions/v1/ai-dungeon-master`, {
        method: 'POST',
        headers: await this._headers(),
        body: JSON.stringify({ actionText: '', floor: safeCtx.floor, hp: safeCtx.hp, maxHp: safeCtx.maxHp, enemy: safeCtx.enemy ?? null, lang: safeCtx.lang, mode: 'suggest' }),
        signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS)
      });
      if (!res.ok) return SUGGESTIONS[lang].slice();
      const json = await res.json();
      const list = clampDecisionToContract(json?.decision || json, safeCtx).suggestions;
      return list.length ? list : SUGGESTIONS[lang].slice();
    } catch {
      return SUGGESTIONS[lang].slice();
    }
  }
}
