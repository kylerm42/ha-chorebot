// ============================================================================
// Date/Time Utility Functions for ChoreBot Cards
// ============================================================================

import { Task } from "./types.js";

/**
 * Parse UTC timestamp to local date and time strings
 * @param utcString - ISO 8601 UTC timestamp
 * @returns Object with separate date and time strings in local timezone
 */
export function parseUTCToLocal(utcString: string): {
  date: string | null;
  time: string | null;
} {
  try {
    const date = new Date(utcString);
    if (isNaN(date.getTime())) return { date: null, time: null };

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  } catch (e) {
    console.error("Date parsing error:", e, utcString);
    return { date: null, time: null };
  }
}

/**
 * Format a date relative to today (e.g., "Today", "Tomorrow", "2 days ago")
 * @param date - The date to format
 * @param task - Optional task object to check for all-day flag
 * @returns Human-readable relative date string
 */
export function formatRelativeDate(date: Date, task?: Task): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const isAllDay =
      task?.is_all_day || task?.custom_fields?.is_all_day || false;

    if (!isAllDay) {
      const originalDate = new Date(date);
      return originalDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return "Today";
  } else if (diffDays === -1) {
    return "Yesterday";
  } else if (diffDays === 1) {
    return "Tomorrow";
  } else if (diffDays < -1) {
    return `${Math.abs(diffDays)} days ago`;
  } else {
    return `In ${diffDays} days`;
  }
}

/**
 * Check if a task is overdue
 * @param task - Task to check
 * @returns True if task is overdue and not completed
 */
export function isOverdue(task: Task): boolean {
  if (!task.due || task.status === "completed") {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.due);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
