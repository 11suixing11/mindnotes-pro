#!/bin/bash

# MindNotes Pro 演示视频录制脚本
# 使用：bash scripts/record-demo.sh

echo "🎬 MindNotes Pro 演示视频录制"
echo "=============================="
echo ""

# 检查依赖
check_dependencies() {
    echo "📦 检查依赖..."
    
    if ! command -v ffmpeg &> /dev/null; then
        echo "❌ 未找到 ffmpeg，请先安装"
        echo "   macOS: brew install ffmpeg"
        echo "   Linux: sudo apt install ffmpeg"
        exit 1
    fi
    
    if ! command -v obs &> /dev/null; then
        echo "⚠️  未找到 OBS，建议安装用于专业录制"
        echo "   网站：https://obsproject.com/"
    fi
    
    echo "✅ 依赖检查完成"
    echo ""
}

# 启动开发服务器
start_dev_server() {
    echo "🚀 启动开发服务器..."
    
    cd "$(dirname "$0")/.."
    
    # 检查是否已在运行
    if lsof -i:3000 > /dev/null 2>&1; then
        echo "✅ 开发服务器已在运行"
    else
        npm run dev > /dev/null 2>&1 &
        DEV_SERVER_PID=$!
        echo "✅ 开发服务器已启动 (PID: $DEV_SERVER_PID)"
        
        # 等待服务器启动
        echo "⏳ 等待服务器就绪..."
        sleep 5
    fi
    
    echo ""
}

# 打开浏览器
open_browser() {
    echo "🌐 打开浏览器..."
    
    # 根据操作系统打开浏览器
    case "$(uname -s)" in
        Darwin)
            open "http://localhost:3000"
            ;;
        Linux)
            xdg-open "http://localhost:3000" 2>/dev/null || \
            google-chrome "http://localhost:3000"
            ;;
        MINGW*|CYGWIN*)
            start "http://localhost:3000"
            ;;
        *)
            echo "❌ 不支持的操作系统"
            exit 1
            ;;
    esac
    
    echo "✅ 浏览器已打开"
    echo ""
}

# 录制说明
recording_instructions() {
    echo "📹 录制说明"
    echo "=========="
    echo ""
    echo "请使用以下软件之一进行录制:"
    echo ""
    echo "1. OBS Studio (推荐)"
    echo "   - 免费下载：https://obsproject.com/"
    echo "   - 设置：1920x1080, 60fps"
    echo "   - 录制区域：浏览器窗口"
    echo ""
    echo "2. QuickTime Player (Mac)"
    echo "   - 文件 > 新建屏幕录制"
    echo "   - 选择录制区域"
    echo ""
    echo "3. Windows Game Bar (Windows)"
    echo "   - Win + G 打开"
    echo "   - 点击录制按钮"
    echo ""
    echo "4. FFmpeg (命令行)"
    echo "   - 专业用户可选"
    echo "   - 需要配置参数"
    echo ""
    echo "录制要点:"
    echo "✅ 保持鼠标移动平滑"
    echo "✅ 操作速度适中"
    echo "✅ 按照脚本演示功能"
    echo "✅ 录制时长：2-3 分钟"
    echo ""
}

# 演示步骤提示
demo_steps() {
    echo "📋 演示步骤提示"
    echo "=============="
    echo ""
    echo "1. 开场展示 (10 秒)"
    echo "   - 展示完整的界面"
    echo "   - 不要操作，让用户看清界面"
    echo ""
    echo "2. 流畅书写 (20 秒)"
    echo "   - 用鼠标在画布上写字"
    echo "   - 展示笔迹的流畅度"
    echo "   - 写：'Hello MindNotes'"
    echo ""
    echo "3. 颜色切换 (10 秒)"
    echo "   - 点击不同颜色"
    echo "   - 用不同颜色继续书写"
    echo ""
    echo "4. 粗细调整 (10 秒)"
    echo "   - 点击粗细按钮"
    echo "   - 展示不同粗细的效果"
    echo ""
    echo "5. 撤销功能 (10 秒)"
    echo "   - 写错一个字"
    echo "   - 按 Ctrl+Z 撤销"
    echo ""
    echo "6. 导出功能 (20 秒)"
    echo "   - 点击保存按钮"
    echo "   - 依次展示 PNG/PDF/JSON 导出"
    echo ""
    echo "7. 清空画布 (5 秒)"
    echo "   - 按 Delete 或点击清空"
    echo "   - 展示清空效果"
    echo ""
    echo "8. 结尾展示 (10 秒)"
    echo "   - 回到干净的界面"
    echo "   - 展示 GitHub 链接"
    echo ""
}

# 录制后处理
post_processing() {
    echo "✂️  后期处理"
    echo "=========="
    echo ""
    echo "推荐软件:"
    echo ""
    echo "1. DaVinci Resolve (免费且专业)"
    echo "   - 下载：https://www.blackmagicdesign.com/products/davinciresolve"
    echo "   - 功能：剪辑、调色、音频、特效"
    echo ""
    echo "2. CapCut (简单易用)"
    echo "   - 下载：https://www.capcut.com/"
    echo "   - 功能：基础剪辑、字幕、特效"
    echo ""
    echo "3. Adobe Premiere Pro (专业)"
    echo "   - 订阅制"
    echo "   - 行业标准"
    echo ""
    echo "处理步骤:"
    echo "1. 导入录制的视频"
    echo "2. 剪辑掉多余部分"
    echo "3. 添加转场效果"
    echo "4. 添加背景音乐"
    echo "5. 添加字幕"
    echo "6. 调色（可选）"
    echo "7. 导出视频"
    echo ""
    echo "导出设置:"
    echo "- 分辨率：1920x1080 (1080p)"
    echo "- 帧率：60fps"
    echo "- 码率：10-20 Mbps"
    echo "- 格式：MP4 (H.264)"
    echo "- 音频：AAC, 320kbps"
    echo ""
}

# 发布指南
publish_guide() {
    echo "📤 发布指南"
    echo "=========="
    echo ""
    echo "视频平台:"
    echo ""
    echo "1. YouTube"
    echo "   - 上传视频"
    echo "   - 添加标题、描述、标签"
    echo "   - 设置缩略图"
    echo "   - 链接：https://youtube.com/upload"
    echo ""
    echo "2. Bilibili"
    echo "   - 上传视频"
    echo "   - 添加分区、标签"
    echo "   - 设置封面"
    echo "   - 链接：https://member.bilibili.com/platform/upload"
    echo ""
    echo "3. 其他平台"
    echo "   - 微博视频"
    echo "   - 抖音/TikTok"
    echo "   - Twitter/X"
    echo "   - LinkedIn"
    echo ""
    echo "视频描述模板:"
    echo "---"
    echo "🎨 MindNotes Pro - 让灵感自由流淌"
    echo ""
    echo "立即体验：https://mindnotes-pro.vercel.app"
    echo "GitHub: https://github.com/11suixing11/mindnotes-pro"
    echo ""
    echo "MindNotes Pro 是一个像纸笔一样自然的手写笔记工具。"
    echo "- ✅ 打开就能用，无需安装"
    echo "- ✅ 流畅的笔迹，自然的体验"
    echo "- ✅ 多格式导出（PNG/PDF/JSON）"
    echo "- ✅ 完全免费，隐私安全"
    echo ""
    echo "#MindNotes #笔记应用 #开源项目 #手写笔记 #生产力工具"
    echo "---"
    echo ""
}

# 主函数
main() {
    echo ""
    check_dependencies
    start_dev_server
    open_browser
    recording_instructions
    demo_steps
    post_processing
    publish_guide
    
    echo "✅ 准备完成！"
    echo ""
    echo "现在可以开始录制了！"
    echo "祝你录制顺利！🎬"
    echo ""
    
    # 清理函数
    cleanup() {
        echo ""
        echo "🛑 停止开发服务器..."
        if [ ! -z "$DEV_SERVER_PID" ]; then
            kill $DEV_SERVER_PID 2>/dev/null
            echo "✅ 开发服务器已停止"
        fi
    }
    
    # 注册清理函数
    trap cleanup EXIT
}

# 运行主函数
main
