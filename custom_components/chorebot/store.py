"""Storage management for ChoreBot."""
from __future__ import annotations

import asyncio
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
        store = Store(self.hass, STORAGE_VERSION, f"{DOMAIN}_{list_id}")
        self._task_stores[list_id] = store

        task_data = await store.async_load()
        if task_data is None:
            self._tasks_cache[list_id] = []
        else:
            tasks = [Task.from_dict(t) for t in task_data.get("tasks", [])]
            # Filter out soft-deleted tasks
            self._tasks_cache[list_id] = [t for t in tasks if not t.is_deleted()]

    async def async_save_config(self) -> None:
        """Save configuration data. Must be called with lock held."""
        await self._config_store.async_save(self._config_data)

    async def async_save_tasks(self, list_id: str) -> None:
        """Save tasks for a specific list. Must be called with lock held."""
        if list_id not in self._task_stores:
            _LOGGER.error("Cannot save tasks for unknown list: %s", list_id)
            return

        # Include soft-deleted tasks in storage (but not in cache)
        store = self._task_stores[list_id]
        all_tasks_data = await store.async_load()
        if all_tasks_data is None:
            all_tasks = []
        else:
            all_tasks = [Task.from_dict(t) for t in all_tasks_data.get("tasks", [])]

        # Update existing tasks or add new ones
        active_tasks = self._tasks_cache.get(list_id, [])
        deleted_tasks = [t for t in all_tasks if t.is_deleted()]

        # Merge: keep deleted tasks, update/add active tasks
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
                lst for lst in self._config_data.get("lists", []) if lst["id"] != list_id
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
        """Get all recurring tasks across all lists."""
        result = []
        for list_id, tasks in self._tasks_cache.items():
            result.extend((list_id, task) for task in tasks if task.is_recurring())
        return result
