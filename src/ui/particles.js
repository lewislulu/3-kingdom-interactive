/**
 * Ambient Particle System -- floating dust particles for cinematic effect
 */

export class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.isRunning = false;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start(count = 60) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initialize particles
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this._createParticle());
    }

    this._animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  _createParticle(atTop = false) {
    return {
      x: Math.random() * this.canvas.width,
      y: atTop ? -10 : Math.random() * this.canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: Math.random() * 0.2 + 0.05,
      opacity: Math.random() * 0.3 + 0.05,
      // Slow drift oscillation
      phase: Math.random() * Math.PI * 2,
      amplitude: Math.random() * 0.5 + 0.2,
      frequency: Math.random() * 0.005 + 0.002,
    };
  }

  _animate() {
    if (!this.isRunning) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((p, i) => {
      // Update position
      p.x += p.speedX + Math.sin(p.phase) * p.amplitude * 0.1;
      p.y += p.speedY;
      p.phase += p.frequency;

      // Wrap around
      if (p.y > this.canvas.height + 10) {
        this.particles[i] = this._createParticle(true);
        return;
      }
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;

      // Draw
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(212, 168, 83, ${p.opacity})`;
      this.ctx.fill();
    });

    this.animationId = requestAnimationFrame(() => this._animate());
  }
}
