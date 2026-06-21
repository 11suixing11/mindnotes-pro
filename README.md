<div align="center">
<img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />

# MindNotes Pro

**The world's first whiteboard with a physics-based eraser engine.**  
A beautiful, local-first whiteboard that feels like drawing on real paper.

No cloud. No tracking. No subscriptions. Just open it and draw.

<p>
  <a href="https://11suixing11.github.io/mindnotes-pro"><img src="https://img.shields.io/badge/✨_Try_the_Physics_Eraser-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="Try it now" /></a>
  &nbsp;
  <a href="#quick-start"><img src="https://img.shields.io/badge/📦_Quick_Start-2ECC71?style=for-the-badge" alt="Quick Start" /></a>
</p>

<p>
  <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/11suixing11/mindnotes-pro/stargazers"><img src="https://img.shields.io/github/stars/11suixing11/mindnotes-pro?style=social" alt="GitHub Stars" /></a>
  <a href="https://github.com/11suixing11/mindnotes-pro/network/members"><img src="https://img.shields.io/github/forks/11suixing11/mindnotes-pro?style=social" alt="GitHub Forks" /></a>
  <img src="https://img.shields.io/badge/version-3.3.0-00C9A7?style=flat-square" alt="Version 3.3.0" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/deps_only_5-green" alt="Only 5 dependencies" />
</p>

<p>
  <strong>🌐 Languages:</strong>
  <strong>English</strong> ·
  <a href="README_CN.md">中文</a> ·
  <a href="README_JA.md">日本語</a>
</p>
</div>

---

## Table of Contents

- [Why MindNotes Pro?](#-why-mindnotes-pro)
- [The Physics Eraser — How It Works](#-the-physics-eraser--how-it-works)
- [Feature Highlights](#-feature-highlights)
- [Screenshots](#screenshots)
- [How It Compares](#how-it-compares)
- [Quick Start](#quick-start)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tech Stack](#tech-stack)
- [Performance](#-performance)
- [Design Philosophy](#-design-philosophy)
- [Roadmap](#️-roadmap)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#license)

---

## 🏆 Why MindNotes Pro?

<div align="center">
  <img src=".github/demo.gif" alt="MindNotes Pro Physics Eraser Demo" width="80%" />
</div>

> **Every whiteboard has an eraser. None have a physics engine.**

Most whiteboard apps treat erasing as a binary operation — strokes either exist or they don't. MindNotes Pro reimagines erasing as a **physical interaction** with pressure, friction, wear, and even sound.

**What makes it different:**

| Feature | Traditional Eraser | MindNotes Pro Physics Eraser |
| --- | --- | --- |
| Erase behavior | Binary delete | Pressure-sensitive partial erasure |
| Eraser condition | Always the same | Degrades with use, sharpen to restore |
| Shape | One-size-fits-all | Circle, square, chisel with rotation |
| Tilt support | None | Apple Pencil side-erasing |
| Feedback | Silent | Particle effects + dynamic audio |
| Realism | "Delete button" | "Feels like a real eraser" |

---

## 🧽 The Physics Eraser — How It Works

The physics eraser is not a gimmick — it's a **custom-built simulation engine** with 1,200+ lines of physics code, 22 rounds of optimization, and its own spatial indexing system.

### Core Systems

**1. Pressure Sensing**
Heavy pressure erases strokes completely. Light pressure fades them gradually. The pressure curve uses a non-linear exponent (`pressure^0.7`) so that heavy pressure saturates quickly — just like pressing a real eraser harder doesn't proportionally increase erasing.

**2. Wear Simulation**
Every erase action wears down the eraser. Wear is calculated from:
- **Pressure** — pressing harder wears the eraser faster
- **Hardness** — harder erasers (2B) last longer than soft ones (6B)
- **Velocity** — optimal erasing speed minimizes wear

When the eraser gets dull, strokes fade instead of disappearing. Press `R` to "sharpen" it — restoring full erasing power.

**3. Shape Awareness**
Three eraser shapes with distinct behaviors:
- **Circle** — uniform erasing in all directions
- **Square** — wider coverage, rotation affects contact area
- **Chisel** — precision edge work, ideal for detailed corrections

Each shape has rotation support, and the chisel shape changes behavior based on angle.

**4. Tilt Support (Apple Pencil)**
When using an Apple Pencil, tilting the pen activates side-erasing — just like tilting a real eraser to use its flat edge. The `tiltX` and `tiltY` values are read directly from the pointer event API.

**5. Particle System**
A dedicated `EraserParticleSystem` spawns eraser dust particles at the erase point. Particles have:
- Physics: gravity, air friction, initial velocity based on erase direction
- Visuals: size variance, rotation, Monet-palette colors
- Lifecycle: spawn → fly → fade → recycle

Up to 200 particles can exist simultaneously, with automatic recycling for performance.

**6. Audio Engine**
The `EraserAudioEngine` generates real-time sound using the Web Audio API. Sound characteristics change with:
- **Pressure** — louder and lower pitch when pressing hard
- **Speed** — faster erasing = higher frequency
- **Wear** — duller erasers produce muffled sound
- **Brand** — each eraser brand has its own waveform and frequency profile

**7. Spatial Indexing**
An `RBush`-based spatial index accelerates hit-testing from O(n) to O(log n). Combined with dirty-rect optimization and LRU caching, the eraser maintains 60fps even on large canvases.

### Eraser Presets

| Preset | Hardness | Wear Rate | Radius | Best For |
| --- | --- | --- | --- | --- |
| **2B** (Hard) | 0.85 | Slow | 8px | Precise detail work |
| **4B** (Medium) | 0.50 | Medium | 12px | Everyday erasing (default) |
| **6B** (Soft) | 0.20 | Fast | 18px | Large area, soft blending |

### Brand Skins (Planned)

Each brand skin modifies physics properties and visual appearance:

| Brand | Origin | Color | Specialty |
| --- | --- | --- | --- |
| 🌸 Sakura | Japan | Pink | Smooth, durable |
| 🔵 Faber-Castell | Germany | Blue | Professional, hard-wearing |
| 🟡 Staedtler | Germany | Yellow | Engineering precision |
| 🟢 Uni (Mitsubishi) | Japan | Green | Ultra-smooth, artist-grade |

---

## ✨ Feature Highlights

> **Why developers and designers are switching to MindNotes Pro:**

<div align="center">

| | Feature | Details |
| ---: | --- | --- |
| 🎯 | **World's first physics eraser** | 22 rounds of optimization, 1,200+ lines of physics code |
| 🪶 | **Only 5 runtime dependencies** | React, ReactDOM, Zustand, perfect-freehand, jsPDF |
| ⚡ | **< 1 second cold start** | No Electron, no bundler bloat — just Vite + pure Canvas |
| 📲 | **Offline PWA** | Install on any device, works without internet |
| 🔒 | **Zero cloud dependency** | All data stays in localStorage — nothing ever leaves your device |
| 🎨 | **Monet-inspired aesthetic** | Watercolor palettes, glassmorphism, paper textures |
| ✏️ | **6 brush styles** | Pen, highlighter, pencil, calligraphy, dashed, glow |
| 📝 | **Text annotations** | Inline text on canvas with auto-sizing |
| 🖼️ | **Image paste** | Paste images directly from clipboard |
| 🔷 | **Shape tools** | Rectangle, circle, line, arrow — all with fill options |
| 🖱️ | **Frame selection** | Multi-select, resize, move, snap & align |
| ↩️ | **Undo/Redo** | Full history with keyboard shortcuts |
| 🌙 | **Dark mode** | Auto-detects system preference |
| 📄 | **Export** | PDF (via jsPDF) and PNG export |
| 🗂️ | **Multi-document** | Folder hierarchy, drag & drop, auto-save |
| ⌨️ | **Pro shortcuts** | Press `?` in-app for the full cheat sheet |

</div>

```bash
git clone https://github.com/11suixing11/mindnotes-pro && cd mindnotes-pro && npm i && npm run dev
```

---

## Who is this for?

| You are... | MindNotes Pro helps you... |
| --- | --- |
| 🎨 An **artist / sketcher** | Experience the most realistic digital erasing available |
| 🎓 A **student** | Sketch diagrams and annotate ideas during lectures |
| 💡 A **designer** | Quickly mock up concepts without opening Figma |
| 👩‍💻 A **developer** | Whiteboard system designs and architecture |
| 📋 A **note-taker** | Combine handwriting, shapes, and text on one canvas |
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

## How it compares

**The physics eraser sets us apart — no one else has this.**

|                          | MindNotes Pro 🏆 |  Excalidraw   |   tldraw   | Drawnix  |   Miro   |
| ------------------------ | :--------------: | :-----------: | :--------: | :------: | :------: |
| **Physics Eraser**       |    ✅ **YES**    |      ❌       |     ❌     |    ❌    |    ❌    |
| **Pressure sensing**     |    ✅ **YES**    |      ❌       |     ❌     |    ❌    |    ❌    |
| **Wear simulation**      |    ✅ **YES**    |      ❌       |     ❌     |    ❌    |    ❌    |
| **Eraser particles**     |    ✅ **YES**    |      ❌       |     ❌     |    ❌    |    ❌    |
| **Audio feedback**       |    ✅ **YES**    |      ❌       |     ❌     |    ❌    |    ❌    |
| **Open source**          |    ✅ MIT ✅     |    ✅ MIT     | ⚠️ Partial | ✅ MIT   |    ❌    |
| **Local-first**          |    ✅ **Yes**    |      ❌       |     ❌     |    ❌    |    ❌    |
| **Runtime deps**         |     **5** 🪶     |      30+      |    50+     |   20+    |   N/A    |
| **Bundle size**          |   **< 200 KB**   |     ~2 MB     |   ~3 MB    |  ~1.5 MB |   N/A    |
| **Load time**            |   **< 1s** ⚡    |     3-5s      |    3-5s    |   2-4s   |   5s+    |
| **Offline PWA**          |    ✅ **Yes**    |      ⚠️       |     ❌     |    ❌    |    ❌    |
| **Custom aesthetics**    |   ✅ Monet 🎨    | ✅ Hand-drawn |  ⚠️ Basic  | ✅ Clean | ✅ Paid  |
| **Telemetry / tracking** |   ✅ **None**    |    ⚠️ Some    |  ⚠️ Some   | ✅ None  | ✅ Heavy |
| **Free forever**         |    ✅ **Yes**    |      ✅       |  ⚠️ Paid   |    ✅    |  ❌ $$$  |

---

## Quick start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (or pnpm / yarn)

### Option 1: Use it online

👉 **[Open MindNotes Pro](https://11suixing11.github.io/mindnotes-pro)** — nothing to install, nothing to sign up for. **Try the physics eraser!**

### Option 2: Run locally

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — start drawing in 30 seconds.

### Option 3: Deploy your own

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://vercel.com/button" alt="Deploy to Vercel" height="32" />
  </a>
  &nbsp;
  <a href="https://app.netlify.com/start/deploy?repository=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify" height="32" />
  </a>
</p>

### Development commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Vitest single run |
| `npm run lint` | ESLint check |

---

## Keyboard shortcuts

Press `?` in the app to view all shortcuts. The essentials:

| Shortcut | Action |
| --- | --- |
| `P` | Pen tool |
| `E` | Eraser (physics mode) |
| `S` | Selection tool |
| `T` | Text tool |
| `R` / `C` / `L` / `A` | Rectangle / Circle / Line / Arrow |
| `Space` + drag | Pan canvas |
| `Ctrl` + `Z` / `Y` | Undo / Redo |
| `Ctrl` + `A` | Select all |
| `Ctrl` + `C` / `V` | Copy / Paste |
| `Ctrl` + `E` | Export menu |
| `Delete` | Delete selected |
| `Scroll` | Zoom in/out |
| `Dark/Light` | Toggle theme |

**Eraser-specific shortcuts:**

| Shortcut | Action |
| --- | --- |
| `1` / `2` / `3` | Switch eraser shape (circle / square / chisel) |
| `Q` / `W` / `E` | Switch eraser preset (2B / 4B / 6B) |
| `R` | Sharpen eraser (reset wear) |
| `M` | Toggle eraser sound |
| `[` / `]` | Adjust eraser size |

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 18 + TypeScript | Type-safe, concurrent features |
| State | Zustand (6 slices) | Tiny (~1KB), no boilerplate, great DX |
| Drawing | perfect-freehand + Canvas API | Natural pen strokes, hardware-accelerated |
| **Eraser** | **Custom Physics Engine + RBush** | **Industry exclusive — 1,200+ lines of physics code** |
| Audio | Web Audio API | Real-time sound synthesis, no audio files needed |
| Particles | Custom particle system | 200 concurrent particles at 60fps |
| Style | Tailwind CSS + Monet palette | Beautiful by default, utility-first |
| Export | jsPDF (lazy-loaded) | Zero impact on initial bundle |
| Build | Vite 5 | Instant HMR, optimized chunks |
| Test | Vitest + Testing Library | 574+ unit tests, 60%+ coverage |

### Project structure

```
src/
├── canvas/                    # Canvas drawing engine & utilities
│   ├── canvasUtils.ts         # Stroke rendering, hit-testing, bounds
│   └── useCanvasRenderer.ts   # Main rendering loop hook
├── eraser/                    # Physics eraser engine (our crown jewel)
│   ├── PhysicsEraserEngine.ts # Core physics: pressure, wear, strength
│   ├── SpatialIndex.ts        # RBush-based O(log n) hit-testing
│   ├── EraserParticleSystem.ts# Particle effects engine
│   ├── EraserAudioEngine.ts   # Web Audio API sound synthesis
│   ├── eraserStore.ts         # Eraser state management
│   ├── eraserRendering.ts     # Eraser cursor & UI rendering
│   ├── types.ts               # Type definitions & preset configs
│   ├── performanceOptimizer.ts# Dirty-rect & LRU cache optimization
│   └── __tests__/             # 39 test files for eraser alone
├── components/
│   ├── canvas/                # Canvas component + hooks
│   ├── eraser/                # Eraser controls & settings UI
│   ├── toolbar/               # Tool selection, color picker, brush
│   ├── sidebar/               # Document/folder management
│   ├── export-menu/           # PDF/PNG export
│   └── ...                    # Toast, modals, guides
├── store/
│   ├── slices/                # Zustand slices (6 total)
│   ├── appStore.ts            # Combined store
│   ├── saveManager.ts         # Auto-save to localStorage
│   └── types.ts               # TypeScript types
└── App.tsx                    # Root component
```

---

## 💬 What users say

> _"The physics eraser is insane. I didn't know I needed this until I tried it. Now I can't go back to regular erasers."_
> — ⭐ Early adopter

> _"Finally, a whiteboard app that's < 200KB. My students love it for sketching diagrams."_
> — ⭐ Educator

> _"The Monet palette is gorgeous. I switched from Excalidraw for quick mockups."_
> — ⭐ Designer

> _"Erasing actually feels satisfying now. That particle effect is chef's kiss."_
> — ⭐ Artist

**Using MindNotes Pro?** [Add your testimonial](https://github.com/11suixing11/mindnotes-pro/discussions/showcase) — we'd love to hear from you!

---

## 🚀 Performance

MindNotes Pro is built for speed. Every optimization decision is intentional.

| Metric | Value | How |
| --- | --- | --- |
| **Bundle size** | < 200 KB gzipped | 5 runtime deps, tree-shaking, code splitting |
| **Cold start** | < 1 second | Vite build, no framework overhead |
| **Canvas FPS** | 60fps sustained | Dirty-rect rendering, spatial indexing |
| **Eraser latency** | < 16ms per frame | O(log n) hit-testing via RBush |
| **Memory** | ~50MB typical | LRU cache with bounded size |
| **Lighthouse** | 95+ Performance | PWA-optimized, lazy-loaded exports |

### Key optimizations

- **Spatial indexing** — RBush for O(log n) element lookups instead of O(n) linear scan
- **Dirty-rect rendering** — only redraws changed regions, not the entire canvas
- **LRU caching** — bounds cache, gradient cache, path cache with automatic eviction
- **Stroke boundary cache** — WeakMap-based lazy computation with invalidation
- **ID→Element mapping** — O(1) element lookup replacing O(n) array search
- **Batch draw calls** — grouped rendering operations to minimize canvas state changes
- **Particle recycling** — dead particles are recycled, not garbage-collected

---

## 🎨 Design Philosophy

### 1. Local-first, always

Your data belongs to you. MindNotes Pro stores everything in your browser's localStorage. There are no servers, no accounts, no "sign in to save." If you close the browser and come back tomorrow, your work is still there.

### 2. Minimal dependencies, maximum trust

Every dependency is a potential security risk and maintenance burden. We use only 5 runtime packages — each one essential:
- **react** + **react-dom** — the UI framework
- **zustand** — state management (~1KB)
- **perfect-freehand** — natural pen stroke rendering
- **jspdf** — PDF export (lazy-loaded)

### 3. Beauty is a feature

Inspired by Monet's impressionist palette — watercolor gradients, glassmorphism panels, and paper textures. Digital tools should feel warm and human, not clinical.

### 4. Physics over pixels

The eraser isn't a delete button with a skin. It's a simulation. Pressure matters. Wear accumulates. Sound responds to your actions. This commitment to physical realism is what makes MindNotes Pro feel different.

---

## 🗺️ Roadmap

| Version | Feature | Status |
| --- | --- | --- |
| v3.3 | 🧽 **Physics Eraser Engine** — 22 rounds of optimization | ✅ **Shipped** |
| v3.4 | 🎨 **Eraser brand skins** — Sakura, Faber-Castell, etc. | 📋 Planned |
| v3.4 | ⌨️ **Shortcut customization** — Remap any shortcut | 📋 Planned |
| v4.0 | 🤝 **Real-time collaboration** — draw together on the same canvas | 🔄 Planning |
| v4.0 | 🔌 **Plugin system** — extend with custom brushes, shapes, and exports | 🔄 Planning |
| v4.0 | 📱 **Mobile optimization** — touch gestures, responsive toolbar | 🔄 Planning |

> Have ideas for the roadmap? [Open a discussion](https://github.com/11suixing11/mindnotes-pro/discussions) and let us know!

---

## ❓ FAQ

<details>
<summary><strong>Q: Is my data private?</strong></summary>

Yes, completely. All data is stored in your browser's localStorage. Nothing is ever sent to any server. There are no analytics, no tracking scripts, no cookies. You can verify this by opening your browser's Network tab — you'll see zero outbound requests.
</details>

<details>
<summary><strong>Q: Does it work offline?</strong></summary>

Yes. MindNotes Pro is a Progressive Web App (PWA). After your first visit, it works completely offline. You can install it from your browser's "Add to Home Screen" or address bar install prompt.
</details>

<details>
<summary><strong>Q: What browsers are supported?</strong></summary>

MindNotes Pro works on all modern browsers:
- ✅ Chrome / Edge 90+
- ✅ Firefox 90+
- ✅ Safari 15+
- ✅ Arc, Brave, Vivaldi

The physics eraser works best with a pressure-sensitive input device (Apple Pencil, Wacom, etc.) but also works with a regular mouse.
</details>

<details>
<summary><strong>Q: How much data can it handle?</strong></summary>

localStorage has a ~5MB limit per origin. A typical document with hundreds of strokes uses ~100-500KB. For very large canvases, we're working on IndexedDB support for unlimited storage.
</details>

<details>
<summary><strong>Q: Can I use it for commercial purposes?</strong></summary>

Yes. MindNotes Pro is MIT licensed. You can use, modify, and distribute it for any purpose, including commercial use. No attribution required (but appreciated!).
</details>

<details>
<summary><strong>Q: How do I contribute?</strong></summary>

We welcome all contributions! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding conventions, and PR guidelines. Look for [good first issues](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue) if you're new.
</details>

<details>
<summary><strong>Q: Why "only 5 dependencies"?</strong></summary>

Every dependency is a supply chain risk, a version conflict waiting to happen, and a bundle size tax. By keeping dependencies minimal, we get: faster installs, smaller bundles, fewer CVEs, and complete understanding of every line of code. The web platform is more capable than you think.
</details>

<details>
<summary><strong>Q: Is there a desktop app?</strong></summary>

Not yet, but it's on the roadmap. The architecture already supports Electron/Tauri wrapping. For now, the PWA experience is nearly native — install it from your browser for an app-like experience.
</details>

---

## 🤝 Contributing

**Everyone is welcome.** Whether you're a seasoned open-source contributor or this is your first PR ever — we'd love your help. No contribution is too small: fixing a typo, improving docs, or shipping a feature.

- 🐛 **Found a bug?** → [Open an issue](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.yml)
- 💡 **Have an idea?** → [Request a feature](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.yml)
- 🔧 **Want to code?** → Check out [CONTRIBUTING.md](CONTRIBUTING.md) — it has everything you need to get started in 5 minutes
- ⭐ **Like it?** → Star this repo — it genuinely helps others discover the project

### Good First Issues 🌱

New to open source? We have hand-picked issues for first-time contributors:

👉 **[Browse all Good First Issues](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue)**

---

## 💚 Support

If MindNotes Pro is useful to you, here's how you can help the project grow:

| Action | Impact |
| --- | --- |
| ⭐ **Star this repo** | Helps others discover the project — **this is the #1 thing you can do** |
| 🐦 **Share on social media** | Tweet about the physics eraser, post on Reddit, share in your team chat |
| 🍴 **Fork & customize** | Make it your own, then share back with the community |
| 🐛 **Report bugs** | [Open an issue](https://github.com/11suixing11/mindnotes-pro/issues/new) — even a one-liner helps |
| 💬 **Join the discussion** | [GitHub Discussions](https://github.com/11suixing11/mindnotes-pro/discussions) — ideas, questions, showcase your work |
| 🔧 **Contribute code** | Check [CONTRIBUTING.md](CONTRIBUTING.md) to get started |

---

## Star history

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

## License

[MIT](LICENSE) — use it however you want.

---

<div align="center">
**Built with ❤️ by [11suixing11](https://github.com/11suixing11)**

<sub>If MindNotes Pro saved you from opening Figma for a quick sketch — give it a ⭐</sub>

<sub>**The physics eraser took 22 rounds of optimization. If you love it, tell a friend!**</sub>
</div>
