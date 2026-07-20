# MindNotes Pro Architecture

This document describes the current codebase boundaries. Keep it updated when moving shared logic between layers.

## Runtime shape

MindNotes Pro is a local-first React whiteboard app with an optional Electron shell.

```text
src/
├── canvas/        Pure canvas, SVG export, and drawing-domain helpers
├── components/    React UI and interaction hooks
├── eraser/        Physics eraser domain, rendering, preferences, and tests
├── store/         Zustand state, persistence, migrations, and shared app types
├── App.tsx        Main app composition
└── main.tsx       Web entry

electron/
└── main.ts        Desktop shell entry
```

## Layer rules

### `src/store`

Owns application state, persisted data shape, migrations, and shared TypeScript types.

- Store slices should not import React components.
- Persistence changes must include migration tests when saved data shape changes.
- Shared element types live in `src/store/types.ts` until a domain module fully owns that type.

### `src/canvas`

Owns rendering and export behavior that can be tested without React.

- Canvas rendering should remain pure against `CanvasRenderingContext2D` inputs where possible.
- SVG export should use the same domain defaults as Canvas rendering unless the export format intentionally needs a separate value.
- Drawing-domain metadata belongs here, not inside toolbar components.

Current shared drawing metadata:

- `src/canvas/brushPresets.ts` is the single source of truth for brush labels, descriptions, default opacity, stroke-width multipliers, dash patterns, and SVG-only brush output details.
- `src/canvas/strokeElements.ts` owns stroke creation and point normalization.
- `src/canvas/resizeRules.ts` owns pure resize/aspect-ratio rules used by interaction hooks.

### `src/components`

Owns React rendering, UI state wiring, and browser interaction hooks.

- Components should read domain metadata from `src/canvas` or `src/store` instead of duplicating constants.
- Large interaction hooks may contain orchestration, but new domain rules should be extracted before adding more feature branches.
- Tests stay next to the component or hook they cover.

### `src/eraser`

Owns the physics eraser feature as a separate domain.

- Eraser simulation, particles, preferences, audio, and performance helpers stay inside this folder.
- Shared canvas element mutations should go through store APIs instead of reaching across into unrelated slices.

### `electron`

Owns desktop shell behavior only.

- The Electron entry should load the built web app and handle shell-level APIs.
- Shared whiteboard behavior should stay in `src`, not in Electron-specific files.

## Refactor priorities

The current highest-risk files are large, mixed-responsibility modules. Split them only behind tests and in small PRs.

1. `src/components/canvas/usePointerEngine.ts`
   - Separate pointer mode routing from per-tool behavior.
   - Extract stroke creation helpers before adding more input features.

2. `src/canvas/canvasDrawing.ts`
   - Keep brush rendering helpers near shared brush presets.
   - Avoid duplicating defaults already defined in `brushPresets.ts`.

3. `src/index.css`
   - Split by component/domain when touching related UI.
   - Avoid unrelated formatting-only rewrites in feature PRs.

4. `src/store/slices/canvasElements.ts`
   - Keep geometry transforms, grouping, ordering, and persistence concerns separated.
   - Add focused tests before moving mutation logic.

## Change policy

For architecture cleanup PRs:

- Prefer one boundary per PR.
- Preserve behavior unless the PR explicitly says otherwise.
- Add or update regression tests for moved logic.
- Run at minimum:

```bash
npm run lint
npx tsc --noEmit
npm run test:run
npm run build
```

For user-facing features:

- Reuse domain helpers instead of introducing new duplicated constants.
- Add a UI test or browser smoke check when the change affects visible behavior.
- Keep issue fixes separate from broad cleanup unless the cleanup directly enables the fix.
