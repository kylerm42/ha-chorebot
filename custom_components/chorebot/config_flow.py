"""Config flow for ChoreBot integration."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import config_entry_oauth2_flow, selector

from .const import (
    BACKEND_TICKTICK,
    CONF_POINTS_DISPLAY,
    CONF_POINTS_ICON,
    CONF_POINTS_TEXT,
    CONF_SYNC_BACKEND,
    CONF_SYNC_ENABLED,
    DEFAULT_POINTS_ICON,
    DEFAULT_POINTS_TEXT,
    DOMAIN,
)

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

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Get the options flow for this handler."""
        return ChoreBotOptionsFlowHandler()


class ChoreBotOptionsFlowHandler(OptionsFlow):
    """Handle options flow for ChoreBot."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Manage the options for ChoreBot."""
        # Get store to read current config
        store = self.hass.data[DOMAIN]["store"]
        current_config = store.get_points_display()

        errors: dict[str, str] = {}

        if user_input is not None:
            # Validate inputs
            text = user_input.get(CONF_POINTS_TEXT, "").strip()
            icon = user_input.get(CONF_POINTS_ICON, "").strip()

            # Validation: at least one field must be non-empty
            if not text and not icon:
                text = DEFAULT_POINTS_TEXT  # Use default if both empty

            # Validate text length
            if len(text) > 50:
                errors[CONF_POINTS_TEXT] = "text_too_long"

            # Validate icon length
            if len(icon) > 100:
                errors[CONF_POINTS_ICON] = "icon_too_long"

            if not errors:
                # Update config in store
                async with store._lock:
                    store._config_data[CONF_POINTS_DISPLAY] = {
                        CONF_POINTS_TEXT: text,
                        CONF_POINTS_ICON: icon,
                    }
                    await store.async_save_config()

                # Reload integration to apply changes
                await self.hass.config_entries.async_reload(self.config_entry.entry_id)

                return self.async_create_entry(title="", data={})

        # Show form with current values
        # Use suggested_value instead of default to allow clearing fields
        text_suggested = current_config.get(CONF_POINTS_TEXT, "")
        icon_suggested = current_config.get(CONF_POINTS_ICON, "")

        # If both are empty (new install), suggest "points" for text
        if not text_suggested and not icon_suggested:
            text_suggested = DEFAULT_POINTS_TEXT

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_POINTS_TEXT,
                        description={"suggested_value": text_suggested},
                    ): selector.TextSelector(
                        selector.TextSelectorConfig(type=selector.TextSelectorType.TEXT)
                    ),
                    vol.Optional(
                        CONF_POINTS_ICON,
                        description={"suggested_value": icon_suggested},
                    ): selector.IconSelector(),
                }
            ),
            errors=errors,
        )
