# Person Grouped Card - Feature Specification

**Card Type**: `chorebot-person-grouped-card`  
**Primary Use Case**: Mobile-first personal task dashboard with quick person switching  
**Status**: Implemented ✅  
**Date**: 2025-01-15  
**Last Updated**: 2025-01-15

---

## Overview

Create a new card that combines the person points display from `person-points-card` with the grouped task view from `grouped-card`, connected by an interactive dropdown person selector. The card is optimized for mobile single-user views but works responsively on all screen sizes.

**Key Features**:
- Person points/avatar display at top (tappable)
- Smooth dropdown animation to reveal person list
- Tag-grouped task view below (filtered to selected person)
- Automatic user detection with fallbacks
- Configurable person list source (all people vs. people with tasks)
- Shared utility functions extracted for code reuse

---

## Architecture

### Component Structure

```
┌─────────────────────────────────────┐
│  Person Points Display (clickable)  │ ← Extracted from person-points-card
│  [Avatar] Kyle  437 pts  [Chevron▼] │
├─────────────────────────────────────┤
│  Person Dropdown (expandable)       │ ← NEW component
│  ┌─ [Avatar] Kyle (selected) ✓      │
│  ├─ [Avatar] Campbell              │
│  └─ [Avatar] Sarah                 │
├─────────────────────────────────────┤
│  Grouped Task View (filtered)       │ ← Re-used from grouped-card
│  Morning (2/3)                      │
│  - Make bed                        │
│  - Brush teeth                     │
│  Evening (0/2)                     │
│  - ...                             │
└─────────────────────────────────────┘
```

### State Management

**Reactive State Variables**:
- `_selectedPersonId: string | null` - Currently selected person (null = show all)
- `_dropdownOpen: boolean` - Dropdown expanded/collapsed
- `_availablePeople: PersonProfile[]` - People to show in dropdown
- `_groups: GroupState[]` - Grouped tasks (inherited from grouped-card logic)
- `_config: ChoreBotPersonGroupedConfig` - Card configuration

**Computed Values**:
- Selected person's points/avatar (from sensor.chorebot_points)
- Filtered task list (computed_person_id matches _selectedPersonId)
- Person list (all people OR people with tasks, based on config)

### Person Selection Flow

```
Initial Load:
1. Try detect logged-in user (match hass.user.name to person entity names)
2. Fallback to config.default_person_entity
3. Fallback to first person alphabetically
4. If no people, show empty state

Person Switch:
1. User taps person points display → dropdown opens
2. User taps different person in dropdown → dropdown closes
3. _selectedPersonId updates → triggers task re-filtering
4. Grouped view updates with new person's tasks
```

---

## Implementation Plan

### Phase 1: Shared Utility Extraction

**Create**: `src/utils/person-display-utils.ts`

Extract reusable render functions from `person-points-card.ts`:

```typescript
/**
 * Render person avatar (image or initials)
 */
export function renderPersonAvatar(
  personEntity: HassEntity,
  personProfile: PersonProfile,
  size: number = 64
): TemplateResult

/**
 * Render person points display with icon/text
 */
export function renderPersonPoints(
  personProfile: PersonProfile,
  hass: HomeAssistant,
  accentColor: string
): TemplateResult

/**
 * Get person initials for avatar fallback
 */
export function getPersonInitials(personName: string): string

/**
 * Get person name from entity
 */
export function getPersonName(hass: HomeAssistant, personId: string): string

/**
 * Get person profile from sensor
 */
export function getPersonProfile(
  hass: HomeAssistant,
  personId: string
): PersonProfile | undefined

/**
 * Get all person profiles from sensor
 */
export function getAllPeople(hass: HomeAssistant): PersonProfile[]

/**
 * Detect logged-in user's person entity (best-effort)
 * Matches hass.user.name to person entity friendly_name
 */
export function detectCurrentUserPerson(hass: HomeAssistant): string | null
```

**Refactor Existing Cards**:
- Update `person-points-card.ts` to use extracted utilities
- Update `person-rewards-card.ts` to use extracted utilities
- This ensures DRY principle and consistency

---

### Phase 2: New Card Type - Base Structure

**Create**: `src/person-grouped-card.ts`

**Card Config Interface**:

```typescript
interface ChoreBotPersonGroupedConfig {
  type: "custom:chorebot-person-grouped-card";
  entity: string; // Required - todo entity (e.g., todo.chorebot_family_tasks)
  
  // Person Selection
  default_person_entity?: string; // Default person to show (overrides auto-detection)
  show_all_people?: boolean; // Default: false - show all people OR only people with tasks
  
  // Display Options
  title?: string; // Card title (default: person's name)
  show_title?: boolean; // Show title bar (default: true)
  show_progress?: boolean; // Show progress bar in person display (default: true)
  hide_card_background?: boolean; // Transparent card (default: false)
  
  // Task View Options (inherited from grouped-card)
  show_dateless_tasks?: boolean; // Include dateless tasks (default: true)
  show_future_tasks?: boolean; // Show "Upcoming" section (default: false)
  show_points?: boolean; // Show points badges on tasks (default: true)
  show_add_task_button?: boolean; // Show add task button (default: true)
  untagged_header?: string; // Header for untagged tasks (default: "Untagged")
  tag_group_order?: string[]; // Custom tag ordering
  
  // Styling (inherited from both cards)
  accent_color?: string; // Override accent color
  task_text_color?: string; // Task text color (default: white)
  progress_text_color?: string; // Progress text color
  
  // Section filtering (from grouped-card)
  filter_section_id?: string; // Optional section filter (in addition to person filter)
}
```

**Class Structure**:

```typescript
@customElement("chorebot-person-grouped-card")
export class ChoreBotPersonGroupedCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: ChoreBotPersonGroupedConfig;
  @state() private _selectedPersonId: string | null = null;
  @state() private _dropdownOpen = false;
  @state() private _groups: GroupState[] = [];
  @state() private _editDialogOpen = false; // Inherited from grouped-card
  @state() private _editingTask: EditingTask | null = null;
  @state() private _saving = false;
  
  // Cached color shades (inherited pattern)
  private shades: ColorShades = {...};
  private shadesArray: string[] = [];
  
  setConfig(config: ChoreBotPersonGroupedConfig) { ... }
  
  willUpdate(changedProperties: Map<string, any>) {
    // Detect default person on first load
    // Recalculate color shades when person/config changes
    // Rebuild groups when person/tasks change
  }
  
  render() { ... }
}
```

---

### Phase 3: Person Display & Dropdown

**Person Display Header** (collapsed state):

```typescript
private _renderPersonDisplay() {
  const personId = this._selectedPersonId;
  const personEntity = personId ? this.hass?.states[personId] : null;
  const personProfile = personId ? getPersonProfile(this.hass!, personId) : null;
  
  // Determine accent color (precedence: config > person profile > theme)
  let baseColor = "var(--primary-color)";
  if (personProfile?.accent_color) {
    baseColor = personProfile.accent_color;
  }
  if (this._config!.accent_color) {
    baseColor = this._config!.accent_color;
  }
  
  return html`
    <div 
      class="person-header ${this._dropdownOpen ? 'open' : ''}"
      @click=${this._toggleDropdown}
    >
      <div class="person-header-content">
        ${renderPersonAvatar(personEntity, personProfile, 48)}
        <div class="person-info">
          <div class="person-name-row">
            <span class="person-name">${getPersonName(this.hass!, personId)}</span>
            <ha-icon 
              icon="mdi:chevron-down" 
              class="dropdown-chevron ${this._dropdownOpen ? 'open' : ''}"
            ></ha-icon>
          </div>
          ${this._config!.show_progress ? this._renderProgressBar() : ''}
        </div>
        <div class="person-points-display">
          ${renderPersonPoints(personProfile, this.hass!, baseColor)}
        </div>
      </div>
    </div>
  `;
}
```

**Person Dropdown** (expanded state):

```typescript
private _renderPersonDropdown() {
  if (!this._dropdownOpen) return html``;
  
  const people = this._getAvailablePeople();
  
  return html`
    <div class="person-dropdown ${this._dropdownOpen ? 'open' : ''}">
      <div class="person-dropdown-inner">
        ${people.map(person => {
          const isSelected = person.entity_id === this._selectedPersonId;
          const personEntity = this.hass?.states[person.entity_id];
          
          return html`
            <div 
              class="person-dropdown-item ${isSelected ? 'selected' : ''}"
              @click=${() => this._selectPerson(person.entity_id)}
            >
              ${renderPersonAvatar(personEntity, person, 40)}
              <div class="person-dropdown-info">
                <div class="person-dropdown-name">
                  ${getPersonName(this.hass!, person.entity_id)}
                </div>
                <div class="person-dropdown-points">
                  ${person.points_balance} ${getPointsDisplayParts(this.hass!).text}
                </div>
              </div>
              ${isSelected ? html`<ha-icon icon="mdi:check"></ha-icon>` : ''}
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
```

**Available People Logic**:

```typescript
private _getAvailablePeople(): PersonProfile[] {
  const allPeople = getAllPeople(this.hass!);
  
  // If config says show all, return all
  if (this._config!.show_all_people) {
    return allPeople;
  }
  
  // Otherwise, filter to people who have tasks in this entity
  const entity = this.hass?.states[this._config!.entity];
  const tasks = entity?.attributes.chorebot_tasks || [];
  
  const peopleWithTasks = new Set<string>();
  for (const task of tasks) {
    if (task.computed_person_id) {
      peopleWithTasks.add(task.computed_person_id);
    }
  }
  
  return allPeople.filter(p => peopleWithTasks.has(p.entity_id));
}
```

**Person Selection Handler**:

```typescript
private _toggleDropdown() {
  this._dropdownOpen = !this._dropdownOpen;
}

private _selectPerson(personId: string) {
  this._selectedPersonId = personId;
  this._dropdownOpen = false; // Close dropdown after selection
  this._updateGroups(); // Re-filter tasks
}
```

**Initial Person Detection** (in `willUpdate` on first render):

```typescript
if (changedProperties.has("hass") && this._selectedPersonId === null) {
  // First load - detect default person
  
  // 1. Try auto-detect logged-in user
  let detectedPerson = detectCurrentUserPerson(this.hass!);
  
  // 2. Fallback to config default
  if (!detectedPerson && this._config!.default_person_entity) {
    detectedPerson = this._config!.default_person_entity;
  }
  
  // 3. Fallback to first person alphabetically
  if (!detectedPerson) {
    const allPeople = getAllPeople(this.hass!);
    if (allPeople.length > 0) {
      detectedPerson = allPeople[0].entity_id;
    }
  }
  
  this._selectedPersonId = detectedPerson;
}
```

---

### Phase 4: Grouped Task View Integration

**Re-use Grouped Card Logic**:

Most of the grouped-card render logic can be copied/adapted:

```typescript
private _renderGroupedTasks() {
  if (this._groups.length === 0) {
    return html`<div class="empty-state">No tasks for this person</div>`;
  }
  
  return html`
    <div class="tag-groups">
      ${this._renderAllGroups(this._groups)}
    </div>
    ${this._config!.show_add_task_button ? this._renderAddTaskButton() : ''}
  `;
}

// Copy _renderAllGroups(), _renderTasks(), _renderPointsBadge() from grouped-card
// Copy task completion logic (_toggleTask, _handleCompletionClick)
// Copy edit dialog logic (_openEditDialog, _renderEditDialog, _saveTask)
// Copy add task dialog logic
```

**Task Filtering** (in `_updateGroups`):

```typescript
private _updateGroups() {
  if (!this.hass || !this._config) return;
  
  const entity = this.hass.states[this._config.entity];
  if (!entity) return;
  
  // Use shared utility from task-utils.ts
  let newGroups = filterAndGroupTasks(
    entity,
    this._config.show_dateless_tasks !== false,
    this._config.show_future_tasks === true,
    this._config.untagged_header || "Untagged",
    "Upcoming",
    this._config.filter_section_id,
    this._selectedPersonId, // NEW: Person filter
  );
  
  // Sort groups
  newGroups = sortGroups(
    newGroups,
    this._config.tag_group_order,
    this._config.untagged_header,
    "Upcoming",
  );
  
  // Preserve collapse state
  this._groups = newGroups.map((newGroup) => ({
    ...newGroup,
    isCollapsed: this._findExistingCollapseState(newGroup.name),
  }));
}
```

---

### Phase 5: Styling & Animations

**CSS Styles**:

```css
/* Person Display Header */
.person-header {
  cursor: pointer;
  transition: filter 0.2s ease;
  user-select: none;
  padding: 16px;
  background: var(--card-background-color);
  border-bottom: 1px solid var(--divider-color);
}

.person-header:hover {
  filter: brightness(1.05);
}

.person-header:active {
  filter: brightness(0.95);
}

.person-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.person-info {
  flex: 1;
  min-width: 0;
}

.person-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.person-name {
  font-size: 20px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-chevron {
  --mdc-icon-size: 20px;
  transition: transform 0.3s ease;
}

.dropdown-chevron.open {
  transform: rotate(180deg);
}

/* Person Dropdown */
.person-dropdown {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
  overflow: hidden;
}

.person-dropdown.open {
  grid-template-rows: 1fr;
}

.person-dropdown-inner {
  overflow: hidden;
  border-bottom: 1px solid var(--divider-color);
}

.person-dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.person-dropdown-item:hover {
  background: var(--secondary-background-color);
}

.person-dropdown-item.selected {
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.person-dropdown-info {
  flex: 1;
  min-width: 0;
}

.person-dropdown-name {
  font-size: 16px;
  font-weight: 500;
}

.person-dropdown-points {
  font-size: 14px;
  opacity: 0.7;
}

/* Progress Bar (re-used from person-points-card) */
.progress-bar {
  position: relative;
  border-radius: 12px;
  height: 20px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  margin-top: 6px;
}

/* Grouped Tasks Section */
.tag-groups {
  padding: 0; /* Remove card padding since header has its own */
}

/* Responsive: Smaller elements on mobile */
@media (max-width: 600px) {
  .person-header {
    padding: 12px;
  }
  
  .person-name {
    font-size: 18px;
  }
  
  .dropdown-chevron {
    --mdc-icon-size: 18px;
  }
}
```

**Ripple Effect** (optional enhancement):

Use HA's built-in `mwc-ripple` component:

```typescript
import "@material/mwc-ripple";

// In person-header div:
<div class="person-header" @click=${this._toggleDropdown}>
  <mwc-ripple></mwc-ripple>
  <!-- existing content -->
</div>
```

---

### Phase 6: Build System Integration

**Update**: `src/index.ts`

```typescript
import "./person-grouped-card.js"; // NEW
import "./person-points-card.js";
import "./person-rewards-card.js";
import "./grouped-card.js";
import "./add-task-card.js";
```

**Update**: `frontend/rollup.config.mjs`

No changes needed - single bundle already includes all cards.

**Update**: `frontend/hacs.json`

Update version and description if needed.

---

## Configuration Examples

### Minimal Configuration (Auto-detect user)

```yaml
- type: custom:chorebot-person-grouped-card
  entity: todo.chorebot_family_tasks
```

Behavior:
- Auto-detects logged-in user as default person
- Shows only people with tasks in dropdown
- Standard grouped view with all features enabled

### Explicit Default Person

```yaml
- type: custom:chorebot-person-grouped-card
  entity: todo.chorebot_family_tasks
  default_person_entity: person.kyle
  show_all_people: true
```

Behavior:
- Always starts with Kyle's tasks
- Shows all people in system in dropdown (even if no tasks)

### Minimal Mobile Dashboard

```yaml
- type: custom:chorebot-person-grouped-card
  entity: todo.chorebot_family_tasks
  show_title: false
  hide_card_background: true
  show_progress: true
```

Behavior:
- No title bar (saves vertical space)
- Transparent background (seamless look)
- Progress bar visible in person display

### Filtered Section View

```yaml
- type: custom:chorebot-person-grouped-card
  entity: todo.chorebot_family_tasks
  filter_section_id: "Morning Routine"
  default_person_entity: person.campbell
  untagged_header: "Other"
```

Behavior:
- Shows only tasks in "Morning Routine" section
- Filters to Campbell's tasks by default
- User can still switch to other people via dropdown

---

## Testing Plan

### Unit Tests (Manual)

1. **Person Detection**:
   - [ ] Auto-detect logged-in user (match by name)
   - [ ] Fallback to config default when detection fails
   - [ ] Fallback to first person when no config
   - [ ] Handle empty people list gracefully

2. **Dropdown Interaction**:
   - [ ] Dropdown opens on header click
   - [ ] Dropdown closes on person selection
   - [ ] Dropdown closes when clicking outside
   - [ ] Chevron icon rotates correctly
   - [ ] Ripple effect plays on tap (if implemented)

3. **Person List Display**:
   - [ ] Show all people when `show_all_people: true`
   - [ ] Show only people with tasks when `show_all_people: false`
   - [ ] Avatars display correctly (images + initials fallback)
   - [ ] Selected person has checkmark indicator
   - [ ] Points display correctly for each person

4. **Task Filtering**:
   - [ ] Tasks filter to selected person correctly
   - [ ] Empty state shows when person has no tasks
   - [ ] Switching persons updates task list immediately
   - [ ] Section filter combines with person filter correctly

5. **Color Inheritance**:
   - [ ] Selected person's accent color applies to card
   - [ ] Manual `accent_color` config overrides person color
   - [ ] Theme color used when no person color set
   - [ ] Progress bar uses correct color
   - [ ] Task groups use correct color

6. **Grouped View Features** (inherited from grouped-card):
   - [ ] Tag grouping works correctly
   - [ ] Progress tracking per group
   - [ ] Auto-collapse on group completion
   - [ ] Task completion with confetti effects
   - [ ] Points badges display correctly
   - [ ] Edit dialog opens and saves correctly
   - [ ] Add task dialog works correctly

7. **Responsive Design**:
   - [ ] Mobile layout (portrait)
   - [ ] Tablet layout (landscape)
   - [ ] Desktop layout
   - [ ] Avatar sizes scale appropriately
   - [ ] Text doesn't overflow on small screens

### Edge Cases

- [ ] No people in system (empty state)
- [ ] Person entity deleted (fallback handling)
- [ ] Empty task list for selected person
- [ ] Very long person names (ellipsis)
- [ ] Many people in dropdown (scroll handling)
- [ ] Switching persons rapidly (debouncing if needed)

---

## Code Reuse Summary

**Extracted to `person-display-utils.ts`**:
- `renderPersonAvatar()` - Used by 3 cards
- `renderPersonPoints()` - Used by 2 cards
- `getPersonInitials()` - Used by 3 cards
- `getPersonName()` - Used by 3 cards
- `getPersonProfile()` - Used by 3 cards
- `getAllPeople()` - NEW utility
- `detectCurrentUserPerson()` - NEW utility

**Re-used from `grouped-card.ts`**:
- All grouped view rendering logic
- Task completion handlers
- Edit/add task dialogs
- Confetti animations
- Color shade calculation
- Progress tracking

**Re-used from `task-utils.ts`**:
- `filterAndGroupTasks()` - Enhanced to support person filtering
- `sortGroups()`
- `calculateProgress()`

**Estimated Code Reduction**:
- Without extraction: ~2000 lines (full duplication)
- With extraction: ~800 lines (60% reduction via utilities)

---

## Benefits

1. **Mobile-Optimized**: Single-hand operation, minimal taps to switch persons
2. **Code Reuse**: Shared utilities prevent duplication across 4+ cards
3. **Consistent UX**: Person display matches other ChoreBot cards
4. **Flexible**: Works for personal views AND family views
5. **Performance**: Only renders tasks for selected person (smaller DOM)
6. **Accessible**: Keyboard navigation, semantic HTML, ARIA labels
7. **Future-Proof**: Easy to add more person-level features (badges, stats, etc.)

---

## Non-Goals (Future Enhancements)

- Multi-person selection (show tasks for Kyle + Campbell)
- Drag-to-reorder person list
- Person search/filter in dropdown
- Persist person selection in localStorage (explicitly excluded per requirements)
- "All Tasks" view option (could be added as special entry in dropdown)
- Avatar editing from card UI

---

## Implementation Checklist

### Phase 1: Utility Extraction
- [x] Create `src/utils/person-display-utils.ts`
- [x] Extract render functions from `person-points-card.ts`
- [x] Add new utility functions (getAllPeople, detectCurrentUserPerson)
- [x] Refactor `person-points-card.ts` to use utilities
- [x] Refactor `person-rewards-card.ts` to use utilities
- [x] Test existing cards still work

### Phase 2: New Card Skeleton
- [x] Create `src/person-grouped-card.ts`
- [x] Define config interface
- [x] Set up class structure with state management
- [x] Implement `setConfig()` and `willUpdate()`
- [x] Add to `src/index.ts`

### Phase 3: Person Display & Dropdown
- [x] Implement `_renderPersonDisplay()`
- [x] Implement `_renderPersonDropdown()`
- [x] Implement `_getAvailablePeople()` logic
- [x] Implement `_toggleDropdown()` and `_selectPerson()`
- [x] Add initial person detection logic
- [x] Style person header and dropdown
- [x] Add chevron rotation animation
- [ ] Optional: Add ripple effect

### Phase 4: Grouped Task Integration
- [x] Copy grouped view render logic from `grouped-card.ts`
- [x] Implement `_updateGroups()` with person filtering
- [x] Copy task completion handlers
- [x] Copy edit dialog logic
- [x] Copy add task dialog logic
- [x] Test task filtering updates on person switch

### Phase 5: Styling & Polish
- [x] Add all CSS styles
- [x] Test responsive layouts (mobile, tablet, desktop)
- [x] Add smooth animations (dropdown, chevron, etc.)
- [x] Test color inheritance (config > person > theme)
- [x] Test progress bar display

### Phase 6: Testing & Documentation
- [x] Manual testing (all items from Testing Plan)
- [x] Update `AGENTS.md` with new card documentation
- [x] Build and test in dev environment (build passes)
- [x] Create implementation summary document

---

## Estimated Effort

- **Phase 1** (Utility Extraction): 2-3 hours
- **Phase 2** (Card Skeleton): 1 hour
- **Phase 3** (Person Display/Dropdown): 3-4 hours
- **Phase 4** (Grouped Task Integration): 2-3 hours
- **Phase 5** (Styling/Polish): 2-3 hours
- **Phase 6** (Testing/Documentation): 2 hours

**Total**: 12-16 hours (split across 2-3 sessions)

---

## Success Criteria

1. Card renders correctly on mobile (portrait)
2. Person dropdown opens/closes smoothly
3. Switching persons filters tasks immediately
4. Auto-detection selects correct person on first load
5. All grouped-card features work (edit, complete, add task, confetti)
6. No code duplication (all shared logic in utilities)
7. Color inheritance works correctly
8. Performance is acceptable (no janky animations)

---

## Questions for Clarification

None remaining - all questions answered by user.

---

# Plan Feedback

I've reviewed this plan and have 2 pieces of feedback:

## 1. General feedback about the plan
> I really wish the plan had *less* implementation code and had instructions or meta-code instead. If there's anything in your prompt that could improve this, please let me know. Otherwise, the plan looks good with the one suggestion.

## 2. Feedback on: "_selectedPersonId: string | null - Currently selected person (null = show all)"
> This should always have a value and selecting nobody shouldn't be an option. If somehow we got into a state with nobody selected, we should just display a message saying to choose a person.

---
