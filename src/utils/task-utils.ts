// ============================================================================
// Task Utility Functions for ChoreBot Cards
// ============================================================================

import { Task, HassEntity, Section, Progress, GroupState } from "./types.js";
import { isSameDay } from "./date-utils.js";

/**
 * Filter tasks for today-focused view
 * Shows: incomplete tasks due today, incomplete overdue tasks, tasks completed today, and dateless tasks
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

    // If task is completed, check if it was completed today
    if (isCompleted) {
      if (task.last_completed) {
        const completedDate = new Date(task.last_completed);
        if (isSameDay(completedDate, new Date())) {
          return true; // Show if completed today (regardless of due date)
        }
        // If completed but not today, hide it
        return false;
      }
    }

    // Show incomplete tasks due today
    if (isToday) {
      return true;
    }

    // Show incomplete overdue tasks
    if (isOverdue && !isCompleted) {
      return true;
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
 * Calculate progress for only tasks with due dates (excludes dateless tasks)
 * @param tasks - Array of tasks to calculate progress for
 * @returns Object with completed and total counts for dated tasks only
 */
export function calculateDatedTasksProgress(tasks: Task[]): Progress {
  // Filter to only tasks with due dates
  const datedTasks = tasks.filter((t) => !!t.due);
  const completed = datedTasks.filter((t) => t.status === "completed").length;
  return {
    completed,
    total: datedTasks.length,
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
    const tags = task.tags || [];

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

/**
 * Sort groups by custom order (works with GroupState[])
 * @param groups - Array of GroupState objects
 * @param tagOrder - Optional array specifying desired tag order
 * @param untaggedHeader - Header text for untagged tasks (placed last if not in tagOrder)
 * @param upcomingHeader - Header text for upcoming tasks (always placed last)
 * @returns Sorted array of GroupState objects
 */
export function sortGroups(
  groups: GroupState[],
  tagOrder?: string[],
  untaggedHeader: string = "Untagged",
  upcomingHeader: string = "Upcoming",
): GroupState[] {
  return groups.sort((a, b) => {
    // Always put Upcoming at the end
    if (a.name === upcomingHeader) return 1;
    if (b.name === upcomingHeader) return -1;

    if (!tagOrder || tagOrder.length === 0) {
      // No custom order - sort alphabetically, with untagged last
      if (a.name === untaggedHeader) return 1;
      if (b.name === untaggedHeader) return -1;
      return a.name.localeCompare(b.name);
    }

    // Sort by custom order
    const indexA = tagOrder.indexOf(a.name);
    const indexB = tagOrder.indexOf(b.name);

    // If both are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only one is in the order list, it comes first
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // If neither is in the order list, put untagged last and sort others alphabetically
    if (a.name === untaggedHeader) return 1;
    if (b.name === untaggedHeader) return -1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter and group tasks in a single pass for efficiency
 * Returns array of GroupState objects including tag groups and optional Upcoming group
 * @param entity - Home Assistant entity containing tasks
 * @param showDatelessTasks - Whether to show tasks without due dates
 * @param showFutureTasks - Whether to include future tasks in Upcoming group
 * @param untaggedHeader - Header text for tasks without tags
 * @param upcomingHeader - Header text for future tasks group
 * @param filterSectionId - Optional section ID to filter by
 * @returns Array of GroupState objects with tasks grouped
 */
export function filterAndGroupTasks(
  entity: HassEntity,
  showDatelessTasks: boolean = true,
  showFutureTasks: boolean = false,
  untaggedHeader: string = "Untagged",
  upcomingHeader: string = "Upcoming",
  filterSectionId?: string,
): GroupState[] {
  const allTasks = entity.attributes.chorebot_tasks || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const tagGroups = new Map<string, Task[]>();
  const futureTasks: Task[] = [];

  // Resolve section filter once
  let sectionIdToMatch: string | undefined;
  if (filterSectionId) {
    const sections: Section[] = entity.attributes.chorebot_sections || [];
    const sectionByName = sections.find((s) => s.name === filterSectionId);
    sectionIdToMatch = sectionByName ? sectionByName.id : filterSectionId;
  }

  // Single pass through all tasks
  for (const task of allTasks) {
    // Apply section filter first (if applicable)
    if (sectionIdToMatch) {
      if (task.section_id !== sectionIdToMatch) {
        continue; // Skip this task
      }
    }

    const hasDueDate = !!task.due;
    const isCompleted = task.status === "completed";

    // Determine which group this task belongs to
    let isTodayTask = false;
    let isFutureTask = false;

    if (!hasDueDate) {
      // Dateless task
      isTodayTask = showDatelessTasks;
    } else if (task.due) {
      const dueDate = new Date(task.due);

      // Check if future task (after end of today)
      if (showFutureTasks && dueDate > endOfToday) {
        isFutureTask = true;
      } else {
        // Check if today task
        const dueDateOnly = new Date(dueDate);
        dueDateOnly.setHours(0, 0, 0, 0);
        const isToday = isSameDay(dueDateOnly, today);
        const isOverdue = dueDateOnly < today;

        if (isCompleted) {
          if (task.last_completed) {
            if (isSameDay(new Date(task.last_completed), new Date())) {
              isTodayTask = true; // Show if completed today (regardless of due date)
            }
          }
        } else if (isToday || isOverdue) {
          isTodayTask = true;
        }
      }
    }

    // Add to appropriate group
    if (isTodayTask) {
      // Add to tag groups
      const tags = task.tags || [];
      if (tags.length === 0) {
        if (!tagGroups.has(untaggedHeader)) {
          tagGroups.set(untaggedHeader, []);
        }
        tagGroups.get(untaggedHeader)!.push(task);
      } else {
        for (const tag of tags) {
          if (!tagGroups.has(tag)) {
            tagGroups.set(tag, []);
          }
          tagGroups.get(tag)!.push(task);
        }
      }
    } else if (isFutureTask) {
      futureTasks.push(task);
    }
  }

  // Sort future tasks by due date (earliest first)
  futureTasks.sort((a, b) => {
    const dateA = new Date(a.due!).getTime();
    const dateB = new Date(b.due!).getTime();
    return dateA - dateB;
  });

  // Convert Map to GroupState array
  const groups: GroupState[] = Array.from(tagGroups.entries()).map(
    ([name, tasks]) => ({
      name,
      tasks,
      isCollapsed: false, // Default collapsed state (will be overridden by component)
    }),
  );

  // Add Upcoming group if enabled and has tasks
  if (showFutureTasks && futureTasks.length > 0) {
    groups.push({
      name: upcomingHeader,
      tasks: futureTasks,
      isCollapsed: false, // Default collapsed state (will be overridden by component)
    });
  }

  return groups;
}
