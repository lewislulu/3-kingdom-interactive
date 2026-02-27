/**
 * GSAP Animation presets for cinematic effects
 */
import gsap from 'gsap';

/**
 * Panel slide-in from right
 */
export function panelSlideIn(element) {
  element.classList.remove('hidden');
  return gsap.fromTo(element,
    { x: 100, opacity: 0 },
    {
      x: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'power3.out',
    }
  );
}

/**
 * Panel slide-out to right
 */
export function panelSlideOut(element) {
  return gsap.to(element, {
    x: 100,
    opacity: 0,
    duration: 0.35,
    ease: 'power2.in',
    onComplete: () => element.classList.add('hidden'),
  });
}

/**
 * Card pop-in (scale + fade)
 */
export function cardPopIn(element) {
  element.classList.remove('hidden');
  return gsap.fromTo(element,
    { scale: 0.85, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: 0.4,
      ease: 'back.out(1.7)',
    }
  );
}

/**
 * Card pop-out
 */
export function cardPopOut(element) {
  return gsap.to(element, {
    scale: 0.85,
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => element.classList.add('hidden'),
  });
}

/**
 * Overlay fade in
 */
export function overlayFadeIn(element) {
  element.classList.remove('hidden');
  return gsap.fromTo(element,
    { opacity: 0 },
    { opacity: 1, duration: 0.4, ease: 'power2.out' }
  );
}

/**
 * Overlay fade out
 */
export function overlayFadeOut(element) {
  return gsap.to(element, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => element.classList.add('hidden'),
  });
}

/**
 * Typewriter reveal effect for text
 */
export function typewriterReveal(element, { speed = 30 } = {}) {
  const text = element.textContent;
  element.textContent = '';
  element.style.visibility = 'visible';

  const chars = text.split('');
  chars.forEach((char, i) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.opacity = '0';
    element.appendChild(span);
  });

  return gsap.to(element.children, {
    opacity: 1,
    duration: 0.01,
    stagger: speed / 1000,
    ease: 'none',
  });
}

/**
 * Cinematic zoom to a point on the SVG
 */
export function cinematicZoom(svgElement, targetTransform, duration = 1.2) {
  return gsap.to(svgElement, {
    attr: { transform: targetTransform },
    duration,
    ease: 'power2.inOut',
  });
}

/**
 * Pulse glow effect on an SVG element
 */
export function pulseGlow(element, color = '#d4a853') {
  return gsap.fromTo(element,
    { filter: `drop-shadow(0 0 4px ${color})` },
    {
      filter: `drop-shadow(0 0 16px ${color})`,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    }
  );
}

/**
 * Stagger-reveal a list of elements
 */
export function staggerReveal(elements, { duration = 0.4, stagger = 0.08 } = {}) {
  return gsap.fromTo(elements,
    { y: 20, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration,
      stagger,
      ease: 'power2.out',
    }
  );
}
