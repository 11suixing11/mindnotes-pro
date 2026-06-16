# 安全政策 / Security Policy

## 支持的版本 / Supported Versions

| 版本 / Version | 支持状态 / Supported              |
| -------------- | --------------------------------- |
| 3.2.0          | ✅ 积极维护 / Actively maintained |
| < 3.2.0        | ❌ 不再支持 / No longer supported |

## 报告漏洞 / Reporting a Vulnerability

我们非常重视安全问题。如果您发现了安全漏洞，请通过以下方式报告：

We take security seriously. If you discover a vulnerability, please report it via:

1. **GitHub Issues（公开问题）/ GitHub Issues (Public)**：适用于低敏感度问题，如依赖警告等。请使用 `security` 标签。  
   For low-sensitivity issues such as dependency warnings. Please use the `security` label.

2. **GitHub 私信（安全通告）/ GitHub Security Advisories（Private）**：适用于敏感漏洞，如 XSS、数据泄露、注入攻击等。请通过 [GitHub Security Advisories](https://github.com/11suixing11/mindnotes-pro/security/advisories/new) 提交，确保信息不公开。  
   For sensitive vulnerabilities such as XSS, data leaks, or injection attacks. Submit via [GitHub Security Advisories](https://github.com/11suixing11/mindnotes-pro/security/advisories/new) to keep the report private.

### 报告内容 / What to Include

- 漏洞描述及影响范围 / Description and scope of impact
- 复现步骤 / Steps to reproduce
- 受影响的版本 / Affected version(s)
- 可能的修复建议（如有）/ Suggested fix (if any)

## 安全最佳实践 / Security Best Practices

### API 密钥与凭证 / API Keys & Credentials

- **绝不**将 API 密钥、Token 或任何凭证提交到代码仓库。  
  **Never** commit API keys, tokens, or credentials to the repository.
- 使用 `.env` 文件管理本地配置，并确保 `.env` 已在 `.gitignore` 中。  
  Use `.env` files for local configuration and ensure `.env` is listed in `.gitignore`.
- 定期轮换密钥，尤其是发现泄露后立即更换。  
  Rotate keys regularly, and immediately after any suspected exposure.

### 依赖管理 / Dependency Management

- 定期运行 `npm audit` 或 `pnpm audit` 检查已知漏洞。  
  Regularly run `npm audit` or `pnpm audit` to check for known vulnerabilities.
- 保持依赖更新至最新的稳定版本。  
  Keep dependencies updated to their latest stable versions.
- 仅使用可信的第三方包。  
  Only use trusted third-party packages.

### 本地数据安全 / Local Data Security

- MindNotes Pro 采用本地优先（local-first）架构，用户数据存储在本地浏览器中。  
  MindNotes Pro uses a local-first architecture; user data is stored in the browser.
- 请注意浏览器存储（IndexedDB/localStorage）不提供加密保护，敏感内容请自行加密后存储。  
  Note that browser storage (IndexedDB/localStorage) does not provide encryption. Encrypt sensitive content before storing.

### 构建与部署 / Build & Deployment

- 仅使用官方构建流程 (`npm run build` / `vite build`)。  
  Only use the official build process (`npm run build` / `vite build`).
- 部署时确保 HTTPS 已启用。  
  Ensure HTTPS is enabled when deploying.

## 响应时间承诺 / Response Time Commitment

| 阶段 / Phase                          | 时间 / Timeline                                      |
| ------------------------------------- | ---------------------------------------------------- |
| 初次响应 / Initial response           | **48 小时内 / Within 48 hours**                      |
| 漏洞确认 / Vulnerability confirmation | **5 个工作日 / 5 business days**                     |
| 修复发布 / Fix release                | **14 个工作日（高危）/ 14 business days (critical)** |
| 低优先级修复 / Low-priority fix       | **下一版本 / Next scheduled release**                |

## 安全更新通知 / Security Update Notifications

安全修复将在 [GitHub Releases](https://github.com/11suixing11/mindnotes-pro/releases) 中标注 `security` 标签发布。建议订阅仓库通知以获取最新安全更新。

Security fixes are published on [GitHub Releases](https://github.com/11suixing11/mindnotes-pro/releases) with a `security` label. Subscribe to repository notifications for the latest security updates.

---

**最后更新 / Last Updated**: 2026-06-16
