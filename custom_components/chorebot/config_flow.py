"""Config flow for ChoreBot integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
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

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            # TODO: Validate TickTick credentials if enabled
            return self.async_create_entry(title="ChoreBot", data=user_input)

        data_schema = vol.Schema(
            {
                vol.Optional(CONF_TICKTICK_ENABLED, default=False): cv.boolean,
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=errors,
        )

    async def async_step_ticktick(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle TickTick OAuth configuration step."""
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
