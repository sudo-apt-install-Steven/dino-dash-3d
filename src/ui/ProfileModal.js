// Tela de Perfil do Jogador & Contas (D2 + D3): Foto 3D customizável por ângulo/zoom/pose,
// login por nick+senha ou email+senha, cadastro, recuperação, OAuth Google/Discord,
// migração convidado->conta, bio sanitizada, vitrine de troféus, estatísticas e privacidade.
import * as THREE from 'three';
import { DINO_CATALOG, getDinoSpec } from '../dinos/DinoCatalog.js';
import { getEquippedSkinVariant } from '../dinos/DinoCustomization.js';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { DinoAnimator } from '../dinos/DinoAnimator.js';
import { Save } from '../systems/Save.js';
import { Achievements, TROPHY_TIERS } from '../systems/Achievements.js';
import {
  AuthProfile,
  PROFILE_BANNERS,
  PROFILE_FRAMES,
  validateNickname,
  evaluatePasswordStrength
} from '../systems/AuthProfile.js';
import { escapeHtml } from '../security/Sanitize.js';
import { attachModalHelp } from './Menus.js';

class ProfileAvatar3D {
  constructor(containerEl, avatarCfg) {
    this.container = containerEl;
    this.cfg = { ...avatarCfg };
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
    this.scene.add(new THREE.HemisphereLight('#fff2d6', '#5e2c14', 1.15));
    const key = new THREE.DirectionalLight('#ffdca8', 1.8);
    key.position.set(3, 5, 4);
    this.scene.add(key);

    this.model = null;
    this.animator = null;
    this.dragging = false;
    this.lastX = 0;

    containerEl.innerHTML = '';
    containerEl.appendChild(this.renderer.domElement);
    this._syncSize();
    this.setAvatarConfig(this.cfg);
    this._bindEvents();

    this.lastTime = performance.now();
    this._raf = requestAnimationFrame(this._tick.bind(this));
  }

  _syncSize() {
    if (!this.container) return;
    const w = Math.max(140, this.container.clientWidth || 180);
    const h = Math.max(140, this.container.clientHeight || 180);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _clearModel() {
    if (!this.model) return;
    this.scene.remove(this.model.root);
    const disposed = new Set();
    for (const m of this.model.allMeshes || []) {
      if (m.material && !disposed.has(m.material)) {
        disposed.add(m.material);
        m.material.dispose();
      }
    }
    this.model = null;
  }

  setAvatarConfig(cfg) {
    const prevDino = this.cfg?.dinoId;
    this.cfg = { ...this.cfg, ...cfg };
    if (!this.model || prevDino !== this.cfg.dinoId) {
      this._clearModel();
      const baseCustom = Save.data.customization?.p1?.presets?.[Save.data.customization?.p1?.activePreset || 0] || {};
      this.model = DinoFactory.build(this.cfg.dinoId || 'trex', {
        ...baseCustom,
        skinVariant: getEquippedSkinVariant(this.cfg.dinoId || 'trex')
      }, { allowHybrid: false });
      this.scene.add(this.model.root);
      this.animator = new DinoAnimator(this.model);
    }
    const dist = 4.6 / Math.max(0.65, Math.min(1.65, Number(this.cfg.zoom || 1.0)));
    this.camera.position.set(0, 1.45 + (Number(this.cfg.angleX || 0) * 1.4), dist);
    this.camera.lookAt(0, 1.0, 0);
  }

  _bindEvents() {
    const el = this.renderer.domElement;
    this._onDown = (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
    };
    this._onMove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      this.cfg.angleY = (this.cfg.angleY || 0) + dx * 0.015;
    };
    this._onUp = () => {
      this.dragging = false;
    };
    el.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
  }

  _tick(now) {
    this._raf = requestAnimationFrame(this._tick.bind(this));
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (this.model) {
      this.model.root.rotation.y = Number(this.cfg.angleY ?? -0.55);
      const pose = this.cfg.pose || 'idle';
      this.animator?.update(dt, {
        speed: pose === 'run' ? 14 : (pose === 'idle' ? 2 : 8),
        grounded: pose !== 'jump',
        jumping: pose === 'jump',
        roaring: pose === 'roar',
        locomotion: 'land'
      });
    }
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this.renderer.domElement.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    this._clearModel();
    this.renderer.dispose();
  }
}

export class ProfileModal {
  static _pendingInitialTab = null;

  static requestTab(tab) {
    ProfileModal._pendingInitialTab = tab;
  }

  static renderInto(container, { initialTab, onClose, onOpenAchievements, onOpenSave, onOpenLegal, onProfileUpdated } = {}) {
    const winTab = typeof window !== 'undefined' ? window.__DINO_PROFILE_INITIAL_TAB__ : null;
    if (typeof window !== 'undefined' && winTab) delete window.__DINO_PROFILE_INITIAL_TAB__;
    const requestedTab = initialTab || ProfileModal._pendingInitialTab || winTab || 'profile';
    ProfileModal._pendingInitialTab = null;
    let activeTab = ['profile', 'account', 'showcase'].includes(requestedTab) ? requestedTab : 'profile';
    let authSubTab = 'login'; // 'login' | 'register'
    let statusMsg = '';
    let statusTone = '#6ee7b7';
    let currentUser = null;
    let avatarPreview = null;
    let nickCheckTimer = null;
    let nickCheckSeq = 0;

    const cleanupAvatar = () => {
      clearTimeout(nickCheckTimer);
      if (avatarPreview) {
        avatarPreview.destroy();
        avatarPreview = null;
      }
    };

    const render = async () => {
      cleanupAvatar();
      currentUser = await AuthProfile.getCurrentUser();
      const prof = AuthProfile.getLocalProfile();
      const stats = AuthProfile.getStatsSnapshot();
      const favSpec = getDinoSpec(stats.favoriteDino);
      const banner = PROFILE_BANNERS.find((b) => b.id === prof.bannerId) || PROFILE_BANNERS[0];
      const frame = PROFILE_FRAMES.find((f) => f.id === prof.frameId) || PROFILE_FRAMES[0];
      const unlockedDinos = DINO_CATALOG.filter((d) => Save.data.unlockedDinos.includes(d.id) || (d.unlockCost || 0) === 0);
      const unlockedAchievements = Achievements.getAll().filter((a) => Achievements.isUnlocked(a.id));

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 840px;">
            <div class="modal-header">
              <h2>👤 Perfil do Jogador</h2>
              <button class="chunky-btn secondary" id="prof-close">Voltar</button>
            </div>

            ${statusMsg ? `
              <div class="item-card" style="border-color:${statusTone}; color:${statusTone}; font-size:0.84rem; padding:10px 12px;">
                ${escapeHtml(statusMsg)}
              </div>
            ` : ''}

            <!-- Cabeçalho Visual do Perfil -->
            <div class="item-card" style="background:${banner.gradient}; border-color:${frame.border}; border-width:2px; padding:14px; display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
              <div id="prof-avatar-box" style="width:150px; height:150px; border-radius:16px; border:3px solid ${frame.border}; background:rgba(15,10,5,0.55); overflow:hidden; flex-shrink:0; cursor:grab;" title="Arraste para girar seu Dino 3D"></div>
              <div style="flex:1; min-width:210px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <strong style="font-size:1.35rem; color:#fff9eb;">${escapeHtml(prof.nickname)}</strong>
                  <span class="hud-pill" style="font-size:0.75rem; color:#ffd447;">🎖️ ${escapeHtml(prof.activeTitle)}</span>
                  <span class="hud-pill" style="font-size:0.74rem; color:${currentUser ? '#6ee7b7' : '#fcd34d'};">
                    ${currentUser ? '☁️ Conta Conectada' : '💾 Modo Convidado (Local)'}
                  </span>
                </div>
                <div style="font-size:0.82rem; color:#fef3c7;">
                  Nível <strong>${prof.level}</strong> • XP ${prof.xp}/200 • Perfil ${prof.isPublic ? '🌐 Público' : '🔒 Privado'}
                </div>
                <p style="font-size:0.82rem; color:#fde68a; margin:0; font-style:${prof.bio ? 'normal' : 'italic'};">
                  ${prof.bio ? escapeHtml(prof.bio) : 'Sem biografia ainda. Personalize na aba Perfil!'}
                </p>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
                  ${prof.showcaseAchievements.length === 0
                    ? '<span style="font-size:0.74rem; color:#e5d3bc;">Vitrine vazia — destaque até 4 conquistas!</span>'
                    : prof.showcaseAchievements.map((aid) => {
                      const a = Achievements.getById(aid);
                      if (!a) return '';
                      const t = TROPHY_TIERS[a.trophy] || TROPHY_TIERS.bronze;
                      return `<span class="hud-pill" style="font-size:0.74rem; border-color:${t.color}; color:${t.color};">${a.icon} ${escapeHtml(a.name)}</span>`;
                    }).join('')}
                </div>
              </div>
            </div>

            <div class="tabs-row" id="prof-tabs">
              <button class="tab-btn ${activeTab === 'profile' ? 'active' : ''}" data-ptab="profile">🦖 Perfil &amp; Foto 3D</button>
              <button class="tab-btn ${activeTab === 'account' ? 'active' : ''}" data-ptab="account">${currentUser ? '☁️ Conta &amp; Nuvem' : '🔑 Entrar / Criar Conta'}</button>
              <button class="tab-btn ${activeTab === 'showcase' ? 'active' : ''}" data-ptab="showcase">🏆 Vitrine &amp; Estatísticas</button>
            </div>

            <div style="max-height:46vh; overflow-y:auto; padding-right:4px; display:flex; flex-direction:column; gap:10px;">
              ${activeTab === 'profile' ? `
                <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
                  <div class="item-card" style="gap:8px;">
                    <strong style="color:#ffd447;">📸 Customizar Foto 3D</strong>
                    <div class="field-row">
                      <span>Dinossauro</span>
                      <select id="prof-av-dino" class="select-input">
                        ${unlockedDinos.map((d) => `<option value="${d.id}" ${prof.avatar.dinoId === d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('')}
                      </select>
                    </div>
                    <div class="field-row">
                      <span>Pose</span>
                      <select id="prof-av-pose" class="select-input">
                        <option value="idle" ${prof.avatar.pose === 'idle' ? 'selected' : ''}>Parado (Idle)</option>
                        <option value="run" ${prof.avatar.pose === 'run' ? 'selected' : ''}>Correndo</option>
                        <option value="jump" ${prof.avatar.pose === 'jump' ? 'selected' : ''}>Saltando</option>
                        <option value="roar" ${prof.avatar.pose === 'roar' ? 'selected' : ''}>Rugindo</option>
                      </select>
                    </div>
                    <div class="field-row">
                      <span>Ângulo (${Math.round((prof.avatar.angleY || 0) * 57.3)}°)</span>
                      <input type="range" id="prof-av-angle" min="-314" max="314" value="${Math.round((prof.avatar.angleY || -0.55) * 100)}" />
                    </div>
                    <div class="field-row">
                      <span>Zoom (${(prof.avatar.zoom || 1).toFixed(2)}x)</span>
                      <input type="range" id="prof-av-zoom" min="65" max="165" value="${Math.round((prof.avatar.zoom || 1) * 100)}" />
                    </div>
                  </div>

                  <div class="item-card" style="gap:8px;">
                    <strong style="color:#6ee7b7;">✏️ Identidade &amp; Aparência</strong>
                    <label style="display:flex; flex-direction:column; gap:3px; font-size:0.8rem;">
                      <span>Apelido (3–16 caracteres, 1 troca a cada 7 dias)</span>
                      <input type="text" id="prof-nick" class="text-input" maxlength="16" value="${escapeHtml(prof.nickname)}" />
                    </label>
                    <label style="display:flex; flex-direction:column; gap:3px; font-size:0.8rem;">
                      <span>Biografia (máx. 160 caracteres)</span>
                      <textarea id="prof-bio" class="text-input" rows="2" maxlength="160" placeholder="Conte sua história no mundo jurássico...">${escapeHtml(prof.bio)}</textarea>
                    </label>
                    <div class="field-row">
                      <span>Título Ativo</span>
                      <select id="prof-title" class="select-input">
                        ${(Save.data.unlockedTitles || ['Iniciante']).map((t) => `<option value="${escapeHtml(t)}" ${prof.activeTitle === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
                      </select>
                    </div>
                    <div class="field-row">
                      <span>Banner / Moldura</span>
                      <div style="display:flex; gap:6px;">
                        <select id="prof-banner" class="select-input">
                          ${PROFILE_BANNERS.map((b) => `<option value="${b.id}" ${prof.bannerId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                        </select>
                        <select id="prof-frame" class="select-input">
                          ${PROFILE_FRAMES.map((f) => `<option value="${f.id}" ${prof.frameId === f.id ? 'selected' : ''}>${f.name}</option>`).join('')}
                        </select>
                      </div>
                    </div>
                    <div class="field-row">
                      <span>🌐 Perfil Público (visível para outros jogadores)</span>
                      <input type="checkbox" id="prof-public" ${prof.isPublic ? 'checked' : ''} />
                    </div>
                    <button type="button" class="chunky-btn" id="prof-save-btn">💾 Salvar Perfil</button>
                  </div>
                </div>
              ` : ''}

              ${activeTab === 'account' ? `
                ${currentUser ? `
                  <div class="item-card" style="gap:10px; border-color:#22c55e; background:linear-gradient(145deg, rgba(6,78,59,0.28), rgba(20,11,6,0.88));">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                      <strong style="color:#6ee7b7; font-size:1.02rem;">☁️ Conta Conectada: @${escapeHtml(prof.nickname)}</strong>
                      <span class="hud-pill" style="font-size:0.74rem; color:#86efac; border-color:rgba(34,197,94,0.45);">🛡️ Protegida (Nick + Senha)</span>
                    </div>
                    <div style="font-size:0.82rem; color:#f5ead7;">
                      ID: <code>${escapeHtml(currentUser.id.slice(0, 12))}...</code> • Acesso: <strong>${currentUser.email && !currentUser.email.endsWith('@player.dinodash.internal') ? escapeHtml(currentUser.email) : 'Apelido + Senha (Sem E-mail)'}</strong>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                      <button type="button" class="chunky-btn" id="prof-sync-now">🔄 Migrar / Sincronizar Progresso Local</button>
                      <button type="button" class="chunky-btn secondary" id="prof-link-google">🔗 Vincular Google</button>
                      <button type="button" class="chunky-btn secondary" id="prof-link-discord">🔗 Vincular Discord</button>
                      <button type="button" class="chunky-btn secondary" id="prof-logout-local">🚪 Sair</button>
                      <button type="button" class="chunky-btn orange" id="prof-logout-all">🚪 Sair (Todos Dispositivos)</button>
                    </div>
                  </div>
                ` : `
                  <div class="item-card" style="gap:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                      <div class="tabs-row" style="gap:6px;">
                        <button type="button" class="tab-btn ${authSubTab === 'login' ? 'active' : ''}" data-asub="login">🔑 Entrar</button>
                        <button type="button" class="tab-btn ${authSubTab === 'register' ? 'active' : ''}" data-asub="register">✨ Criar Conta (Sem E-mail)</button>
                      </div>
                      <span class="hud-pill" style="font-size:0.72rem; color:#fde68a; border-color:rgba(251,191,36,0.45);">🛡️ Limite de segurança: 1 conta por PC/navegador</span>
                    </div>

                    ${authSubTab === 'login' ? `
                      <form id="auth-login-form" style="display:flex; flex-direction:column; gap:8px;">
                        <label style="display:flex; flex-direction:column; gap:3px; font-size:0.78rem; color:#e5d3bc;">
                          <span>Apelido (Nick)</span>
                          <input type="text" id="auth-login-id" class="text-input" maxlength="64" autocomplete="username" placeholder="Seu apelido (ex: RexAlfa99)" value="${escapeHtml(AuthProfile.getLocalCreatedAccountNick() || '')}" required />
                        </label>
                        <label style="display:flex; flex-direction:column; gap:3px; font-size:0.78rem; color:#e5d3bc;">
                          <span>Senha</span>
                          <input type="password" id="auth-login-pw" class="text-input" autocomplete="current-password" placeholder="Sua senha" required />
                        </label>
                        <button type="submit" class="chunky-btn" id="auth-login-submit">🔑 Entrar na Conta</button>
                      </form>
                    ` : ''}

                    ${authSubTab === 'register' ? `
                      ${AuthProfile.hasLocalCreatedAccount() ? `
                        <div class="item-card" style="border-color:#f59e0b; background:rgba(245,158,11,0.12); padding:10px 12px; gap:6px;">
                          <strong style="color:#fde047; font-size:0.86rem;">🛡️ Limite de segurança: 1 conta por PC/navegador</strong>
                          <span style="font-size:0.8rem; color:#fef3c7;">
                            Este navegador/PC já possui a conta <strong>@${escapeHtml(AuthProfile.getLocalCreatedAccountNick() || 'existente')}</strong> criada. Use a aba <strong>Entrar</strong> para acessar sua conta.
                          </span>
                          <div>
                            <button type="button" class="chunky-btn secondary" id="auth-switch-to-login" style="padding:7px 12px; font-size:0.8rem;">🔑 Ir para Entrar</button>
                          </div>
                        </div>
                      ` : `
                        <form id="auth-reg-form" style="display:flex; flex-direction:column; gap:9px;">
                          <div style="font-size:0.78rem; color:#bae6fd; background:rgba(14,116,144,0.18); border:1px solid rgba(56,189,248,0.35); border-radius:10px; padding:8px 10px;">
                            ⚡ <strong>Cadastro instantâneo sem e-mail:</strong> escolha apenas um Apelido único e uma Senha forte. Seu progresso de convidado será migrado automaticamente!
                          </div>
                          <label style="display:flex; flex-direction:column; gap:4px; font-size:0.78rem; color:#e5d3bc;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
                              <span>Apelido único (3–16 chars: letras, números, "_" ou "-")</span>
                              <span id="auth-nick-status" style="font-size:0.75rem; font-weight:800; color:#94a3b8;">Digite seu apelido...</span>
                            </div>
                            <input type="text" id="auth-reg-nick" class="text-input" maxlength="16" autocomplete="username" placeholder="Ex: RaptorEstelar" required />
                          </label>
                          <label style="display:flex; flex-direction:column; gap:4px; font-size:0.78rem; color:#e5d3bc;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
                              <span>Senha (mín. 8 chars, letras e números)</span>
                              <span id="auth-pw-strength-lbl" style="font-size:0.74rem; font-weight:800; color:#94a3b8;">Digite uma senha</span>
                            </div>
                            <input type="password" id="auth-reg-pw" class="text-input" maxlength="128" autocomplete="new-password" placeholder="Crie uma senha forte" required />
                            <div class="meter-bar" style="height:6px; margin-top:2px;">
                              <div id="auth-pw-strength-bar" class="meter-fill" style="width:0%; background:#94a3b8;"></div>
                            </div>
                          </label>
                          <label style="display:flex; flex-direction:column; gap:4px; font-size:0.78rem; color:#e5d3bc;">
                            <span>Confirmar Senha</span>
                            <input type="password" id="auth-reg-pw2" class="text-input" maxlength="128" autocomplete="new-password" placeholder="Repita a senha" required />
                          </label>
                          <label style="font-size:0.78rem; color:#fde68a; display:flex; align-items:center; gap:6px;">
                            <input type="checkbox" id="auth-reg-terms" checked />
                            <span>Aceito os Termos de Uso e Política de Privacidade (LGPD / ECA Digital).</span>
                          </label>
                          <label style="font-size:0.76rem; color:#d8c2a6; display:flex; align-items:center; gap:6px;">
                            <input type="checkbox" id="auth-reg-minor" />
                            <span>Sou menor de 18 anos e possuo consentimento dos pais/responsáveis.</span>
                          </label>
                          <div style="font-size:0.74rem; color:#fcd34d;">
                            🛡️ Limite de segurança: 1 conta por PC/navegador. Guarde bem seu apelido e senha!
                          </div>
                          <button type="submit" class="chunky-btn" id="auth-reg-submit">✨ Criar Conta e Migrar Progresso</button>
                        </form>
                      `}
                    ` : ''}

                    <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                      <span style="font-size:0.78rem; color:#d8c2a6;">Login rápido opcional:</span>
                      <button type="button" class="chunky-btn secondary" id="auth-oauth-google">G Google</button>
                      <button type="button" class="chunky-btn secondary" id="auth-oauth-discord">💬 Discord</button>
                    </div>
                  </div>
                `}

                <div class="item-card" style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                  <span style="font-size:0.8rem; color:#d8c2a6;">Gerenciar backup JSON local ou exclusão LGPD:</span>
                  <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="chunky-btn secondary" id="prof-open-save">💾 Dados &amp; Save</button>
                    <button type="button" class="chunky-btn secondary" id="prof-open-legal" style="border-color:#22c55e; color:#86efac;">🛡️ LGPD &amp; Excluir</button>
                  </div>
                </div>
              ` : ''}

              ${activeTab === 'showcase' ? `
                <div class="item-card" style="gap:8px;">
                  <strong style="color:#ffd447;">📊 Estatísticas Gerais</strong>
                  <div class="stat-grid">
                    <div class="stat-tile"><span class="label">Melhor Pontuação</span><span class="val">${stats.highScore}</span></div>
                    <div class="stat-tile"><span class="label">Distância Total</span><span class="val">${stats.totalDist} m</span></div>
                    <div class="stat-tile"><span class="label">Partidas</span><span class="val">${stats.runs}</span></div>
                    <div class="stat-tile"><span class="label">Chefes Derrotados</span><span class="val">${stats.bossesDefeated}</span></div>
                    <div class="stat-tile"><span class="label">Ovos Totais</span><span class="val">${stats.totalEggs}</span></div>
                    <div class="stat-tile"><span class="label">Dino Favorito</span><span class="val" style="font-size:0.95rem;">${escapeHtml(favSpec.name)}</span></div>
                  </div>
                </div>

                <div class="item-card" style="gap:8px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <strong style="color:#6ee7b7;">🏆 Vitrine de Troféus (escolha até 4)</strong>
                    <button type="button" class="chunky-btn secondary" id="prof-open-ach" style="padding:6px 10px; font-size:0.78rem;">Ver Todas Conquistas</button>
                  </div>
                  ${unlockedAchievements.length === 0
                    ? '<p style="font-size:0.8rem; color:#d8c2a6;">Desbloqueie conquistas jogando para exibi-las aqui!</p>'
                    : `<div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${unlockedAchievements.map((a) => {
                          const selected = prof.showcaseAchievements.includes(a.id);
                          return `<button type="button" class="tab-btn ${selected ? 'active' : ''}" data-showcase="${a.id}">${a.icon} ${escapeHtml(a.name)}</button>`;
                        }).join('')}
                      </div>`
                  }
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      const avBox = container.querySelector('#prof-avatar-box');
      if (avBox) {
        avatarPreview = new ProfileAvatar3D(avBox, prof.avatar);
      }

      container.querySelector('#prof-close')?.addEventListener('click', () => {
        cleanupAvatar();
        onClose?.();
      });

      container.querySelectorAll('[data-ptab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeTab = btn.getAttribute('data-ptab');
          render();
        });
      });
      container.querySelectorAll('[data-asub]').forEach((btn) => {
        btn.addEventListener('click', () => {
          authSubTab = btn.getAttribute('data-asub');
          render();
        });
      });

      // Controles ao vivo da Foto 3D
      const syncPreview = () => {
        if (!avatarPreview) return;
        avatarPreview.setAvatarConfig({
          dinoId: container.querySelector('#prof-av-dino')?.value || prof.avatar.dinoId,
          pose: container.querySelector('#prof-av-pose')?.value || prof.avatar.pose,
          angleY: Number(container.querySelector('#prof-av-angle')?.value || -55) / 100,
          zoom: Number(container.querySelector('#prof-av-zoom')?.value || 100) / 100
        });
      };
      container.querySelector('#prof-av-dino')?.addEventListener('change', syncPreview);
      container.querySelector('#prof-av-pose')?.addEventListener('change', syncPreview);
      container.querySelector('#prof-av-angle')?.addEventListener('input', syncPreview);
      container.querySelector('#prof-av-zoom')?.addEventListener('input', syncPreview);

      container.querySelector('#prof-save-btn')?.addEventListener('click', async () => {
        const res = await AuthProfile.updateProfile({
          nickname: container.querySelector('#prof-nick')?.value || prof.nickname,
          bio: container.querySelector('#prof-bio')?.value || '',
          activeTitle: container.querySelector('#prof-title')?.value || prof.activeTitle,
          bannerId: container.querySelector('#prof-banner')?.value || prof.bannerId,
          frameId: container.querySelector('#prof-frame')?.value || prof.frameId,
          isPublic: !!container.querySelector('#prof-public')?.checked,
          avatar: avatarPreview?.cfg || prof.avatar
        });
        if (res.ok) {
          statusTone = '#6ee7b7';
          statusMsg = '✅ Perfil salvo com sucesso!';
          onProfileUpdated?.();
        } else {
          statusTone = '#fca5a5';
          statusMsg = `⚠️ ${res.error}`;
        }
        render();
      });

      // Auth handlers
      container.querySelector('#auth-switch-to-login')?.addEventListener('click', () => {
        authSubTab = 'login';
        render();
      });

      const regNickInput = container.querySelector('#auth-reg-nick');
      const nickStatusEl = container.querySelector('#auth-nick-status');
      if (regNickInput && nickStatusEl) {
        regNickInput.addEventListener('input', () => {
          clearTimeout(nickCheckTimer);
          const raw = regNickInput.value.trim();
          if (!raw) {
            nickStatusEl.textContent = 'Digite seu apelido...';
            nickStatusEl.style.color = '#94a3b8';
            return;
          }
          const local = validateNickname(raw);
          if (!local.ok) {
            nickStatusEl.textContent = `❌ ${local.error}`;
            nickStatusEl.style.color = '#fca5a5';
            return;
          }
          nickStatusEl.textContent = '⏳ Verificando...';
          nickStatusEl.style.color = '#fde68a';
          const seq = ++nickCheckSeq;
          nickCheckTimer = setTimeout(async () => {
            const check = await AuthProfile.checkNicknameAvailability(raw);
            if (seq !== nickCheckSeq) return;
            if (!check.valid || !check.available) {
              nickStatusEl.textContent = `❌ ${check.error || check.message || 'Inválido ou em uso'}`;
              nickStatusEl.style.color = '#fca5a5';
            } else {
              nickStatusEl.textContent = check.offline ? '✅ Formato válido' : '✅ Disponível';
              nickStatusEl.style.color = '#6ee7b7';
            }
          }, 350);
        });
      }

      const regPwInput = container.querySelector('#auth-reg-pw');
      const pwLbl = container.querySelector('#auth-pw-strength-lbl');
      const pwBar = container.querySelector('#auth-pw-strength-bar');
      if (regPwInput && pwLbl && pwBar) {
        regPwInput.addEventListener('input', () => {
          const st = evaluatePasswordStrength(regPwInput.value);
          pwLbl.textContent = st.label;
          pwLbl.style.color = st.color;
          pwBar.style.width = `${Math.min(100, st.score * 25)}%`;
          pwBar.style.background = st.color;
        });
      }

      container.querySelector('#auth-login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = container.querySelector('#auth-login-submit');
        if (btn) btn.disabled = true;
        const identifier = container.querySelector('#auth-login-id')?.value || '';
        const password = container.querySelector('#auth-login-pw')?.value || '';
        const res = await AuthProfile.login({ identifier, password });
        statusTone = res.ok ? '#6ee7b7' : '#fca5a5';
        statusMsg = res.ok ? `✅ Bem-vindo(a), @${res.nickname || 'Jogador'}!` : `⚠️ ${res.error}`;
        if (res.ok) onProfileUpdated?.();
        render();
      });

      container.querySelector('#auth-reg-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = container.querySelector('#auth-reg-submit');
        if (btn) btn.disabled = true;
        const res = await AuthProfile.register({
          nickname: container.querySelector('#auth-reg-nick')?.value || '',
          password: container.querySelector('#auth-reg-pw')?.value || '',
          confirmPassword: container.querySelector('#auth-reg-pw2')?.value || '',
          acceptTerms: !!container.querySelector('#auth-reg-terms')?.checked,
          isMinorConsent: !!container.querySelector('#auth-reg-minor')?.checked
        });
        statusTone = res.ok ? '#6ee7b7' : '#fca5a5';
        statusMsg = res.ok ? `✅ ${res.message}` : `⚠️ ${res.error}`;
        if (res.ok) onProfileUpdated?.();
        render();
      });

      container.querySelector('#auth-oauth-google')?.addEventListener('click', async () => {
        const res = await AuthProfile.signInWithOAuth('google');
        if (!res.ok) { statusTone = '#fca5a5'; statusMsg = `⚠️ ${res.error}`; render(); }
      });
      container.querySelector('#auth-oauth-discord')?.addEventListener('click', async () => {
        const res = await AuthProfile.signInWithOAuth('discord');
        if (!res.ok) { statusTone = '#fca5a5'; statusMsg = `⚠️ ${res.error}`; render(); }
      });

      container.querySelector('#prof-sync-now')?.addEventListener('click', async () => {
        const res = await AuthProfile.migrateGuestProgressToAccount();
        statusTone = res.ok ? '#6ee7b7' : '#fca5a5';
        statusMsg = res.ok ? '✅ Progresso local migrado e sincronizado na nuvem (backup local criado)!' : `⚠️ ${res.error}`;
        render();
      });
      container.querySelector('#prof-link-google')?.addEventListener('click', async () => {
        const res = await AuthProfile.linkOAuthIdentity('google');
        if (!res.ok) { statusTone = '#fca5a5'; statusMsg = `⚠️ ${res.error}`; render(); }
      });
      container.querySelector('#prof-link-discord')?.addEventListener('click', async () => {
        const res = await AuthProfile.linkOAuthIdentity('discord');
        if (!res.ok) { statusTone = '#fca5a5'; statusMsg = `⚠️ ${res.error}`; render(); }
      });
      container.querySelector('#prof-logout-local')?.addEventListener('click', async () => {
        await AuthProfile.logout('local');
        statusTone = '#ffd447';
        statusMsg = '🚪 Sessão encerrada neste navegador.';
        onProfileUpdated?.();
        render();
      });
      container.querySelector('#prof-logout-all')?.addEventListener('click', async () => {
        await AuthProfile.logout('global');
        statusTone = '#ffd447';
        statusMsg = '🚪 Sessão encerrada em todos os dispositivos.';
        onProfileUpdated?.();
        render();
      });

      container.querySelectorAll('[data-showcase]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const aid = btn.getAttribute('data-showcase');
          const list = [...prof.showcaseAchievements];
          const idx = list.indexOf(aid);
          if (idx >= 0) list.splice(idx, 1);
          else {
            if (list.length >= 4) list.shift();
            list.push(aid);
          }
          await AuthProfile.updateProfile({ showcaseAchievements: list });
          render();
        });
      });

      container.querySelector('#prof-open-ach')?.addEventListener('click', () => {
        cleanupAvatar();
        onOpenAchievements?.();
      });
      container.querySelector('#prof-open-save')?.addEventListener('click', () => {
        cleanupAvatar();
        onOpenSave?.();
      });
      container.querySelector('#prof-open-legal')?.addEventListener('click', () => {
        cleanupAvatar();
        onOpenLegal?.();
      });

      attachModalHelp(container, 'Personalize sua foto 3D (arraste, ajuste ângulo, zoom e pose), edite sua bio, destaque até 4 conquistas e conecte sua conta para salvar na nuvem.');
    };

    render();
    return cleanupAvatar;
  }
}
