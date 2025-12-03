# Deprecated Cards

This directory contains cards that are no longer actively used or built, but are kept for reference purposes.

## Deprecated Cards

### `list-card.ts` (Deprecated 2025-12-03)

- **Replaced by:** `grouped-card.ts`
- **Reason:** The grouped card provides a better user experience with tag-based organization. The list card's today-focused flat view was the original implementation.

### `rewards-card.ts` (Deprecated 2025-12-03)

- **Replaced by:** `person-rewards-card.ts`
- **Reason:** The person-rewards card provides better person-specific functionality with inline creation and redemption. The original rewards card required selecting a person first.

## Notes

These files are **not included in the build process** and will not be compiled to the `dist/` directory. They are kept here purely for reference in case we need to review the original implementation or restore functionality.

If you need to restore any of these cards:

1. Move the file from `src/deprecated/` back to `src/`
2. Add the appropriate build configuration to `rollup.config.mjs`
3. Update documentation as needed
