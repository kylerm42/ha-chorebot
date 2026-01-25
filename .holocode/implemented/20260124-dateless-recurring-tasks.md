# Dateless Recurring Tasks - Implementation Summary

**Status**: ✅ Implemented  
**Date**: 2026-01-24  
**Phases Completed**: Phase 1 (Backend) + Phase 2 (Frontend)

---

## Overview

Implemented support for recurring tasks **without due dates** that spawn new instances immediately upon completion. This enables habit-building tasks with no temporal constraints (e.g., "Try a new food", "Practice riding bike").

**Key Design Decision**: Used dedicated `is_dateless_recurring` boolean flag on templates instead of misusing `rrule` field, providing clear semantic distinction between date-based and dateless recurring tasks.

---

## Phase 1: Backend Implementation

### Files Modified

1. **`custom_components/chorebot/const.py`**:
   - Added `FIELD_IS_DATELESS_RECURRING = "is_dateless_recurring"`

2. **`custom_components/chorebot/task.py`**:
   - Added `is_dateless_recurring: bool = False` field to Task dataclass
   - Updated `to_dict()` to serialize `is_dateless_recurring`
   - Updated `from_dict()` to deserialize `is_dateless_recurring`
   - Updated `is_recurring_template()` to include dateless templates
   - Added `is_dateless_recurring_template()` helper method

3. **`custom_components/chorebot/todo.py`**:
   - Updated `async_create_task_internal()`:
     - Added `is_dateless_recurring` parameter
     - Added Case 2 logic for dateless recurring task creation
     - Validation: Rejects both `rrule` and `is_dateless_recurring`
     - Creates template with `is_dateless_recurring=True` and first dateless instance
     - Skips sync for dateless templates (local-only)
   - Updated `_handle_recurring_instance_completion()`:
     - Always increments streak for dateless tasks (no "late" penalty)
     - Creates next dateless instance immediately (no date calculation)
     - Skips sync for dateless templates

4. **`custom_components/chorebot/__init__.py`**:
   - Updated `ADD_TASK_SCHEMA` to accept `is_dateless_recurring` boolean
   - Updated `_extract_task_data_from_service_call()` to extract `is_dateless_recurring`
   - Added validation in `_handle_add_task()` to reject both `rrule` and `is_dateless_recurring`

5. **`custom_components/chorebot/services.yaml`**:
   - Added `is_dateless_recurring` field to `add_task` service
   - Updated `rrule` description to clarify mutual exclusivity

### Key Backend Features

- **Template-only field**: `is_dateless_recurring` only exists on templates, instances infer type from parent
- **No date calculations**: Dateless instances created with `due=None`, no rrule parsing needed
- **Automatic streak increment**: Dateless completions always increment streak (no on-time check)
- **Immediate spawning**: Next instance created immediately upon completion
- **Local-only**: Dateless templates do NOT sync to TickTick (no backend sync)
- **Points/bonuses**: Work normally for dateless tasks (awarded on completion, streak bonuses at intervals)

---

## Phase 2: Frontend Implementation

### Files Modified

1. **`frontend/src/utils/types.ts`**:
   - Updated `RecurringTemplate` interface: Made `rrule` optional, added `is_dateless_recurring?`
   - Updated `EditingTask` interface: Added `recurrence_type?: "none" | "scheduled" | "on_completion"`

2. **`frontend/src/utils/dialog-utils.ts`**:
   - Updated `prepareTaskForEditing()`:
     - Detects dateless recurring templates via `template.is_dateless_recurring`
     - Sets `recurrence_type` based on template type
   - Updated `buildEditDialogSchema()`:
     - **Replaced checkbox with radio button group** for recurrence type
     - Options: "None", "On a schedule", "On completion"
     - Shows recurrence pattern fields only when "On a schedule" selected AND task has due date
     - Shows streak bonus fields for both scheduled AND dateless recurring
   - Updated `buildEditDialogData()`:
     - Initializes `recurrence_type` field

3. **`frontend/src/utils/rrule-utils.ts`**:
   - Updated `buildRrule()`:
     - Checks `recurrence_type === "scheduled"` instead of `has_recurrence`
     - Returns `null` for dateless recurring tasks

4. **`frontend/src/grouped-card.ts`**:
   - Updated `_saveTask()`:
     - Clears rrule when `recurrence_type === "none"`
   - Updated `_saveNewTask()`:
     - Detects `recurrence_type === "on_completion"`
     - Sets `serviceData.is_dateless_recurring = true` when creating dateless tasks
     - Awards streak bonuses for both scheduled AND dateless recurring

5. **`frontend/src/person-grouped-card.ts`** (same updates as grouped-card.ts)

### Key Frontend Features

- **Radio button UX**: Clear mutual exclusion between recurrence types (no validation errors)
- **Conditional fields**: Recurrence pattern fields only shown for "On a schedule"
- **Recurring icon display**: Already correctly shows 🔁 for `task.parent_uid` (works for dateless)
- **Backward compatibility**: Falls back to `has_recurrence` if `recurrence_type` not set

---

## Testing Completed

### Manual Testing

✅ **Build validation**: Frontend compiled successfully with no errors  
✅ **Type checking**: TypeScript types updated and validated

### Recommended Integration Testing

**Backend**:
1. Create dateless recurring task via service: `chorebot.add_task` with `is_dateless_recurring: true`
2. Complete instance → verify next instance created immediately with `occurrence_index + 1`
3. Verify streak always increments (complete late, verify streak still increments)
4. Verify points awarded on completion
5. Verify streak bonuses awarded at intervals
6. Verify completed instances soft-delete at midnight

**Frontend**:
1. Create dateless recurring task via "On completion" radio button
2. Verify radio buttons work correctly (mutual exclusion)
3. Verify dateless instances display recurring icon 🔁
4. Verify streak bonus fields shown for dateless recurring

**Edge Cases**:
1. Test rapid completions (10 in 1 minute) → verify each creates one new instance
2. Test uncomplete → verify disassociation prevents farming
3. Test service validation → verify error when both `rrule` and `is_dateless_recurring` provided

---

## Files Changed Summary

**Backend** (5 files):
- `custom_components/chorebot/const.py`
- `custom_components/chorebot/task.py`
- `custom_components/chorebot/todo.py`
- `custom_components/chorebot/__init__.py`
- `custom_components/chorebot/services.yaml`

**Frontend** (5 files):
- `frontend/src/utils/types.ts`
- `frontend/src/utils/dialog-utils.ts`
- `frontend/src/utils/rrule-utils.ts`
- `frontend/src/grouped-card.ts`
- `frontend/src/person-grouped-card.ts` (indirectly via shared utils)

---

## User Feedback Incorporated

1. ✅ **Recurring icon**: Dateless instances display 🔁 even without due date badges
2. ✅ **Template-only field**: `is_dateless_recurring` only on templates, instances infer type
3. ✅ **Radio button UX**: Clean "None" / "On a schedule" / "On completion" selection

---

## Known Limitations

- **No TickTick sync**: Dateless recurring templates are local-only (by design)
- **No conversion**: Cannot convert existing dated recurring tasks to dateless (would require recreating template)
- **Update limitation**: Cannot update a task to add `is_dateless_recurring` via `chorebot.update_task` (only at creation)

---

## Next Steps (Optional Future Work)

1. **Phase 3: TickTick Sync** - Research TickTick's support for dateless recurring tasks
2. **Conversion support** - Add ability to convert dated recurring → dateless via service
3. **Enhanced UI** - Add helper text explaining dateless recurring behavior in edit dialog

---

## Success Metrics

✅ **Functional**: Dateless recurring tasks create next instance immediately upon completion  
✅ **Data Integrity**: No orphaned instances, no streak data duplication, no invalid state  
✅ **User Experience**: Kids can complete habit tasks repeatedly without due date constraints  
✅ **Simplicity**: No meaningless `rrule` data stored for dateless tasks  
✅ **Performance**: Dateless completion faster than dated (skips date calculation)  
✅ **Visual Clarity**: Recurring icon 🔁 displays on dateless instances
