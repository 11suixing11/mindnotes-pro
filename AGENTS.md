# MindNotes Pro

Floating Linux and Windows screen annotations and local-first reusable webpage notes. Current development and validation in this workspace target Linux; Windows development and native acceptance continue in a Windows environment. The v6 Electron desktop app starts with a small always-on-top button and transparent screen layer. Both screen notes and anchored webpage notes belong in the unified local library. A native Chromium webpage with an injected annotation layer stays separate from the trusted React shell. The website presents this product; the v5 whiteboard remains at `?mode=whiteboard`.

## Workspace files

- This repository is the single development source in the parent `mindnotespro工作区` workspace. Keep new project files inside that workspace; follow its `AGENTS.md` for file placement.
- Write temporary scripts and outputs under `tmp/<task>/`; set process-local `TEMP` and `TMP` to a workspace directory for project commands that create temporary files. Store builds under `release/` without copying the entire repository and dependencies for each beta.
- Current UI styles are defined by `src/notes/notes.css`, `src/notes/FloatingToolbar.tsx` and the active components. Preserve the separate compatibility whiteboard styles in `src/index.css`.
- `tmp/qa/history/acceptance-through-beta11.zip` contains historical acceptance records and their original documentation. It does not qualify the current beta. `release/beta11-candidate/build-source-beta11.zip` retains the source of the last packaged beta; active development uses this repository.

## Project Structure

```
src/
├── notes/               # Page-note models, overlay, history, desktop UI and web landing page
├── core/                # Pure models, geometry, and arrangement algorithms
├── canvas/              # Canvas rendering, brushes, and export helpers
├── components/
│   ├── app/             # App lifecycle and status UI
│   ├── canvas/          # Canvas component + hooks (renderer, pointer, selection, keyboard, text editor)
│   ├── confirm-modal/   # Confirmation dialogs
│   ├── context-menu/    # Selection and canvas context menus
│   ├── export-menu/     # Visual and JSON import/export
│   ├── layers/          # Layer management panel
│   ├── templates/       # Built-in and custom template UI
│   ├── toast/           # Toast notifications
│   └── toolbar/         # Tool selection, color picker, brush selector
├── eraser/              # Geometric erasing and spatial index
├── keyboard/            # Shortcut definitions and matching
├── store/
│   ├── slices/          # Zustand slices and pure state transforms
│   ├── appStore.ts      # Main store combining all slices
│   ├── saveManager.ts   # Auto-save logic
│   ├── storage.ts       # IndexedDB storage and legacy decoding
│   ├── migration.ts     # Data migration
│   └── types.ts         # TypeScript types
├── templates/           # Template definitions and transforms
└── App.tsx / AppWrapper.tsx / main.tsx
```

## Development Commands

```bash
npm run dev          # Start dev server on port 3000
npm run dev:linux    # Linux Electron + Vite; normal Chromium sandbox required
npm run build        # tsc + vite build
npm run test         # vitest (watch mode)
npm run test:storage # Real SQLite/JSON persistence, migration, failures and streamed backups
npm run test:run     # vitest (single run)
npm run lint         # ESLint over app, Electron and E2E source
npm run check        # Full lint, typecheck, boundaries, unit tests and web build
npm run test:e2e     # Web landing and compatibility whiteboard journeys
npm run test:desktop # Production assets + real Electron annotation journeys
npm run test:linux   # Owned virtual X11 Linux suite; explicit --allow-visible
npm run build:linux  # Linux x64 AppImage + deb in release/linux, never publishes
npm run build:windows # Windows x64 NSIS + portable, never publishes
```

## Environment Notes

- Read `LINUX_DEVELOPMENT_CN.md` for Linux source launch, runtime setup, diagnostic scope and current acceptance limits. Linux with DISPLAY defaults to Electron x11/XWayland unless the caller explicitly selects Ozone; native Wayland opens the local workspace and guards floating entry.
- Linux mouse mode temporarily hides the overlay and ink to release WM-managed frame input/focus; pen mode restores the same canonical ink and draft. Keep this platform hint separate from errors and recovery messages. Windows retains its existing live-ink policy.
- Linux capture and drawing require the current UID's verified active, unlocked logind x11/wayland user session. `loginctl` and `gdbus` are runtime dependencies; unknown/locked/inactive state releases input and refuses capture, while local library access remains available.
- Normal source and product launch must not silently add `--no-sandbox`. Sandbox privileges on this host are deferred until installation; isolated `--diagnostic-no-sandbox` is limited to the task-owned authenticated virtual DISPLAY90 and is not kernel sandbox acceptance. Do not change helper ownership, system settings or AppArmor during source development.
- Use the standalone Linux native suite on the owned display with a WM. Never run its native input/capture against user DISPLAY0/1. Xvfb results do not qualify GNOME compositor transparency, native Wayland pixels, portal shortcuts, physical pen or mixed DPI.
- Run tests with `NODE_ENV=test` on machines where `NODE_ENV=production` is set globally;
  otherwise React loads its production build and every component test fails with
  `React.act is not a function`.
- If the user-level `.npmrc` sets `omit=dev`, install with `npm ci --include=dev`, or the
  dev toolchain (vite, vitest, playwright) will be missing.

## Architecture

- **Page notes**: `src/notes/model.ts` owns validated JSON and Markdown; `electron/notesWorkspace.mts` owns active-page state and history; `notebookRepository.mts` owns serialized local saves, atomic replacement and `.previous` recovery.
- **Native browser**: `electron/main.mts` owns `WebContentsView`; shell and remote webpage use separate restricted preloads. Keep context isolation, sandboxing and sender checks intact.
- **Floating screen**: `electron/floatingController.mts` owns transparent windows, display-local ink, native input pass-through, shortcuts, freeze/live capture and reliable draft saves. `screenInk.ts` owns geometry/history; `floating.ts` owns typed IPC. Mouse mode, lock/suspend and failures must release native input. Captures hide both floating windows and reject protected desktops.
- **Screen notebook**: `screenNotebook.ts` owns validated contracts; `screenNotebookRepository.mts` coordinates a serialized SQLite worker with WAL/FULL durability. `screenBackup.mts` streams imports inside one transaction; `localFiles.mts` bounds reads and atomically writes exports. Native file paths belong only to trusted IPC. Save queues must retain failed fields and flush before closing or navigating.
- **Product scope**: Two equal workflows: desktop explanation with screen pen/highlighter, whole-stroke eraser, freeze/live, automatic draft recovery and editable snapshots; webpage reading with anchored annotations, excerpts and comments. Both share search and reusable exports. Keep the small entry and at least 44px interactive targets. No new whiteboard features are part of the v6 core workflow.
- **Validation**: Read `ARCHITECTURE.md`; behavior changes require `npm run check`, and visible workflow changes also require the relevant web or desktop E2E suite. Tests remain co-located with source, except complete user journeys in `e2e`.
- **Legacy whiteboard**: The following store, drawing and export rules apply to the compatibility route; preserve its separate v5 data and migration contracts.
- **State**: Zustand store with 5 slices; the canonical board is auto-persisted to IndexedDB via saveManager
- **Drawing**: perfect-freehand for strokes, custom canvas rendering
- **Styling**: Tailwind CSS with custom Monet-inspired color palette
- **Export**: jsPDF for PDF export (dynamically imported)
- **Testing**: Vitest + jsdom + @testing-library/react

## Conventions

- TypeScript strict mode enabled
- No unused locals/parameters (enforced by tsc)
- Component files: PascalCase (e.g., `Canvas.tsx`)
- Hook files: camelCase with `use` prefix (e.g., `useCanvasRenderer.ts`)
- Store slices in `src/store/slices/`
- Test files co-located with source (e.g., `foo.test.ts`)
- Barrel exports via `index.ts` in component directories
