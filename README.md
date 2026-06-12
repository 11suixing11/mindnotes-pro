<div align="center">

<img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />

# MindNotes Pro

### The beautiful, privacy-first whiteboard that works offline ✨

<p>
  <strong>Draw, sketch, and organize your thoughts</strong> with an intuitive canvas experience.
  <br/>No cloud. No tracking. Just your creativity.
</p>

<p>
  <strong>🌐 Languages:</strong>
  <strong>English</strong> ·
  <a href="README_CN.md">中文</a> ·
  <a href="README_JA.md">日本語</a>
</p>


<p>
  <a href="https://11suixing11.github.io/mindnotes-pro"><img src="https://img.shields.io/badge/🚀_Try_Live_Demo-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="Try Live Demo" /></a>
  <a href="#getting-started"><img src="https://img.shields.io/badge/📦_Quick_Start-2ECC71?style=for-the-badge" alt="Quick Start" /></a>
</p>

<p>
  <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/dependencies-3-green" alt="Only 3 dependencies" />
</p>

</div>

---

## 🎬 Demo

<div align="center">
  <img src=".github/demo.gif" alt="MindNotes Pro Demo" width="80%" />
</div>

---

## ✨ Why MindNotes Pro?

<table>
<tr>
<td width="50%">

### 🎨 Beautiful by Design
Inspired by Monet's impressionist palette — watercolor gradients, glass morphism effects, and paper textures that make digital drawing feel natural.

### 🔒 Privacy-First
**Zero cloud dependency.** All data stays in your browser via localStorage. No accounts, no tracking, no servers.

### ⚡ Lightning Fast
Only **3 core dependencies** (React, Zustand, perfect-freehand). Loads in under 1 second. Works offline as a PWA.

</td>
<td width="50%">

### 📝 Feature Rich
- Freehand drawing with pressure sensitivity
- Shape tools (rectangles, lines, arrows)
- Inline text annotations
- Multi-select, resize, and move
- Undo/Redo history stack
- Dark mode with system detection
- PDF/PNG export
- Document management with folders

### 🛠 Developer Friendly
- TypeScript strict mode
- Zustand slice architecture
- Comprehensive test suite
- Clean, documented codebase

</td>
</tr>
</table>

---

## 🚀 Getting Started

### Try it Live
👉 **[Open MindNotes Pro](https://11suixing11.github.io/mindnotes-pro)** — no installation needed!

### Run Locally

```bash
# Clone and run in 30 seconds
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start drawing!

### One-Click Deploy

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://vercel.com/button" alt="Deploy to Vercel" height="32" />
  </a>
  <a href="https://app.netlify.com/start/deploy?repository=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify" height="32" />
  </a>
</p>

---

## 📸 Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>Light Mode</strong></td>
      <td align="center"><strong>Dark Mode</strong></td>
    </tr>
    <tr>
      <td><img src=".github/mindnotes-light.svg" width="400" /></td>
      <td><img src=".github/mindnotes-dark.svg" width="400" /></td>
    </tr>
  </table>
</div>

---

## 🏗 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| UI | React 18 + TypeScript | Type-safe, modern |
| State | Zustand (6 slices) | Lightweight, performant |
| Drawing | perfect-freehand + Canvas | Natural strokes |
| Styling | Tailwind CSS | Rapid development |
| Export | jsPDF (dynamic import) | Zero bundle impact |
| Build | Vite 5 | Instant HMR |
| Testing | Vitest + Testing Library | Fast, reliable |

---

## 📊 Comparison

| Feature | MindNotes Pro | Excalidraw | tldraw | Miro |
|---------|:---:|:---:|:---:|:---:|
| **Open Source** | ✅ MIT | ✅ MIT | ⚠️ Partial | ❌ |
| **Local-first** | ✅ | ❌ | ❌ | ❌ |
| **Zero Dependencies** | ✅ (3) | ❌ (30+) | ❌ (50+) | ❌ |
| **Offline PWA** | ✅ | ⚠️ | ❌ | ❌ |
| **Document Management** | ✅ | ❌ | ❌ | ✅ |
| **Custom Aesthetics** | ✅ Monet | ✅ Hand-drawn | ⚠️ Basic | ✅ |
| **Free Forever** | ✅ | ✅ | ⚠️ | ❌ |

---

## 🤝 Contributing

We love contributions! Whether it's a bug report, feature request, or code contribution — all are welcome.

- 🐛 **Found a bug?** [Open an issue](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.yml)
- 💡 **Have an idea?** [Request a feature](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.yml)
- 🔧 **Want to code?** Check out [CONTRIBUTING.md](CONTRIBUTING.md)
- ⭐ **Like the project?** Star it to show your support!

Look for [`good first issue`](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue) labels — they're perfect for newcomers.

---

## 🌟 Star History

<div align="center">
  <a href="https://star-history.com/#11suixing11/mindnotes-pro&Date">
    <img src="https://api.star-history.com/svg?repos=11suixing11/mindnotes-pro&type=Date" alt="Star History" width="600" />
  </a>
</div>

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ by [11suixing11](https://github.com/11suixing11)**

<p>
  <sub>If you find MindNotes Pro useful, please consider giving it a ⭐ — it helps others discover the project!</sub>
</p>

</div>

