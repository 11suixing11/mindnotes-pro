# 🖱️ 使用 GitHub Desktop 推送（最简单！）

> 无需配置 SSH，图形界面操作

---

## 第 1 步：下载 GitHub Desktop

**访问**: https://desktop.github.com/

**下载并安装**:
- Windows: 下载 `.exe`
- Mac: 下载 `.dmg`
- Linux: 使用 Snap 或 Flatpak

---

## 第 2 步：登录并添加项目

1. **打开 GitHub Desktop**

2. **登录 GitHub 账号**
   - 使用你的 GitHub 账号密码登录

3. **添加项目**
   - File → Add Local Repository
   - Click "Choose..."
   - 选择：`/home/admin/openclaw/workspace/mindnotes-pro`
   - Click "Add Repository"

---

## 第 3 步：推送代码

1. **查看更改**
   - 左侧会显示所有未推送的提交

2. **推送**
   - 右上角点击 "Push origin" 按钮
   - 等待推送完成

3. **验证**
   - 访问：https://github.com/11suixing11/mindnotes-pro
   - 查看最新提交应该已更新

---

## 第 4 步：推送标签

GitHub Desktop 默认不推送标签，需要用终端：

```bash
cd /home/admin/openclaw/workspace/mindnotes-pro

# 使用 HTTPS 方式推送标签
git push https://github.com/11suixing11/mindnotes-pro.git v1.1.0
```

**会提示输入**:
- Username: 你的 GitHub 用户名
- Password: 使用 **Personal Access Token**（不是登录密码！）

---

## 🎫 创建 Personal Access Token

如果需要用 Token 推送：

1. **访问**: https://github.com/settings/tokens

2. **创建 Token**:
   - Click "Generate new token (classic)"
   - Note: `MindNotes Deploy`
   - Expiration: `No expiration`
   - Scopes: 勾选 `repo` (全选)
   - Click "Generate token"

3. **复制 Token**
   - ⚠️ 只显示一次！保存到安全地方

---

## ✅ 推送成功后

### 1. 验证

访问：https://github.com/11suixing11/mindnotes-pro

- 查看 Commits
- 查看 Tags（应该有 v1.1.0）

### 2. 创建 Release

访问：https://github.com/11suixing11/mindnotes-pro/releases/new

- Tag version: `v1.1.0`
- Release title: `MindNotes Pro v1.1.0-FINAL`
- 复制 RELEASE_NOTES_v1.1.0.md 内容
- 点击 "Publish Release"

---

## 🐛 常见问题

### Q: 找不到 "Add Local Repository"？

A: 在 File 菜单下，或者使用快捷键 `Ctrl+O` (Windows) / `Cmd+O` (Mac)

### Q: 推送时提示认证失败？

A: 使用 Personal Access Token，不要用登录密码

### Q: 还是不行？

A: 试试在浏览器手动上传（不推荐，太慢）：
1. 访问 https://github.com/11suixing11/mindnotes-pro
2. Click "uploading an existing file"
3. 拖拽文件上传

---

## 🎊 完成！

推送成功后告诉我，我们继续创建 Release！🚀
