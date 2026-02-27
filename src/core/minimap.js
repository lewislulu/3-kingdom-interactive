/**
 * Minimap -- shows a small overview of the full timeline with viewport indicator
 */

export class Minimap {
  constructor(timeline) {
    this.timeline = timeline;
    this.container = document.getElementById('minimap');
    this.canvas = document.getElementById('minimap-canvas');
    this.viewport = document.getElementById('minimap-viewport');
    this.ctx = this.canvas.getContext('2d');

    this._resize();
    this._render();

    window.addEventListener('resize', () => {
      this._resize();
      this._render();
    });
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.mapWidth = rect.width;
    this.mapHeight = rect.height;
  }

  _render() {
    const ctx = this.ctx;
    const { innerWidth, innerHeight } = this.timeline.getDimensions();
    const data = this.timeline.data;
    const characters = data.characters;
    const characterOrder = data.timeline.characters;

    ctx.clearRect(0, 0, this.mapWidth, this.mapHeight);

    const scaleX = this.mapWidth / innerWidth;
    const scaleY = this.mapHeight / innerHeight;

    // Draw character lines
    characterOrder.forEach((charId) => {
      const char = characters[charId];
      if (!char) return;

      const xScale = this.timeline.xScale;
      const yScale = this.timeline.yScale;
      if (!xScale || !yScale) return;

      const x1 = xScale(char.activeRange[0]) * scaleX;
      const x2 = xScale(char.activeRange[1]) * scaleX;
      const y = yScale(charId) * scaleY;

      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.strokeStyle = char.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Draw event nodes
    const events = data.events;
    const eventIds = data.timeline.events;
    eventIds.forEach((eventId) => {
      const event = events[eventId];
      if (!event) return;

      const xScale = this.timeline.xScale;
      const yScale = this.timeline.yScale;
      if (!xScale || !yScale) return;

      const x = xScale(event.year) * scaleX;
      const charYs = event.characters
        .map((cid) => yScale(cid))
        .filter((y) => y !== undefined);
      if (charYs.length === 0) return;
      const centerY = ((Math.min(...charYs) + Math.max(...charYs)) / 2) * scaleY;

      ctx.beginPath();
      ctx.arc(x, centerY, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#d4a853';
      ctx.fill();
    });
  }

  /**
   * Update viewport rectangle based on current zoom transform
   */
  update(transform) {
    const { width, height, innerWidth, innerHeight } = this.timeline.getDimensions();
    const scaleX = this.mapWidth / innerWidth;
    const scaleY = this.mapHeight / innerHeight;

    // Calculate visible area in content coordinates
    const visibleX = -transform.x / transform.k;
    const visibleY = -transform.y / transform.k;
    const visibleWidth = width / transform.k;
    const visibleHeight = height / transform.k;

    // Map to minimap coordinates
    this.viewport.style.left = `${visibleX * scaleX}px`;
    this.viewport.style.top = `${visibleY * scaleY}px`;
    this.viewport.style.width = `${Math.min(visibleWidth * scaleX, this.mapWidth)}px`;
    this.viewport.style.height = `${Math.min(visibleHeight * scaleY, this.mapHeight)}px`;
  }
}
