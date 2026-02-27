/**
 * Character Card -- floating bio card for character portraits
 * Enhanced: biography mode button, personal event summary
 */
import { cardPopIn, cardPopOut } from '../utils/animations.js';
import { generatePortraitPlaceholder } from '../utils/helpers.js';

export class CharacterCard {
  constructor() {
    this.element = document.getElementById('character-card');
    this.portraitEl = this.element.querySelector('.card-portrait');
    this.nameEl = this.element.querySelector('.card-name');
    this.yearsEl = this.element.querySelector('.card-years');
    this.bioEl = this.element.querySelector('.card-bio');
    this.followBtn = this.element.querySelector('.card-follow-btn');
    this.bioModeBtn = this.element.querySelector('.card-bio-mode-btn');
    this.closeBtn = this.element.querySelector('.panel-close');

    this.currentCharacter = null;
    this.onFollow = null;
    this.onBiographyMode = null;
    this.isVisible = false;

    this._bindEvents();
  }

  _bindEvents() {
    this.closeBtn.addEventListener('click', () => this.hide());
    this.followBtn.addEventListener('click', () => {
      if (this.onFollow && this.currentCharacter) {
        this.onFollow(this.currentCharacter.id);
        this.hide();
      }
    });
    this.bioModeBtn.addEventListener('click', () => {
      if (this.onBiographyMode && this.currentCharacter) {
        this.onBiographyMode(this.currentCharacter.id);
        this.hide();
      }
    });

    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) this.hide();
    });
  }

  show(character) {
    this.currentCharacter = character;

    const portraitUrl = generatePortraitPlaceholder(character.name, character.color);
    this.portraitEl.style.backgroundImage = `url(${portraitUrl})`;
    this.portraitEl.style.borderColor = character.color;

    this.nameEl.textContent = character.name;
    this.nameEl.style.color = character.color;
    this.yearsEl.textContent = `第${character.birth}回 — 第${character.death}回`;
    this.bioEl.textContent = character.bio;

    const existingTags = this.element.querySelector('.card-tags');
    if (existingTags) existingTags.remove();

    if (character.tags && character.tags.length) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'card-tags';
      tagsContainer.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;justify-content:center;';
      character.tags.forEach((tag) => {
        const chip = document.createElement('span');
        chip.textContent = tag;
        chip.style.cssText = `
          padding: 3px 12px;
          border: 1px solid ${character.color}40;
          border-radius: 12px;
          font-size: 12px;
          color: ${character.color};
          background: ${character.color}10;
        `;
        tagsContainer.appendChild(chip);
      });
      this.bioEl.before(tagsContainer);
    }

    const existingSummary = this.element.querySelector('.card-personal-summary');
    if (existingSummary) existingSummary.remove();

    if (character.personalEvents && character.personalEvents.length > 0) {
      const summary = document.createElement('div');
      summary.className = 'card-personal-summary';
      summary.style.cssText = `
        margin-bottom: 20px;
        padding: 12px 16px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px;
      `;
      const summaryTitle = document.createElement('div');
      summaryTitle.style.cssText = `
        font-size: 12px;
        color: var(--color-text-dim);
        letter-spacing: 1px;
        margin-bottom: 8px;
      `;
      summaryTitle.textContent = `人生大事 (${character.personalEvents.length})`;
      summary.appendChild(summaryTitle);

      const preview = character.personalEvents.slice(0, 3);
      preview.forEach((pe) => {
        const item = document.createElement('div');
        item.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 12px;
        `;
        const yearSpan = document.createElement('span');
        yearSpan.style.cssText = `color: ${character.color}; font-family: var(--font-mono); font-size: 11px; flex-shrink: 0;`;
        yearSpan.textContent = pe.year;
        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'color: var(--color-ivory-dim);';
        titleSpan.textContent = pe.title;
        item.appendChild(yearSpan);
        item.appendChild(titleSpan);
        summary.appendChild(item);
      });

      if (character.personalEvents.length > 3) {
        const more = document.createElement('div');
        more.style.cssText = `font-size: 11px; color: var(--color-text-dim); margin-top: 4px;`;
        more.textContent = `...还有 ${character.personalEvents.length - 3} 件`;
        summary.appendChild(more);
      }

      this.bioEl.after(summary);
    }

    this.followBtn.style.borderColor = character.color;
    this.followBtn.style.color = character.color;
    this.bioModeBtn.style.borderColor = character.color;
    this.bioModeBtn.style.color = character.color;

    this.isVisible = true;
    cardPopIn(this.element);
  }

  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    cardPopOut(this.element);
  }
}
