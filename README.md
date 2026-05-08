<div align="center">

<br /><br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/11suixing11/mindnotes-pro/main/.github/mindnotes-dark.svg">
  <img src="https://raw.githubusercontent.com/11suixing11/mindnotes-pro/main/.github/mindnotes-light.svg" alt="MindNotes Pro" width="480">
</picture>

<br /><br />

<a href="https://11suixing11.github.io/mindnotes-pro/">
  <img src="https://img.shields.io/badge/打开画布-c47a5a?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=b8654a" />
</a>
&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/releases/latest">
  <img src="https://img.shields.io/badge/下载离线版-5c4f3d?style=for-the-badge&labelColor=9c8e7a" />
</a>

<br /><br />

<table>
<tr>
<td align="center" width="20%"><b>3</b><br/><sub>生产依赖</sub></td>
<td align="center" width="20%"><b>0</b><br/><sub>外部 CDN</sub></td>
<td align="center" width="20%"><b>160KB</b><br/><sub>gzip 体积</sub></td>
<td align="center" width="20%"><b>6</b><br/><sub>笔刷类型</sub></td>
<td align="center" width="20%"><b>∞</b><br/><sub>画布数量</sub></td>
</tr>
</table>

<br />

[![Release](https://img.shields.io/github/v/release/11suixing11/mindnotes-pro?style=flat-square&color=c47a5a&labelColor=f5f0e8&label=Latest)](https://github.com/11suixing11/mindnotes-pro/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-c47a5a?style=flat-square&labelColor=f5f0e8)](LICENSE)
![Dependencies](https://img.shields.io/badge/dependencies-3-6a9c5a?style=flat-square&labelColor=f5f0e8)
[![CI](https://img.shields.io/github/actions/workflow/status/11suixing11/mindnotes-pro/deploy.yml?style=flat-square&label=CI&color=6a9c5a)](https://github.com/11suixing11/mindnotes-pro/actions)

<br /><br />

**打开就能画，能写，能存。不联网，不注册，不打扰。**

<br /><br />

</div>

---

<br />

<table>
<tr>
<td width="50%" valign="top">

### 画布

- 无限画布，滚轮缩放，小地图导航
- 6 种笔刷：钢笔 / 荧光笔 / 铅笔 / 书法笔 / 虚线笔 / 霓虹笔
- 9 种工具：选择 / 画笔 / 橡皮 / 平移 / 矩形 / 圆形 / 文字 / 直线 / 箭头
- 选中缩放：拖动四角控制点
- 真橡皮：删除笔迹，不是白色覆盖

</td>
<td width="50%" valign="top">

### 笔记本

- 多画布管理：左侧栏文件夹 + 画布列表
- 文本块：画布上直接打字，可拖拽缩放编辑
- 图片插入：本地文件直接拖入画布
- 自动保存：IndexedDB，1.5 秒防抖
- 数据永不出浏览器

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 导出

- **PNG** — 透明或纯色背景
- **JPG** — 白色背景，92% 质量
- **PDF** — 自适应方向
- **SVG** — 无损矢量
- **Word** — 嵌入截图
- **JSON** — 完整备份与恢复

</td>
<td width="50%" valign="top">

### 体验

- 暖色纸纹设计，不刺眼
- 暗色模式，跟随系统
- 自定义画布背景色
- 全屏模式
- 触屏绘图支持
- 快捷键全覆盖（0-8 切换工具）

</td>
</tr>
</table>

<br />

---

<br />

<div align="center">

### 快捷键

</div>

<br />

| `0` 选择 | `1` 画笔 | `2` 橡皮 | `3` 平移 | `4` 矩形 | `5` 圆形 | `6` 文字 | `7` 直线 | `8` 箭头 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|

<br />

| `Ctrl+Z` 撤销 | `Ctrl+Shift+Z` 重做 | `+/-` 缩放 | `Scroll` 滚轮缩放 | `Del` 删除选中 |
|:---:|:---:|:---:|:---:|:---:|

<br />

---

<br />

<div align="center">

### 快速开始

</div>

<br />

**在线使用** → [https://11suixing11.github.io/mindnotes-pro/](https://11suixing11.github.io/mindnotes-pro/)

**下载离线版** → [Releases](https://github.com/11suixing11/mindnotes-pro/releases/latest) 下载 zip，解压后双击 `index.html`

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

<div align="center">

### 技术栈

</div>

<br />

```
React 18  ·  TypeScript 5  ·  Vite 5  ·  Zustand  ·  Canvas API
```

<br />

| 层 | 技术 | 选型理由 |
|:---|:-----|:---------|
| UI | React 18 | Hooks 组件，订阅式渲染 |
| 语言 | TypeScript 5 | 类型安全，消除 20+ 处 any |
| 构建 | Vite 5 | 即时 HMR，2 秒构建 |
| 状态 | Zustand | < 1KB，零样板，订阅式 |
| 渲染 | Canvas API | 硬件加速 2D，像素级控制 |
| 存储 | IndexedDB | 无 5MB 限制，支持大文件 |
| 导出 | jsPDF | 动态导入，独立 chunk |

<br />

---

<br />

<div align="center">

### 架构

</div>

<br />

```
src/
├── App.tsx                    主入口
├── components/
│   ├── Canvas.tsx             统一画布（笔迹 + 形状 + 文本块 + 图片）
│   ├── Sidebar.tsx            侧栏（文件夹 + 画布管理）
│   └── Toolbar.tsx            工具栏
└── store/
    ├── appStore.ts            唯一 store
    ├── storage.ts             IndexedDB 抽象
    ├── types.ts               CanvasElement 联合类型
    ├── useViewStore.ts        缩放 / 平移
    └── useThemeStore.ts       主题
```

<br />

**数据模型：**

```typescript
type CanvasElement = StrokeElement | ShapeElement | TextElement | ImageElement
```

所有元素统一存储，统一渲染管线，统一撤销重做。零 `any` 类型。

<br />

---

<br />

<div align="center">

### 设计哲学

</div>

<br />

> 好设计，是克制的表达，也是有温度的思考。

<br />

| 原则 | 实践 |
|:-----|:-----|
| **呼吸感** | 大间距，少装饰，留白即信息 |
| **克制** | 3 个依赖，0 个 CDN，统一规则 |
| **质感** | SVG 噪点纸纹，毛玻璃面板，柔阴影 |
| **温度** | 暖色 `#f5f0e8` + 焦赭 `#c47a5a`，圆角 14px |
| **秩序** | 42px 工具按钮，8px 间距，统一动画曲线 |
| **层次** | 主操作突出，次操作退后，信息等级清晰 |

<br />

---

<br />

<div align="center">

### 浏览器支持

</div>

<br />

| Chrome / Edge 90+ | Firefox 90+ | Safari 15+ | 移动端 |
|:---:|:---:|:---:|:---:|
| ✅ | ✅ | ✅ | ✅ 触屏绘图 |

<br />

---

<br />

<div align="center">

**用心做的东西，自己会跑。**

<br />

<a href="https://11suixing11.github.io/mindnotes-pro/">在线使用</a>
&nbsp;·&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/releases">下载</a>
&nbsp;·&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/issues">反馈</a>

<br /><br />

</div>
