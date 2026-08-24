# Contributing to MindNotes Pro

MindNotes Pro is a local-first whiteboard. Contributions should keep user data private by default, behavior predictable, and the code reviewable.

## Good contributions

- Reproduce and fix a specific canvas, persistence, template, or export bug.
- Add a regression test for a real failure mode.
- Improve keyboard or assistive-technology access.
- Simplify a large module behind existing behavior tests.
- Correct documentation that no longer matches the product.

Feature proposals should identify the user workflow, failure behavior, data impact, and maintenance cost. A disconnected demo is not enough.

## Before opening an issue

Search existing issues first. Include:

- Expected and actual behavior.
- Minimal reproduction steps.
- Browser or desktop runtime, operating system, and input device.
- Whether the problem also occurs in a private browser window.
- A short recording for pointer, zoom, selection, template, or export problems.
- A sample JSON backup only after removing private content.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Development setup

Requirements: Node.js `>=22.22.2` and npm.

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm ci
npm run dev
```

Install Chromium once before running browser tests:

```bash
npx playwright install chromium
```

## Pull request workflow

1. Create a branch from `main`.
2. Keep the change focused on one behavior or ownership boundary.
3. Add or update regression tests before broad refactoring.
4. Run the repository gate:

```bash
npm run check
```

5. For user-facing workflows, run:

```bash
npm run test:e2e
```

6. Describe the failure before the change, the behavior after it, and the exact verification performed.

If a command fails because of an existing repository warning or environment requirement, include the command and relevant output. Do not replace a failing assertion with a conditional skip.

## Branch and review policy

- Treat `main` as the release branch. Do not push directly to it, force-push it, or rewrite its history.
- Use a short, descriptive branch name such as `fix/import-recovery`, `feat/template-search`, `docs/contributing`, or `chore/ci-maintenance`.
- Keep each pull request focused on one behavior, documentation area, or maintenance concern. Split unrelated fixes into separate pull requests.
- Pull requests target `main`, must pass the required CI checks, and need maintainer review before merging. Update the branch when the target branch moves; do not bypass a failing check with a conditional skip.
- Explain user impact, data or privacy impact, migration/recovery behavior, and verification in the pull request description. Attach a screenshot or recording for visible workflow changes when it improves review.
- Prefer squash merges for focused changes. Delete the feature branch after merge and keep release tags on `main` only.

## Release policy

1. Use [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Update `package.json`, `package-lock.json`, and the matching `CHANGELOG.md` section in the same pull request.
2. Run `npm run check`, the relevant end-to-end or desktop checks, and a production build before tagging.
3. Create an annotated tag on the verified `main` commit using the `vX.Y.Z` format. Release candidates and other pre-releases use `-rc`, `-beta`, or `-alpha` suffixes.
4. Let `.github/workflows/release.yml` build and attach the web archive, Linux AppImage, and checksums. Do not upload binaries containing local paths, credentials, or user documents.
5. Confirm that the GitHub Release, tag, package version, changelog heading, and Pages deployment all identify the same version. Record any known migration or backup warning in the release notes.

## Project conventions

- Prefer existing React, Zustand, Canvas, and domain-helper patterns.
- Keep document parsing and migration in `src/store`; do not parse structured backups with string operations.
- Keep rendering and geometry rules out of React components when they can be pure functions.
- Keep Electron privileged APIs out of the web application.
- Do not add network upload, telemetry, or analytics without an explicit privacy review.
- Use short comments for non-obvious decisions, not narration.
- Avoid unrelated formatting and generated-file churn.

## Tests by risk

| Change                     | Minimum evidence                                             |
| -------------------------- | ------------------------------------------------------------ |
| Pure helper or store rule  | Focused Vitest test                                          |
| Persisted schema or import | Migration/backup tests plus recovery behavior                |
| Canvas interaction         | Unit/integration regression plus relevant Playwright journey |
| Visible responsive UI      | Desktop and mobile browser check                             |
| Electron shell             | Electron TypeScript build and launch smoke test              |

## Commits

Use short, descriptive messages. Conventional Commit prefixes are useful but not required.

```text
fix(export): render the complete document bounds
test(eraser): cover one-gesture undo
docs(readme): document v4 backup behavior
```

By contributing, you agree that your contribution is licensed under the MIT License.
