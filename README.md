<div align="center">

# MindNotes Pro

**开源免费的本地白板绘图应用**

<br />

在线体验 · 零注册 · 数据纯本地 · 国内可直接访问

<br />

<a href="https://11suixing11.github.io/mindnotes-pro/">
  <img src="https://img.shields.io/badge/🌐_在线体验-GitHub_Pages-22c55e?style=for-the-badge&logo=github" alt="在线体验" />
</a>

<br /><br />

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)

</div>

<br />

## ✨ 功能特性

| 工具 | 说明 | 快捷键 |
|------|------|--------|
| ✏️ 画笔 | 6 种笔型 (钢笔/荧光笔/铅笔/书法笔/虚线笔/霓虹笔) | `1` |
| 🧹 橡皮 | 真正删除笔迹，非白色覆盖 | `2` |
| ✋ 平移 | 拖拽移动画布 | `3` |
| ⬜ 矩形 | 拖拽绘制矩形 | `4` |
| ⭕ 圆形 | 拖拽绘制椭圆 | `5` |
| 🔤 文字 | 点击画布输入文字 | `6` |
| 📏 直线 | 拖拽绘制直线 | `7` |
| ➡️ 箭头 | 拖拽绘制箭头 | `8` |
| 🔲 选择 | 点击选中对象，拖拽移动 | `0` |

**其他功能：** 8色调色板 + 自定义颜色 · 4档线宽 · 撤销/重做 · 缩放 · 深色模式 · 画布背景自定义 · 最小地图导航 · localStorage 自动保存 · 6格式导出 (PNG/JPG/PDF/SVG/Word/JSON) · 导入 JSON · 插入图片 · 全屏模式

<br />

## 🚀 快速开始

### 方式一：直接在线使用（推荐）

> **国内用户直接访问，无需梯子：**
>
> 👉 **https://11suixing11.github.io/mindnotes-pro/**

<br />

### 方式二：本地运行

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

浏览器自动打开 `http://localhost:3000`。

<br />

## ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| `0` | 选择工具 |
| `1` | 画笔 |
| `2` | 橡皮 |
| `3` | 平移 |
| `4` | 矩形 |
| `5` | 圆形 |
| `6` | 文字 |
| `7` | 直线 |
| `8` | 箭头 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` | 重做 |
| `+` / `-` | 放大 / 缩小 |
| `Delete` | 清空画布 |

<br />

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| UI 框架 | React 18 |
| 语言 | TypeScript 5 |
| 构建工具 | Vite 5 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS 3 |
| 绘图引擎 | Canvas API |
| 测试 | Vitest + Testing Library |

生产依赖仅 **3 个**：`react`、`react-dom`、`zustand`。

零外部 CDN，零网络请求，中国 IP 直接访问。

<br />

## 📁 项目结构

```
src/
├── main.tsx                 # 入口
├── App.tsx                  # 主应用
├── AppWrapper.tsx           # ErrorBoundary
├── index.css                # 设计系统 (CSS 变量 + 动画 + 毛玻璃)
├── components/
│   ├── Canvas.tsx           # 画布 (6种笔型 + 选择/移动 + 缩放 + 最小地图)
│   └── Toolbar.tsx          # 工具栏 (左侧工具 + 顶部属性 + 导出)
└── store/
    ├── types.ts             # 类型定义
    ├── useDrawingStore.ts   # 绘图状态 + localStorage + 撤销重做
    ├── useThemeStore.ts     # 深色/浅色主题
    └── useViewStore.ts      # 缩放/平移
```

<br />

## 🔨 构建

```bash
npm run build      # 生产构建 → dist/
npm run preview    # 预览构建产物
npm run test:run   # 运行测试
```

构建产物为纯静态文件，可部署到任意 HTTP 服务器。

<br />

## 📄 许可证

[MIT](LICENSE)
