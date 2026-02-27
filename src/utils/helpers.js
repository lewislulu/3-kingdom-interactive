/**
 * Utility helpers
 */

/**
 * Clamp value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Generate a unique ID
 */
export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate placeholder portrait SVG as data URI
 * Creates a stylized circular portrait with the character's initial
 */
export function generatePortraitPlaceholder(name, color) {
  const initial = name.charAt(0);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#0a0a0f" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#bg)"/>
      <circle cx="100" cy="100" r="90" fill="none" stroke="${color}" stroke-width="2" opacity="0.3"/>
      <text x="100" y="115" text-anchor="middle" font-family="serif" font-size="72" font-weight="bold" fill="${color}">${initial}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

/**
 * Ease-out cubic function
 */
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
