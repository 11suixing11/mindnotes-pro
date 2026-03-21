# 🔑 GitHub 认证配置指南

**问题**: Git push 认证失败  
**原因**: 需要使用 SSH 或 Personal Access Token

---

## 方案 1: 使用 SSH（推荐）⭐⭐⭐⭐⭐

### 1. 生成 SSH 密钥

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

按 Enter 接受默认位置

### 2. 查看公钥

```bash
cat ~/.ssh/id_ed25519.pub
```

复制输出的内容（以 `ssh-ed25519` 开头）

### 3. 添加到 GitHub

1. 打开 https://github.com/settings/keys
2. 点击 "New SSH key"
3. Title: 填写设备名称（如 "Home PC"）
4. Key: 粘贴刚才复制的公钥
5. 点击 "Add SSH key"

### 4. 切换远程仓库为 SSH

```bash
cd /home/admin/openclaw/workspace/mindnotes-pro
git remote set-url origin git@github.com:11suixing11/mindnotes-pro.git
```

### 5. 测试连接

```bash
ssh -T git@github.com
```

看到 "Hi 11suixing11!" 表示成功

### 6. 推送代码

```bash
git push origin main
```

---

## 方案 2: 使用 Personal Access Token

### 1. 创建 Token

1. 打开 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. Note: 填写 "MindNotes Pro"
4. Expiration: 选择 "No expiration"
5. Scopes: 勾选 `repo` 和 `workflow`
6. 点击 "Generate token"
7. **复制 Token**（只显示一次！）

### 2. 使用 Token 推送

```bash
git push origin main
```

当提示输入密码时，粘贴 Token（不是密码）

---

## 方案 3: 使用 GitHub CLI（最简单）⭐⭐⭐⭐

### 1. 安装 gh

```bash
# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# 或者使用 snap
sudo snap install gh --classic
```

### 2. 登录

```bash
gh auth login
```

选择:
- GitHub Account
- HTTPS
- Login with a web browser
- 在浏览器中授权

### 3. 推送代码

```bash
git push origin main
```

---

## ✅ 推荐执行步骤

**使用 GitHub CLI（最简单）**:

```bash
# 1. 安装
sudo snap install gh --classic

# 2. 登录
gh auth login

# 3. 推送
git push origin main
```

---

## 🎯 完整任务清单

### 今天完成（03-22）

- [ ] **配置 GitHub 认证**（SSH 或 CLI）
- [ ] **推送代码到 GitHub**
- [ ] **激活 GitHub Copilot**（VS Code 插件）
- [ ] **配置 GitHub Pages**（Settings → Pages）
- [ ] **创建 Project 项目板**

### 明天完成（03-23）

- [ ] **测试 CI/CD 流程**（查看 Actions）
- [ ] **测试自动部署**（检查 Pages）
- [ ] **运行 Lighthouse 测试**

---

## 📞 需要你的操作

**请执行以下命令**（选择一种认证方式）:

### 选项 A: GitHub CLI（推荐）

```bash
sudo snap install gh --classic
gh auth login
git push origin main
```

### 选项 B: SSH

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# 复制输出，添加到 GitHub: https://github.com/settings/keys
git remote set-url origin git@github.com:11suixing11/mindnotes-pro.git
git push origin main
```

---

**执行完后告诉我，我继续帮你配置其他内容！** 🚀
