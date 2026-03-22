# GitHub Discussions 分类配置指南

**目标**: 为 MindNotes Pro 创建清晰的 Discussions 分类结构

**操作方式**: 由于 GitHub Discussions 分类需要通过 GitHub UI 或 API 配置，以下是配置步骤和分类建议。

---

## 📋 建议分类结构

### 1. 📢 Announcements (官方公告)
- **用途**: 版本发布、路线图、重要通知
- **权限**: 仅维护者可发布
- **图标**: 📢

### 2. 💡 Tips & Tricks (使用技巧)
- **用途**: 功能教程、快捷键、最佳实践
- **权限**: 所有人可发布
- **图标**: 💡

### 3. ❓ Q&A (问答)
- **用途**: 用户提问、互助解答
- **权限**: 所有人可发布
- **图标**: ❓

### 4. 🎨 Show & Tell (用户展示)
- **用途**: 用户分享笔记模板、使用场景
- **权限**: 所有人可发布
- **图标**: 🎨

### 5. 🚀 Ideas (功能建议)
- **用途**: 新功能提议、投票决定优先级
- **权限**: 所有人可发布
- **图标**: 🚀

---

## 🔧 配置步骤（手动）

1. 访问 https://github.com/11suixing11/mindnotes-pro/discussions
2. 点击右上角 ⚙️ Settings
3. 在 "Discussion categories" 部分点击 "New category"
4. 依次添加以上 5 个分类
5. 设置每个分类的名称、描述和图标 emoji

---

## 🤖 自动化配置（可选）

使用 GitHub CLI 可以批量创建分类：

```bash
# 需要先安装 gh CLI 工具
# 登录 GitHub
gh auth login

# 查看当前讨论分类
gh api repos/11suixing11/mindnotes-pro/discussion_categories

# 注意：GitHub API 目前不支持直接创建分类
# 需要通过 UI 手动配置
```

---

## ✅ 检查清单

- [ ] 访问 GitHub Discussions 设置页面
- [ ] 创建 5 个分类（按上述结构）
- [ ] 设置分类顺序（Announcements 置顶）
- [ ] 保存配置
- [ ] 验证分类显示正常

---

**备注**: 此文件为配置指南，实际操作需在 GitHub UI 完成。

**创建时间**: 2026-03-22 12:11  
**负责人**: 小雨 1 号
