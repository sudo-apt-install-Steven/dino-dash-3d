// Detecção de colisão AABB, pisoteio (stomp), wall-jump em pedras altas, rampas e quase-colisão.

export class PhysicsCollision {
  static getPlayerBox(player) {
    const scale = (player.giantScale || 1) * (player.hitboxScale || 1);
    const isHorizontalSwim = Boolean(player.inSubmerged || (player.inWater && (player.diveDepth || 0) > 0.35));
    const height = (player.ducking || player.sliding ? 0.96 : (isHorizontalSwim ? 1.18 : 1.85)) * scale;
    const halfW = 0.38 * scale * (player.smallHitbox ? 0.75 : 1);
    const halfD = 0.44 * scale * (player.smallHitbox ? 0.75 : 1);
    const diveOffset = player.inSubmerged ? 0.2 : (player.diveDepth || 0) * 2.75;
    const wy = (player.baseY || 0) + player.y - diveOffset;
    return {
      minX: player.x - halfW,
      maxX: player.x + halfW,
      minY: wy + 0.05,
      maxY: wy + height,
      minZ: player.z - halfD,
      maxZ: player.z + halfD
    };
  }

  static checkObstacleHit(pBox, obs) {
    const ox = obs.group.position.x;
    const oy = obs.group.position.y;
    const oz = obs.group.position.z;
    const margin = 0.08;
    const oMinX = ox - obs.halfW + margin;
    const oMaxX = ox + obs.halfW - margin;
    const oMinY = oy + obs.minY + margin;
    const oMaxY = oy + obs.maxY - margin;
    const oMinZ = oz - obs.halfD + margin;
    const oMaxZ = oz + obs.halfD - margin;

    return (
      pBox.minX <= oMaxX &&
      pBox.maxX >= oMinX &&
      pBox.minY <= oMaxY &&
      pBox.maxY >= oMinY &&
      pBox.minZ <= oMaxZ &&
      pBox.maxZ >= oMinZ
    );
  }

  static isStompHit(player, pBox, obs) {
    if (!obs.stompable) return false;
    const topY = obs.group.position.y + obs.maxY;
    return player.vy < 0.5 && pBox.minY >= topY - 0.55;
  }

  static checkNearMiss(pBox, obs) {
    if (obs.nearMissed || obs.hit || obs.nonHazard) return false;
    if (['egg', 'powerup', 'ramp', 'speed_pad', 'trampoline', 'mud_pool', 'toxic_pool', 'tar_pit', 'campfire', 'shortcut', 'fruit', 'elemental_egg', 'treasure', 'grapple_point', 'gravity_zone', 'minecart_zone', 'river_log', 'bifurcation', 'oasis_zone', 'fragile_bridge', 'rescue_cross', 'oxygen_bubble', 'current_ring'].includes(obs.kind)) return false;
    const oz = obs.group.position.z;
    if (oz < pBox.maxZ || oz > pBox.maxZ + 1.15) return false;
    const ox = obs.group.position.x;
    const obsMinY = obs.group.position.y + obs.minY;
    const obsMaxY = obs.group.position.y + obs.maxY;
    const dx = Math.abs((pBox.minX + pBox.maxX) * 0.5 - ox);
    const dy = pBox.minY - obsMaxY;
    const verticalOverlap = pBox.maxY > obsMinY - 0.15 && pBox.minY < obsMaxY + 0.75;
    const closeSide = dx < obs.halfW + 1.05 && dy < 0.7 && verticalOverlap;
    const closeJump = dx < obs.halfW + 0.52 && dy >= 0 && dy < 0.72;
    return closeSide || closeJump;
  }
}
