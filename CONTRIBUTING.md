# Contributing to MindNotes Pro

Thanks for taking the time to improve MindNotes Pro. This project is maintained as a local-first whiteboard and drawing tool, so contributions should keep the app readable, private by default, and pleasant to use.

## Good First Contributions

- Reproduce and narrow down a reported canvas interaction bug.
- Add a focused unit test for store, history, export, selection, or keyboard behavior.
- Improve documentation where the current behavior is unclear.
- Fix accessibility issues in toolbar, menus, dialogs, and keyboard flows.
- Reduce confusing implementation comments or rename internal helpers for clarity.

## Before Opening an Issue

Please search existing issues first. A useful issue usually includes:

- What you expected to happen.
- What actually happened.
- Steps to reproduce the behavior.
- Browser, OS, and whether the issue happens in a private/incognito window.
- A short screen recording for pointer, selection, zoom, export, or keyboard issues.

For security reports, do not open a public issue with exploit details. See [SECURITY.md](SECURITY.md).

## Pull Request Workflow

1. Fork the repository and create a branch from `main`.
2. Install dependencies with `npm install`.
3. Run the app with `npm run dev`.
4. Keep the change focused and reviewable.
5. Add or update tests when behavior changes.
6. Run the checks that match your change:

```bash
npm run build
npm run test:run
npm run lint
```

If a check fails because of an existing issue, mention that clearly in the PR and include the failing output.

## Project Conventions

- Prefer existing React, Zustand, and Canvas patterns over new abstractions.
- Keep user data local unless the feature explicitly documents otherwise.
- Keep design-tool-inspired interactions generic and attribute inspiration when it matters.
- Avoid adding network dependencies or analytics without a clear privacy discussion.
- Keep comments short and useful; explain tricky behavior, not obvious assignments.

## Commit Messages

Use short, descriptive messages. Conventional Commits are welcome but not required.

Examples:

```text
fix(selection): keep handles stable after zoom
docs(readme): clarify export limitations
test(history): cover undo selection restoration
```

## Review Expectations

Maintainer review will focus on behavior, test coverage, user-data safety, and whether the change fits the current architecture. Small PRs are much easier to review and merge than broad rewrites.

By contributing, you agree that your contribution will be licensed under the MIT License.
