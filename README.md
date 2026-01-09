# ChoreBot - Enhanced Chore & Task Integration for Home Assistant

A Home Assistant custom integration that provides advanced task management with recurring tasks, streak tracking, tag-based organization, points/rewards system, and TickTick synchronization.

## Features

- **Native Todo Integration**: Standard HA `todo` entities for compatibility
- **Recurring Tasks**: Tasks that automatically advance to the next due date on completion with streak tracking
- **Tag-Based Organization**: Organize tasks with custom tags and sections
- **Points & Rewards System**: Earn points for task completion with streak bonuses, redeem for rewards
- **Person Assignment**: Assign tasks to specific people for family task management
- **TickTick Sync**: Two-way synchronization with TickTick (Local Master model)
- **Custom Lovelace Cards**: Enhanced dashboard cards ([separate repository](https://github.com/kylerm42/ha-chorebot-cards))

## Installation

ChoreBot consists of two HACS repositories:

1. **ChoreBot Integration** (this repo) - Backend task management
2. **ChoreBot Cards** - Dashboard UI cards ([separate repo](https://github.com/kylerm42/ha-chorebot-cards))

### Step 1: Install Integration

1. Open HACS → Integrations
2. Click "+ Explore & Download Repositories"
3. Search for "ChoreBot"
4. Click "Download"
5. Restart Home Assistant
6. Go to Settings → Devices & Services → Add Integration
7. Search for "ChoreBot" and follow setup

### Step 2: Install Cards (Optional)

For dashboard cards, install the separate frontend plugin:

1. Open HACS → Frontend
2. Click "+ Explore & Download Repositories"
3. Search for "ChoreBot Cards"
4. Click "Download"
5. Hard refresh browser (Ctrl+Shift+R)

See [ChoreBot Cards README](https://github.com/kylerm42/ha-chorebot-cards) for card configuration examples.

## Services

ChoreBot provides several services for managing tasks, people, rewards, and more.

### Person Management

**`chorebot.manage_person`** - Set a person's accent color for UI customization:

```yaml
service: chorebot.manage_person
data:
  person_id: person.kyle
  accent_color: "#3498db" # Hex code (#RRGGBB or #RGB) or CSS variable (var(--name))
```

**`chorebot.sync_people`** - Sync people records with Home Assistant person entities:

```yaml
service: chorebot.sync_people
```

Creates missing people with 0 points balance. Runs automatically on integration setup.

### Task Management

**`chorebot.create_list`** - Create a new task list with optional person assignment:

```yaml
service: chorebot.create_list
data:
  name: "Kyle's Chores"
  person_id: person.kyle # Optional: Assign default person for list
```

**`chorebot.update_list`** - Update list metadata (name, person assignment):

```yaml
service: chorebot.update_list
data:
  list_id: todo.chorebot_family_tasks
  name: "Updated List Name"
  person_id: person.kyle # Or use clear_person: true to remove assignment
```

**`chorebot.add_task`** - Add a task with full field support:

```yaml
service: chorebot.add_task
data:
  list_id: todo.chorebot_family_tasks
  summary: "Daily Exercise"
  tags: ["Morning", "Health"]
  rrule: "FREQ=DAILY;INTERVAL=1"
  points_value: 10
  streak_bonus_points: 50
  streak_bonus_interval: 7
```

**`chorebot.manage_section`** - Create, update, or delete sections:

```yaml
# Create section with person assignment
service: chorebot.manage_section
data:
  list_id: todo.chorebot_family_tasks
  action: create
  name: "Campbell's Tasks"
  person_id: person.campbell
  sort_order: 100

# Update section person
service: chorebot.manage_section
data:
  list_id: todo.chorebot_family_tasks
  action: update
  section_id: "section_id_here"
  person_id: person.kyle

# Delete section
service: chorebot.manage_section
data:
  list_id: todo.chorebot_family_tasks
  action: delete
  section_id: "section_id_here"
```

### Points & Rewards

**`chorebot.manage_reward`** - Create or update a reward:

```yaml
service: chorebot.manage_reward
data:
  name: "Ice Cream Trip"
  description: "Trip to favorite ice cream shop"
  cost: 100
  icon: "mdi:ice-cream"
  person_id: person.kyle # Optional: Make person-specific
```

**`chorebot.redeem_reward`** - Redeem a reward (deducts points):

```yaml
service: chorebot.redeem_reward
data:
  person_id: person.kyle
  reward_id: "reward_id_here"
```

**`chorebot.delete_reward`** - Delete a reward from the system:

```yaml
service: chorebot.delete_reward
data:
  reward_id: "reward_id_here"
```

**`chorebot.adjust_points`** - Manually adjust points (admin use):

```yaml
service: chorebot.adjust_points
data:
  person_id: person.kyle
  amount: 50 # Positive to add, negative to subtract
  reason: "Extra credit for helping with dishes"
```

### Synchronization

**`chorebot.sync`** - Manually trigger sync from TickTick:

```yaml
# Sync all lists
service: chorebot.sync

# Sync specific list
service: chorebot.sync
data:
  list_id: todo.chorebot_family_tasks
```

## Configuration

### Customizing Points Display

You can customize how points are displayed throughout ChoreBot to match your family's preferences:

1. Go to **Settings** → **Devices & Services**
2. Find **ChoreBot** and click **Configure** (options button)
3. Set custom terminology and/or icon:
   - **Points Terminology**: Custom text like "stars", "coins", "gems", etc. (max 50 characters)
   - **Points Icon**: Optional MDI icon like "mdi:star", "mdi:currency-usd", etc.

**Examples:**

- **Text only**: "stars" → displays as "437 stars"
- **Text with emoji**: "⭐ stars" → displays as "437 ⭐ stars"
- **Icon + text**: icon="mdi:star" + text="stars" → displays as "437 🌟 stars" (MDI icon)
- **Both**: icon="mdi:currency-usd" + text="coins" → displays as "437 💲 coins"

**Note:** Both icon and text display together when both are provided. The custom terminology automatically updates in:

- Person points cards (balance display)
- Reward costs and redemption buttons
- Points badges on tasks
- Task edit dialog field labels ("Stars Value", "Streak Bonus Stars", etc.)

**Default:** If not configured, ChoreBot displays "points" as the default terminology.

## Dashboard Cards

ChoreBot provides dashboard cards in a [separate repository](https://github.com/kylerm42/ha-chorebot-cards).

After installing the cards plugin from HACS → Frontend, add cards to your dashboard:

### Available Cards

- **chorebot-grouped-card** - Tag-based grouped task view with progress tracking
- **chorebot-add-task-card** - Quick task creation with full field support
- **chorebot-person-points-card** - Visual points balance with progress bar
- **chorebot-person-rewards-card** - Rewards catalog with inline redemption

### Quick Examples

```yaml
# Person Points Card
type: custom:chorebot-person-points-card
person_entity: person.kyle

# Person Rewards Card
type: custom:chorebot-person-rewards-card
person_entity: person.kyle

# Grouped Task Card (tag-based organization)
type: custom:chorebot-grouped-card
entity: todo.chorebot_family_tasks
person_entity: person.kyle # Optional: filter by person

# Add Task Card
type: custom:chorebot-add-task-card
entity: todo.chorebot_family_tasks
```

For full card configuration options, see [ChoreBot Cards README](https://github.com/kylerm42/ha-chorebot-cards).

## Architecture

ChoreBot is split into two repositories for HACS compatibility:

1. **ha-chorebot** (this repo) - Python backend integration
   - TodoListEntity platform for native HA todo entities
   - Points & rewards system with person management
   - TickTick synchronization with **Local Master model** (local JSON is source of truth)
   - Recurring tasks with template + instance architecture
   - Streak tracking with bonus rewards
   - Custom services for task/reward management
   - Sensor entities exposing points/rewards data

2. **ha-chorebot-cards** ([separate repo](https://github.com/kylerm42/ha-chorebot-cards)) - TypeScript/Lit dashboard cards
   - Single bundle with 4 cards (grouped, add-task, person-points, person-rewards)
   - HACS plugin for automatic frontend resource registration
   - Independent versioning and releases

### Key Features

- **Local Master Sync**: Local JSON storage is the source of truth, sync reconciles with TickTick
- **Recurring Tasks**: Template + instance model with automatic next occurrence creation
- **Streak Tracking**: Strict consecutive tracking with configurable streak bonus rewards
- **Anti-Farming Protection**: Uncompleting tasks disassociates them from streak progression
- **Person Assignment**: Assign tasks via lists, sections, or individual tasks
- **Floating Points Animation**: Visual feedback when completing tasks with points

### Development

For backend development, see [DEVELOPMENT.md](DEVELOPMENT.md).

For full-stack development (integration + cards), use the Docker Compose workflow with git submodules.

## License

See LICENSE.txt
