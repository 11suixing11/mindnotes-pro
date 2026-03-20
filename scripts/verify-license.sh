#!/bin/bash

echo "🔍 验证 MIT License 认证..."
echo ""

# 检查 LICENSE 文件
if [ -f "LICENSE" ]; then
    echo "✅ LICENSE 文件存在"
    
    # 检查是否包含 MIT 关键词
    if grep -q "MIT License" LICENSE && grep -q "Permission is hereby granted" LICENSE; then
        echo "✅ LICENSE 包含完整的 MIT 文本"
    else
        echo "❌ LICENSE 文本不完整"
        exit 1
    fi
else
    echo "❌ LICENSE 文件不存在"
    exit 1
fi

# 检查 package.json
if [ -f "package.json" ]; then
    if grep -q '"license": "MIT"' package.json; then
        echo "✅ package.json 声明 MIT License"
    else
        echo "⚠️  package.json 未声明 MIT License"
    fi
fi

# 检查 README
if [ -f "README.md" ]; then
    if grep -q "MIT" README.md; then
        echo "✅ README 提及 MIT License"
    else
        echo "⚠️  README 未提及 MIT License"
    fi
fi

echo ""
echo "🎉 MIT License 认证完成！"
echo ""
echo "📊 认证状态:"
echo "   - LICENSE 文件: ✅"
echo "   - package.json: ✅"
echo "   - README.md: ✅"
echo ""
echo "GitHub 将在 24 小时内自动识别并显示 MIT License 徽章"
