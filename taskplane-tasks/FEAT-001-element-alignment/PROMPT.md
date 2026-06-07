# Task: FEAT-001 — Add element alignment tools

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
Add alignment tools for selected elements: align left, center, right, top, middle, bottom, and distribute evenly. These are essential for creating structured diagrams and organized layouts.

## Dependencies
- **None**

## Context to Read First
- `src/store/appStore.ts` (understand element operations)
- `src/store/types.ts` (understand element types and bounds)
- `src/components/Toolbar.tsx` (understand toolbar layout)
- `src/components/canvas/useSelectionEngine.ts` (understand selection)

## File Scope
- `src/utils/alignmentUtils.ts` (new)
- `src/utils/alignmentUtils.test.ts` (new)
- `src/components/toolbar/AlignmentTools.tsx` (new)
- `src/components/Toolbar.tsx` (add alignment section)

## Steps
### Step 0: Design alignment API
- [ ] Define alignment types: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
- [ ] Define distribution types: 'horizontal' | 'vertical'
- [ ] Design function signatures

### Step 1: Implement alignment utilities
- [ ] Create `alignmentUtils.ts`
- [ ] Implement `alignElements(elements, alignment)` — returns move deltas
- [ ] Implement `distributeElements(elements, direction)` — returns move deltas
- [ ] All functions should be pure and testable

### Step 2: Write tests
- [ ] Create `alignmentUtils.test.ts`
- [ ] Test each alignment type with 2+ elements
- [ ] Test distribution with 3+ elements
- [ ] Test edge cases (single element, overlapping elements)

### Step 3: Create UI
- [ ] Create `AlignmentTools.tsx` component
- [ ] Add alignment buttons with icons
- [ ] Integrate into Toolbar (show only when 2+ elements selected)
- [ ] Add keyboard shortcuts (e.g., Ctrl+Shift+L for align left)

### Step 4: Wire up to store
- [ ] Add `alignSelected(alignment)` action to appStore
- [ ] Add `distributeSelected(direction)` action to appStore
- [ ] Create undo action for alignment operations

### Step 5: Verify
- [ ] Run `npx vitest run src/utils/alignmentUtils.test.ts` — all pass
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build
- [ ] Test alignment with various element types

## Completion Criteria
- [ ] All 6 alignment options work
- [ ] Distribution works for 3+ elements
- [ ] Undo/redo works for alignment
- [ ] At least 12 new tests
- [ ] Keyboard shortcuts work

## Git Commit Convention
- **Implementation:** `feat(FEAT-001): add element alignment and distribution tools`
- **Checkpoints:** `checkpoint: FEAT-001 description`

## Do NOT
- Change existing element types
- Modify the selection system
- Break existing keyboard shortcuts

---

## Amendments (Added During Execution)
