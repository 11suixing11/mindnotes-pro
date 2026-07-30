# MindNotes Pro Architecture

This document defines the current ownership boundaries. Update it when persisted data, shared domain logic, or runtime entry points move.

## Runtime shape

MindNotes Pro is a local-first React whiteboard with a PWA runtime and a minimal Electron shell.

```text
src/
├── canvas/        Rendering, geometry, brushes, image loading, and export helpers
├── components/    React UI and browser interaction orchestration
├── eraser/        Geometry eraser and spatial index
├── keyboard/      Shortcut definitions, matching, and serialization
├── store/         Zustand state, IndexedDB persistence, schema, layers, and backups
├── templates/     Built-in and custom editable templates
├── App.tsx        Main application composition
└── main.tsx       Web entry

electron/
└── main.mts       Sandboxed desktop shell entry

e2e/               Playwright tests for critical user journeys
```

## Layer rules

### `src/store`

Owns application state and persisted contracts.

- Store slices must not import React components.
- Persisted document changes require schema or migration tests.
- The active document schema is v4 and lives in `src/store/types.ts` and `src/store/schema.ts`.
- JSON backup validation belongs in `src/store/backup.ts`; UI code must not parse backup data ad hoc.
- Document records live in IndexedDB. Small preferences and custom-template metadata may use local storage.

### `src/canvas`

Owns rendering and export behavior that can be tested without React.

- Keep Canvas rendering pure against explicit context and state inputs where practical.
- Visual exports use document content bounds, not viewport screenshots.
- Canvas and SVG output should share domain defaults unless a format requires a documented difference.
- Brush metadata, geometry rules, and image caching belong here rather than in toolbar components.

Key shared modules include:

- `brushPresets.ts`: brush labels and rendering metadata.
- `strokeElements.ts` and `shapeElements.ts`: element creation and draft rules.
- `resizeRules.ts`: pure resize and aspect-ratio behavior.
- `documentExport.ts` and `svgExport.ts`: full-document export behavior.

### `src/components`

Owns React rendering, UI state wiring, and browser event orchestration.

- Components consume domain helpers instead of duplicating geometry or persistence rules.
- Large hooks may orchestrate behavior, but new per-tool rules should be extracted and tested.
- Component and hook tests stay next to the code they cover.
- Visible workflow changes need either a focused UI test or a Playwright journey.

### `src/eraser`

Owns predictable geometric erasing.

- `simpleEraser.ts` performs point/radius intersection and partial-stroke splitting.
- `SpatialIndex.ts` limits hit-testing work for larger documents.
- Erasing must produce one coherent undo action per pointer gesture.
- Particle, audio, wear, and simulated-physics behavior are outside the current product boundary.

### `src/templates`

Owns reusable editable canvas content.

- Built-in templates are ordinary canvas elements, not preview-only data.
- Instantiation must generate fresh element and group IDs.
- Custom templates must remain editable after saving and reinsertion.

### `electron`

Owns desktop shell behavior only.

- The shell loads the built web app from `dist`.
- Keep `nodeIntegration` disabled, context isolation and sandboxing enabled.
- Open external URLs through the system browser and deny unexpected window creation.
- Shared whiteboard behavior stays in `src`.

## Refactor priorities

The highest-risk files are large mixed-responsibility modules. Split them behind tests and in reviewable changes.

1. `src/components/canvas/usePointerEngine.ts`
   Extract per-tool pointer handlers and shared gesture lifecycle code.
2. `src/canvas/canvasDrawing.ts`
   Separate element renderers while retaining one shared rendering contract.
3. `src/index.css`
   Move touched component styles into clear sections or modules without broad formatting churn.
4. `src/store/slices/canvasElements.ts`
   Keep geometry transforms, ordering, selection, and persistence triggers independently testable.

## Verification policy

Run the repository-level gate for every behavior change:

```bash
npm run check
```

For user-facing workflows, also run:

```bash
npm run test:e2e
```

Architecture-only changes still need regression tests when code moves across an ownership boundary.
