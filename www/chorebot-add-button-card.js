/**
 * ChoreBot Add Button Card
 *
 * A custom card that opens a dialog for adding new tasks with full custom fields:
 * - Summary and description
 * - Tags
 * - Recurrence rules (rrule)
 * - Due dates
 */

class ChoreBotAddButtonCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.shadowRoot.lastChild) {
      this.render();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .add-button {
          width: 100%;
          padding: 16px;
          background: var(--primary-color);
          color: var(--text-primary-color);
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .add-button:hover {
          opacity: 0.9;
        }
        .add-button ha-icon {
          --mdc-icon-size: 24px;
        }
      </style>
      <ha-card>
        <div class="card-content">
          <button class="add-button" @click="${this._handleClick}">
            <ha-icon icon="mdi:plus"></ha-icon>
            ${this.config.button_text || 'Add Task'}
          </button>
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelector('.add-button').addEventListener('click', () => this._handleClick());
  }

  _handleClick() {
    // TODO: Open dialog/modal for adding task
    // TODO: Call chorebot.add_task service with full custom fields
    console.log('Add task button clicked');
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('chorebot-add-button-card', ChoreBotAddButtonCard);

// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'chorebot-add-button-card',
  name: 'ChoreBot Add Button Card',
  description: 'Add new ChoreBot tasks with custom fields',
});
