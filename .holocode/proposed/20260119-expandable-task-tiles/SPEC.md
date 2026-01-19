---
title: Expandable Task Tiles with Details View
status: implemented
created: 2026-01-19
updated: 2026-01-19
author: AP-5 (Architect)
tags: [frontend, ux-enhancement, cards]
---

# Expandable Task Tiles with Details View

## Overview

Replace the current "click-to-edit" behavior in grouped cards with a two-stage interaction model that provides better information visibility without immediately opening a modal dialog.

**Current Behavior**: Tap task → Edit modal opens
**New Behavior**: Tap task → Expand details → Tap edit/delete buttons

## Requirements

### Functional Requirements

1. **Tap Behavior**
   - First tap on collapsed task: Expand to show details
   - Tap on expanded task: Collapse back to compact view
   - Only one task can be expanded at a time per card
   - Completion circle interaction unchanged (still toggles completion)

2. **Expanded State Display** (Show ONLY what's NOT already visible in collapsed view)
   - **Recurrence pattern**: Human-readable format (e.g., "Daily", "Weekly on Mon, Wed, Fri", "Monthly on 15th")
   - **Streak bonus**: Show bonus points and interval (e.g., "+50 pts every 7 days") - only if applicable
   - **Description**: Full text with wrapping (if present)
   - **Due date/time**: Full format like "Monday, January 19, 2026 at 3:00 PM" or "Monday, January 19, 2026" (all-day)

3. **Excluded from Expanded View** (Already visible in collapsed state)
   - Current streak (already shown next to task title with fire icon)
   - Section name (context is obvious from card organization)
   - Points value (already shown in points badge)

4. **Action Buttons**
   - Edit button (bottom-right, `mdi:pencil` icon) → Opens existing edit dialog
   - Delete button (bottom-right, `mdi:delete` icon) → Triggers existing delete confirmation + handler
   - Both buttons styled as circular icon buttons

5. **Auto-Collapse Scenarios**
   - When task is completed via completion circle
   - When task is deleted
   - When another task in the same card is expanded

### Non-Functional Requirements

1. **Animation Performance**
   - Use CSS grid transitions (`grid-template-rows: 0fr` → `1fr`)
   - Target 60fps animation with 0.3s duration
   - GPU-accelerated where possible

2. **Code Reuse Priority**
   - Extract shared logic to utilities to avoid duplication between cards
   - Both `grouped-card.ts` and `person-grouped-card.ts` should use same rendering utilities

3. **Responsive Behavior**
   - Same tap-to-expand behavior on mobile and desktop
   - Ensure action buttons meet minimum 44x44px touch target size on mobile

## Architecture

### State Changes

**Both Cards** (`grouped-card.ts` and `person-grouped-card.ts`):

```typescript
@state() private _expandedTaskUid: string | null = null;
```

### UI Structure

**Current** (per task):
```html
<div class="todo-item" @click=${openEdit}>
  <div class="todo-content">...</div>
  <div class="completion-circle">...</div>
</div>
```

**New** (per task):
```html
<div class="todo-item-container">
  <!-- Collapsed Row (always visible) -->
  <div class="todo-item" @click=${toggleExpanded}>
    <div class="todo-content">...</div>
    <div class="completion-circle">...</div>
  </div>
  
  <!-- Expanded Details (conditional, animated) -->
  <div class="todo-details ${expanded ? 'expanded' : 'collapsed'}">
    <div class="todo-details-inner">
      <div class="details-content">
        <!-- Detail rows (icon + label + value) -->
      </div>
      <div class="details-actions">
        <!-- Edit and Delete buttons -->
      </div>
    </div>
  </div>
</div>
```

### Data Flow

1. **User taps task** → `_toggleTaskExpanded(taskUid)`
2. **Toggle logic**: 
   - If `_expandedTaskUid === taskUid` → Set to `null` (collapse)
   - Else → Set to `taskUid` (expand this, collapse others)
3. **Render cycle**: `_renderExpandedDetails(task)` checks if `task.uid === _expandedTaskUid`
4. **User taps edit button** → Calls existing `_openEditDialog(task)`
5. **User taps delete button** → Calls existing delete confirmation logic

## Implementation Tasks

### Phase 1: Shared Utility Extraction

**New File**: `frontend/src/utils/task-detail-utils.ts`

Create shared functions for detail rendering:

1. **`formatRecurrencePattern(rrule: string): string`**
   - Parse rrule string and return human-readable format
   - Examples:
     - `FREQ=DAILY;INTERVAL=1` → "Daily"
     - `FREQ=DAILY;INTERVAL=2` → "Every 2 days"
     - `FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR` → "Weekly on Mon, Wed, Fri"
     - `FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15` → "Monthly on 15th"
     - `FREQ=MONTHLY;INTERVAL=3` → "Every 3 months"

2. **`formatFullDateTime(isoString: string, isAllDay: boolean): string`**
   - Convert ISO date to user-friendly format
   - All-day: "Monday, January 19, 2026"
   - Timed: "Monday, January 19, 2026 at 3:00 PM"

3. **`renderExpandedDetails(options): TemplateResult`**
   - **Parameters**:
     ```typescript
     {
       task: Task,
       templates: RecurringTemplate[],
       isExpanded: boolean,
       onEdit: () => void,
       onDelete: () => void,
       shades: ColorShades,
       textColor: string
     }
     ```
   - **Returns**: Complete expanded details HTML template
   - **Responsibilities**:
     - Return empty template if not expanded
     - Render detail rows (recurrence, bonus, description, due date)
     - Render action buttons (edit, delete)
     - Apply proper styling based on task state

**Detail Row Structure**:
```typescript
interface DetailRow {
  icon: string;      // MDI icon name
  label: string;     // Human-readable label
  value: string;     // Formatted value
}
```

**Icons to use**:
- Recurrence: `mdi:sync`
- Streak bonus: `mdi:trophy-award`
- Description: `mdi:text`
- Due date/time: `mdi:calendar-clock`

### Phase 2: Core Expansion Logic (Both Cards)

**Files**: `grouped-card.ts`, `person-grouped-card.ts`

1. **Add state property**
   ```typescript
   @state() private _expandedTaskUid: string | null = null;
   ```

2. **Add toggle handler**
   ```typescript
   private _toggleTaskExpanded(taskUid: string) {
     if (this._expandedTaskUid === taskUid) {
       this._expandedTaskUid = null; // Collapse
     } else {
       this._expandedTaskUid = taskUid; // Expand (and collapse others)
     }
   }
   ```

3. **Update task click handler in `_renderTasks()`**
   - Change: `@click=${() => this._openEditDialog(task)}`
   - To: `@click=${() => this._toggleTaskExpanded(task.uid)}`

4. **Add auto-collapse on completion**
   - In `_toggleTask()` method, after status update:
     ```typescript
     if (newStatus === "completed" && this._expandedTaskUid === task.uid) {
       this._expandedTaskUid = null;
     }
     ```

5. **Integrate utility rendering**
   - Import `renderExpandedDetails` from `task-detail-utils.ts`
   - Call after each `.todo-item` div in `_renderTasks()`:
     ```typescript
     ${renderExpandedDetails({
       task,
       templates: entity.attributes.chorebot_templates || [],
       isExpanded: this._expandedTaskUid === task.uid,
       onEdit: () => this._openEditDialog(task),
       onDelete: () => this._confirmAndDeleteTask(task),
       shades: this.shades,
       textColor: this._config.task_text_color || "white"
     })}
     ```

6. **Extract/refactor delete handler**
   - Current `_handleDeleteTask()` uses `this._editingTask`
   - Create new method that accepts task parameter:
     ```typescript
     private async _confirmAndDeleteTask(task: Task) {
       const isRecurring = task.rrule || task.parent_uid;
       const message = isRecurring
         ? "Delete this recurring task? This will remove all future occurrences, but keep completed instances."
         : "Delete this task? This action cannot be undone.";
       
       if (!confirm(message)) return;
       
       await this.hass!.callService("todo", "remove_item", {
         entity_id: this._config!.entity,
         item: task.uid,
       });
       
       // Auto-collapse if this task was expanded
       if (this._expandedTaskUid === task.uid) {
         this._expandedTaskUid = null;
       }
     }
     ```

### Phase 3: Styling (Both Cards)

**Files**: `grouped-card.ts`, `person-grouped-card.ts` (CSS sections)

Add CSS for expanded details:

```css
/* Task Container */
.todo-item-container {
  display: flex;
  flex-direction: column;
}

/* Expanded Details Section */
.todo-details {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
  overflow: hidden;
  border-top: 1px solid var(--divider-color);
}

.todo-details.expanded {
  grid-template-rows: 1fr;
}

.todo-details-inner {
  overflow: hidden;
  padding: 0 16px;
  transition: padding 0.3s ease;
}

.todo-details.expanded .todo-details-inner {
  padding: 16px;
}

/* Details Content (Left Side) */
.details-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  line-height: 1.4;
}

.detail-row ha-icon {
  --mdc-icon-size: 16px;
  color: var(--secondary-text-color);
  flex-shrink: 0;
  margin-top: 2px; /* Align with first line of text */
}

.detail-label {
  font-weight: 500;
  color: var(--secondary-text-color);
  flex-shrink: 0;
}

.detail-value {
  flex: 1;
  color: var(--primary-text-color);
  word-wrap: break-word;
}

/* Action Buttons (Bottom Right) */
.details-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
}

.action-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  border: 2px solid;
}

.action-button:hover {
  filter: brightness(1.2);
  transform: scale(1.05);
}

.action-button:active {
  transform: scale(0.95);
}

.action-button.edit {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.action-button.delete {
  color: var(--error-color);
  border-color: var(--error-color);
}

.action-button ha-icon {
  --mdc-icon-size: 20px;
}

/* Mobile Adjustments */
@media (max-width: 600px) {
  .todo-details-inner {
    padding: 0 12px;
  }

  .todo-details.expanded .todo-details-inner {
    padding: 12px;
  }

  .detail-row {
    font-size: 13px;
  }

  .action-button {
    width: 48px;
    height: 48px;
  }
}
```

### Phase 4: Testing & Edge Cases

**Test Coverage**:

1. **Basic Interaction**
   - [ ] Tap collapsed task expands it
   - [ ] Tap expanded task collapses it
   - [ ] Only one task expanded at a time
   - [ ] Completion circle doesn't expand task (stopPropagation works)

2. **Data Display**
   - [ ] Recurrence pattern formats correctly (Daily, Weekly with days, Monthly)
   - [ ] Streak bonus shown only when applicable
   - [ ] Description wraps properly (test long text)
   - [ ] Due date/time formatted correctly (all-day vs timed)
   - [ ] Empty fields handled gracefully (no errors)

3. **Action Buttons**
   - [ ] Edit button opens edit dialog with correct task
   - [ ] Delete button shows confirmation and deletes task
   - [ ] Buttons styled correctly (hover, active states)
   - [ ] Touch targets adequate on mobile (44x44px minimum)

4. **Auto-Collapse**
   - [ ] Completing task via circle collapses it
   - [ ] Deleting task removes from DOM (no orphaned state)
   - [ ] Expanding task A collapses task B

5. **Cross-Card**
   - [ ] Works identically in `grouped-card.ts`
   - [ ] Works identically in `person-grouped-card.ts`
   - [ ] No code duplication (shared utility used)

6. **Visual**
   - [ ] Smooth animation at 60fps
   - [ ] Styling consistent with collapsed state
   - [ ] Respects completed/incomplete coloring
   - [ ] Works with `hide_card_background` config
   - [ ] Border/divider lines look clean

## Files Modified

### New Files
- `frontend/src/utils/task-detail-utils.ts` (~150-200 lines)
  - Recurrence pattern formatting
  - Date/time formatting
  - Expanded details rendering utility

### Modified Files
- `frontend/src/grouped-card.ts` (~100 lines added)
  - State management for expansion
  - Toggle handler
  - Auto-collapse logic
  - CSS for expanded details
  - Integration with utility

- `frontend/src/person-grouped-card.ts` (~100 lines added)
  - Same changes as grouped-card (mirrors implementation)

### Total Estimated Changes
- **New**: ~150-200 lines (utility file)
- **Modified**: ~200 lines (2 cards × ~100 lines each)
- **CSS**: ~150 lines (styling for expanded details)
- **Total**: ~500-550 lines

## Migration Notes

### Breaking Changes
None. This is purely additive functionality.

### Backward Compatibility
- Existing card configurations work without changes
- No config migration needed
- Users see new behavior immediately on update

### User Experience Impact
**Positive**:
- Better information visibility without modal overhead
- Faster access to task details
- More intuitive two-stage interaction

**Neutral**:
- Edit action now requires two taps instead of one
- Users familiar with "tap to edit" will need to adjust (but tap-to-expand is common UX pattern)

## Future Enhancements

1. **Swipe gestures**: Swipe left to delete, right to edit (mobile)
2. **Configurable detail fields**: User-selectable which details to show
3. **Quick inline edit**: Edit task name without opening modal
4. **Subtask support**: Show/manage subtasks in expanded view (when feature added)
5. **Animation customization**: Config option for animation speed/style

## Open Questions (Resolved via User Feedback)

1. ~~Detail field priority~~ → Confirmed: Show recurrence, bonus, description, full due date
2. ~~Long descriptions~~ → Confirmed: Wrap fully, no truncation
3. ~~Chevron indicator~~ → Confirmed: Not needed
4. ~~Animation speed~~ → Confirmed: 0.3s, tune if needed
5. ~~Action button placement~~ → Confirmed: Bottom-right
6. ~~Mobile behavior~~ → Confirmed: Same as desktop

## Design Rationale

**Why two-stage interaction?**
- Reduces cognitive load: User sees details before committing to edit
- Common pattern in modern UIs (iOS Reminders, Google Tasks, Todoist)
- Preserves modal for actual editing (complex form)

**Why show limited details?**
- Avoids redundancy (don't repeat collapsed state info)
- Focuses on "extra" information not immediately visible
- Keeps expanded state clean and scannable

**Why bottom-right for buttons?**
- Separates from completion circle (top-right area)
- Natural reading flow (left to right, top to bottom)
- Thumb-friendly on mobile (right-handed users)

**Why auto-collapse on completion?**
- Task context changes dramatically when completed
- Reduces visual clutter
- Prevents accidental double-completion

## Success Metrics

**Qualitative**:
- User feedback indicates improved UX
- No regression reports on task editing workflow
- Code review confirms no duplication between cards

**Quantitative**:
- Animation maintains 60fps on target devices
- Bundle size increase < 10KB (minified + gzipped)
- Zero runtime errors in error tracking

## Acceptance Criteria

1. **Functional**: All test cases pass
2. **Visual**: Animations smooth, styling consistent
3. **Code Quality**: Shared utilities used, no duplication
4. **Performance**: 60fps animations, no jank
5. **Accessibility**: Keyboard navigation preserved
6. **Documentation**: Code comments explain expansion logic
7. **Cross-Browser**: Works in Chrome, Safari, Firefox (HA-supported browsers)
