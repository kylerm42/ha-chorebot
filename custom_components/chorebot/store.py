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
        # Sections cache: list_id -> list of section dicts
        self._sections_cache: dict[str, list[dict[str, Any]]] = {}
        # Metadata cache: list_id -> dict with person_id, etc.
        self._metadata_cache: dict[str, dict[str, Any]] = {}
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
        # Initialize main task store with chorebot_list_ prefix
        store = Store(self.hass, STORAGE_VERSION, f"{DOMAIN}_list_{list_id}")
        self._task_stores[list_id] = store

        # Initialize archive store with chorebot_list_ prefix
        archive_store = Store(
            self.hass, STORAGE_VERSION, f"{DOMAIN}_list_{list_id}_archive"
        )
        self._archive_stores[list_id] = archive_store

        task_data = await store.async_load()
        if task_data is None:
            self._tasks_cache[list_id] = {"templates": {}, "tasks": {}}
            self._sections_cache[list_id] = []
            self._metadata_cache[list_id] = {}
        else:
            # Load two-array structure: {"recurring_templates": [...], "tasks": [...], "sections": [...], "metadata": {...}}
            templates_data = task_data.get("recurring_templates", [])
            tasks_data = task_data.get("tasks", [])
            sections_data = task_data.get("sections", [])
            metadata = task_data.get("metadata", {})

            templates = [Task.from_dict(t, is_template=True) for t in templates_data]
            tasks = [Task.from_dict(t, is_template=False) for t in tasks_data]

            # Filter out soft-deleted and index by UID
            self._tasks_cache[list_id] = {
                "templates": {t.uid: t for t in templates if not t.is_deleted()},
                "tasks": {t.uid: t for t in tasks if not t.is_deleted()},
            }
            # Load sections
            self._sections_cache[list_id] = sections_data
            # Load metadata (person_id, etc.)
            self._metadata_cache[list_id] = metadata

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

        # Get sections from cache
        sections = self._sections_cache.get(list_id, [])

        # Get metadata from cache
        metadata = self._metadata_cache.get(list_id, {})

        # Save payload only (HA Store will wrap with version/key/data)
        data = {
            "recurring_templates": [t.to_dict() for t in all_templates.values()],
            "tasks": [t.to_dict() for t in all_tasks.values()],
            "sections": sections,
            "metadata": metadata,
        }
        await store.async_save(data)

    def get_all_lists(self) -> list[dict[str, Any]]:
        """Get all list configurations."""
        return self._config_data.get("lists", [])

    def get_list(self, list_id: str) -> dict[str, Any] | None:
        """Get a specific list configuration.

        Merges data from global config (name, sync) and list-specific metadata (person_id).
        """
        # Get base config from global registry
        list_config = None
        for config in self._config_data.get("lists", []):
            if config["id"] == list_id:
                list_config = config.copy()
                break

        if not list_config:
            return None

        # Remove person_id if it was manually added to global config (should never happen)
        if "person_id" in list_config:
            _LOGGER.warning(
                "person_id found in global config for list %s - ignoring (should be in metadata)",
                list_id,
            )
            del list_config["person_id"]

        # Merge in list-specific metadata (person_id, etc.)
        metadata = self._metadata_cache.get(list_id, {})
        list_config.update(metadata)

        return list_config

    async def async_update_list(self, list_id: str, updates: dict[str, Any]) -> bool:
        """Update a list's metadata.

        Args:
            list_id: The list ID to update
            updates: Dictionary of fields to update
                - "name" and "sync": saved to global config
                - "person_id": saved to list-specific metadata

        Returns:
            bool: True if successful, False if list not found
        """
        async with self._lock:
            # Check if list exists
            list_exists = any(
                config["id"] == list_id for config in self._config_data.get("lists", [])
            )
            if not list_exists:
                return False

            # Split updates into global config vs list-specific metadata
            global_updates = {}
            metadata_updates = {}

            for key, value in updates.items():
                if key in ("name", "sync"):
                    global_updates[key] = value
                elif key == "person_id":
                    metadata_updates[key] = value

            # Update global config if needed
            if global_updates:
                for list_config in self._config_data.get("lists", []):
                    if list_config["id"] == list_id:
                        list_config.update(global_updates)
                        await self.async_save_config()
                        break

            # Update list-specific metadata if needed
            if metadata_updates:
                if list_id not in self._metadata_cache:
                    self._metadata_cache[list_id] = {}
                self._metadata_cache[list_id].update(metadata_updates)
                await self.async_save_tasks(list_id)

            return True

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
        """Create a new list.

        Args:
            list_id: The list ID
            name: The list name
            **kwargs: Additional fields
                - "sync": saved to global config
                - "person_id": saved to list-specific metadata
        """
        async with self._lock:
            # Separate person_id from other kwargs
            person_id = kwargs.pop("person_id", None)

            # Create global config entry (without person_id)
            list_config = {"id": list_id, "name": name, **kwargs}
            # Initialize sync dict if not provided
            if "sync" not in list_config:
                list_config["sync"] = {}
            self._config_data.setdefault("lists", []).append(list_config)
            await self.async_save_config()

            # Initialize task storage for new list
            await self._load_tasks_for_list(list_id)

            # Store person_id in list-specific metadata if provided
            if person_id:
                self._metadata_cache[list_id] = {"person_id": person_id}

            # Create the storage file immediately with empty tasks (and metadata)
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
            self._sections_cache.pop(list_id, None)
            self._metadata_cache.pop(list_id, None)
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

    async def async_delete_recurring_task_and_instances(
        self, list_id: str, task_uid: str
    ) -> list[str]:
        """
        Delete a recurring template and all its incomplete instances.
        
        When a user deletes a recurring task, this method:
        1. Finds the template (either directly or via parent_uid)
        2. Deletes all incomplete instances (status != "completed")
        3. Deletes the template itself
        4. Preserves completed instances (historical record)
        
        Args:
            list_id: The list containing the task
            task_uid: UID of the task or instance being deleted
            
        Returns:
            list[str]: List of all deleted UIDs (for sync purposes)
        """
        async with self._lock:
            if list_id not in self._tasks_cache:
                _LOGGER.error("Cannot delete recurring task from unknown list: %s", list_id)
                return []

            cache = self._tasks_cache[list_id]
            deleted_uids = []

            # Resolve template UID
            template_uid = None
            
            # Check if the given UID is a template
            if task_uid in cache["templates"]:
                template_uid = task_uid
                _LOGGER.debug("Task %s is a template", task_uid)
            # Check if the given UID is an instance with parent_uid
            elif task_uid in cache["tasks"]:
                task = cache["tasks"][task_uid]
                if task.parent_uid:
                    template_uid = task.parent_uid
                    _LOGGER.debug("Task %s is an instance with parent %s", task_uid, template_uid)
                else:
                    # Not a recurring task, just delete the single task
                    _LOGGER.warning(
                        "Task %s is not a recurring task, falling back to regular delete",
                        task_uid
                    )
                    await self.async_delete_task(list_id, task_uid)
                    return [task_uid]
            else:
                _LOGGER.error("Task %s not found in list %s", task_uid, list_id)
                return []

            # Verify template exists
            if template_uid not in cache["templates"]:
                _LOGGER.error(
                    "Template %s not found for recurring task deletion (orphaned instance?)",
                    template_uid
                )
                # Fallback: just delete the instance if template is missing
                if task_uid in cache["tasks"]:
                    await self.async_delete_task(list_id, task_uid)
                    return [task_uid]
                return []

            # Get all instances for this template
            instances = [
                task for task in cache["tasks"].values()
                if task.parent_uid == template_uid
            ]

            _LOGGER.info(
                "Deleting recurring task: template=%s, total_instances=%d",
                template_uid,
                len(instances)
            )

            # Delete incomplete instances only (preserve completed instances)
            for instance in instances:
                if instance.status != "completed" and not instance.is_deleted():
                    _LOGGER.debug(
                        "Deleting incomplete instance: %s (status=%s)",
                        instance.uid,
                        instance.status
                    )
                    instance.mark_deleted()
                    del cache["tasks"][instance.uid]
                    deleted_uids.append(instance.uid)
                else:
                    _LOGGER.debug(
                        "Preserving instance: %s (status=%s, deleted=%s)",
                        instance.uid,
                        instance.status,
                        instance.is_deleted()
                    )

            # Delete the template
            template = cache["templates"][template_uid]
            template.mark_deleted()
            del cache["templates"][template_uid]
            deleted_uids.append(template_uid)

            _LOGGER.info(
                "Deleted recurring task: template + %d incomplete instances (preserved %d completed)",
                len(deleted_uids) - 1,  # -1 for template
                len([i for i in instances if i.status == "completed"])
            )

            # Save changes
            await self.async_save_tasks(list_id)

            return deleted_uids

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
        """Archive all completed tasks (recurring instances and regular tasks) more than N days ago.
        
        Returns count archived.
        """
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

            # Find tasks to archive (all completed tasks older than cutoff)
            # This includes both recurring instances and regular tasks
            to_archive = [
                task
                for task in all_tasks
                if task.status == "completed"
                and task.modified < cutoff_str
            ]

            if not to_archive:
                return 0

            # Count by type for logging
            recurring_count = sum(1 for t in to_archive if t.is_recurring_instance())
            regular_count = len(to_archive) - recurring_count
            
            _LOGGER.info(
                "Archiving %d old completed tasks from list %s (%d recurring instances, %d regular tasks)",
                len(to_archive), list_id, recurring_count, regular_count
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

    def get_sections_for_list(self, list_id: str) -> list[dict[str, Any]]:
        """Get all sections for a list.

        Returns:
            List of section dicts with id, name, and sort_order
        """
        # CRITICAL: Must return the actual cached list, not a default empty list
        # If list_id is not in cache, initialize it properly
        if list_id not in self._sections_cache:
            _LOGGER.warning("Sections cache miss for list %s, initializing empty list", list_id)
            self._sections_cache[list_id] = []
        return self._sections_cache[list_id]

    async def async_set_sections(
        self, list_id: str, sections: list[dict[str, Any]]
    ) -> None:
        """Set sections for a list.

        Args:
            list_id: The list ID
            sections: List of section dicts with id, name, and sort_order
        """
        async with self._lock:
            if list_id not in self._tasks_cache:
                _LOGGER.error("Cannot set sections for unknown list: %s", list_id)
                return

            # Store the sections list directly - caller has already modified it
            self._sections_cache[list_id] = sections
            await self.async_save_tasks(list_id)

    def get_default_section_id(self, list_id: str) -> str | None:
        """Get the default section ID for a list (highest sort_order).

        Args:
            list_id: The list ID

        Returns:
            The section ID with highest sort_order, or None if no sections
        """
        sections = self._sections_cache.get(list_id, [])
        if not sections:
            return None

        # Find section with highest sort_order
        default_section = max(sections, key=lambda s: s.get("sort_order", 0))
        return default_section.get("id")

    def get_points_display(self) -> dict[str, str]:
        """Get points display configuration.

        Returns:
            dict with "text" and "icon" keys for points display.
            If both are empty, defaults to {"text": "points", "icon": ""}.
            If only one is configured, returns that one with the other empty.
        """
        from .const import (
            CONF_POINTS_DISPLAY,
            CONF_POINTS_ICON,
            CONF_POINTS_TEXT,
            DEFAULT_POINTS_ICON,
            DEFAULT_POINTS_TEXT,
        )

        points_display = self._config_data.get(CONF_POINTS_DISPLAY, {})
        text = points_display.get(CONF_POINTS_TEXT, "")
        icon = points_display.get(CONF_POINTS_ICON, "")

        # If both are empty, default to "points" text
        if not text and not icon:
            text = DEFAULT_POINTS_TEXT

        return {
            CONF_POINTS_TEXT: text,
            CONF_POINTS_ICON: icon,
        }
