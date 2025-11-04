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
        if status_changed_to_completed and task.is_recurring_instance():
            await self._handle_recurring_instance_completion(task)
        else:
            task.update_modified()
            # Save to store
            await self._store.async_update_task(self._list_id, task)

        self.async_write_ha_state()

    async def _handle_recurring_instance_completion(self, instance: Task) -> None:
        """Handle completion of a recurring task instance."""
        _LOGGER.info("Handling recurring instance completion for: %s", instance.summary)

        if not instance.parent_uid:
            _LOGGER.error("Instance has no parent_uid: %s", instance.uid)
            return

        # Get the template
        template = self._store.get_template(self._list_id, instance.parent_uid)
        if not template:
            _LOGGER.error("Template not found for instance: %s", instance.parent_uid)
            return

        # Check if completed on time
        completed_on_time = False
        if instance.due:
            due_dt = self._parse_datetime(instance.due)
            now = datetime.now(due_dt.tzinfo if due_dt else None)
            completed_on_time = due_dt and now <= due_dt

        # Update streak on template (strict consecutive)
        if completed_on_time:
            template.streak_current += 1
            template.streak_longest = max(template.streak_longest, template.streak_current)
            _LOGGER.info(
                "Streak incremented for template %s: current=%d, longest=%d",
                template.summary,
                template.streak_current,
                template.streak_longest,
            )
        else:
            _LOGGER.info("Instance completed late, resetting streak for: %s", template.summary)
            template.streak_current = 0

        # Mark instance as completed
        instance.status = "completed"
        instance.last_completed = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        instance.update_modified()

        # Calculate next due date from template
        next_due = self._calculate_next_due_date_from_template(template, instance.due)

        if next_due:
            # Create new instance from template
            new_instance = Task.create_new(
                summary=template.summary,
                description=template.description,
                due=next_due.isoformat().replace("+00:00", "Z"),
                tags=template.tags.copy(),
                rrule=None,  # Instances don't have rrule
                points_value=template.points_value,
                parent_uid=template.uid,
                is_template=False,
                occurrence_index=instance.occurrence_index + 1,
            )
            new_instance.streak_current = template.streak_current
            new_instance.streak_longest = template.streak_longest

            _LOGGER.info("Created new instance for next occurrence: %s", next_due)

            # Save: update instance, update template, add new instance
            await self._store.async_update_task(self._list_id, instance)
            template.update_modified()
            await self._store.async_update_task(self._list_id, template)
            await self._store.async_add_task(self._list_id, new_instance)
        else:
            _LOGGER.warning("Could not calculate next occurrence for template: %s", template.uid)
            # Just save the completed instance
            await self._store.async_update_task(self._list_id, instance)

    def _calculate_next_due_date_from_template(
        self, template: Task, current_due_str: str | None
    ) -> datetime | None:
        """Calculate next due date from template's rrule."""
        if not template.rrule or not current_due_str:
            return None

        try:
            # Parse current due date
            current_due = self._parse_datetime(current_due_str)
            if not current_due:
                return None

            # Parse rrule from template
            # Create a rrule from the string, starting from current due date
            rule = rrulestr(template.rrule, dtstart=current_due)

            # Get next occurrence after current due date
            return rule.after(current_due)
        except (ValueError, TypeError, AttributeError) as e:
            _LOGGER.error("Error calculating next due date for template %s: %s", template.uid, e)
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
