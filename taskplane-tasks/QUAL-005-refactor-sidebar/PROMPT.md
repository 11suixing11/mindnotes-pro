# Task: QUAL-005 — Refactor Sidebar into smaller components

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
The `Sidebar.tsx` component is ~250 lines and handles multiple concerns: mobile detection, document list rendering, folder tree, context menus, and long-press handling. Extract into smaller, focused components and hooks.

## Dependencies
- **None**

## Context to Read First
- `src/components/Sidebar.tsx` (full file)
- `src/components/SidebarContextMenu.tsx` (context menu component)
- `src/components/CanvasPreview.tsx` (preview component)

## File Scope
- `src/components/Sidebar.tsx` (simplify)
- `src/components/sidebar/DocumentItem.tsx` (new)
- `src/components/sidebar/FolderItem.tsx` (new)
- `src/hooks/useIsMobile.ts` (new)
- `src/hooks/useLongPress.ts` (new)

## Steps
### Step 0: Analyze Sidebar responsibilities
- [ ] Map all state and effects
- [ ] Identify reusable hooks (mobile detection, long press)
- [ ] Identify reusable components (document item, folder item)

### Step 1: Extract hooks
- [ ] Create `useIsMobile.ts` hook (extract from Sidebar)
- [ ] Create `useLongPress.ts` hook (extract long-press logic)
- [ ] Test hooks independently

### Step 2: Extract components
- [ ] Create `DocumentItem.tsx` for rendering a single document
- [ ] Create `FolderItem.tsx` for rendering a folder with children
- [ ] Move rendering logic from Sidebar to these components

### Step 3: Simplify Sidebar
- [ ] Import and use extracted hooks and components
- [ ] Keep only layout and orchestration logic
- [ ] Target under 100 lines

### Step 4: Verify
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build
- [ ] Test sidebar functionality (create, rename, delete, folder operations)
- [ ] Test mobile behavior (responsive layout, long press)

## Completion Criteria
- [ ] Sidebar.tsx under 100 lines
- [ ] DocumentItem and FolderItem are reusable
- [ ] useIsMobile and useLongPress hooks work independently
- [ ] All sidebar functionality preserved
- [ ] Mobile behavior unchanged

## Git Commit Convention
- **Implementation:** `refactor(QUAL-005): extract sidebar into focused components and hooks`
- **Checkpoints:** `checkpoint: QUAL-005 description`

## Do NOT
- Change sidebar visual design
- Modify context menu behavior
- Break mobile responsiveness

---

## Amendments (Added During Execution)
