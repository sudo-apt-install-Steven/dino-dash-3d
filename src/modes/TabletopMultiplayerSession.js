// TabletopMultiplayerSession.js
// Mesa Virtual de RPG Multiplayer Cooperativo (2 a 6 jogadores) para DINO DASH 3D (Seção 2.4).
// Suporta:
// - 2 a 6 jogadores conectados (cada um controlando seu dinossauro)
// - Mestre IA central narrando a aventura para todo o grupo
// - Ordem de Iniciativa de combate por turnos
// - Votações democráticas de decisões de exploração
// - Emotes e frases prontas de mesa (sem toxicidade ou chat livre)

export const QUICK_EMOTES = [
  { id: 'roar', label: 'Rugido Feroz', text: '🦖 *Ruge com imponência primal!*' },
  { id: 'caution', label: 'Cuidado!', text: '⚠️ *Alerta o bando sobre perigo à frente!*' },
  { id: 'agree', label: 'Concordo!', text: '👍 *Balança a cabeça em aprovação.*' },
  { id: 'charge', label: 'Atacar!', text: '⚔️ *Bate as patas no chão pronto para a investida!*' },
  { id: 'help', label: 'Preciso de Ajuda!', text: '🆘 *Pede cobertura aos aliados!*' }
];

export class TabletopMultiplayerSession {
  constructor(options = {}) {
    this.sessionId = options.sessionId || `session_${Math.random().toString(36).slice(2, 8)}`;
    this.hostPlayerId = options.hostPlayerId || 'player_1';
    this.maxPlayers = 6;
    this.minPlayers = 2;
    this.players = new Map();
    this.initiativeOrder = [];
    this.currentTurnIndex = 0;
    this.activeVote = null;
    this.log = [];
  }

  addPlayer(player) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, reason: 'Mesa lotada (máximo 6 jogadores)' };
    }
    const id = player.id || `p_${Date.now()}`;
    const pData = {
      id,
      name: player.name || 'Dino Aventureiro',
      species: player.species || 'T-Rex',
      sheet: player.sheet || null,
      ready: false
    };
    this.players.set(id, pData);
    this.log.push(`${pData.name} juntou-se à mesa.`);
    return { success: true, player: pData };
  }

  removePlayer(playerId) {
    const p = this.players.get(playerId);
    if (!p) return false;
    this.players.delete(playerId);
    this.initiativeOrder = this.initiativeOrder.filter(id => id !== playerId);
    this.log.push(`${p.name} deixou a mesa.`);
    return true;
  }

  /**
   * Rola iniciativa para todos os membros da mesa e define a ordem de turnos.
   */
  rollGroupInitiative() {
    const rolls = [];
    for (const [id, player] of this.players.entries()) {
      const agi = player.sheet?.stats?.agilidade || 10;
      const mod = Math.floor((agi - 10) / 2);
      const raw = Math.floor(Math.random() * 20) + 1;
      const total = raw + mod;
      rolls.push({ id, name: player.name, total });
    }

    rolls.sort((a, b) => b.total - a.total);
    this.initiativeOrder = rolls.map(r => r.id);
    this.currentTurnIndex = 0;

    return rolls;
  }

  getCurrentTurnPlayer() {
    if (!this.initiativeOrder.length) return null;
    const id = this.initiativeOrder[this.currentTurnIndex];
    return this.players.get(id);
  }

  nextTurn() {
    if (!this.initiativeOrder.length) return null;
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.initiativeOrder.length;
    return this.getCurrentTurnPlayer();
  }

  /**
   * Inicia votação em decisões de grupo.
   */
  startGroupVote(question, options = []) {
    this.activeVote = {
      question,
      options: options.map(opt => ({ text: opt, votes: 0 })),
      votedPlayers: new Set()
    };
    return this.activeVote;
  }

  castVote(playerId, optionIndex) {
    if (!this.activeVote) return { success: false, reason: 'Nenhuma votação ativa' };
    if (this.activeVote.votedPlayers.has(playerId)) {
      return { success: false, reason: 'Jogador já votou' };
    }
    if (optionIndex < 0 || optionIndex >= this.activeVote.options.length) {
      return { success: false, reason: 'Opção inválida' };
    }

    this.activeVote.options[optionIndex].votes += 1;
    this.activeVote.votedPlayers.add(playerId);

    const isComplete = this.activeVote.votedPlayers.size >= this.players.size;
    let winningOption = null;

    if (isComplete) {
      const sorted = [...this.activeVote.options].sort((a, b) => b.votes - a.votes);
      winningOption = sorted[0];
    }

    return { success: true, isComplete, winningOption };
  }

  sendEmote(playerId, emoteId) {
    const player = this.players.get(playerId);
    const emote = QUICK_EMOTES.find(e => e.id === emoteId);
    if (!player || !emote) return null;

    const message = `${player.name}: ${emote.text}`;
    this.log.push(message);
    return message;
  }
}
