<div align="center">

# MindNotes Pro

**本地优先的白板绘图应用**

<br />

一款轻量、快速、纯本地运行的白板绘图工具。
零依赖网络服务，数据完全保存在你的设备上。

<br />

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)

</div>

<br />

## Features

- ✏️ **画笔** — 基于 Bézier 曲线的平滑手写
- 🧹 **橡皮** — 擦除已有笔迹
- ✋ **平移** — 拖拽移动画布视图
- ⬜ **矩形** — 拖拽绘制矩形
- ⭕ **圆形** — 拖拽绘制椭圆
- 🎨 **8 色调色板** — 一键切换画笔颜色
- 📏 **4 档线宽** — 细 / 中 / 粗 / 特粗
- ↩️ **撤销 / 重做** — Ctrl+Z / Ctrl+Shift+Z
- 🔍 **缩放** — 鼠标滚轮或工具栏按钮
- 🌓 **深色模式** — 一键切换明暗主题
- 📐 **网格背景** — 自适应缩放的辅助网格
- 💾 **纯本地** — 零网络请求，数据不离开你的设备

<br />

## Quick Start

```bash
# 克隆仓库
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器会自动打开 `http://localhost:3000`。

<br />

## Keyboard Shortcuts

| 按键 | 功能 |
|------|------|
| `1` | 画笔 |
| `2` | 橡皮 |
| `3` | 平移 |
| `4` | 矩形 |
| `5` | 圆形 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` | 重做 |
| `+` / `-` | 放大 / 缩小 |
| `Delete` | 清空画布 |

<br />

## Build

```bash
# 生产构建
npm run build

# 预览构建产物
npm run preview
```

构建产物位于 `dist/` 目录，可直接部署到任意静态托管服务。

<br />

## Tech Stack

| 层级 | 技术 |
|------|------|
| UI | React 18 |
| 语言 | TypeScript 5 |
| 构建 | Vite 5 |
| 状态 | Zustand |
| 样式 | Tailwind CSS 3 |
| 绘图 | Canvas API |
| 测试 | Vitest + Testing Library |

生产依赖仅 **3 个**：`react`、`react-dom`、`zustand`。

<br />

## Project Structure

```
src/
├── main.tsx                    # 入口
├── App.tsx                     # 主应用
├── AppWrapper.tsx              # ErrorBoundary
├── index.css                   # 主题变量
├── components/
│   ├── Canvas.tsx              # 绘图画布
│   └── Toolbar.tsx             # 工具栏
└── store/
    ├── types.ts                # 类型定义
    ├── useDrawingStore.ts      # 绘图状态
    ├── useHistoryStore.ts      # 撤销/重做
    ├── useThemeStore.ts        # 主题切换
    └── useViewStore.ts         # 缩放/平移
```

<br />

## Testing

```bash
npm run test:run
```

<br />

## License

[MIT](LICENSE)
