<div align="center">

<br />

# 一个打开就能画的笔记本

<br />

<img src=".github/demo.gif" alt="MindNotes Pro Demo" width="100%" />

<br /><br />

> 别的白板要你注册。这个不用。\
> 别的白板要联网。这个不用。\
> 别的白板加载 2MB。这个 160KB。

<br />

<a href="https://11suixing11.github.io/mindnotes-pro/">
  <img src="https://img.shields.io/badge/▶_立即使用-c47a5a?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=b8654a" />
</a>
&nbsp;&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/releases/latest">
  <img src="https://img.shields.io/badge/↓_下载离线版-5c4f3d?style=for-the-badge&labelColor=9c8e7a" />
</a>

<br /><br />

[![Release](https://img.shields.io/github/v/release/11suixing11/mindnotes-pro?style=flat-square&color=c47a5a&labelColor=f5f0e8)](https://github.com/11suixing11/mindnotes-pro/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-c47a5a?style=flat-square&labelColor=f5f0e8)](LICENSE)
![Size](https://img.shields.io/badge/gzip-160KB-6a9c5a?style=flat-square&labelColor=f5f0e8)
[![CI](https://img.shields.io/github/actions/workflow/status/11suixing11/mindnotes-pro/deploy.yml?style=flat-square&label=build&color=6a9c5a)](https://github.com/11suixing11/mindnotes-pro/actions)

<br />

不注册 · 不联网 · 不打扰 · 数据只在你的浏览器里

<br /><br />

</div>

---

<br />

## 为什么不用 Excalidraw / tldraw

<br />

| | **MindNotes Pro** | Excalidraw | tldraw |
|:---|:---:|:---:|:---:|
| **中国直接打开** | **✅** | **❌** | **❌** |
| 完全离线 | ✅ | ⚠️ | ⚠️ |
| 需要注册 | ❌ | ❌ | ❌ |
| 外部 CDN | **0** | 多个 | 多个 |
| 笔刷种类 | **6** | 1 | 1 |
| 文本块 | ✅ 画布内编辑 | ⚠️ | ✅ |
| 框选多元素 | ✅ | ✅ | ✅ |
| 复制到系统剪贴板 | ✅ | ❌ | ❌ |
| 对齐辅助线 | ✅ | ✅ | ❌ |
| 形状填充 | ✅ | ✅ | ✅ |
| 多画布管理 | ✅ 文件夹 | ❌ | ❌ |
| 数据存储 | 本地 IndexedDB | 本地+云端 | 本地+云端 |
| 依赖数 | **4** | 20+ | 30+ |

<br />

**一句话：** 中国能用、不想注册、只想打开就画 — 用这个。

<br />

---

<br />

## 能做什么

<br />

| | 功能 | 详情 |
|:---:|:-----|:-----|
| ✏️ | **6 种笔刷** | 钢笔 · 荧光笔 · 铅笔 · 书法笔 · 虚线笔 · 霓虹笔 |
| 🔧 | **9 种工具** | 选择 · 画笔 · 橡皮 · 平移 · 矩形 · 圆形 · 文字 · 直线 · 箭头 |
| ✂️ | **局部橡皮擦** | 擦除笔画中间一段，自动拆分为多段，不再整条删除 |
| ☐ | **框选多元素** | 矩形框选多个元素，批量移动、删除、复制 |
| 📐 | **对齐辅助线** | 拖拽时自动吸附到其他元素的边缘和中心，松手消失 |
| 🎨 | **形状填充** | 矩形和圆形支持填充色，独立于描边色 |
| ⭕ | **Shift 约束** | 按住 Shift 画正圆和正方形 |
| 📝 | **所见即所得文字** | 透明 textarea 精确叠加在画布文字上，自动换行 |
| 📋 | **复制粘贴** | `Ctrl+C/V` 内部复制粘贴，同时写入系统剪贴板（PNG），可粘贴到微信/PS |
| 📷 | **图片插入** | 本地图片直接拖入画布 |
| 🔍 | **选中缩放** | 拖动四角控制点缩放任意元素 |
| 📁 | **多画布** | 侧栏文件夹管理，创建/切换/删除画布，实时缩略图预览 |
| 💾 | **6 种导出** | PNG · JPG · PDF · SVG · Word · JSON |
| 🌙 | **暗色模式** | 一键切换，跟随系统，自动持久化 |
| ⌨️ | **快捷键** | 0-8 切换工具，Ctrl+Z 撤销，Ctrl+C/V 复制粘贴，Ctrl+A 全选 |
| 💨 | **高性能** | 离屏 Canvas 缓存 + rAF 批处理，元素多也不卡 |
| 🔒 | **内存安全** | LRU 图片缓存（上限 50 张），长时间使用不崩溃 |

<br />

---

<br />

## 快速开始

<br />

**在线使用：** [https://11suixing11.github.io/mindnotes-pro/](https://11suixing11.github.io/mindnotes-pro/)

**下载离线版：** [Releases](https://github.com/11suixing11/mindnotes-pro/releases/latest) 下载 zip，解压后双击 `index.html`

**从源码运行：**

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

<br />

---

<br />

## 快捷键

<br />

### 工具切换

| `0` 选择 | `1` 画笔 | `2` 橡皮 | `3` 平移 | `4` 矩形 | `5` 圆形 | `6` 文字 | `7` 直线 | `8` 箭头 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|

### 操作

| `Ctrl+Z` 撤销 | `Ctrl+Shift+Z` 重做 | `Ctrl+C` 复制 | `Ctrl+V` 粘贴 | `Ctrl+A` 全选 | `Del` 删除 |
|:---:|:---:|:---:|:---:|:---:|:---:|

### 画布

| `+` 放大 | `-` 缩小 | `Scroll` 滚轮缩放 | `Shift` 正圆/正方形 |
|:---:|:---:|:---:|:---:|

<br />

---

<br />

## 技术栈

<br />

```
React 18  ·  TypeScript 5  ·  Vite 5  ·  Zustand 4  ·  Canvas API
```

**4 个生产依赖**：`react`、`react-dom`、`zustand`、`jspdf`

<br />

---

<br />

## 设计哲学

<br />

> 好设计，是克制的表达，也是有温度的思考。

| 原则 | 实践 |
|:-----|:-----|
| **呼吸感** | 大间距，少装饰，留白即信息 |
| **克制** | 4 个依赖，0 个 CDN，统一规则 |
| **质感** | SVG 噪点纸纹，毛玻璃面板，柔阴影 |
| **温度** | 暖色 `#f5f0e8` + 焦赭 `#c47a5a`，圆角 14px |
| **秩序** | 42px 工具按钮，8px 间距，统一动画曲线 |

<br />

---

<br />

<div align="center">

**如果这个项目帮你省了 5 分钟，一个 ⭐ 就是它应得的。**

<br />

<a href="https://11suixing11.github.io/mindnotes-pro/">在线使用</a>
&nbsp;·&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/releases">下载</a>
&nbsp;·&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/issues">反馈</a>

<br /><br />

</div>
