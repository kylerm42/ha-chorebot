import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// Import shared utilities
import {
  HomeAssistant,
  HassEntity,
  Task,
  EditingTask,
  ChoreBotBaseConfig,
  Section,
  Progress,
} from "./utils/types.js";
import { filterTodayTasks, calculateProgress } from "./utils/task-utils.js";
import { formatRelativeDate, isOverdue } from "./utils/date-utils.js";
import { buildRrule } from "./utils/rrule-utils.js";
import {
  prepareTaskForEditing,
  renderTaskDialog,
} from "./utils/dialog-utils.js";
import {
  extractColorVariants,
  playCompletionBurst,
  playStarShower,
} from "./utils/confetti-utils.js";
import { getPointsDisplayParts } from "./utils/points-display-utils.js";

// Card-specific config interface
interface ChoreBotConfig extends ChoreBotBaseConfig {
  // List card has all base config options, no additional ones needed
}

// ============================================================================
// ChoreBot List Card (TypeScript)
// ============================================================================

/**
 * ChoreBot List Card
 *
 * Displays todo items from a ChoreBot todo entity with:
 * - Today-focused view (tasks due today + incomplete overdue + completed overdue)
 * - Optional dateless tasks
 * - Progress tracking
 * - Streak display for recurring tasks
 * - Task editing dialog
 */
@customElement("chorebot-list-card")
export class ChoreBotListCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: ChoreBotConfig;
  @state() private _editDialogOpen = false;
  @state() private _editingTask: EditingTask | null = null;
  @state() private _saving = false;

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      padding: 16px;
      border: none;
    }
    ha-card.no-background {
      padding: 0;
      background: transparent;
      box-shadow: none;
    }
    .card-header {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 16px;
    }
    .progress-bar {
      margin-bottom: 16px;
    }
    .progress-track {
      width: 100%;
      height: 8px;
      background: var(--divider-color);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--primary-color);
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 14px;
      color: var(--secondary-text-color);
      margin-top: 4px;
    }
    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0;
      margin: 0;
    }
    .todo-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-radius: var(--ha-card-border-radius, 12px);
      cursor: pointer;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
    }
    .todo-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .todo-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .todo-summary {
      font-size: 20px;
      font-weight: bold;
      word-wrap: break-word;
    }
    .todo-due-date {
      font-size: 14px;
      font-weight: normal;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .points-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      opacity: 0.9;
    }
    .points-badge.bonus-pending {
      background: linear-gradient(135deg, #c2b055, #e7c61e) !important;
      border: 1px solid currentColor !important;
      animation: glow 2s ease-in-out infinite;
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
    }
    @keyframes glow {
      0%,
      100% {
        opacity: 0.9;
      }
      50% {
        opacity: 1;
      }
    }
    .completion-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .completion-circle ha-icon {
      --mdi-icon-size: 28px;
      color: #d3d3d3;
    }
    .completion-circle.completed {
      filter: brightness(0.7);
    }
    .completion-circle.completed ha-icon {
      color: white;
    }
    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--secondary-text-color);
    }
    ha-dialog {
      --mdc-dialog-min-width: 500px;
    }
  `;

  setConfig(config: ChoreBotConfig) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this._config = {
      entity: config.entity,
      title: config.title || "Tasks",
      show_title: config.show_title !== false,
      show_progress: config.show_progress !== false,
      show_dateless_tasks: config.show_dateless_tasks !== false,
      hide_card_background: config.hide_card_background === true,
      accent_color: config.accent_color || "",
      task_text_color: config.task_text_color || "",
      show_points: config.show_points !== false,
    };
  }

  getCardSize() {
    return 3;
  }

  render() {
    if (!this.hass || !this._config) {
      return html`<ha-card>Loading...</ha-card>`;
    }

    const entity = this.hass.states[this._config.entity];
    if (!entity) {
      return html`<ha-card>
        <div class="empty-state">Entity not found: ${this._config.entity}</div>
      </ha-card>`;
    }

    const tasks = this._getFilteredTasks(entity);
    const progress = calculateProgress(tasks);

    return html`
      <ha-card
        class="${this._config.hide_card_background ? "no-background" : ""}"
      >
        ${this._config.show_title
          ? html`<div class="card-header">${this._config.title}</div>`
          : ""}
        ${this._config.show_progress ? this._renderProgress(progress) : ""}

        <div class="todo-list">${this._renderTasks(tasks)}</div>
      </ha-card>

      ${this._renderEditDialog()}
    `;
  }

  private _renderProgress(progress: Progress) {
    const percentage =
      progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

    return html`
      <div class="progress-bar">
        <div class="progress-track">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-text">
          ${progress.completed} / ${progress.total} tasks completed
        </div>
      </div>
    `;
  }

  private _renderTasks(tasks: Task[]) {
    if (tasks.length === 0) {
      return html`<div class="empty-state">No tasks for today</div>`;
    }

    return tasks.map((task) => {
      const isCompleted = task.status === "completed";
      const bgColor = this._config!.accent_color || "var(--primary-color)";
      const textColor = this._config!.task_text_color || "white";

      return html`
        <div
          class="todo-item"
          style="background: ${bgColor}; color: ${textColor};"
          @click=${() => this._openEditDialog(task)}
        >
          <div class="todo-content">
            <div class="todo-summary">${task.summary}</div>
            ${task.due || task.points_value || task.parent_uid
              ? html`<div
                  class="todo-due-date"
                  style="color: ${isOverdue(task)
                    ? "var(--error-color)"
                    : "inherit"}"
                >
                  ${task.due
                    ? formatRelativeDate(new Date(task.due), task)
                    : ""}
                  ${task.parent_uid
                    ? html`<ha-icon
                        icon="mdi:sync"
                        class="recurring-icon"
                      ></ha-icon>`
                    : ""}
                  ${this._renderPointsBadge(task)}
                </div>`
              : ""}
          </div>
          <div
            class="completion-circle ${isCompleted ? "completed" : ""}"
            style="${isCompleted ? `background: ${bgColor};` : ""}"
            @click=${(e: Event) => this._handleCompletionClick(e, task)}
          >
            <ha-icon icon="mdi:check"></ha-icon>
          </div>
        </div>
      `;
    });
  }

  private _renderPointsBadge(task: Task) {
    // Don't show if points disabled or task has no points
    if (!this._config?.show_points || !task.points_value) {
      return html``;
    }

    // Get configured colors
    const bgColor = this._config!.accent_color || "var(--primary-color)";
    const textColor = this._config!.task_text_color || "white";

    // Check if this is a recurring task with upcoming bonus
    const entity = this.hass?.states[this._config.entity];
    const templates = entity?.attributes.chorebot_templates || [];

    if (task.parent_uid) {
      const template = templates.find((t: any) => t.uid === task.parent_uid);
      if (
        template &&
        template.streak_bonus_points &&
        template.streak_bonus_interval
      ) {
        const nextStreak = template.streak_current + 1;
        if (nextStreak % template.streak_bonus_interval === 0) {
          // Next completion will award bonus!
          return html`<span
            class="points-badge bonus-pending"
            style="color: ${textColor};"
          >
            +${task.points_value} + ${template.streak_bonus_points} pts
          </span>`;
        }
      }
    }

    // Regular points badge
    return html`<span
      class="points-badge"
      style="background: ${bgColor}; color: ${textColor}; border: 1px solid ${textColor};"
    >
      +${task.points_value} pts
    </span>`;
  }

  // ============================================================================
  // Task Filtering (Simplified - Today-Only View)
  // ============================================================================

  private _getFilteredTasks(entity: HassEntity): Task[] {
    return filterTodayTasks(
      entity,
      this._config!.show_dateless_tasks !== false,
      this._config?.filter_section_id,
    );
  }

  // ============================================================================
  // Task Completion
  // ============================================================================

  private async _toggleTask(
    task: Task,
    confettiOrigin?: { x: number; y: number },
  ) {
    const newStatus =
      task.status === "completed" ? "needs_action" : "completed";

    await this.hass!.callService("todo", "update_item", {
      entity_id: this._config!.entity,
      item: task.uid,
      status: newStatus,
    });

    // Play confetti animations when completing a task
    if (newStatus === "completed" && confettiOrigin) {
      // 1. Always play completion burst
      this._playCompletionConfetti(confettiOrigin);

      // 2. Check if all tasks are now complete
      if (this._areAllTasksComplete()) {
        this._playAllCompleteStarShower();
      }
    }
  }

  private _handleCompletionClick(e: Event, task: Task) {
    e.stopPropagation();

    // Capture the position NOW before the async call
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };

    this._toggleTask(task, origin);
  }

  private _playCompletionConfetti(origin: { x: number; y: number }) {
    // Get base color from config
    const baseColor = this._config!.accent_color || "var(--primary-color)";

    // Extract color variants (lighter and darker shades)
    const colors = extractColorVariants(baseColor);

    // Small burst of confetti from the checkbox with themed colors
    playCompletionBurst(origin, colors);
  }

  /**
   * Check if all visible tasks are 100% complete
   */
  private _areAllTasksComplete(): boolean {
    const entity = this.hass?.states[this._config!.entity];
    if (!entity) return false;

    const tasks = this._getFilteredTasks(entity);
    const progress = calculateProgress(tasks);

    return progress.total > 0 && progress.completed === progress.total;
  }

  private _playAllCompleteStarShower() {
    const baseColor = this._config!.accent_color || "var(--primary-color)";
    const colors = extractColorVariants(baseColor);
    playStarShower(colors);
  }

  // ============================================================================
  // Edit Dialog
  // ============================================================================

  private _openEditDialog(task: Task) {
    if (!this.hass || !this._config?.entity) return;
    const entity = this.hass.states[this._config.entity];
    if (!entity) return;
    const templates = entity.attributes.chorebot_templates || [];
    this._editingTask = prepareTaskForEditing(task, templates);
    this._editDialogOpen = true;
  }

  private _closeEditDialog() {
    this._editDialogOpen = false;
    this._editingTask = null;
  }

  private _renderEditDialog() {
    // Get sections and tags from entity attributes
    const entity = this.hass?.states[this._config!.entity];
    const sections = entity?.attributes.chorebot_sections || [];
    const availableTags = entity?.attributes.chorebot_tags || [];

    return renderTaskDialog(
      this._editDialogOpen,
      this._editingTask,
      this.hass!,
      sections,
      availableTags,
      this._saving,
      () => this._closeEditDialog(),
      (ev: CustomEvent) => this._formValueChanged(ev),
      () => this._saveTask(),
    );
  }

  private _formValueChanged(ev: CustomEvent) {
    const updatedValues = ev.detail.value;

    this._editingTask = {
      ...this._editingTask!,
      ...updatedValues,
    };

    if (
      "has_due_date" in updatedValues ||
      "is_all_day" in updatedValues ||
      "has_recurrence" in updatedValues ||
      "recurrence_frequency" in updatedValues
    ) {
      this.requestUpdate();
    }
  }

  private async _saveTask() {
    if (
      !this._editingTask ||
      !this._editingTask.summary?.trim() ||
      this._saving
    ) {
      return;
    }

    this._saving = true;

    const serviceData: any = {
      list_id: this._config!.entity,
      uid: this._editingTask.uid,
      summary: this._editingTask.summary.trim(),
    };

    if (this._editingTask.has_due_date && this._editingTask.due_date) {
      const isAllDay = !!this._editingTask.is_all_day;

      let dateTimeString: string;
      if (isAllDay || !this._editingTask.due_time) {
        dateTimeString = `${this._editingTask.due_date}T00:00:00`;
      } else {
        const timeStr =
          this._editingTask.due_time.split(":").length === 3
            ? this._editingTask.due_time
            : `${this._editingTask.due_time}:00`;
        dateTimeString = `${this._editingTask.due_date}T${timeStr}`;
      }

      const dateObj = new Date(dateTimeString);
      if (isNaN(dateObj.getTime())) {
        console.error("Invalid date/time combination:", dateTimeString);
        this._saving = false;
        return;
      }

      serviceData.due = dateObj.toISOString();
      serviceData.is_all_day = isAllDay;
    } else if (this._editingTask.has_due_date === false) {
      serviceData.due = "";
      serviceData.is_all_day = false;
    }

    if (this._editingTask.description) {
      serviceData.description = this._editingTask.description;
    }

    if (this._editingTask.section_id) {
      serviceData.section_id = this._editingTask.section_id;
    }

    // Handle tags
    if (this._editingTask.tags !== undefined) {
      serviceData.tags = this._editingTask.tags;
    }

    // Handle recurrence
    const rrule = buildRrule(this._editingTask);
    if (rrule !== null) {
      serviceData.rrule = rrule;
    } else if (this._editingTask.has_recurrence === false) {
      // User explicitly disabled recurrence, send empty string to clear it
      serviceData.rrule = "";
    }

    // Handle points fields
    if (this._editingTask.points_value !== undefined) {
      serviceData.points_value = this._editingTask.points_value;
    }
    if (this._editingTask.streak_bonus_points !== undefined) {
      serviceData.streak_bonus_points = this._editingTask.streak_bonus_points;
    }
    if (this._editingTask.streak_bonus_interval !== undefined) {
      serviceData.streak_bonus_interval =
        this._editingTask.streak_bonus_interval;
    }

    // For recurring task instances, always apply changes to future instances
    const isRecurringInstance = !!this._editingTask.parent_uid;
    if (isRecurringInstance) {
      serviceData.include_future_occurrences = true;
    }

    console.log("Calling chorebot.update_task with payload:", serviceData);

    try {
      await this.hass!.callService("chorebot", "update_task", serviceData);
      this._closeEditDialog();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
    } finally {
      this._saving = false;
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  static getStubConfig() {
    return {
      entity: "",
      title: "Tasks",
      show_title: true,
      show_progress: true,
      show_dateless_tasks: true,
      filter_section_id: "",
      hide_card_background: false,
      accent_color: "",
      task_text_color: "",
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: {
            entity: {
              filter: { domain: "todo" },
            },
          },
        },
        {
          name: "title",
          default: "Tasks",
          selector: { text: {} },
        },
        {
          name: "show_title",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "show_progress",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "show_dateless_tasks",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "filter_section_id",
          selector: { text: {} },
        },
        {
          name: "hide_card_background",
          default: false,
          selector: { boolean: {} },
        },
        {
          name: "accent_color",
          selector: { text: {} },
        },
        {
          name: "task_text_color",
          selector: { text: {} },
        },
      ],
      computeLabel: (schema: any) => {
        const labels: { [key: string]: string } = {
          entity: "Todo Entity",
          title: "Card Title",
          show_title: "Show Title",
          show_progress: "Show Progress Bar",
          show_dateless_tasks: "Show Tasks Without Due Date",
          filter_section_id: "Filter by Section",
          hide_card_background: "Hide Card Background",
          accent_color: "Accent Color",
          task_text_color: "Task Text Color",
        };
        return labels[schema.name] || undefined;
      },
      computeHelper: (schema: any) => {
        const helpers: { [key: string]: string } = {
          entity: "Select the ChoreBot todo entity to display",
          title: "Custom title for the card",
          show_title: "Show the card title",
          show_progress: "Show daily progress bar with completed/total tasks",
          show_dateless_tasks: "Show tasks that do not have a due date",
          filter_section_id:
            'Enter section name (e.g., "SECOND SECTION"). Leave empty to show all sections.',
          hide_card_background:
            "Hide the card background and padding for a seamless look",
          accent_color:
            "Accent color for task items (hex code or CSS variable like var(--primary-color))",
          task_text_color:
            "Text color for task items (hex code or CSS variable)",
        };
        return helpers[schema.name] || undefined;
      },
    };
  }
}

// ============================================================================
// Register Card
// ============================================================================

declare global {
  interface Window {
    customCards: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
    }>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "chorebot-list-card",
  name: "ChoreBot List Card",
  description: "Display and manage ChoreBot tasks with today-focused view",
  preview: true,
});
