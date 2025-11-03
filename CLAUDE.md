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
- **Single Task Recurrence**: Recurring tasks use a "Local Master" model where a single task object persists and mutates on completion (not creating new instances).

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
    "points_value": 10
  }
}
```

### Recurring Task Completion Logic

When a recurring task is marked completed:
1. Set `status` to `completed`
2. Update `last_completed` timestamp
3. Increment `streak_current` (if completed on/before due date)
4. Update `streak_longest` if necessary
5. Calculate next due date from `rrule`
6. Update `due` field to next occurrence
7. Reset `status` to `needs_action`

### Streak Tracking

- **Increment**: When recurring task completed on or before `due` date
- **Reset**: Daily background job checks for overdue recurring tasks and resets `streak_current` to 0

## File Structure

```
custom_components/chorebot/
├── __init__.py           # Integration setup/teardown (async_setup_entry, async_unload_entry)
├── manifest.json         # Integration metadata (requires ticktick-py==1.0.0)
├── const.py             # Constants, storage keys, field names, service names
├── config_flow.py       # UI configuration flow (basic + TickTick OAuth)
├── todo.py              # TodoListEntity implementation (CRUD operations)
└── strings.json         # UI translations

www/
├── chorebot-list-card.js        # Task display card with filtering
└── chorebot-add-button-card.js  # Add task dialog with custom fields
```

## Key Implementation Files

- **`todo.py`**: Contains `ChoreBotTodoListEntity` which implements the HA `TodoListEntity` interface. All CRUD operations, recurring task logic, and streak tracking happen here.
- **`__init__.py`**: Entry point for integration setup. Initializes data storage layer and forwards setup to platform (TODO).
- **`config_flow.py`**: UI-based configuration including optional TickTick OAuth setup.

## TickTick Synchronization

- **Library**: `ticktick-py` (declared in manifest.json)
- **Model**: Local Master - local JSON is source of truth
- **Recurrence Handling**:
  - Push *updates* to existing TickTick task (not new instances)
  - When TickTick task is completed, run local completion logic and push update back to "un-complete" it with new due date
- **Metadata Storage**:
  - Use native TickTick tags where possible
  - Store custom fields (streaks, etc.) in description field: `[chorebot:streak_current=7;streak_longest=15]`
- **Soft Deletes**:
  - Local `deleted_at` → permanently delete in TickTick
  - TickTick deletion → set local `deleted_at`

## Custom Services

- `chorebot.add_task`: Add task with full custom field support (tags, rrule, etc.)
- `chorebot.redeem_item`: Subtract points from user data (post-MVP)

## Important Reminders

- **NEVER** permanently delete tasks from local storage - always use soft deletes via `deleted_at`
- **ALWAYS** filter out tasks where `deleted_at` is not null when reading from storage
- **ALWAYS** maintain Local Master model for TickTick sync - local JSON is source of truth
- **ALWAYS** update `spec/chore-bot.md` when making architectural decisions or pivoting from original plans
- When implementing recurring tasks, ensure single task mutation (not creating new instances)
- Streak logic depends on a daily background job - ensure this is implemented

## Next Implementation Steps

Per README.md, the priority order is:
1. Implement Data Persistence Layer (JSON storage, task schema)
2. Implement TodoListEntity Logic (CRUD, recurring tasks, streaks)
3. Implement TickTick Sync (OAuth, two-way sync, metadata handling)
4. Implement Frontend Cards (display, filtering, add dialog, confetti)
5. Test in Dev Container
