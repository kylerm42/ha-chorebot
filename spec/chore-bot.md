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
    "last_completed": "YYYY-MM-DDTHH:MM:SSZ",
    "parent_uid": "template_task_uid",
    "is_template": false,
    "occurrence_index": 0
  }
}
```

**Recurring Task Model:**
- **Template Tasks:** Store the `rrule`, default tags, and accumulated streak data. Templates have `is_template: true` and no `due` date. They are stored but not displayed in the UI.
- **Instance Tasks:** Individual occurrences with specific due dates. Instances have `parent_uid` pointing to their template and `occurrence_index` tracking their position in the sequence.
- **Archive Storage:** Completed instances older than 30 days are moved to `chorebot_{list_id}_archive.json` to prevent storage bloat while preserving historical data.

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
- **Recurrence Model:** The integration uses an **Instance-Based Model** with templates. When creating a recurring task, a template task (hidden from UI) and first instance are created. Each completion generates the next instance.
- **Completion Logic:** When a recurring task instance is marked "completed":
    1.  The instance's `status` is updated to `completed`.
    2.  The instance's `last_completed` timestamp is set.
    3.  The template's streak is updated (see below).
    4.  The next due date is calculated from the template's `rrule` string.
    5.  A new instance is created with the next due date and incremented `occurrence_index`.
    6.  The completed instance remains visible until midnight, when a background job soft-deletes it.
    7.  Before creating a new instance, the system checks if one already exists with the next `occurrence_index` to prevent duplicates (e.g., if a task is uncompleted then re-completed).
- **Streak Logic (Strict Consecutive):**
    1.  When a recurring task instance is completed on or before its `due` date, the template's `streak_current` is incremented.
    2.  When a recurring task instance is completed after its `due` date, the template's `streak_current` is reset to 0.
    3.  If `streak_current` exceeds `streak_longest`, `streak_longest` is updated.
    4.  A daily background job checks for overdue instances (past due date and not completed) and resets the template's `streak_current` to 0.
- **Daily Maintenance Job:** Runs at midnight to:
    1.  Archive completed instances older than 30 days to `chorebot_{list_id}_archive.json`
    2.  Soft-delete completed recurring instances from the current day (hides them from UI)
    3.  Reset streaks for templates with overdue instances
- **Progress Tracking:** Completed instances remain visible for the day they were completed, enabling daily progress tracking (e.g., "5/10 tasks completed today").

### 3.3. TickTick Two-Way Synchronization
- **Library:** The integration will utilize the `ticktick-py` library.
- **Synchronization Model:** The local JSON file is the primary source of truth. The sync process reconciles the state of TickTick with the local state.
- **Recurrence Handling:**
    - TickTick syncs with the **template task**, not individual instances.
    - The template's `rrule` is synced to TickTick's recurrence rule.
    - Only the **current active instance** (highest `occurrence_index` that's incomplete) is synced to TickTick.
    - When a TickTick task is completed, run local completion logic (which creates next instance) and update TickTick with the new due date.
    - Historical instances and completed instances are local-only (not synced to TickTick).
    - Archive storage is completely local and never synced.
- **Metadata:**
    - **Tags:** Use native TickTick tags where possible.
    - **Streak Data:** Store on the template in TickTick description field in a structured format:
      ```
      User's own description...
      ---
      [chorebot:streak_current=7;streak_longest=15;occurrence_index=42]
      ```
    - **Instance Tracking:** The `occurrence_index` in metadata helps reconcile which local instance corresponds to the TickTick task.
- **Soft Deletes:**
    - If a local template has a `deleted_at` timestamp, permanently delete the corresponding TickTick task.
    - If a TickTick task is deleted, soft-delete the local template (which cascades to hiding all instances).
    - Archived instances are never synced and don't affect TickTick state.

### 3.4. Frontend Lovelace Cards
- **List Card (`custom:chorebot-list-card`):**
    - Displays items from a specified `todo` entity.
    - Shows completed tasks from today for progress tracking.
    - Displays daily progress bar (e.g., "5/10 tasks completed today").
    - Shows streak counters from template metadata.
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