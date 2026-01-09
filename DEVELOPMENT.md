# ChoreBot Development Guide

This document describes the Docker Compose-based development workflow for ChoreBot backend integration.

**Note**: Frontend cards are in a [separate repository](https://github.com/kylerm42/ha-chorebot-cards). For full-stack development (integration + cards), see Phase 3 in `.holocode/20260109-repository-split-plan.md`.

## Prerequisites

- Docker and Docker Compose installed

## Architecture

The development environment consists of one service:

1. **homeassistant**: Official Home Assistant dev image with your integration and config mounted

## Quick Start

### macOS / Windows

```bash
# Start Home Assistant
docker compose up -d

# View logs
docker compose logs -f homeassistant

# Stop everything
docker compose down
```

### Linux

```bash
# Start with host networking for full mDNS/discovery support
docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d

# View logs
docker compose logs -f homeassistant

# Stop everything
docker compose -f docker-compose.yml -f docker-compose.linux.yml down
```

**Note**: Linux uses `network_mode: host` which provides better integration discovery but requires the `-f` flag to include the Linux override file.

Access Home Assistant at: http://localhost:8123

## Development Workflow

### Backend (Python) Development

1. Edit files in `custom_components/chorebot/`
2. Changes are immediately visible to HA via volume mount
3. Restart HA to load changes (choose one method):

**Option A: UI Restart (Recommended - Fastest)**

- Go to Developer Tools → Server Controls
- Click "Restart" button
- Wait ~20 seconds for HA to reload

**Option B: Container Restart (Simple and Reliable)**

```bash
docker-compose restart homeassistant
```

- Takes ~30-60 seconds (includes container restart + HA startup)
- Always works, no auth tokens needed

**Note**: Only restart the container if you've changed `docker-compose.yml` or need to troubleshoot container issues. For code changes, the UI restart is faster.

### Full-Stack Development (Integration + Cards)

For developing both integration and cards simultaneously, the setup uses git submodules:

#### Initial Setup

The cards repository is already configured as a submodule at `frontend/`:

```bash
# Clone integration repo (includes submodule reference)
git clone git@github.com:kylerm42/ha-chorebot.git
cd ha-chorebot

# Initialize submodule (automatic via dev.sh, or manual)
git submodule update --init --recursive

# Start development environment
./dev.sh up
```

The `dev.sh up` command automatically initializes the submodule if needed.

#### Development Workflow

**Backend (Python) Changes:**
1. Edit files in `custom_components/chorebot/`
2. Restart HA from Developer Tools → Server Controls

**Frontend (TypeScript) Changes:**
1. Edit files in `frontend/src/`
2. Card builder auto-rebuilds `frontend/dist/chorebot-cards.js` (watch mode)
3. Check build logs: `./dev.sh logs card-builder`
4. Hard refresh browser (Ctrl+Shift+R)

**How It Works:**
- `card-builder` container mounts `./frontend` (the submodule)
- Runs `npm run watch` automatically on start
- Rebuilds single bundle on TypeScript changes
- `homeassistant` container mounts `./frontend/dist` to `/config/www/community/chorebot-cards`
- Cards served at `/local/community/chorebot-cards/chorebot-cards.js` (mimics HACS)

#### Submodule Management

```bash
# Update cards to latest
cd frontend
git pull origin main
cd ..
git add frontend
git commit -m "Update cards submodule"

# Make changes in cards repo
cd frontend
# Edit src/*.ts files
git add .
git commit -m "Card changes"
git push origin main
cd ..

# Sync submodule pointer
git add frontend
git commit -m "Update cards submodule pointer"

# Push integration changes
git push origin main
```

#### Standalone Cards Development

For cards-only development without integration:

```bash
cd frontend  # or clone ha-chorebot-cards separately
npm install
npm run watch
# Copy dist/chorebot-cards.js to HA manually
```

See [ha-chorebot-cards DEVELOPMENT.md](https://github.com/kylerm42/ha-chorebot-cards/blob/main/DEVELOPMENT.md) for more details.

### Config and Data

- **Location**: `dev-config/` directory
- **Structure**:
  - `configuration.yaml` - Main HA config
  - `secrets.yaml` - Credentials (gitignored)
  - `.storage/` - HA state and ChoreBot data (gitignored)
  - `home-assistant_v2.db` - SQLite database (gitignored)
  - `custom_components/` - Integration mount point (via Docker)

### Volume Mounts

The Docker Compose setup uses these mounts:

```yaml
homeassistant:
  - ./dev-config → /config                                    # HA config
  - ./custom_components/chorebot → /config/custom_components/chorebot  # Live Python code
  - ./frontend/dist → /config/www/community/chorebot-cards    # Built cards (mimics HACS path)

card-builder:
  - ./frontend → /app  # Cards repo for building
```

**Key Points:**
- Cards are served from `/local/community/chorebot-cards/chorebot-cards.js`
- This mimics the HACS plugin path for production-like testing
- Card builder watches `frontend/src/` and rebuilds to `frontend/dist/`

## Common Commands

### Container Management

**macOS/Windows:**

```bash
# Start services in background
docker compose up -d

# Start services with logs visible
docker compose up

# Stop services
docker compose down

# Restart HA only
docker compose restart homeassistant

# View logs
docker compose logs -f homeassistant

# Rebuild containers (after Dockerfile changes)
docker compose up -d --build
```

**Linux:**

```bash
# Use -f flags to include both files
docker compose -f docker-compose.yml -f docker-compose.linux.yml up -d
docker compose -f docker-compose.yml -f docker-compose.linux.yml down
docker compose restart homeassistant  # Works without -f flags
docker compose logs -f homeassistant  # Works without -f flags
```

### Accessing HA Container

```bash
# Open shell in HA container
docker exec -it homeassistant-chorebot-dev bash

# Check HA logs
docker exec -it homeassistant-chorebot-dev tail -f /config/home-assistant.log
```

## Debugging

### Backend (Python)

1. Check logs: `docker-compose logs -f homeassistant`
2. Or view `dev-config/home-assistant.log`
3. Enable debug logging in `dev-config/configuration.yaml`:
   ```yaml
   logger:
     default: info
     logs:
       custom_components.chorebot: debug
   ```

### Frontend Cards

Frontend cards are in a separate repository. See [ha-chorebot-cards](https://github.com/kylerm42/ha-chorebot-cards) for card development.

## Testing Changes

### Integration Setup

1. Go to Settings → Devices & Services
2. Add Integration → ChoreBot
3. Complete OAuth flow if using remote sync

### Config Flow Changes

If you modify `config_flow.py`:

1. Remove the integration (Settings → Devices & Services → ChoreBot → Delete)
2. Restart HA (use Developer Tools → Server Controls → Restart)
3. Re-add the integration

### Service Testing

Test custom services from Developer Tools → Services:

```yaml
# Create a list
service: chorebot.create_list
data:
  name: "Test List"

# Add a task
service: chorebot.add_task
data:
  list_id: todo.chorebot_test
  summary: "Test task"
  tags: ["Morning"]

# Trigger sync
service: chorebot.sync
```

## Frontend Cards

Dashboard cards are in a separate repository: [ha-chorebot-cards](https://github.com/kylerm42/ha-chorebot-cards)

For frontend development, see that repository's DEVELOPMENT.md.

## Platform-Specific Networking

### Why Two Docker Compose Files?

**macOS/Windows**: Docker Desktop uses a VM, so `network_mode: host` doesn't work. Port mapping (`8123:8123`) is required.

**Linux**: Docker runs natively, so `network_mode: host` works and provides better performance and integration discovery (mDNS, SSDP, etc.).

The `docker-compose.yml` file contains the base configuration that works everywhere. The `docker-compose.linux.yml` file overrides the network settings for Linux-only optimizations.

### When Do You Need Host Networking?

You probably **don't need it** for ChoreBot development. Port mapping works fine for:

- Web UI access
- REST API calls
- OAuth flows
- Custom integrations

You **might need it** if you're working with:

- Home Assistant discovery protocols (mDNS, SSDP)
- Network device integrations (like Sonos, HomeKit)
- Multicast protocols

For most ChoreBot development, just use the standard `docker compose up -d` on any platform.

## Troubleshooting

### "Port 8123 already in use"

Another HA instance is running. Stop it or change the port in `docker-compose.yml`:

```yaml
ports:
  - "8124:8123" # Use 8124 instead
```

### "Permission denied" Errors

The HA container runs as root by default. If you see permission issues:

```bash
# Fix ownership of dev-config
sudo chown -R $USER:$USER dev-config/
```

### HA Won't Start

1. Check logs: `docker-compose logs homeassistant`
2. Verify config syntax: `docker exec homeassistant-chorebot-dev hass --script check_config -c /config`
3. Check `dev-config/configuration.yaml` for errors

## Differences from Dev Container Setup

**Old (Dev Containers)**:

- VS Code dependent
- Full HA core repository required
- Symlinks between repos
- Complex devcontainer.json configuration
- Can cause VS Code crashes

**New (Docker Compose)**:

- Editor agnostic
- Single repository
- Direct volume mounts
- Simple docker-compose.yml
- More stable and lightweight

## File Locations

| What             | Old Location                     | New Location                       |
| ---------------- | -------------------------------- | ---------------------------------- |
| HA Config        | `core/config/`                   | `ha-chorebot/dev-config/`          |
| Integration Code | `ha-chorebot/custom_components/` | (same)                             |
| Frontend Source  | `ha-chorebot/src/`               | (same)                             |
| Built Cards      | (varies)                         | `ha-chorebot/dist/`                |
| Storage Data     | `core/config/.storage/`          | `ha-chorebot/dev-config/.storage/` |

**Note**: Built cards are in `dist/` directory for HACS compatibility. See: https://hacs.xyz/docs/publish/plugin/

## Additional Resources

- [Home Assistant Developer Docs](https://developers.home-assistant.io/)
- [Lit Documentation](https://lit.dev/)
- [ChoreBot Technical Spec](spec/chore-bot.md)
