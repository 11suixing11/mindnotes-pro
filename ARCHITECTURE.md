# MindNotes Pro Architecture

This document defines the current ownership boundaries. Update it when persisted data, shared domain logic, or runtime entry points move.

## Runtime shape

MindNotes Pro v6 supports desktop explanations and webpage reading as equal workflows. Electron starts with a small always-on-top button and transparent screen layer; a unified local library stores screen notes and anchored webpage notes. The reading workspace keeps a native Chromium webpage and a separate trusted React shell. `AppWrapper.tsx` loads only the active surface; the compatibility whiteboard and its store/export modules stay asynchronous. The website presents the product; the v5 whiteboard remains available through `?mode=whiteboard` for compatibility.

```text
src/
├── notes/         Page-note model, history, injected overlay, desktop UI and web landing page
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
├── main.mts       Native webpage view, window lifecycle, trusted IPC and native exports
├── floatingController.mts Transparent windows, durable screen drafts, pass-through and freeze/live capture
├── floatingPreload.cts Separate trusted bridges for toolbar and screen layer
├── preload.cts    Trusted shell bridge and pending-comment close handshake
├── pagePreload.cts Restricted annotation bridge for the untrusted webpage
├── pagePermissions.mts Denies remote-page device, capture and browser permission requests
├── notesWorkspace.mts Page notes, per-page history and persistence coordination
├── notebookRepository.mts Atomic local page JSON writes and recovery copy
├── screenNotebookService.mts Trusted library IPC, export dialogs and snapshot compositing
├── screenNotebookRepository.mts Worker request coordination and storage failures
├── screenRepositoryWorker.mts SQLite transactions, schema migration and streaming exports
├── screenBackup.mts Streaming backup validation and single-transaction import
├── screenImages.mts Bounded PNG validation and worker thumbnail decoding
└── localFiles.mts Limited reads and fsync-backed atomic file replacement

e2e/               Chromium landing-page and legacy whiteboard journeys
└── desktop/       Real Electron floating ink, capture, webpage annotation and recovery journeys
```

## Layer rules

### Floating screen annotations

- `src/notes/screenInk.ts` owns validated strokes, brush widths, swept eraser geometry and immutable 40-step history. Erasing removes a whole touched stroke. A weak spatial cache bounds long eraser gestures. Screen ink uses display-local DIP coordinates; completed gestures persist as display drafts. Undo history remains session-only.
- `src/notes/floating.ts` defines the two restricted bridge contracts. `FloatingToolbar.tsx` renders the draggable toolbar/bubble; `ScreenAnnotationLayer.tsx` handles pointer capture, drafts and SVG ink. Cancelled gestures and renderer failures release input. The floating layer and saved-screen editor reject secondary touch starts and interrupted capture acquisition. Both sample the released endpoint before committing pen or eraser geometry so rapid lines and erase sweeps retain their final segment.
- The expanded toolbar uses a fixed 438 × 400 DIP compositor host. Its lower 122 DIP strip stays stationary when panels toggle; native shaping excludes the unused upper region from drawing and input. Collapse still uses the separate small window bounds. Stored toolbar positions remain the visible strip's origin so older preferences restore correctly. Core controls do not shrink when a panel opens.
- Windows stores the native shape in physical pixels. Reapply the DIP shape after toolbar display moves and display metrics changes; otherwise moving from 150% to 100% can leave visible buttons outside the native input region. Mixed-DPI acceptance checks the real toolbar hit target after every screen switch.
- `electron/floatingController.mts` owns both transparent, frameless, topmost windows and a history per display. Only the display containing the toolbar is active; moving the toolbar across displays switches histories. Monitor changes release input and reposition windows.
- Mouse mode sets native `setIgnoreMouseEvents(true)`. Drawing makes only the screen layer focusable; the toolbar stays nonactivating and is raised above it. Esc returns to mouse mode. For a frozen image, mouse mode hides the image so input matches the live desktop; selecting a brush returns to the frozen snapshot. Lock/suspend collapses both windows and releases input. Alt+Shift+M toggles the small bubble; when registration fails, the bubble and collapse hints explain manual button operation and the toolbar shows the shortcut is unavailable.
- Collapse hides ink and releases input without clearing it. Opening the note workspace collapses the toolbar. Closing that workspace returns to floating mode; the explicit exit button flushes page-note edits and destroys both floating windows.
- Saving a screen note disables editing, hides both floating windows, waits for the compositor, then selects the current display from `desktopCapturer`. Windows source metadata names the visible root window at the captured display's center, using physical coordinates after hiding MindNotes; keyboard focus alone may describe unrelated software. Original PNG, editable strokes, source, time and conclusion belong to one local note. `screenCapture.ts` composites PNG exports in the trusted renderer. Freeze stores its background and draft in one transaction. No screenshot reaches a remote webpage or network service; locked/protected desktops are rejected.
- Capturing and temporary window hiding are distinct states: restore the fixed toolbar as soon as pixels are available while keeping save controls disabled until persistence finishes. Saving an existing frozen snapshot requires no new desktop capture or temporary hide.
- Screen ink remains at screen coordinates when another app moves or scrolls. Following webpage content requires the separate injected-page workflow. Protected/UAC desktops and exclusive fullscreen applications are outside ordinary topmost-window coverage.

### Screen-note persistence and editing

- `screenNotebook.ts` owns strict screen draft/note/patch contracts. Limits: 1,000 strokes, 160,000 points per note, 8,000 points per stroke, 32 MB / 40 million pixels per image, 256 MB / 10,000 notes per library backup. Live drafts resize proportionally after logical display-size changes; frozen drafts preserve image coordinates.
- A serialized `node:sqlite` worker owns `userData/screen-notes.sqlite`, schema 2, with WAL and `synchronous=FULL`. Quick-check and future-schema failures preserve originals. Schema 1 migration adds summary columns; library lists do not parse every stroke document. Per-display generations prevent one monitor's save from clearing another's failure.
- `screenBackup.mts` streams one entry at a time in the worker and validates the complete JSON, duplicate IDs, sizes and PNG decoding before committing the transaction. Truncation or a late failure rolls back the whole import. Library export writes one entry at a time, fsyncs and atomically replaces the target. Neither import nor export constructs the complete library in the main process.
- `ScreenNotebookLibrary.tsx` combines screen and webpage search, local editing, recoverable trash and backup actions. `ScreenNoteEditor.tsx` keeps original pixels separate from editable SVG strokes and exports PNG, Markdown or JSON. `ScreenInkPaths.tsx` reuses static geometry during typing and pointer movement; floating state only transmits changed ink fields.
- Library reads keep request-scoped loading/error state separate from operation receipts. Failed reads offer direct retry, suppress empty-library guidance and retain only the last successful result for the same query and trash scope. A successful fresh read clears its error. After deletion or restoration reduces the total, an invalid offset reloads the last valid 50-note page before accepting the result; pagination describes the displayed result rather than a pending request. The webpage-only filter does not request screen storage.
- Library and screen-editor error messages wrap long paths within a shrinkable text field; recovery buttons retain their full targets and wrap onto another line at the minimum window size. A storage failure must leave retry and recovery-export controls reachable.
- The trusted preload immediately registers pending edits, combines patches over a short 120ms window, serializes writes and retains failed fields. Save receipts omit unchanged large geometry. Normal close, navigation and export await this queue; a failure blocks leaving the editor and offers retry or export of the current unsaved snapshot. An explicit native confirmation provides abnormal exit when storage cannot recover.
- Screenshots and note data are local files, without encryption or hosted sync. Portable executables use the local Windows user-data directory; transfer editable backups to move notes to another computer.

### `src/notes` and page-note persistence

- `model.ts` owns the page-note JSON contract (`mindnotes-pro.page-notes`, version 1), HTTP(S) URL normalization, DOM/text anchors, strict backup validation, merge policy and Markdown projection. It stays independent of React and Electron.
- `history.ts` owns immutable per-page undo/redo snapshots, limited to 40 steps. Comment typing within one second is grouped by the workspace. Undo history is session-only; persisted notes do not depend on it.
- `pageOverlay.ts` builds the injected Shadow DOM/SVG layer. It observes scrolling, layout resize and DOM changes; stroke positions use nearby DOM anchors, while excerpts use text quotes and context. Only the active pointer owns an unfinished stroke; secondary touch and unrelated cancellation must not replace or discard it. Owned cancellation, capture loss, browse mode, Escape, blur and hidden-document transitions discard the preview and release capture. Delayed lost-capture events are ignored when the newer gesture still owns capture. The released endpoint is sampled before committing a completed line, including a rapid gesture without a delivered move event. Unanchored ink uses document coordinates. Missing, hidden, rewritten or ambiguous anchors are temporarily hidden instead of attached to unrelated content; notes and editable geometry remain intact. Connected recycled nodes keep their identity until original text returns. Position reports are validated, current-page-only runtime state, never persisted in backups. The trusted shell shows an inline status and disables reveal until the original position resolves again. Annotation markers retain a 28px visible circle inside a 44px click target. Browser mode keeps page interaction available. The overlay belongs to each loaded main-frame document.
- `desktop.ts` is the typed IPC contract. `NotesApp.tsx` renders the trusted shell and sends edits immediately with the source-page URL; it never writes files or parses backups itself. `NotesLanding.tsx` is the website entry.
- `electron/notesWorkspace.mts` owns page collection, active page, tool state, per-page history, validated edits and save status. It consumes the shared models and a repository, without importing React.
- `electron/notebookRepository.mts` owns `app.getPath('userData')/page-notes.json`. Saves are serialized, written to `.writing` and renamed into place. Before replacement, a valid previous file is copied to `.previous`. Load tries the current file and recovery copy; if neither readable copy is valid, originals remain intact and saving is blocked. Recovering the earlier copy produces a persistent workspace notice that recent changes may be missing; navigation and later save receipts do not dismiss it in that session.
- `electron/pagePermissions.mts` configures the remote-page session before it loads content. Permission checks and requests, device access and display-media selection are denied; the reading workflow uses ordinary page interaction and the restricted annotation bridge. This policy does not modify the trusted shell session or native screen-note capture. Camera/microphone, location, notifications, remote clipboard APIs, device/file access and page-requested fullscreen are outside the reading workflow.
- Page-note backup import merges by normalized URL and annotation ID, keeping newer annotation edits. Its trusted IPC receipt waits for the durable write, including edits arriving while it is pending. A failed import keeps the merged notes in memory and rejects with recovery guidance; JSON and Markdown export remain available even when local storage cannot save. Pending imports participate in the close handshake. Save errors stay visible alongside later operation receipts. This format is separate from v5 whiteboard backups. Markdown retains excerpts, comments and source links; complete ink geometry and editable positions require JSON.
- Native close waits for pending comment IPC, then flushes repository writes. A webpage process failure leaves a refresh action. A shell process failure hides the native page while reloading the trusted shell; a second failure within 30 seconds returns to the floating entry and allows an explicit library retry. Committed notes remain in the repositories; input that had not reached persistence before a renderer crash cannot be promised. Webpage and shell process failures must not grant additional privileges or silently erase stored notes.
- Page notes are local. The app does not create an offline copy of the original website, host accounts or sync notes. Cross-origin frames and heavily rewritten pages may not restore positions exactly.

### Legacy whiteboard boundaries

The following `src/store`, `src/core`, `src/canvas`, `src/components`, `src/eraser` and `src/templates` rules apply to the compatibility whiteboard. Its v5 data contract remains separate from the v6 product version and page-note format.

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
- Save scheduling is centralized: `src/store/autoSaveScheduler.ts` subscribes to the store and marks the document dirty (`incrementSaveGeneration` + `scheduleSave`) whenever a document-bearing key (`elements`, `layers`, `activeLayerId`, `bgColor`, `backgroundStyle`, `backgroundImage`, `undoStack`, `redoStack`) changes. Slices must not call `saveManager` scheduling directly (enforced by `deps:check`). `docManagement` keeps lifecycle controls (immediate saves, timer clears, rename marking) and wraps workspace hydration `setState` calls in `beginHydration`/`endHydration` so loads and imports never trigger redundant writes.
- `canvasElementRules.ts` owns dependency-free selection eligibility, writable-layer assignment, and bound-arrow snapshot decisions used by the canvas element slice.
- `canvasElementCollection.ts` owns synchronization of element/id/index maps with the spatial index, including full replacement, incremental synchronization, and lazy position-index rebuilds.
- `canvasElementClipboard.ts` owns deterministic copy, paste, and duplicate plans, including deep stroke samples, offsets, IDs, and writable-layer assignment.
- `canvasElementClipboardActions.ts` owns Zustand coordination for copy, paste, and duplicate commands; pure copy plans remain in `canvasElementClipboard.ts`.
- `canvasElementMetadata.ts` owns group, ungroup, lock, and unlock transforms plus their history payloads.
- `canvasElementMetadataActions.ts` owns Zustand coordination for grouping, ungrouping, locking, and unlocking; pure metadata transforms remain in `canvasElementMetadata.ts`.
- `canvasElementArrangement.ts` owns alignment and distribution plans plus complete before/after history snapshots.
- `canvasElementArrangementActions.ts` owns Zustand coordination for alignment and distribution commands; pure arrangement plans remain in `canvasElementArrangement.ts`.
- `canvasElementGeometry.ts` owns deterministic move, resize, and rotation plans, including bound-arrow updates and move-history payloads.
- `canvasElementGeometryActions.ts` owns Zustand coordination for move, resize, and rotation commands, including runtime geometry synchronization; deterministic plans remain in `canvasElementGeometry.ts`.
- `canvasElementLayers.ts` owns layer deletion, visibility, locking, reordering, and element reassignment plans.
- `canvasElementLayerActions.ts` owns Zustand coordination for layer creation, naming, deletion, visibility, locking, reordering, and element reassignment; pure plans remain in `canvasElementLayers.ts`.
- `canvasElementMutations.ts` owns add, update, remove, and clear plans plus their history payloads.
- `canvasElementMutationActions.ts` owns Zustand coordination for element addition, replacement, removal, and clearing, including runtime-index synchronization; pure mutation plans remain in `canvasElementMutations.ts`.
- `canvasElementSnapshotActions.ts` owns eraser-history commits and transient snapshot restoration, including runtime collection synchronization.
- `canvasElementCommit.ts` owns selection filtering, undo-window updates, and redo-clear decisions for committed element changes.
- `historyTransitions.ts` owns pure undo/redo element transitions and affected-ID extraction; the history slice retains toast, focus, persistence, and runtime coordination.
- `slices/documentRecords.ts` owns pure document/folder record construction, schema normalization, canonical-board selection, and replacement transforms; legacy multi-document helpers remain only as non-UI compatibility surfaces. `docManagement.ts` retains canonical-board hydration, recovery, persistence coordination, and those legacy command shims.
- `slices/documentRecovery.ts` owns pure comparison and replacement decisions for persisted documents versus recovery drafts; localStorage draft deletion and user feedback remain in `docManagement.ts`.
- The single-board UI does not expose document search; legacy document collection search state is no longer part of the runtime store.
- `slices/documentRuntimeIndexes.ts` owns rebuilding the runtime element maps and spatial index from a document; document management retains only when hydration or document switching requires the rebuild.
- `slices/documentWorkspace.ts` owns projecting a persisted document into the live workspace state, including layers, background settings, and document-versus-empty history initialization; document management retains only the workflow coordination.
- `slices/documentInitialization.ts` owns persistence bootstrap, legacy migration, canonical-board selection, default-folder compatibility, recovery reconciliation, and in-memory fallback preparation; document management retains state hydration, runtime-index rebuilds, and user feedback.

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
- Context-menu capability and viewport-position decisions live in `context-menu/contextMenuModel.ts`; `ContextMenu.tsx` coordinates Store actions while reusable menu primitives render the surface.
- The document Sidebar and its search/list workflow are removed from the application shell. Legacy document records and command shims remain isolated to persistence/migration and non-UI compatibility layers; the runtime UI exposes only the canonical board.
- Export filename and size formatting live in `export-menu/exportMenuModel.ts`; reusable export-item views are separated from rendering, backup, import, and download coordination in `ExportMenu.tsx`.
- Template category projection lives in `templates/templatePickerModel.ts`; preview cards and gallery sections are separate views while `TemplatePicker.tsx` retains modal focus and custom-template form coordination.
- `app/useAppLifecycle.ts` owns theme/document bootstrap, before-unload saves, shortcut-help dispatch, and install-prompt lifecycle; `app/AppStatusBar.tsx` owns the status projection and content-fit affordance while `App.tsx` composes the shell.
- `src/index.css` remains the shared visual contract for the canvas shell and feature surfaces; the audit removes only unreferenced legacy animation and markdown/JPEG helper rules, preserving active class names and responsive overrides.
- Large hooks may orchestrate behavior, but new per-tool rules should be extracted and tested.
- Component and hook tests stay next to the code they cover.
- Visible workflow changes need either a focused UI test or a Playwright journey.
- `canvas/canvasAuxiliaryInput.ts`: handler construction for anchored wheel zoom, temporary Space-pan, context-menu suppression, and double-click text editing.
- `canvas/keyboardPaste.ts` and `canvas/keyboardShortcutActions.ts`: browser clipboard insertion and Store-backed shortcut command coordination; `useKeyboardBindings.ts` retains shortcut priority and keydown listener lifecycle.
- `canvas/useCanvasRendererLifecycle.ts`: RAF scheduling, resize observation, store invalidation subscriptions, image/canvas invalidation events, and incremental element-bounds cache synchronization.
- `canvas/useDrawingPointerHandlers.ts`: pen sampling, shape drafting and endpoint binding, eraser hit processing, and one-gesture erase-history coordination; `usePointerEngine.ts` retains contact routing, pan/select orchestration, and lifecycle wiring.

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

Owns the native browser, trusted desktop shell, file persistence and native file dialogs.

- The shell loads the built local app from `dist`; production desktop assets use a relative base. Compiled entry and preloads live in `dist-electron/electron`, with shared notes modules in `dist-electron/src/notes`.
- Keep `nodeIntegration` disabled, context isolation and sandboxing enabled.
- HTTP(S) webpages run in a separate `WebContentsView` with their own restricted preload and persisted browser session. Remote pages must never receive the trusted `window.mindnotes` bridge.
- Main-process IPC checks both sender webContents and main frame. The page bridge can only signal readiness or submit validated annotation edits for the active page. File dialogs and paths are available only to the trusted shell.
- The trusted shell denies navigation and new windows. The webpage view denies non-HTTP(S) navigation and opens ordinary new-page links in the existing view. The remote session explicitly denies permission checks/requests, devices and display media; certificate validation remains enabled.
- Shared note models and overlay logic stay in `src/notes`; shell and untrusted-page responsibilities must not be combined.

## Refactor status

The v6 beta restores the native webpage plus annotation-layer workflow. The retained v5 whiteboard structural refactor is complete for its compatibility scope. Remaining large modules are explicit composition roots and should not be split further based on line count alone.

- `docManagement.ts` coordinates the repository-backed canonical board; record construction, recovery decisions, runtime indexes, workspace projection, and initialization live in focused modules.
- `usePointerEngine.ts` coordinates input contacts, pan and eyedropper behavior, event bindings, and renderer state; geometry, hit testing, gesture rules, drawing sessions, selection sessions, clipboard rendering, and auxiliary handlers live behind focused boundaries.
- `history.ts` coordinates runtime synchronization, viewport focus, feedback, and saves; deterministic undo/redo transitions live in `historyTransitions.ts`.
- `canvasDrawing.ts` remains the shared element dispatcher and cache-invalidation facade; concrete renderers live in focused canvas modules.
- `canvasElements.ts` remains the Store composition root for element actions, collection runtime, commit coordination, and selection state.
- `index.css` remains a shared stylesheet with feature-labelled sections and responsive overrides; future moves should be scoped to components already being changed rather than triggering a broad rewrite.

Further structural work should be driven by a measured performance issue, a new product boundary, or a repeated maintenance problem, with tests added before moving ownership again.

## Verification policy

Run the repository-level gate for every behavior change:

```bash
npm run check
```

For user-facing workflows, also run:

```bash
npm run test:e2e
```

For desktop annotation workflows, also run `npm run test:desktop`. After Windows packaging, run the desktop Playwright suite against `release/win-unpacked/MindNotes Pro.exe` using `MINDNOTES_EXECUTABLE`, and smoke-test the portable artifact with an isolated data directory. Never publish artifacts as a side effect of verification.

Architecture-only changes still need regression tests when code moves across an ownership boundary.
