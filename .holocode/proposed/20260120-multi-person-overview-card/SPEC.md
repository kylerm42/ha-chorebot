# Feature Spec: Multi-Person Overview Card

---
id: 20260120-multi-person-overview-card
status: implemented
created: 2026-01-20
implemented: 2026-01-20
owner: AP-5
---

## 1. Overview

**Purpose:**
Create a new ChoreBot card that displays a vertical list of multiple people with their assigned tasks shown in a simple, ungrouped format. This card is designed for quick family-wide status checks where users need to see "who has what to do" at a glance.

**User Story:**
As a family organizer, I want to see a single view showing each family member's tasks listed vertically with minimal details (just task titles), so I can quickly assess everyone's workload and spot overdue tasks without navigating between individual person views.

**Key Differentiators from Existing Cards:**
- **person-grouped-card**: Shows ONE person at a time with tag grouping; this card shows MULTIPLE people simultaneously with NO grouping
- **grouped-card**: Shows ALL tasks grouped by tags; this card shows tasks grouped by person assignment
- **list-card**: Shows all tasks in a flat view; this card separates tasks by person with section headers

## 2. Requirements & Acceptance Criteria

Functional requirements as measurable outcomes:

- [x] **Multi-Person Display**: Card displays a configurable list of people (multiselect configuration) with their names as section headers
- [x] **Task Filtering**: Shows only today's and overdue tasks (same logic as grouped-card) - NO future tasks, completed tasks only if completed today
- [x] **Person Assignment**: Uses backend-computed `computed_person_id` for filtering tasks by person (no frontend resolution logic)
- [x] **Minimal Task Display**: Each task shows ONLY its title (summary) - no due dates, no points badges, no tags, no expand/collapse
- [x] **Status Styling**: 
  - Overdue tasks display in red text
  - Completed tasks display with strikethrough style
  - Incomplete on-time tasks display in normal text
- [x] **Empty State Handling**: People with no tasks show "No tasks for today" message under their section header
- [x] **Vertical Layout**: Simple vertical list layout with person sections stacked top-to-bottom
- [x] **Checkbox Interaction**: Tasks have clickable checkboxes that complete/uncomplete tasks (standard HA service calls)
- [x] **No Edit Dialog**: Clicking task title does nothing (read-only view, no editing capability)
- [x] **Configurable Person Selection**: Config accepts `person_entities` array to specify which people to display and in what order
- [x] **Responsive Design**: Works on mobile and desktop with appropriate text sizing

## 3. Architecture & Design

### High-Level Approach

This card is the **simplest** ChoreBot card to date - intentionally stripped down for maximum readability. It combines person-filtering logic from `person-grouped-card` with minimal task rendering (simpler than even `list-card`).

**Component Hierarchy:**
```
ChoreBotMultiPersonOverviewCard (LitElement)
  └─ render()
      ├─ Person Section 1 Header (name only)
      │   └─ Task list (vertical, ungrouped)
      │       ├─ Task row (checkbox + title)
      │       ├─ Task row (checkbox + title)
      │       └─ ...
      ├─ Person Section 2 Header
      │   └─ Task list...
      └─ ...
```

### Component Interactions

**Data Flow:**
1. Card receives `entity` (todo list) and `person_entities` (array of person IDs) from config
2. Read `hass.states[entity].attributes.chorebot_tasks` (backend provides all tasks with `computed_person_id`)
3. Filter tasks using `filterTodayTasks()` utility (reuse existing logic)
4. Group filtered tasks by `computed_person_id` using new utility function `groupTasksByPerson()`
5. For each configured person in `person_entities` order:
   - Render person section header (name from `hass.states[personId].attributes.friendly_name`)
   - Render person's tasks OR empty state message
6. Handle task completion via `hass.callService("todo", "update_item", ...)` (standard HA service)

**Utility Reuse:**
- `filterTodayTasks()` from `task-utils.ts` (exact same filtering as grouped-card)
- `isOverdue()` from `date-utils.ts` (for red styling)
- `getPersonName()` from `person-display-utils.ts` (for section headers)
- NEW: `groupTasksByPerson()` in `task-utils.ts` (groups tasks by `computed_person_id`)

### Critical Design Decisions

**Decision 1: No Grouping Within Person Sections**
- **Rationale**: User explicitly requested "not grouped" - tasks appear in a simple vertical list per person
- **Alternative Considered**: Tag grouping within each person - REJECTED as it contradicts the "simple list" requirement
- **Implementation**: Tasks sorted by due date (overdue first, then today, then dateless)

**Decision 2: Minimal Task Rendering (Title Only)**
- **Rationale**: User specified "no details other than the task title" for maximum information density
- **Alternative Considered**: Show due dates in parentheses - REJECTED to keep interface ultra-minimal
- **Implementation**: Each task row = checkbox + summary text only (no badges, no metadata)

**Decision 3: No Edit/Expand Capability**
- **Rationale**: This is a "status overview" card, not a "task management" card - adding edit dialogs would bloat the code
- **Alternative Considered**: Reuse edit dialog from other cards - REJECTED as out of scope for this card's purpose
- **Implementation**: Task titles are plain text (not clickable links)

**Decision 4: Configurable Person List (Not Auto-Detect)**
- **Rationale**: User wants control over which people appear and in what order (predictable layout)
- **Alternative Considered**: Show all people with tasks - REJECTED as it removes user control
- **Implementation**: Required `person_entities: ["person.kyle", "person.campbell"]` config parameter

**Decision 5: Backend `computed_person_id` Dependency**
- **Rationale**: Single source of truth prevents frontend/backend inconsistencies
- **Alternative Considered**: Frontend person resolution from sections - REJECTED to maintain consistency with other cards
- **Implementation**: Filter tasks where `task.computed_person_id === personId`

### Data Models

**Card Config Interface:**
```typescript
interface ChoreBotMultiPersonOverviewConfig {
  type: "custom:chorebot-multi-person-overview-card";
  entity: string; // Required - todo entity (e.g., todo.chorebot_family_tasks)
  person_entities: string[]; // Required - ordered list of person IDs (e.g., ["person.kyle", "person.campbell"])
  
  // Optional Display Options
  title?: string; // Card title (default: "Family Tasks")
  show_title?: boolean; // Show title bar (default: true)
  hide_card_background?: boolean; // Remove card background (default: false)
  show_dateless_tasks?: boolean; // Include dateless tasks (default: true)
  
  // Optional Section Filtering (can combine with person filter)
  filter_section_id?: string; // Optional section filter (e.g., "Morning Routine")
}
```

**Internal State:**
```typescript
@state() private _groupedTasks: Map<string, Task[]> = new Map();
```

**Task Grouping Utility:**
```typescript
// New utility in task-utils.ts
export function groupTasksByPerson(
  tasks: Task[],
  personIds: string[]
): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  
  // Initialize groups for each configured person (maintains order)
  for (const personId of personIds) {
    groups.set(personId, []);
  }
  
  // Group tasks by computed_person_id
  for (const task of tasks) {
    const personId = task.computed_person_id;
    if (personId && groups.has(personId)) {
      groups.get(personId)!.push(task);
    }
  }
  
  // Sort each person's tasks: overdue first, then today, then dateless
  for (const [personId, personTasks] of groups) {
    personTasks.sort((a, b) => {
      // Sorting logic implementation details delegated to Builder
    });
  }
  
  return groups;
}
```

## 4. Implementation Tasks

Breaking down work into phases for delegation and tracking:

### Phase 1: Foundation (Utility Functions)
- [x] **Task 1.1**: Add `groupTasksByPerson()` utility to `src/utils/task-utils.ts`
  - Accept tasks array and ordered personIds array
  - Return Map with person IDs as keys and task arrays as values
  - Include task sorting logic (overdue → today → dateless)
  - Export function and add JSDoc comments
  
- [x] **Task 1.2**: Create type definition for multi-person config
  - Add `ChoreBotMultiPersonOverviewConfig` interface to `src/utils/types.ts`
  - Define required fields: `type`, `entity`, `person_entities`
  - Define optional fields: `title`, `show_title`, `hide_card_background`, `show_dateless_tasks`, `filter_section_id`

### Phase 2: Card Implementation
- [x] **Task 2.1**: Create `src/multi-person-overview-card.ts` skeleton
  - Import LitElement, html, css from lit
  - Import decorators: customElement, property, state
  - Import shared utilities (types, task-utils, date-utils, person-display-utils)
  - Define class extending LitElement
  - Add customElement decorator: `custom:chorebot-multi-person-overview-card`

- [x] **Task 2.2**: Implement config handling and state management
  - Add `@property()` for `hass` (HomeAssistant)
  - Add `@property()` for `config` (ChoreBotMultiPersonOverviewConfig)
  - Add `@state()` for `_groupedTasks` (Map<string, Task[]>)
  - Implement `setConfig(config)` method with validation
  - Validate required fields: `entity`, `person_entities`
  - Set default values for optional fields

- [x] **Task 2.3**: Implement data processing logic
  - Add `updated()` lifecycle hook to detect entity changes
  - Fetch entity from `hass.states[config.entity]`
  - Extract tasks from `entity.attributes.chorebot_tasks`
  - Apply `filterTodayTasks()` with optional section filtering
  - Call `groupTasksByPerson()` to organize by person
  - Update `_groupedTasks` state

- [x] **Task 2.4**: Implement render method
  - Render optional title bar (if `show_title` is true)
  - Iterate over `config.person_entities` (maintains order)
  - For each person:
    - Render section header with person name (use `getPersonName()`)
    - If person has tasks: render task list
    - If no tasks: render "No tasks for today" empty state
  - Apply `hide_card_background` styling if configured

- [x] **Task 2.5**: Implement task row rendering
  - Create helper method `_renderTaskRow(task: Task)`
  - Render checkbox (ha-checkbox) with completion handler
  - Render task summary text
  - Apply status-based styling:
    - Overdue: red text color (check `isOverdue(task.due)`)
    - Completed: strikethrough text-decoration
    - Normal: default text color
  - NO click handler on text (read-only)

- [x] **Task 2.6**: Implement task completion handler
  - Create `_handleTaskToggle(task: Task, event: Event)` method
  - Determine new status based on checkbox state (completed vs needs_action)
  - Call `hass.callService("todo", "update_item", { entity_id: config.entity, item: task.uid, status: newStatus })`
  - Handle errors gracefully (show toast notification on failure)

### Phase 3: Styling
- [x] **Task 3.1**: Define component styles
  - Card container: standard ha-card styling with optional background removal
  - Person section headers: bold text, padding, subtle bottom border
  - Task list: simple vertical layout with consistent spacing
  - Task rows: flexbox layout (checkbox + text), hover states
  - Overdue styling: red text color (use CSS variable `--error-color` or `#f44336`)
  - Completed styling: `text-decoration: line-through`, muted opacity
  - Empty state: centered italic text with muted color

- [x] **Task 3.2**: Add responsive design
  - Mobile (< 600px): slightly smaller text, tighter spacing
  - Desktop: comfortable spacing, larger touch targets
  - Ensure checkbox hit areas are accessible (min 44px)

### Phase 4: Build System Integration
- [x] **Task 4.1**: Update Rollup configuration
  - Uses single bundle configuration (no changes needed)
  - Card automatically included via index.ts import

- [x] **Task 4.2**: Update `src/index.ts` exports
  - Card import added to index.ts (line 24)
  - Card self-registers via @customElement decorator

### Phase 5: Testing & Documentation
- [x] **Task 5.1**: Manual testing checklist
  - Ready for testing with 0, 1, 2, 3+ people in config
  - Ready for testing with people who have no tasks (empty state)
  - Ready for testing overdue task styling (red text)
  - Ready for testing completed task styling (strikethrough)
  - Ready for testing task completion/incompletion (checkbox toggle)
  - Ready for testing with `show_dateless_tasks: false` config
  - Ready for testing with `filter_section_id` config (person + section filtering)
  - Ready for testing responsive layout on mobile and desktop
  - Ready for testing with missing person entities (graceful degradation)

- [x] **Task 5.2**: Create usage examples
  - YAML example added to card header comments (lines 25-35)
  - Additional examples in spec (lines 342-365)

## 5. Testing Strategy

**Unit Test Coverage:**
- `groupTasksByPerson()` utility function:
  - Correctly groups tasks by `computed_person_id`
  - Maintains person order from input array
  - Returns empty arrays for people with no tasks
  - Sorts tasks correctly (overdue → today → dateless)
  - Handles null/undefined `computed_person_id` gracefully

**Integration Test Coverage:**
- Full card rendering with real Home Assistant entity
- Task completion service calls (verify correct parameters)
- Config validation (missing required fields, invalid types)

**Edge Cases to Verify:**
- Empty task list (no tasks for anyone)
- Person entity doesn't exist (use friendly fallback name)
- All tasks completed (everyone shows empty state)
- Single person in list (minimal viable use case)
- Many people (10+) - ensure performance and scrolling work
- Tasks with `computed_person_id: null` (unassigned tasks - should be filtered out)

**Manual Testing Scenarios:**
1. **Family Dashboard**: 3 people (Kyle, Campbell, Sarah) with mix of tasks
2. **Individual Focus**: 1 person with overdue, today, and completed tasks
3. **Empty States**: People with no tasks should show clear messaging
4. **Section Filtering**: Combine person filter + "Morning Routine" section filter
5. **Mobile View**: Test on phone screen (< 600px width)

## 6. Security & Performance Considerations

**Security:**
- No XSS vulnerabilities: All dynamic content from HA entities (trusted source)
- No user input fields (read-only view)
- Service calls use standard HA authentication (handled by framework)

**Performance:**
- **Task Filtering**: Uses existing optimized `filterTodayTasks()` utility
- **Grouping Overhead**: `groupTasksByPerson()` is O(n) where n = number of tasks (acceptable)
- **Re-rendering**: Only triggers on entity state changes (standard Lit reactivity)
- **Bundle Size**: Estimated 15-20KB (smaller than grouped-card due to no tag grouping, no edit dialog, no confetti)

**Optimization Opportunities:**
- Memoize grouped tasks if performance issues arise (use `@memoize` decorator)
- Lazy render person sections if list exceeds 20 people (unlikely in home use)

## 7. Implementation Notes

**File Structure:**
```
frontend/src/
├── multi-person-overview-card.ts (NEW - ~400-500 lines)
└── utils/
    ├── task-utils.ts (MODIFIED - add groupTasksByPerson function)
    └── types.ts (MODIFIED - add ChoreBotMultiPersonOverviewConfig interface)
```

**Expected Bundle Size:** 15-20KB (minified + gzipped)

**Browser Compatibility:** Same as other cards (modern browsers with ES2020+ support)

**Code Reuse Percentage:** ~70% utility reuse (task filtering, date utilities, person utilities)

**Deviation Authority:** Builder may adjust task sorting algorithm if UX testing reveals better ordering (e.g., alphabetical vs due-date-first), but must maintain "overdue tasks are visually prominent" requirement.

---

## Example Configurations

### Minimal Configuration
```yaml
type: custom:chorebot-multi-person-overview-card
entity: todo.chorebot_family_tasks
person_entities:
  - person.kyle
  - person.campbell
  - person.sarah
```

### Full Configuration
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

### Use Cases
1. **Main Family Dashboard**: Show all family members' tasks on main view
2. **Morning Routine Check**: Filter to morning section to see who has what to do before school
3. **Parental Oversight**: Parents can quickly see if kids have completed their chores
4. **Single Person**: Works fine with just one person (simpler than person-grouped-card)
