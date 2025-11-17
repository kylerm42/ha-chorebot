"""Sensor platform for ChoreBot integration."""

from __future__ import annotations

import logging

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .people import PeopleStore

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up ChoreBot sensor platform."""
    _LOGGER.info("Setting up ChoreBot sensor platform")
    people_store: PeopleStore = hass.data[DOMAIN]["people_store"]

    # Create sensor entity
    sensor = ChoreBotPointsSensor(people_store)
    async_add_entities([sensor])
    _LOGGER.info("Sensor entity created: sensor.chorebot_points")


class ChoreBotPointsSensor(SensorEntity):
    """Sensor exposing points and rewards data."""

    _attr_has_entity_name = False
    _attr_name = "ChoreBot Points"
    _attr_unique_id = f"{DOMAIN}_points_sensor"

    def __init__(self, people_store: PeopleStore) -> None:
        """Initialize the sensor."""
        self._people_store = people_store

    @property
    def state(self) -> int:
        """Return total points across all people."""
        people = self._people_store.async_get_all_people()
        return sum(p.points_balance for p in people.values())

    @property
    def extra_state_attributes(self) -> dict:
        """Return people balances, rewards, and transactions."""
        people_data = self._people_store.async_get_all_people()
        rewards = self._people_store.async_get_all_rewards()
        transactions = self._people_store.async_get_transactions(limit=20)

        return {
            "people": {
                pid: {
                    "entity_id": p.entity_id,
                    "points_balance": p.points_balance,
                    "lifetime_points": p.lifetime_points,
                    "last_updated": p.last_updated,
                }
                for pid, p in people_data.items()
            },
            "rewards": [
                {
                    "id": r.id,
                    "name": r.name,
                    "cost": r.cost,
                    "icon": r.icon,
                    "enabled": r.enabled,
                    "description": r.description,
                }
                for r in rewards
            ],
            "recent_transactions": [
                {
                    "id": t.id,
                    "timestamp": t.timestamp,
                    "person_id": t.person_id,
                    "amount": t.amount,
                    "balance_after": t.balance_after,
                    "type": t.type,
                    "metadata": t.metadata,
                }
                for t in transactions
            ],
        }
