// Narrador divertido em Português (legendas estilizadas + fala Web Speech opcional).
import { Save } from '../systems/Save.js';

const LINES = {
  pt: {
    greatJump: ['QUE SALTO ÉPICO!', 'VOANDO ALTO!', 'QUASE TOCOU NAS NUVENS!'],
    nearMiss: ['ESSA PASSOU RASPANDO!', 'POR UM TRIZ!', 'REFLEXOS DE VELOCIRAPTOR!'],
    stomp: ['ESMAGADO!', 'PISÃO PRÉ-HISTÓRICO!', 'MENOS UM NO CAMINHO!'],
    hurt: ['AI, ESSA DOEU!', 'CUIDADO COM O CACTO!', 'OPA, TROPEÇO BRUTO!'],
    fury: ['MODO FÚRIA ATIVADO! SAIA DA FRENTE!', 'GIGANTE IMPARÁVEL!'],
    ufo: ['DISCO VOADOR À VISTA! SEGUREM OS OVOS!', 'ALIENS QUEREM O DINO!'],
    meteor: ['OLHA O METEORO! CORRAM!', 'CHUVA CÓSMICA NO DESERTO!'],
    herd: ['MANADA NA PISTA! HORA DA CARONA!', 'CUIDADO COM OS GIGANTES!'],
    boss: ['CHEFE CHEGANDO! PREPARE AS GARRAS!', 'HORA DO DUELO LENDÁRIO!'],
    victory: ['VITÓRIA ABSOLUTA!', 'O REI DA ERA JURÁSSICA!']
  },
  en: {
    greatJump: ['WHAT A LEAP!', 'SOARING HIGH!', 'SKY-HIGH JUMP!'],
    nearMiss: ['SO CLOSE!', 'RAZOR THIN DODGE!', 'RAPTOR REFLEXES!'],
    stomp: ['CRUSHED IT!', 'PREHISTORIC STOMP!', 'SQUASHED!'],
    hurt: ['OUCH! THAT HURT!', 'WATCH THAT CACTUS!', 'STUMBLED HARD!'],
    fury: ['FURY MODE ENGAGED!', 'UNSTOPPABLE GIANT!'],
    ufo: ['UFO INBOUND! PROTECT THE EGGS!', 'ALIEN TRACTOR BEAM!'],
    meteor: ['METEOR SHOWER! DODGE THE SHADOWS!', 'COSMIC RAIN!'],
    herd: ['STAMPEDE AHEAD! HOP ON!', 'HERD CROSSING!'],
    boss: ['BOSS APPROACHING! READY UP!', 'EPIC SHOWDOWN!'],
    victory: ['TOTAL VICTORY!', 'KING OF THE JURASSIC!']
  }
};

export class Narrator {
  constructor(onSubtitle) {
    this.onSubtitle = onSubtitle;
    this.cooldown = 0;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  say(eventKey, force = false) {
    if (!Save.data.settings.narrator) return;
    if (!force && this.cooldown > 0) return;

    const lang = Save.data.settings.lang || 'pt';
    const pool = (LINES[lang] || LINES.pt)[eventKey];
    if (!pool || pool.length === 0) return;

    const text = pool[Math.floor(Math.random() * pool.length)];
    this.cooldown = 2.6;
    if (this.onSubtitle) this.onSubtitle(text);

    try {
      if ('speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang === 'pt' ? 'pt-BR' : 'en-US';
        utter.rate = 1.15;
        utter.pitch = 1.1;
        utter.volume = 0.75;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // Silencioso se API de voz não estiver disponível
    }
  }
}
