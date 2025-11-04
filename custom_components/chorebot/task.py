"""Task model for ChoreBot."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from .const import (
    FIELD_DELETED_AT,
    FIELD_IS_TEMPLATE,
    FIELD_LAST_COMPLETED,
    FIELD_OCCURRENCE_INDEX,
    FIELD_PARENT_UID,
    FIELD_POINTS_VALUE,
    FIELD_RRULE,
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
    parent_uid: str | None = None  # Points to template task if this is an instance
    is_template: bool = False  # True if this is a recurring task template
    occurrence_index: int = 0  # Which occurrence this is (0-indexed)
    custom_fields: dict[str, Any] = field(default_factory=dict)  # Backend-specific metadata

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
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert task to dictionary for JSON storage."""
        # Start with standard fields
        custom_fields_output = {}
        if self.tags:
            custom_fields_output[FIELD_TAGS] = self.tags
        if self.rrule:
            custom_fields_output[FIELD_RRULE] = self.rrule
        if self.streak_current > 0:
            custom_fields_output[FIELD_STREAK_CURRENT] = self.streak_current
        if self.streak_longest > 0:
            custom_fields_output[FIELD_STREAK_LONGEST] = self.streak_longest
        if self.last_completed:
            custom_fields_output[FIELD_LAST_COMPLETED] = self.last_completed
        if self.points_value > 0:
            custom_fields_output[FIELD_POINTS_VALUE] = self.points_value
        if self.parent_uid:
            custom_fields_output[FIELD_PARENT_UID] = self.parent_uid
        if self.is_template:
            custom_fields_output[FIELD_IS_TEMPLATE] = self.is_template
        if self.occurrence_index > 0:
            custom_fields_output[FIELD_OCCURRENCE_INDEX] = self.occurrence_index

        # Merge in any extra custom fields (e.g., backend-specific metadata)
        custom_fields_output.update(self.custom_fields)

        result: dict[str, Any] = {
            "uid": self.uid,
            "summary": self.summary,
            "status": self.status,
            "created": self.created,
            "modified": self.modified,
        }

        if self.description:
            result["description"] = self.description
        if self.due:
            result["due"] = self.due
        if self.deleted_at:
            result[FIELD_DELETED_AT] = self.deleted_at
        if custom_fields_output:
            result["custom_fields"] = custom_fields_output

        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Task:
        """Create task from dictionary (JSON storage)."""
        custom_fields = data.get("custom_fields", {})

        # Known fields that map to dataclass attributes
        known_fields = {
            FIELD_TAGS,
            FIELD_RRULE,
            FIELD_STREAK_CURRENT,
            FIELD_STREAK_LONGEST,
            FIELD_LAST_COMPLETED,
            FIELD_POINTS_VALUE,
            FIELD_PARENT_UID,
            FIELD_IS_TEMPLATE,
            FIELD_OCCURRENCE_INDEX,
        }

        # Extract extra custom fields (backend-specific metadata)
        extra_custom_fields = {
            k: v for k, v in custom_fields.items() if k not in known_fields
        }

        return cls(
            uid=data["uid"],
            summary=data["summary"],
            description=data.get("description"),
            status=data["status"],
            due=data.get("due"),
            created=data["created"],
            modified=data["modified"],
            deleted_at=data.get(FIELD_DELETED_AT),
            tags=custom_fields.get(FIELD_TAGS, []),
            rrule=custom_fields.get(FIELD_RRULE),
            streak_current=custom_fields.get(FIELD_STREAK_CURRENT, 0),
            streak_longest=custom_fields.get(FIELD_STREAK_LONGEST, 0),
            last_completed=custom_fields.get(FIELD_LAST_COMPLETED),
            points_value=custom_fields.get(FIELD_POINTS_VALUE, 0),
            parent_uid=custom_fields.get(FIELD_PARENT_UID),
            is_template=custom_fields.get(FIELD_IS_TEMPLATE, False),
            occurrence_index=custom_fields.get(FIELD_OCCURRENCE_INDEX, 0),
            custom_fields=extra_custom_fields,
        )

    def is_deleted(self) -> bool:
        """Check if task is soft-deleted."""
        return self.deleted_at is not None

    def is_recurring_template(self) -> bool:
        """Check if task is a recurring task template."""
        return self.is_template and self.rrule is not None

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
