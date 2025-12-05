import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// Import shared utilities
import {
  HomeAssistant,
  ChoreBotPersonRewardsConfig,
  PersonPoints,
  Reward,
} from "./utils/types.js";
import {
  extractColorVariants,
  playStarShower,
} from "./utils/confetti-utils.js";
import {
  getPointsDisplayParts,
  getPointsTermLowercase,
} from "./utils/points-display-utils.js";

// ============================================================================
// ChoreBot Person Rewards Card (TypeScript)
// ============================================================================

/**
 * ChoreBot Person Rewards Card
 *
 * Displays rewards for a single person with:
 * - Filtered rewards grid (only rewards for configured person)
 * - Click reward card to open confirmation modal (no separate redeem button)
 * - "Add Reward" placeholder card at end of grid
 * - Create reward modal with form fields
 * - Confetti animation on successful redemption
 */
@customElement("chorebot-person-rewards-card")
export class ChoreBotPersonRewardsCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: ChoreBotPersonRewardsConfig;
  @state() private _redeeming: string | null = null; // reward_id being redeemed
  @state() private _showConfirmModal: boolean = false; // Show redemption confirmation
  @state() private _showAddRewardModal: boolean = false; // Show add reward modal
  @state() private _pendingRedemption: {
    personId: string;
    rewardId: string;
  } | null = null; // Pending redemption details
  @state() private _newReward: {
    name: string;
    cost: number;
    icon: string;
    description: string;
  } = {
    name: "",
    cost: 50,
    icon: "mdi:gift",
    description: "",
  }; // New reward form data

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

    /* Rewards Grid */
    .rewards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }

    .reward-card {
      border-radius: 12px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      display: flex;
      flex-direction: row;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 100px;
      height: 100px;
    }

    .reward-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .reward-card.disabled {
      opacity: 0.6;
    }

    .reward-icon-section {
      flex-shrink: 0;
      width: 100px;
      background: var(--accent-color, var(--primary-color));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reward-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .reward-icon ha-icon {
      --mdc-icon-size: 48px;
    }

    .reward-info {
      flex: 1;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      min-width: 0;
    }

    .reward-name {
      font-size: 18px;
      font-weight: 500;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .reward-cost {
      font-size: 20px;
      font-weight: bold;
      color: var(--accent-color, var(--primary-color));
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .reward-cost ha-icon {
      --mdc-icon-size: 16px;
      vertical-align: middle;
    }

    .reward-description {
      font-size: 13px;
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      line-height: 1.3;
    }

    /* Add Reward Card */
    .add-reward-card {
      border-radius: 12px;
      background: var(--card-background-color);
      border: 2px dashed var(--divider-color);
      display: flex;
      flex-direction: row;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 100px;
      height: 100px;
    }

    .add-reward-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .add-reward-icon-section {
      flex-shrink: 0;
      width: 100px;
      background: color-mix(in srgb, var(--divider-color) 50%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .add-reward-card:hover .add-reward-icon-section {
      background: color-mix(
        in srgb,
        var(--primary-color) 20%,
        var(--card-background-color)
      );
    }

    .add-reward-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
      transition: all 0.2s ease;
    }

    .add-reward-card:hover .add-reward-icon {
      color: var(--primary-color);
    }

    .add-reward-icon ha-icon {
      --mdi-icon-size: 48px;
    }

    .add-reward-info {
      flex: 1;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .add-reward-text {
      font-size: 18px;
      font-weight: 500;
      color: var(--secondary-text-color);
      transition: all 0.2s ease;
    }

    .add-reward-card:hover .add-reward-text {
      color: var(--primary-color);
    }

    /* Modal Overlay */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--card-background-color);
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 16px;
      color: var(--primary-text-color);
    }

    .modal-body {
      margin-bottom: 24px;
      color: var(--primary-text-color);
    }

    /* Confirmation Modal Info */
    .modal-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: var(--secondary-background-color);
      border-radius: 8px;
      margin-top: 12px;
    }

    .modal-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-info-label {
      color: var(--secondary-text-color);
      font-size: 14px;
    }

    .modal-info-value {
      color: var(--primary-text-color);
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .modal-info-value ha-icon {
      --mdc-icon-size: 14px;
      vertical-align: middle;
    }

    /* Add Reward Form */
    .form-field {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color);
      margin-bottom: 8px;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
    }

    .form-textarea {
      min-height: 80px;
      resize: vertical;
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .form-helper {
      font-size: 12px;
      color: var(--secondary-text-color);
      margin-top: 4px;
    }

    .icon-picker {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-preview {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: var(--accent-color, var(--primary-color));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-preview ha-icon {
      --mdi-icon-size: 24px;
    }

    /* Modal Actions */
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .modal-button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .modal-button.cancel {
      background: var(--secondary-background-color);
      color: var(--primary-text-color);
    }

    .modal-button.cancel:hover {
      background: var(--divider-color);
    }

    .modal-button.confirm {
      background: var(--accent-color, var(--primary-color));
      color: white;
    }

    .modal-button.confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .modal-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-button:disabled:hover {
      transform: none;
      box-shadow: none;
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--secondary-text-color);
    }

    .error-state {
      text-align: center;
      padding: 32px;
      color: var(--error-color);
    }
  `;

  setConfig(config: ChoreBotPersonRewardsConfig) {
    if (!config.person_entity) {
      throw new Error("person_entity is required");
    }

    this._config = {
      type: "custom:chorebot-person-rewards-card",
      person_entity: config.person_entity,
      title: config.title || undefined, // Will default to "{Name}'s Rewards" in render
      show_title: config.show_title !== false,
      hide_card_background: config.hide_card_background === true,
      show_disabled_rewards: config.show_disabled_rewards === true,
      sort_by: config.sort_by || "cost",
      show_add_reward_button: config.show_add_reward_button !== false,
      accent_color: config.accent_color || "",
    };
  }

  static getStubConfig() {
    return {
      type: "custom:chorebot-person-rewards-card",
      person_entity: "person.example",
      title: "My Rewards",
      show_title: true,
      hide_card_background: false,
      show_disabled_rewards: false,
      sort_by: "cost",
      show_add_reward_button: true,
      accent_color: "",
    };
  }

  getCardSize() {
    return 3;
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "person_entity",
          required: true,
          selector: { entity: { domain: "person" } },
        },
        {
          name: "title",
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
          name: "show_disabled_rewards",
          default: false,
          selector: { boolean: {} },
        },
        {
          name: "sort_by",
          default: "cost",
          selector: {
            select: {
              options: [
                { label: "Cost (Low to High)", value: "cost" },
                { label: "Name (A-Z)", value: "name" },
                { label: "Date Created (Oldest First)", value: "created" },
              ],
            },
          },
        },
        {
          name: "show_add_reward_button",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "accent_color",
          selector: { text: {} },
        },
      ],
      computeLabel: (schema: any) => {
        const labels: { [key: string]: string } = {
          person_entity: "Person Entity",
          title: "Card Title",
          show_title: "Show Title",
          hide_card_background: "Hide Card Background",
          show_disabled_rewards: "Show Disabled Rewards",
          sort_by: "Sort Rewards By",
          show_add_reward_button: "Show Add Reward Button",
          accent_color: "Accent Color",
        };
        return labels[schema.name] || undefined;
      },
      computeHelper: (schema: any) => {
        const helpers: { [key: string]: string } = {
          person_entity: "Select the person whose rewards to display",
          title:
            'Custom title for the card (defaults to "{Person Name}\'s Rewards")',
          show_title: "Show the card title",
          hide_card_background:
            "Hide the card background and padding for a seamless look",
          show_disabled_rewards:
            "Include rewards that have been disabled in the grid",
          sort_by: "Choose how to sort the rewards in the grid",
          show_add_reward_button:
            "Show the 'Add Reward' card for creating new rewards",
          accent_color:
            "Accent color for reward icons and buttons (hex code or CSS variable like var(--primary-color))",
        };
        return helpers[schema.name] || undefined;
      },
    };
  }

  render() {
    if (!this.hass || !this._config) {
      return html`<ha-card>Loading...</ha-card>`;
    }

    // Validate person entity exists
    const personEntity = this.hass.states[this._config.person_entity];
    if (!personEntity) {
      return html`<ha-card>
        <div class="error-state">
          Person entity "${this._config.person_entity}" not found. Please check
          your configuration.
        </div>
      </ha-card>`;
    }

    // Get points sensor entity
    const sensor = this.hass.states["sensor.chorebot_points"];
    if (!sensor) {
      return html`<ha-card>
        <div class="empty-state">
          ChoreBot Points sensor not found. Make sure the integration is set up.
        </div>
      </ha-card>`;
    }

    const people = sensor.attributes.people || {};
    const rewards = sensor.attributes.rewards || [];

    // Precedence: Manual config > Person profile > Theme default
    let accentColor = "var(--primary-color)"; // Default fallback

    // Check for centralized person color from sensor
    if (this._config.person_entity) {
      const personProfile = people[this._config.person_entity];
      if (personProfile?.accent_color) {
        accentColor = personProfile.accent_color;
      }
    }

    // Manual config overrides everything
    if (this._config.accent_color) {
      accentColor = this._config.accent_color;
    }

    // Set CSS variable for accent color
    this.style.setProperty("--accent-color", accentColor);

    // Get person name for default title
    const personName = this._getPersonName(this._config.person_entity);
    const cardTitle = this._config.title || `${personName}'s Rewards`;

    return html`
      <ha-card
        class="${this._config.hide_card_background ? "no-background" : ""}"
      >
        ${this._config.show_title
          ? html`<div class="card-header">${cardTitle}</div>`
          : ""}
        ${this._renderRewardsGrid(rewards, people)}
      </ha-card>
      ${this._showConfirmModal ? this._renderConfirmModal(people, rewards) : ""}
      ${this._showAddRewardModal ? this._renderAddRewardModal() : ""}
    `;
  }

  private _renderConfirmModal(
    people: { [key: string]: PersonPoints },
    rewards: Reward[],
  ) {
    if (!this._pendingRedemption || !this._config) return "";

    const { personId, rewardId } = this._pendingRedemption;
    const person = people[personId];
    const reward = rewards.find((r) => r.id === rewardId);

    if (!person || !reward) return "";

    const personName = this._getPersonName(personId);
    const remainingPoints = person.points_balance - reward.cost;
    const canAfford = person.points_balance >= reward.cost;
    const canRedeem = reward.enabled && canAfford;
    const parts = getPointsDisplayParts(this.hass!);

    return html`
      <div class="modal-overlay" @click="${this._cancelRedemption}">
        <div
          class="modal-content"
          @click="${(e: Event) => e.stopPropagation()}"
        >
          <div class="modal-header">
            ${canRedeem ? "Are you sure?" : "Reward Details"}
          </div>
          <div class="modal-body">
            <div class="modal-info">
              <div class="modal-info-row">
                <span class="modal-info-label">Person:</span>
                <span class="modal-info-value">${personName}</span>
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Reward:</span>
                <span class="modal-info-value">${reward.name}</span>
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Cost:</span>
                <span class="modal-info-value"
                  >${reward.cost}
                  ${parts.icon
                    ? html`<ha-icon icon="${parts.icon}"></ha-icon>`
                    : ""}
                  ${parts.text ? parts.text : ""}</span
                >
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Current Balance:</span>
                <span class="modal-info-value"
                  >${person.points_balance}
                  ${parts.icon
                    ? html`<ha-icon icon="${parts.icon}"></ha-icon>`
                    : ""}
                  ${parts.text ? parts.text : ""}</span
                >
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Remaining Balance:</span>
                <span
                  class="modal-info-value"
                  style="color: ${remainingPoints < 0
                    ? "var(--error-color)"
                    : "inherit"}"
                  >${remainingPoints}
                  ${parts.icon
                    ? html`<ha-icon icon="${parts.icon}"></ha-icon>`
                    : ""}
                  ${parts.text ? parts.text : ""}</span
                >
              </div>
              ${!reward.enabled
                ? html`<div
                    style="margin-top: 12px; color: var(--warning-color); font-size: 14px; text-align: center;"
                  >
                    This reward is currently disabled.
                  </div>`
                : ""}
              ${!canAfford
                ? html`<div
                    style="margin-top: 12px; color: var(--error-color); font-size: 14px; text-align: center;"
                  >
                    Not enough points to redeem this reward.
                  </div>`
                : ""}
            </div>
          </div>
          <div class="modal-actions">
            <button
              class="modal-button cancel"
              @click="${this._cancelRedemption}"
            >
              ${canRedeem ? "Cancel" : "Close"}
            </button>
            <button
              class="modal-button confirm"
              ?disabled="${!canRedeem}"
              @click="${this._confirmRedemption}"
            >
              Redeem
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderAddRewardModal() {
    if (!this._config) return "";

    const isValid = this._newReward.name.trim().length > 0;
    const pointsTerm = getPointsTermLowercase(this.hass!);
    const pointsTermCap =
      pointsTerm.charAt(0).toUpperCase() + pointsTerm.slice(1);

    return html`
      <div class="modal-overlay" @click="${this._closeAddRewardModal}">
        <div
          class="modal-content"
          @click="${(e: Event) => e.stopPropagation()}"
        >
          <div class="modal-header">Add New Reward</div>
          <div class="modal-body">
            <div class="form-field">
              <label class="form-label">Name</label>
              <input
                type="text"
                class="form-input"
                .value="${this._newReward.name}"
                @input="${(e: Event) => {
                  this._newReward = {
                    ...this._newReward,
                    name: (e.target as HTMLInputElement).value,
                  };
                }}"
                placeholder="e.g., Extra Screen Time"
              />
            </div>

            <div class="form-field">
              <label class="form-label">Cost (${pointsTermCap})</label>
              <input
                type="number"
                class="form-input"
                min="1"
                max="10000"
                .value="${this._newReward.cost}"
                @input="${(e: Event) => {
                  this._newReward = {
                    ...this._newReward,
                    cost: parseInt((e.target as HTMLInputElement).value) || 50,
                  };
                }}"
              />
              <div class="form-helper">
                Cost between 1 and 10,000 ${pointsTerm}
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Icon</label>
              <div class="icon-picker">
                <div class="icon-preview">
                  <ha-icon icon="${this._newReward.icon}"></ha-icon>
                </div>
                <input
                  type="text"
                  class="form-input"
                  .value="${this._newReward.icon}"
                  @input="${(e: Event) => {
                    this._newReward = {
                      ...this._newReward,
                      icon: (e.target as HTMLInputElement).value,
                    };
                  }}"
                  placeholder="e.g., mdi:television"
                  style="flex: 1;"
                />
              </div>
              <div class="form-helper">
                Use Material Design Icons (e.g., mdi:gift, mdi:ice-cream)
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Description (Optional)</label>
              <textarea
                class="form-textarea"
                .value="${this._newReward.description}"
                @input="${(e: Event) => {
                  this._newReward = {
                    ...this._newReward,
                    description: (e.target as HTMLTextAreaElement).value,
                  };
                }}"
                placeholder="e.g., Get 30 extra minutes of screen time"
              ></textarea>
            </div>
          </div>
          <div class="modal-actions">
            <button
              class="modal-button cancel"
              @click="${this._closeAddRewardModal}"
            >
              Cancel
            </button>
            <button
              class="modal-button confirm"
              ?disabled="${!isValid}"
              @click="${this._createReward}"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderRewardsGrid(
    rewards: Reward[],
    people: { [key: string]: PersonPoints },
  ) {
    if (!this._config) return "";

    // Filter rewards by person_id
    const personRewards = rewards.filter(
      (r) => r.person_id === this._config!.person_entity,
    );

    // Filter by enabled/disabled
    const filteredRewards = personRewards.filter(
      (r) => this._config!.show_disabled_rewards || r.enabled,
    );

    // Sort rewards
    const sortedRewards = this._sortRewards(filteredRewards);

    // Get person's balance
    const person = people[this._config.person_entity];

    if (sortedRewards.length === 0 && !this._config.show_add_reward_button) {
      return html`<div class="empty-state">
        No rewards configured yet. Use the "Add Reward" button or
        <code>chorebot.manage_reward</code> service to create rewards.
      </div>`;
    }

    return html`
      <div class="rewards-grid">
        ${sortedRewards.map((reward) => this._renderRewardCard(reward, person))}
        ${this._config.show_add_reward_button
          ? this._renderAddRewardCard()
          : ""}
      </div>
    `;
  }

  private _renderRewardCard(reward: Reward, person: PersonPoints | undefined) {
    const canAfford = person ? person.points_balance >= reward.cost : false;
    const isDisabled = !reward.enabled || !canAfford;
    const parts = getPointsDisplayParts(this.hass!);

    return html`
      <div
        class="reward-card ${isDisabled ? "disabled" : ""}"
        @click="${() => this._handleRewardClick(reward, canAfford)}"
      >
        <div class="reward-icon-section">
          <div class="reward-icon">
            <ha-icon icon="${reward.icon}"></ha-icon>
          </div>
        </div>
        <div class="reward-info">
          <div class="reward-name">${reward.name}</div>
          <div class="reward-cost">
            ${reward.cost}
            ${parts.icon ? html`<ha-icon icon="${parts.icon}"></ha-icon>` : ""}
            ${parts.text ? parts.text : ""}
          </div>
          ${reward.description
            ? html`<div class="reward-description">${reward.description}</div>`
            : ""}
        </div>
      </div>
    `;
  }

  private _renderAddRewardCard() {
    return html`
      <div class="add-reward-card" @click="${this._openAddRewardModal}">
        <div class="add-reward-icon-section">
          <div class="add-reward-icon">
            <ha-icon icon="mdi:plus"></ha-icon>
          </div>
        </div>
        <div class="add-reward-info">
          <div class="add-reward-text">Add Reward</div>
        </div>
      </div>
    `;
  }

  private _sortRewards(rewards: Reward[]): Reward[] {
    const sorted = [...rewards];
    switch (this._config!.sort_by) {
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "created":
        return sorted.sort(
          (a, b) =>
            new Date(a.created || 0).getTime() -
            new Date(b.created || 0).getTime(),
        );
      case "cost":
      default:
        return sorted.sort((a, b) => a.cost - b.cost);
    }
  }

  private _handleRewardClick(reward: Reward, canAfford: boolean) {
    // Always open modal to show reward details (button will be disabled if can't redeem)
    this._pendingRedemption = {
      personId: this._config!.person_entity,
      rewardId: reward.id,
    };
    this._showConfirmModal = true;
  }

  private _cancelRedemption() {
    this._showConfirmModal = false;
    this._pendingRedemption = null;
  }

  private async _confirmRedemption() {
    if (!this._pendingRedemption) return;

    const { personId, rewardId } = this._pendingRedemption;

    // Close modal
    this._showConfirmModal = false;
    this._pendingRedemption = null;

    // Set redeeming state
    this._redeeming = rewardId;

    try {
      await this.hass!.callService("chorebot", "redeem_reward", {
        person_id: personId,
        reward_id: rewardId,
      });

      // Show success animation (star shower with themed colors)
      this._showRedemptionSuccess();
    } catch (err: any) {
      // Show error message
      const errorMessage =
        err.message || "Failed to redeem reward. Please try again.";
      alert(errorMessage);
    } finally {
      this._redeeming = null;
    }
  }

  private _showRedemptionSuccess() {
    // Get base color from accent color (fallback to primary color)
    const baseColor =
      this._config!.accent_color ||
      getComputedStyle(this).getPropertyValue("--primary-color") ||
      "#03a9f4";

    // Extract color variants (lighter and darker shades)
    const colors = extractColorVariants(baseColor);

    // Play star shower animation
    playStarShower(colors, 3000);
  }

  private _openAddRewardModal() {
    // Reset form
    this._newReward = {
      name: "",
      cost: 50,
      icon: "mdi:gift",
      description: "",
    };
    this._showAddRewardModal = true;
  }

  private _closeAddRewardModal() {
    this._showAddRewardModal = false;
  }

  private async _createReward() {
    if (!this._config) return;

    const { name, cost, icon, description } = this._newReward;

    if (!name.trim()) {
      alert("Reward name is required");
      return;
    }

    try {
      await this.hass!.callService("chorebot", "manage_reward", {
        name: name.trim(),
        cost: Math.max(1, Math.min(10000, cost)), // Clamp between 1 and 10000
        icon: icon || "mdi:gift",
        description: description.trim(),
        person_id: this._config.person_entity, // Pre-filled from config
      });

      // Close modal
      this._closeAddRewardModal();
    } catch (err: any) {
      // Show error message
      const errorMessage =
        err.message || "Failed to create reward. Please try again.";
      alert(errorMessage);
    }
  }

  private _getPersonName(entityId: string): string {
    const entity = this.hass?.states[entityId];
    return entity?.attributes.friendly_name || entityId.replace("person.", "");
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
  type: "chorebot-person-rewards-card",
  name: "ChoreBot Person Rewards Card",
  description:
    "Display person-specific rewards with inline creation and redemption",
  preview: true,
});
