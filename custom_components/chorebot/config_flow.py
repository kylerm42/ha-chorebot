"""Config flow for ChoreBot integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.helpers import config_validation as cv

from .const import (
    CONF_TICKTICK_CLIENT_ID,
    CONF_TICKTICK_CLIENT_SECRET,
    CONF_TICKTICK_ENABLED,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)


class ChoreBotConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for ChoreBot."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        """Handle the initial step."""
        errors: dict[str, str] = {}

        # Only allow a single instance
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            # For now, just create the entry with default settings
            # TickTick sync will be added later
            _LOGGER.info("Creating ChoreBot integration with local storage")
            return self.async_create_entry(
                title="ChoreBot",
                data={
                    CONF_TICKTICK_ENABLED: False,
                },
            )

        # Simple config flow - just confirm to create integration
        data_schema = vol.Schema({})

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "info": "This will create a ChoreBot integration with local file storage. TickTick sync can be added later."
            },
        )

    async def async_step_ticktick(self, user_input: dict[str, Any] | None = None):
        """Handle TickTick OAuth configuration step."""
        # TODO: Implement TickTick OAuth flow
        # For now, this step is not used
        errors: dict[str, str] = {}

        if user_input is not None:
            # TODO: Validate TickTick OAuth credentials
            return self.async_create_entry(title="ChoreBot", data=user_input)

        data_schema = vol.Schema(
            {
                vol.Required(CONF_TICKTICK_CLIENT_ID): cv.string,
                vol.Required(CONF_TICKTICK_CLIENT_SECRET): cv.string,
            }
        )

        return self.async_show_form(
            step_id="ticktick",
            data_schema=data_schema,
            errors=errors,
        )
