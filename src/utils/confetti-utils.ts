// ============================================================================
// Confetti Utility Functions for ChoreBot Cards
// ============================================================================

import confetti from "canvas-confetti";
import { calculateColorShades } from "./color-utils.js";

/**
 * Extract color variants (lighter and darker shades) from a base color
 * Returns array of 5 colors compatible with canvas-confetti
 *
 * @param baseColor - Base color (hex, rgb, or CSS variable)
 * @returns Array of 5 hex color strings without # prefix (format: 'RRGGBB')
 */
export function extractColorVariants(baseColor: string): string[] {
  const shades = calculateColorShades(baseColor);
  return [
    shades.lighter,
    shades.light,
    shades.base,
    shades.dark,
    shades.darker,
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
