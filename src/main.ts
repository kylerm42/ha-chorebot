import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface HomeAssistant {
  states: { [entity_id: string]: HassEntity };
  callService: (domain: string, service: string, data: any) => Promise<void>;
}

interface HassEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    chorebot_tasks?: Task[];
    chorebot_templates?: RecurringTemplate[];
    chorebot_sections?: Section[];
    [key: string]: any;
  };
}

interface Section {
  id: string;
  name: string;
  sort_order: number;
}

interface ChoreBotConfig {
  entity: string;
  title?: string;
  show_title?: boolean;
  show_progress?: boolean;
  hide_card_background?: boolean;
  show_dateless_tasks?: boolean;
  filter_section_id?: string;
  task_background_color?: string;
  task_text_color?: string;
}

interface Task {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
  due?: string;
  description?: string;
  last_completed?: string;
  parent_uid?: string;
  tags?: string[];
  is_all_day?: boolean;
  section_id?: string;
  custom_fields?: {
    tags?: string[];
    is_all_day?: boolean;
    parent_uid?: string;
    occurrence_index?: number;
    rrule?: string;
    section_id?: string;
  };
}

interface RecurringTemplate {
  uid: string;
  streak_current: number;
  streak_longest: number;
}

interface EditingTask extends Task {
  has_due_date?: boolean;
  due_date?: string | null;
  due_time?: string;
  has_recurrence?: boolean;
  recurrence_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurrence_interval?: number;
  recurrence_byweekday?: string[];
  recurrence_bymonthday?: number;
}

interface Progress {
  completed: number;
  total: number;
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
@customElement('chorebot-list-card')
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

  setConfig(config: ChoreBotConfig) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this._config = {
      entity: config.entity,
      title: config.title || 'Tasks',
      show_title: config.show_title !== false,
      show_progress: config.show_progress !== false,
      show_dateless_tasks: config.show_dateless_tasks !== false,
      hide_card_background: config.hide_card_background === true,
      task_background_color: config.task_background_color || '',
      task_text_color: config.task_text_color || '',
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
    const progress = this._calculateProgress(tasks);

    return html`
      <ha-card class="${this._config.hide_card_background ? 'no-background' : ''}">
        ${this._config.show_title ? html`<div class="card-header">${this._config.title}</div>` : ''}

        ${this._config.show_progress ? this._renderProgress(progress) : ''}

        <div class="todo-list">${this._renderTasks(tasks, entity)}</div>
      </ha-card>

      ${this._renderEditDialog()}
    `;
  }

  private _renderProgress(progress: Progress) {
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

  private _renderTasks(tasks: Task[], entity: HassEntity) {
    if (tasks.length === 0) {
      return html`<div class="empty-state">No tasks for today</div>`;
    }

    return tasks.map((task) => {
      const isCompleted = task.status === 'completed';
      const bgColor = this._config!.task_background_color || 'var(--primary-color)';
      const textColor = this._config!.task_text_color || 'white';

      return html`
        <div
          class="todo-item"
          style="background: ${bgColor}; color: ${textColor};"
          @click=${() => this._openEditDialog(task)}
        >
          <div class="todo-content">
            <div class="todo-summary">${task.summary}</div>
            ${task.due
              ? html`<div
                  class="todo-due-date"
                  style="color: ${this._isOverdue(task) ? 'var(--error-color)' : 'inherit'}"
                >
                  ${this._formatRelativeDate(new Date(task.due), task)}
                </div>`
              : ''}
          </div>
          <div
            class="completion-circle ${isCompleted ? 'completed' : ''}"
            style="${isCompleted ? `background: ${bgColor};` : ''}"
            @click=${(e: Event) => this._handleCompletionClick(e, task)}
          >
            <ha-icon icon="mdi:check"></ha-icon>
          </div>
        </div>
      `;
    });
  }

  // ============================================================================
  // Task Filtering (Simplified - Today-Only View)
  // ============================================================================

  private _getFilteredTasks(entity: HassEntity): Task[] {
    const tasks = entity.attributes.chorebot_tasks || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply date/status filtering
    let filteredTasks = tasks.filter((task) => {
      const hasDueDate = !!task.due;
      const isCompleted = task.status === 'completed';

      // Handle dateless tasks
      if (!hasDueDate) {
        return this._config!.show_dateless_tasks;
      }

      const dueDate = new Date(task.due!);
      dueDate.setHours(0, 0, 0, 0);
      const isToday = this._isSameDay(dueDate, today);
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
        if (this._isSameDay(completedDate, new Date())) {
          return true;
        }
      }

      return false;
    });

    // Apply section filtering if configured
    if (this._config?.filter_section_id) {
      // Resolve section name to section ID
      const sections: Section[] = entity.attributes.chorebot_sections || [];
      const filterValue = this._config.filter_section_id;

      // Try to find section by name first
      const sectionByName = sections.find(
        (section) => section.name === filterValue
      );

      // Use the section ID if found by name, otherwise use the filter value as-is (for backward compatibility)
      const sectionIdToMatch = sectionByName ? sectionByName.id : filterValue;

      filteredTasks = filteredTasks.filter(
        (task) => task.section_id === sectionIdToMatch
      );
    }

    return filteredTasks;
  }

  private _calculateProgress(tasks: Task[]): Progress {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return {
      completed,
      total: tasks.length,
    };
  }

  // ============================================================================
  // Task Completion
  // ============================================================================

  private async _toggleTask(task: Task) {
    const newStatus = task.status === 'completed' ? 'needs_action' : 'completed';

    await this.hass!.callService('todo', 'update_item', {
      entity_id: this._config!.entity,
      item: task.uid,
      status: newStatus,
    });
  }

  private _handleCompletionClick(e: Event, task: Task) {
    e.stopPropagation();
    this._toggleTask(task);
  }

  // ============================================================================
  // Edit Dialog
  // ============================================================================

  private _openEditDialog(task: Task) {
    const flatTask: EditingTask = {
      ...task,
      is_all_day: task.is_all_day || task.custom_fields?.is_all_day || false,
      tags: task.tags || task.custom_fields?.tags || [],
      section_id: task.section_id || task.custom_fields?.section_id,
    };

    // Extract due date/time if present
    if (task.due) {
      const parsed = this._parseUTCToLocal(task.due);
      flatTask.due_date = parsed.date ?? undefined;
      flatTask.due_time = parsed.time ?? undefined;
      flatTask.has_due_date = true;
    } else {
      flatTask.has_due_date = false;
    }

    // Parse existing rrule if present
    const rrule = task.custom_fields?.rrule;
    const parsedRrule = this._parseRrule(rrule);

    if (parsedRrule) {
      flatTask.has_recurrence = true;
      flatTask.recurrence_frequency = parsedRrule.frequency!;
      flatTask.recurrence_interval = parsedRrule.interval;
      flatTask.recurrence_byweekday = parsedRrule.byweekday;
      flatTask.recurrence_bymonthday = parsedRrule.bymonthday || 1;
    } else {
      flatTask.has_recurrence = false;
      flatTask.recurrence_frequency = 'DAILY';
      flatTask.recurrence_interval = 1;
      flatTask.recurrence_byweekday = [];
      flatTask.recurrence_bymonthday = 1;
    }

    this._editingTask = flatTask;
    this._editDialogOpen = true;
  }

  private _closeEditDialog() {
    this._editDialogOpen = false;
    this._editingTask = null;
  }

  private _renderEditDialog() {
    if (!this._editDialogOpen || !this._editingTask) {
      return html``;
    }

    const task = this._editingTask;
    const hasDueDate = task.has_due_date !== undefined ? task.has_due_date : !!task.due;
    const isAllDay = task.is_all_day !== undefined ? task.is_all_day : false;

    let dateValue = task.due_date || null;
    let timeValue = task.due_time || null;

    if (!dateValue && task.due) {
      const parsed = this._parseUTCToLocal(task.due);
      dateValue = parsed.date;
      timeValue = parsed.time;
    }

    // Get sections from entity attributes
    const entity = this.hass?.states[this._config!.entity];
    const sections = entity?.attributes.chorebot_sections || [];

    const schema: any[] = [
      {
        name: 'summary',
        required: true,
        selector: { text: {} },
      },
      {
        name: 'description',
        selector: { text: { multiline: true } },
      },
    ];

    // Add section dropdown if sections are available
    if (sections.length > 0) {
      schema.push({
        name: 'section_id',
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

    schema.push({
      name: 'has_due_date',
      selector: { boolean: {} },
    });

    if (hasDueDate) {
      schema.push({
        name: 'due_date',
        selector: { date: {} },
      });

      if (!isAllDay) {
        schema.push({
          name: 'due_time',
          selector: { time: {} },
        });
      }

      schema.push({
        name: 'is_all_day',
        selector: { boolean: {} },
      });
    }

    // Recurrence section - only show if task has a due date
    if (hasDueDate) {
      const hasRecurrence = task.has_recurrence !== undefined ? task.has_recurrence : false;
      const recurrenceFrequency = task.recurrence_frequency || 'DAILY';

      // Add recurrence toggle
      schema.push({
        name: 'has_recurrence',
        selector: { boolean: {} },
      });

      // If recurrence is enabled, add recurrence fields
      if (hasRecurrence) {
      schema.push({
        name: 'recurrence_frequency',
        selector: {
          select: {
            options: [
              { label: 'Daily', value: 'DAILY' },
              { label: 'Weekly', value: 'WEEKLY' },
              { label: 'Monthly', value: 'MONTHLY' },
            ],
          },
        },
      });

      schema.push({
        name: 'recurrence_interval',
        selector: {
          number: {
            min: 1,
            max: 999,
            mode: 'box',
          },
        },
      });

      // Frequency-specific fields
      if (recurrenceFrequency === 'WEEKLY') {
        schema.push({
          name: 'recurrence_byweekday',
          selector: {
            select: {
              multiple: true,
              options: [
                { label: 'Monday', value: 'MO' },
                { label: 'Tuesday', value: 'TU' },
                { label: 'Wednesday', value: 'WE' },
                { label: 'Thursday', value: 'TH' },
                { label: 'Friday', value: 'FR' },
                { label: 'Saturday', value: 'SA' },
                { label: 'Sunday', value: 'SU' },
              ],
            },
          },
        });
      } else if (recurrenceFrequency === 'MONTHLY') {
        schema.push({
          name: 'recurrence_bymonthday',
          selector: {
            number: {
              min: 1,
              max: 31,
              mode: 'box',
            },
          },
        });
      }
      }
    }

    const data = {
      summary: task.summary || '',
      has_due_date: hasDueDate,
      is_all_day: isAllDay,
      due_date: dateValue || null,
      due_time: timeValue || '00:00',
      description: task.description || '',
      section_id: task.section_id || (sections.length > 0 ? sections.sort((a: Section, b: Section) => b.sort_order - a.sort_order)[0].id : undefined),
      has_recurrence: hasDueDate ? (task.has_recurrence || false) : false,
      recurrence_frequency: task.recurrence_frequency || 'DAILY',
      recurrence_interval: task.recurrence_interval || 1,
      recurrence_byweekday: task.recurrence_byweekday || [],
      recurrence_bymonthday: task.recurrence_bymonthday || 1,
    };

    return html`
      <ha-dialog open @closed=${this._closeEditDialog} .heading=${'Edit Task'}>
        <ha-form
          .hass=${this.hass}
          .schema=${schema}
          .data=${data}
          .computeLabel=${(schema: any) => {
            const labels: { [key: string]: string } = {
              summary: 'Task Name',
              has_due_date: 'Has Due Date',
              is_all_day: 'All Day',
              due_date: 'Date',
              due_time: 'Time',
              description: 'Description',
              section_id: 'Section',
              has_recurrence: 'Recurring Task',
              recurrence_frequency: 'Frequency',
              recurrence_interval: 'Repeat Every',
              recurrence_byweekday: 'Days of Week',
              recurrence_bymonthday: 'Day of Month',
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

  private _parseUTCToLocal(utcString: string): { date: string | null; time: string | null } {
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
        time: `${hours}:${minutes}`,
      };
    } catch (e) {
      console.error('Date parsing error:', e, utcString);
      return { date: null, time: null };
    }
  }

  private _parseRrule(rrule: string | undefined): {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
    interval: number;
    byweekday: string[];
    bymonthday: number | null;
  } | null {
    if (!rrule) {
      return null;
    }

    try {
      const parts = rrule.split(';');
      let frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null = null;
      let interval = 1;
      const byweekday: string[] = [];
      let bymonthday: number | null = null;

      for (const part of parts) {
        const [key, value] = part.split('=');

        if (key === 'FREQ') {
          if (value === 'DAILY' || value === 'WEEKLY' || value === 'MONTHLY') {
            frequency = value;
          }
        } else if (key === 'INTERVAL') {
          const parsedInterval = parseInt(value, 10);
          if (!isNaN(parsedInterval) && parsedInterval > 0) {
            interval = parsedInterval;
          }
        } else if (key === 'BYDAY') {
          byweekday.push(...value.split(','));
        } else if (key === 'BYMONTHDAY') {
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
      console.error('rrule parsing error:', e, rrule);
      return null;
    }
  }

  private _buildRrule(): string | null {
    if (!this._editingTask || !this._editingTask.has_recurrence) {
      return null;
    }

    const { recurrence_frequency, recurrence_interval, recurrence_byweekday, recurrence_bymonthday } =
      this._editingTask;

    if (!recurrence_frequency) {
      return null;
    }

    const interval = recurrence_interval || 1;
    let rrule = `FREQ=${recurrence_frequency};INTERVAL=${interval}`;

    if (recurrence_frequency === 'WEEKLY' && recurrence_byweekday && recurrence_byweekday.length > 0) {
      rrule += `;BYDAY=${recurrence_byweekday.join(',').toUpperCase()}`;
    } else if (recurrence_frequency === 'MONTHLY' && recurrence_bymonthday) {
      const day = Math.max(1, Math.min(31, recurrence_bymonthday));
      rrule += `;BYMONTHDAY=${day}`;
    }

    return rrule;
  }

  private _formValueChanged(ev: CustomEvent) {
    const updatedValues = ev.detail.value;

    this._editingTask = {
      ...this._editingTask!,
      ...updatedValues,
    };

    if (
      'has_due_date' in updatedValues ||
      'is_all_day' in updatedValues ||
      'has_recurrence' in updatedValues ||
      'recurrence_frequency' in updatedValues
    ) {
      this.requestUpdate();
    }
  }

  private async _saveTask() {
    if (!this._editingTask || !this._editingTask.summary?.trim() || this._saving) {
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
          this._editingTask.due_time.split(':').length === 3
            ? this._editingTask.due_time
            : `${this._editingTask.due_time}:00`;
        dateTimeString = `${this._editingTask.due_date}T${timeStr}`;
      }

      const dateObj = new Date(dateTimeString);
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date/time combination:', dateTimeString);
        this._saving = false;
        return;
      }

      serviceData.due = dateObj.toISOString();
      serviceData.is_all_day = isAllDay;
    } else if (this._editingTask.has_due_date === false) {
      serviceData.due = '';
      serviceData.is_all_day = false;
    }

    if (this._editingTask.description) {
      serviceData.description = this._editingTask.description;
    }

    if (this._editingTask.section_id) {
      serviceData.section_id = this._editingTask.section_id;
    }

    // Handle recurrence
    const rrule = this._buildRrule();
    if (rrule !== null) {
      serviceData.rrule = rrule;
    } else if (this._editingTask.has_recurrence === false) {
      // User explicitly disabled recurrence, send empty string to clear it
      serviceData.rrule = '';
    }

    // For recurring task instances, always apply changes to future instances
    const isRecurringInstance = !!(
      this._editingTask.parent_uid || this._editingTask.custom_fields?.parent_uid
    );
    if (isRecurringInstance) {
      serviceData.include_future_occurrences = true;
    }

    try {
      await this.hass!.callService('chorebot', 'update_task', serviceData);
      this._closeEditDialog();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      this._saving = false;
    }
  }

  // ============================================================================
  // Date/Time Helper Methods
  // ============================================================================

  private _formatRelativeDate(date: Date, task: Task): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const isAllDay = task?.is_all_day || task?.custom_fields?.is_all_day || false;

      if (!isAllDay) {
        const originalDate = new Date(date);
        return originalDate.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        });
      }
      return 'Today';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < -1) {
      return `${Math.abs(diffDays)} days ago`;
    } else {
      return `In ${diffDays} days`;
    }
  }

  private _isOverdue(task: Task): boolean {
    if (!task.due || task.status === 'completed') {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  private _isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  static getStubConfig() {
    return {
      entity: '',
      title: 'Tasks',
      show_title: true,
      show_progress: true,
      show_dateless_tasks: true,
      filter_section_id: '',
      hide_card_background: false,
      task_background_color: '',
      task_text_color: '',
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: 'entity',
          required: true,
          selector: {
            entity: {
              filter: { domain: 'todo' },
            },
          },
        },
        {
          name: 'title',
          default: 'Tasks',
          selector: { text: {} },
        },
        {
          name: 'show_title',
          default: true,
          selector: { boolean: {} },
        },
        {
          name: 'show_progress',
          default: true,
          selector: { boolean: {} },
        },
        {
          name: 'show_dateless_tasks',
          default: true,
          selector: { boolean: {} },
        },
        {
          name: 'filter_section_id',
          selector: { text: {} },
        },
        {
          name: 'hide_card_background',
          default: false,
          selector: { boolean: {} },
        },
        {
          name: 'task_background_color',
          selector: { text: {} },
        },
        {
          name: 'task_text_color',
          selector: { text: {} },
        },
      ],
      computeLabel: (schema: any) => {
        const labels: { [key: string]: string } = {
          entity: 'Todo Entity',
          title: 'Card Title',
          show_title: 'Show Title',
          show_progress: 'Show Progress Bar',
          show_dateless_tasks: 'Show Tasks Without Due Date',
          filter_section_id: 'Filter by Section',
          hide_card_background: 'Hide Card Background',
          task_background_color: 'Task Background Color',
          task_text_color: 'Task Text Color',
        };
        return labels[schema.name] || undefined;
      },
      computeHelper: (schema: any) => {
        const helpers: { [key: string]: string } = {
          entity: 'Select the ChoreBot todo entity to display',
          title: 'Custom title for the card',
          show_title: 'Show the card title',
          show_progress: 'Show daily progress bar with completed/total tasks',
          show_dateless_tasks: 'Show tasks that do not have a due date',
          filter_section_id: 'Enter section name (e.g., "SECOND SECTION"). Leave empty to show all sections.',
          hide_card_background: 'Hide the card background and padding for a seamless look',
          task_background_color:
            'Background color for task items (hex code or CSS variable like var(--primary-color))',
          task_text_color: 'Text color for task items (hex code or CSS variable)',
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
  type: 'chorebot-list-card',
  name: 'ChoreBot List Card',
  description: 'Display and manage ChoreBot tasks with today-focused view',
  preview: true,
});
