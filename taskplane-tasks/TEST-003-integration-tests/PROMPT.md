# Task: TEST-003 — Add integration tests for user workflows

**Created:** 2026-06-07
**Size:** L

## Review Level: 1

## Mission
The current test suite has unit tests but lacks integration tests that verify complete user workflows. Add integration tests for critical paths: document management, drawing operations, undo/redo, and export.

## Dependencies
- **None**

## Context to Read First
- `src/store/appStore.test.ts` (existing unit test patterns)
- `src/components/canvas/useKeyboardBindings.test.ts` (hook test patterns)
- `src/components/ExportMenu.tsx` (export workflow)
- `src/components/Sidebar.tsx` (document management workflow)

## File Scope
- `src/__tests__/documentWorkflow.test.ts` (new)
- `src/__tests__/drawingWorkflow.test.ts` (new)
- `src/__tests__/undoRedoWorkflow.test.ts` (new)
- `src/__tests__/exportWorkflow.test.ts` (new)

## Steps
### Step 0: Design test scenarios
- [ ] Document workflow: create → rename → switch → delete
- [ ] Drawing workflow: draw stroke → select → move → resize
- [ ] Undo/redo workflow: draw → undo → redo → undo multiple
- [ ] Export workflow: draw elements → export PNG → verify output

### Step 1: Document management tests
- [ ] Create `documentWorkflow.test.ts`
- [ ] Test: create new document → verify appears in list
- [ ] Test: rename document → verify name changed
- [ ] Test: switch documents → verify elements loaded
- [ ] Test: delete document → verify removed from list
- [ ] Test: create folder → move document to folder

### Step 2: Drawing workflow tests
- [ ] Create `drawingWorkflow.test.ts`
- [ ] Test: add stroke element → verify in elements array
- [ ] Test: select element → verify selectedIds updated
- [ ] Test: move element → verify position changed
- [ ] Test: resize element → verify dimensions changed
- [ ] Test: delete element → verify removed

### Step 3: Undo/redo tests
- [ ] Create `undoRedoWorkflow.test.ts`
- [ ] Test: add element → undo → verify element removed
- [ ] Test: undo → redo → verify element restored
- [ ] Test: multiple operations → undo all → verify initial state
- [ ] Test: undo stack limit (50 operations)

### Step 4: Verify
- [ ] Run `npx vitest run src/__tests__/` — all pass
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build

## Completion Criteria
- [ ] 4 new integration test files
- [ ] At least 20 new test cases
- [ ] All critical user workflows covered
- [ ] Tests run in under 5 seconds

## Git Commit Convention
- **Implementation:** `test(TEST-003): add integration tests for user workflows`
- **Checkpoints:** `checkpoint: TEST-003 description`

## Do NOT
- Modify production code
- Add new dependencies
- Test implementation details

---

## Amendments (Added During Execution)
