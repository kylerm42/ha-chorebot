# Feature Spec: Task Delete Button in Edit Dialog

## 1. Overview

**Purpose:** Add a delete button to the task edit dialog that allows users to delete tasks with confirmation, with special handling for recurring tasks.

**User Story:** As a user, I want to delete tasks directly from the edit dialog so that I don't need to close the dialog and use a separate delete mechanism.

## 2. Requirements

### Functional Requirements

- [ ] Add "Delete" button to edit dialog, positioned in bottom-left
- [ ] Show confirmation dialog before deletion
- [ ] For regular tasks: Delete the task (soft delete)
- [ ] For recurring tasks: Delete template + all incomplete instances, preserve completed instances
- [ ] Different confirmation messages for regular vs recurring tasks
- [ ] Disable delete button while save operation is in progress
- [ ] Close edit dialog after successful deletion

### Non-Functional Requirements

- [ ] Consistent UX with HA's standard delete confirmation patterns
- [ ] No visual disruption to existing dialog layout
- [ ] Maintain backwards compatibility with existing delete service

## 3. Architecture & Design

### High-Level Approach

Enhance the existing task edit dialog with delete functionality. The delete operation will leverage the existing `todo.delete_item` service but with enhanced backend logic to handle recurring tasks intelligently.

### Component Interaction

**Frontend Flow:**

1. User clicks "Delete" button in edit dialog
2. Frontend shows native browser confirm dialog with context-appropriate message
3. On confirmation, frontend calls `todo.delete_item` service with task UID
4. Backend determines if task is recurring and deletes accordingly
5. Frontend closes dialog and refreshes state

**Backend Flow (Enhanced):**

1. `async_delete_todo_items(uids)` receives delete request
2. For each UID, check if task is a recurring instance (has `parent_uid`) or template
3. If recurring: Call new helper method to delete template + all incomplete instances
4. If regular: Call existing soft-delete logic
5. **Sync automatically handled**: Existing implementation already calls `self._sync_coordinator.async_delete_task()` for each deleted task

**Sync Integration (Already Implemented!):**

- The existing `async_delete_todo_items()` method (lines 909-928 in `todo.py`) already handles sync
- After local deletion, it calls `self._sync_coordinator.async_delete_task()` for each task
- Sync coordinator routes to TickTick backend's `async_delete_task()`
- TickTick backend calls `self._client.delete_task(project_id, ticktick_id)` to delete remotely
- **No additional sync code needed for delete button!**

### Critical Design Decisions

**Decision:** Use browser's native `confirm()` dialog instead of custom HA dialog

- **Rationale:** Simpler implementation, standard UX pattern, no additional state management
- **Trade-offs:** Less customizable styling, but adequate for confirmation use case

**Decision:** Enhance existing `todo.delete_item` service rather than creating new service

- **Rationale:** Single service is more intuitive for users and frontend developers
- **Trade-offs:** More complex backend logic, but hidden from API consumers

**Decision:** Preserve completed instances of recurring tasks

- **Rationale:** Users want to keep historical record of completed work
- **Trade-offs:** Orphaned instances remain in storage, but this aligns with user expectations

**Decision:** Delete both current instance AND template for recurring tasks

- **Rationale:** When user deletes "a recurring task", they expect to delete the entire series
- **Trade-offs:** No way to delete just one occurrence (future enhancement if needed)

## 4. Data Model Changes

**No schema changes required.** Leverages existing soft-delete mechanism (`deleted_at` field).

**Logic Changes:**

- New query in `store.py`: Find all incomplete instances for a template
- Enhanced delete logic in `todo.py`: Detect recurring tasks and call recursive delete

## 5. Execution Strategy

### Phase 1: Backend Enhancement

**Goal:** Add logic to handle recurring task deletion
**Scope:** `custom_components/chorebot/store.py`, `custom_components/chorebot/todo.py`

#### Step 1.1: Add helper method to store.py

```python
async def async_delete_recurring_task_and_instances(
    self, list_id: str, task_uid: str
) -> list[str]:
    """
    Delete a recurring template and all its incomplete instances.

    Returns list of deleted UIDs for sync purposes.
    """
```

**Implementation Notes:**

- Get task by UID
- If task has `parent_uid`, resolve to template UID
- If task is template, use its UID directly
- Get all instances via `get_instances_for_template()`
- Filter instances: only delete if `status != "completed"` and `deleted_at is None`
- Soft-delete template
- Soft-delete each incomplete instance
- Return list of all deleted UIDs (for sync coordinator)

#### Step 1.2: Enhance todo.py delete method

Update `async_delete_todo_items()` to detect recurring tasks:

```python
async def async_delete_todo_items(self, uids: list[str]) -> None:
    """Delete multiple tasks (soft delete). Handles recurring tasks."""
    _LOGGER.info("Soft deleting %d tasks", len(uids))

    all_deleted_tasks = []  # Collect all deleted tasks for sync

    for uid in uids:
        task = self._store.get_task(self._list_id, uid)

        if task and task.is_recurring():
            # Recurring task: delete template + incomplete instances
            _LOGGER.info(
                "Deleting recurring task '%s' (uid: %s) - will delete template and all incomplete instances",
                task.summary,
                uid
            )
            deleted_uids = await self._store.async_delete_recurring_task_and_instances(
                self._list_id, uid
            )
            # Collect all deleted tasks for sync (need to get them AFTER deletion for deleted_at timestamp)
            for deleted_uid in deleted_uids:
                # Tasks are soft-deleted, so we need to get them from storage (not cache)
                deleted_task = self._store.get_task(self._list_id, deleted_uid)
                if deleted_task:
                    all_deleted_tasks.append(deleted_task)
        else:
            # Regular task: use existing logic
            await self._store.async_delete_task(self._list_id, uid)
            if task:
                all_deleted_tasks.append(task)

    # Write state immediately
    self.async_write_ha_state()

    # Sync all deleted tasks to remote backend (existing logic, reused!)
    if self._sync_coordinator:
        for deleted_task in all_deleted_tasks:
            await self._sync_coordinator.async_delete_task(self._list_id, deleted_task)
```

**Note:** This reuses the existing sync infrastructure! The final sync block is essentially the same as the original implementation, just adapted to handle multiple tasks from recurring deletion.

### Phase 2: Frontend Dialog Enhancement

**Goal:** Add delete button to edit dialog with confirmation
**Scope:** `src/utils/dialog-utils.ts`, all cards using the dialog

#### Step 2.1: Update dialog-utils.ts

**Changes to `renderTaskDialog()` function:**

- Add `onDelete` callback parameter (optional)
- Add `showDelete` boolean parameter (default: true)
- Add delete button in dialog template

**Button Positioning Strategy:**
`ha-dialog` doesn't have a built-in "left-aligned action" slot. Options:

1. **Custom slot approach**: Add button outside action slots, style with CSS
2. **Secondary action approach**: Use as second secondary action (Cancel, Delete)
3. **Dialog body approach**: Place button at bottom of form

**Recommended: Custom slot with CSS positioning**

```typescript
export function renderTaskDialog(
  isOpen: boolean,
  task: EditingTask | null,
  hass: HomeAssistant,
  sections: Section[],
  availableTags: string[],
  saving: boolean,
  onClose: () => void,
  onValueChanged: (ev: CustomEvent) => void,
  onSave: () => void,
  onDelete?: () => void, // NEW: Optional delete callback
  dialogTitle: string = "Edit Task",
  showDelete: boolean = true, // NEW: Show delete button
): TemplateResult {
  if (!isOpen || !task) {
    return html``;
  }

  const schema = buildEditDialogSchema(task, sections, availableTags);
  const data = buildEditDialogData(task, sections);
  const computeLabel = getFieldLabels(hass);

  return html`
    <ha-dialog open @closed=${onClose} .heading=${dialogTitle}>
      <ha-form
        .hass=${hass}
        .schema=${schema}
        .data=${data}
        .computeLabel=${computeLabel}
        @value-changed=${onValueChanged}
      ></ha-form>

      <!-- Delete button (bottom-left positioning via CSS) -->
      ${showDelete && onDelete
        ? html`
            <ha-button
              slot="primaryAction"
              @click=${onDelete}
              .disabled=${saving}
              class="delete-button"
            >
              Delete
            </ha-button>
          `
        : ""}

      <ha-button slot="primaryAction" @click=${onSave} .disabled=${saving}>
        ${saving ? "Saving..." : "Save"}
      </ha-button>
      <ha-button slot="secondaryAction" @click=${onClose} .disabled=${saving}>
        Cancel
      </ha-button>

      <style>
        ha-dialog {
          --mdc-dialog-min-width: 500px;
        }
        .delete-button {
          --mdc-theme-primary: var(--error-color, #db4437);
          margin-right: auto; /* Push to left */
        }
      </style>
    </ha-dialog>
  `;
}
```

**Note on CSS:** The `margin-right: auto` trick pushes the delete button to the left while Save/Cancel stay on the right. This uses flexbox behavior of the action slot container.

#### Step 2.2: Update cards to implement delete handler

**Example for `grouped-card.ts` (similar for `list-card.ts`):**

```typescript
private async _handleDeleteTask(): Promise<void> {
  if (!this._editingTask) return;

  const task = this._editingTask;
  const isRecurring = task.has_recurrence || task.parent_uid;

  // Confirmation message
  const message = isRecurring
    ? "Delete this recurring task? This will remove all future occurrences, but keep completed instances."
    : "Delete this task? This action cannot be undone.";

  if (!confirm(message)) {
    return;
  }

  try {
    // Call HA service to delete
    await this.hass.callService("todo", "remove_item", {
      entity_id: this.entity,
      item: task.uid,
    });

    // Close dialog
    this._editingTask = null;

    // Show success toast (optional)
    this.dispatchEvent(
      new CustomEvent("hass-notification", {
        detail: { message: "Task deleted successfully" },
        bubbles: true,
        composed: true,
      })
    );
  } catch (error) {
    alert(`Failed to delete task: ${error}`);
  }
}

// In render method, pass delete handler to renderTaskDialog:
${renderTaskDialog(
  !!this._editingTask,
  this._editingTask,
  this.hass,
  sections,
  availableTags,
  this._savingTask,
  () => this._closeEditDialog(),
  (ev) => this._handleEditValueChanged(ev),
  () => this._saveEditedTask(),
  () => this._handleDeleteTask(), // NEW: Pass delete handler
  "Edit Task"
)}
```

### Phase 3: Testing & Validation

**Goal:** Verify delete functionality works correctly
**Scope:** Manual testing with dev environment

#### Test Cases:

1. **Regular task deletion**
   - Create regular task
   - Open edit dialog
   - Click delete, confirm
   - Verify task is removed from UI
   - Verify task has `deleted_at` in storage

2. **Recurring task deletion**
   - Create recurring task with 3 future instances
   - Complete first instance
   - Delete second instance via edit dialog
   - Verify: Template deleted, all incomplete instances deleted, completed instance remains

3. **Confirmation cancel**
   - Open edit dialog, click delete
   - Click "Cancel" on confirmation
   - Verify: Dialog stays open, task not deleted

4. **Delete button disabled state**
   - Open edit dialog, start saving
   - Verify: Delete button is disabled during save

5. **Sync integration (if TickTick enabled)**
   - Delete recurring task
   - Verify: Template deleted on TickTick
   - Verify: Completed instances remain local-only

## 6. Usage Scenarios / Edge Cases

### Scenario A: Delete One-Time Task

**Steps:**

1. User clicks task row to open edit dialog
2. User clicks "Delete" button (bottom-left, red text)
3. Browser confirm: "Delete this task? This action cannot be undone."
4. User clicks OK
5. Task is soft-deleted, dialog closes, UI updates

**Expected:** Task removed from list, marked as deleted in storage

### Scenario B: Delete Recurring Task (With Completed Instances)

**Steps:**

1. User has recurring daily task with 2 completed instances, 1 current instance, 2 future instances
2. User opens edit dialog for current instance
3. User clicks "Delete"
4. Browser confirm: "Delete this recurring task? This will remove all future occurrences, but keep completed instances."
5. User clicks OK
6. Template + current instance + 2 future instances are deleted
7. 2 completed instances remain in storage (viewable in history)

**Expected:** No more future instances created, completed instances preserved

### Scenario C: Cancel Deletion

**Steps:**

1. User opens edit dialog
2. User clicks "Delete"
3. User clicks "Cancel" on confirmation
4. Dialog remains open

**Expected:** Task unchanged, dialog stays open for further editing

### Scenario D: Delete During Sync Operation

**Edge Case:** User deletes task while sync is in progress

**Handling:**

- Delete operations are async but use store lock
- Sync coordinator also uses store lock
- Operations will queue and execute sequentially
- No special handling needed (existing lock mechanism prevents race conditions)

### Scenario E: Delete Orphaned Instance

**Edge Case:** Recurring instance with `parent_uid` but template was already deleted

**Handling:**

- In `async_delete_recurring_task_and_instances()`, check if template exists
- If template not found, just delete the instance (treat as regular task)
- Log warning for debugging purposes

## 7. Security & Performance Considerations

### Security

- **No new attack vectors:** Uses existing soft-delete mechanism
- **Confirmation prevents accidents:** Native browser confirm provides user confirmation
- **No permanent deletion:** Soft-delete preserves audit trail
- **Sync security:** Reuses existing sync authentication and error handling

### Performance

- **Minimal overhead:** Delete operations already use store lock
- **Batch operations:** When deleting recurring task, all related instances deleted in single transaction
- **No UI blocking:** Delete is async, doesn't freeze frontend
- **Sync efficiency:** Each deleted task synced individually (same as existing implementation)

### Accessibility

- **Keyboard navigation:** Delete button accessible via Tab key
- **Screen readers:** Button labeled "Delete" with semantic HTML
- **Color indication:** Red color (via `--error-color`) indicates destructive action
- **Confirmation dialog:** Native confirm dialog is screen-reader friendly

## 7.5 Sync Integration Details

### How Sync Works (Existing Implementation - No Changes Needed!)

**Push Sync (Local → TickTick):**
When a task is deleted locally, the existing `async_delete_todo_items()` method:

1. Soft-deletes tasks locally (sets `deleted_at` timestamp)
2. Calls `self._sync_coordinator.async_delete_task()` for each deleted task
3. Sync coordinator calls `ticktick_backend.async_delete_task()`
4. TickTick backend extracts `ticktick_id` from task's `sync` metadata
5. Calls `self._client.delete_task(project_id, ticktick_id)` via REST API
6. Task is permanently deleted on TickTick

**Pull Sync (TickTick → Local):**
When a task is deleted on TickTick, during `async_pull_changes()`:

1. Task exists locally but missing from TickTick's project data
2. Individual API call to verify deletion (404 = deleted, exists = completed)
3. If 404, calls `local_task.mark_deleted()` to set `deleted_at` timestamp
4. Calls `self.store.async_update_task()` to persist changes
5. Task is soft-deleted locally (matching remote state)

**Recurring Task Sync:**
When deleting a recurring task (template + instances):

- Template is synced as deletion (has `ticktick_id` in sync metadata)
- Incomplete instances are NOT synced (they're local-only projections)
- Completed instances remain local-only (never touched)
- TickTick sees: Template deleted → stops generating future occurrences

**Sync Reliability:**

- Delete operations use store lock (prevents race conditions)
- Sync coordinator has its own lock (prevents concurrent syncs)
- Failed deletes log errors but don't block local deletion
- Sync is non-blocking (happens after local state updated)

## 8. Future Enhancements (Out of Scope)

- **Delete single occurrence:** Allow deleting just one instance without affecting template
- **Undo deletion:** Add ability to restore recently deleted tasks
- **Bulk delete:** Delete multiple tasks from list view
- **Delete with archive:** Option to archive instead of soft-delete
- **Custom confirmation dialog:** Replace native confirm with styled HA dialog

## 9. Implementation Checklist

### Backend

- [ ] Add `async_delete_recurring_task_and_instances()` to `store.py`
- [ ] Enhance `async_delete_todo_items()` in `todo.py`
- [ ] Add logging for recurring task deletion
- [ ] Test soft-delete with orphaned instances

### Frontend

- [ ] Update `renderTaskDialog()` signature with `onDelete` and `showDelete` params
- [ ] Add delete button with CSS positioning
- [ ] Implement `_handleDeleteTask()` in `list-card.ts`
- [ ] Implement `_handleDeleteTask()` in `grouped-card.ts`
- [ ] Update other cards using the dialog (if any)
- [ ] Test confirmation messages for regular vs recurring tasks

### Testing

- [ ] Test regular task deletion
- [ ] Test recurring task deletion with completed instances
- [ ] Test confirmation cancel
- [ ] Test delete button disabled state
- [ ] Test sync integration (if enabled):
  - [ ] Verify task deleted on TickTick after local deletion
  - [ ] Verify recurring task template deleted on TickTick
  - [ ] Verify completed instances remain local-only
  - [ ] Test pull sync: Delete task on TickTick, verify local soft-delete
- [ ] Test edge cases (orphaned instances, missing template)

### Documentation

- [ ] Update `DEVELOPMENT.md` with delete behavior notes
- [ ] Update `README.md` with delete functionality description
- [ ] Add comments in code explaining recurring task delete logic
