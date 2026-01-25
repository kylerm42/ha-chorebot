---
title: Per-Instance Streak Display
status: implemented
created: 2026-01-25
updated: 2026-01-25
author: AP-5 (Architect)
complexity: simple-to-moderate
estimated_effort: 1-2 hours
files_affected:
  - custom_components/chorebot/task.py
  - custom_components/chorebot/todo.py
  - frontend/src/utils/types.ts
  - frontend/src/grouped-card.ts
  - frontend/src/person-grouped-card.ts
related_issues: []
---

# Per-Instance Streak Display

## Problem Statement

All recurring task instances currently display the same streak value (the template's current streak) instead of showing their individual position in the streak progression. This occurs because instances reference their parent template's `streak_current` field dynamically, rather than capturing the streak value at instance creation time.

**Example of Current Broken Behavior:**
```
User has "Eat new food" daily task with streak = 2
- Instance from 3 days ago: Shows 🔥2
- Instance from 2 days ago: Shows 🔥2  
- Today's instance: Shows 🔥2

Expected: Each should show different values (0, 1, 2)
```

## Requirements

### Functional Requirements

1. Each recurring task instance must display its own streak value
2. Streak value represents the template's streak at the time the instance was created
3. After a streak reset, old instances should NOT display their stale streak indicators
4. First instance (streak_when_created = 0) should not display an indicator
5. Display logic must work correctly for both date-based and dateless recurring tasks

### Technical Requirements

1. Add `streak_when_created` field to Task data model
2. Snapshot template's `streak_current` when creating instances
3. Update frontend to display instance's snapshot instead of template's current value
4. Implement smart hiding logic for stale/invalid streak indicators
5. Ensure backward compatibility (existing instances without field)

## Architecture

### Data Model Changes

**Add to `Task` dataclass:**
```python
streak_when_created: int = 0  # Template's streak_current when this instance was created
```

This field:
- Stores immutable snapshot of template's streak at instance creation time
- Defaults to 0 for non-recurring tasks and legacy instances
- Serializes to root level (not custom_fields)
- Only populated for recurring instances (regular tasks remain 0)

### Instance Creation Snapshot Points

Instances are created in three locations. Each must snapshot the template's current streak:

1. **Initial instance creation** (`async_create_task_internal`, line 262-274)
   - When user creates new recurring task with rrule
   - Snapshot: `first_instance.streak_when_created = 0` (template starts at 0)

2. **Date-based next instance** (`_handle_recurring_instance_completion`, line 866-884)
   - After completing instance, create next occurrence based on rrule
   - Snapshot: `new_instance.streak_when_created = template.streak_current` (after increment)

3. **Dateless next instance** (`_handle_recurring_instance_completion`, line 849-863)
   - After completing dateless instance, create next occurrence immediately
   - Snapshot: `new_instance.streak_when_created = template.streak_current` (after increment)

### Display Logic (Frontend)

**Current Logic (Broken):**
```typescript
const template = templates.find(t => t.uid === task.parent_uid);
if (template?.streak_current > 0) {
  return html`🔥 ${template.streak_current}`;
}
```

**New Logic (Fixed):**
```typescript
const template = templates.find(t => t.uid === task.parent_uid);

// Show indicator if:
// 1. Instance has a streak value captured at creation
// 2. AND that value is still valid (part of active streak)
if (
  task.streak_when_created > 0 && 
  task.streak_when_created <= (template?.streak_current || 0)
) {
  return html`🔥 ${task.streak_when_created}`;
}
```

**Display Conditions Explained:**

- `streak_when_created > 0`: Excludes first instance and regular tasks
- `streak_when_created <= template.streak_current`: Excludes instances from broken streaks

**Visual Behavior Examples:**

*Active Streak (template.streak_current = 3):*
- Instance 0: streak_when_created=0 → Hidden (no indicator)
- Instance 1: streak_when_created=1 → Shows 🔥1
- Instance 2: streak_when_created=2 → Shows 🔥2
- Instance 3: streak_when_created=3 → Shows 🔥3 (latest)

*After Reset (template.streak_current = 0):*
- Instance 0-3: All hidden (streak_when_created > 0)
- Instance 4: streak_when_created=0 → Hidden (fresh start, no streak yet)

*Rebuilding Streak (template.streak_current = 2):*
- Instance 4: streak_when_created=0 → Hidden
- Instance 5: streak_when_created=1 → Shows 🔥1
- Instance 6: streak_when_created=2 → Shows 🔥2
- Old Instance 1: streak_when_created=1 → Hidden (completed, soft-deleted)
- Old Instance 3: streak_when_created=3 → Hidden if still visible (3 > 2)

### Streak Reset Integration

**Existing Reset Mechanisms (No Changes Needed):**

1. **Immediate Reset** (`_handle_recurring_instance_completion`, line 816-819):
   - Late completion → `template.streak_current = 0`
   - Next instance created with `streak_when_created = 0`

2. **Daily Midnight Reset** (`_daily_maintenance`, line 951-973):
   - Overdue incomplete instance → `template.streak_current = 0`
   - Next instance (when created) will have `streak_when_created = 0`

3. **Dateless Recurring Tasks**:
   - No automatic resets (intentional design)
   - Streak accumulates unbounded
   - Only reset via anti-farming disassociation

**Why No Backend Changes to Reset Logic:**

The snapshot approach preserves historical data without retroactive mutation. When a streak resets, old instances keep their original `streak_when_created` values, and the display logic handles hiding them. This is cleaner than retroactively modifying instance data.

## Implementation Tasks

### Phase 1: Backend - Data Model (Estimated: 30 minutes)

**File: `custom_components/chorebot/task.py`**

1. Add field to dataclass (after `occurrence_index`, line 51):
   ```python
   streak_when_created: int = 0  # Template streak when instance was created
   ```

2. Include in serialization (`to_dict` method, line 97-150):
   ```python
   if self.streak_when_created > 0:
       result["streak_when_created"] = self.streak_when_created
   ```

3. Include in deserialization (`from_dict` method, line 152-189):
   ```python
   streak_when_created=data.get("streak_when_created", 0),
   ```

**File: `custom_components/chorebot/const.py`**

4. Add constant (alphabetically after `FIELD_STREAK_BONUS_INTERVAL`):
   ```python
   FIELD_STREAK_WHEN_CREATED = "streak_when_created"
   ```

5. Import and use constant in `task.py` serialization methods

### Phase 2: Backend - Instance Creation (Estimated: 30 minutes)

**File: `custom_components/chorebot/todo.py`**

1. **Initial Date-Based Instance** (`async_create_task_internal`, after line 262):
   ```python
   first_instance = Task.create_new(...)
   first_instance.streak_when_created = 0  # First instance starts at 0
   ```

2. **Next Date-Based Instance** (`_handle_recurring_instance_completion`, after line 872):
   ```python
   new_instance = Task.create_new(...)
   new_instance.streak_when_created = template.streak_current  # Snapshot after increment
   ```

3. **Initial Dateless Instance** (`async_create_task_internal`, after line 311):
   ```python
   first_instance = Task.create_new(...)
   first_instance.streak_when_created = 0  # First instance starts at 0
   ```

4. **Next Dateless Instance** (`_handle_recurring_instance_completion`, after line 851):
   ```python
   new_instance = Task.create_new(...)
   new_instance.streak_when_created = template.streak_current  # Snapshot after increment
   ```

### Phase 3: Frontend - Type Definitions (Estimated: 5 minutes)

**File: `frontend/src/utils/types.ts`**

1. Add field to Task interface (after `occurrence_index`, line 59):
   ```typescript
   streak_when_created?: number; // Template's streak when instance was created
   ```

### Phase 4: Frontend - Display Logic (Estimated: 15 minutes)

**File: `frontend/src/grouped-card.ts`**

1. Update `_renderStreakIndicator` method (replace lines 775-790):
   ```typescript
   private _renderStreakIndicator(task: Task) {
     // Only show for recurring instances
     if (!task.parent_uid) {
       return html``;
     }

     // Get template to check current streak
     const entity = this.hass?.states[this._config!.entity];
     const templates = entity?.attributes.chorebot_templates || [];
     const template = templates.find((t: any) => t.uid === task.parent_uid);

     // Show if instance has valid streak value within current streak progression
     const streakValue = task.streak_when_created || 0;
     const currentStreak = template?.streak_current || 0;
     
     if (streakValue === 0 || streakValue > currentStreak) {
       return html``;
     }

     return html`
       <span class="streak-indicator">
         <ha-icon icon="mdi:fire"></ha-icon>
         <span>${streakValue}</span>
       </span>
     `;
   }
   ```

**File: `frontend/src/person-grouped-card.ts`**

2. Update `_renderStreakIndicator` method (replace lines 1394-1410):
   - Apply identical logic as grouped-card.ts above

## Testing Strategy

### Backend Testing

1. **Creation Snapshot**: Verify `streak_when_created` is set correctly
   - Create recurring task → check first instance has `streak_when_created=0`
   - Complete instance → check next instance has `streak_when_created=1`

2. **Streak Progression**: Complete 3 instances on-time
   - Verify instances have streak_when_created values: 0, 1, 2

3. **Reset via Late Completion**:
   - Build streak to 3
   - Complete 4th instance late
   - Verify template.streak_current = 0
   - Verify 5th instance created with streak_when_created = 0

4. **Reset via Midnight Job**:
   - Build streak to 3
   - Leave 4th instance overdue
   - Trigger maintenance job
   - Verify template.streak_current = 0
   - Verify instances keep original streak_when_created values (not mutated)

5. **Dateless Recurring**:
   - Create dateless recurring task
   - Complete 5 instances
   - Verify streak accumulates unbounded
   - Verify instances have streak_when_created: 0, 1, 2, 3, 4

### Frontend Testing

1. **Active Streak Display**:
   - Build streak to 4
   - Verify UI shows: (hidden), 🔥1, 🔥2, 🔥3, 🔥4

2. **Reset Hiding**:
   - After streak reset to 0
   - Verify old instances hide their indicators
   - Verify new instances show progression from 🔥1 again

3. **Legacy Instance Compatibility**:
   - Existing instances without `streak_when_created` field
   - Verify they default to 0 and hide indicators

4. **Multi-Instance Differentiation**:
   - Have 3+ visible instances on screen
   - Verify each shows DIFFERENT streak values
   - Verify values increment correctly (snapshot, snapshot+1, snapshot+2...)

### Edge Cases

1. **Uncomplete Anti-Farming**: Verify uncompleted instance (orphaned) doesn't show indicator
2. **Template Direct Access**: Verify templates remain hidden from UI
3. **Dateless No Reset**: Verify dateless tasks never auto-reset
4. **Completed Instance Visibility**: Verify completed instances soft-deleted at midnight

## Migration & Compatibility

### Backward Compatibility

**Existing Instances (No `streak_when_created` field):**
- Deserialize with default value: 0
- Display logic hides indicator (0 not > 0)
- No data corruption or runtime errors

**Storage Format:**
- Field stored at root level (consistent with other ChoreBot fields)
- Optional field (not serialized if 0)
- No breaking changes to JSON schema

### No Migration Script Needed

The default value of 0 is semantically correct:
- Legacy instances have no captured snapshot → don't show indicator
- New instances going forward get proper snapshots
- Gradual rollover as old instances are soft-deleted at midnight

## Security & Performance Considerations

### Performance Impact: Negligible

- **Storage**: +1 integer field per instance (~4 bytes)
- **Computation**: One assignment per instance creation (O(1))
- **Frontend**: One additional comparison per task render (O(1))

### Security Considerations: None

- Read-only display feature
- No user input validation required
- No new attack surface

## Alternative Approaches Considered

### Option A: Retroactive Data Mutation (Rejected)

When midnight job resets template streak:
- Find all incomplete instances
- Set their `streak_when_created = 0`

**Rejected because:**
- Loses historical information permanently
- Creates inconsistent data if streak rebuilds
- Requires additional maintenance job logic

### Option B: Dynamic Calculation from occurrence_index (Rejected)

Calculate display value as `occurrence_index + 1`

**Rejected because:**
- Breaks after streak resets (occurrence_index continues incrementing)
- No way to detect which "streak cycle" instance belongs to
- Would show Instance 6 as 🔥7 even after multiple resets

### Option C: Track Streak Cycle ID (Rejected)

Add `streak_cycle_id` field that increments on each reset

**Rejected because:**
- Over-engineered for simple display problem
- Requires reset logic changes (more invasive)
- Snapshot approach is simpler and achieves same result

## Open Questions

None. Requirements clarified with user:
- Display raw `streak_when_created` value (not +1)
- Hide stale indicators after reset
- Dateless unbounded accumulation is intentional

## Success Criteria

- [x] Each visible recurring instance shows unique streak value
- [x] First instance (streak_when_created=0) hides indicator
- [x] After streak reset, old instances hide indicators (stale values)
- [x] New streak progression displays correctly (1, 2, 3...)
- [x] Dateless recurring tasks show unbounded streak accumulation
- [x] Legacy instances without field default to 0 and hide indicators
- [x] No performance degradation or data corruption
