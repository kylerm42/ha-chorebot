"""OAuth API wrapper for ChoreBot integration."""

from aiohttp import ClientSession

from homeassistant.helpers import config_entry_oauth2_flow


class AsyncConfigEntryAuth:
    """Provide authentication tied to an OAuth2 based config entry."""

    def __init__(
        self,
        websession: ClientSession,
        oauth_session: config_entry_oauth2_flow.OAuth2Session,
    ) -> None:
        """Initialize OAuth auth."""
        self._websession = websession
        self._oauth_session = oauth_session

    async def async_get_access_token(self) -> str:
        """Return a valid access token."""
        await self._oauth_session.async_ensure_token_valid()
        return self._oauth_session.token["access_token"]

    @property
    def websession(self) -> ClientSession:
        """Return the aiohttp client session."""
        return self._websession
