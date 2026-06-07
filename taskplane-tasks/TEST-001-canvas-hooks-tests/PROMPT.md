# Task: TEST-001 — Canvas engine hooks unit tests

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
Add unit tests for the three canvas engine hooks that currently have zero test coverage: `usePointerEngine`, `useSelectionEngine`, and `useCanvasRenderer`. These hooks contain critical interaction logic (pointer events, snap detection, resize handles, selection) that must be verified.

## Dependencies
- **None**

## Context to Read First
- `src/components/canvas/usePointerEngine.ts`
- `src/components/canvas/useSelectionEngine.ts`
- `src/components/canvas/useCanvasRenderer.ts`
- `src/components/canvas/useKeyboardBindings.test.ts` (existing test pattern reference)
- `src/components/canvas/useTextEditor.test.ts` (existing test pattern reference)

## File Scope
- `src/components/canvas/usePointerEngine.test.ts` (new)
- `src/components/canvas/useSelectionEngine.test.ts` (new)
- `src/components/canvas/useCanvasRenderer.test.ts` (new)

## Steps
### Step 0: Analyze existing test patterns
- [ ] Read useKeyboardBindings.test.ts and useTextEditor.test.ts to understand mock patterns
- [ ] Identify what needs to be mocked (canvas context, DOM events, store state)

### Step 1: Write useSelectionEngine tests
- [ ] Create `useSelectionEngine.test.ts`
- [ ] Test findSnaps returns correct snap lines when elements are aligned
- [ ] Test findSnaps returns empty when no elements nearby
- [ ] Test snap threshold behavior

### Step 2: Write usePointerEngine tests
- [ ] Create `usePointerEngine.test.ts`
- [ ] Test hitHandle detects resize handles on selected elements
- [ ] Test hitHandle returns null when no selection
- [ ] Test getCursor returns correct cursor for each tool type
- [ ] Test copySelectedToSystemClipboard

### Step 3: Write useCanvasRenderer tests
- [ ] Create `useCanvasRenderer.test.ts`
- [ ] Test scheduleRedraw triggers redraw
- [ ] Test canvasSize tracks container size
- [ ] Test cachedBounds computation

### Step 4: Verify
- [ ] Run `npx vitest run src/components/canvas/` and confirm all new tests pass
- [ ] Run `npx vitest run` to confirm no regressions

## Completion Criteria
- [ ] All three new test files exist and pass
- [ ] At least 15 new test cases total
- [ ] No existing tests broken
- [ ] Tests follow the same patterns as existing test files

## Git Commit Convention
- **Implementation:** `test(TEST-001): add canvas engine hooks unit tests`
- **Checkpoints:** `checkpoint: TEST-001 description`

## Do NOT
- Modify any source files (only add test files)
- Use canvas npm package (project uses jsdom without canvas support, mock accordingly)
- Test implementation details; test behavior and return values

---

## Amendments (Added During Execution)
