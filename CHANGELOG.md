# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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