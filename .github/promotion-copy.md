# MindNotes Pro 推广文案集

## 🟠 Hacker News - Show HN

### 标题

**Show HN: MindNotes Pro – A local-first whiteboard with only 3 dependencies, loads in <1s**

### 正文

I built MindNotes Pro because I was frustrated with whiteboard apps that require accounts, track your data, and take forever to load.

**The problem:** Every whiteboard tool I tried (Miro, Excalidraw, tldraw) either required signing up, had 30+ dependencies, or sent my data to the cloud.

**My solution:** A whiteboard that:

- Loads in under 1 second (only 3 runtime dependencies)
- Works 100% offline as a PWA
- Never sends data anywhere (localStorage only)
- Has a Monet-inspired aesthetic (watercolor palettes, paper textures)
- Includes 6 brush types, shapes, text, image paste, PDF/PNG export

**Tech stack:** React 18 + TypeScript + Zustand + perfect-freehand + Vite 5

**Why "only 3 dependencies"?** I wanted to prove that a beautiful, functional app doesn't need a 2MB bundle. The result: <200KB total, <1s load time.

Try it: https://11suixing11.github.io/mindnotes-pro/
Source: https://github.com/11suixing11/mindnotes-pro

Feedback welcome! Especially interested in:

- Performance on low-end devices
- Missing features you'd need
- Accessibility issues

---

## 🔴 Reddit - r/webdev

### 标题

**I built a whiteboard app that loads in under 1 second with only 3 dependencies**

### 正文

Hey r/webdev! 👋

I've been working on MindNotes Pro – a local-first whiteboard that prioritizes speed and privacy.

**Key stats:**

- ⚡ <1 second load time
- 📦 Only 3 runtime dependencies (react, zustand, perfect-freehand)
- 🔒 100% client-side (no server, no tracking)
- 📱 PWA – works offline
- 🎨 Monet-inspired design (because tools should be beautiful)

**Features:**

- 6 brush types (pen, pencil, highlighter, calligraphy, glow, eraser)
- Shapes (rectangles, circles, lines, arrows)
- Text annotations
- Image paste
- Frame select, resize, move, snap & align
- Undo/redo history
- Dark mode
- Export to PDF/PNG
- Multi-document workspace with folders

**Why I built this:**
I was tired of:

1. Whiteboard apps requiring sign-up for basic features
2. 50MB Electron apps for simple drawing
3. Tools that send all my sketches to the cloud

**Tech stack:**

- React 18 + TypeScript (strict mode)
- Zustand for state (6 slices, auto-persisted to localStorage)
- perfect-freehand for natural pen strokes
- Tailwind CSS with custom Monet palette
- Vite 5 for instant HMR

**Try it:** https://11suixing11.github.io/mindnotes-pro/
**Source:** https://github.com/11suixing11/mindnotes-pro

Would love your feedback! What features would make this your go-to whiteboard?

---

## 🔴 Reddit - r/reactjs

### 标题

**MindNotes Pro – React + Zustand whiteboard, local-first, zero cloud, only 3 deps**

### 正文

Built a whiteboard app with React and wanted to share the architecture:

**State management:** Zustand with 6 slices:

- canvasElements (strokes, shapes, text, images)
- docManagement (multi-document workspace)
- folderManagement (folder hierarchy)
- history (undo/redo with 100-step limit)
- toolSettings (brush, color, size)
- uiState (sidebar, modals, toasts)

**Auto-persistence:** Custom saveManager that debounces localStorage writes on every state change.

**Drawing engine:** perfect-freehand for natural pen strokes + Canvas API for rendering.

**Performance tricks:**

- React.memo on 11 components
- useCallback for event handlers
- Lazy-loaded jsPDF for PDF export
- Vendor chunk splitting (35KB gzipped)

**Bundle size:** <200KB total (React + Zustand + perfect-freehand + app code)

Try it: https://11suixing11.github.io/mindnotes-pro/
Source: https://github.com/11suixing11/mindnotes-pro

Happy to answer questions about the architecture!

---

## 🔴 Reddit - r/opensource

### 标题

**Open-source whiteboard alternative to Miro – MIT license, 3 deps, offline PWA**

### 正文

Hey r/opensource!

MindNotes Pro is a local-first whiteboard that respects your privacy:

✅ **MIT License** – use it however you want
✅ **No tracking** – data stays in your browser
✅ **No account required** – just open and draw
✅ **Offline PWA** – works on a plane, in a tunnel, anywhere
✅ **Self-hostable** – deploy to Vercel/Netlify/GitHub Pages in 30 seconds

**Why "local-first"?**
Because your sketches, diagrams, and ideas shouldn't require a cloud subscription. Everything is stored in localStorage and never leaves your device.

**Comparison with alternatives:**
| Feature | MindNotes Pro | Excalidraw | tldraw | Miro |
|---------|--------------|------------|--------|------|
| Open source | ✅ MIT | ✅ MIT | ⚠️ Partial | ❌ |
| Local-first | ✅ | ❌ | ❌ | ❌ |
| Runtime deps | 3 | 30+ | 50+ | N/A |
| Bundle size | <200KB | ~2MB | ~3MB | N/A |
| Load time | <1s | 3-5s | 3-5s | 5s+ |
| Offline PWA | ✅ | ⚠️ | ❌ | ❌ |

Try it: https://11suixing11.github.io/mindnotes-pro/
Source: https://github.com/11suixing11/mindnotes-pro

Would love to see this grow into a community project!

---

## 🇨🇳 V2EX

### 标题

**[开源项目] 做了一个只有3个依赖的白板应用，打开就能画**

### 正文

各位 V2EX 的朋友们好！

分享一个我做的开源项目：MindNotes Pro

**一句话介绍：** 像在真实纸上绘画的本地优先白板，无云端、无追踪、无订阅。

**核心卖点：**

- ⚡ 加载时间 <1秒（只有3个运行时依赖）
- 🔒 100% 隐私安全（数据只存在浏览器本地）
- 📱 PWA 离线可用（飞机上、地铁里都能画）
- 🎨 莫奈美学设计（水彩调色板、纸质纹理）

**功能：**

- 6种画笔（钢笔、铅笔、荧光笔、书法笔、发光笔、橡皮擦）
- 图形工具（矩形、圆形、线条、箭头）
- 文字注释、图片粘贴
- 框选、缩放、移动、对齐
- 撤销/重做、导出 PDF/PNG
- 多文档工作区 + 文件夹层级
- 深色模式

**技术栈：** React 18 + TypeScript + Zustand + Vite 5

**为什么做这个？**
试过 Miro、Excalidraw、tldraw，但都觉得太重了。要么需要注册账号，要么依赖太多，要么把数据传到云端。就想着做一个极致轻量、完全本地的白板。

**在线体验：** https://11suixing11.github.io/mindnotes-pro/
**GitHub：** https://github.com/11suixing11/mindnotes-pro

欢迎试用和反馈！

---

## 🇨🇳 掘金

### 标题

**从零构建一个本地优先的白板应用：React + Zustand + Canvas 的极致实践**

### 正文

# 前言

最近开源了一个白板应用 MindNotes Pro，想分享一下架构设计和性能优化的经验。

# 为什么做这个？

市面上的白板工具（Miro、Excalidraw、tldraw）普遍存在：

1. 依赖过多（30-50个运行时依赖）
2. 需要账号系统
3. 数据存储在云端

我的目标：**只有3个依赖、完全本地、加载时间<1秒**。

# 架构设计

## 状态管理：Zustand + 6个Slice

```typescript
// 6个独立的slice
- canvasElements: 画布元素（笔画、图形、文字、图片）
- docManagement: 多文档管理
- folderManagement: 文件夹层级
- history: 撤销/重做（100步限制）
- toolSettings: 工具设置（画笔、颜色、大小）
- uiState: UI状态（侧边栏、弹窗、提示）
```

## 自动持久化

```typescript
// 自定义saveManager，防抖写入localStorage
const saveManager = {
  debounce: 300,
  save: (state) => {
    localStorage.setItem('mindnotes', JSON.stringify(state))
  },
}
```

## 绘图引擎

- perfect-freehand：自然笔画效果
- Canvas API：高性能渲染
- React.memo：11个组件优化
- useCallback：事件处理优化

# 性能优化

## 1. 依赖控制

只保留3个运行时依赖：

- react (UI框架)
- zustand (状态管理)
- perfect-freehand (笔画效果)

## 2. 代码分割

jsPDF（PDF导出）使用动态导入，不影响首屏加载。

## 3. Vendor Chunk优化

Vite配置manualChunks，vendor chunk从431KB优化到35KB。

# 总结

通过极致的依赖控制和性能优化，实现了一个加载时间<1秒、完全本地的白板应用。

**在线体验：** https://11suixing11.github.io/mindnotes-pro/
**GitHub：** https://github.com/11suixing11/mindnotes-pro

---

## 🇨🇳 知乎

### 标题

**有哪些好用的开源白板工具？推荐一个只有3个依赖的本地优先白板**

### 正文

谢邀。

推荐一个我最近做的开源白板工具：MindNotes Pro

**核心特点：**

1. **极致轻量**：只有3个运行时依赖，加载时间<1秒
2. **完全本地**：数据只存在浏览器，永不上传云端
3. **隐私安全**：无需注册账号，无追踪
4. **离线可用**：PWA支持，飞机上也能画
5. **美学设计**：莫奈印象派风格，水彩调色板

**功能对比：**

| 功能     | MindNotes Pro | Excalidraw | tldraw   | Miro |
| -------- | ------------- | ---------- | -------- | ---- |
| 开源协议 | MIT           | MIT        | 部分开源 | 闭源 |
| 本地优先 | ✅            | ❌         | ❌       | ❌   |
| 依赖数量 | 3             | 30+        | 50+      | N/A  |
| 包大小   | <200KB        | ~2MB       | ~3MB     | N/A  |
| 加载时间 | <1秒          | 3-5秒      | 3-5秒    | 5秒+ |
| 离线PWA  | ✅            | ⚠️         | ❌       | ❌   |

**适合谁？**

- 学生：课堂上画图、标注想法
- 设计师：快速草图、概念设计
- 开发者：系统设计、架构图
- 笔记爱好者：手写+图形+文字结合

**在线体验：** https://11suixing11.github.io/mindnotes-pro/
**GitHub：** https://github.com/11suixing11/mindnotes-pro

欢迎试用和反馈！
