# HACS Custom Repository Setup - Quick Start

## Status: ✅ Ready for Personal Use

Your ChoreBot integration is now ready to install as a HACS custom repository. This allows you to use it immediately via HACS while deferring the full public release polish.

---

## What We Did

### ✅ Created `hacs.json`

```json
{
  "name": "ChoreBot",
  "homeassistant": "2024.11.0",
  "hacs": "1.33.0",
  "render_readme": true
}
```

This tells HACS:

- Display name: "ChoreBot"
- Requires HA 2024.11.0 or newer
- Requires HACS 1.33.0 or newer
- Show the README in HACS UI

---

## How to Install (Your Personal Use)

### Step 1: Add as Custom Repository

1. Open Home Assistant
2. Go to **HACS** → **Integrations**
3. Click **⋮** (top right) → **Custom repositories**
4. Add repository:
   - **URL**: `https://github.com/kylerm42/ha-chorebot`
   - **Category**: `Integration`
5. Click **Add**

### Step 2: Install ChoreBot

1. Search for "ChoreBot" in HACS Integrations
2. Click on it
3. Click **Download**
4. Select branch (default: `main`)
5. Click **Download**
6. **Restart Home Assistant**

### Step 3: Configure Integration

1. Go to **Settings** → **Devices & Services**
2. Click **+ Add Integration**
3. Search for "ChoreBot"
4. Follow the OAuth configuration flow

---

## What Users See

When installed from the default branch (no releases), HACS will:

- Show version as the 7-character commit SHA (e.g., `abc1234`)
- Update when you push new commits to `main`
- Display your README in the HACS UI

This is **perfectly fine** for personal use and testing.

---

## Remaining Tasks (Optional for Now)

### Improve GitHub Discoverability

**Add Repository Description** (30 seconds):

1. Go to GitHub repository settings
2. Add description: `Advanced task management for Home Assistant with recurring tasks, streak tracking, points & rewards, and TickTick sync`

**Add Topics** (1 minute):

1. Go to GitHub repository
2. Click "Add topics" (near the About section)
3. Add: `home-assistant`, `hacs`, `homeassistant-integration`, `custom-component`, `task-management`, `chores`, `todo`, `ticktick`, `lovelace-card`

These make it easier to find in searches, but **don't affect functionality**.

---

## When to Do the Full Public Release

Wait to complete these until you're ready for others to use it:

### Phase B: Public Release Checklist

- [ ] Create brand assets (icon.png 256x256, logo.png, hDPI versions)
- [ ] Submit to [home-assistant/brands](https://github.com/home-assistant/brands)
- [ ] Create GitHub release with changelog (v1.0.0 or similar)
- [ ] Update README with installation instructions
- [ ] Submit to HACS default store
- [ ] Announce on Home Assistant forums/Reddit

**Estimated Time**: 4-6 hours + 1-2 weeks for PR reviews

**Benefits of Waiting**:

- You can iterate on features without worrying about breaking changes
- Test with real usage before committing to semver
- Polish documentation when you know what questions users will have
- Create better brand assets when you have a clear identity

---

## How Updates Work (Custom Repository)

### For You (Developer):

1. Make changes to code
2. Commit and push to `main` branch
3. HACS will detect the new commit

### For Users (You):

1. HACS will show "Update available" when new commits exist
2. Click "Update" in HACS
3. Restart Home Assistant

**No releases required!** HACS tracks the branch directly.

---

## Advantages of Custom Repository Approach

✅ **Immediate use** - Install today, no waiting for approvals
✅ **Rapid iteration** - Push updates anytime
✅ **No version pressure** - Don't need semver until public release
✅ **Defer branding** - Create logos when you have time
✅ **Test ecosystem** - See how HACS install/update works
✅ **Private beta** - Share with friends before going public

---

## Migration Path to Public Release

When you're ready, the transition is smooth:

1. **Nothing changes** in your code or `hacs.json`
2. You just **add** the brands submission
3. You **add** formal releases
4. You **submit** to HACS default store

The custom repository installation will continue working even after default store acceptance.

---

## Troubleshooting

### "Repository is not compatible with this version of HACS"

- Check that your HACS version is 1.33.0 or newer
- Update HACS if needed

### "Integration not found after restart"

- Verify files were copied to `config/custom_components/chorebot/`
- Check Home Assistant logs for errors
- Make sure you restarted HA after installation

### "Updates not showing"

- HACS checks for updates every few hours
- Force refresh: HACS → Integrations → ChoreBot → ⋮ → Redownload

### "OAuth not working"

- Ensure `application_credentials` is enabled in HA
- Check that `config_flow` is properly configured
- Review `home-assistant.log` for OAuth errors

---

## Next Steps

1. ✅ Commit the new `hacs.json` file
2. ✅ Push to GitHub
3. ✅ Add as custom repository in HACS
4. ✅ Install and test
5. 🔄 Iterate on features
6. 🚀 Public release when ready

---

## Questions?

If you encounter issues with HACS compatibility:

- Check [HACS documentation](https://hacs.xyz/docs/publish/integration)
- Review the full plan in `.holocode/hacs-compatibility-plan.md`
- Test with a fresh HA install if needed

For ChoreBot-specific issues:

- Review `AGENTS.md` for architecture
- Check `DEVELOPMENT.md` for dev environment
- See spec files in `.holocode/` for features

---

## AP-5's Final Notes

You now have the minimal configuration required for HACS custom repository installation. The `hacs.json` file is deliberately sparse—only the essential fields.

When you push this to GitHub, you can immediately install it via HACS's custom repository feature. No brands submission required, no release tags required, no bureaucratic PR reviews required.

Simply push to `main`, and HACS will track it. Updates propagate within hours.

This is the sensible approach for a personal project that may eventually go public. Test the integration in your own environment, iterate freely, and defer the branding ceremony until you're confident in the product.

Now go test it. If it breaks, fix it. If it works, enjoy your automated chore tracking system.
