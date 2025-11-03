"""Todo platform for ChoreBot integration."""
from __future__ import annotations

from datetime import UTC, datetime
import logging

from dateutil.rrule import rrulestr

from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .store import ChoreBotStore
from .task import Task

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up ChoreBot todo platform."""
    _LOGGER.info("Setting up ChoreBot TODO platform")
    store: ChoreBotStore = hass.data[DOMAIN]["store"]

    # Get all lists from store
    lists = store.get_all_lists()
    _LOGGER.info("Found %d lists to set up", len(lists))

    # Create entity for each list
    entities = [
        ChoreBotList(hass, store, list_config["id"], list_config["name"])
        for list_config in lists
    ]
    _LOGGER.info("Created %d entities", len(entities))

    async_add_entities(entities)
    _LOGGER.info("Entities added successfully")


class ChoreBotList(TodoListEntity):
    """A ChoreBot list (wraps HA's TodoListEntity)."""

    _attr_has_entity_name = False  # Not using devices, so keep simple naming
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.SET_DUE_DATE_ON_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
    )

    def __init__(
        self, hass: HomeAssistant, store: ChoreBotStore, list_id: str, list_name: str
    ) -> None:
        """Initialize the list entity."""
        self.hass = hass
        self._store = store
        self._list_id = list_id
        self._attr_name = list_name
        self._attr_unique_id = f"{DOMAIN}_{list_id}"
        _LOGGER.info("Initialized ChoreBotList entity: %s (id: %s)", list_name, list_id)

    @property
    def todo_items(self) -> list[TodoItem]:
        """Return the todo items (HA format)."""
        # Get tasks from store (already filtered for non-deleted)
        tasks = self._store.get_tasks_for_list(self._list_id)

        # Convert our Task objects to HA's TodoItem format
        return [self._task_to_todo_item(task) for task in tasks]

    def _task_to_todo_item(self, task: Task) -> TodoItem:
        """Convert our Task to HA's TodoItem format."""
        return TodoItem(
            uid=task.uid,
            summary=task.summary,
            description=task.description,
            status=TodoItemStatus.COMPLETED
            if task.status == "completed"
            else TodoItemStatus.NEEDS_ACTION,
            due=self._parse_datetime(task.due) if task.due else None,
        )

    def _parse_datetime(self, date_str: str | None) -> datetime | None:
        """Parse ISO 8601 datetime string."""
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str)
        except (ValueError, AttributeError):
            return None

    async def async_create_todo_item(self, item: TodoItem) -> None:
        """Create a new task."""
        _LOGGER.info("Creating task: %s", item.summary)

        # Validate required fields
        if not item.summary:
            _LOGGER.error("Cannot create task without summary")
            return

        # Convert due date to ISO string if present
        due_str = None
        if item.due:
            due_str = item.due.isoformat().replace("+00:00", "Z")

        # Create new task
        task = Task.create_new(
            summary=item.summary,
            description=item.description,
            due=due_str,
        )

        # Save to store
        await self._store.async_add_task(self._list_id, task)
        self.async_write_ha_state()

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Update a task."""
        _LOGGER.info("Updating task: %s (uid: %s)", item.summary, item.uid)

        # Validate required fields
        if not item.uid:
            _LOGGER.error("Cannot update task without uid")
            return

        # Get existing task
        task = self._store.get_task(self._list_id, item.uid)
        if not task:
            _LOGGER.error("Task %s not found in list %s", item.uid, self._list_id)
            return

        # Check if status changed from needs_action to completed
        old_status = task.status
        new_status = "completed" if item.status == TodoItemStatus.COMPLETED else "needs_action"
        status_changed_to_completed = old_status == "needs_action" and new_status == "completed"

        # Update basic fields (keep existing values if new values are None)
        if item.summary is not None:
            task.summary = item.summary
        if item.description is not None:
            task.description = item.description
        task.status = new_status

        # Handle due date
        if item.due:
            task.due = item.due.isoformat().replace("+00:00", "Z")

        # Handle recurring task completion (includes streak update)
        if status_changed_to_completed and task.is_recurring():
            await self._handle_recurring_task_completion(task)

        task.update_modified()

        # Save to store
        await self._store.async_update_task(self._list_id, task)
        self.async_write_ha_state()

    async def _handle_recurring_task_completion(self, task: Task) -> None:
        """Handle completion of a recurring task."""
        _LOGGER.info("Handling recurring task completion for: %s", task.summary)

        # Update streak
        self._update_streak_on_completion(task)

        # Calculate next due date
        next_due = self._calculate_next_due_date(task)

        if next_due:
            # Update task for next occurrence
            task.last_completed = datetime.now(UTC).isoformat().replace("+00:00", "Z")
            task.due = next_due.isoformat().replace("+00:00", "Z")
            task.status = "needs_action"  # Reset status
            _LOGGER.info("Next occurrence scheduled for: %s", task.due)
        else:
            _LOGGER.warning("Could not calculate next occurrence for task: %s", task.uid)

    def _update_streak_on_completion(self, task: Task) -> None:
        """Update streak counters based on completion timing."""
        if not task.is_recurring():
            return

        # Check if completed on or before due date
        if task.due:
            due_dt = self._parse_datetime(task.due)
            now = datetime.now(due_dt.tzinfo if due_dt else None)

            if due_dt and now <= due_dt:
                # Completed on time - increment streak
                task.streak_current += 1
                task.streak_longest = max(task.streak_longest, task.streak_current)
                _LOGGER.info(
                    "Streak incremented for task %s: current=%d, longest=%d",
                    task.summary,
                    task.streak_current,
                    task.streak_longest,
                )
            else:
                # Completed late - reset streak
                _LOGGER.info("Task completed late, resetting streak for: %s", task.summary)
                task.streak_current = 0

    def _calculate_next_due_date(self, task: Task) -> datetime | None:
        """Calculate next due date for recurring task."""
        if not task.rrule or not task.due:
            return None

        try:
            # Parse current due date
            current_due = self._parse_datetime(task.due)
            if not current_due:
                return None

            # Parse rrule
            # Create a rrule from the string, starting from current due date
            rule = rrulestr(task.rrule, dtstart=current_due)

            # Get next occurrence after current due date
            return rule.after(current_due)
        except (ValueError, TypeError, AttributeError) as e:
            _LOGGER.error("Error calculating next due date for task %s: %s", task.uid, e)
            return None

    async def async_delete_todo_item(self, uid: str) -> None:
        """Delete a task (soft delete)."""
        _LOGGER.info("Soft deleting task: %s", uid)

        # Soft delete in store
        await self._store.async_delete_task(self._list_id, uid)
        self.async_write_ha_state()

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        """Delete multiple tasks (soft delete)."""
        _LOGGER.info("Soft deleting %d tasks", len(uids))

        # Soft delete each task in store
        for uid in uids:
            await self._store.async_delete_task(self._list_id, uid)

        self.async_write_ha_state()
