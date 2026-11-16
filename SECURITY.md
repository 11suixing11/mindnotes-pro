# Security Policy

MindNotes Pro v6 provides floating Windows screen annotations and anchored webpage notes. Both stay in a local library. User-requested screen-note saving stores a screenshot and editable ink locally; PNG export composites them locally. Remote websites run in a native Chromium view; the application does not provide a screenshot-upload, note-upload or analytics service.

## Trust boundaries

- The local React shell and untrusted webpage run in separate webContents with separate preloads.
- Node integration is disabled. Context isolation and sandboxing are enabled.
- File export dialogs and local note storage are controlled by the main process and restricted to the trusted shell's main-frame IPC sender.
- Floating toolbar and screen layer have separate restricted preloads and main-frame sender checks. Screen input is released in mouse mode, collapse, lock/suspend and renderer failure. Completed screen strokes persist as bounded per-display drafts; undo history remains temporary.
- PNG capture hides both floating windows and uses a selected display source; compositing runs only in the local trusted renderer and the main process writes the selected file. Remote pages cannot request captures or receive screen pixels.
- The remote-page bridge can only receive that active page's overlay state and submit validated annotation operations. It cannot select file paths, export the whole library or invoke trusted shell APIs.
- An injected layer runs inside the page. The visited website may observe or interfere with its DOM and page-specific annotations; do not assume annotation content is hidden from the annotated website.
- Only HTTP(S) page URLs are accepted. Unsupported navigation and unexpected shell windows are blocked. No certificate or permission bypass is enabled.
- Since beta.6, source and packaged modules explicitly deny remote-page permission checks and requests, device permission and display-media requests. Historical beta.11 hidden main/WebContentsView/preload checks confirm denial and annotation persistence for that package. Current beta.12 still requires final-package and visible desktop acceptance; historical checks do not qualify it.
- Browser login state is stored locally in the app's persisted webpage session. Notes and session data are not embedded in the portable exe.

## Data handling

Page-note JSON import is size-limited and validates format, version, URLs, annotations, text and coordinates before merging. Imported text is rendered as text, not executable HTML.

Local writes use a temporary file and serialized replacement, with a validated prior recovery copy. Unreadable originals are preserved. JSON backups can contain source URLs, excerpts and private comments; share them deliberately.

Screen notes and frozen drafts use SQLite in a serialized worker with WAL/FULL transactions. Worker failure and future-schema/corruption checks protect originals. Screen imports validate the entire bounded stream, image decoding and duplicate IDs inside one transaction; a late error rolls back all entries. Exports fsync and replace the target atomically. Normal close/navigation awaits pending edits; failure keeps edits visible with retry and current-edit recovery export. Locked/protected desktops are rejected for screen capture.

Local files and screenshots are not encrypted. Backup files may contain private screen content and original pixels even when exported ink hides part of them. The visited site may access page-specific annotations as described above; screen-note library content is not provided to it.

The compatibility whiteboard retains its separate IndexedDB schema, migration and document-import safeguards.

## Supported version

The `main` branch is actively maintained. Current development is beta.12, which corrects failed-import success feedback and adds a persistent earlier-copy recovery notice. Source and storage checks pass; packaging, 34 visible desktop journeys, distribution lifecycle, physical devices, sustained input and publisher signing remain pending. Beta.11 and earlier reports are historical evidence. Production gates and retained artifacts are tracked in [PRODUCTION_READINESS_CN.md](PRODUCTION_READINESS_CN.md).

## Reporting a vulnerability

Please do not post exploit details in a public issue. Use GitHub private vulnerability reporting when available:

https://github.com/11suixing11/mindnotes-pro/security/advisories/new

If unavailable, use the maintainer's public GitHub contact information and include a description, reproduction steps, impact, affected version/platform and any suggested fix.

Relevant issues include remote-to-shell privilege escalation, IPC sender bypass, imported-content script execution, unexpected note uploads, file path access, note corruption and reachable dependency vulnerabilities.
