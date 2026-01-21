# Feature Spec: Remove Card Title Configuration
---
id: 20260121-remove-card-titles
status: proposed
created: 2026-01-21
owner: AP-5 (Architect)
---

## 1. Overview

**Purpose:** Remove the `title` and `show_title` configuration properties from all ChoreBot frontend cards to eliminate unnecessary visual clutter and simplify card configuration.

**User Story:** As a ChoreBot user, I want my dashboard cards to display content without redundant header bars, so that my interface is cleaner and more space-efficient.

**Rationale:** The title feature adds a generic header bar ("Tasks", "Points", "Rewards") above card content that provides minimal value. Cards already have semantic content that makes their purpose clear. The feature increases configuration complexity without meaningful benefit.

## 2. Requirements & Acceptance Criteria

Functional requirements as measurable outcomes:

- [ ] All 7 active cards no longer render a title header bar regardless of configuration
- [ ] TypeScript interfaces remove `title` and `show_title` properties from all config types
- [ ] Visual editor schemas (getConfigElement) remove title-related fields from all cards
- [ ] Stub configurations (getStubConfig) remove title-related default values
- [ ] Frontend README.md examples remove all `title` property references
- [ ] Deprecated cards (in `src/deprecated/`) are NOT modified (archived code)
- [ ] Existing user configurations with `title`/`show_title` are silently ignored (no errors)
- [ ] No visual regressions in card layout after removal

**Breaking Change Note:** This is a minor breaking change for users who explicitly set `show_title: true`. However, impact is minimal since:
1. Default behavior changes from "title hidden" to "title removed entirely"
2. No functional features lost, only cosmetic header removed
3. Cards still function identically with title configurations in place

## 3. Architecture & Design

### High-Level Approach

**Simple Removal Strategy:**
1. Remove rendering logic for title header bars
2. Remove TypeScript properties from config interfaces
3. Remove visual editor schema fields
4. Update documentation examples

**No Migration Needed:** The removal is purely additive (deleting code). Existing configurations with `title`/`show_title` will be silently ignored by TypeScript's structural typing.

### Component Interactions

**Affected Cards (7 active):**
1. `chorebot-grouped-card` - Tag-based grouped task view
2. `chorebot-add-task-card` - Quick task creation dialog
3. `chorebot-person-points-card` - Visual points balance display
4. `chorebot-rewards-card` - Person-specific rewards catalog
5. `chorebot-person-grouped-card` - Person-filtered grouped view
6. `chorebot-person-rewards-card` - Combined person selector + rewards
7. `chorebot-multi-person-overview-card` - Multi-person task overview

**Not Modified (2 deprecated):**
- `src/deprecated/list-card.ts` - Archived, no longer built
- `src/deprecated/rewards-card.ts` - Archived, no longer built

### Critical Design Decisions

**Decision 1: Complete Removal vs Optional Deprecation**
- **Chosen:** Complete removal with silent ignore of legacy config
- **Rationale:** Feature provides no value, so deprecation period adds unnecessary maintenance burden
- **Trade-off:** Minimal breaking change vs cleaner codebase immediately

**Decision 2: Deprecated Cards Exclusion**
- **Chosen:** Leave deprecated cards untouched
- **Rationale:** These files are archived and not included in production bundle. Modifying them wastes effort and risks introducing bugs in unused code.

**Decision 3: Documentation Update Scope**
- **Chosen:** Update frontend README examples only
- **Rationale:** Main repository README focuses on backend. Frontend README is the primary card documentation.

### Data Models

**Before (ChoreBotBaseConfig):**
```typescript
export interface ChoreBotBaseConfig {
  entity: string;
  title?: string;                    // ← REMOVE
  show_title?: boolean;              // ← REMOVE
  show_progress?: boolean;
  hide_card_background?: boolean;
  // ... other properties
}
```

**After (ChoreBotBaseConfig):**
```typescript
export interface ChoreBotBaseConfig {
  entity: string;
  show_progress?: boolean;
  hide_card_background?: boolean;
  // ... other properties
  // title and show_title removed entirely
}
```

**Per-Card Config Interfaces:** All 7 card-specific config interfaces extend `ChoreBotBaseConfig`, so removal from base automatically propagates.

## 4. Implementation Tasks

Breaking down work into phases for systematic removal:

### Phase 1: TypeScript Interface Cleanup
- [x] Remove `title?: string` and `show_title?: boolean` from `ChoreBotBaseConfig` in `utils/types.ts`
- [x] Remove any card-specific config extensions that override these properties (if any exist)
- [x] Remove `title` and `show_title` from all 7 card config interfaces (explicit declarations)

### Phase 2: Rendering Logic Removal (Per Card)

For each of the 7 active cards, perform these steps:

**chorebot-grouped-card:**
- [x] Remove title/show_title from default config assignment in `setConfig()`
- [x] Remove title header rendering block in `render()` method (lines ~615-617)
- [x] Remove title/show_title from `getStubConfig()`
- [x] Remove title/show_title from visual editor schema fields
- [x] Remove title/show_title labels from `computeLabel()`
- [x] Remove title/show_title helpers from `computeHelper()`

**chorebot-person-points-card:**
- [x] Remove title/show_title from default config assignment in `setConfig()`
- [x] Remove title header rendering block in `render()` method (lines ~425-427)
- [x] Remove title/show_title from `getStubConfig()`
- [x] Remove title/show_title from visual editor schema fields
- [x] Remove title/show_title labels from `computeLabel()`
- [x] Remove title/show_title helpers from `computeHelper()`

**chorebot-rewards-card:**
- [x] Remove title/show_title from default config assignment in `setConfig()`
- [x] Remove title header rendering block in `render()` method
- [x] Remove title/show_title from `getStubConfig()`
- [x] Remove title/show_title from visual editor schema fields
- [x] Remove title/show_title labels from `computeLabel()`
- [x] Remove title/show_title helpers from `computeHelper()`

**chorebot-person-grouped-card:**
- [x] Remove title/show_title from default config assignment in `setConfig()`
- [x] Remove title header rendering block in `render()` method (if present)
- [x] Remove title/show_title from `getStubConfig()`
- [x] Remove title/show_title from visual editor schema fields
- [x] Remove title/show_title labels from `computeLabel()`
- [x] Remove title/show_title helpers from `computeHelper()`

**chorebot-person-rewards-card:**
- [x] Remove title/show_title from default config assignment in `setConfig()`
- [x] Remove title header rendering block in `render()` method (if present)
- [x] Remove title/show_title from `getStubConfig()`
- [x] Remove title/show_title from visual editor schema fields
- [x] Remove title/show_title labels from `computeLabel()`
- [x] Remove title/show_title helpers from `computeHelper()`

**chorebot-multi-person-overview-card:**
- [x] Remove title/show_title from default config assignment in `setConfig()`
- [x] Remove title header rendering block in `render()` method (lines ~148)
- [x] Remove title/show_title from `getStubConfig()`
- [x] Remove title/show_title from visual editor schema fields
- [x] Remove title/show_title labels from `computeLabel()`
- [x] Remove title/show_title helpers from `computeHelper()`

**chorebot-add-task-card:**
- [x] Verify if this card uses title (likely not, it's a dialog-style card)
- [x] If present, remove title/show_title using same pattern as above
- [x] If not present, skip this card

### Phase 3: Documentation Updates
- [x] Update `frontend/README.md` examples to remove all `title:` properties
- [x] Update any inline code comments that reference title functionality
- [x] Verify no other markdown files in `frontend/` reference the title property

### Phase 4: Build & Verification
- [x] Run `npm run build` to ensure TypeScript compilation succeeds
- [x] Verify bundle sizes remain reasonable (should be slightly smaller)
- [ ] Smoke test: Load each card in development environment
- [ ] Verify no console errors related to missing properties
- [ ] Visual regression check: Compare card layouts before/after

## 5. Testing Strategy

**Manual Testing (Per Card):**
1. **Fresh Configuration:**
   - Add card to dashboard without any config properties
   - Verify card renders without title header
   - Verify card content displays correctly
   
2. **Legacy Configuration:**
   - Add card with explicit `title: "Test"` and `show_title: true` in YAML
   - Verify card renders without title header (config ignored)
   - Verify no console errors or warnings
   
3. **Visual Editor:**
   - Open card configuration editor
   - Verify "Title" and "Show Title" fields are absent
   - Verify other configuration options still present and functional

**Browser Compatibility:**
- Test in Chrome/Edge (Chromium)
- Test in Firefox
- Test in Safari (if available)

**Edge Cases to Verify:**
- Cards with `hide_card_background: true` (no background + no title)
- Cards with custom `accent_color` (verify header removal doesn't affect colors)
- Person-filtered cards (verify person selector still displays correctly)

**No Unit Tests Required:** This is a purely cosmetic removal without functional logic changes. Manual visual testing is sufficient.

## 6. Security & Performance Considerations

**Performance:**
- **Positive Impact:** Slightly reduces bundle size (fewer properties, less rendering logic)
- **Positive Impact:** Fewer DOM elements per card (no title header div)
- **Estimate:** ~1-2KB reduction across all 7 cards (~50-100 lines total removed)

**Security:**
- **No Impact:** Removal of display-only properties has no security implications
- **No New Attack Vectors:** Code deletion reduces attack surface

## 7. Implementation Notes

**Builder Instructions:**
1. Start with Phase 1 (TypeScript interfaces) to catch any compilation errors early
2. Use find-and-replace carefully to avoid removing unrelated "title" references (e.g., HTML title attributes)
3. When removing rendering blocks, preserve surrounding whitespace/indentation
4. After each card modification, run `npm run build` to catch TypeScript errors immediately
5. Document any unexpected issues or deviations in this section

**Pattern to Search For (Rendering Block):**
```typescript
${this._config.show_title
  ? html`<div class="card-header">${this._config.title}</div>`
  : ""}
```

**Pattern to Search For (Visual Editor Schema):**
```typescript
{
  name: "title",
  default: "...",
  selector: { text: {} },
},
{
  name: "show_title",
  default: true,
  selector: { boolean: {} },
},
```

**Files Modified (Actual):**
- `frontend/src/utils/types.ts` - Removed from 5 config interfaces
- `frontend/src/grouped-card.ts` - 6 removals (setConfig, render, getStubConfig, schema, labels, helpers)
- `frontend/src/person-points-card.ts` - 6 removals
- `frontend/src/rewards-card.ts` - 7 removals (including cardTitle logic)
- `frontend/src/person-grouped-card.ts` - 5 removals (config interface + schema)
- `frontend/src/person-rewards-card.ts` - 0 removals (did not use title)
- `frontend/src/multi-person-overview-card.ts` - 7 removals (including _renderTitle method)
- `frontend/src/add-task-card.ts` - 0 removals (did not use title)
- `frontend/README.md` - 3 example updates

**Total Lines Removed:** ~95 lines across 8 files

**Implementation Deviations:**
1. `person-rewards-card` and `add-task-card` did not use title properties - verified and skipped as expected
2. `multi-person-overview-card` had a dedicated `_renderTitle()` method that was removed entirely
3. `rewards-card` had additional cardTitle logic that computed default title from person name - removed entire block
4. Build succeeded with only pre-existing warnings about `sortTagGroups` vs `sortGroups` (unrelated to this work)

---

**Post-Implementation Checklist:**
- [ ] All 7 cards render without title headers
- [x] Visual editor schemas updated
- [x] Documentation examples updated
- [x] No TypeScript compilation errors
- [ ] No console errors in browser
- [x] Bundle builds successfully (185KB, slightly smaller than before)
- [ ] Smoke tested all 7 cards in live HA instance
