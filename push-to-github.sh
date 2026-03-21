#!/bin/bash
# GitHub 推送脚本

echo "🔑 尝试推送代码到 GitHub..."
echo ""

# 方法 1: 使用 gh CLI
if command -v gh &> /dev/null; then
    echo "✅ 检测到 GitHub CLI"
    cd /home/admin/openclaw/workspace/mindnotes-pro
    git push origin main
    exit $?
fi

# 方法 2: 使用 SSH
echo "📝 请执行以下步骤："
echo ""
echo "1. 打开浏览器访问：https://github.com/settings/tokens"
echo "2. 点击 'Generate new token (classic)'"
echo "3. Note: MindNotes Pro"
echo "4. Expiration: 90 days"
echo "5. Scopes: 勾选 'repo' 和 'workflow'"
echo "6. 点击 'Generate token'"
echo "7. 复制 Token"
echo ""
echo "8. 然后执行："
echo "   git remote set-url origin https://11suixing11:YOUR_TOKEN@github.com/11suixing11/mindnotes-pro.git"
echo "   git push origin main"
echo ""
