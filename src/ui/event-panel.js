/**
 * Event Panel -- side panel showing event details with tabs
 * Enhanced: related events section, richer scene cards
 */
import { marked } from 'marked';
import { panelSlideIn, panelSlideOut, staggerReveal } from '../utils/animations.js';
import { generatePortraitPlaceholder } from '../utils/helpers.js';
import { SECTION_LABELS } from '../data/loader.js';

export class EventPanel {
  constructor(characters, events) {
    this.element = document.getElementById('event-panel');
    this.titleEl = this.element.querySelector('.event-title');
    this.yearEl = this.element.querySelector('.event-year');
    this.charsEl = this.element.querySelector('.event-characters');
    this.contentEl = this.element.querySelector('.event-content');
    this.scenesEl = this.element.querySelector('.event-scenes');
    this.relatedEl = this.element.querySelector('.event-related');
    this.tabs = this.element.querySelectorAll('.tab');
    this.closeBtn = this.element.querySelector('.panel-close');

    this.characters = characters;
    this.events = events || {};
    this.currentEvent = null;
    this.currentTab = 'background';
    this.isVisible = false;
    this.onSceneClick = null;
    this.onRelatedEventClick = null;
    this.onMapClick = null;

    this._bindEvents();
  }

  _bindEvents() {
    this.closeBtn.addEventListener('click', () => this.hide());

    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.currentTab = tab.dataset.tab;
        this._updateActiveTab();
        this._renderContent();
      });
    });
  }

  show(event) {
    this.currentEvent = event;
    this.currentTab = 'background';

    this.titleEl.textContent = event.name;
    this.yearEl.textContent = event.month ? `第${event.year}回` : `第${event.year}回`;

    const existingBadge = this.element.querySelector('.event-importance-badge');
    if (existingBadge) existingBadge.remove();
    if (event.importance === 'major') {
      const badge = document.createElement('span');
      badge.className = 'event-importance-badge';
      badge.style.cssText = `
        display: inline-block;
        padding: 2px 10px;
        background: rgba(212, 168, 83, 0.15);
        border: 1px solid rgba(212, 168, 83, 0.3);
        border-radius: 12px;
        font-size: 11px;
        color: var(--color-gold);
        margin-left: 8px;
        vertical-align: middle;
      `;
      badge.textContent = '重大事件';
      this.titleEl.appendChild(badge);
    }

    this.charsEl.innerHTML = '';
    event.characters.forEach((charId) => {
      const char = this.characters[charId];
      if (!char) return;

      const chip = document.createElement('div');
      chip.className = 'event-char-chip';

      const portrait = generatePortraitPlaceholder(char.name, char.color);
      chip.innerHTML = `
        <img src="${portrait}" alt="${char.name}" />
        <span>${char.name}</span>
      `;
      chip.style.borderColor = `${char.color}30`;
      this.charsEl.appendChild(chip);
    });

    // Map button (only if event has location)
    const existingMapBtn = this.element.querySelector('.event-map-btn');
    if (existingMapBtn) existingMapBtn.remove();
    if (event.location) {
      const mapBtn = document.createElement('button');
      mapBtn.className = 'event-map-btn';
      mapBtn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        padding: 6px 14px;
        background: rgba(91, 140, 184, 0.1);
        border: 1px solid rgba(91, 140, 184, 0.3);
        border-radius: 6px;
        color: var(--color-blue-steel);
        font-family: var(--font-serif);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      `;
      mapBtn.textContent = '查看地图';
      mapBtn.addEventListener('mouseenter', () => {
        mapBtn.style.background = 'rgba(91, 140, 184, 0.2)';
        mapBtn.style.borderColor = 'var(--color-blue-steel)';
      });
      mapBtn.addEventListener('mouseleave', () => {
        mapBtn.style.background = 'rgba(91, 140, 184, 0.1)';
        mapBtn.style.borderColor = 'rgba(91, 140, 184, 0.3)';
      });
      mapBtn.addEventListener('click', () => {
        if (this.onMapClick) this.onMapClick(event);
      });
      this.charsEl.parentNode.insertBefore(mapBtn, this.charsEl.nextSibling);
    }

    this._updateActiveTab();
    this._renderContent();
    this._renderScenes();
    this._renderRelatedEvents();

    this.isVisible = true;
    panelSlideIn(this.element);
  }

  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    panelSlideOut(this.element);
  }

  _updateActiveTab() {
    this.tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === this.currentTab);
    });
  }

  _renderContent() {
    if (!this.currentEvent || !this.currentEvent.narrative_parsed) {
      this.contentEl.innerHTML = '<p style="color: var(--color-text-dim);">暂无内容</p>';
      return;
    }

    const sections = this.currentEvent.narrative_parsed.sections;
    let sectionContent = '';

    switch (this.currentTab) {
      case 'background':
        sectionContent = sections.background || '';
        break;
      case 'process':
        sectionContent = sections.process || '';
        break;
      case 'result':
        sectionContent = sections.result || '';
        break;
    }

    this.contentEl.innerHTML = marked.parse(sectionContent);
    staggerReveal(this.contentEl.querySelectorAll('p, blockquote, li'));
  }

  _renderScenes() {
    this.scenesEl.innerHTML = '';

    if (!this.currentEvent || !this.currentEvent.narrative_parsed) return;

    const scenes = this.currentEvent.narrative_parsed.scenes;
    if (!scenes || scenes.length === 0) return;

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;color:var(--color-text-dim);margin-bottom:12px;letter-spacing:2px;';
    title.textContent = '故事细节';
    this.scenesEl.appendChild(title);

    scenes.forEach((scene, index) => {
      const card = document.createElement('div');
      card.className = 'scene-card';
      card.innerHTML = `
        <span class="scene-card-title">${scene.title}</span>
        <span class="scene-card-arrow">&rarr;</span>
      `;
      card.addEventListener('click', () => {
        if (this.onSceneClick) {
          this.onSceneClick(scene, this.currentEvent);
        }
      });
      this.scenesEl.appendChild(card);
    });

    staggerReveal(this.scenesEl.querySelectorAll('.scene-card'));
  }

  _renderRelatedEvents() {
    this.relatedEl.innerHTML = '';

    if (!this.currentEvent || !this.currentEvent.relatedEvents) return;

    const relatedIds = this.currentEvent.relatedEvents;
    const relatedEvents = relatedIds
      .map((id) => this.events[id])
      .filter(Boolean);

    if (relatedEvents.length === 0) return;

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;color:var(--color-text-dim);margin-bottom:12px;letter-spacing:2px;';
    title.textContent = '相关事件';
    this.relatedEl.appendChild(title);

    relatedEvents.forEach((related) => {
      const card = document.createElement('div');
      card.className = 'related-event-card';
      card.style.cssText = `
        padding: 10px 14px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(212, 168, 83, 0.1);
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;

      const left = document.createElement('div');
      const nameSpan = document.createElement('div');
      nameSpan.style.cssText = 'font-size:13px; color: var(--color-ivory);';
      nameSpan.textContent = related.name;
      const yearSpan = document.createElement('div');
      yearSpan.style.cssText = 'font-size:11px; color: var(--color-text-dim); font-family: var(--font-mono); margin-top: 2px;';
      yearSpan.textContent = `${related.year}`;
      left.appendChild(nameSpan);
      left.appendChild(yearSpan);

      const arrow = document.createElement('span');
      arrow.style.cssText = 'color: var(--color-gold-dim); font-size: 16px;';
      arrow.textContent = '\u2192';

      card.appendChild(left);
      card.appendChild(arrow);

      card.addEventListener('mouseenter', () => {
        card.style.background = 'rgba(212, 168, 83, 0.06)';
        card.style.borderColor = 'rgba(212, 168, 83, 0.25)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.background = 'rgba(255,255,255,0.02)';
        card.style.borderColor = 'rgba(212, 168, 83, 0.1)';
      });
      card.addEventListener('click', () => {
        if (this.onRelatedEventClick) {
          this.onRelatedEventClick(related);
        }
      });

      this.relatedEl.appendChild(card);
    });

    staggerReveal(this.relatedEl.querySelectorAll('.related-event-card'));
  }
}
