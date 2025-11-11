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
    _editDialogOpen: { state: true },
    _editingTask: { state: true },
    _saving: { state: true },
  };

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
      transition: transform 0.2s ease, box-shadow 0.2s ease;
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

  constructor() {
    super();
    // Initialize to today at midnight for consistent date comparisons
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this._selectedDate = today;
    this._config = {};
    this._editDialogOpen = false;
    this._editingTask = null;
    this._saving = false;
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
      show_title: config.show_title !== false,
      show_progress: config.show_progress !== false,
      show_date_nav: config.show_date_nav !== false,
      hide_card_background: config.hide_card_background === true,
      task_background_color: config.task_background_color || "",
      task_text_color: config.task_text_color || "",
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
      <ha-card class="${this._config.hide_card_background ? 'no-background' : ''}">
        ${this._config.show_title ? html`<div class="card-header">${this._config.title}</div>` : ""}

        ${this._config.show_date_nav ? this._renderDateNavigation() : ""}

        ${this._config.show_progress ? this._renderProgress(progress) : ""}

        <div class="todo-list">${this._renderTasks(tasks, entity)}</div>
      </ha-card>

      ${this._renderEditDialog()}
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
      (task) => {
        const isCompleted = task.status === "completed";
        const bgColor = this._config.task_background_color || "var(--primary-color)";
        const textColor = this._config.task_text_color || "white";

        return html`
          <div
            class="todo-item"
            style="background: ${bgColor}; color: ${textColor};"
            @click=${() => this._openEditDialog(task)}
          >
            <div class="todo-content">
              <div class="todo-summary">${task.summary}</div>
              ${task.due ? html`<div class="todo-due-date" style="color: ${this._isOverdue(task) ? 'var(--error-color)' : 'inherit'}">${this._formatRelativeDate(new Date(task.due), task)}</div>` : ""}
            </div>
            <div
              class="completion-circle ${isCompleted ? "completed" : ""}"
              style="${isCompleted ? `background: ${bgColor};` : ""}"
              @click=${(e) => this._handleCompletionClick(e, task)}
            >
              <ha-icon icon="mdi:check"></ha-icon>
            </div>
          </div>
        `;
      }
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
        // Show tasks completed today (regardless of due date)
        if (isCompleted && completedDate && this._isSameDay(completedDate, new Date())) {
          return true;
        }

        // Show dateless tasks (always relevant)
        if (!hasDueDate) {
          return true;
        }

        // Show tasks due today
        if (hasDueDate && this._isSameDay(dueDate, this._selectedDate)) {
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

  _handleCompletionClick(e, task) {
    e.stopPropagation(); // Prevent opening edit dialog
    this._toggleTask(task);
  }

  _openEditDialog(task) {
    // Flatten custom_fields for easier access in the form
    const flatTask = {
      ...task,
      is_all_day: task.is_all_day || task.custom_fields?.is_all_day || false,
      tags: task.tags || task.custom_fields?.tags || [],
    };
    this._editingTask = flatTask;
    this._editDialogOpen = true;
  }

  _closeEditDialog() {
    this._editDialogOpen = false;
    this._editingTask = null;
  }

  _renderEditDialog() {
    if (!this._editDialogOpen || !this._editingTask) {
      return html``;
    }

    const task = this._editingTask;

    // Initialize flags if not present
    const hasDueDate = task.has_due_date !== undefined ? task.has_due_date : !!task.due;
    const isAllDay = task.is_all_day !== undefined ? task.is_all_day : false;

    // Date/time handling: Separate inputs avoid datetime-local component bugs
    // Storage is UTC (e.g., "2025-11-10T05:10:00Z"), display is local timezone
    // Use form state values if present, otherwise parse from task.due on initial load
    let dateValue = task.due_date || null;
    let timeValue = task.due_time || null;
    
    if (!dateValue && task.due) {
      const parsed = this._parseUTCToLocal(task.due);
      dateValue = parsed.date;
      timeValue = parsed.time;
    }

    // Build schema dynamically based on flags
    const schema = [
      {
        name: "summary",
        required: true,
        selector: { text: {} },
      },
      {
        name: "has_due_date",
        selector: { boolean: {} },
      },
    ];

    // Add due date fields if enabled
    if (hasDueDate) {
      schema.push({
        name: "is_all_day",
        selector: { boolean: {} },
      });

      // Always show date selector
      schema.push({
        name: "due_date",
        selector: { date: {} },
      });

      // Show time selector only if not all-day
      if (!isAllDay) {
        schema.push({
          name: "due_time",
          selector: { time: {} },
        });
      }
    }

    schema.push({
      name: "description",
      selector: { text: { multiline: true } },
    });

    const data = {
      summary: task.summary || "",
      has_due_date: hasDueDate,
      is_all_day: isAllDay,
      due_date: dateValue || null,
      due_time: timeValue || "00:00",
      description: task.description || "",
    };

    return html`
      <ha-dialog
        open
        @closed=${this._closeEditDialog}
        .heading=${"Edit Task"}
      >
        <ha-form
          .hass=${this.hass}
          .schema=${schema}
          .data=${data}
          .computeLabel=${(schema) => {
            const labels = {
              summary: "Task Name",
              has_due_date: "Has Due Date",
              is_all_day: "All Day",
              due_date: "Date",
              due_time: "Time",
              description: "Description",
            };
            return labels[schema.name] || schema.name;
          }}
          @value-changed=${this._formValueChanged}
        ></ha-form>
        <ha-button
          slot="primaryAction"
          @click=${this._saveTask}
          .disabled=${this._saving}
        >
          ${this._saving ? 'Saving...' : 'Save'}
        </ha-button>
        <ha-button
          slot="secondaryAction"
          @click=${this._closeEditDialog}
          .disabled=${this._saving}
        >
          Cancel
        </ha-button>
      </ha-dialog>
    `;
  }

  _parseUTCToLocal(utcString) {
    // Convert UTC timestamp to local date and time components
    try {
      const date = new Date(utcString);
      if (isNaN(date.getTime())) return { date: null, time: null };

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
      };
    } catch (e) {
      console.error("Date parsing error:", e, utcString);
      return { date: null, time: null };
    }
  }

  _formValueChanged(ev) {
    const updatedValues = ev.detail.value;

    this._editingTask = {
      ...this._editingTask,
      ...updatedValues,
    };

    // Force re-render if has_due_date or is_all_day changed (schema changes)
    if ('has_due_date' in updatedValues || 'is_all_day' in updatedValues) {
      this.requestUpdate();
    }
  }

  async _saveTask() {
    if (!this._editingTask || !this._editingTask.summary?.trim() || this._saving) {
      return;
    }

    this._saving = true;

    // Build service data with only defined fields
    const serviceData = {
      list_id: this._config.entity,
      uid: this._editingTask.uid,
      summary: this._editingTask.summary.trim(),
    };

    // Handle due date based on has_due_date flag
    if (this._editingTask.has_due_date && this._editingTask.due_date) {
      const isAllDay = !!this._editingTask.is_all_day;

      // Combine date and time into a single datetime
      let dateTimeString;
      if (isAllDay || !this._editingTask.due_time) {
        // All-day: use date at midnight
        dateTimeString = `${this._editingTask.due_date}T00:00:00`;
      } else {
        // Combine date and time (add seconds if not present)
        const timeStr = this._editingTask.due_time.split(':').length === 3
          ? this._editingTask.due_time 
          : `${this._editingTask.due_time}:00`;
        dateTimeString = `${this._editingTask.due_date}T${timeStr}`;
      }

      // Convert local datetime string to UTC ISO format for storage
      const dateObj = new Date(dateTimeString);
      if (isNaN(dateObj.getTime())) {
        console.error("Invalid date/time combination:", dateTimeString);
        return;
      }

      serviceData.due = dateObj.toISOString();
      serviceData.is_all_day = isAllDay;
    } else if (this._editingTask.has_due_date === false) {
      // Explicitly clear the due date
      serviceData.due = "";
      serviceData.is_all_day = false;
    }

    // Only include description if it has a value
    if (this._editingTask.description) {
      serviceData.description = this._editingTask.description;
    }

    try {
      await this.hass.callService("chorebot", "update_task", serviceData);
      this._closeEditDialog();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
    } finally {
      this._saving = false;
    }
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

  _formatRelativeDate(date, task) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Check if task is all-day
      const isAllDay = task?.is_all_day || task?.custom_fields?.is_all_day || false;
      
      if (!isAllDay) {
        const originalDate = new Date(date);
        return originalDate.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
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

  _isOverdue(task) {
    if (!task.due || task.status === "completed") {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
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

  static getStubConfig() {
    return {
      entity: "",
      title: "Tasks",
      show_title: true,
      show_progress: true,
      show_date_nav: true,
      hide_card_background: false,
      task_background_color: "",
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
          name: "show_date_nav",
          default: true,
          selector: { boolean: {} },
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
      ],
      computeLabel: (schema) => {
        switch (schema.name) {
          case "entity":
            return "Todo Entity";
          case "title":
            return "Card Title";
          case "show_title":
            return "Show Title";
          case "show_progress":
            return "Show Progress Bar";
          case "show_date_nav":
            return "Show Date Navigation";
          case "hide_card_background":
            return "Hide Card Background";
          case "task_background_color":
            return "Task Background Color";
          case "task_text_color":
            return "Task Text Color";
          default:
            return undefined;
        }
      },
      computeHelper: (schema) => {
        switch (schema.name) {
          case "entity":
            return "Select the ChoreBot todo entity to display";
          case "title":
            return "Custom title for the card";
          case "show_title":
            return "Show the card title";
          case "show_progress":
            return "Show daily progress bar with completed/total tasks";
          case "show_date_nav":
            return "Show date navigation controls (hides to always show today)";
          case "hide_card_background":
            return "Hide the card background and padding for a seamless look";
          case "task_background_color":
            return "Background color for task items (hex code or CSS variable like var(--primary-color))";
          case "task_text_color":
            return "Text color for task items (hex code or CSS variable)";
          default:
            return undefined;
        }
      },
    };
  }
}

customElements.define("chorebot-list-card", ChoreBotListCard);

// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: "chorebot-list-card",
  name: "ChoreBot List Card",
  description: "Display and manage ChoreBot tasks with date navigation",
  preview: true,
});
