<div align="center">
<img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />

# MindNotes Pro

**全球首款搭载物理擦除引擎的白板应用。**  
一款漂亮的本地白板画图应用，用起来像在纸上画画一样自然。

不联网、不追踪、不收费。打开就画。

<p>
  <a href="https://11suixing11.github.io/mindnotes-pro"><img src="https://img.shields.io/badge/✨_体验物理擦除-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="立即体验" /></a>
  &nbsp;
  <a href="#快速开始"><img src="https://img.shields.io/badge/📦_快速开始-2ECC71?style=for-the-badge" alt="快速开始" /></a>
</p>

<p>
  <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/11suixing11/mindnotes-pro/stargazers"><img src="https://img.shields.io/github/stars/11suixing11/mindnotes-pro?style=social" alt="GitHub Stars" /></a>
  <a href="https://github.com/11suixing11/mindnotes-pro/network/members"><img src="https://img.shields.io/github/forks/11suixing11/mindnotes-pro?style=social" alt="GitHub Forks" /></a>
  <img src="https://img.shields.io/badge/version-3.3.0-00C9A7?style=flat-square" alt="Version 3.3.0" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/仅_5_个运行时依赖-green" alt="仅 5 个运行时依赖" />
</p>

<p>
  <strong>🌐 语言：</strong>
  <a href="README.md">English</a> ·
  <strong>中文</strong> ·
  <a href="README_JA.md">日本語</a>
</p>
</div>

---

## 目录

- [为什么选择 MindNotes Pro？](#-为什么选择-mindnotes-pro)
- [物理擦除引擎 — 工作原理](#-物理擦除引擎--工作原理)
- [功能亮点](#-功能亮点)
- [截图](#截图)
- [竞品对比](#竞品对比)
- [快速开始](#快速开始)
- [快捷键](#快捷键)
- [技术栈](#技术栈)
- [性能](#-性能)
- [设计理念](#-设计理念)
- [路线图](#️-路线图)
- [常见问题](#-常见问题)
- [参与贡献](#-参与贡献)
- [支持项目](#-支持项目)
- [许可证](#许可证)

---

## 🏆 为什么选择 MindNotes Pro？

<div align="center">
  <img src=".github/demo.gif" alt="MindNotes Pro 物理擦除演示" width="80%" />
</div>

> **每个白板都有橡皮擦。但没有一个有物理引擎。**

大多数白板应用把擦除当作一个二元操作 —— 笔触要么存在，要么被删除。MindNotes Pro 把擦除重新想象为一种**物理交互**，有压力、摩擦、磨损，甚至还有声音反馈。

**它有什么不同？**

| 特性 | 传统橡皮擦 | MindNotes Pro 物理擦除 |
| --- | --- | --- |
| 擦除行为 | 二元删除 | 压力敏感的部分擦除 |
| 橡皮状态 | 始终不变 | 随使用而磨损，可削尖恢复 |
| 形状 | 千篇一律 | 圆形、方形、凿形，支持旋转 |
| 倾斜支持 | 无 | Apple Pencil 侧擦 |
| 反馈 | 静默 | 粒子效果 + 动态音效 |
| 真实感 | "删除按钮" | "就像真的橡皮擦" |

---

## 🧽 物理擦除引擎 — 工作原理

物理擦除引擎不是一个噱头 —— 它是一个**自研物理仿真引擎**，包含 1,200+ 行物理代码、22 轮优化，以及独立的空间索引系统。

### 核心系统

**1. 压力感应**
重压完全擦除笔触，轻压逐渐淡化。压力曲线使用非线性指数（`pressure^0.7`），重压时快速饱和 —— 就像按压真正的橡皮擦，更用力并不会按比例增加擦除效果。

**2. 磨损模拟**
每次擦除都会磨损橡皮。磨损由以下因素计算：
- **压力** —— 按得越用力，磨损越快
- **硬度** —— 硬橡皮（2B）比软橡皮（6B）更耐用
- **速度** —— 最优擦除速度可减少磨损

当橡皮变钝时，笔触会淡化而不是消失。按 `R` 键"削橡皮" —— 恢复全部擦除能力。

**3. 形状感知**
三种橡皮形状，各有不同行为：
- **圆形** —— 各方向均匀擦除
- **方形** —— 覆盖面积更大，旋转影响接触区域
- **凿形** —— 精确边缘操作，适合细节修正

每种形状都支持旋转，凿形会根据角度改变行为。

**4. 倾斜支持（Apple Pencil）**
使用 Apple Pencil 时，倾斜笔身会激活侧擦 —— 就像倾斜真正的橡皮擦使用侧面。`tiltX` 和 `tiltY` 值直接从指针事件 API 读取。

**5. 粒子系统**
专用的 `EraserParticleSystem` 在擦除点生成橡皮屑粒子。粒子具有：
- 物理属性：重力、空气摩擦、基于擦除方向的初始速度
- 视觉效果：大小变化、旋转、莫奈调色板颜色
- 生命周期：生成 → 飞散 → 淡出 → 回收

最多同时存在 200 个粒子，自动回收保证性能。

**6. 音效引擎**
`EraserAudioEngine` 使用 Web Audio API 生成实时音效。声音特性随以下因素变化：
- **压力** —— 用力按时声音更大、音调更低
- **速度** —— 擦得越快频率越高
- **磨损** —— 钝橡皮发出沉闷的声音
- **品牌** —— 每个橡皮品牌有自己的波形和频率

**7. 空间索引**
基于 `RBush` 的空间索引将命中检测从 O(n) 加速到 O(log n)。配合脏矩形优化和 LRU 缓存，即使在大画布上也能保持 60fps。

### 橡皮预设

| 预设 | 硬度 | 磨损速率 | 半径 | 适用场景 |
| --- | --- | --- | --- | --- |
| **2B**（硬橡皮） | 0.85 | 慢 | 8px | 精确细节修改 |
| **4B**（中性） | 0.50 | 中等 | 12px | 日常擦除（默认） |
| **6B**（软橡皮） | 0.20 | 快 | 18px | 大面积柔和擦除 |

### 品牌皮肤（规划中）

每个品牌皮肤会修改物理特性和视觉外观：

| 品牌 | 产地 | 颜色 | 特色 |
| --- | --- | --- | --- |
| 🌸 樱花 | 日本 | 粉色 | 顺滑、耐用 |
| 🔵 辉柏嘉 | 德国 | 蓝色 | 专业级、耐磨 |
| 🟡 施德楼 | 德国 | 黄色 | 工程精度 |
| 🟢 三菱 | 日本 | 绿色 | 超顺滑、画师首选 |

---

## ✨ 功能亮点

> **为什么开发者和设计师都在转向 MindNotes Pro：**

<div align="center">

| | 功能 | 详情 |
| ---: | --- | --- |
| 🎯 | **全球首创物理擦除引擎** | 22 轮优化，1,200+ 行物理代码 |
| 🪶 | **仅 5 个运行时依赖** | React、ReactDOM、Zustand、perfect-freehand、jsPDF |
| ⚡ | **不到 1 秒冷启动** | 无 Electron，无打包膨胀 —— 纯 Vite + Canvas |
| 📲 | **离线 PWA** | 安装到任何设备，无需联网 |
| 🔒 | **零云端依赖** | 所有数据保存在 localStorage —— 永远不离开你的设备 |
| 🎨 | **莫奈印象派美学** | 水彩调色板、毛玻璃、纸张纹理 |
| ✏️ | **6 种笔刷风格** | 钢笔、荧光笔、铅笔、书法笔、虚线笔、发光笔 |
| 📝 | **文字注释** | 画布内联文字，自动调整大小 |
| 🖼️ | **图片粘贴** | 直接从剪贴板粘贴图片 |
| 🔷 | **图形工具** | 矩形、圆形、线条、箭头 —— 均支持填充 |
| 🖱️ | **框选操作** | 多选、缩放、移动、吸附对齐 |
| ↩️ | **撤销/重做** | 完整历史记录，支持快捷键 |
| 🌙 | **暗色模式** | 自动检测系统偏好 |
| 📄 | **导出** | PDF（jsPDF）和 PNG 导出 |
| 🗂️ | **多文档** | 文件夹层级、拖放、自动保存 |
| ⌨️ | **专业快捷键** | 在应用中按 `?` 查看完整列表 |

</div>

```bash
git clone https://github.com/11suixing11/mindnotes-pro && cd mindnotes-pro && npm i && npm run dev
```

---

## 谁适合用？

| 你是... | MindNotes Pro 帮你... |
| --- | --- |
| 🎨 **艺术家 / 手绘爱好者** | 体验目前最真实的数字擦除效果 |
| 🎓 **学生** | 上课时快速画图、标注知识点 |
| 💡 **设计师** | 不开 Figma 也能快速草拟方案 |
| 👩‍💻 **开发者** | 白板上画系统架构和流程图 |
| 📋 **笔记爱好者** | 在同一块画布上混合手写、图形和文字 |
| 🧠 任何**视觉化思考者** | 把脑子里的想法倒到画布上 —— 立刻 |

---

## 截图

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>☀️ 亮色模式</strong></td>
      <td align="center"><strong>🌙 暗色模式</strong></td>
    </tr>
    <tr>
      <td><img src=".github/mindnotes-light.svg" width="420" /></td>
      <td><img src=".github/mindnotes-dark.svg" width="420" /></td>
    </tr>
  </table>
</div>

---

## 竞品对比

**物理擦除让我们与众不同 —— 没有其他人有这个！**

| | MindNotes Pro 🏆 | Excalidraw | tldraw | Drawnix | Miro |
| --- | :---: | :---: | :---: | :---: | :---: |
| **物理擦除引擎** | ✅ **有** | ❌ | ❌ | ❌ | ❌ |
| **压力感应** | ✅ **有** | ❌ | ❌ | ❌ | ❌ |
| **磨损模拟** | ✅ **有** | ❌ | ❌ | ❌ | ❌ |
| **橡皮屑粒子** | ✅ **有** | ❌ | ❌ | ❌ | ❌ |
| **音效反馈** | ✅ **有** | ❌ | ❌ | ❌ | ❌ |
| **开源** | ✅ MIT | ✅ MIT | ⚠️ 部分 | ✅ MIT | ❌ |
| **本地优先** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **运行时依赖** | **5** 🪶 | 30+ | 50+ | 20+ | N/A |
| **包体积** | **< 200 KB** | ~2 MB | ~3 MB | ~1.5 MB | N/A |
| **加载时间** | **< 1秒** ⚡ | 3-5秒 | 3-5秒 | 2-4秒 | 5秒+ |
| **离线 PWA** | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| **自定义美学** | ✅ 莫奈风 🎨 | ✅ 手绘风 | ⚠️ 基础 | ✅ 简洁 | ✅ 付费 |
| **遥测/追踪** | ✅ **无** | ⚠️ 有 | ⚠️ 有 | ✅ 无 | ✅ 多 |
| **永久免费** | ✅ | ✅ | ⚠️ 付费 | ✅ | ❌ $$$ |

---

## 快速开始

### 前置要求

- **Node.js** 18+（推荐 LTS 版本）
- **npm** 9+（或 pnpm / yarn）

### 方式一：在线使用

👉 **[打开 MindNotes Pro](https://11suixing11.github.io/mindnotes-pro)** —— 无需安装，无需注册。**试试物理擦除！**

### 方式二：本地运行

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) —— 30 秒内开始画画。

### 方式三：部署你自己的

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://vercel.com/button" alt="Deploy to Vercel" height="32" />
  </a>
  &nbsp;
  <a href="https://app.netlify.com/start/deploy?repository=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify" height="32" />
  </a>
</p>

### 开发命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（http://localhost:3000） |
| `npm run build` | TypeScript 检查 + Vite 生产构建 |
| `npm run test` | Vitest 监听模式 |
| `npm run test:run` | Vitest 单次运行 |
| `npm run lint` | ESLint 检查 |

---

## 快捷键

在应用中按 `?` 查看全部快捷键。常用快捷键：

| 快捷键 | 功能 |
| --- | --- |
| `P` | 画笔 |
| `E` | 橡皮擦（物理模式） |
| `S` | 选择工具 |
| `T` | 文字工具 |
| `R` / `C` / `L` / `A` | 矩形 / 圆形 / 线条 / 箭头 |
| `Space` + 拖拽 | 平移画布 |
| `Ctrl` + `Z` / `Y` | 撤销 / 重做 |
| `Ctrl` + `A` | 全选 |
| `Ctrl` + `C` / `V` | 复制 / 粘贴 |
| `Ctrl` + `E` | 导出菜单 |
| `Delete` | 删除选中 |
| `滚轮` | 缩放 |
| `Dark/Light` | 切换主题 |

**橡皮擦专用快捷键：**

| 快捷键 | 功能 |
| --- | --- |
| `1` / `2` / `3` | 切换橡皮形状（圆形 / 方形 / 凿形） |
| `Q` / `W` / `E` | 切换橡皮预设（2B / 4B / 6B） |
| `R` | 削橡皮（重置磨损） |
| `M` | 开关擦除音效 |
| `[` / `]` | 调整橡皮大小 |

---

## 技术栈

| 层级 | 选型 | 原因 |
| --- | --- | --- |
| UI | React 18 + TypeScript | 类型安全、并发特性 |
| 状态 | Zustand（6 个 slice） | 极小（~1KB）、无样板代码、优秀的 DX |
| 绘图 | perfect-freehand + Canvas API | 自然笔触、硬件加速 |
| **擦除** | **自研物理引擎 + RBush** | **业界独家 —— 1,200+ 行物理代码** |
| 音效 | Web Audio API | 实时音效合成，无需音频文件 |
| 粒子 | 自研粒子系统 | 200 个并发粒子，60fps |
| 样式 | Tailwind CSS + 莫奈配色 | 默认就很美、实用优先 |
| 导出 | jsPDF（懒加载） | 不影响首屏加载 |
| 构建 | Vite 5 | 即时 HMR、优化分包 |
| 测试 | Vitest + Testing Library | 574+ 单元测试、60%+ 覆盖率 |

### 项目结构

```
src/
├── canvas/                    # Canvas 绘图引擎与工具
│   ├── canvasUtils.ts         # 笔触渲染、命中检测、边界计算
│   └── useCanvasRenderer.ts   # 主渲染循环 Hook
├── eraser/                    # 物理擦除引擎（我们的核心珍宝）
│   ├── PhysicsEraserEngine.ts # 核心物理：压力、磨损、强度
│   ├── SpatialIndex.ts        # RBush 的 O(log n) 命中检测
│   ├── EraserParticleSystem.ts# 粒子效果引擎
│   ├── EraserAudioEngine.ts   # Web Audio API 音效合成
│   ├── eraserStore.ts         # 擦除状态管理
│   ├── eraserRendering.ts     # 橡皮擦光标与 UI 渲染
│   ├── types.ts               # 类型定义与预设配置
│   ├── performanceOptimizer.ts# 脏矩形与 LRU 缓存优化
│   └── __tests__/             # 仅擦除器就有 39 个测试文件
├── components/
│   ├── canvas/                # Canvas 组件与 Hooks
│   ├── eraser/                # 橡皮擦控制与设置 UI
│   ├── toolbar/               # 工具选择、取色器、笔刷
│   ├── sidebar/               # 文档/文件夹管理
│   ├── export-menu/           # PDF/PNG 导出
│   └── ...                    # Toast、弹窗、引导
├── store/
│   ├── slices/                # Zustand Slices（共 6 个）
│   ├── appStore.ts            # 组合 Store
│   ├── saveManager.ts         # 自动保存到 localStorage
│   └── types.ts               # TypeScript 类型
└── App.tsx                    # 根组件
```

---

## 💬 用户怎么说

> _"物理擦除太离谱了。我之前不知道我需要这个，试过之后回不去普通橡皮擦了。"_
> — ⭐ 早期用户

> _"终于有一个 < 200KB 的白板应用了。我的学生们超爱用它画示意图。"_
> — ⭐ 教育工作者

> _"莫奈配色太好看了。我从 Excalidraw 转过来做快速草图。"_
> — ⭐ 设计师

> _"擦除现在居然有爽感了。那个粒子效果绝了。"_
> — ⭐ 艺术家

**你在用 MindNotes Pro 吗？** [分享你的使用体验](https://github.com/11suixing11/mindnotes-pro/discussions/showcase) —— 我们很想听听你的想法！

---

## 🚀 性能

MindNotes Pro 为速度而生。每一个优化决策都是有意为之。

| 指标 | 数值 | 实现方式 |
| --- | --- | --- |
| **包体积** | < 200 KB gzip | 5 个运行时依赖、Tree-shaking、代码分割 |
| **冷启动** | < 1 秒 | Vite 构建、无框架开销 |
| **画布帧率** | 稳定 60fps | 脏矩形渲染、空间索引 |
| **擦除延迟** | < 16ms/帧 | RBush 的 O(log n) 命中检测 |
| **内存占用** | ~50MB 典型 | 有界 LRU 缓存 |
| **Lighthouse** | 95+ 性能分 | PWA 优化、懒加载导出 |

### 关键优化

- **空间索引** —— RBush 实现 O(log n) 元素查找，替代 O(n) 线性扫描
- **脏矩形渲染** —— 只重绘变化区域，而非整个画布
- **LRU 缓存** —— 边界缓存、渐变缓存、路径缓存，自动淘汰
- **笔触边界缓存** —— 基于 WeakMap 的惰性计算与失效检测
- **ID→元素映射** —— O(1) 元素查找替代 O(n) 数组搜索
- **批量绘制调用** —— 分组渲染操作，减少 Canvas 状态切换
- **粒子回收** —— 死亡粒子被回收而非垃圾回收

---

## 🎨 设计理念

### 1. 永远本地优先

你的数据属于你。MindNotes Pro 将所有数据存储在浏览器的 localStorage 中。没有服务器、没有账号、没有"登录后保存"。关闭浏览器明天再来，你的作品依然在那里。

### 2. 最少依赖，最大信任

每个依赖都是潜在的安全风险和维护负担。我们只使用 5 个运行时包 —— 每一个都不可或缺：
- **react** + **react-dom** —— UI 框架
- **zustand** —— 状态管理（~1KB）
- **perfect-freehand** —— 自然笔触渲染
- **jspdf** —— PDF 导出（懒加载）

### 3. 美观是功能

灵感来自莫奈的印象派调色板 —— 水彩渐变、毛玻璃面板、纸张纹理。数字工具应该温暖而有人情味，而不是冰冷的。

### 4. 物理大于像素

橡皮擦不是一个换了皮肤的删除按钮。它是一个仿真。压力很重要。磨损会累积。声音会响应你的操作。这种对物理真实感的执着，让 MindNotes Pro 感觉与众不同。

---

## 🗺️ 路线图

| 版本 | 功能 | 状态 |
| --- | --- | --- |
| v3.3 | 🧽 **物理擦除引擎** —— 22 轮优化全部交付 | ✅ **已发布** |
| v3.4 | 🎨 **橡皮品牌皮肤** —— 樱花、辉柏嘉等 | 📋 规划中 |
| v3.4 | ⌨️ **快捷键自定义** —— 重新映射任何快捷键 | 📋 规划中 |
| v4.0 | 🤝 **实时协作** —— 在同一块画布上一起画 | 🔄 规划中 |
| v4.0 | 🔌 **插件系统** —— 扩展自定义笔刷、形状和导出 | 🔄 规划中 |
| v4.0 | 📱 **移动端优化** —— 触摸手势、响应式工具栏 | 🔄 规划中 |

> 对路线图有想法？[发起讨论](https://github.com/11suixing11/mindnotes-pro/discussions) 告诉我们！

---

## ❓ 常见问题

<details>
<summary><strong>问：我的数据安全吗？</strong></summary>

完全安全。所有数据存储在浏览器的 localStorage 中。不会发送到任何服务器。没有分析脚本、没有追踪、没有 Cookie。你可以打开浏览器的"网络"面板验证 —— 你会看到零出站请求。
</details>

<details>
<summary><strong>问：可以离线使用吗？</strong></summary>

可以。MindNotes Pro 是一个渐进式 Web 应用（PWA）。首次访问后，它完全离线工作。你可以从浏览器的"添加到主屏幕"或地址栏安装提示中安装它。
</details>

<details>
<summary><strong>问：支持哪些浏览器？</strong></summary>

MindNotes Pro 支持所有现代浏览器：
- ✅ Chrome / Edge 90+
- ✅ Firefox 90+
- ✅ Safari 15+
- ✅ Arc、Brave、Vivaldi

物理擦除在使用压感输入设备（Apple Pencil、Wacom 等）时效果最佳，但也支持普通鼠标。
</details>

<details>
<summary><strong>问：能处理多少数据？</strong></summary>

localStorage 每个源有约 5MB 的限制。一个包含数百个笔触的典型文档约占 100-500KB。对于非常大的画布，我们正在开发 IndexedDB 支持以实现无限存储。
</details>

<details>
<summary><strong>问：可以用于商业用途吗？</strong></summary>

可以。MindNotes Pro 采用 MIT 许可证。你可以出于任何目的使用、修改和分发它，包括商业用途。不需要署名（但我们很感激！）。
</details>

<details>
<summary><strong>问：如何参与贡献？</strong></summary>

我们欢迎所有贡献！查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发环境搭建、代码规范和 PR 指南。如果你是新手，可以看看 [Good First Issues](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue)。
</details>

<details>
<summary><strong>问：为什么只有 5 个依赖？</strong></summary>

每个依赖都是供应链风险、版本冲突的隐患和包体积的代价。通过最小化依赖，我们获得：更快的安装、更小的包、更少的 CVE、以及对每一行代码的完全理解。Web 平台比你想象的更强大。
</details>

<details>
<summary><strong>问：有桌面应用吗？</strong></summary>

还没有，但已在路线图上。架构已经支持 Electron/Tauri 封装。目前 PWA 体验接近原生 —— 从浏览器安装即可获得类应用体验。
</details>

---

## 🤝 参与贡献

**欢迎所有人。** 无论你是资深开源贡献者还是第一次提交 PR —— 我们都欢迎你的帮助。没有太小的贡献：修复一个拼写错误、改进文档、或者提交一个功能。

- 🐛 **发现了 Bug？** → [提交 Issue](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.yml)
- 💡 **有好点子？** → [请求功能](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.yml)
- 🔧 **想写代码？** → 阅读 [CONTRIBUTING.md](CONTRIBUTING.md) —— 5 分钟就能上手
- ⭐ **喜欢这个项目？** → 给个 Star —— 这真的能帮助更多人发现它

### 新手友好的 Issue 🌱

第一次参与开源？我们为新手精选了一些 issue：

👉 **[浏览所有 Good First Issues](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue)**

---

## 💚 支持项目

如果 MindNotes Pro 对你有用，这里有一些方式可以帮助项目成长：

| 动作 | 影响 |
| --- | --- |
| ⭐ **给仓库点 Star** | 帮助更多人发现这个项目 —— **这是你能做的最重要的事** |
| 🐦 **在社交媒体分享** | 发微博、发小红书、在团队群里分享物理擦除的神奇体验 |
| 🍴 **Fork 并定制** | 改成你喜欢的样子，然后分享回社区 |
| 🐛 **报告 Bug** | [提交 Issue](https://github.com/11suixing11/mindnotes-pro/issues/new) —— 哪怕一句话都有帮助 |
| 💬 **加入讨论** | [GitHub Discussions](https://github.com/11suixing11/mindnotes-pro/discussions) —— 想法、问题、展示你的作品 |
| 🔧 **贡献代码** | 查看 [CONTRIBUTING.md](CONTRIBUTING.md) 开始 |

---

## Star 历史

<div align="center">
  <a href="https://star-history.com/#11suixing11/mindnotes-pro&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=11suixing11/mindnotes-pro&type=Date&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=11suixing11/mindnotes-pro&type=Date" />
      <img alt="Stargazers over time" src="https://api.star-history.com/svg?repos=11suixing11/mindnotes-pro&type=Date" width="600" />
    </picture>
  </a>
</div>

---

## 许可证

[MIT](LICENSE) —— 随便用。

---

<div align="center">
**由 [11suixing11](https://github.com/11suixing11) 用 ❤️ 构建**

<sub>如果 MindNotes Pro 让你免于为了一个简单草图而打开 Figma —— 给它一个 ⭐</sub>

<sub>**物理擦除引擎经过了 22 轮优化。如果你喜欢它，告诉身边的朋友！**</sub>
</div>
