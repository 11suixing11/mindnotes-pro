#!/bin/bash

# MindNotes Pro 自动推送脚本
# 使用：bash scripts/auto-push.sh

echo "🚀 MindNotes Pro 自动推送到 GitHub"
echo "=================================="
echo ""

# 检查 Git 状态
check_git_status() {
    echo "📊 检查 Git 状态..."
    
    if ! git status > /dev/null 2>&1; then
        echo "❌ 错误：不在 Git 仓库中"
        exit 1
    fi
    
    # 检查是否有未提交的更改
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "⚠️  有未提交的更改"
        echo "   请先提交更改：git add -A && git commit -m 'message'"
        exit 1
    fi
    
    echo "✅ Git 状态正常"
    echo ""
}

# 检查远程仓库
check_remote() {
    echo "🔗 检查远程仓库..."
    
    REMOTE_URL=$(git remote get-url origin 2>/dev/null)
    
    if [ -z "$REMOTE_URL" ]; then
        echo "❌ 错误：未配置远程仓库"
        echo "   请运行：git remote add origin https://github.com/11suixing11/mindnotes-pro.git"
        exit 1
    fi
    
    echo "✅ 远程仓库：$REMOTE_URL"
    echo ""
}

# 检查认证方式
check_auth() {
    echo "🔐 检查认证方式..."
    
    # 检查 GitHub CLI
    if command -v gh &> /dev/null; then
        echo "✅ GitHub CLI 已安装"
        
        if gh auth status &> /dev/null; then
            echo "✅ GitHub CLI 已登录"
            AUTH_METHOD="gh"
        else
            echo "⚠️  GitHub CLI 未登录"
            echo "   请先运行：gh auth login"
            AUTH_METHOD="gh_need_login"
        fi
    else
        echo "⚠️  GitHub CLI 未安装"
        echo "   推荐安装：brew install gh (macOS) 或 winget install GitHub.cli (Windows)"
        AUTH_METHOD="token_or_ssh"
    fi
    
    echo ""
}

# 使用 GitHub CLI 推送
push_with_gh() {
    echo "📤 使用 GitHub CLI 推送..."
    
    if [ "$AUTH_METHOD" = "gh_need_login" ]; then
        echo "🔐 请先登录 GitHub CLI"
        gh auth login
        
        if [ $? -ne 0 ]; then
            echo "❌ 登录失败"
            exit 1
        fi
    fi
    
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ 推送成功！"
    else
        echo "❌ 推送失败"
        exit 1
    fi
}

# 使用 Token 推送
push_with_token() {
    echo "📤 使用 Token 推送..."
    echo ""
    echo "请输入你的 GitHub Personal Access Token:"
    echo "（Token 不会显示在屏幕上）"
    echo ""
    
    # 读取 Token（不显示）
    read -s GITHUB_TOKEN
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo ""
        echo "❌ Token 不能为空"
        exit 1
    fi
    
    echo ""
    echo "✅ Token 已接收"
    echo ""
    
    # 临时设置 Token
    REMOTE_URL=$(git remote get-url origin)
    
    # 提取用户名和仓库名
    REPO_PATH=$(echo $REMOTE_URL | sed 's|https://github.com/||')
    NEW_REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${REPO_PATH}"
    
    # 设置新 URL
    git remote set-url origin "$NEW_REMOTE_URL"
    
    # 推送
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ 推送成功！"
    else
        echo "❌ 推送失败"
        echo "   请检查 Token 是否正确"
        # 恢复原 URL
        git remote set-url origin "$REMOTE_URL"
        exit 1
    fi
    
    # 恢复原 URL（移除 Token）
    git remote set-url origin "$REMOTE_URL"
}

# 使用 SSH 推送
push_with_ssh() {
    echo "📤 使用 SSH 推送..."
    
    # 检查 SSH 密钥
    if [ ! -f ~/.ssh/id_ed25519.pub ] && [ ! -f ~/.ssh/id_rsa.pub ]; then
        echo "❌ 未找到 SSH 密钥"
        echo "   请先生成：ssh-keygen -t ed25519"
        echo "   然后添加到 GitHub: https://github.com/settings/keys"
        exit 1
    fi
    
    # 切换为 SSH
    REMOTE_URL=$(git remote get-url origin)
    REPO_PATH=$(echo $REMOTE_URL | sed 's|https://github.com/||')
    SSH_URL="git@github.com:${REPO_PATH}"
    
    echo "🔄 切换为 SSH: $SSH_URL"
    git remote set-url origin "$SSH_URL"
    
    # 推送
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ 推送成功！"
    else
        echo "❌ 推送失败"
        echo "   请检查 SSH 密钥是否已添加到 GitHub"
        # 恢复原 URL
        git remote set-url origin "$REMOTE_URL"
        exit 1
    fi
    
    # 恢复 HTTPS URL
    git remote set-url origin "$REMOTE_URL"
}

# 显示推送后的操作
post_push_actions() {
    echo ""
    echo "🎉 推送成功！"
    echo ""
    echo "下一步操作:"
    echo ""
    echo "1. 查看 GitHub 仓库"
    echo "   https://github.com/11suixing11/mindnotes-pro"
    echo ""
    echo "2. 创建 Release v1.0.0"
    echo "   https://github.com/11suixing11/mindnotes-pro/releases/new"
    echo ""
    echo "3. 部署到 Vercel"
    echo "   https://vercel.com/new"
    echo ""
    echo "4. 更新在线演示"
    echo "   访问 Vercel Dashboard 重新部署"
    echo ""
    echo "5. 社交媒体宣传"
    echo "   - Twitter/X"
    echo "   - 微博"
    echo "   - V2EX"
    echo "   - 少数派"
    echo ""
}

# 主函数
main() {
    check_git_status
    check_remote
    check_auth
    
    echo "选择推送方式:"
    echo ""
    echo "1) GitHub CLI (推荐)"
    echo "2) Personal Access Token"
    echo "3) SSH 密钥"
    echo "4) 退出"
    echo ""
    read -p "请选择 [1-4]: " choice
    
    case $choice in
        1)
            if [ "$AUTH_METHOD" = "gh" ] || [ "$AUTH_METHOD" = "gh_need_login" ]; then
                push_with_gh
                post_push_actions
            else
                echo "❌ 请先安装 GitHub CLI"
                echo "   macOS: brew install gh"
                echo "   Windows: winget install GitHub.cli"
                exit 1
            fi
            ;;
        2)
            push_with_token
            post_push_actions
            ;;
        3)
            push_with_ssh
            post_push_actions
            ;;
        4)
            echo "👋 再见"
            exit 0
            ;;
        *)
            echo "❌ 无效选择"
            exit 1
            ;;
    esac
}

# 运行主函数
main
