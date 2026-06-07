# Task: PERF-001 — Lazy-load jspdf to reduce initial bundle

**Created:** 2026-06-07
**Size:** S

## Review Level: 1

## Mission
The jspdf library is 341KB (112KB gzip) and is only used when the user exports PDF. Currently it is imported statically in ExportMenu.tsx, which means it is included in the initial bundle. Lazy-load it with dynamic `import()` so it only loads when the user first clicks "Export PDF".

## Dependencies
- **None**

## Context to Read First
- `src/components/ExportMenu.tsx` (the only file importing jspdf)
- `vite.config.ts` (check current chunk splitting config)

## File Scope
- `src/components/ExportMenu.tsx`

## Steps
### Step 0: Analyze current jspdf usage
- [ ] Read ExportMenu.tsx and find all jspdf references
- [ ] Confirm jspdf is only used in the `exportPDF` function

### Step 1: Implement dynamic import
- [ ] Remove the static `import jsPDF from 'jspdf'` at the top of ExportMenu.tsx
- [ ] Change `exportPDF` to use `const { default: jsPDF } = await import('jspdf')` inside the function
- [ ] Add a loading state or toast indicator while the module loads
- [ ] Handle import errors gracefully (show toast on failure)

### Step 2: Verify build output
- [ ] Run `npm run build`
- [ ] Confirm jspdf is now in a separate chunk (check dist/js/ for a new chunk file)
- [ ] Confirm the main index.js chunk is smaller than before (was 76.26 KB)

### Step 3: Verify functionality
- [ ] Run `npx vitest run` — no regressions
- [ ] The exportPDF function should still work correctly (dynamic import + immediate use)

## Completion Criteria
- [ ] jspdf is no longer in the main bundle chunk
- [ ] PDF export still works (dynamic import)
- [ ] Error handling for failed imports
- [ ] Build succeeds without errors
- [ ] No test regressions

## Git Commit Convention
- **Implementation:** `perf(PERF-001): lazy-load jspdf for smaller initial bundle`
- **Checkpoints:** `checkpoint: PERF-001 description`

## Do NOT
- Remove jspdf from dependencies
- Change any other export functions
- Add new npm dependencies

---

## Amendments (Added During Execution)
