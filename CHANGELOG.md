# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2026-08-19

### Added

- Dependency-free core models, geometry, and arrangement transforms
- A `DocumentRepository` application port with an IndexedDB v5 adapter
- Read-only v4 database import with validation, atomic v5 writes, and failure recovery tests

### Changed

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
- Shape, text, and image renderers now live behind a tested canvas renderer module, with a shared bounded LRU/TTL cache primitive
- Selection-box handles and the zoom indicator now live behind a focused overlay renderer while retaining the existing canvas drawing exports
- Canvas backgrounds and decorative grids now live behind a focused renderer with explicit cache invalidation while retaining the existing canvas drawing exports
- Minimap rendering and aggregate-bounds caching now live behind a focused renderer while retaining the existing canvas drawing exports
- Brush-specific stroke rendering, perfect-freehand outline caching, and calligraphy pooling now live behind a focused renderer while retaining the existing canvas drawing exports
- Canvas element editability, selection eligibility, writable-layer assignment, and bound-arrow history decisions now live behind tested pure rules
- Canvas element maps, position indexes, and spatial-index synchronization now share a tested collection boundary
- Copy, paste, and duplicate element planning now share a tested clipboard boundary with independent stroke samples
- Grouping and element lock metadata now use tested pure transforms that produce explicit history payloads
- Alignment and distribution now derive tested plans with complete before/after document snapshots
- Move, resize, and rotation now derive tested element plans, including bound-arrow synchronization and snapshot-versus-delta move history
- Layer deletion, visibility, locking, reordering, and element reassignment now derive tested plans outside the Zustand slice
- Element add, update, remove, and clear operations now use tested plans and shared runtime-index synchronization
- Element commits now share tested selection filtering, bounded undo history, and redo-clear decisions
- Undo and redo element transitions now live in a pure, tested history-transition boundary; the history slice retains runtime synchronization, viewport focus, feedback, and save coordination
- Document and folder record construction, schema normalization, ordering, duplication, and import transforms now live in a tested helper boundary; document management retains hydration, recovery, search-history, and persistence coordination
- Recovery-draft reconciliation now lives in a tested pure boundary; document management retains localStorage cleanup and recovery feedback coordination
- Recent document search parsing, persistence, and bounded deduplication now live in a tested helper boundary
- Runtime element-map and spatial-index rebuilding now lives in a tested helper boundary
- Current document workspace projection now lives in a tested helper boundary, keeping document management focused on workflow coordination
- Document persistence bootstrap, legacy migration, recovery reconciliation, and fallback preparation now share a tested initialization boundary

### Fixed

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
