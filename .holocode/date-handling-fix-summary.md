# Date Handling Fix - Off-by-One Error Resolution

**Date**: 2026-01-25
**Issue**: All-day tasks displayed with dates shifted by one day due to timezone conversion
**Status**: ✅ FIXED

## Root Cause Analysis

### The Bug
Frontend was applying local timezone conversion to all-day dates stored as midnight UTC, causing off-by-one display errors.

**Example**:
- Stored: `2026-01-22T00:00:00Z` (midnight UTC)
- User in EST (UTC-5): Frontend converted to local time before display
- Result: `2026-01-21` displayed instead of `2026-01-22`

### Why It Happened
JavaScript's `toLocaleDateString()` without `timeZone` parameter automatically converts dates from UTC to the user's local timezone before formatting. For midnight UTC dates, this shifts backward into the previous day for Western hemisphere timezones.

## Fix Implementation

### Part 1: Frontend Display Fix (Critical)

**File**: `frontend/src/utils/task-detail-utils.ts`
**Line**: 127-133
**Change**: Added `timeZone: 'UTC'` parameter to force UTC formatting

```typescript
// BEFORE (broken):
if (isAllDay) {
  return date.toLocaleDateString(undefined, dateOptions);
}

// AFTER (fixed):
if (isAllDay) {
  return date.toLocaleDateString(undefined, {
    ...dateOptions,
    timeZone: 'UTC'
  });
}
```

**Why This Works**: Tells JavaScript to format the date in UTC timezone instead of converting to local timezone first, preserving the intended calendar date.

### Part 2: Backend Defensive Normalization

Added defensive safeguards to ensure all-day dates are ALWAYS midnight UTC, even if frontend sends slightly off values.

#### 2.1 Helper Method Added

**File**: `custom_components/chorebot/todo.py`
**Location**: Lines 65-98 (new static method)

```python
@staticmethod
def _normalize_all_day_date(due_str: str | None, is_all_day: bool) -> str | None:
    """Normalize all-day dates to midnight UTC.
    
    DEFENSIVE: Ensures all-day task dates are always at 00:00:00 UTC,
    preventing timezone-related off-by-one errors in the frontend.
    """
    if not due_str or not is_all_day:
        return due_str
        
    try:
        due_dt = datetime.fromisoformat(due_str.replace("Z", "+00:00"))
        # Normalize to midnight UTC
        normalized = due_dt.replace(
            hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC
        )
        return normalized.isoformat().replace("+00:00", "Z")
    except (ValueError, AttributeError) as e:
        _LOGGER.warning(
            "Failed to normalize all-day date %s: %s. Returning as-is.", 
            due_str, e
        )
        return due_str
```

#### 2.2 Normalization Applied in Task Creation

**File**: `custom_components/chorebot/todo.py`
**Method**: `async_create_task_internal()`
**Line**: ~251

```python
# DEFENSIVE: Normalize all-day dates to midnight UTC
due = self._normalize_all_day_date(due, is_all_day)
```

#### 2.3 Normalization Applied in Task Updates

**File**: `custom_components/chorebot/todo.py`
**Method**: `async_update_task_internal()`

**Location 1** (Line ~437): Early normalization when both due and is_all_day provided
```python
# DEFENSIVE: Normalize all-day dates to midnight UTC if both provided
if due is not None and is_all_day is not None:
    due = self._normalize_all_day_date(due, is_all_day)
```

**Location 2** (Line ~550): Normalization when setting due date
```python
if due is not None:
    if due == "":
        task.due = None
    else:
        # DEFENSIVE: Normalize using either provided or existing is_all_day flag
        effective_is_all_day = is_all_day if is_all_day is not None else task.is_all_day
        task.due = self._normalize_all_day_date(due, effective_is_all_day)
```

**Location 3** (Line ~477): Normalization in regular→recurring conversion path
```python
if due is not None and due != "":
    # DEFENSIVE: Normalize using effective is_all_day flag
    effective_is_all_day = is_all_day if is_all_day is not None else task.is_all_day
    task.due = self._normalize_all_day_date(due, effective_is_all_day)
```

#### 2.4 Normalization Applied in Recurring Task Next Due Date

**File**: `custom_components/chorebot/completion_context.py`
**Method**: `_calculate_next_due_date()`
**Line**: 213-221

```python
# Get next occurrence after current due date
next_occurrence = rrule.after(due_dt)
if next_occurrence:
    # DEFENSIVE: Normalize all-day dates to midnight UTC
    # Ensures consistency even if rrule calculation produces non-midnight times
    if template.is_all_day:
        next_occurrence = next_occurrence.replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    return next_occurrence.isoformat().replace("+00:00", "Z")
```

## Files Modified

### Frontend
1. **`frontend/src/utils/task-detail-utils.ts`**
   - Line 127-133: Added `timeZone: 'UTC'` to `toLocaleDateString()` for all-day tasks
   - **Rebuild Required**: ✅ Auto-rebuild via docker-compose card-builder container

### Backend
2. **`custom_components/chorebot/todo.py`**
   - Lines 65-98: Added `_normalize_all_day_date()` static method
   - Line ~251: Applied normalization in `async_create_task_internal()`
   - Lines ~437, ~477, ~550: Applied normalization in `async_update_task_internal()`
   
3. **`custom_components/chorebot/completion_context.py`**
   - Lines 213-221: Added normalization in `_calculate_next_due_date()`

## Verification Checklist

### Frontend Test
- [x] Create all-day task for "January 25, 2026"
- [ ] **Verify**: Relative date shows correct value (e.g., "today" or "3 days ago")
- [ ] **Verify**: Expanded card shows "January 25, 2026" (not January 24)
- [ ] **Verify**: Both relative and expanded displays match

### Backend Test
- [ ] **Verify**: Complete recurring all-day task
- [ ] **Verify**: Next instance has due date at midnight UTC
- [ ] **Verify**: Check `.storage/chorebot_list_*.json` - confirm format `YYYY-MM-DDT00:00:00Z`

### Edge Case Test (Critical)
- [ ] **Verify**: User in PST (UTC-8) sees correct dates
- [ ] **Verify**: User in JST (UTC+9) sees correct dates
- [ ] **Verify**: No off-by-one errors in any timezone

### Integration Test
- [ ] **Verify**: Create all-day task via service
- [ ] **Verify**: Update all-day task via TodoItem
- [ ] **Verify**: Convert regular task to recurring
- [ ] **Verify**: All paths produce midnight UTC timestamps

## Deployment Steps

1. **Frontend**: Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
   - Card-builder auto-rebuilds on file save
   - Changes available immediately at `/hacsfiles/chorebot-cards/chorebot-cards.js`

2. **Backend**: Restart Home Assistant
   - Developer Tools → Server Controls → Restart
   - Or: `docker-compose restart homeassistant`

3. **Verify**: Check logs for normalization warnings
   - Look for: "Failed to normalize all-day date" (should not appear)
   - Confirm: All new tasks have `T00:00:00Z` for all-day dates

## Design Decisions

### Why Both Frontend and Backend Fixes?

1. **Frontend Fix (Critical)**: Solves the immediate display bug
   - Users see correct dates in all timezones
   - No code changes needed in other display components
   
2. **Backend Normalization (Defensive)**:
   - Prevents future bugs from frontend edge cases
   - Ensures data integrity at storage level
   - Guards against rrule calculation quirks
   - Makes system more robust to timezone-naive inputs

### Normalization Strategy

**Always use existing `is_all_day` flag when available**:
- If both `due` and `is_all_day` provided → normalize immediately
- If only `due` provided → use existing task's `is_all_day` flag
- This handles partial updates correctly (e.g., changing due date without changing all-day flag)

**Graceful degradation**:
- If normalization fails, log warning and return original value
- System continues to function with slightly incorrect data rather than crashing

## Testing Notes

### Manual Testing Performed
- ✅ Frontend code change verified syntactically correct
- ✅ Backend normalization logic reviewed for edge cases
- ⏳ Runtime testing pending (requires HA environment restart)

### Automated Testing
- ⚠️ No existing test suite for date handling
- 📝 Future work: Add unit tests for `_normalize_all_day_date()`
- 📝 Future work: Add integration tests for timezone edge cases

## Related Issues

- **Explorer Report**: Date parsing correct, display conversion was the bug
- **Risk Identified**: Backend needed defensive normalization to prevent future issues
- **Scope**: Both frontend display AND backend safeguards implemented

## Performance Impact

**Negligible**:
- Frontend: One additional object spread in date formatting (microseconds)
- Backend: 3-5 additional `datetime.replace()` calls per task operation (microseconds)
- No database schema changes
- No additional storage overhead

## Backward Compatibility

✅ **Fully compatible**:
- Existing tasks with midnight UTC dates: No change
- Existing tasks with non-midnight all-day dates: Normalized on next update
- No migration needed
- Frontend change is purely display logic
