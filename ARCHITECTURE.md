# MindNotes Pro Architecture

This document defines the current ownership boundaries. Update it when persisted data, shared domain logic, or runtime entry points move.

## Runtime shape

MindNotes Pro is a local-first React whiteboard with a PWA runtime and a minimal Electron shell.

```text
src/
├── core/          Pure document models, geometry, and arrangement algorithms
├── canvas/        Rendering-specific geometry, brushes, image loading, and export helpers
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
- The active document schema is v5; document contracts live in `src/core/model.ts` and the schema version constant lives in `src/store/schema.ts`.
- v5 documents live in the `mindnotes-pro-v5` IndexedDB database. The `mindnotes-pro-v4` database is a read-only migration source and is never deleted.
- Application code talks to persistence through `src/application/ports/documentRepository.ts`; the IndexedDB implementation lives in `src/store/indexedDbDocumentRepository.ts`.
- JSON backup validation belongs in `src/store/backup.ts`; UI code must not parse backup data ad hoc.
- Document records live in IndexedDB. Small preferences and custom-template metadata may use local storage.
- `src/store/types.ts` is a compatibility barrel; canonical document models and pure transforms live in `src/core`.
- View state and theme state must not import `appStore` directly. Cross-store coordination uses explicit application ports or data passed by the caller.
- Element mutations that affect the document should go through a slice action such as `commitElements`; direct `setState({ elements: ... })` is reserved for test setup and hydration.

### `src/core`

Owns dependency-free document concepts and deterministic transforms.

- `model.ts` contains persisted element, layer, document, folder, and history contracts.
- `geometry.ts` contains bounds, element transforms, and dependency-free distance primitives.
- `arrangement.ts` contains alignment and distribution algorithms.
- `viewport.ts` contains dependency-free screen-pan transforms consumed by view state.
- Core modules must not import Zustand, React, browser APIs, persistence, or rendering code.

### `src/canvas`

Owns rendering and export behavior that can be tested without React.

- Keep Canvas rendering pure against explicit context and state inputs where practical.
- Visual exports use document content bounds, not viewport screenshots.
- Canvas and SVG output should share domain defaults unless a format requires a documented difference.
- Brush metadata, rendering geometry rules, and image caching belong here rather than in toolbar components.

Key shared modules include:

- `brushPresets.ts`: brush labels and rendering metadata.
- `coordinates.ts`: pure screen/client/world conversion, anchored wheel/pinch zoom, touch geometry, and grid-snap helpers.
- `gestureGeometry.ts`: pointer thresholds and snapshot geometry-change detection.
- `marquee.ts`: normalized selection rectangles, intersection tests, and modifier-selection merging.
- `selectionTransforms.ts`: pure selection resize, drag-snap, rotation, and anchor-position calculations.
- `pointerSession.ts`: pointer-session contracts plus pure selection-start, bounds, duplication, cancellation, and undo decisions.
- `drawingSession.ts`: pure pen sampling, shape endpoint binding, and eraser-session commit decisions.
- `systemClipboard.ts`: selected-element PNG rendering and browser clipboard writes behind injectable runtime services.
- `elementRenderers.ts`: shape, text, and image rendering plus their local path/wrap caches; `canvasDrawing.ts` keeps the shared dispatch contract.
- `canvasOverlays.ts`: selection-box handles and zoom indicator overlays; exports remain available through `canvasDrawing.ts`.
- `canvasBackground.ts`: canvas backgrounds plus decorative and snap-grid rendering with explicit cache invalidation; exports remain available through `canvasDrawing.ts`.
- `canvasMinimap.ts`: lightweight element-bound and viewport minimap rendering with an explicit aggregate-bounds cache; exports remain available through `canvasDrawing.ts`.
- `strokeRenderer.ts`: brush-specific stroke rendering, perfect-freehand outlines, and calligraphy pooling; exports remain available through `canvasDrawing.ts`.
- `drawingCaches.ts`: reusable bounded LRU/TTL cache primitive for rendering modules.
- `pointerEvents.ts`: pointer capture plus auxiliary wheel, keyboard, context-menu, double-click, and cancellation bindings.
- `hitTesting.ts`: pure element, z-order, image-alpha, and selection-handle hit testing with injected runtime services.
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
   Extracted coordinate, hit-testing, viewport, gesture-threshold, pinch, marquee, selection-transform, pointer-session, drawing-session, system-clipboard, auxiliary input-binding, and Select-tool pointer-handler primitives; remaining work is limited to other input cleanup.
2. `src/canvas/canvasDrawing.ts`
   Shared element dispatch and cache invalidation remain here; element, stroke, overlay, background, grid, and minimap rendering now live in focused canvas modules.
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
