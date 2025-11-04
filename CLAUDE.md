# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChoreBot is a Home Assistant custom integration that provides advanced task management with recurring tasks, streak tracking, tag-based organization, and TickTick synchronization. The project consists of a Python backend integration and JavaScript frontend Lovelace cards.

**Current Status**: Structure setup complete, ready for implementation. See `spec/chore-bot.md` for the full technical specification.

## Architecture

The integration follows a **three-layer architecture** with strict separation of concerns:

1. **Data Persistence Layer**: JSON-based storage in `.storage/chorebot_*.json` files. This is the absolute source of truth for all task data, lists, and metadata.

2. **Home Assistant Entity Layer**: `TodoListEntity` proxies that expose lists as standard HA `todo` entities. These provide read/write access to the Data Persistence Layer and ensure compatibility with native HA services.

3. **Lovelace Frontend Layer**: Custom cards (`chorebot-list-card`, `chorebot-add-button-card`) that interact with the Entity Layer via standard HA service calls.

### Critical Design Decisions

- **Local Master Model**: For recurring tasks and TickTick sync, the local JSON file is ALWAYS the source of truth. Sync reconciles TickTick state with local state.
- **Soft Deletes**: Tasks are never permanently deleted from local storage. Set `deleted_at` timestamp instead.
- **Instance-Based Recurrence**: Recurring tasks use a template + instance model. Templates (hidden from UI) store the `rrule` and streak data. Instances are individual occurrences with specific due dates. Each completion creates the next instance.
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

Tasks are stored in `.storage/chorebot_{list_id}.json` with this structure:

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
    "points_value": 10,
    "parent_uid": "template_task_uid",
    "is_template": false,
    "occurrence_index": 0
  }
}
```

### Recurring Task Model

**Template + Instance Architecture:**
- **Templates** store the `rrule`, default tags, and accumulated streak data. They have `is_template: true`, no `due` date, and are kept in cache but hidden from UI.
- **Instances** are individual occurrences with specific due dates. They have `parent_uid` pointing to their template and `occurrence_index` tracking their sequence.
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

- **Cache contains**: Templates (hidden from UI), active instances, completed instances (until soft-deleted), regular tasks
- **Storage contains**: Everything in cache PLUS soft-deleted tasks and archived instances
- **UI filtering**: Templates are filtered out in `todo.py`'s `todo_items` property

## File Structure

```
custom_components/chorebot/
├── __init__.py           # Integration setup, services, daily maintenance job
├── manifest.json         # Integration metadata (requires ticktick-py==1.0.0)
├── const.py             # Constants, storage keys, field names, service names
├── config_flow.py       # UI configuration flow (basic + TickTick OAuth)
├── task.py              # Task data model (schema, serialization, helper methods)
├── store.py             # Storage management (cache, persistence, archival)
├── todo.py              # TodoListEntity implementation (CRUD, completion logic)
├── services.yaml        # Service definitions (create_list, add_task)
└── strings.json         # UI translations

www/
├── chorebot-list-card.js        # Task display card with filtering
└── chorebot-add-button-card.js  # Add task dialog with custom fields
```

## Key Implementation Files

- **`task.py`**: Task data model with `parent_uid`, `is_template`, `occurrence_index` fields. Includes `is_recurring_template()`, `is_recurring_instance()` helper methods.
- **`store.py`**: Storage management with cache, archive handling, and query methods (`get_template()`, `get_instances_for_template()`, `async_archive_old_instances()`).
- **`todo.py`**: TodoListEntity implementation. Filters templates from UI. Completion logic creates new instances and checks for duplicates.
- **`__init__.py`**: Entry point with service handlers (`create_list`, `add_task`). Daily maintenance job handles archival, soft-deletion, and streak resets.
- **`config_flow.py`**: UI-based configuration including optional TickTick OAuth setup.

## TickTick Synchronization

- **Library**: `ticktick-py` (declared in manifest.json)
- **Model**: Local Master - local JSON is source of truth
- **Recurrence Handling**:
  - Sync with **templates**, not individual instances
  - Template's `rrule` syncs to TickTick's recurrence rule
  - Only current active instance (highest incomplete `occurrence_index`) syncs to TickTick
  - When TickTick task completed: run local completion logic (creates next instance), update TickTick with new due date
  - Historical/completed instances are local-only, never synced
  - Archive storage is completely local
- **Metadata Storage**:
  - Use native TickTick tags where possible
  - Store streaks and occurrence_index in template's TickTick description: `[chorebot:streak_current=7;streak_longest=15;occurrence_index=42]`
- **Soft Deletes**:
  - Local template `deleted_at` → permanently delete in TickTick
  - TickTick deletion → soft-delete local template (hides all instances)
  - Archived instances never affect TickTick

## Custom Services

- `chorebot.create_list`: Create a new task list (auto-generates list_id from name)
- `chorebot.add_task`: Add task with full custom field support (tags, rrule, etc.). When `rrule` is provided, creates both template and first instance.
- `chorebot.redeem_item`: Subtract points from user data (post-MVP)

## Important Reminders

- **NEVER** permanently delete tasks from local storage - always use soft deletes via `deleted_at`
- **ALWAYS** filter out tasks where `deleted_at` is not null when loading into cache
- **ALWAYS** maintain Local Master model for TickTick sync - local JSON is source of truth
- **ALWAYS** update `spec/chore-bot.md` when making architectural decisions or pivoting from original plans
- **Templates stay in cache** but are filtered from UI in `todo.py`'s `todo_items` property
- **Check for existing instances** before creating new ones to prevent duplicates (by `occurrence_index`)
- **Completed instances stay visible** until midnight when daily maintenance job soft-deletes them
- **Streak tracking is strict consecutive** - late completion resets streak to 0
- Daily maintenance job runs at midnight: archives old instances, soft-deletes completed instances, resets streaks for overdue instances

## Implementation Status

### ✅ Completed
1. **Data Persistence Layer**: JSON storage with template + instance model, archive storage, cache management
2. **TodoListEntity Logic**: Full CRUD operations, recurring task instance creation, strict consecutive streak tracking, duplicate prevention
3. **Custom Services**: `chorebot.create_list` and `chorebot.add_task` with full field support
4. **Daily Maintenance Job**: Archival (30+ days), soft-deletion of completed instances, streak resets

### 🚧 In Progress / Next Steps
1. **TickTick Sync**: OAuth, two-way sync with templates, metadata encoding/decoding
2. **Frontend Cards**:
   - `chorebot-list-card`: Display with progress tracking, streak counters, filtering by tags/date
   - `chorebot-add-button-card`: Add dialog with custom fields (tags, rrule, etc.)
3. **Advanced Features**: Points/rewards system, badges, shop functionality
