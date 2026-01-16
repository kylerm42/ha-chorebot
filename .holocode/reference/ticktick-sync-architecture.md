# TickTick Synchronization Architecture

**Document Version:** 1.0  
**Last Updated:** 2026-01-16  
**Status:** Comprehensive Technical Reference

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Sync Model & Philosophy](#sync-model--philosophy)
4. [When API Calls Are Made](#when-api-calls-are-made)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Action-by-Action Behavior Matrix](#action-by-action-behavior-matrix)
7. [Metadata Encoding](#metadata-encoding)
8. [Date Handling](#date-handling)
9. [Recurring Task Sync](#recurring-task-sync)
10. [Section (Column) Sync](#section-column-sync)
11. [Conflict Resolution](#conflict-resolution)
12. [Error Handling](#error-handling)
13. [Optimization Strategies](#optimization-strategies)
14. [Known Limitations](#known-limitations)
15. [Troubleshooting](#troubleshooting)

---

## Overview

ChoreBot integrates with TickTick using OAuth2 authentication and RESTful API calls. The synchronization is **bidirectional** with a **local-master model**, meaning:

- Local JSON storage (`.storage/chorebot_list_{list_id}.json`) is the **absolute source of truth**
- Remote changes are reconciled **with** local state, not replacing it
- Templates and streaks exist **only** locally; only active instances sync to TickTick
- Completed instances and archived data are **local-only**

**Core Design Principles:**
- **Push-first**: Local changes are immediately pushed to TickTick
- **Pull-periodic**: Remote changes are pulled every 15 minutes (configurable)
- **Manual pull**: Users can trigger `chorebot.sync` service anytime
- **Non-blocking**: Sync operations do not block the frontend UI
- **Etag-based**: Uses TickTick's etag field for efficient change detection

---

## Architecture Components

### 1. **TickTickAPIClient** (`ticktick_api_client.py`)

Lightweight REST client using `aiohttp`.

**Key Methods:**
- `get_projects()` - List all TickTick projects (filters to TASK kind, excludes closed)
- `get_project_with_tasks(project_id)` - Fetch project data with all incomplete tasks
- `get_task(project_id, task_id)` - Fetch individual task (used to check completed/deleted status)
- `create_task(task_data)` - Create new task
- `update_task(task_id, task_data)` - Update existing task
- `complete_task(project_id, task_id)` - Mark task completed
- `delete_task(project_id, task_id)` - Permanently delete task
- `create_project(name)` - Create new project

**Authentication:**
- Uses Bearer token from OAuth2Session
- Automatic token refresh handled by `AsyncConfigEntryAuth` wrapper

**Error Handling:**
- HTTP errors logged with full response body
- Empty/no-JSON responses treated as success for operations like complete/delete

---

### 2. **TickTickBackend** (`ticktick_backend.py`)

Implements `SyncBackend` interface. Handles TickTick-specific logic:

**Key Responsibilities:**
- Convert ChoreBot Task ↔ TickTick API format
- Encode/decode ChoreBot metadata in task descriptions
- Normalize TickTick date formats to internal ISO Z format (UTC)
- Map local list IDs to TickTick project IDs (stored in storage)
- Handle recurring task sync (templates + current instance)
- Sync sections (TickTick columns) with local data

**Critical Methods:**
- `async_push_task()` - Create or update TickTick task from local Task
- `async_pull_changes()` - Pull and reconcile all remote changes
- `async_complete_task()` - Mark remote task complete and update due date for recurring
- `async_delete_task()` - Delete remote task
- `_update_local_from_ticktick()` - Apply remote changes to local Task
- `_import_ticktick_task()` - Import new task from TickTick
- `_handle_remote_completion()` - Handle recurring task completion on TickTick

---

### 3. **SyncCoordinator** (`sync_coordinator.py`)

Generic backend-agnostic coordinator. Orchestrates sync operations:

**Key Responsibilities:**
- Initialize backend
- Coordinate push/pull operations
- Manage sync locking (prevent concurrent syncs)
- Track last sync time
- Provide sync status

**Key Methods:**
- `async_initialize()` - Initialize backend connection
- `async_push_task(list_id, task)` - Delegate to backend
- `async_pull_changes(list_id=None)` - Delegate to backend, manage locking
- `async_create_list(list_id, name)` - Create remote list
- `get_list_mappings()` - Get local→remote ID mappings

**Locking:**
- Uses `asyncio.Lock` to prevent overlapping sync operations
- `_sync_in_progress` flag checked before starting pull sync
- Pull requests skipped with warning if sync already running

---

### 4. **OAuth Integration** (`oauth_api.py`, `config_flow.py`, `application_credentials.py`)

Uses Home Assistant's native `application_credentials` system:

**OAuth Flow:**
1. User adds ChoreBot integration
2. HA redirects to TickTick OAuth consent page
3. User authorizes
4. HA receives authorization code
5. Exchanges code for access token + refresh token
6. Tokens stored in config entry
7. `AsyncConfigEntryAuth` automatically refreshes tokens when expired

**Advantages:**
- Works from any device (browser on phone/tablet/PC)
- No server-side browser access needed
- Automatic token refresh
- Secure token storage in HA's encrypted config

---

## Sync Model & Philosophy

### Local Master Model

**Definition:** Local JSON storage is the **absolute source of truth**. Remote changes are reconciled with local state, not replacing it.

**Why?**
- Enables local-only features (templates, streaks, instances, archives)
- Prevents data loss from remote service issues
- Allows offline operation (changes queued for push)
- Supports complex recurrence logic TickTick doesn't handle

**Implications:**
- Local changes are pushed immediately (optimistic updates)
- Remote changes are pulled periodically and merged
- Conflicts resolved by "most recent modified wins" (with local bias)
- Soft deletes used locally; hard deletes on remote

---

### Two-Array Storage Model

**Templates** (`recurring_templates` array):
- Store `rrule`, `streak_current`, `streak_longest`, `is_template: true`
- Have no `due` date
- Hidden from UI
- Sync to TickTick as recurring tasks

**Tasks** (`tasks` array):
- Regular tasks (no parent_uid)
- Recurring instances (`parent_uid` points to template)
- Visible in UI
- Instances do NOT duplicate streak data

**Benefits:**
- Physical separation prevents structural bugs
- Clear semantic distinction
- Easy filtering in code

---

### Soft Delete Strategy

**Local:**
- Tasks are **never** permanently deleted from local storage
- `deleted_at` timestamp set when "deleted"
- Hidden from UI by filtering `is_deleted()` checks
- Preserved for historical record and sync reconciliation

**Remote:**
- Tasks are **permanently deleted** via TickTick API
- No concept of soft delete on TickTick

**Sync Behavior:**
- Local soft delete → Push permanent delete to TickTick
- Remote deletion detected → Soft delete locally (set `deleted_at`)

---

## When API Calls Are Made

### Push Operations (Immediate)

Triggered by local changes. Non-blocking for frontend.

| Local Action | API Call | Timing | Notes |
|-------------|----------|--------|-------|
| Create regular task | `POST /task` | Immediately after `async_create_task_internal()` | Stores TickTick ID in sync metadata |
| Create recurring task | `POST /task` | Immediately after template creation | Only template syncs; first instance is local-only |
| Update task | `POST /task/{task_id}` | Immediately after `async_update_task_internal()` | Skipped for recurring instances (template syncs instead) |
| Complete task | `POST /project/{id}/task/{id}/complete` | Immediately after status change | For recurring: also updates due date to next instance |
| Uncomplete task | `POST /task/{task_id}` | Immediately after status change | Updates status to 0 (incomplete) |
| Delete task | `DELETE /project/{id}/task/{id}` | Immediately after soft delete | Permanent deletion on TickTick |
| Create list | `POST /project` | Immediately after `chorebot.create_list` | Stores project_id mapping in storage |

**Push Failures:**
- Marked in sync metadata: `status: "push_failed"`
- Retried during next pull sync
- Logged as errors

---

### Pull Operations (Periodic + Manual)

Triggered by:
1. **Periodic sync** (every 15 minutes by default, configurable)
2. **Manual sync** (`chorebot.sync` service)
3. **Integration setup** (initial sync on first load)

#### Pull Sync Flow

```
1. Get list mappings from storage
2. For each mapped list:
   a. Retry any failed push operations
   b. GET /project/{id}/data (all tasks + columns)
   c. Log full project structure (tasks + sections)
   d. Sync sections (merge with local, preserve person_id)
   e. Build TickTick ID → local task map
   f. For each TickTick task:
      - If exists locally: compare etags, update if changed
      - If new: import (skip old completed tasks)
   g. For missing tasks (not in TickTick response):
      - Skip if already completed locally
      - GET /project/{id}/task/{task_id} to check status
      - If 404: soft delete locally (was deleted remotely)
      - If found: update locally (was completed remotely)
3. Update entity states
4. Return statistics (created, updated, deleted)
```

**API Calls per Pull Sync:**
- 1 call per mapped list: `GET /project/{id}/data`
- 1 call per missing incomplete task: `GET /project/{id}/task/{task_id}` (to distinguish completed vs deleted)

**Optimization:**
- Completed tasks skipped (no API call needed)
- Etag comparison prevents unnecessary updates
- Bulk fetch minimizes API calls

---

## Data Flow Diagrams

### Push Sync Flow (Local → Remote)

```
┌─────────────────┐
│  User Action    │
│  (via UI/API)   │
└────────┬────────┘
         ↓
┌────────────────────────────────────┐
│  TodoListEntity Method             │
│  (async_create/update/delete)      │
└────────┬───────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  Store.async_add/update_task()     │
│  Update local JSON cache           │
└────────┬───────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  entity.async_write_ha_state()     │
│  UI updates immediately            │
└────────┬───────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  SyncCoordinator.async_push_task() │
│  (non-blocking background)         │
└────────┬───────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  TickTickBackend._task_to_ticktick │
│  Convert Task → TickTick format    │
│  Encode metadata in description    │
└────────┬───────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  TickTickAPIClient.create/update   │
│  POST /task or POST /task/{id}     │
└────────┬───────────────────────────┘
         ↓
    ┌────┴────┐
    │ Success │
    └────┬────┘
         ↓
┌────────────────────────────────────┐
│  Store sync metadata:              │
│  - ticktick.id (from response)     │
│  - ticktick.etag                   │
│  - ticktick.status = "synced"      │
│  - ticktick.last_synced_at         │
└────────────────────────────────────┘
```

### Pull Sync Flow (Remote → Local)

```
┌─────────────────────────────────────┐
│  Trigger:                           │
│  - Periodic (every 15 min)          │
│  - Manual (chorebot.sync service)   │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  SyncCoordinator.async_pull_changes │
│  Check _sync_in_progress lock       │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  TickTickBackend.async_pull_changes │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  Retry failed push operations       │
│  (tasks with status: "push_failed") │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  TickTickAPIClient.                 │
│  get_project_with_tasks(project_id) │
│  GET /project/{id}/data             │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  Parse response:                    │
│  - tasks[] (incomplete only)        │
│  - columns[] (sections)             │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  Sync sections (merge with local)   │
│  Preserve person_id from local data │
└───────────────┬─────────────────────┘
                ↓
┌─────────────────────────────────────┐
│  Build ticktick_id → local_task map │
│  (templates + regular tasks only)   │
└───────────────┬─────────────────────┘
                ↓
        ┌───────┴────────┐
        │                │
        ↓                ↓
┌─────────────┐  ┌──────────────┐
│ Task exists │  │ New task     │
│ locally     │  │ from TickTick│
└──────┬──────┘  └──────┬───────┘
       ↓                 ↓
   ┌───────┐      ┌──────────────┐
   │Compare│      │Import        │
   │etags  │      │_import_      │
   └───┬───┘      │ticktick_task │
       ↓          └──────────────┘
   ┌───────┐
   │Changed│
   └───┬───┘
       ↓
   ┌─────────────────┐
   │_update_local_   │
   │from_ticktick    │
   └─────────────────┘
```

---

## Action-by-Action Behavior Matrix

### Local Action → Remote Behavior

| Local Action | TickTick API Call | TickTick Result | Notes |
|-------------|-------------------|-----------------|-------|
| **Create regular task** | `POST /task` | New task created | Summary, description, tags, due date, section |
| **Create recurring task** | `POST /task` with `repeatFlag` | New recurring task created | Only template syncs; includes rrule and current due date |
| **Update task summary** | `POST /task/{id}` | Task title updated | Immediate push |
| **Update task due date** | `POST /task/{id}` | Task due date updated | For recurring: updates next occurrence date |
| **Update task tags** | `POST /task/{id}` | Task tags replaced | Tags array fully replaced |
| **Update task section** | `POST /task/{id}` with `columnId` | Task moved to section | Section ID maps to TickTick columnId |
| **Complete regular task** | `POST /project/{id}/task/{id}/complete` | Task marked complete (status=2) | Task no longer appears in bulk query |
| **Complete recurring instance** | `POST /project/{id}/task/{id}/complete` + `POST /task/{id}` (update due) | Task marked complete, due date updated | New due date calculated from rrule and pushed |
| **Uncomplete task** | `POST /task/{id}` with `status: 0` | Task marked incomplete | For recurring instances: disassociates from template (prevents farming) |
| **Delete task** | `DELETE /project/{id}/task/{id}` | Task permanently deleted | Local soft delete → remote hard delete |
| **Convert regular → recurring** | `POST /task` (create template) | New recurring task created | Original task becomes instance, new template created |
| **Update recurring: this occurrence** | No sync | No change | Instances don't sync; only template matters |
| **Update recurring: future occurrences** | `POST /task/{template_id}` | Template and future occurrences updated | Template's rrule, tags, summary updated |

---

### Remote Action → Local Behavior

| TickTick Action | Detection Method | Local Result | Notes |
|----------------|------------------|--------------|-------|
| **Create task** | Pull sync: task in response, not in local map | New task imported | Skips completed tasks older than 30 days |
| **Update task** | Pull sync: etag changed | Task updated locally | Fields: summary, description, due, tags, section, status |
| **Complete task** | Pull sync: missing from bulk query, individual fetch shows status=2 | Task marked completed | For recurring: triggers completion flow (streak, next instance) |
| **Delete task** | Pull sync: missing from bulk query, individual fetch returns 404 | Task soft deleted locally | Sets `deleted_at` timestamp |
| **Move task to section** | Pull sync: `columnId` changed | Task's `section_id` updated | Overwrites local section assignment |
| **Remove task from section** | Pull sync: `columnId` null/missing | Task's `section_id` set to None | TickTick is source of truth for section assignment |
| **Complete recurring task** | Pull sync: due date changed on template | Old instance marked complete, new instance created | Uses `last_synced_occurrence_index` to find old instance |
| **Update recurring task** | Pull sync: etag changed on template | Template and active instances updated | Changes propagate to all incomplete instances |
| **Delete recurring task** | Pull sync: missing from bulk query, 404 on fetch | Template soft deleted, all instances hidden | Local maintains history |

---

### Section (Column) Actions

| Action | API Call | Behavior | Notes |
|--------|----------|----------|-------|
| **Create section (local)** | None | Section stored locally only | TickTick sections come from their side |
| **Update section (local)** | None | Section metadata updated locally | Can assign person_id locally |
| **Delete section (local)** | None | Section removed, tasks orphaned | Tasks remain but section_id points to deleted section |
| **Create section (TickTick)** | Pull sync: new column in response | Section imported | Merges with local data |
| **Update section (TickTick)** | Pull sync: column name/sort_order changed | Section updated, **person_id preserved** | Critical: local person_id not overwritten |
| **Delete section (TickTick)** | Pull sync: column missing | Section removed locally | Tasks with that section_id become orphaned |

---

## Metadata Encoding

ChoreBot stores custom fields in TickTick task descriptions using a special format.

### Format

```
[chorebot:key1=value1;key2=value2;...]
```

**Example:**
```
Buy groceries
---
[chorebot:streak_current=7;streak_longest=15;occurrence_index=42]
```

### Fields Encoded (Templates Only)

- `streak_current` - Current streak count
- `streak_longest` - Longest streak ever achieved
- `occurrence_index` - Which instance number this represents (for tracking remote completions)

**Instances do NOT encode metadata** - they reference their parent template.

### Parsing Logic

1. Search for `[chorebot:...]` pattern in task content
2. Extract key=value pairs separated by semicolons
3. Try parsing values as integers, fall back to strings
4. Store metadata in Task object properties
5. Remove metadata from user-visible description

### Why Description Field?

- TickTick doesn't support custom fields natively
- Description field is synced but hidden from quick views
- Standard markdown delimiter `---` separates user text from metadata
- Battle-tested approach (used by other integrations)

---

## Date Handling

### Internal Format (ChoreBot)

**Standard:** ISO 8601 with UTC timezone and Z suffix

```
YYYY-MM-DDTHH:MM:SSZ
```

**Examples:**
- `2026-01-16T15:30:00Z` - Timed task (3:30 PM UTC)
- `2026-01-16T00:00:00Z` - All-day task (midnight UTC)

### TickTick Format (API)

**Format:** ISO 8601 with timezone offset

```
YYYY-MM-DDTHH:MM:SS±HHMM
```

**Examples:**
- `2026-01-16T15:30:00+0000` - UTC
- `2026-01-16T10:30:00-0500` - Eastern Time (UTC-5)

### Conversion Functions

#### `_format_ticktick_date(iso_date: str)` → `(str, str)`

**Purpose:** Convert ChoreBot internal format → TickTick API format

**Process:**
1. Parse ISO date (handles naive, aware, Z suffix)
2. Get system timezone from Home Assistant config
3. Convert to system timezone (TickTick expects local times)
4. Format as `YYYY-MM-DDTHH:MM:SS±HHMM`
5. Return (formatted_date, timezone_name)

**Example:**
```python
# System timezone: America/New_York (UTC-5)
Input:  "2026-01-16T20:00:00Z"
Output: ("2026-01-16T15:00:00-0500", "America/New_York")
```

#### `_normalize_ticktick_date(ticktick_date: str)` → `str`

**Purpose:** Convert TickTick API format → ChoreBot internal format

**Process:**
1. Parse TickTick date with timezone
2. Convert to UTC
3. Format as ISO Z format
4. Return `YYYY-MM-DDTHH:MM:SSZ`

**Example:**
```python
Input:  "2026-01-16T15:00:00-0500"
Output: "2026-01-16T20:00:00Z"
```

### All-Day Task Handling

**Storage:** All-day tasks stored as midnight UTC with `is_all_day: true` flag

**TickTick API:** Sends `isAllDay: true` parameter

**Comparison:** When checking "completed on time", all-day tasks compare dates only (ignore time component)

---

## Recurring Task Sync

Recurring tasks use a **template + instance model** that only partially syncs to TickTick.

### What Syncs

| Data | Syncs to TickTick? | Location |
|------|-------------------|----------|
| Template | ✅ Yes | As recurring task with `repeatFlag` (rrule) |
| Current active instance due date | ✅ Yes | As `dueDate` on template |
| Template's summary, description, tags | ✅ Yes | On recurring task |
| Streak data (current, longest) | ✅ Yes (encoded in description) | Metadata in task content |
| Historical instances | ❌ No | Local-only |
| Completed instances | ❌ No | Local-only (auto-deleted at midnight) |
| Archived instances | ❌ No | Local-only (separate storage file) |

### Template Sync Behavior

**Push (Local → TickTick):**
1. Convert template to TickTick format
2. Include `repeatFlag` with rrule
3. Find current active instance (lowest incomplete occurrence_index)
4. Use instance's `due` date as template's `dueDate`
5. Encode streak metadata in description
6. Store `last_synced_occurrence_index` in sync metadata

**Pull (TickTick → Local):**
1. Detect if TickTick's due date changed from last sync
2. If changed → remote completion detected
3. Find old instance by `last_synced_occurrence_index`
4. Mark old instance complete, update template's streak
5. Create new instance with TickTick's new due date
6. Update `last_synced_occurrence_index`

### Instance Sync Behavior

**Instances do NOT sync individually.** Only the template syncs.

**Why?**
- TickTick's recurring model: one task per recurrence rule
- ChoreBot's model: one template + many instances
- Prevents explosion of tasks on TickTick
- Keeps both systems' recurrence models aligned

**Implications:**
- Updating an instance locally → no push (unless updating template)
- Completing an instance locally → pushes template with new due date
- Creating instances locally (from completion) → no push

---

## Section (Column) Sync

TickTick calls them "columns," ChoreBot calls them "sections."

### Data Model

**TickTick:**
```json
{
  "id": "column_id_string",
  "name": "Section Name",
  "sortOrder": 100
}
```

**ChoreBot:**
```json
{
  "id": "column_id_string",
  "name": "Section Name",
  "sort_order": 100,
  "person_id": "person.kyle"  // Optional, local-only
}
```

### Sync Behavior

**Pull Sync (TickTick → Local):**

1. GET project data includes `columns[]` array
2. For each TickTick column:
   - Check if section exists locally (by ID)
   - If exists: **merge** TickTick data with local data
   - Update `name` and `sort_order` from TickTick (source of truth for structure)
   - **Preserve `person_id`** from local data (ChoreBot-specific field)
   - If new: create section with TickTick data
3. Sections not in TickTick response → removed locally

**Critical Bug Fix (2025-12-05):**

Previous behavior **replaced sections wholesale**, losing `person_id` assignments on every sync. Current behavior **merges** data:

- TickTick provides: `id`, `name`, `sort_order` (structure/organization)
- Local provides: `person_id` (ChoreBot-specific feature)
- Merge = best of both worlds

**Code:**
```python
# Old (buggy) - lost person_id every sync
sections = [{"id": col["id"], "name": col["name"], ...} for col in columns]

# New (fixed) - preserves person_id
existing_sections_map = {s["id"]: s for s in existing_sections}
sections = []
for col in columns:
    section = existing_sections_map.get(col["id"], {}).copy()  # Start with existing
    section.update({"id": col["id"], "name": col["name"], ...})  # Update with TickTick data
    # person_id preserved if it existed
```

**Push Sync:**

Sections are **not pushed** from ChoreBot to TickTick. TickTick is the source of truth for section structure.

Users must create sections in TickTick, then assign person_id locally via `chorebot.manage_section` service.

---

## Conflict Resolution

### Etag-Based Change Detection

**Concept:** TickTick provides an `etag` (entity tag) field on each task. Changes increment the etag.

**Process:**
1. Store last known etag in `task.sync["ticktick"]["etag"]`
2. During pull sync, compare remote etag vs stored etag
3. If different → remote changed, update local
4. If same → no remote changes, skip update

**Benefits:**
- Avoids unnecessary updates
- Efficient (no full object comparison)
- Standard HTTP pattern

### Conflict Scenarios

#### 1. **Both Local and Remote Modified**

**Detection:** Task has `pending_push` or `push_failed` status AND remote etag changed

**Resolution:** **Local wins** - skip remote update, push local changes

**Rationale:** User's most recent action (local) should take precedence

**Code:**
```python
if sync_status in ["pending_push", "push_failed"]:
    _LOGGER.debug("Skipping task '%s' - local has %s status", task.summary, sync_status)
    continue  # Don't apply remote changes
```

#### 2. **Local Push Failed, Remote Changed**

**Detection:** Task has `push_failed` status AND remote etag changed

**Resolution:** Retry push during next sync (local still wins)

**Rationale:** Local represents user's intent; remote changes may be stale

#### 3. **Remote Completed, Local Modified**

**Detection:** Task missing from bulk query (completed) AND local has pending changes

**Resolution:** Push local changes first, then mark completed

**Edge Case:** Rare; usually local completion happens before remote

#### 4. **Remote Deleted, Local Modified**

**Detection:** Task returns 404 on individual fetch AND local has pending changes

**Resolution:** Local soft-deletes (remote wins on existence)

**Rationale:** Deletion is a strong signal; recreating would cause confusion

---

### Most Recent Modified Wins (with Local Bias)

**Secondary Strategy:** When etag comparison isn't sufficient

**Process:**
1. Compare `modified` timestamps
2. If remote newer → apply remote changes
3. If local newer → skip remote changes (push local)
4. If equal → local wins (bias toward user's system)

**Local Bias Rationale:**
- User sees local changes immediately (optimistic updates)
- Local state reflects user's most recent intent
- Better UX to preserve local changes when timestamps tie

---

## Error Handling

### Push Failures

**Types:**
- Network errors (timeout, connection refused)
- Authentication errors (expired token)
- TickTick API errors (400/500 responses)
- Validation errors (malformed data)

**Handling:**
1. Log error with full context (task summary, error message)
2. Mark task in sync metadata: `status: "push_failed"`
3. Continue processing other tasks
4. Retry automatically during next pull sync

**Retry Logic:**
```python
# During pull sync, before fetching remote changes
failed_tasks = [t for t in local_tasks if t.sync.get("ticktick", {}).get("status") == "push_failed"]
for task in failed_tasks:
    _LOGGER.debug("Retrying failed push: %s", task.summary)
    await self.async_push_task(list_id, task)
```

**Manual Recovery:**
- User can trigger `chorebot.sync` to force retry
- Failed tasks remain visible and functional locally
- No data loss; changes queued until successful push

---

### Pull Failures

**Types:**
- Network errors
- TickTick service unavailable
- Malformed response data
- Missing expected fields

**Handling:**
1. Log error with context
2. Abort pull sync for that list
3. Return empty statistics (`{"created": 0, "updated": 0, "deleted": 0}`)
4. Leave local data unchanged
5. Next periodic sync retries automatically

**Safety:**
- Lock prevents concurrent pulls
- Exceptions caught at coordinator level
- Local data never corrupted by failed pulls

---

### OAuth Token Expiry

**Detection:** 401 Unauthorized response from TickTick API

**Handling:**
1. `AsyncConfigEntryAuth` automatically refreshes token
2. Retry API call with new token
3. If refresh fails → log error, fail sync
4. User must re-authenticate via HA config flow

**Token Refresh Process:**
1. HA's OAuth2Session detects expired token
2. Makes token refresh request to TickTick
3. Updates stored tokens in config entry
4. Returns new access token to client
5. All automatic, transparent to user

---

## Optimization Strategies

### 1. **Bulk Fetching**

**Strategy:** Fetch all tasks for a project in one API call

**Benefit:** Reduces API calls from N (one per task) to 1 per project

**Trade-off:** Completed tasks not included; requires individual fetches to distinguish completed vs deleted

### 2. **Etag Caching**

**Strategy:** Store last known etag, skip updates if unchanged

**Benefit:** Reduces unnecessary data processing and storage writes

**Implementation:**
```python
remote_etag = tt_task.get("etag")
last_etag = task.sync.get("ticktick", {}).get("etag")
if remote_etag == last_etag:
    continue  # No changes
```

### 3. **Completed Task Optimization**

**Problem:** TickTick's bulk API doesn't return completed tasks. Must check each missing task individually (slow).

**Solution:** Skip individual checks for tasks already marked completed locally

**Code:**
```python
if local_task.status == "completed":
    # Already complete locally, no need to check TickTick
    _LOGGER.debug("Skipping completed task '%s'", local_task.summary)
    continue
```

**Benefit:** Reduces API calls by ~50% for typical usage (many completed tasks)

### 4. **Recurring Instance Batching**

**Strategy:** Only sync template + current instance, not all instances

**Benefit:** Prevents O(N) API calls where N = number of instances

**Implementation:** Instances filtered out before push:
```python
if task.is_recurring_instance():
    _LOGGER.debug("Skipping sync for recurring instance")
    return True  # Silent skip
```

### 5. **Lock-Based Sync Serialization**

**Strategy:** Use `asyncio.Lock` to prevent overlapping sync operations

**Benefit:**
- Prevents race conditions
- Avoids duplicate API calls
- Maintains data consistency

**Implementation:**
```python
if self._sync_in_progress:
    _LOGGER.warning("Sync already in progress, skipping")
    return {"created": 0, "updated": 0, "deleted": 0}

async with self._lock:
    self._sync_in_progress = True
    try:
        # Perform sync
    finally:
        self._sync_in_progress = False
```

---

## Known Limitations

### 1. **Completed Task Handling**

**Issue:** TickTick's `/project/{id}/data` endpoint does NOT return completed tasks.

**Impact:** Must make individual API calls to check each missing task (completed vs deleted).

**Workaround:** Skip tasks already marked completed locally (optimization #3).

**Future:** May cache completed task IDs to avoid repeated checks.

---

### 2. **One-Way Section Sync**

**Issue:** Sections (columns) can only be created in TickTick, not pushed from ChoreBot.

**Impact:** Users must create sections in TickTick first, then assign person_id locally.

**Rationale:** TickTick's project structure is source of truth; ChoreBot extends it.

**Future:** Could support creating sections via TickTick API, but requires careful UX design.

---

### 3. **Recurring Instance Visibility**

**Issue:** Only current active instance syncs to TickTick; historical instances are local-only.

**Impact:**
- TickTick doesn't show full recurrence history
- Users see only "next due" task on TickTick
- Completed instances disappear from TickTick immediately

**Rationale:** Matches TickTick's native recurring model (one task, multiple occurrences).

**Benefit:** Keeps TickTick UI clean; full history available in ChoreBot.

---

### 4. **Metadata Visibility**

**Issue:** ChoreBot metadata (streaks, occurrence_index) stored in TickTick task descriptions.

**Impact:** Visible if user opens task details in TickTick (below `---` delimiter).

**Mitigation:** Metadata clearly marked with `[chorebot:...]` prefix.

**Alternative Considered:** Use TickTick tags (rejected: tags are user-visible lists).

---

### 5. **Sync Interval Granularity**

**Issue:** Minimum sync interval is 1 minute (configurable, default 15 minutes).

**Impact:** Changes on TickTick may take up to 15 minutes to appear in ChoreBot.

**Workaround:** Users can manually trigger `chorebot.sync` for immediate pull.

**Future:** Could implement webhook-based instant sync (TickTick supports webhooks).

---

### 6. **Delete Ambiguity for Completed Tasks**

**Issue:** Cannot distinguish between "completed 31+ days ago" and "deleted" without individual API call.

**Impact:** Old completed tasks imported during initial sync, then archived.

**Workaround:** Skip importing completed tasks older than 30 days:
```python
if tt_task.get("status") == 2:  # Completed
    completed_time = tt_task.get("completedTime", 0)
    if completed_time:
        completed_dt = datetime.fromtimestamp(completed_time / 1000, tz=UTC)
        if datetime.now(UTC) - completed_dt > timedelta(days=30):
            _LOGGER.debug("Skipping old completed task: %s", tt_task["title"])
            continue
```

---

## Troubleshooting

### Enable Debug Logging

Add to `configuration.yaml`:
```yaml
logger:
  default: info
  logs:
    custom_components.chorebot: debug
    custom_components.chorebot.ticktick_backend: debug
    custom_components.chorebot.sync_coordinator: debug
```

### Common Issues & Solutions

#### Issue: "Sync already in progress, skipping"

**Cause:** Overlapping sync operations (manual + periodic)

**Solution:** Wait for current sync to finish (~5-30 seconds)

**Prevention:** Increase sync interval if sync takes longer than interval

---

#### Issue: "Task not found for deletion"

**Cause:** Task already deleted or never synced

**Solution:** Benign; local task soft-deleted regardless

**Prevention:** None needed (normal behavior)

---

#### Issue: "etag changed but no visible changes"

**Cause:** TickTick updated internal fields (e.g., sort order, internal timestamps)

**Solution:** Apply update anyway (etag is authoritative)

**Prevention:** None needed (expected behavior)

---

#### Issue: "Failed to push task: 401 Unauthorized"

**Cause:** OAuth token expired and refresh failed

**Solution:** Re-authenticate via HA config flow (Settings → Devices & Services → ChoreBot → Configure)

**Prevention:** Ensure stable internet connection; check TickTick service status

---

#### Issue: "Section person_id lost after sync"

**Cause:** Old bug (fixed 2025-12-05) where sections replaced instead of merged

**Solution:** Update to latest version; re-assign person_id via `chorebot.manage_section`

**Prevention:** Keep integration updated

---

#### Issue: "Recurring task not creating instances"

**Cause:** Template has rrule but no active instance with due date

**Solution:** Create first instance manually with due date

**Prevention:** Ensure template creation includes first instance (handled automatically)

---

#### Issue: "Completed tasks reappearing"

**Cause:** Remote completion not detected; etag comparison skipped

**Solution:** Verify `last_synced_occurrence_index` exists in template sync metadata

**Debug:**
```
Check template's sync metadata:
{
  "ticktick": {
    "id": "...",
    "etag": "...",
    "last_synced_occurrence_index": 42  // Must exist
  }
}
```

---

### Diagnostic Services

#### Manual Sync Test

```yaml
service: chorebot.sync
data:
  list_id: todo.chorebot_test  # Optional: sync specific list
```

Watch logs for detailed sync flow.

#### Check Sync Status

```yaml
# Check entity state attributes
{{ state_attr('todo.chorebot_test', 'chorebot_tasks') }}
{{ state_attr('todo.chorebot_test', 'chorebot_templates') }}
```

#### View Sync Metadata

```yaml
# Check sync metadata for a task
{{ state_attr('todo.chorebot_test', 'chorebot_tasks')[0].sync }}
```

Expected output:
```json
{
  "ticktick": {
    "id": "remote_task_id",
    "etag": "abc123",
    "status": "synced",
    "last_synced_at": "2026-01-16T15:30:00Z"
  }
}
```

---

## Summary

ChoreBot's TickTick sync is a **robust, bidirectional integration** with a **local-master model**:

- **Push-first**: Local changes immediately pushed to TickTick (non-blocking)
- **Pull-periodic**: Remote changes pulled every 15 minutes (configurable)
- **Etag-based**: Efficient change detection minimizes API calls and processing
- **Template-focused**: Only templates and current instances sync; history is local-only
- **Conflict-aware**: Local changes always win when conflicts occur
- **Error-resilient**: Failed pushes retry automatically; pull failures don't corrupt data
- **Section-safe**: Preserves local extensions (person_id) while respecting TickTick's structure

**Key Files:**
- `ticktick_api_client.py` - REST API wrapper
- `ticktick_backend.py` - TickTick-specific sync logic
- `sync_coordinator.py` - Generic sync orchestration
- `oauth_api.py` - OAuth token management
- `todo.py` - Entity layer (triggers pushes)
- `__init__.py` - Periodic sync setup

**Next Steps for Enhancement:**
1. Webhook-based instant sync (eliminate polling delay)
2. Batch API operations (reduce individual push calls)
3. Offline queue (persist failed pushes across restarts)
4. Conflict resolution UI (let users choose winner)
5. Sync status dashboard (show pending/failed operations)

---

**Document maintained by:** ChoreBot Development Team  
**Questions?** Check AGENTS.md or open an issue on GitHub
