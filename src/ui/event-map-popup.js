/**
 * EventMapPopup - Small map overlay shown when clicking "查看地图" in event panel
 *
 * Displays a focused mini-map centered on the event location,
 * showing nearby cities, involved characters, and territory context.
 */
import { MapEngine } from '../core/map-engine.js';

export class EventMapPopup {
  constructor(data) {
    this.data = data;
    this.overlay = null;
    this.mapEngine = null;
    this.isVisible = false;
    this._render();
  }

  _render() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'event-map-overlay hidden';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'event-map-backdrop';
    backdrop.addEventListener('click', () => this.hide());
    this.overlay.appendChild(backdrop);

    // Map container
    const modal = document.createElement('div');
    modal.className = 'event-map-modal';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'overlay-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.hide());
    modal.appendChild(closeBtn);

    // Title
    this.titleEl = document.createElement('h3');
    this.titleEl.className = 'event-map-title';
    modal.appendChild(this.titleEl);

    // Info bar
    this.infoBar = document.createElement('div');
    this.infoBar.className = 'event-map-info';
    modal.appendChild(this.infoBar);

    // Map SVG container
    this.mapContainer = document.createElement('div');
    this.mapContainer.className = 'event-map-container';
    modal.appendChild(this.mapContainer);

    this.overlay.appendChild(modal);
  }

  show(event) {
    if (!event || !event.location) return;

    this.titleEl.textContent = `${event.name} — 地理位置`;

    // Info: chapter and location
    const locData = this.data.mapData.locations?.locations?.find(l => l.id === event.location);
    this.infoBar.textContent = locData
      ? `第${event.year}回 · ${locData.name} · ${locData.description}`
      : `第${event.year}回`;

    this.overlay.classList.remove('hidden');
    this.isVisible = true;

    // Create map engine if not exists, or refresh
    if (this.mapEngine) {
      this.mapEngine.destroy();
    }

    // Small delay to let DOM render
    requestAnimationFrame(() => {
      this.mapEngine = new MapEngine(this.mapContainer, this.data);
      this.mapEngine.setChapter(event.year);

      // Zoom to the event location
      setTimeout(() => {
        this.mapEngine.zoomToLocation(event.location, 4);
      }, 300);
    });
  }

  hide() {
    this.overlay.classList.add('hidden');
    this.isVisible = false;
    if (this.mapEngine) {
      this.mapEngine.destroy();
      this.mapEngine = null;
    }
  }

  getElement() {
    return this.overlay;
  }

  destroy() {
    this.hide();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
