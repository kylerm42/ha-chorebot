/**
 * ChoreBot List Card
 *
 * Displays todo items from a ChoreBot todo entity with enhanced features:
 * - Tag filtering
 * - Date filtering
 * - Completion status filtering
 * - Special effects on completion (confetti)
 */

class ChoreBotListCard extends HTMLElement {
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
    } else {
      this.update();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 16px;
        }
        .card-header {
          font-size: 24px;
          font-weight: 500;
          margin-bottom: 16px;
        }
        .todo-item {
          display: flex;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--divider-color);
        }
        .todo-checkbox {
          margin-right: 12px;
        }
        .todo-content {
          flex: 1;
        }
        .todo-summary {
          font-size: 16px;
        }
        .todo-tags {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
        .tag {
          display: inline-block;
          padding: 2px 8px;
          margin-right: 4px;
          background: var(--primary-color);
          color: var(--text-primary-color);
          border-radius: 12px;
        }
        .filter-bar {
          margin-bottom: 16px;
        }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="card-header">${this.config.title || 'ChoreBot Tasks'}</div>
          <div class="filter-bar">
            <!-- TODO: Add filter controls -->
          </div>
          <div class="todo-list">
            <!-- Todo items will be rendered here -->
          </div>
        </div>
      </ha-card>
    `;
  }

  update() {
    // TODO: Implement update logic to fetch and display todo items
    // TODO: Implement filtering logic
    // TODO: Implement confetti effect on completion
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('chorebot-list-card', ChoreBotListCard);

// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'chorebot-list-card',
  name: 'ChoreBot List Card',
  description: 'Display and manage ChoreBot tasks with filtering and special effects',
});
