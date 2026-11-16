# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [6.0.0-beta.12] - 2026-11-12

Local acceptance candidate; not released or production qualified.

### Fixed

- Wait for a durable webpage-backup import before reporting success. Failed imports retain merged notes for editable JSON or Markdown recovery export, and pending imports participate in the close handshake.
- Show a persistent notice when webpage notes are recovered from the previous saved copy, explaining that recent edits may be missing. Keep storage failures visible alongside later operation receipts.

### Validation

- The unchanged beta.11 executable reproduced a success message while import storage failed, and silent fallback to an earlier page copy. Eight isolated recovery-mechanics stages passed, with original files preserved and exact backup reimport, but the candidate failed on these two feedback defects. Original artifacts and reports are preserved.
- Four component and sixteen real-storage tests pass, including failed import, successful retry, concurrent edits and persistent recovery feedback. Final source checks, independently packaged regressions, visible desktop journeys and production gates are tracked in the production-readiness report.
- Built Setup and Portable from the main repository: 58 matching production assets, 15 complete runtime dependencies and matching executable/archive payloads. Current source passes 1,283 unit and 16 storage tests; 58 web journeys pass. The actual executable passes 8 hidden integration, 8 storage-fault recovery and 10 crash-recovery stages. Visible desktop, sustained-input and physical-device gates remain pending; signing remains deferred.
- Source inventories now record deleted Git paths separately, and desktop evidence uses each test's output directory. Focused tool lint and E2E typechecks pass. A prepared storage-fault runner first exited on a removed manifest path; its original log is preserved and a task-local adaptation passed against the verified package.

## [6.0.0-beta.11] - 2026-11-11

Local candidate in preparation; not released or production qualified.

### Fixed

- Show unavailable shortcut feedback when global registration fails. Bubble and collapse hints explain manual button operation, and recovered-draft guidance remains visible in the hint.

### Validation

- A hidden actual beta.10 executable confirmed that registration returned false while the expanded toolbar still displayed Alt+Shift+M. Buttons remained inside the window and their DOM centers remained reachable; no native or visual claim is made.
- Two focused component cases pass after fixing one unsupported test matcher. Source and independent candidate each pass 1,281 unit, 12 real-storage tests and 58 web journeys. Windows packaging, actual hidden-executable recovery, pointer ownership, released endpoints, library retry, long errors, permission refusal and shortcut feedback pass. The 32 visible desktop journeys, sustained load, physical pen and distribution lifecycle remain pending; beta.10 binaries, copied source and delivery are preserved.

## [6.0.0-beta.10] - 2026-11-11

Independently packaged and hidden package checks passed for local acceptance; visible desktop and production gates remain pending.

### Fixed

- Keep library retry and screen-note recovery buttons inside the minimum workspace when storage errors contain long file paths. Text wraps without shrinking the controls.
- Add minimum-window recovery journeys for direct library retry and exporting/retrying unsaved screen-note edits. The beta.9 executable reproduced the original off-window controls; its binaries and evidence remain preserved.

### Validation

- Source and independent candidate checks passed 1,279 unit and 12 real-storage tests, types, boundaries and build; both web runs passed 58 journeys. Independent Setup/Portable have 58 matching production assets, 15 complete runtime dependencies and matching executable/archive payloads. All three executables remain unsigned.
- Hidden actual-executable integration, pointer ownership, nine endpoint/capture cases, eight-stage library recovery and four-stage minimum-window long-error recovery passed, with exact restarts. Packaged storage and actual remote-page permission refusal passed. Eleven renderer PNGs were generated without an effective manual visual pass.
- The endpoint helper first timed out waiting for persisted ink, including a readiness-adjusted retry. Capture/release/focus/button diagnostics traced this to omitted `button: 'left'` on held-button CDP moves. Correcting only that input parameter passed all nine cases on the unchanged package; original failures and diagnostics remain preserved. Generated fixtures and hidden CDP actions do not establish native input or compositor acceptance.
- All 32 visible desktop journeys are prepared and unexecuted. Public sites, both ordinary fullscreen displays, distribution lifecycle, sustained input/idle/recovery, physical pen and other production gates remain pending for this package.

## [6.0.0-beta.9] - 2026-11-11

Independently packaged for local acceptance; visible final-package workflows and production gates remain pending.

### Fixed

- Return to the last valid library page after trashing or restoring its only remaining note; pagination describes the displayed result while another request is pending.
- Offer direct retry after failed library reads, distinguish failed reads from empty results, and clear read errors after successful recovery without losing operation receipts.
- Retain cached notes only for the same query and trash scope. Webpage-only filtering does not depend on reading screen storage.

### Validation

- The actual hidden beta.8 exe reproduced all four original library defects using 51 isolated valid notes and a transient trusted-IPC rejection; original package and delivery files remain unchanged.
- Original implementation failed 10 of 11 focused component cases. The repaired implementation passes 13, including trash restoration, zero-count and search-scope boundaries.
- Source and independent full checks pass 1,279 unit and 12 real-storage tests, types, module boundaries and build, with 0 lint errors and 63 existing warnings. Both web runs pass 58 journeys; production dependencies have no known advisories at the recorded time.
- Independent Setup and Portable payloads match the unpacked exe and asar; 58 production assets and 15 required runtime dependencies are verified. Hidden actual-executable integration, pointer and released-endpoint regressions, eight-stage library recovery, packaged storage and remote permissions pass. Thirty visible desktop journeys are listed but have not run.
- Preserve the initial source typecheck failure and initial library diagnostic selector failure. Corrected complete reruns pass; neither original failure is rewritten as a passing run.

## [6.0.0-beta.8] - 2026-11-11

Independently built for local acceptance; later reproduced library defects superseded this candidate. Original passing checks remain historical.

### Fixed

- Preserve the released endpoint of screen, saved-screen and webpage ink, including rapid lines without a delivered move event. Screen erasing also includes the final released segment.
- Ignore interrupted pointer-capture acquisition in both screen renderers instead of throwing an uncaught error. Secondary touch starts cannot create a stroke when the primary contact began elsewhere.

### Validation

- The actual hidden beta.7 exe independently reproduced three dropped release endpoints and two uncaught capture errors. Its prior checks remain historical, and it is no longer the production candidate.
- Source and independent checks passed all 1,266 unit tests, 12 real-storage checks, types, module boundaries and build. The initial source check reported 116 lint warnings; formatting the seven changed files reduced this to the existing 63, with no errors. The 16 screen gesture cases passed.
- The independent package has 58 matching production assets, all 15 required runtime dependencies and matching Setup/Portable payloads. Hidden actual-executable integration, pointer ownership, nine endpoint/capture cases, exact restarts, packaged storage and remote permissions passed.
- The independent web run initially passed 57/58. Waiting for the injected SVG and two paint frames corrected CDP test readiness; the full 58 journeys then passed on unchanged candidate assets. Original failure, diagnostics and copied source remain preserved. Runtime capture-loss cancellation was retained. The 28 visible desktop journeys, sustained input, physical pen and distribution lifecycle remain pending; hidden CDP and generated fixtures do not constitute hardware or visible-compositor acceptance.

## [6.0.0-beta.7] - 2026-11-11

Prepared for independent local acceptance; not a published or signed stable release.

### Fixed

- A second webpage touch no longer replaces an active ink gesture or creates another point note. Unrelated pointer cancellation no longer discards ink in the webpage overlay, floating screen layer or saved-screen editor.
- Interrupted webpage strokes now discard their unsaved preview and release pointer capture when the owned pointer is cancelled, capture is lost, browsing resumes, Escape is pressed, or the page loses focus or becomes hidden. Delayed lost-capture events leave a newer captured gesture intact.

### Validation

- Full checks passed all 1,256 unit and 12 storage tests; 56 web journeys passed. The independently built package has matching production assets, runtime dependencies and distribution payloads. Actual-executable hidden integration and pointer/restart checks, packaged storage and permissions passed. CDP browser capture, synthetic interruption cases and generated fixtures do not constitute native hardware acceptance. Visible desktop, sustained-load, physical pen and distribution acceptance remain pending.
- The preserved beta.6 executable and its earlier passing results remain version-specific evidence. Its pointer defects were independently reproduced from the candidate injection; it is no longer the production candidate.

## [6.0.0-beta.6] - 2026-11-11

Built locally; core visible workflows passed, while sustained-load recovery, hardware and remaining production gates are pending.

### Fixed

- Damaged screen-backup syntax now shows a Chinese recovery instruction. Image validation and storage errors keep their original meaning; streamed-import failures still roll back every partial entry.
- Explicitly deny reading-page permission checks and requests, device access and display capture. The previous remote session relied on Electron defaults, which approve permission requests.

### Validation

- Current source passed all 1,250 unit tests, 12 real-storage checks, lint, types, module boundaries and build; 47 website/compatibility journeys passed. Hidden packaged-main and actual-executable integration confirmed permission denial and note persistence. The 58 production assets and both executable payloads match; required runtime dependencies are complete. The actual candidate exe passed 24 visible desktop journeys, three public sites and both ordinary fullscreen displays. Actual Portable and installer upgrade/reinstall/uninstall recovery passed. Sustained-load recovery and hardware remain pending. Existing beta.5 evidence stays historical and does not include these corrections.
- An initial independent build with linked dependencies omitted required transitive packages and was rejected before delivery. Artifact verification now checks the actual archived dependency tree; the candidate was rebuilt with a full local dependency installation.

## [6.0.0-beta.5] - 2026-11-11

Prepared locally for renewed acceptance; not a published or signed stable release.

### Fixed

- Reapply the floating toolbar native shape after display moves and display-metrics changes. Windows retained a physical 150% input region after moving to a 100% display, leaving visible buttons outside the region. The host size remains fixed.

### Validation

- Mixed-DPI desktop acceptance now verifies the toolbar with native hit-testing after each display switch, including restart. Fullscreen diagnostics record actual window regions and rendered control bounds. The final beta.5 package passed all 23 desktop tests, secondary-display ordinary fullscreen, three public articles, Portable and installer lifecycle acceptance; sustained-load and hardware gates remain tracked in `PRODUCTION_READINESS_CN.md`.

## [6.0.0-beta.4] - 2026-11-11

Prepared locally for acceptance; not a signed stable release.

### Fixed

- The floating option panel no longer resizes the transparent compositor window on every toggle. A fixed host keeps the toolbar stationary; native shaping releases input through the unused upper region. The reported option-panel flash was reproduced, and the user confirmed it resolved with a GAOMON 1060 Pro test.
- Toolbar controls retain their full height when panels open. Existing saved toolbar positions restore at the same visible location.
- Screen capture restores controls once the image is ready while the note continues saving, reducing the time controls remain hidden. A frozen-note save no longer hides windows for an unnecessary capture.

### Validation

- Added actual native hit-testing for panel input regions and stationary controls, alongside the existing capture, display, persistence and webpage regressions. The final beta.4 executable passed all 23 desktop tests after shared-input coordination and integer test-position correction; previous failed runs remain in the report.
- Preserved partial beta.3 Windows Ink pen input, erasing, undo and exact draft-recovery evidence from the connected GAOMON tablet. The user confirmed the menu fix on source production assets; beta.4 package hardware acceptance remains separate in `PRODUCTION_READINESS_CN.md`.

## [6.0.0-beta.3] - 2026-11-11

Prepared locally for production acceptance; not a published or signed stable release.

### Added

- SQLite worker persistence for completed screen gestures and frozen backgrounds, restart/crash recovery, and a unified screen/webpage note library.
- Editable screen snapshots with original pixels, independent ink, source/time, conclusions, search, recoverable trash and PNG/Markdown/JSON export.
- Streamed screen-library backups and single-transaction import with whole-file, image, size and duplicate-ID validation; draft backup/restore and current-unsaved-edit recovery export.
- Native save-failure close cancellation, retry, and explicit confirmation for abnormal exit.
- Real persistence/migration/failure tests and large-note Electron performance measurements.
- Real mixed-DPI display, native changing-screen capture, sustained pointer-input and public-article acceptance evidence.

### Changed

- Launch from a small floating button; separate brush and more panels; 44px controls in screen and webpage workflows.
- Treat desktop explanation and webpage reading as equal workflows, with a common library and local reuse.
- Combine consecutive screen edits over 120ms, transfer changed fields, return small save receipts and reuse rendered ink during text/pointer updates.
- Load only the active desktop surface; keep the legacy whiteboard and its store/export modules asynchronous.
- Show an explicit position status when webpage content is missing, hidden, rewritten or ambiguous. Preserve editable notes while hiding uncertain page marks, and restore them when the original content returns.
- Describe capture source as the visible root window at the captured display's center, rather than the unrelated keyboard-focus window.

### Fixed

- Large screen-note typing no longer queues a full geometry copy per character. A 160,000-point fixture changed from roughly 19s input / 34s save to 147ms input / 463ms save on the test computer.
- Frozen mouse mode hides the image before passing input to live software; lock/suspend releases input.
- Per-display save generations and display-restoration generations avoid clearing another screen's failure or restoring stale state.
- Page storage now fsyncs atomic writes, preserves a validated prior recovery copy and reports close-time failures.
- UTF-8 software source titles and explicit rejection of locked/protected desktop captures.
- A delayed pointer-capture release from one stroke no longer cancels the next stroke; consecutive drawing and erasing remain recoverable.
- Capture cancellation during lock, suspend or close keeps completed ink, hides both windows and releases input.
- A failed reading-shell renderer reloads once; a repeated failure returns to a usable floating entry with an explicit library retry.
- Internal scrolling, SPA routes and recycled DOM nodes retain original anchor identity instead of moving annotations onto unrelated duplicate text.

### Security

- Updated vulnerable runtime/build dependencies and bounded streamed JSON/PNG decoding. Dependency audit and complete regression gates remain part of acceptance.

## [6.0.0-beta.2] - 2026-11-10

Prepared locally; not a published GitHub release.

### Added

- A default floating Windows toolbar above ordinary desktop apps, with a transparent screen ink layer, nonactivating controls and native mouse pass-through.
- Screen pen, highlighter, whole-stroke swept eraser, 40-step undo/redo, reversible clear, a draggable collapse bubble and Alt+Shift+M toggle.
- PNG capture of the current underlying display and ink; the toolbar and ink windows are hidden during capture.
- Temporary histories per display, input recovery on cancellation, Escape and renderer failure, and actual Electron floating/capture regressions.

### Changed

- The webpage-note workspace is opened from My notes. Closing it returns to floating mode; explicit toolbar Exit flushes page-note edits and stops the app.
- The website and delivery guide now describe floating screen annotations as the default, and distinguish fixed screen ink from content-following webpage notes.

## [6.0.0-beta.1] - 2026-11-09

This beta is prepared locally; it is not yet a published GitHub release.

### Added

- A native Electron webpage view with a separate injected annotation layer: browse, pen, highlighter, excerpts, sticky notes, erasing and per-page undo/redo.
- DOM and text anchors that keep annotations aligned during scrolling and layout changes, with restoration when a page is reopened.
- A local reading-note library with search, editable comments, source navigation, Markdown exports and versioned JSON backups that merge newer edits.
- Serialized `page-notes.json` saves, atomic replacement and a valid previous recovery copy; unreadable originals are retained.
- Windows x64 one-click NSIS and portable packaging with publishing disabled, plus real Electron workflow tests and packaged-executable test support.

### Changed

- The desktop default is webpage reading and annotation. The website introduces the new product; the existing whiteboard remains at `?mode=whiteboard`.
- Kept the MindNotes Pro name for this beta and reduced the primary interface to reading, annotation and reusable notes.

### Fixed

- Comment edits include the source-page URL and are sent immediately, so fast navigation cannot save a comment onto a different page.
- Native window close waits for pending comment messages and local writes before exiting.
- Web E2E discovery no longer excludes all tests when the checkout lives inside a Windows Desktop folder.

### Security

- Remote webpages run without Node access, with sandboxing and context isolation. Trusted file operations are restricted to the local shell; the webpage receives only the annotation bridge.

### Existing whiteboard changes included in this beta

The previously unreleased whiteboard maintenance changes below remain on the compatibility route.

### Added

- A redesigned empty-canvas quick-start experience.
- Background image import with cover and tile placement.
- Paste support for Mermaid diagrams as editable canvas elements.

### Changed

- Centralized document save scheduling in a store subscription so slices no longer coordinate persistence directly.
- Added dependency-cruiser boundary rules and resolved the existing layer violations.

### Fixed

- Persistent toolbar, status, and first-use surfaces no longer use live backdrop blur, avoiding Chromium repaint flashes over the canvas.
- Canvas shortcuts remain available immediately after a dialog or chrome control closes.
- The accessibility element list no longer fires global shortcuts twice.
- Remaining English history action labels are now localized.

### Security

- Updated the vulnerable transitive development dependencies `js-yaml`, `joi`, and `undici` to patched releases.

## [5.1.2] - 2026-09-25

### Added

- Selection style editing for the current selection: alignment, distribution, grouping, and layer-order actions in the arrange menu and context menu, text style controls, and dedicated mobile selection actions.

### Fixed

- Canvas shortcuts (undo, copy, delete, tool switches) work again immediately after closing a dialog or menu: keyboard focus now returns to the canvas instead of staying on the trigger button.
- Double-clicking a shape node edits the text label it contains instead of creating a misplaced new text on top of it.
- Inserting a template steers the drop point away from existing canvas content, so template lines no longer land on top of strokes already on the board.
- The element context menu no longer offers the clear-canvas action while elements are selected; it remains available when right-clicking blank canvas.
- Sidebar undo, redo, and clear-canvas buttons gained hover tooltips matching their accessible names, plus explicit button types.
- Context menus clamped to the bottom of the viewport no longer overshoot the margin by the menu border width.
- E2E journeys are back in sync with the reworked toolbar; the full Playwright baseline is green again (45/45).

## [5.1.1] - 2026-09-06

### Fixed

- Right-button menus no longer flash when right-drag panning on platforms where `contextmenu` fires at pointer-down time (Linux). The canvas menu is now decided on the right-pointer-up path: a plain right-click opens it, a right-drag pans without a menu, consistently on every platform.

### Security

- Pinned transitive development dependencies: fast-uri 3.1.7, @xmldom/xmldom 0.8.15, and browserslist 4.28.9 (#154, #155, #156).

## [5.1.0] - 2026-09-06

### Added

- First-use notice explaining local-only storage, plus empty-canvas entry actions for starting, templates, and backup import.
- Mobile toolbar with direct tool access, touch-sized targets, and dedicated selection actions.
- Screen-reader canvas summary, a main landmark, and dialog focus management.
- Clear-canvas and import confirmations before destructive or document-replacing actions.
- Save failures are now visible in the status bar with a manual retry and a recovery-backup export.
- Repeatable 100/1,000/5,000-element performance benchmarks with a comparison runner.
- VPS publish and verification scripts with an atomic-rollback static layout.

### Changed

- Text and naming inputs preserve spaces, and focused controls keep normal Space activation.
- Layers, shortcut help, and template flows are reorganized for touch and keyboard use.
- Reduced-motion preferences now disable non-essential animation.

## [5.0.1] - 2026-08-24

### Fixed

- Removed `Math.random()` from persisted text session ID generation; IDs now prefer Web Crypto, with collision-checked fallbacks when it is unavailable.

## [5.0.0] - 2026-08-24

### Added

- Dependency-free core models, geometry, and arrangement transforms
- A `DocumentRepository` application port with an IndexedDB v5 adapter
- Read-only v4 database import with validation, atomic v5 writes, and failure recovery tests

### Changed

- The primary workspace now exposes one board instead of a user-visible document collection.
- JSON import replaces the current board in place; legacy document collections remain readable only for migration compatibility.
- The minimap is removed from the focused single-board workspace.
- Documents now persist in the isolated `mindnotes-pro-v5` database
- v5 JSON backups remain compatible with v4, v3, and supported legacy imports
- Recovery drafts and custom templates migrate forward without deleting the v4 database
- Element collection mutations now share one synchronization boundary for runtime indexes
- Canvas coordinate conversion, grid snapping, and hit testing now live behind tested pure modules
- Pan, pinch, drag-threshold, geometry-change, and marquee-selection calculations now live behind tested pure modules
- Selection resize, drag snapping, rotation, and drag-anchor calculations now live behind a tested pure module
- Pointer-session contracts, cancellation restoration, and selection undo snapshot decisions now live behind a tested pure module
- Pen sampling, shape endpoint binding, and eraser-session commit decisions now live behind a tested pure module
- Group-selection presses, selection bounds, and rotation-session initialization now live behind tested pure helpers
- Alt/Option-drag duplication now derives a pure copy-and-restore plan before applying Store mutations
- Selected-element PNG rendering and system clipboard writes now live behind a tested canvas boundary
- Canvas wheel, keyboard, context-menu, double-click, blur, and visibility bindings now share a tested lifecycle boundary
- Auxiliary canvas wheel, Space-pan, context-menu, and double-click decisions now live behind a focused tested handler boundary
- Canvas redraw scheduling, resize observation, store and image invalidation subscriptions, and bounds-cache synchronization now share a focused tested lifecycle boundary
- Select-tool drag, resize, rotate, marquee, duplication, cancellation, and undo orchestration now live behind a focused hook and tests
- Pen, shape, and eraser pointer-session coordination now lives behind a focused hook with direct tests
- Shape, text, and image renderers now live behind a tested canvas renderer module, with a shared bounded LRU/TTL cache primitive
- Selection-box handles and the zoom indicator now live behind a focused overlay renderer while retaining the existing canvas drawing exports
- Canvas backgrounds and decorative grids now live behind a focused renderer with explicit cache invalidation while retaining the existing canvas drawing exports
- Minimap rendering and aggregate-bounds caching now live behind a focused renderer while retaining the existing canvas drawing exports
- Brush-specific stroke rendering, perfect-freehand outline caching, and calligraphy pooling now live behind a focused renderer while retaining the existing canvas drawing exports
- Canvas element editability, selection eligibility, writable-layer assignment, and bound-arrow history decisions now live behind tested pure rules
- Canvas element maps, position indexes, and spatial-index synchronization now share a tested collection boundary
- Copy, paste, and duplicate element planning now share a tested clipboard boundary with independent stroke samples
- Canvas clipboard command coordination now lives behind a focused store boundary while pure copy plans remain independently tested
- Grouping and element lock metadata now use tested pure transforms that produce explicit history payloads
- Canvas metadata command coordination now lives behind a focused store boundary while pure transforms remain independently tested
- Alignment and distribution now derive tested plans with complete before/after document snapshots
- Canvas arrangement command coordination now lives behind a focused store boundary while pure plans remain independently tested
- Move, resize, and rotation now derive tested element plans, including bound-arrow synchronization and snapshot-versus-delta move history
- Layer deletion, visibility, locking, reordering, and element reassignment now derive tested plans outside the Zustand slice
- Canvas layer action coordination now lives behind a focused store boundary while pure layer plans remain independently tested
- Element add, update, remove, and clear operations now use tested plans and shared runtime-index synchronization
- Canvas mutation command coordination now lives behind a focused store boundary while pure mutation plans remain independently tested
- Canvas geometry command coordination now lives behind a focused store boundary while deterministic plans remain independently tested
- Canvas eraser commits and transient snapshot restoration now share a focused store coordination boundary
- Element commits now share tested selection filtering, bounded undo history, and redo-clear decisions
- Undo and redo element transitions now live in a pure, tested history-transition boundary; the history slice retains runtime synchronization, viewport focus, feedback, and save coordination
- Document and folder record construction, schema normalization, ordering, duplication, and import transforms now live in a tested helper boundary; document management retains hydration, recovery, search-history, and persistence coordination
- Recovery-draft reconciliation now lives in a tested pure boundary; document management retains localStorage cleanup and recovery feedback coordination
- Recent document search parsing, persistence, and bounded deduplication now live in a tested helper boundary
- Runtime element-map and spatial-index rebuilding now lives in a tested helper boundary
- Current document workspace projection now lives in a tested helper boundary, keeping document management focused on workflow coordination
- Document persistence bootstrap, legacy migration, recovery reconciliation, and fallback preparation now share a tested initialization boundary
- Context-menu selection capabilities and viewport positioning now live behind a tested model, with reusable menu primitives separated from Store coordination
- Sidebar document search, snippets, and sorting now use a tested projection model, with list rendering separated from document workflow coordination
- Export menu formatting and reusable format controls now live behind focused model and view boundaries while document rendering and file workflows remain coordinated in the menu
- Template category projection, preview cards, and gallery sections now live behind focused boundaries while the picker retains modal focus and custom-template workflow coordination
- Keyboard paste workflows and Store-backed shortcut commands now live behind focused boundaries while the keyboard hook retains dispatch priority and listener lifecycle
- App bootstrap, save/install/shortcut lifecycle, and status-bar rendering now live behind focused component boundaries while `App.tsx` retains shell composition
- The shared stylesheet audit removed unreferenced legacy rules without changing active canvas, sidebar, export, template, modal, or responsive selectors
- The v5 architecture audit now records the remaining large modules as intentional composition roots and removes the last malformed UTF-8 test label

### Fixed

- Built-in and custom template instances now unlock and expose each element as an independently editable object.
- Generated bundle-analysis output containing build-machine paths is no longer tracked.
- Alignment and distribution undo now restore exact document snapshots
- View and theme stores no longer depend cyclically on the application store

## [4.0.0] - 2026-08-01

### Added

- Versioned v4 document schema with layers, IndexedDB persistence, and validated JSON backups
- Five built-in editable templates and reusable custom templates
- Full-document JPEG export and content-bound PNG, PDF, and SVG exports
- Playwright coverage for critical drawing, erasing, template, import/export, persistence, and responsive workflows
- Sandboxed Electron desktop entry and Linux AppImage packaging

### Changed

- First launch now opens a blank, immediately usable document
- Resizing between desktop and mobile preserves the visible canvas center
- JSON import creates a separate editable document and accepts v4, v3, and supported legacy data
- The primary workspace and shortcut interfaces now use consistent Chinese labels
- PWA updates activate through the normal service-worker lifecycle without a reload banner

### Fixed

- Replaced unstable simulated erasing with deterministic geometric partial-stroke erasing
- Eraser gestures now create one coherent undo operation
- Templates receive fresh IDs, remain selectable, and can be edited after insertion
- Export output no longer clips content outside the current viewport
- Product branding remains visible in the mobile toolbar
- Electron no longer enables Node.js integration or exposes the removed screen-pen overlay

### Removed

- Physics, particle, audio, wear, and preset behavior from the active eraser workflow
- Misleading Word export
- Experimental screen-pen and update-banner interfaces

## [3.3.0] - 2026-06-18

### Added

- Experimental pressure- and speed-aware eraser behavior backed by a spatial index
- Experimental Electron screen-pen overlay
- Release promotion automation and expanded unit and end-to-end coverage

### Changed

- Extended canvas and eraser performance work across rendering, hit testing, caching, and element lookup
- Expanded product and release documentation for the experimental eraser workflow

## [3.2.0] - 2026-06-12

### Added

- ESLint recommended rules for TypeScript and React (consistent-type-imports, no-explicit-any, react-hooks)
- Vitest coverage thresholds raised to 60% with lcov reporter
- Husky + lint-staged pre-commit hooks (eslint --fix + prettier --write on commit)
- CODEOWNERS for automatic code review assignment
- Dependabot configuration (weekly npm + GitHub Actions dependency updates)
- Bilingual PR template with detailed checklist (8 change types, 6 test items, 7 self-check items)
- Enhanced issue templates with severity/priority dropdowns and confirmation checklists
- Keyboard shortcuts section in README
- "Who is this for?" section in README targeting students, designers, developers, note-takers

### Changed

- Rewrote README.md, README_CN.md, README_JA.md with compelling copy focused on emotional appeal
- CONTRIBUTING.md expanded with code review process, branch protection policy, and release process
- Upgraded coverage reporter to include lcov for Codecov integration
- All source files formatted with Prettier (CRLF -> LF normalization)

### Fixed

- ESLint consistent-type-imports errors across source files
- Empty catch block lint warning in usePointerEngine

## [3.1.0] - 2026-06-04

### Fixed

- Canvas sizing and hit test accuracy
- Critical bugs in canvas rendering pipeline
- Stroke visibility with stale closure and pen fallback to `quadraticCurveTo`
- `handleEnd` check order for tool vs. drawing state
- Eraser using stale size from closure (now uses `sizeRef`)
- Stroke loss, dark mode toggle disappearance, and event handler stability

### Changed

- Restructured component directory layout
- Added project documentation and architecture docs
- Cleaned up taskplane runtime artifacts

## [3.0.0] - 2026-05-15

### Added

- Frame selection (multi-select) with bounding box
- Alignment guides / snapping
- Copy & paste support
- Shape fill options
- Eraser partial stroke erasure

### Changed

- Full Monet impressionist style UI rewrite
- Watercolor gradient backgrounds with glassmorphism effects
- Paper texture on canvas

## [2.2.0] - 2026-05-08

### Added

- Visual homepage with SVG banners and design philosophy
- Project metrics dashboard

## [2.1.4] - 2026-05-06

### Fixed

- Export dropdown clipped by `backdrop-filter` (moved outside topbar)

## [2.1.3] - 2026-05-06

### Fixed

- Export download reliability (`toBlob` + `createObjectURL` + DOM mount)

## [2.1.0] - 2026-05-05

### Changed

- Updated HTML meta tags to match warm-tone design

### Removed

- Invalid manifest reference

## [2.0.0] - 2026-05-02

### Changed

- UX overhaul: eraser cursor, text input, selection highlight improvements

## [1.3.1] - 2026-03-22

### Added

- Toast notification system integration
- Component lifecycle tests

## [1.3.0] - 2026-03-22

### Added

- Release notes and version management

## [1.2.2] - 2026-03-21

### Changed

- Version bump with stability improvements

## [1.2.1] - 2026-03-21

### Changed

- Canvas background visual optimization

## [1.2.0] - 2026-03-20

### Changed

- Full architecture refactoring and cleanup
- Dead code removal
- Project structure optimization

## [1.1.6] - 2026-03-20

### Added

- Release documentation

## [1.1.5] - 2026-03-20

### Changed

- Simplified CI release workflow

## [1.1.4] - 2026-03-19

### Added

- Keyboard shortcut system
- Export functionality improvements

## [1.1.3] - 2026-03-19

### Fixed

- Android APK build and upload pipeline

## [1.1.2] - 2026-03-19

### Added

- Cross-platform packaging configuration

## [1.1.1] - 2026-03-19

### Added

- Floating notes component (browser extension prototype)

## [1.1.0] - 2026-03-19

### Added

- Project introduction and contact information

## [1.0.0] - 2026-03-18

### Added

- Initial release of MindNotes Pro
- Freehand drawing with perfect-freehand
- Basic canvas with undo/redo
- LocalStorage persistence

[5.1.2]: https://github.com/11suixing11/mindnotes-pro/compare/v5.1.1...v5.1.2
[5.1.1]: https://github.com/11suixing11/mindnotes-pro/compare/v5.1.0...v5.1.1
[5.1.0]: https://github.com/11suixing11/mindnotes-pro/compare/v5.0.1...v5.1.0
[5.0.1]: https://github.com/11suixing11/mindnotes-pro/compare/v5.0.0...v5.0.1
[5.0.0]: https://github.com/11suixing11/mindnotes-pro/compare/v4.0.0...v5.0.0
[4.0.0]: https://github.com/11suixing11/mindnotes-pro/compare/v3.3.0...v4.0.0
[3.3.0]: https://github.com/11suixing11/mindnotes-pro/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/11suixing11/mindnotes-pro/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/11suixing11/mindnotes-pro/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/11suixing11/mindnotes-pro/compare/v2.2.0...v3.0.0
[2.2.0]: https://github.com/11suixing11/mindnotes-pro/compare/v2.1.4...v2.2.0
[2.1.4]: https://github.com/11suixing11/mindnotes-pro/compare/v2.1.3...v2.1.4
[2.1.3]: https://github.com/11suixing11/mindnotes-pro/compare/v2.1.0...v2.1.3
[2.1.0]: https://github.com/11suixing11/mindnotes-pro/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/11suixing11/mindnotes-pro/compare/v1.3.1...v2.0.0
[1.3.1]: https://github.com/11suixing11/mindnotes-pro/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/11suixing11/mindnotes-pro/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/11suixing11/mindnotes-pro/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/11suixing11/mindnotes-pro/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/11suixing11/mindnotes-pro/compare/v1.1.6...v1.2.0
[1.1.6]: https://github.com/11suixing11/mindnotes-pro/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/11suixing11/mindnotes-pro/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/11suixing11/mindnotes-pro/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/11suixing11/mindnotes-pro/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/11suixing11/mindnotes-pro/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/11suixing11/mindnotes-pro/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/11suixing11/mindnotes-pro/compare/v1.0.0...v1.1.0
