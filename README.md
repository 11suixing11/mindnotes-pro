<div align="center">

<br />

# MindNotes Pro

### Open-source local whiteboard drawing app

<br />

**Use online · No registration · 100% local data · Accessible from China**

<br />

<a href="https://11suixing11.github.io/mindnotes-pro/">
  <img src="https://img.shields.io/badge/🟢_Try_Online-GitHub_Pages-22c55e?style=for-the-badge&logo=github&logoColor=white" alt="Try Online" />
</a>

<br /><br />

[![Release](https://img.shields.io/github/v/release/11suixing11/mindnotes-pro?color=blue&label=Release)](https://github.com/11suixing11/mindnotes-pro/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)

</div>

<br />

---

## What is MindNotes Pro?

MindNotes Pro is a lightweight whiteboard drawing app that runs entirely in the browser. All data is stored locally on your device — no server, no account, no internet required.

Open it and draw. Close it and your work is saved automatically.

<br />

## Features

### Drawing Tools

| Tool | Description | Shortcut |
|:-----|:------------|:--------:|
| 🔲 Select | Click to select, drag to move | `0` |
| ✏️ Pen | 6 brush types available | `1` |
| 🧹 Eraser | Actually deletes strokes (not white overlay) | `2` |
| ✋ Pan | Drag to move the canvas | `3` |
| ⬜ Rectangle | Drag to draw | `4` |
| ⭕ Circle | Drag to draw | `5` |
| 🔤 Text | Click canvas to type | `6` |
| 📏 Line | Drag to draw | `7` |
| ➡️ Arrow | Drag to draw | `8` |

### Brush Types

| Brush | Effect |
|:------|:-------|
| ✒️ Pen | Smooth Bézier curves |
| 🖍 Highlighter | Semi-transparent wide stroke |
| ✏️ Pencil | Rough texture, simulated pressure |
| 🖊 Calligraphy | Width varies with angle |
| ┅ Dashed | Dashed line stroke |
| ✨ Glow | Neon glow effect with shadowBlur |

### More Features

- 8-color palette + custom color picker
- 4 line widths (XS / S / M / L)
- Undo / Redo (50-step snapshot)
- Zoom (scroll wheel / buttons / keyboard)
- Dark mode
- Custom canvas background color
- Minimap navigation
- localStorage auto-save
- 6 export formats (PNG / JPG / PDF / SVG / Word / JSON)
- Import JSON to restore drawings
- Insert images from local files
- Fullscreen mode
- Keyboard shortcuts (0–8 to switch tools)

<br />

## Quick Start

### Option 1: Use Online (Recommended)

> Accessible from China, no VPN needed:
>
> **https://11suixing11.github.io/mindnotes-pro/**

<br />

### Option 2: Run Locally

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

Browser opens `http://localhost:3000` automatically.

<br />

## Keyboard Shortcuts

| Key | Action |
|:----|:-------|
| `0` | Select tool |
| `1` | Pen |
| `2` | Eraser |
| `3` | Pan |
| `4` | Rectangle |
| `5` | Circle |
| `6` | Text |
| `7` | Line |
| `8` | Arrow |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `+` / `-` | Zoom in / out |
| `Delete` | Clear canvas |

<br />

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| UI Framework | React 18 |
| Language | TypeScript 5 |
| Build Tool | Vite 5 |
| State Management | Zustand |
| Styling | Tailwind CSS 3 |
| Drawing Engine | Canvas API |
| Testing | Vitest + Testing Library |

**Only 3 production dependencies**: `react`, `react-dom`, `zustand`

**Zero external CDN · Zero network requests · Accessible from China**

<br />

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Main app
├── AppWrapper.tsx           # ErrorBoundary
├── index.css                # Design system (CSS variables + animations)
├── components/
│   ├── Canvas.tsx           # Canvas (drawing + zoom + minimap)
│   └── Toolbar.tsx          # Toolbar (left tools + top properties + export)
└── store/
    ├── types.ts             # Type definitions
    ├── useDrawingStore.ts   # Drawing state + localStorage
    ├── useThemeStore.ts     # Dark/light theme
    └── useViewStore.ts      # Zoom/pan
```

<br />

## Build

```bash
npm run build      # Production build → dist/
npm run preview    # Preview build output
npm run test:run   # Run tests
```

Build output is static files, deployable to any HTTP server.

<br />

## License

[MIT](LICENSE)
