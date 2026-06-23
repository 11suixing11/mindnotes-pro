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

市面上白板很多，但大多数要么太重，要么要联网，要么收集你的数据。

MindNotes Pro 是一个**简单、快速、尊重隐私**的白板工具：

- ⚡ **打开就能用** — 不到 1 秒加载完成，不用等，不用注册
- 📴 **完全离线** — 装成 PWA 后没网也能用
- 🔒 **数据只在你手里** — 所有内容存在本地 localStorage，永远不会上传到任何服务器
- 🪶 **只有 5 个运行时依赖** — 没有臃肿的框架，体积小，速度快
- 🎨 **好看但不花哨** — 莫奈配色，简洁界面，专注于内容而不是工具本身

---

## 功能特性

### 核心功能

| | 功能 | 说明 |
| ---: | --- | --- |
| ✏️ | **6 种笔刷** | 钢笔、荧光笔、铅笔、书法笔、虚线、发光笔 |
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

## 和其他产品比怎么样？

| | MindNotes Pro | Excalidraw | tldraw | Miro |
| --- | :---: | :---: | :---: | :---: |
| **完全开源** | ✅ MIT | ✅ MIT | ⚠️ 部分 | ❌ |
| **本地优先** | ✅ | ❌ | ❌ | ❌ |
| **运行时依赖** | **5 个** | 30+ | 50+ | N/A |
| **打包体积** | **< 200 KB** | ~2 MB | ~3 MB | N/A |
| **加载速度** | **< 1 秒** | 3-5 秒 | 3-5 秒 | 5 秒+ |
| **离线可用 (PWA)** | ✅ | ⚠️ | ❌ | ❌ |
| **无追踪/埋点** | ✅ | ⚠️ 有一些 | ⚠️ 有一些 | ✅ 很多 |
| **永久免费** | ✅ | ✅ | ⚠️ 付费功能 | ❌ 贵 |

---

## 快速开始

### 方式一：直接在线用

👉 **[打开 MindNotes Pro](https://11suixing11.github.io/mindnotes-pro)** — 不用安装，不用注册，打开就能画。

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
| 橡皮擦 | 自研物理引擎 + RBush 空间索引 | 做了就做了，反正已经写了 |
| 音频 | Web Audio API | 实时合成，不用音频文件 |
| 样式 | Tailwind CSS + 莫奈配色 | 默认就好看，实用优先 |
| 导出 | jsPDF (懒加载) | 不影响首屏体积 |
| 构建 | Vite 5 | 秒级 HMR，优化的代码分割 |
| 测试 | Vitest + Testing Library | 574+ 单元测试，60%+ 覆盖率 |

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
| **打包体积** | < 200 KB gzipped | 5 个运行时依赖，tree-shaking，代码分割 |
| **冷启动速度** | < 1 秒 | Vite 构建，无多余框架开销 |
| **画布帧率** | 稳定 60fps | 脏矩形渲染、空间索引、对象池 |
| **最大笔触数** | 1000+ 仍流畅 | R 树空间索引 + 视口裁剪 |

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

欢迎贡献代码、提 issue、或者只是反馈使用体验。

- 发现 bug？[提一个 issue](https://github.com/11suixing11/mindnotes-pro/issues)
- 有新想法？[开个讨论](https://github.com/11suixing11/mindnotes-pro/discussions)
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
