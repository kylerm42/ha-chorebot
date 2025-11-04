"""Generic synchronization coordinator for ChoreBot."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
import logging
from typing import Any

from homeassistant.core import HomeAssistant

from .sync_backend import SyncBackend
from .task import Task

_LOGGER = logging.getLogger(__name__)


class SyncCoordinator:
    """Coordinates synchronization between local storage and remote backend."""

    def __init__(
        self,
        hass: HomeAssistant,
        backend: SyncBackend,
    ) -> None:
        """Initialize the sync coordinator."""
        self.hass = hass
        self.backend = backend
        self._lock = asyncio.Lock()
        self._sync_in_progress = False
        self._last_sync_time: datetime | None = None

    @property
    def enabled(self) -> bool:
        """Return whether sync is enabled (backend is initialized)."""
        return self.backend is not None

    async def async_initialize(self) -> bool:
        """Initialize the backend."""
        if not self.backend:
            return False

        return await self.backend.async_initialize()

    async def async_push_task(self, list_id: str, task: Task) -> bool:
        """Push a local task to the remote backend.

        Args:
            list_id: Local list ID
            task: Task to push

        Returns:
            bool: True if successful, False otherwise.
        """
        if not self.backend:
            return False

        try:
            return await self.backend.async_push_task(list_id, task)
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Error pushing task: %s", err)
            return False

    async def async_delete_task(self, list_id: str, task: Task) -> bool:
        """Delete a task from the remote backend.

        Args:
            list_id: Local list ID
            task: Task to delete

        Returns:
            bool: True if successful, False otherwise.
        """
        if not self.backend:
            return False

        try:
            return await self.backend.async_delete_task(list_id, task)
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Error deleting task: %s", err)
            return False

    async def async_complete_task(self, list_id: str, task: Task) -> bool:
        """Mark a task as completed on the remote backend.

        Args:
            list_id: Local list ID
            task: Task to complete

        Returns:
            bool: True if successful, False otherwise.
        """
        if not self.backend:
            return False

        try:
            return await self.backend.async_complete_task(list_id, task)
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Error completing task: %s", err)
            return False

    async def async_pull_changes(self, list_id: str | None = None) -> dict[str, int]:
        """Pull changes from the remote backend.

        Args:
            list_id: Optional list ID to sync. If None, syncs all mapped lists.

        Returns:
            dict: Statistics with keys "created", "updated", "deleted"
        """
        if not self.backend:
            return {"created": 0, "updated": 0, "deleted": 0}

        if self._sync_in_progress:
            _LOGGER.warning("Sync already in progress, skipping")
            return {"created": 0, "updated": 0, "deleted": 0}

        async with self._lock:
            self._sync_in_progress = True

            try:
                stats = await self.backend.async_pull_changes(list_id)
            except Exception as err:  # noqa: BLE001
                _LOGGER.error("Error during pull sync: %s", err)
                return {"created": 0, "updated": 0, "deleted": 0}
            else:
                self._last_sync_time = datetime.now(UTC)
                return stats
            finally:
                self._sync_in_progress = False

    async def async_create_list(self, list_id: str, name: str) -> str | None:
        """Create a new list/project on the remote backend.

        Args:
            list_id: Local list ID
            name: Display name for the list

        Returns:
            str | None: Remote list/project ID if successful, None otherwise.
        """
        if not self.backend:
            return None

        try:
            return await self.backend.async_create_list(list_id, name)
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Error creating list: %s", err)
            return None

    def get_list_mappings(self) -> dict[str, str]:
        """Get current list mappings from backend.

        Returns:
            dict: Mapping of local list IDs to remote IDs
        """
        if not self.backend:
            return {}

        return self.backend.get_list_mappings()

    async def async_get_remote_lists(self) -> list[dict[str, Any]]:
        """Get all available lists from the remote backend.

        Returns:
            list: List of dicts with keys "id", "name", etc.
        """
        if not self.backend:
            return []

        try:
            return await self.backend.async_get_remote_lists()
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Error getting remote lists: %s", err)
            return []

    @property
    def last_sync_time(self) -> datetime | None:
        """Return the last successful sync time."""
        return self._last_sync_time

    @property
    def is_syncing(self) -> bool:
        """Return whether a sync is currently in progress."""
        return self._sync_in_progress
