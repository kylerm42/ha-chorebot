---
title: ChoreBot Repository Split - Integration & Cards Separation
status: approved
created: 2026-01-09
author: AP-5 (Architect)
spec_version: 1.0
---

# ChoreBot Repository Split: Integration + Cards Separation

## Overview

Split the current monolithic `ha-chorebot` repository into two separate repositories to achieve full HACS compatibility:

1. **ha-chorebot** - Pure Python integration (HACS Integration type)
2. **ha-chorebot-cards** - Frontend dashboard cards (HACS Plugin type)

This resolves HACS's limitation where repositories can only be ONE type (integration OR plugin, not both).

---

## Requirements Analysis

### Current Pain Points
- HACS treats repos as exclusively integration OR plugin, causing flaky card loading
- Manual frontend resource registration (`add_extra_js_url`) is fragile
- Users must perform manual steps to get cards working
- Development workflow tightly couples backend and frontend

### HACS Plugin Requirements (from docs)
✅ `.js` files in `dist/` directory (preferred) or repository root  
✅ One `.js` file matches repository name (e.g., `chorebot-cards.js`)  
✅ Optional GitHub releases for version management  
✅ Automatic serving at `/hacsfiles/{repo_name}/` by HACS

### Success Criteria
- Users can install both integration and cards from HACS UI
- Cards load automatically without manual `resources.yaml` edits
- Local dev environment supports editing both repos simultaneously
- Single bundle file contains all cards for optimal loading

---

## Architecture Decisions

### Single Bundle Strategy

**Decision:** Build all 4 cards into a single `chorebot-cards.js` bundle.

**Rationale:**
- Common pattern in HACS ecosystem (observed in other multi-card plugins)
- Simplifies `hacs.json` configuration (filename matches repo name)
- Shared utilities bundled once (no duplication across cards)
- Single HTTP request for all cards (better performance)
- HACS automatic resource registration works cleanly

**Trade-offs:**
- Users load all cards even if they only use one (~100KB total)
- Acceptable trade-off: Modern browsers handle this easily, and most users use multiple cards

**Technical Approach:**
- Modify Rollup to build single bundle with all 4 card class definitions
- Each card registers itself with `customElements.define()` in same file
- Output: `dist/chorebot-cards.js` (one file to rule them all)

### Repository Split Strategy

**ha-chorebot (Integration)**
```
ha-chorebot/
├── custom_components/chorebot/
│   ├── __init__.py          # Remove frontend registration
│   ├── manifest.json
│   ├── config_flow.py
│   ├── todo.py
│   ├── sensor.py
│   ├── people.py
│   └── [other Python files]
├── dev-config/              # Keep for local dev
├── docker-compose.yml       # Updated to mount cards repo
├── frontend/                # Git submodule → ha-chorebot-cards
├── hacs.json                # Type: "integration"
└── README.md                # Installation instructions
```

**ha-chorebot-cards (Plugin)**
```
ha-chorebot-cards/
├── dist/
│   └── chorebot-cards.js    # SINGLE bundle with all cards
├── src/
│   ├── utils/               # Shared utilities
│   ├── grouped-card.ts
│   ├── add-task-card.ts
│   ├── person-points-card.ts
│   ├── person-rewards-card.ts
│   └── index.ts             # Main entry point (exports all cards)
├── package.json
├── rollup.config.mjs        # Build single bundle
├── tsconfig.json
├── hacs.json                # Type: "plugin", filename: "chorebot-cards.js"
├── info.md                  # HACS plugin description
└── README.md
```

### Dependency Management: Git Submodules

**Why Submodules?**
- Keeps repos independent for production
- Enables seamless local dev with both repos
- Avoids npm workspace complexity
- No runtime coupling (cards work standalone)

**Structure:**
```
ha-chorebot/
└── frontend/                # Git submodule → ha-chorebot-cards
```

---

## Implementation Plan

### Phase 1: Create Single-Bundle Cards Repository

**Tasks:**

1. **Repository already created** ✅ (user confirmed)

2. **Copy frontend files from ha-chorebot:**
   ```
   ha-chorebot-cards/
   ├── src/
   │   ├── utils/               # All utility modules
   │   ├── grouped-card.ts
   │   ├── add-task-card.ts
   │   ├── person-points-card.ts
   │   ├── person-rewards-card.ts
   │   └── index.ts             # NEW: Main entry point
   ├── package.json
   ├── package-lock.json
   ├── tsconfig.json
   └── LICENSE.txt
   ```

3. **Create `src/index.ts` (main entry point):**
   ```typescript
   // ChoreBot Cards - Single Bundle Entry Point
   // This file imports and registers all 4 cards
   
   import './grouped-card';
   import './add-task-card';
   import './person-points-card';
   import './person-rewards-card';
   
   // Cards self-register via customElements.define() in their respective files
   // No additional exports needed - just import to trigger registration
   
   console.info(
     '%c CHOREBOT-CARDS %c v0.1.0 ',
     'background: #3498db; color: white; font-weight: bold;',
     'background: transparent; color: #3498db;'
   );
   ```

4. **Create new `rollup.config.mjs` (single bundle):**
   ```javascript
   import typescript from "@rollup/plugin-typescript";
   import resolve from "@rollup/plugin-node-resolve";
   import terser from "@rollup/plugin-terser";
   import commonjs from "@rollup/plugin-commonjs";
   
   const production = !process.env.ROLLUP_WATCH;
   
   export default {
     input: "src/index.ts",
     output: {
       file: "dist/chorebot-cards.js",
       format: "es",
       sourcemap: !production,
     },
     plugins: [
       resolve({ browser: true }),
       commonjs(),
       typescript(),
       production && terser(),
     ],
   };
   ```

5. **Create `hacs.json`:**
   ```json
   {
     "name": "ChoreBot Cards",
     "homeassistant": "2024.11.0",
     "hacs": "1.33.0",
     "render_readme": true,
     "filename": "chorebot-cards.js"
   }
   ```

6. **Create `info.md` for HACS plugin page:**
   ```markdown
   # ChoreBot Cards
   
   Dashboard cards for the ChoreBot integration. Provides 4 custom Lovelace cards:
   
   - **Grouped Card**: Tag-based grouped task view with progress tracking
   - **Add Task Card**: Quick task creation with full field support
   - **Person Points Card**: Visual points balance display with progress bar
   - **Person Rewards Card**: Person-specific rewards with inline redemption
   
   ## Requirements
   
   - Home Assistant 2024.11.0 or newer
   - ChoreBot integration (install separately)
   
   ## Installation
   
   Install via HACS → Frontend → Explore & Download → "ChoreBot Cards"
   
   ## Card Examples
   
   See README for full configuration options.
   ```

7. **Create comprehensive `README.md`:**
   - Installation via HACS (plugin type)
   - Requirement: ChoreBot integration must be installed first
   - Configuration examples for all 4 cards
   - Link to integration repository

8. **Update `package.json` scripts:**
   ```json
   {
     "name": "chorebot-cards",
     "version": "0.1.0",
     "description": "Dashboard cards for ChoreBot Home Assistant integration",
     "main": "dist/chorebot-cards.js",
     "scripts": {
       "build": "rollup -c",
       "watch": "rollup -c --watch",
       "format": "prettier --write ."
     }
   }
   ```

9. **Test standalone build:**
   ```bash
   cd ha-chorebot-cards
   npm install
   npm run build
   # Verify: dist/chorebot-cards.js exists and contains all 4 cards
   ```

10. **Create initial release `v0.1.0`:**
    - Build production bundle: `npm run build`
    - Commit all files
    - Tag: `git tag -a v0.1.0 -m "Initial release - single bundle with all cards"`
    - Push: `git push origin v0.1.0`
    - Create GitHub release with release notes
    - HACS will auto-detect and serve from `/hacsfiles/chorebot-cards/`

### Phase 2: Clean Up Integration Repository

**Tasks:**

1. **Remove frontend-specific files from ha-chorebot:**
   ```bash
   cd ha-chorebot
   git rm -r src/
   git rm package.json package-lock.json rollup.config.mjs tsconfig.json
   git rm -r custom_components/chorebot/dist/
   ```

2. **Update `custom_components/chorebot/__init__.py`:**
   
   **Remove these sections:**
   ```python
   # REMOVE: Frontend card filenames list
   FRONTEND_CARDS = [...]
   
   # REMOVE: Entire _register_frontend_resources() function
   async def _register_frontend_resources(hass: HomeAssistant) -> None:
       ...
   
   # REMOVE: These imports (if not used elsewhere)
   from homeassistant.components.frontend import add_extra_js_url
   from homeassistant.components.http import StaticPathConfig
   from pathlib import Path
   ```
   
   **In `async_setup_entry()`, remove this call:**
   ```python
   # REMOVE this line
   await _register_frontend_resources(hass)
   ```

3. **Update `hacs.json`:**
   ```json
   {
     "name": "ChoreBot",
     "homeassistant": "2024.11.0",
     "hacs": "1.33.0",
     "render_readme": true
   }
   ```

4. **Update `README.md`:**
   ```markdown
   ## Installation
   
   ChoreBot consists of two HACS repositories:
   
   1. **ChoreBot Integration** (this repo) - Backend task management
   2. **ChoreBot Cards** - Dashboard UI cards ([separate repo](https://github.com/kylerm42/ha-chorebot-cards))
   
   Install both via HACS:
   
   ### Step 1: Install Integration
   1. Open HACS → Integrations
   2. Click "+ Explore & Download Repositories"
   3. Search for "ChoreBot"
   4. Download
   5. Restart Home Assistant
   6. Add integration via Settings → Devices & Services
   
   ### Step 2: Install Cards
   1. Open HACS → Frontend
   2. Click "+ Explore & Download Repositories"
   3. Search for "ChoreBot Cards"
   4. Download
   5. Hard refresh browser (Ctrl+Shift+R)
   
   ## Card Usage
   
   After installing both repositories, cards are automatically registered.
   
   ### Grouped Card (Tag-based grouping)
   ```yaml
   type: custom:chorebot-grouped-card
   entity: todo.chorebot_family_tasks
   person_entity: person.kyle  # Optional: Filter by person
   ```
   
   ### Person Points Card
   ```yaml
   type: custom:chorebot-person-points-card
   person_entity: person.kyle
   ```
   
   ### Person Rewards Card
   ```yaml
   type: custom:chorebot-person-rewards-card
   person_entity: person.kyle
   ```
   
   ### Add Task Card
   ```yaml
   type: custom:chorebot-add-task-card
   entity: todo.chorebot_family_tasks
   ```
   
   See [ChoreBot Cards README](https://github.com/kylerm42/ha-chorebot-cards) for full configuration options.
   ```

5. **Update `AGENTS.md`:**
   
   **Architecture section update:**
   ```markdown
   ## Architecture
   
   ChoreBot is split into two repositories for HACS compatibility:
   
   1. **ha-chorebot** - Python integration (backend, entities, services)
   2. **ha-chorebot-cards** - TypeScript dashboard cards (frontend)
   
   The integration follows a **three-layer architecture**:
   
   1. Data Persistence Layer (JSON storage)
   2. Home Assistant Entity Layer (TodoListEntity, Sensors)
   3. Lovelace Frontend Layer (Cards in separate repo)
   
   Frontend cards are served by HACS at `/hacsfiles/chorebot-cards/chorebot-cards.js`
   (single bundle containing all 4 cards).
   ```
   
   **Development Environment section update:**
   ```markdown
   ## Development Environment
   
   ### Frontend Development
   
   Frontend cards are in a separate repository: `ha-chorebot-cards`
   
   For integration-only development, you don't need the cards repo.
   
   For full-stack development (integration + cards), see Phase 3 below
   for submodule setup.
   
   ### Backend-Only Development
   
   ```bash
   cd ha-chorebot
   ./dev.sh up
   # Edit Python files in custom_components/chorebot/
   # Restart HA to load changes
   ```
   
   Cards will be served from HACS install (if you have them installed),
   or you can manually copy from cards repo to `dev-config/www/community/chorebot-cards/`.
   ```

6. **Create release `v0.1.0`:**
   ```bash
   git add -A
   git commit -m "Remove frontend code, cards moved to separate repository"
   git tag -a v0.1.0 -m "Architecture change - cards moved to ha-chorebot-cards"
   git push origin main v0.1.0
   ```

### Phase 3: Local Dev Environment Setup

**Goal:** Edit both repos simultaneously with auto-rebuilding single bundle

**Tasks:**

1. **Add cards repo as submodule in ha-chorebot:**
   ```bash
   cd ha-chorebot
   git submodule add git@github.com:kylerm42/ha-chorebot-cards.git frontend
   git submodule update --init --recursive
   git commit -m "Add ha-chorebot-cards as submodule for local development"
   ```

2. **Update `docker-compose.yml`:**
   ```yaml
   services:
     homeassistant:
       image: homeassistant/home-assistant:dev
       container_name: homeassistant-chorebot-dev
       restart: unless-stopped
       privileged: true
       volumes:
         - ./dev-config:/config
         - ./custom_components/chorebot:/config/custom_components/chorebot
         # Mount cards repo dist to www/community (mimics HACS plugin path)
         - ./frontend/dist:/config/www/community/chorebot-cards
       ports:
         - "8123:8123"
       environment:
         - TZ=America/Chicago
   
     card-builder:
       image: node:20-alpine
       container_name: chorebot-card-builder
       working_dir: /app
       # Build single bundle on changes
       command: sh -c "npm install && npm run watch"
       volumes:
         # Mount entire cards repo for building
         - ./frontend:/app
       restart: unless-stopped
   ```

3. **Update `dev.sh` to handle submodules:**
   ```bash
   #!/bin/bash
   
   # Detect platform
   if [[ "$OSTYPE" == "linux-gnu"* ]]; then
     COMPOSE_FILES="-f docker-compose.yml -f docker-compose.linux.yml"
   else
     COMPOSE_FILES=""
   fi
   
   case "$1" in
     up)
       # Initialize/update submodule if needed
       if [ ! -d "frontend/src" ]; then
         echo "Initializing submodule..."
         git submodule update --init --recursive
       fi
       docker compose $COMPOSE_FILES up -d
       ;;
     down)
       docker compose $COMPOSE_FILES down
       ;;
     logs)
       docker compose logs -f ${2:-}
       ;;
     restart)
       docker compose restart ${2:-}
       ;;
     *)
       echo "Usage: $0 {up|down|logs|restart} [service]"
       exit 1
       ;;
   esac
   ```

4. **Create `DEVELOPMENT.md` in ha-chorebot (updated section):**
   ```markdown
   ## Full-Stack Development (Integration + Cards)
   
   To develop both integration and cards simultaneously:
   
   ### Initial Setup
   
   ```bash
   cd ha-chorebot
   
   # Initialize cards submodule
   git submodule update --init --recursive
   
   # Start dev environment
   ./dev.sh up
   ```
   
   ### Development Workflow
   
   **Backend (Python) Changes:**
   1. Edit files in `custom_components/chorebot/`
   2. Restart HA: Developer Tools → Server Controls → Restart
   
   **Frontend (TypeScript) Changes:**
   1. Edit files in `frontend/src/`
   2. Card builder auto-rebuilds `frontend/dist/chorebot-cards.js`
   3. Hard refresh browser (Ctrl+Shift+R)
   
   **Single Bundle Output:**
   - All 4 cards bundled into one file: `chorebot-cards.js`
   - Auto-served at `/local/community/chorebot-cards/chorebot-cards.js`
   - Mimics production HACS behavior
   
   ### Submodule Management
   
   ```bash
   # Update cards submodule to latest
   cd ha-chorebot
   git submodule update --remote frontend
   
   # Commit submodule pointer update
   git add frontend
   git commit -m "Update cards submodule to latest"
   
   # Push changes in cards repo
   cd frontend
   git add .
   git commit -m "Card changes"
   git push origin main
   
   # Return to integration repo
   cd ..
   ```
   ```

5. **Create `DEVELOPMENT.md` in ha-chorebot-cards:**
   ```markdown
   # ChoreBot Cards Development Guide
   
   ## Standalone Development
   
   If you're only working on cards (no integration changes):
   
   ```bash
   cd ha-chorebot-cards
   npm install
   npm run watch  # Auto-rebuild on changes
   ```
   
   Copy `dist/chorebot-cards.js` to your HA instance:
   ```
   config/www/community/chorebot-cards/chorebot-cards.js
   ```
   
   ## Full-Stack Development
   
   For developing cards alongside the integration, see the main
   [ha-chorebot DEVELOPMENT.md](https://github.com/kylerm42/ha-chorebot/blob/main/DEVELOPMENT.md)
   for the submodule-based workflow.
   
   ## Build System
   
   **Single Bundle Output:**
   - All 4 cards bundled into one file: `dist/chorebot-cards.js`
   - Entry point: `src/index.ts` (imports all cards)
   - Each card self-registers via `customElements.define()`
   
   **Build Commands:**
   - `npm run build` - Production build (minified, ~100KB)
   - `npm run watch` - Development build (with sourcemaps, auto-rebuild)
   - `npm run format` - Format code with Prettier
   
   **Card Architecture:**
   - `src/index.ts` - Main entry point (imports all cards)
   - `src/grouped-card.ts` - Tag-based grouped view
   - `src/add-task-card.ts` - Quick task creation
   - `src/person-points-card.ts` - Points balance display
   - `src/person-rewards-card.ts` - Rewards catalog & redemption
   - `src/utils/` - Shared utilities (dialog, date, task, etc.)
   
   ## Testing Changes
   
   1. Make changes in `src/`
   2. Watch mode auto-rebuilds `dist/chorebot-cards.js`
   3. Hard refresh browser (Ctrl+Shift+R)
   4. Check browser console for errors
   ```

6. **Test full-stack dev workflow:**
   ```bash
   cd ha-chorebot
   ./dev.sh up
   
   # Verify:
   # - HA starts at http://localhost:8123
   # - Cards auto-build on TypeScript changes
   # - Single bundle served at /local/community/chorebot-cards/chorebot-cards.js
   # - All 4 cards work in dashboard
   
   # Test card changes
   cd frontend/src
   # Edit any card file
   # Check: docker logs chorebot-card-builder
   # Verify: dist/chorebot-cards.js updated
   # Hard refresh browser to see changes
   ```

### Phase 4: Documentation Updates

**ha-chorebot README (see Phase 2, task 4 above)**

**ha-chorebot-cards README:**
```markdown
# ChoreBot Cards

Dashboard cards for the [ChoreBot](https://github.com/kylerm42/ha-chorebot) Home Assistant integration.

## Features

This plugin provides 4 custom Lovelace cards bundled into a single file:

- **Grouped Card**: Tag-based grouped task view with progress tracking
- **Add Task Card**: Quick task creation with recurrence support
- **Person Points Card**: Visual points balance display with progress bar
- **Person Rewards Card**: Rewards catalog with inline redemption

## Requirements

- Home Assistant 2024.11.0 or newer
- **ChoreBot integration** (must be installed separately)

## Installation

### HACS (Recommended)

1. Open HACS → Frontend
2. Click "+ Explore & Download Repositories"
3. Search for "ChoreBot Cards"
4. Click "Download"
5. Hard refresh browser (Ctrl+Shift+R)

### Manual Installation

1. Download `dist/chorebot-cards.js` from [latest release](https://github.com/kylerm42/ha-chorebot-cards/releases)
2. Copy to `config/www/community/chorebot-cards/chorebot-cards.js`
3. Add to Lovelace resources:
   ```yaml
   resources:
     - url: /local/community/chorebot-cards/chorebot-cards.js
       type: module
   ```
4. Hard refresh browser

## Card Configuration

### Grouped Card (Tag-based grouping)

```yaml
type: custom:chorebot-grouped-card
entity: todo.chorebot_family_tasks
person_entity: person.kyle  # Optional: Filter tasks by person
title: "My Tasks"
show_progress: true
show_points: true
tag_group_order:
  - Morning
  - Afternoon
  - Evening
untagged_header: "Other Tasks"
```

### Person Points Card

```yaml
type: custom:chorebot-person-points-card
person_entity: person.kyle
title: "Kyle's Points"
accent_color: "#3498db"  # Optional: Override person's accent color
```

### Person Rewards Card

```yaml
type: custom:chorebot-person-rewards-card
person_entity: person.kyle
title: "Available Rewards"
show_disabled_rewards: false
sort_by: cost  # Options: cost, name, created
```

### Add Task Card

```yaml
type: custom:chorebot-add-task-card
entity: todo.chorebot_family_tasks
button_text: "Add Task"
```

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for build instructions.

## License

See [LICENSE.txt](LICENSE.txt)
```

**Both AGENTS.md files (see Phase 2, task 5 above for ha-chorebot)**

**ha-chorebot-cards AGENTS.md:**
```markdown
# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

**Last Updated**: 2026-01-09 - Single bundle architecture for HACS plugin

## Project Overview

ChoreBot Cards provides frontend dashboard cards for the ChoreBot Home Assistant integration.
This is a **HACS plugin** repository that serves a single JavaScript bundle containing all 4 cards.

**Integration Repository**: [ha-chorebot](https://github.com/kylerm42/ha-chorebot)

## Architecture

**Single Bundle Approach:**
- All 4 cards bundled into one file: `dist/chorebot-cards.js`
- Entry point: `src/index.ts` imports all card modules
- Each card self-registers via `customElements.define()`
- Shared utilities bundled once (no duplication)
- HACS serves at `/hacsfiles/chorebot-cards/chorebot-cards.js`

**Card Components:**
1. `chorebot-grouped-card` - Tag-based grouped task view
2. `chorebot-add-task-card` - Quick task creation with full field support
3. `chorebot-person-points-card` - Visual points balance with progress bar
4. `chorebot-person-rewards-card` - Rewards catalog with redemption flow

**Shared Utilities (`src/utils/`):**
- `types.ts` - TypeScript interfaces
- `date-utils.ts` - Date formatting & parsing
- `task-utils.ts` - Task filtering & grouping
- `rrule-utils.ts` - Recurrence rule parsing
- `dialog-utils.ts` - Edit dialog rendering
- `color-utils.ts` - Accent color handling
- `confetti-utils.ts` - Celebration animations
- `points-display-utils.ts` - Points terminology display

## Build System

**Rollup Configuration:**
- Input: `src/index.ts`
- Output: `dist/chorebot-cards.js` (single bundle)
- Format: ES module
- Production: Minified with Terser (~100KB)
- Development: With sourcemaps (~150KB)

**Build Commands:**
- `npm run build` - Production build (minified)
- `npm run watch` - Development build (auto-rebuild on changes)
- `npm run format` - Format code with Prettier

**HACS Compatibility:**
- `hacs.json` specifies `filename: "chorebot-cards.js"`
- Single `.js` file in `dist/` directory
- HACS automatically downloads and serves on install
- No manual Lovelace resources needed

## Development Workflow

### Standalone Card Development

```bash
npm install
npm run watch  # Auto-rebuild on changes
```

Copy `dist/chorebot-cards.js` to HA instance for testing:
```
config/www/community/chorebot-cards/chorebot-cards.js
```

### Full-Stack Development (with Integration)

See main integration repo's [DEVELOPMENT.md](https://github.com/kylerm42/ha-chorebot/blob/main/DEVELOPMENT.md)
for submodule-based workflow.

## Important Reminders

- **Single bundle only**: Do NOT create multiple build outputs (breaks HACS)
- **Entry point imports all cards**: `src/index.ts` must import all 4 card modules
- **Self-registration pattern**: Each card calls `customElements.define()` in its own module
- **Shared utilities**: All cards use common utils from `src/utils/` (bundled once)
- **HACS filename**: Must match repository name for auto-detection (`chorebot-cards.js`)
- **Browser compatibility**: Target modern browsers (ES2020+), HA provides polyfills

## Release Process

1. Update version in `package.json`
2. Build production bundle: `npm run build`
3. Test bundle in live HA instance
4. Commit changes
5. Tag release: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
6. Push: `git push origin main --tags`
7. Create GitHub release with tag
8. HACS auto-detects new release

## Implementation Status

### ✅ Completed
- TypeScript + Lit framework
- Rollup build system (single bundle)
- All 4 card implementations
- Shared utilities architecture
- HACS plugin compatibility
- Docker Compose auto-build workflow
```

### Phase 5: Testing & Validation

**Pre-Release Testing Checklist:**

**Cards Repo (`ha-chorebot-cards`):**
- [ ] Clean install: `rm -rf node_modules && npm install`
- [ ] Production build succeeds: `npm run build`
- [ ] Single bundle exists: `dist/chorebot-cards.js`
- [ ] Bundle size reasonable: ~90-110KB minified
- [ ] No TypeScript errors: `npm run build` (TypeScript runs first)
- [ ] All 4 cards present in bundle (inspect file, check for `customElements.define` calls)

**Integration Repo (`ha-chorebot`):**
- [ ] No frontend files remain: `src/`, `package.json`, etc. deleted
- [ ] No frontend registration code in `__init__.py`
- [ ] No errors on integration load (check HA logs)
- [ ] Backend services work independently of cards
- [ ] `hacs.json` is integration type

**Full-Stack Testing (via submodules):**
- [ ] Submodule initializes: `git submodule update --init`
- [ ] Docker Compose starts: `./dev.sh up`
- [ ] HA accessible at http://localhost:8123
- [ ] Card builder runs: `docker logs chorebot-card-builder`
- [ ] Single bundle auto-builds on TypeScript changes
- [ ] Bundle served at `/local/community/chorebot-cards/chorebot-cards.js`
- [ ] Hard refresh loads updated bundle
- [ ] All 4 cards work in dashboard

**HACS Simulation (Manual):**
- [ ] Copy `dist/chorebot-cards.js` to `dev-config/www/community/chorebot-cards/`
- [ ] Add Lovelace resource (manual):
     ```yaml
     resources:
       - url: /local/community/chorebot-cards/chorebot-cards.js
         type: module
     ```
- [ ] All 4 cards load and function correctly
- [ ] Browser console shows no errors
- [ ] Cards can call integration services
- [ ] Points/rewards system works end-to-end

**Production HACS Testing (Post-Release):**
- [ ] Install integration via HACS
- [ ] Install cards plugin via HACS
- [ ] Verify automatic resource registration (no manual `resources.yaml`)
- [ ] Verify cards served from `/hacsfiles/chorebot-cards/chorebot-cards.js`
- [ ] Test all card types
- [ ] Test updates (bump version, create new release, update via HACS)

---

## Rollout Plan

### Timeline

**Day 1: Cards Repository Setup**
- [x] Repository created (user confirmed)
- [ ] Copy frontend files (src/, package.json, etc.)
- [ ] Create `src/index.ts` entry point
- [ ] Update `rollup.config.mjs` for single bundle
- [ ] Create `hacs.json`, `info.md`, `README.md`, `DEVELOPMENT.md`, `AGENTS.md`
- [ ] Test build: `npm run build`
- [ ] Verify `dist/chorebot-cards.js` works

**Day 2: Integration Cleanup**
- [ ] Remove frontend code from `ha-chorebot`
- [ ] Update `__init__.py` (remove frontend registration)
- [ ] Update `hacs.json`, `README.md`, `AGENTS.md`
- [ ] Test integration loads without errors

**Day 3: Local Dev Environment**
- [ ] Add cards as submodule: `git submodule add`
- [ ] Update `docker-compose.yml` with dual mounts
- [ ] Update `dev.sh` with submodule init
- [ ] Test full-stack dev workflow

**Day 4: Releases**
- [ ] Create release v0.1.0 in `ha-chorebot-cards`
- [ ] Create release v0.1.0 in `ha-chorebot`
- [ ] Test HACS installation (both repos)
- [ ] Verify cards auto-load without manual configuration

### Release Checklist

**ha-chorebot-cards v0.1.0:**
- [ ] All TypeScript source files committed
- [ ] Production build successful: `npm run build`
- [ ] `dist/chorebot-cards.js` exists (single bundle)
- [ ] Bundle size: ~100KB ± 10KB
- [ ] `hacs.json` configured: type=plugin, filename="chorebot-cards.js"
- [ ] `info.md` created with card descriptions
- [ ] `README.md` with installation instructions + card examples
- [ ] `DEVELOPMENT.md` with build instructions
- [ ] `AGENTS.md` with architecture documentation
- [ ] `LICENSE.txt` included
- [ ] GitHub release created: tag `v0.1.0`
- [ ] Release notes: "Initial release - single bundle with all cards"

**ha-chorebot v0.1.0:**
- [ ] Frontend code removed: `src/`, `package.json`, `rollup.config.mjs`, etc.
- [ ] `custom_components/chorebot/dist/` deleted
- [ ] `__init__.py` cleaned: no frontend registration
- [ ] `hacs.json` updated: integration type only
- [ ] `README.md` updated: two-repo installation instructions
- [ ] `AGENTS.md` updated: new architecture documented
- [ ] Git submodule added: `.gitmodules` file
- [ ] Docker Compose updated: dual mounts for cards
- [ ] `dev.sh` updated: submodule initialization
- [ ] GitHub release created: tag `v0.1.0`
- [ ] Release notes: "Architecture change - cards moved to separate repo"

---

## Success Metrics

- [x] Single bundle file (`chorebot-cards.js`) contains all 4 cards
- [ ] Bundle size under 120KB minified
- [ ] Users can install both repos from HACS UI
- [ ] Cards load automatically after HACS plugin installation
- [ ] No manual `resources.yaml` configuration required
- [ ] Local dev environment works with one `docker compose up` command
- [ ] Build times under 5 seconds for card auto-rebuild
- [ ] Browser console shows no errors on card load
- [ ] All 4 cards function correctly in dashboard

---

## Notes from User Feedback

1. ✅ **Repository already created** - Skip creation step
2. ✅ **Single bundle preferred** - Build all cards into `chorebot-cards.js`
3. ✅ **Skip migration guide** - User is only user, knows what to do
4. ✅ **Agree with recommendations** - Follow all recommendations in original plan

---

## Next Steps

1. Begin Phase 1: Copy files to `ha-chorebot-cards` repository
2. Create `src/index.ts` entry point that imports all cards
3. Update Rollup config for single bundle output
4. Test build and verify bundle works
5. Create HACS metadata files (`hacs.json`, `info.md`)
6. Proceed with subsequent phases
