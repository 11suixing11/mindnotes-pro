#!/bin/bash

echo "🚀 手动部署到 GitHub Pages..."
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 构建
echo "📦 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo "✅ 构建成功"
echo ""

# 使用 gh-pages 部署
echo "📤 部署到 gh-pages 分支..."
npx gh-pages -d dist -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"

if [ $? -ne 0 ]; then
    echo "❌ 部署失败"
    exit 1
fi

echo "✅ 部署成功"
echo ""
echo "🌐 访问地址:"
echo "   https://11suixing11.github.io/mindnotes-pro"
echo ""
echo "⏳ 等待 GitHub 处理 (2-5 分钟)..."
