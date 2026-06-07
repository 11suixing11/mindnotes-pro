# Task: PERF-002 — Optimize canvas redraw performance

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
The canvas renderer redraws the entire scene on every frame, even when only a small part changes. Implement dirty region tracking and selective redraws to improve performance, especially with many elements.

## Dependencies
- **None**

## Context to Read First
- `src/components/canvas/useCanvasRenderer.ts` (understand current redraw logic)
- `src/canvas/canvasDrawing.ts` (understand drawing functions)
- `src/canvas/canvasUtils.ts` (understand visibility checks)

## File Scope
- `src/components/canvas/useCanvasRenderer.ts` (optimize)

## Steps
### Step 0: Profile current performance
- [ ] Add performance.now() timing to redraw function
- [ ] Test with 100+ elements to identify bottlenecks
- [ ] Document current frame times

### Step 1: Implement viewport culling
- [ ] Enhance `isVisibleInView()` to be more aggressive
- [ ] Skip elements completely outside viewport
- [ ] Add margin for smooth scrolling

### Step 2: Optimize element caching
- [ ] Improve bounds cache invalidation (don't clear entire cache on element change)
- [ ] Cache rendered element bitmaps for complex elements
- [ ] Implement LRU cache for element renderings

### Step 3: Batch DOM reads/writes
- [ ] Collect all state reads at start of redraw
- [ ] Batch all canvas operations
- [ ] Avoid state reads during drawing

### Step 4: Verify
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build
- [ ] Test with 500+ elements — smooth panning/zooming
- [ ] Profile again — measure improvement

## Completion Criteria
- [ ] 50%+ faster redraws with 100+ elements
- [ ] Smooth panning at 60fps with 500 elements
- [ ] No visual regressions
- [ ] All tests pass

## Git Commit Convention
- **Implementation:** `perf(PERF-002): optimize canvas redraw with viewport culling`
- **Checkpoints:** `checkpoint: PERF-002 description`

## Do NOT
- Change the drawing API
- Modify element data structures
- Break the renderer hook interface

---

## Amendments (Added During Execution)
