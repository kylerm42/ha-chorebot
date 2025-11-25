# Feature Spec: Person Points Card - Task Completion Progress Bar

## 1. Overview

**Purpose:** Enhance the existing `chorebot-person-points-card` to display task completion progress (completed/total) for tasks assigned to that person. Progress should only include tasks due at any time today or in the past.

**User Story:** As a user viewing a person's points card, I want to see a progress bar showing how many of their tasks are complete today, so that I can quickly understand their daily task completion status without scrolling through the task list.

## 2. Requirements

- [x] Keep existing avatar + name layout on left side
- [ ] Add progress bar below the person's name
- [ ] Progress bar shows: completed tasks / total tasks
- [ ] **Only count tasks due today or overdue** (same filter as `filterTodayTasks`)
- [ ] Exclude tasks with no due date from progress calculation
- [ ] Progress bar should be visually similar to existing HA progress indicators
- [ ] Configuration option to show/hide progress bar (default: true)
- [ ] Handle case where person has no tasks assigned (show 0/0 or hide bar)
- [ ] Match styling of existing ChoreBot cards

## 3. Architecture & Design

### High-Level Approach

This enhancement requires:

1. **New data source**: Query all todo entities to find tasks assigned to this person
2. **Person assignment logic**: Use the same logic as points award system (section > list > none)
3. **Task filtering**: Reuse `filterTodayTasks` logic but filter by person
4. **Progress calculation**: Use existing `calculateProgress` utility but exclude dateless tasks
5. **UI update**: Add progress bar component between avatar/name and points display

### Component Interaction

```
chorebot-person-points-card
  ↓
Home Assistant Entity System
  ↓
1. sensor.chorebot_points (get person's entity_id)
2. All todo.chorebot_* entities (get tasks)
  ↓
Filter tasks by:
  - Person assignment (section_id or list metadata)
  - Due date (today or overdue only)
  ↓
Calculate progress (completed/total)
  ↓
Render progress bar below name
```

### Data Flow

1. Card receives `person_entity` config (e.g., `person.kyle`)
2. Card queries all `todo.chorebot_*` entities from `this.hass.states`
3. For each entity, card reads `chorebot_tasks`, `chorebot_sections`, and list metadata
4. Card filters tasks where:
   - Task's section has `person_id === person_entity`, OR
   - Task's list has `person_id === person_entity` (via metadata attribute), OR
   - Task has no section and list has `person_id === person_entity`
5. Card further filters to only tasks due today or overdue (reuse `filterTodayTasks` logic)
6. Card excludes dateless tasks from progress count
7. Card calculates `completed = tasks.filter(t => t.status === 'completed').length`
8. Card renders progress bar: `X / Y tasks` with visual bar

### Critical Design Decisions

- **Decision:** Reuse `filterTodayTasks` and `calculateDatedTasksProgress` utilities
  - **Rationale:** Consistency with existing task filtering logic across all cards. Proven implementation.
  - **Trade-offs:** None - eliminates code duplication.

- **Decision:** Exclude dateless tasks from progress calculation
  - **Rationale:** User requested "tasks due at any time today or in the past". Dateless tasks have no due date, so they shouldn't affect today's progress.
  - **Trade-offs:** Dateless tasks won't contribute to progress, even if completed. This is intentional per requirements.

- **Decision:** Query all todo entities (not just the one configured in list cards)
  - **Rationale:** Person may have tasks across multiple lists. Progress should reflect ALL their tasks.
  - **Trade-offs:** Slightly more data to process, but negligible performance impact.

- **Decision:** Use person assignment logic from points system
  - **Rationale:** Progress should match which tasks award points to this person.
  - **Trade-offs:** Requires understanding section/list metadata, but this is already implemented in backend.

- **Decision:** Show "0/0 tasks" when person has no assigned tasks
  - **Rationale:** Clear feedback that the person exists but has no tasks today.
  - **Trade-offs:** Could be confusing vs hiding the bar, but transparency is better.

- **Decision:** Add `show_progress` config option (default: true)
  - **Rationale:** Users may want points-only display without progress.
  - **Trade-offs:** More config complexity, but follows HA best practices for optional features.

## 4. Data Model Changes

**No backend changes required.** This card reads from existing entities:

- `sensor.chorebot_points` - Get person's `entity_id`
- `todo.chorebot_*` entities - Read tasks, sections, and list metadata
- Use existing `chorebot_tasks`, `chorebot_sections` attributes
- Use existing list metadata (stored as entity attribute)

**New utility function needed:**

```typescript
/**
 * Filter tasks assigned to a specific person
 * Uses section person_id (priority) or list person_id (fallback)
 */
export function filterTasksByPerson(
  entities: HassEntity[],
  personEntityId: string,
  includeDateless: boolean = false,
): Task[];
```

## 5. Execution Strategy

### Step-by-Step Implementation (Simple)

- [ ] **Step 1: Add utility function for person task filtering**
  - _Files:_ `src/utils/task-utils.ts`
  - _Function:_ `filterTasksByPerson(entities, personEntityId, includeDateless)`
  - _Logic:_
    - Iterate through all entities starting with `todo.chorebot_`
    - For each task, check section's `person_id` first, then list's metadata `person_id`
    - Return array of tasks assigned to this person
  - _Reuse:_ Call `filterTodayTasks` on each entity's tasks first
  - _Reuse:_ Use `calculateDatedTasksProgress` for final count

- [ ] **Step 2: Update TypeScript types**
  - _Files:_ `src/utils/types.ts`
  - _Update:_ `ChoreBotPersonPointsConfig` interface
  - _Add field:_ `show_progress?: boolean` (default: true)

- [ ] **Step 3: Update card component**
  - _Files:_ `src/person-points-card.ts`
  - _Add state:_ `@state() private _progress?: Progress`
  - _Add method:_ `_calculatePersonProgress(): Progress`
  - _Update:_ `render()` to call calculation and pass to display method
  - _Update:_ `setConfig()` to include `show_progress` with default

- [ ] **Step 4: Implement progress calculation method**
  - _Files:_ `src/person-points-card.ts`
  - _Method:_ `_calculatePersonProgress()`
  - _Logic:_
    ```typescript
    const entities = Object.values(this.hass.states).filter((e) =>
      e.entity_id.startsWith("todo.chorebot_"),
    );
    const personTasks = filterTasksByPerson(
      entities,
      this._config.person_entity,
      false, // Don't include dateless
    );
    return calculateDatedTasksProgress(personTasks);
    ```

- [ ] **Step 5: Add progress bar styling**
  - _Files:_ `src/person-points-card.ts`
  - _Section:_ `static styles`
  - _Add CSS:_

    ```css
    .person-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0; /* Allow truncation */
    }

    .progress-container {
      width: 100%;
      max-width: 200px;
    }

    .progress-bar-wrapper {
      background: var(--divider-color);
      border-radius: 4px;
      height: 8px;
      overflow: hidden;
      margin-top: 4px;
    }

    .progress-bar-fill {
      background: var(--primary-color);
      height: 100%;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 12px;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    ```

- [ ] **Step 6: Update render method**
  - _Files:_ `src/person-points-card.ts`
  - _Method:_ `_renderPersonDisplay()`
  - _Change structure:_
    ```html
    <div class="person-left">
      {avatar}
      <div class="person-info">
        <div class="person-name">{name}</div>
        {this._config.show_progress ? progressBar : ''}
      </div>
    </div>
    ```

- [ ] **Step 7: Create progress bar rendering method**
  - _Files:_ `src/person-points-card.ts`
  - _Method:_ `_renderProgressBar(progress: Progress)`
  - _Template:_
    ```html
    <div class="progress-container">
      <div class="progress-bar-wrapper">
        <div class="progress-bar-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="progress-text">${completed}/${total} tasks</div>
    </div>
    ```

- [ ] **Step 8: Update configuration form**
  - _Files:_ `src/person-points-card.ts`
  - _Method:_ `static getConfigForm()`
  - _Add field:_
    ```typescript
    {
      name: "show_progress",
      default: true,
      selector: { boolean: {} },
    }
    ```
  - _Add label:_ "Show Progress Bar"
  - _Add helper:_ "Display task completion progress below the person's name"

- [ ] **Step 9: Update stub config**
  - _Files:_ `src/person-points-card.ts`
  - _Method:_ `static getStubConfig()`
  - _Add:_ `show_progress: true`

- [ ] **Step 10: Test implementation**
  - _Build:_ Run `npm run build`
  - _Test cases:_
    - Person with tasks (some completed)
    - Person with no tasks today
    - Person with 100% completion
    - Person with 0% completion
    - Config with `show_progress: false`
    - Multiple lists with different person assignments
    - Section-level person assignment override

## 6. Usage Scenarios / Edge Cases

### Scenario A: Happy Path (Person with Mixed Tasks)

- **Input:** Kyle has 8 tasks today (5 completed, 3 incomplete)
- **Output:** Progress bar shows "5/8 tasks" with 62.5% fill
- **Expected:** Bar is mostly filled, text clearly shows progress

### Scenario B: Person with No Tasks Today

- **Input:** Campbell has no tasks assigned for today
- **Output:** Progress bar shows "0/0 tasks" with 0% fill (empty bar)
- **Expected:** Clear indication that person has no tasks (not an error)

### Scenario C: Person with 100% Completion

- **Input:** Kyle completed all 5 tasks assigned for today
- **Output:** Progress bar shows "5/5 tasks" with 100% fill
- **Expected:** Full green bar, visual "done" state

### Scenario D: Person with Only Dateless Tasks

- **Input:** Campbell has 3 dateless tasks (not counted in progress)
- **Output:** Progress bar shows "0/0 tasks"
- **Expected:** Dateless tasks correctly excluded per requirements

### Scenario E: Mixed List/Section Assignment

- **Input:** List has person_id=kyle, but one section has person_id=campbell
- **Output:** Kyle's card shows only tasks NOT in Campbell's section
- **Expected:** Section assignment correctly overrides list assignment

### Scenario F: Progress Disabled

- **Input:** Config has `show_progress: false`
- **Output:** Card shows avatar, name, and points only (no progress bar)
- **Expected:** Layout identical to current implementation

### Scenario G: Person with Only Overdue Tasks

- **Input:** Kyle has 3 overdue tasks (all incomplete)
- **Output:** Progress bar shows "0/3 tasks" with 0% fill
- **Expected:** Overdue tasks correctly included in denominator

## 7. Security & Performance Considerations

### Security

- **No new security risks:** Reading from existing entities only
- **No user input:** Progress calculated from entity data, not user input

### Performance

- **Query optimization:** Filter entities by `todo.chorebot_` prefix to avoid checking all entities
- **Calculation caching:** Progress recalculated on each render (reactive to state changes)
- **Minimal overhead:** `O(n)` where n = total tasks across all lists (typically < 100)
- **Estimated impact:** +1-2ms render time for typical workload (10-50 tasks)

### Accessibility

- **ARIA labels:** Add `aria-label` to progress bar: "X of Y tasks completed"
- **Color independence:** Show text count alongside visual bar (don't rely on color alone)
- **Screen reader friendly:** Text "X/Y tasks" is readable by screen readers

## 8. Configuration Reference

### YAML Configuration Example

```yaml
type: custom:chorebot-person-points-card
person_entity: person.kyle
title: Kyle's Tasks
show_title: false
show_progress: true # NEW
hide_card_background: true
```

### Configuration Options (Updated)

| Option                 | Type    | Default        | Description                                               |
| ---------------------- | ------- | -------------- | --------------------------------------------------------- |
| `person_entity`        | string  | **(required)** | Person entity ID (e.g., `person.kyle`)                    |
| `title`                | string  | `"Points"`     | Card title (only shown if `show_title` is true)           |
| `show_title`           | boolean | `true`         | Whether to display the card title                         |
| `show_progress`        | boolean | `true`         | **NEW:** Display task completion progress bar             |
| `hide_card_background` | boolean | `false`        | Remove card background for seamless dashboard integration |

## 9. Visual Design Mockup

### Before (Current)

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌────┐  Kyle                  150 pts │
│  │ KH │                                 │
│  └────┘                                 │
│                                         │
└─────────────────────────────────────────┘
```

### After (With Progress Bar)

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌────┐  Kyle                  150 pts │
│  │ KH │  ████████░░░░  5/8 tasks        │
│  └────┘                                 │
│                                         │
└─────────────────────────────────────────┘
```

### Responsive Behavior (Mobile)

Same layout maintained. Progress bar width adapts to available space (max-width: 200px).

## 10. Testing Checklist

- [ ] Progress bar displays correctly with mixed completion
- [ ] Progress bar shows 0/0 when no tasks assigned
- [ ] Progress bar shows 100% when all tasks complete
- [ ] Dateless tasks are excluded from count
- [ ] Overdue tasks are included in count
- [ ] Section person_id overrides list person_id correctly
- [ ] Multiple lists with same person work correctly
- [ ] `show_progress: false` hides progress bar
- [ ] Progress updates when tasks completed/uncompleted
- [ ] Layout doesn't break with long person names
- [ ] Responsive design works on mobile (avatar shrinks)
- [ ] ARIA labels present for accessibility
- [ ] Build succeeds with no TypeScript errors

## 11. Implementation Notes

### Reusable Utilities

This implementation leverages existing shared utilities:

1. **`filterTodayTasks()`** from `task-utils.ts` - Already handles today/overdue logic
2. **`calculateDatedTasksProgress()`** from `task-utils.ts` - Already excludes dateless tasks
3. **`Progress` interface** from `types.ts` - Already defined with `completed` and `total` fields

### New Utility Function Signature

```typescript
/**
 * Filter tasks assigned to a specific person across all ChoreBot lists
 * @param entities - All Home Assistant entities (will filter to todo.chorebot_*)
 * @param personEntityId - Person entity ID (e.g., "person.kyle")
 * @param includeDateless - Whether to include dateless tasks (default: false)
 * @returns Array of tasks assigned to this person (already filtered by today/overdue)
 */
export function filterTasksByPerson(
  entities: HassEntity[],
  personEntityId: string,
  includeDateless: boolean = false,
): Task[];
```

### Person Assignment Resolution Logic

```typescript
// For each task:
if (task.section_id) {
  const section = sections.find((s) => s.id === task.section_id);
  if (section?.person_id) {
    return section.person_id === targetPersonId; // Section overrides
  }
}
// No section person_id, check list metadata
const listMetadata = entity.attributes.chorebot_metadata;
if (listMetadata?.person_id) {
  return listMetadata.person_id === targetPersonId;
}
// No assignment
return false;
```

---

## Summary

This plan adds a task completion progress bar to the person points card by:

1. **Reusing existing utilities** for task filtering and progress calculation
2. **Adding one new utility** (`filterTasksByPerson`) to handle person assignment logic
3. **Minimal UI changes** - progress bar inserted below person name, layout otherwise unchanged
4. **Configuration option** to show/hide progress (default: show)
5. **No backend changes** - all data already available in entity attributes

The implementation follows the existing ChoreBot architecture patterns and maintains visual consistency with other cards. Estimated bundle size increase: +3-5KB (from ~37KB to ~40-42KB).
