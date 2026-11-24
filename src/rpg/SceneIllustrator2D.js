// Compositor 2D de Cenas Ilustradas por Camadas + Protagonista Dinossauro Reativo + Cartas Ilustradas (Partes 2.4, 2.6, 2.8).
// Camadas: 1) Céu/Atmosfera, 2) Horizonte do Bioma (12 biomas ricos), 3) Meio-Plano & NPC/Boss,
//          4) Dinossauro Protagonista com emoções e reação à ação/rolagem, 5) Clima/Partículas/Vinheta.
import { escapeHtml } from '../security/Sanitize.js';

export const RPG_ILLUSTRATED_BIOMES = Object.freeze({
  jurassic_forest: { name: 'Floresta Jurássica', skyTop: '#0d2b24', skyBot: '#1f5c43', far: '#133d2e', mid: '#1b4d38', ground: '#2a3d24', accent: '#34d399', weather: 'spores' },
  savanna:         { name: 'Savana Dourada',     skyTop: '#451a03', skyBot: '#d97706', far: '#78350f', mid: '#92400e', ground: '#713f12', accent: '#fbbf24', weather: 'dust' },
  desert:          { name: 'Deserto Âmbar',      skyTop: '#3b1508', skyBot: '#c2410c', far: '#9a3412', mid: '#b45309', ground: '#854d0e', accent: '#fde047', weather: 'dust' },
  swamp:           { name: 'Pântano Sombrio',    skyTop: '#0b1c17', skyBot: '#1e3a2f', far: '#132a22', mid: '#1d3c30', ground: '#18261e', accent: '#a3e635', weather: 'spores' },
  ice_age:         { name: 'Era Glacial',        skyTop: '#0c1f38', skyBot: '#1e4e79', far: '#1e3a5f', mid: '#3b6a94', ground: '#cbd5e1', accent: '#7dd3fc', weather: 'snow' },
  volcano:         { name: 'Caldeira Vulcânica', skyTop: '#1f0808', skyBot: '#7f1d1d', far: '#450a0a', mid: '#292524', ground: '#1c1917', accent: '#f97316', weather: 'embers' },
  crystal_cavern:  { name: 'Caverna de Cristais',skyTop: '#140b29', skyBot: '#3b1d6e', far: '#251347', mid: '#311b5e', ground: '#1e1b4b', accent: '#c084fc', weather: 'spores' },
  ancient_ruins:   { name: 'Ruínas Antigas',     skyTop: '#1c1917', skyBot: '#57534e', far: '#44403c', mid: '#574c3f', ground: '#3b332b', accent: '#eab308', weather: 'dust' },
  beach_sea:       { name: 'Mar & Recife',       skyTop: '#082f49', skyBot: '#0284c7', far: '#0369a1', mid: '#0d9488', ground: '#d6c28a', accent: '#22d3ee', weather: 'mist' },
  mountain:        { name: 'Picos Nebulosos',    skyTop: '#0f172a', skyBot: '#334155', far: '#1e293b', mid: '#475569', ground: '#334155', accent: '#93c5fd', weather: 'snow' },
  medieval_dino:   { name: 'Reino Jurássico',    skyTop: '#1e1b4b', skyBot: '#4c1d95', far: '#312e81', mid: '#3f3cbb', ground: '#27272a', accent: '#facc15', weather: 'embers' },
  alien_planet:    { name: 'Planeta Xenomorfo',  skyTop: '#170926', skyBot: '#581c87', far: '#3b0764', mid: '#4c1d95', ground: '#2e1065', accent: '#2dd4bf', weather: 'stars' }
});

export const DINO_EMOTIONS = Object.freeze([
  'determined', 'curious', 'roaring', 'stealth', 'hurt', 'triumphant', 'mystic'
]);

export class SceneIllustrator2D {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl?.getContext?.('2d') || null;
    this.state = {
      biomeId: 'jurassic_forest',
      emotion: 'determined',
      actionPose: 'idle', // 'idle' | 'advance' | 'attack' | 'defend' | 'hurt' | 'roar'
      dinoColors: { primary: '#22c55e', secondary: '#bef264', eye: '#facc15' },
      dinoPosture: 'biped',
      npc: null, // { name, role, archetype, hpRatio, hostile }
      timeOfDay: 'dusk',
      tension: 0.25
    };
    this._particles = Array.from({ length: 34 }, (_, i) => ({
      x: ((i * 79) % 100) / 100,
      y: ((i * 47) % 100) / 100,
      s: 1.5 + (i % 4) * 1.1,
      v: 0.03 + (i % 5) * 0.015,
      phase: i * 0.9
    }));
    this._raf = 0;
    this._t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    this._poseTimer = 0;
  }

  setScene(patch = {}) {
    if (patch.actionPose && patch.actionPose !== 'idle') {
      this._poseTimer = 1.35;
    }
    this.state = {
      ...this.state,
      ...patch,
      dinoColors: { ...this.state.dinoColors, ...(patch.dinoColors || {}) }
    };
    this.renderFrame(0.016);
  }

  startLoop() {
    if (this._raf || typeof requestAnimationFrame !== 'function') return;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      this.renderFrame(dt, (now - this._t0) / 1000);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (this._raf && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  renderFrame(dt = 0.016, elapsed = 0) {
    if (!this.ctx || !this.canvas) return;
    if (this._poseTimer > 0) {
      this._poseTimer = Math.max(0, this._poseTimer - dt);
      if (this._poseTimer === 0) this.state.actionPose = 'idle';
    }

    const w = this.canvas.width || 800;
    const h = this.canvas.height || 380;
    const ctx = this.ctx;
    const biome = RPG_ILLUSTRATED_BIOMES[this.state.biomeId] || RPG_ILLUSTRATED_BIOMES.jurassic_forest;

    // CAMADA 1: Céu & Halo Atmosférico
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
    sky.addColorStop(0, biome.skyTop);
    sky.addColorStop(1, biome.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const orbX = w * 0.72;
    const orbY = h * 0.24 + Math.sin(elapsed * 0.6) * 4;
    const glow = ctx.createRadialGradient(orbX, orbY, 6, orbX, orbY, h * 0.34);
    glow.addColorStop(0, biome.accent);
    glow.addColorStop(0.25, `${biome.accent}44`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // CAMADA 2: Cordilheiras / Silhuetas Distantes (Parallax)
    this._drawMountainRidge(ctx, w, h, h * 0.56, 48, biome.far, 1.1);
    this._drawMountainRidge(ctx, w, h, h * 0.66, 34, biome.mid, 2.3);

    // Elementos específicos do bioma (cristais, árvores jurássicas, torres ou crateras)
    this._drawBiomeLandmarks(ctx, w, h, biome, elapsed);

    // CAMADA 3: Solo Ilustrado em Camadas
    ctx.fillStyle = biome.ground;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.76);
    ctx.quadraticCurveTo(w * 0.5, h * 0.71, w, h * 0.77);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // CAMADA 4: Dinossauro Protagonista Reativo + NPC/Inimigo Ilustrado
    this._drawReactiveDino(ctx, w * 0.27, h * 0.79, elapsed);
    if (this.state.npc) {
      this._drawNpcOrEnemy(ctx, w * 0.73, h * 0.78, this.state.npc, biome.accent, elapsed);
    }

    // CAMADA 5: Partículas Climáticas + Vinheta Editorial
    this._drawWeatherParticles(ctx, w, h, biome, dt, elapsed);
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.28, w * 0.5, h * 0.5, w * 0.68);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(5,5,9,${0.42 + this.state.tension * 0.22})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  _drawMountainRidge(ctx, w, h, baseY, amp, color, seed) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 32) {
      const y = baseY - Math.abs(Math.sin(x * 0.006 + seed) * amp + Math.cos(x * 0.013 + seed * 2) * (amp * 0.45));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  _drawBiomeLandmarks(ctx, w, h, biome, elapsed) {
    ctx.save();
    const id = this.state.biomeId;
    const positions = [0.1, 0.22, 0.48, 0.62, 0.88];
    for (let i = 0; i < positions.length; i++) {
      const x = w * positions[i];
      const baseY = h * 0.74;
      const scale = 0.75 + (i % 3) * 0.22;
      if (id === 'crystal_cavern' || id === 'alien_planet') {
        ctx.fillStyle = i % 2 ? biome.accent : '#a855f7';
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.moveTo(x - 14 * scale, baseY);
        ctx.lineTo(x, baseY - 64 * scale);
        ctx.lineTo(x + 14 * scale, baseY);
        ctx.closePath();
        ctx.fill();
      } else if (id === 'ancient_ruins' || id === 'medieval_dino') {
        ctx.fillStyle = '#44403c';
        ctx.fillRect(x - 10 * scale, baseY - 58 * scale, 20 * scale, 58 * scale);
        ctx.fillRect(x - 15 * scale, baseY - 64 * scale, 30 * scale, 8 * scale);
      } else {
        // Árvore/Samambaia Jurássica estilizada
        ctx.fillStyle = '#3b2314';
        ctx.fillRect(x - 4 * scale, baseY - 46 * scale, 8 * scale, 46 * scale);
        ctx.fillStyle = biome.mid;
        const sway = Math.sin(elapsed * 1.4 + i) * 3;
        for (let frond = -2; frond <= 2; frond++) {
          ctx.beginPath();
          ctx.ellipse(x + frond * 11 * scale + sway, baseY - 48 * scale + Math.abs(frond) * 4, 16 * scale, 7 * scale, frond * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  _drawReactiveDino(ctx, cx, groundY, elapsed) {
    const pose = this.state.actionPose;
    const emo = this.state.emotion;
    const c = this.state.dinoColors;
    const breath = Math.sin(elapsed * 2.6) * 3;
    let offsetX = 0;
    let crouchY = 0;
    let jawOpen = 0;

    if (pose === 'attack' || pose === 'advance') offsetX = 34 * Math.sin(Math.min(1, this._poseTimer) * Math.PI);
    else if (pose === 'hurt') offsetX = -20;
    else if (pose === 'defend' || emo === 'stealth') crouchY = 14;
    if (pose === 'roar' || emo === 'roaring' || emo === 'triumphant') jawOpen = 10 + Math.sin(elapsed * 14) * 3;

    ctx.save();
    ctx.translate(cx + offsetX, groundY + crouchY);

    // Sombra elíptica no solo
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 6 - crouchY, 58, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cauda articulada com balanço orgânico
    const tailSwing = Math.sin(elapsed * 3.1) * 6;
    ctx.fillStyle = c.primary;
    ctx.beginPath();
    ctx.moveTo(-22, -38 + breath);
    ctx.quadraticCurveTo(-78, -52 + tailSwing, -108, -32 + tailSwing * 1.4);
    ctx.quadraticCurveTo(-74, -20 + tailSwing, -18, -18 + breath);
    ctx.closePath();
    ctx.fill();

    // Pernas musculosas
    ctx.fillStyle = c.primary;
    ctx.fillRect(-18, -32, 16, 34);
    ctx.fillRect(8, -32, 16, 34);

    // Torso robusto + barriga secundária
    ctx.beginPath();
    ctx.ellipse(0, -48 + breath, 42, 27, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.secondary;
    ctx.beginPath();
    ctx.ellipse(6, -39 + breath, 30, 14, -0.15, 0, Math.PI);
    ctx.fill();

    // Espinhos dorsais
    ctx.fillStyle = c.secondary;
    for (let s = -2; s <= 2; s++) {
      ctx.beginPath();
      ctx.moveTo(s * 12 - 5, -70 + breath);
      ctx.lineTo(s * 12, -83 + breath);
      ctx.lineTo(s * 12 + 5, -70 + breath);
      ctx.closePath();
      ctx.fill();
    }

    // Pescoço + Cabeça expressiva
    ctx.fillStyle = c.primary;
    ctx.beginPath();
    ctx.roundRect(18, -88 + breath, 24, 34, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(22, -108 + breath, 52, 26, 9);
    ctx.fill();

    // Mandíbula reativa
    ctx.save();
    ctx.translate(30, -83 + breath);
    ctx.rotate((jawOpen * Math.PI) / 180);
    ctx.fillStyle = c.secondary;
    ctx.beginPath();
    ctx.roundRect(0, 0, 40, 11, 5);
    ctx.fill();
    ctx.restore();

    // Olho expressivo conforme emoção narrada pelo Mestre IA
    ctx.fillStyle = emo === 'mystic' ? '#c084fc' : (emo === 'hurt' ? '#f87171' : (c.eye || '#facc15'));
    ctx.beginPath();
    ctx.arc(50, -98 + breath, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Ondas de rugido se em crítico / rugindo
    if (jawOpen > 6) {
      ctx.strokeStyle = 'rgba(250,204,21,0.65)';
      ctx.lineWidth = 2.5;
      for (let r = 1; r <= 2; r++) {
        ctx.beginPath();
        ctx.arc(82, -92 + breath, 14 * r + ((elapsed * 24) % 12), -0.65, 0.65);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _drawNpcOrEnemy(ctx, cx, groundY, npc, accent, elapsed) {
    const bob = Math.sin(elapsed * 2.2 + 1) * 4;
    ctx.save();
    ctx.translate(cx, groundY);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 48, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyCol = npc.hostile ? '#9f1239' : '#0f766e';
    const rimCol = npc.hostile ? '#fb7185' : accent;
    ctx.fillStyle = bodyCol;
    ctx.strokeStyle = rimCol;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -52 + bob, 38, 32, 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cabeça silhueta distinta voltada para o jogador (-X)
    ctx.beginPath();
    ctx.roundRect(-62, -96 + bob, 48, 26, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = npc.hostile ? '#fde047' : '#a7f3d0';
    ctx.beginPath();
    ctx.arc(-44, -85 + bob, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Nome + Barra de Vida integrada na ilustração
    ctx.font = '700 13px Inter, sans-serif';
    ctx.fillStyle = '#fafafa';
    ctx.textAlign = 'center';
    ctx.fillText(String(npc.name || 'Criatura Ancestral'), 0, -116 + bob);
    if (typeof npc.hpRatio === 'number') {
      const bw = 96;
      ctx.fillStyle = 'rgba(9,9,11,0.78)';
      ctx.fillRect(-bw / 2, -109 + bob, bw, 7);
      ctx.fillStyle = npc.hostile ? '#f43f5e' : '#10b981';
      ctx.fillRect(-bw / 2, -109 + bob, bw * Math.max(0, Math.min(1, npc.hpRatio)), 7);
    }
    ctx.restore();
  }

  _drawWeatherParticles(ctx, w, h, biome, dt, elapsed) {
    ctx.save();
    for (const p of this._particles) {
      p.y += dt * p.v * (biome.weather === 'embers' ? -1.4 : 1);
      if (p.y > 1) p.y -= 1;
      if (p.y < 0) p.y += 1;
      const px = ((p.x + Math.sin(elapsed + p.phase) * 0.02 + 1) % 1) * w;
      const py = p.y * h;
      ctx.fillStyle = biome.weather === 'snow' ? '#f8fafc' : biome.accent;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(px, py, p.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * Gera HTML de Carta Ilustrada Colecionável (Itens, Habilidades e NPCs com raridade — Parte 2.8).
 */
export function renderCollectibleCardHTML(card = {}) {
  const rarityColors = {
    comum:     { border: '#71717a', glow: 'rgba(161,161,170,0.16)', badge: '#d4d4d8' },
    raro:      { border: '#38bdf8', glow: 'rgba(56,189,248,0.22)',  badge: '#7dd3fc' },
    epico:     { border: '#a855f7', glow: 'rgba(168,85,247,0.26)',  badge: '#d8b4fe' },
    lendario:  { border: '#f59e0b', glow: 'rgba(245,158,11,0.32)',  badge: '#fde047' },
    mitico:    { border: '#f43f5e', glow: 'rgba(244,63,94,0.34)',   badge: '#fda4af' }
  };
  const rKey = String(card.rarity || 'raro').toLowerCase();
  const r = rarityColors[rKey] || rarityColors.raro;
  return `
    <article class="dd-glass-card dd-anim-enter" style="border-color:${r.border}; box-shadow:0 12px 28px ${r.glow}; padding:12px; display:flex; flex-direction:column; gap:8px; min-width:176px; max-width:220px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
        <span style="font-size:0.68rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:${r.badge};">${escapeHtml(card.rarity || 'Raro')}</span>
        <span style="font-size:0.72rem; color:#a1a1aa;">${escapeHtml(card.kind || 'Relíquia')}</span>
      </div>
      <div style="height:88px; border-radius:10px; background:radial-gradient(circle at 50% 35%, ${r.glow}, rgba(9,9,11,0.92)); border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; font-weight:900; color:${r.badge}; font-size:1.5rem;">
        ${card.svgArt || `✦`}
      </div>
      <strong style="font-size:0.92rem; color:#fafafa;">${escapeHtml(card.name || 'Artefato Ancestral')}</strong>
      <p style="font-size:0.76rem; color:#d4d4d8; margin:0; line-height:1.4;">${escapeHtml(card.description || '')}</p>
      ${card.effect ? `<div style="font-size:0.72rem; color:#6ee7b7; font-weight:700;">⚡ ${escapeHtml(card.effect)}</div>` : ''}
    </article>
  `.trim();
}
