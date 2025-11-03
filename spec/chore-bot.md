# Technical Specification: Enhanced Chore & Task Integration (ChoreBot)
**Version:** 1.1
**Status:** Finalized

## 1. High-Level Architecture

The integration will be composed of three distinct layers with a strict separation of duties to prevent catastrophic failure.

1.  **Data Persistence Layer (The "Backend"):** The absolute source of truth. It handles the storage of all tasks, lists, and metadata (tags, streaks, etc.). It also contains all logic for synchronizing with external services (TickTick).
2.  **Home Assistant Entity Layer (The "Proxy"):** This layer exposes lists to Home Assistant as standard `todo` entities. These entities are merely read/write proxies to the Data Persistence Layer. They ensure compatibility with native Home Assistant services and UI elements.
3.  **Lovelace Frontend Layer (The "UI"):** Custom Lovelace cards that provide the enhanced user experience, interacting exclusively with the Entity Layer via standard service calls.

---

## 2. Data Model & Storage

### 2.1. Storage Mechanism
- **Primary Storage:** The integration will use one JSON file per to-do list, located in the Home Assistant `.storage/` directory (e.g., `.storage/chorebot_my_chores.json`).
- **Configuration:** A central `chorebot_config.json` file will track the existence and configuration of all lists.

### 2.2. Data Schemas

**Task Schema:**
```json
{
  "uid": "unique_identifier_string",
  "summary": "Task description",
  "description": "Optional longer description",
  "status": "needs_action" | "completed",
  "due": "YYYY-MM-DDTHH:MM:SSZ",
  "created": "YYYY-MM-DDTHH:MM:SSZ",
  "modified": "YYYY-MM-DDTHH:MM:SSZ",
  "deleted_at": null | "YYYY-MM-DDTHH:MM:SSZ",
  "custom_fields": {
    "tags": ["Morning", "Chores"],
    "rrule": "FREQ=DAILY;INTERVAL=1",
    "streak_current": 5,
    "streak_longest": 10,
    "last_completed": "YYYY-MM-DDTHH:MM:SSZ"
  }
}
```

**User Data Schema (`chorebot_user_data.json`):**
```json
{
  "user_id": "home_assistant_user_id",
  "total_points": 0,
  "badges_earned": ["first_streak", "chore_master_100"]
}
```

---

## 3. Core Features (MVP)

### 3.1. Native `todo` Entity Integration
- The integration will create a `TodoListEntity` for each list defined in the configuration.
- **Data Presentation:** The `todo_items` property of the entity will read from the corresponding JSON file and will only return tasks where `deleted_at` is `null`.
- **Create/Update:** Service calls like `async_create_todo_item` and `async_update_todo_item` will modify the JSON backend.
- **Deletion:** The `async_delete_todo_item` service will perform a soft delete by setting the `deleted_at` timestamp in the JSON file. It will not remove the object.

### 3.2. Recurrence & Streak Tracking
- **Recurrence Model:** The integration will follow a "Local Master" model. A single task object persists and is mutated upon completion.
- **Completion Logic:** When a recurring task is marked "completed":
    1.  Its `status` is updated to `completed`.
    2.  The `last_completed` timestamp is set.
    3.  The streak is updated (see below).
    4.  The next due date is calculated based on its `rrule` string.
    5.  The `due` date field is updated to the next occurrence.
    6.  The `status` is reset to `needs_action`.
- **Streak Logic:**
    1.  When a recurring task is completed on or before its `due` date, `streak_current` is incremented.
    2.  If `streak_current` exceeds `streak_longest`, `streak_longest` is updated.
    3.  A daily background job will check for any recurring tasks whose `due` date has passed and whose status is `needs_action`. For these tasks, `streak_current` will be reset to 0.

### 3.3. TickTick Two-Way Synchronization
- **Library:** The integration will utilize the `ticktick-py` library.
- **Synchronization Model:** The local JSON file is the primary source of truth. The sync process reconciles the state of TickTick with the local state. The probability of data inconsistency if this model is not strictly followed is 97%.
- **Recurrence Handling:**
    - The "Local Master" recurrence model is mandatory.
    - When a recurring task is completed in HA, the integration pushes an *update* to the *existing* TickTick task, changing its due date.
    - When a recurring task is seen as "completed" in TickTick during a sync, the integration runs its local completion logic (advancing due date, updating streak) and then pushes an update back to TickTick to "un-complete" it and set its new due date. This maintains a single task ID.
- **Metadata:**
    - **Tags:** The sync logic will first attempt to use native tag handling from the `ticktick-py` library.
    - **Other Metadata:** Fields with no native TickTick equivalent (e.g., streaks) will be stored in the TickTick task's description field in a structured, parsable format.
      ```
      User's own description...
      ---
      [chorebot:streak_current=7;streak_longest=15]
      ```
- **Soft Deletes:**
    - If a local task has a `deleted_at` timestamp, the sync logic will permanently delete the corresponding task in TickTick.
    - If a TickTick task is discovered to be deleted (is missing from the API response), the sync logic will set the `deleted_at` timestamp on the corresponding local task.

### 3.4. Frontend Lovelace Cards
- **List Card (`custom:chorebot-list-card`):**
    - Displays items from a specified `todo` entity.
    - Includes frontend-only controls for filtering the displayed list by tag, date, completion status, etc.
    - May include purely cosmetic special effects (e.g., confetti) upon task completion, triggered by the card's JavaScript.
- **Add Chore Button Card (`custom:chorebot-add-button-card`):**
    - A custom card that, when tapped, opens a dialog/modal for adding a new task.
    - The dialog will include fields for all custom data (`summary`, `tags`, `rrule`, etc.).
    - The "Save" action will call a custom integration service (e.g., `chorebot.add_task`) that can process the full data payload, not the standard `todo.add_item` service.

---

## 4. Post-MVP Features

- **Stars/Points:** Add a `points_value` to the task schema. On completion, add these points to the `total_points` field in the `chorebot_user_data.json` file.
- **"Shop":** A `custom:chorebot-shop-card` will be configured in YAML with redeemable items. A "Redeem" button will call a `chorebot.redeem_item` service, which subtracts points from the user's total.
- **Badges/Awards:** A scheduled job will check for conditions (e.g., `streak_current > 30`). If met, it will add a badge identifier to the `badges_earned` list in the user data file. A `custom:chorebot-badges-card` will display these.