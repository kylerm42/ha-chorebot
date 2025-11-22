import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// Import shared utilities
import {
  HomeAssistant,
  ChoreBotRewardsConfig,
  PersonPoints,
  Reward,
} from "./utils/types.js";
import {
  extractColorVariants,
  playStarShower,
} from "./utils/confetti-utils.js";

// ============================================================================
// ChoreBot Rewards Card (TypeScript)
// ============================================================================

/**
 * ChoreBot Rewards Card
 *
 * Displays rewards and person points with:
 * - People section showing avatars (picture or initials) with point balances
 * - Rewards grid with icons, names, costs, and descriptions
 * - Redeem buttons per person (disabled if can't afford)
 * - Confetti animation on successful redemption
 */
@customElement("chorebot-rewards-card")
export class ChoreBotRewardsCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: ChoreBotRewardsConfig;
  @state() private _redeeming: string | null = null; // reward_id being redeemed
  @state() private _selectedPersonId: string | null = null; // Currently selected person
  @state() private _showConfirmModal: boolean = false; // Show redemption confirmation
  @state() private _pendingRedemption: {
    personId: string;
    rewardId: string;
  } | null = null; // Pending redemption details

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

    /* People Section */
    .people-section {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .person-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      flex: 1;
      min-width: 0; /* Allow flex items to shrink below content size */
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .person-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .person-card.selected {
      border-color: var(--primary-color);
      border-width: 2px;
      padding: 11px; /* Compensate for thicker border */
      background: color-mix(
        in srgb,
        var(--primary-color) 10%,
        var(--card-background-color)
      );
    }

    .person-card.selected::after {
      content: "✓";
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: var(--primary-color);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
    }

    .person-avatar {
      width: 48px;
      height: 48px;
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
      font-size: 18px;
      font-weight: bold;
    }

    .person-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .person-name {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .person-points {
      font-size: 14px;
      color: var(--secondary-text-color);
    }

    /* Rewards Grid */
    .rewards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }

    .reward-card {
      padding: 16px;
      border-radius: 12px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .reward-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--primary-color);
      color: white;
      margin: 0 auto;
    }

    .reward-icon ha-icon {
      --mdi-icon-size: 32px;
    }

    .reward-name {
      font-size: 18px;
      font-weight: 500;
      text-align: center;
      color: var(--primary-text-color);
    }

    .reward-cost {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      color: var(--primary-color);
    }

    .reward-description {
      font-size: 14px;
      color: var(--secondary-text-color);
      text-align: center;
      margin-top: -4px;
    }

    /* Redeem Button */
    .redeem-button {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color);
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      margin-top: auto;
      width: 100%;
    }

    .redeem-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .redeem-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Confirmation Modal */
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
    }

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
      background: var(--primary-color);
      color: white;
    }

    .modal-button.confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--secondary-text-color);
    }
  `;

  setConfig(config: ChoreBotRewardsConfig) {
    this._config = {
      type: "custom:chorebot-rewards-card",
      title: config.title || "Rewards",
      show_title: config.show_title !== false,
      hide_card_background: config.hide_card_background === true,
      show_people_section: config.show_people_section !== false,
      show_disabled_rewards: config.show_disabled_rewards === true,
      sort_by: config.sort_by || "cost",
    };
  }

  static getStubConfig() {
    return {
      type: "custom:chorebot-rewards-card",
      title: "Rewards",
      show_title: true,
      hide_card_background: false,
      show_people_section: true,
      show_disabled_rewards: false,
      sort_by: "cost",
    };
  }

  getCardSize() {
    return 3;
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "title",
          default: "Rewards",
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
          name: "show_people_section",
          default: true,
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
      ],
      computeLabel: (schema: any) => {
        const labels: { [key: string]: string } = {
          title: "Card Title",
          show_title: "Show Title",
          hide_card_background: "Hide Card Background",
          show_people_section: "Show People Section",
          show_disabled_rewards: "Show Disabled Rewards",
          sort_by: "Sort Rewards By",
        };
        return labels[schema.name] || undefined;
      },
      computeHelper: (schema: any) => {
        const helpers: { [key: string]: string } = {
          title: "Custom title for the card",
          show_title: "Show the card title",
          hide_card_background:
            "Hide the card background and padding for a seamless look",
          show_people_section:
            "Display the people section showing avatars and points balances",
          show_disabled_rewards:
            "Include rewards that have been disabled in the grid",
          sort_by: "Choose how to sort the rewards in the grid",
        };
        return helpers[schema.name] || undefined;
      },
    };
  }

  render() {
    if (!this.hass || !this._config) {
      return html`<ha-card>Loading...</ha-card>`;
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

    return html`
      <ha-card
        class="${this._config.hide_card_background ? "no-background" : ""}"
      >
        ${this._config.show_title
          ? html`<div class="card-header">${this._config.title}</div>`
          : ""}
        ${this._config.show_people_section
          ? this._renderPeopleSection(people)
          : ""}
        ${this._renderRewardsGrid(rewards, people)}
      </ha-card>
      ${this._showConfirmModal ? this._renderConfirmModal(people, rewards) : ""}
    `;
  }

  private _renderConfirmModal(
    people: { [key: string]: PersonPoints },
    rewards: Reward[],
  ) {
    if (!this._pendingRedemption) return "";

    const { personId, rewardId } = this._pendingRedemption;
    const person = people[personId];
    const reward = rewards.find((r) => r.id === rewardId);

    if (!person || !reward) return "";

    const personName = this._getPersonName(personId);
    const remainingPoints = person.points_balance - reward.cost;

    return html`
      <div class="modal-overlay" @click="${this._cancelRedemption}">
        <div
          class="modal-content"
          @click="${(e: Event) => e.stopPropagation()}"
        >
          <div class="modal-header">Are you sure?</div>
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
                <span class="modal-info-value">${reward.cost} pts</span>
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Current Balance:</span>
                <span class="modal-info-value"
                  >${person.points_balance} pts</span
                >
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Remaining Balance:</span>
                <span class="modal-info-value">${remainingPoints} pts</span>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button
              class="modal-button cancel"
              @click="${this._cancelRedemption}"
            >
              Cancel
            </button>
            <button
              class="modal-button confirm"
              @click="${this._confirmRedemption}"
            >
              Redeem
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderPeopleSection(people: { [key: string]: PersonPoints }) {
    const peopleArray = Object.values(people)
      .filter((person) => {
        // Filter out people whose entity no longer exists
        return this.hass?.states[person.entity_id] !== undefined;
      })
      .sort((a, b) => b.points_balance - a.points_balance);

    if (peopleArray.length === 0) {
      return html`<div class="empty-state">
        No people with points yet. Complete tasks to earn points!
      </div>`;
    }

    // Auto-select first person if none selected or selected person no longer exists
    if (
      !this._selectedPersonId ||
      !peopleArray.find((p) => p.entity_id === this._selectedPersonId)
    ) {
      this._selectedPersonId = peopleArray[0].entity_id;
    }

    return html`
      <div class="people-section">
        ${peopleArray.map((person) => this._renderPersonCard(person))}
      </div>
    `;
  }

  private _renderPersonCard(person: PersonPoints) {
    const entity = this.hass?.states[person.entity_id];
    const pictureUrl = entity?.attributes.entity_picture;
    const name = this._getPersonName(person.entity_id);
    const isSelected = this._selectedPersonId === person.entity_id;

    return html`
      <div
        class="person-card ${isSelected ? "selected" : ""}"
        @click="${() => this._selectPerson(person.entity_id)}"
      >
        ${pictureUrl
          ? html`<div class="person-avatar">
              <img src="${pictureUrl}" alt="${name}" />
            </div>`
          : html`<div class="person-avatar initials">
              ${this._getPersonInitials(person.entity_id)}
            </div>`}
        <div class="person-info">
          <div class="person-name">${name}</div>
          <div class="person-points">${person.points_balance} pts</div>
        </div>
      </div>
    `;
  }

  private _renderRewardsGrid(
    rewards: Reward[],
    people: { [key: string]: PersonPoints },
  ) {
    // Filter and sort rewards
    const filteredRewards = rewards.filter(
      (r) => this._config!.show_disabled_rewards || r.enabled,
    );

    const sortedRewards = this._sortRewards(filteredRewards);

    if (sortedRewards.length === 0) {
      return html`<div class="empty-state">
        No rewards configured yet. Use the
        <code>chorebot.manage_reward</code> service to create rewards.
      </div>`;
    }

    return html`
      <div class="rewards-grid">
        ${sortedRewards.map((reward) => this._renderRewardCard(reward, people))}
      </div>
    `;
  }

  private _renderRewardCard(
    reward: Reward,
    people: { [key: string]: PersonPoints },
  ) {
    const selectedPerson = this._selectedPersonId
      ? people[this._selectedPersonId]
      : null;
    const canAfford = selectedPerson
      ? selectedPerson.points_balance >= reward.cost
      : false;
    const isRedeeming = this._redeeming === reward.id;

    return html`
      <div class="reward-card">
        <div class="reward-icon">
          <ha-icon icon="${reward.icon}"></ha-icon>
        </div>
        <div class="reward-name">${reward.name}</div>
        <div class="reward-cost">${reward.cost} pts</div>
        ${reward.description
          ? html`<div class="reward-description">${reward.description}</div>`
          : ""}

        <button
          class="redeem-button"
          ?disabled="${!canAfford ||
          !reward.enabled ||
          isRedeeming ||
          !this._selectedPersonId}"
          @click="${() => this._showRedeemConfirmation(reward.id)}"
        >
          ${isRedeeming ? "Redeeming..." : "Redeem"}
        </button>
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

  private async _redeemReward(personId: string, rewardId: string) {
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
    // Get base color from primary color
    const baseColor =
      getComputedStyle(this).getPropertyValue("--primary-color") || "#03a9f4";

    // Extract color variants (lighter and darker shades)
    const colors = extractColorVariants(baseColor);

    // Play star shower animation
    playStarShower(colors, 3000);
  }

  private _selectPerson(personId: string) {
    this._selectedPersonId = personId;
  }

  private _showRedeemConfirmation(rewardId: string) {
    if (!this._selectedPersonId) return;

    this._pendingRedemption = {
      personId: this._selectedPersonId,
      rewardId: rewardId,
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

    // Close modal and trigger redemption
    this._showConfirmModal = false;
    this._pendingRedemption = null;

    await this._redeemReward(personId, rewardId);
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
  type: "chorebot-rewards-card",
  name: "ChoreBot Rewards Card",
  description: "Display points, rewards, and redemption options for ChoreBot",
  preview: true,
});
