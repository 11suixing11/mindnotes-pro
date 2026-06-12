# GitHub 仓库优化指南

> 执行以下步骤来优化你的 GitHub 仓库

## 1. 更新仓库 Description

在 GitHub 仓库页面 → Settings → General → Description:

```
The beautiful, privacy-first whiteboard that works offline ✨
```

## 2. 添加 Topics (最多 20 个)

在 GitHub 仓库页面 → About → ⚙️ → Topics:

```
whiteboard
drawing-app
note-taking
canvas
react
typescript
local-first
privacy
pwa
offline-first
zustand
tailwindcss
vite
perfect-freehand
digital-ink
sketching
mind-mapping
productivity
open-source
free
```

## 3. 设置 Social Preview Image

1. 在 GitHub 仓库页面 → Settings → General → Social preview
2. 上传 `.github/hero.png` (1280×640 像素)
3. 这是人们在社交媒体分享时看到的图片

## 4. 启用 GitHub Discussions

1. 在 GitHub 仓库页面 → Settings → Features
2. 勾选 Discussions
3. 这允许用户提问和讨论，减少 issue 噪音

## 5. 创建 Labels

在 GitHub 仓库页面 → Issues → Labels → New label:

| Name | Color | Description |
|------|-------|-------------|
| `good first issue` | #7057ff | Good for newcomers |
| `help wanted` | #008672 | Extra attention is needed |
| `bug` | #d73a4a | Something isn't working |
| `enhancement` | #a2eeef | New feature or request |
| `documentation` | #0075ca | Improvements or additions to documentation |
| `performance` | #fbca04 | Performance improvements |
| `accessibility` | #e4e669 | Accessibility improvements |
| `design` | #f9d0c4 | Design improvements |
| `duplicate` | #cfd3d7 | This issue already exists |
| `invalid` | #e4e669 | Something doesn't look right |
| `question` | #d876e3 | Further information is requested |
| `wontfix` | #ffffff | This will not be worked on |

## 6. 创建 Issue Templates

已存在，但确保有以下模板:
- Bug Report (已有)
- Feature Request (已有)
- 添加: Good First Issue 模板

## 7. 添加 FUNDING.yml

已存在，确保包含:
```yaml
github: [11suixing11]
```

## 8. 设置 GitHub Pages

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` 或 `main` (已有 deploy.yml)

## 9. 创建 Release

1. 在 GitHub 仓库页面 → Releases → Create a new release
2. Tag: `v3.1.0`
3. Title: `v3.1.0 — Canvas Sizing & Bug Fixes`
4. 描述: 列出所有新功能和修复

## 10. 添加 Star History 到 README

已添加，使用 https://star-history.com

---

## 推广时间表

### 第 1 周: 基础优化
- [x] 优化 README
- [ ] 更新 GitHub topics 和 description
- [ ] 创建 5 个 good first issues
- [ ] 创建 Release v3.1.0

### 第 2 周: 社区推广
- [ ] Reddit r/reactjs 发帖
- [ ] Hacker News Show HN 发帖
- [ ] Dev.to 发技术文章

### 第 3 周: 产品化
- [ ] 部署到 Vercel
- [ ] 创建 Product Hunt 页面
- [ ] 录制高质量 demo GIF

### 第 4 周: 持续推广
- [ ] 掘金/思否发中文帖
- [ ] V2EX 发帖
- [ ] 向 awesome-react 提交 PR

---

## 每周例行任务

1. **检查 Issue** — 24小时内回复所有新 issue
2. **合并 PR** — 48小时内审查并合并 PR
3. **发布更新** — 每周至少一次有意义的更新
4. **社交媒体** — 在 Twitter 分享进展
5. **社区互动** — 在相关讨论中提及项目

---

## 里程碑追踪

| 日期 | Stars | 关键事件 |
|------|-------|----------|
| 2026-06-12 | 8 | 项目优化开始 |
| 2026-07-12 | 目标: 50 | Reddit/HN 推广 |
| 2026-08-12 | 目标: 200 | Product Hunt 发布 |
| 2026-09-12 | 目标: 500 | 协作功能发布 |
| 2026-12-12 | 目标: 2000 | 插件系统发布 |
| 2027-06-12 | 目标: 5000+ | 生态成熟 |
