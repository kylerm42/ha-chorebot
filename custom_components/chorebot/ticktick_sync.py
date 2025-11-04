"""TickTick synchronization coordinator for ChoreBot."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
import logging
import re
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import (
    CONF_LIST_MAPPINGS,
    CONF_TICKTICK_CLIENT_ID,
    CONF_TICKTICK_CLIENT_SECRET,
    CONF_TICKTICK_ENABLED,
    CONF_TICKTICK_OAUTH_TOKEN,
    CONF_TICKTICK_USERNAME,
    DOMAIN,
    FIELD_OCCURRENCE_INDEX,
    FIELD_STREAK_CURRENT,
    FIELD_STREAK_LONGEST,
    FIELD_TICKTICK_ID,
)
from .store import ChoreBotStore
from .task import Task

_LOGGER = logging.getLogger(__name__)

# Metadata format: [chorebot:key1=value1;key2=value2]
METADATA_PATTERN = r'\[chorebot:(.*?)\]'


class TickTickSyncCoordinator:
    """Coordinates two-way synchronization between ChoreBot and TickTick."""

    def __init__(
        self,
        hass: HomeAssistant,
        store: ChoreBotStore,
        config: dict[str, Any],
    ) -> None:
        """Initialize the sync coordinator."""
        self.hass = hass
        self.store = store
        self.config = config
        self._client = None
        self._lock = asyncio.Lock()
        self._sync_in_progress = False
        self._last_sync_time: datetime | None = None

        # OAuth token storage
        self._token_store = Store(hass, 1, f"{DOMAIN}_ticktick_token")

    @property
    def enabled(self) -> bool:
        """Return whether TickTick sync is enabled."""
        return self.config.get(CONF_TICKTICK_ENABLED, False)

    @property
    def list_mappings(self) -> dict[str, str]:
        """Return list mappings (local_list_id -> ticktick_project_id)."""
        return self.config.get(CONF_LIST_MAPPINGS, {})

    async def async_initialize(self) -> bool:
        """Initialize the TickTick client and perform OAuth if needed."""
        if not self.enabled:
            _LOGGER.debug("TickTick sync is disabled, skipping initialization")
            return False

        try:
            # Import ticktick-py
            from ticktick.oauth2 import OAuth2
            from ticktick.api import TickTickClient

            # Get credentials from config
            client_id = self.config.get(CONF_TICKTICK_CLIENT_ID)
            client_secret = self.config.get(CONF_TICKTICK_CLIENT_SECRET)
            username = self.config.get(CONF_TICKTICK_USERNAME)

            if not all([client_id, client_secret, username]):
                _LOGGER.error("Missing TickTick credentials in config")
                return False

            # Create OAuth2 handler
            # Note: ticktick-py will handle token caching and OAuth flow
            # The OAuth flow opens a browser window for authorization
            oauth = OAuth2(
                client_id=client_id,
                client_secret=client_secret,
                redirect_uri="http://127.0.0.1:8080",
                cache_path=self.hass.config.path(f".storage/{DOMAIN}_ticktick_token.json"),
            )

            # Initialize client
            # NOTE: The first time this runs, it will open a browser for OAuth
            # This is a limitation of ticktick-py's OAuth implementation
            _LOGGER.info("Initializing TickTick client for user: %s", username)

            # Run in executor to avoid blocking
            self._client = await self.hass.async_add_executor_job(
                lambda: TickTickClient(username, "", oauth)
            )

            # Sync state from TickTick
            await self.hass.async_add_executor_job(self._client.sync)

            _LOGGER.info("TickTick client initialized successfully")
            return True

        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to initialize TickTick client: %s", err)
            return False

    def _encode_metadata(
        self,
        user_description: str,
        custom_fields: dict[str, Any],
    ) -> str:
        """Encode ChoreBot metadata into TickTick content field."""
        metadata_parts = []

        if FIELD_STREAK_CURRENT in custom_fields:
            metadata_parts.append(f"streak_current={custom_fields[FIELD_STREAK_CURRENT]}")
        if FIELD_STREAK_LONGEST in custom_fields:
            metadata_parts.append(f"streak_longest={custom_fields[FIELD_STREAK_LONGEST]}")
        if FIELD_OCCURRENCE_INDEX in custom_fields:
            metadata_parts.append(f"occurrence_index={custom_fields[FIELD_OCCURRENCE_INDEX]}")

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

    def _compare_timestamps(
        self,
        local_modified: str,
        ticktick_modified: str,
    ) -> int:
        """Compare timestamps to determine which is newer.

        Returns:
            1 if local is newer
            -1 if ticktick is newer
            0 if equal (local wins as tiebreaker)
        """
        try:
            # Parse ISO 8601 timestamps
            local_dt = datetime.fromisoformat(local_modified.replace("Z", "+00:00"))
            # TickTick uses Unix timestamp in milliseconds
            if isinstance(ticktick_modified, int):
                ticktick_dt = datetime.fromtimestamp(ticktick_modified / 1000, tz=UTC)
            else:
                ticktick_dt = datetime.fromisoformat(ticktick_modified.replace("Z", "+00:00"))

            if local_dt > ticktick_dt:
                return 1
            elif local_dt < ticktick_dt:
                return -1
            else:
                return 0  # Equal - local wins
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Error comparing timestamps: %s", err)
            return 0  # Default to local wins

    async def async_push_task(
        self,
        list_id: str,
        task: Task,
    ) -> bool:
        """Push a local task to TickTick.

        Returns True if successful, False otherwise.
        """
        if not self._client or not self.enabled:
            return False

        # Check if this list is mapped to a TickTick project
        ticktick_project_id = self.list_mappings.get(list_id)
        if not ticktick_project_id:
            _LOGGER.debug("List %s is not mapped to a TickTick project", list_id)
            return False

        try:
            # For recurring tasks, only sync templates + current active instance
            if task.is_recurring_instance():
                _LOGGER.debug("Skipping sync for recurring instance (not current)")
                return True

            # Build TickTick task dict
            ticktick_task = {
                "title": task.summary,
                "projectId": ticktick_project_id,
            }

            # Add content (description + metadata)
            if task.is_template:
                # Encode metadata for templates
                content = self._encode_metadata(
                    task.description or "",
                    task.custom_fields,
                )
            else:
                content = task.description or ""

            if content:
                ticktick_task["content"] = content

            # Add tags
            if task.tags:
                ticktick_task["tags"] = task.tags

            # Add due date
            if task.due:
                # TickTick expects ISO 8601 format
                ticktick_task["dueDate"] = task.due

            # Add recurrence rule for templates
            if task.is_template and task.rrule:
                ticktick_task["repeat"] = task.rrule

            # Check if task already exists on TickTick
            ticktick_id = task.custom_fields.get(FIELD_TICKTICK_ID)

            if ticktick_id:
                # Update existing task
                ticktick_task["id"] = ticktick_id
                _LOGGER.debug("Updating TickTick task: %s", task.summary)
                await self.hass.async_add_executor_job(
                    self._client.task.update,
                    ticktick_task,
                )
            else:
                # Create new task
                _LOGGER.debug("Creating new TickTick task: %s", task.summary)
                created_task = await self.hass.async_add_executor_job(
                    self._client.task.create,
                    ticktick_task,
                )

                # Store the TickTick ID in custom fields
                task.custom_fields[FIELD_TICKTICK_ID] = created_task["id"]
                await self.store.async_update_task(list_id, task)

            return True

        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to push task to TickTick: %s", err)
            return False

    async def async_delete_ticktick_task(
        self,
        list_id: str,
        task: Task,
    ) -> bool:
        """Delete a task from TickTick."""
        if not self._client or not self.enabled:
            return False

        ticktick_id = task.custom_fields.get(FIELD_TICKTICK_ID)
        if not ticktick_id:
            # Task was never synced to TickTick
            return True

        try:
            # Get task from TickTick state
            ticktick_task = self._client.get_by_id(ticktick_id, search="tasks")
            if ticktick_task:
                _LOGGER.debug("Deleting TickTick task: %s", task.summary)
                await self.hass.async_add_executor_job(
                    self._client.task.delete,
                    ticktick_task,
                )
            return True

        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to delete TickTick task: %s", err)
            return False

    async def async_complete_ticktick_task(
        self,
        list_id: str,
        task: Task,
    ) -> bool:
        """Mark a task as completed on TickTick."""
        if not self._client or not self.enabled:
            return False

        ticktick_id = task.custom_fields.get(FIELD_TICKTICK_ID)
        if not ticktick_id:
            # Task was never synced to TickTick
            return True

        try:
            # Get task from TickTick state
            ticktick_task = self._client.get_by_id(ticktick_id, search="tasks")
            if ticktick_task:
                _LOGGER.debug("Completing TickTick task: %s", task.summary)
                await self.hass.async_add_executor_job(
                    self._client.task.complete,
                    ticktick_task,
                )

                # For recurring tasks, update the due date to the next instance
                if task.is_template and task.rrule:
                    # Get the current active instance
                    instances = self.store.get_instances_for_template(list_id, task.uid)
                    if instances:
                        # Sort by occurrence_index descending
                        instances.sort(key=lambda t: t.occurrence_index, reverse=True)
                        latest_instance = instances[0]

                        # Update TickTick task with new due date
                        ticktick_task["dueDate"] = latest_instance.due
                        await self.hass.async_add_executor_job(
                            self._client.task.update,
                            ticktick_task,
                        )

            return True

        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to complete TickTick task: %s", err)
            return False

    async def async_pull_changes(self, list_id: str | None = None) -> dict[str, int]:
        """Pull changes from TickTick and apply to local storage.

        Args:
            list_id: Optional list ID to sync. If None, syncs all mapped lists.

        Returns:
            Dict with counts: {"created": 0, "updated": 0, "deleted": 0}
        """
        if not self._client or not self.enabled:
            return {"created": 0, "updated": 0, "deleted": 0}

        if self._sync_in_progress:
            _LOGGER.warning("Sync already in progress, skipping")
            return {"created": 0, "updated": 0, "deleted": 0}

        async with self._lock:
            self._sync_in_progress = True
            stats = {"created": 0, "updated": 0, "deleted": 0}

            try:
                # Refresh TickTick state
                await self.hass.async_add_executor_job(self._client.sync)

                # Get lists to sync
                lists_to_sync = []
                if list_id:
                    if list_id in self.list_mappings:
                        lists_to_sync.append(list_id)
                else:
                    lists_to_sync = list(self.list_mappings.keys())

                # Sync each mapped list
                for local_list_id in lists_to_sync:
                    ticktick_project_id = self.list_mappings[local_list_id]

                    # Get TickTick tasks for this project
                    ticktick_tasks = await self.hass.async_add_executor_job(
                        self._client.task.get_from_project,
                        ticktick_project_id,
                    )

                    # Get local tasks (templates only for recurring tasks)
                    local_tasks = self.store.get_tasks_for_list(local_list_id)
                    local_templates = [t for t in local_tasks if not t.is_recurring_instance()]

                    # Build mapping of ticktick_id -> local task
                    ticktick_id_map = {}
                    for task in local_templates:
                        ticktick_id = task.custom_fields.get(FIELD_TICKTICK_ID)
                        if ticktick_id:
                            ticktick_id_map[ticktick_id] = task

                    # Process TickTick tasks
                    for tt_task in ticktick_tasks:
                        tt_id = tt_task["id"]

                        # Check if we have this task locally
                        if tt_id in ticktick_id_map:
                            # Task exists - check for updates
                            local_task = ticktick_id_map[tt_id]

                            # Compare timestamps (most recently updated wins)
                            comparison = self._compare_timestamps(
                                local_task.modified,
                                tt_task.get("modifiedTime", 0),
                            )

                            if comparison == -1:
                                # TickTick is newer - update local
                                _LOGGER.debug("Updating local task from TickTick: %s", tt_task["title"])
                                await self._update_local_from_ticktick(
                                    local_list_id,
                                    local_task,
                                    tt_task,
                                )
                                stats["updated"] += 1

                            # Remove from map (processed)
                            del ticktick_id_map[tt_id]

                        else:
                            # New task from TickTick - import if recent
                            # Filter: only import tasks completed within last 30 days
                            if tt_task.get("status") == 2:  # Completed
                                completed_time = tt_task.get("completedTime", 0)
                                if completed_time:
                                    completed_dt = datetime.fromtimestamp(
                                        completed_time / 1000, tz=UTC
                                    )
                                    if datetime.now(UTC) - completed_dt > timedelta(days=30):
                                        _LOGGER.debug(
                                            "Skipping import of old completed task: %s",
                                            tt_task["title"],
                                        )
                                        continue

                            _LOGGER.debug("Importing new task from TickTick: %s", tt_task["title"])
                            await self._import_ticktick_task(local_list_id, tt_task)
                            stats["created"] += 1

                    # Check for deleted tasks (exist locally but not on TickTick)
                    for ticktick_id, local_task in ticktick_id_map.items():
                        if not local_task.is_deleted():
                            _LOGGER.debug("Task deleted on TickTick, soft-deleting local: %s", local_task.summary)
                            local_task.mark_deleted()
                            await self.store.async_update_task(local_list_id, local_task)
                            stats["deleted"] += 1

                self._last_sync_time = datetime.now(UTC)
                _LOGGER.info("Pull sync completed: %s", stats)

            except Exception as err:  # noqa: BLE001
                _LOGGER.error("Error during pull sync: %s", err)

            finally:
                self._sync_in_progress = False

            return stats

    async def _update_local_from_ticktick(
        self,
        list_id: str,
        local_task: Task,
        ticktick_task: dict[str, Any],
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
        if ticktick_task.get("status") == 2:  # Completed
            # Run local completion logic (will create next instance for recurring)
            if local_task.is_template:
                # Get current active instance
                instances = self.store.get_instances_for_template(list_id, local_task.uid)
                if instances:
                    instances.sort(key=lambda t: t.occurrence_index, reverse=True)
                    latest_instance = instances[0]

                    if latest_instance.status != "completed":
                        _LOGGER.info("Completing recurring instance from TickTick: %s", latest_instance.summary)
                        # This will be handled by the todo entity's completion logic
                        pass
            else:
                local_task.status = "completed"

        # Update modified timestamp
        local_task.update_modified()

        # Save to store
        await self.store.async_update_task(list_id, local_task)

    async def _import_ticktick_task(
        self,
        list_id: str,
        ticktick_task: dict[str, Any],
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
                due=None,  # Templates don't have due dates
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

    async def async_create_ticktick_project(self, list_id: str, name: str) -> str | None:
        """Create a new TickTick project for a ChoreBot list.

        Returns the TickTick project ID if successful, None otherwise.
        """
        if not self._client or not self.enabled:
            return None

        try:
            _LOGGER.info("Creating TickTick project: %s", name)
            project = await self.hass.async_add_executor_job(
                self._client.project.create,
                name,
            )

            # Store the mapping
            project_id = project["id"]
            self.config[CONF_LIST_MAPPINGS][list_id] = project_id

            # Save config
            # NOTE: This requires updating the config entry, which should be done
            # by the caller to properly update the integration
            _LOGGER.info("Created TickTick project %s with ID %s", name, project_id)

            return project_id

        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Failed to create TickTick project: %s", err)
            return None
