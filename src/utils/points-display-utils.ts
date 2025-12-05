// ============================================================================
// Points Display Utilities for ChoreBot Cards
// ============================================================================

import { HomeAssistant } from "./types.js";

/**
 * Get points display configuration from sensor.
 * Returns { icon, text } where icon is MDI icon string (e.g., "mdi:star")
 * and text is display term (e.g., "stars", "coins", "points").
 *
 * Falls back to { icon: "", text: "points" } if sensor is missing or
 * attribute is undefined.
 *
 * Respects empty strings: If backend sends text="" with an icon, that's
 * intentional (icon-only mode) and won't be overridden with "points".
 *
 * @param hass - Home Assistant instance
 * @returns Object with icon and text properties
 */
export function getPointsDisplayParts(hass: HomeAssistant): {
  icon: string;
  text: string;
} {
  const sensor = hass.states["sensor.chorebot_points"];
  const config = sensor?.attributes.points_display;

  // If sensor or attribute missing entirely, use defaults
  if (!config) {
    return {
      icon: "",
      text: "points",
    };
  }

  // Otherwise respect exact values from backend (including empty strings)
  return {
    icon: config.icon ?? "",
    text: config.text ?? "points",
  };
}

/**
 * Get capitalized points term for use in field labels.
 * Example: "Stars", "Coins", "Points"
 *
 * Falls back to "Points" if sensor is missing or attribute is undefined.
 * Returns empty string if text is intentionally empty (icon-only mode).
 *
 * @param hass - Home Assistant instance
 * @returns Capitalized term string or empty string
 */
export function getPointsTermCapitalized(hass: HomeAssistant): string {
  const parts = getPointsDisplayParts(hass);
  if (!parts.text) {
    return "";
  }
  return parts.text.charAt(0).toUpperCase() + parts.text.slice(1);
}

/**
 * Get lowercase points term for use in helper text.
 * Example: "stars", "coins", "points"
 *
 * Falls back to "points" if sensor is missing or attribute is undefined.
 * Returns empty string if text is intentionally empty (icon-only mode).
 *
 * @param hass - Home Assistant instance
 * @returns Lowercase term string or empty string
 */
export function getPointsTermLowercase(hass: HomeAssistant): string {
  const parts = getPointsDisplayParts(hass);
  if (!parts.text) {
    return "";
  }
  return parts.text.toLowerCase();
}
