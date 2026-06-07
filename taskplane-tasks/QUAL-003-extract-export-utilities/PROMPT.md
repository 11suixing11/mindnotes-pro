# Task: QUAL-003 — Extract export utilities from ExportMenu

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
The `ExportMenu.tsx` component contains ~200 lines of export logic (PNG, JPG, PDF, SVG, Word, JSON) mixed with UI code. Extract export utilities into a dedicated module to improve testability and separation of concerns.

## Dependencies
- **None**

## Context to Read First
- `src/components/ExportMenu.tsx` (understand all export functions)
- `src/store/appStore.ts` (understand state access patterns)

## File Scope
- `src/utils/exportUtils.ts` (new)
- `src/utils/exportUtils.test.ts` (new)
- `src/components/ExportMenu.tsx` (simplify)

## Steps
### Step 0: Analyze export functions
- [ ] List all export functions in ExportMenu.tsx
- [ ] Identify shared helpers (download, ts, getCanvas, withBg, escapeXml, buildSVG)
- [ ] Map dependencies (stores, DOM APIs)

### Step 1: Create export utilities module
- [ ] Create `src/utils/` directory
- [ ] Create `exportUtils.ts` with all export functions
- [ ] Export: `exportPNG`, `exportJPG`, `exportPDF`, `exportSVG`, `exportWord`, `exportJSON`
- [ ] Export helpers: `download`, `timestamp`, `buildSVG`

### Step 2: Write tests for export utilities
- [ ] Create `exportUtils.test.ts`
- [ ] Test `timestamp()` returns valid format
- [ ] Test `escapeXml()` handles special characters
- [ ] Test `buildSVG()` generates valid SVG for each element type
- [ ] Mock canvas/toBlob for image export tests

### Step 3: Refactor ExportMenu
- [ ] Import utilities from `exportUtils.ts`
- [ ] Keep only UI logic in ExportMenu component
- [ ] Add loading state for async exports (PDF)

### Step 4: Verify
- [ ] Run `npx vitest run src/utils/exportUtils.test.ts` — all pass
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build
- [ ] Test all export formats manually

## Completion Criteria
- [ ] ExportMenu.tsx is under 100 lines
- [ ] All export logic in `exportUtils.ts`
- [ ] At least 10 new tests for export utilities
- [ ] All export formats still work

## Git Commit Convention
- **Implementation:** `refactor(QUAL-003): extract export utilities from ExportMenu`
- **Checkpoints:** `checkpoint: QUAL-003 description`

## Do NOT
- Change export functionality
- Add new export formats
- Modify the export menu UI

---

## Amendments (Added During Execution)
