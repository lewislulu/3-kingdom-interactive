/**
 * PersonalTooltip - Floating tooltip for personal events
 * Shows event details near cursor with type-specific badge
 */
export class PersonalTooltip {
  constructor() {
    this.element = null;
    this.visible = false;
    this.createTooltip();
  }

  createTooltip() {
    this.element = document.createElement('div');
    this.element.className = 'personal-tooltip';
    this.element.style.cssText = `
      position: fixed;
      background: rgba(15, 15, 20, 0.98);
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 8px;
      padding: 12px 16px;
      max-width: 280px;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    `;
    document.body.appendChild(this.element);
  }

  show(personalEvent, character, position) {
    if (!personalEvent) return;
    this.element.innerHTML = '';

    const badge = this.createTypeBadge(personalEvent.type);
    this.element.appendChild(badge);

    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-top: 8px;
      margin-bottom: 6px;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 14px;
      font-weight: 700;
      color: rgb(255, 255, 255);
      line-height: 1.3;
      flex: 1;
    `;
    title.textContent = personalEvent.title;

    const year = document.createElement('div');
    year.style.cssText = `
      font-size: 12px;
      color: rgba(255, 215, 0, 0.8);
      font-weight: 600;
      flex-shrink: 0;
    `;
    year.textContent = personalEvent.year;

    titleContainer.appendChild(title);
    titleContainer.appendChild(year);
    this.element.appendChild(titleContainer);

    if (personalEvent.description) {
      const description = document.createElement('div');
      description.style.cssText = `
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.5;
        margin-top: 6px;
      `;
      description.textContent = personalEvent.description;
      this.element.appendChild(description);
    }

    if (character) {
      const characterRef = document.createElement('div');
      characterRef.style.cssText = `
        font-size: 11px;
        color: rgba(255, 215, 0, 0.6);
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 215, 0, 0.2);
      `;
      characterRef.textContent = `${character.name}`;
      this.element.appendChild(characterRef);
    }

    this.positionTooltip(position);

    this.visible = true;
    requestAnimationFrame(() => {
      this.element.style.opacity = '1';
    });
  }

  createTypeBadge(type) {
    const badge = document.createElement('div');
    badge.style.cssText = `
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
    `;

    // Customize these labels for your project
    let text = '';
    let bgColor = '';
    let textColor = '';

    switch (type) {
      case 'milestone':
        text = '里程碑';
        bgColor = 'rgba(59, 130, 246, 0.2)';
        textColor = 'rgb(147, 197, 253)';
        break;
      case 'turning-point':
        text = '转折点';
        bgColor = 'rgba(255, 215, 0, 0.2)';
        textColor = 'rgb(255, 215, 0)';
        break;
      case 'anecdote':
        text = '逸事';
        bgColor = 'rgba(34, 197, 94, 0.2)';
        textColor = 'rgb(134, 239, 172)';
        break;
      default:
        text = '事件';
        bgColor = 'rgba(156, 163, 175, 0.2)';
        textColor = 'rgb(209, 213, 219)';
    }

    badge.style.background = bgColor;
    badge.style.color = textColor;
    badge.textContent = text;

    return badge;
  }

  positionTooltip(position) {
    const tooltipRect = this.element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const offset = 15;
    let x = position.x + offset;
    let y = position.y + offset;

    if (x + tooltipRect.width > viewportWidth) {
      x = position.x - tooltipRect.width - offset;
    }
    if (x < offset) x = offset;
    if (y + tooltipRect.height > viewportHeight) {
      y = position.y - tooltipRect.height - offset;
    }
    if (y < offset) y = offset;

    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.element.style.opacity = '0';
    setTimeout(() => {
      if (!this.visible) this.element.innerHTML = '';
    }, 200);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
