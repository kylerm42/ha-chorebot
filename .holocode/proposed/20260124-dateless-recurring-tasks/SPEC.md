---
title: Dateless Recurring Tasks
status: implemented
created: 2026-01-24
updated: 2026-01-24
implemented: 2026-01-24
author: AP-5 (Architect/Builder)
priority: high
implementation_complexity: medium
---

# Feature Specification: Dateless Recurring Tasks

## Overview

Enable recurring tasks to operate **without due dates**, spawning identical new instances immediately upon completion. This supports habit-building tasks with no temporal constraints (e.g., "Try a new food", "Practice riding bike") that can be completed repeatedly at any time.

**Current Implementation**: Recurring tasks require `rrule` (for date calculation) and `due` (for first instance). The `rrule` field stores recurrence patterns like `FREQ=DAILY;INTERVAL=1` and is used exclusively to calculate the next due date via `_calculate_next_due_date_from_template()`.

**Key Insight**: For dateless recurring tasks, we don't need date calculation at all. We just need to know "this is a recurring template" and "spawn the next instance immediately upon completion."

**Proposed Approach**: Introduce a new boolean field `is_dateless_recurring` to distinguish dateless recurring templates from date-based recurring templates. This eliminates the need to store a meaningless `rrule` for tasks that don't use date calculations.

---

## Requirements

### Functional Requirements

1. **Task Creation**:
   - Accept new field: `is_dateless_recurring: bool` (default `false`)
   - When `is_dateless_recurring=true`:
     - Create template (hidden, no due date, no rrule, `is_template=true`, `is_dateless_recurring=true`)
     - Create first dateless instance (visible, no due date, `parent_uid` links to template)
   - Mutually exclusive with date-based recurring: Cannot have both `rrule` and `is_dateless_recurring=true`

2. **Completion Behavior**:
   - Upon marking dateless instance complete:
     - Update template's streak (always increments—no "late" concept)
     - Award points + streak bonuses normally
     - Immediately spawn next dateless instance with `occurrence_index + 1`
   - Completed instances remain visible until midnight (consistent with existing behavior)

3. **Streak Tracking**:
   - Dateless tasks **always increment streak** (no concept of "on-time")
   - Track `streak_current` and `streak_longest` on template
   - Award streak bonuses at configured intervals normally

4. **UI/UX**:
   - Dateless instances display **without due date badges** but **with recurring icon** (🔁 circular arrows)
   - Edit dialog radio button: "Repeat?" with options:
     - "None" (default - regular one-time task)
     - "On a schedule" (existing date-based recurring)
     - "On completion" (NEW - dateless recurring)
   - Clear mutual exclusion in UI: Radio button prevents selecting multiple repeat patterns

### Non-Functional Requirements

1. **Data Integrity**: Maintain existing storage structure (two-array model with templates/tasks)
2. **Backward Compatibility**: Existing date-based recurring tasks continue working unchanged
3. **Sync Compatibility**: Mark dateless recurring templates as local-only (no TickTick sync)
4. **No Data Duplication**: `is_dateless_recurring` field only exists on templates, not instances

---

## Architecture

### Why Not Use `rrule` for Dateless Recurring?

**Current Usage of `rrule`**:

The `rrule` field stores iCalendar recurrence rules (e.g., `FREQ=DAILY;INTERVAL=1`) and is used **exclusively** for calculating the next due date:

```python
# todo.py line 845-893
def _calculate_next_due_date_from_template(self, template: Task, current_due_str: str | None) -> datetime | None:
    if not template.rrule or not current_due_str:
        return None
    
    # Parse rrule and calculate next occurrence from due date
    rule = rrulestr(template.rrule, dtstart=current_due)
    return rule.after(current_due)
```

**Problem with Using `rrule` for Dateless Tasks**:

1. **Semantic Mismatch**: `rrule` defines temporal patterns (daily, weekly, monthly). Dateless tasks have no temporal pattern—they just repeat immediately.
2. **Meaningless Data**: Storing `FREQ=DAILY;INTERVAL=1` for a dateless task is misleading. It's not "daily"—it's "on-demand."
3. **Code Complexity**: Would require special-casing `_calculate_next_due_date_from_template()` to return `None` when detecting dateless, defeating the purpose of using `rrule`.

**Better Approach**: Use a dedicated boolean flag `is_dateless_recurring` to explicitly mark templates that spawn immediately without date calculations.

### Why `is_dateless_recurring` Only on Templates

**User Feedback**: "Is this necessary for the task itself? Or can it just live on the template?"

**Decision**: Field only exists on templates, not instances.

**Rationale**:

1. **Instances can infer their type** from parent template (lookup `template.is_dateless_recurring`)
2. **Prevents data duplication** (N instances don't store same boolean N times)
3. **Single source of truth** (template defines behavior, instances inherit)
4. **Simpler serialization** (fewer fields in task JSON)

**Implementation Strategy**:

```python
# Template
template = Task.create_new(...)
template.is_dateless_recurring = True  # Only set on template

# Instance (infers type from parent)
instance = Task.create_new(parent_uid=template.uid, ...)
# No is_dateless_recurring field needed

# Runtime check (when needed)
if instance.parent_uid:
    template = self._store.get_template(self._list_id, instance.parent_uid)
    is_dateless = template.is_dateless_recurring if template else False
```

---

## Data Model Changes

### Task Schema

**Add new field to Task dataclass** (`task.py`):

```python
@dataclass
class Task:
    # ... existing fields ...
    is_dateless_recurring: bool = False  # True if recurring without due dates (templates only)
```

**Field Semantics**:

- `is_template=true` + `rrule!=None` → **Date-based recurring template** (existing behavior)
- `is_template=true` + `is_dateless_recurring=true` → **Dateless recurring template** (NEW)
- `parent_uid!=None` → **Instance** (infers type from parent template, no `is_dateless_recurring` field)

**Mutual Exclusion Validation**:

Cannot have both `rrule` and `is_dateless_recurring=true` on the same task.

### Storage Changes

**JSON Serialization** (`task.py::to_dict`):

```python
def to_dict(self) -> dict[str, Any]:
    result = { ... }
    
    if self.rrule:
        result[FIELD_RRULE] = self.rrule
    if self.is_dateless_recurring:
        result[FIELD_IS_DATELESS_RECURRING] = self.is_dateless_recurring
    
    return result
```

**Add constant** (`const.py`):

```python
FIELD_IS_DATELESS_RECURRING = "is_dateless_recurring"
```

**JSON Deserialization** (`task.py::from_dict`):

```python
@classmethod
def from_dict(cls, data: dict[str, Any], is_template: bool | None = None) -> Task:
    return cls(
        # ... existing fields ...
        rrule=data.get(FIELD_RRULE),
        is_dateless_recurring=data.get(FIELD_IS_DATELESS_RECURRING, False),
    )
```

### Helper Methods

**Add helper method** (`task.py`):

```python
def is_dateless_recurring_template(self) -> bool:
    """Check if task is a dateless recurring template."""
    return self.is_template and self.is_dateless_recurring
```

**Note**: No `is_dateless_recurring_instance()` helper needed—instances infer type from parent template lookup at runtime.

---

## Implementation Changes

### 1. Task Creation Logic (`todo.py::async_create_task_internal`)

**Current Code** (line 243):

```python
if rrule and due:
    # Create date-based recurring task
```

**Updated Code**:

```python
if rrule and due:
    # Case 1: Date-based recurring (existing logic)
    # Create template with rrule + first instance with due date
    # ... existing code unchanged ...
    
elif is_dateless_recurring:
    # Case 2: Dateless recurring (NEW)
    # Validation: Cannot have both rrule and dateless
    if rrule:
        _LOGGER.error("Cannot create task with both rrule and is_dateless_recurring")
        return
    
    # Create template
    template = Task.create_new(
        summary=summary,
        description=description,
        due=None,
        tags=tags or [],
        rrule=None,  # No rrule for dateless
        is_template=True,
        is_all_day=False,
        section_id=section_id,
        points_value=points_value,
    )
    template.is_dateless_recurring = True  # Mark as dateless (template only)
    template.streak_bonus_points = streak_bonus_points
    template.streak_bonus_interval = streak_bonus_interval
    
    # Create first instance (no is_dateless_recurring field needed)
    first_instance = Task.create_new(
        summary=summary,
        description=description,
        due=None,  # Dateless instance
        tags=(tags or []).copy() if tags else [],
        rrule=None,
        parent_uid=template.uid,
        is_template=False,
        occurrence_index=0,
        is_all_day=False,
        section_id=section_id,
        points_value=points_value,
    )
    
    await self._store.async_add_task(self._list_id, template)
    await self._store.async_add_task(self._list_id, first_instance)
    self.async_write_ha_state()
    
    # DO NOT sync dateless recurring to TickTick (local-only)
    _LOGGER.info("Created dateless recurring task (local-only, no sync)")
    
else:
    # Case 3: Regular one-time task (existing logic)
```

**Add parameter** to function signature:

```python
async def async_create_task_internal(
    self,
    summary: str,
    description: str | None = None,
    due: str | None = None,
    tags: list[str] | None = None,
    rrule: str | None = None,
    is_all_day: bool = False,
    section_id: str | None = None,
    points_value: int = 0,
    streak_bonus_points: int = 0,
    streak_bonus_interval: int = 0,
    is_dateless_recurring: bool = False,  # NEW parameter
) -> None:
```

### 2. Completion Logic (`todo.py::_handle_recurring_instance_completion`)

**Current Code** (line 726-756):

```python
# Check if completed on time
completed_on_time = False
if instance.due:
    # ... date comparison logic ...

# Update streak on template (strict consecutive)
if completed_on_time:
    template.streak_current += 1
    # ...
else:
    template.streak_current = 0
```

**Updated Code**:

```python
# Determine if this is a dateless recurring instance (lookup from template)
is_dateless = template.is_dateless_recurring

if is_dateless:
    # Dateless recurring: Always increment streak (no concept of "late")
    template.streak_current += 1
    template.streak_longest = max(template.streak_longest, template.streak_current)
    _LOGGER.info(
        "Dateless recurring instance completed. Streak: %d", 
        template.streak_current
    )
else:
    # Date-based recurring: Check on-time completion
    completed_on_time = False
    if instance.due:
        due_dt = self._parse_datetime(instance.due)
        if instance.is_all_day:
            now = datetime.now(UTC)
            completed_on_time = due_dt and now.date() <= due_dt.date()
        else:
            now = datetime.now(due_dt.tzinfo if due_dt else None)
            completed_on_time = due_dt and now <= due_dt
    
    if completed_on_time:
        template.streak_current += 1
        template.streak_longest = max(template.streak_longest, template.streak_current)
    else:
        _LOGGER.info("Instance completed late, resetting streak")
        template.streak_current = 0
```

**Next Instance Creation** (line 782-843):

```python
if not next_instance_exists:
    if is_dateless:
        # Dateless: Create identical instance immediately (no due date calculation)
        new_instance = Task.create_new(
            summary=template.summary,
            description=template.description,
            due=None,  # No due date
            tags=template.tags.copy(),
            rrule=None,
            points_value=template.points_value,
            parent_uid=template.uid,
            is_template=False,
            occurrence_index=next_occurrence_index,
            is_all_day=False,
            section_id=template.section_id,
        )
        _LOGGER.info("Created next dateless instance (occurrence %d)", next_occurrence_index)
    else:
        # Date-based: Calculate next due date from rrule (existing logic)
        next_due = self._calculate_next_due_date_from_template(template, instance.due)
        if next_due:
            new_instance = Task.create_new(
                summary=template.summary,
                description=template.description,
                due=next_due.isoformat().replace("+00:00", "Z"),
                tags=template.tags.copy(),
                rrule=None,
                points_value=template.points_value,
                parent_uid=template.uid,
                is_template=False,
                occurrence_index=next_occurrence_index,
                is_all_day=template.is_all_day,
                section_id=template.section_id,
            )
            _LOGGER.info("Created next dated instance: %s", next_due)
        else:
            _LOGGER.warning("Could not calculate next due date")
            # ... existing fallback ...
    
    # Save tasks
    await self._store.async_update_task(self._list_id, instance)
    template.update_modified()
    await self._store.async_update_task(self._list_id, template)
    await self._store.async_add_task(self._list_id, new_instance)
    self.async_write_ha_state()
    
    # Sync only for date-based recurring (dateless is local-only)
    if self._sync_coordinator and not is_dateless:
        await self._sync_coordinator.async_complete_task(self._list_id, template)
        await self._sync_coordinator.async_push_task(self._list_id, template)
```

### 3. Service Definition (`services.yaml`)

**Update `add_task` service**:

```yaml
add_task:
  description: Add a new task to a ChoreBot list
  fields:
    # ... existing fields ...
    rrule:
      description: >
        Recurrence rule in iCalendar RRULE format (e.g., "FREQ=DAILY;INTERVAL=1").
        Requires 'due' to be set. Mutually exclusive with is_dateless_recurring.
      example: "FREQ=DAILY;INTERVAL=1"
    is_dateless_recurring:
      description: >
        Create a recurring task without due dates that spawns a new instance
        immediately upon completion. Mutually exclusive with rrule.
      example: true
      selector:
        boolean:
```

### 4. Service Handler (`__init__.py`)

**Update `handle_add_task` service handler**:

```python
async def handle_add_task(call: ServiceCall) -> None:
    list_id = call.data[CONF_LIST_ID]
    summary = call.data[CONF_TASK_SUMMARY]
    description = call.data.get(CONF_TASK_DESCRIPTION)
    due = call.data.get(CONF_TASK_DUE)
    tags = call.data.get(CONF_TASK_TAGS, [])
    rrule = call.data.get(CONF_TASK_RRULE)
    is_dateless_recurring = call.data.get(CONF_IS_DATELESS_RECURRING, False)  # NEW
    # ... other fields ...
    
    # Validation
    if rrule and is_dateless_recurring:
        _LOGGER.error("Cannot specify both rrule and is_dateless_recurring")
        return
    
    entity = hass.data[DOMAIN]["entities"][list_id]
    await entity.async_create_task_internal(
        summary=summary,
        description=description,
        due=due,
        tags=tags,
        rrule=rrule,
        is_dateless_recurring=is_dateless_recurring,  # NEW
        # ... other parameters ...
    )
```

**Add constant** (`const.py`):

```python
CONF_IS_DATELESS_RECURRING = "is_dateless_recurring"
```

---

## Backend Sync Behavior

### TickTick Compatibility

**Decision**: Mark dateless recurring templates as **local-only** (no sync).

**Rationale**:

1. TickTick's recurrence model requires due dates for calculating next occurrence
2. Dateless recurring is a ChoreBot-specific feature optimized for family/kid use cases
3. Simpler implementation: No need to research/validate TickTick edge cases

**Implementation**:

In `_handle_recurring_instance_completion()`, skip sync for dateless templates:

```python
if self._sync_coordinator and not is_dateless:
    await self._sync_coordinator.async_complete_task(self._list_id, template)
    await self._sync_coordinator.async_push_task(self._list_id, template)
```

**Future Enhancement**: If user feedback demands TickTick sync, investigate mapping to TickTick's "Inbox" recurring tasks (requires Phase 2 research).

---

## Testing Strategy

### Unit Tests

1. **Task Creation**:
   - Test creating dateless recurring task with `is_dateless_recurring=true`
   - Verify template has `is_dateless_recurring=true`, `rrule=None`, `due=None`
   - Verify first instance has `due=None`, `parent_uid` set
   - Test validation: Reject tasks with both `rrule` and `is_dateless_recurring=true`

2. **Completion Logic**:
   - Test completing dateless instance creates next instance immediately
   - Verify streak always increments (no "late" penalty)
   - Verify next instance has correct `occurrence_index`
   - Verify completed instance soft-deletes at midnight (existing job)

3. **Points/Rewards**:
   - Test points awarded on completion
   - Test streak bonuses awarded at intervals
   - Test rapid completions (10 in 1 minute) award correct points/bonuses

4. **Serialization**:
   - Test `to_dict()` includes `is_dateless_recurring` when `true`
   - Test `from_dict()` correctly loads `is_dateless_recurring`

### Integration Tests

1. **Service Calls**:
   - Test `chorebot.add_task` with `is_dateless_recurring: true`
   - Test service validation rejects both `rrule` and `is_dateless_recurring`

2. **UI Flow** (Manual):
   - Create dateless recurring task via frontend (Phase 2)
   - Complete task, verify new instance appears immediately
   - Verify completed task soft-deletes at midnight

3. **Sync Behavior**:
   - Verify dateless templates do NOT sync to TickTick
   - Verify log message: "Created dateless recurring task (local-only, no sync)"

---

## Implementation Phases

### Phase 1: Core Backend Support (High Priority)

**Files to Modify**:

1. `custom_components/chorebot/const.py`:
   - Add `FIELD_IS_DATELESS_RECURRING = "is_dateless_recurring"`
   - Add `CONF_IS_DATELESS_RECURRING = "is_dateless_recurring"`

2. `custom_components/chorebot/task.py`:
   - Add `is_dateless_recurring: bool = False` field to Task dataclass
   - Update `to_dict()` to serialize `is_dateless_recurring`
   - Update `from_dict()` to deserialize `is_dateless_recurring`
   - Add helper method `is_dateless_recurring_template()`

3. `custom_components/chorebot/todo.py`:
   - Update `async_create_task_internal`: Add `is_dateless_recurring` parameter
   - Add dateless creation logic (template + instance without due dates)
   - Update `_handle_recurring_instance_completion`: Always increment streak for dateless
   - Update next instance creation: No date calculation for dateless
   - Skip sync for dateless templates

4. `custom_components/chorebot/__init__.py`:
   - Update `handle_add_task`: Add `is_dateless_recurring` parameter
   - Add validation: Reject both `rrule` and `is_dateless_recurring`

5. `custom_components/chorebot/services.yaml`:
   - Add `is_dateless_recurring` field to `add_task` service
   - Update descriptions for mutual exclusion

**Success Criteria**:

- Can create dateless recurring tasks via service call
- Completion creates next instance immediately (no date calculation)
- Streak tracking increments on every completion
- Points/bonuses awarded normally
- No TickTick sync for dateless templates

### Phase 2: Frontend Enhancement (Lower Priority)

**Files to Modify** (in `ha-chorebot-cards` repository):

1. `src/utils/dialog-utils.ts`:
   - Replace checkbox with radio button group: "Repeat?"
   - Options: "None" (default), "On a schedule" (existing), "On completion" (NEW)
   - When "On completion" selected, set `is_dateless_recurring: true` and clear `rrule`
   - When "On a schedule" selected, show recurrence rule picker

2. `src/grouped-card.ts`, `src/list-card.ts`, `src/person-grouped-card.ts`:
   - Pass `is_dateless_recurring` to `chorebot.add_task` service when creating tasks
   - Display recurring icon (🔁) for instances with `parent_uid`, even if `due=None`

**UI Mockup**:

```
Repeat?
( ) None
( ) On a schedule
    [Recurrence picker appears when selected]
(•) On completion
    ⓘ Creates a new instance every time you complete this task
```

**Success Criteria**:

- User can select "On completion" to create dateless recurring tasks
- Radio buttons are mutually exclusive (clear UX)
- Dateless recurring instances display recurring icon (🔁) without due date badge

### Phase 3: TickTick Sync (Optional Future Work)

**Research Required**:

- Test TickTick's behavior with recurring tasks without due dates
- Validate edge cases (completion, editing, deletion)
- Map ChoreBot's dateless model to TickTick's equivalent

**Decision Point**: Only pursue if user feedback indicates strong demand for syncing dateless tasks to TickTick.

---

## Security & Performance Considerations

### Security

- **No new attack surface**: Uses existing task creation/completion logic
- **Anti-farming protection**: Uncompleting instance still disassociates from template (existing behavior)
- **Validation**: Mutual exclusion prevents invalid state (`rrule` + `is_dateless_recurring`)

### Performance

- **Minimal impact**: Dateless instance creation skips date calculation (faster than date-based)
- **No additional queries**: Uses existing `get_instances_for_template` duplicate check
- **Archive optimization**: Dateless completed instances archive after 30 days (same as dated)

### Edge Cases

1. **Rapid completion farming**:
   - User completes task 100 times in 1 minute
   - **Behavior**: Creates 100 instances, awards points for each, awards bonuses at intervals
   - **Not exploitable**: Points scale linearly with legitimate completions (no unintended multipliers)

2. **Uncomplete → Recomplete loop**:
   - **Mitigation**: Existing disassociation logic prevents farming (instance becomes orphaned after uncomplete)

3. **Converting dated recurring to dateless**:
   - **Not supported in Phase 1**: Would require deleting template + instances and recreating
   - **Future enhancement**: Add conversion logic if user feedback demands it

---

## Migration & Backward Compatibility

**No migration required**: New field `is_dateless_recurring` defaults to `false` for all existing tasks.

**Backward Compatibility**:

- Existing date-based recurring tasks unaffected (use `rrule` as before)
- Existing regular tasks unaffected (`is_dateless_recurring=false` by default)
- Storage format remains compatible (new field is optional in JSON)

---

## User Feedback Incorporated

### 1. Recurring Icon Display

**Feedback**: "Just want to add that they should still show the icon for recurring tasks. Not sure what it's called, but it's a circle with arrows"

**Implementation**: Dateless instances will display the recurring icon (🔁 circular arrows) in the UI, even without a due date badge. This maintains visual consistency and clearly indicates the task is part of a recurring series.

**Frontend Changes**:
- Check for `parent_uid` to determine if task is a recurring instance
- Display recurring icon regardless of `due` field value
- Position icon where recurrence badge normally appears

### 2. Template-Only Field

**Feedback**: "Is this necessary for the task itself? Or can it just live on the template? I'm trying to prevent duplication as much as possible."

**Implementation**: `is_dateless_recurring` field **only exists on templates**, not instances. Instances infer their type by looking up their parent template at runtime.

**Benefits**:
- Eliminates data duplication (N instances don't store same boolean N times)
- Single source of truth (template defines behavior)
- Simpler serialization (fewer fields in instance JSON)

### 3. Radio Button UX

**Feedback**: "I think having a 'Repeat?' radio button input would be a better UX. We could have 'None' (default), 'On a schedule' (existing pattern), and 'On completion' (new pattern)"

**Implementation**: Replace checkbox-based UI with radio button group:

```
Repeat?
( ) None               ← Regular one-time task
( ) On a schedule      ← Date-based recurring (existing)
(•) On completion      ← Dateless recurring (NEW)
```

**Benefits**:
- Clearer mutual exclusion (only one option selectable)
- More intuitive than checkboxes with validation errors
- Better discoverability of new feature

---

## Success Metrics

1. **Functional**: Dateless recurring tasks create next instance immediately upon completion
2. **Data Integrity**: No orphaned instances, no streak data duplication, no invalid state
3. **User Experience**: Kids can complete habit tasks repeatedly without due date constraints
4. **Simplicity**: No meaningless `rrule` data stored for dateless tasks
5. **Performance**: Dateless completion faster than dated (skips date calculation)
6. **Visual Clarity**: Recurring icon (🔁) displays on dateless instances for clear UI feedback

---

## References

- Existing recurring task implementation: `todo.py` lines 711-844
- Task creation: `todo.py` lines 221-308
- Points/rewards system: `people.py`, `todo.py` lines 584-688
- Storage model: `store.py`, two-array structure with templates/tasks separation
- User feedback: Plan approval notes (2026-01-24)
