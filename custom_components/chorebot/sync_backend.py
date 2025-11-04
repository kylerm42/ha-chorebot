"""Abstract base class for sync backends."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .task import Task


class SyncBackend(ABC):
    """Abstract base class for synchronization backends (TickTick, Todoist, etc.)."""

    @abstractmethod
    async def async_initialize(self) -> bool:
        """Initialize the backend client and authentication.

        Returns:
            bool: True if initialization successful, False otherwise.
        """

    @abstractmethod
    async def async_push_task(self, list_id: str, task: Task) -> bool:
        """Push a local task to the remote backend.

        Args:
            list_id: Local list ID
            task: Task to push

        Returns:
            bool: True if successful, False otherwise.
        """

    @abstractmethod
    async def async_delete_task(self, list_id: str, task: Task) -> bool:
        """Delete a task from the remote backend.

        Args:
            list_id: Local list ID
            task: Task to delete

        Returns:
            bool: True if successful, False otherwise.
        """

    @abstractmethod
    async def async_complete_task(self, list_id: str, task: Task) -> bool:
        """Mark a task as completed on the remote backend.

        Args:
            list_id: Local list ID
            task: Task to complete

        Returns:
            bool: True if successful, False otherwise.
        """

    @abstractmethod
    async def async_pull_changes(self, list_id: str | None = None) -> dict[str, int]:
        """Pull changes from the remote backend and return stats.

        Args:
            list_id: Optional list ID to sync. If None, syncs all mapped lists.

        Returns:
            dict: Statistics with keys "created", "updated", "deleted"
        """

    @abstractmethod
    async def async_create_list(self, list_id: str, name: str) -> str | None:
        """Create a new list/project on the remote backend.

        Args:
            list_id: Local list ID
            name: Display name for the list

        Returns:
            str | None: Remote list/project ID if successful, None otherwise.
        """

    @abstractmethod
    def get_list_mappings(self) -> dict[str, str]:
        """Get current list mappings (local_list_id -> remote_id).

        Returns:
            dict: Mapping of local list IDs to remote IDs
        """

    @abstractmethod
    async def async_get_remote_lists(self) -> list[dict[str, Any]]:
        """Get all available lists/projects from the remote backend.

        Returns:
            list: List of dicts with keys "id", "name", etc.
        """
