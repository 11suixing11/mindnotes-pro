# Security Policy

MindNotes Pro is a local-first browser app. User drawings and documents are intended to stay in browser storage unless a user explicitly exports or imports files.

## Supported Version

The `main` branch is the actively maintained version. Older snapshots may not receive fixes.

## Reporting a Vulnerability

Please do not open a public issue with exploit details.

Use GitHub private vulnerability reporting when available:

https://github.com/11suixing11/mindnotes-pro/security/advisories/new

If private reporting is unavailable, contact the maintainer through the public contact information on the GitHub profile and include:

- A short description of the issue.
- Steps to reproduce.
- Impact and affected browser or platform.
- Any suggested fix, if you already have one.

## Scope

Security issues that matter for this project include:

- Script execution through imported SVG or document content.
- Unexpected network upload of local user data.
- Export/import behavior that can leak or corrupt user content.
- Dependency vulnerabilities that are reachable in the app.

Low-risk dependency audit warnings are still useful, but they can be reported as regular issues without exploit details.
