<div align="center">

<br />

# MindNotes Pro

### 开源免费的本地白板绘图应用

<br />

**在线使用 · 零注册 · 数据纯本地 · 中国 IP 直接访问**

<br />

<a href="https://11suixing11.github.io/mindnotes-pro/">
  <img src="https://img.shields.io/badge/🟢_在线体验-GitHub_Pages-22c55e?style=for-the-badge&logo=github&logoColor=white" alt="在线体验" />
</a>

<br /><br />

[![Release](https://img.shields.io/github/v/release/11suixing11/mindnotes-pro?color=blue&label=Release)](https://github.com/11suixing11/mindnotes-pro/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)

</div>

<br />

---

## 项目简介

MindNotes Pro 是一款轻量级的白板绘图应用，完全运行在浏览器中，数据 100% 保存在本地设备上。

无需注册、无需登录、无需联网。打开即用，关闭即存。

<br />

## 功能一览

### 绘图工具

| 工具 | 说明 | 快捷键 |
|:-----|:-----|:------:|
| 🔲 选择 | 点击选中对象，拖拽移动 | `0` |
| ✏️ 画笔 | 6 种笔型可选（钢笔/荧光笔/铅笔/书法笔/虚线笔/霓虹笔） | `1` |
| 🧹 橡皮 | 真正删除笔迹，虚线圆圈光标指示擦除范围 | `2` |
| ✋ 平移 | 拖拽移动画布视图 | `3` |
| ⬜ 矩形 | 拖拽绘制矩形 | `4` |
| ⭕ 圆形 | 拖拽绘制椭圆 | `5` |
| 🔤 文字 | 点击画布输入文字 | `6` |
| 📏 直线 | 拖拽绘制直线 | `7` |
| ➡️ 箭头 | 拖拽绘制箭头 | `8` |

### 笔型选择

| 笔型 | 效果 |
|:-----|:-----|
| ✒️ 钢笔 | 平滑流畅，Bézier 曲线插值 |
| 🖍 荧光笔 | 半透明宽笔，适合标注重点 |
| ✏️ 铅笔 | 粗糙质感，模拟真实铅笔 |
| 🖊 书法笔 | 粗细随角度变化 |
| ┅ 虚线笔 | 虚线笔迹 |
| ✨ 霓虹笔 | 发光效果，shadowBlur 双层渲染 |

### 其他功能

- **8 色调色板** + 自定义颜色拾色器
- **4 档线宽** — 细 / 中 / 粗 / 特粗
- **撤销 / 重做** — 50 步快照 (Ctrl+Z / Ctrl+Shift+Z)
- **缩放** — 鼠标滚轮 / 工具栏按钮 / 快捷键 +/-
- **深色模式** — 一键切换明暗主题
- **画布背景** — 自定义背景颜色
- **最小地图** — 右下角缩略导航
- **localStorage 自动保存** — 刷新页面不丢失
- **6 格式导出** — PNG / JPG / PDF / SVG / Word / JSON
- **导入 JSON** — 恢复之前保存的绘图数据
- **插入图片** — 本地图片放入画布
- **全屏模式** — 浏览器全屏

<br />

## 快速开始

### 方式一：在线使用（推荐）

> 国内用户直接访问，无需梯子：
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

## 快捷键

| 按键 | 功能 |
|:-----|:-----|
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

## 技术栈

| 层级 | 技术 |
|:-----|:-----|
| UI 框架 | React 18 |
| 语言 | TypeScript 5 |
| 构建工具 | Vite 5 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS 3 |
| 绘图引擎 | Canvas API |
| 测试 | Vitest + Testing Library |

**生产依赖仅 3 个**：`react`、`react-dom`、`zustand`

**零外部 CDN · 零网络请求 · 中国 IP 直接访问**

<br />

## 项目结构

```
src/
├── main.tsx                 # 入口
├── App.tsx                  # 主应用
├── AppWrapper.tsx           # ErrorBoundary
├── index.css                # 设计系统 (CSS 变量 + 动画)
├── components/
│   ├── Canvas.tsx           # 画布 (绘图 + 缩放 + 最小地图)
│   └── Toolbar.tsx          # 工具栏 (左侧工具 + 顶部属性 + 导出)
└── store/
    ├── types.ts             # 类型定义
    ├── useDrawingStore.ts   # 绘图状态 + localStorage
    ├── useThemeStore.ts     # 深色/浅色主题
    └── useViewStore.ts      # 缩放/平移
```

<br />

## 构建

```bash
npm run build      # 生产构建 → dist/
npm run preview    # 预览构建产物
npm run test:run   # 运行测试
```

构建产物为纯静态文件，可部署到任意 HTTP 服务器。

<br />

## 许可证

[MIT](LICENSE)
