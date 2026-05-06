<div align="center">

<img src="https://img.shields.io/badge/🎨%20MindNotes%20Pro-v2.1-c47a5a?style=for-the-badge&labelColor=f5f0e8&color=c47a5a" alt="MindNotes Pro" />

<br />

# MindNotes Pro

**A beautiful, distraction-free whiteboard that lives in your browser.**

<br />

> Open it. Draw. Close it. Your work is already saved.
>
> No sign-up. No cloud. No nonsense.

<br />

<a href="https://11suixing11.github.io/mindnotes-pro/">
  <img src="https://img.shields.io/badge/Launch_App-◕‿◕-c47a5a?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=b8654a" alt="Launch App" />
</a>
&nbsp;&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/releases/latest">
  <img src="https://img.shields.io/badge/Download-Zip-5c4f3d?style=for-the-badge&logo=data&logoColor=white&labelColor=9c8e7a" alt="Download" />
</a>

<br /><br />

[![License](https://img.shields.io/badge/license-MIT-c47a5a?style=flat-square&labelColor=f5f0e8)](LICENSE)
![Zero Dependencies](https://img.shields.io/badge/dependencies-3-c47a5a?style=flat-square&labelColor=f5f0e8)
![Zero CDN](https://img.shields.io/badge/CDN-0-6a9c5a?style=flat-square&labelColor=f5f0e8)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

</div>

<br />

---

<br />

## ✦ Why MindNotes Pro?

You don't always need a full-featured note app. Sometimes you just need a **blank canvas** and something to draw with.

MindNotes Pro is that canvas. It loads in under a second, saves automatically, and never asks you to create an account.

<br />

<table>
<tr>
<td width="50%" valign="top">

### 🪶 Featherweight

**3 dependencies.** That's it.\
No bloated frameworks. No 2MB bundle.\
Just React, Zustand, and your browser's Canvas API.

</td>
<td width="50%" valign="top">

### 🔒 Completely Private

Everything stays **on your device**.\
No server. No analytics. No tracking.\
Works offline. Works in China. Works everywhere.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### ⚡ Instant

No sign-up, no loading screen, no waiting.\
Open the URL and start drawing.\
Your strokes are saved as you go.

</td>
<td width="50%" valign="top">

### 🎨 Expressive

6 brush types, 9 tools, 8 colors, shapes, text.\
Undo/redo, zoom, minimap, dark mode.\
Export to PNG, JPG, PDF, SVG, Word, or JSON.

</td>
</tr>
</table>

<br />

---

<br />

## ✦ Tools

<br />

| &nbsp; | Tool | What it does | Key |
|:---:|:-----|:-------------|:---:|
| ◇ | **Select** | Click to select, drag to move any element | `0` |
| ✎ | **Pen** | Draw with 6 different brush styles | `1` |
| ◌ | **Eraser** | Deletes strokes for real, not a white overlay | `2` |
| ☞ | **Pan** | Drag to move around the canvas | `3` |
| ▭ | **Rectangle** | Click and drag to draw | `4` |
| ○ | **Circle** | Click and drag to draw | `5` |
| A | **Text** | Click anywhere to type | `6` |
| ╱ | **Line** | Click and drag to draw | `7` |
| → | **Arrow** | Click and drag to draw | `8` |

<br />

## ✦ Brushes

<br />

| Brush | Feel |
|:------|:-----|
| **Pen** | Smooth Bézier curves — the default, the classic |
| **Highlighter** | Semi-transparent wide stroke — great for emphasis |
| **Pencil** | Rough, textured — simulates real pencil pressure |
| **Calligraphy** | Width changes with angle — elegant strokes |
| **Dashed** | Clean dashed lines — perfect for diagrams |
| **Glow** | Neon glow effect — for when you want to stand out |

<br />

---

<br />

## ✦ Quick Start

<br />

### Use it right now

> No download. No install. Just click:
>
> **<https://11suixing11.github.io/mindnotes-pro/>**

<br />

### Run it locally

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

Opens at `http://localhost:3000` automatically.

<br />

### Download offline

Grab the latest `.zip` from [Releases](https://github.com/11suixing11/mindnotes-pro/releases/latest), extract, and open `index.html`. That's it — no server needed.

<br />

---

<br />

## ✦ Keyboard Shortcuts

<br />

| Key | Action | | Key | Action |
|:----|:-------|:--|:----|:-------|
| `0` | Select | | `Ctrl` `Z` | Undo |
| `1` | Pen | | `Ctrl` `⇧` `Z` | Redo |
| `2` | Eraser | | `+` | Zoom in |
| `3` | Pan | | `-` | Zoom out |
| `4` | Rectangle | | `Scroll` | Zoom |
| `5` | Circle | | `Space` + drag | Pan |
| `6` | Text | | `Delete` | Clear all |
| `7` | Line | | | |
| `8` | Arrow | | | |

<br />

---

<br />

## ✦ Tech Stack

<br />

```
React 18 · TypeScript 5 · Vite 5 · Zustand · Canvas API · Tailwind CSS
```

<br />

| | Technology | Why |
|:---:|:-----------|:----|
| ⚛️ | **React 18** | Component-based UI, hooks for state |
| 🔷 | **TypeScript 5** | Type safety, better DX |
| ⚡ | **Vite 5** | Instant HMR, fast builds |
| 🐻 | **Zustand** | Tiny (< 1KB), no boilerplate state management |
| 🖌 | **Canvas API** | Hardware-accelerated 2D drawing |
| 🎨 | **Tailwind CSS** | Utility-first styling, small output |

**3 production dependencies.** Zero CDN. Zero network requests.

<br />

---

<br />

## ✦ Project Structure

<br />

```
src/
├── main.tsx                     Entry point
├── App.tsx                      Root layout
├── AppWrapper.tsx               Error boundary
├── index.css                    Design system & animations
├── components/
│   ├── Canvas.tsx               Drawing engine + zoom + minimap
│   └── Toolbar.tsx              Tool sidebar + property bar + export
└── store/
    ├── types.ts                 Type definitions
    ├── useDrawingStore.ts       Drawing state + localStorage persistence
    ├── useThemeStore.ts         Dark / light theme with system detection
    └── useViewStore.ts          Zoom & pan state
```

<br />

---

<br />

## ✦ Build & Test

<br />

```bash
npm run dev          # Start dev server
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run test:run     # Run test suite
```

Output is static files — deploy to any HTTP server, CDN, or just open `index.html`.

<br />

---

<br />

## ✦ Design Philosophy

<br />

MindNotes Pro follows **24 design principles** focused on restraint, warmth, and clarity:

> **Breathing space** — generous whitespace, nothing feels crowded\
> **Warmth** — soft earth tones, paper texture, gentle shadows\
> **Restraint** — minimal UI, no visual noise, every element earns its place\
> **Hierarchy** — clear information levels, primary actions stand out

The entire UI uses a warm parchment palette (`#f5f0e8`) with an accent of burnt umber (`#c47a5a`) — designed to feel like writing on aged paper, not staring at a screen.

<br />

---

<br />

## ✦ License

<br />

[MIT](LICENSE) — use it however you want.

<br />

---

<br />

<div align="center">

**Made with care.** If you find it useful, a ⭐ makes my day.

<br />

<a href="https://11suixing11.github.io/mindnotes-pro/">Try it</a> · <a href="https://github.com/11suixing11/mindnotes-pro/releases">Download</a> · <a href="https://github.com/11suixing11/mindnotes-pro/issues">Report a bug</a>

</div>
