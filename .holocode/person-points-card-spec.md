# Feature Spec: Person Points Display Card

## 1. Overview

**Purpose:** Create a simple, focused card that displays a single person's avatar and current points balance in a compact horizontal layout. This card is designed to be placed above a person's task list card to provide immediate visual feedback on their points status.

**User Story:** As a user, I want to see a person's avatar and points balance at a glance, so that I can quickly understand their current standing in the points system without navigating to the full rewards card.

## 2. Requirements

- [x] Display a person's avatar (photo or initials) on the left side
- [x] Display the person's name next to the avatar
- [x] Display the current points balance on the right side
- [x] Support person entity selection via configuration
- [x] Automatically fetch person data from `sensor.chorebot_points`
- [x] Gracefully handle missing person entity (show friendly error)
- [x] Responsive layout that maintains left-right structure on mobile
- [x] Match visual styling of existing ChoreBot cards
- [x] Support optional card title display
- [x] Support transparent background mode for seamless dashboard integration
- [x] Support visual configuration editor in Home Assistant UI

## 3. Architecture & Design

### High-Level Approach

This card will be a new standalone Lit Web Component that reuses existing patterns from the rewards card for avatar rendering and the list/grouped cards for configuration structure. It will be significantly simpler than the rewards card since it only displays one person's data without any interaction logic.

### Component Interaction

```
chorebot-person-points-card
  ↓
Home Assistant Entity System
  ↓
sensor.chorebot_points (attributes.people dictionary)
  ↓
PersonPoints data for selected person
```

### Data Flow

1. Card receives `person_entity` config parameter (e.g., `person.kyle`)
2. Card queries `sensor.chorebot_points` from Home Assistant state
3. Card extracts `people` dictionary from sensor attributes
4. Card looks up person data using `person_entity` as key
5. Card renders avatar + name + points

### Critical Design Decisions

- **Decision:** Use `person_entity` (e.g., `person.kyle`) as the config parameter, not person name
  - **Rationale:** Entity IDs are stable identifiers. Names can change, but entity IDs remain constant.
  - **Trade-offs:** Slightly less user-friendly for initial setup, but much more reliable long-term.

- **Decision:** Reuse avatar rendering logic from rewards card (photo or initials)
  - **Rationale:** Visual consistency across cards, proven implementation.
  - **Trade-offs:** None - this is a pure win for consistency.

- **Decision:** Make the card non-interactive (no click actions)
  - **Rationale:** This is a display-only card. The rewards card handles redemptions.
  - **Trade-offs:** Users cannot navigate to detailed views, but this keeps the card simple and focused.

- **Decision:** Use large font for points to make them prominent
  - **Rationale:** Points balance is the primary information this card conveys.
  - **Trade-offs:** May not fit as much on smaller screens, but the card is intentionally simple.

## 4. Data Model Changes

**No backend changes required.** This card reads from existing `sensor.chorebot_points` entity:

```typescript
interface PersonPoints {
  entity_id: string; // e.g., "person.kyle"
  points_balance: number; // Current points
  lifetime_points: number; // Total earned (not displayed in this card)
  last_updated: string; // ISO timestamp (not displayed in this card)
}
```

## 5. Execution Strategy

### Step-by-Step Implementation (Simple)

- [ ] **Step 1: Create TypeScript source file**
  - _Files:_ `src/person-points-card.ts`
  - _Details:_ New Lit Web Component extending `LitElement`
  - _Reuse:_ Copy avatar rendering from `rewards-card.ts` lines 119-145
  - _Reuse:_ Copy base config structure from `main.ts` lines 28-52

- [ ] **Step 2: Define TypeScript interfaces**
  - _Files:_ `src/utils/types.ts`
  - _Details:_ Add `ChoreBotPersonPointsConfig` interface
  - _Fields:_ `person_entity` (required), `title`, `show_title`, `hide_card_background`

- [ ] **Step 3: Implement card layout and styling**
  - _Layout:_ Flexbox row with `space-between` justification
  - _Left side:_ Avatar (64px) + person name (vertical stack)
  - _Right side:_ Points balance (large, bold text)
  - _Colors:_ Use CSS variables (`--primary-color`, `--card-background-color`, etc.)
  - _Responsive:_ Maintain left-right layout on mobile (reduce avatar to 48px)

- [ ] **Step 4: Implement data fetching logic**
  - _Source:_ `this.hass.states["sensor.chorebot_points"]`
  - _Extraction:_ `sensor.attributes.people[person_entity]`
  - _Error handling:_ Show friendly message if sensor missing or person not found

- [ ] **Step 5: Implement avatar rendering**
  - _Photo path:_ Check `person_entity.attributes.entity_picture`
  - _Fallback:_ Generate initials from friendly name (first letter of each word, max 2)
  - _Initials styling:_ Circular gradient background (primary → accent color)

- [ ] **Step 6: Add to Rollup build configuration**
  - _Files:_ `rollup.config.mjs`
  - _Entry:_ `src/person-points-card.ts`
  - _Output:_ `dist/chorebot-person-points-card.js`
  - _Plugins:_ Same as other cards (typescript, resolve, commonjs, terser)

- [ ] **Step 7: Register card with Home Assistant**
  - _Registration:_ Add to `window.customCards` array
  - _Metadata:_ Type, name, description, preview flag
  - _Type:_ `custom:chorebot-person-points-card`

- [ ] **Step 8: Implement visual configuration editor**
  - _Method:_ `static getConfigForm()`
  - _Fields:_ person_entity (entity selector limited to person domain), title, show_title, hide_card_background
  - _Validation:_ Entity selector ensures only valid person entities can be selected

- [ ] **Step 9: Add stub config for card picker**
  - _Method:_ `static getStubConfig()`
  - _Defaults:_ Empty person_entity (user must select), title = "Points", show_title = true

- [ ] **Step 10: Test build and integration**
  - _Build:_ Run `npm run build` to generate bundle
  - _Integration:_ Add card to Home Assistant dashboard
  - _Testing:_ Verify avatar rendering, points display, error states

## 6. Usage Scenarios / Edge Cases

### Scenario A: Happy Path (Person with Points)

- **Input:** Card configured with `person_entity: person.kyle`, Kyle has 150 points
- **Output:** Avatar (photo or initials), "Kyle" name, "150 pts" on right side
- **Expected:** Card renders perfectly with all data visible

### Scenario B: Person with No Points Yet

- **Input:** Card configured with `person_entity: person.campbell`, Campbell has 0 points
- **Output:** Avatar, "Campbell" name, "0 pts" on right side
- **Expected:** Card renders normally, zero points displayed without error

### Scenario C: Person Entity Deleted

- **Input:** Card configured with `person_entity: person.removed`, entity no longer exists in HA
- **Output:** Error message: "Person entity not found. Please check your configuration."
- **Expected:** Graceful degradation, no console errors

### Scenario D: ChoreBot Not Set Up

- **Input:** Card added before ChoreBot integration configured
- **Output:** Error message: "ChoreBot Points sensor not found. Make sure the integration is set up."
- **Expected:** Clear guidance for user to set up integration first

### Scenario E: Person Not in Points System

- **Input:** Valid person entity exists, but person not in `sensor.chorebot_points.attributes.people`
- **Output:** Error message: "Person not found in points system. Complete tasks to earn points."
- **Expected:** Helpful message explaining how to get into the system (completing tasks)

### Scenario F: Transparent Background Mode

- **Input:** `hide_card_background: true` in config
- **Output:** Card renders with no background, no padding, no border
- **Expected:** Seamlessly blends with dashboard background

## 7. Security & Performance Considerations

### Security

- **No user input validation needed:** Entity ID selection handled by HA's entity selector
- **Read-only access:** Card only reads from sensor, never writes data
- **No XSS risk:** All text fields are rendered via Lit's HTML template system which auto-escapes

### Performance

- **Lightweight bundle:** Estimated 15-20KB minified (smallest card yet)
- **No polling:** Card updates reactively when sensor state changes
- **No animations:** Static display, no performance impact from animations
- **Minimal DOM:** Simple flexbox layout with ~5 DOM nodes

### Accessibility

- **Semantic HTML:** Use proper heading tags if title shown
- **Alt text:** Include person name as alt text for avatar images
- **Color contrast:** Use HA theme colors which are accessibility-tested
- **Readable font sizes:** Points balance at 24px+ for easy readability

## 8. Configuration Reference

### YAML Configuration Example

```yaml
type: custom:chorebot-person-points-card
person_entity: person.kyle
title: Kyle's Points
show_title: false
hide_card_background: true
```

### Configuration Options

| Option                 | Type    | Default        | Description                                               |
| ---------------------- | ------- | -------------- | --------------------------------------------------------- |
| `person_entity`        | string  | **(required)** | Person entity ID (e.g., `person.kyle`)                    |
| `title`                | string  | `"Points"`     | Card title (only shown if `show_title` is true)           |
| `show_title`           | boolean | `true`         | Whether to display the card title                         |
| `hide_card_background` | boolean | `false`        | Remove card background for seamless dashboard integration |

## 9. Visual Design Mockup

```
┌─────────────────────────────────────────┐
│  Kyle's Points                          │  ← Optional title
├─────────────────────────────────────────┤
│                                         │
│  ┌────┐  Kyle                  150 pts │  ← Avatar, Name, Points
│  │ KH │                                 │
│  └────┘                                 │
│                                         │
└─────────────────────────────────────────┘
```

### Responsive Behavior (Mobile)

Same layout maintained, avatar shrinks from 64px to 48px on screens < 600px wide.

## 10. Testing Checklist

- [ ] Card displays correctly with person photo
- [ ] Card displays correctly with initials (no photo)
- [ ] Points balance updates when tasks completed
- [ ] Error message shown for missing person entity
- [ ] Error message shown for missing sensor
- [ ] Transparent background mode works
- [ ] Title show/hide works
- [ ] Card appears in visual card picker
- [ ] Configuration editor works in UI
- [ ] Bundle size is reasonable (< 25KB)

## 11. Future Enhancements (Out of Scope)

- **Click to view details:** Navigate to full rewards card or transaction history
- **Trend indicator:** Show if points increased/decreased since yesterday
- **Rank display:** Show person's rank among all people (e.g., "1st place")
- **Lifetime points:** Toggle to show lifetime points vs current balance
- **Confetti animation:** Trigger when points reach milestones (100, 500, 1000)
