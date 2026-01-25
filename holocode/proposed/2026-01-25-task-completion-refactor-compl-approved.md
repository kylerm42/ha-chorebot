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

#### File: `custom_components/chorebot/audit_log.py` (NEW)

Create append-only audit log for tracking what actually happens:

```python
"""Audit logging for ChoreBot actions."""

import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

_LOGGER = logging.getLogger(__name__)

class AuditLogger:
    """Append-only audit log for tracking ChoreBot events."""
    
    def __init__(self, log_path: str):
        """Initialize audit logger.
        
        Args:
            log_path: Path to audit log file (e.g., /config/.storage/chorebot_audit.log)
        """
        self._log_path = Path(log_path)
        self._ensure_log_exists()
    
    def _ensure_log_exists(self):
        """Create log file if it doesn't exist."""
        if not self._log_path.exists():
            self._log_path.parent.mkdir(parents=True, exist_ok=True)
            self._log_path.touch()
    
    def _write_entry(self, event_type: str, data: dict[str, Any]) -> None:
        """Write audit log entry.
        
        Format: ISO_TIMESTAMP | EVENT_TYPE | JSON_DATA
        """
        timestamp = datetime.now(UTC).isoformat()
        import json
        json_data = json.dumps(data, separators=(',', ':'))
        
        try:
            with open(self._log_path, 'a', encoding='utf-8') as f:
                f.write(f"{timestamp}|{event_type}|{json_data}\n")
        except Exception as e:
            _LOGGER.error("Failed to write audit log: %s", e)
    
    def log_task_completed(
        self,
        task_uid: str,
        task_summary: str,
        list_id: str,
        on_time: bool,
        is_recurring: bool,
    ) -> None:
        """Log task completion event."""
        self._write_entry("TASK_COMPLETED", {
            "task_uid": task_uid,
            "task_summary": task_summary,
            "list_id": list_id,
            "on_time": on_time,
            "is_recurring": is_recurring,
        })
    
    def log_points_awarded(
        self,
        person_id: str,
        amount: int,
        task_uid: str,
        task_summary: str,
        reason: str,
    ) -> None:
        """Log points award event."""
        self._write_entry("POINTS_AWARDED", {
            "person_id": person_id,
            "amount": amount,
            "task_uid": task_uid,
            "task_summary": task_summary,
            "reason": reason,
        })
    
    def log_bonus_awarded(
        self,
        person_id: str,
        amount: int,
        task_uid: str,
        task_summary: str,
        streak: int,
        reason: str,
    ) -> None:
        """Log bonus points award event."""
        self._write_entry("BONUS_AWARDED", {
            "person_id": person_id,
            "amount": amount,
            "task_uid": task_uid,
            "task_summary": task_summary,
            "streak": streak,
            "reason": reason,
        })
    
    def log_streak_updated(
        self,
        task_uid: str,
        task_summary: str,
        old_streak: int,
        new_streak: int,
        reason: str,
    ) -> None:
        """Log streak update event."""
        self._write_entry("STREAK_UPDATED", {
            "task_uid": task_uid,
            "task_summary": task_summary,
            "old_streak": old_streak,
            "new_streak": new_streak,
            "reason": reason,
        })
    
    def log_instance_created(
        self,
        instance_uid: str,
        template_uid: str,
        task_summary: str,
        occurrence_index: int,
        due_date: str | None,
        streak_snapshot: int,
    ) -> None:
        """Log recurring instance creation."""
        self._write_entry("INSTANCE_CREATED", {
            "instance_uid": instance_uid,
            "template_uid": template_uid,
            "task_summary": task_summary,
            "occurrence_index": occurrence_index,
            "due_date": due_date,
            "streak_snapshot": streak_snapshot,
        })
```

**Audit Log Format Example:**
```
2026-01-25T14:30:22.123456Z|TASK_COMPLETED|{"task_uid":"abc123","task_summary":"Daily Exercise","list_id":"daily","on_time":true,"is_recurring":true}
2026-01-25T14:30:22.234567Z|POINTS_AWARDED|{"person_id":"person.kyle","amount":10,"task_uid":"abc123","task_summary":"Daily Exercise","reason":"task_completion"}
2026-01-25T14:30:22.345678Z|BONUS_AWARDED|{"person_id":"person.kyle","amount":50,"task_uid":"abc123","task_summary":"Daily Exercise","streak":7,"reason":"7-day streak milestone"}
2026-01-25T14:30:22.456789Z|STREAK_UPDATED|{"task_uid":"template_xyz","task_summary":"Daily Exercise","old_streak":6,"new_streak":7,"reason":"on_time_completion"}
2026-01-25T14:30:22.567890Z|INSTANCE_CREATED|{"instance_uid":"def456","template_uid":"template_xyz","task_summary":"Daily Exercise","occurrence_index":8,"due_date":"2026-01-26T08:00:00Z","streak_snapshot":7}
```

**Log Rotation**: Audit log grows unbounded. File is append-only for reliability. Consider manual archival or size monitoring if needed in future.

### Code Changes

#### File: `custom_components/chorebot/__init__.py`

Initialize audit logger on setup:

```python
async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up ChoreBot from a config entry."""
    # ... existing setup ...
    
    # Initialize audit logger
    from .audit_log import AuditLogger
    audit_log_path = hass.config.path(".storage", "chorebot_audit.log")
    audit_logger = AuditLogger(audit_log_path)
    hass.data[DOMAIN]["audit_logger"] = audit_logger
    _LOGGER.info("Audit logger initialized: %s", audit_log_path)
    
    # ... rest of setup ...
```

#### File: `custom_components/chorebot/completion_context.py` (NEW)

Create new module for completion logic:

```python
"""Task completion context and orchestration."""

from dataclasses import dataclass
from datetime import UTC, datetime

from .task import Task
from .store import ChoreBotStore

@dataclass(frozen=True)
class CompletionContext:
    """Immutable snapshot of task completion state and decisions.
    
    This is a runtime coordination object, NOT stored in database.
    """
    # (fields from architecture section above)

class CompletionContextBuilder:
    """Builds CompletionContext by analyzing task state."""
    
    def __init__(self, store: ChoreBotStore, list_id: str):
        self._store = store
        self._list_id = list_id
    
    async def build_context(
        self, 
        instance: Task,
        person_id: str | None,
    ) -> CompletionContext:
        """Analyze task and determine all completion outcomes.
        
        This method builds the ENTIRE completion plan before any
        mutations happen. All decisions are captured in the returned
        immutable context object.
        """
        
        # 1. Get template if recurring
        template = None
        if instance.parent_uid:
            template = self._store.get_template(self._list_id, instance.parent_uid)
        
        # 2. Check if completion is on-time
        is_on_time = self._check_completion_timeliness(instance)
        
        # 3. Determine streak outcome
        streak_before = template.streak_current if template else 0
        
        if template:
            if template.is_dateless_recurring:
                # Dateless: Always increment (no concept of "late")
                streak_after = streak_before + 1
                is_valid_for_streak = True
            elif is_on_time:
                # Date-based on-time: Increment
                streak_after = streak_before + 1
                is_valid_for_streak = True
            else:
                # Date-based late: Reset to 0
                streak_after = 0
                is_valid_for_streak = False
        else:
            # Not recurring: No streak
            streak_after = 0
            is_valid_for_streak = False
        
        # 4. Calculate points and bonus
        # IMPORTANT: Bonus awarded ON milestone completion (more intuitive)
        base_points = instance.points_value
        bonus_points = 0
        bonus_reason = None
        streak_milestone = False
        
        if template and is_valid_for_streak:
            # Check if THIS completion reaches a milestone
            if (
                template.streak_bonus_points > 0 and
                template.streak_bonus_interval > 0 and
                streak_after % template.streak_bonus_interval == 0
            ):
                bonus_points = template.streak_bonus_points
                bonus_reason = f"{streak_after}-day streak milestone"
                streak_milestone = True
        
        # 5. Determine if next instance should be created
        should_create_next = template is not None
        next_due = None
        if should_create_next:
            if template.is_dateless_recurring:
                # Dateless: Next instance has no due date
                next_due = None
            else:
                # Date-based: Calculate from rrule
                next_due = self._calculate_next_due_date(template, instance.due)
        
        # 6. Build immutable context
        return CompletionContext(
            instance=instance,
            template=template,
            person_id=person_id,
            is_on_time=is_on_time,
            is_valid_for_streak=is_valid_for_streak,
            completion_timestamp=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            base_points_earned=base_points,
            bonus_points_earned=bonus_points,
            total_points_earned=base_points + bonus_points,
            bonus_awarded_reason=bonus_reason,
            streak_before=streak_before,
            streak_after=streak_after,
            streak_milestone_reached=streak_milestone,
            should_create_next=should_create_next,
            next_due_date=next_due,
        )
    
    def _check_completion_timeliness(self, instance: Task) -> bool:
        """Check if instance is being completed on or before due date."""
        if not instance.due:
            # No due date = always on-time (e.g., dateless tasks)
            return True
        
        try:
            due_dt = datetime.fromisoformat(instance.due)
            now = datetime.now(UTC)
            
            if instance.is_all_day:
                # All-day: Compare dates only
                return now.date() <= due_dt.date()
            else:
                # Timed: Compare full datetime
                return now <= due_dt
        except (ValueError, AttributeError):
            # Can't parse due date - assume on-time
            return True
    
    def _calculate_next_due_date(self, template: Task, current_due: str | None) -> str | None:
        """Calculate next due date from template's rrule.
        
        Reuses existing logic from _calculate_next_due_date_from_template.
        """
        # (Copy existing logic from todo.py lines 931-984)
        ...
```

#### File: `custom_components/chorebot/task.py`

Add new completion metadata fields:

```python
from .const import (
    # ... existing imports ...
    FIELD_COMPLETED_ON_TIME,
    FIELD_POINTS_EARNED,
    FIELD_STREAK_AT_COMPLETION,
)

@dataclass
class Task:
    # ... existing fields ...
    
    # Completion metadata (set when status = "completed")
    completed_on_time: bool | None = None
    points_earned: int = 0
    streak_at_completion: int = 0
    
    def to_dict(self) -> dict[str, Any]:
        """Convert task to dictionary for JSON storage."""
        result = {
            # ... existing serialization ...
        }
        
        # Add completion metadata
        if self.completed_on_time is not None:
            result[FIELD_COMPLETED_ON_TIME] = self.completed_on_time
        if self.points_earned > 0:
            result[FIELD_POINTS_EARNED] = self.points_earned
        if self.streak_at_completion > 0:
            result[FIELD_STREAK_AT_COMPLETION] = self.streak_at_completion
        
        return result
    
    @classmethod
    def from_dict(cls, data: dict[str, Any], is_template: bool | None = None) -> Task:
        """Create task from dictionary (JSON storage)."""
        return cls(
            # ... existing deserialization ...
            completed_on_time=data.get(FIELD_COMPLETED_ON_TIME),
            points_earned=data.get(FIELD_POINTS_EARNED, 0),
            streak_at_completion=data.get(FIELD_STREAK_AT_COMPLETION, 0),
        )
```

#### File: `custom_components/chorebot/const.py`

Add new field constants:

```python
# Completion metadata fields
FIELD_COMPLETED_ON_TIME = "completed_on_time"
FIELD_POINTS_EARNED = "points_earned"
FIELD_STREAK_AT_COMPLETION = "streak_at_completion"
```

#### File: `custom_components/chorebot/todo.py`

Refactor completion flow to use context and audit logging:

```python
from .completion_context import CompletionContext, CompletionContextBuilder

class ChoreBotList(TodoListEntity):
    
    def __init__(self, ...):
        # ... existing init ...
        self._completion_builder = CompletionContextBuilder(store, list_id)
        self._audit_logger = hass.data[DOMAIN].get("audit_logger")
    
    async def async_update_task_internal(self, uid: str, ...):
        """Update task - refactored to use CompletionContext."""
        
        # ... existing validation and update logic ...
        
        # Check if status changed to completed
        status_changed_to_completed = (
            old_status == "needs_action" and task.status == "completed"
        )
        
        if status_changed_to_completed:
            # NEW: Use context-based completion
            person_id = self._resolve_person_id_for_task(task)
            context = await self._completion_builder.build_context(task, person_id)
            await self._process_completion(context)
        else:
            # Non-completion updates use existing logic
            task.update_modified()
            await self._store.async_update_task(self._list_id, task)
            self.async_write_ha_state()
    
    async def _process_completion(self, context: CompletionContext) -> None:
        """Execute all completion side effects using pre-validated context."""
        
        _LOGGER.info(
            "Processing completion: %s (on_time=%s, points=%d, streak=%d→%d)",
            context.instance.summary,
            context.is_on_time,
            context.total_points_earned,
            context.streak_before,
            context.streak_after,
        )
        _LOGGER.debug("Completion context: %s", context)
        
        # 1. Update instance with completion metadata
        context.instance.status = "completed"
        context.instance.last_completed = context.completion_timestamp
        context.instance.completed_on_time = context.is_on_time
        context.instance.points_earned = context.total_points_earned
        context.instance.streak_at_completion = context.streak_after
        
        # 2. Audit log: Task completed
        if self._audit_logger:
            self._audit_logger.log_task_completed(
                task_uid=context.instance.uid,
                task_summary=context.instance.summary,
                list_id=self._list_id,
                on_time=context.is_on_time,
                is_recurring=context.template is not None,
            )
        
        # 3. Award points to person
        if context.person_id and context.total_points_earned > 0:
            await self._award_points(context)
        
        # 4. Update template streak
        if context.template:
            old_streak = context.streak_before
            context.template.streak_current = context.streak_after
            context.template.streak_longest = max(
                context.template.streak_longest,
                context.streak_after,
            )
            context.template.update_modified()
            
            # Audit log: Streak updated
            if self._audit_logger:
                reason = "on_time_completion" if context.is_on_time else "late_completion_reset"
                self._audit_logger.log_streak_updated(
                    task_uid=context.template.uid,
                    task_summary=context.template.summary,
                    old_streak=old_streak,
                    new_streak=context.streak_after,
                    reason=reason,
                )
        
        # 5. Save all changes
        context.instance.update_modified()
        await self._store.async_update_task(self._list_id, context.instance)
        
        if context.template:
            await self._store.async_update_task(self._list_id, context.template)
        
        # 6. Create next instance if recurring
        if context.should_create_next:
            await self._create_next_instance(context)
        
        # 7. Write state to HA
        self.async_write_ha_state()
    
    async def _award_points(self, context: CompletionContext) -> None:
        """Award points to person using context and audit log."""
        people_store = self.hass.data[DOMAIN].get("people_store")
        if not people_store:
            return
        
        # Award base points
        if context.base_points_earned > 0:
            await people_store.async_add_points(
                context.person_id,
                context.base_points_earned,
                "task_completion",
                {
                    "task_uid": context.instance.uid,
                    "task_summary": context.instance.summary,
                    "list_id": self._list_id,
                },
            )
            
            # Audit log: Points awarded
            if self._audit_logger:
                self._audit_logger.log_points_awarded(
                    person_id=context.person_id,
                    amount=context.base_points_earned,
                    task_uid=context.instance.uid,
                    task_summary=context.instance.summary,
                    reason="task_completion",
                )
        
        # Award bonus points
        if context.bonus_points_earned > 0:
            await people_store.async_add_points(
                context.person_id,
                context.bonus_points_earned,
                "streak_bonus",
                {
                    "task_uid": context.instance.uid,
                    "task_summary": context.instance.summary,
                    "streak": context.streak_after,
                    "reason": context.bonus_awarded_reason,
                },
            )
            
            # Audit log: Bonus awarded
            if self._audit_logger:
                self._audit_logger.log_bonus_awarded(
                    person_id=context.person_id,
                    amount=context.bonus_points_earned,
                    task_uid=context.instance.uid,
                    task_summary=context.instance.summary,
                    streak=context.streak_after,
                    reason=context.bonus_awarded_reason,
                )
            
            _LOGGER.info(
                "Awarded streak bonus: %d points for %s",
                context.bonus_points_earned,
                context.bonus_awarded_reason,
            )
        
        # Trigger sensor update
        points_sensor = self.hass.data[DOMAIN].get("points_sensor")
        if points_sensor:
            points_sensor.async_write_ha_state()
    
    async def _create_next_instance(self, context: CompletionContext) -> None:
        """Create next recurring instance using context and audit log."""
        if not context.template:
            return
        
        # Check if next instance already exists
        next_occurrence_index = context.instance.occurrence_index + 1
        instances = self._store.get_instances_for_template(
            self._list_id, 
            context.template.uid
        )
        if any(inst.occurrence_index == next_occurrence_index for inst in instances):
            _LOGGER.info("Next instance already exists, skipping creation")
            return
        
        # Create new instance
        new_instance = Task.create_new(
            summary=context.template.summary,
            description=context.template.description,
            due=context.next_due_date,
            tags=context.template.tags.copy(),
            rrule=None,
            points_value=context.template.points_value,
            parent_uid=context.template.uid,
            is_template=False,
            occurrence_index=next_occurrence_index,
            is_all_day=context.template.is_all_day,
            section_id=context.template.section_id,
        )
        
        # Snapshot current streak for display
        new_instance.streak_when_created = context.streak_after
        
        await self._store.async_add_task(self._list_id, new_instance)
        
        # Audit log: Instance created
        if self._audit_logger:
            self._audit_logger.log_instance_created(
                instance_uid=new_instance.uid,
                template_uid=context.template.uid,
                task_summary=context.template.summary,
                occurrence_index=next_occurrence_index,
                due_date=context.next_due_date,
                streak_snapshot=context.streak_after,
            )
        
        _LOGGER.info(
            "Created next instance (occurrence %d) with streak snapshot %d",
            next_occurrence_index,
            context.streak_after,
        )
    
    # REMOVE: _handle_points_for_status_change (logic moved to context)
    # REMOVE: _handle_recurring_instance_completion (logic moved to context)
```

### Frontend Changes

#### File: `frontend/src/utils/types.ts`

Add new fields to Task interface:

```typescript
export interface Task {
  // ... existing fields ...
  
  // Completion metadata
  completed_on_time?: boolean;  // Was completed on/before due date
  points_earned?: number;       // Total points awarded (base + bonus)
  streak_at_completion?: number; // Streak after completion
  streak_when_created?: number; // Streak when instance created (existing)
}
```

#### File: `frontend/src/utils/points-badge-utils.ts`

Update to use completion metadata and fix prediction logic:

```typescript
export function renderPointsBadge(
  task: Task,
  templates: any[],
  shades: ColorShades,
  hass: HomeAssistant,
  showPoints: boolean,
  textColor: string
): TemplateResult {
  if (!showPoints || !task.points_value) {
    return html``;
  }

  const parts = getPointsDisplayParts(hass);

  // For COMPLETED tasks: Show actual points earned (historical data)
  if (task.status === "completed" && task.points_earned) {
    // Check if bonus was awarded
    const base = task.points_value;
    const bonus = task.points_earned - base;
    
    if (bonus > 0) {
      // Show bonus badge with golden styling
      return html`<span
        class="points-badge bonus-awarded"
        style="color: ${textColor};"
      >
        +${base} + ${bonus}
        ${parts.icon ? html`<ha-icon icon="${parts.icon}"></ha-icon>` : ""}
        ${parts.text ? parts.text : ""}
      </span>`;
    }
    
    // Regular completion (no bonus)
    return html`<span
      class="points-badge"
      style="background: #${shades.lighter}; color: ${textColor}; border: 1px solid ${textColor};"
    >
      +${task.points_earned}
      ${parts.icon ? html`<ha-icon icon="${parts.icon}"></ha-icon>` : ""}
      ${parts.text ? parts.text : ""}
    </span>`;
  }

  // For INCOMPLETE tasks: Predict bonus based on CURRENT completion time
  if (task.parent_uid && task.status === "needs_action") {
    const template = templates.find((t: any) => t.uid === task.parent_uid);
    if (template && template.streak_bonus_points && template.streak_bonus_interval) {
      // Calculate what streak WILL BE if completed NOW
      // Key insight: Must check if completion would be on-time RIGHT NOW
      
      const isOnTime = checkIfWouldBeOnTime(task);
      let predictedStreakAfter: number;
      
      if (isOnTime) {
        // On-time completion: Streak will increment
        predictedStreakAfter = template.streak_current + 1;
      } else {
        // Late completion: Streak will reset to 0
        predictedStreakAfter = 0;
      }
      
      // Check if predicted streak is a milestone
      if (
        isOnTime &&
        predictedStreakAfter > 0 &&
        predictedStreakAfter % template.streak_bonus_interval === 0
      ) {
        // Completing this NOW will award bonus!
        return html`<span
          class="points-badge bonus-pending"
          style="color: ${textColor};"
        >
          +${task.points_value} + ${template.streak_bonus_points}
          ${parts.icon ? html`<ha-icon icon="${parts.icon}"></ha-icon>` : ""}
          ${parts.text ? parts.text : ""}
        </span>`;
      }
    }
  }

  // Default: Just base points
  return html`<span
    class="points-badge"
    style="background: #${shades.lighter}; color: ${textColor}; border: 1px solid ${textColor};"
  >
    +${task.points_value}
    ${parts.icon ? html`<ha-icon icon="${parts.icon}"></ha-icon>` : ""}
    ${parts.text ? parts.text : ""}
  </span>`;
}

/**
 * Check if task would be completed on-time if completed RIGHT NOW
 */
function checkIfWouldBeOnTime(task: Task): boolean {
  if (!task.due) {
    // No due date = always on-time (dateless tasks)
    return true;
  }

  try {
    const dueDate = new Date(task.due);
    const now = new Date();

    if (task.is_all_day) {
      // All-day tasks: Compare dates only
      const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return today <= dueDay;
    } else {
      // Timed tasks: Compare full datetime
      return now <= dueDate;
    }
  } catch (e) {
    // Can't parse due date - assume on-time
    return true;
  }
}
```

#### CSS Changes

Add styling for bonus states in both card files:

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

## Key Fix: Predictive Bonus Logic

**The critical fix for the bonus bug in the frontend prediction:**

The old logic only looked at `streak_when_created` (from days ago). The new logic:

1. **Checks if completion would be on-time RIGHT NOW** via `checkIfWouldBeOnTime()`
2. **Calculates predicted streak after completion**:
   - On-time → `template.streak_current + 1`
   - Late → `0` (reset)
3. **Checks if predicted streak is a milestone**

This ensures:
- ✅ Overdue task shows NO bonus (because late completion resets streak)
- ✅ On-time task shows bonus if it will reach milestone
- ✅ Display updates dynamically as due date approaches/passes

## Testing Strategy

### Unit Tests

**Test: Context Building**
```python
async def test_on_time_completion_with_bonus():
    # Setup: Streak = 6, interval = 7
    template = create_template(streak_current=6, bonus_interval=7, bonus_points=50)
    instance = create_instance(due=today, parent_uid=template.uid, points_value=10)
    
    builder = CompletionContextBuilder(store, "test_list")
    context = await builder.build_context(instance, "person.kyle")
    
    assert context.is_on_time == True
    assert context.streak_before == 6
    assert context.streak_after == 7  # Incremented
    assert context.base_points_earned == 10
    assert context.bonus_points_earned == 50  # Milestone reached!
    assert context.total_points_earned == 60
    assert context.streak_milestone_reached == True
    assert context.bonus_awarded_reason == "7-day streak milestone"

async def test_late_completion_no_bonus():
    # Setup: Streak = 6, interval = 7, but completed late
    template = create_template(streak_current=6, bonus_interval=7, bonus_points=50)
    instance = create_instance(due=three_days_ago, parent_uid=template.uid)
    
    builder = CompletionContextBuilder(store, "test_list")
    context = await builder.build_context(instance, "person.kyle")
    
    assert context.is_on_time == False
    assert context.streak_before == 6
    assert context.streak_after == 0  # Reset!
    assert context.bonus_points_earned == 0  # No bonus for late
    assert context.streak_milestone_reached == False

async def test_dateless_always_increments():
    # Dateless recurring: always increments, never "late"
    template = create_dateless_template(streak_current=3)
    instance = create_instance(due=None, parent_uid=template.uid)
    
    builder = CompletionContextBuilder(store, "test_list")
    context = await builder.build_context(instance, "person.kyle")
    
    assert context.is_on_time == True
    assert context.streak_after == 4
```

**Test: Completion Processing**
```python
async def test_completion_awards_points_and_logs():
    context = CompletionContext(
        instance=task,
        person_id="person.kyle",
        base_points_earned=10,
        bonus_points_earned=0,
        total_points_earned=10,
        streak_after=1,
        # ... other fields ...
    )
    
    await todo_entity._process_completion(context)
    
    # Verify points awarded
    balance = await people_store.get_balance("person.kyle")
    assert balance == 10
    
    # Verify metadata captured
    saved_task = store.get_task("test_list", task.uid)
    assert saved_task.points_earned == 10
    assert saved_task.completed_on_time == True
    assert saved_task.streak_at_completion == 1
    
    # Verify audit log entries
    audit_log = read_audit_log()
    assert "TASK_COMPLETED" in audit_log
    assert "POINTS_AWARDED" in audit_log
    assert "STREAK_UPDATED" in audit_log
```

### Integration Tests

**Test: Full Completion Flow with Bonus**
```python
async def test_recurring_completion_awards_bonus_on_milestone():
    # Create recurring task with 7-day bonus
    await todo_entity.async_create_task_internal(
        summary="Daily Task",
        due=today_iso,
        rrule="FREQ=DAILY;INTERVAL=1",
        points_value=10,
        streak_bonus_points=50,
        streak_bonus_interval=7,
    )
    
    # Complete 6 instances on-time (no bonus yet)
    for i in range(6):
        instance = get_latest_instance()
        await todo_entity.async_update_task_internal(
            uid=instance.uid,
            status="completed",
        )
        assert instance.points_earned == 10  # Base only
    
    # Complete 7th instance (milestone!)
    instance_7 = get_latest_instance()
    await todo_entity.async_update_task_internal(
        uid=instance_7.uid,
        status="completed",
    )
    
    # Verify 7th completion got bonus
    assert instance_7.points_earned == 60  # 10 + 50 bonus
    assert instance_7.completed_on_time == True
    assert instance_7.streak_at_completion == 7
    
    # Verify audit log
    audit_log = read_audit_log()
    assert '"amount":50' in audit_log  # Bonus awarded
    assert '"streak":7' in audit_log
    
    # Verify 8th instance created with correct snapshot
    instance_8 = get_latest_instance()
    assert instance_8.streak_when_created == 7
```

**Test: Late Completion Resets and No Bonus**
```python
async def test_late_completion_resets_and_no_bonus():
    # Build streak to 6
    for i in range(6):
        complete_on_time()
    
    # Complete 7th instance late (would be milestone if on-time)
    instance_7 = get_latest_instance()
    # Manually set due to past
    instance_7.due = three_days_ago_iso
    
    await todo_entity.async_update_task_internal(
        uid=instance_7.uid,
        status="completed",
    )
    
    # Verify no bonus awarded
    assert instance_7.points_earned == 10  # Base only
    assert instance_7.completed_on_time == False
    assert instance_7.streak_at_completion == 0  # Reset
    
    # Verify template streak reset
    template = get_template()
    assert template.streak_current == 0
    
    # Verify next instance starts fresh
    instance_8 = get_latest_instance()
    assert instance_8.streak_when_created == 0
    
    # Verify audit log
    audit_log = read_audit_log()
    assert '"reason":"late_completion_reset"' in audit_log
    # No BONUS_AWARDED entry
    assert audit_log.count("BONUS_AWARDED") == 0  # From all tests
```

**Test: Frontend Prediction Updates**
```python
async def test_frontend_bonus_prediction_changes_when_overdue():
    # Create recurring task with bonus
    await create_recurring_task(bonus_interval=7)
    
    # Complete 6 instances
    for i in range(6):
        complete_on_time()
    
    # Get 7th instance
    instance_7 = get_latest_instance()
    
    # Initially on-time: Frontend should predict bonus
    assert instance_7.due > now()
    # (Frontend: checkIfWouldBeOnTime() returns true, shows bonus badge)
    
    # Wait until overdue
    advance_time(days=2)
    
    # Now late: Frontend should NOT predict bonus
    assert instance_7.due < now()
    # (Frontend: checkIfWouldBeOnTime() returns false, NO bonus badge)
    
    # Complete late: Verify no bonus actually awarded
    await complete_task(instance_7.uid)
    assert instance_7.points_earned == 10  # Base only
```

### Edge Cases

1. **Uncomplete behavior**: Verify disassociation logic still works
2. **Midnight reset**: Verify daily job doesn't conflict
3. **Multiple simultaneous completions**: Verify context isolation
4. **Dateless recurring**: Verify always increments, never resets
5. **Audit log rotation**: Verify file handles large logs gracefully
6. **Frontend clock sync**: Verify on-time check uses browser time correctly

## Success Criteria

- [ ] Late completions no longer receive bonuses (backend)
- [ ] Overdue incomplete tasks no longer show bonus prediction (frontend)
- [ ] Completed tasks show actual points earned (not predicted)
- [ ] Bonus awarded ON milestone completion (7th, not 8th)
- [ ] Streak indicators show historical values (not current template)
- [ ] On-time completion rate visible in task metadata
- [ ] Audit log captures all completion events
- [ ] Audit log is append-only and parseable
- [ ] Context logging enables debugging
- [ ] All existing tests pass
- [ ] New unit tests cover context building
- [ ] Integration tests cover full flow
- [ ] Frontend gracefully handles legacy data
- [ ] No performance regression (context building is fast)

## Risk Assessment

### Low Risk
- New fields are optional (backward compatible)
- Frontend has fallback logic
- Context is built before mutations (easy to validate)
- Audit log is append-only (won't interfere with operations)

### Medium Risk
- Refactoring completion flow is invasive
- Need thorough testing of all edge cases
- Frontend prediction logic relies on browser time (could drift from server)

### Mitigation
- Extensive logging of context for debugging
- Comprehensive unit and integration tests
- Manual testing of common scenarios before release
- Audit log provides trail for debugging issues
- Frontend prediction is "best effort" (historical data is source of truth)

## Estimated Effort

- **Backend Implementation**: 4-5 hours
  - CompletionContext dataclass: 30 min
  - AuditLogger implementation: 1 hour
  - Task model updates: 30 min
  - Refactor completion flow: 2 hours
  - Testing: 1 hour

- **Frontend Implementation**: 1.5-2 hours
  - Type updates: 15 min
  - Points badge refactor with on-time check: 1 hour
  - CSS updates: 15 min
  - Testing: 30 min

**Total: 5.5-7 hours**

## Future Enhancements Enabled

This refactor establishes foundation for:

1. **Rich Analytics Dashboard**
   - On-time completion rate by task
   - Bonus earnings over time
   - Streak pattern analysis
   - Parse audit log for historical trends

2. **Advanced Bonus Rules**
   - Time-of-day multipliers
   - Difficulty-based points
   - Team competitions

3. **Completion Audit Trail**
   - Full history in audit log
   - Export for external analysis
   - Debug completion issues from logs

4. **Smart Scheduling**
   - Predict optimal completion times
   - Suggest task ordering for max points
   - Warn about streak risks

## Open Questions

### 1. Bonus Semantics
**Question**: Award bonus ON milestone (7th completion) or AFTER milestone (8th completion)?

**Decision**: ON milestone (more intuitive) - Implemented via `streak_after % interval == 0` check

### 2. Context Logging
**Question**: How verbose should context logs be?

**Decision**: INFO level for completions, DEBUG for full context details

### 3. Transaction Rollback
**Question**: Should we add explicit rollback for failures?

**Answer**: Not needed in current design. Context is built completely BEFORE any mutations happen. If context building fails (e.g., can't parse due date), nothing is mutated - we just don't complete the task. If storage operations fail during `_process_completion`, Python will raise an exception and HA will handle it (likely retry or log error). Since we're not doing distributed transactions across multiple systems, explicit rollback adds complexity without clear benefit.

The only scenario where rollback would help is if we partially complete the mutations (e.g., points awarded but streak update fails). However:
- This is extremely rare (both use same store system)
- Points are transactional (already atomic in PeopleStore)
- Worst case: Manual correction via `chorebot.adjust_points` service
- Audit log provides trail to detect/fix inconsistencies

**Recommendation**: Skip rollback for now. Add if we see actual issues in practice.

---

# Plan Feedback

I've reviewed this plan and have 1 piece of feedback:

## 1. Feedback on: " // Timed tasks: Compare full datetime
      return now <= dueDate;"
> I think we'll be ok if tasks with time are treated as all day tasks for this situation. As long as they're completed on the same day, the streak should continue.

---
