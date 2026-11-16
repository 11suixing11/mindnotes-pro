# MindNotes Pro

**Draw over your Windows apps from a floating toolbar, and keep reusable webpage notes.**

Version 6.0.0-beta.12 opens a small always-on-top button with a transparent screen annotation layer. Screen notes and anchored webpage notes share a local library. Webpage reading retains native Chromium and a separate injected annotation layer.

[中文](README_CN.md) · [日本語](README_JA.md)

## Current delivery

Beta.12 repairs two feedback defects reproduced in the actual beta.11 executable: an import reported success while storage failed, and recovery from an earlier page copy gave no notice. Imports now wait for a durable save; failure retains the merged notes for recovery export. Earlier-copy recovery gives a persistent notice, and storage errors remain visible alongside export receipts. Setup and Portable are built and verified. The actual executable passes 8 hidden integration, 8 storage-recovery and 10 crash-recovery stages; the 34 visible desktop journeys remain unexecuted. See [production readiness](PRODUCTION_READINESS_CN.md) for current evidence and remaining gates.

- The main repository is the single development source; the local beta.12 candidate is in `release/`, with [checksums](release/SHA256SUMS-beta12.txt) and [candidate notes](release/beta12-使用与验收说明.md). Beta.11 remains in `release/beta11-candidate/release`, with its source in `release/beta11-candidate/build-source-beta11.zip`. Earlier evidence and original documentation are in [the acceptance archive](tmp/qa/history/acceptance-through-beta11.zip).
- The website presents the product. The existing whiteboard remains at `?mode=whiteboard`, with its separate v5 storage and backup contract.
- Page annotation currently works inside the desktop app. There is no Chrome or Edge extension in this beta.

## Floating screen annotations

Launch the app, expand the small button, drag the toolbar into position and choose pen or highlighter. The eraser removes a whole touched stroke; undo/redo and reversible clear are available. Mouse mode passes clicks through to the underlying app; Esc returns to it. Collapse hides the ink and leaves a small draggable button. Alt+Shift+M toggles collapse when the shortcut is available.

Completed gestures save automatically as recoverable drafts. Save note captures the current screen with both floating windows hidden, and stores the original pixels, independent editable ink, source and time in the library. Add a conclusion, search, edit, export PNG/Markdown/JSON, or restore from trash. More also offers freeze/live and draft backup/restore. Esc hides a frozen image before passing clicks to the live desktop; choosing a brush returns to the frozen image. Moving the toolbar to another display selects that display's separate draft.

Screen annotations remain at screen coordinates while underlying apps move or scroll. Capture source names the visible window at the captured screen's center; a full screen can contain several apps. Ordinary Windows desktop apps are the intended scope; locked/protected desktops and exclusive fullscreen have system limits. Capture rejects a locked or protected desktop. Historical beta.6 acceptance covers 24 desktop tests on Windows 11, real capture, 150% / 100% mixed-DPI recovery, both ordinary fullscreen displays, three public articles, Portable and installer lifecycle. These results do not qualify beta.11. GAOMON 1060 Pro has partial beta.3 hardware evidence and a user-confirmed option-panel fix. See [production readiness](PRODUCTION_READINESS_CN.md) for final-package, signing, hardware and compatibility gates.

## Webpage notes

Choose More → My notes to open the unified library and webpage workspace. Closing that window or choosing Floating annotation returns to the small button. More → Exit stops the app.

Open an HTTP(S) URL. Browse normally, select text and capture excerpts, or switch to pen, highlighter and sticky notes. Add comments in the side panel and press Escape to return to browsing.

Annotations follow page scrolling and layout changes using DOM and text anchors. Reopening a page restores its notes. Search the local library, return to a source, export Markdown for tools such as Yuque and Obsidian, or export editable JSON for backup and another computer.

Missing, hidden, rewritten or ambiguous source text hides the affected page marks and shows their position status. Notes remain editable and exportable; marks return when their original anchor resolves. Internal scrolling, SPA navigation and recycled-node regressions are covered, with public-article acceptance on MDN, JavaScript.info and Runoob.

Legacy templates, shape arrangement and whiteboard layers remain on the compatibility route.

## Storage and recovery

Page notes live in `app.getPath('userData')/page-notes.json`, normally `%APPDATA%\mindnotes-pro\page-notes.json` on Windows. The portable executable also uses the local user-data directory; notes do not travel inside the exe.

Screen drafts and editable snapshots use `screen-notes.sqlite`, with WAL/FULL transactions in a serialized worker. Frozen backgrounds and drafts commit together. Screen backups use `mindnotes-pro.screen-notes`, version 1, with original PNG and editable strokes. Imports stream one entry at a time, validate the entire file, roll back late failures and preserve newer edits. Limits are 256 MB / 10,000 notes, 32 MB / 40 million pixels per image, and 1,000 strokes / 160,000 points per note. Draft recovery has a separate format; replacing a nonempty draft first keeps a local recovery copy.

Page writes are serialized, fsynced and atomically replace the current file. A valid prior file is kept as `.previous`. Startup tries both copies; unreadable originals are retained. Normal close and navigation wait for registered pending edits. Screen edits combine changed fields and retain failures; a failed save keeps the editor open with retry, current-edit recovery export and a native abnormal-exit confirmation.

Markdown contains excerpts, comments and source links. Full ink geometry and editable positions require JSON. The JSON format is `mindnotes-pro.page-notes`, version `1`; imports merge pages and annotation IDs while retaining newer edits. Import limits are 20 MB, 2,000 pages and 20,000 annotations in total.

There are no accounts, hosted sync or collaborative editing. The app saves notes and excerpts rather than an offline copy of the source website; reopening sources may require network access and login. Export and import JSON to transfer notes.

The legacy whiteboard keeps its `mindnotes-pro-v5` IndexedDB data at the browser origin and imports v4 read-only. Its JSON import replaces the single board and is separate from page-note backup merging.

## Development

Requires Node.js `>=22.22.2` and npm.

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm ci --include=dev
npm run dev:desktop
```

| Command                 | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `npm run dev`           | Develop the website on localhost:3000                                    |
| `npm run dev:desktop`   | Run Vite and the Electron annotation app                                 |
| `npm run check`         | Lint, types, dependency boundaries, unit/storage tests and web build     |
| `npm run test:storage`  | Real SQLite/JSON durability, migration, corruption and streaming backups |
| `npm run test:e2e`      | Chromium landing-page and legacy whiteboard journeys                     |
| `npm run test:desktop`  | Build production assets and run real Electron journeys                   |
| `npm run build:windows` | Build Windows x64 NSIS and portable artifacts, without publishing        |
| `npm run build:desktop` | Package the current desktop platform                                     |
| `npm run test:coverage` | Run the existing unit coverage gate                                      |

Run `npx playwright install chromium` before the first web E2E run. If a machine sets `NODE_ENV=production` globally, override it with `test` for unit tests and use `production` for final packaging. Artifacts are written to `release/`.

After packaging beta.12, set `MINDNOTES_EXECUTABLE` to `release/win-unpacked/MindNotes Pro.exe` and run `npx playwright test --config=playwright.desktop.config.ts --output=tmp/qa/beta12-final-desktop/desktop`. Tests isolate their data in workspace temporary directories and require coordinated desktop input time.

Root `dist` and `dist-electron` are regenerated by source checks. Old candidate copies, duplicate dependencies and obsolete outputs were removed in the workspace cleanup. Beta.2 Setup remains because the installer upgrade test uses it. Historical beta.11 reports retain their original hashes; hidden DOM/CDP actions and generated fixtures do not establish visible compositor, physical pen or sustained-input acceptance.

Ten additional [hidden crash-recovery stages](tmp/qa/hidden-crash-beta11-final.json) pass on beta.11: page reload, bounded shell recovery, continued editing, single-instance startup, overlay input release, toolbar-crash exit and exact saved-data restart. All four processes exit normally. The test checks page subscription state through the real preload; hidden animation-frame rendering and automatic shell layout remain outside its accepted scope.

## Architecture and limits

`src/notes` owns shared models, history, overlays, the unified library and editors. `electron/floatingController.mts` owns floating windows, durable drafts, input pass-through and capture. A SQLite worker owns screen notes; `electron/main.mts` owns the native webpage view and lifecycle. Remote webpages have no Node access; sandboxing, context isolation and main-frame sender checks stay enabled.

Cross-origin frames, virtual lists and heavily rewritten sources may not restore anchors exactly. This remains a beta until beta.12 visible package workflows, publisher signing, Windows 10 and final-package native pen/touch acceptance are complete. See [production readiness](PRODUCTION_READINESS_CN.md), [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md) and the [Chinese refactor report](REFACTOR_NOTES_CN.md).

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [CHANGELOG.md](CHANGELOG.md).

[MIT](LICENSE)
