# Technical Specification: Standardize Task Field Locations

**Created:** 2025-11-22  
**Status:** Planned  
**Priority:** High (Blocking points badge display bug)

---

## 1. Overview

**Purpose:** Eliminate confusion about field locations by serializing all Task dataclass fields to root level in JSON, making `custom_fields` truly empty (deprecated) and `sync` exclusively for backend-specific metadata.

**Current Problem:** ChoreBot dataclass fields are split between root level and `custom_fields` in JSON serialization, forcing frontend to check both locations. This causes bugs like the points badge not displaying.

**Root Cause of Points Badge Bug:** The `_renderPointsBadge()` method only checks `task.points_value` (root level), but the backend serializes it to `custom_fields.points_value`, so the badge never renders.

---

## 2. Requirements

- [ ] All Task dataclass fields serialize to root level in JSON
- [ ] `custom_fields` is deprecated and should always be empty for new saves
- [ ] Backend-specific metadata goes exclusively in `sync.<backend_name>` dict
- [ ] Backward compatibility: `from_dict()` reads from all locations during migration
- [ ] Update TypeScript interfaces to match new structure
- [ ] Update AGENTS.md documentation
- [ ] Fix points badge rendering bug

---

## 3. Current vs. Target Structure

### Current Structure (Broken)
```json
{
  "uid": "fc795b37-1116-4371-8bde-b153c4cc4b64",
  "summary": "TT Normal",
  "status": "needs_action",
  "created": "2025-11-22T16:06:52.371906Z",
  "modified": "2025-11-22T23:07:28.959761Z",
  "custom_fields": {
    "points_value": 10,
    "section_id": "6921df52b109650d8b9ca4c6"
  },
  "sync": {
    "ticktick": {
      "id": "6921df25b109650d8b9ca4a8",
      "status": "synced",
      "etag": "95nkftxv",
      "last_synced_at": "2025-11-22T23:07:29.316525Z"
    }
  }
}
```

### Target Structure (Clean)
```json
{
  "uid": "fc795b37-1116-4371-8bde-b153c4cc4b64",
  "summary": "TT Normal",
  "status": "needs_action",
  "created": "2025-11-22T16:06:52.371906Z",
  "modified": "2025-11-22T23:07:28.959761Z",
  "points_value": 10,
  "section_id": "6921df52b109650d8b9ca4c6",
  "sync": {
    "ticktick": {
      "id": "6921df25b109650d8b9ca4a8",
      "status": "synced",
      "etag": "95nkftxv",
      "last_synced_at": "2025-11-22T23:07:29.316525Z"
    }
  }
}
```

**Key Changes:**
- All ChoreBot fields at root level
- `custom_fields` key removed entirely (or empty object)
- `sync` dict exclusively for backend-specific metadata (TickTick IDs, etags, sync status, etc.)

---

## 4. Architecture & Design

### Data Model Layers

1. **Task Dataclass Fields (Root Level in JSON)**
   - Core HA fields: `uid`, `summary`, `status`, `created`, `modified`, `due`, `description`, `deleted_at`
   - ChoreBot features: `tags`, `rrule`, `points_value`, `streak_bonus_points`, `streak_bonus_interval`
   - Recurrence: `parent_uid`, `occurrence_index`, `is_template`
   - Streak tracking: `streak_current`, `streak_longest`, `last_completed`
   - Organization: `section_id`, `is_all_day`

2. **Sync Metadata (Backend-Specific, in `sync` Dict)**
   - TickTick: `sync.ticktick.id`, `sync.ticktick.etag`, `sync.ticktick.status`, `sync.ticktick.last_synced_at`
   - Todoist (future): `sync.todoist.id`, `sync.todoist.version`, etc.
   - This is per-backend, allowing multi-backend sync

3. **Deprecated: `custom_fields`**
   - Should always be empty or absent in new saves
   - Read during `from_dict()` for backward compatibility only

---

## 5. Implementation Plan

### Phase 1: Backend Serialization (task.py)

**File:** `custom_components/chorebot/task.py`  
**Lines to modify:** 96-213 (`to_dict()` and `from_dict()` methods)

#### Step 1.1: Update `to_dict()` Method

**Current behavior:** Puts ChoreBot fields in `custom_fields` dict  
**Target behavior:** Put all dataclass fields at root level

```python
def to_dict(self) -> dict[str, Any]:
    """Convert task to dictionary for JSON storage.
    
    All dataclass fields are serialized to root level.
    Backend-specific metadata goes in the sync dict.
    """
    result: dict[str, Any] = {
        "uid": self.uid,
        "summary": self.summary,
        "status": self.status,
        "created": self.created,
        "modified": self.modified,
    }
    
    # Add optional standard fields
    if self.description:
        result["description"] = self.description
    if self.due:
        result["due"] = self.due
    if self.deleted_at:
        result["deleted_at"] = self.deleted_at
    
    # Add ChoreBot-specific fields at root level (not in custom_fields)
    if self.tags:
        result["tags"] = self.tags
    if self.rrule:
        result["rrule"] = self.rrule
    if self.streak_current > 0:
        result["streak_current"] = self.streak_current
    if self.streak_longest > 0:
        result["streak_longest"] = self.streak_longest
    if self.last_completed:
        result["last_completed"] = self.last_completed
    if self.points_value > 0:
        result["points_value"] = self.points_value
    if self.streak_bonus_points > 0:
        result["streak_bonus_points"] = self.streak_bonus_points
    if self.streak_bonus_interval > 0:
        result["streak_bonus_interval"] = self.streak_bonus_interval
    if self.parent_uid:
        result["parent_uid"] = self.parent_uid
        # Always store occurrence_index for instances (even if 0)
        result["occurrence_index"] = self.occurrence_index
    if self.is_all_day:
        result["is_all_day"] = self.is_all_day
    if self.section_id:
        result["section_id"] = self.section_id
    
    # Backend-specific sync metadata
    if self.sync:
        result["sync"] = self.sync
    
    # Deprecated: custom_fields should be empty for new saves
    # Only include if there's legacy data (will be migrated away over time)
    if self.custom_fields:
        result["custom_fields"] = self.custom_fields
    
    return result
```

#### Step 1.2: Update `from_dict()` Method (Backward Compatible)

**Current behavior:** Only reads from `custom_fields`  
**Target behavior:** Read from root first, fallback to `custom_fields` for migration

```python
@classmethod
def from_dict(cls, data: dict[str, Any], is_template: bool | None = None) -> Task:
    """Create task from dictionary (JSON storage).
    
    Reads from root level first, falls back to custom_fields for backward compatibility.
    
    Args:
        data: Task data dictionary
        is_template: Override to set template status (inferred from storage location).
                    If None, falls back to reading from custom_fields/root.
    """
    custom_fields = data.get("custom_fields", {})
    
    # Helper function: read from root level first, fallback to custom_fields
    def get_field(field_name: str, default=None):
        """Read field from root, fallback to custom_fields (backward compat)."""
        return data.get(field_name, custom_fields.get(field_name, default))
    
    # Determine template status
    template_value = (
        is_template
        if is_template is not None
        else get_field("is_template", False)
    )
    
    # Extract known ChoreBot fields (for custom_fields cleanup)
    known_chorebot_fields = {
        "tags", "rrule", "streak_current", "streak_longest", "last_completed",
        "points_value", "streak_bonus_points", "streak_bonus_interval",
        "parent_uid", "is_template", "occurrence_index", "is_all_day", "section_id"
    }
    
    # Only preserve truly unknown fields in custom_fields (will be empty for new data)
    remaining_custom_fields = {
        k: v for k, v in custom_fields.items() 
        if k not in known_chorebot_fields
    }
    
    return cls(
        uid=data["uid"],
        summary=data["summary"],
        description=data.get("description"),
        status=data["status"],
        due=data.get("due"),
        created=data["created"],
        modified=data["modified"],
        deleted_at=data.get("deleted_at"),
        tags=get_field("tags", []),
        rrule=get_field("rrule"),
        streak_current=get_field("streak_current", 0),
        streak_longest=get_field("streak_longest", 0),
        last_completed=get_field("last_completed"),
        points_value=get_field("points_value", 0),
        streak_bonus_points=get_field("streak_bonus_points", 0),
        streak_bonus_interval=get_field("streak_bonus_interval", 0),
        parent_uid=get_field("parent_uid"),
        is_template=template_value,
        occurrence_index=get_field("occurrence_index", 0),
        is_all_day=get_field("is_all_day", False),
        section_id=get_field("section_id"),
        custom_fields=remaining_custom_fields,  # Deprecated, will be empty for new data
        sync=data.get("sync", {}),
    )
```

---

### Phase 2: Frontend Types (types.ts)

**File:** `src/utils/types.ts`  
**Lines to modify:** 42-68 (Task interface)

#### Step 2.1: Simplify Task Interface

Remove field duplication from `custom_fields`:

```typescript
export interface Task {
  uid: string;
  summary: string;
  status: "needs_action" | "completed";
  due?: string;
  description?: string;
  
  // ChoreBot core fields (always at root level)
  tags?: string[];
  rrule?: string;
  last_completed?: string;
  parent_uid?: string;
  occurrence_index?: number;
  is_all_day?: boolean;
  section_id?: string;
  
  // Points system fields (always at root level)
  points_value?: number;
  streak_bonus_points?: number;
  streak_bonus_interval?: number;
  
  // Deprecated: custom_fields should always be empty for new tasks
  // Only present for backward compatibility during migration
  custom_fields?: {
    [key: string]: any;  // Should be empty object or absent
  };
}
```

#### Step 2.2: Add Sync Metadata Interface

Document the sync structure:

```typescript
// Backend-specific sync metadata
export interface SyncMetadata {
  [backend: string]: {
    id: string;              // Remote task ID
    status: string;          // "synced", "pending", "error"
    etag?: string;           // Backend-specific version/etag
    last_synced_at?: string; // ISO timestamp
    [key: string]: any;      // Backend-specific fields
  };
}

// Update Task interface to include sync
export interface Task {
  // ... existing fields ...
  sync?: SyncMetadata;
}
```

---

### Phase 3: Update Frontend Access Patterns

**Files:** `src/main.ts`, `src/grouped-card.ts`  
**Lines to modify:** Badge rendering and any other field access

#### Step 3.1: Simplify Points Badge Rendering

**File:** `src/main.ts` (lines 302-331), `src/grouped-card.ts` (lines 515-544)

**Before (checks both locations):**
```typescript
private _renderPointsBadge(task: Task) {
  const pointsValue = task.points_value || task.custom_fields?.points_value || 0;
  // ... more fallback logic
}
```

**After (only root level):**
```typescript
private _renderPointsBadge(task: Task) {
  // Don't show if points disabled or task has no points
  if (!this._config?.show_points || !task.points_value) {
    return html``;
  }

  // Check if this is a recurring task with upcoming bonus
  const entity = this.hass?.states[this._config.entity];
  const templates = entity?.attributes.chorebot_templates || [];

  if (
    task.parent_uid &&
    task.streak_bonus_points &&
    task.streak_bonus_interval
  ) {
    const template = templates.find((t: any) => t.uid === task.parent_uid);
    if (template) {
      const nextStreak = template.streak_current + 1;
      if (nextStreak % task.streak_bonus_interval === 0) {
        // Next completion will award bonus!
        return html`<span class="points-badge bonus-pending">
          +${task.points_value} + ${task.streak_bonus_points} pts
        </span>`;
      }
    }
  }

  // Regular points badge
  return html`<span class="points-badge">+${task.points_value} pts</span>`;
}
```

#### Step 3.2: Audit Other Field Access

Search for any other places accessing fields from `custom_fields`:

```bash
# Find all custom_fields access in frontend
grep -r "custom_fields\." src/
```

Update all instances to read from root level only.

---

### Phase 4: Update Documentation

**File:** `AGENTS.md`  
**Lines to modify:** 56 (custom_fields comment), add new storage architecture section

#### Step 4.1: Update Field Documentation

**Current (line 56):**
```markdown
custom_fields: dict[str, Any] = field(default_factory=dict) # Backend-specific metadata
```

**Updated:**
```markdown
custom_fields: dict[str, Any] = field(default_factory=dict) # DEPRECATED: Should always be empty. Kept for backward compatibility only.
sync: dict[str, dict[str, Any]] = field(default_factory=dict) # Backend-specific metadata (TickTick IDs, etags, sync status)
```

#### Step 4.2: Add Storage Architecture Section

Add after line 300 in AGENTS.md:

```markdown
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

**Deprecated: `custom_fields`**
- Should always be empty or absent in new saves
- Only read during deserialization for backward compatibility
- Will be naturally phased out as tasks are updated
```

---

## 6. Migration Strategy

### Automatic Migration (No User Action Required)

1. **Reading Old Data:**
   - `from_dict()` reads from both root and `custom_fields`
   - No data loss, all existing tasks load correctly

2. **Writing New Data:**
   - `to_dict()` writes all fields to root level
   - `custom_fields` is omitted (or empty)

3. **Natural Phaseout:**
   - As tasks are updated (completed, edited, synced), they're re-saved with new format
   - Old format gradually disappears from storage
   - No manual migration script needed

### Storage File Impact

**Before:**
```json
{
  "version": 1,
  "minor_version": 1,
  "key": "chorebot_list_id",
  "data": {
    "tasks": [
      {
        "uid": "...",
        "summary": "Task",
        "custom_fields": {
          "points_value": 10,
          "section_id": "..."
        }
      }
    ]
  }
}
```

**After:**
```json
{
  "version": 1,
  "minor_version": 1,
  "key": "chorebot_list_id",
  "data": {
    "tasks": [
      {
        "uid": "...",
        "summary": "Task",
        "points_value": 10,
        "section_id": "..."
      }
    ]
  }
}
```

---

## 7. Testing Plan

### Unit Tests

1. **Serialization Tests:**
   - Test `to_dict()` puts all fields at root level
   - Test `custom_fields` is empty or absent
   - Test `sync` dict is preserved

2. **Deserialization Tests:**
   - Test reading old format (fields in `custom_fields`)
   - Test reading new format (fields at root)
   - Test reading mixed format (some root, some custom_fields)

3. **Backward Compatibility:**
   - Test that old storage files still load correctly
   - Test that loaded tasks can be re-saved in new format

### Integration Tests

1. **Points Badge Display:**
   - Create task with `points_value: 10`
   - Verify badge shows "+10 pts"
   - Test bonus badge shows "+10 + 50 pts"

2. **Field Access:**
   - Test all ChoreBot fields accessible from root level
   - Test tags, section_id, parent_uid, etc.
   - Test recurring task logic works

3. **Sync Operations:**
   - Test TickTick sync preserves metadata in `sync.ticktick`
   - Test sync metadata not mixed with ChoreBot fields

### Manual Testing

1. **Existing Installation:**
   - Backup `.storage/chorebot_list_*.json` files
   - Apply changes
   - Restart HA
   - Verify all tasks display correctly
   - Complete a task, verify it re-saves in new format

2. **Fresh Installation:**
   - Create new list
   - Add task with points
   - Inspect JSON file, verify root-level structure

---

## 8. Rollback Plan

If issues arise:

1. **Revert Python changes:**
   - `git revert` the task.py changes
   - Restart HA

2. **Data is safe:**
   - No data is deleted, only moved
   - Old format is still readable
   - Worst case: fields duplicated in both locations (harmless)

---

## 9. Success Criteria

- [ ] All dataclass fields serialize to root level
- [ ] Points badge displays correctly
- [ ] No frontend code checks `custom_fields` for known fields
- [ ] Old storage files load without errors
- [ ] New saves use clean root-level structure
- [ ] Documentation updated
- [ ] No regressions in sync functionality

---

## 10. Timeline Estimate

**Total: 2-3 hours**

- Phase 1 (Backend): 45 minutes
- Phase 2 (Frontend Types): 15 minutes
- Phase 3 (Frontend Code): 30 minutes
- Phase 4 (Documentation): 15 minutes
- Testing: 30-45 minutes

---

## 11. Notes

- This is a **low-risk refactor** with automatic migration
- No breaking changes for users (backward compatible)
- Fixes the immediate points badge bug
- Improves code clarity and maintainability
- Aligns storage format with Python dataclass structure
- Prepares for future multi-backend sync (clean separation of concerns)
