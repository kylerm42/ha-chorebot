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
} from "./utils/types.js";
import {
  filterTodayTasks,
  calculateProgress,
  groupTasksByTag,
  sortTagGroups,
} from "./utils/task-utils.js";
import { formatRelativeDate, isOverdue } from "./utils/date-utils.js";
import { buildRrule } from "./utils/rrule-utils.js";
import {
  prepareTaskForEditing,
  renderEditDialog,
} from "./utils/dialog-utils.js";
import {
  extractColorVariants,
  playCompletionBurst,
  playFireworks,
  playStarShower,
} from "./utils/confetti-utils.js";

// Card-specific config interface
interface ChoreBotGroupedConfig extends ChoreBotBaseConfig {
  untagged_header?: string;
  tag_group_order?: string[];
}

// ============================================================================
// ChoreBot Grouped Card (TypeScript)
// ============================================================================

/**
 * ChoreBot Grouped Card
 *
 * Displays todo items grouped by tags with:
 * - Tag-based grouping (tasks appear in all matching tag groups)
 * - Per-group progress tracking
 * - Today-focused view (tasks due today + incomplete overdue + completed overdue)
 * - Optional dateless tasks
 * - Task editing dialog
 * - Custom tag ordering
 */
@customElement("chorebot-grouped-card")
export class ChoreBotGroupedCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: ChoreBotGroupedConfig;
  @state() private _editDialogOpen = false;
  @state() private _editingTask: EditingTask | null = null;
  @state() private _saving = false;
  @state() private _collapsedGroups = new Set<string>();
  private _autoCollapseTimeouts = new Map<string, number>();
  private _previousGroupProgress = new Map<
    string,
    { completed: number; total: number }
  >();

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

    /* Tag Group Container */
    .tag-groups {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tag-group-container {
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      border: 1px solid var(--divider-color);
      transition: border-radius 0.3s ease;
    }

    .tag-group-container.collapsed {
      border-radius: var(--ha-card-border-radius, 12px);
    }

    /* Tag Group Header Bar */
    .tag-group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      font-weight: 500;
      font-size: 24px;
      cursor: pointer;
      user-select: none;
      transition:
        filter 0.2s ease,
        border-bottom 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .tag-group-header::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: var(--darker-color);
      width: var(--progress-width, 0%);
      transition: width 0.3s ease;
      z-index: 0;
    }

    .tag-group-header.collapsed {
      border-bottom: none;
    }

    .tag-group-header:active {
      filter: brightness(0.9);
    }

    .tag-group-header-title {
      flex: 1;
      text-transform: capitalize;
      position: relative;
      z-index: 1;
    }

    .tag-group-header-progress {
      font-weight: 400;
      opacity: 0.8;
      position: relative;
      z-index: 1;
    }

    /* Tag Group Tasks (rows, not separate cards) */
    .tag-group-tasks {
      display: grid;
      grid-template-rows: 1fr;
      transition:
        grid-template-rows 0.3s ease,
        opacity 0.3s ease;
      opacity: 1;
    }

    .tag-group-tasks.collapsed {
      grid-template-rows: 0fr;
      opacity: 0;
    }

    .tag-group-tasks-inner {
      overflow: hidden;
    }

    .todo-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      cursor: pointer;
      transition: filter 0.2s ease;
      border-bottom: 1px solid var(--divider-color);
    }

    .todo-item:last-child {
      border-bottom: none;
    }

    .todo-item:hover {
      filter: brightness(1.1);
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
      font-weight: 400;
      word-wrap: break-word;
      line-height: 1.3;
    }

    .todo-due-date {
      font-size: 14px;
      font-weight: normal;
      opacity: 0.7;
    }

    .recurring-icon {
      --mdc-icon-size: 14px;
      margin-right: 4px;
      vertical-align: middle;
      line-height: 1;
      display: inline-flex;
      align-items: center;
    }

    .completion-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .completion-circle ha-icon {
      --mdi-icon-size: 28px;
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

  setConfig(config: ChoreBotGroupedConfig) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this._config = {
      entity: config.entity,
      title: config.title || "Tasks",
      show_title: config.show_title !== false,
      show_dateless_tasks: config.show_dateless_tasks !== false,
      hide_card_background: config.hide_card_background === true,
      task_background_color: config.task_background_color || "",
      task_text_color: config.task_text_color || "",
      untagged_header: config.untagged_header || "Untagged",
      tag_group_order: config.tag_group_order || [],
      filter_section_id: config.filter_section_id,
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

    // Group tasks by tag
    const tagGroups = groupTasksByTag(tasks, this._config.untagged_header);
    const sortedGroups = sortTagGroups(
      tagGroups,
      this._config.tag_group_order,
      this._config.untagged_header,
    );

    return html`
      <ha-card
        class="${this._config.hide_card_background ? "no-background" : ""}"
      >
        ${this._config.show_title
          ? html`<div class="card-header">${this._config.title}</div>`
          : ""}
        ${sortedGroups.length === 0
          ? html`<div class="empty-state">No tasks for today</div>`
          : html`<div class="tag-groups">
              ${this._renderTagGroups(sortedGroups)}
            </div>`}
      </ha-card>

      ${this._renderEditDialog()}
    `;
  }

  // ============================================================================
  // Color Manipulation Helpers
  // ============================================================================

  private _adjustColorLightness(color: string, percent: number): string {
    // Parse the color and adjust lightness in HSL space
    // This handles hex, rgb, rgba, and CSS variables

    // For CSS variables, we can't calculate, so return a fallback
    if (color.startsWith("var(")) {
      // Use filter as fallback for CSS variables
      return color;
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

    // Adjust lightness (percent is like +35 or -20)
    // For lighter: move toward white, for darker: move toward black
    if (percent > 0) {
      // Lighten: increase lightness but cap the adjustment to avoid going to pure white
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

    return `rgb(${Math.round(r2 * 255)}, ${Math.round(g2 * 255)}, ${Math.round(b2 * 255)})`;
  }

  // ============================================================================
  // Tag Group Rendering
  // ============================================================================

  private _renderTagGroups(groups: Array<[string, Task[]]>) {
    return groups.map(([tagName, tasks]) => {
      const progress = calculateProgress(tasks);
      const baseColor =
        this._config!.task_background_color || "var(--primary-color)";
      const textColor = this._config!.task_text_color || "white";

      // Generate color variants
      const lighterColor = this._adjustColorLightness(baseColor, 15);
      const darkerColor = this._adjustColorLightness(baseColor, -15);

      const isCollapsed = this._collapsedGroups.has(tagName);
      const allComplete = progress.completed === progress.total;
      const showCheckmark = isCollapsed && allComplete;

      // Calculate progress percentage for progress bar
      const progressPercent =
        progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

      // Auto-collapse logic: check if group just became complete
      this._checkAutoCollapse(tagName, progress, allComplete, isCollapsed);

      return html`
        <div class="tag-group-container ${isCollapsed ? "collapsed" : ""}">
          <div
            class="tag-group-header ${isCollapsed ? "collapsed" : ""}"
            style="background: ${lighterColor}; color: ${textColor}; --progress-width: ${progressPercent}%; --darker-color: ${darkerColor};"
            @click=${() => this._toggleGroup(tagName)}
          >
            <div class="tag-group-header-title">${tagName}</div>
            <div class="tag-group-header-progress">
              ${showCheckmark
                ? html`<ha-icon
                    icon="mdi:check"
                    style="color: ${textColor}; --mdi-icon-size: 20px;"
                  ></ha-icon>`
                : html`${progress.completed}/${progress.total}`}
            </div>
          </div>
          <div class="tag-group-tasks ${isCollapsed ? "collapsed" : ""}">
            <div class="tag-group-tasks-inner">
              ${this._renderTasks(
                tasks,
                baseColor,
                textColor,
                lighterColor,
                darkerColor,
              )}
            </div>
          </div>
        </div>
      `;
    });
  }

  private _renderTasks(
    tasks: Task[],
    baseColor: string,
    textColor: string,
    lighterColor: string,
    darkerColor: string,
  ) {
    return tasks.map((task) => {
      const isCompleted = task.status === "completed";

      // Task styling based on completion
      const taskBgColor = isCompleted ? baseColor : "transparent";
      const taskTextColor = isCompleted
        ? textColor
        : "var(--primary-text-color)";

      // Completion circle styling
      const circleBgColor = isCompleted ? darkerColor : "transparent";
      const circleIconColor = isCompleted ? "white" : "var(--divider-color)";
      // const circleBorder = isCompleted ? "none" : `2px solid ${lighterColor}`;
      const circleBorder = isCompleted
        ? "none"
        : `2px solid var(--divider-color)`;

      return html`
        <div
          class="todo-item"
          style="background: ${taskBgColor}; color: ${taskTextColor};"
          @click=${() => this._openEditDialog(task)}
        >
          <div class="todo-content">
            <div class="todo-summary">${task.summary}</div>
            ${task.due
              ? html`<div
                  class="todo-due-date"
                  style="color: ${isOverdue(task)
                    ? "var(--error-color)"
                    : "inherit"}"
                >
                  ${formatRelativeDate(new Date(task.due), task)}
                  ${task.parent_uid || task.custom_fields?.parent_uid
                    ? html`<ha-icon
                        icon="mdi:sync"
                        class="recurring-icon"
                      ></ha-icon>`
                    : ""}
                </div>`
              : ""}
          </div>
          <div
            class="completion-circle"
            style="background: ${circleBgColor}; border: ${circleBorder};"
            @click=${(e: Event) => this._handleCompletionClick(e, task)}
          >
            <ha-icon
              icon="mdi:check"
              style="color: ${circleIconColor};"
            ></ha-icon>
          </div>
        </div>
      `;
    });
  }

  // ============================================================================
  // Task Filtering
  // ============================================================================

  private _getFilteredTasks(entity: HassEntity): Task[] {
    return filterTodayTasks(
      entity,
      this._config!.show_dateless_tasks !== false,
      this._config?.filter_section_id,
    );
  }

  // ============================================================================
  // Group Collapse/Expand
  // ============================================================================

  private _toggleGroup(tagName: string) {
    // Clear any pending auto-collapse timeout for this group
    if (this._autoCollapseTimeouts.has(tagName)) {
      clearTimeout(this._autoCollapseTimeouts.get(tagName));
      this._autoCollapseTimeouts.delete(tagName);
    }

    if (this._collapsedGroups.has(tagName)) {
      this._collapsedGroups.delete(tagName);
    } else {
      this._collapsedGroups.add(tagName);
    }
    this.requestUpdate();
  }

  private _checkAutoCollapse(
    tagName: string,
    progress: { completed: number; total: number },
    allComplete: boolean,
    isCollapsed: boolean,
  ) {
    const previousProgress = this._previousGroupProgress.get(tagName);

    // Check if group just became complete (wasn't complete before, is complete now)
    const justCompleted =
      previousProgress &&
      previousProgress.completed < previousProgress.total &&
      allComplete &&
      !isCollapsed;

    // Update the stored progress for next comparison
    this._previousGroupProgress.set(tagName, {
      completed: progress.completed,
      total: progress.total,
    });

    if (justCompleted) {
      // Clear any existing timeout for this group
      if (this._autoCollapseTimeouts.has(tagName)) {
        clearTimeout(this._autoCollapseTimeouts.get(tagName));
      }

      // Set a delay before auto-collapsing (1.5 seconds)
      const timeoutId = window.setTimeout(() => {
        this._collapsedGroups.add(tagName);
        this._autoCollapseTimeouts.delete(tagName);
        this.requestUpdate();
      }, 1500);

      this._autoCollapseTimeouts.set(tagName, timeoutId);
    }
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

      // 2. Check for completion effects (prioritize all-tasks over group)
      if (this._areAllTasksComplete()) {
        // All tasks complete - play star shower (skip group fireworks)
        this._playAllCompleteStarShower();
      } else if (this._isGroupComplete(task)) {
        // Group complete but not all tasks - play fireworks
        this._playGroupFireworks();
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
    const baseColor =
      this._config!.task_background_color || "var(--primary-color)";

    // Extract color variants (lighter and darker shades)
    const colors = extractColorVariants(baseColor);

    // Small burst of confetti from the checkbox with themed colors
    playCompletionBurst(origin, colors);
  }

  /**
   * Check if the group(s) that this task belongs to are 100% complete
   */
  private _isGroupComplete(task: Task): boolean {
    const entity = this.hass?.states[this._config!.entity];
    if (!entity) return false;

    const tasks = this._getFilteredTasks(entity);
    const untaggedHeader = this._config!.untagged_header || "Untagged";
    const tagGroups = groupTasksByTag(tasks, untaggedHeader);

    // Get tags for the completed task
    const taskTags = task.tags || task.custom_fields?.tags || [];
    const tagsToCheck = taskTags.length > 0 ? taskTags : [untaggedHeader];

    // Check if any of the task's groups are now complete
    for (const tagName of tagsToCheck) {
      const groupTasks = tagGroups.get(tagName);
      if (!groupTasks) continue;

      const progress = calculateProgress(groupTasks);
      if (progress.total > 0 && progress.completed === progress.total) {
        return true;
      }
    }

    return false;
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

  private _playGroupFireworks() {
    const baseColor =
      this._config!.task_background_color || "var(--primary-color)";
    const colors = extractColorVariants(baseColor);
    playFireworks(colors);
  }

  private _playAllCompleteStarShower() {
    const baseColor =
      this._config!.task_background_color || "var(--primary-color)";
    const colors = extractColorVariants(baseColor);
    playStarShower(colors);
  }

  // ============================================================================
  // Edit Dialog
  // ============================================================================

  private _openEditDialog(task: Task) {
    this._editingTask = prepareTaskForEditing(task);
    this._editDialogOpen = true;
  }

  private _closeEditDialog() {
    this._editDialogOpen = false;
    this._editingTask = null;
  }

  private _renderEditDialog() {
    // Get sections from entity attributes
    const entity = this.hass?.states[this._config!.entity];
    const sections = entity?.attributes.chorebot_sections || [];

    return renderEditDialog(
      this._editDialogOpen,
      this._editingTask,
      this.hass!,
      sections,
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

    // Handle recurrence
    const rrule = buildRrule(this._editingTask);
    if (rrule !== null) {
      serviceData.rrule = rrule;
    } else if (this._editingTask.has_recurrence === false) {
      // User explicitly disabled recurrence, send empty string to clear it
      serviceData.rrule = "";
    }

    // For recurring task instances, always apply changes to future instances
    const isRecurringInstance = !!(
      this._editingTask.parent_uid ||
      this._editingTask.custom_fields?.parent_uid
    );
    if (isRecurringInstance) {
      serviceData.include_future_occurrences = true;
    }

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
      show_dateless_tasks: true,
      filter_section_id: "",
      hide_card_background: false,
      task_background_color: "",
      task_text_color: "",
      untagged_header: "Untagged",
      tag_group_order: [],
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
          name: "task_background_color",
          selector: { text: {} },
        },
        {
          name: "task_text_color",
          selector: { text: {} },
        },
        {
          name: "untagged_header",
          default: "Untagged",
          selector: { text: {} },
        },
        {
          name: "tag_group_order",
          selector: {
            select: {
              multiple: true,
              custom_value: true,
              options: [],
            },
          },
        },
      ],
      computeLabel: (schema: any) => {
        const labels: { [key: string]: string } = {
          entity: "Todo Entity",
          title: "Card Title",
          show_title: "Show Title",
          show_dateless_tasks: "Show Tasks Without Due Date",
          filter_section_id: "Filter by Section",
          hide_card_background: "Hide Card Background",
          task_background_color: "Task Background Color",
          task_text_color: "Task Text Color",
          untagged_header: "Untagged Tasks Header",
          tag_group_order: "Tag Display Order",
        };
        return labels[schema.name] || undefined;
      },
      computeHelper: (schema: any) => {
        const helpers: { [key: string]: string } = {
          entity: "Select the ChoreBot todo entity to display",
          title: "Custom title for the card",
          show_title: "Show the card title",
          show_dateless_tasks: "Show tasks that do not have a due date",
          filter_section_id:
            'Enter section name (e.g., "SECOND SECTION"). Leave empty to show all sections.',
          hide_card_background:
            "Hide the card background and padding for a seamless look",
          task_background_color:
            "Background color for task items (hex code or CSS variable like var(--primary-color))",
          task_text_color:
            "Text color for task items (hex code or CSS variable)",
          untagged_header:
            'Header text for tasks without tags (default: "Untagged")',
          tag_group_order:
            "Order to display tag groups. Tags not listed will appear alphabetically after these.",
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
  type: "chorebot-grouped-card",
  name: "ChoreBot Grouped Card",
  description: "Display and manage ChoreBot tasks grouped by tags",
  preview: true,
});
