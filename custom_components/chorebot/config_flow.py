"""Config flow for ChoreBot integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.helpers import config_validation as cv

from .const import (
    CONF_LIST_MAPPINGS,
    CONF_SYNC_INTERVAL_MINUTES,
    CONF_TICKTICK_CLIENT_ID,
    CONF_TICKTICK_CLIENT_SECRET,
    CONF_TICKTICK_ENABLED,
    CONF_TICKTICK_OAUTH_TOKEN,
    CONF_TICKTICK_USERNAME,
    DEFAULT_SYNC_INTERVAL_MINUTES,
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
            if user_input.get(CONF_TICKTICK_ENABLED, False):
                # User wants TickTick sync, proceed to OAuth setup
                return await self.async_step_ticktick()
            else:
                # Local-only mode
                _LOGGER.info("Creating ChoreBot integration with local storage only")
                return self.async_create_entry(
                    title="ChoreBot",
                    data={
                        CONF_TICKTICK_ENABLED: False,
                        CONF_SYNC_INTERVAL_MINUTES: DEFAULT_SYNC_INTERVAL_MINUTES,
                        CONF_LIST_MAPPINGS: {},
                    },
                )

        # Ask if user wants to enable TickTick sync
        data_schema = vol.Schema({
            vol.Optional(CONF_TICKTICK_ENABLED, default=False): cv.boolean,
        })

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "info": "ChoreBot provides local task management with optional TickTick synchronization."
            },
        )

    async def async_step_ticktick(self, user_input: dict[str, Any] | None = None):
        """Handle TickTick OAuth configuration step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            # Store credentials temporarily for next step
            # Note: Actual OAuth token will be obtained when we initialize the client
            self._ticktick_config = {
                CONF_TICKTICK_ENABLED: True,
                CONF_TICKTICK_CLIENT_ID: user_input[CONF_TICKTICK_CLIENT_ID],
                CONF_TICKTICK_CLIENT_SECRET: user_input[CONF_TICKTICK_CLIENT_SECRET],
                CONF_TICKTICK_USERNAME: user_input[CONF_TICKTICK_USERNAME],
                CONF_SYNC_INTERVAL_MINUTES: DEFAULT_SYNC_INTERVAL_MINUTES,
            }

            # Try to validate credentials by initializing TickTick client
            try:
                # Import here to avoid loading at module level
                from ticktick.oauth2 import OAuth2
                from ticktick.api import TickTickClient

                # Note: OAuth flow will happen in background
                # For now, just save credentials and proceed
                _LOGGER.info("TickTick credentials provided, proceeding to project import")

                # Proceed to import existing TickTick projects
                return await self.async_step_import_projects()

            except Exception as err:  # noqa: BLE001
                _LOGGER.error("Error validating TickTick credentials: %s", err)
                errors["base"] = "invalid_auth"

        data_schema = vol.Schema(
            {
                vol.Required(CONF_TICKTICK_USERNAME): cv.string,
                vol.Required(CONF_TICKTICK_CLIENT_ID): cv.string,
                vol.Required(CONF_TICKTICK_CLIENT_SECRET): cv.string,
            }
        )

        return self.async_show_form(
            step_id="ticktick",
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "info": "Register an app at https://developer.ticktick.com/manage to get your client ID and secret. "
                        "The redirect URI should be http://127.0.0.1:8080 (or http://localhost:8080)."
            },
        )

    async def async_step_import_projects(self, user_input: dict[str, Any] | None = None):
        """Handle importing existing TickTick projects."""
        # For now, skip the import step and create the entry
        # The actual OAuth will happen on first sync, and users can configure
        # project imports via the options flow later

        # TODO: Fetch TickTick projects and let user select which to import
        # This requires completing OAuth first, which needs browser access

        _LOGGER.info("Creating ChoreBot entry with TickTick sync enabled")

        config_data = {
            **self._ticktick_config,
            CONF_LIST_MAPPINGS: {},
            CONF_TICKTICK_OAUTH_TOKEN: None,  # Will be populated on first sync
        }

        return self.async_create_entry(
            title="ChoreBot",
            data=config_data,
        )
