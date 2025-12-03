# Feature Spec: Configurable Points Display

## 1. Overview

**Purpose:** Allow users to customize how "points" are displayed throughout the ChoreBot integration. Users can choose custom text (e.g., "stars", "coins") or an icon/emoji (e.g., ⭐, 🪙) to replace the default "points"/"pts" terminology.

**User Story:** As a ChoreBot user, I want to customize the points terminology to match my family's preferences, so that the reward system feels more personalized and engaging (e.g., kids might prefer "stars" or emojis).

## 2. Requirements

- [ ] Users can configure points display during initial integration setup
- [ ] Users can update points display after setup via integration options flow
- [ ] Configuration supports both text (e.g., "stars") and icon/emoji (e.g., ⭐)
- [ ] Icon takes precedence over text if both are provided
- [ ] Default values: text="points", icon="" (backward compatible)
- [ ] Frontend cards automatically use configured display without manual configuration
- [ ] All points/pts references in UI are replaced (cards, badges, dialogs)
- [ ] Field labels (e.g., "Points Value") remain unchanged in edit forms

## 3. Architecture & Design

### High-Level Approach

Configuration is stored in the backend (`chorebot_config`), exposed via `sensor.chorebot_points` attributes, and consumed by all frontend cards through a shared utility function. This ensures single source of truth and eliminates the need to configure each card individually.

### Component Interaction

```
┌──────────────────────────────────────────────────────────┐
│ Config Flow (Backend)                                     │
│  ├─ Initial Setup: Optional points display config         │
│  └─ Options Flow: Update points display post-setup        │
└────────────────┬─────────────────────────────────────────┘
                 │ Saves to chorebot_config
                 ▼
┌──────────────────────────────────────────────────────────┐
│ ChoreBotStore (Backend)                                   │
│  └─ _config_data["points_display"] = {                    │
│       "text": "stars",                                     │
│       "icon": "⭐"                                          │
│     }                                                      │
└────────────────┬─────────────────────────────────────────┘
                 │ Exposed via sensor
                 ▼
┌──────────────────────────────────────────────────────────┐
│ ChoreBotPointsSensor (Backend)                            │
│  └─ attributes["points_display"] = {                      │
│       "text": "stars",                                     │
│       "icon": "⭐"                                          │
│     }                                                      │
└────────────────┬─────────────────────────────────────────┘
                 │ Read by frontend
                 ▼
┌──────────────────────────────────────────────────────────┐
│ Frontend Utility Function                                 │
│  └─ getPointsDisplay(hass) -> "⭐" or "stars" or "pts"    │
└────────────────┬─────────────────────────────────────────┘
                 │ Used by all cards
                 ▼
┌──────────────────────────────────────────────────────────┐
│ All Frontend Cards (6 cards + dialog)                     │
│  ├─ person-points-card.ts: "437 stars"                    │
│  ├─ person-rewards-card.ts: "50 stars" (cost)             │
│  ├─ grouped-card.ts: "+10 stars" (badge)                  │
│  ├─ list-card.ts: "+10 stars" (badge)                     │
│  ├─ rewards-card.ts: "100 stars" (balance)                │
│  └─ dialog-utils.ts: Field labels unchanged               │
└──────────────────────────────────────────────────────────┘
```

### Critical Design Decisions

- **Decision:** Icon takes precedence over text if both provided
  - **Rationale:** Icons are more visually engaging and often the primary choice (e.g., ⭐, 🪙)
  - **Trade-offs:** Requires frontend to check icon first, then fall back to text

- **Decision:** Store in global `chorebot_config`, not per-list
  - **Rationale:** Consistent terminology across all lists is more intuitive
  - **Trade-offs:** Can't have different terminology per list (acceptable limitation)

- **Decision:** Use options flow instead of service call for updates
  - **Rationale:** Native HA pattern for integration settings, better UX
  - **Trade-offs:** Requires more backend code, but cleaner architecture

- **Decision:** Keep field labels unchanged ("Points Value", "Streak Bonus Points")
  - **Rationale:** These are technical labels for configuration, not user-facing displays
  - **Trade-offs:** Slight inconsistency, but clearer for users editing forms

## 4. Data Model Changes

### Backend Storage (`chorebot_config`)

**Before:**

```json
{
  "lists": [...]
}
```

**After:**

```json
{
  "lists": [...],
  "points_display": {
    "text": "stars",
    "icon": "⭐"
  }
}
```

**Schema:**

- `points_display.text`: String, default "points"
- `points_display.icon`: String (emoji or MDI icon like "mdi:star"), default ""

### Sensor Attributes

**New attribute in `sensor.chorebot_points`:**

```json
{
  "people": {...},
  "rewards": [...],
  "recent_transactions": [...],
  "points_display": {
    "text": "stars",
    "icon": "⭐"
  }
}
```

## 5. Execution Strategy

### Phase 1: Backend Configuration Infrastructure

**Goal:** Enable users to configure points display and expose it to frontend

**Scope:** `custom_components/chorebot/` - config_flow.py, store.py, sensor.py, const.py

**Dependencies:** None

**Concurrency:** Can run parallel to Phase 2 (frontend can be tested with mock data)

**Key Implementation Notes:**

1. **Update `const.py`**: Add constants for storage keys

   ```python
   CONF_POINTS_DISPLAY = "points_display"
   CONF_POINTS_TEXT = "text"
   CONF_POINTS_ICON = "icon"
   ```

2. **Update `config_flow.py`**: Add options flow
   - Implement `async_step_options_init` method
   - Schema: text input (default "points") + icon input (default "")
   - Validation: Ensure at least one field is non-empty
   - On submit: Update config entry data + trigger reload

3. **Update `store.py`**: Add config accessors
   - Add `get_points_display() -> dict[str, str]` method
   - Return `{"text": "points", "icon": ""}` as default if not found
   - Ensure backward compatibility with existing configs

4. **Update `sensor.py`**: Expose in attributes
   - Add `points_display` to `extra_state_attributes`
   - Read from `PeopleStore` (which should access via `ChoreBotStore`)

**Files to modify:**

- `custom_components/chorebot/const.py`
- `custom_components/chorebot/config_flow.py`
- `custom_components/chorebot/store.py`
- `custom_components/chorebot/sensor.py`

### Phase 2: Frontend Utility & Card Updates

**Goal:** Replace all hardcoded "pts" references with dynamic display

**Scope:** `src/` - All 6 cards + dialog-utils.ts + new utility file

**Dependencies:** Phase 1 (needs backend to expose config)

**Concurrency:** Can develop in parallel with Phase 1 using mock data

**Key Implementation Notes:**

1. **Create `src/utils/points-display-utils.ts`**:

   ```typescript
   export function getPointsDisplay(
     hass: HomeAssistant,
     short: boolean = true,
   ): string {
     const sensor = hass.states["sensor.chorebot_points"];
     if (!sensor?.attributes.points_display) {
       return short ? "pts" : "points";
     }

     const { text, icon } = sensor.attributes.points_display;

     // Icon takes precedence
     if (icon) return icon;

     // Fall back to text
     if (text) return short ? text.toLowerCase() : text;

     // Final fallback
     return short ? "pts" : "points";
   }
   ```

2. **Update `src/person-points-card.ts`**:
   - Line 437: Replace `pts` with `${getPointsDisplay(this.hass)}`

3. **Update `src/person-rewards-card.ts`**:
   - Lines 645, 650, 660, 861: Replace `pts` with `${getPointsDisplay(this.hass)}`

4. **Update `src/grouped-card.ts`**:
   - Lines 565, 577: Replace `pts` with `${getPointsDisplay(this.hass)}`

5. **Update `src/deprecated/list-card.ts`** (if still in use):
   - Lines 336, 347: Replace `pts` with `${getPointsDisplay(this.hass)}`

6. **Update `src/deprecated/rewards-card.ts`** (if still in use):
   - Lines 513, 518, 523, 595, 644: Replace `pts` with `${getPointsDisplay(this.hass)}`

7. **Update `src/add-task-card.ts`**:
   - Check for any hardcoded "pts" (none found in grep, but verify)

8. **Update `src/utils/dialog-utils.ts`**:
   - Field labels: Keep "Points Value" and "Streak Bonus Points" unchanged
   - Helper text (line 743 in person-rewards-card): Keep "points" lowercase for consistency

**Files to modify:**

- `src/utils/points-display-utils.ts` (NEW)
- `src/person-points-card.ts`
- `src/person-rewards-card.ts`
- `src/grouped-card.ts`
- `src/deprecated/list-card.ts`
- `src/deprecated/rewards-card.ts`

## 6. Usage Scenarios / Edge Cases

### Scenario A: Initial Setup (Happy Path)

1. User installs ChoreBot integration
2. During setup, sees "Points Display" optional fields
3. Enters "stars" in text field, leaves icon blank
4. All cards display "stars" instead of "pts"

### Scenario B: Post-Setup Update

1. User has existing ChoreBot installation with default "pts"
2. Goes to Devices & Services → ChoreBot → Configure
3. Opens options flow, sees current config (text="points", icon="")
4. Changes to icon="⭐", text="stars"
5. Saves → cards automatically update to show ⭐ emoji

### Scenario C: Icon + Text Precedence

1. User sets both text="stars" and icon="⭐"
2. Frontend displays icon ⭐ (icon takes precedence)
3. If icon fails to render (rare edge case), falls back to "stars"

### Scenario D: Empty Configuration (Edge Case)

1. User clears both fields (should be prevented by validation)
2. Backend rejects or uses defaults
3. Frontend fallback: If both empty, displays "pts"

### Scenario E: MDI Icon vs Emoji

1. User enters MDI icon: "mdi:star"
2. Frontend detects `mdi:` prefix and renders via `<ha-icon>`
3. User enters emoji: "⭐"
4. Frontend renders as plain text (emoji display works natively)

### Scenario F: Backward Compatibility

1. Existing installations without `points_display` in config
2. Backend returns default: `{"text": "points", "icon": ""}`
3. Frontend displays "pts" (short form) as before

## 7. Security & Performance Considerations

**Security:**

- No sensitive data stored (just display preference)
- Input validation: Reject excessively long strings (>50 chars for text, >100 chars for icon)
- Sanitize inputs to prevent XSS (HA already handles this, but verify)

**Performance:**

- Minimal overhead: One additional read from sensor attributes
- Utility function is lightweight (no API calls)
- Cards already re-render on sensor state changes (no new listeners needed)

**Accessibility:**

- Emojis have no alt text (minor issue, but acceptable for visual preference)
- MDI icons already have accessibility support via HA's `<ha-icon>`
- Consider adding `aria-label` to points displays if using custom icons

## 8. Testing Checklist

- [ ] Initial setup: Configure custom text (e.g., "stars")
- [ ] Initial setup: Configure custom emoji (e.g., ⭐)
- [ ] Initial setup: Configure MDI icon (e.g., mdi:star)
- [ ] Options flow: Update existing config
- [ ] Options flow: Clear icon (revert to text)
- [ ] Options flow: Clear text (revert to default)
- [ ] Frontend: Verify all 6 cards use dynamic display
- [ ] Frontend: Verify dialog field labels unchanged
- [ ] Frontend: Verify helper text unchanged
- [ ] Backward compatibility: Existing installations without config
- [ ] Edge case: Both fields empty (should use fallback)
- [ ] Edge case: Very long text (should be truncated or rejected)
- [ ] Visual regression: Check icon rendering in badges (size, alignment)

## 9. Migration Notes

**No migration needed** - This is an additive feature. Existing installations will continue to display "pts" until users configure custom display.

**Default behavior:** If `points_display` is missing from config, backend returns `{"text": "points", "icon": ""}`, which frontend renders as "pts" (short form) - identical to current behavior.

## 10. Future Enhancements (Out of Scope)

- **Per-list custom display**: Different terminology for different lists (e.g., "stars" for kids list, "coins" for chores list)
- **Plural/singular forms**: "1 star" vs "10 stars" (currently always uses same term)
- **Localization**: Translate default "points" to user's locale
- **Icon picker UI**: Visual icon selector in config flow (currently text input)
- **Preview in config flow**: Show example "437 stars" or "+10 ⭐" in options UI

## 11. Documentation Updates

**User-facing documentation:**

- Add section to README.md explaining how to customize points display
- Include examples: text ("stars", "coins"), emojis (⭐, 🪙), MDI icons (mdi:star)
- Note that icon takes precedence over text

**Developer documentation:**

- Update AGENTS.md to document new `points_display` config structure
- Note that frontend utility function `getPointsDisplay()` should be used for all new displays

## 12. Open Questions

1. **Should we allow both icon and text simultaneously?** (e.g., "⭐ stars")
   - Current spec: Icon takes precedence (mutually exclusive display)
   - Alternative: Concatenate if both provided
   - **Decision:** Keep current approach (icon precedence) for simplicity

2. **Should field labels in edit dialog also be customizable?**
   - Current spec: Keep "Points Value" unchanged
   - Alternative: Replace with "{Custom Term} Value"
   - **Decision:** Keep unchanged (field labels are technical, not user-facing displays)

3. **Should we validate MDI icon names?**
   - Current spec: No validation (assume user knows valid icon names)
   - Alternative: Validate against MDI icon list
   - **Decision:** No validation (HA will render broken icon if invalid, acceptable UX)

## 13. Rollout Plan

1. **Phase 1**: Backend infrastructure (config flow, storage, sensor)
2. **Phase 2**: Frontend updates (utility function, all 6 cards)
3. **Testing**: Integration tests + manual testing with various configs
4. **Documentation**: Update README.md + AGENTS.md
5. **Release**: Deploy as feature enhancement (non-breaking)
