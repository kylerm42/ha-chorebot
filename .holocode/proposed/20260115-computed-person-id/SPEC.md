# Feature Spec: Computed Person ID Enhancement

## 1. Overview

**Purpose:** Eliminate code duplication and improve robustness by computing person assignment once in the backend and exposing it to the frontend via entity state attributes.

**User Story:** As a developer, I want person assignment logic centralized in the backend so that the frontend doesn't duplicate complex resolution rules, reducing maintenance burden and preventing inconsistencies.

**Problem Statement:** Currently, both backend (`todo.py::_resolve_person_id_for_task`) and frontend (`task-utils.ts::filterTasksByPerson`) implement the same person resolution logic (section → list → None). This duplication creates:

- Maintenance burden (must keep two implementations in sync)
- Bug risk (logic could diverge)
- Performance overhead (frontend repeats lookups on every filter operation)
- Debugging difficulty (no visibility into computed person assignment)

## 2. Requirements

### Functional Requirements

- [x] Backend computes person_id for each task using existing `_resolve_person_id_for_task()` logic
- [x] Computed person_id is exposed in `extra_state_attributes` under `chorebot_tasks`
- [x] Frontend uses pre-computed `computed_person_id` instead of reimplementing resolution logic
- [x] TypeScript types updated to include `computed_person_id` field
- [x] Progress calculation in `person-points-card.ts` becomes simpler and more efficient

### Non-Functional Requirements

- **Performance:** Negligible impact - resolution already happens during state updates, just exposing the result
- **Backward Compatibility:** Non-breaking change - adds optional field, doesn't remove existing data
- **Data Integrity:** Computed value is read-only in frontend (no risk of stale data)
- **Debuggability:** Developer tools can now inspect task person assignments directly

## 3. Architecture & Design

### High-Level Approach

This is a **data enrichment pattern** where the backend adds computed/derived fields to entity state attributes. The frontend consumes these pre-computed values instead of deriving them independently.

**Analogy:** Similar to how SQL views materialize computed columns, or how GraphQL resolvers add computed fields to query results.

### Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│ Backend: ChoreBotList (todo.py)                                 │
│                                                                  │
│  extra_state_attributes property:                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ for each task in visible_tasks:                        │    │
│  │   1. task.to_dict() -> base task data                  │    │
│  │   2. _resolve_person_id_for_task(task) -> person_id    │    │
│  │   3. Add "computed_person_id": person_id to dict       │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│                   Home Assistant State Machine                   │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: task-utils.ts                                         │
│                                                                  │
│  filterTasksByPerson(entities, personEntityId):                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ for each entity:                                        │    │
│  │   todayTasks = filterTodayTasks(entity)                │    │
│  │   personTasks = todayTasks.filter(                     │    │
│  │     task => task.computed_person_id === personEntityId │    │
│  │   )                                                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  NO MORE: section lookups, metadata checks, fallback logic      │
└─────────────────────────────────────────────────────────────────┘
```

### Critical Design Decisions

**Decision 1: Add `computed_person_id` to task dicts in `extra_state_attributes`**

- **Rationale:** Keeps all task data together, frontend can access it naturally
- **Trade-offs:** Slightly larger state object (1 extra field per task × ~50-100 tasks = ~500 bytes)
- **Alternative Considered:** Separate top-level key like `task_person_assignments` - rejected because it would require frontend to join two data structures

**Decision 2: Use `None` (null) for unassigned tasks**

- **Rationale:** Explicit representation of "no person assigned" state
- **Trade-offs:** Frontend must handle null case explicitly
- **Alternative Considered:** Empty string `""` - rejected because null is more semantically correct

**Decision 3: Compute on every state update (no caching)**

- **Rationale:** Resolution is cheap (2 dict lookups), state updates are infrequent (only on CRUD operations)
- **Trade-offs:** Could cache per-task during entity lifecycle, but adds complexity for minimal gain
- **Alternative Considered:** In-memory cache cleared on section/list changes - rejected as premature optimization

## 4. Data Model Changes

### Backend: Task Dictionary in State Attributes

**Before:**

```python
"chorebot_tasks": [
    {
        "uid": "abc123",
        "summary": "Take out trash",
        "status": "needs_action",
        "section_id": "section_kyle",
        # ... other fields ...
    }
]
```

**After:**

```python
"chorebot_tasks": [
    {
        "uid": "abc123",
        "summary": "Take out trash",
        "status": "needs_action",
        "section_id": "section_kyle",
        "computed_person_id": "person.kyle",  # ✨ NEW: Pre-computed from section/list hierarchy
        # ... other fields ...
    }
]
```

### Frontend: TypeScript Task Interface

**Before:**

```typescript
export interface Task {
  uid: string;
  summary: string;
  status: "needs_action" | "completed";
  section_id?: string;
  // ... other fields ...
}
```

**After:**

```typescript
export interface Task {
  uid: string;
  summary: string;
  status: "needs_action" | "completed";
  section_id?: string;
  computed_person_id?: string; // ✨ NEW: Pre-computed person assignment (null if unassigned)
  // ... other fields ...
}
```

## 5. Execution Strategy

### Phase 1: Backend Enhancement

**Goal:** Add computed person_id to entity state without breaking existing functionality

**Scope:** `custom_components/chorebot/todo.py`

**Implementation Steps:**

1. Modify `extra_state_attributes` property in `ChoreBotList` class
2. In the comprehension that builds `chorebot_tasks` list, enrich each task dict:
   ```python
   "chorebot_tasks": [
       {
           **task.to_dict(),
           "computed_person_id": self._resolve_person_id_for_task(task)
       }
       for task in visible_tasks
   ],
   ```
3. Existing `_resolve_person_id_for_task()` method remains unchanged (already correct)
4. Add debug logging to verify computed values:
   ```python
   _LOGGER.debug(
       "Task %s assigned to person: %s (section: %s, list: %s)",
       task.summary,
       person_id,
       task.section_id,
       list_metadata.get("person_id")
   )
   ```

**Key Implementation Notes:**

- Use dict unpacking (`**task.to_dict()`) to preserve all existing fields
- Call `_resolve_person_id_for_task(task)` for each visible task
- Performance: This adds ~0.1ms per task (negligible for 50-100 tasks)
- No changes to storage format (this is computed at runtime)

**Testing:**

- Verify `computed_person_id` appears in entity state via Developer Tools → States
- Test with tasks in sections with person_id set
- Test with tasks in sections without person_id (should fall back to list person_id)
- Test with tasks in lists without person_id (should be null)
- Restart HA and verify computed values persist correctly

### Phase 2: Frontend Type Update

**Goal:** Add TypeScript type definition for new field

**Scope:** `src/utils/types.ts`

**Implementation Steps:**

1. Add `computed_person_id?: string;` to `Task` interface
2. Add JSDoc comment explaining the field:
   ```typescript
   /**
    * Pre-computed person assignment from backend
    * Resolved via: task.section_id → section.person_id → list.person_id → null
    * Read-only field computed in extra_state_attributes
    */
   computed_person_id?: string;
   ```
3. No other type changes needed (all downstream code will see the new optional field)

**Testing:**

- Run TypeScript compiler: `npm run build` (should complete without errors)
- No runtime testing needed at this phase (field is optional)

### Phase 3: Frontend Logic Simplification

**Goal:** Replace manual person resolution with pre-computed value

**Scope:** `src/utils/task-utils.ts`

**Implementation Steps:**

**Before (lines 249-294):**

```typescript
export function filterTasksByPerson(
  entities: HassEntity[],
  personEntityId: string,
  includeDateless: boolean = false,
): Task[] {
  const allPersonTasks: Task[] = [];

  const choreBotEntities = entities.filter((e) =>
    e.entity_id.startsWith("todo.chorebot_"),
  );

  for (const entity of choreBotEntities) {
    const todayTasks = filterTodayTasks(entity, includeDateless);

    // Get sections and list metadata
    const sections: Section[] = entity.attributes.chorebot_sections || [];
    const listMetadata = entity.attributes.chorebot_metadata;

    // Filter tasks assigned to this person
    for (const task of todayTasks) {
      let isAssignedToPerson = false;

      // Check section assignment first (priority)
      if (task.section_id) {
        const section = sections.find((s) => s.id === task.section_id);
        if (section?.person_id) {
          isAssignedToPerson = section.person_id === personEntityId;
        } else if (listMetadata?.person_id) {
          // Section has no person_id, check list metadata
          isAssignedToPerson = listMetadata.person_id === personEntityId;
        }
      } else if (listMetadata?.person_id) {
        // No section, check list metadata
        isAssignedToPerson = listMetadata.person_id === personEntityId;
      }

      if (isAssignedToPerson) {
        allPersonTasks.push(task);
      }
    }
  }

  return allPersonTasks;
}
```

**After:**

```typescript
export function filterTasksByPerson(
  entities: HassEntity[],
  personEntityId: string,
  includeDateless: boolean = false,
): Task[] {
  const allPersonTasks: Task[] = [];

  // Filter to only ChoreBot todo entities
  const choreBotEntities = entities.filter((e) =>
    e.entity_id.startsWith("todo.chorebot_"),
  );

  for (const entity of choreBotEntities) {
    // Get today's tasks from this entity
    const todayTasks = filterTodayTasks(entity, includeDateless);

    // Filter to tasks assigned to this person using pre-computed person_id
    // Backend resolves: section.person_id → list.person_id → null
    const personTasks = todayTasks.filter(
      (task) => task.computed_person_id === personEntityId,
    );

    allPersonTasks.push(...personTasks);
  }

  return allPersonTasks;
}
```

**Key Implementation Notes:**

- Remove section/metadata lookups entirely (no longer needed)
- Use simple filter with direct comparison: `task.computed_person_id === personEntityId`
- Reduces function from ~45 lines to ~20 lines (~55% reduction)
- No changes to function signature (maintains backward compatibility)
- Performance improvement: O(n) simple comparisons vs O(n×m) section lookups

**Testing:**

- Test `person-points-card.ts` with single person entity
- Test with multiple people across different lists
- Test with tasks in sections (person_id on section)
- Test with tasks in sections without person_id (fallback to list)
- Test with unassigned tasks (no person_id anywhere)
- Verify progress calculation still works correctly
- Test with TickTick sync enabled (tasks created remotely)

### Phase 4: Documentation Update

**Goal:** Document the architecture decision and implementation

**Scope:** `AGENTS.md`

**Implementation Steps:**

1. Add new section under "Important Reminders":

   ```markdown
   ### Person Assignment Computation

   - **Backend computes person_id**: `_resolve_person_id_for_task()` runs during state updates
   - **Frontend consumes computed value**: `task.computed_person_id` is pre-computed, DO NOT reimplement resolution logic
   - **Resolution order**: section.person_id → list.person_id → null
   - **Exposed in state**: `extra_state_attributes["chorebot_tasks"][n]["computed_person_id"]`
   - **Read-only**: Frontend never modifies this field, it's derived from section/list metadata
   ```

2. Add to "Architecture Decisions" section:

   ````markdown
   ### Computed Person ID in State Attributes

   **Decision**: Person assignment is computed once in backend and exposed to frontend via `computed_person_id` field.

   **Rationale**:

   - Single source of truth: Backend owns resolution logic
   - Performance: Computed once per state update, not on every frontend filter operation
   - Maintainability: No duplication between Python and TypeScript
   - Debuggability: Person assignments visible in Developer Tools → States

   **Implementation**: In `todo.py::extra_state_attributes`, each task dict is enriched with:

   ```python
   {
       **task.to_dict(),
       "computed_person_id": self._resolve_person_id_for_task(task)
   }
   ```
   ````

   **Frontend Usage**: `src/utils/task-utils.ts::filterTasksByPerson` uses pre-computed value instead of reimplementing section/list lookups.

   **Trade-off**: Slightly larger state object (~500 bytes for 100 tasks), but eliminates code duplication and improves frontend performance.

   ```

   ```

## 6. Usage Scenarios / Edge Cases

### Scenario A: Task in Section with Person (Happy Path)

- **Setup**: Task in "Kyle's Tasks" section, section has `person_id: "person.kyle"`
- **Expected**: `computed_person_id = "person.kyle"`
- **Frontend**: Task appears in Kyle's `person-points-card`, counts toward his progress

### Scenario B: Task in Section without Person (Fallback to List)

- **Setup**: Task in "General" section (no person_id), list has `person_id: "person.campbell"`
- **Expected**: `computed_person_id = "person.campbell"`
- **Frontend**: Task appears in Campbell's card, not Kyle's

### Scenario C: Task with No Section (List-Level Assignment)

- **Setup**: Task with `section_id: null`, list has `person_id: "person.kyle"`
- **Expected**: `computed_person_id = "person.kyle"`
- **Frontend**: Task appears in Kyle's card

### Scenario D: Unassigned Task (No Person Anywhere)

- **Setup**: Task in section without person_id, list without person_id
- **Expected**: `computed_person_id = null`
- **Frontend**: Task does NOT appear in any person's card, progress calculation ignores it

### Scenario E: Task Moved Between Sections

- **Setup**: Task completed in Kyle's section (person gets points), then moved to Campbell's section
- **Expected**:
  - Transaction history shows Kyle completed it (immutable)
  - `computed_person_id` now shows `"person.campbell"`
  - If uncompleted, Campbell gets points back (not Kyle)
- **Frontend**: Task now appears under Campbell's card

### Scenario F: Section Person Assignment Changed

- **Setup**: "Morning Tasks" section has 10 tasks, person_id changed from Kyle to Campbell
- **Expected**: All 10 tasks now show `computed_person_id = "person.campbell"` on next state update
- **Frontend**: Tasks instantly move from Kyle's card to Campbell's card (no manual refresh needed)

### Scenario G: TickTick Sync - Remote Task Creation

- **Setup**: User creates task in TickTick mobile app under "Kyle's section"
- **Expected**:
  - Pull sync imports task with correct `section_id`
  - Backend computes `computed_person_id = "person.kyle"`
  - Appears in HA state with person assignment
- **Frontend**: Task appears in Kyle's card immediately

## 7. Security & Performance Considerations

### Performance Analysis

**Backend:**

- **Cost per task:** ~0.1ms (2 dict lookups + 1 list iteration for section)
- **Total cost for 100 tasks:** ~10ms (negligible, happens during state update which already takes ~50-100ms)
- **Frequency:** Only on CRUD operations (create, update, complete, delete) - typically <10 per minute
- **Impact:** None - this is not a hot path

**Frontend:**

- **Before:** O(n×m) where n=tasks, m=sections (nested loops with section lookups)
- **After:** O(n) simple equality comparisons
- **Improvement:** ~5-10x faster for typical workloads (50 tasks × 5 sections)
- **Impact:** Progress calculation in `person-points-card` becomes instant (<1ms)

### Memory Analysis

**State Object Size Increase:**

- **Per task:** ~30 bytes (`"computed_person_id": "person.kyle"`)
- **100 tasks:** ~3KB
- **Impact:** Negligible (HA state objects are typically 100KB-1MB)

### Security Considerations

- **Read-only field:** Frontend cannot modify `computed_person_id`, it's derived from authoritative backend data
- **No XSS risk:** Person entity IDs are validated by HA, no user-controlled strings
- **No authorization bypass:** Person assignment doesn't grant permissions, it's for organizational display only
- **Audit trail integrity:** Transaction history uses backend's `_resolve_person_id_for_task()` at completion time, unaffected by this change

## 8. Rollback Plan

This change is **low-risk** because it's additive (doesn't remove existing data):

**If issues arise:**

1. Revert backend change: Remove `computed_person_id` enrichment in `todo.py`
2. Revert frontend change: Restore old `filterTasksByPerson` implementation from git history
3. No data migration needed (change is runtime-only, storage format unchanged)
4. No user impact (invisible to end users, only affects developers)

**Canary Testing:**

- Deploy to dev environment first (use `./dev.sh` Docker Compose setup)
- Verify Developer Tools → States shows `computed_person_id` correctly
- Test `person-points-card` with multiple people
- Monitor HA logs for any resolution errors

## 9. Success Criteria

- [x] Backend computes `computed_person_id` for all tasks in `extra_state_attributes`
- [x] Frontend TypeScript types include `computed_person_id?: string`
- [x] Frontend `filterTasksByPerson()` uses pre-computed value (no section/metadata lookups)
- [x] `person-points-card.ts` progress calculation works correctly for all test scenarios
- [x] No performance degradation (should see slight improvement)
- [x] All existing tests pass (no behavior changes from user perspective)
- [x] Documentation updated in `AGENTS.md`
- [x] Code reduction: `task-utils.ts::filterTasksByPerson` reduced from ~45 to ~20 lines

## 10. Future Enhancements

This change enables future improvements:

1. **Task-Level Person Override:** Add optional `assigned_to` field on Task model, computed_person_id would respect hierarchy: `task.assigned_to → section.person_id → list.person_id → null`

2. **Multi-Person Assignment:** Extend `computed_person_id` to `computed_person_ids: string[]` for shared tasks

3. **Person Assignment History:** Store `computed_person_id` in transaction records to track who was assigned when points were awarded (currently inferred but not stored)

4. **Frontend Person Selector:** Add UI to assign/reassign tasks to people without moving sections (would require task-level override field)

5. **Assignment Analytics:** Report on tasks per person, completion rates by person, etc. (much easier with pre-computed field)
