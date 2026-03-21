# 🎯 快速发布指南 - 3 步完成

> 最简单的方式！

---

## 第 1 步：复制 SSH 公钥

**执行命令**:
```bash
cat ~/.ssh/id_ed25519.pub
```

**复制输出内容**（类似这样）:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKddHDOToAsUs6r/uTzey7fhY7sOpoyQvwHDDtD5Np4Z 11suixing11@users.noreply.github.com
```

---

## 第 2 步：添加到 GitHub

1. **访问**: https://github.com/settings/keys

2. **点击**: "New SSH key"

3. **填写**:
   - Title: `My Laptop`
   - Key type: 选择 `Authentication Key`
   - Key: **粘贴刚才复制的内容**

4. **点击**: "Add SSH key"

5. **确认**（如果需要输入密码）

---

## 第 3 步：推送代码

**执行命令**:
```bash
cd /home/admin/openclaw/workspace/mindnotes-pro

# 推送代码
git push origin main

# 推送标签
git push origin v1.1.0
```

**如果成功**，会看到类似输出:
```
Enumerating objects: XXX, done.
Counting objects: 100% (XXX/XXX), done.
...
To github.com:11suixing11/mindnotes-pro.git
   abc1234..def5678  main -> main
```

---

## ✅ 推送成功后

### 1. 验证

访问：https://github.com/11suixing11/mindnotes-pro

- 查看最新提交
- 查看 Tags（应该有 v1.1.0）

### 2. 创建 Release

访问：https://github.com/11suixing11/mindnotes-pro/releases/new

- Tag version: `v1.1.0`
- Release title: `MindNotes Pro v1.1.0-FINAL`
- 复制 RELEASE_NOTES_v1.1.0.md 内容
- 点击 "Publish Release"

---

## 🐛 遇到问题？

### 问题 1: 提示 Permission denied

**原因**: SSH key 未添加到 GitHub

**解决**: 执行第 2 步

### 问题 2: 找不到 SSH key

**解决**:
```bash
# 重新生成
ssh-keygen -t ed25519 -C "1977717178@qq.com"
# 一直按 Enter 即可

# 查看
cat ~/.ssh/id_ed25519.pub
```

### 问题 3: 其他问题

使用 **GitHub Desktop**（图形界面，最简单）:

1. 下载：https://desktop.github.com/
2. 安装并登录
3. File → Add Local Repository
4. 选择项目文件夹
5. 点击 "Push origin"

---

## 🎊 完成！

推送成功后，告诉我，我们继续下一步！🚀
