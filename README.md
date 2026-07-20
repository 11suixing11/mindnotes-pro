<div align="center">
<img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />
# MindNotes Pro

**一个轻量、快速、本地优先的在线白板。**  
打开就能画，不用注册，不用联网，数据都在你自己的设备上。

<p>
  <a href="https://11suixing11.github.io/mindnotes-pro"><img src="https://img.shields.io/badge/✨_立即体验-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="Try it now" /></a>
  &nbsp;
  <a href="#快速开始"><img src="https://img.shields.io/badge/📦_快速开始-2ECC71?style=for-the-badge" alt="Quick Start" /></a>
</p>

<p>
  <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/11suixing11/mindnotes-pro/stargazers"><img src="https://img.shields.io/github/stars/11suixing11/mindnotes-pro?style=social" alt="GitHub Stars" /></a>
  <a href="https://github.com/11suixing11/mindnotes-pro/network"><img src="https://img.shields.io/github/forks/11suixing11/mindnotes-pro?style=social" alt="GitHub Forks" /></a>
  <img src="https://img.shields.io/badge/version-3.3.0-00C9A7?style=flat-square" alt="Version 3.3.0" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

<p>
  <strong>🌐 语言:</strong>
  <a href="README.md">English</a> ·
  <strong>中文</strong> ·
  <a href="README_JA.md">日本語</a>
</p>
</div>

---

## 目录

- [为什么选 MindNotes Pro?](#为什么选-mindnotes-pro)
- [功能特性](#功能特性)
- [截图](#截图)
- [设计取舍](#设计取舍)
- [灵感与归属](#灵感与归属)
- [快速开始](#快速开始)
- [快捷键](#快捷键)
- [技术栈](#技术栈)
- [性能](#性能)
- [设计理念](#设计理念)
- [路线图](#路线图)
- [常见问题](#常见问题)
- [贡献](#贡献)
- [支持](#支持)
- [许可证](#许可证)

---

## 为什么选 MindNotes Pro?

市面上已经有很多成熟白板工具。MindNotes Pro 选择更窄的方向：个人、本地优先、打开就能画。

MindNotes Pro 是一个**简单、快速、尊重隐私**的白板工具：

- ⚡ **打开就能用** — 不用注册账号，没有云端初始化流程
- 📴 **完全离线** — 装成 PWA 后没网也能用
- 🔒 **数据只在你手里** — 所有内容存在本地 localStorage，永远不会上传到任何服务器
- 🪶 **只有 5 个运行时依赖** — 依赖边界清晰，便于维护和审计
- 🎨 **好看但不花哨** — 莫奈配色，简洁界面，专注于内容而不是工具本身

MindNotes Pro 不是 Excalidraw、tldraw 或 Miro 的替代品。它更像一个可以离线打开、可以读懂源码、可以按自己需要改造的小白板。多人协作、云端同步、模板市场这类能力暂时不在核心范围内。

---

## 功能特性

### 核心功能

| | 功能 | 说明 |
| ---: | --- | --- |
| ✏️ | **9 种笔刷** | 钢笔、荧光笔、铅笔、书法笔、马克笔、水彩笔、蜡笔、虚线、发光笔 |
| 🔷 | **形状工具** | 矩形、圆形、直线、箭头，支持填充 |
| 📝 | **文字标注** | 画布上直接输入文字，自动调整大小 |
| 🖼️ | **图片粘贴** | 剪贴板直接粘贴图片 |
| 🖱️ | **框选编辑** | 多选、缩放、移动、对齐吸附 |
| ↩️ | **撤销/重做** | 完整历史记录，支持快捷键 |
| 🗂️ | **多文档管理** | 文件夹层级，拖拽排序，自动保存 |
| 📄 | **导出** | 支持导出 PDF 和 PNG |
| 🌙 | **深色模式** | 自动跟随系统设置 |

### 橡皮擦

> 是的，我们的橡皮擦有点不一样，但它只是众多功能中的一个。

- 压感擦除 — 用力擦得干净，轻轻擦变淡
- 多种形状 — 圆形、方形、斜口，各有用处
- 磨损效果 — 用久了会变钝，可以"削"一下
- 粒子和音效 — 擦的时候有点反馈感，挺解压

想体验的话可以试试，不喜欢也完全不影响正常使用。

---

## 适合谁用？

| 你是... | MindNotes Pro 可以帮你... |
| --- | --- |
| 🎓 **学生** | 上课画示意图、记笔记 |
| 💡 **产品/设计师** | 快速画原型、梳理思路 |
| 👩‍💻 **开发者** | 画系统架构图、讨论技术方案 |
| 📋 **笔记爱好者** | 手写 + 形状 + 文字，混合记录 |
| 🧠 **任何喜欢可视化思考的人** | 把想法从脑子里倒出来 — 就这么简单 |

---

## 截图

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>☀️ 浅色模式</strong></td>
      <td align="center"><strong>🌙 深色模式</strong></td>
    </tr>
    <tr>
      <td><img src=".github/mindnotes-light.svg" width="420" /></td>
      <td><img src=".github/mindnotes-dark.svg" width="420" /></td>
    </tr>
  </table>
</div>

---

## 设计取舍

| 取舍 | 当前选择 | 原因 |
| --- | --- | --- |
| 数据存储 | 浏览器 localStorage | 零账号、零服务器，适合个人草稿和临时白板 |
| 协作 | 暂不提供 | 保持部署简单，也避免引入账号系统和同步冲突 |
| 画布能力 | Canvas + 自定义交互 | 更容易控制笔触、选择、导出和离线体验 |
| 功能边界 | 聚焦个人白板 | 避免把项目做成大型协作套件 |
| 依赖策略 | 少量运行时依赖 | 让源码更容易阅读和维护 |

这些选择也带来限制：清理浏览器数据会丢失内容，多设备同步需要手动导出，复杂协作场景更适合使用成熟白板产品。

## 灵感与归属

MindNotes Pro 参考了许多成熟绘图和设计工具里的通用交互习惯，例如快捷键、选择框、对齐辅助、缩放导航和样式吸取。相关实现会尽量写清楚产品取舍，而不是把其他项目的 PR 当作卖点。

如果你发现某个交互、文案或实现与上游开源项目过于接近，欢迎开 issue 指出。我会优先处理归属说明、实现差异和许可证边界。

---

## 快速开始

### 方式一：直接在线用

👉 **[打开 MindNotes Pro](https://11suixing11.github.io/mindnotes-pro)** — 不用安装，不用注册，打开就能画。

### 正在验证产品方向

我们现在最想知道的是：你会不会真的用它，以及为什么不会。

试用后欢迎留下非常具体的反馈：你想用它做什么、第一分钟哪里卡住、缺什么功能、为什么会或不会再次打开。

👉 **[留下反馈 / 参与产品验证](https://github.com/11suixing11/mindnotes-pro/discussions/97)**

### 方式二：本地运行

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

打开 http://localhost:3000 ，30 秒内开始画画。

### 方式三：自己部署

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
| `npm run dev` | 启动开发服务器 (http://localhost:3000) |
| `npm run build` | TypeScript 检查 + Vite 生产构建 |
| `npm run test` | Vitest watch 模式 |
| `npm run test:run` | Vitest 单次运行 |
| `npm run lint` | ESLint 检查 |

---

## 快捷键

在应用内按 `?` 查看完整快捷键列表。常用的：

| 快捷键 | 功能 |
| --- | --- |
| `P` | 钢笔工具 |
| `E` | 橡皮擦 |
| `S` | 选择工具 |
| `T` | 文字工具 |
| `R` / `C` / `L` / `A` | 矩形 / 圆形 / 直线 / 箭头 |
| `空格` + 拖拽 | 平移画布 |
| `Ctrl` + `Z` / `Y` | 撤销 / 重做 |
| `Ctrl` + `A` | 全选 |
| `Ctrl` + `C` / `V` | 复制 / 粘贴 |
| `Ctrl` + `E` | 导出菜单 |
| `Delete` | 删除选中内容 |
| `滚轮` | 缩放 |

---

## 技术栈

| 层级 | 选择 | 原因 |
| --- | --- | --- |
| UI | React 18 + TypeScript | 类型安全，并发特性 |
| 状态管理 | Zustand (6 个 slice) | 很小 (~1KB)，没样板代码，开发体验好 |
| 绘制 | perfect-freehand + Canvas API | 自然的笔触，硬件加速 |
| 橡皮擦 | 自研物理引擎 + RBush 空间索引 | 实验性交互，隔离在独立模块内 |
| 音频 | Web Audio API | 实时合成，不用音频文件 |
| 样式 | Tailwind CSS + 莫奈配色 | 默认就好看，实用优先 |
| 导出 | jsPDF (懒加载) | 不影响首屏体积 |
| 构建 | Vite 8 | 秒级 HMR，优化的代码分割 |
| 测试 | Vitest + Testing Library | 650+ 单元测试，持续补回归覆盖 |

### 项目结构

```
src/
├── canvas/                    # 画布绘制引擎 & 工具函数
│   ├── canvasUtils.ts         # 笔触渲染、碰撞检测、边界计算
│   └── useCanvasRenderer.ts   # 主渲染循环 hook
├── eraser/                    # 橡皮擦物理引擎
│   ├── PhysicsEraserEngine.ts # 核心物理逻辑
│   ├── SpatialIndex.ts        # 基于 RBush 的空间索引
│   ├── EraserParticleSystem.ts# 粒子效果
│   ├── EraserAudioEngine.ts   # 音效引擎
│   ├── eraserStore.ts         # 橡皮擦状态管理
│   ├── eraserRendering.ts     # 橡皮擦光标渲染
│   ├── types.ts               # 类型定义
│   └── __tests__/             # 单元测试
├── components/
│   ├── canvas/                # 画布组件 + hooks
│   ├── eraser/                # 橡皮擦控制 UI
│   ├── toolbar/               # 工具栏、颜色选择、笔刷
│   ├── sidebar/               # 文档/文件夹管理
│   ├── export-menu/           # PDF/PNG 导出
│   └── ...                    # Toast、弹窗、辅助线
├── store/
│   ├── slices/                # Zustand slices (共 6 个)
│   ├── appStore.ts            # 组合后的 store
│   ├── saveManager.ts         # 自动保存到 localStorage
│   └── types.ts               # TypeScript 类型
└── App.tsx                    # 根组件
```

---

## 性能

| 指标 | 数值 | 实现方式 |
| --- | --- | --- |
| **加载策略** | 代码分割 + 懒加载导出 | 5 个运行时依赖，tree-shaking，按需加载 |
| **冷启动目标** | 尽量保持秒级打开 | Vite 构建、无账号流程、无云端初始化 |
| **绘制体验** | 以流畅交互为目标 | 脏矩形渲染、空间索引、对象池 |
| **大画布优化** | 降低复杂画布的重绘成本 | R 树空间索引 + 视口裁剪 |

---

## 设计理念

1. **内容优先** — 工具应该消失，让用户专注于自己的想法
2. **简单就是好** — 能少一个功能就少一个，能少一次点击就少一次
3. **尊重用户** — 不追踪，不埋点，不弹广告，数据是用户自己的
4. **快就是体验** — 加载快，操作快，响应快，慢就是原罪
5. **好看但不炫技** — 美观是基础，不是卖点

---

## 路线图

### 近期
- [ ] 图层支持
- [ ] 更多形状（三角形、菱形、五角星）
- [ ] 手写识别（可选）
- [ ] 协作功能（可选，需要自建服务端）

### 想法池
- [ ] 白板模板库
- [ ] 插件系统
- [ ] 更多导出格式（SVG、Markdown）

---

## 常见问题

**Q: 数据存在哪里？安全吗？**  
A: 所有数据都存在你浏览器的 localStorage 里，永远不会上传到任何服务器。缺点是换浏览器/清缓存会丢，重要内容记得导出备份。

**Q: 能多设备同步吗？**  
A: 目前不能。这是一个有意的设计取舍 — 为了"完全离线、零服务器、零追踪"，我们放弃了云同步。以后可能会做可选的同步方案。

**Q: 橡皮擦为什么做这么复杂？**  
A: 因为做起来有意思，技术上有挑战。但它只是一个功能，不是产品的全部，你不用它也完全不影响使用。

**Q: 手机能用吗？**  
A: 可以用，但体验不是最优。目前主要针对桌面端和带笔的平板优化。

---

## 贡献

欢迎贡献代码、提 issue、或者只是反馈使用体验。当前最需要的是来自真实试用者的直接反馈。

- 发现 bug？[提一个 issue](https://github.com/11suixing11/mindnotes-pro/issues)
- 试用后有想法？[在反馈讨论帖告诉我们](https://github.com/11suixing11/mindnotes-pro/discussions/97)
- 想写代码？Fork 然后提 PR

---

## 支持

如果你觉得这个项目还不错，可以：

- ⭐ 给个 Star
- 🔗 分享给朋友
- 💬 提提建议

你的反馈是这个项目继续做下去的动力。

---

## 许可证

MIT License — 随便用，随便改，随便分发。
