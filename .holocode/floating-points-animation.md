# Feature Spec: Floating Points Animation on Task Completion

## 1. Overview

**Purpose:** Provide immediate visual feedback when a user completes a task that awards points by displaying a floating "+X" indicator that emerges from the completion checkbox, scales up, and fades away.

**User Story:** As a user, when I complete a task that awards points, I want to see the exact number of points I just earned displayed near the checkbox so that I get immediate positive reinforcement and understand the value of my completed task.

## 2. Requirements

- [ ] Display floating points text when a task with points is marked complete
- [ ] Text must show total points awarded as "+X" (e.g., "+10" for base only, "+60" for base + bonus)
- [ ] No units/terminology displayed (just the number)
- [ ] Animation should originate from the completion checkbox location
- [ ] Text should scale up (grow) and fade out over approximately 2 seconds
- [ ] Work on both desktop and mobile devices
- [ ] Respect `prefers-reduced-motion` system setting
- [ ] Don't show animation when uncompleting a task (only on completion)
- [ ] Work alongside existing confetti animation without interference
- [ ] Apply to both `chorebot-grouped-card` and `chorebot-list-card` (if list card exists with completion)

## 3. Architecture & Design

### High-Level Approach

This feature enhances the existing task completion flow by adding a second visual feedback mechanism (floating text) that runs in parallel with the confetti animation. We'll create a new utility function in `confetti-utils.ts` that spawns a DOM element at the click coordinates, applies CSS animations, and removes itself after completion.

### Component Interaction

```
User clicks checkbox
    ↓
_handleCompletionClick() captures click position
    ↓
_toggleTask() calls todo.update_item service
    ↓
[EXISTING] playCompletionBurst() with confetti
    ↓
[NEW] playPointsFloatAnimation() with total points value
    ↓
Both animations run in parallel
    ↓
DOM cleanup after animations complete
```

### Critical Design Decisions

**Decision:** Use DOM manipulation (create/append element) instead of Lit/reactive state

- **Rationale:** Animation is transient and doesn't need to be tracked in component state. Direct DOM manipulation is simpler and more performant for short-lived UI elements.
- **Trade-offs:** Less "Lit-like" but avoids unnecessary re-renders and state management.

**Decision:** Calculate total points value in the card component, not in the utility function

- **Rationale:** Points calculation requires access to task data, templates, and entity attributes which are already available in the card component. The utility function stays generic and reusable.
- **Trade-offs:** Slightly more logic in the card, but maintains separation of concerns.

**Decision:** Display total points only (base + bonus summed), no units/icons

- **Rationale:** Simpler, cleaner visual. User already knows these are points from context. Reduces clutter during the fast animation.
- **Trade-offs:** Less explicit than showing "points" or icon, but brevity is better for quick feedback.

**Decision:** Position text above and slightly offset from checkbox

- **Rationale:** Checkbox is at the right side of the task row, so we need space for text to expand without overlapping other UI. Above and offset provides clear visibility.
- **Trade-offs:** May clip near top of viewport on mobile, but this is rare and acceptable.

## 4. Data Model Changes

No persistent data model changes required. This is purely a UI enhancement using existing task data.

## 5. Execution Strategy

### Option B: Step-by-Step (Simple Enhancement)

- [ ] **Step 1: Create floating points animation utility**
  - _Files:_ `src/utils/confetti-utils.ts`
  - Add `playPointsAnimation(origin: {x, y}, totalPoints: number)` function
  - Create DOM element with absolute positioning
  - Apply CSS classes for animation (scale + fade)
  - Display as "+{totalPoints}" (e.g., "+10", "+60")
  - Auto-remove element after animation completes (~2s)
  - Respect `prefers-reduced-motion` (skip animation if enabled)

- [ ] **Step 2: Add CSS animation keyframes**
  - _Files:_ `src/grouped-card.ts` (styles section)
  - Define `@keyframes floatPoints` for scale + fade effect
  - Scale from 0.5 → 1.5 over 2 seconds
  - Opacity from 1 → 0 over 2 seconds
  - Use `ease-out` easing for natural feel
  - Add `.floating-points` class with styling:
    - Bold text
    - Large font size (24-32px)
    - White color with dark shadow for visibility on all backgrounds
    - Absolute positioning
    - Z-index high enough to appear above cards

- [ ] **Step 3: Integrate into grouped card completion logic**
  - _Files:_ `src/grouped-card.ts`
  - In `_toggleTask()` method (around line 673), check if task has points and is being completed
  - Calculate total points: base `task.points_value` + bonus (if applicable)
  - For bonus calculation: Check if task has `parent_uid`, fetch template, check if `(template.streak_current + 1) % template.streak_bonus_interval === 0`
  - Call `playPointsAnimation()` with origin and total points value
  - Ensure animation only plays on completion (not uncomplete)

- [ ] **Step 4: Extract points calculation to helper method**
  - _Files:_ `src/grouped-card.ts`
  - Create `_calculateTotalPointsAwarded(task: Task): number | null`
  - Return null if `!task.points_value` (no animation)
  - Calculate: `totalPoints = task.points_value`
  - If `task.parent_uid` exists:
    - Fetch template from `entity.attributes.chorebot_templates`
    - If template has `streak_bonus_points` and `streak_bonus_interval`:
      - Check if `(template.streak_current + 1) % template.streak_bonus_interval === 0`
      - If true: `totalPoints += template.streak_bonus_points`
  - Return `totalPoints`

- [ ] **Step 5: Extend to list card (if applicable)**
  - _Files:_ Check if `src/list-card.ts` or similar exists with completion logic
  - If list card has completion logic, apply same integration as Step 3-4
  - If list card doesn't exist or doesn't have inline completion, skip this step

- [ ] **Step 6: Test animations**
  - Test on desktop (Chrome, Firefox)
  - Test on mobile (touch events, viewport clipping)
  - Test with base points only ("+10")
  - Test with base + bonus points ("+60" when 10 base + 50 bonus)
  - Test with `prefers-reduced-motion` enabled (should skip animation)
  - Test that confetti and points animation don't interfere
  - Test fast consecutive completions (multiple animations at once)

## 6. Usage Scenarios / Edge Cases

**Scenario A: Regular task completion (no bonus)**

- User completes task worth 10 points
- Confetti bursts from checkbox
- "+10" floats up, scales to 1.5x, fades out
- Task marked complete in backend

**Scenario B: Recurring task completion with bonus**

- User completes task on 7-day streak milestone (10 base + 50 bonus)
- Confetti bursts from checkbox
- "+60" floats up and fades out
- Task marked complete, streak incremented, bonus awarded

**Scenario C: Uncompleting a task**

- User uncompletes a previously completed task
- No confetti, no points animation (only plays on completion)
- Task marked incomplete, points deducted (backend only)

**Scenario D: Task with no points**

- User completes task with `points_value = 0` or undefined
- Confetti bursts from checkbox
- No points animation (nothing to display)

**Scenario E: Reduced motion enabled**

- User has `prefers-reduced-motion: reduce` in system settings
- Confetti respects this (already implemented)
- Points animation skips scale/fade, shows static text briefly OR skips entirely

**Scenario F: Mobile viewport near top**

- User completes task near top of screen
- Points animation may clip against top edge (acceptable)
- Text still visible and readable

**Scenario G: Multiple rapid completions**

- User completes 3 tasks in quick succession
- Three "+X" animations play simultaneously at different positions
- No interference between animations (each is independent DOM element)

## 7. Security & Performance Considerations

**Performance:**

- DOM element creation/removal is lightweight (one element per completion)
- CSS animations use `transform` and `opacity` (GPU-accelerated)
- Automatic cleanup after 2 seconds prevents memory leaks
- No impact on component state or re-renders
- Multiple simultaneous animations are performant (browser handles compositing)

**Accessibility:**

- `prefers-reduced-motion` support ensures accessible experience for users with motion sensitivity
- Points animation is purely cosmetic (backend already handles points calculation)
- Screen readers will announce task completion via standard HA todo service (no additional ARIA needed)

**UX Considerations:**

- Animation duration (2s) is short enough to feel snappy but long enough to be readable
- Text positioning above checkbox avoids overlap with task content
- Large font size (24-32px) ensures readability during motion
- White text with dark shadow works on both light and dark themes
- Simple "+X" format is universally understandable without labels

---

## Implementation Notes

**Key Files to Modify:**

1. `src/utils/confetti-utils.ts` - New `playPointsAnimation()` function
2. `src/grouped-card.ts` - Integration in `_toggleTask()`, new `_calculateTotalPointsAwarded()` helper
3. `src/grouped-card.ts` - CSS keyframes in styles section
4. `src/list-card.ts` - (If exists) Same integration as grouped card

**Points Calculation Logic:**

```typescript
// In _calculateTotalPointsAwarded(task: Task): number | null
if (!task.points_value) return null;

let totalPoints = task.points_value;

// Check for streak bonus
if (task.parent_uid) {
  const entity = this.hass.states[this._config.entity];
  const templates = entity?.attributes.chorebot_templates || [];
  const template = templates.find((t: any) => t.uid === task.parent_uid);

  if (template?.streak_bonus_points && template?.streak_bonus_interval) {
    const nextStreak = template.streak_current + 1;
    if (nextStreak % template.streak_bonus_interval === 0) {
      totalPoints += template.streak_bonus_points;
    }
  }
}

return totalPoints;
```

**CSS Animation Example:**

```css
@keyframes floatPoints {
  0% {
    transform: scale(0.5) translateY(0);
    opacity: 1;
  }
  50% {
    transform: scale(1.5) translateY(-30px);
    opacity: 1;
  }
  100% {
    transform: scale(1.5) translateY(-60px);
    opacity: 0;
  }
}

.floating-points {
  position: absolute;
  font-size: 28px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  z-index: 9999;
  animation: floatPoints 2s ease-out forwards;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .floating-points {
    animation: none;
    opacity: 0;
  }
}
```

**Testing Checklist:**

- [ ] Completes task with base points only (shows "+10")
- [ ] Completes task with base + bonus points (shows "+60")
- [ ] Uncompletes task (no animation)
- [ ] Task with zero points (no animation)
- [ ] Mobile touch interaction
- [ ] Reduced motion preference
- [ ] Light and dark themes
- [ ] Fast consecutive completions (multiple animations at once)
- [ ] Text visibility near viewport edges
- [ ] Works alongside confetti without interference
