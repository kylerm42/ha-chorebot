"""Completion context for task completion orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import logging

from .store import ChoreBotStore
from .task import Task

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
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
    streak_after: int  # Template's streak after completion (increment or reset)
    streak_milestone_reached: bool  # Did this completion reach a milestone?

    # Next instance info (for recurring)
    should_create_next: bool
    next_due_date: str | None


class CompletionContextBuilder:
    """Builds immutable CompletionContext objects for task completions."""

    def __init__(self, store: ChoreBotStore, list_id: str) -> None:
        """Initialize builder.

        Args:
            store: ChoreBot storage instance
            list_id: List ID for task queries
        """
        self._store = store
        self._list_id = list_id

    async def build_context(
        self, instance: Task, person_id: str | None
    ) -> CompletionContext:
        """Build complete completion plan before any mutations.

        Args:
            instance: Task instance being completed
            person_id: Person entity ID (resolved from section/list)

        Returns:
            Immutable CompletionContext with all decisions pre-calculated
        """
        # 1. Get template if recurring
        template = None
        if instance.parent_uid:
            template = self._store.get_template(self._list_id, instance.parent_uid)
            if not template:
                _LOGGER.error(
                    "Template not found for instance %s (parent_uid: %s)",
                    instance.uid,
                    instance.parent_uid,
                )

        # 2. Check on-time (DATE-ONLY comparison for ALL tasks)
        is_on_time = self._check_completion_timeliness(instance)

        # 3. Determine if valid for streak (dateless recurring OR on-time)
        is_valid_for_streak = False
        if template:
            is_valid_for_streak = template.is_dateless_recurring or is_on_time

        # 4. Calculate streak outcome
        streak_before = template.streak_current if template else 0
        if template:
            if is_valid_for_streak:
                streak_after = template.streak_current + 1
            else:
                streak_after = 0  # Late = reset
        else:
            streak_after = 0

        # 5. Calculate points
        base_points = instance.points_value
        bonus_points = 0
        bonus_reason = None
        streak_milestone_reached = False

        # Check for streak bonus (ON milestone, not after)
        if (
            template
            and is_valid_for_streak
            and template.streak_bonus_points > 0
            and template.streak_bonus_interval > 0
        ):
            # Bonus awarded ON milestone (check streak_after, not streak_current)
            if streak_after % template.streak_bonus_interval == 0:
                bonus_points = template.streak_bonus_points
                bonus_reason = f"{streak_after}-day streak milestone"
                streak_milestone_reached = True

        total_points = base_points + bonus_points

        # 6. Determine if should create next instance
        should_create_next = False
        next_due_date = None
        if template:
            # Check if next instance already exists
            next_occurrence_index = instance.occurrence_index + 1
            instances = self._store.get_instances_for_template(
                self._list_id, template.uid
            )
            next_instance_exists = any(
                inst.occurrence_index == next_occurrence_index for inst in instances
            )

            if not next_instance_exists:
                should_create_next = True
                next_due_date = self._calculate_next_due_date(instance, template)

        # 7. Return immutable context
        completion_timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")

        return CompletionContext(
            instance=instance,
            template=template,
            person_id=person_id,
            is_on_time=is_on_time,
            is_valid_for_streak=is_valid_for_streak,
            completion_timestamp=completion_timestamp,
            base_points_earned=base_points,
            bonus_points_earned=bonus_points,
            total_points_earned=total_points,
            bonus_awarded_reason=bonus_reason,
            streak_before=streak_before,
            streak_after=streak_after,
            streak_milestone_reached=streak_milestone_reached,
            should_create_next=should_create_next,
            next_due_date=next_due_date,
        )

    def _check_completion_timeliness(self, instance: Task) -> bool:
        """Check if completed on same calendar day as due date.

        USER NOTE: Treat ALL timed tasks as all-day for streak purposes.
        Use date-only comparison regardless of is_all_day flag.

        Args:
            instance: Task instance being checked

        Returns:
            True if completed on or before due date (date-only comparison)
        """
        if not instance.due:
            return True  # No due date = always on-time

        try:
            due_dt = datetime.fromisoformat(instance.due.replace("Z", "+00:00"))
            now = datetime.now(UTC)

            # Always compare dates only (user requirement)
            return now.date() <= due_dt.date()
        except (ValueError, AttributeError) as e:
            _LOGGER.error("Failed to parse due date %s: %s", instance.due, e)
            return True  # Benefit of doubt

    def _calculate_next_due_date(
        self, instance: Task, template: Task
    ) -> str | None:
        """Calculate next due date for recurring instance.

        Args:
            instance: Current instance being completed
            template: Parent template

        Returns:
            ISO 8601 due date string or None for dateless
        """
        # Dateless recurring: No due date
        if template.is_dateless_recurring:
            return None

        # Date-based recurring: Calculate from rrule
        if not template.rrule or not instance.due:
            return None

        try:
            from dateutil.rrule import rrulestr

            due_dt = datetime.fromisoformat(instance.due.replace("Z", "+00:00"))
            rrule = rrulestr(template.rrule, dtstart=due_dt)

            # Get next occurrence after current due date
            next_occurrence = rrule.after(due_dt)
            if next_occurrence:
                # DEFENSIVE: Normalize all-day dates to midnight UTC
                # Ensures consistency even if rrule calculation produces non-midnight times
                if template.is_all_day:
                    next_occurrence = next_occurrence.replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                return next_occurrence.isoformat().replace("+00:00", "Z")

            _LOGGER.warning(
                "No next occurrence found for rrule: %s", template.rrule
            )
            return None
        except Exception as e:
            _LOGGER.error("Failed to calculate next due date: %s", e)
            return None
