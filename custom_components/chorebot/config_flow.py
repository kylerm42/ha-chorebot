"""Config flow for ChoreBot integration."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

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
        """Handle the initial step - ask about sync preferences."""
        # Only allow a single instance
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            # Store user's sync preference
            sync_backend = user_input.get("sync_backend", "none")
            if sync_backend == BACKEND_TICKTICK:
                # User wants TickTick sync - proceed to OAuth
                return await self.async_step_oauth()

            # User doesn't want sync - create entry without OAuth
            _LOGGER.info("Creating ChoreBot entry without sync")
            return self.async_create_entry(
                title="ChoreBot",
                data={
                    CONF_SYNC_ENABLED: False,
                },
            )

        # Show form asking about sync backend
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required("sync_backend", default="none"): vol.In(
                        ["none", BACKEND_TICKTICK]
                    ),
                }
            ),
        )

    async def async_step_oauth(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle OAuth flow for sync setup."""
        # This will trigger the OAuth flow from the parent class
        return await super().async_step_user(user_input)

    async def async_oauth_create_entry(self, data: dict[str, Any]) -> ConfigFlowResult:
        """Create an entry after OAuth is complete."""
        _LOGGER.info("Creating ChoreBot entry with sync enabled")

        # Add sync configuration
        data[CONF_SYNC_ENABLED] = True
        data[CONF_SYNC_BACKEND] = BACKEND_TICKTICK
        # Note: list mappings are now stored in storage, not config entry

        return self.async_create_entry(
            title="ChoreBot",
            data=data,
        )
