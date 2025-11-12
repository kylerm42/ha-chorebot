// ============================================================================
// Recurrence Rule (rrule) Utility Functions for ChoreBot Cards
// ============================================================================

import { EditingTask } from "./types.js";

export interface ParsedRrule {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | null;
  interval: number;
  byweekday: string[];
  bymonthday: number | null;
}

/**
 * Parse an rrule string into component parts
 * @param rrule - rrule string (e.g., "FREQ=DAILY;INTERVAL=1")
 * @returns Parsed rrule object or null if invalid
 */
export function parseRrule(rrule: string | undefined): ParsedRrule | null {
  if (!rrule) {
    return null;
  }

  try {
    const parts = rrule.split(";");
    let frequency: "DAILY" | "WEEKLY" | "MONTHLY" | null = null;
    let interval = 1;
    const byweekday: string[] = [];
    let bymonthday: number | null = null;

    for (const part of parts) {
      const [key, value] = part.split("=");

      if (key === "FREQ") {
        if (value === "DAILY" || value === "WEEKLY" || value === "MONTHLY") {
          frequency = value;
        }
      } else if (key === "INTERVAL") {
        const parsedInterval = parseInt(value, 10);
        if (!isNaN(parsedInterval) && parsedInterval > 0) {
          interval = parsedInterval;
        }
      } else if (key === "BYDAY") {
        byweekday.push(...value.split(","));
      } else if (key === "BYMONTHDAY") {
        const parsedDay = parseInt(value, 10);
        if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
          bymonthday = parsedDay;
        }
      }
    }

    if (!frequency) {
      return null;
    }

    return { frequency, interval, byweekday, bymonthday };
  } catch (e) {
    console.error("rrule parsing error:", e, rrule);
    return null;
  }
}

/**
 * Build an rrule string from editing task data
 * @param editingTask - Task being edited with recurrence fields
 * @returns rrule string or null if recurrence disabled
 */
export function buildRrule(editingTask: EditingTask): string | null {
  if (!editingTask || !editingTask.has_recurrence) {
    return null;
  }

  const {
    recurrence_frequency,
    recurrence_interval,
    recurrence_byweekday,
    recurrence_bymonthday,
  } = editingTask;

  if (!recurrence_frequency) {
    return null;
  }

  const interval = recurrence_interval || 1;
  let rrule = `FREQ=${recurrence_frequency};INTERVAL=${interval}`;

  if (
    recurrence_frequency === "WEEKLY" &&
    recurrence_byweekday &&
    recurrence_byweekday.length > 0
  ) {
    rrule += `;BYDAY=${recurrence_byweekday.join(",").toUpperCase()}`;
  } else if (recurrence_frequency === "MONTHLY" && recurrence_bymonthday) {
    const day = Math.max(1, Math.min(31, recurrence_bymonthday));
    rrule += `;BYMONTHDAY=${day}`;
  }

  return rrule;
}
