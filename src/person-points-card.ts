import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// Import shared utilities
import {
  HomeAssistant,
  ChoreBotPersonPointsConfig,
  PersonPoints,
} from "./utils/types.js";

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

    .person-name {
      font-size: 20px;
      font-weight: 500;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
    };
  }

  static getStubConfig() {
    return {
      type: "custom:chorebot-person-points-card",
      person_entity: "",
      title: "Points",
      show_title: true,
      hide_card_background: false,
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
      ],
      computeLabel: (schema: any) => {
        const labels: { [key: string]: string } = {
          person_entity: "Person Entity",
          title: "Card Title",
          show_title: "Show Title",
          hide_card_background: "Hide Card Background",
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
          <div class="person-name">${name}</div>
        </div>
        <div class="person-points">${personData.points_balance} pts</div>
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
