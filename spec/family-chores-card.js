class FamilyChoresCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._chores = [];
    this._filteredChores = [];
    this._loading = false;
    this._dialogState = {
      isOpen: false,
      mode: null, // 'add' | 'edit' | null
      data: null, // chore data for edit mode
    };
    this._newChore = {
      name: "",
      description: "",
      assignee_entity_id: "",
      due_date: "",
      rrule: "",
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._updateChores();
  }

  setConfig(config) {
    this._config = config;
    this._renderCard();
  }

  static getStubConfig() {
    return {
      title: "Family Chores",
      show_completed: false,
      show_unassigned: true,
      show_add_button: true,
      show_assignee: true,
      show_due_date: true,
      chore_color: "#4CAF50",
      text_color: "#FFFFFF",
      hide_card_background: false,
      persons: [],
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
          default: "Family Chores",
          selector: { text: {} },
        },
        {
          name: "show_completed",
          selector: { boolean: {} },
        },
        {
          name: "show_unassigned",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "show_add_button",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "show_assignee",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "show_due_date",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "chore_color",
          default: "#4CAF50",
          selector: {
            text: {},
          },
        },
        {
          name: "text_color",
          default: "#FFFFFF",
          selector: {
            text: {},
          },
        },
        {
          name: "hide_card_background",
          default: false,
          selector: { boolean: {} },
        },
        {
          name: "persons",
          selector: {
            entity: {
              multiple: true,
              filter: { domain: "person" },
            },
          },
        },
      ],
      computeLabel: (schema) => {
        switch (schema.name) {
          case "title":
            return "Card title";
          case "show_completed":
            return "Show completed chores";
          case "show_unassigned":
            return "Include unassigned chores";
          case "show_add_button":
            return "Show add chore button";
          case "show_assignee":
            return "Show assignee";
          case "show_due_date":
            return "Show due date";
          case "chore_color":
            return "Chore background color";
          case "text_color":
            return "Chore text color";
          case "hide_card_background":
            return "Hide card background";
          case "persons":
            return "Filter by persons";
          default:
            return undefined;
        }
      },
      computeHelper: (schema) => {
        switch (schema.name) {
          case "show_completed":
            return "Toggle to show or hide completed chores in the card";
          case "show_unassigned":
            return "When enabled, chores without an assigned person will be included in the card";
          case "show_add_button":
            return 'Toggle to show or hide the "Add Chore" button in the card header';
          case "show_assignee":
            return "Toggle to show or hide the assignee name for each chore";
          case "show_due_date":
            return "Toggle to show or hide the due date for each chore";
          case "chore_color":
            return "Set the background color for all chores (hex code or CSS variable like var(--accent-green))";
          case "text_color":
            return "Set the text color for chores (hex code or CSS variable like var(--primary-text-color))";
          case "hide_card_background":
            return "Hide the card background and padding for a seamless look";
          case "persons":
            return "Select specific persons to filter chores. Leave empty to show chores for all persons";
          default:
            return undefined;
        }
      },
    };
  }

  _updateChores() {
    if (!this._hass) return;

    // Get all family_chores sensor entities
    const choreEntities = Object.keys(this._hass.states)
      .filter((key) => key.startsWith("sensor.family_chores_"))
      .map((key) => ({
        entity_id: key,
        ...this._hass.states[key],
      }))
      .sort((a, b) => {
        // Sort by due date, then by status priority
        const dateA = new Date(a.attributes.due_date || "9999-12-31");
        const dateB = new Date(b.attributes.due_date || "9999-12-31");

        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }

        // Status priority: overdue > due > upcoming > completed
        const statusPriority = {
          overdue: 0,
          due: 1,
          upcoming: 2,
          completed: 3,
        };

        return statusPriority[a.state] - statusPriority[b.state];
      });

    this._chores = choreEntities;
    this._applyFilters();
    this._renderCard();
  }

  _applyFilters() {
    let filtered = this._chores;

    // Filter by completion status if configured
    if (this._config.show_completed === false) {
      filtered = filtered.filter((chore) => chore.state !== "completed");
    }

    // Filter by persons if configured
    if (this._config.persons && this._config.persons.length > 0) {
      filtered = filtered.filter((chore) => {
        const assignee = chore.attributes.assignee;
        // Include if chore is assigned to one of the selected persons
        if (assignee && this._config.persons.includes(assignee)) {
          return true;
        }
        // Include unassigned chores only if show_unassigned is enabled
        if (!assignee && this._config.show_unassigned !== false) {
          return true;
        }
        return false;
      });
    } else if (this._config.show_unassigned === false) {
      // If no persons filter but show_unassigned is false, exclude unassigned chores
      filtered = filtered.filter((chore) => chore.attributes.assignee);
    }

    this._filteredChores = filtered;
  }

  _getStatusColor(status) {
    const colors = {
      overdue: "var(--error-color)",
      due: "var(--warning-color)",
      upcoming: "var(--success-color)",
      completed: "var(--success-color)",
    };
    return colors[status] || "var(--primary-text-color)";
  }

  _getStatusIcon(status) {
    const icons = {
      overdue: "mdi:alert-circle",
      due: "mdi:clock-alert",
      upcoming: "mdi:clock",
      completed: "mdi:check-circle",
    };
    return icons[status] || "mdi:clipboard";
  }

  _formatDueDate(dueDate) {
    if (!dueDate) return "Unknown";

    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;

    return due.toLocaleDateString();
  }

  _getStreakIcon(streak) {
    if (streak >= 30) return "mdi:fire"; // High streak
    if (streak >= 14) return "mdi:fire"; // Good streak
    if (streak >= 7) return "mdi:fire"; // Moderate streak
    if (streak >= 3) return "mdi:star-circle"; // Building streak
    if (streak >= 1) return "mdi:star"; // New streak
    return null; // No streak
  }

  async _completeChore(entityId) {
    try {
      await this._hass.callService("family_chores", "complete_chore", {
        entity_id: entityId,
      });

      // Show success feedback
      this._showToast("Chore completed!", "success");
    } catch (error) {
      console.error("Failed to complete chore:", error);
      this._showToast("Failed to complete chore", "error");
    }
  }

  async _deleteChore(entityId) {
    if (!confirm("Are you sure you want to delete this chore?")) {
      return;
    }

    try {
      await this._hass.callService("family_chores", "delete_chore", {
        entity_id: entityId,
      });

      this._showToast("Chore deleted", "success");
    } catch (error) {
      console.error("Failed to delete chore:", error);
      this._showToast("Failed to delete chore", "error");
    }
  }

  async _deleteChoreFromDialog() {
    if (!this._dialogState.data) return;

    if (!confirm("Are you sure you want to delete this chore?")) {
      return;
    }

    try {
      await this._hass.callService("family_chores", "delete_chore", {
        entity_id: this._dialogState.data.entity_id,
      });

      this._showToast("Chore deleted", "success");
      this._hideDialog();
    } catch (error) {
      console.error("Failed to delete chore:", error);
      this._showToast("Failed to delete chore", "error");
    }
  }

  _showDialog(mode, chore = null) {
    // mode: 'add' or 'edit'
    // chore: existing chore data (for edit) or null (for add)

    if (mode === "add") {
      this._newChore = {
        name: "",
        description: "",
        assignee_entity_id: "",
        due_date: "",
        rrule: "",
      };
      this._dialogState = {
        isOpen: true,
        mode: "add",
        data: null,
      };
    } else if (mode === "edit" && chore) {
      this._newChore = {
        name: chore.attributes.name || "",
        description: chore.attributes.description || "",
        assignee_entity_id: chore.attributes.assignee || "",
        due_date: chore.attributes.due_date || "",
        rrule: chore.attributes.rrule || "",
      };
      this._dialogState = {
        isOpen: true,
        mode: "edit",
        data: chore,
      };
    }

    this._renderCard();
  }

  _hideDialog() {
    this._dialogState = {
      isOpen: false,
      mode: null,
      data: null,
    };
    this._renderCard();
  }

  _getDialogConfig() {
    const isEditing = this._dialogState.mode === "edit";

    return {
      title: isEditing ? "Edit Chore" : "Add New Chore",
      saveButtonText: isEditing ? "Update" : "Add",
      showDeleteButton: isEditing,
    };
  }

  async _saveChore() {
    if (!this._newChore.name.trim()) {
      this._showToast("Chore name is required", "error");
      return;
    }

    const choreData = {
      name: this._newChore.name.trim(),
      description: this._newChore.description.trim() || undefined,
      assignee_entity_id: this._newChore.assignee_entity_id || undefined,
      due_date: this._newChore.due_date || undefined,
      rrule: this._newChore.rrule.trim() || undefined,
    };

    try {
      if (this._dialogState.mode === "edit" && this._dialogState.data) {
        // Update existing chore
        await this._hass.callService("family_chores", "update_chore", {
          entity_id: this._dialogState.data.entity_id,
          ...choreData,
        });
        this._showToast("Chore updated!", "success");
      } else if (this._dialogState.mode === "add") {
        // Add new chore
        await this._hass.callService("family_chores", "add_chore", choreData);
        this._showToast("Chore added!", "success");
      }

      this._hideDialog();
    } catch (error) {
      console.error("Failed to save chore:", error);
      this._showToast("Failed to save chore", "error");
    }
  }

  _showToast(message, type = "info") {
    // Create a simple toast notification
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${
          type === "error" ? "var(--error-color)" : "var(--success-color)"
        };
        color: white;
        border-radius: 4px;
        z-index: 9999;
        font-size: 14px;
        font-weight: 500;
      `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  _getPersonOptions() {
    // Get all person entities from Home Assistant
    return Object.keys(this._hass.states)
      .filter((key) => key.startsWith("person."))
      .map((key) => ({
        entity_id: key,
        name: this._hass.states[key].attributes.friendly_name || key,
      }));
  }

  _renderCard() {
    if (!this.shadowRoot) return;

    const hideBackground = this._config.hide_card_background === true;

    const style = `
        <style>
          .card {
            padding: ${hideBackground ? "0" : "16px"};
            background: ${
              hideBackground
                ? "transparent"
                : "var(--card-background-color, #fff)"
            };
            border-radius: ${hideBackground ? "0" : "8px"};
            box-shadow: ${
              hideBackground ? "none" : "0 2px 4px rgba(0, 0, 0, 0.1)"
            };
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .title {
            font-size: 20px;
            font-weight: 500;
            color: var(--primary-text-color);
            margin: 0;
          }

          .add-button {
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .add-button:hover {
            opacity: 0.8;
          }

          .chores-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .chore-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            border-radius: var(--ha-card-border-radius, 12px);
            transition: all 0.2s ease;
            cursor: pointer;
            position: relative;
          }

          .chore-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .chore-item.completed {
            opacity: 0.7;
          }

          .chore-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .chore-name {
            font-weight: bold;
            font-size: 16px;
            margin: 0;
          }

          .chore-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 14px;
          }

          .chore-detail-row {
            display: flex;
            align-items: center;
            gap: 4px;
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
            border: 3px solid white;
          }

          .completion-circle.completed {
            background: var(--success-color, #4CAF50);
          }

          .completion-icon {
            display: none;
            color: white;
            font-size: 28px;
          }

          .completion-circle.completed .completion-icon {
            display: block;
          }


          .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--secondary-text-color);
          }

          .loading {
            text-align: center;
            padding: 20px;
            color: var(--secondary-text-color);
          }

          .dialog-overlay {
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

          .dialog {
            background: var(--card-background-color);
            border-radius: 8px;
            padding: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
          }

          .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .dialog-title {
            font-size: 18px;
            font-weight: 500;
            margin: 0;
          }

          .dialog-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--secondary-text-color);
          }

          .form-field {
            margin-bottom: 16px;
          }

          .form-label {
            display: block;
            margin-bottom: 4px;
            font-size: 14px;
            font-weight: 500;
            color: var(--primary-text-color);
          }

          .form-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--divider-color);
            border-radius: 4px;
            background: var(--primary-background-color);
            color: var(--primary-text-color);
            font-size: 14px;
            box-sizing: border-box;
          }

          .form-input:focus {
            outline: none;
            border-color: var(--primary-color);
          }

          .form-textarea {
            resize: vertical;
            min-height: 60px;
          }

          .dialog-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 20px;
          }

          .dialog-button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .dialog-button.cancel {
            background: var(--secondary-background-color);
            color: var(--secondary-text-color);
          }

          .dialog-button.save {
            background: var(--primary-color);
            color: white;
          }

          .dialog-button.delete {
            background: var(--error-color, #f44336);
            color: white;
          }

          .dialog-button.delete:hover {
            opacity: 0.9;
          }
        </style>
      `;

    const content = `
        <div class="card">
          <div class="header">
            <h3 class="title">${this._config.title || "Family Chores"}</h3>
            ${
              this._config.show_add_button !== false
                ? `
              <button class="add-button" id="add-chore-button">
                <ha-icon icon="mdi:plus" style="--mdi-icon-size: 18px;"></ha-icon>
                Add Chore
              </button>
            `
                : ""
            }
          </div>

          ${
            this._loading
              ? `
            <div class="loading">Loading chores...</div>
          `
              : this._filteredChores.length === 0
              ? `
            <div class="empty-state">
              <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
              <p>No chores found. Add one to get started!</p>
            </div>
          `
              : `
            <div class="chores-list">
              ${this._filteredChores
                .map((chore) => this._renderChoreItem(chore))
                .join("")}
            </div>
          `
          }
        </div>

        ${this._renderDialog()}
      `;

    this.shadowRoot.innerHTML = style + content;

    // Bind event listeners after rendering
    this._bindEventListeners();
  }

  _renderChoreItem(chore) {
    const status = chore.state;
    const isCompleted = status === "completed";
    const choreColor = this._config.chore_color || "#4CAF50";
    const textColor = this._config.text_color || "#FFFFFF";
    const assigneeName = chore.attributes.assignee_friendly_name;
    const showAssignee =
      this._config.show_assignee !== false &&
      assigneeName &&
      assigneeName !== "Unassigned";
    const streak = chore.attributes.current_streak || 0;
    const streakIcon = this._getStreakIcon(streak);

    return `
        <div
          class="chore-item ${status}"
          data-entity-id="${chore.entity_id}"
          data-chore='${JSON.stringify(chore).replace(/'/g, "&#39;")}'
          style="background: ${choreColor}; color: ${textColor};"
        >
          <div class="chore-content">
            <div class="chore-name">${
              chore.attributes.name || "Unknown Chore"
            }</div>
            <div class="chore-details">
              ${
                showAssignee
                  ? `
                <div class="chore-detail-row">
                  <ha-icon icon="mdi:account" style="--mdi-icon-size: 16px; color: ${textColor};"></ha-icon>
                  <span>${assigneeName}</span>
                </div>
              `
                  : ""
              }
              ${
                this._config.show_due_date !== false &&
                chore.attributes.due_date
                  ? `
                <div class="chore-detail-row">
                  <ha-icon icon="mdi:calendar" style="--mdi-icon-size: 16px; color: ${textColor};"></ha-icon>
                  <span>${this._formatDueDate(chore.attributes.due_date)}</span>
                </div>
              `
                  : ""
              }
              ${
                streakIcon
                  ? `
                <div class="chore-detail-row">
                  <ha-icon icon="${streakIcon}" style="--mdi-icon-size: 16px; color: ${textColor};"></ha-icon>
                  <span>${streak} day streak</span>
                </div>
              `
                  : ""
              }
            </div>
          </div>

          <div
            class="completion-circle ${isCompleted ? "completed" : ""}"
            data-entity-id="${chore.entity_id}"
            data-is-completed="${isCompleted}"
          >
            <ha-icon class="completion-icon" icon="mdi:check"></ha-icon>
          </div>
        </div>
      `;
  }

  _renderDialog() {
    if (!this._dialogState.isOpen) {
      return "";
    }

    const personOptions = this._getPersonOptions();
    const config = this._getDialogConfig();

    return `
        <div class="dialog-overlay" id="dialog-overlay">
          <div class="dialog" id="dialog-content">
            <div class="dialog-header">
              <h3 class="dialog-title">${config.title}</h3>
              <button class="dialog-close" id="dialog-close-btn">×</button>
            </div>

            <div class="form-field">
              <label class="form-label">Name *</label>
              <input
                type="text"
                class="form-input"
                id="chore-name-input"
                value="${this._newChore.name}"
                placeholder="Enter chore name..."
                required
              />
            </div>

            <div class="form-field">
              <label class="form-label">Description</label>
              <textarea
                class="form-input form-textarea"
                id="chore-description-input"
                placeholder="Enter description..."
              >${this._newChore.description}</textarea>
            </div>

            <div class="form-field">
              <label class="form-label">Assignee</label>
              <select
                class="form-input"
                id="chore-assignee-input"
              >
                <option value="">Unassigned</option>
                ${personOptions
                  .map(
                    (person) => `
                  <option value="${person.entity_id}" ${
                      this._newChore.assignee_entity_id === person.entity_id
                        ? "selected"
                        : ""
                    }>
                    ${person.name}
                  </option>
                `
                  )
                  .join("")}
              </select>
            </div>

            <div class="form-field">
              <label class="form-label">Due Date</label>
              <input
                type="date"
                class="form-input"
                id="chore-duedate-input"
                value="${this._newChore.due_date}"
              />
            </div>

            <div class="form-field">
              <label class="form-label">Recurrence Rule (RRULE)</label>
              <input
                type="text"
                class="form-input"
                id="chore-rrule-input"
                value="${this._newChore.rrule}"
                placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO"
              />
              <small style="color: var(--secondary-text-color); font-size: 12px;">
                Example: RRULE:FREQ=WEEKLY;BYDAY=MO (every Monday)
              </small>
            </div>

            <div class="dialog-actions">
              ${
                config.showDeleteButton
                  ? `
                <button class="dialog-button delete" id="dialog-delete-btn">
                  <ha-icon icon="mdi:delete" style="--mdi-icon-size: 18px;"></ha-icon>
                  Delete
                </button>
              `
                  : ""
              }
              <div style="flex: 1;"></div>
              <button class="dialog-button cancel" id="dialog-cancel-btn">
                Cancel
              </button>
              <button class="dialog-button save" id="dialog-save-btn">
                ${config.saveButtonText} Chore
              </button>
            </div>
          </div>
        </div>
      `;
  }

  _bindEventListeners() {
    const self = this;

    // Bind add chore button click
    const addChoreButton = this.shadowRoot.getElementById("add-chore-button");
    if (addChoreButton) {
      addChoreButton.addEventListener("click", () => {
        self._showDialog("add");
      });
    }

    // Bind click events for chore items
    const choreItems = this.shadowRoot.querySelectorAll(".chore-item");

    choreItems.forEach((item) => {
      item.addEventListener("click", function (e) {
        // Don't open edit dialog if clicking on completion circle
        if (e.target.closest(".completion-circle")) {
          return;
        }

        const choreData = item.getAttribute("data-chore");
        if (choreData) {
          try {
            const chore = JSON.parse(choreData);
            self._showDialog("edit", chore);
          } catch (error) {
            console.error("Failed to parse chore data:", error);
          }
        }
      });
    });

    // Bind click events for completion circles
    const completionCircles =
      this.shadowRoot.querySelectorAll(".completion-circle");
    completionCircles.forEach((circle) => {
      circle.addEventListener("click", function (e) {
        e.stopPropagation(); // Prevent opening edit dialog
        const entityId = circle.getAttribute("data-entity-id");
        const isCompleted = circle.getAttribute("data-is-completed") === "true";
        if (entityId && !isCompleted) {
          self._handleCheckboxChange(entityId, true);
        }
      });
    });

    // Bind dialog input events
    const nameInput = this.shadowRoot.getElementById("chore-name-input");
    const descInput = this.shadowRoot.getElementById("chore-description-input");
    const assigneeInput = this.shadowRoot.getElementById(
      "chore-assignee-input"
    );
    const dueDateInput = this.shadowRoot.getElementById("chore-duedate-input");
    const rruleInput = this.shadowRoot.getElementById("chore-rrule-input");

    if (nameInput) {
      nameInput.addEventListener("input", (e) => {
        this._newChore.name = e.target.value;
      });
    }

    if (descInput) {
      descInput.addEventListener("input", (e) => {
        this._newChore.description = e.target.value;
      });
    }

    if (assigneeInput) {
      assigneeInput.addEventListener("change", (e) => {
        this._newChore.assignee_entity_id = e.target.value;
      });
    }

    if (dueDateInput) {
      dueDateInput.addEventListener("change", (e) => {
        this._newChore.due_date = e.target.value;
      });
    }

    if (rruleInput) {
      rruleInput.addEventListener("input", (e) => {
        this._newChore.rrule = e.target.value;
      });
    }

    // Bind dialog button events
    const closeBtn = this.shadowRoot.getElementById("dialog-close-btn");
    const cancelBtn = this.shadowRoot.getElementById("dialog-cancel-btn");
    const saveBtn = this.shadowRoot.getElementById("dialog-save-btn");
    const deleteBtn = this.shadowRoot.getElementById("dialog-delete-btn");
    const dialogOverlay = this.shadowRoot.getElementById("dialog-overlay");
    const dialogContent = this.shadowRoot.getElementById("dialog-content");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this._hideDialog();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        this._hideDialog();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        this._saveChore();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        this._deleteChoreFromDialog();
      });
    }

    if (dialogOverlay) {
      dialogOverlay.addEventListener("click", (e) => {
        // Only close if clicking the overlay itself, not the dialog content
        if (e.target === dialogOverlay) {
          this._hideDialog();
        }
      });
    }

    if (dialogContent) {
      dialogContent.addEventListener("click", (e) => {
        // Prevent clicks on dialog content from closing
        e.stopPropagation();
      });
    }
  }

  async _handleCheckboxChange(entityId, checked) {
    if (checked) {
      await this._completeChore(entityId);
    }
  }
}

customElements.define("family-chores-card", FamilyChoresCard);

// Register the card in the card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "family-chores-card",
  name: "Family Chores",
  description:
    "Manage family chores with recurring schedules and streak tracking",
  preview: false,
  documentationURL: "https://github.com/kylerm42/family-chores",
});
