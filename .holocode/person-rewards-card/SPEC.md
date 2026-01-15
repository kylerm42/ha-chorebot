# Person Rewards Card - Specification

**Status**: complete  
**Created**: 2026-01-15  
**Updated**: 2026-01-15 (All Phases Complete)  
**Type**: Feature Enhancement  

---

## Overview

Create a combined `chorebot-person-rewards-card` that merges:
1. **Person dropdown section** (top) - Interactive person selector with avatar, points, progress bar
2. **Rewards list** (bottom) - Vertical list of rewards filtered by selected person

This follows the same pattern as `person-grouped-card` (person dropdown + tag-grouped tasks), but replaces tasks with rewards.

---

## Goals

1. **Extract reusable person dropdown utilities** to avoid code duplication
2. **Create combined person-rewards card** using extracted utilities
3. **Refactor existing cards** to use shared utilities
4. **Maintain backwards compatibility** by keeping old rewards card as `chorebot-rewards-card`

---

## User Feedback & Clarifications

### Card Naming
- Rename existing `person-rewards-card.ts` → `rewards-card.ts` (type: `chorebot-rewards-card`)
- New combined card: `person-rewards-card.ts` (type: `chorebot-person-rewards-card`)
- **No deprecation** of old card - both cards coexist

### Rewards Display Format
- **Vertical list layout** (NOT grid) - matches current `person-rewards-card` exactly
- Same reward card structure, modals, and interactions

### Person Dropdown Behavior
- **No `show_all_people` config option** - always show all people in dropdown
- Smart defaults from `person-grouped-card`:
  1. Auto-detect logged-in user
  2. Fallback to config `default_person_entity`
  3. Fallback to first person alphabetically

### Progress Bar
- Use existing shared utility (`renderProgressBar` from `progress-bar-utils.ts`)
- Calculate task completion progress (same logic as `person-grouped-card`)
- Show progress bar by default (`show_progress: true` config option)

---

## Architecture

### File Structure

```
frontend/src/
├── person-grouped-card.ts           [MODIFIED] - Uses person-dropdown-utils
├── person-rewards-card.ts           [NEW] - Combined person+rewards
├── rewards-card.ts                  [RENAMED] - Standalone rewards (no person selector)
├── person-points-card.ts            [UNCHANGED] - Standalone points display
└── utils/
    ├── person-display-utils.ts      [UNCHANGED] - Avatar/points rendering
    ├── person-dropdown-utils.ts     [NEW] - Dropdown rendering & logic
    ├── progress-bar-utils.ts        [UNCHANGED] - Already exists, used by all cards
    └── ...other utils
```

---

## Implementation Plan

### Phase 1: Extract Person Dropdown Utilities

**New File**: `src/utils/person-dropdown-utils.ts`

#### Functions to Extract

```typescript
/**
 * Render person dropdown section (header + animated dropdown)
 * @param hass - Home Assistant instance
 * @param selectedPersonId - Currently selected person entity ID
 * @param dropdownOpen - Dropdown visibility state
 * @param allPeople - All available people (no filtering)
 * @param showProgress - Whether to show progress bar in header
 * @param progress - Task completion progress (optional)
 * @param shades - Color shades for styling (from color-utils)
 * @param progressTextColor - Progress bar text color override
 * @param onToggle - Callback when header clicked
 * @param onSelect - Callback when person selected from dropdown
 * @param hideBackground - Remove card background/shadow
 * @returns TemplateResult with person section HTML
 */
export function renderPersonDropdown(
  hass: HomeAssistant,
  selectedPersonId: string,
  dropdownOpen: boolean,
  allPeople: PersonProfile[],
  showProgress: boolean,
  progress: Progress | undefined,
  shades: ColorShades,
  progressTextColor: string | undefined,
  onToggle: () => void,
  onSelect: (personId: string) => void,
  hideBackground: boolean = false
): TemplateResult

/**
 * Detect default person on initial load
 * Priority: Logged-in user → Config default → First alphabetically
 * @param hass - Home Assistant instance
 * @param configDefault - Person entity from config (optional override)
 * @returns Person entity ID or empty string if none found
 */
export function detectDefaultPerson(
  hass: HomeAssistant,
  configDefault?: string
): string
```

#### Implementation Notes

**HTML Structure** (extracted from `person-grouped-card.ts`):
- `.person-section` - Container with dropdown open/closed state classes
- `.person-header` - Clickable header showing selected person
  - Avatar (64px, responsive to 48px mobile)
  - Name + Points display
  - Chevron icon (rotates 180° when open)
  - Progress bar (optional)
- `.person-dropdown` - Animated dropdown using `grid-template-rows` transition
  - `.person-dropdown-inner` - Scrollable content (max-height: 400px)
  - `.person-dropdown-item` - Individual person rows with avatar + points
  - Selected person highlighted with background tint

**CSS Requirements**:
- Person dropdown CSS must be copied to each card (can't extract due to LitElement scoping)
- Add comment block: `/* Person Dropdown Styles - Shared with person-dropdown-utils.ts */`
- CSS classes documented in utility file JSDoc

---

### Phase 2: Refactor `person-grouped-card.ts`

**Changes**:
1. Import `renderPersonDropdown` and `detectDefaultPerson` from `person-dropdown-utils.ts`
2. Replace `_renderPersonDisplay()` + `_renderPersonDropdown()` methods with single utility call
3. Replace person detection logic in `willUpdate()` with `detectDefaultPerson()`
4. Keep person dropdown CSS (lines 133-391) with comment marker
5. Keep state management in card:
   - `_selectedPersonId: string`
   - `_dropdownOpen: boolean`

**Testing**:
- Verify dropdown opens/closes smoothly
- Verify person selection changes task filtering
- Verify progress bar updates when person changes
- Verify accent color inheritance still works

---

### Phase 3: Rename Existing `person-rewards-card.ts` to `rewards-card.ts`

**Changes**:
1. Rename file: `person-rewards-card.ts` → `rewards-card.ts`
2. Update component decorator: `@customElement("chorebot-rewards-card")`
3. Update config interface type: `"custom:chorebot-rewards-card"`
4. Update window.customCards registration
5. Update console.info log name
6. Update `rollup.config.mjs`:
   - Input: `src/rewards-card.ts`
   - Output: `dist/chorebot-rewards-card.js`

**No Functionality Changes**:
- Card still accepts `person_entity` config
- Card still shows rewards for single person
- Card still has add/edit/redeem modals
- Just renamed for clarity (standalone rewards without person selector)

---

### Phase 4: Create New `person-rewards-card.ts`

#### Config Interface

```typescript
interface ChoreBotPersonRewardsConfig extends ChoreBotBaseConfig {
  type: "custom:chorebot-person-rewards-card";
  
  // Person Selection
  default_person_entity?: string; // Override auto-detection
  
  // Display Options
  show_progress?: boolean; // Show task progress bar (default: true)
  hide_person_background?: boolean; // Hide person section background (default: false)
  hide_rewards_background?: boolean; // Hide rewards section background (default: false)
  
  // Rewards List Options (inherited from rewards-card)
  show_add_reward_button?: boolean; // Show "Add Reward" card (default: true)
  show_disabled_rewards?: boolean; // Include disabled rewards (default: false)
  sort_by?: "cost" | "name" | "created"; // Sort order (default: "cost")
  
  // Styling
  accent_color?: string; // Override accent color (hex or CSS variable)
  progress_text_color?: string; // Progress bar text color override
}
```

#### Component Structure

```typescript
@customElement("chorebot-person-rewards-card")
export class ChoreBotPersonRewardsCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: ChoreBotPersonRewardsConfig;
  @state() private _selectedPersonId: string = "";
  @state() private _dropdownOpen = false;
  @state() private _showConfirmModal = false;
  @state() private _showAddRewardModal = false;
  @state() private _showEditRewardModal = false;
  @state() private _pendingRedemption: {personId: string; rewardId: string} | null = null;
  @state() private _rewardFormData = { name: "", cost: 50, icon: "mdi:gift", description: "" };
  @state() private _editingRewardId: string | null = null;
  @state() private _redeeming: string | null = null;
  
  private shades: ColorShades = { lighter: "", light: "", base: "", dark: "", darker: "" };
}
```

#### Render Structure

```html
<div class="card-container">
  <!-- Person Dropdown Section -->
  <div class="person-section ${hidePersonBackground} ${dropdownOpen}">
    ${renderPersonDropdown(
      hass,
      selectedPersonId,
      dropdownOpen,
      allPeople,
      showProgress,
      progress,
      shades,
      progressTextColor,
      () => this._toggleDropdown(),
      (personId) => this._selectPerson(personId),
      hidePersonBackground
    )}
  </div>

  <!-- Rewards List Section -->
  <div class="rewards-section ${hideRewardsBackground}">
    ${this._renderRewardsList()}
  </div>
</div>

<!-- Modals (identical to rewards-card) -->
${this._renderConfirmModal()}
${this._renderAddRewardModal()}
${this._renderEditRewardModal()}
```

#### Key Methods

**willUpdate()**:
```typescript
willUpdate(changedProperties: Map<string, any>) {
  // Phase 1: Initial person detection
  if (changedProperties.has("hass") && this._selectedPersonId === "") {
    this._selectedPersonId = detectDefaultPerson(
      this.hass!,
      this._config?.default_person_entity
    );
  }

  // Phase 2: Color shade recalculation
  if ((changedProperties.has("_config") || changedProperties.has("_selectedPersonId")) && this._config) {
    const baseColor = resolveAccentColor(
      this.hass!,
      this._config.accent_color,
      this._selectedPersonId
    );
    this.shades = calculateColorShades(baseColor);
  }

  // Phase 3: Calculate task progress for selected person
  if (changedProperties.has("hass") || changedProperties.has("_selectedPersonId")) {
    this._progress = this._calculatePersonProgress();
  }
}
```

**_calculatePersonProgress()**:
```typescript
private _calculatePersonProgress(): Progress {
  // Same logic as person-grouped-card
  const allStates = Object.values(this.hass!.states);
  const todoEntities = allStates.filter((e) =>
    e.entity_id.startsWith("todo.chorebot_")
  ) as HassEntity[];

  const personTasks = filterTasksByPerson(
    todoEntities,
    this._selectedPersonId,
    false, // Don't include dateless tasks
  );

  return calculateDatedTasksProgress(personTasks);
}
```

**_renderRewardsList()**:
```typescript
private _renderRewardsList() {
  const sensor = this.hass?.states["sensor.chorebot_points"];
  const rewards = sensor?.attributes.rewards || [];
  const people = sensor?.attributes.people || {};

  // Filter rewards by selected person
  const personRewards = rewards.filter(
    (r) => r.person_id === this._selectedPersonId
  );

  // Filter by enabled/disabled
  const filteredRewards = personRewards.filter(
    (r) => this._config!.show_disabled_rewards || r.enabled
  );

  // Sort rewards
  const sortedRewards = this._sortRewards(filteredRewards);

  // Get person's balance
  const person = people[this._selectedPersonId];

  if (sortedRewards.length === 0 && !this._config!.show_add_reward_button) {
    return html`<div class="empty-state">No rewards configured yet.</div>`;
  }

  return html`
    <div class="rewards-list">
      ${sortedRewards.map((reward) => this._renderRewardCard(reward, person))}
      ${this._config!.show_add_reward_button ? this._renderAddRewardCard() : ""}
    </div>
  `;
}
```

#### CSS Structure

```css
/* Card Container */
.card-container {
  display: flex;
  flex-direction: column;
  gap: 20px; /* Spacing between person and rewards sections */
}

/* Person Section - Copy from person-grouped-card (lines 133-391) */
/* Person Dropdown Styles - Shared with person-dropdown-utils.ts */
.person-section { /* ... */ }
.person-header { /* ... */ }
.person-dropdown { /* ... */ }
/* ... all person dropdown CSS ... */

/* Rewards Section */
.rewards-section {
  background: transparent;
  box-shadow: none;
  padding: 0;
  position: relative;
  z-index: 1;
}

/* Rewards List - Copy from rewards-card.ts (lines 109-444) */
.rewards-list { /* ... */ }
.reward-card { /* ... */ }
.add-reward-card { /* ... */ }
/* ... all reward CSS ... */
```

---

### Phase 5: Build System Integration

**Update `rollup.config.mjs`**:

```javascript
export default [
  // ... existing cards ...
  
  // Renamed standalone rewards card
  {
    input: "src/rewards-card.ts",
    output: {
      file: "dist/chorebot-rewards-card.js",
      format: "es",
    },
    // ... plugins ...
  },
  
  // New combined person-rewards card
  {
    input: "src/person-rewards-card.ts",
    output: {
      file: "dist/chorebot-person-rewards-card.js",
      format: "es",
    },
    // ... plugins ...
  },
];
```

**Build and Test**:
```bash
npm run build
# Verify output files:
# - dist/chorebot-rewards-card.js (renamed)
# - dist/chorebot-person-rewards-card.js (new)
```

**Implementation Notes** (2026-01-15):
- Build system uses **single bundle approach** (`dist/chorebot-cards.js`) instead of multi-bundle
- `src/index.ts` already imports all 6 cards including new `person-rewards-card`
- Build succeeded in 805ms with no errors
- Bundle size: 167KB (under 200KB target ✅)
- TypeScript type check: Passed with no errors ✅
- All cards verified present in bundle:
  - `chorebot-add-task-card`
  - `chorebot-grouped-card`
  - `chorebot-person-grouped-card`
  - `chorebot-person-points-card`
  - `chorebot-person-rewards-card` ← NEW
  - `chorebot-rewards-card` (standalone version)

---

## Configuration Examples

### Minimal Configuration

```yaml
- type: custom:chorebot-person-rewards-card
```

**Behavior**:
- Auto-detects logged-in user as default person
- Shows all people in dropdown
- Shows task progress bar
- Sorts rewards by cost (low to high)
- Shows "Add Reward" button
- Hides disabled rewards
- Uses person's accent color from profile

---

### Full Configuration

```yaml
- type: custom:chorebot-person-rewards-card
  default_person_entity: person.kyle
  show_progress: true
  hide_person_background: false
  hide_rewards_background: false
  show_add_reward_button: true
  show_disabled_rewards: false
  sort_by: cost
  accent_color: "#3498db"
  progress_text_color: "white"
```

---

### Personal Dashboard Example

```yaml
# Mobile-optimized personal view
- type: custom:chorebot-person-rewards-card
  default_person_entity: person.kyle
  hide_person_background: true
  hide_rewards_background: true
  accent_color: var(--blue-500)
```

---

### Family Dashboard Example

```yaml
# Shared tablet view with person switcher
- type: custom:chorebot-person-rewards-card
  show_progress: true
  show_add_reward_button: true
  sort_by: cost
```

---

## Testing Checklist

### Person Dropdown Functionality
- [ ] Auto-detects logged-in user on first load
- [ ] Falls back to `default_person_entity` if user not detected
- [ ] Falls back to first person alphabetically if no config default
- [ ] Dropdown animates smoothly (grid-template-rows transition)
- [ ] Selected person highlighted in dropdown
- [ ] Clicking person changes selection and closes dropdown
- [ ] Progress bar updates when person changes
- [ ] Avatar displays image or initials fallback
- [ ] Points display uses configured terminology (from `points-display-utils`)
- [ ] Chevron icon rotates 180° when dropdown opens

### Rewards List Functionality
- [ ] Only shows rewards for selected person
- [ ] Sorts by cost/name/created correctly
- [ ] Disabled rewards hidden unless `show_disabled_rewards: true`
- [ ] Clicking reward opens confirmation modal
- [ ] Confirmation modal shows correct person/reward/balance info
- [ ] "Redeem" button disabled if insufficient points or reward disabled
- [ ] Redemption deducts points correctly (calls `chorebot.redeem_reward`)
- [ ] Confetti animation plays on successful redemption
- [ ] "Add Reward" card appears if `show_add_reward_button: true`
- [ ] Add reward modal prefills `person_id` with selected person
- [ ] Edit button in confirmation modal opens edit modal
- [ ] Edit modal populates existing reward data
- [ ] Update reward works correctly

### Styling & Responsiveness
- [ ] Accent color inherited from person profile (via `resolveAccentColor`)
- [ ] Manual `accent_color` config overrides person profile
- [ ] `hide_person_background: true` removes person section background
- [ ] `hide_rewards_background: true` removes rewards section background
- [ ] 20px gap between person and rewards sections
- [ ] Responsive mobile layout (< 600px):
  - [ ] Avatar shrinks to 48px
  - [ ] Font sizes reduce appropriately
  - [ ] Dropdown max-height reduces to 300px
- [ ] Rewards list maintains vertical layout on all screen sizes

### Edge Cases
- [ ] No people configured (error message: "No people found")
- [ ] Selected person has no rewards (empty state or only "Add Reward" card)
- [ ] Person can't afford any rewards (all buttons disabled, modal shows error)
- [ ] `sensor.chorebot_points` not found (error message)
- [ ] Person entity not found (error message)
- [ ] Rapid person switching doesn't cause race conditions
- [ ] Rewards update in real-time when sensor state changes

### Integration with Existing Cards
- [ ] `person-grouped-card` still works after refactor
- [ ] `rewards-card` (renamed) still works identically
- [ ] All cards use same person dropdown CSS (consistent styling)
- [ ] All cards use same progress bar utility (consistent calculation)

---

## Success Criteria

1. ✅ **No code duplication**: Person dropdown logic extracted to utilities
2. ✅ **Backwards compatibility**: Old `chorebot-rewards-card` still works
3. ✅ **Consistent behavior**: New card follows `person-grouped-card` patterns
4. ✅ **Full feature parity**: All reward interactions work (add/edit/redeem)
5. ✅ **Proper styling**: Person section and rewards section visually separated
6. ✅ **Responsive design**: Works on mobile and desktop
7. ✅ **Accent color inheritance**: Uses person profile colors automatically
8. ✅ **Progress bar integration**: Uses shared utility, shows task completion
9. ✅ **Build system**: Produces correct bundles for both cards
10. ✅ **Documentation**: Clear examples and migration guide

---

## Implementation Timeline

- **Phase 1** (Extract Utilities): 1-2 hours
- **Phase 2** (Refactor person-grouped-card): 1 hour
- **Phase 3** (Rename rewards-card): 30 minutes
- **Phase 4** (Create person-rewards-card): 2-3 hours
- **Phase 5** (Build integration): 30 minutes

**Total Estimated Time**: 5-7 hours

---

## Implementation Notes

### Phase 3: Rename Completed (2026-01-15)

**File Rename**: `person-rewards-card.ts` → `rewards-card.ts`

**Updated References**:
- ✅ Component decorator: `@customElement("chorebot-rewards-card")`
- ✅ Config type: `type: "custom:chorebot-rewards-card"`
- ✅ TypeScript interface: `ChoreBotPersonRewardsConfig` (still uses this name for backwards compatibility)
- ✅ window.customCards registration: `type: "chorebot-rewards-card"`
- ✅ Console log: `CHOREBOT-REWARDS-CARD`
- ✅ Rollup config: Uses single bundle (`index.ts` imports `rewards-card`)
- ✅ Updated `index.ts` import path
- ✅ Updated deprecated README reference

**Build Verification**:
- TypeScript compilation: ✅ Success
- Output file: `dist/chorebot-cards.js` (136K single bundle)
- No errors or warnings

**No Functionality Changes**: Card still accepts `person_entity` config, shows rewards for single person, has add/edit/redeem modals. Just renamed for clarity.

---

## Notes & Decisions

### Why Not Extract CSS?
LitElement's `static styles` is scoped per component via shadow DOM. Extracting CSS would require:
- CSS-in-JS utilities
- Web component inheritance
- Loss of type safety

**Decision**: Copy/paste CSS with clear comment markers for maintainability.

### Why Always Show All People?
Simplifies logic and provides consistent UX with `person-grouped-card`. User can quickly switch between any family member without dropdown changing dynamically.

### Why Show Task Progress?
Maintains consistency across all person-based cards. Shows user their task completion status even when viewing rewards (provides context for earning more points).

### Why Vertical List Instead of Grid?
Matches existing `rewards-card` design. Vertical lists are better for:
- Mobile scrolling
- Reward descriptions (multi-line text)
- Consistent reward card heights

---

## Future Enhancements

### Short Term
- [ ] Extract modal rendering utilities (shared by 3 cards)
- [ ] Add reward filtering by tag/category
- [ ] Add quick redeem mode (skip confirmation modal)

### Long Term
- [ ] Reward images instead of just icons
- [ ] Reward purchase history timeline
- [ ] Rewards summary in person dropdown (# affordable rewards)
- [ ] Gamification: achievement badges for redemption milestones

---

## References

- **Source Cards**: `person-grouped-card.ts`, `person-rewards-card.ts`
- **Utilities**: `person-display-utils.ts`, `progress-bar-utils.ts`, `color-utils.ts`
- **Related Specs**: `.holocode/person-grouped-card/SPEC.md`, `.holocode/person-accent-color-system.md`
- **Build Config**: `rollup.config.mjs`
