# Task: QUAL-001 — Encapsulate saveTimer and improve code quality

**Created:** 2026-06-07
**Size:** S

## Review Level: 1

## Mission
The `saveTimer` variable in `appStore.ts` is a module-level global (`let saveTimer: ReturnType<typeof setTimeout> | null = null`). This is a code smell — it leaks state outside the store and makes testing harder. Encapsulate it properly and fix minor code quality issues.

## Dependencies
- **None**

## Context to Read First
- `src/store/appStore.ts` (focus on lines 112-114, 335-346, 440-442)
- `src/store/appStore.test.ts` (understand existing test patterns)

## File Scope
- `src/store/appStore.ts`
- `src/store/appStore.test.ts`

## Steps
### Step 0: Analyze saveTimer usage
- [ ] Read all saveTimer references in appStore.ts
- [ ] Understand the HMR dispose pattern at line 113-114
- [ ] Read how scheduleSave and saveDocNow use saveTimer

### Step 1: Move saveTimer into store closure
- [ ] Add `saveTimer` as a variable inside the store creator closure (not module-level)
- [ ] Expose it via a private store property or keep it in closure scope
- [ ] Update all references to use the encapsulated version
- [ ] Preserve the HMR dispose behavior

### Step 2: Fix the pattern
- [ ] Consider using a ref-based approach or store state for the timer
- [ ] Ensure the timer is properly cleaned up on doc switch (openDoc)
- [ ] Add a test that verifies save scheduling behavior

### Step 3: Verify
- [ ] Run `npx vitest run src/store/appStore.test.ts` — all pass
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npx tsc --noEmit` — no type errors

## Completion Criteria
- [ ] saveTimer is no longer module-level global
- [ ] HMR cleanup still works
- [ ] Save scheduling behavior unchanged
- [ ] At least 2 new tests for save scheduling
- [ ] No regressions

## Git Commit Convention
- **Implementation:** `refactor(QUAL-001): encapsulate saveTimer and add save scheduling tests`
- **Checkpoints:** `checkpoint: QUAL-001 description`

## Do NOT
- Change the save delay (1500ms) or max history (50)
- Modify the IndexedDB storage layer
- Change any public API of the store

---

## Amendments (Added During Execution)
