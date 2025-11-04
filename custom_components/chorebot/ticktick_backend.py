"""TickTick backend implementation for ChoreBot sync."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
import logging
import re
from typing import Any

from homeassistant.core import HomeAssistant

from .const import CONF_LIST_MAPPINGS, FIELD_TICKTICK_ID
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
        self._list_mappings: dict[str, str] = config.get(CONF_LIST_MAPPINGS, {})

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
        """Get current list mappings."""
        return self._list_mappings

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
        """Create a new TickTick project."""
        if not self._client:
            return None

        try:
            project = await self._client.create_project(name)
            project_id = project["id"]

            # Store mapping
            self._list_mappings[list_id] = project_id
            _LOGGER.info("Created TickTick project %s with ID %s", name, project_id)
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

    def _compare_timestamps(self, local_modified: str, ticktick_modified: int) -> int:
        """Compare timestamps to determine which is newer.

        Returns:
            1 if local is newer
            -1 if ticktick is newer
            0 if equal (local wins as tiebreaker)
        """
        try:
            local_dt = datetime.fromisoformat(local_modified)
            # TickTick uses Unix timestamp in milliseconds
            ticktick_dt = datetime.fromtimestamp(ticktick_modified / 1000, tz=UTC)

            if local_dt > ticktick_dt:
                return 1
            if local_dt < ticktick_dt:
                return -1
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Error comparing timestamps: %s", err)
            return 0  # Default to local wins
        else:
            return 0

    def _task_to_ticktick(self, task: Task, project_id: str) -> dict[str, Any]:
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
            ticktick_task["dueDate"] = task.due

        # Add recurrence rule for templates
        if task.is_template and task.rrule:
            ticktick_task["repea"] = task.rrule

        # Add TickTick ID if exists
        ticktick_id = task.custom_fields.get(FIELD_TICKTICK_ID)
        if ticktick_id:
            ticktick_task["id"] = ticktick_id

        return ticktick_task

    async def async_push_task(self, list_id: str, task: Task) -> bool:
        """Push a local task to TickTick."""
        if not self._client:
            return False

        # Check if this list is mapped
        project_id = self._list_mappings.get(list_id)
        if not project_id:
            _LOGGER.debug("List %s is not mapped to a TickTick project", list_id)
            return False

        try:
            # Skip recurring instances (only sync templates + their current due date)
            if task.is_recurring_instance():
                _LOGGER.debug("Skipping sync for recurring instance")
                return True

            # Convert to TickTick format
            ticktick_task = self._task_to_ticktick(task, project_id)

            # Check if task already exists on TickTick
            ticktick_id = task.custom_fields.get(FIELD_TICKTICK_ID)

            if ticktick_id:
                # Update existing task
                _LOGGER.debug("Updating TickTick task: %s", task.summary)
                await self._client.update_task(ticktick_id, ticktick_task)
            else:
                # Create new task
                _LOGGER.debug("Creating new TickTick task: %s", task.summary)
                created_task = await self._client.create_task(ticktick_task)

                # Store the TickTick ID
                task.custom_fields[FIELD_TICKTICK_ID] = created_task["id"]
                await self.store.async_update_task(list_id, task)

        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to push task to TickTick: %s", err)
            return False
        else:
            return True

    async def async_delete_task(self, list_id: str, task: Task) -> bool:
        """Delete a task from TickTick."""
        if not self._client:
            return False

        ticktick_id = task.custom_fields.get(FIELD_TICKTICK_ID)
        if not ticktick_id:
            # Task was never synced
            return True

        project_id = self._list_mappings.get(list_id)
        if not project_id:
            return False

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

        ticktick_id = task.custom_fields.get(FIELD_TICKTICK_ID)
        if not ticktick_id:
            # Task was never synced
            return True

        project_id = self._list_mappings.get(list_id)
        if not project_id:
            return False

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

                    # Update TickTick task with new due date
                    update_data = {
                        "id": ticktick_id,
                        "dueDate": latest_instance.due,
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
            # Get lists to sync
            lists_to_sync = []
            if list_id:
                if list_id in self._list_mappings:
                    lists_to_sync.append(list_id)
            else:
                lists_to_sync = list(self._list_mappings.keys())

            # Sync each mapped list
            for local_list_id in lists_to_sync:
                project_id = self._list_mappings[local_list_id]

                # Get TickTick tasks for this project
                project_data = await self._client.get_project_with_tasks(project_id)
                ticktick_tasks = project_data.get("tasks", [])

                # Get local tasks (templates only for recurring tasks)
                local_tasks = self.store.get_tasks_for_list(local_list_id)
                local_templates = [
                    t for t in local_tasks if not t.is_recurring_instance()
                ]

                # Build mapping of ticktick_id -> local task
                ticktick_id_map = {}
                for task in local_templates:
                    ticktick_id = task.custom_fields.get(FIELD_TICKTICK_ID)
                    if ticktick_id:
                        ticktick_id_map[ticktick_id] = task

                # Process TickTick tasks
                for tt_task in ticktick_tasks:
                    tt_id = tt_task["id"]

                    if tt_id in ticktick_id_map:
                        # Task exists - check for updates
                        local_task = ticktick_id_map[tt_id]

                        # Compare timestamps
                        comparison = self._compare_timestamps(
                            local_task.modified,
                            tt_task.get("modifiedTime", 0),
                        )

                        if comparison == -1:
                            # TickTick is newer - update local
                            _LOGGER.debug(
                                "Updating local task from TickTick: %s",
                                tt_task["title"],
                            )
                            await self._update_local_from_ticktick(
                                local_list_id, local_task, tt_task
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

                        _LOGGER.debug(
                            "Importing new task from TickTick: %s", tt_task["title"]
                        )
                        await self._import_ticktick_task(local_list_id, tt_task)
                        stats["created"] += 1

                # Check for deleted tasks
                for local_task in ticktick_id_map.values():
                    if not local_task.is_deleted():
                        _LOGGER.debug(
                            "Task deleted on TickTick, soft-deleting local: %s",
                            local_task.summary,
                        )
                        local_task.mark_deleted()
                        await self.store.async_update_task(local_list_id, local_task)
                        stats["deleted"] += 1

            _LOGGER.info("Pull sync completed: %s", stats)

        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Error during pull sync: %s", err)

        return stats

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

        # Update metadata
        if metadata:
            for key, value in metadata.items():
                local_task.custom_fields[key] = value

        # Update tags
        local_task.custom_fields["tags"] = ticktick_task.get("tags", [])

        # Update due date
        if "dueDate" in ticktick_task:
            local_task.due = ticktick_task["dueDate"]

        # Update recurrence rule
        if "repeat" in ticktick_task:
            local_task.custom_fields["rrule"] = ticktick_task["repeat"]

        # Check if completed on TickTick
        if ticktick_task.get("status") == 2:
            local_task.status = "completed"

        # Update modified timestamp
        local_task.update_modified()

        # Save to store
        await self.store.async_update_task(list_id, local_task)

    async def _import_ticktick_task(
        self, list_id: str, ticktick_task: dict[str, Any]
    ) -> None:
        """Import a new task from TickTick."""
        # Decode content and metadata
        content = ticktick_task.get("content", "")
        description, metadata = self._decode_metadata(content)

        # Check if this is a recurring task
        rrule = ticktick_task.get("repeat")

        if rrule:
            # Create template
            template = Task.create_new(
                summary=ticktick_task["title"],
                description=description,
                due=None,
                tags=ticktick_task.get("tags", []),
                rrule=rrule,
                is_template=True,
            )

            # Apply metadata
            if metadata:
                for key, value in metadata.items():
                    template.custom_fields[key] = value

            # Store TickTick ID
            template.custom_fields[FIELD_TICKTICK_ID] = ticktick_task["id"]

            # Add to store
            await self.store.async_add_task(list_id, template)

            # Create first instance if there's a due date
            if "dueDate" in ticktick_task:
                first_instance = Task.create_new(
                    summary=ticktick_task["title"],
                    description=description,
                    due=ticktick_task["dueDate"],
                    tags=ticktick_task.get("tags", []).copy(),
                    rrule=None,
                    parent_uid=template.uid,
                    is_template=False,
                    occurrence_index=metadata.get("occurrence_index", 0),
                )
                await self.store.async_add_task(list_id, first_instance)

        else:
            # Create regular task
            task = Task.create_new(
                summary=ticktick_task["title"],
                description=description,
                due=ticktick_task.get("dueDate"),
                tags=ticktick_task.get("tags", []),
                rrule=None,
            )

            # Store TickTick ID
            task.custom_fields[FIELD_TICKTICK_ID] = ticktick_task["id"]

            # Check if completed
            if ticktick_task.get("status") == 2:
                task.status = "completed"

            # Add to store
            await self.store.async_add_task(list_id, task)
