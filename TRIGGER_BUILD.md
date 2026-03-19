# 🚀 手动触发 GitHub Actions 构建

> 上传桌面端安装包到 Release

**创建时间**: 2026-03-20 01:15

---

## 📋 问题说明

**现状**:
- Tag v1.1.5 已推送
- GitHub Actions 没有自动触发
- Release 页面没有桌面端安装包

**原因**:
- GitHub Actions 可能需要手动触发
- 或者构建还在排队中

---

## 🎯 解决方案

### 方式一：等待自动构建

**检查**: https://github.com/11suixing11/mindnotes-pro/actions

如果看到构建中，等待完成即可。

---

### 方式二：手动触发

**访问**: https://github.com/11suixing11/mindnotes-pro/actions/workflows/release-simple.yml

**操作**:
1. 点击 "Run workflow"
2. 选择分支：`main`
3. 选择 Tag: `v1.1.5`
4. 点击 "Run workflow"
5. 等待 15-20 分钟
6. 自动上传到 Release

---

### 方式三：重新推送 Tag

```bash
git tag -d v1.1.5
git tag -a v1.1.5 -m "v1.1.5 - 触发构建"
git push origin v1.1.5 --force
```

---

## ✅ 预期结果

构建完成后，Release 页面会有：
- ✅ MindNotes.Pro-1.1.5.AppImage (Linux)
- ✅ MindNotes.Pro.Setup.1.1.5.exe (Windows)
- ✅ MindNotes.Pro-1.1.5.dmg (macOS)

---

## 🔍 检查构建状态

**访问**: https://github.com/11suixing11/mindnotes-pro/actions

**状态**:
- 🟢 成功
- 🟡 进行中
- 🔴 失败

---

**立即触发构建！** 🚀
