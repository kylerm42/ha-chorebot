# Person Accent Color System

**Status**: Approved  
**Date**: 2025-01-03  
**Type**: Feature Enhancement

## Overview

Implement a centralized person-to-color mapping system so that each person's cards (points, rewards, grouped tasks) automatically use their configured accent color without manual per-card configuration.

## Problem Statement

Currently, each card (`person-points-card`, `person-rewards-card`, `grouped-card`) has an individual `accent_color` config property. For a multi-person household:

- Color configuration is duplicated across multiple cards per person
- No centralized management of person colors
- Tedious to maintain consistency (e.g., "Kyle's color should be blue everywhere")

## Goals

1. **Set and Forget**: Configure a person's accent color once, all their cards inherit it
2. **Centralized Storage**: Person colors stored in backend alongside person data
3. **Backwards Compatible**: Manual `accent_color` config still works (as override)
4. **Consistent UX**: All of Kyle's cards use the same blue accent automatically

## Design Decisions

### 1. Rename `PersonPoints` → `PersonProfile`

**Rationale**: The dataclass now stores more than just points data (balance, lifetime points, last updated). Adding `accent_color` makes "PersonPoints" a misnomer.

**Change**:

```python
# OLD
@dataclass
class PersonPoints:
    entity_id: str
    points_balance: int
    lifetime_points: int
    last_updated: str

# NEW
@dataclass
class PersonProfile:
    entity_id: str
    points_balance: int
    lifetime_points: int
    last_updated: str
    accent_color: str = ""  # NEW: UI accent color (hex code or CSS variable)
```

**Benefits**:

- Future-proof: Can add more profile fields (`display_name_override`, `notification_preferences`, etc.)
- Semantic clarity: "This is a person's profile in ChoreBot"
- Aligns with existing naming: `PeopleStore`, `chorebot_people` storage file (already generic!)

**Migration Impact**:

- Update Python dataclass in `people.py`
- Update TypeScript type in `src/utils/types.ts`
- Update all frontend cards that reference `PersonPoints`

### 2. Storage Location: `chorebot_people` File

**Rationale**: Person accent colors are hot data (read frequently for UI rendering), so store alongside points balances in the existing `chorebot_people` file.

**Storage Structure**:

```json
{
  "version": 1,
  "minor_version": 1,
  "key": "chorebot_people",
  "data": {
    "people": {
      "person.kyle": {
        "entity_id": "person.kyle",
        "points_balance": 150,
        "lifetime_points": 500,
        "last_updated": "2025-01-03T12:00:00Z",
        "accent_color": "#3498db"
      },
      "person.campbell": {
        "entity_id": "person.campbell",
        "points_balance": 80,
        "lifetime_points": 300,
        "last_updated": "2025-01-03T12:00:00Z",
        "accent_color": "#e74c3c"
      }
    }
  }
}
```

**Access Pattern**: Cards fetch from `sensor.chorebot_points` attributes (same as current points data).

### 3. Color Inheritance Strategy

**Precedence Order** (highest to lowest):

1. Manual `accent_color` in card config (explicit override)
2. Person's `accent_color` from profile (centralized setting)
3. Theme's `--primary-color` (fallback)

**Example**:

```typescript
// In card's willUpdate() or render()
let baseColor = "var(--primary-color)"; // Default fallback

// Check for centralized person color
if (this._config.person_entity) {
  const sensor = this.hass?.states["sensor.chorebot_points"];
  const people = sensor?.attributes.people || {};
  const personProfile = people[this._config.person_entity];
  if (personProfile?.accent_color) {
    baseColor = personProfile.accent_color;
  }
}

// Manual config overrides everything
if (this._config.accent_color) {
  baseColor = this._config.accent_color;
}

this.shades = calculateColorShades(baseColor);
```

### 4. Person Color Management Service

**New Service**: `chorebot.manage_person`

```yaml
service: chorebot.manage_person
data:
  person_id: person.kyle
  accent_color: "#3498db" # Hex code or CSS variable (e.g., "var(--blue-500)")
```

**Service Behavior**:

- Creates person record if not exists (with 0 points)
- Updates `accent_color` field in `chorebot_people` storage
- Validates color format (hex code or CSS variable)
- Triggers sensor state update

**Implementation Location**: Add to `people.py`'s `PeopleStore` class

```python
async def async_update_person_profile(
    self,
    person_id: str,
    accent_color: str | None = None,
) -> bool:
    """Update person profile fields.

    Args:
        person_id: HA Person entity_id
        accent_color: UI accent color (hex or CSS variable)

    Returns:
        True if successful
    """
    async with self._lock:
        people = self._data.setdefault("people", {})

        # Get or create person record
        if person_id not in people:
            now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
            people[person_id] = {
                "entity_id": person_id,
                "points_balance": 0,
                "lifetime_points": 0,
                "last_updated": now,
                "accent_color": "",
            }

        person = people[person_id]

        # Update fields
        if accent_color is not None:
            person["accent_color"] = accent_color

        person["last_updated"] = datetime.now(UTC).isoformat().replace("+00:00", "Z")

        await self.async_save_people()
        return True
```

### 5. Add Optional `person_entity` to Grouped Card

**Rationale**: Enable person-filtered views (e.g., "Kyle's Tasks" grouped by tag) while maintaining flexibility for family-wide views.

**Config Changes**:

```typescript
interface ChoreBotGroupedConfig extends ChoreBotBaseConfig {
  untagged_header?: string;
  tag_group_order?: string[];
  show_future_tasks?: boolean;
  person_entity?: string; // NEW: Optional person filter
}
```

**Filtering Logic** (in `task-utils.ts`):

```typescript
export function filterAndGroupTasks(
  entity: HassEntity,
  showDatelessTasks: boolean = true,
  showFutureTasks: boolean = false,
  untaggedHeader: string = "Untagged",
  upcomingHeader: string = "Upcoming",
  filterSectionId?: string,
  filterPersonId?: string, // NEW: Optional person filter
): GroupState[] {
  // ... existing date/section filtering ...

  for (const task of allTasks) {
    // Apply section filter
    if (sectionIdToMatch && task.section_id !== sectionIdToMatch) {
      continue;
    }

    // Apply person filter (uses pre-computed person_id from backend)
    if (filterPersonId && task.computed_person_id !== filterPersonId) {
      continue;
    }

    // ... rest of grouping logic ...
  }
}
```

**Use Cases**:

- **Family view**: No `person_entity` config → shows all tasks
- **Personal view**: With `person_entity: person.kyle` → shows only Kyle's tasks, uses Kyle's accent color

**Benefits**:

- Unified accent color strategy across all three cards
- Backend already computes `computed_person_id` (no extra work)
- Enables powerful dashboard configurations (see examples below)

## Implementation Plan

### Phase 1: Backend - Rename and Extend Data Model

**Files to modify**:

- `custom_components/chorebot/people.py`

**Changes**:

1. Rename `PersonPoints` → `PersonProfile`
2. Add `accent_color: str = ""` field to dataclass
3. Update `to_dict()` and `from_dict()` methods
4. Add `async_update_person_profile()` method to `PeopleStore`

**Migration**: Automatic (existing records don't have `accent_color`, defaults to empty string)

### Phase 2: Backend - Add Service Handler

**Files to modify**:

- `custom_components/chorebot/__init__.py`
- `custom_components/chorebot/services.yaml`

**Changes**:

1. Add `chorebot.manage_person` service handler
2. Service schema: `person_id` (required), `accent_color` (optional)
3. Validate color format (basic check for hex `#xxxxxx` or `var(--name)`)
4. Call `people_store.async_update_person_profile()`
5. Trigger sensor state update

### Phase 3: Frontend - Update TypeScript Types

**Files to modify**:

- `src/utils/types.ts`

**Changes**:

1. Rename `PersonPoints` → `PersonProfile` interface
2. Add `accent_color?: string` field

### Phase 4: Frontend - Update Cards with Color Inheritance

**Files to modify** (all three cards):

- `src/person-points-card.ts`
- `src/person-rewards-card.ts`
- `src/grouped-card.ts`

**Changes for each card**:

1. Add person color inheritance logic in `willUpdate()` or `render()`
2. Precedence: Manual config → Person profile → Theme default
3. For `grouped-card`: Add optional `person_entity` config field
4. For `grouped-card`: Pass `person_entity` to `filterAndGroupTasks()`
5. Update `getStubConfig()` and `getConfigForm()` if needed

### Phase 5: Utility Function Updates

**Files to modify**:

- `src/utils/task-utils.ts`

**Changes**:

1. Add `filterPersonId?: string` parameter to `filterAndGroupTasks()`
2. Apply person filter using `task.computed_person_id`

### Phase 6: Documentation

**Files to update**:

- `AGENTS.md` - Add section on person accent color system
- `README.md` - Add usage examples for `chorebot.manage_person` service

## Testing Checklist

- [ ] Rename `PersonPoints` → `PersonProfile` (Python + TypeScript)
- [ ] Add `accent_color` field to dataclass
- [ ] Add `chorebot.manage_person` service
- [ ] Test service: Set Kyle's color to blue
- [ ] Test service: Set Campbell's color to red
- [ ] Verify `sensor.chorebot_points` exposes colors in attributes
- [ ] Update person-points-card to inherit color
- [ ] Update person-rewards-card to inherit color
- [ ] Update grouped-card to inherit color
- [ ] Add `person_entity` filter to grouped-card config
- [ ] Test grouped-card with person filter
- [ ] Test grouped-card without person filter (family view)
- [ ] Test manual `accent_color` override still works
- [ ] Test fallback to theme color when no person color set
- [ ] Rebuild frontend cards (`npm run build`)
- [ ] Verify colors persist across HA restarts

## Example Dashboard Configurations

### Before (Current System)

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

### After (New System)

```yaml
# One-time setup (in automations.yaml or scripts.yaml)
- service: chorebot.manage_person
  data:
    person_id: person.kyle
    accent_color: "#3498db"

# Kyle's cards (color inherited automatically)
- type: custom:chorebot-person-points-card
  person_entity: person.kyle
  # accent_color automatically = "#3498db"

- type: custom:chorebot-grouped-card
  entity: todo.chorebot_family_tasks
  person_entity: person.kyle # NEW: Filter by person
  # accent_color automatically = "#3498db"

- type: custom:chorebot-person-rewards-card
  person_entity: person.kyle
  # accent_color automatically = "#3498db"

# Family-wide view (no person filter, neutral colors)
- type: custom:chorebot-grouped-card
  entity: todo.chorebot_family_tasks
  title: "Family Tasks"
  # No person_entity = shows all tasks
  # No accent_color = uses theme default
```

## Benefits Summary

1. **DRY Principle**: Configure person color once, reuse everywhere
2. **Consistency**: All of Kyle's cards guaranteed to use the same color
3. **Maintainability**: Change Kyle's color in one place, all cards update
4. **Flexibility**: Can still manually override per-card if needed
5. **Extensibility**: `PersonProfile` model can grow with future features
6. **Performance**: No additional backend work (hot data already loaded with points)
7. **User Experience**: More intuitive person-filtered views in grouped card

## Non-Goals (Future Enhancements)

- Theme-level person color definitions (could be added later)
- Color validation beyond basic format checking
- Color picker UI in card config editor
- Automatic color assignment based on HA person entity attributes
- Color inheritance from HA themes/blueprints

## Related Specifications

- `person-specific-rewards-plan.md` - Person-specific rewards implementation
- `computed-person-id-enhancement.md` - Backend person ID resolution
- `person-points-card-spec.md` - Person points card specification
