# General — Context

**Last Updated:** 2026-06-07
**Status:** Active
**Next Task ID:** TEST-001

---

## Current State

MindNotes Pro v3.1.0 is a local-first whiteboard app (React 18 + TypeScript 5 + Vite 5 + Zustand + Canvas API).

- **Build status:** Clean (tsc + vite build pass)
- **Test status:** 106 tests pass across 10 test files
- **Bundle size:** ~160KB gzip total

## Architecture

- `src/store/` — Zustand stores (appStore, useViewStore, useThemeStore, toastStore)
- `src/components/canvas/` — Canvas engine hooks (renderer, pointer, selection, text, keyboard)
- `src/components/toolbar/` — Toolbar UI components
- `src/components/` — Main components (Canvas, Sidebar, ExportMenu, etc.)
- `src/canvas/` — Canvas drawing utilities

## Test Coverage Gaps

Files without tests:
- `src/components/canvas/usePointerEngine.ts`
- `src/components/canvas/useSelectionEngine.ts`
- `src/components/canvas/useCanvasRenderer.ts`
- `src/store/storage.ts`
- `src/canvas/canvasDrawing.ts`

## Key Files

| Category | Path |
|----------|------|
| Tasks | `taskplane-tasks/` |
| Config | `.pi/taskplane-config.json` |
| Tests | `src/**/*.test.ts` |

## Technical Debt / Future Work

- Lazy-load jspdf (341KB) for smaller initial bundle
- Encapsulate module-level saveTimer in appStore.ts
- Add tests for canvas engine hooks and storage module
