## What's New in v3.2.0

This release brings two major upgrades: a **complete engineering standards overhaul** and a **full README rewrite** that makes the project feel as polished on GitHub as it does in the browser.

### ✨ Engineering Standards

- **ESLint recommended rules** — TypeScript, React hooks, consistent-type-imports enforced
- **Husky + lint-staged** — ESLint and Prettier run automatically on every commit
- **CODEOWNERS** — Automatic code review assignment
- **Dependabot** — Weekly dependency updates for npm and GitHub Actions
- **60% coverage threshold** — Code quality guardrails baked into CI

### 📝 Documentation Overhaul

- **README rewritten** — Compelling copy in English, 中文, and 日本語
- **Keyboard shortcuts** — Full cheat sheet now in the README
- **"Who is this for?"** — Students, designers, developers, note-takers
- **CONTRIBUTING.md** — Code review process, branch protection, release flow
- **PR & Issue templates** — Bilingual, detailed checklists, severity/priority dropdowns

### 🧹 Repo Cleanup

- Removed 37 non-essential files (debug scripts, temp screenshots, internal docs)
- Repository trimmed from 160+ to 121 tracked files — every file earns its place

### 🐛 Fixes

- ESLint consistent-type-imports errors resolved across all source files
- Empty catch block lint warning fixed in usePointerEngine
- CRLF → LF line ending normalization (all files)

---

**📦 Quick Start**

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install && npm run dev
```

Or try the **[Live Demo](https://11suixing11.github.io/mindnotes-pro)** ✨

**[Full Changelog](https://github.com/11suixing11/mindnotes-pro/blob/main/CHANGELOG.md)** · **[Report Issues](https://github.com/11suixing11/mindnotes-pro/issues)**
