"""The ChoreBot integration."""

from __future__ import annotations

from datetime import timedelta
import logging

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import slugify

from .const import (
    CONF_LIST_MAPPINGS,
    CONF_SYNC_INTERVAL_MINUTES,
    DEFAULT_SYNC_INTERVAL_MINUTES,
    DOMAIN,
    SERVICE_ADD_TASK,
    SERVICE_CREATE_LIST,
    SERVICE_SYNC_TICKTICK,
)
from .store import ChoreBotStore
from .task import Task
from .ticktick_sync import TickTickSyncCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.TODO]

# Service schema for chorebot.create_list
CREATE_LIST_SCHEMA = vol.Schema(
    {
        vol.Required("name"): cv.string,
    }
)

# Service schema for chorebot.add_task
ADD_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("list_id"): cv.string,
        vol.Required("summary"): cv.string,
        vol.Optional("description"): cv.string,
        vol.Optional("due"): cv.datetime,
        vol.Optional("tags"): cv.ensure_list,
        vol.Optional("rrule"): cv.string,
    }
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up ChoreBot from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Initialize data storage layer
    store = ChoreBotStore(hass)
    await store.async_load()

    # Store in hass.data
    hass.data[DOMAIN]["store"] = store
    _LOGGER.info("Store saved to hass.data")

    # Initialize TickTick sync coordinator
    sync_coordinator = TickTickSyncCoordinator(hass, store, entry.data)
    hass.data[DOMAIN]["sync_coordinator"] = sync_coordinator

    # Initialize TickTick client if sync is enabled
    if sync_coordinator.enabled:
        _LOGGER.info("TickTick sync is enabled, initializing client")
        await sync_coordinator.async_initialize()

    # Set up daily maintenance job
    async def daily_maintenance(now):
        """Daily maintenance: archive old instances, hide completed instances, check streaks."""
        _LOGGER.debug("Running daily maintenance job")

        # Get all lists
        lists = store.get_all_lists()

        for list_config in lists:
            list_id = list_config["id"]

            # 1. Archive instances completed 30+ days ago
            archived_count = await store.async_archive_old_instances(list_id, days=30)
            if archived_count > 0:
                _LOGGER.info(
                    "Archived %d old instances from list %s", archived_count, list_id
                )

            # 2. Soft-delete completed recurring instances (hide from UI)
            tasks = store.get_tasks_for_list(list_id)
            for task in tasks:
                if task.is_recurring_instance() and task.status == "completed":
                    _LOGGER.debug("Soft-deleting completed instance: %s", task.summary)
                    task.mark_deleted()
                    await store.async_update_task(list_id, task)

        # 3. Check for overdue instances and reset template streaks
        templates = await store.async_get_all_recurring_templates()

        for list_id, template in templates:
            # Get all instances for this template
            instances = store.get_instances_for_template(list_id, template.uid)

            # Find the most recent instance
            if instances:
                # Sort by occurrence_index descending
                instances.sort(key=lambda t: t.occurrence_index, reverse=True)
                latest_instance = instances[0]

                # If latest instance is overdue and not completed, reset streak
                if latest_instance.is_overdue() and template.streak_current > 0:
                    _LOGGER.info(
                        "Resetting streak for overdue template: %s (was %d)",
                        template.summary,
                        template.streak_current,
                    )
                    template.streak_current = 0
                    template.update_modified()
                    await store.async_update_task(list_id, template)

    # Run daily at midnight
    hass.data[DOMAIN]["daily_maintenance"] = async_track_time_interval(
        hass, daily_maintenance, timedelta(days=1)
    )

    # Set up periodic TickTick sync
    if sync_coordinator.enabled:
        sync_interval_minutes = entry.data.get(
            CONF_SYNC_INTERVAL_MINUTES, DEFAULT_SYNC_INTERVAL_MINUTES
        )

        async def periodic_sync(now):
            """Periodically pull changes from TickTick."""
            _LOGGER.debug("Running periodic TickTick sync")
            await sync_coordinator.async_pull_changes()

        hass.data[DOMAIN]["periodic_sync"] = async_track_time_interval(
            hass, periodic_sync, timedelta(minutes=sync_interval_minutes)
        )
        _LOGGER.info(
            "TickTick periodic sync enabled (interval: %d minutes)",
            sync_interval_minutes,
        )

    # Helper function to extract list_id from entity_id
    def extract_list_id_from_entity(entity_id: str) -> str | None:
        """Extract list_id from entity_id by looking up the unique_id in the entity registry."""
        # Get the entity registry
        registry = er.async_get(hass)

        # Look up the entity
        entity_entry = registry.async_get(entity_id)
        if not entity_entry:
            _LOGGER.error("Entity not found in registry: %s", entity_id)
            return None

        # Extract list_id from unique_id (format: "chorebot_{list_id}")
        unique_id = entity_entry.unique_id
        if unique_id and unique_id.startswith(f"{DOMAIN}_"):
            return unique_id[len(DOMAIN) + 1 :]

        _LOGGER.error("Invalid unique_id format: %s", unique_id)
        return None

    # Register chorebot.create_list service
    async def handle_create_list(call: ServiceCall) -> None:
        """Handle the chorebot.create_list service."""
        name = call.data["name"]

        # Generate list_id from name (lowercase with underscores)
        list_id = slugify(name)

        _LOGGER.info("Creating list via service: %s (id: %s)", name, list_id)

        # Check if list already exists
        if store.get_list(list_id):
            _LOGGER.error(
                "List with id '%s' already exists (from name '%s')", list_id, name
            )
            return

        # Create list in store
        await store.async_create_list(list_id, name)

        # Auto-create TickTick project if sync is enabled
        if sync_coordinator.enabled:
            _LOGGER.info("Creating TickTick project for new list: %s", name)
            ticktick_project_id = await sync_coordinator.async_create_ticktick_project(
                list_id, name
            )
            if ticktick_project_id:
                # Update config entry with new mapping
                new_data = {**entry.data}
                new_data[CONF_LIST_MAPPINGS] = sync_coordinator.list_mappings
                hass.config_entries.async_update_entry(entry, data=new_data)
                _LOGGER.info("TickTick project created and mapped: %s", ticktick_project_id)

        # Reload the integration to pick up the new list
        await hass.config_entries.async_reload(entry.entry_id)

    hass.services.async_register(
        DOMAIN, SERVICE_CREATE_LIST, handle_create_list, schema=CREATE_LIST_SCHEMA
    )
    _LOGGER.info("Service registered: %s", SERVICE_CREATE_LIST)

    # Register chorebot.add_task service
    async def handle_add_task(call: ServiceCall) -> None:
        """Handle the chorebot.add_task service."""
        entity_id = call.data["list_id"]
        summary = call.data["summary"]
        description = call.data.get("description")
        due = call.data.get("due")
        tags = call.data.get("tags", [])
        rrule = call.data.get("rrule")

        # Extract list_id from entity_id
        list_id = extract_list_id_from_entity(entity_id)
        if not list_id:
            _LOGGER.error("Invalid entity_id provided: %s", entity_id)
            return

        _LOGGER.info("Adding task via service: %s to list %s", summary, list_id)

        # Convert due datetime to ISO 8601 string if present
        due_str = None
        if due:
            due_str = due.isoformat().replace("+00:00", "Z")

        # Check if this is a recurring task
        if rrule and due_str:
            # Create template (not shown in UI)
            template = Task.create_new(
                summary=summary,
                description=description,
                due=None,  # Templates don't have a due date
                tags=tags,
                rrule=rrule,
                is_template=True,
            )

            # Create first instance
            first_instance = Task.create_new(
                summary=summary,
                description=description,
                due=due_str,
                tags=tags.copy() if tags else [],
                rrule=None,  # Instances don't have rrule
                parent_uid=template.uid,
                is_template=False,
                occurrence_index=0,
            )

            _LOGGER.info("Creating recurring task template and first instance")

            # Add both to store
            await store.async_add_task(list_id, template)
            await store.async_add_task(list_id, first_instance)
        else:
            # Create regular (non-recurring) task
            task = Task.create_new(
                summary=summary,
                description=description,
                due=due_str,
                tags=tags,
                rrule=None,
            )

            # Add to store
            await store.async_add_task(list_id, task)

        # Notify entities to update
        async_dispatcher_send(hass, f"{DOMAIN}_update")

    hass.services.async_register(
        DOMAIN, SERVICE_ADD_TASK, handle_add_task, schema=ADD_TASK_SCHEMA
    )
    _LOGGER.info("Service registered: %s", SERVICE_ADD_TASK)

    # Register chorebot.sync_ticktick service
    if sync_coordinator.enabled:
        SYNC_TICKTICK_SCHEMA = vol.Schema(
            {
                vol.Optional("list_id"): cv.string,
            }
        )

        async def handle_sync_ticktick(call: ServiceCall) -> None:
            """Handle the chorebot.sync_ticktick service."""
            list_id = call.data.get("list_id")

            if list_id:
                # Extract list_id from entity_id if needed
                if list_id.startswith("todo."):
                    list_id = extract_list_id_from_entity(list_id)
                    if not list_id:
                        _LOGGER.error("Invalid entity_id provided: %s", call.data.get("list_id"))
                        return

                _LOGGER.info("Manual TickTick sync triggered for list: %s", list_id)
            else:
                _LOGGER.info("Manual TickTick sync triggered for all lists")

            stats = await sync_coordinator.async_pull_changes(list_id)
            _LOGGER.info("Sync completed: %s", stats)

        hass.services.async_register(
            DOMAIN, SERVICE_SYNC_TICKTICK, handle_sync_ticktick, schema=SYNC_TICKTICK_SCHEMA
        )
        _LOGGER.info("Service registered: %s", SERVICE_SYNC_TICKTICK)

    # Forward to TODO platform
    _LOGGER.info("Forwarding setup to platforms: %s", PLATFORMS)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    _LOGGER.info("Platform setup completed")

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    # Cancel daily maintenance job
    if "daily_maintenance" in hass.data[DOMAIN]:
        hass.data[DOMAIN]["daily_maintenance"]()

    # Cancel periodic sync job
    if "periodic_sync" in hass.data[DOMAIN]:
        hass.data[DOMAIN]["periodic_sync"]()

    # Unload platforms
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop("store", None)
        hass.data[DOMAIN].pop("sync_coordinator", None)
        hass.data[DOMAIN].pop("daily_maintenance", None)
        hass.data[DOMAIN].pop("periodic_sync", None)

    return unload_ok
