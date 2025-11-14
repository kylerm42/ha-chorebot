# Sync Bug Fix - Completed Tasks

## Problem

When syncing with TickTick, completed tasks were incorrectly being marked as deleted in Home Assistant.

## Root Cause

TickTick's `GET /open/v1/project/{projectId}/data` endpoint does NOT return completed tasks. The sync logic was:

1. Fetch all tasks from TickTick via `get_project_with_tasks()`
2. Build a map of local tasks with TickTick IDs
3. Process TickTick tasks and remove them from the map
4. Assume any remaining tasks in the map were deleted

This meant completed tasks (which didn't appear in the response) were incorrectly soft-deleted locally.

## Solution

Modified `ticktick_backend.py:async_pull_changes()` (lines 665-730) to check missing tasks individually:

### New Logic

When a task doesn't appear in the project data sync:

1. **Skip if already deleted locally** - No need to check
2. **Skip if already completed locally** - Optimization to avoid redundant API calls on every sync
3. For **incomplete tasks** missing from sync:
   - Call `GET /open/v1/project/{projectId}/task/{taskId}` to fetch the individual task
   - If the API returns the task → it exists and is likely completed, update it locally
   - If the API returns 404/"not found" → it was actually deleted, soft-delete locally
   - If another error occurs → log the error and skip the task (don't modify)

### Code Changes

- **File**: `custom_components/chorebot/ticktick_backend.py`
- **Lines**: 665-745
- **Key Changes**:
  - Renamed section from "Check for deleted tasks" to "Check for missing tasks"
  - **Added optimization**: Skip tasks already marked as completed locally (prevents API calls on every sync)
  - Added early continue for deleted tasks
  - Added try/except block to call `get_task()` for each incomplete missing task
  - Parse error messages to detect 404/not found
  - Update task status appropriately based on API response

## Testing Scenarios

### Scenario 1: Complete a task in TickTick

1. Create a task in Home Assistant
2. Wait for sync or trigger manual sync
3. In TickTick mobile app/web, mark the task as completed
4. Trigger pull sync in Home Assistant (`chorebot.sync` service)
5. **Expected**: Task should be marked as completed in HA, NOT deleted
6. **Check logs**: Should see "COMPLETED task on TickTick" message

### Scenario 2: Delete a task in TickTick

1. Create a task in Home Assistant
2. Wait for sync or trigger manual sync
3. In TickTick mobile app/web, delete the task
4. Trigger pull sync in Home Assistant
5. **Expected**: Task should be soft-deleted in HA
6. **Check logs**: Should see "DELETED task on TickTick" message

### Scenario 3: Complete a recurring task in TickTick

1. Create a recurring task in Home Assistant
2. Wait for sync
3. In TickTick, complete the recurring task
4. Trigger pull sync in Home Assistant
5. **Expected**:
   - Old instance marked as completed
   - Streak updated on template
   - New instance created with next due date
6. **Check logs**: Should see "COMPLETED task on TickTick" + recurring task handling logs

### Scenario 4: API Error (network issue)

1. Simulate network error or rate limit
2. Trigger sync when missing task check would fail
3. **Expected**:
   - Error logged
   - Task NOT modified (neither deleted nor completed)
   - Task remains in current state

## Performance Considerations

- **Optimization**: Tasks already marked as completed locally are skipped (no API call)
  - This prevents making the same API call on every sync for every completed task
  - API calls only happen ONCE when a task first becomes completed on TickTick
- Each newly-missing incomplete task triggers one additional API call
- For normal usage (few incomplete tasks going missing), this should be negligible
- If many tasks are completed at once in TickTick, the first sync will make multiple API calls but subsequent syncs will skip them
- TickTick API rate limits should be monitored in production use

## Logs to Watch

- `"COMPLETED task on TickTick: '<task>' (uid: <uid>) - updating locally"` - Task was completed on TickTick
- `"DELETED task on TickTick: '<task>' (uid: <uid>) - soft-deleting locally"` - Task was deleted on TickTick
- `"Skipping completed task '<task>' - already marked complete locally"` - Optimization skipping API call (DEBUG level)
- `"Error checking task '<task>' on TickTick: <error> - skipping"` - API error occurred

## Related Files

- `custom_components/chorebot/ticktick_backend.py` - Main fix
- `custom_components/chorebot/ticktick_api_client.py` - Uses existing `get_task()` method
- `custom_components/chorebot/sync_coordinator.py` - Unchanged (generic coordinator)
- `CLAUDE.md` - Updated with completed task handling documentation

## Future Enhancements

- Could batch individual task checks if rate limiting becomes an issue
- Could cache completed task status to reduce API calls
- Could add metrics/telemetry to track frequency of completed vs deleted tasks
