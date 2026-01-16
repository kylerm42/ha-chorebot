# Configurable Points Display Implementation Summary

**Feature**: Customizable Points Terminology System  
**Completed**: 2025-01-04 (+ fixes 2025-01-05)  
**Spec**: [.holocode/proposed/20250104-configurable-points-display/SPEC.md](../proposed/20250104-configurable-points-display/SPEC.md)

## Overview

Allow users to customize how "points" are displayed throughout ChoreBot. Users can choose custom text (e.g., "stars", "coins") and/or an MDI icon to replace the default "points"/"pts" terminology, creating a more personalized and engaging reward system.

## What Was Implemented

### Backend Changes

**Storage Structure** (`chorebot_config`):
```json
{
  "lists": [...],
  "points_display": {
    "text": "stars",
    "icon": "mdi:star"
  }
}
```

**Constants** (`const.py`):
- `CONF_POINTS_DISPLAY = "points_display"`
- `CONF_POINTS_TEXT = "text"`
- `CONF_POINTS_ICON = "icon"`

**Storage Accessor** (`store.py`):
- `get_points_display() -> dict[str, str]`
- Returns `{"text": "points", "icon": ""}` as default
- Fallback logic: If both empty, defaults to "points"

**Options Flow** (`config_flow.py`):
- Users configure via Settings → Devices & Services → ChoreBot → Configure
- Text field: Custom terminology (max 50 chars, supports emojis)
- Icon field: MDI icon selector (HA's native picker with autocomplete)
- Validation: At least one field must be non-empty
- Integration reloads automatically after changes

**Sensor Exposure** (`sensor.py`):
- `sensor.chorebot_points` attributes include `points_display`
- Frontend reads from sensor (single source of truth)

### Frontend Changes

**New Utility** (`src/utils/points-display-utils.ts`):
```typescript
// Get icon and text from sensor
getPointsDisplayParts(hass) -> {icon, text}

// For field labels ("Stars Value")
getPointsTermCapitalized(hass) -> "Stars"

// For helper text ("between 1 and 10,000 stars")
getPointsTermLowercase(hass) -> "stars"
```

**Updated Cards** (all points references):
1. `person-points-card.ts` - Balance display
2. `person-rewards-card.ts` - Reward costs and buttons
3. `grouped-card.ts` - Points badges
4. `list-card.ts` - Points badges (deprecated)
5. `rewards-card.ts` - Balance and costs (deprecated)

**Updated Dialog** (`dialog-utils.ts`):
- Dynamic field labels: "Points Value" → "Stars Value"
- Dynamic helper text: "10,000 points" → "10,000 stars"
- Accepts `hass` parameter for terminology lookup

**CSS Fixes**:
- Icons aligned with text baseline using `--mdc-icon-size`
- `vertical-align: middle` for proper alignment
- Prevents icon rendering below text

## Display Modes

**Both Icon and Text**:
```
437 🌟 stars
```

**Icon Only** (text = ""):
```
437 🌟
```

**Text Only** (icon = ""):
```
437 stars
```

**Default** (both empty):
```
437 points
```

## Post-Release Fixes (2025-01-05)

### Issue 1: Icon-Only Mode Not Working
**Problem**: Text field had hardcoded default of "points"  
**Fix**: Removed default text value when user explicitly wants icon-only display

### Issue 2: Both Fields Empty Should Default to "points"
**Problem**: No fallback when user clears everything  
**Fix**: Added logic in `store.py` to return text="points" when both fields empty

### Issue 3: Icon Misalignment
**Problem**: Icons displayed below text due to `width`/`height` CSS  
**Fix**: Updated all `ha-icon` CSS to use `--mdc-icon-size` variable with `vertical-align: middle`

### Issue 4: Field Clearing Not Working
**Problem**: Users couldn't clear text or icon fields - previous value reappeared  
**Fix**: Changed from `vol.Optional(..., default=...)` to `description={"suggested_value": ...}` (standard HA pattern)

### Issue 5: Frontend Fallback Logic
**Problem**: Empty strings treated as falsy, falling back to "points"  
**Fix**: Use nullish coalescing (`??`) instead of logical OR (`||`)

**Before (WRONG)**:
```typescript
text: config.text || "points"  // Treats "" as falsy
```

**After (CORRECT)**:
```typescript
text: config.text ?? "points"  // Only falls back when null/undefined
```

## Key Benefits

- **Single Source of Truth**: Configure once, applies everywhere
- **No Per-Card Configuration**: All cards automatically use custom display
- **Consistent Terminology**: Same term throughout UI (badges, dialogs, buttons)
- **Engagement**: Kids prefer "stars" over "points" (more fun)
- **Flexibility**: Supports emojis in text field
- **Visual Appeal**: MDI icons with theme integration
- **Backward Compatible**: Defaults to "points" if not configured

## Files Modified

### Backend
- `custom_components/chorebot/const.py` - Constants
- `custom_components/chorebot/config_flow.py` - Options flow
- `custom_components/chorebot/store.py` - Storage accessor
- `custom_components/chorebot/sensor.py` - Attribute exposure

### Frontend
- `src/utils/points-display-utils.ts` - **NEW** utility functions
- `src/utils/dialog-utils.ts` - Dynamic labels
- `src/person-points-card.ts` - Balance display
- `src/person-rewards-card.ts` - Costs and buttons
- `src/grouped-card.ts` - Points badges

## Example Configuration

**Setup**:
1. Settings → Devices & Services → ChoreBot → Configure
2. Set text = "stars"
3. Set icon = "mdi:star"
4. Save

**Result**:
- Task badges: `+10 🌟 stars`
- Person balance: `437 🌟 stars`
- Reward costs: `50 🌟 stars`
- Dialog labels: "Stars Value", "Streak Bonus Stars"
- Helper text: "between 1 and 10,000 stars"

## Test Scenarios Verified

- ✅ Icon only (text="", icon="mdi:star") - Shows only icon
- ✅ Text only (text="stars", icon="") - Shows only text
- ✅ Both (text="stars", icon="mdi:star") - Shows both, aligned
- ✅ Empty (text="", icon="") - Backend defaults to "points"
- ✅ Existing configs - Backward compatible
- ✅ Icon alignment - All cards display icons inline at correct baseline
- ✅ Field clearing - Users can clear and submit empty values

## Current Status

**Production Ready**: Fully implemented with all post-release fixes applied.

- Configuration UI works perfectly (text + icon fields)
- All cards display custom terminology consistently
- Icon alignment issues resolved
- Field clearing behavior fixed
- Backward compatible with existing installations
