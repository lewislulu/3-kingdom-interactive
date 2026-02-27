/**
 * Detail View -- scene deep-dive overlay with dialogue rendering
 */
import { overlayFadeIn, overlayFadeOut, typewriterReveal, staggerReveal } from '../utils/animations.js';
import { generatePortraitPlaceholder } from '../utils/helpers.js';

export class DetailView {
  constructor(characters) {
    this.overlay = document.getElementById('scene-overlay');
    this.backdrop = this.overlay.querySelector('.overlay-backdrop');
    this.container = this.overlay.querySelector('.scene-container');
    this.titleEl = this.overlay.querySelector('.scene-title');
    this.contentEl = this.overlay.querySelector('.scene-content');
    this.closeBtn = this.overlay.querySelector('.overlay-close');

    this.characters = characters;
    this.isVisible = false;

    this._bindEvents();
  }

  _bindEvents() {
    this.closeBtn.addEventListener('click', () => this.hide());
    this.backdrop.addEventListener('click', () => this.hide());

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) this.hide();
    });
  }

  show(scene, event) {
    this.titleEl.textContent = scene.title;
    this.contentEl.innerHTML = '';

    // Render each element in the scene
    scene.elements.forEach((el) => {
      if (el.type === 'dialogue') {
        this._renderDialogue(el, event);
      } else if (el.type === 'narrative') {
        this._renderNarrative(el);
      } else if (el.type === 'quote') {
        this._renderQuote(el);
      }
    });

    this.isVisible = true;
    overlayFadeIn(this.overlay);

    // Stagger-reveal all dialogue lines and narrative blocks
    setTimeout(() => {
      staggerReveal(this.contentEl.children, { stagger: 0.12, duration: 0.5 });
    }, 200);
  }

  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    overlayFadeOut(this.overlay);
  }

  _renderDialogue(el, event) {
    const line = document.createElement('div');
    line.className = 'dialogue-line';

    // Try to find the character for this speaker
    const charId = event.characters.find((cid) => {
      const char = this.characters[cid];
      return char && el.speaker.includes(char.name);
    });

    const char = charId ? this.characters[charId] : null;
    const color = char ? char.color : '#d4a853';
    const portrait = char
      ? generatePortraitPlaceholder(char.name, char.color)
      : null;

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'dialogue-avatar';
    if (portrait) {
      avatar.style.backgroundImage = `url(${portrait})`;
    } else {
      avatar.style.background = `${color}30`;
    }
    avatar.style.borderColor = color;
    line.appendChild(avatar);

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = 'dialogue-bubble';

    const speaker = document.createElement('div');
    speaker.className = 'dialogue-speaker';
    speaker.textContent = el.speaker + (el.emotion ? `（${el.emotion}）` : '');
    speaker.style.color = color;

    const text = document.createElement('div');
    text.className = 'dialogue-text';
    text.textContent = el.text;

    bubble.appendChild(speaker);
    bubble.appendChild(text);
    line.appendChild(bubble);

    // Start hidden for stagger animation
    line.style.opacity = '0';
    line.style.transform = 'translateY(20px)';

    this.contentEl.appendChild(line);
  }

  _renderNarrative(el) {
    const p = document.createElement('p');
    p.className = 'scene-narrative';
    p.style.cssText = `
      color: var(--color-ivory-dim);
      font-size: 14px;
      line-height: 1.9;
      margin: 16px 0;
      padding-left: 48px;
      opacity: 0;
      transform: translateY(20px);
    `;
    p.textContent = el.text;
    this.contentEl.appendChild(p);
  }

  _renderQuote(el) {
    const q = document.createElement('blockquote');
    q.style.cssText = `
      border-left: 2px solid var(--color-gold);
      padding-left: 16px;
      margin: 12px 0 12px 48px;
      color: var(--color-ivory);
      font-style: italic;
      font-size: 14px;
      line-height: 1.8;
      opacity: 0;
      transform: translateY(20px);
    `;
    q.textContent = el.text;
    this.contentEl.appendChild(q);
  }
}
