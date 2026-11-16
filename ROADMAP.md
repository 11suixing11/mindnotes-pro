# Roadmap

MindNotes Pro supports Windows screen annotations and webpage reading as equal workflows, with a unified local library. Current development is `6.0.0-beta.12`.

## Current scope

- Small always-on-top entry button, floating toolbar, transparent screen ink, mouse pass-through and reliable input release.
- Pen, highlighter, whole-stroke eraser, undo/redo, reversible clear, display-local draft recovery and freeze/live capture.
- Editable screen snapshots with source/time, and webpage annotations anchored to DOM/text with explicit unresolved-position status.
- One local library for search, excerpts, conclusions, comments, continued editing, trash recovery and reusable PNG/Markdown/JSON exports.
- Validated backups, durable import receipts, retained failed edits and visible earlier-copy recovery notices.
- Windows x64 installer and portable executable; a website introducing the product.

The existing whiteboard remains at `?mode=whiteboard` with its separate v5 data, migration, backup contracts and regression tests.

## Next priorities

1. Complete the 34 visible desktop journeys against the beta.12 package now built and verified in `release/`. Hidden integration, storage-recovery and crash-recovery checks have passed; visible input time remains to be coordinated.
2. Complete public-article, ordinary fullscreen, mixed-DPI capture, installation/upgrade/uninstall and sustained-input recovery acceptance.
3. Validate physical pen/touch, Windows 10, real lock/sleep/display transitions, visible layout and first-use workflows.
4. Gather feedback on excerpt-to-comment and Markdown reuse in Yuque or Obsidian; improve ambiguous anchors without losing notes.
5. Prepare a signed Windows release when maintainer-owned credentials are available. Consider a Chrome / Edge extension after the desktop workflow is reliable.

Track exact artifact hashes, accepted scope and remaining gates in [production readiness](PRODUCTION_READINESS_CN.md). Historical reports are retained in [the acceptance archive](tmp/qa/history/acceptance-through-beta11.zip).

## Release gates

- Run `npm run check`, `npm run test:e2e` and the relevant desktop journeys.
- Build Windows artifacts with `npm run build:windows`, which never publishes, and verify package contents and SHA256.
- Test the packaged executable and Portable with isolated workspace data, then complete the physical-device and usability checks above.
- Include usage instructions and checksums with shareable packages; publishing remains a separate action.

## Product boundaries

No hosted accounts, cloud storage, multiplayer editing, note-content analytics, offline website archiving or broad design-suite expansion. The compatibility whiteboard retains its existing behavior; new work should improve screen explanation, reading, note reuse or recovery.
