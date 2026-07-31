# Roadmap

MindNotes Pro is maintained as a small, local-first whiteboard. Reliability work takes priority over feature count.

## Current priorities

1. Reduce the size and responsibility of pointer, rendering, and canvas-mutation modules without changing user behavior.
2. Improve keyboard-only and screen-reader workflows across canvas editing, menus, dialogs, layers, and document management.
3. Establish repeatable large-document performance measurements for rendering, hit testing, autosave, and export.
4. Expand malformed-import, migration, and recovery coverage so document failures are explicit and reversible.
5. Publish reproducible web and desktop releases, then add platform signing only when credentials and ownership are clear.

## Later

- Better touch and stylus ergonomics backed by device testing.
- More template categories only when each template remains editable and useful after insertion.
- More import/export formats only when round-trip behavior and failure handling can be tested.
- Smaller style ownership boundaries as related UI is changed.

## Non-goals

- Real-time multiplayer collaboration.
- Account systems or hosted cloud storage.
- Analytics that inspect drawing content or user documents.
- Simulated eraser wear, particles, audio, or other effects that make erasing less predictable.
- Feature parity with large hosted design suites.

New proposals should explain which current workflow they improve, how failure is recovered, and what automated evidence will keep the behavior working.
