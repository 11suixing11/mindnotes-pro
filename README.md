<div align="center">

<img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />

# MindNotes Pro

**A beautiful, local-first whiteboard that feels like painting on real paper.**

No cloud. No tracking. No subscriptions. Just open it and draw.

<p>
  <a href="https://11suixing11.github.io/mindnotes-pro"><img src="https://img.shields.io/badge/✨_Try_it_Now-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="Try it now" /></a>
  &nbsp;
  <a href="#quick-start"><img src="https://img.shields.io/badge/📦_Quick_Start-2ECC71?style=for-the-badge" alt="Quick Start" /></a>
</p>

<p>
  <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/deps_only_3-green" alt="Only 3 dependencies" />
</p>

<p>
  <strong>🌐 Languages:</strong>
  <strong>English</strong> ·
  <a href="README_CN.md">中文</a> ·
  <a href="README_JA.md">日本語</a>
</p>

</div>

---

## See it in action

<div align="center">
  <img src=".github/demo.gif" alt="MindNotes Pro Demo" width="80%" />
</div>

---

## Why you'll love it

<table>
<tr>
<td width="50%">

### 🎨 Feels like real art, not a tool

Inspired by **Monet's impressionist palette** — watercolor gradients, glassmorphism panels, and paper textures that make digital drawing feel warm and human. Six unique brush types including calligraphy, glow pen, and pencil.

### 🔒 Your thoughts stay yours

**Everything lives in your browser.** No accounts, no servers, no "sign in to save." Your data never leaves your device — even works offline as a PWA.

### ⚡ Zero bloat, instant load

Only **3 runtime dependencies**. Loads in under a second. No 50MB Electron app, no loading spinners — just a whiteboard that's ready when you are.

</td>
<td width="50%">

### 📝 Think visually

- ✏️ Freehand drawing with **6 brush styles**
- 🔷 Shapes — rectangles, circles, lines, arrows
- 📝 Inline text annotations
- 🖼️ Paste images directly onto canvas
- 🖱️ Frame select, resize, move, snap & align
- ↩️ Full undo/redo history
- 🌙 Dark mode (auto-detects your system)
- 📄 Export to **PDF** or **PNG**

### 🗂️ Stay organized

- Multi-document workspace
- Folder hierarchy with drag & drop
- Auto-saves to localStorage
- Rename, duplicate, delete — all local

</td>
</tr>
</table>

---

## Who is this for?

| You are...                        | MindNotes Pro helps you...                               |
| --------------------------------- | -------------------------------------------------------- |
| 🎓 A **student**                  | Sketch diagrams and annotate ideas during lectures       |
| 💡 A **designer**                 | Quickly mock up concepts without opening Figma           |
| 👩‍💻 A **developer**                | Whiteboard system designs and architecture               |
| 📋 A **note-taker**               | Combine handwriting, shapes, and text on one canvas      |
| 🧠 Anyone who **thinks visually** | Get ideas out of your head and onto a canvas — instantly |

---

## Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>☀️ Light Mode</strong></td>
      <td align="center"><strong>🌙 Dark Mode</strong></td>
    </tr>
    <tr>
      <td><img src=".github/mindnotes-light.svg" width="420" /></td>
      <td><img src=".github/mindnotes-dark.svg" width="420" /></td>
    </tr>
  </table>
</div>

---

## Keyboard shortcuts

Press `?` in the app to view all shortcuts. The essentials:

| Shortcut              | Action                            |
| --------------------- | --------------------------------- |
| `P`                   | Pen tool                          |
| `E`                   | Eraser                            |
| `S`                   | Selection tool                    |
| `T`                   | Text tool                         |
| `R` / `C` / `L` / `A` | Rectangle / Circle / Line / Arrow |
| `Space` + drag        | Pan canvas                        |
| `Ctrl` + `Z` / `Y`    | Undo / Redo                       |
| `Ctrl` + `A`          | Select all                        |
| `Ctrl` + `C` / `V`    | Copy / Paste                      |
| `Ctrl` + `E`          | Export menu                       |
| `Delete`              | Delete selected                   |
| `Scroll`              | Zoom in/out                       |
| `Dark/Light`          | Toggle theme                      |

---

## Quick start

### Just open it

👉 **[Open MindNotes Pro](https://11suixing11.github.io/mindnotes-pro)** — nothing to install, nothing to sign up for.

### Run locally

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — start drawing in 30 seconds.

### Deploy your own

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://vercel.com/button" alt="Deploy to Vercel" height="32" />
  </a>
  &nbsp;
  <a href="https://app.netlify.com/start/deploy?repository=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify" height="32" />
  </a>
</p>

---

## How it compares

|                         | MindNotes Pro |  Excalidraw   |   tldraw   | Miro |
| ----------------------- | :-----------: | :-----------: | :--------: | :--: |
| **Open source**         |    ✅ MIT     |    ✅ MIT     | ⚠️ Partial |  ❌  |
| **Local-first**         |      ✅       |      ❌       |     ❌     |  ❌  |
| **Runtime deps**        |     **3**     |      30+      |    50+     | N/A  |
| **Offline PWA**         |      ✅       |      ⚠️       |     ❌     |  ❌  |
| **Document management** |      ✅       |      ❌       |     ❌     |  ✅  |
| **Custom aesthetics**   |   ✅ Monet    | ✅ Hand-drawn |  ⚠️ Basic  |  ✅  |
| **Free forever**        |      ✅       |      ✅       |     ⚠️     |  ❌  |

---

## Tech stack

| Layer   | Choice                                | Why                           |
| ------- | ------------------------------------- | ----------------------------- |
| UI      | React 18 + TypeScript                 | Type-safe, fast               |
| State   | Zustand (6 slices)                    | Tiny, no boilerplate          |
| Drawing | perfect-freehand + Canvas API         | Natural pen strokes           |
| Style   | Tailwind CSS + Monet palette          | Beautiful by default          |
| Export  | jsPDF (lazy-loaded)                   | Zero impact on initial bundle |
| Build   | Vite 5                                | Instant HMR                   |
| Test    | Vitest + Testing Library + Playwright | 245+ unit tests, E2E ready    |

---

## Contributing

We'd love your help — whether it's a bug report, a feature idea, or a pull request.

- 🐛 **Found a bug?** → [Open an issue](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.yml)
- 💡 **Have an idea?** → [Request a feature](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.yml)
- 🔧 **Want to code?** → Read [CONTRIBUTING.md](CONTRIBUTING.md)
- ⭐ **Like it?** → Star this repo — it genuinely helps others discover the project

Look for [`good first issue`](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue) labels if you're new here.

---

## Architecture

<div align="center">
  <img src=".github/architecture.svg" alt="Architecture" width="600" />
</div>

---

## Star history

<div align="center">
  <a href="https://star-history.com/#11suixing11/mindnotes-pro&Date">
    <img src="https://api.star-history.com/svg?repos=11suixing11/mindnotes-pro&type=Date" alt="Star History" width="600" />
  </a>
</div>

---

## License

[MIT](LICENSE) — use it however you want.

---

<div align="center">

**Built with ❤️ by [11suixing11](https://github.com/11suixing11)**

<sub>If MindNotes Pro saved you from opening Figma for a quick sketch — give it a ⭐</sub>

</div>
