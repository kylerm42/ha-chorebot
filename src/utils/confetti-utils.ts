// ============================================================================
// Confetti Utility Functions for ChoreBot Cards
// ============================================================================

import confetti from "canvas-confetti";

/**
 * Adjust color lightness to create shades
 * @param color - Base color (hex, rgb, or CSS variable)
 * @param percent - Percentage to adjust (-100 to 100, negative = darker, positive = lighter)
 * @returns Adjusted color string
 */
function adjustColorLightness(color: string, percent: number): string {
  // For CSS variables, resolve the computed value
  if (color.startsWith("var(")) {
    const resolvedColor = getComputedStyle(
      document.documentElement,
    ).getPropertyValue(color.slice(4, -1).trim());
    if (resolvedColor) {
      color = resolvedColor.trim();
    } else {
      // Fallback if variable can't be resolved
      return color;
    }
  }

  // Convert hex to rgb
  let r: number, g: number, b: number;

  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else if (color.startsWith("rgb")) {
    const match = color.match(/\d+/g);
    if (!match) return color;
    [r, g, b] = match.map(Number);
  } else {
    return color;
  }

  // Convert RGB to HSL
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Adjust lightness
  if (percent > 0) {
    // Lighten: increase lightness but cap to avoid pure white
    l = Math.max(0, Math.min(0.95, l + (percent / 100) * (1 - l)));
  } else {
    // Darken: decrease lightness proportionally
    l = Math.max(0.05, l + (percent / 100) * l);
  }

  // Convert HSL back to RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r2: number, g2: number, b2: number;

  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1 / 3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1 / 3);
  }

  // Convert to hex format without # prefix (canvas-confetti expects this format)
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `${toHex(r2)}${toHex(g2)}${toHex(b2)}`.toUpperCase();
}

/**
 * Convert any color format to hex without # prefix (for canvas-confetti)
 * @param color - Color in any format (hex, rgb, or CSS variable)
 * @returns Hex color without # prefix
 */
function toHexWithoutPrefix(color: string): string {
  // If already hex with #, remove it
  if (color.startsWith("#")) {
    return color.substring(1).toUpperCase();
  }

  // If it's already a hex without #, return as-is
  if (/^[0-9A-Fa-f]{6}$/.test(color)) {
    return color.toUpperCase();
  }

  // Otherwise it's rgb() or a CSS variable, adjustColorLightness will handle it
  // and return hex without prefix
  return adjustColorLightness(color, 0);
}

/**
 * Extract color variants (lighter and darker shades) from a base color
 * @param baseColor - Base color (hex, rgb, or CSS variable)
 * @returns Array of 5 hex color strings without # prefix (format: 'RRGGBB')
 */
export function extractColorVariants(baseColor: string): string[] {
  return [
    adjustColorLightness(baseColor, 40), // Lightest
    adjustColorLightness(baseColor, 20), // Lighter
    toHexWithoutPrefix(baseColor), // Base (converted to hex without #)
    adjustColorLightness(baseColor, -20), // Darker
    adjustColorLightness(baseColor, -40), // Darkest
  ];
}

/**
 * Play a small burst of confetti from a specific origin point (task completion)
 * @param origin - Origin point {x: 0-1, y: 0-1} relative to viewport
 * @param colors - Array of color strings to use for confetti
 */
export function playCompletionBurst(
  origin: { x: number; y: number },
  colors: string[],
) {
  confetti({
    particleCount: 30,
    spread: 70,
    startVelocity: 25,
    origin,
    colors,
    disableForReducedMotion: true,
  });
}

/**
 * Play fireworks effect from both sides (group completion)
 * @param colors - Array of color strings to use for fireworks
 * @param duration - Duration in milliseconds (default: 3000)
 */
export function playFireworks(colors: string[], duration: number = 3000) {
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // Launch from left side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors,
      disableForReducedMotion: true,
    });
    // Launch from right side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors,
      disableForReducedMotion: true,
    });
  }, 250);
}

/**
 * Play star shower effect falling from top (all tasks complete)
 * @param colors - Array of color strings to use for stars
 * @param duration - Duration in milliseconds (default: 5000)
 */
export function playStarShower(colors: string[], duration: number = 5000) {
  const animationEnd = Date.now() + duration;
  let skew = 1;

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  (function frame() {
    const timeLeft = animationEnd - Date.now();
    const ticks = Math.max(200, 500 * (timeLeft / duration));
    skew = Math.max(0.8, skew - 0.001);

    confetti({
      particleCount: 1,
      startVelocity: 0,
      ticks: ticks,
      origin: {
        x: Math.random(),
        // Keep stars mostly at the top of the screen
        y: Math.random() * 0.3 - 0.1,
      },
      colors: colors,
      shapes: ["star"],
      gravity: randomInRange(1.2, 1.5), // Faster fall (increased from 0.4-0.6)
      scalar: randomInRange(1.2, 2.0), // Larger stars (increased from 0.4-1.0)
      drift: randomInRange(-0.4, 0.4),
      disableForReducedMotion: true,
    });

    if (timeLeft > 0) {
      requestAnimationFrame(frame);
    }
  })();
}
