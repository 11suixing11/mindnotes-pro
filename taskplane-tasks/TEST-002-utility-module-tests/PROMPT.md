# Task: TEST-002 — Utility module tests

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
Add unit tests for the two utility modules that currently have no test coverage: `storage.ts` (IndexedDB abstraction layer) and `canvasDrawing.ts` (canvas drawing utilities). These are pure/near-pure functions that are easy to test and critical to data integrity.

## Dependencies
- **None**

## Context to Read First
- `src/store/storage.ts`
- `src/canvas/canvasDrawing.ts`
- `src/canvas/canvasUtils.test.ts` (existing test pattern reference)
- `src/store/appStore.test.ts` (existing test pattern reference)

## File Scope
- `src/store/storage.test.ts` (new)
- `src/canvas/canvasDrawing.test.ts` (new)

## Steps
### Step 0: Analyze module exports
- [ ] Read storage.ts and list all exported functions
- [ ] Read canvasDrawing.ts and list all exported functions
- [ ] Read existing test files for mock patterns

### Step 1: Write storage.ts tests
- [ ] Create `storage.test.ts`
- [ ] Mock IndexedDB (use fake-indexeddb or manual mock)
- [ ] Test `openDB` returns a valid database
- [ ] Test `put` and `get` round-trip
- [ ] Test `getAll` returns all records
- [ ] Test `delete` removes a record
- [ ] Test `clear` removes all records
- [ ] Test error handling for invalid store names

### Step 2: Write canvasDrawing.ts tests
- [ ] Create `canvasDrawing.test.ts`
- [ ] Test each exported drawing function with mock canvas context
- [ ] Test edge cases (empty points, zero-size shapes)
- [ ] Verify correct canvas API calls are made

### Step 3: Verify
- [ ] Run `npx vitest run src/store/storage.test.ts` — all pass
- [ ] Run `npx vitest run src/canvas/canvasDrawing.test.ts` — all pass
- [ ] Run `npx vitest run` — no regressions

## Completion Criteria
- [ ] Both new test files exist and pass
- [ ] At least 12 new test cases total
- [ ] storage.ts has >80% line coverage
- [ ] No existing tests broken

## Git Commit Convention
- **Implementation:** `test(TEST-002): add utility module unit tests`
- **Checkpoints:** `checkpoint: TEST-002 description`

## Do NOT
- Modify any source files
- Add new npm dependencies for testing (use built-in mocks)

---

## Amendments (Added During Execution)
