"""The ChoreBot integration."""

from __future__ import annotations

from datetime import timedelta
import logging

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import (
    aiohttp_client,
    config_entry_oauth2_flow,
    config_validation as cv,
    entity_registry as er,
)
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import slugify

from .const import (
    BACKEND_TICKTICK,
    CONF_LIST_MAPPINGS,
    CONF_SYNC_BACKEND,
    CONF_SYNC_ENABLED,
    CONF_SYNC_INTERVAL_MINUTES,
    DEFAULT_SYNC_INTERVAL_MINUTES,
    DOMAIN,
    SERVICE_ADD_TASK,
    SERVICE_CREATE_LIST,
    SERVICE_SYNC,
)
from .oauth_api import AsyncConfigEntryAuth
from .store import ChoreBotStore
from .sync_coordinator import SyncCoordinator
from .task import Task
from .ticktick_backend import TickTickBackend

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


async def _async_setup_sync_coordinator(
    hass: HomeAssistant, entry: ConfigEntry, store: ChoreBotStore
) -> SyncCoordinator | None:
    """Initialize sync coordinator if sync is enabled."""
    if not entry.data.get(CONF_SYNC_ENABLED, False):
        return None

    _LOGGER.info("Sync is enabled, initializing backend and coordinator")

    # Get OAuth2Session
    implementation = (
        await config_entry_oauth2_flow.async_get_config_entry_implementation(
            hass, entry
        )
    )
    oauth_session = config_entry_oauth2_flow.OAuth2Session(
        hass, entry, implementation
    )

    # Create auth wrapper
    aiohttp_session = aiohttp_client.async_get_clientsession(hass)
    auth = AsyncConfigEntryAuth(aiohttp_session, oauth_session)

    # Create backend based on config
    backend_type = entry.data.get(CONF_SYNC_BACKEND, BACKEND_TICKTICK)

    if backend_type == BACKEND_TICKTICK:
        backend = TickTickBackend(hass, store, auth, dict(entry.data))
    else:
        _LOGGER.error("Unknown sync backend: %s", backend_type)
        return None

    # Create sync coordinator
    sync_coordinator = SyncCoordinator(hass, backend)
    await sync_coordinator.async_initialize()
    return sync_coordinator


def _extract_list_id_from_entity(hass: HomeAssistant, entity_id: str) -> str | None:
    """Extract list_id from entity_id by looking up the unique_id in the entity registry."""
    registry = er.async_get(hass)
    entity_entry = registry.async_get(entity_id)

    if not entity_entry:
        _LOGGER.error("Entity not found in registry: %s", entity_id)
        return None

    unique_id = entity_entry.unique_id
    if unique_id and unique_id.startswith(f"{DOMAIN}_"):
        return unique_id[len(DOMAIN) + 1 :]

    _LOGGER.error("Invalid unique_id format: %s", unique_id)
    return None


async def _handle_create_list(
    call: ServiceCall,
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: ChoreBotStore,
    sync_coordinator: SyncCoordinator | None,
) -> None:
    """Handle the chorebot.create_list service."""
    name = call.data["name"]
    list_id = slugify(name)

    _LOGGER.info("Creating list via service: %s (id: %s)", name, list_id)

    if store.get_list(list_id):
        _LOGGER.error(
            "List with id '%s' already exists (from name '%s')", list_id, name
        )
        return

    await store.async_create_list(list_id, name)

    # Auto-create remote list if sync is enabled
    if sync_coordinator and sync_coordinator.enabled:
        _LOGGER.info("Creating remote list for new list: %s", name)
        remote_list_id = await sync_coordinator.async_create_list(list_id, name)
        if remote_list_id:
            new_data = {**entry.data}
            new_data[CONF_LIST_MAPPINGS] = sync_coordinator.get_list_mappings()
            hass.config_entries.async_update_entry(entry, data=new_data)
            _LOGGER.info("Remote list created and mapped: %s", remote_list_id)

    await hass.config_entries.async_reload(entry.entry_id)


async def _handle_add_task(
    call: ServiceCall,
    hass: HomeAssistant,
    store: ChoreBotStore,
) -> None:
    """Handle the chorebot.add_task service."""
    entity_id = call.data["list_id"]
    summary = call.data["summary"]
    description = call.data.get("description")
    due = call.data.get("due")
    tags = call.data.get("tags", [])
    rrule = call.data.get("rrule")

    list_id = _extract_list_id_from_entity(hass, entity_id)
    if not list_id:
        _LOGGER.error("Invalid entity_id provided: %s", entity_id)
        return

    _LOGGER.info("Adding task via service: %s to list %s", summary, list_id)

    due_str = None
    if due:
        due_str = due.isoformat().replace("+00:00", "Z")

    if rrule and due_str:
        # Create template
        template = Task.create_new(
            summary=summary,
            description=description,
            due=None,
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
            rrule=None,
            parent_uid=template.uid,
            is_template=False,
            occurrence_index=0,
        )

        _LOGGER.info("Creating recurring task template and first instance")
        await store.async_add_task(list_id, template)
        await store.async_add_task(list_id, first_instance)
    else:
        # Create regular task
        task = Task.create_new(
            summary=summary,
            description=description,
            due=due_str,
            tags=tags,
            rrule=None,
        )
        await store.async_add_task(list_id, task)

    async_dispatcher_send(hass, f"{DOMAIN}_update")


async def _handle_sync(
    call: ServiceCall,
    hass: HomeAssistant,
    sync_coordinator: SyncCoordinator,
) -> None:
    """Handle the chorebot.sync service."""
    list_id = call.data.get("list_id")

    if list_id:
        if list_id.startswith("todo."):
            list_id = _extract_list_id_from_entity(hass, list_id)
            if not list_id:
                _LOGGER.error(
                    "Invalid entity_id provided: %s", call.data.get("list_id")
                )
                return

        _LOGGER.info("Manual sync triggered for list: %s", list_id)
    else:
        _LOGGER.info("Manual sync triggered for all lists")

    stats = await sync_coordinator.async_pull_changes(list_id)
    _LOGGER.info("Sync completed: %s", stats)


async def _daily_maintenance(hass: HomeAssistant, store: ChoreBotStore, now) -> None:
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


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up ChoreBot from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Initialize data storage layer
    store = ChoreBotStore(hass)
    await store.async_load()

    # Store in hass.data
    hass.data[DOMAIN]["store"] = store
    _LOGGER.info("Store saved to hass.data")

    # Initialize sync coordinator if sync is enabled
    sync_coordinator = await _async_setup_sync_coordinator(hass, entry, store)
    hass.data[DOMAIN]["sync_coordinator"] = sync_coordinator

    # Set up daily maintenance job
    async def daily_maintenance(now):
        """Wrapper for daily maintenance."""
        await _daily_maintenance(hass, store, now)

    # Run daily at midnight
    hass.data[DOMAIN]["daily_maintenance"] = async_track_time_interval(
        hass, daily_maintenance, timedelta(days=1)
    )

    # Set up periodic sync
    if sync_coordinator and sync_coordinator.enabled:
        sync_interval_minutes = entry.data.get(
            CONF_SYNC_INTERVAL_MINUTES, DEFAULT_SYNC_INTERVAL_MINUTES
        )

        async def periodic_sync(now):
            """Periodically pull changes from remote backend."""
            _LOGGER.debug("Running periodic sync")
            await sync_coordinator.async_pull_changes()

        hass.data[DOMAIN]["periodic_sync"] = async_track_time_interval(
            hass, periodic_sync, timedelta(minutes=sync_interval_minutes)
        )
        _LOGGER.info(
            "Periodic sync enabled (interval: %d minutes)",
            sync_interval_minutes,
        )

    # Register chorebot.create_list service
    async def handle_create_list(call: ServiceCall) -> None:
        await _handle_create_list(call, hass, entry, store, sync_coordinator)

    hass.services.async_register(
        DOMAIN, SERVICE_CREATE_LIST, handle_create_list, schema=CREATE_LIST_SCHEMA
    )
    _LOGGER.info("Service registered: %s", SERVICE_CREATE_LIST)

    # Register chorebot.add_task service
    async def handle_add_task(call: ServiceCall) -> None:
        await _handle_add_task(call, hass, store)

    hass.services.async_register(
        DOMAIN, SERVICE_ADD_TASK, handle_add_task, schema=ADD_TASK_SCHEMA
    )
    _LOGGER.info("Service registered: %s", SERVICE_ADD_TASK)

    # Register chorebot.sync service
    if sync_coordinator and sync_coordinator.enabled:
        SYNC_SCHEMA = vol.Schema(
            {
                vol.Optional("list_id"): cv.string,
            }
        )

        async def handle_sync(call: ServiceCall) -> None:
            await _handle_sync(call, hass, sync_coordinator)

        hass.services.async_register(
            DOMAIN, SERVICE_SYNC, handle_sync, schema=SYNC_SCHEMA
        )
        _LOGGER.info("Service registered: %s", SERVICE_SYNC)

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
