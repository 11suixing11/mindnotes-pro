# Contributing to MindNotes Pro

Thank you for your interest in contributing to MindNotes Pro! This document provides guidelines and steps for contributing.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing [issues](https://github.com/11suixing11/mindnotes-pro/issues) to avoid duplicates.

When creating a bug report, include:

- A clear, descriptive title
- Steps to reproduce the behavior
- Expected behavior vs. actual behavior
- Browser and OS information
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome. Please provide:

- A clear description of the feature
- The use case / motivation
- Any alternatives you have considered

### Pull Requests

1. **Fork** the repository and create your branch from `main`
2. **Install** dependencies: `npm install`
3. **Make** your changes following the coding conventions below
4. **Add or update tests** for your changes
5. **Run** the test suite: `npm run test:run`
6. **Run** the linter: `npm run lint`
7. **Ensure** the build passes: `npm run build`
8. **Commit** with a clear message (see [Commit Messages](#commit-messages))
9. **Push** to your fork and submit a pull request

> **Note:** Pre-commit hooks are configured via [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged). ESLint and Prettier will run automatically on staged files before each commit.

## Development Setup

```bash
# Clone your fork
git clone https://github.com/<your-username>/mindnotes-pro.git
cd mindnotes-pro

# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Run tests in watch mode
npm run test

# Run tests once with coverage
npm run test:run -- --coverage

# Run E2E tests
npm run test:e2e
```

## Coding Conventions

### TypeScript

- **Strict mode** is enabled �� all code must pass strict type checking
- No unused locals or parameters (enforced by `tsc`)
- Prefer explicit types over `any`
- Use `type` imports for type-only imports: `import type { Foo } from './foo'`

### File Naming

| Type          | Convention                  | Example                |
| ------------- | --------------------------- | ---------------------- |
| Component     | PascalCase                  | `Canvas.tsx`           |
| Hook          | camelCase with `use` prefix | `useCanvasRenderer.ts` |
| Utility       | camelCase                   | `canvasUtils.ts`       |
| Test          | Co-located with source      | `canvasUtils.test.ts`  |
| Store slice   | camelCase in `slices/`      | `canvasElements.ts`    |
| Barrel export | `index.ts`                  | `components/index.ts`  |

### Styling

- Use **Tailwind CSS** utility classes
- Follow the existing **Monet-inspired** color palette defined in `tailwind.config.js`
- Keep component styles inline with Tailwind; avoid custom CSS files when possible

### State Management

- Add new state to the appropriate **Zustand slice** in `src/store/slices/`
- Keep slices focused and cohesive
- Use the existing `saveManager` for persistence

### Testing

- Write tests for all new utilities and components
- Use `@testing-library/react` for component tests
- Maintain minimum **60% code coverage** (lines, functions, branches, statements)
- Run `npm run test:run` before submitting PRs
- Place test files adjacent to the source file: `foo.ts` �� `foo.test.ts`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type       | Description                              |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `docs`     | Documentation changes                    |
| `style`    | Code style (formatting, no logic change) |
| `refactor` | Code refactoring                         |
| `test`     | Adding or updating tests                 |
| `chore`    | Build process or tooling changes         |
| `perf`     | Performance improvement                  |
| `ci`       | CI/CD configuration changes              |

**Examples:**

```
feat(canvas): add rectangle selection tool
fix(export): resolve PDF export crash on empty canvas
docs(readme): update installation instructions
test(store): add unit tests for history slice
```

## Branch Naming

Use the format: `<type>/<short-description>`

```
feat/rectangle-tool
fix/pdf-export-crash
docs/api-reference
```

## Code Review Process

All pull requests require at least one approval before merging. During review:

- **Reviewers** should provide constructive feedback and approve only when the code meets project standards
- **Authors** should respond to all comments and mark resolved threads
- **Automated checks** (lint, type-check, test, build) must pass before review begins
- Use [Conventional Comments](https://conventionalcomments.org/) prefixes for clarity:
  - `nit:` �� Minor, non-blocking suggestion
  - `suggestion:` �� Idea for improvement
  - `issue:` �� Problem that should be addressed
  - `praise:` �� Highlight something done well

## Branch Protection

The `main` branch is protected with the following rules:

- Require pull request reviews before merging
- Require status checks to pass (lint, type-check, test, build)
- Require branches to be up to date before merging
- No force pushes or branch deletion

## Release Process

1. Update `CHANGELOG.md` with release notes
2. Bump version in `package.json` following [Semantic Versioning](https://semver.org/)
3. Create a git tag: `git tag v3.x.x`
4. Push the tag: `git push origin v3.x.x`
5. The CI will automatically create a GitHub Release with build artifacts

## Reporting Security Issues

Please see [SECURITY.md](SECURITY.md) for details on reporting security vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
