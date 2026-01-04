// ============================================================================
// Dialog Utility Functions for ChoreBot Cards
// ============================================================================

import { html, TemplateResult } from "lit";
import {
  HomeAssistant,
  Task,
  EditingTask,
  Section,
  RecurringTemplate,
} from "./types.js";
import { parseUTCToLocal } from "./date-utils.js";
import { parseRrule } from "./rrule-utils.js";
import {
  getPointsTermCapitalized,
  getPointsTermLowercase,
} from "./points-display-utils.js";

/**
 * Prepare a task for editing by flattening custom fields and parsing dates/rrule
 * @param task - Task to prepare for editing
 * @param templates - Optional array of templates (for looking up recurring task templates)
 * @returns EditingTask with flattened fields
 */
export function prepareTaskForEditing(
  task: Task,
  templates?: RecurringTemplate[],
): EditingTask {
  const flatTask: EditingTask = {
    ...task,
    is_all_day: task.is_all_day || false,
    tags: task.tags || [],
    section_id: task.section_id,
    points_value: task.points_value || 0,
    streak_bonus_points: task.streak_bonus_points || 0,
    streak_bonus_interval: task.streak_bonus_interval || 0,
  };

  // Extract due date/time if present
  if (task.due) {
    const parsed = parseUTCToLocal(task.due);
    flatTask.due_date = parsed.date ?? undefined;
    flatTask.due_time = parsed.time ?? undefined;
    flatTask.has_due_date = true;
  } else {
    flatTask.has_due_date = false;
  }

  // For recurring instances, look up the template to get rrule and bonus fields
  let rruleToUse = task.rrule;
  if (task.parent_uid && templates) {
    const template = templates.find((t) => t.uid === task.parent_uid);
    if (template) {
      rruleToUse = template.rrule;
      // Also use template's bonus fields if instance doesn't have them
      flatTask.streak_bonus_points = template.streak_bonus_points || 0;
      flatTask.streak_bonus_interval = template.streak_bonus_interval || 0;
    }
  }

  // Parse existing rrule if present
  const parsedRrule = parseRrule(rruleToUse);

  if (parsedRrule) {
    flatTask.has_recurrence = true;
    flatTask.recurrence_frequency = parsedRrule.frequency!;
    flatTask.recurrence_interval = parsedRrule.interval;
    flatTask.recurrence_byweekday = parsedRrule.byweekday;
    flatTask.recurrence_bymonthday = parsedRrule.bymonthday || 1;
  } else {
    flatTask.has_recurrence = false;
    flatTask.recurrence_frequency = "DAILY";
    flatTask.recurrence_interval = 1;
    flatTask.recurrence_byweekday = [];
    flatTask.recurrence_bymonthday = 1;
  }

  return flatTask;
}

/**
 * Build the schema for the edit dialog form
 * @param task - Task being edited
 * @param sections - Available sections from entity
 * @param availableTags - Available tags from entity
 * @returns Array of form schema objects
 */
export function buildEditDialogSchema(
  task: EditingTask,
  sections: Section[],
  availableTags: string[],
): any[] {
  const hasDueDate =
    task.has_due_date !== undefined ? task.has_due_date : !!task.due;
  const isAllDay = task.is_all_day !== undefined ? task.is_all_day : false;

  const schema: any[] = [
    {
      name: "summary",
      required: true,
      selector: { text: {} },
    },
    {
      name: "description",
      selector: { text: { multiline: true } },
    },
  ];

  // Add section dropdown if sections are available
  if (sections.length > 0) {
    schema.push({
      name: "section_id",
      selector: {
        select: {
          options: sections
            .sort((a: Section, b: Section) => b.sort_order - a.sort_order)
            .map((section: Section) => ({
              label: section.name,
              value: section.id,
            })),
        },
      },
    });
  }

  // Add tags multi-select
  schema.push({
    name: "tags",
    selector: {
      select: {
        multiple: true,
        custom_value: true,
        options: availableTags.map((tag: string) => ({
          label: tag,
          value: tag,
        })),
      },
    },
  });

  schema.push({
    name: "has_due_date",
    selector: { boolean: {} },
  });

  if (hasDueDate) {
    schema.push({
      name: "due_date",
      selector: { date: {} },
    });

    if (!isAllDay) {
      schema.push({
        name: "due_time",
        selector: { time: {} },
      });
    }

    schema.push({
      name: "is_all_day",
      selector: { boolean: {} },
    });
  }

  // Recurrence section - only show if task has a due date
  if (hasDueDate) {
    const hasRecurrence =
      task.has_recurrence !== undefined ? task.has_recurrence : false;
    const recurrenceFrequency = task.recurrence_frequency || "DAILY";

    // Add recurrence toggle
    schema.push({
      name: "has_recurrence",
      selector: { boolean: {} },
    });

    // If recurrence is enabled, add recurrence fields
    if (hasRecurrence) {
      schema.push({
        name: "recurrence_frequency",
        selector: {
          select: {
            options: [
              { label: "Daily", value: "DAILY" },
              { label: "Weekly", value: "WEEKLY" },
              { label: "Monthly", value: "MONTHLY" },
            ],
          },
        },
      });

      schema.push({
        name: "recurrence_interval",
        selector: {
          number: {
            min: 1,
            max: 999,
            mode: "box",
          },
        },
      });

      // Frequency-specific fields
      if (recurrenceFrequency === "WEEKLY") {
        schema.push({
          name: "recurrence_byweekday",
          selector: {
            select: {
              multiple: true,
              options: [
                { label: "Monday", value: "MO" },
                { label: "Tuesday", value: "TU" },
                { label: "Wednesday", value: "WE" },
                { label: "Thursday", value: "TH" },
                { label: "Friday", value: "FR" },
                { label: "Saturday", value: "SA" },
                { label: "Sunday", value: "SU" },
              ],
            },
          },
        });
      } else if (recurrenceFrequency === "MONTHLY") {
        schema.push({
          name: "recurrence_bymonthday",
          selector: {
            number: {
              min: 1,
              max: 31,
              mode: "box",
            },
          },
        });
      }
    }
  }

  // Points section
  schema.push({
    name: "points_value",
    selector: {
      number: {
        min: 0,
        max: 10000,
        mode: "box",
      },
    },
  });

  // Streak bonus section (only for recurring tasks)
  if (hasDueDate && task.has_recurrence) {
    schema.push({
      name: "streak_bonus_points",
      selector: {
        number: {
          min: 0,
          max: 10000,
          mode: "box",
        },
      },
    });

    schema.push({
      name: "streak_bonus_interval",
      selector: {
        number: {
          min: 0,
          max: 999,
          mode: "box",
        },
      },
    });
  }

  return schema;
}

/**
 * Build the initial data object for the edit dialog form
 * @param task - Task being edited
 * @param sections - Available sections from entity
 * @returns Data object for form initialization
 */
export function buildEditDialogData(
  task: EditingTask,
  sections: Section[],
): any {
  const hasDueDate =
    task.has_due_date !== undefined ? task.has_due_date : !!task.due;
  const isAllDay = task.is_all_day !== undefined ? task.is_all_day : false;

  let dateValue = task.due_date || null;
  let timeValue = task.due_time || null;

  if (!dateValue && task.due) {
    const parsed = parseUTCToLocal(task.due);
    dateValue = parsed.date;
    timeValue = parsed.time;
  }

  return {
    summary: task.summary || "",
    has_due_date: hasDueDate,
    is_all_day: isAllDay,
    due_date: dateValue || null,
    due_time: timeValue || "00:00",
    description: task.description || "",
    section_id:
      task.section_id ||
      (sections.length > 0
        ? sections.sort(
            (a: Section, b: Section) => b.sort_order - a.sort_order,
          )[0].id
        : undefined),
    tags: task.tags || [],
    has_recurrence: hasDueDate ? task.has_recurrence || false : false,
    recurrence_frequency: task.recurrence_frequency || "DAILY",
    recurrence_interval: task.recurrence_interval || 1,
    recurrence_byweekday: task.recurrence_byweekday || [],
    recurrence_bymonthday: task.recurrence_bymonthday || 1,
    points_value: task.points_value || 0,
    streak_bonus_points: task.streak_bonus_points || 0,
    streak_bonus_interval: task.streak_bonus_interval || 0,
  };
}

/**
 * Get label text for form fields (factory function that accepts hass for dynamic labels)
 * @param hass - Home Assistant instance for dynamic points terminology
 * @returns Function that computes labels for form fields
 */
export function getFieldLabels(hass: HomeAssistant) {
  const pointsTerm = getPointsTermCapitalized(hass) || "Points";

  return function computeLabel(schema: any): string {
    const labels: { [key: string]: string } = {
      summary: "Task Name",
      has_due_date: "Has Due Date",
      is_all_day: "All Day",
      due_date: "Date",
      due_time: "Time",
      description: "Description",
      section_id: "Section",
      tags: "Tags",
      has_recurrence: "Recurring Task",
      recurrence_frequency: "Frequency",
      recurrence_interval: "Repeat Every",
      recurrence_byweekday: "Days of Week",
      recurrence_bymonthday: "Day of Month",
      points_value: `${pointsTerm} Value`,
      streak_bonus_points: `Streak Bonus ${pointsTerm}`,
      streak_bonus_interval: "Bonus Every X Days (0 = no bonus)",
    };
    return labels[schema.name] || schema.name;
  };
}

/**
 * Render the task dialog (for editing or creating tasks)
 * @param isOpen - Whether dialog is open
 * @param task - Task being edited/created
 * @param hass - Home Assistant instance
 * @param sections - Available sections
 * @param availableTags - Available tags from entity
 * @param saving - Whether save is in progress
 * @param onClose - Callback when dialog closes
 * @param onValueChanged - Callback when form values change
 * @param onSave - Callback when save is clicked
 * @param onDelete - Optional callback when delete is clicked
 * @param dialogTitle - Optional dialog title (defaults to "Edit Task")
 * @param showDelete - Whether to show delete button (defaults to true for existing tasks)
 * @returns Lit HTML template
 */
export function renderTaskDialog(
  isOpen: boolean,
  task: EditingTask | null,
  hass: HomeAssistant,
  sections: Section[],
  availableTags: string[],
  saving: boolean,
  onClose: () => void,
  onValueChanged: (ev: CustomEvent) => void,
  onSave: () => void,
  onDelete?: () => void,
  dialogTitle: string = "Edit Task",
  showDelete: boolean = true,
): TemplateResult {
  if (!isOpen || !task) {
    return html``;
  }

  const schema = buildEditDialogSchema(task, sections, availableTags);
  const data = buildEditDialogData(task, sections);
  const computeLabel = getFieldLabels(hass);

  return html`
    <ha-dialog open @closed=${onClose} .heading=${dialogTitle}>
      <ha-form
        .hass=${hass}
        .schema=${schema}
        .data=${data}
        .computeLabel=${computeLabel}
        @value-changed=${onValueChanged}
      ></ha-form>

      <!-- Delete button (bottom-left positioning via CSS) -->
      ${showDelete && onDelete && task?.uid
        ? html`
            <ha-button
              slot="primaryAction"
              @click=${onDelete}
              .disabled=${saving}
              class="delete-button"
            >
              Delete
            </ha-button>
          `
        : ""}

      <ha-button slot="primaryAction" @click=${onSave} .disabled=${saving}>
        ${saving ? "Saving..." : "Save"}
      </ha-button>
      <ha-button slot="secondaryAction" @click=${onClose} .disabled=${saving}>
        Cancel
      </ha-button>

      <style>
        ha-dialog {
          --mdc-dialog-min-width: 500px;
        }
        .delete-button {
          --mdc-theme-primary: var(--error-color, #db4437);
          margin-right: auto; /* Push to left */
        }
      </style>
    </ha-dialog>
  `;
}
