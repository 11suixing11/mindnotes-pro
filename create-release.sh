#!/bin/bash

# 创建 GitHub Release v1.1.2
# 使用 GitHub CLI

VERSION="v1.1.2"
TITLE="MindNotes Pro v1.1.2 - 悬浮笔记组件"
NOTES_FILE="RELEASE_NOTES_v1.1.2.md"

echo "📦 创建 GitHub Release: $VERSION"

# 检查 gh 是否安装
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI 未安装，请先安装：https://cli.github.com/"
    exit 1
fi

# 创建 Release
gh release create "$VERSION" \
    --title "$TITLE" \
    --notes-file "$NOTES_FILE" \
    --verify-tag \
    --latest

echo "✅ Release 创建成功！"
echo "🌐 查看：https://github.com/11suixing11/mindnotes-pro/releases/tag/$VERSION"
