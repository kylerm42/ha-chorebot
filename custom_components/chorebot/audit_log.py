"""Audit logging for ChoreBot task completion events."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

_LOGGER = logging.getLogger(__name__)


class AuditLogger:
    """Append-only audit log for task completion events."""

    def __init__(self, log_path: str | Path) -> None:
        """Initialize audit logger.

        Args:
            log_path: Path to audit log file (.storage/chorebot_audit.log)
        """
        self._log_path = Path(log_path)
        _LOGGER.info("Initialized audit logger at: %s", self._log_path)

    def _write_event(self, event_type: str, data: dict[str, Any]) -> None:
        """Write an event to the audit log.

        Format: ISO_TIMESTAMP|EVENT_TYPE|JSON_DATA

        Args:
            event_type: Event type identifier (e.g., "TASK_COMPLETED")
            data: Event data to serialize as JSON
        """
        try:
            timestamp = datetime.now(UTC).isoformat()
            json_data = json.dumps(data, separators=(",", ":"))
            log_line = f"{timestamp}|{event_type}|{json_data}\n"

            # Append to log file (create if doesn't exist)
            with open(self._log_path, "a", encoding="utf-8") as f:
                f.write(log_line)

            _LOGGER.debug("Audit log: %s - %s", event_type, json_data)
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
        """Log task completion event.

        Args:
            task_uid: Task UID
            task_summary: Task summary/title
            list_id: List ID
            on_time: Whether completed on or before due date
            is_recurring: Whether this is a recurring task instance
        """
        self._write_event(
            "TASK_COMPLETED",
            {
                "task_uid": task_uid,
                "task_summary": task_summary,
                "list_id": list_id,
                "on_time": on_time,
                "is_recurring": is_recurring,
            },
        )

    def log_points_awarded(
        self,
        person_id: str,
        amount: int,
        task_uid: str,
        task_summary: str,
        reason: str,
    ) -> None:
        """Log points awarded to person.

        Args:
            person_id: Person entity ID (e.g., "person.kyle")
            amount: Points amount (positive integer)
            task_uid: Task UID
            task_summary: Task summary/title
            reason: Reason for points (e.g., "task_completion")
        """
        self._write_event(
            "POINTS_AWARDED",
            {
                "person_id": person_id,
                "amount": amount,
                "task_uid": task_uid,
                "task_summary": task_summary,
                "reason": reason,
            },
        )

    def log_bonus_awarded(
        self,
        person_id: str,
        amount: int,
        task_uid: str,
        task_summary: str,
        streak: int,
        reason: str,
    ) -> None:
        """Log streak bonus awarded to person.

        Args:
            person_id: Person entity ID (e.g., "person.kyle")
            amount: Bonus points amount
            task_uid: Task UID
            task_summary: Task summary/title
            streak: Streak value at bonus award
            reason: Bonus reason (e.g., "7-day streak milestone")
        """
        self._write_event(
            "BONUS_AWARDED",
            {
                "person_id": person_id,
                "amount": amount,
                "task_uid": task_uid,
                "task_summary": task_summary,
                "streak": streak,
                "reason": reason,
            },
        )

    def log_streak_updated(
        self,
        task_uid: str,
        task_summary: str,
        old_streak: int,
        new_streak: int,
        reason: str,
    ) -> None:
        """Log template streak update.

        Args:
            task_uid: Template UID
            task_summary: Template summary/title
            old_streak: Streak value before update
            new_streak: Streak value after update
            reason: Reason for update (e.g., "on_time_completion", "late_completion")
        """
        self._write_event(
            "STREAK_UPDATED",
            {
                "task_uid": task_uid,
                "task_summary": task_summary,
                "old_streak": old_streak,
                "new_streak": new_streak,
                "reason": reason,
            },
        )

    def log_instance_created(
        self,
        instance_uid: str,
        template_uid: str,
        task_summary: str,
        occurrence_index: int,
        due_date: str | None,
        streak_snapshot: int,
    ) -> None:
        """Log new recurring instance creation.

        Args:
            instance_uid: New instance UID
            template_uid: Parent template UID
            task_summary: Task summary/title
            occurrence_index: Occurrence index
            due_date: Due date (ISO 8601 or None for dateless)
            streak_snapshot: Template's streak_current at creation time
        """
        self._write_event(
            "INSTANCE_CREATED",
            {
                "instance_uid": instance_uid,
                "template_uid": template_uid,
                "task_summary": task_summary,
                "occurrence_index": occurrence_index,
                "due_date": due_date,
                "streak_snapshot": streak_snapshot,
            },
        )
