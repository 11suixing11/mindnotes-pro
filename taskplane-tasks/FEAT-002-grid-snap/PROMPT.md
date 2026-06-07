# Task: FEAT-002 — Add grid snapping

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
Add optional grid snapping to help users align elements precisely. When enabled, elements snap to a configurable grid (default 20px) during move and resize operations.

## Dependencies
- **None** (but complements FEAT-001 alignment tools)

## Context to Read First
- `src/components/canvas/usePointerEngine.ts` (understand move/resize logic)
- `src/components/canvas/useSelectionEngine.ts` (understand snap system)
- `src/store/useViewStore.ts` (understand view state)
- `src/components/Toolbar.tsx` (add grid toggle)

## File Scope
- `src/utils/gridUtils.ts` (new)
- `src/utils/gridUtils.test.ts` (new)
- `src/components/canvas/usePointerEngine.ts` (integrate grid snap)
- `src/store/useViewStore.ts` (add grid state)
- `src/components/Toolbar.tsx` (add grid toggle button)

## Steps
### Step 0: Design grid system
- [ ] Define grid configuration: `{ enabled: boolean, size: number, showGrid: boolean }`
- [ ] Design snap function: `snapToGrid(value, gridSize)` → snapped value
- [ ] Decide where to store grid state (useViewStore)

### Step 1: Implement grid utilities
- [ ] Create `gridUtils.ts`
- [ ] Implement `snapToGrid(value, gridSize)` — snaps to nearest grid point
- [ ] Implement `snapBounds(bounds, gridSize)` — snaps element bounds
- [ ] Implement `getGridLines(viewBox, canvasSize, gridSize)` — for rendering

### Step 2: Write tests
- [ ] Create `gridUtils.test.ts`
- [ ] Test snapToGrid with various grid sizes
- [ ] Test snapBounds with different element positions
- [ ] Test edge cases (negative coordinates, very small grid)

### Step 3: Integrate with pointer engine
- [ ] Add grid snap to move operations in usePointerEngine
- [ ] Add grid snap to resize operations
- [ ] Make snap optional (hold Alt to disable temporarily)

### Step 4: Add UI controls
- [ ] Add grid state to useViewStore (gridEnabled, gridSize, showGrid)
- [ ] Add grid toggle button to Toolbar
- [ ] Add grid size selector (10px, 20px, 40px)
- [ ] Optional: render grid lines on canvas

### Step 5: Verify
- [ ] Run `npx vitest run src/utils/gridUtils.test.ts` — all pass
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build
- [ ] Test grid snap with all element types

## Completion Criteria
- [ ] Grid snap works for move and resize
- [ ] Grid can be toggled on/off
- [ ] Grid size is configurable
- [ ] Alt key temporarily disables snap
- [ ] At least 8 new tests

## Git Commit Convention
- **Implementation:** `feat(FEAT-002): add configurable grid snapping`
- **Checkpoints:** `checkpoint: FEAT-002 description`

## Do NOT
- Change existing snap behavior (edge snapping)
- Modify element data structures
- Break existing move/resize functionality

---

## Amendments (Added During Execution)
