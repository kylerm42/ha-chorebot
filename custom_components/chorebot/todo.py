"""Todo platform for ChoreBot integration."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

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

if TYPE_CHECKING:
    pass

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up ChoreBot todo platform."""
    # TODO: Load lists from chorebot_config.json
    # For now, create a default list
    async_add_entities([ChoreBotTodoListEntity(hass, "my_chores", "My Chores")])


class ChoreBotTodoListEntity(TodoListEntity):
    """A ChoreBot todo list entity."""

    _attr_has_entity_name = True
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.SET_DUE_DATE_ON_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
    )

    def __init__(self, hass: HomeAssistant, list_id: str, list_name: str) -> None:
        """Initialize the todo list entity."""
        self.hass = hass
        self._list_id = list_id
        self._attr_name = list_name
        self._attr_unique_id = f"{DOMAIN}_{list_id}"

    @property
    def todo_items(self) -> list[TodoItem]:
        """Return the todo items."""
        # TODO: Read from .storage/chorebot_{list_id}.json
        # Filter out items where deleted_at is not null
        return []

    async def async_create_todo_item(self, item: TodoItem) -> None:
        """Create a new todo item."""
        # TODO: Write to JSON storage with full custom_fields
        _LOGGER.info("Creating todo item: %s", item.summary)

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Update a todo item."""
        # TODO: Update JSON storage
        # TODO: Handle recurring task completion logic (advance due date, update streak)
        _LOGGER.info("Updating todo item: %s", item.summary)

    async def async_delete_todo_item(self, uid: str) -> None:
        """Delete a todo item (soft delete)."""
        # TODO: Set deleted_at timestamp in JSON storage
        _LOGGER.info("Deleting todo item: %s", uid)
