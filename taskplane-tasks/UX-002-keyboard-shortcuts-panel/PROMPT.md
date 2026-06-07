# Task: UX-002 — Add keyboard shortcuts help panel

**Created:** 2026-06-07
**Size:** S

## Review Level: 1

## Mission
The app has keyboard shortcuts but no way for users to discover them (except the brief hint that disappears). Add a keyboard shortcuts help panel that users can access anytime via `?` key or a menu button.

## Dependencies
- **None**

## Context to Read First
- `src/components/canvas/useKeyboardBindings.ts` (understand all shortcuts)
- `src/components/Toolbar.tsx` (understand toolbar layout)
- `src/components/FirstRunGuide.tsx` (reference for modal/overlay pattern)

## File Scope
- `src/components/ShortcutsPanel.tsx` (new)
- `src/components/Toolbar.tsx` (add shortcuts button)
- `src/components/canvas/useKeyboardBindings.ts` (add ? key handler)

## Steps
### Step 0: Document all shortcuts
- [ ] List all keyboard shortcuts from useKeyboardBindings.ts
- [ ] Categorize: tools, actions, view, selection
- [ ] Design layout for shortcuts panel

### Step 1: Create ShortcutsPanel component
- [ ] Create `ShortcutsPanel.tsx`
- [ ] Display shortcuts in a grid/table format
- [ ] Group by category
- [ ] Add close button and Escape key handler
- [ ] Style consistently with app design

### Step 2: Add trigger points
- [ ] Add `?` key handler to useKeyboardBindings.ts
- [ ] Add keyboard icon button to Toolbar
- [ ] Store visibility state (useState or store)

### Step 3: Enhance shortcuts
- [ ] Add missing shortcuts if any:
  - [ ] Ctrl+S for save now
  - [ ] Ctrl+D for duplicate selection
  - [ ] Ctrl+G for group (if groups implemented)
  - [ ] Number keys for tool selection (already exists)

### Step 4: Verify
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build
- [ ] Test ? key opens panel
- [ ] Test Escape closes panel
- [ ] Test all listed shortcuts work

## Completion Criteria
- [ ] Shortcuts panel shows all available shortcuts
- [ ] Accessible via ? key and toolbar button
- [ ] Closes with Escape or close button
- [ ] All shortcuts documented
- [ ] Visual design matches app style

## Git Commit Convention
- **Implementation:** `feat(UX-002): add keyboard shortcuts help panel`
- **Checkpoints:** `checkpoint: UX-002 description`

## Do NOT
- Change existing keyboard shortcuts
- Add shortcuts that conflict with browser defaults
- Modify the existing hint system

---

## Amendments (Added During Execution)
