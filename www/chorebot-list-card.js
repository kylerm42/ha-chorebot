import {
  LitElement,
  html,
  css,
} from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

/**
 * ChoreBot List Card
 *
 * Displays todo items from a ChoreBot todo entity with:
 * - Date navigation (prev/next/today)
 * - Smart date filtering (past/today/future)
 * - Streak display for recurring tasks
 * - Progress tracking
 */
class ChoreBotListCard extends LitElement {
  static properties = {
    hass: { type: Object },
    _config: { state: true },
    _selectedDate: { state: true },
  };

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      padding: 16px;
    }
    .card-header {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 16px;
    }
    .date-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 8px;
      background: var(--secondary-background-color);
      border-radius: 8px;
    }
    .date-nav button {
      background: var(--primary-color);
      color: var(--text-primary-color);
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
    }
    .date-nav button:hover {
      opacity: 0.8;
    }
    .date-display {
      font-size: 16px;
      font-weight: 500;
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
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .todo-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid var(--divider-color);
      gap: 12px;
    }
    .todo-item:last-child {
      border-bottom: none;
    }
    .todo-checkbox {
      margin-top: 2px;
      cursor: pointer;
    }
    .todo-content {
      flex: 1;
      min-width: 0;
    }
    .todo-summary {
      font-size: 16px;
      word-wrap: break-word;
    }
    .todo-summary.completed {
      text-decoration: line-through;
      color: var(--secondary-text-color);
    }
    .todo-meta {
      font-size: 12px;
      color: var(--secondary-text-color);
      margin-top: 4px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .todo-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      background: var(--primary-color);
      color: var(--text-primary-color);
      border-radius: 12px;
      font-size: 11px;
    }
    .streak-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: var(--accent-color, var(--primary-color));
      color: var(--text-primary-color);
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--secondary-text-color);
    }
  `;

  constructor() {
    super();
    // Initialize to today at midnight for consistent date comparisons
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this._selectedDate = today;
    this._config = {};
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    // Support future multi-list config structure
    // For now, just use single entity config
    this._config = {
      entity: config.entity,
      title: config.title || "Tasks",
      show_progress: config.show_progress !== false,
      ...config,
    };
  }

  getCardSize() {
    return 3;
  }

  render() {
    if (!this.hass || !this._config.entity) {
      return html`<ha-card>Loading...</ha-card>`;
    }

    const entity = this.hass.states[this._config.entity];
    if (!entity) {
      return html`<ha-card
        ><div class="empty-state">Entity not found: ${this._config.entity}</div></ha-card
      >`;
    }

    const tasks = this._getFilteredTasks(entity);
    const progress = this._calculateProgress(tasks);

    return html`
      <ha-card>
        <div class="card-header">${this._config.title}</div>

        ${this._renderDateNavigation()}

        ${this._config.show_progress ? this._renderProgress(progress) : ""}

        <div class="todo-list">${this._renderTasks(tasks, entity)}</div>
      </ha-card>
    `;
  }

  _renderDateNavigation() {
    const dateStr = this._formatDate(this._selectedDate);
    const isToday = this._isSameDay(this._selectedDate, new Date());

    return html`
      <div class="date-nav">
        <button @click=${this._previousDay}>← Prev</button>
        <div class="date-display">${dateStr}</div>
        <button @click=${this._nextDay}>Next →</button>
        ${!isToday
          ? html`<button @click=${this._goToToday}>Today</button>`
          : ""}
      </div>
    `;
  }

  _renderProgress(progress) {
    const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

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

  _renderTasks(tasks, entity) {
    if (tasks.length === 0) {
      return html`<div class="empty-state">No tasks for this date</div>`;
    }

    return tasks.map(
      (task) => html`
        <div class="todo-item">
          <input
            type="checkbox"
            class="todo-checkbox"
            .checked=${task.status === "completed"}
            @change=${() => this._toggleTask(task)}
          />
          <div class="todo-content">
            <div
              class="todo-summary ${task.status === "completed"
                ? "completed"
                : ""}"
            >
              ${task.summary}
            </div>
            ${this._renderTaskMeta(task, entity)}
          </div>
        </div>
      `
    );
  }

  _renderTaskMeta(task, entity) {
    const parts = [];

    // Due date
    if (task.due) {
      const dueDate = new Date(task.due);
      parts.push(html`<span>Due: ${this._formatDate(dueDate)}</span>`);
    }

    // Last completed
    if (task.last_completed) {
      const completedDate = new Date(task.last_completed);
      parts.push(
        html`<span>Completed: ${this._formatDate(completedDate)}</span>`
      );
    }

    const metaHtml = parts.length > 0
      ? html`<div class="todo-meta">${parts}</div>`
      : "";

    // Tags
    const tagsHtml = task.tags && task.tags.length > 0
      ? html`<div class="todo-tags">
          ${task.tags.map((tag) => html`<span class="tag">${tag}</span>`)}
        </div>`
      : "";

    // Streak (for recurring tasks)
    const streakHtml = this._renderStreak(task, entity);

    return html`${metaHtml} ${tagsHtml} ${streakHtml}`;
  }

  _renderStreak(task, entity) {
    if (!task.parent_uid) {
      return "";
    }

    const templates = entity.attributes.chorebot_templates || [];
    const template = templates.find((t) => t.uid === task.parent_uid);

    if (!template || template.streak_current === 0) {
      return "";
    }

    return html`
      <div class="streak-badge">
        🔥 ${template.streak_current} day streak
        ${template.streak_longest > template.streak_current
          ? html`(best: ${template.streak_longest})`
          : ""}
      </div>
    `;
  }

  _getFilteredTasks(entity) {
    const tasks = entity.attributes.chorebot_tasks || [];

    // Normalize dates to midnight for consistent day-level comparisons
    const selectedDateNorm = this._normalizeToMidnight(this._selectedDate);
    const todayNorm = this._normalizeToMidnight(new Date());

    const isViewingToday = this._isSameDay(this._selectedDate, new Date());
    const isViewingPast = selectedDateNorm < todayNorm;
    const isViewingFuture = selectedDateNorm > todayNorm;

    return tasks.filter((task) => {
      const hasDueDate = !!task.due;
      const dueDate = hasDueDate ? new Date(task.due) : null;
      const dueDateNorm = dueDate ? this._normalizeToMidnight(dueDate) : null;
      const isCompleted = task.status === "completed";
      const completedDate = task.last_completed ? new Date(task.last_completed) : null;

      // Viewing PAST dates
      if (isViewingPast) {
        // Show: tasks completed on that date OR incomplete tasks due on/before that date
        if (isCompleted && completedDate) {
          return this._isSameDay(completedDate, this._selectedDate);
        }
        if (!isCompleted && hasDueDate) {
          // Show if due on or before selected date (use normalized dates)
          return dueDateNorm <= selectedDateNorm;
        }
        // Don't show dateless tasks in the past
        return false;
      }

      // Viewing TODAY
      if (isViewingToday) {
        // Show dateless tasks (always relevant)
        if (!hasDueDate) {
          return true;
        }

        // Show tasks due today
        if (hasDueDate && this._isSameDay(dueDate, this._selectedDate)) {
          return true;
        }

        // Show tasks completed today
        if (isCompleted && completedDate && this._isSameDay(completedDate, new Date())) {
          return true;
        }

        // Show incomplete overdue tasks (use normalized dates)
        if (!isCompleted && hasDueDate && dueDateNorm < todayNorm) {
          return true;
        }

        return false;
      }

      // Viewing FUTURE dates
      if (isViewingFuture) {
        // Show dateless tasks (always relevant)
        if (!hasDueDate) {
          return true;
        }

        // Show tasks due on selected date
        if (hasDueDate && this._isSameDay(dueDate, this._selectedDate)) {
          return true;
        }

        // Show incomplete overdue tasks (carry forward - use normalized dates)
        if (!isCompleted && hasDueDate && dueDateNorm < selectedDateNorm) {
          return true;
        }

        return false;
      }

      return false;
    });
  }

  _calculateProgress(tasks) {
    // Simply count completed vs total of all visible tasks
    const completed = tasks.filter((t) => t.status === "completed").length;

    return {
      completed,
      total: tasks.length,
    };
  }

  async _toggleTask(task) {
    const newStatus = task.status === "completed" ? "needs_action" : "completed";

    await this.hass.callService("todo", "update_item", {
      entity_id: this._config.entity,
      item: task.uid,
      status: newStatus,
    });
  }

  _previousDay() {
    const newDate = new Date(this._selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    newDate.setHours(0, 0, 0, 0);
    this._selectedDate = newDate;
  }

  _nextDay() {
    const newDate = new Date(this._selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(0, 0, 0, 0);
    this._selectedDate = newDate;
  }

  _goToToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this._selectedDate = today;
  }

  _formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (this._isSameDay(date, today)) {
      return "Today";
    }
    if (this._isSameDay(date, yesterday)) {
      return "Yesterday";
    }
    if (this._isSameDay(date, tomorrow)) {
      return "Tomorrow";
    }

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  }

  _isSameDay(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  _normalizeToMidnight(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  static getConfigElement() {
    return document.createElement("chorebot-list-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      title: "Tasks",
      show_progress: true,
    };
  }
}

customElements.define("chorebot-list-card", ChoreBotListCard);

/**
 * Configuration Editor for ChoreBot List Card
 */
class ChoreBotListCardEditor extends LitElement {
  static properties = {
    hass: { type: Object },
    _config: { state: true },
  };

  static styles = css`
    .card-config {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .config-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .config-row label {
      font-weight: 500;
      font-size: 14px;
    }
    ha-entity-picker,
    ha-textfield,
    ha-switch {
      width: 100%;
    }
  `;

  setConfig(config) {
    this._config = config;
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="config-row">
          <label>Entity (required)</label>
          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._config.entity}
            .includeDomains=${["todo"]}
            @value-changed=${this._entityChanged}
            allow-custom-entity
          ></ha-entity-picker>
        </div>

        <div class="config-row">
          <label>Title</label>
          <ha-textfield
            .value=${this._config.title || ""}
            .configValue=${"title"}
            @input=${this._valueChanged}
            placeholder="Tasks"
          ></ha-textfield>
        </div>

        <div class="config-row">
          <ha-formfield label="Show progress bar">
            <ha-switch
              .checked=${this._config.show_progress !== false}
              @change=${this._progressChanged}
            ></ha-switch>
          </ha-formfield>
        </div>
      </div>
    `;
  }

  _entityChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const newConfig = { ...this._config, entity: ev.detail.value };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const configValue = target.configValue;
    const value = target.value;

    if (this._config[configValue] === value) {
      return;
    }

    const newConfig = { ...this._config, [configValue]: value };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _progressChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const newConfig = { ...this._config, show_progress: ev.target.checked };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _fireConfigChanged(config) {
    const event = new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define("chorebot-list-card-editor", ChoreBotListCardEditor);

// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: "chorebot-list-card",
  name: "ChoreBot List Card",
  description: "Display and manage ChoreBot tasks with date navigation",
  preview: true,
});
