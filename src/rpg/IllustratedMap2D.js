// Mapa 2D Ilustrado Cartográfico de Alta Qualidade com Fog of War Radial, Rios Curvos,
// Biomas Desenhados à Mão (Árvores, Vulcões, Cristais, Ruínas, Vilarejos) e Pins Interativos (Parte 2.6).

export const DEFAULT_WORLD_NODES = Object.freeze([
  { id: 'emerald_nest',   name: 'Ninho Esmeralda',      biome: 'jurassic_forest', kind: 'village',    x: 0.16, y: 0.68, discovered: true },
  { id: 'amber_bazaar',   name: 'Entreposto de Âmbar',  biome: 'savanna',         kind: 'merchant',   x: 0.31, y: 0.56, discovered: true },
  { id: 'fossil_forge',   name: 'Forja do Anquilossauro',biome: 'ancient_ruins',  kind: 'blacksmith', x: 0.44, y: 0.66, discovered: false },
  { id: 'whisper_swamp',  name: 'Brejo das Brumas',     biome: 'swamp',           kind: 'danger',     x: 0.36, y: 0.36, discovered: false },
  { id: 'amethyst_vault', name: 'Gruta de Ametista',    biome: 'crystal_cavern',  kind: 'quest',      x: 0.56, y: 0.42, discovered: false },
  { id: 'frost_pass',     name: 'Passo Glacial',        biome: 'ice_age',         kind: 'shrine',     x: 0.64, y: 0.22, discovered: false },
  { id: 'obsidian_throne',name: 'Cratera do Rei Magma', biome: 'volcano',         kind: 'boss',       x: 0.82, y: 0.48, discovered: false },
  { id: 'star_monolith',  name: 'Monólito Estelar',     biome: 'alien_planet',    kind: 'boss',       x: 0.86, y: 0.24, discovered: false }
]);

export const DEFAULT_WORLD_EDGES = Object.freeze([
  ['emerald_nest', 'amber_bazaar'],
  ['amber_bazaar', 'fossil_forge'],
  ['amber_bazaar', 'whisper_swamp'],
  ['whisper_swamp', 'amethyst_vault'],
  ['fossil_forge', 'amethyst_vault'],
  ['amethyst_vault', 'frost_pass'],
  ['amethyst_vault', 'obsidian_throne'],
  ['frost_pass', 'star_monolith'],
  ['obsidian_throne', 'star_monolith']
]);

export class IllustratedMap2D {
  constructor(canvasEl, { nodes = DEFAULT_WORLD_NODES, edges = DEFAULT_WORLD_EDGES, onSelectNode = null } = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl?.getContext?.('2d') || null;
    this.nodes = nodes.map((n) => ({ ...n }));
    this.edges = edges;
    this.currentNodeId = this.nodes[0]?.id || 'emerald_nest';
    this.fogOfWarEnabled = true;
    this.onSelectNode = onSelectNode;
    this._bindClicks();
  }

  discoverNode(nodeId) {
    const target = this.nodes.find((n) => n.id === nodeId);
    if (target) target.discovered = true;
    // Revela vizinhos próximos como rumores no mapa
    for (const [a, b] of this.edges) {
      if (a === nodeId || b === nodeId) {
        const nb = this.nodes.find((n) => n.id === (a === nodeId ? b : a));
        if (nb) nb.rumored = true;
      }
    }
    this.render();
  }

  setCurrentNode(nodeId) {
    this.currentNodeId = nodeId;
    this.discoverNode(nodeId);
  }

  _bindClicks() {
    if (!this.canvas) return;
    this._onClick = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / Math.max(1, rect.width);
      const sy = (e.clientY - rect.top) / Math.max(1, rect.height);
      const hit = this.nodes.find((n) => (n.discovered || n.rumored) && Math.hypot(n.x - sx, n.y - sy) < 0.055);
      if (hit) this.onSelectNode?.(hit);
    };
    this.canvas.addEventListener('click', this._onClick);
  }

  destroy() {
    if (this.canvas && this._onClick) {
      this.canvas.removeEventListener('click', this._onClick);
    }
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width || 760;
    const h = this.canvas.height || 420;
    const ctx = this.ctx;

    // Oceano Cartográfico Escuro + Linhas Náuticas
    const sea = ctx.createLinearGradient(0, 0, w, h);
    sea.addColorStop(0, '#091926');
    sea.addColorStop(1, '#0d2638');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(125, 211, 252, 0.07)';
    ctx.lineWidth = 1;
    for (let g = 40; g < w; g += 64) {
      ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, h); ctx.stroke();
    }
    for (let g = 40; g < h; g += 64) {
      ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(w, g); ctx.stroke();
    }

    // Continente Pergaminho Jurássico desenhado com curvas Bezier orgânicas (ZERO blocos quadrados!)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w * 0.07, h * 0.72);
    ctx.bezierCurveTo(w * 0.05, h * 0.34, w * 0.24, h * 0.14, w * 0.52, h * 0.12);
    ctx.bezierCurveTo(w * 0.78, h * 0.08, w * 0.95, h * 0.22, w * 0.93, h * 0.55);
    ctx.bezierCurveTo(w * 0.91, h * 0.84, w * 0.64, h * 0.90, w * 0.40, h * 0.86);
    ctx.bezierCurveTo(w * 0.20, h * 0.88, w * 0.09, h * 0.86, w * 0.07, h * 0.72);
    ctx.closePath();

    const land = ctx.createRadialGradient(w * 0.48, h * 0.48, 24, w * 0.5, h * 0.5, w * 0.5);
    land.addColorStop(0, '#3a2e21');
    land.addColorStop(0.68, '#2b2218');
    land.addColorStop(1, '#1f1812');
    ctx.fillStyle = land;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#a16207';
    ctx.stroke();

    // Rio Sinuoso Ilustrado cortando o continente
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.63, h * 0.20);
    ctx.bezierCurveTo(w * 0.50, h * 0.36, w * 0.46, h * 0.55, w * 0.24, h * 0.84);
    ctx.stroke();
    ctx.restore();

    // Ilustrações manuais de terreno (florestas, cordilheiras, cristais, vulcão)
    this._drawHandDrawnFeatures(ctx, w, h);

    // Trilhas pontilhadas entre regiões
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2.2;
    for (const [idA, idB] of this.edges) {
      const a = this.nodes.find((n) => n.id === idA);
      const b = this.nodes.find((n) => n.id === idB);
      if (!a || !b) continue;
      ctx.strokeStyle = (a.discovered && b.discovered) ? '#fbbf24' : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.quadraticCurveTo(((a.x + b.x) * 0.5) * w, ((a.y + b.y) * 0.5 - 0.03) * h, b.x * w, b.y * h);
      ctx.stroke();
    }
    ctx.restore();

    // Pins de locais + rótulos
    for (const n of this.nodes) {
      this._drawNodePin(ctx, n, w, h);
    }

    // Fog of War suave radial sobre áreas ainda não descobertas
    if (this.fogOfWarEnabled) {
      this._applyRadialFogOfWar(ctx, w, h);
    }

    // Rosa dos Ventos Cartográfica no canto
    this._drawCompassRose(ctx, w - 44, h - 44, 24);
  }

  _drawHandDrawnFeatures(ctx, w, h) {
    // Árvores desenhadas no sudoeste
    ctx.fillStyle = '#15803d';
    for (const [tx, ty] of [[0.14, 0.60], [0.19, 0.73], [0.23, 0.64], [0.12, 0.69]]) {
      const x = tx * w, y = ty * h;
      ctx.beginPath();
      ctx.moveTo(x, y - 14); ctx.lineTo(x - 8, y + 4); ctx.lineTo(x + 8, y + 4); ctx.closePath();
      ctx.fill();
    }
    // Cordilheiras e Vulcão no leste
    for (const [mx, my, isVolc] of [[0.60, 0.20, false], [0.68, 0.25, false], [0.82, 0.45, true]]) {
      const x = mx * w, y = my * h;
      ctx.fillStyle = isVolc ? '#7f1d1d' : '#57534e';
      ctx.beginPath();
      ctx.moveTo(x - 18, y + 12); ctx.lineTo(x, y - 18); ctx.lineTo(x + 18, y + 12); ctx.closePath();
      ctx.fill();
      if (isVolc) {
        ctx.fillStyle = '#f97316';
        ctx.beginPath(); ctx.arc(x, y - 15, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Cristais no centro
    ctx.fillStyle = '#c084fc';
    for (const [cx, cy] of [[0.54, 0.39], [0.58, 0.45]]) {
      const x = cx * w, y = cy * h;
      ctx.beginPath();
      ctx.moveTo(x, y - 12); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x + 5, y + 4); ctx.closePath();
      ctx.fill();
    }
  }

  _drawNodePin(ctx, n, w, h) {
    if (!n.discovered && !n.rumored && this.fogOfWarEnabled) return;
    const x = n.x * w;
    const y = n.y * h;
    const isCurrent = n.id === this.currentNodeId;
    const colorByKind = {
      village: '#10b981', merchant: '#f59e0b', blacksmith: '#fb923c',
      quest: '#c084fc', shrine: '#38bdf8', danger: '#f43f5e', boss: '#ef4444'
    };
    const col = colorByKind[n.kind] || '#fbbf24';

    ctx.save();
    if (isCurrent) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = n.discovered ? col : '#52525b';
    ctx.strokeStyle = '#fafafa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = n.discovered ? '#fef3c7' : '#a1a1aa';
    ctx.fillText(n.discovered ? n.name : '???', x, y + 24);
    ctx.restore();
  }

  _applyRadialFogOfWar(ctx, w, h) {
    if (typeof document === 'undefined') return;
    const fog = document.createElement('canvas');
    fog.width = w;
    fog.height = h;
    const fctx = fog.getContext('2d');
    if (!fctx) return;

    fctx.fillStyle = 'rgba(7, 8, 12, 0.84)';
    fctx.fillRect(0, 0, w, h);
    fctx.globalCompositeOperation = 'destination-out';

    for (const n of this.nodes) {
      if (!n.discovered && !n.rumored) continue;
      const radius = n.discovered ? Math.max(w, h) * 0.19 : Math.max(w, h) * 0.09;
      const grad = fctx.createRadialGradient(n.x * w, n.y * h, radius * 0.25, n.x * w, n.y * h, radius);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = grad;
      fctx.beginPath();
      fctx.arc(n.x * w, n.y * h, radius, 0, Math.PI * 2);
      fctx.fill();
    }

    ctx.drawImage(fog, 0, 0);
  }

  _drawCompassRose(ctx, cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#fbbf24';
    ctx.fillStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(-4, 0); ctx.lineTo(4, 0); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
