"""Config flow for ChoreBot integration."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigFlowResult
from homeassistant.helpers import config_entry_oauth2_flow

from .const import BACKEND_TICKTICK, CONF_SYNC_BACKEND, CONF_SYNC_ENABLED, DOMAIN

_LOGGER = logging.getLogger(__name__)


class ChoreBotConfigFlow(
    config_entry_oauth2_flow.AbstractOAuth2FlowHandler,
    domain=DOMAIN,
):
    """Handle a config flow for ChoreBot."""

    VERSION = 1
    DOMAIN = DOMAIN

    @property
    def logger(self) -> logging.Logger:
        """Return logger."""
        return _LOGGER

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle the initial step."""
        # Only allow a single instance
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        # For now, automatically start OAuth flow for TickTick
        # In the future, could add a step to select backend (TickTick, Todoist, etc.)
        return await super().async_step_user(user_input)

    async def async_oauth_create_entry(self, data: dict[str, Any]) -> ConfigFlowResult:
        """Create an entry after OAuth is complete."""
        _LOGGER.info("Creating ChoreBot entry with sync enabled")

        # Add sync configuration
        data[CONF_SYNC_ENABLED] = True
        data[CONF_SYNC_BACKEND] = BACKEND_TICKTICK

        return self.async_create_entry(
            title="ChoreBot",
            data=data,
        )
