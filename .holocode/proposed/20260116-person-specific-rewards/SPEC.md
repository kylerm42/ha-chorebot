# Feature Spec: Person-Specific Rewards

## 1. Overview

**Purpose:** Transform the rewards system from global rewards (redeemable by anyone) to person-specific rewards (each reward belongs to one person only). This enables personalized reward catalogs where each person has their own unique set of redeemable items.

**User Story:** As a parent, I want to create different rewards for each child (e.g., video games for one, extra allowance for another) so that rewards are personalized to each person's interests and the redemption interface is cleaner.

## 2. Requirements

### Functional Requirements

- [ ] Rewards must have a **required** `person_id` field linking them to a specific Home Assistant person entity
- [ ] Rewards card must be configured to display rewards for a single person only
- [ ] Remove multi-person redemption UI (person selector at top of rewards card)
- [ ] Click on reward card should open redemption confirmation modal (no separate "Redeem" button)
- [ ] Add "Add Reward" placeholder card at end of person's rewards list
- [ ] "Add Reward" card should open a create reward modal with person_id pre-filled
- [ ] Backend validation: Only allow redemption if reward belongs to the person
- [ ] Support `hide_card_background` config option to remove card background and padding
- [ ] All existing rewards must be migrated to have a `person_id` (data migration on integration load)

### Non-Functional Requirements

- [ ] Maintain data integrity: No orphaned rewards when person entities are deleted
- [ ] Performance: Filtering rewards by person should be efficient
- [ ] Clean migration: One-time data migration assigns all existing rewards to first available person

## 3. Architecture & Design

### High-Level Approach

**Three-Layer Architecture (matching ChoreBot design):**

1. **Data Layer** (`people.py`): Add `person_id` field to `Reward` dataclass
2. **Service Layer** (`services.yaml` + `__init__.py`): Update `manage_reward` service to accept `person_id`, add validation to `redeem_reward`
3. **Frontend Layer** (new `person-rewards-card.ts`): New card component configured for single person

### Component Interaction

```
┌─────────────────────────────────────┐
│  person-rewards-card.ts              │
│  (configured with person_entity)    │
└───────────┬─────────────────────────┘
            │
            │ filters rewards by person_id
            │
            ↓
┌─────────────────────────────────────┐
│  sensor.chorebot_points              │
│  attributes.rewards (list)           │
└───────────┬─────────────────────────┘
            │
            │ reads from
            │
            ↓
┌─────────────────────────────────────┐
│  chorebot_rewards (JSON storage)    │
│  rewards: [{id, name, cost, icon,   │
│             person_id, ...}]         │
└─────────────────────────────────────┘
```

### Critical Design Decisions

**Decision 1: New Card vs. Modify Existing Card**

- **Chosen:** Create new `chorebot-person-rewards-card` component
- **Rationale:**
  - Clean separation of concerns (old card = global rewards, new card = person-specific)
  - Avoid breaking existing installations that use the current rewards card
  - Allows gradual migration path (users can switch at their own pace)
  - Old card can be deprecated/removed in future major version
- **Trade-offs:**
  - Slightly more code to maintain initially
  - BUT: Cleaner, safer migration path
  - Better user experience (no breaking changes)

**Decision 2: Reward `person_id` Field (Required)**

- **Chosen:** Required field with one-time data migration
- **Rationale:**
  - System is still in development, no production users to worry about
  - Simpler data model (no "global vs. person-specific" duality)
  - Cleaner validation logic (always check person_id)
  - More predictable behavior for users
- **Trade-offs:**
  - Requires one-time migration of existing rewards
  - BUT: System is in development, migration is trivial (assign to first person)
  - Cleaner long-term codebase

**Decision 3: Redemption UI (Modal on Click vs. Button)**

- **Chosen:** Click reward card → open confirmation modal (no "Redeem" button)
- **Rationale:**
  - Cleaner UI (one fewer button per card)
  - Matches user's requested UX
  - Still has confirmation step to prevent accidental redemptions
- **Trade-offs:**
  - Less explicit than a "Redeem" button
  - BUT: Confirmation modal makes intent clear

**Decision 4: "Add Reward" Placeholder**

- **Chosen:** Special placeholder card at end of grid with plus icon
- **Rationale:**
  - Intuitive UX (matches patterns in mobile apps like iOS)
  - Keeps creation flow in same context as viewing rewards
  - Pre-fills `person_id` automatically
- **Trade-offs:**
  - Requires "edit mode" detection or always-visible approach
  - BUT: Always-visible is simpler and more discoverable

**Decision 5: Card Background Customization**

- **Chosen:** Add `hide_card_background` config option
- **Rationale:**
  - Consistent with other ChoreBot cards (list card, grouped card, etc.)
  - Allows seamless integration with dashboard layouts
  - Users can stack multiple person reward cards without visual clutter
- **Trade-offs:** None (standard feature across all cards)

## 4. Data Model Changes

### Schema Modifications

**`chorebot_rewards` Storage File:**

```json
{
  "version": 1,
  "minor_version": 1,
  "key": "chorebot_rewards",
  "data": {
    "rewards": [
      {
        "id": "reward_abc123",
        "name": "Extra Screen Time (30min)",
        "cost": 50,
        "icon": "mdi:television",
        "enabled": true,
        "description": "Get 30 extra minutes of screen time",
        "created": "2025-12-02T10:00:00Z",
        "modified": "2025-12-02T10:00:00Z",
        "person_id": "person.kyle" // REQUIRED FIELD
      },
      {
        "id": "reward_def456",
        "name": "Ice Cream Trip",
        "cost": 100,
        "icon": "mdi:ice-cream",
        "enabled": true,
        "description": "Family trip to ice cream shop",
        "created": "2025-11-01T10:00:00Z",
        "modified": "2025-11-01T10:00:00Z",
        "person_id": "person.campbell" // REQUIRED FIELD
      }
    ]
  }
}
```

### Backend Changes

**`people.py` - `Reward` Dataclass:**

```python
@dataclass
class Reward:
    """Configurable reward."""
    id: str
    name: str
    cost: int
    icon: str
    enabled: bool
    description: str
    created: str
    modified: str
    person_id: str  # REQUIRED: Person this reward belongs to

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
            "person_id": self.person_id,  # Always included
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
            person_id=data["person_id"],  # Required field
        )
```

**`people.py` - `PeopleStore` Methods:**

```python
async def async_create_reward(
    self,
    reward_id: str | None,
    name: str,
    cost: int,
    icon: str,
    person_id: str,  # REQUIRED parameter
    description: str = "",
) -> str:
    """Create or update a reward. person_id is required."""
    # ... existing logic ...
    reward = {
        "id": reward_id,
        "name": name,
        "cost": cost,
        "icon": icon,
        "enabled": True,
        "description": description,
        "created": now,
        "modified": now,
        "person_id": person_id,  # Always included
    }

    rewards.append(reward)
    # ... save logic ...

def async_get_all_rewards(
    self,
    enabled_only: bool = False,
    person_id: str | None = None,  # Optional filter parameter
) -> list[Reward]:
    """Get all rewards, optionally filtered by person."""
    rewards_data = self._data.get("rewards", [])
    rewards = [Reward.from_dict(r) for r in rewards_data]

    # NEW: Filter by person if specified
    if person_id is not None:
        rewards = [r for r in rewards if r.person_id == person_id]

    if enabled_only:
        rewards = [r for r in rewards if r.enabled]

    rewards.sort(key=lambda r: r.cost)
    return rewards

async def async_redeem_reward(
    self,
    person_id: str,
    reward_id: str,
) -> tuple[bool, str]:
    """Redeem a reward for a person with person_id validation."""
    async with self._lock:
        # ... existing reward lookup ...

        # REQUIRED: Validate person_id matches (field is now required)
        if reward["person_id"] != person_id:
            return False, f"This reward belongs to {reward['person_id']}, not {person_id}"

        # ... rest of existing logic ...
```

**Data Migration Logic:**

```python
async def async_load(self) -> None:
    """Load people data from storage with migration."""
    async with self._lock:
        # ... existing load logic ...

        # MIGRATION: Add person_id to rewards that don't have it
        rewards = self._data.get("rewards", [])
        people = self._data.get("people", {})

        if rewards and people:
            # Get first available person entity
            first_person_id = next(iter(people.keys()), None)

            if first_person_id:
                needs_save = False
                for reward in rewards:
                    if "person_id" not in reward:
                        reward["person_id"] = first_person_id
                        needs_save = True
                        _LOGGER.info(
                            "Migrated reward '%s' to person_id: %s",
                            reward["name"],
                            first_person_id,
                        )

                if needs_save:
                    await self.async_save_rewards()
                    _LOGGER.info("Completed reward migration to person-specific model")
```

## 5. Execution Strategy

### Option A: Phased Rollout

**Phase 1: Backend Foundation**

- **Goal:** Make `person_id` required field with one-time data migration
- **Scope:** `custom_components/chorebot/people.py`, `services.yaml`, `__init__.py`
- **Dependencies:** None
- **Concurrency:** Can run in parallel with Phase 2 planning
- **Key Implementation Notes:**
  - Change `person_id` from `str | None = None` to `str` (required field) in `Reward` dataclass
  - Update `async_create_reward()` to require `person_id` parameter (no default)
  - Add data migration in `async_load()`: assign all rewards without `person_id` to first available person
  - Update validation in `async_redeem_reward()` (always check person_id, no null checks)
  - Update `manage_reward` service in `services.yaml` to require `person_id` field
  - **CRITICAL:** Migration runs once on first load after upgrade, logs each migrated reward

**Phase 2: Frontend - New Person Rewards Card**

- **Goal:** Create new card component for person-specific rewards display
- **Scope:** `src/person-rewards-card.ts`, `src/utils/types.ts`, `rollup.config.mjs`
- **Dependencies:** Phase 1 must be complete
- **Concurrency:** Cannot start until Phase 1 complete (needs backend `person_id` field)
- **Key Implementation Notes:**
  - Create new `ChoreBotPersonRewardsConfig` interface:
    - `person_entity` (required) - Person to show rewards for
    - `hide_card_background` (optional, default: false) - Remove card background/padding
    - `title`, `show_title`, `show_disabled_rewards`, `sort_by`, `show_add_reward_button`
  - Filter rewards by `person_id` in render logic
  - Remove people section (single person only)
  - Make reward cards clickable (open confirmation modal on click)
  - Add "Add Reward" placeholder card at end of grid
  - Create "Add Reward" modal with form fields (pre-fills `person_id` from config)
  - Call `chorebot.manage_reward` service with `person_id` parameter
  - Support `hide_card_background` CSS class (same as other ChoreBot cards)
  - Add to Rollup build configuration

**Phase 3: Documentation & Usage Examples**

- **Goal:** Document new card usage and configuration options
- **Scope:** `README.md`, inline documentation
- **Dependencies:** Phase 1 & 2 complete
- **Concurrency:** Can happen in parallel with testing
- **Key Implementation Notes:**
  - Document card configuration (YAML examples with `hide_card_background`)
  - Show stacked card layouts (multiple person cards without backgrounds)
  - Document "Add Reward" workflow
  - Explain data migration (automatic on upgrade)

## 6. Usage Scenarios / Edge Cases

### Scenario A: Happy Path - Create Person-Specific Reward

1. User adds `chorebot-person-rewards-card` to dashboard with `person_entity: person.kyle`
2. Card displays Kyle's existing rewards (filters by `person_id == "person.kyle"`)
3. User clicks "Add Reward" placeholder card
4. Modal opens with form: name, cost, icon, description
5. User fills form and clicks "Create"
6. Frontend calls `chorebot.manage_reward` with `person_id: "person.kyle"`
7. Backend creates reward with `person_id` field set
8. Card refreshes and shows new reward

### Scenario B: Redemption with Person Validation

1. Kyle's card displays "Video Game Time (100 pts)"
2. User clicks reward card (NOT a button)
3. Confirmation modal opens: "Are you sure? Kyle will spend 100 pts..."
4. User clicks "Redeem"
5. Backend validates: reward.person_id == "person.kyle" ✅
6. Points deducted, redemption recorded
7. Confetti animation plays

### Scenario C: Cross-Person Redemption Attempt (Error Case)

1. Campbell tries to redeem Kyle's reward via service call (malicious or bug)
2. Service call: `chorebot.redeem_reward` with `person_id: "person.campbell"`, `reward_id: "kyle_reward"`
3. Backend checks: `reward.person_id == "person.kyle"` but redeeming person is `"person.campbell"` ❌
4. Backend returns error: "This reward belongs to person.kyle, not person.campbell"
5. Frontend displays error message

### Scenario D: Data Migration on Upgrade

1. User has existing rewards without `person_id` field
2. Integration loads and detects rewards missing `person_id`
3. Migration logic assigns all rewards to first available person (e.g., "person.kyle")
4. Migration logs: "Migrated reward 'Ice Cream' to person_id: person.kyle"
5. All rewards now have `person_id` field (required)
6. New person-specific cards work immediately

### Scenario E: Person Entity Deleted

1. User deletes `person.kyle` from Home Assistant
2. Kyle's rewards still exist in storage with `person_id: "person.kyle"`
3. Old rewards card: Filters out Kyle (entity_id doesn't exist)
4. New person rewards card: Shows error "Person entity not found" (same as current person points card)
5. Rewards remain in storage (no data loss) for when entity is recreated

## 7. Frontend Implementation Details

### New Card: `chorebot-person-rewards-card`

**Config Interface:**

```typescript
export interface ChoreBotPersonRewardsConfig {
  type: "custom:chorebot-person-rewards-card";
  person_entity: string; // Required - e.g., "person.kyle"
  title?: string; // Default: "{Person Name}'s Rewards"
  show_title?: boolean; // Default: true
  hide_card_background?: boolean; // Default: false
  show_disabled_rewards?: boolean; // Default: false
  sort_by?: "cost" | "name" | "created"; // Default: "cost"
  show_add_reward_button?: boolean; // Default: true
}
```

**Example YAML Configuration:**

```yaml
# Single card with background
type: custom:chorebot-person-rewards-card
person_entity: person.kyle
title: "Kyle's Rewards"
show_title: true
show_add_reward_button: true
sort_by: cost
hide_card_background: false

# Stacked cards without backgrounds (seamless layout)
type: vertical-stack
cards:
  - type: custom:chorebot-person-rewards-card
    person_entity: person.kyle
    title: "Kyle's Rewards"
    hide_card_background: true

  - type: custom:chorebot-person-rewards-card
    person_entity: person.campbell
    title: "Campbell's Rewards"
    hide_card_background: true
```

**Card Structure:**

```
┌─────────────────────────────────────────┐
│ Kyle's Rewards                          │
├─────────────────────────────────────────┤
│  ┌───────┐  ┌───────┐  ┌───────┐       │
│  │  🎮   │  │  🍦   │  │  💰   │       │
│  │ Video │  │ Ice   │  │ Extra │       │
│  │ Games │  │ Cream │  │ Money │       │
│  │100 pts│  │ 50 pts│  │200 pts│       │
│  └───────┘  └───────┘  └───────┘       │
│                                         │
│  ┌───────┐  ┌───────┐                  │
│  │  ➕   │                              │
│  │ Add   │  (clickable to open modal)  │
│  │Reward │                              │
│  │       │                              │
│  └───────┘                              │
└─────────────────────────────────────────┘
```

**Interaction Flow:**

1. **Click Reward Card:**
   - Opens confirmation modal
   - Shows: Person name, Reward name, Cost, Current balance, Remaining balance
   - Actions: "Cancel" (grey) or "Redeem" (primary color)

2. **Click "Add Reward" Card:**
   - Opens create modal
   - Form fields:
     - Name (text input)
     - Cost (number input, 1-10000)
     - Icon (icon selector, default: "mdi:gift")
     - Description (textarea, optional)
   - Actions: "Cancel" or "Create"
   - On "Create": Call `chorebot.manage_reward` with `person_id` from config

**CSS Styling Differences from Old Card:**

- Remove `.people-section` (not needed)
- Reward cards use cursor pointer (whole card clickable)
- Add `.add-reward-card` style (dashed border, lighter background)
- Add `.add-reward-icon` (large plus icon, centered)

## 8. Service Schema Changes

### `chorebot.manage_reward` (Updated)

```yaml
manage_reward:
  name: Manage Reward
  description: Create or update a reward in the points system.
  fields:
    reward_id:
      name: Reward ID
      description: Reward ID (omit to auto-generate for new reward).
      required: false
      example: "reward1"
      selector:
        text:
    name:
      name: Name
      description: Reward name.
      required: true
      example: "Extra Screen Time (30min)"
      selector:
        text:
    cost:
      name: Cost
      description: Point cost.
      required: true
      example: 50
      selector:
        number:
          min: 1
          max: 10000
          mode: box
    icon:
      name: Icon
      description: MDI icon.
      required: true
      example: "mdi:television"
      selector:
        icon:
    description:
      name: Description
      description: Reward description.
      required: false
      example: "Get 30 extra minutes of screen time"
      selector:
        text:
          multiline: true
    person_id:
      name: Person
      description: Assign reward to a specific person (REQUIRED).
      required: true
      example: "person.kyle"
      selector:
        entity:
          domain: person
```

## 9. Testing Checklist

### Backend Tests

- [ ] Create reward with `person_id` → reward has `person_id` field
- [ ] Create reward without `person_id` → service call fails (required field)
- [ ] Filter rewards by `person_id` → only returns matching rewards
- [ ] Redeem person-specific reward as correct person → success
- [ ] Redeem person-specific reward as wrong person → error message
- [ ] Data migration: Old rewards without `person_id` → assigned to first person on load
- [ ] Data migration logs each migrated reward
- [ ] Update reward `person_id` → field changes to new person

### Frontend Tests

- [ ] Card displays only rewards for configured person
- [ ] Card filters out rewards with different `person_id`
- [ ] Click reward card opens confirmation modal
- [ ] Confirmation modal shows correct person name and reward details
- [ ] Cancel redemption closes modal without redeeming
- [ ] Confirm redemption calls service and shows confetti
- [ ] "Add Reward" card appears at end of grid
- [ ] Click "Add Reward" opens create modal
- [ ] Create modal pre-fills `person_id` from config
- [ ] Submit create modal calls `chorebot.manage_reward` with `person_id`
- [ ] `hide_card_background: true` removes card background and padding
- [ ] `hide_card_background: false` shows normal card styling
- [ ] Error handling: Person entity doesn't exist → show error message
- [ ] Error handling: Redemption fails → show alert with error message

### Migration Tests

- [ ] Existing rewards without `person_id` → automatically migrated on load
- [ ] Migration assigns rewards to first available person
- [ ] Migration logs displayed in Home Assistant logs
- [ ] After migration, all rewards have `person_id` field
- [ ] New person-specific cards work immediately after migration

## 10. Migration Path

### For Users

**Automatic Migration on Upgrade:**

1. **Backend Migration (Automatic):**
   - On integration load, all existing rewards without `person_id` are assigned to first available person
   - Migration runs once and logs results
   - No user action required

2. **Update Dashboard (Manual):**
   - Replace old `chorebot-rewards-card` with new person-specific cards
   - Add one `chorebot-person-rewards-card` per person
   - Each person gets their own rewards view

3. **Reassign Rewards (If Needed):**
   - If migration assigned rewards to wrong person, use `chorebot.manage_reward` service to update
   - Update `person_id` field to correct person entity

**Example Dashboard Layout:**

```yaml
# Before (old global rewards card - DEPRECATED)
- type: custom:chorebot-rewards-card
  title: Family Rewards
  show_people_section: true

# After (new person-specific cards)
- type: vertical-stack
  cards:
    - type: custom:chorebot-person-rewards-card
      person_entity: person.kyle
      title: "Kyle's Rewards"

    - type: custom:chorebot-person-rewards-card
      person_entity: person.campbell
      title: "Campbell's Rewards"
```

## 11. Future Enhancements (Out of Scope)

- [ ] Bulk reward creation (upload CSV with person assignments)
- [ ] Reward categories/tags for organization
- [ ] Shared rewards (multiple people can redeem the same reward)
- [ ] Reward expiration dates
- [ ] Reward usage limits (can only redeem once per week)
- [ ] Admin UI for managing all rewards across all people
- [ ] Reward templates (pre-defined rewards with customizable costs)

## 12. Open Questions

1. **Should the "Add Reward" placeholder always be visible, or only in edit mode?**
   - **Answer:** ALWAYS VISIBLE - Simpler implementation, more discoverable, matches iOS/modern app UX patterns.

2. **Should we add a service to bulk-assign rewards to a person?**
   - **Answer:** OUT OF SCOPE for this feature - Can be added later if needed.

3. **What happens if a person entity is deleted?**
   - **Answer:** Rewards remain in storage (data preservation), but cards show error message (same as person points card). Rewards become accessible again if entity is recreated.

4. **How should migration handle installations with no people?**
   - **Answer:** Skip migration if no people exist. Rewards remain without `person_id` and will fail validation. User must create a person entity first.

## 13. Summary

This feature transforms ChoreBot's rewards system into a person-specific model by:

1. **Backend:** Making `person_id` a required field with one-time data migration
2. **Frontend:** Creating new `chorebot-person-rewards-card` for personalized reward views
3. **UX:** Streamlined interface (click to redeem, inline reward creation, hide card background option)
4. **Migration:** Automatic one-time migration assigns existing rewards to first available person

**Key Benefits:**

- Personalized reward catalogs per person
- Cleaner UI (no person selector clutter)
- Better organization for families with multiple children
- Consistent with card background customization across all ChoreBot cards
- Simple data model (no "global vs. person-specific" duality)

**Implementation Effort:**

- **Phase 1 (Backend):** ~2-3 hours (required field + migration logic)
- **Phase 2 (Frontend):** ~4-6 hours (new card component with modals + hide_card_background)
- **Phase 3 (Docs):** ~1 hour (usage examples and migration notes)
- **Total:** ~7-10 hours

**Risk Assessment:** LOW

- Simple one-time migration (assign to first person)
- Well-isolated changes (new card component)
- Clear validation logic (always check person_id)
- Development phase (no production users affected)
