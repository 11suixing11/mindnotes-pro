@echo off
chcp 65001 >nul
title MindNotes Pro - 智能手写笔记

echo ╔════════════════════════════════════════════╗
echo ║     MindNotes Pro - 智能手写笔记           ║
echo ║         正在启动...                        ║
echo ╚════════════════════════════════════════════╝
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js
    echo.
    echo 请先安装 Node.js:
    echo 1. 访问：https://nodejs.org/
    echo 2. 下载 LTS 版本
    echo 3. 安装后重新运行此脚本
    echo.
    pause
    exit /b 1
)

echo [√] Node.js 已安装
node --version
echo.

REM 检查依赖是否安装
if not exist "node_modules" (
    echo [提示] 首次运行，正在安装依赖...
    echo 这可能需要 1-2 分钟，请耐心等待
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo [√] 依赖安装完成
    echo.
)

echo [√] 准备启动...
echo.
echo ════════════════════════════════════════════
echo 浏览器将自动打开：http://localhost:3000
echo 按 Ctrl+C 可停止服务
echo ════════════════════════════════════════════
echo.

REM 启动开发服务器
call npm run dev

pause
