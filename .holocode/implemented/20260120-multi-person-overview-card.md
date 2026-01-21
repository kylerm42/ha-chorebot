# Implementation Summary: Multi-Person Overview Card

**Feature ID**: 20260120-multi-person-overview-card  
**Status**: Implemented  
**Created**: 2026-01-20  
**Implemented**: 2026-01-20  
**Owner**: AP-5

## Overview

Implemented a new ChoreBot card that displays a vertical list of multiple people with their assigned tasks in a simple, ungrouped format. This card is designed for quick family-wide status checks where users need to see "who has what to do" at a glance.

## Implementation Summary

### Files Created/Modified

**New Files:**
- `frontend/src/multi-person-overview-card.ts` (370 lines)
  - Full card implementation with LitElement
  - Config validation and state management
  - Person section rendering with task lists
  - Task completion handling
  - Responsive CSS styling

**Modified Files:**
- `frontend/src/utils/types.ts`
  - Added `ChoreBotMultiPersonOverviewConfig` interface (lines 202-215)
- `frontend/src/utils/task-utils.ts`
  - Added `groupTasksByPerson()` utility function (lines 152-210)
- `frontend/src/index.ts`
  - Added card import (line 24)

### Key Features Implemented

1. **Multi-Person Display**
   - Configurable list of people via `person_entities` array
   - Maintains display order from configuration
   - Section headers show person names using `getPersonName()` utility

2. **Task Filtering**
   - Reuses `filterTodayTasks()` utility for consistent filtering logic
   - Shows today's tasks, overdue tasks, and tasks completed today
   - Optional dateless task inclusion via `show_dateless_tasks` config
   - Optional section filtering via `filter_section_id` config

3. **Person Assignment**
   - Uses backend-computed `computed_person_id` field
   - No frontend person resolution logic needed
   - Tasks grouped via `groupTasksByPerson()` utility

4. **Minimal Task Display**
   - Each task shows ONLY checkbox and title (summary)
   - No due dates, points badges, tags, or expand/collapse
   - Read-only view (no edit dialog)

5. **Status Styling**
   - Overdue tasks: red text (`--error-color` or `#f44336`)
   - Completed tasks: strikethrough with 60% opacity
   - Normal tasks: default text color

6. **Empty State Handling**
   - People with no tasks show "No tasks for today" message
   - Italic text with muted color for visual distinction

7. **Task Interaction**
   - Clickable checkboxes for completion/incompletion
   - Standard HA service calls: `todo.update_item`
   - Error handling with toast notifications

8. **Responsive Design**
   - Mobile (< 600px): smaller text, tighter spacing
   - Desktop: comfortable spacing, larger touch targets
   - Accessible touch targets (min 44px height)

### Code Reuse

Maximized utility reuse (~70% code reuse):
- `filterTodayTasks()` from task-utils.ts
- `groupTasksByPerson()` from task-utils.ts
- `isOverdue()` from date-utils.ts
- `getPersonName()` from person-display-utils.ts

### Configuration Options

**Required:**
- `entity`: Todo entity (e.g., `todo.chorebot_family_tasks`)
- `person_entities`: Ordered list of person IDs (e.g., `["person.kyle", "person.campbell"]`)

**Optional:**
- `title`: Card title (default: "Family Tasks")
- `show_title`: Show title bar (default: true)
- `hide_card_background`: Remove card background (default: false)
- `show_dateless_tasks`: Include dateless tasks (default: true)
- `filter_section_id`: Optional section filter (e.g., "Morning Routine")

### Example Configurations

**Minimal:**
```yaml
type: custom:chorebot-multi-person-overview-card
entity: todo.chorebot_family_tasks
person_entities:
  - person.kyle
  - person.campbell
  - person.sarah
```

**Full:**
```yaml
type: custom:chorebot-multi-person-overview-card
entity: todo.chorebot_family_tasks
person_entities:
  - person.kyle
  - person.campbell
  - person.sarah
title: "Family Tasks Overview"
show_title: true
hide_card_background: false
show_dateless_tasks: true
filter_section_id: "Morning Routine"
```

## Technical Details

### Task Sorting Logic

Tasks within each person section are sorted:
1. Overdue tasks first (oldest to newest by due date)
2. Today tasks next (earliest to latest by due date)
3. Dateless tasks last (no secondary sort)

This logic is implemented in the `groupTasksByPerson()` utility function.

### Build System Integration

- Uses existing single-bundle Rollup configuration
- No changes needed to `rollup.config.mjs`
- Card automatically included via `index.ts` import
- Self-registers via `@customElement` decorator

### Bundle Size

Estimated: 15-20KB (minified + gzipped)
- Smaller than grouped-card due to:
  - No tag grouping complexity
  - No edit dialog
  - No confetti animations
  - No points badge logic

### Browser Compatibility

Same as other ChoreBot cards (modern browsers with ES2020+ support).

## Implementation Notes

### Deviations from Spec

**None** - Implementation follows specification exactly.

### Design Decisions Confirmed

1. **No Grouping Within Person Sections**: Tasks appear in simple vertical list per person (not grouped by tags)
2. **Minimal Task Rendering**: Only checkbox + title (no metadata)
3. **No Edit/Expand Capability**: Read-only status overview card
4. **Configurable Person List**: User controls which people appear and in what order
5. **Backend `computed_person_id` Dependency**: Single source of truth for person assignment

### Performance Considerations

- **Task Filtering**: O(n) where n = number of tasks (optimized via existing utility)
- **Grouping**: O(n) with O(p) initialization where p = number of configured people
- **Sorting**: O(n log n) per person group (negligible for typical task counts)
- **Re-rendering**: Only triggers on entity state changes (standard Lit reactivity)

### Security

- No XSS vulnerabilities (all dynamic content from trusted HA entities)
- No user input fields (read-only view)
- Service calls use standard HA authentication

## Testing Checklist

Ready for manual testing:
- [ ] Test with 0, 1, 2, 3+ people in config
- [ ] Test with people who have no tasks (empty state display)
- [ ] Test overdue task styling (red text)
- [ ] Test completed task styling (strikethrough)
- [ ] Test task completion/incompletion (checkbox toggle)
- [ ] Test with `show_dateless_tasks: false` config
- [ ] Test with `filter_section_id` config (person + section filtering)
- [ ] Test responsive layout on mobile and desktop screens
- [ ] Test with missing person entities (graceful degradation)
- [ ] Test service call error handling (toast notification)

## Use Cases

1. **Main Family Dashboard**: Show all family members' tasks on main view
2. **Morning Routine Check**: Filter to morning section to see who has what to do before school
3. **Parental Oversight**: Parents can quickly see if kids have completed their chores
4. **Single Person View**: Works fine with just one person (simpler than person-grouped-card)

## Next Steps

1. **User Testing**: Deploy to development environment for family testing
2. **Feedback Collection**: Gather usability feedback on:
   - Task sorting order (is overdue-first intuitive?)
   - Empty state messaging (is "No tasks for today" clear?)
   - Mobile responsiveness (is text size appropriate?)
3. **Documentation**: Add card to README with configuration examples
4. **HACS Release**: Include in next HACS plugin release

## Related Files

- Specification: `.holocode/proposed/20260120-multi-person-overview-card/SPEC.md`
- Implementation: `frontend/src/multi-person-overview-card.ts`
- Utilities: `frontend/src/utils/task-utils.ts`, `frontend/src/utils/types.ts`
