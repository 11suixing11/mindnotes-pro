# Task: PERF-003 — Optimize pointer engine hit testing

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
The pointer engine's `hitTest()` and `hitHandle()` functions iterate through all elements on every pointer event. With many elements, this causes jank during mouse move. Optimize with spatial indexing.

## Dependencies
- **None**

## Context to Read First
- `src/components/canvas/usePointerEngine.ts` (focus on hitTest and hitHandle functions)
- `src/canvas/canvasUtils.ts` (understand elementBounds)
- `src/store/types.ts` (understand element types)

## File Scope
- `src/utils/spatialIndex.ts` (new)
- `src/utils/spatialIndex.test.ts` (new)
- `src/components/canvas/usePointerEngine.ts` (integrate spatial index)

## Steps
### Step 0: Profile current performance
- [ ] Add timing to hitTest function
- [ ] Test with 100, 500, 1000 elements
- [ ] Document current hit test times

### Step 1: Implement spatial index
- [ ] Create `spatialIndex.ts`
- [ ] Implement simple grid-based spatial index
- [ ] Support: insert, remove, update, query(point), query(rect)
- [ ] Keep index in sync with element changes

### Step 2: Write tests
- [ ] Create `spatialIndex.test.ts`
- [ ] Test insert and query
- [ ] Test remove and query
- [ ] Test update (move element)
- [ ] Test query performance with many elements

### Step 3: Integrate with pointer engine
- [ ] Create spatial index instance in usePointerEngine
- [ ] Update index when elements change
- [ ] Use index for hitTest queries
- [ ] Keep hitHandle as-is (only checks selected elements)

### Step 4: Verify
- [ ] Run `npx vitest run src/utils/spatialIndex.test.ts` — all pass
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build
- [ ] Test with 1000+ elements — smooth interaction

## Completion Criteria
- [ ] Hit testing is O(log n) instead of O(n)
- [ ] 10x faster hit tests with 500+ elements
- [ ] No visual regressions
- [ ] All tests pass
- [ ] Spatial index stays in sync with elements

## Git Commit Convention
- **Implementation:** `perf(PERF-003): add spatial indexing for faster hit testing`
- **Checkpoints:** `checkpoint: PERF-003 description`

## Do NOT
- Change hit test behavior (same results)
- Modify element data structures
- Break multi-element selection

---

## Amendments (Added During Execution)
