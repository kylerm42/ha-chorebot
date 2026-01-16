# Person Accent Color System Implementation Summary

**Feature**: Centralized Person-to-Color Mapping  
**Completed**: 2025-01-03  
**Spec**: [.holocode/proposed/20250103-person-accent-color/SPEC.md](../proposed/20250103-person-accent-color/SPEC.md)

## Overview

Implement a centralized system where each person's accent color is configured once and automatically inherited by all their cards, eliminating duplicated color configuration across multiple cards.

## What Was Implemented

### Backend Changes

**Data Model Rename**: `PersonPoints` → `PersonProfile`
- Renamed dataclass to reflect expanded purpose beyond points
- Added `accent_color: str = ""` field (hex code or CSS variable)
- Updated `to_dict()` and `from_dict()` serialization
- Storage: `chorebot_people` file (hot data)

**New Service**: `chorebot.manage_person`
```yaml
service: chorebot.manage_person
data:
  person_id: person.kyle
  accent_color: "#3498db"  # Hex or CSS variable
```

**Implementation**:
- New method: `PeopleStore.async_update_person_profile()`
- Color validation: Accepts `#RRGGBB`, `#RGB`, or `var(--name)`
- Creates person record if not exists (with 0 points)
- Triggers sensor state update

### Frontend Changes

**TypeScript Types**:
- Renamed `PersonPoints` → `PersonProfile` interface
- Added `accent_color?: string` field
- Legacy `PersonPoints` alias maintained for compatibility

**Color Inheritance** (3 cards):
1. `person-points-card.ts` - Balance display with person color
2. `person-rewards-card.ts` - Rewards with person color
3. `grouped-card.ts` - Optional `person_entity` for filtered views

**Precedence Order**:
1. Manual `accent_color` in card config (explicit override)
2. Person's `accent_color` from profile (centralized)
3. Theme's `--primary-color` (fallback)

**Example Logic**:
```typescript
let baseColor = "var(--primary-color)";

// Check centralized person color
if (this._config.person_entity) {
  const people = hass.states["sensor.chorebot_points"]?.attributes.people;
  const profile = people?.[this._config.person_entity];
  if (profile?.accent_color) {
    baseColor = profile.accent_color;
  }
}

// Manual override
if (this._config.accent_color) {
  baseColor = this._config.accent_color;
}
```

### Grouped Card Enhancement

**New Config**: `person_entity?: string`
- Filters tasks by person using `computed_person_id`
- Automatically inherits person's accent color
- Enables personal task views with consistent coloring

**Use Cases**:
- **Family view**: No `person_entity` → shows all tasks, theme color
- **Personal view**: With `person_entity` → filtered tasks, person color

## Key Benefits

- **DRY Principle**: Configure person color once, inherited everywhere
- **Consistency**: All cards for same person use same color automatically
- **Flexibility**: Manual per-card override still works
- **Maintainability**: Change person color in one place, all cards update
- **Extensibility**: `PersonProfile` model ready for future enhancements
- **Performance**: Hot data already loaded with points (no extra queries)

## Files Modified

### Backend
- `custom_components/chorebot/people.py`
  - Renamed `PersonPoints` → `PersonProfile`
  - Added `accent_color` field
  - Added `async_update_person_profile()` method
- `custom_components/chorebot/__init__.py`
  - Added `manage_person` service handler
- `custom_components/chorebot/services.yaml`
  - Added service definition

### Frontend
- `src/utils/types.ts`
  - Renamed interface, added field
- `src/person-points-card.ts`
  - Color inheritance logic
- `src/person-rewards-card.ts`
  - Color inheritance logic
- `src/grouped-card.ts`
  - Added `person_entity` config
  - Color inheritance logic
  - Person filtering via `computed_person_id`

## Example Configuration

**Before (Duplicated)**:
```yaml
# Kyle's cards (color duplicated 3 times)
- type: custom:chorebot-person-points-card
  person_entity: person.kyle
  accent_color: "#3498db"

- type: custom:chorebot-grouped-card
  entity: todo.chorebot_family_tasks
  filter_section_id: "Kyle's Tasks"
  accent_color: "#3498db"

- type: custom:chorebot-person-rewards-card
  person_entity: person.kyle
  accent_color: "#3498db"
```

**After (Centralized)**:
```yaml
# One-time setup
- service: chorebot.manage_person
  data:
    person_id: person.kyle
    accent_color: "#3498db"

# Kyle's cards (color inherited automatically)
- type: custom:chorebot-person-points-card
  person_entity: person.kyle

- type: custom:chorebot-grouped-card
  entity: todo.chorebot_family_tasks
  person_entity: person.kyle

- type: custom:chorebot-person-rewards-card
  person_entity: person.kyle
```

## Current Status

**Production Ready**: Fully implemented and tested in both backend and frontend.

- Person colors persist in `chorebot_people` storage
- All cards automatically inherit configured colors
- Manual overrides work as expected
- Backward compatible (defaults to empty string)
