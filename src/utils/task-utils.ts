// ============================================================================
// Task Utility Functions for ChoreBot Cards
// ============================================================================

import { Task, HassEntity, Section, Progress } from "./types.js";
import { isSameDay } from "./date-utils.js";

/**
 * Filter tasks for today-focused view
 * Shows: tasks due today, incomplete overdue tasks, overdue tasks completed today, and dateless tasks
 * @param entity - Home Assistant entity containing tasks
 * @param showDatelessTasks - Whether to show tasks without due dates
 * @param filterSectionId - Optional section ID to filter by
 * @returns Filtered array of tasks
 */
export function filterTodayTasks(
  entity: HassEntity,
  showDatelessTasks: boolean = true,
  filterSectionId?: string,
): Task[] {
  const tasks = entity.attributes.chorebot_tasks || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Apply date/status filtering
  let filteredTasks = tasks.filter((task) => {
    const hasDueDate = !!task.due;
    const isCompleted = task.status === "completed";

    // Handle dateless tasks
    if (!hasDueDate) {
      return showDatelessTasks;
    }

    const dueDate = new Date(task.due!);
    dueDate.setHours(0, 0, 0, 0);
    const isToday = isSameDay(dueDate, today);
    const isOverdue = dueDate < today;

    // Show tasks due today (completed or not)
    if (isToday) {
      return true;
    }

    // Show incomplete overdue tasks
    if (isOverdue && !isCompleted) {
      return true;
    }

    // Show overdue tasks completed today
    if (isOverdue && isCompleted && task.last_completed) {
      const completedDate = new Date(task.last_completed);
      if (isSameDay(completedDate, new Date())) {
        return true;
      }
    }

    return false;
  });

  // Apply section filtering if configured
  if (filterSectionId) {
    // Resolve section name to section ID
    const sections: Section[] = entity.attributes.chorebot_sections || [];
    const filterValue = filterSectionId;

    // Try to find section by name first
    const sectionByName = sections.find(
      (section) => section.name === filterValue,
    );

    // Use the section ID if found by name, otherwise use the filter value as-is (for backward compatibility)
    const sectionIdToMatch = sectionByName ? sectionByName.id : filterValue;

    filteredTasks = filteredTasks.filter(
      (task) => task.section_id === sectionIdToMatch,
    );
  }

  return filteredTasks;
}

/**
 * Calculate progress (completed vs total tasks)
 * @param tasks - Array of tasks to calculate progress for
 * @returns Object with completed and total counts
 */
export function calculateProgress(tasks: Task[]): Progress {
  const completed = tasks.filter((t) => t.status === "completed").length;
  return {
    completed,
    total: tasks.length,
  };
}

/**
 * Group tasks by their tags
 * Tasks with multiple tags will appear in each tag group
 * @param tasks - Array of tasks to group
 * @param untaggedHeader - Header text for tasks without tags
 * @returns Map of tag name to array of tasks
 */
export function groupTasksByTag(
  tasks: Task[],
  untaggedHeader: string = "Untagged",
): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    const tags = task.tags || task.custom_fields?.tags || [];

    if (tags.length === 0) {
      // Task has no tags - add to untagged group
      if (!groups.has(untaggedHeader)) {
        groups.set(untaggedHeader, []);
      }
      groups.get(untaggedHeader)!.push(task);
    } else {
      // Task has tags - add to each tag group
      for (const tag of tags) {
        if (!groups.has(tag)) {
          groups.set(tag, []);
        }
        groups.get(tag)!.push(task);
      }
    }
  }

  return groups;
}

/**
 * Sort tag groups by custom order
 * @param groups - Map of tag groups
 * @param tagOrder - Optional array specifying desired tag order
 * @param untaggedHeader - Header text for untagged tasks (placed last if not in tagOrder)
 * @returns Array of [tag, tasks] entries in sorted order
 */
export function sortTagGroups(
  groups: Map<string, Task[]>,
  tagOrder?: string[],
  untaggedHeader: string = "Untagged",
): Array<[string, Task[]]> {
  const entries = Array.from(groups.entries());

  if (!tagOrder || tagOrder.length === 0) {
    // No custom order - sort alphabetically, with untagged last
    return entries.sort((a, b) => {
      if (a[0] === untaggedHeader) return 1;
      if (b[0] === untaggedHeader) return -1;
      return a[0].localeCompare(b[0]);
    });
  }

  // Sort by custom order
  return entries.sort((a, b) => {
    const indexA = tagOrder.indexOf(a[0]);
    const indexB = tagOrder.indexOf(b[0]);

    // If both are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only one is in the order list, it comes first
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // If neither is in the order list, put untagged last and sort others alphabetically
    if (a[0] === untaggedHeader) return 1;
    if (b[0] === untaggedHeader) return -1;
    return a[0].localeCompare(b[0]);
  });
}
