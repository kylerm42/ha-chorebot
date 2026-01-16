# Repository Split Implementation Summary

**Feature**: Two-Repository Architecture for HACS Compatibility  
**Completed**: 2026-01-09  
**Spec**: [.holocode/proposed/20260109-repository-split/SPEC.md](../proposed/20260109-repository-split/SPEC.md)

## Overview

Split the monolithic `ha-chorebot` repository into two separate repositories to achieve full HACS compatibility:
1. **ha-chorebot** - Python integration (this repo)
2. **ha-chorebot-cards** - Frontend dashboard cards (separate HACS plugin)

This resolved HACS's limitation where repositories can only be ONE type (integration OR plugin, not both).

## What Was Implemented

### Backend Repository (ha-chorebot)
- **Removed** all frontend code (`src/`, TypeScript files, Rollup config)
- **Removed** frontend registration from `__init__.py`
- **Updated** `hacs.json` to integration-only type
- **Added** `frontend/` as git submodule pointing to `ha-chorebot-cards`
- **Updated** Docker Compose setup for full-stack development
- **Updated** documentation (README, AGENTS.md, DEVELOPMENT.md)

### Frontend Repository (ha-chorebot-cards)
- **Created** standalone HACS plugin repository
- **Single bundle approach**: All 4 cards compiled into `chorebot-cards.js`
- **HACS plugin metadata**: `hacs.json`, `info.md`, comprehensive README
- **Build system**: Rollup configuration for single ES module bundle
- **Entry point**: `src/index.ts` imports all card modules
- **Size**: ~100KB minified (all 4 cards + shared utilities)

### Development Environment
- **Git submodules**: Cards repo linked as `frontend/` submodule
- **Docker Compose**: Auto-initializes submodule and mounts both repos
- **Card builder container**: Runs `npm run watch` for auto-rebuild
- **Live updates**: TypeScript changes → auto-rebuild → hard refresh browser

## Key Benefits

- ✅ Users install both repos from HACS UI (one Integration, one Plugin)
- ✅ Cards load automatically without manual `resources.yaml` edits
- ✅ Single bundle simplifies HACS configuration and loading
- ✅ Local dev environment supports editing both repos simultaneously
- ✅ Independent versioning and release cycles
- ✅ Clean separation of concerns (backend vs frontend)

## Files Modified

### Backend (ha-chorebot)
- `custom_components/chorebot/__init__.py` - Removed frontend registration
- `hacs.json` - Changed to integration-only type
- `README.md` - Two-repo installation instructions
- `AGENTS.md` - Updated architecture documentation
- `docker-compose.yml` - Added card-builder service
- `dev.sh` - Added submodule initialization

### Frontend (ha-chorebot-cards)
- `src/index.ts` - New entry point (imports all cards)
- `rollup.config.mjs` - Single bundle configuration
- `hacs.json` - Plugin type metadata
- `info.md` - HACS plugin description
- `README.md` - Installation and configuration
- `DEVELOPMENT.md` - Build instructions
- `AGENTS.md` - Frontend architecture guide

## Technical Details

**Single Bundle Strategy:**
- All 4 cards in one file: `chorebot-cards.js`
- Each card self-registers via `customElements.define()`
- Shared utilities bundled once (no duplication)
- HACS serves from `/hacsfiles/chorebot-cards/`

**Development Workflow:**
1. Backend changes: Edit Python → Restart HA
2. Frontend changes: Edit TypeScript → Auto-rebuild → Hard refresh

**HACS Plugin Requirements Met:**
- ✅ `.js` file in `dist/` directory
- ✅ Filename matches repo name
- ✅ Single bundle approach
- ✅ GitHub releases for versioning
- ✅ Automatic serving by HACS

## Current Status

**Production Ready**: Both repositories are live and functional.

- Integration repo: https://github.com/kylerm42/ha-chorebot
- Cards repo: https://github.com/kylerm42/ha-chorebot-cards

Users can install both from HACS and cards load automatically without manual configuration.
