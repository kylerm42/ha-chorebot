# Points & Rewards System Implementation Summary

**Feature**: Gamification with Points, Streak Bonuses, and Rewards  
**Completed**: 2025-01-14 (Phase 1) + 2025-11-17 (Phases 2-4)  
**Spec**: [.holocode/proposed/20250114-points-rewards-system/SPEC.md](../proposed/20250114-points-rewards-system/SPEC.md)

## Overview

Add gamification to ChoreBot by enabling task completion to award points to Home Assistant Person entities. Points can accumulate and be "spent" on configurable rewards, creating motivation for completing tasks. Includes streak bonuses for recurring tasks at configurable intervals.

## What Was Implemented

### Phase 1: Backend Foundation (2025-01-14)

**Data Models**:
- `PersonProfile` (formerly `PersonPoints`) - Person data with balances
- `Transaction` - Point transaction records (audit trail)
- `Reward` - Configurable rewards catalog
- `Redemption` - Reward redemption history

**Task Model Extensions**:
- `points_value: int` - Base points per completion
- `streak_bonus_points: int` - Bonus at streak milestones
- `streak_bonus_interval: int` - Days between bonuses (0 = disabled)

**Storage Architecture** (4 files):
- `chorebot_people` - Hot: Person balances
- `chorebot_rewards` - Hot: Rewards catalog
- `chorebot_transactions` - Cold: Audit trail (append-only)
- `chorebot_redemptions` - Cold: Redemption history

**Points Logic** (`todo.py`):
- Person ID resolution: section.person_id → list.person_id → None
- Award base points on task completion
- Award streak bonus at configurable intervals (e.g., every 7, 14, 21 days)
- Deduct points on task uncomplete (base only, NOT bonuses)
- Anti-farming protection: Uncomplete disassociates instance from template

**Five New Services**:
1. `chorebot.manage_reward` - Create/update rewards
2. `chorebot.redeem_reward` - Redeem reward for person
3. `chorebot.delete_reward` - Delete reward
4. `chorebot.adjust_points` - Manual point adjustment (admin)
5. `chorebot.sync_people` - Sync HA person entities to storage

**Sensor Entity**: `sensor.chorebot_points`
- State: Total points across all people
- Attributes: people, rewards, recent_transactions

### Phase 2: Frontend Display (2025-11-17)

**Points Badge on Task Cards**:
- Added `show_points` config option (default: true)
- Badge displays inline with due date: `+10 pts`
- Bonus detection: `+10 + 50 pts` with golden gradient
- Automatic bonus calculation (checks template streak vs interval)
- CSS glow animation highlights upcoming bonuses

**Points Fields in Edit Dialog**:
- `points_value` field (0-10000) for all tasks
- `streak_bonus_points` field (0-10000) for recurring only
- `streak_bonus_interval` field (0-999) for recurring only
- Conditional visibility: Bonus fields only when recurrence enabled
- Helper text: "Bonus Every X Days (0 = no bonus)"

**New Rewards Card** (`chorebot-rewards-card.ts`):

**People Section**:
- Displays all people with points balances
- Avatar support: Picture or initials (circular with gradient)
- Sorted by points balance (highest first)
- Filters deleted entities silently

**Rewards Grid**:
- Responsive layout (250px min column width)
- Shows icon, name, cost, description
- Configurable sorting: cost, name, created
- Optional disabled rewards display
- Per-person redeem buttons

**Redemption Flow**:
- Calls `chorebot.redeem_reward` service
- Loading state ("Redeeming...")
- Success: Star shower confetti (3 seconds)
- Error: Alert with message
- Auto-updates on sensor change

### Phase 3: Edit Dialog Enhancement (2025-11-17)

**Points Configuration UI**:
- Added to shared `dialog-utils.ts`
- All cards use consistent edit dialog
- Validation: 0-10000 (points), 0-999 (interval)
- Clear labels and helper text
- Integration with HA form system

### Phase 4: Polish & Testing (2025-11-17)

**Confetti Animation**:
- Star shower plays 3 seconds after redemption
- Uses primary color variants (`extractColorVariants()`)
- Respects `prefers-reduced-motion` accessibility

**Documentation**:
- Updated AGENTS.md with complete architecture
- Service definitions in `services.yaml`
- Integration testing guidance

## Key Features

**Core Principles**:
1. **HA Person Integration**: Points tied to Person entities (global across lists)
2. **Immediate Points**: Awarded/deducted instantly on completion/uncomplete
3. **Recurring Streak Bonuses**: Bonus at configurable intervals
4. **Section > List Priority**: Section person_id overrides list person_id
5. **Persistent Rewards**: Remain available after redemption
6. **Full Audit Trail**: All transactions logged with metadata

**Streak Bonus Logic**:
- Only awarded for recurring task instances
- Only if `streak_bonus_points > 0` AND `streak_bonus_interval > 0`
- Awarded when `streak_current % streak_bonus_interval == 0`
- Example: interval=7 → bonus at days 7, 14, 21, 28...

**Anti-Farming Protection**:
- Uncompleting recurring task disassociates from template
- Sets `parent_uid = None`, `occurrence_index = 0`
- Prevents streak/bonus farming via repeated complete/uncomplete
- Instance becomes orphaned one-time task
- Next scheduled instance continues normally
- Inspired by TickTick's approach

## Files Modified

### Backend
- `custom_components/chorebot/people.py` - **NEW** PeopleStore class
- `custom_components/chorebot/task.py` - Added points fields
- `custom_components/chorebot/todo.py` - Points award/deduction logic
- `custom_components/chorebot/sensor.py` - **NEW** ChoreBotPointsSensor
- `custom_components/chorebot/__init__.py` - Service handlers, sensor setup
- `custom_components/chorebot/services.yaml` - Service definitions
- `custom_components/chorebot/const.py` - New constants

### Frontend
- `src/utils/types.ts` - Added points fields to Task interface
- `src/utils/dialog-utils.ts` - Points fields in edit dialog
- `src/person-points-card.ts` - Balance display updates
- `src/person-rewards-card.ts` - Rewards catalog card
- `src/grouped-card.ts` - Points badge with bonus detection
- `src/rewards-card.ts` - **NEW** standalone rewards card

**Bundle Sizes**:
- List Card: 47KB
- Grouped Card: 55KB
- Add Task Card: 29KB
- Rewards Card: 37KB

## Example Configuration

**Assign Person to List**:
```yaml
service: chorebot.create_list
data:
  name: "Kyle's Chores"
  person_id: person.kyle
```

**Task with Streak Bonus**:
```yaml
service: chorebot.add_task
data:
  list_id: todo.chorebot_kyles_chores
  summary: "Daily exercise"
  points_value: 10
  streak_bonus_points: 50
  streak_bonus_interval: 7  # Bonus every 7 days
  rrule: "FREQ=DAILY"
```

**Create Reward**:
```yaml
service: chorebot.manage_reward
data:
  name: "Extra Screen Time (30min)"
  cost: 50
  icon: "mdi:television"
  description: "Get 30 extra minutes"
```

**Dashboard Cards**:
```yaml
# Points display
- type: custom:chorebot-person-points-card
  person_entity: person.kyle

# Rewards catalog
- type: custom:chorebot-person-rewards-card
  person_entity: person.kyle
  sort_by: cost

# Tasks with points badges
- type: custom:chorebot-grouped-card
  entity: todo.chorebot_family_tasks
  person_entity: person.kyle
  show_points: true
```

## Transaction Types

- `task_completion` - Points awarded for completing task
- `task_uncomplete` - Points deducted for marking incomplete
- `streak_bonus` - Bonus points at streak milestone
- `reward_redemption` - Points spent on reward
- `manual_adjustment` - Admin adjustment

## Current Status

**Production Ready**: All 4 phases completed and tested.

- ✅ Backend foundation with PeopleStore
- ✅ Points badge on task cards
- ✅ Edit dialog integration
- ✅ Rewards card with avatars
- ✅ Confetti animations
- ✅ Anti-farming protection
- ✅ Full audit trail
- ✅ Documentation complete

**Future Enhancements**:
- Transaction history card
- Leaderboards (weekly/monthly/all-time)
- Badges/achievements for milestones
- Point multipliers (special events)
- Reward cooldowns
