"""Storage management for ChoreBot."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_VERSION
from .task import Task

_LOGGER = logging.getLogger(__name__)


class ChoreBotStore:
    """Manages JSON storage for ChoreBot lists and tasks."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the store."""
        self.hass = hass
        self._config_store = Store(hass, STORAGE_VERSION, f"{DOMAIN}_config")
        self._task_stores: dict[str, Store] = {}
        self._archive_stores: dict[str, Store] = {}
        self._config_data: dict[str, Any] = {}
        # New two-array structure: templates separate from tasks
        self._tasks_cache: dict[str, dict[str, dict[str, Task]]] = {}
        self._lock = asyncio.Lock()

    async def async_load(self) -> None:
        """Load configuration and task data."""
        async with self._lock:
            # Load config (list registry)
            config_data = await self._config_store.async_load()
            if config_data is None:
                self._config_data = {"lists": []}
            else:
                self._config_data = config_data

            # Load tasks for each list
            for list_config in self._config_data.get("lists", []):
                list_id = list_config["id"]
                await self._load_tasks_for_list(list_id)

    async def _load_tasks_for_list(self, list_id: str) -> None:
        """Load tasks for a specific list."""
        # Initialize main task store
        store = Store(self.hass, STORAGE_VERSION, f"{DOMAIN}_{list_id}")
        self._task_stores[list_id] = store

        # Initialize archive store
        archive_store = Store(self.hass, STORAGE_VERSION, f"{DOMAIN}_{list_id}_archive")
        self._archive_stores[list_id] = archive_store

        task_data = await store.async_load()
        if task_data is None:
            self._tasks_cache[list_id] = {"templates": {}, "tasks": {}}
        else:
            # Load two-array structure: {"recurring_templates": [...], "tasks": [...]}
            templates_data = task_data.get("recurring_templates", [])
            tasks_data = task_data.get("tasks", [])

            templates = [Task.from_dict(t, is_template=True) for t in templates_data]
            tasks = [Task.from_dict(t, is_template=False) for t in tasks_data]

            # Filter out soft-deleted and index by UID
            self._tasks_cache[list_id] = {
                "templates": {t.uid: t for t in templates if not t.is_deleted()},
                "tasks": {t.uid: t for t in tasks if not t.is_deleted()},
            }

    async def async_save_config(self) -> None:
        """Save configuration data. Must be called with lock held."""
        await self._config_store.async_save(self._config_data)

    async def async_save_tasks(self, list_id: str) -> None:
        """Save tasks for a specific list. Must be called with lock held."""
        if list_id not in self._task_stores:
            _LOGGER.error("Cannot save tasks for unknown list: %s", list_id)
            return

        # Get cache for this list
        cache = self._tasks_cache.get(list_id, {"templates": {}, "tasks": {}})

        # Load existing data to preserve soft-deleted items
        store = self._task_stores[list_id]
        existing_data = await store.async_load()

        # Get soft-deleted tasks from storage
        deleted_templates = {}
        deleted_tasks = {}

        if existing_data:
            # Load from two-array structure
            for t_dict in existing_data.get("recurring_templates", []):
                task = Task.from_dict(t_dict)
                if task.is_deleted():
                    deleted_templates[task.uid] = task
            for t_dict in existing_data.get("tasks", []):
                task = Task.from_dict(t_dict)
                if task.is_deleted():
                    deleted_tasks[task.uid] = task

        # Merge active from cache with deleted from storage
        all_templates = {**deleted_templates, **cache["templates"]}
        all_tasks = {**deleted_tasks, **cache["tasks"]}

        # Save payload only (HA Store will wrap with version/key/data)
        data = {
            "recurring_templates": [t.to_dict() for t in all_templates.values()],
            "tasks": [t.to_dict() for t in all_tasks.values()],
        }
        await store.async_save(data)

    def get_all_lists(self) -> list[dict[str, Any]]:
        """Get all list configurations."""
        return self._config_data.get("lists", [])

    def get_list(self, list_id: str) -> dict[str, Any] | None:
        """Get a specific list configuration."""
        for list_config in self._config_data.get("lists", []):
            if list_config["id"] == list_id:
                return list_config
        return None

    async def async_update_list(self, list_id: str, updates: dict[str, Any]) -> bool:
        """Update a list's metadata (including sync info).

        Args:
            list_id: The list ID to update
            updates: Dictionary of fields to update (e.g., {"name": "New Name", "sync": {...}})

        Returns:
            bool: True if successful, False if list not found
        """
        async with self._lock:
            for list_config in self._config_data.get("lists", []):
                if list_config["id"] == list_id:
                    list_config.update(updates)
                    await self.async_save_config()
                    return True
            return False

    def get_list_sync_info(self, list_id: str, backend: str) -> dict[str, Any] | None:
        """Get sync information for a list and backend.

        Args:
            list_id: The list ID
            backend: The backend name (e.g., "ticktick")

        Returns:
            dict with sync info (project_id, status, etc.) or None if not synced
        """
        list_config = self.get_list(list_id)
        if not list_config:
            return None
        return list_config.get("sync", {}).get(backend)

    async def async_set_list_sync_info(
        self, list_id: str, backend: str, sync_info: dict[str, Any]
    ) -> bool:
        """Set sync information for a list and backend.

        Args:
            list_id: The list ID
            backend: The backend name (e.g., "ticktick")
            sync_info: Dict with project_id, status, etc.

        Returns:
            bool: True if successful, False if list not found
        """
        list_config = self.get_list(list_id)
        if not list_config:
            return False

        # Ensure sync dict exists
        if "sync" not in list_config:
            list_config["sync"] = {}

        # Update sync info for this backend
        list_config["sync"][backend] = sync_info

        # Save config
        async with self._lock:
            await self.async_save_config()

        return True

    async def async_create_list(
        self, list_id: str, name: str, **kwargs: Any
    ) -> dict[str, Any]:
        """Create a new list."""
        async with self._lock:
            list_config = {"id": list_id, "name": name, **kwargs}
            # Initialize sync dict if not provided
            if "sync" not in list_config:
                list_config["sync"] = {}
            self._config_data.setdefault("lists", []).append(list_config)
            await self.async_save_config()

            # Initialize task storage for new list
            await self._load_tasks_for_list(list_id)

            # Create the storage file immediately with empty tasks
            await self.async_save_tasks(list_id)

            return list_config

    async def async_delete_list(self, list_id: str) -> None:
        """Delete a list."""
        async with self._lock:
            self._config_data["lists"] = [
                lst
                for lst in self._config_data.get("lists", [])
                if lst["id"] != list_id
            ]
            await self.async_save_config()

            # Remove from cache
            self._tasks_cache.pop(list_id, None)
            self._task_stores.pop(list_id, None)

    def get_tasks_for_list(self, list_id: str) -> list[Task]:
        """Get all active (non-deleted) tasks for a list (not including templates)."""
        cache = self._tasks_cache.get(list_id, {"templates": {}, "tasks": {}})
        return list(cache["tasks"].values())

    def get_templates_for_list(self, list_id: str) -> list[Task]:
        """Get all recurring task templates for a list."""
        cache = self._tasks_cache.get(list_id, {"templates": {}, "tasks": {}})
        return list(cache["templates"].values())

    def get_task(self, list_id: str, task_uid: str) -> Task | None:
        """Get a specific task by UID (not template)."""
        cache = self._tasks_cache.get(list_id, {"templates": {}, "tasks": {}})
        return cache["tasks"].get(task_uid)

    async def async_add_task(self, list_id: str, task: Task) -> None:
        """Add a new task or template to a list."""
        async with self._lock:
            if list_id not in self._tasks_cache:
                _LOGGER.error("Cannot add task to unknown list: %s", list_id)
                return

            cache = self._tasks_cache[list_id]

            # Route to correct cache based on type
            if task.is_recurring_template():
                cache["templates"][task.uid] = task
            else:
                cache["tasks"][task.uid] = task

            await self.async_save_tasks(list_id)

    async def async_update_task(self, list_id: str, task: Task) -> None:
        """Update an existing task or template."""
        async with self._lock:
            if list_id not in self._tasks_cache:
                _LOGGER.error("Cannot update task in unknown list: %s", list_id)
                return

            cache = self._tasks_cache[list_id]

            # Route to correct cache based on type
            if task.is_recurring_template():
                if task.uid in cache["templates"]:
                    cache["templates"][task.uid] = task
                    await self.async_save_tasks(list_id)
                else:
                    _LOGGER.warning(
                        "Template %s not found in list %s for update", task.uid, list_id
                    )
            elif task.uid in cache["tasks"]:
                cache["tasks"][task.uid] = task
                await self.async_save_tasks(list_id)
            else:
                _LOGGER.warning(
                    "Task %s not found in list %s for update", task.uid, list_id
                )

    async def async_delete_task(self, list_id: str, task_uid: str) -> None:
        """Soft delete a task or template (set deleted_at timestamp)."""
        async with self._lock:
            if list_id not in self._tasks_cache:
                _LOGGER.error("Cannot delete task from unknown list: %s", list_id)
                return

            cache = self._tasks_cache[list_id]

            # Check templates first
            if task_uid in cache["templates"]:
                template = cache["templates"][task_uid]
                template.mark_deleted()
                del cache["templates"][task_uid]
                await self.async_save_tasks(list_id)
                return

            # Then check tasks
            if task_uid in cache["tasks"]:
                task = cache["tasks"][task_uid]
                task.mark_deleted()
                del cache["tasks"][task_uid]
                await self.async_save_tasks(list_id)
                return

            _LOGGER.warning(
                "Task %s not found in list %s for deletion", task_uid, list_id
            )

    async def async_get_all_recurring_tasks(self) -> list[tuple[str, Task]]:
        """Get all recurring tasks across all lists (DEPRECATED - use async_get_all_recurring_templates)."""
        result = []
        for list_id, cache in self._tasks_cache.items():
            # Templates
            result.extend((list_id, task) for task in cache["templates"].values())
            # Instances
            result.extend(
                (list_id, task) for task in cache["tasks"].values() if task.parent_uid
            )
        return result

    def get_template(self, list_id: str, uid: str) -> Task | None:
        """Get a template task by UID."""
        cache = self._tasks_cache.get(list_id, {"templates": {}, "tasks": {}})
        return cache["templates"].get(uid)

    def get_instances_for_template(self, list_id: str, parent_uid: str) -> list[Task]:
        """Get all instances for a template."""
        cache = self._tasks_cache.get(list_id, {"templates": {}, "tasks": {}})
        return [
            task for task in cache["tasks"].values() if task.parent_uid == parent_uid
        ]

    async def async_get_all_recurring_templates(self) -> list[tuple[str, Task]]:
        """Get all recurring task templates across all lists."""
        result = []
        for list_id, cache in self._tasks_cache.items():
            result.extend(
                (list_id, template) for template in cache["templates"].values()
            )
        return result

    async def async_archive_old_instances(self, list_id: str, days: int = 30) -> int:
        """Archive instances completed more than N days ago. Returns count archived."""
        async with self._lock:
            if list_id not in self._task_stores:
                _LOGGER.error("Cannot archive for unknown list: %s", list_id)
                return 0

            # Calculate cutoff date
            cutoff = datetime.now(UTC) - timedelta(days=days)
            cutoff_str = cutoff.isoformat().replace("+00:00", "Z")

            # Load all tasks from storage (including completed instances)
            store = self._task_stores[list_id]
            task_data = await store.async_load()
            if task_data is None:
                return 0

            # Load from two-array structure
            all_tasks = [Task.from_dict(t) for t in task_data.get("tasks", [])]

            # Find instances to archive (completed recurring instances older than cutoff)
            to_archive = [
                task for task in all_tasks
                if task.is_recurring_instance()
                and task.status == "completed"
                and task.modified < cutoff_str
            ]

            if not to_archive:
                return 0

            _LOGGER.info(
                "Archiving %d old instances from list %s", len(to_archive), list_id
            )

            # Remove from cache
            cache = self._tasks_cache.get(list_id, {"templates": {}, "tasks": {}})
            for task in to_archive:
                cache["tasks"].pop(task.uid, None)

            # Save remaining tasks
            await self.async_save_tasks(list_id)

            # Append to archive
            archive_store = self._archive_stores[list_id]
            archive_data = await archive_store.async_load()
            if archive_data is None:
                archived_tasks = []
            else:
                archived_tasks = [
                    Task.from_dict(t) for t in archive_data.get("tasks", [])
                ]

            archived_tasks.extend(to_archive)
            archive_data = {"tasks": [t.to_dict() for t in archived_tasks]}
            await archive_store.async_save(archive_data)

            return len(to_archive)
