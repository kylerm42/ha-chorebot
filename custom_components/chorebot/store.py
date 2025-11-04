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
        self._tasks_cache: dict[str, list[Task]] = {}
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
            self._tasks_cache[list_id] = []
        else:
            tasks = [Task.from_dict(t) for t in task_data.get("tasks", [])]
            # Filter out:
            # - Soft-deleted tasks (includes recurring instances deleted by midnight job)
            # Templates stay in cache for easy access, filtered from UI in todo.py
            self._tasks_cache[list_id] = [t for t in tasks if not t.is_deleted()]

    async def async_save_config(self) -> None:
        """Save configuration data. Must be called with lock held."""
        await self._config_store.async_save(self._config_data)

    async def async_save_tasks(self, list_id: str) -> None:
        """Save tasks for a specific list. Must be called with lock held."""
        if list_id not in self._task_stores:
            _LOGGER.error("Cannot save tasks for unknown list: %s", list_id)
            return

        # Cache contains all active tasks (templates, instances, regular tasks, completed tasks)
        # Need to also preserve soft-deleted tasks from storage
        store = self._task_stores[list_id]
        all_tasks_data = await store.async_load()
        if all_tasks_data is None:
            all_tasks = []
        else:
            all_tasks = [Task.from_dict(t) for t in all_tasks_data.get("tasks", [])]

        # Get soft-deleted tasks from storage
        deleted_tasks = [t for t in all_tasks if t.is_deleted()]

        # Get active tasks from cache
        active_tasks = self._tasks_cache.get(list_id, [])

        # Merge: keep deleted tasks + all active tasks from cache
        task_map = {t.uid: t for t in deleted_tasks}
        for task in active_tasks:
            task_map[task.uid] = task

        data = {"tasks": [t.to_dict() for t in task_map.values()]}
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

    async def async_create_list(
        self, list_id: str, name: str, **kwargs: Any
    ) -> dict[str, Any]:
        """Create a new list."""
        async with self._lock:
            list_config = {"id": list_id, "name": name, **kwargs}
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
        """Get all active (non-deleted) tasks for a list."""
        return self._tasks_cache.get(list_id, []).copy()

    def get_task(self, list_id: str, task_uid: str) -> Task | None:
        """Get a specific task by UID."""
        tasks = self._tasks_cache.get(list_id, [])
        for task in tasks:
            if task.uid == task_uid:
                return task
        return None

    async def async_add_task(self, list_id: str, task: Task) -> None:
        """Add a new task to a list."""
        async with self._lock:
            if list_id not in self._tasks_cache:
                _LOGGER.error("Cannot add task to unknown list: %s", list_id)
                return

            # Add to cache (templates and completed tasks stay in cache)
            # Filtering for UI happens in todo.py
            self._tasks_cache[list_id].append(task)
            await self.async_save_tasks(list_id)

    async def async_update_task(self, list_id: str, task: Task) -> None:
        """Update an existing task."""
        async with self._lock:
            if list_id not in self._tasks_cache:
                _LOGGER.error("Cannot update task in unknown list: %s", list_id)
                return

            tasks = self._tasks_cache[list_id]
            for i, existing_task in enumerate(tasks):
                if existing_task.uid == task.uid:
                    tasks[i] = task
                    await self.async_save_tasks(list_id)
                    return

            _LOGGER.warning(
                "Task %s not found in list %s for update", task.uid, list_id
            )

    async def async_delete_task(self, list_id: str, task_uid: str) -> None:
        """Soft delete a task (set deleted_at timestamp)."""
        async with self._lock:
            if list_id not in self._tasks_cache:
                _LOGGER.error("Cannot delete task from unknown list: %s", list_id)
                return

            tasks = self._tasks_cache[list_id]
            for i, task in enumerate(tasks):
                if task.uid == task_uid:
                    # Mark as deleted and save to storage
                    task.mark_deleted()
                    # Remove from active cache
                    tasks.pop(i)
                    await self.async_save_tasks(list_id)
                    return

            _LOGGER.warning(
                "Task %s not found in list %s for deletion", task_uid, list_id
            )

    async def async_get_all_recurring_tasks(self) -> list[tuple[str, Task]]:
        """Get all recurring tasks across all lists (DEPRECATED - use async_get_all_recurring_templates)."""
        result = []
        for list_id, tasks in self._tasks_cache.items():
            result.extend((list_id, task) for task in tasks if task.is_recurring())
        return result

    def get_template(self, list_id: str, uid: str) -> Task | None:
        """Get a template task by UID (templates are in cache but filtered from UI)."""
        tasks = self._tasks_cache.get(list_id, [])
        for task in tasks:
            if task.uid == uid and task.is_recurring_template():
                return task
        return None

    def get_instances_for_template(self, list_id: str, parent_uid: str) -> list[Task]:
        """Get all instances for a template, including from archive."""
        # Get active instances from cache
        return [
            t for t in self._tasks_cache.get(list_id, []) if t.parent_uid == parent_uid
        ]

    async def async_get_all_recurring_templates(self) -> list[tuple[str, Task]]:
        """Get all recurring task templates across all lists."""
        result = []
        for list_id, tasks in self._tasks_cache.items():
            result.extend(
                (list_id, task) for task in tasks if task.is_recurring_template()
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

            all_tasks = [Task.from_dict(t) for t in task_data.get("tasks", [])]

            # Separate tasks to archive from tasks to keep
            to_archive = []
            to_keep = []

            for task in all_tasks:
                # Archive completed recurring instances older than cutoff
                if (
                    task.is_recurring_instance()
                    and task.status == "completed"
                    and task.modified < cutoff_str
                ):
                    to_archive.append(task)
                else:
                    to_keep.append(task)

            if not to_archive:
                return 0

            _LOGGER.info(
                "Archiving %d old instances from list %s", len(to_archive), list_id
            )

            # Save remaining tasks
            data = {"tasks": [t.to_dict() for t in to_keep]}
            await store.async_save(data)

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
