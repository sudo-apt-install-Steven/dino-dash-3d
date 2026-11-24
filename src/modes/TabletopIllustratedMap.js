// TabletopIllustratedMap.js
// Mapa 2D Cartográfico Ilustrado com SVG vetorial rico desenhado à mão (continente Bezier, rios,
// florestas, cristais, ruínas, picos glaciais, caldeira vulcânica, ícones vetoriais próprios sem emojis
// e Fog of War radial suave — Seção 2.6).

export const REGIONS = [
  { id: 'clearing', name: 'Clareira dos Fósseis', biome: 'jungle', x: 130, y: 360, kind: 'forest', discovered: true },
  { id: 'river_crossing', name: 'Vau do Rio de Âmbar', biome: 'swamp', x: 270, y: 300, kind: 'river', discovered: true },
  { id: 'crystal_cave', name: 'Caverna dos Cristais Astrais', biome: 'crystal_cave', x: 390, y: 185, kind: 'crystal', discovered: false },
  { id: 'ancient_ruins', name: 'Ruínas de Rexgard', biome: 'ancient_ruins', x: 510, y: 275, kind: 'ruins', discovered: false },
  { id: 'frozen_peaks', name: 'Picos Glaciais Esquecidos', biome: 'ice', x: 625, y: 125, kind: 'ice', discovered: false },
  { id: 'volcano_caldera', name: 'Caldeira do Dragão-Rex', biome: 'volcano', x: 700, y: 340, kind: 'volcano', isBoss: true, discovered: false }
];

export const MAP_CONNECTIONS = [
  { from: 'clearing', to: 'river_crossing' },
  { from: 'river_crossing', to: 'crystal_cave' },
  { from: 'river_crossing', to: 'ancient_ruins' },
  { from: 'crystal_cave', to: 'frozen_peaks' },
  { from: 'ancient_ruins', to: 'volcano_caldera' },
  { from: 'frozen_peaks', to: 'volcano_caldera' }
];

function renderVectorPinGlyph(kind = 'forest') {
  switch (kind) {
    case 'river':
      return `<path d="M-9 2Q-4 -4 0 2T9 2M-9 -4Q-4 -10 0 -4T9 -4" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'crystal':
      return `<polygon points="0,-11 7,-2 4,9 -4,9 -7,-2" fill="#c084fc" stroke="#f5d0fe" stroke-width="1.4"/>`;
    case 'ruins':
      return `<path d="M-9 8H9M-7 8V-4M0 8V-4M7 8V-4M-9 -4L0 -10L9 -4Z" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linejoin="round"/>`;
    case 'ice':
      return `<path d="M-10 8L-2 -9L6 8ZM-1 8L5 -5L11 8Z" fill="#7dd3fc" stroke="#e0f2fe" stroke-width="1.3"/>`;
    case 'volcano':
      return `<polygon points="-10,9 -3,-7 3,-7 10,9" fill="#b91c1c" stroke="#fb923c" stroke-width="1.6"/><circle cx="0" cy="-9" r="2.6" fill="#fde047"/>`;
    case 'fog':
      return `<path d="M-4 -4A4 4 0 1 1 3 0C1 1.5 0 2.5 0 4.5M0 8.5V9" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round"/>`;
    default:
      return `<polygon points="0,-11 -8,3 8,3" fill="#22c55e"/><rect x="-2" y="3" width="4" height="6" fill="#78350f"/>`;
  }
}

export class TabletopIllustratedMap {
  constructor(options = {}) {
    this.regions = REGIONS.map((r) => ({ ...r }));
    this.connections = MAP_CONNECTIONS.slice();
    this.currentRegionId = options.startRegionId || 'clearing';
  }

  getCurrentRegion() {
    return this.regions.find((r) => r.id === this.currentRegionId) || this.regions[0];
  }

  travelTo(regionId) {
    const target = this.regions.find((r) => r.id === regionId);
    if (!target) return { success: false, reason: 'Região inexistente' };

    const isConnected = this.connections.some(
      (c) => (c.from === this.currentRegionId && c.to === regionId) || (c.to === this.currentRegionId && c.from === regionId)
    );

    if (!isConnected) return { success: false, reason: 'Caminho bloqueado ou sem rota direta' };

    this.currentRegionId = regionId;
    target.discovered = true;
    return { success: true, region: target, msg: `Você viajou até ${target.name}.` };
  }

  /**
   * Gera o SVG cartográfico ilustrado à mão com continente orgânico, rios, montanhas, árvores, cristais e Fog of War.
   */
  renderSvg(width = 800, height = 500) {
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="rpg-tabletop-map-svg" style="width:100%;height:auto;background:radial-gradient(circle at 50% 45%, #0c2233 0%, #07131e 100%);border-radius:14px;border:1px solid rgba(245,158,11,0.38);">`;

    svg += `<defs>
      <radialGradient id="parchmentLand" cx="48%" cy="48%" r="55%">
        <stop offset="0%" stop-color="#3d3022" />
        <stop offset="70%" stop-color="#292017" />
        <stop offset="100%" stop-color="#1b1510" />
      </radialGradient>
      <filter id="glowEffect" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>`;

    // Continente Ilustrado Desenhado à Mão + Rio Sinuoso + Relevos
    svg += `<path d="M55,375 C42,205 165,75 410,62 C615,48 755,115 752,290 C748,430 565,455 340,438 C175,445 72,432 55,375 Z" fill="url(#parchmentLand)" stroke="#b45309" stroke-width="3"/>`;
    svg += `<path d="M615,105 C500,195 375,255 215,428" fill="none" stroke="#0ea5e9" stroke-width="5.5" stroke-linecap="round" opacity="0.78"/>`;

    // Floresta, Cordilheira e Cristais desenhados na cartografia
    svg += `<g opacity="0.68">
      <polygon points="92,320 82,340 102,340" fill="#15803d"/><polygon points="165,385 155,405 175,405" fill="#16a34a"/>
      <polygon points="575,115 552,152 598,152" fill="#475569"/><polygon points="655,102 632,144 678,144" fill="#64748b"/>
      <polygon points="362,155 355,175 369,175" fill="#a855f7"/><polygon points="418,162 411,182 425,182" fill="#c084fc"/>
      <polygon points="672,305 648,348 696,348" fill="#7f1d1d"/><circle cx="672" cy="302" r="4.5" fill="#f97316"/>
    </g>`;

    // Trilhas de viagem
    for (const c of this.connections) {
      const fromR = this.regions.find((r) => r.id === c.from);
      const toR = this.regions.find((r) => r.id === c.to);
      const isVisible = fromR?.discovered || toR?.discovered;
      const stroke = (fromR?.discovered && toR?.discovered) ? '#fbbf24' : (isVisible ? '#64748b' : '#1e293b');
      const dash = isVisible ? '6,6' : '2,8';
      const midX = (fromR.x + toR.x) * 0.5;
      const midY = (fromR.y + toR.y) * 0.5 - 14;
      svg += `<path d="M${fromR.x},${fromR.y} Q${midX},${midY} ${toR.x},${toR.y}" fill="none" stroke="${stroke}" stroke-dasharray="${dash}" stroke-width="3" opacity="0.82" />`;
    }

    // Nós de regiões com ícones vetoriais próprios (ZERO emojis) + Fog of War
    for (const reg of this.regions) {
      const isCurrent = reg.id === this.currentRegionId;
      if (!reg.discovered) {
        svg += `<g class="map-node fog" transform="translate(${reg.x}, ${reg.y})">
          <circle r="44" fill="rgba(7,10,16,0.58)" />
          <circle r="22" fill="#18181b" stroke="#3f3f46" stroke-width="2" />
          ${renderVectorPinGlyph('fog')}
          <text y="38" text-anchor="middle" font-size="10.5" fill="#71717a" font-family="Inter, sans-serif">Terra Incógnita</text>
        </g>`;
      } else {
        const ringColor = isCurrent ? '#fbbf24' : (reg.isBoss ? '#f43f5e' : '#38bdf8');
        const filter = isCurrent ? 'filter="url(#glowEffect)"' : '';
        svg += `<g class="map-node discovered" transform="translate(${reg.x}, ${reg.y})" style="cursor:pointer;" data-region-id="${reg.id}">
          <circle r="${isCurrent ? 27 : 22}" fill="#09090b" stroke="${ringColor}" stroke-width="${isCurrent ? 3.6 : 2.2}" ${filter} />
          ${renderVectorPinGlyph(reg.kind)}
          <text y="${isCurrent ? 45 : 38}" text-anchor="middle" font-size="${isCurrent ? 12 : 11}" font-weight="${isCurrent ? '800' : '600'}" fill="${isCurrent ? '#fde047' : '#f4f4f5'}" font-family="Inter, sans-serif">${reg.name}</text>
        </g>`;
      }
    }

    // Rosa dos Ventos Cartográfica
    svg += `<g transform="translate(${width - 46}, ${height - 46})" opacity="0.85">
      <circle r="22" fill="rgba(9,9,11,0.65)" stroke="#d97706" stroke-width="1.5"/>
      <polygon points="0,-19 -4,0 4,0" fill="#fde047"/>
      <polygon points="0,19 -4,0 4,0" fill="#a16207"/>
      <polygon points="-19,0 0,-4 0,4" fill="#a16207"/>
      <polygon points="19,0 0,-4 0,4" fill="#a16207"/>
    </g></svg>`;
    return svg;
  }
}
