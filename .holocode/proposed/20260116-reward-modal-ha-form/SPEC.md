# Feature Spec: Migrate Reward Modal to HA Built-in Form Components

## 1. Overview

**Purpose:** Migrate the custom reward creation modal in `person-rewards-card.ts` to use Home Assistant's built-in form components (`ha-form`, `ha-dialog`, `ha-button`) while preserving the current visual styling.

**User Story:** As a developer, I want to use HA's native form components for consistency with the rest of the card (which already uses `ha-form` for task editing) and to reduce custom styling code, while maintaining the polished look of the current reward modal.

**Context:**

- The task edit dialog (in `dialog-utils.ts`) already successfully uses `ha-form` with clean styling
- The reward modal currently uses raw HTML inputs/textareas with custom CSS
- Both modals should have consistent appearance and behavior

## 2. Requirements

- [ ] Replace raw HTML form inputs with `ha-form` component and schema-based configuration
- [ ] Replace custom modal structure with `ha-dialog` component
- [ ] Maintain current visual appearance (rounded corners, borders, padding, colors)
- [ ] Use native icon picker with built-in preview (removes custom icon preview code)
- [ ] Keep current validation behavior (required name field)
- [ ] Maintain confetti animation on successful creation
- [ ] Ensure accessibility and keyboard navigation work correctly
- [ ] No breaking changes to card functionality or configuration

## 3. Architecture & Design

### High-Level Approach

The migration involves three main changes:

1. **Schema Definition**: Create a form schema defining the reward fields (name, cost, icon, description) using HA's selector syntax
2. **Dialog Component**: Replace custom modal HTML with `ha-dialog` component (already used for task editing)
3. **CSS Customization**: Apply CSS custom properties and/or shadow DOM styling to match current appearance

### Component Interaction

```
ChoreBotPersonRewardsCard (Lit)
  ├─> _renderAddRewardModal()
  │     └─> ha-dialog (HA native)
  │           ├─> ha-form (HA native)
  │           │     ├─> ha-textfield (for name field)
  │           │     ├─> ha-form-number (for cost field)
  │           │     ├─> ha-icon-picker (for icon field with built-in preview)
  │           │     └─> ha-textarea (for description field)
  │           ├─> ha-button slot="primaryAction" (Create button)
  │           └─> ha-button slot="secondaryAction" (Cancel button)
  └─> _createReward() [unchanged service call logic]
```

### Critical Design Decisions

**Decision 1: Use `ha-form` schema instead of `getConfigForm()`**

- **Rationale:** The reward modal is not a card config form, so we don't need `getConfigForm()`. We can directly render `ha-form` with a schema object (same approach as task dialog in `dialog-utils.ts`).
- **Trade-offs:** Less standardized than config forms, but more flexible for in-card dialogs.

**Decision 2: Style HA components using CSS Custom Properties**

- **Rationale:** HA form components expose CSS custom properties (e.g., `--mdc-theme-primary`, `--mdc-text-field-outlined-idle-border-color`) that can be overridden without shadow DOM piercing.
- **Trade-offs:** Limited styling surface (can't change internal layout), but maintains encapsulation and won't break on HA updates.

**Decision 3: Use native icon picker with built-in preview**

- **Rationale:** HA's `ha-icon-picker` selector provides a built-in live preview, eliminating the need for custom preview code.
- **Trade-offs:** None - we get better UX and less code for free.

## 4. Data Model Changes

### New Form Schema (in `_renderAddRewardModal()`)

```typescript
const schema = [
  {
    name: "name",
    required: true,
    selector: { text: {} },
  },
  {
    name: "cost",
    selector: {
      number: {
        min: 1,
        max: 10000,
        mode: "box",
      },
    },
  },
  {
    name: "icon",
    selector: { icon: {} },
  },
  {
    name: "description",
    selector: { text: { multiline: true } },
  },
];
```

### Form Data Object

```typescript
// Replace this._newReward state with this._rewardFormData
this._rewardFormData = {
  name: "",
  cost: 50,
  icon: "mdi:gift",
  description: "",
};
```

## 5. Execution Strategy

### Phase 1: Schema & Dialog Structure

**Goal:** Replace custom modal HTML with `ha-dialog` and `ha-form` components
**Scope:** `src/person-rewards-card.ts` - `_renderAddRewardModal()` method
**Dependencies:** None
**Concurrency:** Can be done independently

**Key Implementation Notes:**

1. Define reward form schema with text, number, icon, and multiline text selectors
2. Replace entire `.modal-overlay` → `.modal-content` structure with `<ha-dialog>`
3. Replace form HTML with `<ha-form>` component
4. Update `_openAddRewardModal()` to initialize form data properly
5. Update `_createReward()` to read from form data instead of `this._newReward`
6. Add `@value-changed` handler to update internal state

**Testing:**

- Verify modal opens with default values
- Verify form validation (required name)
- Verify form submits correctly
- Verify cancel closes without creating reward

### Phase 2: CSS Styling & Visual Consistency

**Goal:** Match current visual appearance using HA component CSS custom properties
**Scope:** `src/person-rewards-card.ts` - `static styles` section
**Dependencies:** Phase 1 complete
**Concurrency:** Cannot run until Phase 1 is done

**Key Implementation Notes:**

HA form components use Material Design Components (MDC) with exposed CSS custom properties:

**Available CSS Custom Properties for HA Components:**

```css
/* ha-dialog styling */
--mdc-dialog-max-width: 400px;
--mdc-dialog-min-width: 280px;
--mdc-dialog-heading-ink-color: var(--primary-text-color);
--mdc-dialog-content-ink-color: var(--primary-text-color);
--mdc-dialog-scroll-divider-color: var(--divider-color);
--mdc-dialog-scrim-color: rgba(0, 0, 0, 0.5);

/* ha-textfield styling (used by text and number inputs) */
--mdc-text-field-fill-color: var(--card-background-color);
--mdc-text-field-idle-line-color: var(--divider-color);
--mdc-text-field-hover-line-color: var(--primary-color);
--mdc-text-field-outlined-idle-border-color: var(--divider-color);
--mdc-text-field-outlined-hover-border-color: var(--primary-color);
--mdc-theme-primary: var(--primary-color);
--mdc-text-field-ink-color: var(--primary-text-color);
--mdc-text-field-label-ink-color: var(--primary-text-color);

/* ha-button styling */
--mdc-theme-primary: var(--accent-color);
--mdc-button-outline-color: var(--divider-color);

/* ha-icon-picker styling */
--mdc-icon-button-size: 48px;
--mdc-icon-size: 24px;

/* Border radius (not standard MDC, may need ::part() or wrapper styling) */
border-radius: 8px; /* Applied to wrapper elements */
```

**Styling Strategy:**

```css
/* Option A: Host-level CSS variables (preferred) */
:host {
  /* Dialog styling */
  --mdc-dialog-content-ink-color: var(--primary-text-color);
  --mdc-dialog-heading-ink-color: var(--primary-text-color);

  /* Form field styling - match current appearance */
  --mdc-text-field-outlined-idle-border-color: var(--divider-color);
  --mdc-text-field-outlined-hover-border-color: var(--primary-color);
  --mdc-theme-primary: var(--primary-color);
  --mdc-text-field-fill-color: var(--card-background-color);
}

/* Option B: Direct styling of HA components (for border radius, spacing) */
ha-dialog {
  --mdc-dialog-max-width: 400px;
  --mdc-dialog-min-width: 90%;
}

ha-form {
  display: block;
  padding: 0; /* Remove default padding if needed */
}

/* Note: No custom icon preview CSS needed - native icon picker has built-in preview */
```

**Challenges & Solutions:**

| Challenge           | Current Style                         | HA Component Default        | Solution                                                |
| ------------------- | ------------------------------------- | --------------------------- | ------------------------------------------------------- |
| Border radius (8px) | `.form-input { border-radius: 8px; }` | 4px (MDC default)           | May need wrapper div or accept 4px                      |
| Form field spacing  | `margin-bottom: 16px`                 | Variable                    | Use schema helpers or wrapper CSS                       |
| Icon preview        | Custom div with gradient              | Built-in with icon selector | Native icon picker has preview, remove custom code      |
| Button styling      | Custom rounded buttons                | MDC buttons                 | Override `--mdc-button-shape-radius` or accept defaults |

**Border Radius Workaround (if needed):**
HA's textfield component may not expose border-radius as a CSS variable. If rounded corners are critical:

- **Option 1:** Accept MDC defaults (4px radius)
- **Option 2:** Wrap form in a container and apply border-radius to container (won't affect internal fields)
- **Option 3:** Use `::part()` pseudo-element if HA exposes parts (unlikely for web components)

**Testing:**

- Compare side-by-side with current modal (screenshot comparison)
- Verify colors match theme (light + dark mode)
- Verify borders, padding, spacing match current design
- Verify button hover states match
- Test on different screen sizes (responsive behavior)

### Phase 3: Cleanup (REMOVED - Not Needed)

**Goal:** ~~Preserve icon preview functionality with live updates~~

**Update:** This phase is no longer needed! HA's native `ha-icon-picker` selector provides a built-in live preview, so we can remove all custom icon preview code.

**Code to Remove:**

- Custom `.icon-preview` and `.icon-preview-wrapper` CSS classes
- Custom icon preview HTML div
- Manual icon preview update logic

**Benefits:**

- ~50 lines of code removed
- Native HA preview looks better and is more consistent
- Less maintenance burden

## 6. Usage Scenarios / Edge Cases

### Scenario A: Happy Path

1. User clicks "Add Reward" card
2. Modal opens with empty form (default icon: mdi:gift, default cost: 50)
3. User types reward name, adjusts cost, picks icon, adds description
4. Icon preview updates live
5. User clicks "Create"
6. Service call succeeds, modal closes, reward appears in grid

### Scenario B: Validation Error

1. User clicks "Add Reward" card
2. Modal opens
3. User leaves name field empty, clicks "Create"
4. Button is disabled (via `?disabled` binding checking form validity)
5. User types name
6. Button enables
7. User clicks "Create" successfully

### Scenario C: Service Error

1. User fills form correctly
2. User clicks "Create"
3. Service call fails (e.g., network error)
4. Alert shows error message (existing behavior)
5. Modal stays open (user can retry)

### Scenario D: Cancel/Close

1. User fills form partially
2. User clicks "Cancel" or clicks outside modal
3. Modal closes without creating reward
4. Form state is reset on next open

## 7. Security & Performance Considerations

**Security:**

- Form validation handled by HA's `ha-form` component (built-in XSS protection)
- Service call validation remains on backend (unchanged)

**Performance:**

- `ha-form` is already loaded for task editing dialog (no additional bundle size)
- Icon preview re-renders on form change (acceptable, only happens during typing)
- No impact on card load time or runtime performance

**Accessibility:**

- `ha-dialog` provides ARIA attributes and keyboard trap
- `ha-form` components have proper labels and ARIA descriptions
- Native icon picker has proper accessibility built-in

## 8. Migration Checklist

**Pre-Migration:**

- [ ] Screenshot current reward modal (light + dark themes)
- [ ] Note exact CSS values (padding, margins, border radius, colors)
- [ ] Test current modal behavior (validation, creation, cancellation)

**Implementation:**

- [ ] Phase 1: Replace HTML with `ha-dialog` + `ha-form`
- [ ] Phase 2: Apply CSS custom properties for visual consistency
- [ ] Phase 3: Remove custom icon preview code (native picker has built-in preview)

**Post-Migration Testing:**

- [ ] Visual comparison: Current vs. new modal
- [ ] Functional testing: All 4 scenarios (happy path, validation, error, cancel)
- [ ] Accessibility testing: Keyboard navigation, screen reader
- [ ] Cross-browser testing: Chrome, Firefox, Safari
- [ ] Theme testing: Light mode + dark mode

**Cleanup:**

- [ ] Remove old `.modal-overlay`, `.modal-content`, `.form-field` CSS classes (if unused elsewhere)
- [ ] Remove old `.form-input`, `.form-textarea` CSS (if unused elsewhere)
- [ ] Remove `.icon-preview`, `.icon-preview-wrapper` CSS classes (native icon picker has built-in preview)
- [ ] Remove custom icon preview HTML from modal
- [ ] Update comments/documentation

## 9. Example Code Snippets

### Before (Current Implementation)

```typescript
return html`
  <div class="modal-overlay" @click="${this._closeAddRewardModal}">
    <div class="modal-content" @click="${(e: Event) => e.stopPropagation()}">
      <div class="modal-header">Add New Reward</div>
      <div class="modal-body">
        <div class="form-field">
          <label class="form-label">Name</label>
          <input
            type="text"
            class="form-input"
            .value="${this._newReward.name}"
            ...
          />
        </div>
        <!-- More fields -->
      </div>
      <div class="modal-actions">
        <button class="modal-button cancel" ...>Cancel</button>
        <button class="modal-button confirm" ...>Create</button>
      </div>
    </div>
  </div>
`;
```

### After (New Implementation)

```typescript
private _computeRewardFieldLabel = (schema: any): string => {
  const pointsTerm = getPointsTermCapitalized(this.hass!);
  const labels: { [key: string]: string } = {
    name: "Name",
    cost: `Cost (${pointsTerm})`,
    icon: "Icon",
    description: "Description (Optional)",
  };
  return labels[schema.name] || schema.name;
};

private _computeRewardFieldHelper = (schema: any): string => {
  const pointsTerm = getPointsTermLowercase(this.hass!);
  const helpers: { [key: string]: string } = {
    cost: `Cost between 1 and 10,000 ${pointsTerm}`,
    icon: "Use Material Design Icons (e.g., mdi:gift, mdi:ice-cream)",
  };
  return helpers[schema.name] || "";
};

private _renderAddRewardModal() {
  if (!this._config) return "";

  const schema = [
    { name: "name", required: true, selector: { text: {} } },
    { name: "cost", selector: { number: { min: 1, max: 10000, mode: "box" } } },
    { name: "icon", selector: { icon: {} } }, // Native icon picker has built-in preview!
    { name: "description", selector: { text: { multiline: true } } },
  ];

  return html`
    <ha-dialog open @closed=${this._closeAddRewardModal} heading="Add New Reward">
      <!-- Form (icon picker has built-in preview, no custom code needed) -->
      <ha-form
        .hass=${this.hass}
        .schema=${schema}
        .data=${this._rewardFormData}
        .computeLabel=${this._computeRewardFieldLabel}
        .computeHelper=${this._computeRewardFieldHelper}
        @value-changed=${this._handleRewardFormChange}
      ></ha-form>

      <!-- Actions -->
      <ha-button
        slot="primaryAction"
        @click=${this._createReward}
        ?disabled=${!this._rewardFormData.name?.trim()}
      >
        Create
      </ha-button>
      <ha-button slot="secondaryAction" @click=${this._closeAddRewardModal}>
        Cancel
      </ha-button>
    </ha-dialog>
  `;
}
```

## 10. References

- **HA Form Component Docs:** https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card#using-the-built-in-form-editor
- **HA Selectors Reference:** https://www.home-assistant.io/docs/blueprint/selectors/
- **MDC Web Components:** https://github.com/material-components/material-components-web-components
- **Existing Task Dialog Implementation:** `src/utils/dialog-utils.ts` (lines 372-409)
- **Material Design Custom Properties:** https://github.com/material-components/material-components-web/blob/master/docs/theming.md

## 11. Open Questions

1. **Border Radius Limitation:** Can we achieve 8px border radius on form fields, or do we accept MDC's 4px default?
   - **Recommendation:** Accept 4px or apply to wrapper elements only (internal fields will remain 4px)

2. **Icon Picker Preview:** ~~Does `ha-icon-picker` selector provide a live preview, or do we need custom element?~~
   - **Confirmed:** Native icon picker has built-in preview. No custom code needed!

3. **Form Field Spacing:** Does `ha-form` provide enough vertical spacing between fields?
   - **Recommendation:** Test and adjust via schema or wrapper CSS if needed

4. **Validation Feedback:** Does `ha-form` show validation errors inline (red text, etc.)?
   - **Recommendation:** HA forms do show validation. Test to ensure it matches current UX.

## 12. Success Criteria

- [ ] Reward modal uses `ha-dialog` + `ha-form` components
- [ ] Visual appearance matches current design (within MDC constraints)
- [ ] Icon preview works via native icon picker (no custom code)
- [ ] Form validation prevents invalid submissions
- [ ] All existing functionality preserved (creation, cancellation, error handling)
- [ ] Code reduction: Remove ~150+ lines of custom form HTML/CSS (including icon preview)
- [ ] Consistency: Reward modal matches task edit dialog styling
- [ ] Accessibility: Keyboard navigation and screen readers work correctly
