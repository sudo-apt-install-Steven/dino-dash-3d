// Filhote companheiro especializado que segue o jogador, concede habilidades ativas/passivas por classe
// (Caçador, Guardião, Sereia Abissal, Batedor Aéreo) e responde ao Pulso Tático da Roda [X].
import { DinoFactory } from './DinoFactory.js';
import { getDinoHabitat, getDinoSpec } from './DinoCatalog.js';

const COMPANION_ROLES = {
  hunter: {
    id: 'hunter',
    label: 'Caçador Alfa',
    icon: '🦴',
    color: '#fb923c',
    magnetRadius: 3.1,
    blockCd: 22,
    autoPerkCd: 13
  },
  guardian: {
    id: 'guardian',
    label: 'Guardião Mineral',
    icon: '🛡️',
    color: '#4ade80',
    magnetRadius: 2.9,
    blockCd: 16,
    autoPerkCd: 10
  },
  siren: {
    id: 'siren',
    label: 'Sereia Abissal',
    icon: '🫧',
    color: '#38bdf8',
    magnetRadius: 3.8,
    blockCd: 22,
    autoPerkCd: 8.5
  },
  scout: {
    id: 'scout',
    label: 'Batedor Aéreo',
    icon: '🪶',
    color: '#fde047',
    magnetRadius: 4.4,
    blockCd: 22,
    autoPerkCd: 9.5
  }
};

export function resolveCompanionRole(dinoId) {
  const spec = getDinoSpec(dinoId);
  const hab = getDinoHabitat(spec);
  if (hab === 'aquatic' || hab === 'amphibious') return COMPANION_ROLES.siren;
  if (hab === 'flying') return COMPANION_ROLES.scout;
  if (spec.dinoClass === 'herbivore') return COMPANION_ROLES.guardian;
  return COMPANION_ROLES.hunter;
}

export class CompanionManager {
  constructor(scene) {
    this.scene = scene;
    this.companion = null;
    this.time = 0;
  }

  spawn(dinoId = 'compsognathus', custom = null) {
    this.clear();
    const spec = getDinoSpec(dinoId);
    const role = resolveCompanionRole(dinoId);
    const model = DinoFactory.build(dinoId, custom);
    model.root.scale.setScalar(0.45);
    this.scene.add(model.root);
    this.companion = {
      dinoId,
      name: spec.name,
      role,
      model,
      x: 0,
      y: 0.2,
      z: 1.4,
      shieldCooldown: 0,
      eggStealCooldown: 0,
      perkCooldown: 3.5,
      commandCooldown: 0,
      emergencyShieldCd: 0
    };
  }

  update(dt, player, spawner, onCollectEgg, opts = {}) {
    if (!this.companion || !player) return;
    this.time += dt;
    const c = this.companion;
    const role = c.role;
    if (c.shieldCooldown > 0) c.shieldCooldown = Math.max(0, c.shieldCooldown - dt);
    if (c.eggStealCooldown > 0) c.eggStealCooldown = Math.max(0, c.eggStealCooldown - dt);
    if (c.perkCooldown > 0) c.perkCooldown = Math.max(0, c.perkCooldown - dt);
    if (c.commandCooldown > 0) c.commandCooldown = Math.max(0, c.commandCooldown - dt);
    if (c.emergencyShieldCd > 0) c.emergencyShieldCd = Math.max(0, c.emergencyShieldCd - dt);

    // Segue ao lado do dono com leve flutuação / nado / voo
    const targetX = player.x + (player.lane === 2 ? -1.1 : 1.1);
    const targetZ = player.z + 1.15;
    c.x += (targetX - c.x) * Math.min(1, dt * 8);
    c.z += (targetZ - c.z) * Math.min(1, dt * 8);
    const bobOffset = role.id === 'scout' ? 0.65 : (player.inSubmerged ? 0.28 : 0.14);
    const diveSink = (player.inSubmerged ? 0.3 : (player.diveDepth || 0) * 1.35);
    c.y = Math.max(-1.2, (player.baseY || 0) + player.y * 0.65 - diveSink) + Math.abs(Math.sin(this.time * 8.5)) * bobOffset;
    c.model.root.position.set(c.x, c.y, c.z);

    // Coleta automática ampliada para Ovos, Frutas e Bolhas de O2 próximas
    if (c.eggStealCooldown <= 0 && spawner) {
      for (const obs of spawner.getActiveObstacles()) {
        if (obs.hit || !['egg', 'fruit', 'oxygen_bubble'].includes(obs.kind)) continue;
        const dist = Math.hypot(obs.group.position.x - c.x, obs.group.position.z - c.z);
        if (dist < role.magnetRadius) {
          obs.hit = true;
          obs.pool?.release(obs);
          c.eggStealCooldown = 0.25;
          if (obs.kind === 'oxygen_bubble') {
            player.oxygen = Math.min(100, (player.oxygen ?? 100) + 34);
            opts.onNotify?.(`${role.icon} ${c.name}: Bolha de O2 (+34%)!`, '#38bdf8');
          } else if (obs.kind === 'fruit') {
            player.stamina = Math.min(100, (player.stamina ?? 100) + 14);
            player.fury = Math.min(100, (player.fury || 0) + 14);
            opts.onNotify?.(`${role.icon} ${c.name} trouxe Fruta!`, '#4ade80');
          } else if (onCollectEgg) {
            onCollectEgg(obs);
          }
          break;
        }
      }
    }

    // Habilidade passiva periódica de cada espécie companheira
    if (c.perkCooldown <= 0 && !player.dead) {
      if (role.id === 'siren') {
        if ((player.oxygen ?? 100) < 62) {
          c.perkCooldown = role.autoPerkCd;
          player.oxygen = Math.min(100, (player.oxygen ?? 100) + 26);
          opts.onNotify?.(`🫧 ${c.name}: Onda de O2 (+26%)!`, '#38bdf8');
        } else if (player.statuses && (player.statuses.mud || player.statuses.poison)) {
          c.perkCooldown = role.autoPerkCd;
          delete player.statuses.mud;
          delete player.statuses.poison;
          opts.onNotify?.(`🫧 ${c.name}: Lavou lama/veneno!`, '#67e8f9');
        }
      } else if (role.id === 'guardian') {
        if (player.hp <= 1 && (player.shields || 0) === 0 && c.emergencyShieldCd <= 0) {
          c.emergencyShieldCd = 38;
          c.perkCooldown = role.autoPerkCd;
          player.shields = Math.min(4, (player.shields || 0) + 1);
          opts.onNotify?.(`🛡️ ${c.name}: Escudo de Emergência!`, '#4ade80');
        } else if ((player.stamina ?? 100) < 78) {
          c.perkCooldown = role.autoPerkCd;
          player.stamina = Math.min(100, (player.stamina ?? 100) + 15);
          opts.onNotify?.(`🌿 ${c.name}: +15 Estamina!`, '#4ade80');
        }
      } else if (role.id === 'scout') {
        if ((player.abilityCharge ?? 100) < 92) {
          c.perkCooldown = role.autoPerkCd;
          player.abilityCharge = Math.min(100, (player.abilityCharge ?? 100) + 14);
          opts.onNotify?.(`🪶 ${c.name}: +14% Carga de Habilidade!`, '#fde047');
        }
      } else if (role.id === 'hunter' && spawner) {
        const threat = spawner.getActiveObstacles().find(
          (obs) => !obs.hit && obs.breakable && Math.abs(obs.group.position.x - player.x) < 1.65 && obs.group.position.z > player.z - 8.5 && obs.group.position.z < player.z - 0.5
        );
        if (threat) {
          c.perkCooldown = role.autoPerkCd;
          threat.hit = true;
          threat.pool?.release(threat);
          player.fury = Math.min(100, (player.fury || 0) + 9);
          opts.onBreakHazard?.(threat);
          opts.onNotify?.(`🦴 ${c.name} destroçou obstáculo!`, '#fb923c');
        }
      }
    }
  }

  tryBlockDamage() {
    if (!this.companion || this.companion.shieldCooldown > 0) return false;
    this.companion.shieldCooldown = this.companion.role?.blockCd || 22;
    return true;
  }

  triggerActiveCommand(player, spawner, opts = {}) {
    if (!this.companion || !player || player.dead) return { ok: false, reason: 'Sem mascote ativo!' };
    const c = this.companion;
    if (c.commandCooldown > 0) {
      return { ok: false, reason: `Mascote recarregando (${c.commandCooldown.toFixed(1)}s)` };
    }
    c.commandCooldown = 14;
    const rId = c.role.id;
    player.oxygen = Math.min(100, (player.oxygen ?? 100) + 32);
    player.stamina = Math.min(100, (player.stamina ?? 100) + 22);
    if (rId === 'guardian') {
      player.shields = Math.min(4, (player.shields || 0) + 1);
      return { ok: true, msg: `🛡️ ${c.name}: Bastião +1 Escudo & +22 Estamina!` };
    }
    if (rId === 'siren') {
      player.oxygen = 100;
      player.invulnTimer = Math.max(player.invulnTimer || 0, 1.8);
      if (player.statuses) {
        delete player.statuses.mud;
        delete player.statuses.poison;
      }
      return { ok: true, msg: `🫧 ${c.name}: Bolha Pura (O2 100% + Purificar)!` };
    }
    if (rId === 'scout') {
      player.abilityCharge = Math.min(100, (player.abilityCharge ?? 100) + 35);
      player.magnetTimer = Math.max(player.magnetTimer || 0, 5.5);
      return { ok: true, msg: `🪶 ${c.name}: Rajada (+35% Habilidade & Ímã)!` };
    }
    // hunter
    let broken = 0;
    if (spawner) {
      for (const obs of spawner.getActiveObstacles()) {
        if (obs.hit || !obs.breakable) continue;
        const dz = obs.group.position.z - player.z;
        if (dz > -18 && dz < 1.5) {
          obs.hit = true;
          obs.pool?.release(obs);
          opts.onBreakHazard?.(obs);
          broken++;
        }
      }
    }
    player.fury = Math.min(100, (player.fury || 0) + 20);
    return { ok: true, msg: `🦴 ${c.name}: Bote Alfa (${broken} destruídos + 20% Fúria)!` };
  }

  getHudStatus() {
    if (!this.companion) return null;
    const c = this.companion;
    return {
      dinoId: c.dinoId,
      name: c.name,
      role: c.role,
      shieldCd: Math.max(0, c.shieldCooldown),
      commandCd: Math.max(0, c.commandCooldown)
    };
  }

  clear() {
    if (this.companion) {
      this.scene.remove(this.companion.model.root);
      this.companion = null;
    }
  }
}
