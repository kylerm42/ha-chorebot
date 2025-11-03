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

from .const import DOMAIN, SERVICE_ADD_TASK, SERVICE_CREATE_LIST
from .store import ChoreBotStore
from .task import Task

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

    # Set up daily streak checker
    async def check_streaks(now):
        """Check for overdue recurring tasks and reset streaks."""
        _LOGGER.debug("Running daily streak check")
        recurring_tasks = await store.async_get_all_recurring_tasks()

        for list_id, task in recurring_tasks:
            if task.is_overdue() and task.streak_current > 0:
                _LOGGER.info(
                    "Resetting streak for overdue task: %s (was %d)",
                    task.summary,
                    task.streak_current,
                )
                task.streak_current = 0
                task.update_modified()
                await store.async_update_task(list_id, task)

    # Run daily at midnight
    hass.data[DOMAIN]["streak_checker"] = async_track_time_interval(
        hass, check_streaks, timedelta(days=1)
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
            return unique_id[len(DOMAIN) + 1:]

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
            _LOGGER.error("List with id '%s' already exists (from name '%s')", list_id, name)
            return

        # Create list in store
        await store.async_create_list(list_id, name)

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

        # Create task
        task = Task.create_new(
            summary=summary,
            description=description,
            due=due_str,
            tags=tags,
            rrule=rrule,
        )

        # Add to store
        await store.async_add_task(list_id, task)

        # Notify entities to update
        async_dispatcher_send(hass, f"{DOMAIN}_update")

    hass.services.async_register(
        DOMAIN, SERVICE_ADD_TASK, handle_add_task, schema=ADD_TASK_SCHEMA
    )
    _LOGGER.info("Service registered: %s", SERVICE_ADD_TASK)

    # Forward to TODO platform
    _LOGGER.info("Forwarding setup to platforms: %s", PLATFORMS)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    _LOGGER.info("Platform setup completed")

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    # Cancel streak checker
    if "streak_checker" in hass.data[DOMAIN]:
        hass.data[DOMAIN]["streak_checker"]()

    # Unload platforms
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop("store", None)
        hass.data[DOMAIN].pop("streak_checker", None)

    return unload_ok
