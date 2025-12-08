"""The ChoreBot integration."""

from __future__ import annotations

from typing import Any
from datetime import UTC, datetime, timedelta
import logging
from pathlib import Path
from zoneinfo import ZoneInfo

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
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import slugify
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig

from .const import (
    BACKEND_TICKTICK,
    CONF_SYNC_BACKEND,
    CONF_SYNC_ENABLED,
    CONF_SYNC_INTERVAL_MINUTES,
    DEFAULT_SYNC_INTERVAL_MINUTES,
    DOMAIN,
    SERVICE_ADD_TASK,
    SERVICE_ADJUST_POINTS,
    SERVICE_CREATE_LIST,
    SERVICE_DELETE_REWARD,
    SERVICE_MANAGE_PERSON,
    SERVICE_MANAGE_REWARD,
    SERVICE_REDEEM_REWARD,
    SERVICE_SYNC,
    SERVICE_SYNC_PEOPLE,
    SERVICE_UPDATE_TASK,
)
from .oauth_api import AsyncConfigEntryAuth
from .people import PeopleStore
from .store import ChoreBotStore
from .sync_coordinator import SyncCoordinator
from .ticktick_backend import TickTickBackend

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.TODO, Platform.SENSOR]

# Frontend card filenames (must match dist/ output)
FRONTEND_CARDS = [
    "chorebot-grouped-card.js",
    "chorebot-add-task-card.js",
    "chorebot-person-points-card.js",
    "chorebot-person-rewards-card.js",
]


async def _register_frontend_resources(hass: HomeAssistant) -> None:
    """Register Lovelace resources for ChoreBot cards.
    
    This function:
    1. Registers a static path to serve frontend card files
    2. Adds each card to Home Assistant's frontend module system
    
    Note: The /hacsfiles/ endpoint is NOT automatically created by HACS.
    Integrations must explicitly register the static path themselves.
    """
    _LOGGER.info("Starting frontend resource registration")
    
    # Check if HTTP component is available
    if not hasattr(hass, 'http') or hass.http is None:
        _LOGGER.error("HTTP component not available! Cannot register static paths.")
        return
    
    # Register static path for www directory
    www_path = Path(__file__).parent / "www"
    _LOGGER.info("WWW path resolved to: %s", www_path)
    _LOGGER.info("WWW path exists: %s", www_path.exists())
    _LOGGER.info("WWW path is directory: %s", www_path.is_dir())
    
    if www_path.exists():
        files = list(www_path.glob("*.js"))
        _LOGGER.info("Found %d JS files in www directory: %s", len(files), [f.name for f in files])
    
    try:
        await hass.http.async_register_static_paths([
            StaticPathConfig(
                url="/hacsfiles/chorebot",  # URL path (no trailing slash)
                path=str(www_path),          # Physical directory path
                cache_headers=True           # Enable browser caching
            )
        ])
        _LOGGER.info("✅ Successfully registered static path: /hacsfiles/chorebot -> %s", www_path)
    except Exception as e:
        _LOGGER.error("❌ Failed to register static path: %s", e, exc_info=True)
        return
    
    # Register each card with the frontend
    for card_file in FRONTEND_CARDS:
        url = f"/hacsfiles/chorebot/{card_file}"
        try:
            add_extra_js_url(hass, url)
            _LOGGER.info("✅ Registered frontend resource: %s", url)
        except Exception as e:
            _LOGGER.error("❌ Failed to register frontend resource %s: %s", url, e, exc_info=True)

# Service schema for chorebot.create_list
CREATE_LIST_SCHEMA = vol.Schema(
    {
        vol.Required("name"): cv.string,
        vol.Optional("person_id"): cv.entity_id,
    }
)

# Service schema for chorebot.add_task
ADD_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("list_id"): cv.string,
        vol.Required("summary"): cv.string,
        vol.Optional("description"): cv.string,
        vol.Optional("due"): cv.datetime,
        vol.Optional("is_all_day"): cv.boolean,
        vol.Optional("tags"): cv.ensure_list,
        vol.Optional("section_id"): cv.string,
        vol.Optional("points_value"): cv.positive_int,
        vol.Optional("streak_bonus_points"): cv.positive_int,
        vol.Optional("streak_bonus_interval"): cv.positive_int,
        vol.Optional("rrule"): cv.string,
    }
)

# Service schema for chorebot.update_task
UPDATE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("list_id"): cv.string,
        vol.Required("uid"): cv.string,
        vol.Optional("summary"): cv.string,
        vol.Optional("description"): cv.string,
        vol.Optional("due"): vol.Any(cv.datetime, vol.Equal("")),
        vol.Optional("is_all_day"): cv.boolean,
        vol.Optional("status"): vol.In(["needs_action", "completed"]),
        vol.Optional("tags"): cv.ensure_list,
        vol.Optional("section_id"): cv.string,
        vol.Optional("points_value"): cv.positive_int,
        vol.Optional("streak_bonus_points"): cv.positive_int,
        vol.Optional("streak_bonus_interval"): cv.positive_int,
        vol.Optional("rrule"): cv.string,
        vol.Optional("include_future_occurrences"): cv.boolean,
    }
)

# Service schema for chorebot.manage_reward
MANAGE_REWARD_SCHEMA = vol.Schema(
    {
        vol.Optional("reward_id"): cv.string,
        vol.Required("name"): cv.string,
        vol.Required("cost"): cv.positive_int,
        vol.Required("icon"): cv.string,
        vol.Optional("description"): cv.string,
        vol.Required("person_id"): cv.entity_id,
    }
)

# Service schema for chorebot.redeem_reward
REDEEM_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required("person_id"): cv.entity_id,
        vol.Required("reward_id"): cv.string,
    }
)

# Service schema for chorebot.delete_reward
DELETE_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required("reward_id"): cv.string,
    }
)

# Service schema for chorebot.adjust_points
ADJUST_POINTS_SCHEMA = vol.Schema(
    {
        vol.Required("person_id"): cv.entity_id,
        vol.Required("amount"): vol.All(
            vol.Coerce(int), vol.Range(min=-10000, max=10000)
        ),
        vol.Required("reason"): cv.string,
    }
)

# Service schema for chorebot.update_list
UPDATE_LIST_SCHEMA = vol.Schema(
    {
        vol.Required("list_id"): cv.entity_id,
        vol.Optional("name"): cv.string,
        vol.Optional("person_id"): cv.entity_id,
        vol.Optional("clear_person"): cv.boolean,
    }
)

# Service schema for chorebot.manage_section
MANAGE_SECTION_SCHEMA = vol.Schema(
    {
        vol.Required("list_id"): cv.entity_id,
        vol.Required("action"): vol.In(["create", "update", "delete"]),
        vol.Optional("section_id"): cv.string,
        vol.Optional("name"): cv.string,
        vol.Optional("person_id"): cv.entity_id,
        vol.Optional("clear_person"): cv.boolean,
        vol.Optional("sort_order"): cv.positive_int,
    }
)

# Service schema for chorebot.manage_person
MANAGE_PERSON_SCHEMA = vol.Schema(
    {
        vol.Required("person_id"): cv.entity_id,
        vol.Optional("accent_color"): cv.string,
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
    oauth_session = config_entry_oauth2_flow.OAuth2Session(hass, entry, implementation)

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


def _extract_task_data_from_service_call(
    call: ServiceCall,
    hass: HomeAssistant,
    include_uid: bool = False,
    apply_section_default: bool = False,
    store: ChoreBotStore | None = None,
    list_id: str | None = None,
) -> dict[str, Any]:
    """Extract and normalize task data from service call.

    Single source of truth for translating service call data to task model data.
    Handles datetime conversion, tag normalization, and field extraction.

    Args:
        call: The service call containing task data
        hass: Home Assistant instance for timezone handling
        include_uid: If True, extract uid field (for updates)
        apply_section_default: If True, apply default section if not provided (for creates)
        store: ChoreBotStore instance (required if apply_section_default is True)
        list_id: List ID (required if apply_section_default is True)

    Returns:
        Dictionary ready to pass to entity methods (async_create_task_internal or async_update_task_internal)
    """
    data: dict[str, Any] = {}

    # UID (for updates only)
    if include_uid:
        data["uid"] = call.data["uid"]

    # Core fields - only include if present in service call
    if "summary" in call.data:
        data["summary"] = call.data["summary"]

    if "description" in call.data:
        data["description"] = call.data["description"]

    if "status" in call.data:
        data["status"] = call.data["status"]

    # Due date (with datetime conversion)
    if "due" in call.data:
        due = call.data["due"]
        if due == "":
            # Empty string means explicitly clear the due date (update only)
            data["due"] = ""
        elif due:
            # Ensure timezone-aware datetime
            if due.tzinfo is None:
                # Naive datetime - assume system timezone
                system_tz = ZoneInfo(hass.config.time_zone)
                due = due.replace(tzinfo=system_tz)
            # Convert to UTC
            due_utc = due.astimezone(UTC)
            data["due"] = due_utc.isoformat().replace("+00:00", "Z")

    # Boolean flags
    if "is_all_day" in call.data:
        data["is_all_day"] = call.data["is_all_day"]

    # Organization fields
    # Tags: distinguish between "not provided" and "provided as empty list"
    if "tags" in call.data:
        data["tags"] = call.data["tags"] if call.data["tags"] is not None else []

    if "section_id" in call.data:
        data["section_id"] = call.data["section_id"]
    elif apply_section_default and store and list_id:
        # Apply default section if creating a new task and no section provided
        data["section_id"] = store.get_default_section_id(list_id)

    # Points system fields
    if "points_value" in call.data:
        data["points_value"] = call.data["points_value"]

    if "streak_bonus_points" in call.data:
        data["streak_bonus_points"] = call.data["streak_bonus_points"]

    if "streak_bonus_interval" in call.data:
        data["streak_bonus_interval"] = call.data["streak_bonus_interval"]

    # Recurrence fields
    if "rrule" in call.data:
        data["rrule"] = call.data["rrule"]

    if "include_future_occurrences" in call.data:
        data["include_future_occurrences"] = call.data["include_future_occurrences"]

    return data


async def _handle_create_list(
    call: ServiceCall,
    hass: HomeAssistant,
    entry: ConfigEntry,
    store: ChoreBotStore,
    sync_coordinator: SyncCoordinator | None,
) -> None:
    """Handle the chorebot.create_list service."""
    name = call.data["name"]
    person_id = call.data.get("person_id")
    list_id = slugify(name)

    _LOGGER.info("Creating list via service: %s (id: %s)", name, list_id)

    if store.get_list(list_id):
        _LOGGER.error(
            "List with id '%s' already exists (from name '%s')", list_id, name
        )
        return

    # Validate person entity if provided
    if person_id and person_id not in hass.states.async_entity_ids("person"):
        _LOGGER.error("Person entity not found: %s", person_id)
        raise ValueError(f"Person entity not found: {person_id}")

    # Create list with person_id if provided
    kwargs = {}
    if person_id:
        kwargs["person_id"] = person_id
        _LOGGER.info("Assigning person %s to new list: %s", person_id, list_id)

    await store.async_create_list(list_id, name, **kwargs)

    # Auto-create remote list if sync is enabled
    if sync_coordinator and sync_coordinator.enabled:
        _LOGGER.info("Creating remote list for new list: %s", name)
        remote_list_id = await sync_coordinator.async_create_list(list_id, name)
        if remote_list_id:
            # Mapping is now stored in storage by the backend
            _LOGGER.info(
                "Remote list created and mapped: %s -> %s",
                list_id,
                remote_list_id,
            )

    # Schedule reload as background task so service returns immediately
    # This prevents UI from briefly losing service definition
    hass.async_create_task(hass.config_entries.async_reload(entry.entry_id))


async def _handle_add_task(
    call: ServiceCall,
    hass: HomeAssistant,
    store: ChoreBotStore,
    sync_coordinator: SyncCoordinator | None,
) -> None:
    """Handle the chorebot.add_task service."""
    entity_id = call.data["list_id"]

    list_id = _extract_list_id_from_entity(hass, entity_id)
    if not list_id:
        _LOGGER.error("Invalid entity_id provided: %s", entity_id)
        return

    _LOGGER.info(
        "Adding task via service: %s to list %s", call.data["summary"], list_id
    )

    # Get the entity instance
    entities = hass.data[DOMAIN].get("entities", {})
    entity = entities.get(list_id)

    if not entity:
        _LOGGER.error("Entity not found for list_id: %s", list_id)
        return

    # Extract and normalize task data using shared function
    task_data = _extract_task_data_from_service_call(
        call=call,
        hass=hass,
        include_uid=False,
        apply_section_default=True,
        store=store,
        list_id=list_id,
    )

    # Call entity's internal method - single source of truth!
    # This ensures consistent state updates, sync, and no dispatcher needed
    await entity.async_create_task_internal(**task_data)


async def _handle_update_task(
    call: ServiceCall,
    hass: HomeAssistant,
    store: ChoreBotStore,
    sync_coordinator: SyncCoordinator | None,
) -> None:
    """Handle the chorebot.update_task service."""
    entity_id = call.data["list_id"]
    uid = call.data["uid"]

    list_id = _extract_list_id_from_entity(hass, entity_id)
    if not list_id:
        _LOGGER.error("Invalid entity_id provided: %s", entity_id)
        return

    _LOGGER.info("Updating task via service: %s in list %s", uid, list_id)

    # Get the entity instance
    entities = hass.data[DOMAIN].get("entities", {})
    entity = entities.get(list_id)

    if not entity:
        _LOGGER.error("Entity not found for list_id: %s", list_id)
        return

    # Extract and normalize task data using shared function
    task_data = _extract_task_data_from_service_call(
        call=call,
        hass=hass,
        include_uid=True,
        apply_section_default=False,
        store=None,
        list_id=None,
    )

    # Call entity's internal method - single source of truth!
    await entity.async_update_task_internal(**task_data)


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

    # Notify entities to update their state immediately
    entities = hass.data[DOMAIN].get("entities", {})
    if list_id:
        # Update specific list
        if entity := entities.get(list_id):
            entity.async_write_ha_state()
            _LOGGER.debug("Updated entity state for list: %s", list_id)
    else:
        # Update all entities
        for entity in entities.values():
            entity.async_write_ha_state()
        _LOGGER.debug("Updated state for all %d entities", len(entities))


async def _handle_manage_reward(
    call: ServiceCall,
    hass: HomeAssistant,
    people_store: PeopleStore,
) -> None:
    """Handle the chorebot.manage_reward service."""
    reward_id = call.data.get("reward_id")
    name = call.data["name"]
    cost = call.data["cost"]
    icon = call.data["icon"]
    description = call.data.get("description", "")
    person_id = call.data["person_id"]

    # Validate person exists
    if person_id not in hass.states.async_entity_ids("person"):
        _LOGGER.error("Person entity not found: %s", person_id)
        raise ValueError(f"Person entity not found: {person_id}")

    _LOGGER.info(
        "Managing reward via service: %s (cost: %d pts) for %s", name, cost, person_id
    )

    result_id = await people_store.async_create_reward(
        reward_id=reward_id,
        name=name,
        cost=cost,
        icon=icon,
        person_id=person_id,
        description=description,
    )

    _LOGGER.info("Reward managed successfully: %s (id: %s)", name, result_id)

    # Trigger immediate sensor update
    points_sensor = hass.data[DOMAIN].get("points_sensor")
    if points_sensor:
        points_sensor.async_write_ha_state()
        _LOGGER.debug("Triggered points sensor update after reward management")


async def _handle_redeem_reward(
    call: ServiceCall,
    hass: HomeAssistant,
    people_store: PeopleStore,
) -> None:
    """Handle the chorebot.redeem_reward service."""
    person_id = call.data["person_id"]
    reward_id = call.data["reward_id"]

    # Validate person exists
    if person_id not in hass.states.async_entity_ids("person"):
        _LOGGER.error("Person entity not found: %s", person_id)
        raise ValueError(f"Person entity not found: {person_id}")

    _LOGGER.info("Redeeming reward %s for %s", reward_id, person_id)

    success, message = await people_store.async_redeem_reward(person_id, reward_id)

    if not success:
        _LOGGER.error("Reward redemption failed: %s", message)
        raise ValueError(message)

    _LOGGER.info("Reward redeemed successfully: %s", message)

    # Trigger immediate sensor update
    points_sensor = hass.data[DOMAIN].get("points_sensor")
    if points_sensor:
        points_sensor.async_write_ha_state()
        _LOGGER.debug("Triggered points sensor update after redemption")


async def _handle_delete_reward(
    call: ServiceCall,
    hass: HomeAssistant,
    people_store: PeopleStore,
) -> None:
    """Handle the chorebot.delete_reward service."""
    reward_id = call.data["reward_id"]

    _LOGGER.info("Deleting reward via service: %s", reward_id)

    success = await people_store.async_delete_reward(reward_id)

    if not success:
        _LOGGER.error("Reward not found for deletion: %s", reward_id)
        raise ValueError(f"Reward not found: {reward_id}")

    _LOGGER.info("Reward deleted successfully: %s", reward_id)

    # Trigger immediate sensor update
    points_sensor = hass.data[DOMAIN].get("points_sensor")
    if points_sensor:
        points_sensor.async_write_ha_state()
        _LOGGER.debug("Triggered points sensor update after reward deletion")


async def _handle_adjust_points(
    call: ServiceCall,
    hass: HomeAssistant,
    people_store: PeopleStore,
) -> None:
    """Handle the chorebot.adjust_points service."""
    person_id = call.data["person_id"]
    amount = call.data["amount"]
    reason = call.data["reason"]

    # Validate person exists
    if person_id not in hass.states.async_entity_ids("person"):
        _LOGGER.error("Person entity not found: %s", person_id)
        raise ValueError(f"Person entity not found: {person_id}")

    _LOGGER.info("Adjusting points for %s: %+d pts (%s)", person_id, amount, reason)

    await people_store.async_add_points(
        person_id,
        amount,
        "manual_adjustment",
        {"reason": reason},
    )

    _LOGGER.info("Points adjusted successfully for %s", person_id)

    # Trigger immediate sensor update
    points_sensor = hass.data[DOMAIN].get("points_sensor")
    if points_sensor:
        points_sensor.async_write_ha_state()
        _LOGGER.debug("Triggered points sensor update after points adjustment")


async def _handle_sync_people(
    call: ServiceCall,
    hass: HomeAssistant,
    people_store: PeopleStore,
) -> None:
    """Handle the chorebot.sync_people service."""
    # Get all person entity IDs
    person_entity_ids = list(hass.states.async_entity_ids("person"))

    if not person_entity_ids:
        _LOGGER.warning("No person entities found in Home Assistant")
        return

    _LOGGER.info("Syncing %d person entities with storage", len(person_entity_ids))

    created_count = await people_store.async_sync_people(person_entity_ids)

    if created_count > 0:
        _LOGGER.info("Sync complete: created %d new people records", created_count)
    else:
        _LOGGER.info("Sync complete: all person entities already exist")


async def _handle_manage_person(
    call: ServiceCall,
    hass: HomeAssistant,
    people_store: PeopleStore,
) -> None:
    """Handle the chorebot.manage_person service."""
    person_id = call.data["person_id"]
    accent_color = call.data.get("accent_color")

    # Validate person exists
    if person_id not in hass.states.async_entity_ids("person"):
        _LOGGER.error("Person entity not found: %s", person_id)
        raise ValueError(f"Person entity not found: {person_id}")

    # Basic validation for accent_color format
    if accent_color is not None:
        import re

        # Check if hex color (#RRGGBB or #RGB) or CSS variable (var(--...))
        hex_pattern = r"^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$"
        css_var_pattern = r"^var\(--[a-zA-Z0-9-]+\)$"

        if not (
            re.match(hex_pattern, accent_color)
            or re.match(css_var_pattern, accent_color)
        ):
            _LOGGER.error("Invalid accent_color format: %s", accent_color)
            raise ValueError(
                f"Invalid accent_color format. Expected hex code (#RRGGBB) or CSS variable (var(--name)), got: {accent_color}"
            )

    _LOGGER.info("Updating person profile for %s", person_id)

    success = await people_store.async_update_person_profile(
        person_id=person_id,
        accent_color=accent_color,
    )

    if not success:
        _LOGGER.error("Failed to update person profile: %s", person_id)
        raise ValueError(f"Failed to update person profile: {person_id}")

    _LOGGER.info("Person profile updated successfully: %s", person_id)

    # Trigger immediate sensor update
    points_sensor = hass.data[DOMAIN].get("points_sensor")
    if points_sensor:
        points_sensor.async_write_ha_state()
        _LOGGER.debug("Triggered points sensor update after person profile update")


async def _handle_update_list(
    call: ServiceCall,
    hass: HomeAssistant,
    store: ChoreBotStore,
) -> None:
    """Handle the chorebot.update_list service."""
    entity_id = call.data["list_id"]
    list_id = _extract_list_id_from_entity(hass, entity_id)
    if not list_id:
        _LOGGER.error("Invalid entity_id provided: %s", entity_id)
        raise ValueError(f"Invalid entity_id: {entity_id}")

    updates = {}

    # Handle name update
    if "name" in call.data:
        updates["name"] = call.data["name"]

    # Handle person_id update
    if call.data.get("clear_person"):
        updates["person_id"] = None
        _LOGGER.info("Clearing person assignment from list: %s", list_id)
    elif "person_id" in call.data:
        person_id = call.data["person_id"]
        # Validate person exists
        if person_id not in hass.states.async_entity_ids("person"):
            _LOGGER.error("Person entity not found: %s", person_id)
            raise ValueError(f"Person entity not found: {person_id}")
        updates["person_id"] = person_id
        _LOGGER.info("Assigning person %s to list: %s", person_id, list_id)

    if not updates:
        _LOGGER.warning("No updates provided for list: %s", list_id)
        return

    success = await store.async_update_list(list_id, updates)
    if not success:
        _LOGGER.error("Failed to update list: %s", list_id)
        raise ValueError(f"List not found: {list_id}")

    _LOGGER.info("List updated successfully: %s", list_id)

    # Trigger immediate entity state update so frontend sees the change
    entities = hass.data[DOMAIN].get("entities", {})
    if entity := entities.get(list_id):
        entity.async_write_ha_state()
        _LOGGER.debug("Triggered entity state update after list update: %s", list_id)


async def _handle_manage_section(
    call: ServiceCall,
    hass: HomeAssistant,
    store: ChoreBotStore,
) -> None:
    """Handle the chorebot.manage_section service."""
    entity_id = call.data["list_id"]
    action = call.data["action"]

    list_id = _extract_list_id_from_entity(hass, entity_id)
    if not list_id:
        _LOGGER.error("Invalid entity_id provided: %s", entity_id)
        raise ValueError(f"Invalid entity_id: {entity_id}")

    # Get current sections
    sections = store.get_sections_for_list(list_id)

    if action == "create":
        # Validate name is provided
        if "name" not in call.data:
            _LOGGER.error("Section name is required for create action")
            raise ValueError("Section name is required for create action")

        name = call.data["name"]
        section_id = call.data.get("section_id") or slugify(name)

        # Check if section_id already exists
        if any(s["id"] == section_id for s in sections):
            _LOGGER.error("Section ID already exists: %s", section_id)
            raise ValueError(f"Section ID already exists: {section_id}")

        # Build new section
        new_section = {
            "id": section_id,
            "name": name,
            "sort_order": call.data.get("sort_order", 0),
        }

        # Handle person_id
        if "person_id" in call.data:
            person_id = call.data["person_id"]
            if person_id not in hass.states.async_entity_ids("person"):
                _LOGGER.error("Person entity not found: %s", person_id)
                raise ValueError(f"Person entity not found: {person_id}")
            new_section["person_id"] = person_id

        sections.append(new_section)
        _LOGGER.info(
            "Created section '%s' (id: %s) in list: %s", name, section_id, list_id
        )

    elif action == "update":
        # Validate section_id is provided
        if "section_id" not in call.data:
            _LOGGER.error("Section ID is required for update action")
            raise ValueError("Section ID is required for update action")

        section_id = call.data["section_id"]

        # Find section
        section = next((s for s in sections if s["id"] == section_id), None)
        if not section:
            _LOGGER.error("Section not found: %s", section_id)
            raise ValueError(f"Section not found: {section_id}")

        # Update fields
        if "name" in call.data:
            section["name"] = call.data["name"]
        if "sort_order" in call.data:
            section["sort_order"] = call.data["sort_order"]

        # Handle person_id
        if call.data.get("clear_person"):
            section.pop("person_id", None)
            _LOGGER.info("Cleared person assignment from section: %s", section_id)
        elif "person_id" in call.data:
            person_id = call.data["person_id"]
            if person_id not in hass.states.async_entity_ids("person"):
                _LOGGER.error("Person entity not found: %s", person_id)
                raise ValueError(f"Person entity not found: {person_id}")
            section["person_id"] = person_id
            _LOGGER.info("Assigned person %s to section: %s", person_id, section_id)

        _LOGGER.info("Updated section: %s", section_id)

    elif action == "delete":
        # Validate section_id is provided
        if "section_id" not in call.data:
            _LOGGER.error("Section ID is required for delete action")
            raise ValueError("Section ID is required for delete action")

        section_id = call.data["section_id"]

        # Check if section exists
        section = next((s for s in sections if s["id"] == section_id), None)
        if not section:
            _LOGGER.error("Section not found: %s", section_id)
            raise ValueError(f"Section not found: {section_id}")

        # Check if any tasks reference this section
        tasks = store.get_tasks_for_list(list_id)
        tasks_in_section = [t for t in tasks if t.section_id == section_id]
        if tasks_in_section:
            _LOGGER.warning(
                "Deleting section '%s' with %d tasks. Tasks will become orphaned.",
                section_id,
                len(tasks_in_section),
            )

        # Remove section
        sections = [s for s in sections if s["id"] != section_id]
        _LOGGER.info("Deleted section: %s", section_id)

    else:
        _LOGGER.error("Invalid action: %s", action)
        raise ValueError(f"Invalid action: {action}")

    # Save updated sections
    await store.async_set_sections(list_id, sections)

    # Trigger immediate entity state update so frontend sees the change
    entities = hass.data[DOMAIN].get("entities", {})
    if entity := entities.get(list_id):
        entity.async_write_ha_state()
        _LOGGER.debug(
            "Triggered entity state update after section %s: %s", action, list_id
        )


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

        # 2. Soft-delete completed recurring instances that weren't completed today
        tasks = store.get_tasks_for_list(list_id)
        today = datetime.now(UTC).date()

        for task in tasks:
            if task.is_recurring_instance() and task.status == "completed":
                # Only soft-delete if NOT completed today
                if task.last_completed:
                    completed_date = datetime.fromisoformat(
                        task.last_completed.replace("Z", "+00:00")
                    ).date()

                    if completed_date < today:
                        _LOGGER.debug(
                            "Soft-deleting completed instance: %s (completed %s)",
                            task.summary,
                            completed_date,
                        )
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

    # Register frontend resources (Lovelace cards)
    await _register_frontend_resources(hass)

    # Initialize data storage layer
    store = ChoreBotStore(hass)
    await store.async_load()

    # Store in hass.data
    hass.data[DOMAIN]["store"] = store
    _LOGGER.info("Store saved to hass.data")

    # Initialize people store
    people_store = PeopleStore(hass)
    await people_store.async_load()
    hass.data[DOMAIN]["people_store"] = people_store
    _LOGGER.info("People store initialized")

    # Automatically sync people with HA person entities on setup
    person_entity_ids = list(hass.states.async_entity_ids("person"))
    if person_entity_ids:
        created_count = await people_store.async_sync_people(person_entity_ids)
        _LOGGER.info(
            "Auto-sync on setup: %d person entities, %d new records created",
            len(person_entity_ids),
            created_count,
        )
    else:
        _LOGGER.warning("No person entities found during setup")

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
            stats = await sync_coordinator.async_pull_changes()

            # Notify all entities to update their state if changes were made
            if (
                stats
                and (
                    stats.get("created", 0)
                    + stats.get("updated", 0)
                    + stats.get("deleted", 0)
                )
                > 0
            ):
                entities = hass.data[DOMAIN].get("entities", {})
                for entity in entities.values():
                    entity.async_write_ha_state()
                _LOGGER.debug(
                    "Updated state for all %d entities after periodic sync",
                    len(entities),
                )

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
        await _handle_add_task(call, hass, store, sync_coordinator)

    hass.services.async_register(
        DOMAIN, SERVICE_ADD_TASK, handle_add_task, schema=ADD_TASK_SCHEMA
    )
    _LOGGER.info("Service registered: %s", SERVICE_ADD_TASK)

    # Register chorebot.update_task service
    async def handle_update_task(call: ServiceCall) -> None:
        await _handle_update_task(call, hass, store, sync_coordinator)

    hass.services.async_register(
        DOMAIN, SERVICE_UPDATE_TASK, handle_update_task, schema=UPDATE_TASK_SCHEMA
    )
    _LOGGER.info("Service registered: %s", SERVICE_UPDATE_TASK)

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

    # Get people store (may not exist if not initialized yet)
    people_store = hass.data[DOMAIN].get("people_store")

    # Register chorebot.manage_reward service
    if people_store:

        async def handle_manage_reward(call: ServiceCall) -> None:
            await _handle_manage_reward(call, hass, people_store)

        hass.services.async_register(
            DOMAIN,
            SERVICE_MANAGE_REWARD,
            handle_manage_reward,
            schema=MANAGE_REWARD_SCHEMA,
        )
        _LOGGER.info("Service registered: %s", SERVICE_MANAGE_REWARD)

    # Register chorebot.redeem_reward service
    if people_store:

        async def handle_redeem_reward(call: ServiceCall) -> None:
            await _handle_redeem_reward(call, hass, people_store)

        hass.services.async_register(
            DOMAIN,
            SERVICE_REDEEM_REWARD,
            handle_redeem_reward,
            schema=REDEEM_REWARD_SCHEMA,
        )
        _LOGGER.info("Service registered: %s", SERVICE_REDEEM_REWARD)

    # Register chorebot.delete_reward service
    if people_store:

        async def handle_delete_reward(call: ServiceCall) -> None:
            await _handle_delete_reward(call, hass, people_store)

        hass.services.async_register(
            DOMAIN,
            SERVICE_DELETE_REWARD,
            handle_delete_reward,
            schema=DELETE_REWARD_SCHEMA,
        )
        _LOGGER.info("Service registered: %s", SERVICE_DELETE_REWARD)

    # Register chorebot.adjust_points service
    if people_store:

        async def handle_adjust_points(call: ServiceCall) -> None:
            await _handle_adjust_points(call, hass, people_store)

        hass.services.async_register(
            DOMAIN,
            SERVICE_ADJUST_POINTS,
            handle_adjust_points,
            schema=ADJUST_POINTS_SCHEMA,
        )
        _LOGGER.info("Service registered: %s", SERVICE_ADJUST_POINTS)

    # Register chorebot.sync_people service
    if people_store:

        async def handle_sync_people(call: ServiceCall) -> None:
            await _handle_sync_people(call, hass, people_store)

        hass.services.async_register(
            DOMAIN,
            SERVICE_SYNC_PEOPLE,
            handle_sync_people,
        )
        _LOGGER.info("Service registered: %s", SERVICE_SYNC_PEOPLE)

    # Register chorebot.manage_person service
    if people_store:

        async def handle_manage_person(call: ServiceCall) -> None:
            await _handle_manage_person(call, hass, people_store)

        hass.services.async_register(
            DOMAIN,
            SERVICE_MANAGE_PERSON,
            handle_manage_person,
            schema=MANAGE_PERSON_SCHEMA,
        )
        _LOGGER.info("Service registered: %s", SERVICE_MANAGE_PERSON)

    # Register chorebot.update_list service
    async def handle_update_list(call: ServiceCall) -> None:
        await _handle_update_list(call, hass, store)

    hass.services.async_register(
        DOMAIN, "update_list", handle_update_list, schema=UPDATE_LIST_SCHEMA
    )
    _LOGGER.info("Service registered: update_list")

    # Register chorebot.manage_section service
    async def handle_manage_section(call: ServiceCall) -> None:
        await _handle_manage_section(call, hass, store)

    hass.services.async_register(
        DOMAIN, "manage_section", handle_manage_section, schema=MANAGE_SECTION_SCHEMA
    )
    _LOGGER.info("Service registered: manage_section")

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
