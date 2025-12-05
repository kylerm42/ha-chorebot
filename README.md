# ChoreBot - Enhanced Chore & Task Integration for Home Assistant

A Home Assistant custom integration that provides advanced task management with recurring tasks, streak tracking, tag-based organization, and TickTick synchronization.

## Project Structure

```
.
├── custom_components/chorebot/    # Backend integration
│   ├── __init__.py                # Integration entry point
│   ├── manifest.json              # HACS metadata
│   ├── const.py                   # Constants and configuration keys
│   ├── config_flow.py             # UI configuration flow
│   ├── todo.py                    # Todo entity platform
│   └── strings.json               # UI translations
│
├── www/                           # Frontend Lovelace cards
│   ├── chorebot-list-card.js      # Main task list card with filtering
│   └── chorebot-add-button-card.js # Add task button card
│
├── hacs.json                      # HACS frontend plugin metadata
└── spec/
    └── chore-bot.md               # Full technical specification
```

## Development Status

🚧 **Structure Setup Complete** - Ready for implementation

The project scaffolding is now in place with:

- ✅ Custom integration structure following HA best practices
- ✅ TodoListEntity platform for native HA todo integration
- ✅ Config flow for UI-based setup
- ✅ Frontend card templates
- ✅ HACS compatibility structure

## Features (Planned)

### MVP

- **Native Todo Integration**: Standard HA `todo` entities for compatibility
- **Recurring Tasks**: Tasks that automatically advance to the next due date on completion
- **Streak Tracking**: Track completion streaks with longest streak history
- **Tag-Based Organization**: Organize tasks with custom tags
- **TickTick Sync**: Two-way synchronization with TickTick (Local Master model)
- **Custom Lovelace Cards**: Enhanced UI with filtering and special effects

### Post-MVP

- Points/stars system
- Reward shop
- Badges and achievements

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

## Cards

ChoreBot provides several custom Lovelace cards:

### Person Points Card

Displays a person's points balance with progress visualization:

```yaml
type: custom:chorebot-person-points-card
person_entity: person.kyle
title: "Kyle's Points"
# accent_color: "#3498db"  # Optional: Override person's color
```

### Person Rewards Card

Shows person-specific rewards with redemption buttons:

```yaml
type: custom:chorebot-person-rewards-card
person_entity: person.kyle
title: "Kyle's Rewards"
show_disabled_rewards: false
sort_by: cost # Options: cost, name, created
# accent_color: "#3498db"  # Optional: Override person's color
```

### Grouped Card

Tag-based grouped task view with optional person filtering:

```yaml
# Personal view: Filter by person
type: custom:chorebot-grouped-card
entity: todo.chorebot_family_tasks
person_entity: person.kyle  # Shows only Kyle's tasks
title: "Kyle's Tasks"
# accent_color: "#3498db"  # Optional: Override person's color

# Family view: Show all tasks
type: custom:chorebot-grouped-card
entity: todo.chorebot_family_tasks
title: "Family Tasks"
tag_group_order:
  - Morning
  - Afternoon
  - Evening
untagged_header: "Other Tasks"
```

### List Card

Today-focused flat task view:

```yaml
type: custom:chorebot-list-card
entity: todo.chorebot_family_tasks
show_progress: true
show_points: true
filter_section_id: "section_id" # Optional: Filter by section
```

## Next Steps for Development

1. **Implement Data Persistence Layer**
   - JSON storage in `.storage/chorebot_*.json`
   - Task schema with custom fields
   - Soft delete support

2. **Implement TodoListEntity Logic**
   - CRUD operations on tasks
   - Recurring task completion logic
   - Streak calculation and updates

3. **Implement TickTick Sync**
   - OAuth configuration
   - Two-way sync with Local Master model
   - Metadata handling in description field

4. **Implement Frontend Cards**
   - Task display with filtering
   - Add task dialog with custom fields
   - Confetti effects on completion

5. **Testing in Dev Container**
   - Load integration in HA
   - Test todo entity operations
   - Test card display and interactions

## HACS Installation (Future)

### As Custom Integration

Add as a custom repository in HACS:

```
https://github.com/kylerm42/chorebot
```

Type: Integration

### As Frontend Plugin

Add as a custom repository in HACS:

```
https://github.com/kylerm42/chorebot
```

Type: Lovelace

## Development Environment

This integration is developed using the [Home Assistant Core devcontainer](https://developers.home-assistant.io/docs/development_environment).

### Setup

1. Clone the [Home Assistant core repository](https://github.com/home-assistant/core) next to this repository:

   ```bash
   # Your directory structure should be:
   # Projects/
   # ├── home-assistant/
   # │   ├── core/           # HA core repository
   # │   └── ha-chorebot/    # This repository
   ```

2. Create a symlink from the core devcontainer config to use ChoreBot's customized version:

   ```bash
   cd core/.devcontainer
   rm devcontainer.json
   ln -s ../../ha-chorebot/devcontainer.json devcontainer.json
   ```

3. Open the core repository in VS Code with the Dev Containers extension

4. Build the devcontainer (first time only - this may take several minutes)
   - VS Code will prompt you to build the container
   - Or use Command Palette → "Dev Containers: Rebuild Container"

5. Your ChoreBot integration will be live-mounted in the HA instance at:
   - `/workspaces/core/config/custom_components/chorebot/`
   - `/workspaces/core/config/www/`

6. Make changes in this repo, restart HA to test

### Development Workflow

#### Initial Setup (One-Time)

After cloning and setting up the devcontainer:

1. **Install npm dependencies**:

   ```bash
   cd ha-chorebot
   npm install
   ```

2. **Start TypeScript watch mode** (keep running in a terminal):
   ```bash
   npm run watch
   ```
   This watches `src/main.ts` and automatically compiles to `dist/chorebot-list-card.js`

#### Day-to-Day Development

**For Backend (Python) Changes:**

1. Edit files in `custom_components/chorebot/`
2. Changes appear instantly in the container (bind mount)
3. Restart Home Assistant to pick up changes:
   ```bash
   # Inside container terminal
   hass -c config
   ```
   Or use Developer Tools → YAML → Restart in HA UI

**For Frontend (TypeScript) Changes:**

1. Edit files in `src/main.ts`
2. Rollup auto-compiles (<1s) to `dist/chorebot-list-card.js`
3. Compiled output syncs to container via bind mount
4. Hard refresh browser (Ctrl+Shift+R) to see changes

**Build Commands:**

- `npm run build` - One-time build (production)
- `npm run watch` - Continuous build (development)
- `npm run format` - Format code with Prettier

**Note:** The existing `www/chorebot-list-card.js` is the old JavaScript version. The TypeScript version is in `src/main.ts` and compiles to `dist/`. The container mounts `dist/` at `/workspaces/core/config/www/chorebot/`.

### Benefits

- Full HA development environment with proper permissions
- Live code reloading - changes are immediately available
- Access to HA debugging tools and logs
- No HACS needed for development
- Clean separation between ChoreBot repo and HA core
- Customized devcontainer config tracked in this repository

### Troubleshooting

If you encounter permission errors during container build:

1. Make sure no `config/` directory exists in `core/` on your host (it should only exist inside the container)
2. If it exists with root ownership, remove it: `sudo rm -rf core/config/`
3. Rebuild the container to let the setup script create it properly

## License

See LICENSE.txt
