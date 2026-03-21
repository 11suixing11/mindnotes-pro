# 🚨 GitHub 推送 - 需要你的操作

**问题**: Token 已过期，SSH 连接失败

---

## ✅ 解决方案（2 选 1）

### 方案 1: 生成新的 Personal Access Token（推荐）⭐⭐⭐⭐⭐

#### 步骤 1: 生成 Token

1. 打开：https://github.com/settings/tokens
2. 点击 **"Generate new token (classic)"**
3. 填写：
   - **Note**: `MindNotes Pro`
   - **Expiration**: `90 days` 或 `No expiration`
   - **Scopes**: 勾选 ✅ `repo` 和 ✅ `workflow`
4. 点击 **"Generate token"**
5. **复制 Token**（以 `ghp_` 开头，只显示一次！）

#### 步骤 2: 更新 Git 配置

```bash
cd /home/admin/openclaw/workspace/mindnotes-pro

# 替换 YOUR_TOKEN 为刚才复制的 Token
git remote set-url origin https://11suixing11:YOUR_TOKEN@github.com/11suixing11/mindnotes-pro.git

# 推送
git push origin main --force
```

---

### 方案 2: 等待 SSH 生效（如果你刚添加 SSH key）

如果你刚刚在 GitHub 添加了 SSH key，可能需要等待 5-10 分钟生效。

#### 等待后执行：

```bash
cd /home/admin/openclaw/workspace/mindnotes-pro

# 确保使用 SSH
git remote set-url origin git@github.com:11suixing11/mindnotes-pro.git

# 测试连接
ssh -T git@github.com

# 如果看到 "Hi 11suixing11!" 表示成功，然后推送
git push origin main
```

---

## 🎯 推荐执行方案 1

**原因**: 立即生效，不需要等待

**完整命令**（替换 YOUR_TOKEN）:

```bash
cd /home/admin/openclaw/workspace/mindnotes-pro
git remote set-url origin https://11suixing11:ghp_XXXXXXXXXXXXXXXXXXXX@github.com/11suixing11/mindnotes-pro.git
git push origin main --force
```

---

## 📝 执行完后告诉我

推送成功后，我会继续帮你：
1. ✅ 配置 GitHub Pages 自动部署
2. ✅ 激活 GitHub Copilot
3. ✅ 创建 Project 项目板
4. ✅ 测试 CI/CD 流程

---

**请现在生成 Token 并执行推送命令！** 🚀
