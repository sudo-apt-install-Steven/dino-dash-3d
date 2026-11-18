// Sistema de Contas (Supabase Auth + Edge Function nick-login), OAuth Google/Discord,
// Migração Convidado->Conta, Perfil do Jogador (local e nuvem) e Exclusão LGPD (D2, D3, D8).
import { Save } from './Save.js';
import { getSupabaseClient } from '../net/TransportSupabase.js';
import { requestCloudDataWipe } from '../security/EdgeClient.js';

export const NICKNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const PROFILE_BANNERS = [
  { id: 'amber_classic', name: 'Âmbar Jurássico', gradient: 'linear-gradient(135deg, #451a03, #92400e)' },
  { id: 'emerald_jungle', name: 'Selva Primordial', gradient: 'linear-gradient(135deg, #064e3b, #047857)' },
  { id: 'abyss_ocean', name: 'Abismo Submerso', gradient: 'linear-gradient(135deg, #0c4a6e, #0369a1)' },
  { id: 'cyber_neon', name: 'Metrópole Neon', gradient: 'linear-gradient(135deg, #312e81, #7e22ce)' },
  { id: 'volcano_magma', name: 'Caldeira Vulcânica', gradient: 'linear-gradient(135deg, #7f1d1d, #c2410c)' }
];

export const PROFILE_FRAMES = [
  { id: 'default', name: 'Madeira Fóssil', border: '#92400e' },
  { id: 'gold', name: 'Ouro Real', border: '#fbbf24' },
  { id: 'diamond', name: 'Diamante Glacial', border: '#38bdf8' },
  { id: 'emerald', name: 'Esmeralda', border: '#34d399' },
  { id: 'crimson', name: 'Rubi Alfa', border: '#f43f5e' }
];

const BLOCKED_TERMS = [
  /p[u\*]t[ao]/i, /c[a@]r[a@]lh/i, /f[o0]d[ae]/i, /p[o0]rr[a@]/i,
  /b[u\*]c[e3]t/i, /m[e3]rd[a@]/i, /v[i1][a@]d[o0]/i, /f[u\*]ck/i,
  /sh[i1]t/i, /b[i1]tch/i, /n[i1]gg/i, /r[a@]p[e3]/i,
  /p[e3]nd[e3]j[o0]/i, /c[a@]br[o0]n/i, /gilipoll/i
];

export function validateNickname(nick) {
  const s = String(nick ?? '').trim();
  if (s.length < 3 || s.length > 16) {
    return { ok: false, error: 'Apelido deve ter entre 3 e 16 caracteres.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) {
    return { ok: false, error: 'Apelido aceita apenas letras, números, "_" e "-".' };
  }
  if (BLOCKED_TERMS.some((rx) => rx.test(s))) {
    return { ok: false, error: 'Escolha um apelido apropriado.' };
  }
  return { ok: true, value: s };
}

export function validateEmail(email) {
  const s = String(email ?? '').trim().toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 160;
  return ok ? { ok: true, value: s } : { ok: false, error: 'Informe um e-mail válido.' };
}

export function validatePassword(pw) {
  const s = String(pw ?? '');
  if (s.length < 8 || s.length > 128) {
    return { ok: false, error: 'A senha deve ter entre 8 e 128 caracteres.' };
  }
  if (!/[a-zA-Z]/.test(s) || !/\d/.test(s)) {
    return { ok: false, error: 'A senha precisa conter pelo menos uma letra e um número.' };
  }
  return { ok: true };
}

export function sanitizeBio(raw, maxLen = 160) {
  let clean = String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F<>`"'\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  for (const rx of BLOCKED_TERMS) {
    clean = clean.replace(rx, '***');
  }
  return clean;
}

class AuthProfileSystem {
  constructor() {
    this._cachedUser = null;
  }

  isOnlineConfigured() {
    return !!getSupabaseClient();
  }

  async getCurrentSession() {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data } = await client.auth.getSession();
      this._cachedUser = data?.session?.user || null;
      return data?.session || null;
    } catch {
      return null;
    }
  }

  async getCurrentUser() {
    const sess = await this.getCurrentSession();
    return sess?.user || null;
  }

  getLocalProfile() {
    const p = Save.data.profile || {};
    const nickname = p.nickname || Save.data.network?.nickname || 'Convidado';
    return {
      nickname,
      bio: sanitizeBio(p.bio || ''),
      isPublic: p.isPublic !== false,
      avatar: {
        dinoId: p.avatar?.dinoId || Save.data.selectedDino || 'trex',
        angleY: Number.isFinite(Number(p.avatar?.angleY)) ? Number(p.avatar.angleY) : -0.55,
        angleX: Number.isFinite(Number(p.avatar?.angleX)) ? Number(p.avatar.angleX) : 0.12,
        zoom: Number.isFinite(Number(p.avatar?.zoom)) ? Number(p.avatar.zoom) : 1.0,
        pose: ['idle', 'run', 'jump', 'roar'].includes(p.avatar?.pose) ? p.avatar.pose : 'idle',
        skinId: p.avatar?.skinId || 'original'
      },
      showcaseAchievements: Array.isArray(p.showcaseAchievements) ? p.showcaseAchievements.slice(0, 4) : [],
      bannerId: p.bannerId || 'amber_classic',
      frameId: p.frameId || 'default',
      nicknameChangedAt: Number(p.nicknameChangedAt || 0),
      xp: Number(p.xp || 0),
      level: Number(p.level || 1),
      activeTitle: Save.data.activeTitle || 'Iniciante'
    };
  }

  getStatsSnapshot() {
    const s = Save.data.stats || {};
    return {
      highScore: Save.getHighScore(),
      totalDist: Math.floor(s.totalDist || 0),
      runs: Math.floor(s.runs || 0),
      bossesDefeated: Math.floor(s.bossesDefeated || 0),
      playTimeSec: Math.floor(s.playTimeSec || 0),
      totalEggs: Math.floor(s.totalEggs || Save.data.eggs || 0),
      favoriteDino: Save.data.selectedDino || 'trex'
    };
  }

  async _invokeNickLogin(payload) {
    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, offline: true, error: 'Modo offline: Supabase não configurado neste ambiente.' };
    }
    try {
      const { data, error } = await client.functions.invoke('nick-login', { body: payload });
      if (error) {
        return { ok: false, error: error.message || 'Falha de comunicação com o servidor.' };
      }
      if (!data || data.ok === false) {
        return { ok: false, error: data?.error || 'Operação não autorizada.' };
      }
      return { ok: true, ...data };
    } catch (err) {
      return { ok: false, error: err?.message || 'Erro de rede ao conectar à conta.' };
    }
  }

  async register({ nickname, email, password, confirmPassword, acceptTerms = true, isMinorConsent = false }) {
    if (!acceptTerms) {
      return { ok: false, error: 'É necessário aceitar os Termos de Uso e Política de Privacidade.' };
    }
    const nickCheck = validateNickname(nickname);
    if (!nickCheck.ok) return nickCheck;

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) return emailCheck;

    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) return pwCheck;

    if (password !== confirmPassword) {
      return { ok: false, error: 'As senhas não conferem.' };
    }

    const res = await this._invokeNickLogin({
      action: 'register',
      nickname: nickCheck.value,
      email: emailCheck.value,
      password,
      isMinorConsent: !!isMinorConsent
    });

    if (!res.ok) return res;

    if (!Save.data.profile) Save.data.profile = {};
    Save.data.profile.nickname = nickCheck.value;
    if (!Save.data.network) Save.data.network = {};
    Save.data.network.nickname = nickCheck.value;
    Save.save();

    if (res.session?.access_token && res.session?.refresh_token) {
      const client = getSupabaseClient();
      await client?.auth.setSession(res.session);
      await this.migrateGuestProgressToAccount();
    }

    return res;
  }

  async login({ identifier, password }) {
    const idClean = String(identifier ?? '').trim();
    if (!idClean || !password) {
      return { ok: false, error: 'Informe seu apelido/e-mail e senha.' };
    }

    const res = await this._invokeNickLogin({
      action: 'login',
      identifier: idClean,
      password
    });

    if (!res.ok) return res;

    const client = getSupabaseClient();
    if (client && res.session?.access_token && res.session?.refresh_token) {
      await client.auth.setSession(res.session);
      if (res.nickname) {
        if (!Save.data.profile) Save.data.profile = {};
        Save.data.profile.nickname = res.nickname;
        if (!Save.data.network) Save.data.network = {};
        Save.data.network.nickname = res.nickname;
        Save.save();
      }
      await this.syncProfileFromCloud();
    }
    return { ok: true, nickname: res.nickname };
  }

  async recoverPassword(identifier) {
    const idClean = String(identifier ?? '').trim();
    if (!idClean) {
      return { ok: false, error: 'Informe seu apelido ou e-mail.' };
    }
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    return await this._invokeNickLogin({
      action: 'recover_password',
      identifier: idClean,
      redirectTo
    });
  }

  async signInWithOAuth(provider) {
    const client = getSupabaseClient();
    if (!client) return { ok: false, error: 'Supabase não configurado.' };
    if (!['google', 'discord'].includes(provider)) {
      return { ok: false, error: 'Provedor OAuth não suportado.' };
    }
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo }
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, url: data?.url };
    } catch (err) {
      return { ok: false, error: err?.message || 'Erro ao iniciar OAuth.' };
    }
  }

  async linkOAuthIdentity(provider) {
    const client = getSupabaseClient();
    if (!client) return { ok: false, error: 'Supabase não configurado.' };
    if (!['google', 'discord'].includes(provider)) {
      return { ok: false, error: 'Provedor inválido.' };
    }
    try {
      if (typeof client.auth.linkIdentity === 'function') {
        const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
        const { data, error } = await client.auth.linkIdentity({
          provider,
          options: { redirectTo }
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true, url: data?.url };
      }
      return await this.signInWithOAuth(provider);
    } catch (err) {
      return { ok: false, error: err?.message || 'Não foi possível vincular conta.' };
    }
  }

  async logout(scope = 'local') {
    const client = getSupabaseClient();
    if (!client) return { ok: true };
    try {
      await client.auth.signOut({ scope: scope === 'global' ? 'global' : 'local' });
      this._cachedUser = null;
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || 'Erro ao sair.' };
    }
  }

  /**
   * Migra o progresso local (convidado) para a conta autenticada após criar backup automático.
   */
  async migrateGuestProgressToAccount() {
    const client = getSupabaseClient();
    const user = await this.getCurrentUser();
    if (!client || !user) {
      return { ok: false, error: 'Faça login para sincronizar seu progresso na nuvem.' };
    }

    Save.createAutoBackup();
    const prof = this.getLocalProfile();
    const stats = this.getStatsSnapshot();

    const nickCheck = validateNickname(prof.nickname);
    const safeNick = nickCheck.ok ? nickCheck.value : `Dino_${user.id.slice(0, 6)}`;

    await client.from('player_profiles').upsert({
      id: user.id,
      nickname: safeNick,
      nickname_lower: safeNick.toLowerCase(),
      bio: prof.bio,
      is_public: prof.isPublic,
      avatar_config: prof.avatar,
      showcase_achievements: prof.showcaseAchievements,
      stats,
      level: prof.level,
      xp: prof.xp,
      active_title: prof.activeTitle,
      banner_id: prof.bannerId,
      frame_id: prof.frameId,
      updated_at: new Date().toISOString()
    });

    const achIds = Array.isArray(Save.data.achievements) ? Save.data.achievements : [];
    if (achIds.length > 0 && !Save.isImportedSave()) {
      const rows = achIds.slice(0, 200).map((aid) => ({
        user_id: user.id,
        achievement_id: aid,
        source: 'migrated'
      }));
      await client.from('player_achievements').upsert(rows, { onConflict: 'user_id,achievement_id' });
    }

    await client.from('player_cloud_saves').upsert({
      user_id: user.id,
      schema_version: Save.data.schemaVersion || 4,
      save_data: Save.exportSavePackage().data,
      updated_at: new Date().toISOString()
    });

    return { ok: true };
  }

  async syncProfileFromCloud() {
    const client = getSupabaseClient();
    const user = await this.getCurrentUser();
    if (!client || !user) return { ok: false };

    const { data: cloudProf } = await client
      .from('player_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (cloudProf) {
      if (!Save.data.profile) Save.data.profile = {};
      Save.data.profile.nickname = cloudProf.nickname || Save.data.profile.nickname;
      Save.data.profile.bio = sanitizeBio(cloudProf.bio || '');
      Save.data.profile.isPublic = cloudProf.is_public !== false;
      if (cloudProf.avatar_config) Save.data.profile.avatar = cloudProf.avatar_config;
      if (Array.isArray(cloudProf.showcase_achievements)) {
        Save.data.profile.showcaseAchievements = cloudProf.showcase_achievements.slice(0, 4);
      }
      if (cloudProf.banner_id) Save.data.profile.bannerId = cloudProf.banner_id;
      if (cloudProf.frame_id) Save.data.profile.frameId = cloudProf.frame_id;
      if (cloudProf.nickname_changed_at) {
        Save.data.profile.nicknameChangedAt = new Date(cloudProf.nickname_changed_at).getTime();
      }
      if (cloudProf.active_title) Save.data.activeTitle = cloudProf.active_title;
      if (!Save.data.network) Save.data.network = {};
      Save.data.network.nickname = Save.data.profile.nickname;
      Save.save();
    }

    const { data: cloudAch } = await client
      .from('player_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    if (Array.isArray(cloudAch)) {
      for (const row of cloudAch) {
        if (row?.achievement_id && !Save.data.achievements.includes(row.achievement_id)) {
          Save.data.achievements.push(row.achievement_id);
        }
      }
      Save.save();
    }

    return { ok: true, profile: cloudProf || null };
  }

  async updateProfile(patch = {}) {
    if (!Save.data.profile) Save.data.profile = {};
    const cur = this.getLocalProfile();

    if (patch.nickname !== undefined && patch.nickname.trim() !== cur.nickname) {
      const nickCheck = validateNickname(patch.nickname);
      if (!nickCheck.ok) return nickCheck;

      const lastChanged = Number(cur.nicknameChangedAt || 0);
      if (lastChanged > 0 && Date.now() - lastChanged < NICKNAME_CHANGE_COOLDOWN_MS) {
        const daysLeft = Math.ceil((NICKNAME_CHANGE_COOLDOWN_MS - (Date.now() - lastChanged)) / (24 * 60 * 60 * 1000));
        return { ok: false, error: `Você poderá alterar seu apelido novamente em ${daysLeft} dia(s).` };
      }

      const user = await this.getCurrentUser();
      if (user) {
        const res = await this._invokeNickLogin({
          action: 'change_nickname',
          nickname: nickCheck.value
        });
        if (!res.ok) return res;
      }

      Save.data.profile.nickname = nickCheck.value;
      Save.data.profile.nicknameChangedAt = Date.now();
      if (!Save.data.network) Save.data.network = {};
      Save.data.network.nickname = nickCheck.value;
    }

    if (patch.bio !== undefined) {
      Save.data.profile.bio = sanitizeBio(patch.bio, 160);
    }
    if (patch.isPublic !== undefined) {
      Save.data.profile.isPublic = !!patch.isPublic;
    }
    if (patch.avatar && typeof patch.avatar === 'object') {
      Save.data.profile.avatar = {
        ...cur.avatar,
        ...patch.avatar,
        zoom: Math.max(0.65, Math.min(1.65, Number(patch.avatar.zoom ?? cur.avatar.zoom ?? 1.0)))
      };
    }
    if (Array.isArray(patch.showcaseAchievements)) {
      Save.data.profile.showcaseAchievements = patch.showcaseAchievements.slice(0, 4);
    }
    if (patch.bannerId) Save.data.profile.bannerId = String(patch.bannerId).slice(0, 32);
    if (patch.frameId) Save.data.profile.frameId = String(patch.frameId).slice(0, 32);
    if (patch.activeTitle && Save.data.unlockedTitles?.includes(patch.activeTitle)) {
      Save.data.activeTitle = patch.activeTitle;
    }

    Save.save();

    const client = getSupabaseClient();
    const user = await this.getCurrentUser();
    if (client && user) {
      const updated = this.getLocalProfile();
      await client.from('player_profiles').update({
        bio: updated.bio,
        is_public: updated.isPublic,
        avatar_config: updated.avatar,
        showcase_achievements: updated.showcaseAchievements,
        banner_id: updated.bannerId,
        frame_id: updated.frameId,
        active_title: updated.activeTitle,
        stats: this.getStatsSnapshot(),
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
    }

    return { ok: true, profile: this.getLocalProfile() };
  }

  /**
   * Exclusão completa LGPD Art. 18 (nuvem + Auth + local).
   */
  async deleteAccountAndCloudData() {
    const client = getSupabaseClient();
    const user = await this.getCurrentUser();
    let cloudStatus = 'offline';

    if (client) {
      if (user) {
        const delRes = await this._invokeNickLogin({ action: 'delete_account' });
        cloudStatus = delRes.ok ? 'conta e dados na nuvem removidos' : (delRes.error || 'parcial');
      }
      const wipeRes = await requestCloudDataWipe(client);
      if (wipeRes?.ok && cloudStatus === 'offline') {
        cloudStatus = 'nuvem removida';
      }
      await client.auth.signOut().catch(() => {});
    }

    await Save.wipeAllLocalData();
    this._cachedUser = null;
    return { ok: true, cloudStatus };
  }
}

export const AuthProfile = new AuthProfileSystem();
