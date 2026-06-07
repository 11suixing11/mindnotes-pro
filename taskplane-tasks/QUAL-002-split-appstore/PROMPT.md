# Task: QUAL-002 — Split appStore into focused modules

**Created:** 2026-06-07
**Size:** L

## Review Level: 1 (Plan Only)

**Assessment:** This is a refactoring task that restructures code without changing behavior. Low blast radius (single module), existing patterns (Zustand slices), no security concerns, easy to revert.
**Score:** 2/8 — Blast radius: 1, Pattern novelty: 1, Security: 0, Reversibility: 0

## Canonical Task Folder

```
taskplane-tasks/QUAL-002-split-appstore/
├── PROMPT.md   ← This file (immutable above --- divider)
├── STATUS.md   ← Execution state (worker updates this)
├── .reviews/   ← Reviewer output (created by the orchestrator runtime)
└── .DONE       ← Created when complete
```

## Mission

The `appStore.ts` file is ~450 lines and handles too many concerns: document management, element operations, undo/redo, clipboard, and save scheduling. Split it into focused modules using Zustand slices pattern to improve maintainability and testability. This foundational refactor enables cleaner code for subsequent tasks.

## Dependencies

- **None**

## Context to Read First

**Tier 2 (area context):**
- `taskplane-tasks/CONTEXT.md`

**Tier 3 (load only if needed):**
- `src/store/appStore.ts` — Full file to understand all responsibilities
- `src/store/appStore.test.ts` — Existing test patterns
- `src/store/helpers.ts` — Helper functions already extracted
- `src/store/migration.ts` — Migration logic already extracted
- `src/store/saveManager.ts` — Save manager already extracted

## Environment

- **Workspace:** `src/store/`
- **Services required:** None

## File Scope

> The orchestrator uses this to avoid merge conflicts: tasks with overlapping
> file scope run on the same lane (serial), not in parallel.

- `src/store/appStore.ts` (refactor)
- `src/store/slices/` (new directory)
- `src/store/slices/documentSlice.ts` (new)
- `src/store/slices/elementSlice.ts` (new)
- `src/store/slices/historySlice.ts` (new)
- `src/store/slices/clipboardSlice.ts` (new)
- `src/store/appStore.test.ts` (update imports if needed)

## Steps

### Step 0: Preflight

- [ ] Read `src/store/appStore.ts` and understand all responsibilities
- [ ] Read `src/store/helpers.ts`, `migration.ts`, `saveManager.ts` (already extracted)
- [ ] Read `src/store/appStore.test.ts` for test patterns
- [ ] Verify current tests pass: `npx vitest run src/store/appStore.test.ts`

### Step 1: Design slice interfaces

- [ ] Define `DocumentSlice` interface (docs, folders, currentDocId, loaded, sidebarOpen, CRUD operations)
- [ ] Define `ElementSlice` interface (elements, selectedIds, tool, brush, color, fillColor, size, bgColor, element operations)
- [ ] Define `HistorySlice` interface (undoStack, redoStack, undo/redo/pushUndo)
- [ ] Define `ClipboardSlice` interface (clipboard, copySelected, paste)
- [ ] Identify shared dependencies between slices

**Artifacts:**
- `src/store/slices/types.ts` (new)

### Step 2: Implement document slice

- [ ] Create `src/store/slices/documentSlice.ts`
- [ ] Move document state: docs, folders, currentDocId, loaded, sidebarOpen
- [ ] Move document actions: init, createDoc, openDoc, renameDoc, deleteDoc, duplicateDoc
- [ ] Move folder actions: createFolder, renameFolder, deleteFolder, toggleFolder
- [ ] Move UI actions: setSidebarOpen
- [ ] Import from `../migration` and `../saveManager`

**Artifacts:**
- `src/store/slices/documentSlice.ts` (new)

### Step 3: Implement element slice

- [ ] Create `src/store/slices/elementSlice.ts`
- [ ] Move element state: elements, selectedIds, tool, brush, color, fillColor, size, bgColor
- [ ] Move element actions: addElement, addElements, updateElement, removeElement, removeElements
- [ ] Move transform actions: moveElementById, moveElementsById, resizeElementById
- [ ] Move clear action: clearAll
- [ ] Move batch action: batchErase
- [ ] Move tool setters: setTool, setBrush, setColor, setFillColor, setSize, setBgColor, setSelectedIds
- [ ] Import from `../helpers` for shallowClone, snapshot

**Artifacts:**
- `src/store/slices/elementSlice.ts` (new)

### Step 4: Implement history slice

- [ ] Create `src/store/slices/historySlice.ts`
- [ ] Move history state: undoStack, redoStack
- [ ] Move history actions: undo, redo, pushUndo
- [ ] Import from `../helpers` for shallowClone, snapshot, applyMoveDelta, reverseMoveDelta
- [ ] Ensure history slice can access element state (via get())

**Artifacts:**
- `src/store/slices/historySlice.ts` (new)

### Step 5: Implement clipboard slice

- [ ] Create `src/store/slices/clipboardSlice.ts`
- [ ] Move clipboard state: clipboard
- [ ] Move clipboard actions: copySelected, paste
- [ ] Import from `../helpers` for shallowClone

**Artifacts:**
- `src/store/slices/clipboardSlice.ts` (new)

### Step 6: Compose store

- [ ] Refactor `appStore.ts` to compose all slices
- [ ] Use Zustand's slice pattern: `create<DocumentSlice & ElementSlice & ...>()((...args) => ({ ...documentSlice(...args), ...elementSlice(...args), ... }))`
- [ ] Keep save status state and saveNow action in main store
- [ ] Ensure all existing exports still work
- [ ] Verify no circular dependencies

**Artifacts:**
- `src/store/appStore.ts` (modified)

### Step 7: Testing & Verification

- [ ] Run FULL test suite: `npx vitest run`
- [ ] Run build: `npm run build`
- [ ] Verify all imports in other files still work
- [ ] Fix any TypeScript errors

### Step 8: Documentation & Delivery

- [ ] Update `taskplane-tasks/CONTEXT.md` if needed
- [ ] Log discoveries in STATUS.md

## Documentation Requirements

**Must Update:**
- None (this is a refactoring task, no behavior changes)

**Check If Affected:**
- `taskplane-tasks/CONTEXT.md` — Update if architecture section changes

## Completion Criteria

- [ ] `appStore.ts` is under 150 lines
- [ ] Each slice is under 100 lines
- [ ] All existing functionality preserved
- [ ] All 183 tests passing
- [ ] No circular dependencies between slices
- [ ] Build succeeds without errors

## Git Commit Convention

Commits happen at **step boundaries** (not after every checkbox). All commits
for this task MUST include the task ID for traceability:

- **Step completion:** `refactor(QUAL-002): complete Step N — description`
- **Bug fixes:** `fix(QUAL-002): description`
- **Tests:** `test(QUAL-002): description`

## Do NOT

- Change any public API
- Modify the save delay (1500ms) or max history (50) constants
- Break existing component imports
- Add new npm dependencies
- Modify the storage layer

---

## Amendments (Added During Execution)

<!-- Workers add amendments here if issues discovered during execution. -->
