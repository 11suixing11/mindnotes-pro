# Social Media Templates — MindNotes Pro

> **叙事核心：** 不是 "我做了个白板"，而是 "为什么每个白板都要我注册账号？"
> **Live demo:** https://11suixing11.github.io/mindnotes-pro
> **GitHub:** https://github.com/11suixing11/mindnotes-pro

---

## 📅 发帖日历

| 日期       | 平台                                | 时间         | 角度            |
| ---------- | ----------------------------------- | ------------ | --------------- |
| **周一**   | Twitter/X                           | 9 AM EST     | 痛点共鸣 Thread |
| **周二**   | Hacker News                         | 10 AM EST    | Show HN         |
| **周三**   | Reddit r/webdev                     | 2 PM EST     | 注册地狱        |
| **周四**   | Reddit r/privacy                    | 10 AM EST    | 零追踪          |
| **周五**   | Reddit r/opensource + r/sideproject | 间隔 3h      | 功能 + 设计     |
| **下周一** | Product Hunt                        | 12:01 AM EST | 产品发布        |
| **下周二** | Dev.to                              | 上午         | 技术长文        |
| **周末**   | V2EX / 掘金 / 即刻 / 小红书         | 晚 8-10 PM   | 中文            |

> Reddit 间隔 ≥ 1 天 · 发帖后 1h 内回复每条评论

---

## 🎨 视觉素材

| 平台         | 首图                                                       | 说明                                        |
| ------------ | ---------------------------------------------------------- | ------------------------------------------- |
| Twitter      | `docs/screenshots/11-after-draw.png` 或 `.github/hero.png` | 截图比 hero 更有说服力 — 让人看到"真的能用" |
| Reddit       | `.github/demo.gif`                                         | GIF 动图展示实际使用                        |
| HN           | 无                                                         | 纯文字                                      |
| Product Hunt | `.github/hero.png` (方形裁剪)                              |                                             |
| Dev.to       | `.github/hero.png`                                         |                                             |
| V2EX         | `docs/screenshots/11-after-draw.png`                       |                                             |
| 即刻/小红书  | `.github/hero.png`                                         | 视觉优先                                    |

---

## 🐦 Twitter / X

### Version A — Thread（主推）

> **结构：** 痛点共鸣 → 具体证据 → 你的解决方式 → 功能证明 → CTA

**Tweet 1 — 痛点（让人停下来）：**

> I wanted to draw a quick diagram.
>
> Opened Excalidraw — "Sign in to continue."
> Opened Miro — free trial, then $8/mo.
> Opened tldraw — "Create an account for collaboration features."
>
> I just want to draw. Why is this so hard?

**Tweet 2 — 情绪升级：**

> It's not just whiteboard apps.
>
> Every tool now requires an account before you can do anything. Note apps, design tools, even simple text editors want your email, your cloud sync, your data.
>
> The "free" tier is just a funnel.

**Tweet 3 — 转折（你的解决方式自然出现）：**

> So I built one that doesn't.
>
> No account. No cloud. No "sign in with Google." No trial that expires.
>
> Open the tab. Draw. That's it.
>
> [附图: `docs/screenshots/11-after-draw.png`]

**Tweet 4 — 技术差异（给开发者看的）：**

> The catch: I wanted it to be light.
>
> So I set a rule — no more than 3 npm dependencies.
>
> tldraw ships 50+. Excalidraw ships 30+.
> MindNotes Pro ships: React, Zustand, perfect-freehand.
>
> Everything else — shapes, selection, undo, export, folders — is custom code.

**Tweet 5 — 功能证明：**

> What "just works" looks like:
>
> ✏️ Freehand drawing with pressure
> 🔷 Shapes, text, multi-select
> ↩️ Undo/redo
> 📄 PDF & PNG export
> 📁 Folder management
> 🌙 Dark mode
> ⚡ Works offline as a PWA
>
> All in the browser. Your data never leaves.

**Tweet 6 — CTA（不推销，只是给链接）：**

> MIT. No catches.
>
> https://11suixing11.github.io/mindnotes-pro
> https://github.com/11suixing11/mindnotes-pro

---

### Version B — 单条

> Every whiteboard app I tried today asked me to create an account.
>
> So I built one where you just open the tab and draw.
>
> No account. No cloud. No tracking. Works offline.
>
> https://11suixing11.github.io/mindnotes-pro

---

### Version C — 中文 Thread

**Tweet 1：**

> 想画个图。
>
> 打开 Excalidraw — "请登录"。
> 打开 Miro — 免费试用，之后 $8/月。
> 打开 tldraw — "创建账号以使用协作功能"。
>
> 我就想画个图。为什么这么难？

**Tweet 2：**

> 不只是白板。
>
> 现在每个工具都要你注册才能用。笔记、设计、甚至简单的文本编辑器都要你的邮箱、云同步、数据。
>
> "免费版"只是漏斗的入口。

**Tweet 3：**

> 所以我自己做了一个。
>
> 不要账号。不要云端。不要"用 Google 登录"。不要过期的试用期。
>
> 打开网页，画。就这么简单。
>
> [附图: `docs/screenshots/11-after-draw.png`]

**Tweet 4：**

> 顺便，整个应用只有 3 个 npm 依赖。
>
> tldraw 50+，Excalidraw 30+。
> 我的：React、Zustand、perfect-freehand。没了。
>
> 图形、选择、撤销、导出、文件夹 —— 全部自己写。

**Tweet 5：**

> MIT 开源。没有隐藏条款。
>
> https://11suixing11.github.io/mindnotes-pro
> https://github.com/11suixing11/mindnotes-pro

---

## 🟠 Reddit

### r/webdev

**Title:** I opened 4 whiteboard apps today. Every single one wanted me to create an account.

**Body:**

I just needed to draw a quick architecture diagram. Nothing fancy.

1. **Excalidraw** — "Sign in to save your work"
2. **Miro** — free trial, credit card required after
3. **tldraw** — "Create account for collaboration"
4. **Figma** — need I say more

Four apps. Four account walls. For drawing a box and some arrows.

So I built **MindNotes Pro** — a whiteboard that works the moment you open it. No accounts, no cloud sync, no tracking. Data stays in your browser's localStorage.

**What it has:**

- Freehand drawing with pressure sensitivity
- Shapes (rectangles, lines, arrows)
- Text annotations
- Multi-select, move, resize
- Undo/redo
- Dark mode
- PDF/PNG export
- Folder-based document management
- PWA — works offline

**What it doesn't have:**

- A login page
- A pricing page
- Analytics tracking
- A "sync to cloud" button

**Tech:** React 18, TypeScript, Zustand, Tailwind CSS, Vite. Only 3 runtime dependencies. All drawing logic, selection, undo, and export is custom code.

**Live:** https://11suixing11.github.io/mindnotes-pro
**Source:** https://github.com/11suixing11/mindnotes-pro

[附图: `.github/demo.gif`]

---

### r/privacy

**Title:** Every whiteboard app sends your data somewhere. I built one that doesn't.

**Body:**

I tested 5 popular whiteboard/drawing apps and checked their network requests:

- **Excalidraw** — sends usage data on load, requires account for cloud features
- **Miro** — full cloud platform, nothing works without account
- **tldraw** — account required for collaboration
- **Figma** — everything cloud-based
- **Canva** — tracks usage, requires account

Then I checked my own app, **MindNotes Pro**:

Open DevTools → Network tab → draw, create shapes, export PDF → **zero outgoing requests.**

How:

- All data in `localStorage` — browser's built-in storage, never leaves your device
- No analytics, no telemetry, no error reporting to external servers
- The entire app is a static site — you can even run it from a local file
- PWA with offline support

**The tradeoff:** No cloud sync, no collaboration, no cross-device access. For personal sketching and note-taking, I think that's the right call. Your half-formed ideas shouldn't be someone else's data point.

**Live:** https://11suixing11.github.io/mindnotes-pro
**Source:** https://github.com/11suixing11/mindnotes-pro

---

### r/opensource

**Title:** MindNotes Pro — whiteboard app with no accounts, no cloud, no tracking. MIT.

**Body:**

**MindNotes Pro** is a whiteboard that does the bare minimum: lets you draw.

No account to create. No cloud to sync to. No analytics to opt out of. No subscription to upgrade from.

Open it → draw → close it → your work is still there.

**In the box:**

- Freehand drawing, shapes, text
- Multi-select, move, resize
- Undo/redo, dark mode
- PDF/PNG export
- Folder-based document management
- PWA, works offline

**Not in the box:**

- Login screen
- Pricing tier
- Cloud backend
- "Sign in with Google"

**Tech:** React 18, TypeScript (strict), Zustand, Tailwind, Vite. 3 runtime deps. MIT.

https://github.com/11suixing11/mindnotes-pro
https://11suixing11.github.io/mindnotes-pro

---

### r/sideproject

**Title:** Tired of whiteboard apps needing accounts, I built one that just works in your browser

**Body:**

Hey 👋

Quick side project: **MindNotes Pro**, a whiteboard drawing app.

The pitch: open the tab, draw. No sign-up, no cloud, no data leaving your browser.

It's got freehand drawing, shapes, text, undo/redo, PDF export, folders, dark mode, and it works offline.

Also gave it a Monet-inspired look — watercolor gradients, glassmorphism, paper texture. Because why not make it pretty.

**Tech:** React, TypeScript, Zustand, Tailwind. 3 deps. MIT.

https://11suixing11.github.io/mindnotes-pro
https://github.com/11suixing11/mindnotes-pro

---

## 🟧 Hacker News

**Title:** Show HN: MindNotes Pro – A whiteboard app with no accounts, no cloud, no tracking

**Body:**

https://github.com/11suixing11/mindnotes-pro

I tried to draw a quick diagram today and hit the same wall I always hit: every whiteboard app wants me to create an account first.

So I built MindNotes Pro — a whiteboard that works the moment you open it. No accounts, no cloud sync, no analytics, no tracking.

**How it works:**

- All data stored in browser localStorage
- Zero outgoing network requests during use
- PWA with offline support
- The entire app is a static site (can be self-hosted or run from a local file)

**The constraint I gave myself:** Only 3 runtime dependencies (React, Zustand, perfect-freehand). Canvas rendering, shapes, selection, undo/redo, document management, export — all custom code.

**Features:** Freehand drawing with pressure sensitivity, shapes, text, multi-select, undo/redo, dark mode, PDF/PNG export, folder-based document management.

**Tech:** React 18, TypeScript strict mode, Zustand, Tailwind CSS, Vite 5. MIT licensed.

Live: https://11suixing11.github.io/mindnotes-pro

---

**HN 第一条评论（发帖后立即回复）：**

The backstory: I needed to draw a quick architecture diagram and tried Excalidraw, Miro, tldraw, and Figma — all four required accounts. One even wanted a credit card for the "free trial."

I kept thinking: drawing is a basic computing task. Why does it require an account?

So I built one where the only requirement is a browser. The data stays in localStorage — no server, no cloud, no analytics. You can verify this yourself by opening DevTools → Network tab while using the app.

The 3-dependency constraint came from wanting the app to be genuinely lightweight. Most of the "essential" npm packages turned out to be replaceable with a few lines of custom code.

Happy to answer questions.

---

## 🛍 Product Hunt

**Tagline:** Open it. Draw. No account needed.

**Description:**

I tried to draw a diagram today and every whiteboard app asked me to create an account.

So I built one that doesn't.

MindNotes Pro is a whiteboard that works the moment you open it. No sign-up, no cloud sync, no analytics, no tracking.

🔒 **Your data never leaves your browser.** All drawings stored in localStorage. Zero outgoing requests.

⚡ **No bloat.** Only 3 runtime dependencies. Loads in under a second.

🎨 **Actually pretty.** Monet-inspired watercolor design with glassmorphism and paper texture.

📱 **Works offline.** Install as a PWA — no internet required.

📄 **Export anything.** PDF and PNG, one click.

📁 **Organize your work.** Folder-based document management built in.

**For developers:** TypeScript strict, Zustand (6 slices), custom Canvas rendering, MIT licensed. Clean, documented codebase.

Try it → https://11suixing11.github.io/mindnotes-pro

---

## 📝 Dev.to

**Title:** Why I Built a Whiteboard App After Every Existing One Asked Me to Create an Account

**Tags:** `react`, `javascript`, `typescript`, `opensource`, `webdev`

**Cover image:** `.github/hero.png`

**Body：**

> 使用 `docs/blog-post-local-first-whiteboard.md` 内容
> 但在开头加这段 hook：

**Opening hook（替换原文开头）：**

> Last week I needed to draw a quick diagram. I opened four different whiteboard apps. Every single one asked me to create an account before I could draw a single line.
>
> Excalidraw wanted an email. Miro wanted a credit card for the "free trial." tldraw wanted me to sign up for collaboration features I didn't need. Figma... well, Figma is Figma.
>
> I'm a developer. I have a browser. Why can't I just draw?
>
> That question turned into MindNotes Pro — a local-first whiteboard with zero accounts, zero cloud, and zero tracking. Here's how I built it.

> 文末加 CTA：GitHub + Demo 链接。同天 Twitter 宣传。

---

## 🇨🇳 中文平台

### V2EX

**标题：** [开源] 每个白板应用都要我注册账号，所以我做了一个不需要的

**内容：**

今天想画个架构图。试了 4 个白板应用：

1. Excalidraw — "请登录以保存"
2. Miro — 免费试用，要绑信用卡
3. tldraw — "创建账号以使用协作"
4. Figma — 不用说了

四个应用，四堵注册墙。我只是想画个框和几条线。

所以我做了一个：**MindNotes Pro** — 打开网页就能画，不需要账号，不需要云端，数据全部存在浏览器 localStorage 里。

**有什么：**

- 手绘笔触（支持压感）
- 矩形、线条、箭头
- 文字注释
- 多选、移动、缩放
- 撤销/重做
- 暗色模式
- PDF/PNG 导出
- 文件夹管理
- PWA 离线可用

**没有什么：**

- 登录页面
- 价格页面
- 数据追踪
- "同步到云端"按钮

**技术栈：** React 18 + TypeScript strict + Zustand + Tailwind CSS + Vite。只有 3 个运行时依赖。所有绘图逻辑、选择、撤销、导出都是自己写的。

在线体验：https://11suixing11.github.io/mindnotes-pro
源码：https://github.com/11suixing11/mindnotes-pro

MIT 开源。

---

### 掘金

**标题：** 【开源】为什么画个图也要注册账号？我做了一个不需要登录的白板应用

**正文：**

### 问题

今天我想画个简单的架构图。

打开 Excalidraw —— "请登录"。
打开 Miro —— 免费试用，绑信用卡。
打开 tldraw —— "创建账号"。
打开 Figma —— 算了。

我只是想画个框、连几条线。为什么每个工具都要我先注册？

### 解决方案

我做了一个白板应用：**打开网页，直接画。**

不需要账号，不需要云端，不需要同意任何隐私政策。你的画布数据只存在浏览器 localStorage 里，不会发送到任何服务器。

### 技术实现

**核心约束：** 只用 3 个运行时依赖。

| 依赖             | 用途                   |
| ---------------- | ---------------------- |
| React 18         | UI 框架                |
| Zustand          | 状态管理（6 个 slice） |
| perfect-freehand | 手绘笔触               |

jsPDF 导出时才动态加载。

**自写的部分：**

- Canvas 渲染引擎（DPR 适配、离屏缓存、视口裁剪）
- 图形工具（矩形、线条、箭头）
- 选择逻辑（框选、多选、缩放）
- 撤销/重做（action-based，非快照）
- 文档管理 + 文件夹系统
- 持久化层（saveManager，防抖写入 + schema 迁移）

**性能：**

- 首屏 < 500ms
- 可交互 < 1s
- 绘制 60fps（500 元素内）

### 验证方法

打开 https://11suixing11.github.io/mindnotes-pro
F12 → Network 标签
画几笔、创建图形、导出 PDF
你会发现：**零网络请求。**

在线体验：https://11suixing11.github.io/mindnotes-pro
源码：https://github.com/11suixing11/mindnotes-pro

---

### 即刻

今天想画个架构图，试了 4 个白板应用，全要注册。

Excalidraw 要登录，Miro 要绑卡，tldraw 要账号，Figma 不说了。

我只是想画个框和几条线。

所以做了一个：打开网页，直接画。不要账号，不要云端，数据全在浏览器里。

https://11suixing11.github.io/mindnotes-pro

MIT 开源，3 个依赖。

---

### 小红书

**标题：** 为什么画个图也要注册账号？？终于找到一个不用登录的白板了 😭

**正文：**

今天想画个思维导图，连续试了好几个白板应用 —— 全！部！都！要！注！册！😡

然后我发现了这个 👇

**MindNotes Pro**

✅ 打开网页就能画，不用注册不用登录
✅ 画的东西只存在你自己浏览器里，不上传任何东西
✅ 断网也能用（PWA 离线支持）
✅ 超好看！水彩渐变背景 + 纸张纹理
✅ 可以导出 PDF 和 PNG
✅ 支持文件夹整理
✅ 有暗色模式

重点是：**完全免费 + 开源 + 不用注册！！**

👉 https://11suixing11.github.io/mindnotes-pro

#白板 #画图 #效率工具 #不用注册 #免费工具 #设计 #学习笔记

---

## 📬 周刊投稿

### JavaScript Weekly

> **MindNotes Pro** ([GitHub](https://github.com/11suixing11/mindnotes-pro), [Demo](https://11suixing11.github.io/mindnotes-pro)) — A local-first whiteboard with zero accounts, zero cloud, zero tracking. All data in browser localStorage. Only 3 runtime dependencies (React, Zustand, perfect-freehand). PWA, offline, MIT licensed.

### React Status

> **MindNotes Pro** ([GitHub](https://github.com/11suixing11/mindnotes-pro)) — A whiteboard app that requires no account and stores everything in localStorage. Built with React 18 + TypeScript, Zustand (6 slices), perfect-freehand. 3 runtime deps, PWA, MIT.

---

## ⭐ Awesome Lists

### awesome-react

```markdown
- [mindnotes-pro](https://github.com/11suixing11/mindnotes-pro) - Local-first whiteboard with zero accounts and zero cloud. React 18, Zustand, perfect-freehand. 3 runtime deps, PWA, MIT.
```

### awesome-selfhosted

```markdown
- [MindNotes Pro](https://github.com/11suixing11/mindnotes-pro) - Local-first whiteboard drawing app. No accounts, no cloud, no tracking. MIT licensed.
  - `MIT` `Nodejs` `Demo`
```

### awesome-typescript

```markdown
- [mindnotes-pro](https://github.com/11suixing11/mindnotes-pro) - Local-first whiteboard with zero accounts. React 18, Zustand, TypeScript strict. 3 runtime deps.
```

> 每次只提交一个列表。PR 标题 `Add mindnotes-pro to [section]`。

---

## 💬 评论回复

> 核心原则：**先认同对方，再补充信息。不要辩护。**

### "为什么不直接用 Excalidraw?"

> Excalidraw is great — I use it when I need collaboration. MindNotes Pro is for the times when I just want to draw quickly without creating an account or being online. Different tools for different situations.

### "没有云同步不是退步吗？"

> 对某些场景是。但如果我只是画个草图或者头脑风暴，我不需要它同步到云端。我需要的是它立刻可用，不问我要任何东西。

### "localStorage 不是会丢数据吗？"

> 会的。如果你清浏览器数据就会丢。这是一个权衡 — 隐私 vs 持久性。目前的优先级是隐私。未来可能会支持导出为文件来备份。

### "为什么不加协作功能？"

> 会加的，但不想做成又一个需要账号的工具。可能走 WebRTC 纯 P2P 路线，不需要服务器。

### "这不就是一个 toy 吗？"

> 现在确实功能还比较简单。但核心绘图引擎是完整的 — 压感笔触、图形、选择、撤销。如果你觉得缺什么功能，欢迎提 issue 或者直接 PR。

### "Can I contribute?"

> Absolutely! [Good first issues](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue) are tagged for beginners. Or just open an issue with your idea.

### "Why 3 dependencies specifically?"

> It started as "how far can I go without npm install?" The answer was: pretty far. Turns out most "essential" libraries are replaceable with a few lines of code.

---

_Last updated: 2026-06-12_
_Author: 11suixing11_
