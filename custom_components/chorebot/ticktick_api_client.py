"""TickTick REST API client."""

from __future__ import annotations

import logging
from typing import Any

from aiohttp import ClientResponse, ClientSession

from .const import TICKTICK_API_BASE

_LOGGER = logging.getLogger(__name__)


class TickTickAPIClient:
    """Lightweight REST API client for TickTick Open API."""

    def __init__(self, access_token: str, session: ClientSession) -> None:
        """Initialize the TickTick API client."""
        self._headers = {"Authorization": f"Bearer {access_token}"}
        self._session = session

    # === Project/List Operations ===

    async def get_projects(self) -> list[dict[str, Any]]:
        """Get all projects (lists) from TickTick.

        Returns:
            list: List of project dicts with "id", "name", "kind", etc.
        """
        response = await self._get_list(f"{TICKTICK_API_BASE}/project")
        # Filter to only task lists (not notes) and non-closed projects
        return [
            project
            for project in response
            if project.get("kind") == "TASK" and not project.get("closed", False)
        ]

    async def get_project_with_tasks(self, project_id: str) -> dict[str, Any]:
        """Get detailed project data including all tasks.

        Args:
            project_id: TickTick project ID

        Returns:
            dict: Project data with "tasks" list
        """
        return await self._get_dict(f"{TICKTICK_API_BASE}/project/{project_id}/data")

    async def create_project(self, name: str) -> dict[str, Any]:
        """Create a new project (list).

        Args:
            name: Project name

        Returns:
            dict: Created project with "id", "name", etc.
        """
        payload = {"name": name}
        return await self._post(f"{TICKTICK_API_BASE}/project", payload)

    # === Task Operations ===

    async def get_task(self, project_id: str, task_id: str) -> dict[str, Any]:
        """Get a specific task.

        Args:
            project_id: TickTick project ID
            task_id: TickTick task ID

        Returns:
            dict: Task data
        """
        return await self._get_dict(
            f"{TICKTICK_API_BASE}/project/{project_id}/task/{task_id}"
        )

    async def create_task(self, task_data: dict[str, Any]) -> dict[str, Any]:
        """Create a new task.

        Args:
            task_data: Task data dict (must include "projectId", "title", etc.)

        Returns:
            dict: Created task with "id"
        """
        return await self._post(f"{TICKTICK_API_BASE}/task", task_data)

    async def update_task(self, task_id: str, task_data: dict[str, Any]) -> dict[str, Any]:
        """Update an existing task.

        Args:
            task_id: TickTick task ID
            task_data: Updated task data

        Returns:
            dict: Updated task
        """
        return await self._post(f"{TICKTICK_API_BASE}/task/{task_id}", task_data)

    async def complete_task(self, project_id: str, task_id: str) -> dict[str, Any]:
        """Mark a task as completed.

        Args:
            project_id: TickTick project ID
            task_id: TickTick task ID

        Returns:
            dict: Response data
        """
        return await self._post(
            f"{TICKTICK_API_BASE}/project/{project_id}/task/{task_id}/complete"
        )

    async def delete_task(self, project_id: str, task_id: str) -> dict[str, Any]:
        """Delete a task.

        Args:
            project_id: TickTick project ID
            task_id: TickTick task ID

        Returns:
            dict: Response data
        """
        return await self._delete(
            f"{TICKTICK_API_BASE}/project/{project_id}/task/{task_id}"
        )

    # === HTTP Methods ===

    async def _get(self, url: str) -> dict[str, Any] | list[dict[str, Any]]:
        """Perform GET request."""
        try:
            response = await self._session.get(url, headers=self._headers)
            return await self._get_response(response)
        except Exception as err:
            _LOGGER.error("GET request failed for %s: %s", url, err)
            raise

    async def _get_dict(self, url: str) -> dict[str, Any]:
        """Perform GET request expecting a dict response."""
        result = await self._get(url)
        if isinstance(result, dict):
            return result
        _LOGGER.error("Expected dict response but got list for %s", url)
        raise TypeError(f"Expected dict response but got list for {url}")

    async def _get_list(self, url: str) -> list[dict[str, Any]]:
        """Perform GET request expecting a list response."""
        result = await self._get(url)
        if isinstance(result, list):
            return result
        _LOGGER.error("Expected list response but got dict for %s", url)
        raise TypeError(f"Expected list response but got dict for {url}")

    async def _post(
        self, url: str, json_body: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Perform POST request."""
        try:
            headers = {**self._headers, "Content-Type": "application/json"}
            response = await self._session.post(
                url, headers=headers, json=json_body if json_body else None
            )
            return await self._get_response_dict(response)
        except Exception as err:
            _LOGGER.error("POST request failed for %s: %s", url, err)
            raise

    async def _delete(self, url: str) -> dict[str, Any]:
        """Perform DELETE request."""
        try:
            response = await self._session.delete(url, headers=self._headers)
            return await self._get_response_dict(response)
        except Exception as err:
            _LOGGER.error("DELETE request failed for %s: %s", url, err)
            raise

    async def _get_response(
        self, response: ClientResponse
    ) -> dict[str, Any] | list[dict[str, Any]]:
        """Process response and return JSON data."""
        if response.ok:
            try:
                json_data = await response.json()
            except (ValueError, TypeError):
                # Response has no JSON body (e.g., DELETE operations)
                return {"status": "success"}
            else:
                if json_data is None:
                    return {"status": "success"}
                return json_data

        # Error response
        error_msg = f"TickTick API error: {response.status}"
        try:
            error_data = await response.json()
            error_msg += f" - {error_data}"
        except (ValueError, TypeError):
            error_msg += f" - {await response.text()}"

        _LOGGER.error(error_msg)
        raise Exception(error_msg)  # noqa: TRY002

    async def _get_response_dict(self, response: ClientResponse) -> dict[str, Any]:
        """Process response and return JSON data as dict."""
        result = await self._get_response(response)
        if isinstance(result, dict):
            return result
        _LOGGER.error("Expected dict response but got list")
        raise TypeError("Expected dict response but got list")
