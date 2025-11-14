// ============================================================================
// Color Utilities for ChoreBot Cards
// ============================================================================

/**
 * Color shades generated from a base color
 * 5-shade system: darker (-30%), dark (-15%), base (0%), light (+15%), lighter (+30%)
 */
export interface ColorShades {
  lighter: string; // +30% lightness
  light: string; // +15% lightness
  base: string; // Original color
  dark: string; // -15% lightness
  darker: string; // -30% lightness
}

/**
 * Adjust color lightness in HSL color space
 * Handles hex, rgb, rgba, and CSS variable formats
 *
 * @param color - Base color (hex, rgb, or CSS variable like var(--primary-color))
 * @param percent - Percentage to adjust (-100 to 100, negative = darker, positive = lighter)
 * @returns Adjusted color in hex format without # prefix (for canvas-confetti compatibility)
 */
export function adjustColorLightness(color: string, percent: number): string {
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
 * Convert any color format to hex without # prefix
 * Used for canvas-confetti which expects hex colors without the # prefix
 *
 * @param color - Color in any format (hex, rgb, or CSS variable)
 * @returns Hex color without # prefix (format: 'RRGGBB')
 */
export function toHexWithoutPrefix(color: string): string {
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
 * Calculate all 5 color shades from a base color
 *
 * @param baseColor - Base color (hex, rgb, or CSS variable)
 * @returns Object with 5 color shades in hex format without # prefix
 */
export function calculateColorShades(baseColor: string): ColorShades {
  return {
    lighter: adjustColorLightness(baseColor, 30),
    light: adjustColorLightness(baseColor, 15),
    base: toHexWithoutPrefix(baseColor),
    dark: adjustColorLightness(baseColor, -15),
    darker: adjustColorLightness(baseColor, -30),
  };
}

/**
 * Get the CSS variable name for a color shade
 *
 * @param shade - Shade name
 * @returns CSS variable name (e.g., '--chorebot-color-light')
 */
export function getColorVarName(shade: keyof ColorShades): string {
  return `--chorebot-color-${shade}`;
}

/**
 * Convert ColorShades to CSS variable string for inline styles
 *
 * @param shades - Color shades object
 * @returns CSS variable declarations as string
 */
export function shadesToCssVars(shades: ColorShades): string {
  return Object.entries(shades)
    .map(
      ([key, value]) =>
        `${getColorVarName(key as keyof ColorShades)}: #${value}`,
    )
    .join("; ");
}
