# Security Policy

## Reporting Security Vulnerabilities

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in MindNotes Pro, please report it responsibly by emailing [11suixing11@users.noreply.github.com](mailto:11suixing11@users.noreply.github.com). You should receive a response within 72 hours.

Please include the following information:

- Type of vulnerability (e.g., XSS, data exposure, etc.)
- Full path of the affected source file(s)
- Location of the affected code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment

## Supported Versions

| Version | Supported              |
| ------- | ---------------------- |
| 3.x     | ✅ Active              |
| < 3.0   | ❌ No longer supported |

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials
- Validate and sanitize all user inputs
- Use `textContent` instead of `innerHTML` to prevent XSS
- Be cautious with `dangerouslySetInnerHTML` in React
- Keep dependencies up to date (`npm audit`)
- Review third-party packages before adding them

## Response Process

1. **Acknowledgment** — within 72 hours of report
2. **Assessment** — severity classification within 1 week
3. **Fix** — developed and tested privately
4. **Disclosure** — coordinated public disclosure after fix is released
5. **Credit** — reporter credited (unless anonymity requested)
