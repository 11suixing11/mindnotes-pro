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
| 多画布管理 | ✅ 文件夹 | ❌ | ❌ |
| 数据存储 | 本地 IndexedDB | 本地+云端 | 本地+云端 |
| 依赖数 | **3** | 20+ | 30+ |

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
| 📝 | **文本块** | 画布上直接打字，可拖拽、缩放、双击编辑 |
| 📷 | **图片插入** | 本地图片直接拖入画布 |
| 🔍 | **选中缩放** | 拖动四角控制点缩放任意元素 |
| 📁 | **多画布** | 侧栏文件夹管理，创建/切换/删除画布 |
| 💾 | **6 种导出** | PNG · JPG · PDF · SVG · Word · JSON |
| 🌙 | **暗色模式** | 一键切换，跟随系统 |
| ⌨️ | **快捷键** | 0-8 切换工具，Ctrl+Z 撤销，滚轮缩放 |

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

| `0` 选择 | `1` 画笔 | `2` 橡皮 | `3` 平移 | `4` 矩形 | `5` 圆形 | `6` 文字 | `7` 直线 | `8` 箭头 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|

| `Ctrl+Z` 撤销 | `Ctrl+Shift+Z` 重做 | `+/-` 缩放 | `Scroll` 滚轮缩放 | `Del` 删除选中 |
|:---:|:---:|:---:|:---:|:---:|

<br />

---

<br />

## 顶级产品经理视角：怎么看这个项目

<br />

### 我会怎么评价

1. **定位非常清晰**：围绕「中国可用、无需注册、离线可用」这个高频刚需，价值主张直接且有辨识度。  
2. **产品取舍很克制**：以低依赖和本地优先换来高可用性与隐私信任，形成了差异化壁垒。  
3. **核心体验完成度高**：从绘制、管理到导出链路完整，已经具备“可长期使用”的产品雏形。  

### 我会给的建议（按优先级）

1. **先补齐关键正确性问题**：优先修复文件夹与画布关联、导出一致性等直接影响用户信任的问题。  
2. **把“能用”升级为“顺手”**：统一错误反馈（替换阻断式 `alert`）、补充空状态引导和关键交互提示。  
3. **建立增长闭环**：在导出成功、完成作品等高价值时刻增加轻量化分享与 Star 引导。  
4. **提升可维护性**：拆分超大组件、补齐核心交互测试，降低后续迭代成本。  

> 更详细的完整分析见：[ANALYSIS.md](./ANALYSIS.md)

<br />

---

<br />

## 技术栈

<br />

```
React 18  ·  TypeScript 5  ·  Vite 5  ·  Zustand  ·  Canvas API
```

**3 个生产依赖**：`react`、`react-dom`、`zustand`

<br />

---

<br />

## 设计哲学

<br />

> 好设计，是克制的表达，也是有温度的思考。

| 原则 | 实践 |
|:-----|:-----|
| **呼吸感** | 大间距，少装饰，留白即信息 |
| **克制** | 3 个依赖，0 个 CDN，统一规则 |
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
