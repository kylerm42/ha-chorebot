import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// Import shared utilities
import {
  HomeAssistant,
  ChoreBotPersonPointsConfig,
  PersonPoints,
  Progress,
  HassEntity,
} from "./utils/types.js";
import {
  filterTasksByPerson,
  calculateDatedTasksProgress,
} from "./utils/task-utils.js";
import { calculateColorShades, ColorShades } from "./utils/color-utils.js";

// ============================================================================
// ChoreBot Person Points Card (TypeScript)
// ============================================================================

/**
 * ChoreBot Person Points Card
 *
 * Displays a single person's avatar and current points balance in a compact
 * horizontal layout. Designed to be placed above a person's task list card
 * for quick visual feedback.
 */
@customElement("chorebot-person-points-card")
export class ChoreBotPersonPointsCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: ChoreBotPersonPointsConfig;
  @state() private _progress?: Progress;
  private shades: ColorShades = {
    lighter: "",
    light: "",
    base: "",
    dark: "",
    darker: "",
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

    .person-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .person-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0; /* Allow text truncation */
    }

    .person-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .person-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .person-avatar.initials {
      background: linear-gradient(
        135deg,
        var(--primary-color),
        var(--accent-color)
      );
      color: white;
      font-size: 24px;
      font-weight: bold;
    }

    .person-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0; /* Allow truncation */
      flex: 1;
    }

    .person-name {
      font-size: 20px;
      font-weight: 500;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .progress-bar {
      position: relative;
      border-radius: 12px;
      height: 24px;
      overflow: hidden;
      margin-top: 4px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .progress-bar-fill {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      transition: width 0.3s ease;
      border-radius: 12px;
    }

    .progress-text {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      z-index: 1;
    }

    .person-points {
      font-size: 28px;
      font-weight: bold;
      color: var(--primary-color);
      white-space: nowrap;
    }

    .error-message {
      text-align: center;
      padding: 32px;
      color: var(--error-color);
      font-size: 16px;
    }

    /* Responsive: smaller avatar on mobile */
    @media (max-width: 600px) {
      .person-avatar {
        width: 48px;
        height: 48px;
      }

      .person-avatar.initials {
        font-size: 18px;
      }

      .person-name {
        font-size: 18px;
      }

      .person-points {
        font-size: 24px;
      }
    }
  `;

  setConfig(config: ChoreBotPersonPointsConfig) {
    if (!config.person_entity) {
      throw new Error("person_entity is required");
    }

    this._config = {
      type: "custom:chorebot-person-points-card",
      person_entity: config.person_entity,
      title: config.title || "Points",
      show_title: config.show_title !== false,
      hide_card_background: config.hide_card_background === true,
      show_progress: config.show_progress !== false, // Default: true
      accent_color: config.accent_color || "",
      progress_text_color: config.progress_text_color || "",
    };
  }

  willUpdate(changedProperties: Map<string, any>) {
    super.willUpdate(changedProperties);

    // Recalculate color shades when config changes
    if (changedProperties.has("_config") && this._config) {
      const baseColor = this._config.accent_color || "var(--primary-color)";
      this.shades = calculateColorShades(baseColor);
    }

    // Recalculate progress when hass or config changes
    if (
      (changedProperties.has("hass") || changedProperties.has("_config")) &&
      this.hass &&
      this._config
    ) {
      this._progress = this._calculatePersonProgress();
    }
  }

  private _calculatePersonProgress(): Progress {
    if (!this.hass || !this._config) {
      return { completed: 0, total: 0 };
    }

    // Get all ChoreBot todo entities
    const allStates = Object.values(this.hass.states);
    const todoEntities = allStates.filter((e) =>
      e.entity_id.startsWith("todo."),
    );

    const entities = todoEntities.filter((e) =>
      e.entity_id.startsWith("todo.chorebot_"),
    ) as HassEntity[];

    // Filter tasks assigned to this person (excludes dateless by default)
    const personTasks = filterTasksByPerson(
      entities,
      this._config.person_entity,
      false, // Don't include dateless
    );

    // Calculate progress for dated tasks only
    return calculateDatedTasksProgress(personTasks);
  }

  static getStubConfig() {
    return {
      type: "custom:chorebot-person-points-card",
      person_entity: "",
      title: "Points",
      show_title: true,
      hide_card_background: false,
      show_progress: true,
      accent_color: "",
      progress_text_color: "",
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "person_entity",
          required: true,
          selector: {
            entity: {
              filter: { domain: "person" },
            },
          },
        },
        {
          name: "title",
          default: "Points",
          selector: { text: {} },
        },
        {
          name: "show_title",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "hide_card_background",
          default: false,
          selector: { boolean: {} },
        },
        {
          name: "show_progress",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "accent_color",
          selector: { text: {} },
        },
        {
          name: "progress_text_color",
          selector: { text: {} },
        },
      ],
      computeLabel: (schema: any) => {
        const labels: { [key: string]: string } = {
          person_entity: "Person Entity",
          title: "Card Title",
          show_title: "Show Title",
          hide_card_background: "Hide Card Background",
          show_progress: "Show Progress Bar",
          accent_color: "Accent Color",
          progress_text_color: "Progress Text Color",
        };
        return labels[schema.name] || undefined;
      },
      computeHelper: (schema: any) => {
        const helpers: { [key: string]: string } = {
          person_entity: "Select the person entity to display points for",
          title: "Custom title for the card",
          show_title: "Show the card title",
          hide_card_background:
            "Hide the card background and padding for a seamless look",
          show_progress:
            "Display task completion progress below the person's name",
          accent_color:
            "Accent color for progress bar and points text (hex code or CSS variable like var(--primary-color))",
          progress_text_color:
            "Text color for progress label (hex code or CSS variable)",
        };
        return helpers[schema.name] || undefined;
      },
    };
  }

  getCardSize() {
    return 1;
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    // Check if ChoreBot sensor exists
    const sensor = this.hass.states["sensor.chorebot_points"];
    if (!sensor) {
      return html`<ha-card>
        <div class="error-message">
          ChoreBot Points sensor not found. Make sure the integration is set up.
        </div>
      </ha-card>`;
    }

    // Check if person entity exists
    const personEntity = this.hass.states[this._config.person_entity];
    if (!personEntity) {
      return html`<ha-card>
        <div class="error-message">
          Person entity not found. Please check your configuration.
        </div>
      </ha-card>`;
    }

    // Get person data from sensor
    const people = sensor.attributes.people || {};
    const personData = people[this._config.person_entity] as
      | PersonPoints
      | undefined;

    if (!personData) {
      return html`<ha-card>
        <div class="error-message">
          Person not found in points system. Complete tasks to earn points.
        </div>
      </ha-card>`;
    }

    return html`
      <ha-card
        class="${this._config.hide_card_background ? "no-background" : ""}"
      >
        ${this._config.show_title
          ? html`<div class="card-header">${this._config.title}</div>`
          : ""}
        ${this._renderPersonDisplay(personEntity, personData)}
      </ha-card>
    `;
  }

  private _renderPersonDisplay(personEntity: any, personData: PersonPoints) {
    const pictureUrl = personEntity.attributes.entity_picture;
    const name = this._getPersonName(this._config!.person_entity);

    return html`
      <div class="person-container">
        <div class="person-left">
          ${pictureUrl
            ? html`<div class="person-avatar">
                <img src="${pictureUrl}" alt="${name}" />
              </div>`
            : html`<div class="person-avatar initials">
                ${this._getPersonInitials(this._config!.person_entity)}
              </div>`}
          <div class="person-info">
            <div class="person-name">${name}</div>
            ${this._config!.show_progress && this._progress
              ? this._renderProgressBar(this._progress)
              : ""}
          </div>
        </div>
        <div
          class="person-points"
          style="color: ${this._config!.accent_color || "var(--primary-color)"}"
        >
          ${personData.points_balance} pts
        </div>
      </div>
    `;
  }

  private _renderProgressBar(progress: Progress) {
    // Calculate percentage (handle divide by zero)
    const percentage =
      progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

    // Get text color from config or use default
    const textColor =
      this._config!.progress_text_color || "var(--text-primary-color)";

    return html`
      <div
        class="progress-bar"
        style="background: #${this.shades.lighter}"
        aria-label="${progress.completed} of ${progress.total} tasks completed"
      >
        <div
          class="progress-bar-fill"
          style="width: ${percentage}%; background: #${this.shades.darker}"
        ></div>
        <div class="progress-text" style="color: ${textColor}">
          ${progress.completed}/${progress.total}
        </div>
      </div>
    `;
  }

  private _getPersonName(entityId: string): string {
    const entity = this.hass?.states[entityId];
    return entity?.attributes.friendly_name || entityId.replace("person.", "");
  }

  private _getPersonInitials(entityId: string): string {
    const name = this._getPersonName(entityId);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
}

// Register card with Home Assistant
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
  type: "chorebot-person-points-card",
  name: "ChoreBot Person Points Card",
  description: "Display a person's avatar and points balance",
  preview: true,
});
