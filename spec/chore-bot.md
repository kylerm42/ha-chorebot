# Technical Specification: Enhanced Chore & Task Integration (ChoreBot)

**Version:** 1.3
**Status:** Finalized
**Last Updated:** 2025-11-06 (Optimized storage structure: two-array model, removed streak duplication)

## 1. High-Level Architecture

The integration will be composed of three distinct layers with a strict separation of duties to prevent catastrophic failure.

1.  **Data Persistence Layer (The "Backend"):** The absolute source of truth. It handles the storage of all tasks, lists, and metadata (tags, streaks, etc.). It also contains all logic for synchronizing with external services (TickTick).
2.  **Home Assistant Entity Layer (The "Proxy"):** This layer exposes lists to Home Assistant as standard `todo` entities. These entities are merely read/write proxies to the Data Persistence Layer. They ensure compatibility with native Home Assistant services and UI elements.
3.  **Lovelace Frontend Layer (The "UI"):** Custom Lovelace cards that provide the enhanced user experience, interacting exclusively with the Entity Layer via standard service calls.

---

## 2. Data Model & Storage

### 2.1. Storage Mechanism

- **Primary Storage:** The integration uses one JSON file per to-do list, located in the Home Assistant `.storage/` directory (e.g., `.storage/chorebot_my_chores.json`).
- **Storage Structure:** Each storage file uses a **two-array structure** that physically separates recurring task templates from tasks:
  ```json
  {
    "version": 1,
    "minor_version": 1,
    "key": "chorebot_list_id",
    "data": {
      "recurring_templates": [...],  // Template tasks with rrule and streak data
      "tasks": [...]                 // Regular tasks and recurring instances
    }
  }
  ```
- **Configuration:** A central `chorebot_config.json` file tracks the existence and configuration of all lists.
- **Archive Storage:** Completed recurring instances older than 30 days are moved to separate `chorebot_{list_id}_archive.json` files.

### 2.2. Data Schemas

**Task Schema:**

All dates use ISO 8601 format in UTC with Z suffix: `YYYY-MM-DDTHH:MM:SSZ`

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
    "last_completed": "YYYY-MM-DDTHH:MM:SSZ",
    "parent_uid": "template_task_uid",  // Only for instances
    "occurrence_index": 0,               // Only for instances
    "rrule": "FREQ=DAILY;INTERVAL=1",   // Only for templates
    "streak_current": 5,                 // Only for templates
    "streak_longest": 10,                // Only for templates
    "is_template": true                  // Only for templates
  }
}
```

**Recurring Task Model:**

- **Template Tasks:** Store the `rrule`, default tags, and accumulated streak data. Templates have `is_template: true` and no `due` date. They are physically stored in the `recurring_templates` array and hidden from the UI.
- **Instance Tasks:** Individual occurrences with specific due dates. Instances have `parent_uid` pointing to their template and `occurrence_index` tracking their position in the sequence. **Instances do NOT store streak data** - they reference their parent template for current streak values.
- **Two-Array Storage:** Templates and tasks are physically separated at the storage level to prevent accidental mixing and simplify queries.
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
- **Daily Maintenance Job:** Runs at midnight (00:00:00) each day to:
  1.  Archive completed tasks (both recurring instances and regular tasks) older than 30 days to `chorebot_{list_id}_archive.json`
  2.  Soft-delete all completed tasks from yesterday or earlier (hides them from UI)
  3.  Reset streaks for templates with overdue instances
- **Progress Tracking:** Completed tasks remain visible for the day they were completed, enabling daily progress tracking (e.g., "5/10 tasks completed today").

### 3.3. Remote Backend Synchronization (TickTick, Todoist, etc.)

- **Architecture:** Backend-agnostic design using an abstract `SyncBackend` interface, allowing support for multiple sync providers.
- **OAuth:** Uses Home Assistant's native `application_credentials` system with OAuth2 authorization flow. Users complete OAuth in HA's web UI (accessible from any device), eliminating the need for browser access on the server.
- **TickTick Implementation:**
  - Custom lightweight REST API client using `aiohttp` for TickTick's Open API
  - Implements `SyncBackend` interface in `ticktick_backend.py`
  - Uses `ticktick_api_client.py` for direct API calls with Bearer token authentication
- **Synchronization Model:** The local JSON file is the primary source of truth. The sync process reconciles the state of the remote backend with the local state.
- **Generic Sync Coordinator:** `sync_coordinator.py` orchestrates sync operations for any backend, handling:
  - Push sync (local changes → remote backend immediately)
  - Pull sync (remote backend → local, every 15 minutes + manual trigger via `chorebot.sync` service)
  - Conflict resolution (most recently updated wins, local wins on ties)
  - Locking and error handling
- **Recurrence Handling:**
  - Syncs with the **template task**, not individual instances.
  - The template's `rrule` is synced to the backend's recurrence rule.
  - Only the **current active instance** (highest `occurrence_index` that's incomplete) is synced to the backend.
  - When a remote task is completed, run local completion logic (which creates next instance) and update remote with the new due date.
  - Historical instances and completed instances are local-only (not synced).
  - Archive storage is completely local and never synced.
- **Metadata (Backend-Specific):**
  - **Tags:** Use native backend tags where possible.
  - **Streak Data:** Stored in backend-specific format (e.g., TickTick uses description field):
    ```
    User's own description...
    ---
    [chorebot:streak_current=7;streak_longest=15;occurrence_index=42]
    ```
  - **Instance Tracking:** The `occurrence_index` in metadata helps reconcile which local instance corresponds to the remote task.
  - Each backend implementation handles metadata encoding/decoding appropriately.
- **Soft Deletes:**
  - If a local template has a `deleted_at` timestamp, permanently delete the corresponding remote task.
  - If a remote task is deleted, soft-delete the local template (which cascades to hiding all instances).
  - Archived instances are never synced and don't affect remote state.
- **Extensibility:** Adding new backends (Todoist, Notion, etc.) requires only:
  1. Implementing `SyncBackend` interface
  2. Creating backend-specific API client
  3. Adding OAuth endpoints to `application_credentials.py`
  4. No changes to core sync logic or entity layer

### 3.4. Frontend Lovelace Cards

The frontend is built with **TypeScript** and **Lit** (Web Components), compiled via **Rollup** to a single JavaScript bundle (`dist/chorebot-list-card.js`).

**Build System:**

- **Source**: `src/main.ts` (single TypeScript source file)
- **Output**: `dist/chorebot-list-card.js` (ES module bundle)
- **Build Tools**: Rollup with TypeScript plugin, Terser for minification
- **Watch Mode**: `npm run watch` for development

**List Card (`custom:chorebot-list-card`):**

- Built with Lit Web Components (LitElement)
- Displays items from a specified `todo` entity
- Today-focused view: shows tasks due today, incomplete overdue tasks, and overdue tasks completed today
- Optional dateless tasks display (configurable via `show_dateless_tasks`)
- Displays daily progress bar with completion percentage (configurable via `show_progress`)
- Inline task editing dialog with support for all custom fields:
  - Task name, description, section assignment
  - Due date/time with all-day toggle
  - Recurrence configuration (daily/weekly/monthly with intervals and days)
- Section filtering support (via `filter_section_id` config option)
- Visual customization options:
  - Hide card background for seamless dashboard integration
  - Custom task background and text colors
- Recurring task instance editing applies changes to future occurrences
- Uses native Home Assistant service calls (`todo.update_item` for completion, `chorebot.update_task` for editing)

**Card Configuration:**

- Configured via Lovelace YAML or visual editor (provides `getStubConfig()` and `getConfigForm()`)
- Configuration options:
  - `entity`: ChoreBot todo entity to display (required)
  - `title`: Card title (default: "Tasks")
  - `show_title`: Display title (default: true)
  - `show_progress`: Display progress bar (default: true)
  - `show_dateless_tasks`: Show tasks without due dates (default: true)
  - `filter_section_id`: Section name to filter by (optional)
  - `hide_card_background`: Remove card background/padding (default: false)
  - `task_background_color`: Custom background color for task items
  - `task_text_color`: Custom text color for task items

---

## 4. Post-MVP Features

- **Stars/Points:** Add a `points_value` to the task schema. On completion, add these points to the `total_points` field in the `chorebot_user_data.json` file.
- **"Shop":** A `custom:chorebot-shop-card` will be configured in YAML with redeemable items. A "Redeem" button will call a `chorebot.redeem_item` service, which subtracts points from the user's total.
- **Badges/Awards:** A scheduled job will check for conditions (e.g., `streak_current > 30`). If met, it will add a badge identifier to the `badges_earned` list in the user data file. A `custom:chorebot-badges-card` will display these.
