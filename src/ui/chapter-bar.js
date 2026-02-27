/**
 * ChapterBar - Cinematic chapter navigation component
 * Displays horizontally scrollable chapter cards with overview button
 */
export class ChapterBar {
  constructor(chapters, onSelect) {
    this.chapters = chapters;
    this.onSelect = onSelect;
    this.activeChapterId = null;
    this.container = null;
    this.render();
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'chapter-bar';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 100px;
      background: rgba(10, 10, 15, 0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 215, 0, 0.2);
      z-index: 1000;
      display: flex;
      align-items: center;
      padding: 0 20px;
      overflow-x: auto;
      overflow-y: hidden;
    `;

    const overviewBtn = this.createOverviewButton();
    this.container.appendChild(overviewBtn);

    const separator = document.createElement('div');
    separator.style.cssText = `
      width: 1px;
      height: 50px;
      background: rgba(255, 215, 0, 0.3);
      margin: 0 20px;
      flex-shrink: 0;
    `;
    this.container.appendChild(separator);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'chapter-cards';
    cardsContainer.style.cssText = `
      display: flex;
      gap: 15px;
      align-items: center;
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
    `;

    this.chapters.forEach(chapter => {
      const card = this.createChapterCard(chapter);
      cardsContainer.appendChild(card);
    });

    this.container.appendChild(cardsContainer);
  }

  createOverviewButton() {
    const btn = document.createElement('button');
    btn.className = 'chapter-overview-btn';
    btn.setAttribute('data-chapter-id', 'overview');
    btn.style.cssText = `
      background: transparent;
      border: 2px solid rgba(255, 215, 0, 0.4);
      color: rgba(255, 255, 255, 0.8);
      padding: 15px 25px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s ease;
      flex-shrink: 0;
      min-width: 100px;
      text-align: center;
    `;

    btn.textContent = '总览';

    btn.addEventListener('mouseenter', () => {
      if (this.activeChapterId !== null) {
        btn.style.background = 'rgba(255, 215, 0, 0.1)';
        btn.style.borderColor = 'rgba(255, 215, 0, 0.6)';
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (this.activeChapterId !== null) {
        btn.style.background = 'transparent';
        btn.style.borderColor = 'rgba(255, 215, 0, 0.4)';
      }
    });

    btn.addEventListener('click', () => {
      this.onSelect(null);
    });

    return btn;
  }

  createChapterCard(chapter) {
    const card = document.createElement('div');
    card.className = 'chapter-card';
    card.setAttribute('data-chapter-id', chapter.id);
    card.style.cssText = `
      display: flex;
      flex-direction: column;
      padding: 15px 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      flex-shrink: 0;
      min-width: 180px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 3px solid transparent;
      position: relative;
    `;

    const number = document.createElement('div');
    number.className = 'chapter-number';
    number.style.cssText = `
      font-size: 11px;
      color: rgba(255, 215, 0, 0.6);
      margin-bottom: 4px;
      font-weight: 500;
      letter-spacing: 0.5px;
    `;
    number.textContent = `第${this.getChapterNumber(chapter.id)}卷`;
    card.appendChild(number);

    const title = document.createElement('div');
    title.className = 'chapter-title';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 4px;
      line-height: 1.2;
    `;
    title.textContent = chapter.title;
    card.appendChild(title);

    if (chapter.subtitle) {
      const subtitle = document.createElement('div');
      subtitle.className = 'chapter-subtitle';
      subtitle.style.cssText = `
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
        margin-bottom: 6px;
        line-height: 1.2;
      `;
      subtitle.textContent = chapter.subtitle;
      card.appendChild(subtitle);
    }

    const timeRange = document.createElement('div');
    timeRange.className = 'chapter-time-range';
    timeRange.style.cssText = `
      font-size: 11px;
      color: rgba(255, 215, 0, 0.5);
      font-weight: 500;
    `;
    timeRange.textContent = `第${chapter.startYear}回 — 第${chapter.endYear}回`;
    card.appendChild(timeRange);

    card.addEventListener('mouseenter', () => {
      if (this.activeChapterId !== chapter.id) {
        card.style.background = 'rgba(255, 255, 255, 0.05)';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (this.activeChapterId !== chapter.id) {
        card.style.background = 'rgba(255, 255, 255, 0.02)';
      }
    });

    card.addEventListener('click', () => {
      this.onSelect(chapter.id);
    });

    return card;
  }

  getChapterNumber(chapterId) {
    const index = this.chapters.findIndex(ch => ch.id === chapterId);
    return index + 1;
  }

  setActive(chapterId) {
    this.activeChapterId = chapterId;

    const overviewBtn = this.container.querySelector('.chapter-overview-btn');
    if (chapterId === null) {
      overviewBtn.style.background = 'rgba(255, 215, 0, 0.15)';
      overviewBtn.style.borderColor = 'rgb(255, 215, 0)';
      overviewBtn.style.color = 'rgb(255, 215, 0)';
    } else {
      overviewBtn.style.background = 'transparent';
      overviewBtn.style.borderColor = 'rgba(255, 215, 0, 0.4)';
      overviewBtn.style.color = 'rgba(255, 255, 255, 0.8)';
    }

    const cards = this.container.querySelectorAll('.chapter-card');
    cards.forEach(card => {
      const cardId = card.getAttribute('data-chapter-id');
      const title = card.querySelector('.chapter-title');
      const number = card.querySelector('.chapter-number');

      if (cardId === chapterId) {
        card.style.background = 'rgba(255, 215, 0, 0.08)';
        card.style.borderBottomColor = 'rgb(255, 215, 0)';
        title.style.color = 'rgb(255, 255, 255)';
        number.style.color = 'rgb(255, 215, 0)';
      } else {
        card.style.background = 'rgba(255, 255, 255, 0.02)';
        card.style.borderBottomColor = 'transparent';
        title.style.color = 'rgba(255, 255, 255, 0.7)';
        number.style.color = 'rgba(255, 215, 0, 0.6)';
      }
    });
  }

  getElement() {
    return this.container;
  }
}
