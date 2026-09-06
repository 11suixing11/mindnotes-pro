# Roadmap

MindNotes Pro is maintained as a small, local-first whiteboard. Reliability work takes priority over feature count.

## Current priorities

1. Finish the v5.3 selection style editing work: reconcile the remaining e2e specs with the restructured toolbar and selection UI, then release.
2. Maintain repeatable 100/1,000/5,000-element performance baselines for render preparation, drag/zoom, hit testing, autosave snapshots, and export. Run `npm run benchmark` before release comparisons.
3. Expand malformed-import, migration, and recovery coverage so document failures are explicit and reversible.
4. Only after the preceding behavior is stable, reduce the size and responsibility of pointer, rendering, and canvas-mutation modules without changing user behavior.
5. Publish reproducible web and desktop releases, then add platform signing only when credentials and ownership are clear.

## Release gates

- `v5.1.0` (2026-09-06) shipped the former `v5.0.2`–`v5.2.0` scope together: the Space/input hotfix, import/clear safety, persistence status, recovery, keyboard/dialog foundations, the mobile core editor, and first-use recovery.
- Before each web release, run `npm run check`, `npm run test:e2e:run`, and `npm run benchmark`; retain the previous static publish directory for atomic rollback.
- PNG/PDF timings require the real browser export helper because jsdom has no Canvas encoder. Headless benchmark output marks those fields as `null` rather than presenting synthetic numbers.

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
