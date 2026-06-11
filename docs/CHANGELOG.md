# Changelog

## v3.1.0 (2026-06-04)

### Bug Fixes

- **Canvas sizing**: Fixed canvas using `window.innerWidth/Height` instead of parent container size. When Sidebar was open, canvas overflowed its container causing coordinate misalignment and clipped rendering. Now uses `ResizeObserver` on the parent element.
- **Hit test accuracy**: Fixed `hitTest()` and `hitHandle()` using stale `viewBox.zoom` from closure instead of `viewBoxRef.current.zoom`. Element selection was inaccurate after zooming in/out.
- **ConfirmModal queue**: Rewrote confirm dialog queue system. Previously, multiple queued `confirm()` calls would flash an empty message modal. Each queue entry now stores its own options.
- **useViewStore.resetView**: Now also resets `isPanning` and `lastPanPosition`, preventing stale pan state after reset.
- **Keyboard handler**: Fixed Canvas keyboard shortcuts using stale closure values for `undo`/`redo`/`removeElements`. Now uses `useAppStore.getState()` consistently with empty dependency array.
- **Topbar overflow**: Changed `.topbar` from `max-height: 56px; overflow: hidden` to `max-height: 120px; overflow-y: auto` so toolbar items are not clipped on narrow screens.

### Performance

- **Sidebar preview**: Sidebar no longer re-renders on every stroke point. Canvas preview updates are now debounced (300ms) via a direct `useAppStore.subscribe()` pattern.

### Robustness

- **IndexedDB error handling**: All storage operations (`getAll`, `get`, `put`, `del`) now have try/catch with console.error logging. App no longer silently fails when IndexedDB is unavailable.
- **ConfirmModal encoding**: Fixed GBK-encoded Chinese text (\u53d6\u6d88 / \u786e\u5b9a) to proper UTF-8.
- **Service worker**: Added cross-origin request guard to avoid caching non-basic responses.
- **Deploy workflow**: Changed `npx vite build` to `npm run build` for consistency with local development.

### Tests

- Added `types.test.ts` ? 12 tests covering `elementBounds`, `moveElement`, `resizeElement` for all element types.
- Added `toastStore.test.ts` ? 8 tests covering show/dismiss/auto-dismiss/custom types.
- Added `canvasUtils.test.ts` ? 12 tests covering `simplifyPts`, `distToSeg`, `isVisibleInView`.
- Added `useViewStore.test.ts` ? 1 test for resetView clearing panning state.
- Total: 34 new tests (34 -> 68).
