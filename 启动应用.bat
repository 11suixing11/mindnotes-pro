@echo off
chcp 65001 >nul
title MindNotes Pro - 智能手写笔记

REM 设置颜色
color 0A

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║                                                    ║
echo ║         MindNotes Pro - 智能手写笔记               ║
echo ║                                                    ║
echo ║     🧠 流畅绘写  🎨 多色选择  💾 一键保存          ║
echo ║                                                    ║
echo ╚════════════════════════════════════════════════════╝
echo.

REM 检查 Node.js
echo [1/4] 检查运行环境...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ╔════════════════════════════════════════════════════╗
    echo ║  [错误] 未检测到 Node.js                           ║
    echo ╚════════════════════════════════════════════════════╝
    echo.
    echo 请先安装 Node.js：
    echo.
    echo   1. 访问：https://nodejs.org/
    echo   2. 下载：LTS 版本（推荐 20.x）
    echo   3. 安装：双击下载的文件，一直点"下一步"
    echo   4. 重启：安装完成后重启电脑
    echo   5. 重试：重新运行此脚本
    echo.
    echo 提示：安装后可永久使用所有基于 Node.js 的应用
    echo.
    pause
    exit /b 1
)

echo       ✓ Node.js 已安装
node --version
echo.

REM 进入项目目录
cd /d %~dp0

REM 检查依赖
echo [2/4] 检查项目依赖...
if exist "node_modules" (
    echo       ✓ 依赖已安装
) else (
    echo       ⚠ 首次运行，正在安装依赖...
    echo.
    echo       这可能需要 1-2 分钟，请耐心等待
    echo       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0%%
    echo.
    call npm install --loglevel=error
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ╔════════════════════════════════════════════════════╗
        echo ║  [错误] 依赖安装失败                               ║
        echo ╚════════════════════════════════════════════════════╝
        echo.
        echo 解决方案：
        echo   1. 检查网络连接
        echo   2. 重试：关闭此窗口，重新运行
        echo   3. 帮助：查看 使用指南.md
        echo.
        pause
        exit /b 1
    )
    echo.
    echo       ✓ 依赖安装完成
)
echo.

REM 检查端口
echo [3/4] 检查端口占用...
netstat -ano ^| findstr ":3000" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo       ⚠ 端口 3000 已被占用
    echo       将使用备用端口 3001
    set PORT=3001
) else (
    echo       ✓ 端口 3000 可用
    set PORT=3000
)
echo.

REM 启动应用
echo [4/4] 启动应用...
echo.
echo ═══════════════════════════════════════════════════
echo.
echo   🎉 准备就绪！
echo.
echo   浏览器将自动打开：http://localhost:%PORT%
echo.
echo   💡 使用提示：
echo      • 鼠标按住绘写
echo      • Ctrl+Z 撤销
echo      • Ctrl+S 保存
echo      • Delete 清空
echo.
echo   按 Ctrl+C 可停止服务
echo.
echo ═══════════════════════════════════════════════════
echo.
echo 正在启动服务器...
echo.

REM 启动
call npm run dev

pause
