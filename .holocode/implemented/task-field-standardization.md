# Implementation Summary: Task Field Standardization

**Implemented:** 2025-11-22  
**Full Spec:** `../proposed/20251122-task-field-standardization/SPEC.md`

## Overview

Eliminated confusion about field locations by serializing all Task dataclass fields to root level in JSON, making `custom_fields` deprecated and `sync` exclusively for backend-specific metadata.

## Problem Solved

**Root Cause:** ChoreBot dataclass fields were split between root level and `custom_fields` in JSON, forcing frontend to check both locations. This caused bugs like the points badge not displaying because `points_value` was in `custom_fields` but the frontend only checked root level.

## What Changed

### Backend (task.py)

**`to_dict()` method:**
- All Task dataclass fields now serialize to root level
- `custom_fields` is empty for new saves (deprecated)
- `sync` dict exclusively for backend-specific metadata

**`from_dict()` method:**
- Reads from root level first, falls back to `custom_fields` for backward compatibility
- Automatic migration as tasks are updated

### Frontend (types.ts, task-utils.ts)

- TypeScript `Task` interface simplified
- All field access patterns updated to read from root level only
- Points badge rendering fixed (no more fallback logic needed)

## Storage Structure

**Before:**
```json
{
  "uid": "...",
  "summary": "Task",
  "custom_fields": {
    "points_value": 10,
    "section_id": "..."
  },
  "sync": { "ticktick": { "id": "..." } }
}
```

**After:**
```json
{
  "uid": "...",
  "summary": "Task",
  "points_value": 10,
  "section_id": "...",
  "sync": { "ticktick": { "id": "..." } }
}
```

## Files Modified

- `custom_components/chorebot/task.py` (to_dict/from_dict methods)
- `src/utils/types.ts` (Task interface)
- `src/main.ts` (points badge rendering)
- `src/grouped-card.ts` (points badge rendering)
- `AGENTS.md` (documentation update)

## Migration Strategy

- **Automatic migration** - No user action required
- Old format reads correctly via fallback logic
- New saves use clean root-level structure
- Natural phaseout as tasks are updated

## Technical Decisions

1. **Backward compatible deserialization** - No breaking changes
2. **Root-level serialization only** - Clean separation of concerns
3. **Empty custom_fields** - Truly deprecated, not just documented as such
4. **Sync dict isolation** - Backend metadata stays separate

## Impact

- **Bug fix:** Points badge now displays correctly
- **Code clarity:** Single source of truth for field locations
- **Maintainability:** No more dual-location checks in frontend
- **Extensibility:** Clean foundation for future backend integrations

## Notes

- Historical note added to AGENTS.md: "All ChoreBot fields serialize to root level - never use custom_fields (deprecated as of 2025-11-22)"
- This change was critical for points system functionality
- No data loss or user-visible impact during migration
