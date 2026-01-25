---
title: Task Completion Refactor - CompletionContext Pattern
status: implemented
created: 2026-01-25
updated: 2026-01-25
last_updated: 2026-01-25
author: AP-5 (Architect)
complexity: moderate-to-high
estimated_effort: 5-7 hours
files_affected:
  - custom_components/chorebot/__init__.py
  - custom_components/chorebot/completion_context.py (NEW)
  - custom_components/chorebot/audit_log.py (NEW)
  - custom_components/chorebot/task.py
  - custom_components/chorebot/const.py
  - custom_components/chorebot/todo.py
  - frontend/src/utils/types.ts
  - frontend/src/utils/points-badge-utils.ts
  - frontend/src/grouped-card.ts (CSS)
  - frontend/src/person-grouped-card.ts (CSS)
related_issues: []
user_notes:
  - "Treat all timed tasks as all-day for streak purposes - date-only comparison"
  - "Remote sync deprecated - do not implement sync in new paradigm"
---

# Task Completion Refactor: CompletionContext Pattern

## Overview

Refactor the recurring task completion system to use a unified **CompletionContext** pattern that separates "determining what should happen" (immutable analysis) from "making it happen" (mutations). This fixes multiple existing bugs, establishes a robust foundation for future features, and adds comprehensive audit logging for debugging and analytics.

## Problems Being Solved

### 1. **Bonus Bug**: Late Completions Still Get Bonuses
**Current behavior**: Bonus awarded before checking if completion is on-time
- User completes task 3 days late at a bonus milestone
- Bonus is awarded (checks `template.streak_current % interval == 0`)
- Then on-time check fails and resets streak to 0
- Result: User gets bonus they shouldn't have earned

### 2. **Display Bug**: All Instances Show Same Points/Streak
**Current behavior**: UI dynamically calculates from template's current state
- All instances show "+1 + 2" (same bonus prediction)
- All instances show "🔥2" (same current streak)
- No way to see what each instance actually earned when completed

### 3. **Scattered Logic**: Split Responsibilities Create Tight Coupling
**Current behavior**: Points logic in `_handle_points_for_status_change`, streak logic in `_handle_recurring_instance_completion`
- Must call in specific order
- Points logic must "predict" what streak logic will do
- Hard to test edge cases

### 4. **Missing Analytics**: No Historical Completion Data
**Current behavior**: Can't answer questions like:
- What's my on-time completion rate?
- Which tasks reset my streak most often?
- How many bonuses have I earned this month?

## Proposed Solution

### Architecture: Build-Validate-Execute Pattern

```
┌─────────────────────────────────────────────────┐
│ 1. BUILD CONTEXT (Analysis Phase)              │
│    - Check on-time status                      │
│    - Calculate streak outcome                  │
│    - Determine bonus eligibility               │
│    - Resolve person assignment                 │
│    - NO MUTATIONS                              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. VALIDATE CONTEXT (Verification Phase)       │
│    - Log complete context for debugging        │
│    - Verify all decisions are consistent       │
│    - Context is immutable snapshot             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. EXECUTE COMPLETION (Mutation Phase)         │
│    - Update instance with metadata             │
│    - Award points to person                    │
│    - Update template streak                    │
│    - Create next instance                      │
│    - Write to audit log                        │
│    - ALL MUTATIONS USE CONTEXT                 │
└─────────────────────────────────────────────────┘
```

### New Data Structures

#### 1. CompletionContext Dataclass (In-Memory Only)

**Note**: This is a **runtime object only**, not stored in database. It's built fresh each time a completion happens, used to orchestrate the completion process, then discarded. All permanent state goes into Task fields.

```python
@dataclass(frozen=True)  # Immutable
class CompletionContext:
    """Complete snapshot of a task completion event.
    
    This is a runtime coordination object, NOT stored in database.
    Built fresh on each completion to determine what should happen.
    """
    
    # Input entities
    instance: Task
    template: Task | None  # For recurring tasks
    person_id: str | None
    
    # Validation results
    is_on_time: bool
    is_valid_for_streak: bool
    completion_timestamp: str  # ISO 8601
    
    # Points calculation
    base_points_earned: int
    bonus_points_earned: int
    total_points_earned: int
    bonus_awarded_reason: str | None  # e.g., "7-day streak milestone"
    
    # Streak tracking
    streak_before: int  # Template's streak before completion
    streak_after: int   # Template's streak after completion (increment or reset)
    streak_milestone_reached: bool  # Did this completion reach a milestone?
    
    # Next instance info (for recurring)
    should_create_next: bool
    next_due_date: str | None
```

#### 2. New Task Fields (Completion Metadata - Persisted)

```python
@dataclass
class Task:
    # ... existing fields ...
    
    # === Completion Metadata (Historical Record) ===
    # These fields are set when status changes to "completed"
    
    completed_on_time: bool | None = None
    """Was this completed on or before its due date? None if not completed."""
    
    points_earned: int = 0
    """Total points awarded for this completion (base + bonus). 0 if not completed."""
    
    streak_at_completion: int = 0
    """Template's streak value after this completion. 0 if not recurring or not completed."""
```

### Audit Logging System

Create append-only audit log at `.storage/chorebot_audit.log`:

**Format**: `ISO_TIMESTAMP|EVENT_TYPE|JSON_DATA`

**Events Logged** (only when they DO happen):
- `TASK_COMPLETED` - Task marked as completed
- `POINTS_AWARDED` - Base points awarded to person
- `BONUS_AWARDED` - Bonus points awarded to person
- `STREAK_UPDATED` - Template streak incremented or reset
- `INSTANCE_CREATED` - New recurring instance created

**Example Log**:
```
2026-01-25T14:30:22.123456Z|TASK_COMPLETED|{"task_uid":"abc123","task_summary":"Daily Exercise","list_id":"daily","on_time":true,"is_recurring":true}
2026-01-25T14:30:22.234567Z|POINTS_AWARDED|{"person_id":"person.kyle","amount":10,"task_uid":"abc123","task_summary":"Daily Exercise","reason":"task_completion"}
2026-01-25T14:30:22.345678Z|BONUS_AWARDED|{"person_id":"person.kyle","amount":50,"task_uid":"abc123","task_summary":"Daily Exercise","streak":7,"reason":"7-day streak milestone"}
2026-01-25T14:30:22.456789Z|STREAK_UPDATED|{"task_uid":"template_xyz","task_summary":"Daily Exercise","old_streak":6,"new_streak":7,"reason":"on_time_completion"}
2026-01-25T14:30:22.567890Z|INSTANCE_CREATED|{"instance_uid":"def456","template_uid":"template_xyz","task_summary":"Daily Exercise","occurrence_index":8,"due_date":"2026-01-26T08:00:00Z","streak_snapshot":7}
```

### Implementation Phases

## Phase 1: Backend - Audit Logging (1 hour)

**File: `custom_components/chorebot/audit_log.py` (NEW)**

Create `AuditLogger` class with methods:
- `log_task_completed(task_uid, task_summary, list_id, on_time, is_recurring)`
- `log_points_awarded(person_id, amount, task_uid, task_summary, reason)`
- `log_bonus_awarded(person_id, amount, task_uid, task_summary, streak, reason)`
- `log_streak_updated(task_uid, task_summary, old_streak, new_streak, reason)`
- `log_instance_created(instance_uid, template_uid, task_summary, occurrence_index, due_date, streak_snapshot)`

Initialize in `__init__.py` on setup:
```python
audit_log_path = hass.config.path(".storage", "chorebot_audit.log")
audit_logger = AuditLogger(audit_log_path)
hass.data[DOMAIN]["audit_logger"] = audit_logger
```

## Phase 2: Backend - Data Model (30 minutes)

**File: `custom_components/chorebot/task.py`**

Add three new fields to Task dataclass:
- `completed_on_time: bool | None = None`
- `points_earned: int = 0`
- `streak_at_completion: int = 0`

Add constants to `const.py`:
- `FIELD_COMPLETED_ON_TIME`
- `FIELD_POINTS_EARNED`
- `FIELD_STREAK_AT_COMPLETION`

Update `to_dict()` and `from_dict()` serialization.

## Phase 3: Backend - CompletionContext (2 hours)

**File: `custom_components/chorebot/completion_context.py` (NEW)**

Implement `CompletionContext` dataclass and `CompletionContextBuilder`:

```python
class CompletionContextBuilder:
    async def build_context(instance: Task, person_id: str | None) -> CompletionContext:
        """Build complete completion plan before any mutations."""
        
        # 1. Get template if recurring
        template = self._store.get_template(...) if instance.parent_uid else None
        
        # 2. Check on-time (DATE-ONLY comparison for ALL tasks)
        is_on_time = self._check_completion_timeliness(instance)
        
        # 3. Determine streak outcome
        if template:
            if template.is_dateless_recurring or is_on_time:
                streak_after = template.streak_current + 1
            else:
                streak_after = 0  # Late = reset
        else:
            streak_after = 0
        
        # 4. Calculate bonus (ON milestone)
        bonus_points = 0
        if template and is_on_time and streak_after % template.streak_bonus_interval == 0:
            bonus_points = template.streak_bonus_points
        
        # 5. Return immutable context
        return CompletionContext(...)
    
    def _check_completion_timeliness(instance: Task) -> bool:
        """Check if completed on same calendar day as due date.
        
        USER NOTE: Treat ALL timed tasks as all-day for streak purposes.
        Use date-only comparison regardless of is_all_day flag.
        """
        if not instance.due:
            return True  # No due date = always on-time
        
        due_dt = datetime.fromisoformat(instance.due)
        now = datetime.now(UTC)
        
        # Always compare dates only (user requirement)
        return now.date() <= due_dt.date()
```

## Phase 4: Backend - Refactor Completion Flow (1 hour)

**File: `custom_components/chorebot/todo.py`**

Refactor `async_update_task_internal`:

```python
def __init__(self, ...):
    self._completion_builder = CompletionContextBuilder(store, list_id)
    self._audit_logger = hass.data[DOMAIN].get("audit_logger")

async def async_update_task_internal(self, uid: str, ...):
    # ... existing validation ...
    
    if status_changed_to_completed:
        # NEW: Context-based completion
        person_id = self._resolve_person_id_for_task(task)
        context = await self._completion_builder.build_context(task, person_id)
        await self._process_completion(context)
    else:
        # Existing non-completion update logic
        ...

async def _process_completion(self, context: CompletionContext):
    """Execute completion using pre-validated context."""
    # 1. Update instance with metadata
    context.instance.completed_on_time = context.is_on_time
    context.instance.points_earned = context.total_points_earned
    context.instance.streak_at_completion = context.streak_after
    
    # 2. Audit log task completed
    self._audit_logger.log_task_completed(...)
    
    # 3. Award points (with audit logs)
    await self._award_points(context)
    
    # 4. Update template streak (with audit log)
    if context.template:
        context.template.streak_current = context.streak_after
        self._audit_logger.log_streak_updated(...)
    
    # 5. Save all changes
    await self._store.async_update_task(...)
    
    # 6. Create next instance (with audit log)
    if context.should_create_next:
        await self._create_next_instance(context)
    
    # 7. Write state to HA
    self.async_write_ha_state()
```

**REMOVE** old methods:
- `_handle_points_for_status_change`
- `_handle_recurring_instance_completion`

## Phase 5: Frontend - Type Updates (15 minutes)

**File: `frontend/src/utils/types.ts`**

Add to Task interface:
```typescript
completed_on_time?: boolean;
points_earned?: number;
streak_at_completion?: number;
```

## Phase 6: Frontend - Points Badge Refactor (1 hour)

**File: `frontend/src/utils/points-badge-utils.ts`**

Update `renderPointsBadge()`:

```typescript
// For COMPLETED tasks: Show actual points earned (historical)
if (task.status === "completed" && task.points_earned) {
  const base = task.points_value;
  const bonus = task.points_earned - base;
  
  if (bonus > 0) {
    return html`<span class="points-badge bonus-awarded">
      +${base} + ${bonus} ${parts.icon} ${parts.text}
    </span>`;
  }
  
  return html`<span class="points-badge">
    +${task.points_earned} ${parts.icon} ${parts.text}
  </span>`;
}

// For INCOMPLETE tasks: Predict bonus based on CURRENT time
if (task.parent_uid && task.status === "needs_action") {
  const template = templates.find(t => t.uid === task.parent_uid);
  
  // Check if would be on-time if completed NOW
  const isOnTime = checkIfWouldBeOnTime(task);
  const predictedStreak = isOnTime ? template.streak_current + 1 : 0;
  
  // Check if predicted streak is milestone
  if (isOnTime && predictedStreak % template.streak_bonus_interval === 0) {
    return html`<span class="points-badge bonus-pending">
      +${task.points_value} + ${template.streak_bonus_points}
    </span>`;
  }
}

// Default: Base points only
return html`<span class="points-badge">+${task.points_value}</span>`;

/**
 * Check if task would be on-time if completed NOW.
 * USER NOTE: Date-only comparison (treat timed tasks as all-day)
 */
function checkIfWouldBeOnTime(task: Task): boolean {
  if (!task.due) return true;
  
  const dueDate = new Date(task.due);
  const now = new Date();
  
  // Always compare dates only (user requirement)
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return today <= dueDay;
}
```

## Phase 7: Frontend - CSS Updates (15 minutes)

Add to both `grouped-card.ts` and `person-grouped-card.ts`:

```css
.points-badge.bonus-awarded {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: 1px solid #FF8C00;
  color: #000;
  font-weight: 600;
  animation: pulse 2s ease-in-out infinite;
}

.points-badge.bonus-pending {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 165, 0, 0.3) 100%);
  border: 1px solid rgba(255, 140, 0, 0.6);
  animation: glow 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
  50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
}
```

## Testing Strategy

### Unit Tests

**Context Building**:
- On-time completion with bonus (streak = 6, interval = 7)
- Late completion with no bonus (streak = 6, but overdue)
- Dateless recurring always increments
- Date-only comparison works correctly

**Completion Processing**:
- Points awarded correctly
- Metadata captured on instance
- Audit log entries written
- Template streak updated

### Integration Tests

**Full Flow**:
- Complete 7 instances → 7th gets bonus
- Complete 7th late → no bonus, streak resets
- Frontend prediction changes when task becomes overdue
- Audit log captures complete flow

### Edge Cases

- Uncomplete behavior (disassociation still works)
- Midnight reset (daily job doesn't conflict)
- Multiple simultaneous completions
- Dateless recurring (always increments)
- Legacy instances without metadata

## Success Criteria

- [x] Late completions don't receive bonuses (backend validation)
- [x] Overdue tasks don't show bonus prediction (frontend check)
- [x] Completed tasks show actual points earned
- [x] Bonus awarded ON milestone (7th, not 8th)
- [x] All tasks use date-only comparison for streaks
- [x] Audit log captures all events
- [x] Context logging enables debugging
- [ ] All existing tests pass (requires manual testing)
- [x] Frontend gracefully handles legacy data
- [ ] No performance regression (requires manual testing)

## Migration & Backward Compatibility

**Legacy Instances**:
- `completed_on_time` → `None` (unknown)
- `points_earned` → `0` (fall back to `points_value`)
- `streak_at_completion` → `0` (unknown)

**Frontend Fallback**:
- If `points_earned` exists, use it
- Else fall back to `points_value` display
- Prediction always works (uses current time)

**No Migration Script Needed**: New fields are optional, frontend has fallbacks.

## Estimated Effort

- **Backend**: 4-5 hours (audit log, context, refactor, tests)
- **Frontend**: 1.5-2 hours (types, badge logic, CSS, tests)
- **Total**: 5.5-7 hours

## Key Design Decisions

1. **Bonus ON milestone**: User approved (7th completion gets bonus, not 8th)
2. **Date-only comparison**: User requirement (all tasks treat time as all-day for streaks)
3. **No remote sync**: User requirement (sync deprecated, not implemented)
4. **CompletionContext is transient**: Runtime only, not stored (permanent state in Task fields)
5. **Audit log is append-only**: Events logged only when they happen (no "didn't happen" logs)

## Future Enhancements Enabled

- Rich analytics dashboard (on-time rates, bonus earnings)
- Advanced bonus rules (multipliers, time-based)
- Completion audit trail (full history)
- Smart scheduling (optimal completion times)
