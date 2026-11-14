// Modal de escolha de 3 cartas nos marcos de score (+ 1 reroll).
import { drawThreeCards } from '../systems/Cards.js';
import { Save } from '../systems/Save.js';
import { attachModalHelp } from './Menus.js';

export class CardModal {
  constructor(rootEl, onPick) {
    this.root = rootEl;
    this.onPick = onPick;
    this.rerollLeft = 1;
    this.allowCurses = false;
    this.cards = [];
  }

  open(scoreMilestone, allowCurses = false, customCards = null) {
    this.rerollLeft = customCards ? 0 : 1;
    this.allowCurses = allowCurses;
    this.cards = Array.isArray(customCards) && customCards.length > 0 ? customCards : drawThreeCards(allowCurses);
    this._render(scoreMilestone);
  }

  _render(scoreMilestone) {
    this.root.innerHTML = `
      <div class="overlay-center" id="card-modal-overlay">
        <div class="chunky-panel modal-card" style="max-width: 780px;">
          <div class="modal-header">
            <h2>✨ MARCO ${scoreMilestone} PTS — ESCOLHA 1 CARTA</h2>
            <button class="chunky-btn secondary" id="btn-reroll" ${this.rerollLeft <= 0 ? 'disabled' : ''}>
              Rerrolar (${this.rerollLeft})
            </button>
          </div>
          <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));">
            ${this.cards.map((c, idx) => {
              const [bonusPart, riskPart] = String(c.desc || '').split('|').map((s) => s.trim());
              return `
              <div class="item-card rarity-${c.rarity}" style="justify-content: space-between;">
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; color: #ffd447; font-weight: 900;">${c.rarity}</div>
                  <h3 style="margin: 4px 0; color: #fff;">${c.name}</h3>
                  <div style="font-size: 0.85rem; line-height: 1.35; background: rgba(15,8,4,0.45); border-radius: 8px; padding: 6px 8px; margin-top: 6px;">
                    <div style="color: #86efac; font-weight: 700;">＋ ${bonusPart || c.desc}</div>
                    ${riskPart ? `<div style="color: ${c.rarity === 'maldição' ? '#fda4af' : '#cbd5e1'}; font-size: 0.78rem; margin-top: 2px;">${c.rarity === 'maldição' ? '⚠️' : '•'} ${riskPart}</div>` : ''}
                  </div>
                </div>
                <button class="chunky-btn" data-card-idx="${idx}">Escolher</button>
              </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    this.root.querySelector('#btn-reroll')?.addEventListener('click', () => {
      if (this.rerollLeft <= 0) return;
      this.rerollLeft--;
      this.cards = drawThreeCards(this.allowCurses);
      this._render(scoreMilestone);
    });

    this.root.querySelectorAll('[data-card-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-card-idx'));
        const card = this.cards[idx];
        if (card.rarity === 'lendária') {
          Save.data.legendaryCardsCount = (Save.data.legendaryCardsCount || 0) + 1;
          if (Save.data.legendaryCardsCount >= 3) Save.unlockAchievement('legendary_cards');
          Save.save();
        }
        this.close();
        if (this.onPick) this.onPick(card);
      });
    });
    attachModalHelp(this.root, 'Escolha 1 melhoria para esta corrida (ou use Rerrolar 1 vez). Cartas mais raras brilham em azul, roxo ou dourado!');
  }

  close() {
    this.root.innerHTML = '';
  }
}
