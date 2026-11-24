// TabletopIllustratedMap.js
// Mapa 2D Ilustrado com SVG vetorial rico, nós de região, biomas variados e Fog of War (Seção 2.6).

export const REGIONS = [
  { id: 'clearing', name: 'Clareira dos Fósseis', biome: 'jungle', x: 120, y: 350, icon: '🌿', discovered: true },
  { id: 'river_crossing', name: 'Vau do Rio de Âmbar', biome: 'swamp', x: 260, y: 300, icon: '🌊', discovered: true },
  { id: 'crystal_cave', name: 'Caverna dos Cristais Astrais', biome: 'crystal_cave', x: 380, y: 180, icon: '💎', discovered: false },
  { id: 'ancient_ruins', name: 'Ruínas de Rexgard', biome: 'ancient_ruins', x: 500, y: 270, icon: '🏛️', discovered: false },
  { id: 'frozen_peaks', name: 'Picos Glaciais Esquecidos', biome: 'ice', x: 620, y: 120, icon: '❄️', discovered: false },
  { id: 'volcano_caldera', name: 'Caldeira do Dragão-Rex', biome: 'volcano', x: 700, y: 340, icon: '🌋', isBoss: true, discovered: false }
];

export const MAP_CONNECTIONS = [
  { from: 'clearing', to: 'river_crossing' },
  { from: 'river_crossing', to: 'crystal_cave' },
  { from: 'river_crossing', to: 'ancient_ruins' },
  { from: 'crystal_cave', to: 'frozen_peaks' },
  { from: 'ancient_ruins', to: 'volcano_caldera' },
  { from: 'frozen_peaks', to: 'volcano_caldera' }
];

export class TabletopIllustratedMap {
  constructor(options = {}) {
    this.regions = REGIONS.map(r => ({ ...r }));
    this.connections = MAP_CONNECTIONS.slice();
    this.currentRegionId = options.startRegionId || 'clearing';
  }

  getCurrentRegion() {
    return this.regions.find(r => r.id === this.currentRegionId) || this.regions[0];
  }

  travelTo(regionId) {
    const target = this.regions.find(r => r.id === regionId);
    if (!target) return { success: false, reason: 'Região inexistente' };

    const isConnected = this.connections.some(
      c => (c.from === this.currentRegionId && c.to === regionId) || (c.to === this.currentRegionId && c.from === regionId)
    );

    if (!isConnected) return { success: false, reason: 'Caminho bloqueado ou sem rota direta' };

    this.currentRegionId = regionId;
    target.discovered = true;
    return { success: true, region: target, msg: `Você viajou até ${target.name}.` };
  }

  /**
   * Gera o SVG vetorial rico do mapa com relevos, conexões e Fog of War.
   */
  renderSvg(width = 800, height = 500) {
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="rpg-tabletop-map-svg" style="width:100%;height:auto;background:radial-gradient(circle, #1e293b 0%, #0f172a 100%);border-radius:12px;border:1px solid #334155;">`;

    // Desenho de relevo de fundo
    svg += `<defs>
      <linearGradient id="lavaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ef4444" />
        <stop offset="100%" stop-color="#7f1d1d" />
      </linearGradient>
      <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0369a1" />
      </linearGradient>
      <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>`;

    // Linhas de rota
    for (const c of this.connections) {
      const fromR = this.regions.find(r => r.id === c.from);
      const toR = this.regions.find(r => r.id === c.to);
      const isVisible = fromR?.discovered || toR?.discovered;
      const stroke = isVisible ? '#64748b' : '#1e293b';
      const dash = isVisible ? '5,5' : '2,8';

      svg += `<line x1="${fromR.x}" y1="${fromR.y}" x2="${toR.x}" y2="${toR.y}" stroke="${stroke}" stroke-dasharray="${dash}" stroke-width="3" opacity="0.7" />`;
    }

    // Nós de regiões
    for (const reg of this.regions) {
      const isCurrent = reg.id === this.currentRegionId;
      const discovered = reg.discovered;

      if (!discovered) {
        // Fog of War
        svg += `<g class="map-node fog" transform="translate(${reg.x}, ${reg.y})">
          <circle r="22" fill="#1e293b" stroke="#334155" stroke-width="2" />
          <text y="5" text-anchor="middle" font-size="14" fill="#64748b">❓</text>
          <text y="38" text-anchor="middle" font-size="10" fill="#475569" font-family="sans-serif">Terra Incógnita</text>
        </g>`;
      } else {
        const ringColor = isCurrent ? '#fbbf24' : (reg.isBoss ? '#ef4444' : '#38bdf8');
        const filter = isCurrent ? 'filter="url(#glowEffect)"' : '';

        svg += `<g class="map-node discovered" transform="translate(${reg.x}, ${reg.y})" style="cursor:pointer;" data-region-id="${reg.id}">
          <circle r="${isCurrent ? 28 : 22}" fill="#0f172a" stroke="${ringColor}" stroke-width="${isCurrent ? 4 : 2}" ${filter} />
          <text y="7" text-anchor="middle" font-size="${isCurrent ? 20 : 16}">${reg.icon}</text>
          <text y="${isCurrent ? 46 : 38}" text-anchor="middle" font-size="${isCurrent ? 12 : 11}" font-weight="${isCurrent ? 'bold' : 'normal'}" fill="${isCurrent ? '#fde047' : '#e2e8f0'}" font-family="sans-serif">${reg.name}</text>
        </g>`;
      }
    }

    svg += `</svg>`;
    return svg;
  }
}
