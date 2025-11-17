"""People points and rewards management for ChoreBot."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
import logging
from typing import Any
from uuid import uuid4

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_VERSION

_LOGGER = logging.getLogger(__name__)


@dataclass
class PersonPoints:
    """Person points data."""

    entity_id: str  # HA Person entity_id
    points_balance: int  # Current points (can be negative)
    lifetime_points: int  # Total earned (never decrements)
    last_updated: str  # ISO 8601 timestamp

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON storage."""
        return {
            "entity_id": self.entity_id,
            "points_balance": self.points_balance,
            "lifetime_points": self.lifetime_points,
            "last_updated": self.last_updated,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PersonPoints:
        """Create from dictionary."""
        return cls(
            entity_id=data["entity_id"],
            points_balance=data["points_balance"],
            lifetime_points=data["lifetime_points"],
            last_updated=data["last_updated"],
        )


@dataclass
class Transaction:
    """Point transaction record."""

    id: str  # Unique transaction ID
    timestamp: str  # ISO 8601 timestamp
    person_id: str  # HA Person entity_id
    amount: int  # Points added/subtracted (can be negative)
    balance_after: int  # Balance after transaction
    type: str  # Transaction type (task_completion, etc.)
    metadata: dict[str, Any]  # Type-specific metadata

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON storage."""
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "person_id": self.person_id,
            "amount": self.amount,
            "balance_after": self.balance_after,
            "type": self.type,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Transaction:
        """Create from dictionary."""
        return cls(
            id=data["id"],
            timestamp=data["timestamp"],
            person_id=data["person_id"],
            amount=data["amount"],
            balance_after=data["balance_after"],
            type=data["type"],
            metadata=data["metadata"],
        )


@dataclass
class Reward:
    """Configurable reward."""

    id: str  # Unique reward ID
    name: str  # Display name
    cost: int  # Point cost
    icon: str  # MDI icon (e.g., "mdi:television")
    enabled: bool  # Whether reward is available
    description: str  # Optional description
    created: str  # ISO 8601 timestamp
    modified: str  # ISO 8601 timestamp

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON storage."""
        return {
            "id": self.id,
            "name": self.name,
            "cost": self.cost,
            "icon": self.icon,
            "enabled": self.enabled,
            "description": self.description,
            "created": self.created,
            "modified": self.modified,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Reward:
        """Create from dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            cost=data["cost"],
            icon=data["icon"],
            enabled=data["enabled"],
            description=data.get("description", ""),
            created=data["created"],
            modified=data["modified"],
        )


@dataclass
class Redemption:
    """Reward redemption record."""

    id: str  # Unique redemption ID
    timestamp: str  # ISO 8601 timestamp
    person_id: str  # HA Person entity_id
    reward_id: str  # Reward ID
    reward_name: str  # Reward name (snapshot)
    cost: int  # Points spent (snapshot)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON storage."""
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "person_id": self.person_id,
            "reward_id": self.reward_id,
            "reward_name": self.reward_name,
            "cost": self.cost,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Redemption:
        """Create from dictionary."""
        return cls(
            id=data["id"],
            timestamp=data["timestamp"],
            person_id=data["person_id"],
            reward_id=data["reward_id"],
            reward_name=data["reward_name"],
            cost=data["cost"],
        )


class PeopleStore:
    """Manages JSON storage for person points, transactions, and rewards."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the people store."""
        self.hass = hass
        # Split into separate stores for better performance
        self._people_store = Store(hass, STORAGE_VERSION, f"{DOMAIN}_people")
        self._rewards_store = Store(hass, STORAGE_VERSION, f"{DOMAIN}_rewards")
        self._transactions_store = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}_transactions"
        )
        self._redemptions_store = Store(hass, STORAGE_VERSION, f"{DOMAIN}_redemptions")
        self._data: dict[str, Any] = {}
        self._lock = asyncio.Lock()

    async def async_load(self) -> None:
        """Load people data from storage."""
        async with self._lock:
            # Load from split files
            people_data = await self._people_store.async_load()
            rewards_data = await self._rewards_store.async_load()
            transactions_data = await self._transactions_store.async_load()
            redemptions_data = await self._redemptions_store.async_load()

            self._data = {
                "people": people_data.get("people", {}) if people_data else {},
                "rewards": rewards_data.get("rewards", []) if rewards_data else [],
                "transactions": transactions_data.get("transactions", [])
                if transactions_data
                else [],
                "redemptions": redemptions_data.get("redemptions", [])
                if redemptions_data
                else [],
            }

            _LOGGER.info(
                "Loaded people data: %d people, %d transactions, %d rewards, %d redemptions",
                len(self._data.get("people", {})),
                len(self._data.get("transactions", [])),
                len(self._data.get("rewards", [])),
                len(self._data.get("redemptions", [])),
            )

    async def async_save(self) -> None:
        """Save all people data to storage. Must be called with lock held.

        WARNING: This saves all 4 files. For performance, prefer the specific save methods:
        - async_save_people() for people balances
        - async_save_rewards() for rewards catalog
        - async_save_transactions() for transaction log
        - async_save_redemptions() for redemption history
        """
        await self._people_store.async_save({"people": self._data.get("people", {})})
        await self._rewards_store.async_save({"rewards": self._data.get("rewards", [])})
        await self._transactions_store.async_save(
            {"transactions": self._data.get("transactions", [])}
        )
        await self._redemptions_store.async_save(
            {"redemptions": self._data.get("redemptions", [])}
        )

    async def async_save_people(self) -> None:
        """Save only people balances. Must be called with lock held."""
        await self._people_store.async_save({"people": self._data.get("people", {})})

    async def async_save_rewards(self) -> None:
        """Save only rewards catalog. Must be called with lock held."""
        await self._rewards_store.async_save({"rewards": self._data.get("rewards", [])})

    async def async_save_transactions(self) -> None:
        """Save only transaction log. Must be called with lock held."""
        await self._transactions_store.async_save(
            {"transactions": self._data.get("transactions", [])}
        )

    async def async_save_redemptions(self) -> None:
        """Save only redemption history. Must be called with lock held."""
        await self._redemptions_store.async_save(
            {"redemptions": self._data.get("redemptions", [])}
        )

    # ==================== Person Points Methods ====================

    def async_get_person_balance(self, person_id: str) -> int:
        """Get current point balance for a person (synchronous, no await needed)."""
        people = self._data.get("people", {})
        if person_id in people:
            return people[person_id]["points_balance"]
        return 0

    def async_get_all_people(self) -> dict[str, PersonPoints]:
        """Get all people with their balances (synchronous, no await needed)."""
        people_data = self._data.get("people", {})
        return {
            person_id: PersonPoints.from_dict(data)
            for person_id, data in people_data.items()
        }

    async def async_add_points(
        self,
        person_id: str,
        amount: int,
        transaction_type: str,
        metadata: dict[str, Any],
    ) -> str:
        """Add/subtract points and create transaction record.

        Args:
            person_id: HA Person entity_id
            amount: Points to add (negative to subtract)
            transaction_type: Type of transaction
            metadata: Type-specific metadata

        Returns:
            Transaction ID
        """
        async with self._lock:
            people = self._data.setdefault("people", {})
            transactions = self._data.setdefault("transactions", [])

            # Get or create person record
            if person_id not in people:
                now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
                people[person_id] = {
                    "entity_id": person_id,
                    "points_balance": 0,
                    "lifetime_points": 0,
                    "last_updated": now,
                }

            person = people[person_id]

            # Update balance
            old_balance = person["points_balance"]
            new_balance = old_balance + amount
            person["points_balance"] = new_balance

            # Update lifetime points (only if positive amount)
            if amount > 0:
                person["lifetime_points"] += amount

            # Update timestamp
            now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
            person["last_updated"] = now

            # Create transaction record
            transaction_id = f"txn_{uuid4().hex[:12]}"
            transaction = {
                "id": transaction_id,
                "timestamp": now,
                "person_id": person_id,
                "amount": amount,
                "balance_after": new_balance,
                "type": transaction_type,
                "metadata": metadata,
            }
            transactions.append(transaction)

            # Save only the affected files for performance
            await self.async_save_people()
            await self.async_save_transactions()

            _LOGGER.info(
                "Points transaction: %s %+d pts (%d -> %d) [%s]",
                person_id,
                amount,
                old_balance,
                new_balance,
                transaction_type,
            )

            return transaction_id

    def async_get_transactions(
        self,
        person_id: str | None = None,
        limit: int | None = None,
    ) -> list[Transaction]:
        """Get transaction history (synchronous, no await needed).

        Args:
            person_id: Filter by person (None = all)
            limit: Max transactions to return (None = all)

        Returns:
            List of transactions, newest first
        """
        transactions_data = self._data.get("transactions", [])
        transactions = [Transaction.from_dict(t) for t in transactions_data]

        # Filter by person if specified
        if person_id:
            transactions = [t for t in transactions if t.person_id == person_id]

        # Sort by timestamp descending (newest first)
        transactions.sort(key=lambda t: t.timestamp, reverse=True)

        # Apply limit
        if limit:
            transactions = transactions[:limit]

        return transactions

    # ==================== Reward Methods ====================

    async def async_create_reward(
        self,
        reward_id: str | None,
        name: str,
        cost: int,
        icon: str,
        description: str = "",
    ) -> str:
        """Create or update a reward.

        Args:
            reward_id: Reward ID (None = auto-generate)
            name: Display name
            cost: Point cost
            icon: MDI icon
            description: Optional description

        Returns:
            Reward ID
        """
        async with self._lock:
            rewards = self._data.setdefault("rewards", [])
            now = datetime.now(UTC).isoformat().replace("+00:00", "Z")

            # Auto-generate ID if not provided
            if not reward_id:
                reward_id = f"reward_{uuid4().hex[:8]}"

            # Check if reward exists
            existing_reward = None
            for i, r in enumerate(rewards):
                if r["id"] == reward_id:
                    existing_reward = i
                    break

            if existing_reward is not None:
                # Update existing reward
                reward = rewards[existing_reward]
                reward["name"] = name
                reward["cost"] = cost
                reward["icon"] = icon
                reward["description"] = description
                reward["modified"] = now
                _LOGGER.info("Updated reward: %s", name)
            else:
                # Create new reward
                reward = {
                    "id": reward_id,
                    "name": name,
                    "cost": cost,
                    "icon": icon,
                    "enabled": True,
                    "description": description,
                    "created": now,
                    "modified": now,
                }
                rewards.append(reward)
                _LOGGER.info("Created reward: %s (cost: %d pts)", name, cost)

            await self.async_save_rewards()
            return reward_id

    async def async_update_reward(
        self,
        reward_id: str,
        updates: dict[str, Any],
    ) -> bool:
        """Update reward fields.

        Args:
            reward_id: Reward ID
            updates: Fields to update (name, cost, icon, enabled, description)

        Returns:
            True if successful, False if reward not found
        """
        async with self._lock:
            rewards = self._data.get("rewards", [])

            for reward in rewards:
                if reward["id"] == reward_id:
                    # Update allowed fields
                    for key in ["name", "cost", "icon", "enabled", "description"]:
                        if key in updates:
                            reward[key] = updates[key]

                    # Update modified timestamp
                    reward["modified"] = (
                        datetime.now(UTC).isoformat().replace("+00:00", "Z")
                    )

                    await self.async_save_rewards()
                    _LOGGER.info("Updated reward %s: %s", reward_id, updates)
                    return True

            _LOGGER.warning("Reward not found for update: %s", reward_id)
            return False

    async def async_delete_reward(self, reward_id: str) -> bool:
        """Delete a reward.

        Args:
            reward_id: Reward ID

        Returns:
            True if successful, False if reward not found
        """
        async with self._lock:
            rewards = self._data.get("rewards", [])
            initial_count = len(rewards)

            # Remove reward
            self._data["rewards"] = [r for r in rewards if r["id"] != reward_id]

            if len(self._data["rewards"]) < initial_count:
                await self.async_save_rewards()
                _LOGGER.info("Deleted reward: %s", reward_id)
                return True

            _LOGGER.warning("Reward not found for deletion: %s", reward_id)
            return False

    def async_get_all_rewards(self, enabled_only: bool = False) -> list[Reward]:
        """Get all rewards (synchronous, no await needed).

        Args:
            enabled_only: Only return enabled rewards

        Returns:
            List of rewards
        """
        rewards_data = self._data.get("rewards", [])
        rewards = [Reward.from_dict(r) for r in rewards_data]

        if enabled_only:
            rewards = [r for r in rewards if r.enabled]

        # Sort by cost ascending
        rewards.sort(key=lambda r: r.cost)

        return rewards

    async def async_redeem_reward(
        self,
        person_id: str,
        reward_id: str,
    ) -> tuple[bool, str]:
        """Redeem a reward for a person.

        Args:
            person_id: HA Person entity_id
            reward_id: Reward ID

        Returns:
            (success: bool, message: str)
        """
        async with self._lock:
            # Validate reward exists and is enabled
            rewards = self._data.get("rewards", [])
            reward = None
            for r in rewards:
                if r["id"] == reward_id:
                    reward = r
                    break

            if not reward:
                return False, f"Reward not found: {reward_id}"

            if not reward["enabled"]:
                return False, f"Reward is disabled: {reward['name']}"

            # Check person has sufficient points
            people = self._data.get("people", {})
            if person_id not in people:
                return False, f"Person has no points: {person_id}"

            person = people[person_id]
            balance = person["points_balance"]
            cost = reward["cost"]

            if balance < cost:
                return False, f"Insufficient points: {balance} < {cost}"

            # Deduct points
            transaction_id = await self._add_points_locked(
                person_id,
                -cost,
                "reward_redemption",
                {
                    "reward_id": reward_id,
                    "reward_name": reward["name"],
                },
            )

            # Create redemption record
            redemptions = self._data.setdefault("redemptions", [])
            now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
            redemption = {
                "id": f"redemption_{uuid4().hex[:12]}",
                "timestamp": now,
                "person_id": person_id,
                "reward_id": reward_id,
                "reward_name": reward["name"],
                "cost": cost,
            }
            redemptions.append(redemption)

            # Save only affected files for performance
            await self.async_save_people()
            await self.async_save_transactions()
            await self.async_save_redemptions()

            _LOGGER.info(
                "Reward redeemed: %s by %s (cost: %d pts)",
                reward["name"],
                person_id,
                cost,
            )

            return True, f"Successfully redeemed {reward['name']}"

    async def _add_points_locked(
        self,
        person_id: str,
        amount: int,
        transaction_type: str,
        metadata: dict[str, Any],
    ) -> str:
        """Internal method to add points when lock is already held."""
        people = self._data.setdefault("people", {})
        transactions = self._data.setdefault("transactions", [])

        # Get or create person record
        if person_id not in people:
            now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
            people[person_id] = {
                "entity_id": person_id,
                "points_balance": 0,
                "lifetime_points": 0,
                "last_updated": now,
            }

        person = people[person_id]

        # Update balance
        old_balance = person["points_balance"]
        new_balance = old_balance + amount
        person["points_balance"] = new_balance

        # Update lifetime points (only if positive amount)
        if amount > 0:
            person["lifetime_points"] += amount

        # Update timestamp
        now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        person["last_updated"] = now

        # Create transaction record
        transaction_id = f"txn_{uuid4().hex[:12]}"
        transaction = {
            "id": transaction_id,
            "timestamp": now,
            "person_id": person_id,
            "amount": amount,
            "balance_after": new_balance,
            "type": transaction_type,
            "metadata": metadata,
        }
        transactions.append(transaction)

        return transaction_id

    async def async_sync_people(self, person_entity_ids: list[str]) -> int:
        """Sync people records with HA person entities.

        Creates missing people with 0 points. Does not remove people who no longer have entities.

        Args:
            person_entity_ids: List of HA person entity IDs

        Returns:
            Number of people created
        """
        async with self._lock:
            people = self._data.setdefault("people", {})
            now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
            created_count = 0

            for person_id in person_entity_ids:
                if person_id not in people:
                    # Create new person with 0 points
                    people[person_id] = {
                        "entity_id": person_id,
                        "points_balance": 0,
                        "lifetime_points": 0,
                        "last_updated": now,
                    }
                    created_count += 1
                    _LOGGER.info("Created person record: %s", person_id)

            if created_count > 0:
                await self.async_save_people()
                _LOGGER.info("Synced %d new people records", created_count)
            else:
                _LOGGER.debug("All person entities already have records")

            return created_count

    def async_get_redemptions(
        self,
        person_id: str | None = None,
        limit: int | None = None,
    ) -> list[Redemption]:
        """Get redemption history (synchronous, no await needed).

        Args:
            person_id: Filter by person (None = all)
            limit: Max redemptions to return (None = all)

        Returns:
            List of redemptions, newest first
        """
        redemptions_data = self._data.get("redemptions", [])
        redemptions = [Redemption.from_dict(r) for r in redemptions_data]

        # Filter by person if specified
        if person_id:
            redemptions = [r for r in redemptions if r.person_id == person_id]

        # Sort by timestamp descending (newest first)
        redemptions.sort(key=lambda r: r.timestamp, reverse=True)

        # Apply limit
        if limit:
            redemptions = redemptions[:limit]

        return redemptions
