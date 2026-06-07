# Task: QUAL-004 — Add error boundaries and error handling

**Created:** 2026-06-07
**Size:** M

## Review Level: 1

## Mission
The app has no error boundaries. If any component throws an error, the entire app crashes. Add error boundaries to isolate failures and provide graceful degradation.

## Dependencies
- **None**

## Context to Read First
- `src/App.tsx` (root component)
- `src/components/Canvas.tsx` (critical component)
- `src/components/Sidebar.tsx` (critical component)
- `src/store/appStore.ts` (error handling in async operations)

## File Scope
- `src/components/ErrorBoundary.tsx` (new)
- `src/components/CrashFallback.tsx` (new)
- `src/App.tsx` (wrap with error boundary)
- `src/store/appStore.ts` (improve error handling)

## Steps
### Step 0: Identify error scenarios
- [ ] Component render errors
- [ ] Async operation failures (storage, export)
- [ ] Invalid data handling
- [ ] Network errors (if any)

### Step 1: Create ErrorBoundary component
- [ ] Create `ErrorBoundary.tsx` using React's ErrorBoundary pattern
- [ ] Log errors to console (and optionally to analytics)
- [ ] Display fallback UI instead of blank screen
- [ ] Add "Try Again" button to reset error state

### Step 2: Create fallback UI
- [ ] Create `CrashFallback.tsx` with user-friendly error message
- [ ] Show error details in development mode
- [ ] Provide instructions to recover (refresh page)
- [ ] Style consistently with app design

### Step 3: Add error boundaries strategically
- [ ] Wrap Canvas component (most likely to fail)
- [ ] Wrap Sidebar component
- [ ] Wrap Toolbar component
- [ ] Keep ErrorBoundary at App level as last resort

### Step 4: Improve async error handling
- [ ] Add try-catch to all storage operations
- [ ] Add error handling to export functions
- [ ] Show user-friendly error messages via toast
- [ ] Log errors for debugging

### Step 5: Verify
- [ ] Run `npx vitest run` — no regressions
- [ ] Run `npm run build` — clean build
- [ ] Test error scenarios (throw in component, corrupt data)
- [ ] Verify error recovery works

## Completion Criteria
- [ ] Error boundaries wrap all major sections
- [ ] App doesn't crash on component errors
- [ ] User sees helpful error message
- [ ] "Try Again" recovers without page refresh
- [ ] All async errors handled gracefully

## Git Commit Convention
- **Implementation:** `feat(QUAL-004): add error boundaries and graceful error handling`
- **Checkpoints:** `checkpoint: QUAL-004 description`

## Do NOT
- Catch and suppress errors silently
- Change error handling in storage.ts (already has try-catch)
- Add external error reporting services

---

## Amendments (Added During Execution)
