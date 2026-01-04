"""Todo platform for ChoreBot integration."""

from __future__ import annotations

from datetime import UTC, date, datetime
import logging

from dateutil.rrule import rrulestr

from homeassistant.components.todo import TodoItem, TodoListEntity
from homeassistant.components.todo.const import TodoItemStatus, TodoListEntityFeature
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

    # Store entity references for service access
    hass.data[DOMAIN]["entities"] = {entity._list_id: entity for entity in entities}

    async_add_entities(entities)
    _LOGGER.info("Entities added successfully")


class ChoreBotList(TodoListEntity):
    """A ChoreBot list (wraps HA's TodoListEntity)."""

    _attr_has_entity_name = False  # Not using devices, so keep simple naming
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.SET_DUE_DATE_ON_ITEM  # For date-only (all-day tasks)
        | TodoListEntityFeature.SET_DUE_DATETIME_ON_ITEM  # For datetime (timed tasks)
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
    )

    def __init__(
        self, hass: HomeAssistant, store: ChoreBotStore, list_id: str, list_name: str
    ) -> None:
        """Initialize the list entity."""
        self.hass = hass
        self._store = store
        self._list_id = list_id
        # Prefix name with "ChoreBot " to ensure entity_id is todo.chorebot_<list_name>
        self._attr_name = f"ChoreBot {list_name}"
        self._attr_unique_id = f"{DOMAIN}_{list_id}"
        self._sync_coordinator = hass.data[DOMAIN].get("sync_coordinator")
        _LOGGER.info("Initialized ChoreBotList entity: %s (id: %s)", list_name, list_id)

    @property
    def todo_items(self) -> list[TodoItem] | None: # pyright: ignore[reportIncompatibleVariableOverride]
        """Return the todo items (HA format)."""
        # Get tasks from store (templates already separated, only returns tasks)
        tasks = self._store.get_tasks_for_list(self._list_id)

        # Filter out soft-deleted tasks
        visible_tasks = [t for t in tasks if not t.is_deleted()]

        _LOGGER.debug(
            "Building todo_items for %s: %d visible tasks",
            self._list_id,
            len(visible_tasks),
        )

        # Convert our Task objects to HA's TodoItem format
        return [self._task_to_todo_item(task) for task in visible_tasks]

    @property
    def extra_state_attributes(self) -> dict: # pyright: ignore[reportIncompatibleVariableOverride]
        """Expose additional ChoreBot data to frontend."""
        # Get tasks (regular tasks and recurring instances)
        tasks = self._store.get_tasks_for_list(self._list_id)
        visible_tasks = [t for t in tasks if not t.is_deleted()]

        # Get templates (for streak lookups)
        templates = self._store.get_templates_for_list(self._list_id)
        visible_templates = [t for t in templates if not t.is_deleted()]

        # Get sections for this list
        # CRITICAL: Deep copy sections to ensure HA detects state changes
        # When extra_state_attributes returns the same list/dict references,
        # HA's state machine won't recognize that the contents changed, causing
        # the UI to show stale data until restart. Deep copy ensures new references.
        import copy
        sections = copy.deepcopy(self._store.get_sections_for_list(self._list_id))

        # Extract all unique tags from tasks and templates
        all_tags = set()
        for task in visible_tasks:
            if task.tags:
                all_tags.update(task.tags)
        for template in visible_templates:
            if template.tags:
                all_tags.update(template.tags)

        _LOGGER.debug(
            "Building extra_state_attributes for %s: %d tasks, %d templates, %d sections, %d tags",
            self._list_id,
            len(visible_tasks),
            len(visible_templates),
            len(sections),
            len(all_tags),
        )

        # Get list metadata (person_id, etc.)
        list_metadata = self._store._metadata_cache.get(self._list_id, {})

        return {
            "chorebot_tasks": [
                {
                    **task.to_dict(),
                    "computed_person_id": self._resolve_person_id_for_task(task),
                }
                for task in visible_tasks
            ],
            "chorebot_templates": [
                template.to_dict() for template in visible_templates
            ],
            "chorebot_sections": sections,
            "chorebot_tags": sorted(list(all_tags)),
            "chorebot_metadata": list_metadata,
        }

    def _task_to_todo_item(self, task: Task) -> TodoItem:
        """Convert our Task to HA's TodoItem format."""
        # Handle due date - return date for all-day tasks, datetime for timed tasks
        due_value = None
        if task.due:
            dt = self._parse_datetime(task.due)
            if dt and task.is_all_day:
                # Return date only for all-day tasks
                due_value = dt.date()
            else:
                # Return datetime for timed tasks
                due_value = dt

        return TodoItem(
            uid=task.uid,
            summary=task.summary,
            description=task.description,
            status=TodoItemStatus.COMPLETED
            if task.status == "completed"
            else TodoItemStatus.NEEDS_ACTION,
            due=due_value,
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
        """Create a new task (standard HA interface)."""
        _LOGGER.info("Creating task via TodoItem: %s", item.summary)

        # Validate required fields
        if not item.summary:
            _LOGGER.error("Cannot create task without summary")
            return

        # Convert due date to ISO string if present and detect all-day
        due_str = None
        is_all_day = False
        if item.due:
            if isinstance(item.due, datetime):
                # Full datetime - timed task
                due_str = item.due.isoformat().replace("+00:00", "Z")
                is_all_day = False
            elif isinstance(item.due, date):
                # Date only - all-day task
                # Convert to datetime at midnight UTC
                due_str = (
                    datetime.combine(item.due, datetime.min.time())
                    .replace(tzinfo=UTC)
                    .isoformat()
                    .replace("+00:00", "Z")
                )
                is_all_day = True

        # Use internal method to create task
        await self.async_create_task_internal(
            summary=item.summary,
            description=item.description,
            due=due_str,
            tags=[],
            rrule=None,
            is_all_day=is_all_day,
        )

    async def async_create_task_internal(
        self,
        summary: str,
        description: str | None = None,
        due: str | None = None,
        tags: list[str] | None = None,
        rrule: str | None = None,
        is_all_day: bool = False,
        section_id: str | None = None,
        points_value: int = 0,
        streak_bonus_points: int = 0,
        streak_bonus_interval: int = 0,
    ) -> None:
        """Internal method to create task(s) - used by both entity and services.

        This is the single source of truth for task creation.
        Handles regular tasks and recurring tasks (template + instance).
        """
        _LOGGER.info(
            "Creating task internally: %s (recurring=%s)", summary, bool(rrule)
        )

        if rrule and due:
            # Create recurring task: template + first instance
            template = Task.create_new(
                summary=summary,
                description=description,
                due=None,  # Templates don't have due dates
                tags=tags or [],
                rrule=rrule,
                is_template=True,
                is_all_day=is_all_day,
                section_id=section_id,
                points_value=points_value,
            )
            # Set bonus fields directly on template (not supported in create_new)
            template.streak_bonus_points = streak_bonus_points
            template.streak_bonus_interval = streak_bonus_interval

            first_instance = Task.create_new(
                summary=summary,
                description=description,
                due=due,
                tags=(tags or []).copy() if tags else [],
                rrule=None,  # Instances don't have rrule
                parent_uid=template.uid,
                is_template=False,
                occurrence_index=0,
                is_all_day=is_all_day,
                section_id=section_id,
                points_value=points_value,
            )
            # Note: Instances do NOT store bonus fields - they reference their parent template

            _LOGGER.debug("Creating recurring task template and first instance")
            await self._store.async_add_task(self._list_id, template)
            await self._store.async_add_task(self._list_id, first_instance)

            # Write state immediately
            self.async_write_ha_state()

            # Push to remote backend if sync is enabled (only sync template for recurring)
            if self._sync_coordinator:
                await self._sync_coordinator.async_push_task(self._list_id, template)
        else:
            # Create regular task
            task = Task.create_new(
                summary=summary,
                description=description,
                due=due,
                tags=tags or [],
                rrule=None,
                is_all_day=is_all_day,
                section_id=section_id,
                points_value=points_value,
            )
            # Set bonus fields (though they won't be used for non-recurring tasks)
            task.streak_bonus_points = streak_bonus_points
            task.streak_bonus_interval = streak_bonus_interval

            await self._store.async_add_task(self._list_id, task)

            # Write state immediately
            _LOGGER.debug(
                "Writing HA state immediately after creating task: %s", task.summary
            )
            self.async_write_ha_state()

            # Push to remote backend if sync is enabled
            if self._sync_coordinator:
                await self._sync_coordinator.async_push_task(self._list_id, task)

    async def async_update_task_internal(
        self,
        uid: str,
        summary: str | None = None,
        description: str | None = None,
        due: str | None = None,
        status: str | None = None,
        tags: list[str] | None = None,
        is_all_day: bool | None = None,
        section_id: str | None = None,
        points_value: int | None = None,
        streak_bonus_points: int | None = None,
        streak_bonus_interval: int | None = None,
        rrule: str | None = None,
        include_future_occurrences: bool = False,
    ) -> None:
        """Internal method to update task - used by both entity and services.

        This is the single source of truth for task updates.
        Only updates fields that are explicitly provided (not None).

        Args:
            uid: Task unique identifier (required)
            All other fields: Optional - only provided fields are updated
            include_future_occurrences: For recurring instances, update template too
        """
        _LOGGER.info(
            "Updating task internally: %s (include_future=%s)",
            uid,
            include_future_occurrences,
        )

        # Get existing task
        task = self._store.get_task(self._list_id, uid)
        if not task:
            _LOGGER.error("Task %s not found in list %s", uid, self._list_id)
            return

        # Prevent updating templates directly (must update via instances)
        if task.is_recurring_template():
            _LOGGER.error(
                "Cannot update recurring templates directly - update via an instance"
            )
            return

        # Track old status for completion logic
        old_status = task.status

        # CONVERSION: Regular task → Recurring task (when rrule is added)
        # Note: Check for truthy rrule, not just non-None, to avoid converting on empty string ""
        if (
            rrule
            and not task.is_recurring_instance()
            and not task.is_recurring_template()
        ):
            _LOGGER.info(
                "Converting regular task %s to recurring task (adding rrule)", uid
            )

            # Create template from current task data
            template = Task.create_new(
                summary=task.summary,
                description=task.description,
                due=None,  # Templates don't have due dates
                tags=task.tags.copy() if task.tags else [],
                rrule=rrule,
                is_template=True,
                is_all_day=task.is_all_day,
                section_id=task.section_id,
                points_value=points_value
                if points_value is not None
                else task.points_value,
            )

            # Set bonus fields on template
            template.streak_bonus_points = (
                streak_bonus_points if streak_bonus_points is not None else 0
            )
            template.streak_bonus_interval = (
                streak_bonus_interval if streak_bonus_interval is not None else 0
            )

            # Convert existing task to first instance
            task.parent_uid = template.uid
            task.occurrence_index = 0
            task.rrule = None  # Instances don't have rrule
            # Remove bonus fields from instance (they belong on template)
            task.streak_bonus_points = 0
            task.streak_bonus_interval = 0

            # Apply any other provided updates to both template and instance
            if summary is not None:
                task.summary = summary
                template.summary = summary
            if description is not None:
                task.description = description
                template.description = description
            if due is not None and due != "":
                task.due = due
            if tags is not None:
                task.tags = tags
                template.tags = tags.copy()
            if is_all_day is not None:
                task.is_all_day = is_all_day
                template.is_all_day = is_all_day
            if section_id is not None:
                task.section_id = section_id
                template.section_id = section_id
            if points_value is not None:
                task.points_value = points_value
                template.points_value = points_value

            # Save template first, then update the instance
            await self._store.async_add_task(self._list_id, template)
            task.update_modified()
            await self._store.async_update_task(self._list_id, task)

            # Write state immediately
            self.async_write_ha_state()

            # Push template to remote backend if sync is enabled
            if self._sync_coordinator:
                await self._sync_coordinator.async_push_task(self._list_id, template)

            return  # Exit early, conversion complete

        # If updating future occurrences for recurring instance, validate and update template
        if include_future_occurrences and task.is_recurring_instance():
            # Validate this is the latest incomplete instance
            if not self._is_latest_incomplete_instance(task):
                _LOGGER.error(
                    "Can only update future occurrences from the latest incomplete instance. "
                    "Task %s is not the latest.",
                    uid,
                )
                return

            # Get parent template (parent_uid is guaranteed non-None by is_recurring_instance check)
            assert task.parent_uid is not None
            template = self._store.get_template(self._list_id, task.parent_uid)
            if not template:
                _LOGGER.error("Template not found for instance: %s", task.parent_uid)
                return

            _LOGGER.debug("Updating template %s for future occurrences", template.uid)

            # Update template with all provided fields
            if summary is not None:
                template.summary = summary
            if description is not None:
                template.description = description
            if tags is not None:
                template.tags = tags
            if is_all_day is not None:
                template.is_all_day = is_all_day
            if section_id is not None:
                template.section_id = section_id
            if points_value is not None:
                template.points_value = points_value
            if streak_bonus_points is not None:
                template.streak_bonus_points = streak_bonus_points
            if streak_bonus_interval is not None:
                template.streak_bonus_interval = streak_bonus_interval
            if rrule is not None:
                template.rrule = rrule

            template.update_modified()
            await self._store.async_update_task(self._list_id, template)

        # Update the task instance with all provided fields
        if summary is not None:
            task.summary = summary
        if description is not None:
            task.description = description
        if due is not None:
            # Empty string means clear the due date
            task.due = due if due != "" else None
        if status is not None:
            task.status = status
        if tags is not None:
            task.tags = tags
        if is_all_day is not None:
            task.is_all_day = is_all_day
        if section_id is not None:
            task.section_id = section_id
        if points_value is not None:
            task.points_value = points_value

        # Bonus fields: Only update on regular tasks (not recurring instances)
        # For recurring instances, bonus fields must be updated on the template via include_future_occurrences
        if not task.is_recurring_instance():
            if streak_bonus_points is not None:
                task.streak_bonus_points = streak_bonus_points
            if streak_bonus_interval is not None:
                task.streak_bonus_interval = streak_bonus_interval

        # Check if status changed to completed
        status_changed_to_completed = (
            old_status == "needs_action" and task.status == "completed"
        )

        # Handle points logic (only if status changed)
        new_status = task.status
        if old_status != new_status:
            await self._handle_points_for_status_change(task, old_status, new_status)

        # Handle recurring instance completion
        if status_changed_to_completed and task.is_recurring_instance():
            await self._handle_recurring_instance_completion(task)
        else:
            # Set last_completed timestamp for any task being marked completed
            if status_changed_to_completed:
                task.last_completed = (
                    datetime.now(UTC).isoformat().replace("+00:00", "Z")
                )

            task.update_modified()
            await self._store.async_update_task(self._list_id, task)

            # Write state immediately
            self.async_write_ha_state()

            # Push to remote backend if sync is enabled
            if self._sync_coordinator:
                await self._sync_coordinator.async_push_task(self._list_id, task)

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Update a task (standard HA interface)."""
        _LOGGER.info("Updating task via TodoItem: %s (uid: %s)", item.summary, item.uid)

        # Validate required fields
        if not item.uid:
            _LOGGER.error("Cannot update task without uid")
            return

        # Convert due date to ISO string if present and detect all-day
        due_str = None
        is_all_day = None
        if item.due:
            if isinstance(item.due, datetime):
                # Full datetime - timed task
                due_str = item.due.isoformat().replace("+00:00", "Z")
                is_all_day = False
            elif isinstance(item.due, date):
                # Date only - all-day task
                # Convert to datetime at midnight UTC
                due_str = (
                    datetime.combine(item.due, datetime.min.time())
                    .replace(tzinfo=UTC)
                    .isoformat()
                    .replace("+00:00", "Z")
                )
                is_all_day = True

        # Convert status
        status = (
            "completed" if item.status == TodoItemStatus.COMPLETED else "needs_action"
        )

        # Use internal method - single source of truth!
        await self.async_update_task_internal(
            uid=item.uid,
            summary=item.summary,
            description=item.description,
            due=due_str,
            status=status,
            is_all_day=is_all_day,
            # TodoItem doesn't support tags, points, rrule, etc.
            # Those can only be updated via chorebot.update_task service
        )

    async def _handle_points_for_status_change(
        self,
        task: Task,
        old_status: str,
        new_status: str,
    ) -> None:
        """Handle point awards/deductions on status change."""
        # Get people store
        people_store = self.hass.data[DOMAIN].get("people_store")
        if not people_store:
            return

        # Only award points if task has points_value
        if task.points_value == 0:
            return

        # Resolve person_id
        person_id = self._resolve_person_id_for_task(task)
        if not person_id:
            return

        # Validate person exists in HA
        if not self._validate_person_entity(person_id):
            _LOGGER.warning("Person entity not found: %s", person_id)
            return

        # Handle completion
        if new_status == "completed" and old_status == "needs_action":
            # Award base points
            await people_store.async_add_points(
                person_id,
                task.points_value,
                "task_completion",
                {
                    "task_uid": task.uid,
                    "task_summary": task.summary,
                    "list_id": self._list_id,
                },
            )

            # Check for streak bonus (recurring tasks only)
            if task.is_recurring_instance() and task.streak_bonus_points > 0:
                # parent_uid is guaranteed non-None by is_recurring_instance check
                assert task.parent_uid is not None
                template = self._store.get_template(self._list_id, task.parent_uid)
                if template and template.streak_bonus_interval > 0:
                    # Check if current streak is a milestone
                    if (
                        template.streak_current > 0
                        and template.streak_current % template.streak_bonus_interval
                        == 0
                    ):
                        await people_store.async_add_points(
                            person_id,
                            template.streak_bonus_points,
                            "streak_bonus",
                            {
                                "task_uid": task.uid,
                                "task_summary": task.summary,
                                "streak": template.streak_current,
                            },
                        )
                        _LOGGER.info(
                            "Awarded streak bonus: %d points for %d-day streak",
                            template.streak_bonus_points,
                            template.streak_current,
                        )

            # Trigger immediate sensor update
            points_sensor = self.hass.data[DOMAIN].get("points_sensor")
            if points_sensor:
                points_sensor.async_write_ha_state()
                _LOGGER.debug("Triggered points sensor update after task completion")

        # Handle uncomplete
        elif new_status == "needs_action" and old_status == "completed":
            # Deduct points (no streak bonus deduction)
            await people_store.async_add_points(
                person_id,
                -task.points_value,
                "task_uncomplete",
                {
                    "task_uid": task.uid,
                    "task_summary": task.summary,
                    "list_id": self._list_id,
                },
            )

            # Disassociate recurring instances from template to prevent farming
            # This converts the instance into a regular one-time task
            if task.is_recurring_instance():
                _LOGGER.info(
                    "Disassociating uncompleted recurring instance %s from template %s",
                    task.uid,
                    task.parent_uid,
                )
                task.parent_uid = None
                task.occurrence_index = 0

            # Trigger immediate sensor update
            points_sensor = self.hass.data[DOMAIN].get("points_sensor")
            if points_sensor:
                points_sensor.async_write_ha_state()
                _LOGGER.debug("Triggered points sensor update after task uncomplete")

    def _resolve_person_id_for_task(self, task: Task) -> str | None:
        """Resolve person_id: section > list > None."""
        # 1. Check task's section for person_id
        if task.section_id:
            sections = self._store.get_sections_for_list(self._list_id)
            for section in sections:
                if section["id"] == task.section_id:
                    if "person_id" in section:
                        return section["person_id"]

        # 2. Fall back to list's person_id
        list_config = self._store.get_list(self._list_id)
        if list_config:
            return list_config.get("person_id")

        # 3. If neither exists, return None (no points awarded)
        return None

    def _validate_person_entity(self, person_id: str) -> bool:
        """Check if person entity exists in HA."""
        return person_id in self.hass.states.async_entity_ids("person")

    async def _handle_recurring_instance_completion(self, instance: Task) -> None:
        """Handle completion of a recurring task instance."""
        _LOGGER.info("Handling recurring instance completion for: %s", instance.summary)

        if not instance.parent_uid:
            _LOGGER.error("Instance has no parent_uid: %s", instance.uid)
            return

        # Get the template (parent_uid is guaranteed non-None by check above)
        assert instance.parent_uid is not None
        template = self._store.get_template(self._list_id, instance.parent_uid)
        if not template:
            _LOGGER.error("Template not found for instance: %s", instance.parent_uid)
            return

        # Check if completed on time
        completed_on_time = False
        if instance.due:
            due_dt = self._parse_datetime(instance.due)
            if instance.is_all_day:
                # For all-day tasks, compare dates only
                # Task completed "on time" if completed on or before due date
                now = datetime.now(UTC)
                completed_on_time = due_dt and now.date() <= due_dt.date()
            else:
                # For timed tasks, compare full datetime
                now = datetime.now(due_dt.tzinfo if due_dt else None)
                completed_on_time = due_dt and now <= due_dt

        # Update streak on template (strict consecutive)
        if completed_on_time:
            template.streak_current += 1
            template.streak_longest = max(
                template.streak_longest, template.streak_current
            )
            _LOGGER.info(
                "Streak incremented for template %s: current=%d, longest=%d",
                template.summary,
                template.streak_current,
                template.streak_longest,
            )
        else:
            _LOGGER.info(
                "Instance completed late, resetting streak for: %s", template.summary
            )
            template.streak_current = 0

        # Mark instance as completed
        instance.status = "completed"
        instance.last_completed = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        instance.update_modified()

        # Check if next instance already exists (e.g., if this was uncompleted then re-completed)
        next_occurrence_index = instance.occurrence_index + 1
        instances = self._store.get_instances_for_template(self._list_id, template.uid)
        next_instance_exists = any(
            inst.occurrence_index == next_occurrence_index for inst in instances
        )

        if next_instance_exists:
            _LOGGER.info(
                "Next instance already exists for occurrence_index %d, skipping creation",
                next_occurrence_index,
            )
            # Just save the completed instance and updated template
            await self._store.async_update_task(self._list_id, instance)
            template.update_modified()
            await self._store.async_update_task(self._list_id, template)

            # Write state immediately
            self.async_write_ha_state()
        else:
            # Calculate next due date from template
            next_due = self._calculate_next_due_date_from_template(
                template, instance.due
            )

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
                    occurrence_index=next_occurrence_index,
                    is_all_day=template.is_all_day,  # Inherit from template
                )

                _LOGGER.info("Created new instance for next occurrence: %s", next_due)

                # Save: update instance, update template, add new instance
                await self._store.async_update_task(self._list_id, instance)
                template.update_modified()
                await self._store.async_update_task(self._list_id, template)
                await self._store.async_add_task(self._list_id, new_instance)

                # Write state immediately before sync
                self.async_write_ha_state()

                # Sync to remote backend if enabled (non-blocking for frontend)
                if self._sync_coordinator:
                    # Complete the remote task (will auto-create next instance on their end)
                    await self._sync_coordinator.async_complete_task(
                        self._list_id, template
                    )
                    # Push updated template (with new streaks and metadata)
                    await self._sync_coordinator.async_push_task(
                        self._list_id, template
                    )

            else:
                _LOGGER.warning(
                    "Could not calculate next occurrence for template: %s", template.uid
                )
                # Just save the completed instance
                await self._store.async_update_task(self._list_id, instance)

                # Write state immediately
                self.async_write_ha_state()

                # Sync to remote backend if enabled (non-blocking for frontend)
                if self._sync_coordinator:
                    await self._sync_coordinator.async_complete_task(
                        self._list_id, template
                    )
                    await self._sync_coordinator.async_push_task(
                        self._list_id, template
                    )

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
            _LOGGER.error(
                "Error calculating next due date for template %s: %s", template.uid, e
            )
            return None

    def _is_latest_incomplete_instance(self, task: Task) -> bool:
        """Check if this is the latest incomplete instance of its template.

        Used to validate that template updates via include_future_occurrences
        are always done from the most recent incomplete instance.
        """
        if not task.is_recurring_instance():
            return False

        # parent_uid is guaranteed non-None by is_recurring_instance check
        assert task.parent_uid is not None
        instances = self._store.get_instances_for_template(
            self._list_id, task.parent_uid
        )
        incomplete_instances = [
            i for i in instances if i.status == "needs_action" and not i.is_deleted()
        ]

        if not incomplete_instances:
            return False

        latest = max(incomplete_instances, key=lambda i: i.occurrence_index)
        return task.uid == latest.uid

    async def async_delete_todo_item(self, uid: str) -> None:
        """Delete a task (soft delete)."""
        _LOGGER.info("Soft deleting task: %s", uid)

        # Get task before deleting (need it for sync)
        task = self._store.get_task(self._list_id, uid)

        # Soft delete in store
        await self._store.async_delete_task(self._list_id, uid)

        # Write state immediately
        self.async_write_ha_state()

        # Delete from remote backend if sync is enabled (non-blocking for frontend)
        if self._sync_coordinator and task:
            await self._sync_coordinator.async_delete_task(self._list_id, task)

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        """Delete multiple tasks (soft delete). Handles recurring tasks intelligently."""
        _LOGGER.info("Soft deleting %d tasks", len(uids))

        all_deleted_uids = []  # Collect all deleted UIDs for sync

        for uid in uids:
            task = self._store.get_task(self._list_id, uid)
            
            if task and task.is_recurring():
                # Recurring task: delete template + all incomplete instances
                _LOGGER.info(
                    "Deleting recurring task '%s' (uid: %s) - will delete template and all incomplete instances",
                    task.summary,
                    uid
                )
                deleted_uids = await self._store.async_delete_recurring_task_and_instances(
                    self._list_id, uid
                )
                all_deleted_uids.extend(deleted_uids)
                _LOGGER.info(
                    "Deleted recurring task: %d total items (template + incomplete instances)",
                    len(deleted_uids)
                )
            else:
                # Regular task: use existing logic
                await self._store.async_delete_task(self._list_id, uid)
                all_deleted_uids.append(uid)

        # Write state immediately
        self.async_write_ha_state()

        # Delete from remote backend if sync is enabled (non-blocking for frontend)
        # Note: We need to get tasks from storage (not cache) because they were just deleted
        if self._sync_coordinator:
            for uid in all_deleted_uids:
                # Get task from storage (includes deleted tasks with deleted_at set)
                # The sync coordinator needs the task object to extract sync metadata
                task = self._store.get_task(self._list_id, uid)
                if task:
                    await self._sync_coordinator.async_delete_task(self._list_id, task)
