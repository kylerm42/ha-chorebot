import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// Import shared utilities
import { HomeAssistant, EditingTask, Section } from "./utils/types.js";
import { buildRrule } from "./utils/rrule-utils.js";
import { renderTaskDialog } from "./utils/dialog-utils.js";

// Card-specific config interface
interface AddTaskConfig {
  entity: string;
  button_text?: string;
  button_icon?: string;
  button_color?: string;
  button_text_color?: string;
  button_size?: "small" | "medium" | "large";
  hide_card_background?: boolean;
  default_section_id?: string;
  default_tags?: string[];
}

// ============================================================================
// ChoreBot Add Task Card (TypeScript)
// ============================================================================

/**
 * ChoreBot Add Task Card
 *
 * A simple button card that opens a dialog to create new tasks.
 * Reuses the shared task dialog for consistency with edit operations.
 */
@customElement("chorebot-add-task-card")
export class ChoreBotAddTaskCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: AddTaskConfig;
  @state() private _dialogOpen = false;
  @state() private _newTask: EditingTask | null = null;
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
    .button-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .add-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      border-radius: var(--ha-card-border-radius, 12px);
      cursor: pointer;
      font-weight: 500;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        filter 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .add-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .add-button:active {
      transform: translateY(0);
      filter: brightness(0.95);
    }
    .add-button.small {
      padding: 8px 16px;
      font-size: 14px;
    }
    .add-button.medium {
      padding: 12px 24px;
      font-size: 16px;
    }
    .add-button.large {
      padding: 16px 32px;
      font-size: 18px;
    }
    /* Icon-only button styles (when no text) */
    .add-button.icon-only.small {
      padding: 8px;
    }
    .add-button.icon-only.medium {
      padding: 12px;
    }
    .add-button.icon-only.large {
      padding: 16px;
    }
    .add-button ha-icon {
      --mdc-icon-size: 20px;
    }
    .add-button.large ha-icon {
      --mdc-icon-size: 24px;
    }
    ha-dialog {
      --mdc-dialog-min-width: 500px;
    }
  `;

  setConfig(config: AddTaskConfig) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this._config = {
      entity: config.entity,
      button_text: config.button_text || "Add Task",
      button_icon: config.button_icon || "mdi:plus",
      button_color: config.button_color || "var(--primary-color)",
      button_text_color: config.button_text_color || "white",
      button_size: config.button_size || "medium",
      hide_card_background: config.hide_card_background === true,
      default_section_id: config.default_section_id,
      default_tags: config.default_tags || [],
    };
  }

  getCardSize() {
    return 1;
  }

  render() {
    if (!this.hass || !this._config) {
      return html`<ha-card>Loading...</ha-card>`;
    }

    const entity = this.hass.states[this._config.entity];
    if (!entity) {
      return html`<ha-card>
        <div
          style="text-align: center; padding: 16px; color: var(--error-color);"
        >
          Entity not found: ${this._config.entity}
        </div>
      </ha-card>`;
    }

    return html`
      <ha-card
        class="${this._config.hide_card_background ? "no-background" : ""}"
      >
        <div class="button-container">
          <button
            class="add-button ${this._config.button_size} ${this._config
              .button_text
              ? ""
              : "icon-only"}"
            style="background: ${this._config.button_color}; color: ${this
              ._config.button_text_color};"
            @click=${this._openDialog}
          >
            <ha-icon icon="${this._config.button_icon}"></ha-icon>
            ${this._config.button_text
              ? html`<span>${this._config.button_text}</span>`
              : ""}
          </button>
        </div>
      </ha-card>

      ${this._renderDialog()}
    `;
  }

  // ============================================================================
  // Dialog Management
  // ============================================================================

  private _openDialog() {
    const entity = this.hass?.states[this._config!.entity];
    const sections = entity?.attributes.chorebot_sections || [];

    // Create a blank task with defaults from config
    this._newTask = this._createBlankTask(sections);
    this._dialogOpen = true;
  }

  private _closeDialog() {
    this._dialogOpen = false;
    this._newTask = null;
  }

  private _createBlankTask(sections: Section[]): EditingTask {
    // Determine default section
    let defaultSectionId: string | undefined;
    if (this._config!.default_section_id) {
      // Config can specify either the section ID or the section name
      // First try to find a section with matching ID
      const byId = sections.find(
        (s) => s.id === this._config!.default_section_id,
      );
      if (byId) {
        defaultSectionId = byId.id;
      } else {
        // Try to find a section with matching name (case-insensitive)
        const byName = sections.find(
          (s) =>
            s.name.toLowerCase() ===
            this._config!.default_section_id!.toLowerCase(),
        );
        if (byName) {
          defaultSectionId = byName.id;
        }
      }
    } else if (sections.length > 0) {
      // Use the first section (highest sort_order)
      defaultSectionId = sections.sort(
        (a: Section, b: Section) => b.sort_order - a.sort_order,
      )[0].id;
    }

    return {
      uid: "", // Will be generated by backend
      summary: "",
      status: "needs_action",
      has_due_date: false,
      is_all_day: false,
      due_date: undefined,
      due_time: undefined,
      description: "",
      section_id: defaultSectionId,
      tags: this._config!.default_tags || [],
      has_recurrence: false,
      recurrence_frequency: "DAILY",
      recurrence_interval: 1,
      recurrence_byweekday: [],
      recurrence_bymonthday: 1,
    };
  }

  private _renderDialog() {
    const entity = this.hass?.states[this._config!.entity];
    const sections = entity?.attributes.chorebot_sections || [];
    const availableTags = entity?.attributes.chorebot_tags || [];

    return renderTaskDialog(
      this._dialogOpen,
      this._newTask,
      this.hass!,
      sections,
      availableTags,
      this._saving,
      () => this._closeDialog(),
      (ev: CustomEvent) => this._formValueChanged(ev),
      () => this._saveTask(),
      undefined, // onDelete - not applicable for new tasks
      "Add Task", // Custom dialog title
      false, // showDelete - hide delete button for new tasks
    );
  }

  // ============================================================================
  // Form Handling
  // ============================================================================

  private _formValueChanged(ev: CustomEvent) {
    const updatedValues = ev.detail.value;

    this._newTask = {
      ...this._newTask!,
      ...updatedValues,
    };

    // Trigger re-render for conditional fields
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
    if (!this._newTask || !this._newTask.summary?.trim() || this._saving) {
      return;
    }

    this._saving = true;

    const serviceData: any = {
      list_id: this._config!.entity,
      summary: this._newTask.summary.trim(),
    };

    // Handle due date
    if (this._newTask.has_due_date && this._newTask.due_date) {
      const isAllDay = !!this._newTask.is_all_day;

      let dateTimeString: string;
      if (isAllDay || !this._newTask.due_time) {
        dateTimeString = `${this._newTask.due_date}T00:00:00`;
      } else {
        const timeStr =
          this._newTask.due_time.split(":").length === 3
            ? this._newTask.due_time
            : `${this._newTask.due_time}:00`;
        dateTimeString = `${this._newTask.due_date}T${timeStr}`;
      }

      const dateObj = new Date(dateTimeString);
      if (isNaN(dateObj.getTime())) {
        console.error("Invalid date/time combination:", dateTimeString);
        this._saving = false;
        return;
      }

      serviceData.due = dateObj.toISOString();
      serviceData.is_all_day = isAllDay;
    }

    // Handle description
    if (this._newTask.description) {
      serviceData.description = this._newTask.description;
    }

    // Handle section
    if (this._newTask.section_id) {
      serviceData.section_id = this._newTask.section_id;
    }

    // Handle tags
    if (this._newTask.tags !== undefined && this._newTask.tags.length > 0) {
      serviceData.tags = this._newTask.tags;
    }

    // Handle recurrence
    const rrule = buildRrule(this._newTask);
    if (rrule !== null) {
      serviceData.rrule = rrule;
    }

    // Handle points
    if (
      this._newTask.points_value !== undefined &&
      this._newTask.points_value > 0
    ) {
      serviceData.points_value = this._newTask.points_value;
    }

    // Handle streak bonus (only for recurring tasks)
    if (rrule !== null) {
      if (
        this._newTask.streak_bonus_points !== undefined &&
        this._newTask.streak_bonus_points > 0
      ) {
        serviceData.streak_bonus_points = this._newTask.streak_bonus_points;
      }
      if (
        this._newTask.streak_bonus_interval !== undefined &&
        this._newTask.streak_bonus_interval > 0
      ) {
        serviceData.streak_bonus_interval = this._newTask.streak_bonus_interval;
      }
    }

    try {
      await this.hass!.callService("chorebot", "add_task", serviceData);
      this._closeDialog();
      // Reset task for next use
      const entity = this.hass?.states[this._config!.entity];
      const sections = entity?.attributes.chorebot_sections || [];
      this._newTask = this._createBlankTask(sections);
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to add task. Please try again.");
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
      button_text: "Add Task",
      button_icon: "mdi:plus",
      button_color: "var(--primary-color)",
      button_text_color: "white",
      button_size: "medium",
      hide_card_background: false,
      default_section_id: "",
      default_tags: [],
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
          name: "button_text",
          default: "Add Task",
          selector: { text: {} },
        },
        {
          name: "button_icon",
          default: "mdi:plus",
          selector: { icon: {} },
        },
        {
          name: "button_color",
          default: "var(--primary-color)",
          selector: { text: {} },
        },
        {
          name: "button_text_color",
          default: "white",
          selector: { text: {} },
        },
        {
          name: "button_size",
          default: "medium",
          selector: {
            select: {
              options: [
                { label: "Small", value: "small" },
                { label: "Medium", value: "medium" },
                { label: "Large", value: "large" },
              ],
            },
          },
        },
        {
          name: "hide_card_background",
          default: false,
          selector: { boolean: {} },
        },
        {
          name: "default_section_id",
          selector: { text: {} },
        },
        {
          name: "default_tags",
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
          button_text: "Button Text",
          button_icon: "Button Icon",
          button_color: "Button Color",
          button_text_color: "Button Text Color",
          button_size: "Button Size",
          hide_card_background: "Hide Card Background",
          default_section_id: "Default Section",
          default_tags: "Default Tags",
        };
        return labels[schema.name] || undefined;
      },
      computeHelper: (schema: any) => {
        const helpers: { [key: string]: string } = {
          entity: "Select the ChoreBot todo entity for new tasks",
          button_text: "Text displayed on the button",
          button_icon: "Icon displayed on the button",
          button_color:
            "Button background color (hex code or CSS variable like var(--primary-color))",
          button_text_color: "Button text color (hex code or CSS variable)",
          button_size: "Size of the button",
          hide_card_background:
            "Hide the card background and padding for a seamless look",
          default_section_id:
            'Default section for new tasks (enter section name like "Kyle" or leave empty for automatic)',
          default_tags: "Tags to pre-fill when creating new tasks",
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
  type: "chorebot-add-task-card",
  name: "ChoreBot Add Task Card",
  description: "A button card for quickly adding new ChoreBot tasks",
  preview: true,
});

console.info(
  "%c CHOREBOT-ADD-TASK-CARD %c v0.1.0 ",
  "color: white; background: #4CAF50; font-weight: bold;",
  "color: #4CAF50; background: white; font-weight: bold;",
);
