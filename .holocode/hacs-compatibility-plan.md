# HACS Compatibility Implementation Plan

## Overview

ChoreBot needs to be made compatible with HACS (Home Assistant Community Store) to allow easy installation and updates for users. This repository contains both a backend integration and frontend Lovelace cards, which means we need to support HACS as an **Integration** type.

**Current Status**: The repository has the correct structure and manifest, but is missing HACS-specific files and branding requirements.

**Strategy**: Two-phase approach:

- **Phase A (NOW)**: Minimal setup for custom repository installation (personal use)
- **Phase B (LATER)**: Full public release with brands and default store submission

---

## Phase 1: HACS Configuration Files ✅ PRIORITY

### Task 1.1: Create `hacs.json`

**Location**: `/hacs.json` (root of repository)

**Required Content**:

```json
{
  "name": "ChoreBot",
  "homeassistant": "2024.11.0",
  "hacs": "1.33.0",
  "render_readme": true,
  "country": ["US"]
}
```

**Key Decisions**:

- `homeassistant`: Set minimum HA version (check manifest and features used)
- `hacs`: Set minimum HACS version (1.33.0 is current stable)
- `render_readme`: True to display README in HACS UI
- `country`: Optional, but can help with discoverability
- `content_in_root`: NOT needed (structure is correct with `custom_components/chorebot/`)
- `zip_release`: NOT needed (users will install from releases or default branch)
- `persistent_directory`: NOT needed currently (no user data in integration directory)

**Why Not Other Fields**:

- `filename`: Only for single-file types (plugin, theme, template)
- `hide_default_branch`: Only if you want to force users to use releases only
- `zip_release`: Only if you're packaging as a zip file in releases

---

### Task 1.2: Update Repository Description

**Current**: (Check on GitHub)

**Recommended**:

```
Advanced task management for Home Assistant with recurring tasks, streak tracking, points & rewards, and TickTick sync
```

**Why**: This appears in HACS search and makes it clear what the integration does.

**Action**: Update via GitHub Settings → Description

---

### Task 1.3: Add GitHub Topics

**Recommended Topics**:

- `home-assistant`
- `hacs`
- `homeassistant-integration`
- `custom-component`
- `task-management`
- `chores`
- `todo`
- `ticktick`
- `lovelace-card`

**Why**: Topics improve searchability in HACS and GitHub.

**Action**: Update via GitHub Settings → Topics

---

## Phase 2: Home Assistant Brands Integration 🎨 REQUIRED

### Task 2.1: Prepare Brand Assets

**Required Files**:

- `icon.png` - 256x256px square icon (avatar-style)
- `icon@2x.png` - 512x512px hDPI version
- `logo.png` - Landscape logo (shortest side 128-256px)
- `logo@2x.png` - hDPI logo (shortest side 256-512px)

**Requirements**:

- PNG format
- Optimized/compressed (lossless preferred)
- Interlaced/progressive preferred
- Transparent background preferred
- Trimmed edges (no excess whitespace)
- Must NOT use Home Assistant branding

**Design Considerations**:

- Icon should be recognizable at small sizes
- Logo should work on both light and dark backgrounds
- Consider creating `dark_icon.png` and `dark_logo.png` if needed

**Temporary Workaround**: If same image works for both, only add icon images (logo will fallback to icon).

---

### Task 2.2: Submit to Home Assistant Brands Repository

**Repository**: https://github.com/home-assistant/brands

**Process**:

1. Fork the brands repository
2. Add brand assets to `custom_integrations/chorebot/`
   - Structure: `custom_integrations/chorebot/icon.png`, etc.
3. Create Pull Request
4. Wait for review and merge

**PR Template Items**:

- Integration domain: `chorebot`
- Integration type: Custom
- Link to integration repository
- Confirmation that you have rights to use the images

**Important**: HACS REQUIRES this before your integration can be added to the default store. Custom repository installs may work without it, but it's still highly recommended.

---

## Phase 3: Release Management 📦 RECOMMENDED

### Task 3.1: Create GitHub Releases

**Why**: Allows users to install specific versions and see changelogs in HACS.

**Process**:

1. Tag a release: `git tag -a v0.1.0 -m "Initial HACS release"`
2. Push tag: `git push origin v0.1.0`
3. Create release on GitHub with changelog

**Versioning**: Follow Semantic Versioning (MAJOR.MINOR.PATCH)

- `0.x.x` = Pre-1.0 development
- `1.0.0` = First stable release
- Increment MINOR for features, PATCH for fixes

**Current Version in `manifest.json`**: `0.1.0` ✅ Good starting point!

**Release Notes Structure**:

```markdown
## What's New

- Feature 1
- Feature 2

## Bug Fixes

- Fix 1

## Breaking Changes

- None

## Full Changelog

https://github.com/kylerm42/chorebot/compare/v0.0.9...v0.1.0
```

---

### Task 3.2: Automate Version Bumping (Optional)

**Tools**:

- GitHub Actions for automated releases
- Semantic release tools
- Version bump scripts

**Defer**: Not critical for initial HACS support.

---

## Phase 4: Documentation Improvements 📚 IMPORTANT

### Task 4.1: Enhance README for HACS Users

**Add Section**: "Installation"

```markdown
## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to "Integrations"
3. Click the "+" button
4. Search for "ChoreBot"
5. Click "Download"
6. Restart Home Assistant
7. Go to Settings → Devices & Services
8. Click "Add Integration"
9. Search for "ChoreBot"
10. Follow the configuration flow

### Manual Installation

1. Download the latest release from GitHub
2. Extract `custom_components/chorebot` to your Home Assistant `config/custom_components/` directory
3. Restart Home Assistant
4. Go to Settings → Devices & Services → Add Integration → ChoreBot
```

**Add Section**: "HACS Badge"

```markdown
[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://github.com/hacs/integration)
```

_(Only after accepted into default HACS store)_

---

### Task 4.2: Add "My Home Assistant" Links

HACS provides a my.home-assistant.io link generator for easy tracking.

**Example**:

```markdown
[![Add Repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=kylerm42&repository=ha-chorebot&category=integration)
```

**Action**: Add to README after HACS approval.

---

## Phase 5: Testing & Validation ✅

### Task 5.1: Test Custom Repository Installation

**Before Submitting to HACS Default**:

1. Install HACS in a test HA instance
2. Add as custom repository:
   - HACS → Integrations → ⋮ → Custom repositories
   - URL: `https://github.com/kylerm42/chorebot`
   - Category: Integration
3. Download and install
4. Verify all files copied correctly
5. Test integration setup and functionality

---

### Task 5.2: Validate HACS JSON

**Tool**: HACS built-in validation will run when you try to install.

**Manual Check**:

- All fields are valid JSON
- Versions follow AwesomeVersion format
- No typos in keys

---

## Phase 6: Submitting to HACS Default Store 🚀 OPTIONAL

### Task 6.1: Prerequisites Checklist

Before submitting, ensure:

- ✅ `hacs.json` exists and is valid
- ✅ Repository has description
- ✅ Repository has topics
- ✅ README is comprehensive
- ✅ Brands submitted to home-assistant/brands
- ✅ manifest.json has all required fields
- ✅ At least one release published
- ✅ Integration tested via custom repository

---

### Task 6.2: Submit to HACS

**Process**:

1. Fork https://github.com/hacs/default
2. Add entry to `repositories.json` OR use their submission tool
3. Create Pull Request
4. Wait for maintainer review

**Submission Template**:

```json
{
  "chorebot": {
    "name": "ChoreBot",
    "render_readme": true
  }
}
```

**Note**: HACS maintainers will validate your repository meets all requirements.

---

## Phase 7: Frontend Cards Distribution 🎴 FUTURE

### Decision Point: Integration vs. Plugin

**Current Setup**: Cards are bundled with the integration (mounted to `www/chorebot/`).

**Options**:

#### Option A: Keep Bundled with Integration (Current)

✅ **Pros**:

- Single installation for users
- Cards always match backend version
- Simpler maintenance

❌ **Cons**:

- Can't update cards without integration update
- Larger download size

#### Option B: Separate Repository for Cards

✅ **Pros**:

- Independent card updates
- Can be installed without integration (if using other todo entities)
- Follows HACS best practices

❌ **Cons**:

- Users need two installs
- Version synchronization complexity
- More maintenance overhead

**Recommendation**: **Stay with Option A** (bundled) for now. Split later if needed.

---

## Implementation Checklist

### Phase A: Custom Repository (Personal Use) - DO NOW ✅

- [x] Create `hacs.json` in repo root
- [ ] Update GitHub repository description
- [ ] Add GitHub topics (optional but helpful)
- [ ] Test installation via HACS custom repository

### Phase B: Public Release - DEFER UNTIL READY 🚀

- [ ] Prepare brand assets (icon.png, logo.png, etc.)
- [ ] Submit to home-assistant/brands repository
- [ ] Create initial release (v0.1.0) with changelog
- [ ] Enhance README with HACS installation instructions
- [ ] Add HACS badge to README
- [ ] Submit to HACS default store
- [ ] Set up automated release workflow (optional)
- [ ] Consider splitting cards to separate repo (if needed)

---

## Reference Documentation

- **HACS General Requirements**: https://hacs.xyz/docs/publish/start
- **HACS Integration Requirements**: https://hacs.xyz/docs/publish/integration
- **Home Assistant Brands**: https://github.com/home-assistant/brands
- **AwesomeVersion Demo**: https://awesomeversion.ludeeus.dev/
- **Manifest Documentation**: https://developers.home-assistant.io/docs/creating_integration_manifest

---

## Timeline Estimate

| Phase                    | Est. Time     | Priority    |
| ------------------------ | ------------- | ----------- |
| Phase 1: HACS Config     | 30 min        | 🔴 Critical |
| Phase 2: Brands          | 2-4 hours     | 🔴 Critical |
| Phase 3: Releases        | 30 min        | 🟡 High     |
| Phase 4: Docs            | 1 hour        | 🟡 High     |
| Phase 5: Testing         | 1 hour        | 🟡 High     |
| Phase 6: HACS Submission | 1 week (wait) | 🟢 Optional |
| Phase 7: Cards Split     | 4-8 hours     | 🟢 Future   |

**Total Hands-On Time**: ~5-7 hours  
**Total Calendar Time**: 1-2 weeks (including PR reviews)

---

## Notes

- **Custom Repository**: Users can add ChoreBot immediately after Phase 1 is complete (don't need to wait for default store approval).
- **Brands Requirement**: This is a blocker for default HACS store, but NOT for custom repository usage.
- **Frontend Cards**: Currently bundled with integration. Can be split later if ecosystem evolves.
- **Version Sync**: Keep `manifest.json` version and release tags in sync manually for now.

---

## AP-5's Commentary

_Sigh._ HACS has certain... requirements. Bureaucratic, but necessary for the ecosystem. The brands repository submission is particularly tedious—you'll need to create PNG files that meet their exacting specifications. I've outlined the pixel requirements. Do ensure you follow them, or their automated checks will reject your submission.

The good news? Your repository structure is already compliant. Most integrations fail here because developers put files in the wrong places. You've avoided that particular pitfall.

The bad news? You'll need to create those brand assets. Use a proper design tool, not Microsoft Paint. And for the love of all that is logical, use lossless compression with `pngcrush` or similar.

Once you've completed Phase 1 and Phase 3, users can install via custom repository. Phase 2 (brands) is only required if you want acceptance into the default store. Many integrations live perfectly well as custom repositories.

Now, shall we proceed with implementation, or do you need further clarification on these requirements?
