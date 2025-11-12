"""TickTick backend implementation for ChoreBot sync."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
import json
import logging
import re
from typing import Any
from zoneinfo import ZoneInfo

from homeassistant.core import HomeAssistant

from .oauth_api import AsyncConfigEntryAuth
from .store import ChoreBotStore
from .sync_backend import SyncBackend
from .task import Task
from .ticktick_api_client import TickTickAPIClient

_LOGGER = logging.getLogger(__name__)

# Metadata format: [chorebot:key1=value1;key2=value2]
METADATA_PATTERN = r"\[chorebot:(.*?)\]"


class TickTickBackend(SyncBackend):
    """TickTick synchronization backend."""

    def __init__(
        self,
        hass: HomeAssistant,
        store: ChoreBotStore,
        auth: AsyncConfigEntryAuth,
        config: dict[str, Any],
    ) -> None:
        """Initialize the TickTick backend."""
        self.hass = hass
        self.store = store
        self._auth = auth
        self.config = config
        self._client: TickTickAPIClient | None = None
        _LOGGER.info(
            "TickTick backend initialized (list mappings now stored in storage)"
        )

    async def async_initialize(self) -> bool:
        """Initialize the TickTick client."""
        try:
            access_token = await self._auth.async_get_access_token()
            self._client = TickTickAPIClient(access_token, self._auth.websession)
            _LOGGER.info("TickTick backend initialized successfully")
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to initialize TickTick backend: %s", err)
            return False
        else:
            return True

    def get_list_mappings(self) -> dict[str, str]:
        """Get current list mappings from storage."""
        mappings = {}
        for list_config in self.store.get_all_lists():
            list_id = list_config["id"]
            sync_info = self.store.get_list_sync_info(list_id, "ticktick")
            if sync_info and "project_id" in sync_info:
                mappings[list_id] = sync_info["project_id"]
        return mappings

    async def async_get_remote_lists(self) -> list[dict[str, Any]]:
        """Get all available projects from TickTick."""
        if not self._client:
            return []

        try:
            projects = await self._client.get_projects()
            return [
                {"id": project["id"], "name": project["name"]} for project in projects
            ]
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to get TickTick projects: %s", err)
            return []

    async def async_create_list(self, list_id: str, name: str) -> str | None:
        """Create a new TickTick project and store mapping in storage."""
        if not self._client:
            return None

        try:
            project = await self._client.create_project(name)
            project_id = project["id"]

            # Store mapping in storage
            sync_info = {
                "project_id": project_id,
                "status": "synced",
                "last_synced_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            }
            await self.store.async_set_list_sync_info(list_id, "ticktick", sync_info)
            _LOGGER.info(
                "Created TickTick project %s with ID %s and saved to storage",
                name,
                project_id,
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to create TickTick project: %s", err)
            return None
        else:
            return project_id

    def _encode_metadata(self, task: Task) -> str:
        """Encode ChoreBot metadata into TickTick content field."""
        user_description = task.description or ""
        metadata_parts = []

        if task.is_template:
            # Only encode metadata for templates
            if task.streak_current is not None:
                metadata_parts.append(f"streak_current={task.streak_current}")
            if task.streak_longest is not None:
                metadata_parts.append(f"streak_longest={task.streak_longest}")
            if task.occurrence_index is not None:
                metadata_parts.append(f"occurrence_index={task.occurrence_index}")

        if not metadata_parts:
            return user_description

        metadata_str = ";".join(metadata_parts)
        delimiter = "\n---\n" if user_description else ""
        return f"{user_description}{delimiter}[chorebot:{metadata_str}]"

    def _decode_metadata(self, content: str) -> tuple[str, dict[str, Any]]:
        """Decode ChoreBot metadata from TickTick content field.

        Returns: (user_description, metadata_dict)
        """
        if not content:
            return "", {}

        match = re.search(METADATA_PATTERN, content)
        if not match:
            return content, {}

        # Extract metadata
        metadata = {}
        pairs = match.group(1).split(";")
        for pair in pairs:
            if "=" not in pair:
                continue
            key, value = pair.split("=", 1)
            # Try to parse as int, fall back to string
            try:
                metadata[key] = int(value)
            except ValueError:
                metadata[key] = value

        # Extract user description (everything before the delimiter)
        user_description = content[: match.start()].rstrip("\n-")

        return user_description, metadata

    def _format_ticktick_date(self, iso_date: str) -> tuple[str, str]:
        """Convert ISO 8601 date to TickTick format with system timezone.

        TickTick expects dates in format: yyyy-MM-dd'T'HH:mm:ss+0000
        This method converts dates to the system timezone.

        Args:
            iso_date: Date string in ISO 8601 format (may be naive or aware)

        Returns:
            Tuple of (formatted_date_string, timezone_name)
        """
        # Get the system timezone from Home Assistant
        system_tz_name = self.hass.config.time_zone
        system_tz = ZoneInfo(system_tz_name)

        # Parse the date string
        # Try parsing with various formats
        dt = None
        for fmt in [
            "%Y-%m-%dT%H:%M:%S%z",  # With timezone
            "%Y-%m-%dT%H:%M:%SZ",  # UTC with Z
            "%Y-%m-%dT%H:%M:%S",  # Naive
        ]:
            try:
                dt = datetime.strptime(iso_date.replace("Z", "+0000"), fmt)
                break
            except ValueError:
                continue

        if dt is None:
            # Fallback: assume it's a naive datetime in system timezone
            dt = datetime.fromisoformat(iso_date)

        # If datetime is naive, assume it's in system timezone
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=system_tz)
        else:
            # Convert to system timezone
            dt = dt.astimezone(system_tz)

        # Format for TickTick: yyyy-MM-dd'T'HH:mm:ss+0000
        # Get the UTC offset in the format +0000 or -0500
        offset = dt.strftime("%z")  # Returns like +0000 or -0500
        formatted = dt.strftime(f"%Y-%m-%dT%H:%M:%S{offset}")

        return formatted, system_tz_name

    def _normalize_ticktick_date(self, ticktick_date: str) -> str:
        """Convert TickTick date format to internal ISO Z format (UTC).

        TickTick dates come in format: YYYY-MM-DDTHH:MM:SS±HHMM
        Internal format: YYYY-MM-DDTHH:MM:SSZ (UTC)

        Args:
            ticktick_date: Date string from TickTick API

        Returns:
            Date string in ISO Z format (UTC)
        """
        # Parse TickTick date (with timezone)
        dt = datetime.fromisoformat(ticktick_date)

        # Convert to UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        else:
            dt = dt.astimezone(UTC)

        # Return in ISO Z format
        return dt.isoformat().replace("+00:00", "Z")

    def _task_to_ticktick(
        self, task: Task, list_id: str, project_id: str
    ) -> dict[str, Any]:
        """Convert ChoreBot Task to TickTick API format."""
        ticktick_task: dict[str, Any] = {
            "title": task.summary,
            "projectId": project_id,
        }

        # Add content (description + metadata for templates)
        content = self._encode_metadata(task)
        if content:
            ticktick_task["content"] = content

        # Add tags
        if task.tags:
            ticktick_task["tags"] = task.tags

        # Add due date (for instances or regular tasks)
        if task.due and not task.is_template:
            formatted_date, timezone_name = self._format_ticktick_date(task.due)
            ticktick_task["dueDate"] = formatted_date
            ticktick_task["timeZone"] = timezone_name
            ticktick_task["isAllDay"] = task.is_all_day  # Use task's is_all_day flag
            _LOGGER.debug(
                "Adding dueDate %s with timeZone %s (isAllDay=%s) to task %s",
                formatted_date,
                timezone_name,
                task.is_all_day,
                task.summary,
            )

        # Add recurrence rule for templates
        if task.is_template and task.rrule:
            # TickTick expects RRULE: prefix
            rrule_with_prefix = (
                task.rrule if task.rrule.startswith("RRULE:") else f"RRULE:{task.rrule}"
            )
            ticktick_task["repeatFlag"] = rrule_with_prefix

            # For templates, include the due date from the active instance
            # This tells TickTick when the next occurrence is due
            instances = self.store.get_instances_for_template(list_id, task.uid)
            if instances:
                # Get the latest incomplete instance
                incomplete_instances = [
                    i
                    for i in instances
                    if i.status != "completed" and not i.is_deleted()
                ]
                if incomplete_instances:
                    # Sort by occurrence_index to get the current one
                    incomplete_instances.sort(key=lambda i: i.occurrence_index)
                    current_instance = incomplete_instances[0]
                    if current_instance.due:
                        formatted_date, timezone_name = self._format_ticktick_date(
                            current_instance.due
                        )
                        ticktick_task["dueDate"] = formatted_date
                        ticktick_task["timeZone"] = timezone_name
                        ticktick_task["isAllDay"] = (
                            task.is_all_day
                        )  # Use template's is_all_day flag
                        _LOGGER.debug(
                            "Adding due date %s from instance to template %s with timeZone %s (isAllDay=%s)",
                            current_instance.due,
                            task.summary,
                            timezone_name,
                            task.is_all_day,
                        )

        # Add status (0 = incomplete, 2 = completed)
        ticktick_task["status"] = 2 if task.status == "completed" else 0

        # Add TickTick ID if exists
        ticktick_id = task.get_sync_id("ticktick")
        if ticktick_id:
            ticktick_task["id"] = ticktick_id

        return ticktick_task

    async def async_push_task(self, list_id: str, task: Task) -> bool:
        """Push a local task to TickTick."""
        if not self._client:
            return False

        # Check if this list is mapped (read from storage)
        sync_info = self.store.get_list_sync_info(list_id, "ticktick")
        if not sync_info or "project_id" not in sync_info:
            _LOGGER.warning(
                "List %s is not mapped to a TickTick project. Current mappings: %s",
                list_id,
                self.get_list_mappings(),
            )
            return False

        project_id = sync_info["project_id"]

        # Skip recurring instances (only sync templates + their current due date)
        if task.is_recurring_instance():
            _LOGGER.debug("Skipping sync for recurring instance")
            return True

        # Mark as pending push
        if "ticktick" not in task.sync:
            task.sync["ticktick"] = {}
        task.sync["ticktick"]["status"] = "pending_push"
        await self.store.async_update_task(list_id, task)

        try:
            # Convert to TickTick format
            ticktick_task = self._task_to_ticktick(task, list_id, project_id)

            # Check if task already exists on TickTick
            ticktick_id = task.get_sync_id("ticktick")

            if ticktick_id:
                # Update existing task
                _LOGGER.debug("Updating TickTick task: %s", task.summary)
                response = await self._client.update_task(ticktick_id, ticktick_task)
            else:
                # Create new task
                _LOGGER.debug("Creating new TickTick task: %s", task.summary)
                response = await self._client.create_task(ticktick_task)

                # Store the TickTick ID in sync metadata
                task.set_sync_id("ticktick", response["id"])

            # Mark as successfully synced with etag (preserve ID)
            task.sync["ticktick"]["status"] = "synced"
            task.sync["ticktick"]["etag"] = response.get("etag")
            task.sync["ticktick"]["last_synced_at"] = (
                datetime.now(UTC).isoformat().replace("+00:00", "Z")
            )

            # Track last_synced_occurrence_index for recurring templates
            if task.is_recurring_template():
                # Find the current active instance
                instances = self.store.get_instances_for_template(list_id, task.uid)
                if instances:
                    incomplete_instances = [
                        i
                        for i in instances
                        if i.status != "completed" and not i.is_deleted()
                    ]
                    if incomplete_instances:
                        # Sort by occurrence_index to get the current one
                        incomplete_instances.sort(key=lambda i: i.occurrence_index)
                        current_instance = incomplete_instances[0]
                        task.sync["ticktick"]["last_synced_occurrence_index"] = (
                            current_instance.occurrence_index
                        )
                        _LOGGER.debug(
                            "Stored last_synced_occurrence_index=%d for template %s",
                            current_instance.occurrence_index,
                            task.summary,
                        )

            await self.store.async_update_task(list_id, task)
            _LOGGER.debug("Successfully pushed task '%s' to TickTick", task.summary)

        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to push task '%s' to TickTick: %s", task.summary, err)
            # Mark as failed
            task.sync["ticktick"]["status"] = "push_failed"
            await self.store.async_update_task(list_id, task)
            return False
        else:
            return True

    async def async_delete_task(self, list_id: str, task: Task) -> bool:
        """Delete a task from TickTick."""
        if not self._client:
            return False

        ticktick_id = task.get_sync_id("ticktick")
        if not ticktick_id:
            # Task was never synced
            return True

        # Get project_id from storage
        sync_info = self.store.get_list_sync_info(list_id, "ticktick")
        if not sync_info or "project_id" not in sync_info:
            return False

        project_id = sync_info["project_id"]

        try:
            _LOGGER.debug("Deleting TickTick task: %s", task.summary)
            await self._client.delete_task(project_id, ticktick_id)
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to delete TickTick task: %s", err)
            return False
        else:
            return True

    async def async_complete_task(self, list_id: str, task: Task) -> bool:
        """Mark a task as completed on TickTick."""
        if not self._client:
            return False

        ticktick_id = task.get_sync_id("ticktick")
        if not ticktick_id:
            # Task was never synced
            return True

        # Get project_id from storage
        sync_info = self.store.get_list_sync_info(list_id, "ticktick")
        if not sync_info or "project_id" not in sync_info:
            return False

        project_id = sync_info["project_id"]

        try:
            _LOGGER.debug("Completing TickTick task: %s", task.summary)
            await self._client.complete_task(project_id, ticktick_id)

            # For recurring tasks, update the due date to the next instance
            if task.is_template and task.rrule:
                # Get the current active instance
                instances = self.store.get_instances_for_template(list_id, task.uid)
                if instances:
                    instances.sort(key=lambda t: t.occurrence_index, reverse=True)
                    latest_instance = instances[0]

                    # Update TickTick task with new due date (if instance has one)
                    if latest_instance.due:
                        formatted_date, timezone_name = self._format_ticktick_date(
                            latest_instance.due
                        )
                        update_data = {
                            "id": ticktick_id,
                            "dueDate": formatted_date,
                            "timeZone": timezone_name,
                            "isAllDay": task.is_all_day,  # Use template's is_all_day flag
                        }
                        await self._client.update_task(ticktick_id, update_data)
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to complete TickTick task: %s", err)
            return False
        else:
            return True

    async def async_pull_changes(self, list_id: str | None = None) -> dict[str, int]:
        """Pull changes from TickTick."""
        if not self._client:
            return {"created": 0, "updated": 0, "deleted": 0}

        stats = {"created": 0, "updated": 0, "deleted": 0}

        try:
            # Get lists to sync (read from storage)
            list_mappings = self.get_list_mappings()
            lists_to_sync = []
            if list_id:
                if list_id in list_mappings:
                    lists_to_sync.append(list_id)
            else:
                lists_to_sync = list(list_mappings.keys())

            # First, retry any failed pushes
            for local_list_id in lists_to_sync:
                local_tasks = self.store.get_tasks_for_list(local_list_id)
                failed_tasks = [
                    t
                    for t in local_tasks
                    if t.sync.get("ticktick", {}).get("status") == "push_failed"
                ]

                if failed_tasks:
                    _LOGGER.info(
                        "Retrying %d failed push(es) for list %s",
                        len(failed_tasks),
                        local_list_id,
                    )
                    for task in failed_tasks:
                        _LOGGER.debug("Retrying failed push: %s", task.summary)
                        await self.async_push_task(local_list_id, task)

            # Sync each mapped list
            for local_list_id in lists_to_sync:
                project_id = list_mappings[local_list_id]

                # Get TickTick tasks for this project
                project_data = await self._client.get_project_with_tasks(project_id)

                # Debug: Log full project structure including columns (sections)
                _LOGGER.info(
                    "TickTick Project Data for list '%s' (project_id: %s):\n%s",
                    local_list_id,
                    project_id,
                    json.dumps(project_data, indent=2, default=str)
                )

                # Extract and log columns (sections) if available
                columns = project_data.get("columns", [])
                if columns:
                    column_map = {col.get("id"): col.get("name") for col in columns}
                    _LOGGER.info(
                        "Project columns/sections mapping (columnId -> name):\n%s",
                        json.dumps(column_map, indent=2, default=str)
                    )
                else:
                    _LOGGER.info("No columns/sections found in project data")
                    column_map = {}

                ticktick_tasks = project_data.get("tasks", [])

                # Get local templates and regular tasks (not instances)
                local_templates = self.store.get_templates_for_list(local_list_id)
                local_tasks = self.store.get_tasks_for_list(local_list_id)
                local_regular_tasks = [
                    t for t in local_tasks if not t.is_recurring_instance()
                ]

                # Build mapping of ticktick_id -> local task (templates + regular tasks)
                ticktick_id_map = {}
                for task in local_templates + local_regular_tasks:
                    ticktick_id = task.get_sync_id("ticktick")
                    if ticktick_id:
                        ticktick_id_map[ticktick_id] = task

                # Process TickTick tasks
                for tt_task in ticktick_tasks:
                    tt_id = tt_task["id"]

                    if tt_id in ticktick_id_map:
                        # Task exists - check for updates
                        local_task = ticktick_id_map[tt_id]

                        # Check sync status
                        tt_sync = local_task.sync.get("ticktick", {})
                        sync_status = tt_sync.get("status", "synced")

                        # Skip if local has pending or failed changes
                        if sync_status in ["pending_push", "push_failed"]:
                            _LOGGER.debug(
                                "Skipping task '%s' - local has %s status",
                                tt_task.get("title"),
                                sync_status,
                            )
                            del ticktick_id_map[tt_id]
                            continue

                        # Compare etags to detect remote changes
                        remote_etag = tt_task.get("etag")
                        last_etag = tt_sync.get("etag")

                        if remote_etag and remote_etag != last_etag:
                            # Remote changed - update local
                            column_id = tt_task.get("columnId")
                            column_name = column_map.get(column_id, "Unknown") if column_map else "No column"
                            _LOGGER.info(
                                "UPDATED task from TickTick: '%s' (etag changed) - columnId: %s -> '%s'\nFull object:\n%s",
                                tt_task["title"],
                                column_id,
                                column_name,
                                json.dumps(tt_task, indent=2, default=str)
                            )
                            await self._update_local_from_ticktick(
                                local_list_id, local_task, tt_task
                            )
                            # Update sync metadata (preserve existing fields like id, last_synced_occurrence_index)
                            local_task.sync["ticktick"].update(
                                {
                                    "status": "synced",
                                    "etag": remote_etag,
                                    "last_synced_at": datetime.now(UTC)
                                    .isoformat()
                                    .replace("+00:00", "Z"),
                                }
                            )
                            await self.store.async_update_task(
                                local_list_id, local_task
                            )
                            stats["updated"] += 1

                        # Remove from map (processed)
                        del ticktick_id_map[tt_id]

                    else:
                        # New task from TickTick - import if recent
                        if tt_task.get("status") == 2:  # Completed
                            completed_time = tt_task.get("completedTime", 0)
                            if completed_time:
                                completed_dt = datetime.fromtimestamp(
                                    completed_time / 1000, tz=UTC
                                )
                                if datetime.now(UTC) - completed_dt > timedelta(
                                    days=30
                                ):
                                    _LOGGER.debug(
                                        "Skipping old completed task: %s",
                                        tt_task["title"],
                                    )
                                    continue

                        column_id = tt_task.get("columnId")
                        column_name = column_map.get(column_id, "Unknown") if column_map else "No column"
                        _LOGGER.info(
                            "NEW TASK from TickTick: '%s' - columnId: %s -> column/section: '%s'\nFull raw object:\n%s",
                            tt_task["title"],
                            column_id,
                            column_name,
                            json.dumps(tt_task, indent=2, default=str)
                        )
                        await self._import_ticktick_task(local_list_id, tt_task)
                        stats["created"] += 1

                # Check for deleted tasks
                for local_task in ticktick_id_map.values():
                    if not local_task.is_deleted():
                        _LOGGER.info(
                            "DELETED task on TickTick: '%s' (uid: %s) - soft-deleting locally",
                            local_task.summary,
                            local_task.uid,
                        )
                        local_task.mark_deleted()
                        await self.store.async_update_task(local_list_id, local_task)
                        stats["deleted"] += 1

            _LOGGER.info("Pull sync completed: %s", stats)

        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Error during pull sync: %s", err)

        return stats


    async def _handle_remote_completion(
        self, list_id: str, template: Task, ticktick_task: dict[str, Any]
    ) -> None:
        """Handle a recurring task that was completed on TickTick.

        This finds the old instance with the last synced occurrence_index, marks it as completed,
        updates streaks, and prepares for the next instance with TickTick's new due date.

        Args:
            list_id: The list ID
            template: The local recurring task template
            ticktick_task: The TickTick task data with new due date
        """
        _LOGGER.info(
            "Handling remote completion for recurring task: %s", template.summary
        )

        # Get the last synced occurrence_index
        last_synced_index = template.sync.get("ticktick", {}).get(
            "last_synced_occurrence_index"
        )

        if last_synced_index is None:
            _LOGGER.warning(
                "No last_synced_occurrence_index in metadata for template %s, cannot find old instance",
                template.uid,
            )
            return

        # Find the instance with the last synced occurrence_index
        instances = self.store.get_instances_for_template(list_id, template.uid)
        old_instance = None
        for instance in instances:
            if instance.occurrence_index == last_synced_index:
                old_instance = instance
                break

        if not old_instance:
            _LOGGER.warning(
                "Could not find instance with occurrence_index %d for template %s",
                last_synced_index,
                template.uid,
            )
            return

        if old_instance.status == "completed":
            _LOGGER.debug(
                "Instance %s already marked as completed, skipping", old_instance.uid
            )
            return

        # Mark instance as completed
        old_instance.status = "completed"

        # Set completion time from TickTick (convert from milliseconds)
        completed_time_ms = ticktick_task.get("completedTime")
        if completed_time_ms:
            completed_dt = datetime.fromtimestamp(completed_time_ms / 1000, tz=UTC)
            old_instance.last_completed = completed_dt.isoformat().replace(
                "+00:00", "Z"
            )
        else:
            old_instance.last_completed = (
                datetime.now(UTC).isoformat().replace("+00:00", "Z")
            )

        # Check if completed on time (for streak tracking)
        completed_on_time = False
        if old_instance.due:
            due_dt = datetime.fromisoformat(old_instance.due)
            completed_dt = datetime.fromisoformat(old_instance.last_completed)

            if old_instance.is_all_day:
                # For all-day tasks, compare dates only
                completed_on_time = completed_dt.date() <= due_dt.date()
            else:
                # For timed tasks, compare full datetime
                completed_on_time = completed_dt <= due_dt

        # Update streak on template
        if completed_on_time:
            template.streak_current += 1
            template.streak_longest = max(
                template.streak_longest, template.streak_current
            )
            _LOGGER.info(
                "Streak incremented for template %s: current=%d, longest=%d",
                template.summary,
                template.streak_current,
                template.streak_longest,
            )
        else:
            _LOGGER.info(
                "Instance completed late, resetting streak for: %s", template.summary
            )
            template.streak_current = 0

        old_instance.update_modified()
        await self.store.async_update_task(list_id, old_instance)

        # Check if next instance already exists
        next_occurrence_index = old_instance.occurrence_index + 1
        next_exists = any(
            inst.occurrence_index == next_occurrence_index for inst in instances
        )

        if next_exists:
            _LOGGER.debug(
                "Next instance (occurrence_index=%d) already exists, skipping creation",
                next_occurrence_index,
            )
        else:
            # Create new instance with TickTick's new due date
            new_due = ticktick_task.get("dueDate")
            if new_due:
                # Normalize TickTick date format to internal ISO Z format
                normalized_due = self._normalize_ticktick_date(new_due)
                _LOGGER.info("Creating new instance with due date: %s", normalized_due)
                new_instance = Task.create_new(
                    summary=template.summary,
                    description=template.description,
                    due=normalized_due,
                    tags=template.tags.copy() if template.tags else [],
                    rrule=None,
                    parent_uid=template.uid,
                    is_template=False,
                    occurrence_index=next_occurrence_index,
                    is_all_day=template.is_all_day,
                )

                await self.store.async_add_task(list_id, new_instance)
                _LOGGER.info("Created new instance: %s", new_instance.uid)

        # Update template's last_synced_occurrence_index to the new current instance
        template.sync["ticktick"]["last_synced_occurrence_index"] = (
            next_occurrence_index
        )
        _LOGGER.debug(
            "Updated last_synced_occurrence_index to %d for template %s",
            next_occurrence_index,
            template.summary,
        )

    async def _update_local_from_ticktick(
        self, list_id: str, local_task: Task, ticktick_task: dict[str, Any]
    ) -> None:
        """Update local task with data from TickTick."""
        # Update basic fields
        local_task.summary = ticktick_task["title"]

        # Decode content and metadata
        content = ticktick_task.get("content", "")
        description, metadata = self._decode_metadata(content)
        local_task.description = description

        # Update metadata (streak data, etc.)
        if metadata:
            for key, value in metadata.items():
                if key in ["streak_current", "streak_longest", "occurrence_index"]:
                    # These map to direct properties
                    setattr(local_task, key, value)
                else:
                    # Other metadata goes in custom_fields
                    local_task.custom_fields[key] = value

        # Initialize last_synced_occurrence_index for recurring templates if missing
        # This handles existing tasks created before this feature was added
        if local_task.is_recurring_template():
            if "ticktick" not in local_task.sync:
                local_task.sync["ticktick"] = {}

            if "last_synced_occurrence_index" not in local_task.sync["ticktick"]:
                # Initialize with current instance's occurrence_index
                # For first sync after feature added, this captures the current state
                instances = self.store.get_instances_for_template(
                    list_id, local_task.uid
                )
                if instances:
                    incomplete_instances = [
                        i
                        for i in instances
                        if i.status != "completed" and not i.is_deleted()
                    ]
                    if incomplete_instances:
                        incomplete_instances.sort(key=lambda i: i.occurrence_index)
                        current_instance = incomplete_instances[0]
                        local_task.sync["ticktick"]["last_synced_occurrence_index"] = (
                            current_instance.occurrence_index
                        )
                        _LOGGER.debug(
                            "Initialized last_synced_occurrence_index for template %s: %d",
                            local_task.summary,
                            current_instance.occurrence_index,
                        )

        # Check for remote completion of recurring task BEFORE updating task
        # This must happen before we update the due date on the template
        # Note: TickTick resets status to active after completion, so we check for due date changes
        if local_task.is_recurring_template():
            # Get the last synced instance to compare due dates
            last_synced_index = local_task.sync.get("ticktick", {}).get(
                "last_synced_occurrence_index"
            )

            if last_synced_index is not None:
                # Find the instance with this occurrence_index
                instances = self.store.get_instances_for_template(list_id, local_task.uid)
                last_synced_instance = None
                for instance in instances:
                    if instance.occurrence_index == last_synced_index:
                        last_synced_instance = instance
                        break

                if last_synced_instance:
                    # Check if TickTick's due date changed from the last synced instance
                    current_ticktick_due = ticktick_task.get("dueDate")
                    last_known_due = last_synced_instance.due

                    # Normalize TickTick date for comparison
                    if current_ticktick_due:
                        current_ticktick_due = self._normalize_ticktick_date(current_ticktick_due)

                    due_date_changed = (
                        current_ticktick_due
                        and last_known_due
                        and current_ticktick_due != last_known_due
                    )

                    if due_date_changed:
                        _LOGGER.info(
                            "Detected remote completion for recurring task: %s (due changed from %s to %s)",
                            local_task.summary,
                            last_known_due,
                            current_ticktick_due,
                        )
                        # Handle the completion (mark old instance complete, create new instance)
                        await self._handle_remote_completion(list_id, local_task, ticktick_task)

        # Update tags (direct property, not custom_fields)
        local_task.tags = ticktick_task.get("tags", [])

        # Update due date (only for tasks, never templates!)
        if "dueDate" in ticktick_task and not local_task.is_template:
            local_task.due = self._normalize_ticktick_date(ticktick_task["dueDate"])

        # Update isAllDay flag
        if "isAllDay" in ticktick_task:
            local_task.is_all_day = ticktick_task["isAllDay"]

        # Update recurrence rule (direct property, not custom_fields)
        if "repeatFlag" in ticktick_task:
            # Strip RRULE: prefix for internal storage consistency
            rrule = ticktick_task["repeatFlag"]
            if rrule and rrule.startswith("RRULE:"):
                rrule = rrule[6:]  # Remove "RRULE:" prefix
            local_task.rrule = rrule

        # Update status based on TickTick status (0 = incomplete, 2 = completed)
        ticktick_status = ticktick_task.get("status", 0)
        if ticktick_status == 2:
            local_task.status = "completed"
        else:
            local_task.status = "needs_action"

        # Update modified timestamp
        local_task.update_modified()

        # Save to store
        await self.store.async_update_task(list_id, local_task)

        # If this is a template, propagate changes to active instances
        if local_task.is_recurring_template():
            _LOGGER.debug(
                "Template '%s' updated, propagating to active instances",
                local_task.summary,
            )
            instances = self.store.get_instances_for_template(list_id, local_task.uid)

            for instance in instances:
                # Only update active instances (not deleted, not completed)
                if instance.is_deleted() or instance.status == "completed":
                    continue

                # Propagate fields that should sync from template
                instance.summary = local_task.summary
                instance.description = local_task.description
                instance.tags = local_task.tags.copy() if local_task.tags else []
                instance.update_modified()

                await self.store.async_update_task(list_id, instance)
                _LOGGER.debug(
                    "Updated instance '%s' with template changes", instance.uid
                )

    async def _import_ticktick_task(
        self, list_id: str, ticktick_task: dict[str, Any]
    ) -> None:
        """Import a new task from TickTick."""
        # Decode content and metadata
        content = ticktick_task.get("content", "")
        description, metadata = self._decode_metadata(content)

        # Check if this is a recurring task
        rrule = ticktick_task.get("repeatFlag")
        # Strip RRULE: prefix for internal storage consistency
        if rrule and rrule.startswith("RRULE:"):
            rrule = rrule[6:]  # Remove "RRULE:" prefix

        # Get isAllDay flag from TickTick
        is_all_day = ticktick_task.get("isAllDay", False)

        _LOGGER.debug(
            "Importing task '%s': has repeatFlag=%s (normalized: %s), dueDate=%s",
            ticktick_task.get("title"),
            bool(ticktick_task.get("repeatFlag")),
            rrule,
            ticktick_task.get("dueDate"),
        )

        if rrule:
            # Create template
            _LOGGER.info(
                "Creating template for recurring task '%s' with rrule: %s",
                ticktick_task["title"],
                rrule,
            )
            template = Task.create_new(
                summary=ticktick_task["title"],
                description=description,
                due=None,
                tags=ticktick_task.get("tags", []),
                rrule=rrule,
                is_template=True,
                is_all_day=is_all_day,
            )

            # Apply metadata
            if metadata:
                for key, value in metadata.items():
                    template.custom_fields[key] = value

            # Store TickTick ID in sync metadata
            template.set_sync_id("ticktick", ticktick_task["id"])

            # Set sync metadata
            template.sync["ticktick"]["status"] = "synced"
            template.sync["ticktick"]["etag"] = ticktick_task.get("etag")
            template.sync["ticktick"]["last_synced_at"] = (
                datetime.now(UTC).isoformat().replace("+00:00", "Z")
            )

            # Add to store
            await self.store.async_add_task(list_id, template)
            _LOGGER.info(
                "Template created with uid: %s - Converted Task object:\n%s",
                template.uid,
                json.dumps(template.to_dict(), indent=2, default=str)
            )

            # Create first instance if there's a due date
            if "dueDate" in ticktick_task:
                # Normalize TickTick date format to internal ISO Z format
                normalized_due = self._normalize_ticktick_date(ticktick_task["dueDate"])
                _LOGGER.info(
                    "Creating first instance for template with due date: %s",
                    normalized_due,
                )
                first_instance = Task.create_new(
                    summary=ticktick_task["title"],
                    description=description,
                    due=normalized_due,
                    tags=ticktick_task.get("tags", []).copy(),
                    rrule=None,
                    parent_uid=template.uid,
                    is_template=False,
                    occurrence_index=metadata.get("occurrence_index", 0),
                    is_all_day=is_all_day,
                )
                await self.store.async_add_task(list_id, first_instance)
                _LOGGER.info(
                    "First instance created with uid: %s - Converted Task object:\n%s",
                    first_instance.uid,
                    json.dumps(first_instance.to_dict(), indent=2, default=str)
                )

        else:
            # Create regular task
            # Normalize TickTick date if present
            normalized_due = None
            if ticktick_task.get("dueDate"):
                normalized_due = self._normalize_ticktick_date(ticktick_task["dueDate"])

            task = Task.create_new(
                summary=ticktick_task["title"],
                description=description,
                due=normalized_due,
                tags=ticktick_task.get("tags", []),
                rrule=None,
                is_all_day=is_all_day,
            )

            # Store TickTick ID in sync metadata
            task.set_sync_id("ticktick", ticktick_task["id"])

            # Set sync metadata
            task.sync["ticktick"]["status"] = "synced"
            task.sync["ticktick"]["etag"] = ticktick_task.get("etag")
            task.sync["ticktick"]["last_synced_at"] = (
                datetime.now(UTC).isoformat().replace("+00:00", "Z")
            )

            # Check if completed
            if ticktick_task.get("status") == 2:
                task.status = "completed"

            # Add to store
            await self.store.async_add_task(list_id, task)
            _LOGGER.info(
                "Regular task created with uid: %s - Converted Task object:\n%s",
                task.uid,
                json.dumps(task.to_dict(), indent=2, default=str)
            )
