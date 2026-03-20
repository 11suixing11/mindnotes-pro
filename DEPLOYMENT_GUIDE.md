# 🚀 MindNotes Pro 部署指南

## ✅ 自动部署已配置

**GitHub Actions** 会自动部署到 GitHub Pages

### 触发条件

- ✅ Push 到 main 分支
- ✅ 手动触发 (workflow_dispatch)

---

## 📋 GitHub Pages 设置步骤

### 步骤 1: 访问仓库设置

打开：https://github.com/11suixing11/mindnotes-pro/settings/pages

### 步骤 2: 配置 Source

1. **Source**: 选择 "GitHub Actions"
2. 不需要选择分支 (由 Actions 管理)

### 步骤 3: 等待部署

1. 访问：https://github.com/11suixing11/mindnotes-pro/actions
2. 查看部署状态
3. 等待显示 ✅ (通常 1-2 分钟)

### 步骤 4: 访问网站

部署成功后访问：
- **主页**: https://11suixing11.github.io/mindnotes-pro
- **测试版**: https://11suixing11.github.io/mindnotes-pro/test.html

---

## 🔧 手动触发部署

### 方法 1: GitHub Actions

1. 访问：https://github.com/11suixing11/mindnotes-pro/actions
2. 选择 "Deploy to GitHub Pages"
3. 点击 "Run workflow"
4. 选择 main 分支
5. 点击 "Run workflow"

### 方法 2: 本地命令

```bash
# 构建
npm run build

# 提交并推送
git add -A
git commit -m "deploy: 更新部署"
git push origin main
```

GitHub Actions 会自动部署！

---

## 📊 部署状态

### 查看状态

访问：https://github.com/11suixing11/mindnotes-pro/actions

**状态说明**:
- 🟡 进行中
- ✅ 成功
- ❌ 失败

### 常见问题

**Q: 部署失败？**
- 检查 Actions 日志
- 确保构建成功
- 检查 package.json 脚本

**Q: 404 错误？**
- 等待 2-5 分钟
- 检查 Pages 设置
- 清除浏览器缓存

**Q: 更新不生效？**
- 强制刷新 (Ctrl+F5)
- 清除缓存
- 检查部署状态

---

## 🎯 当前配置

**构建命令**:
```bash
npm run build
```

**部署目录**: `./dist`

**访问地址**:
- 主页：https://11suixing11.github.io/mindnotes-pro
- 测试版：https://11suixing11.github.io/mindnotes-pro/test.html
- 高级版：https://11suixing11.github.io/mindnotes-pro/app.html (开发中)

---

## 📝 部署历史

| 日期 | 版本 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-20 | v1.2.0 | 🔄 部署中 | GitHub Actions |
| 2026-03-20 | v1.1.6 | ✅ 成功 | 手动部署 |

---

## 🔗 相关资源

- **GitHub Pages 文档**: https://docs.github.com/en/pages
- **Actions 文档**: https://docs.github.com/en/actions
- **仓库**: https://github.com/11suixing11/mindnotes-pro

---

**部署配置完成！请按照步骤设置 GitHub Pages！** 🚀

**创建时间**: 2026-03-20  
**状态**: ✅ 已配置
