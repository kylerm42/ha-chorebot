"""Task model for ChoreBot."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from .const import (
    FIELD_DELETED_AT,
    FIELD_IS_ALL_DAY,
    FIELD_IS_DATELESS_RECURRING,
    FIELD_IS_TEMPLATE,
    FIELD_LAST_COMPLETED,
    FIELD_OCCURRENCE_INDEX,
    FIELD_PARENT_UID,
    FIELD_POINTS_VALUE,
    FIELD_RRULE,
    FIELD_SECTION_ID,
    FIELD_STREAK_BONUS_INTERVAL,
    FIELD_STREAK_BONUS_POINTS,
    FIELD_STREAK_CURRENT,
    FIELD_STREAK_LONGEST,
    FIELD_TAGS,
)


@dataclass
class Task:
    """Represents a ChoreBot task."""

    uid: str
    summary: str
    status: str  # "needs_action" or "completed"
    created: str  # ISO 8601 timestamp
    modified: str  # ISO 8601 timestamp
    description: str | None = None
    due: str | None = None  # ISO 8601 timestamp
    deleted_at: str | None = None  # ISO 8601 timestamp
    tags: list[str] = field(default_factory=list)
    rrule: str | None = None
    streak_current: int = 0
    streak_longest: int = 0
    last_completed: str | None = None  # ISO 8601 timestamp
    points_value: int = 0
    streak_bonus_points: int = 0  # Bonus points at streak milestones
    streak_bonus_interval: int = 0  # Days between bonuses (0 = disabled)
    parent_uid: str | None = None  # Points to template task if this is an instance
    is_template: bool = False  # True if this is a recurring task template
    occurrence_index: int = 0  # Which occurrence this is (0-indexed)
    is_all_day: bool = False  # True if this is an all-day task (no specific time)
    section_id: str | None = None  # Section/column this task belongs to
    is_dateless_recurring: bool = False  # True if recurring without due dates (templates only)
    custom_fields: dict[str, Any] = field(
        default_factory=dict
    )  # Backend-specific metadata
    sync: dict[str, dict[str, Any]] = field(
        default_factory=dict
    )  # Sync metadata per backend

    @classmethod
    def create_new(
        cls,
        summary: str,
        description: str | None = None,
        due: str | None = None,
        tags: list[str] | None = None,
        rrule: str | None = None,
        points_value: int = 0,
        parent_uid: str | None = None,
        is_template: bool = False,
        occurrence_index: int = 0,
        is_all_day: bool = False,
        section_id: str | None = None,
    ) -> Task:
        """Create a new task with generated UID and timestamps."""
        now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        return cls(
            uid=str(uuid4()),
            summary=summary,
            description=description,
            status="needs_action",
            created=now,
            modified=now,
            due=due,
            tags=tags or [],
            rrule=rrule,
            points_value=points_value,
            parent_uid=parent_uid,
            is_template=is_template,
            occurrence_index=occurrence_index,
            is_all_day=is_all_day,
            section_id=section_id,
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert task to dictionary for JSON storage."""
        result: dict[str, Any] = {
            "uid": self.uid,
            "summary": self.summary,
            "status": self.status,
            "created": self.created,
            "modified": self.modified,
        }

        # Add optional standard fields
        if self.description:
            result["description"] = self.description
        if self.due:
            result["due"] = self.due
        if self.deleted_at:
            result[FIELD_DELETED_AT] = self.deleted_at

        # Add ChoreBot fields at root level
        if self.tags:
            result[FIELD_TAGS] = self.tags
        if self.rrule:
            result[FIELD_RRULE] = self.rrule
        if self.streak_current > 0:
            result[FIELD_STREAK_CURRENT] = self.streak_current
        if self.streak_longest > 0:
            result[FIELD_STREAK_LONGEST] = self.streak_longest
        if self.last_completed:
            result[FIELD_LAST_COMPLETED] = self.last_completed
        if self.points_value > 0:
            result[FIELD_POINTS_VALUE] = self.points_value
        if self.streak_bonus_points > 0:
            result[FIELD_STREAK_BONUS_POINTS] = self.streak_bonus_points
        if self.streak_bonus_interval > 0:
            result[FIELD_STREAK_BONUS_INTERVAL] = self.streak_bonus_interval
        if self.parent_uid:
            result[FIELD_PARENT_UID] = self.parent_uid
            # Always store occurrence_index for instances (even if 0)
            result[FIELD_OCCURRENCE_INDEX] = self.occurrence_index
        if self.is_all_day:
            result[FIELD_IS_ALL_DAY] = self.is_all_day
        # ALWAYS include section_id (even if None) to ensure TickTick's state is persisted
        # If section_id is None, we need to write it to clear old values
        result[FIELD_SECTION_ID] = self.section_id
        if self.is_template:
            result[FIELD_IS_TEMPLATE] = self.is_template
        if self.is_dateless_recurring:
            result[FIELD_IS_DATELESS_RECURRING] = self.is_dateless_recurring

        # Add sync metadata (backend-specific)
        if self.sync:
            result["sync"] = self.sync

        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any], is_template: bool | None = None) -> Task:
        """Create task from dictionary (JSON storage).

        Args:
            data: Task data dictionary
            is_template: Override to set template status (inferred from storage location).
        """
        template_value = (
            is_template if is_template is not None else data.get(FIELD_IS_TEMPLATE, False)
        )

        return cls(
            uid=data["uid"],
            summary=data["summary"],
            description=data.get("description"),
            status=data["status"],
            due=data.get("due"),
            created=data["created"],
            modified=data["modified"],
            deleted_at=data.get(FIELD_DELETED_AT),
            tags=data.get(FIELD_TAGS, []),
            rrule=data.get(FIELD_RRULE),
            streak_current=data.get(FIELD_STREAK_CURRENT, 0),
            streak_longest=data.get(FIELD_STREAK_LONGEST, 0),
            last_completed=data.get(FIELD_LAST_COMPLETED),
            points_value=data.get(FIELD_POINTS_VALUE, 0),
            streak_bonus_points=data.get(FIELD_STREAK_BONUS_POINTS, 0),
            streak_bonus_interval=data.get(FIELD_STREAK_BONUS_INTERVAL, 0),
            parent_uid=data.get(FIELD_PARENT_UID),
            is_template=template_value,
            occurrence_index=data.get(FIELD_OCCURRENCE_INDEX, 0),
            is_all_day=data.get(FIELD_IS_ALL_DAY, False),
            section_id=data.get(FIELD_SECTION_ID),
            is_dateless_recurring=data.get(FIELD_IS_DATELESS_RECURRING, False),
            custom_fields={},  # No longer used for ChoreBot fields
            sync=data.get("sync", {}),
        )

    def is_deleted(self) -> bool:
        """Check if task is soft-deleted."""
        return self.deleted_at is not None

    def is_recurring_template(self) -> bool:
        """Check if task is a recurring task template (date-based or dateless)."""
        return self.is_template and (self.rrule is not None or self.is_dateless_recurring)

    def is_dateless_recurring_template(self) -> bool:
        """Check if task is a dateless recurring template."""
        return self.is_template and self.is_dateless_recurring

    def is_recurring_instance(self) -> bool:
        """Check if task is an instance of a recurring task."""
        return self.parent_uid is not None

    def is_recurring(self) -> bool:
        """Check if task is a recurring task (template or instance)."""
        return self.is_recurring_template() or self.is_recurring_instance()

    def is_overdue(self) -> bool:
        """Check if task is overdue (past due date and not completed)."""
        if not self.due or self.status == "completed":
            return False
        try:
            due_dt = datetime.fromisoformat(self.due)
            return datetime.now(due_dt.tzinfo) > due_dt
        except (ValueError, AttributeError):
            return False

    def mark_deleted(self) -> None:
        """Soft delete this task."""
        self.deleted_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        self.modified = self.deleted_at

    def update_modified(self) -> None:
        """Update the modified timestamp to now."""
        self.modified = datetime.now(UTC).isoformat().replace("+00:00", "Z")

    def get_sync_id(self, backend: str) -> str | None:
        """Get the remote ID for a specific backend.

        Args:
            backend: The backend name (e.g., "ticktick")

        Returns:
            The remote ID or None if not synced
        """
        return self.sync.get(backend, {}).get("id")

    def set_sync_id(self, backend: str, remote_id: str) -> None:
        """Set the remote ID for a specific backend.

        Args:
            backend: The backend name (e.g., "ticktick")
            remote_id: The remote task ID
        """
        if backend not in self.sync:
            self.sync[backend] = {}
        self.sync[backend]["id"] = remote_id
