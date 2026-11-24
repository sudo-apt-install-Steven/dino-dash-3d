// Máquina de Estados Anti-Flicker para RPG de Mesa Ilustrado + Voz (Web Speech API) (Partes 2.1, 2.4, 3).
// Garante matematicamente que:
// 1) As opções ficam 100% fixas e clicáveis na fase 'choosing'.
// 2) Durante 'rolling', o painel de opções é ocultado e substituído pelo indicador vivo dos dados e narração (NUNCA pisca opções novas durante o giro!).
// 3) Após o resultado ('outcome'), as NOVAS 3–5 opções (sem repetir a cena anterior) + campo livre + microfone entram juntas e permanecem até nova escolha!
import { sanitizeReachableCheck } from '../dice/DiceNotationParser.js';

export const RPG_UI_STATES = Object.freeze({
  CHOOSING: 'choosing',
  ROLLING: 'rolling',
  OUTCOME: 'outcome'
});

const PROCEDURAL_ACTION_POOL = [
  { id: 'scout_tracks',   label: 'Farejar rastros antigos nas pedras', attr: 'Instinto',  dieType: 'd20', baseDc: 11 },
  { id: 'roar_challenge', label: 'Ergue-se e rugir para impor presença', attr: 'Presença', dieType: 'd20', baseDc: 13 },
  { id: 'flank_ambush',   label: 'Esgueirar-se pela folhagem densa',    attr: 'Agilidade', dieType: 'd20', baseDc: 12 },
  { id: 'charge_obstacle',label: 'Investir com força bruta ancestral',  attr: 'Força',     dieType: 'd20', baseDc: 14 },
  { id: 'inspect_runes',  label: 'Decifrar marcas rúnicas no âmbar',    attr: 'Astúcia',   dieType: 'd20', baseDc: 12 },
  { id: 'endure_hazard',  label: 'Firmar as garras e suportar o impacto',attr: 'Vigor',    dieType: 'd20', baseDc: 11 },
  { id: 'forage_herbs',   label: 'Colher brotos luminescentes próximos', attr: 'Instinto', dieType: 'd20', baseDc: 10 },
  { id: 'parley_npc',     label: 'Sinalizar aliança pacífica com a crista', attr: 'Presença', dieType: 'd20', baseDc: 12 }
];

export class TabletopStateMachine {
  constructor({ onStateChange = null } = {}) {
    this.phase = RPG_UI_STATES.CHOOSING;
    this.narration = '';
    this.options = [];
    this.lastOptionSignature = '';
    this.activeCheck = null;
    this.lastRollResult = null;
    this.onStateChange = onStateChange;
  }

  /**
   * Gera ou normaliza de 3 a 5 opções garantindo:
   * - Nenhuma CD inalcançável (usa sanitizeReachableCheck)
   * - Nunca repete o mesmo conjunto da cena anterior
   */
  presentScene({ narration, rawOptions = [], attributeModifiers = {} } = {}) {
    if (this.phase === RPG_UI_STATES.ROLLING) {
      // Proteção estrita anti-flicker: jamais substitui opções enquanto os dados estão girando!
      return false;
    }

    let candidates = Array.isArray(rawOptions) ? rawOptions.filter(Boolean) : [];
    const sig = candidates.map((o) => o.label || o.id).join('|');
    if (candidates.length < 3 || (sig && sig === this.lastOptionSignature)) {
      const rotated = PROCEDURAL_ACTION_POOL.filter((p) => !sig.includes(p.label));
      const picks = rotated.slice(0, 4);
      candidates = picks.map((p) => ({ ...p }));
    }

    this.options = candidates.slice(0, 5).map((opt, idx) => {
      const attr = opt.attr || 'Instinto';
      const mod = Number(opt.modifier ?? attributeModifiers[attr] ?? 0);
      const safeCheck = sanitizeReachableCheck({
        dieType: opt.dieType || 'd20',
        count: opt.count || 1,
        modifier: mod,
        dc: opt.dc ?? opt.baseDc ?? 12,
        mode: opt.mode || 'normal'
      });
      return {
        id: opt.id || `opt_${idx}`,
        label: String(opt.label || 'Explorar arredores'),
        attr,
        check: safeCheck
      };
    });

    this.lastOptionSignature = this.options.map((o) => o.label).join('|');
    this.narration = String(narration || '');
    this.phase = RPG_UI_STATES.CHOOSING;
    this.activeCheck = null;
    this._emit();
    return true;
  }

  /**
   * Trava imediatamente as opções ao escolher uma ação (ou texto livre) e entra em modo ROLLING.
   */
  beginActionRoll(choiceOrFreeText, defaultModifier = 0) {
    if (this.phase !== RPG_UI_STATES.CHOOSING) return null;
    let check;
    let actionLabel;
    if (typeof choiceOrFreeText === 'string') {
      actionLabel = choiceOrFreeText.trim().slice(0, 240);
      if (!actionLabel) return null;
      check = sanitizeReachableCheck({ dieType: 'd20', count: 1, modifier: defaultModifier, dc: 12 });
    } else {
      const found = this.options.find((o) => o.id === choiceOrFreeText?.id) || choiceOrFreeText;
      if (!found) return null;
      actionLabel = found.label;
      check = sanitizeReachableCheck(found.check || { dieType: 'd20', count: 1, modifier: defaultModifier, dc: 12 });
    }

    this.phase = RPG_UI_STATES.ROLLING;
    this.activeCheck = { actionLabel, ...check };
    // Durante ROLLING a lista clicável fica vazia na view para impedir clique fantasma/flicker
    this._emit();
    return this.activeCheck;
  }

  /**
   * Conclui a rolagem, exibe resultado e libera a transição limpa para a próxima cena.
   */
  completeRoll(rollResult, outcomeNarration = '') {
    if (this.phase !== RPG_UI_STATES.ROLLING) return false;
    const dc = this.activeCheck?.dc ?? 10;
    const success = rollResult.isCrit ? true : (rollResult.isFumble ? false : rollResult.total >= dc);
    this.lastRollResult = {
      ...rollResult,
      dc,
      success,
      actionLabel: this.activeCheck?.actionLabel || ''
    };
    if (outcomeNarration) this.narration = outcomeNarration;
    this.phase = RPG_UI_STATES.OUTCOME;
    this._emit();
    return true;
  }

  /** Destrava para receber a próxima cena com novas opções. */
  advanceToNextScene(scenePayload) {
    if (this.phase === RPG_UI_STATES.ROLLING) return false;
    this.phase = RPG_UI_STATES.CHOOSING;
    return this.presentScene(scenePayload);
  }

  getSnapshot() {
    return {
      phase: this.phase,
      narration: this.narration,
      // Na fase ROLLING nunca expõe opções clicáveis!
      visibleOptions: this.phase === RPG_UI_STATES.CHOOSING ? [...this.options] : [],
      activeCheck: this.activeCheck,
      lastRollResult: this.lastRollResult
    };
  }

  _emit() {
    this.onStateChange?.(this.getSnapshot());
  }
}

/**
 * Narração por voz opcional (Web Speech API) com controle de velocidade e escolha de voz PT-BR (Parte 2.4).
 */
export function speakTabletopNarration(text, { enabled = true, rate = 1.0, pitch = 0.96 } = {}) {
  if (!enabled || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text));
    utter.lang = 'pt-BR';
    utter.rate = Math.max(0.65, Math.min(1.6, Number(rate) || 1.0));
    utter.pitch = Math.max(0.6, Math.min(1.4, Number(pitch) || 0.96));
    const voices = window.speechSynthesis.getVoices?.() || [];
    const ptVoice = voices.find((v) => /pt[-_]br/i.test(v.lang)) || voices.find((v) => /^pt/i.test(v.lang));
    if (ptVoice) utter.voice = ptVoice;
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}
