## Summary

Describe the user or maintainer problem, the chosen change, and why this scope is appropriate.

## Related issue

Closes #

## Change type

- [ ] Bug fix
- [ ] Feature
- [ ] Documentation
- [ ] Refactor
- [ ] Test
- [ ] Build, CI, or tooling
- [ ] Performance

## Behavior and risk

Before:

After:

Main failure or regression risks:

## Verification

- [ ] `npm run check`
- [ ] `npm run test:e2e` for a user-facing workflow
- [ ] Desktop and mobile browser check for responsive UI
- [ ] Electron launch check for desktop-shell changes
- [ ] Import/export recovery check for persisted-data changes

List the exact commands, targeted tests, and manual flows that were run. If something was not run, explain why.

## Product boundary

- [ ] User data remains local unless a new network behavior is explicitly documented and reviewed.
- [ ] Persisted-data changes include compatibility and failure handling.
- [ ] New templates or tools remain editable after insertion or creation.
- [ ] No test relies on conditional skipping to hide a failed workflow.
- [ ] UI changes include a current screenshot or recording when it helps review.

## Reviewer notes

Call out the files, tradeoffs, or assumptions that need the closest review.
