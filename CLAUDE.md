# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated**: 2025-11-06 - Optimized storage structure: two-array model, removed streak duplication, standardized date formats

## Project Overview

ChoreBot is a Home Assistant custom integration that provides advanced task management with recurring tasks, streak tracking, tag-based organization, and remote backend synchronization (TickTick, with support for future backends like Todoist, Notion, etc.). The project consists of a Python backend integration and JavaScript frontend Lovelace cards.

**Current Status**: Backend synchronization complete with TickTick implementation. Ready for testing and frontend development. See `spec/chore-bot.md` for the full technical specification.

## Architecture

The integration follows a **three-layer architecture** with strict separation of concerns:

1. **Data Persistence Layer**: JSON-based storage in `.storage/chorebot_*.json` files. This is the absolute source of truth for all task data, lists, and metadata.

2. **Home Assistant Entity Layer**: `TodoListEntity` proxies that expose lists as standard HA `todo` entities. These provide read/write access to the Data Persistence Layer and ensure compatibility with native HA services.

3. **Lovelace Frontend Layer**: Custom cards (`chorebot-list-card`, `chorebot-add-button-card`) that interact with the Entity Layer via standard HA service calls.

### Critical Design Decisions

- **Local Master Model**: For recurring tasks and TickTick sync, the local JSON file is ALWAYS the source of truth. Sync reconciles TickTick state with local state.
- **Two-Array Storage Structure**: Templates and tasks are physically separated at the storage level (`recurring_templates` and `tasks` arrays) to prevent accidental mixing and eliminate structural bugs.
- **Soft Deletes**: Tasks are never permanently deleted from local storage. Set `deleted_at` timestamp instead.
- **Instance-Based Recurrence**: Recurring tasks use a template + instance model. Templates (hidden from UI) store the `rrule` and streak data. Instances are individual occurrences with specific due dates. **Instances do NOT duplicate streak data** - they reference their parent template.
- **Date Format Standardization**: All dates use ISO 8601 format in UTC with Z suffix (`YYYY-MM-DDTHH:MM:SSZ`). TickTick dates are normalized on import.
- **Archive Storage**: Completed instances older than 30 days are moved to `chorebot_{list_id}_archive.json` to preserve history without bloating active storage.
- **Progress Tracking**: Completed instances remain visible until midnight, enabling daily progress tracking.

## Development Environment

This integration is developed using the [Home Assistant Core devcontainer](https://developers.home-assistant.io/docs/development_environment):

1. Clone the HA core repository: https://github.com/home-assistant/core
2. Open in VS Code with Dev Containers extension
3. Add mounts to `core/.devcontainer/devcontainer.json`:
```json
"mounts": [
    "source=/path/to/ha-chorebot/custom_components/chorebot,target=${containerWorkspaceFolder}/config/custom_components/chorebot,type=bind",
    "source=/path/to/ha-chorebot/www,target=${containerWorkspaceFolder}/config/www,type=bind"
]
```
4. Rebuild the devcontainer
5. Run `hass -c config` to start Home Assistant
6. Access at http://localhost:8123

### Testing Changes

- **Python changes**: Restart Home Assistant from Developer Tools → Server Controls
- **Frontend changes**: Hard refresh browser (Ctrl+Shift+R)
- **Config flow changes**: Remove and re-add the integration
- **View logs**: `docker logs -f homeassistant` or check `config/home-assistant.log`

## Data Model

### Task Schema (JSON Storage)

Tasks are stored in `.storage/chorebot_{list_id}.json` using a **two-array structure**:

```json
{
  "version": 1,
  "minor_version": 1,
  "key": "chorebot_list_id",
  "data": {
    "recurring_templates": [
      {
        "uid": "template_id",
        "summary": "Daily chore",
        "status": "needs_action",
        "created": "YYYY-MM-DDTHH:MM:SSZ",
        "modified": "YYYY-MM-DDTHH:MM:SSZ",
        "custom_fields": {
          "tags": ["Morning"],
          "rrule": "FREQ=DAILY;INTERVAL=1",
          "streak_current": 5,
          "streak_longest": 10,
          "is_template": true
        }
      }
    ],
    "tasks": [
      {
        "uid": "instance_id",
        "summary": "Daily chore",
        "status": "needs_action",
        "due": "YYYY-MM-DDTHH:MM:SSZ",
        "created": "YYYY-MM-DDTHH:MM:SSZ",
        "modified": "YYYY-MM-DDTHH:MM:SSZ",
        "custom_fields": {
          "tags": ["Morning"],
          "parent_uid": "template_id",
          "occurrence_index": 0
        }
      }
    ]
  }
}
```

**Key Points:**
- All dates use ISO 8601 format in UTC with Z suffix: `YYYY-MM-DDTHH:MM:SSZ`
- Templates are in `recurring_templates` array (have `rrule`, `streak_current`, `streak_longest`, `is_template`)
- Tasks/instances are in `tasks` array (regular tasks and recurring instances)
- **Instances do NOT store streak data** - they reference their parent template via `parent_uid`

### Recurring Task Model

**Template + Instance Architecture:**
- **Templates** store the `rrule`, default tags, and accumulated streak data. They have `is_template: true`, no `due` date, and are physically stored in the `recurring_templates` array. Hidden from UI.
- **Instances** are individual occurrences with specific due dates. They have `parent_uid` pointing to their template and `occurrence_index` tracking their sequence. Stored in the `tasks` array alongside regular tasks.
- **No Streak Duplication**: Instances do NOT store `streak_current` or `streak_longest`. They reference their parent template for current streak values.
- **Archive Storage**: `chorebot_{list_id}_archive.json` stores completed instances older than 30 days.

### Recurring Instance Completion Logic

When a recurring task instance is marked completed:
1. Mark instance as `completed` with `last_completed` timestamp
2. Get template via `parent_uid`
3. Check if completed on time (before/on due date)
4. Update template's `streak_current` (increment if on-time, reset to 0 if late)
5. Update template's `streak_longest` if necessary
6. Check if next instance already exists (by `occurrence_index + 1`)
7. If not, calculate next due date from template's `rrule`
8. Create new instance with next due date and incremented `occurrence_index`
9. Completed instance stays visible until midnight
10. Daily maintenance job soft-deletes completed instances at midnight

### Streak Tracking (Strict Consecutive)

- **Increment**: When instance completed on or before its `due` date, template's `streak_current` is incremented
- **Reset to 0**: When instance completed after its `due` date
- **Daily Check**: Background job checks for overdue instances and resets template's `streak_current` to 0

### Cache Management

- **Cache structure**: Two-dictionary model: `{"templates": {uid: Task}, "tasks": {uid: Task}}`
- **Templates cache**: Contains recurring task templates (hidden from UI)
- **Tasks cache**: Contains regular tasks and recurring instances
- **Storage contains**: Everything in cache PLUS soft-deleted tasks and archived instances
- **UI filtering**: Templates are automatically excluded in `todo.py`'s `todo_items` property (uses `get_tasks_for_list()` which only returns tasks)
- **Store methods**:
  - `get_tasks_for_list(list_id)` - Returns only tasks (excludes templates)
  - `get_templates_for_list(list_id)` - Returns only templates
  - `get_instances_for_template(list_id, template_uid)` - Returns instances for a template

## File Structure

```
custom_components/chorebot/
├── __init__.py                  # Integration setup, OAuth initialization, services
├── manifest.json                # Integration metadata (dependencies: application_credentials, http)
├── const.py                     # Constants, OAuth URLs, storage keys, service names
├── config_flow.py               # OAuth2 configuration flow (AbstractOAuth2FlowHandler)
├── application_credentials.py   # OAuth endpoints for HA's native system
├── oauth_api.py                 # OAuth2Session wrapper with token management
├── task.py                      # Task data model (schema, serialization, helper methods)
├── store.py                     # Storage management (cache, persistence, archival)
├── todo.py                      # TodoListEntity implementation (CRUD, completion logic)
├── sync_backend.py              # Abstract base class for sync backends
├── sync_coordinator.py          # Generic sync coordinator (backend-agnostic)
├── ticktick_backend.py          # TickTick implementation of SyncBackend
├── ticktick_api_client.py       # Lightweight REST API client for TickTick
├── services.yaml                # Service definitions (create_list, add_task, sync)
└── strings.json                 # UI translations

www/
├── chorebot-list-card.js        # Task display card with filtering
└── chorebot-add-button-card.js  # Add task dialog with custom fields
```

## Key Implementation Files

- **`task.py`**: Task data model with `parent_uid`, `is_template`, `occurrence_index`, `ticktick_id` fields. Includes `is_recurring_template()`, `is_recurring_instance()` helper methods. All date formatting uses ISO Z format (UTC).
- **`store.py`**: Storage management with two-array structure (`recurring_templates` and `tasks`), cache as two-dictionary model, archive handling, and query methods (`get_tasks_for_list()`, `get_templates_for_list()`, `get_instances_for_template()`, `async_archive_old_instances()`).
- **`todo.py`**: TodoListEntity implementation. Filters templates from UI. Completion logic creates new instances and checks for duplicates. Triggers sync coordinator for push operations.
- **`__init__.py`**: Entry point with OAuth2 setup, backend initialization, service handlers (`create_list`, `add_task`, `sync`). Daily maintenance job handles archival, soft-deletion, and streak resets. Sets up periodic pull sync.
- **`config_flow.py`**: OAuth2 configuration flow using `AbstractOAuth2FlowHandler`. Integrates with HA's native `application_credentials` system.
- **`sync_backend.py`**: Abstract base class defining the interface for sync backends. Methods for push/pull/delete/complete operations.
- **`sync_coordinator.py`**: Generic coordinator that orchestrates sync operations with any backend. Handles locking, polling intervals, and error handling. Backend-agnostic.
- **`ticktick_backend.py`**: TickTick-specific implementation of `SyncBackend`. Handles metadata encoding/decoding, task conversion, TickTick date normalization (`_normalize_ticktick_date()` converts TickTick format to ISO Z), and TickTick API interactions.
- **`ticktick_api_client.py`**: Lightweight REST API client for TickTick Open API using `aiohttp`. Bearer token authentication.
- **`oauth_api.py`**: Wrapper for OAuth2Session providing automatic token refresh and access token retrieval.

## Remote Backend Synchronization

- **Architecture**: Backend-agnostic design using `SyncBackend` abstract interface
- **OAuth**: Home Assistant's native `application_credentials` system with OAuth2 flow
  - Users complete OAuth in HA web UI (works from any device)
  - No browser access needed on server (solves headless server problem)
  - Automatic token refresh via `OAuth2Session`
- **TickTick Implementation**:
  - Custom lightweight REST API client (`ticktick_api_client.py`) using `aiohttp`
  - Bearer token authentication from OAuth2Session
  - Backend-specific logic in `ticktick_backend.py` implementing `SyncBackend`
- **Sync Model**: Local Master - local JSON is source of truth
- **Generic Coordinator**: `sync_coordinator.py` orchestrates all sync operations
  - Push sync: Immediate when local changes occur
  - Pull sync: Every 15 minutes + manual via `chorebot.sync` service
  - Conflict resolution: Most recently updated wins, local wins on ties
  - Locking and error handling
- **Recurrence Handling**:
  - Sync with **templates**, not individual instances
  - Template's `rrule` syncs to backend's recurrence rule
  - Only current active instance (highest incomplete `occurrence_index`) syncs to backend
  - When remote task completed: run local completion logic (creates next instance), update remote with new due date
  - Historical/completed instances are local-only, never synced
  - Archive storage is completely local
- **Metadata Storage** (Backend-Specific):
  - Use native backend tags where possible
  - TickTick: Store streaks and occurrence_index in template's description: `[chorebot:streak_current=7;streak_longest=15;occurrence_index=42]`
  - Each backend handles encoding/decoding appropriately
- **Soft Deletes**:
  - Local template `deleted_at` → permanently delete on remote backend
  - Remote deletion → soft-delete local template (hides all instances)
  - Archived instances never affect remote backend
- **Extensibility**: Adding new backends (Todoist, Notion, etc.) only requires:
  1. Implement `SyncBackend` interface
  2. Create backend-specific API client
  3. Add OAuth endpoints to `application_credentials.py`
  4. No changes to core logic!

## Custom Services

- `chorebot.create_list`: Create a new task list (auto-generates list_id from name). If sync enabled, auto-creates remote list/project.
- `chorebot.add_task`: Add task with full custom field support (tags, rrule, etc.). When `rrule` is provided, creates both template and first instance.
- `chorebot.sync`: Manually trigger pull sync from remote backend. Optional `list_id` parameter to sync specific list (otherwise syncs all).
- `chorebot.redeem_item`: Subtract points from user data (post-MVP)

## Important Reminders

- **NEVER** permanently delete tasks from local storage - always use soft deletes via `deleted_at`
- **ALWAYS** filter out tasks where `deleted_at` is not null when loading into cache
- **ALWAYS** maintain Local Master model for TickTick sync - local JSON is source of truth
- **ALWAYS** update `spec/chore-bot.md` when making architectural decisions or pivoting from original plans
- **Two-array storage**: Templates in `recurring_templates`, tasks/instances in `tasks` - never mix them
- **Templates stay in cache** as separate dictionary but are filtered from UI (use `get_tasks_for_list()`, not `get_templates_for_list()`)
- **No streak duplication**: NEVER copy `streak_current` or `streak_longest` to instances - they belong only on templates
- **Date format**: All dates must be in ISO Z format (UTC): `YYYY-MM-DDTHH:MM:SSZ`. Normalize TickTick dates with `_normalize_ticktick_date()`
- **Check for existing instances** before creating new ones to prevent duplicates (by `occurrence_index`)
- **Completed instances stay visible** until midnight when daily maintenance job soft-deletes them
- **Streak tracking is strict consecutive** - late completion resets streak to 0
- Daily maintenance job runs at midnight: archives old instances, soft-deletes completed instances, resets streaks for overdue instances

## Implementation Status

### ✅ Completed
1. **Data Persistence Layer**:
   - Two-array JSON storage structure (`recurring_templates` and `tasks`)
   - Template + instance model with proper separation
   - Archive storage for old completed instances
   - Cache management with two-dictionary model
2. **TodoListEntity Logic**:
   - Full CRUD operations
   - Recurring task instance creation without streak duplication
   - Strict consecutive streak tracking
   - Duplicate prevention via `occurrence_index`
3. **Custom Services**: `chorebot.create_list`, `chorebot.add_task`, and `chorebot.sync` with full field support
4. **Daily Maintenance Job**: Archival (30+ days), soft-deletion of completed instances, streak resets
5. **Backend Synchronization Infrastructure**:
   - Native HA OAuth2 integration with `application_credentials`
   - Abstract `SyncBackend` interface for multi-provider support
   - Generic `SyncCoordinator` for backend-agnostic sync orchestration
   - Complete TickTick backend implementation with REST API client
   - TickTick date normalization to ISO Z format
   - Two-way sync: Push (immediate) + Pull (15 min intervals + manual)
   - Conflict resolution and error handling
6. **Storage Optimizations**:
   - Physical separation of templates and tasks at storage level
   - Eliminated redundant streak data on instances
   - Standardized date format (ISO Z / UTC) throughout codebase
   - Date normalization for TickTick sync

### 🚧 In Progress / Next Steps
1. **Testing & Validation**: Test OAuth flow, sync operations, edge cases, conflict resolution
2. **Frontend Cards**:
   - `chorebot-list-card`: Display with progress tracking, streak counters, filtering by tags/date
   - `chorebot-add-button-card`: Add dialog with custom fields (tags, rrule, etc.)
3. **Advanced Features**: Points/rewards system, badges, shop functionality
4. **Additional Backends**: Todoist, Notion, or other task management services
