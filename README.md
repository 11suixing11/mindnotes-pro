<div align="center">
  <img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />

# MindNotes Pro

**A local-first whiteboard for fast visual thinking.**

Open it, draw, organize, export. No account, no cloud dependency, no tracking.

  <p>
    <a href="https://11suixing11.github.io/mindnotes-pro">
      <img src="https://img.shields.io/badge/Try_MindNotes_Pro-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="Try MindNotes Pro" />
    </a>
    <a href="#quick-start">
      <img src="https://img.shields.io/badge/Quick_Start-2ECC71?style=for-the-badge" alt="Quick Start" />
    </a>
  </p>

  <p>
    <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml">
      <img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
    </a>
    <img src="https://img.shields.io/badge/version-3.2.0-00C9A7?style=flat-square" alt="Version 3.2.0" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6" />
    <img src="https://img.shields.io/badge/runtime_dependencies-5-green" alt="5 runtime dependencies" />
  </p>

  <p>
    <strong>Languages:</strong>
    English ·
    <a href="README_CN.md">中文</a>
  </p>
</div>

---

## What Is This?

MindNotes Pro is a browser-based whiteboard for personal notes, sketches, diagrams, and quick thinking sessions. It is intentionally local-first: your documents are stored in your browser, the app can work offline as a PWA, and the core drawing experience does not require a server.

This project is not trying to replace Miro, Excalidraw, tldraw, or a full collaborative design suite. It aims to be smaller and easier to reason about: a fast canvas, useful editing tools, dependable local persistence, and an implementation that contributors can actually read.

## Highlights

| Area | What You Get |
| --- | --- |
| Drawing | Pressure-friendly freehand strokes, multiple brush presets, shapes, arrows, text, pasted images |
| Editing | Selection, multi-select, move, resize, rotate, duplicate, lock, group, ungroup, align, distribute |
| Layers | Create, rename, reorder, hide, lock, delete layers, and move selected elements between layers |
| Templates | Built-in flowchart, mind map, wireframe, network diagram, and Cornell notes templates; save custom templates from selected elements |
| Documents | Multiple local documents, folders, previews, search, sort, rename, duplicate, and auto-save |
| Export | PNG, JPEG, PDF, SVG, Word, and JSON backup/export; JSON import for existing canvas data |
| Productivity | Customizable keyboard shortcuts, quick color presets, style eyedropper, grid and snap controls |
| Local-first | Runs in the browser, installs as a PWA, stores data locally, and has an optional Electron desktop shell |

## Core Features

### Whiteboard Tools

- Freehand drawing with brush presets powered by `perfect-freehand`
- Shape tools for rectangles, circles, lines, and arrows
- Rich text elements with inline editing and formatting controls
- Clipboard image paste
- Canvas pan, zoom, minimap/Eagle Eye, grid, and snap support
- Light and dark themes

### Layered Editing

MindNotes Pro includes a compact layer panel for organizing complex canvases.

- New elements are assigned to the active writable layer
- Hidden layers are skipped by rendering, hit testing, selection, export previews, and exports
- Locked layers prevent movement, deletion, resize, rotation, grouping, and other destructive edits
- Deleting a layer moves its elements to a fallback layer instead of silently deleting user content
- Legacy documents are normalized into a default layer when opened

### Templates

Use built-in templates when you need structure quickly:

- Flowchart
- Mind map
- Dashboard wireframe
- Network diagram
- Cornell notes

You can also turn selected canvas elements into reusable custom templates. Custom templates are stored locally and capped to keep the app lightweight.

### Export And Backup

Supported export paths:

- `PNG` with transparent background
- `JPEG` with adjustable quality and file-size estimate
- `PDF` with page size based on the canvas
- `SVG` using the canvas element model
- `Word` document with an embedded canvas snapshot
- `JSON` backup including elements and layer metadata

JSON import supports current MindNotes Pro data and some legacy stroke/shape payloads.

## Privacy And Data

MindNotes Pro stores canvas documents in browser storage. The app does not require registration and does not upload your drawings to an application server.

That tradeoff matters:

- Clearing site data can remove your documents
- Switching browsers or devices does not automatically sync content
- Important work should be exported as JSON, PNG, SVG, or PDF
- Very large canvases may eventually need a stronger persistence layer than `localStorage`

If you need real-time collaboration, team workspaces, cloud history, or account-based sync, a larger collaborative whiteboard product is currently a better fit.

## Quick Start

### Use The Hosted App

Open the live app:

https://11suixing11.github.io/mindnotes-pro

### Run Locally

Prerequisites:

- Node.js matching the `package.json` `engines.node` field
- npm

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm ci
npm run dev
```

Vite opens the app automatically. If it does not, visit:

```text
http://localhost:3000
```

### Build For Production

```bash
npm run build
npm run preview
```

### Run The Desktop Shell

```bash
npm run dev:desktop
```

Desktop packaging is available through Electron Builder:

```bash
npm run build:desktop
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Run TypeScript check and production build |
| `npm run preview` | Preview the production build |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run the full Vitest suite once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint on `src/**/*.{ts,tsx}` |
| `npm run dev:desktop` | Start Vite and Electron together |
| `npm run build:desktop` | Build the web app and package Electron |

## Keyboard Shortcuts

Press `?` or `F1` in the app to view the full shortcut list. Most shortcuts can be customized from the shortcut settings panel.

| Shortcut | Action |
| --- | --- |
| `0` | Select tool |
| `1` | Pen tool |
| `2` | Eraser tool |
| `3` | Pan tool |
| `4` / `5` / `6` / `7` / `8` | Rectangle / Circle / Text / Line / Arrow |
| `Ctrl` + `Z` | Undo |
| `Ctrl` + `Shift` + `Z` or `Ctrl` + `Y` | Redo |
| `Ctrl` + `C` / `Ctrl` + `V` | Copy / Paste |
| `Ctrl` + `Shift` + `V` | Paste as plain text |
| `Ctrl` + `D` | Duplicate selected elements |
| `Ctrl` + `G` / `Ctrl` + `Shift` + `G` | Group / Ungroup |
| `Ctrl` + `L` / `Ctrl` + `Shift` + `L` | Lock / Unlock selected elements |
| `+` / `-` | Zoom in / out |
| `Ctrl` + `0` | Reset view |
| `Ctrl` + `2` | Zoom to selection |
| `Shift` + `G` | Toggle grid |
| `Shift` + `S` | Toggle grid snap |
| `Q` | Style eyedropper |
| `Esc` | Cancel current mode |

## Tech Stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript 6 |
| State | Zustand slices |
| Drawing | Canvas API, `perfect-freehand` |
| Spatial queries | Custom R-tree-style spatial index for eraser and viewport queries |
| Export | Canvas export APIs, SVG serializer, lazy-loaded `jsPDF` |
| Styling | Tailwind CSS and project CSS variables |
| PWA | Web manifest and service worker |
| Desktop | Electron and Electron Builder |
| Tests | Vitest, Testing Library, jsdom, Playwright configuration |
| Build | Vite 8 |

The current runtime dependency set is deliberately small:

- `react`
- `react-dom`
- `zustand`
- `perfect-freehand`
- `jspdf`

## Project Structure

```text
src/
├── canvas/        Drawing-domain helpers, brush presets, SVG export, geometry rules
├── components/    React UI, canvas hooks, toolbar, sidebar, layers, templates, export UI
├── eraser/        Physics eraser engine, particles, audio, preferences, spatial index
├── keyboard/      Shortcut definitions and conflict handling
├── store/         Zustand slices, persistence, migrations, app types, layer helpers
├── templates/     Built-in and custom template model
├── App.tsx        Main app composition
└── main.tsx       Web entry

electron/
└── main.ts        Optional desktop shell entry
```

For deeper boundary notes, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Quality

The repository has automated checks for pull requests and main branch changes:

- TypeScript check
- Vitest test suite
- ESLint
- Production build
- GitHub Pages deployment
- Lighthouse audit

For local changes, run `npm run test:run`, `npm run lint`, and `npm run build` before opening a pull request.

## Roadmap

The next useful work is mostly about reliability and polish, not adding a large cloud product surface.

- Move large-document persistence toward IndexedDB or another storage layer with better capacity
- Improve mobile, tablet, and pen-device ergonomics
- Strengthen accessibility for toolbar, dialogs, menus, and keyboard-only workflows
- Harden JSON/SVG/PDF import and export edge cases
- Continue reducing lint warnings and splitting large mixed-responsibility modules
- Improve Electron packaging and release automation

Non-goals for the current project direction:

- Required accounts
- Server-side document storage
- Real-time multiplayer collaboration
- Analytics that inspect drawing content

## Contributing

Issues and pull requests are welcome. The most helpful contributions are specific and reproducible:

- Bug reports with steps, expected behavior, actual behavior, browser/OS, and screenshots when useful
- Feature requests that explain the workflow, not just the UI control
- Small pull requests with tests for changed behavior
- Documentation updates that correct inaccurate behavior, setup, or architecture notes

Useful links:

- [Contribution guide](CONTRIBUTING.md)
- [Architecture notes](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Product feedback discussion](https://github.com/11suixing11/mindnotes-pro/discussions/97)

## License

MindNotes Pro is released under the [MIT License](LICENSE).
