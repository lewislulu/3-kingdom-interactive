/**
 * Legend - Visual legend explaining chart elements
 * Compact, collapsible legend in bottom-right corner
 */
export class Legend {
  constructor() {
    this.container = null;
    this.collapsed = false;
    this.render();
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'legend';
    this.container.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: rgba(15, 15, 20, 0.95);
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 8px;
      padding: 16px;
      z-index: 1000;
      min-width: 200px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      transition: all 0.3s ease;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      cursor: pointer;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 13px;
      font-weight: 700;
      color: rgb(255, 215, 0);
      letter-spacing: 0.5px;
    `;
    title.textContent = '图例';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'legend-toggle';
    toggleBtn.style.cssText = `
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    `;
    toggleBtn.textContent = '\u2212';

    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.color = 'rgb(255, 215, 0)';
    });
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.color = 'rgba(255, 255, 255, 0.6)';
    });

    header.appendChild(title);
    header.appendChild(toggleBtn);
    header.addEventListener('click', () => this.toggle());
    this.container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'legend-content';
    content.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    content.appendChild(this.createLegendItem(
      this.createCircleIcon(12, 'rgb(255, 215, 0)'),
      '重大事件'
    ));
    content.appendChild(this.createLegendItem(
      this.createCircleIcon(8, 'rgba(255, 215, 0, 0.6)'),
      '普通事件'
    ));
    content.appendChild(this.createLegendItem(
      this.createDiamondIcon(10, 'rgb(147, 197, 253)'),
      '人物事件'
    ));
    content.appendChild(this.createLegendItem(
      this.createLineIcon('rgba(255, 215, 0, 0.4)'),
      '人物故事线'
    ));

    this.container.appendChild(content);
  }

  createLegendItem(icon, label) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.style.cssText = `display: flex; align-items: center; gap: 10px;`;

    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = `width: 24px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;`;
    iconContainer.appendChild(icon);

    const text = document.createElement('div');
    text.style.cssText = `font-size: 12px; color: rgba(255, 255, 255, 0.8); line-height: 1.4;`;
    text.textContent = label;

    item.appendChild(iconContainer);
    item.appendChild(text);
    return item;
  }

  createCircleIcon(size, color) {
    const circle = document.createElement('div');
    circle.style.cssText = `width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color};`;
    return circle;
  }

  createDiamondIcon(size, color) {
    const diamond = document.createElement('div');
    diamond.style.cssText = `width: ${size}px; height: ${size}px; background: ${color}; transform: rotate(45deg);`;
    return diamond;
  }

  createLineIcon(color) {
    const line = document.createElement('div');
    line.style.cssText = `width: 20px; height: 2px; background: ${color};`;
    return line;
  }

  toggle() {
    this.collapsed = !this.collapsed;
    const content = this.container.querySelector('.legend-content');
    const toggleBtn = this.container.querySelector('.legend-toggle');

    if (this.collapsed) {
      content.style.display = 'none';
      toggleBtn.textContent = '+';
      this.container.style.padding = '12px 16px';
    } else {
      content.style.display = 'flex';
      toggleBtn.textContent = '\u2212';
      this.container.style.padding = '16px';
    }
  }

  getElement() {
    return this.container;
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
