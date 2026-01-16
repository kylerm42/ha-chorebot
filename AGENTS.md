# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

**Last Updated**: 2026-01-09 - Repository split: Integration separated from frontend cards

## Project Overview

ChoreBot is a Home Assistant custom integration that provides advanced task management with recurring tasks, streak tracking, tag-based organization, points/rewards system, and remote backend synchronization (TickTick, with support for future backends like Todoist, Notion, etc.).

**Architecture**: Two-repository structure for HACS compatibility:
1. **ha-chorebot** (this repo) - Python backend integration
2. **ha-chorebot-cards** ([separate repo](https://github.com/kylerm42/ha-chorebot-cards)) - TypeScript/Lit dashboard cards

**Current Status**: Backend complete with TickTick sync and points/rewards system. Frontend cards available in separate HACS plugin repository. See `spec/chore-bot.md` for full technical specification.

## Architecture

ChoreBot follows a **two-repository architecture** with clean separation:

### This Repository (ha-chorebot) - Backend Integration

**Three-layer backend architecture:**

1. **Data Persistence Layer**: JSON-based storage in `.storage/chorebot_*.json` files. This is the absolute source of truth for all task data, lists, and metadata. See "Storage Architecture" section below for detailed file structure.

2. **Home Assistant Entity Layer**: `TodoListEntity` proxies that expose lists as standard HA `todo` entities. Sensor entities expose points/rewards data. These provide read/write access to the Data Persistence Layer and ensure compatibility with native HA services.

3. **Service Layer**: Custom services for task management, person management, rewards, and sync operations.

### Separate Repository (ha-chorebot-cards) - Frontend Cards

**Single-bundle HACS plugin:**
- All 4 cards compiled into one JavaScript bundle (`chorebot-cards.js`)
- HACS automatically serves from `/hacsfiles/chorebot-cards/`
- Cards interact with backend via standard HA service calls
- Independent versioning and releases

See [ha-chorebot-cards repository](https://github.com/kylerm42/ha-chorebot-cards) for frontend development.

### Critical Design Decisions

- **Local Master Model**: For recurring tasks and TickTick sync, the local JSON file is ALWAYS the source of truth. Sync reconciles TickTick state with local state.
- **Two-Array Storage Structure**: Templates and tasks are physically separated at the storage level (`recurring_templates` and `tasks` arrays) to prevent accidental mixing and eliminate structural bugs.
- **Soft Deletes**: Tasks are never permanently deleted from local storage. Set `deleted_at` timestamp instead.
- **Instance-Based Recurrence**: Recurring tasks use a template + instance model. Templates (hidden from UI) store the `rrule` and streak data. Instances are individual occurrences with specific due dates. **Instances do NOT duplicate streak data** - they reference their parent template.
- **Date Format Standardization**: All dates use ISO 8601 format in UTC with Z suffix (`YYYY-MM-DDTHH:MM:SSZ`). TickTick dates are normalized on import.
- **Archive Storage**: Completed instances older than 30 days are moved to `chorebot_list_{list_id}_archive.json` to preserve history without bloating active storage.
- **Split Storage Files**: People, rewards, transactions, and redemptions are stored in separate files to optimize performance (hot data vs cold audit trails).
- **Namespace Isolation**: List files use `chorebot_list_` prefix to prevent conflicts with global storage files.
- **Progress Tracking**: Completed instances remain visible until midnight, enabling daily progress tracking.

## Development Environment

This integration uses a **Docker Compose setup** for simplified development without VS Code dependencies. See `DEVELOPMENT.md` for detailed instructions.

### Backend-Only Development

For integration development (this repository):

```bash
# Easy way (works on both macOS and Linux)
./dev.sh up           # Start HA with integration mounted
./dev.sh logs         # View logs
./dev.sh restart      # Restart services
./dev.sh down         # Stop everything

# Manual way - macOS/Windows
docker compose up -d

# Manual way - Linux (with host networking)
docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d
```

Access at http://localhost:8123

**Architecture**:
- **homeassistant**: Official `homeassistant/home-assistant:dev` image
  - Config: `./dev-config` mounted to `/config`
  - Integration: `./custom_components/chorebot` mounted to `/config/custom_components/chorebot`

### Testing Changes

- **Python changes**: Restart HA from Developer Tools → Server Controls
- **Config flow changes**: Remove and re-add the integration
- **Service testing**: Use Developer Tools → Services
- **View logs**: `docker-compose logs -f homeassistant` or check `dev-config/home-assistant.log`

### Full-Stack Development (Integration + Cards)

For developing both integration and cards simultaneously, the Docker Compose setup includes automatic support for the frontend submodule:

**Initial Setup:**
```bash
./dev.sh up  # Automatically initializes frontend submodule if needed
```

**How It Works:**
- `docker-compose.yml` already mounts `./frontend/dist` → `/config/www/community/chorebot-cards`
- `card-builder` container runs `npm run watch` automatically
- TypeScript changes in `frontend/src/` → auto-rebuild to `frontend/dist/chorebot-cards.js`
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R) to see changes
- **No manual copying needed** - changes are immediately available to HA
- **No manual building needed** - as long as docker-compose is running, the card-builder container handles all builds automatically

**Development Workflow:**
1. **Backend (Python)**: Edit `custom_components/chorebot/` → Restart HA via Developer Tools
2. **Frontend (TypeScript)**: Edit `frontend/src/` → Check logs with `./dev.sh logs card-builder` → Hard refresh browser

See DEVELOPMENT.md or `.holocode/20260109-repository-split-plan.md` for detailed setup instructions.

### Config and Data Location

All HA config and runtime data is in `dev-config/`:

- `configuration.yaml` - Main HA config
- `secrets.yaml` - Credentials (gitignored)
- `.storage/` - HA state and ChoreBot data (gitignored)
- `home-assistant_v2.db` - SQLite database (gitignored)

## Storage Architecture

ChoreBot uses a **split storage model** with separate files optimized for different access patterns:

### File Structure

```
.storage/
├── chorebot_config                    # Global: list registry, points display config
├── chorebot_people                    # Hot: person points balances only
├── chorebot_rewards                   # Hot: rewards catalog
├── chorebot_transactions              # Cold: audit trail (rarely read, append-only)
├── chorebot_redemptions               # Cold: redemption history (rarely read, append-only)
├── chorebot_list_{list_id}            # List data: tasks, templates, sections, list_metadata
└── chorebot_list_{list_id}_archive    # Archived completed instances (30+ days old)
```

### Design Rationale

**Namespace Isolation (`chorebot_list_` prefix):**

- Prevents collisions: A list named "people" won't conflict with `chorebot_people`
- Clear semantic meaning: Immediately identifies list data files
- Future-proof: Safe to add new global stores without naming conflicts

**Split People Data (4 separate files):**

- **Performance**: Only load what you need (most operations only need people/rewards)
- **Scalability**: Transaction log can grow to 100K+ entries without impacting startup
- **Hot vs Cold data**:
  - `chorebot_people` & `chorebot_rewards`: Read/written frequently (every task completion, reward redemption)
  - `chorebot_transactions` & `chorebot_redemptions`: Written frequently, read rarely (audit trails)

**Data Access Patterns:**

- **Task completion**: Read/write `chorebot_people` + append to `chorebot_transactions`
- **Reward redemption**: Read `chorebot_rewards` + update `chorebot_people` + append to `chorebot_redemptions` + append to `chorebot_transactions`
- **Sensor updates**: Read `chorebot_people` + `chorebot_rewards` only (NOT transactions/redemptions)
- **Transaction history view**: Read `chorebot_transactions` (only when explicitly requested)

## Data Model

### Task Schema (JSON Storage)

Tasks are stored in `.storage/chorebot_list_{list_id}.json` using a **two-array structure with metadata**:

```json
{
  "version": 1,
  "minor_version": 1,
  "key": "chorebot_list_id",
  "data": {
    "metadata": {
      "person_id": "person.kyle"
    },
    "recurring_templates": [
      {
        "uid": "template_id",
        "summary": "Daily chore",
        "status": "needs_action",
        "created": "YYYY-MM-DDTHH:MM:SSZ",
        "modified": "YYYY-MM-DDTHH:MM:SSZ",
        "tags": ["Morning"],
        "rrule": "FREQ=DAILY;INTERVAL=1",
        "streak_current": 5,
        "streak_longest": 10,
        "is_template": true,
        "points_value": 10,
        "streak_bonus_points": 50,
        "streak_bonus_interval": 7,
        "sync": {
          "ticktick": {
            "id": "remote_template_id",
            "etag": "abc123",
            "last_synced_at": "YYYY-MM-DDTHH:MM:SSZ"
          }
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
        "tags": ["Morning"],
        "parent_uid": "template_id",
        "occurrence_index": 0,
        "section_id": "section_id",
        "is_all_day": false,
        "sync": {
          "ticktick": {
            "id": "remote_task_id",
            "etag": "def456",
            "last_synced_at": "YYYY-MM-DDTHH:MM:SSZ"
          }
        }
      }
    ],
    "sections": [
      {
        "id": "section_id",
        "name": "Campbell's Tasks",
        "sort_order": 100,
        "person_id": "person.campbell"
      }
    ]
  }
}
```

**Key Points:**

- All dates use ISO 8601 format in UTC with Z suffix: `YYYY-MM-DDTHH:MM:SSZ`
- **All ChoreBot fields are at root level** - no `custom_fields` dict (standardized 2025-11-22)
- **Metadata** (person_id) is stored in the same file as tasks/sections for logical grouping
- Templates are in `recurring_templates` array (have `rrule`, `streak_current`, `streak_longest`, `is_template`)
- Tasks/instances are in `tasks` array (regular tasks and recurring instances)
- Sections are in `sections` array (can have optional `person_id` that overrides list's person_id)
- **Instances do NOT store streak data** - they reference their parent template via `parent_uid`
- **Sync metadata** stored in `sync.<backend_name>` dicts (e.g., `sync.ticktick.id`)

### Task Serialization Strategy

**Root Level Fields (Standard):**

- Core HA fields: `uid`, `summary`, `status`, `created`, `modified`, `due`, `description`, `deleted_at`
- ChoreBot features: `tags`, `rrule`, `points_value`, `streak_bonus_points`, `streak_bonus_interval`
- Recurrence: `parent_uid`, `occurrence_index`, `is_template`
- Streak tracking: `streak_current`, `streak_longest`, `last_completed`
- Organization: `section_id`, `is_all_day`

**Sync Dict (Backend-Specific):**

- Per-backend metadata: `sync.<backend_name>.id`, `sync.<backend_name>.etag`, etc.
- Example: `sync.ticktick.id`, `sync.ticktick.status`, `sync.ticktick.last_synced_at`
- Allows multi-backend sync without conflicts

**Historical Note:** Prior to 2025-11-22, ChoreBot fields were stored in a `custom_fields` dict. This has been standardized to root-level storage for clarity and to fix frontend display bugs.

### Recurring Task Model

**Template + Instance Architecture:**

- **Templates** store the `rrule`, default tags, and accumulated streak data. They have `is_template: true`, no `due` date, and are physically stored in the `recurring_templates` array. Hidden from UI.
- **Instances** are individual occurrences with specific due dates. They have `parent_uid` pointing to their template and `occurrence_index` tracking their sequence. Stored in the `tasks` array alongside regular tasks.
- **No Streak Duplication**: Instances do NOT store `streak_current` or `streak_longest`. They reference their parent template for current streak values.
- **Archive Storage**: `chorebot_list_{list_id}_archive.json` stores completed instances older than 30 days.

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

### Recurring Instance Uncomplete Logic (Anti-Farming Protection)

When a recurring task instance is marked incomplete (uncompleted):

1. Points are deducted (base points only, NOT streak bonuses)
2. **Instance is disassociated from template**: `parent_uid` set to `None`, `occurrence_index` set to `0`
3. Instance becomes a regular one-time task (orphaned)
4. Template and streak remain unchanged
5. Next scheduled instance (already created) remains linked to template
6. Recurring schedule continues normally

**Why Disassociation?**

- Prevents streak farming: Re-completing the orphaned instance won't increment streak
- Prevents bonus farming: No bonus checks run on orphaned instances
- Simple implementation: No need to track "already processed" state
- TickTick-proven approach: Battle-tested by millions of users

**Example Flow:**

```
Day 7: Complete recurring task
  → +10 points, streak 6→7, +50 bonus (at milestone), next instance created

Later: Uncomplete same task
  → -10 points, parent_uid set to None (orphaned)
  → Streak stays at 7, bonus stays at +50

Re-complete orphaned task:
  → +10 points only
  → NO streak change (it's orphaned)
  → NO bonus (it's orphaned)

Day 8: Complete NEXT scheduled instance
  → +10 points, streak 7→8, continues normally
```

### Streak Tracking (Strict Consecutive)

- **Increment**: When instance completed on or before its `due` date, template's `streak_current` is incremented
- **Reset to 0**: When instance completed after its `due` date
- **Daily Check**: Background job checks for overdue instances and resets template's `streak_current` to 0

### Cache Management

- **Cache structure**: Two-dictionary model: `{"templates": {uid: Task}, "tasks": {uid: Task}}`
- **Templates cache**: Contains recurring task templates (hidden from UI)
- **Tasks cache**: Contains regular tasks and recurring instances
- **Metadata cache**: Contains list-specific settings (person_id) stored in each list's file
- **Storage contains**: Everything in cache PLUS soft-deleted tasks and archived instances
- **UI filtering**: Templates are automatically excluded in `todo.py`'s `todo_items` property (uses `get_tasks_for_list()` which only returns tasks)
- **Store methods**:
  - `get_tasks_for_list(list_id)` - Returns only tasks (excludes templates)
  - `get_templates_for_list(list_id)` - Returns only templates
  - `get_instances_for_template(list_id, template_uid)` - Returns instances for a template
  - `get_list(list_id)` - Returns merged config (global registry + list-specific metadata)

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

Frontend (Separate Repository):
└── ha-chorebot-cards/           # https://github.com/kylerm42/ha-chorebot-cards
    ├── src/                     # TypeScript/Lit card source files
    ├── dist/                    # Single bundle: chorebot-cards.js
    └── hacs.json                # HACS plugin metadata
```

## Key Implementation Files

- **`task.py`**: Task data model with `parent_uid`, `is_template`, `occurrence_index`, `ticktick_id` fields. Includes `is_recurring_template()`, `is_recurring_instance()` helper methods. All date formatting uses ISO Z format (UTC).
- **`store.py`**: Storage management with two-array structure (`recurring_templates` and `tasks`), cache as two-dictionary model, archive handling, and query methods (`get_tasks_for_list()`, `get_templates_for_list()`, `get_instances_for_template()`, `async_archive_old_instances()`). Uses `chorebot_list_{list_id}` prefix for list files.
- **`todo.py`**: TodoListEntity implementation. Filters templates from UI. Completion logic creates new instances and checks for duplicates. Triggers sync coordinator for push operations.
- **`__init__.py`**: Entry point with OAuth2 setup, backend initialization, service handlers (`create_list`, `add_task`, `sync`). Daily maintenance job handles archival, soft-deletion, and streak resets. Sets up periodic pull sync.
- **`config_flow.py`**: OAuth2 configuration flow using `AbstractOAuth2FlowHandler`. Integrates with HA's native `application_credentials` system. Includes options flow for customizing points display terminology and icons.
- **`sync_backend.py`**: Abstract base class defining the interface for sync backends. Methods for push/pull/delete/complete operations.
- **`sync_coordinator.py`**: Generic coordinator that orchestrates sync operations with any backend. Handles locking, polling intervals, and error handling. Backend-agnostic.
- **`ticktick_backend.py`**: TickTick-specific implementation of `SyncBackend`. Handles metadata encoding/decoding, task conversion, TickTick date normalization (`_normalize_ticktick_date()` converts TickTick format to ISO Z), and TickTick API interactions.
- **`ticktick_api_client.py`**: Lightweight REST API client for TickTick Open API using `aiohttp`. Bearer token authentication.
- **`oauth_api.py`**: Wrapper for OAuth2Session providing automatic token refresh and access token retrieval.
- **`people.py`**: People/points/rewards management. `PeopleStore` class handles person profiles, rewards catalog, transactions, and redemptions. Points awarded on task completion with streak bonuses.
- **`sensor.py`**: Sensor entity (`sensor.chorebot_points`) exposing people balances, rewards, and transactions in attributes.

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
- **Completed Task Handling**:
  - TickTick's `/project/{id}/data` endpoint does NOT return completed tasks
  - During pull sync, missing tasks are checked individually via `/project/{id}/task/{task_id}` to distinguish between completed vs deleted
  - If 404/not found → task was deleted, soft-delete locally
  - If task found with status=2 → task was completed, update locally
- **Extensibility**: Adding new backends (Todoist, Notion, etc.) only requires:
  1. Implement `SyncBackend` interface
  2. Create backend-specific API client
  3. Add OAuth endpoints to `application_credentials.py`
  4. No changes to core logic!

## Custom Services

- `chorebot.create_list`: Create a new task list (auto-generates list_id from name). Optionally assign `person_id` for default person. If sync enabled, auto-creates remote list/project.
- `chorebot.update_list`: Update list metadata including name and person assignment. Use `clear_person: true` to remove person assignment.
- `chorebot.add_task`: Add task with full custom field support (tags, rrule, etc.). When `rrule` is provided, creates both template and first instance.
- `chorebot.manage_section`: Create, update, or delete sections with person assignment. Supports CRUD operations for organizing tasks within lists.
- `chorebot.sync`: Manually trigger pull sync from remote backend. Optional `list_id` parameter to sync specific list (otherwise syncs all).
- `chorebot.manage_reward`: Create or update a reward in the points system
- `chorebot.redeem_reward`: Redeem a reward for a person (deducts points)
- `chorebot.delete_reward`: Delete a reward from the system
- `chorebot.adjust_points`: Manually adjust points for a person (admin use)
- `chorebot.sync_people`: Sync people records with HA person entities (creates missing people with 0 points, automatically runs on integration setup)

### Person Assignment Services

**chorebot.create_list** - Create list with optional person assignment:

```yaml
service: chorebot.create_list
data:
  name: "Kyle's Chores"
  person_id: person.kyle
```

**chorebot.update_list** - Update list person assignment:

```yaml
service: chorebot.update_list
data:
  list_id: todo.chorebot_test
  person_id: person.kyle
```

**chorebot.manage_section** - Create section with person:

```yaml
service: chorebot.manage_section
data:
  list_id: todo.chorebot_test
  action: create
  name: "Campbell's Tasks"
  person_id: person.campbell
  sort_order: 100
```

**chorebot.manage_section** - Update section person:

```yaml
service: chorebot.manage_section
data:
  list_id: todo.chorebot_test
  action: update
  section_id: "6914de074c0c4c7fe64ddd9a"
  person_id: person.kyle
```

**chorebot.manage_section** - Delete section:

```yaml
service: chorebot.manage_section
data:
  list_id: todo.chorebot_test
  action: delete
  section_id: "6914de074c0c4c7fe64ddd9a"
```

### Person Accent Color System

**Overview**: Centralized person-to-color mapping system where each person's accent color is configured once and automatically inherited by all their cards.

**Data Model**: `PersonProfile` (formerly `PersonPoints`) stores person data including `accent_color` field:

- Stored in `chorebot_people` file (hot data, loaded with points)
- Field: `accent_color: str = ""` (hex code like `#3498db` or CSS variable like `var(--blue-500)`)
- Exposed via `sensor.chorebot_points` attributes

**Color Inheritance Precedence** (all cards):

1. Manual `accent_color` in card config (explicit override)
2. Person's `accent_color` from profile (centralized setting)
3. Theme's `--primary-color` (fallback)

**chorebot.manage_person** - Set person accent color:

```yaml
service: chorebot.manage_person
data:
  person_id: person.kyle
  accent_color: "#3498db" # Hex code or CSS variable
```

**Supported Cards with Accent Colors:**

- `chorebot-person-points-card` - Automatically inherits from `person_entity`
- `chorebot-person-rewards-card` - Automatically inherits from `person_entity`
- `chorebot-grouped-card` - Automatically inherits from optional `person_entity` filter

**Grouped Card Person Filtering**:

```yaml
# Personal view: Filter by person + inherit their accent color
- type: custom:chorebot-grouped-card
  entity: todo.chorebot_family_tasks
  person_entity: person.kyle # Shows only Kyle's tasks with Kyle's color

# Family view: Show all tasks with theme color
- type: custom:chorebot-grouped-card
  entity: todo.chorebot_family_tasks
  title: "Family Tasks"
  # No person_entity = shows all tasks
```

**Implementation Details**:

- Backend computes colors: No frontend logic needed
- Uses pre-computed `computed_person_id` for person filtering
- Validation: Service accepts hex `#RRGGBB`/`#RGB` or CSS variables `var(--name)`
- See `.holocode/person-accent-color-system.md` for full specification

### Points Display Configuration

**Overview**: Customizable points terminology system allowing users to replace "points" with custom text (e.g., "stars", "coins") and optional MDI icons throughout the UI.

**Data Model**: Points display configuration stored in `chorebot_config` global storage:

```json
{
  "lists": [...],
  "points_display": {
    "text": "stars",
    "icon": "mdi:star"
  }
}
```

**Storage & Exposure**:

- Stored in `chorebot_config` file (global configuration)
- Field: `points_display.text` (string, max 50 chars, default "points")
- Field: `points_display.icon` (MDI icon string like "mdi:star", max 100 chars, default "")
- Exposed via `sensor.chorebot_points` attributes
- Read by frontend utility functions: `getPointsDisplayParts()`, `getPointsTermCapitalized()`, `getPointsTermLowercase()`

**Configuration**:

Users configure via Integration Options Flow:

- Settings → Devices & Services → ChoreBot → Configure
- Text field: Custom terminology (can include emojis, e.g., "⭐ stars")
- Icon field: MDI icon selector (HA's native picker with autocomplete)
- Both fields optional; at least one must be non-empty (defaults to "points")
- Integration reloads automatically after changes

**Display Behavior**:

- Both icon and text render together when both provided: `437 🌟 stars`
- Icon only: `437 🌟` (not recommended for clarity)
- Text only: `437 stars`
- Default: `437 points` (if not configured)

**Frontend Integration**:

All cards automatically use custom display via shared utilities:

- `chorebot-person-points-card` - Balance display
- `chorebot-person-rewards-card` - Reward costs and buttons
- `chorebot-grouped-card` - Points badges
- `chorebot-list-card` - Points badges
- Edit dialogs - Field labels ("Stars Value", "Streak Bonus Stars")

**Implementation Files**:

- Backend: `const.py` (constants), `store.py` (accessor), `config_flow.py` (options flow), `sensor.py` (exposure)
- Frontend: `src/utils/points-display-utils.ts` (utilities), all card files import and use utilities
- See `.holocode/configurable-points-display.md` for full specification

## Important Reminders

- **NEVER** permanently delete tasks from local storage - always use soft deletes via `deleted_at`
- **ALWAYS** filter out tasks where `deleted_at` is not null when loading into cache
- **ALWAYS** maintain Local Master model for TickTick sync - local JSON is source of truth
- **ALWAYS** update `spec/chore-bot.md` when making architectural decisions or pivoting from original plans
- **All ChoreBot fields serialize to root level** - never use `custom_fields` for known dataclass fields (deprecated as of 2025-11-22)
- **Two-array storage**: Templates in `recurring_templates`, tasks/instances in `tasks` - never mix them
- **Templates stay in cache** as separate dictionary but are filtered from UI (use `get_tasks_for_list()`, not `get_templates_for_list()`)
- **No streak duplication**: NEVER copy `streak_current` or `streak_longest` to instances - they belong only on templates
- **Date format**: All dates must be in ISO Z format (UTC): `YYYY-MM-DDTHH:MM:SSZ`. Normalize TickTick dates with `_normalize_ticktick_date()`
- **Check for existing instances** before creating new ones to prevent duplicates (by `occurrence_index`)
- **Completed instances stay visible** until midnight when daily maintenance job soft-deletes them
- **Streak tracking is strict consecutive** - late completion resets streak to 0
- Daily maintenance job runs at midnight: archives old instances, soft-deletes completed instances, resets streaks for overdue instances
- **Storage file naming**: List files use `chorebot_list_{list_id}` prefix to avoid namespace collisions. Archive files use `chorebot_list_{list_id}_archive`.
- **People data optimization**: Use specific save methods (`async_save_people()`, `async_save_rewards()`, etc.) instead of `async_save()` to avoid writing all 4 files on every operation.

### Person Assignment Computation

- **Backend computes person_id**: `_resolve_person_id_for_task()` runs during state updates, enriching each task dict with `computed_person_id`
- **Frontend consumes computed value**: `task.computed_person_id` is pre-computed in `extra_state_attributes`, DO NOT reimplement resolution logic
- **Resolution order**: section.person_id → list.person_id → null
- **Exposed in state**: `extra_state_attributes["chorebot_tasks"][n]["computed_person_id"]`
- **Read-only**: Frontend never modifies this field, it's derived from section/list metadata
- **Why centralized**: Single source of truth eliminates code duplication between Python and TypeScript, improves performance (no repeated section lookups), and enhances debuggability (visible in Developer Tools → States)

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
   - **NEW (2025-11-17)**: Namespace isolation with `chorebot_list_` prefix for list files
   - **NEW (2025-11-17)**: Split people data into 4 files (people, rewards, transactions, redemptions) for performance

### ✅ Completed (Continued)

7. **Frontend Card Implementation**:
   - TypeScript + Lit build system with Rollup bundler
   - Shared utilities architecture for code reuse (`src/utils/`)
   - `chorebot-list-card` with today-focused flat view
   - `chorebot-grouped-card` with tag-based grouping (NEW!)
   - Progress tracking and visual indicators (per-group in grouped card)
   - Inline task editing dialog with full field support (shared between cards)
   - Section filtering and customization options
   - Recurrence rule creation and editing UI

8. **Shared Utilities Extraction** (Phase 1):
   - `types.ts` - Shared TypeScript interfaces
   - `date-utils.ts` - Date formatting & parsing
   - `task-utils.ts` - Task filtering & grouping
   - `rrule-utils.ts` - Recurrence rule parsing
   - `dialog-utils.ts` - Edit dialog rendering
   - Reduced main.ts from 1030 to 553 lines (~47% reduction)

9. **Tag-Based Grouped Card** (Phase 2):
   - New `chorebot-grouped-card` with tag grouping
   - Tasks appear in all matching tag groups
   - Per-group progress tracking (X/Y format)
   - Configurable untagged header text
   - Custom tag display order via `tag_group_order` config
   - Darker header bars (15% brightness reduction)
   - Row-based task display (not separate cards)
   - Auto-hides empty groups
   - Dual bundle output (32KB list card, 33KB grouped card)

10. **Points & Rewards System - Phase 1: Backend Foundation** (Completed 2025-01-14):
    - Created `people.py` with `PeopleStore` class for managing points, transactions, and rewards
    - Data models: `PersonProfile` (formerly `PersonPoints`), `Transaction`, `Reward`, `Redemption`
    - Extended Task model with `streak_bonus_points` and `streak_bonus_interval` fields
    - Points award logic in `todo.py` with person ID resolution (section > list > none)
    - Automatic streak bonus awards at configurable intervals for recurring tasks
    - Five new services: `manage_reward`, `redeem_reward`, `delete_reward`, `adjust_points`, `sync_people`
    - **NEW (2025-11-17)**: `sync_people` service automatically syncs HA person entities with storage, creating missing people with 0 points. Runs automatically on integration setup and can be called manually.
    - `sensor.chorebot_points` entity exposing people balances, rewards, and transaction history
    - Storage: Split into 4 files for performance: `chorebot_people` (hot: balances), `chorebot_rewards` (hot: catalog), `chorebot_transactions` (cold: audit trail), `chorebot_redemptions` (cold: history).
    - Full transaction audit trail with type-specific metadata
    - Person assignment: Lists and sections can have optional `person_id` field (section overrides list)
    - **Anti-Farming Protection**: Uncompleting a recurring task disassociates it from the template (sets `parent_uid=None`), preventing streak/bonus farming while allowing future occurrences to continue normally
    - **Implementation Notes**:
      - Storage configuration already supported `person_id` on lists/sections (no code changes needed)
      - Streak bonuses checked AFTER streak increment (e.g., bonus at 7 days means streak_current=7)
      - Points deducted on task uncomplete, but streak bonuses are NOT deducted
      - Rewards are persistent (not one-time use) and can be disabled without deletion
      - Disassociation approach inspired by TickTick's behavior - elegant and simple solution

11. **Points & Rewards System - Phase 2: Frontend Display** (Completed 2025-11-17):
    - **Points Badge on Task Cards**:
      - Added `show_points` config option (default: true) to both list and grouped cards
      - Points badge displays inline with due date: `+10 pts`
      - Bonus detection: Shows `+10 + 50 pts` with golden gradient when next completion awards streak bonus
      - Automatic bonus calculation checks template's current streak vs interval
      - CSS animation (glow effect) highlights upcoming bonus opportunities
    - **Points Fields in Edit Dialog**:
      - Added `points_value` field (0-10000) to all tasks
      - Added `streak_bonus_points` field (0-10000) for recurring tasks only
      - Added `streak_bonus_interval` field (0-999) for recurring tasks only
      - Conditional visibility: Bonus fields only shown when task has recurrence enabled
      - Clear helper text: "Bonus Every X Days (0 = no bonus)"
    - **New Rewards Card** (`chorebot-rewards-card.ts`):
      - **People Section**: Displays all people with points balances
        - Avatar support: Shows person's picture if available, falls back to initials
        - Circular avatars with gradient background for initials
        - Sorted by points balance (highest first)
        - Filters out deleted person entities silently
      - **Rewards Grid**: Responsive grid layout (250px min column width)
        - Shows icon, name, cost, and description for each reward
        - Configurable sorting: cost (default), name, or created date
        - Optional display of disabled rewards (`show_disabled_rewards` config)
        - Per-person redeem buttons (one for each person)
        - Buttons disabled if person can't afford or reward is disabled
      - **Redemption Flow**:
        - Calls `chorebot.redeem_reward` service
        - Shows loading state during redemption ("Redeeming...")
        - Success: Triggers star shower confetti animation (3 seconds)
        - Error: Displays alert with error message
        - Automatically updates when sensor state changes
      - **Config Options**:
        - `title`: Card title (default: "Rewards")
        - `show_title`: Show/hide title (default: true)
        - `hide_card_background`: Remove card background (default: false)
        - `show_people_section`: Show/hide people balances (default: true)
        - `show_disabled_rewards`: Include disabled rewards (default: false)
        - `sort_by`: Sort order - "cost", "name", or "created" (default: "cost")
    - **Build System**: Added rewards card to Rollup configuration (4 cards total: list, grouped, add-task, rewards)
    - **Bundle Sizes**: List (47KB), Grouped (55KB), Add Task (29KB), Rewards (37KB)

12. **Person Accent Color System** (Completed 2025-01-03):
    - **Backend**:
      - Renamed `PersonPoints` → `PersonProfile` with new `accent_color` field
      - Added `async_update_person_profile()` method to `PeopleStore`
      - New service: `chorebot.manage_person` for setting person colors
      - Validation: Accepts hex codes (`#RRGGBB`/`#RGB`) or CSS variables (`var(--name)`)
      - Backward compatible: Existing records default to empty string
    - **Frontend**:
      - Updated TypeScript types: `PersonProfile` interface with `accent_color` field
      - Legacy `PersonPoints` alias maintained for compatibility
      - Color inheritance in all 3 cards: `person-points-card`, `person-rewards-card`, `grouped-card`
      - Precedence order: Manual config → Person profile → Theme default
      - Grouped card enhancement: Optional `person_entity` filter for person-specific views
      - Person filtering uses pre-computed `computed_person_id` from backend
    - **Benefits**:
      - DRY principle: Configure person color once, inherited by all their cards
      - Consistency: All cards for same person use same color automatically
      - Flexibility: Manual per-card override still works
      - Extensibility: `PersonProfile` model ready for future enhancements

13. **Configurable Points Display** (Completed 2025-01-04):
    - **Backend**:
      - Constants added to `const.py`: `CONF_POINTS_DISPLAY`, `CONF_POINTS_TEXT`, `CONF_POINTS_ICON`
      - Storage accessor `get_points_display()` in `store.py` with defaults
      - Options flow in `config_flow.py` with validation (text ≤50 chars, icon ≤100 chars)
      - Sensor attribute exposure in `sensor.py` via `sensor.chorebot_points`
      - Configuration stored in `chorebot_config` file (global)
    - **Frontend**:
      - New utility: `src/utils/points-display-utils.ts` with 3 functions
        - `getPointsDisplayParts(hass)` - Returns `{icon, text}` from sensor
        - `getPointsTermCapitalized(hass)` - For field labels (e.g., "Stars")
        - `getPointsTermLowercase(hass)` - For helper text (e.g., "stars")
      - Updated `dialog-utils.ts` to accept `hass` parameter for dynamic labels
      - Updated 3 active cards: `person-points-card`, `person-rewards-card`, `grouped-card`
      - All hardcoded "pts" references replaced with dynamic display
      - CSS enhancements for icon+text alignment across all cards
    - **Features**:
      - Users configure via Settings → Devices & Services → ChoreBot → Configure
      - Text field supports emojis (e.g., "⭐ stars")
      - Icon field uses HA's native MDI icon picker with autocomplete
      - Both icon and text display together when both provided (e.g., "437 🌟 stars")
      - Dynamic field labels in edit dialogs ("Stars Value", "Streak Bonus Stars")
      - Backward compatible: Defaults to "points" if not configured
    - **Benefits**:
      - Single source of truth: Configure once, applies to all cards and dialogs
      - No per-card configuration needed
      - Consistent terminology throughout UI
      - Enhances engagement (e.g., kids prefer "stars" over "points")

14. **Person Grouped Card** (Completed 2025-01-15):
    - **Overview**: Mobile-first personal task dashboard combining person points display with tag-grouped task views
    - **Key Features**:
      - Interactive person selector dropdown with smooth animations
      - Auto-detection of logged-in user (fallback to config default → first alphabetically)
      - Task filtering by selected person using backend-computed `computed_person_id`
      - Tag-based grouping with per-group progress tracking
      - Color inheritance from person accent color (config → person profile → theme)
      - Optional progress bar showing completion percentage
      - Shared utilities for maximum code reuse (60% reduction via utilities)
    - **Configuration Options**:
      - `entity`: Required todo entity (e.g., `todo.chorebot_family_tasks`)
      - `default_person_entity`: Override auto-detection (e.g., `person.kyle`)
      - `show_all_people`: Show all people or only those with tasks (default: false)
      - `show_progress`: Display progress bar in person header (default: true)
      - `show_title`, `hide_card_background`, `accent_color`: Standard display options
      - `show_dateless_tasks`, `show_future_tasks`, `show_points`: Task view options
      - `untagged_header`, `tag_group_order`: Grouping customization
      - `filter_section_id`: Combine person filter with section filter
    - **Minimal Example**:
      ```yaml
      - type: custom:chorebot-person-grouped-card
        entity: todo.chorebot_family_tasks
      ```
    - **Full Example**:
      ```yaml
      - type: custom:chorebot-person-grouped-card
        entity: todo.chorebot_family_tasks
        default_person_entity: person.kyle
        show_all_people: true
        show_progress: true
        show_points: true
        tag_group_order: ["Morning", "Afternoon", "Evening"]
        filter_section_id: "Morning Routine"
      ```
    - **Implementation Details**:
      - Created `src/person-grouped-card.ts` (~800 lines)
      - Extracted `src/utils/person-display-utils.ts` with 7 shared functions
      - Refactored existing cards to use person utilities
      - Smooth grid-based dropdown animation (GPU-accelerated)
      - Re-uses grouped-card logic (edit dialog, task completion, confetti)
      - Backend-computed `computed_person_id` ensures consistency
    - **Use Cases**:
      - Mobile personal dashboards with quick person switching
      - Family task views where each member sees only their tasks
      - Filtered section views (e.g., "Morning Routine" for specific person)

### 🚧 In Progress / Next Steps

1. **Testing & Validation**: Test OAuth flow, sync operations, edge cases, conflict resolution
2. **Points System Testing**:
   - Test points award/deduction on task completion/uncomplete
   - Test streak bonus awards at correct intervals (7, 14, 21 days)
   - Test reward redemption with validation (sufficient points, enabled rewards)
   - Test points badge display and bonus detection in UI
   - Test rewards card with multiple people and rewards
3. **Future Frontend Enhancements**:
   - Transaction history view (dedicated card or modal)
   - Leaderboards (weekly/monthly/all-time top earners)
   - Badges/achievements for milestones
   - Point multipliers (double points events, special occasions)
4. **Additional Backends**: Todoist, Notion, or other task management services
