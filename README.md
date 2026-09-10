<div align="center">
  <img src="public/icons/icon-192x192.png" width="88" alt="MindNotes Pro icon" />
  <h1>MindNotes Pro</h1>
  <p><strong>A local-first whiteboard. No account. Data stays in your browser. Works offline.</strong></p>
  <p>Open the canvas and work. 183kB gzip first paint. MIT licensed.</p>
  <p>
    <a href="https://11suixing11.github.io/mindnotes-pro"><strong>Open the web app</strong></a>
    ·
    <a href="README_CN.md">中文</a>
    ·
    <a href="README_JA.md">日本語</a>
  </p>
  <p>
    <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
    <img src="https://img.shields.io/badge/version-5.1.1-0f766e" alt="Version 5.1.1" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2563eb" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/storage-local--first-16a34a" alt="Local-first storage" />
    <img src="https://img.shields.io/badge/bundle-183kB_gzip-8b5cf6" alt="183kB gzip" />
    <img src="https://img.shields.io/badge/offline-PWA-0ea5e9" alt="Offline PWA" />
  </p>
  <p>
    <em>Not trying to replace Miro or Excalidraw. Validating if a private, single-board whiteboard is useful for quick sketches, class notes, and visual thinking.</em><br/>
    Feedback wanted: <a href="https://github.com/11suixing11/mindnotes-pro/discussions/97">Discussions #97</a>
  </p>
</div>

<p align="center">
  <img src=".github/mindnotes-pro-v5.png" width="900" alt="MindNotes Pro v5 with an editable flowchart selected on the canvas" />
</p>

## Why this exists after tldraw went paid

In Sep 2025, tldraw SDK moved to a paid commercial license for production use. Excalidraw stays MIT with 90k+ stars. MindNotes Pro explores a third path: **a super focused, single-board, 100% local whiteboard** – not a collaboration suite.

- No account, no cloud, no tracking – data in `mindnotes-pro-v5` IndexedDB
- Offline PWA after first load, plus sandboxed Electron shell
- Honest bundle: ~183kB gzip first paint, jspdf lazy-loaded
- MIT, self-hostable with just static files

If you need team collaboration, use Excalidraw. If you need a private scratchpad that opens in <1s and never phones home, try this.

## What v5 delivers

MindNotes Pro starts on a blank, immediately usable canvas. It focuses on a small set of complete workflows instead of disconnected demos.

| Area        | Current behavior                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Drawing     | Freehand brush presets, pressure-aware strokes, rectangles, circles, lines, arrows, text, and images        |
| Editing     | Selection, move, resize, rotate, group, lock, copy/paste, undo/redo, and predictable partial-stroke erasing |
| Workspace   | One focused board with layers, backgrounds, grid, snapping, and zoom                                        |
| Templates   | Five built-in editable templates plus reusable custom templates made from canvas content                    |
| Persistence | The current board is autosaved in IndexedDB, with preferences and custom templates stored locally           |
| Portability | Full-content PNG, JPEG, PDF, and SVG exports; strict v5 JSON backups; v4, v3, and legacy JSON import        |
| Runtimes    | Responsive browser app, installable offline PWA, and a sandboxed Electron desktop shell                     |

## Local-first means local

- The current board is stored in the browser origin's IndexedDB database, `mindnotes-pro-v5`.
- v4 documents are imported read-only on first startup when available; the original `mindnotes-pro-v4` database is never deleted.
- The app does not provide an account system, hosted sync, or real-time collaboration.
- Clearing browser site data can remove the local board. Export a JSON backup for important work.
- JSON import replaces the current board in place; it never opens a second board.
- A previous `mindnotes-drawing-data` local-storage document is migrated on the first empty v5 startup when possible.

## Quick start

Requirements: Node.js `>=22.22.2` and npm.

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm ci
npm run dev
```

Vite serves the app at [http://localhost:3000](http://localhost:3000).

## Useful commands

| Command                 | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `npm run dev`           | Start the browser development server                       |
| `npm run build`         | Type-check and build the web app                           |
| `npm run preview`       | Preview the production web build                           |
| `npm run test:run`      | Run the Vitest suite once                                  |
| `npm run test:coverage` | Run unit and integration tests with coverage thresholds    |
| `npm run test:e2e`      | Build and run critical Chromium user journeys              |
| `npm run lint`          | Run ESLint over the application source                     |
| `npm run check`         | Run lint, tests, web build, and Electron type-checking     |
| `npm run dev:desktop`   | Start Vite and the Electron shell together                 |
| `npm run build:desktop` | Build the web app and package the current desktop platform |

Install the Playwright browser once before the first local E2E run:

```bash
npx playwright install chromium
```

## Export and recovery

Visual exports are rendered from the complete visible document bounds, not from the current pan and zoom. PNG keeps transparency; JPEG and PDF use the document background; SVG keeps vector content where possible.

The v5 JSON backup contract is intentionally explicit:

```json
{
  "format": "mindnotes-pro-backup",
  "version": 5,
  "exportedAt": "2026-07-31T00:00:00.000Z",
  "document": {
    "title": "Project board",
    "elements": [],
    "layers": [],
    "activeLayerId": "layer-default",
    "bgColor": "#ffffff",
    "backgroundStyle": "plain"
  }
}
```

Malformed or unsupported backups fail with a visible error. Importing does not silently discard the open document.

## Architecture

```text
src/
├── canvas/        Rendering, geometry, brushes, and export helpers
├── components/    React UI and browser interaction orchestration
├── eraser/        Simple geometry eraser and spatial index
├── keyboard/      Shortcut definitions and matching
├── store/         Zustand slices, IndexedDB persistence, schema, and backups
└── templates/     Built-in and custom editable templates

electron/
└── main.mts       Minimal sandboxed desktop shell

e2e/               Playwright critical user journeys
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for ownership rules and current refactor priorities.

## Product boundary

The project deliberately does not include hosted cloud storage, accounts, telemetry over document content, or real-time multiplayer editing. Those features would change the privacy and maintenance model and are not current goals.

The highest-priority engineering work is reliability: smaller pointer/rendering modules, stronger accessibility, large-document performance evidence, and release automation. See [ROADMAP.md](ROADMAP.md).

## Contributing

Focused bug fixes, regression tests, accessibility improvements, and clear documentation changes are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Security reports should follow [SECURITY.md](SECURITY.md). Project changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
