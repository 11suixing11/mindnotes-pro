# MindNotes Pro GitHub Maintenance Runbook

This file is an operational runbook for maintainers. It replaces the former growth plan and intentionally does not record live star, fork, issue, or response-time counts. Check GitHub directly when a current metric is needed.

## Operating principles

- Keep the project local-first: board data, backups, and recovery artifacts stay local unless a user explicitly exports them.
- Keep `main` releasable. Changes land through reviewed pull requests with passing required checks.
- Prefer small, reversible maintenance changes over broad refactors. Record compatibility and recovery behavior for persisted-data changes.
- Treat public issue and pull request content as public. Never request credentials, private board content, or full user backups.

## Weekly maintenance

1. Check the default branch, open pull requests, failed workflow runs, Pages deployments, and pending Dependabot updates.
2. Review dependency changes by risk: security fixes first, production major upgrades separately, then development-tool updates.
3. Triage new issues. Reproduce bugs when possible, request a minimal sanitized backup only when needed, and move vulnerability reports to `SECURITY.md`.
4. Check stale automation output. Keep milestone work and issues labeled `pinned`, `security`, `data-loss`, `long-term`, or `roadmap` out of automatic closure.
5. Remove merged feature branches after confirming that no active work still depends on them.

## Pull request gate

Reviewers should expect these checks before merging changes to `main`:

- `Lint`
- `Type Check`
- `Test`
- `Build`
- `E2E` for user-facing workflows
- `Lighthouse Audit` for web-facing changes

Use the checklist in [CONTRIBUTING.md](CONTRIBUTING.md) and `.github/PULL_REQUEST_TEMPLATE.md`. A failing or skipped assertion is not release evidence.

## Issue and label conventions

The issue forms use the labels `bug` and `enhancement`, which are maintained repository labels. The stale workflow expects these operational labels to exist when the workflow is enabled or updated:

- `stale`: temporary automation marker
- `pinned`: manually maintained, never stale
- `security`: vulnerability or security follow-up
- `data-loss`: possible loss or failed recovery
- `long-term`: intentionally deferred work
- `roadmap`: milestone or planning work
- `release-blocker`: pull request required for a release

Labels are metadata only; their descriptions should explain the maintainer action they trigger. Do not use a label as a substitute for a written issue or review decision.

## Dependency and security review

- Keep Dependabot updates grouped only when the group has one coherent risk profile. Verify production major upgrades independently.
- Run the repository checks and inspect migration/import behavior for changes touching Zustand, storage, backup schemas, or Electron boundaries.
- Keep secret scanning and push protection enabled. Report vulnerabilities privately through [SECURITY.md](SECURITY.md).
- Treat audit warnings as follow-up work unless the affected package is reachable in the shipped application; document the decision in the pull request.

## Release checklist

1. Confirm `package.json`, `package-lock.json`, `CHANGELOG.md`, and the intended release commit contain the same version.
2. Run `npm run check`, relevant Playwright journeys, and the desktop build when the release includes shell changes.
3. Create the `vX.Y.Z` tag from verified `main`; use `-rc`, `-beta`, or `-alpha` suffixes for pre-releases.
4. Let `.github/workflows/release.yml` produce the web archive, Linux AppImage, and `SHA256SUMS` file.
5. Verify the GitHub Release assets, release notes, tag, Pages deployment, and backup/migration warnings before announcing the release.

## Monthly review

- Re-check branch rules, CODEOWNERS, workflow permissions, and repository security settings.
- Close or archive obsolete pull requests and stale planning documents.
- Compare the roadmap with actual maintenance capacity; do not promise features that lack a testable failure and recovery plan.
- Review this runbook whenever the release process, branch policy, issue forms, or workflow names change.
