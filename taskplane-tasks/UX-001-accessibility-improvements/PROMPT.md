# Task: UX-001 — Improve accessibility (a11y)

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
Improve accessibility to meet WCAG 2.1 AA standards. Add proper ARIA labels, keyboard navigation, screen reader support, and focus management throughout the application.

## Dependencies
- **None**

## Context to Read First
- `src/components/Canvas.tsx` (canvas accessibility)
- `src/components/Sidebar.tsx` (navigation accessibility)
- `src/components/Toolbar.tsx` (button accessibility)
- `src/components/ExportMenu.tsx` (menu accessibility)
- `src/components/FirstRunGuide.tsx` (modal accessibility)

## File Scope
- `src/components/Canvas.tsx` (improve ARIA)
- `src/components/Sidebar.tsx` (improve ARIA)
- `src/components/Toolbar.tsx` (improve ARIA)
- `src/components/ExportMenu.tsx` (improve ARIA)
- `src/components/ConfirmModal.tsx` (improve ARIA)
- `src/hooks/useFocusTrap.ts` (new)

## Steps
### Step 0: Audit current accessibility
- [ ] Run axe-core or similar tool on the app
- [ ] Document all ARIA violations
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Test keyboard-only navigation

### Step 1: Add missing ARIA labels
- [ ] Add `aria-label` to all icon buttons
- [ ] Add `role` attributes where missing
- [ ] Add `aria-live` regions for dynamic content (save status, toast)
- [ ] Add `aria-expanded` for collapsible sections

### Step 2: Improve keyboard navigation
- [ ] Create `useFocusTrap.ts` hook for modals
- [ ] Add Tab/Shift+Tab navigation in toolbar
- [ ] Add arrow key navigation in sidebar tree
- [ ] Ensure all interactive elements are focusable

### Step 3: Add screen reader announcements
- [ ] Announce tool changes
- [ ] Announce element selection
- [ ] Announce save status changes
- [ ] Announce export completion

### Step 4: Test with assistive technology
- [ ] Test with NVDA (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] Verify all functionality accessible via keyboard
- [ ] Run automated a11y tests

### Step 5: Verify
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build
- [ ] Pass axe-core audit with 0 violations

## Completion Criteria
- [ ] All buttons have accessible names
- [ ] All modals trap focus
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announcements for key actions
- [ ] axe-core score > 95

## Git Commit Convention
- **Implementation:** `feat(UX-001): improve accessibility to WCAG 2.1 AA`
- **Checkpoints:** `checkpoint: UX-001 description`

## Do NOT
- Change visual design
- Break existing keyboard shortcuts
- Add visible focus indicators that conflict with design

---

## Amendments (Added During Execution)
