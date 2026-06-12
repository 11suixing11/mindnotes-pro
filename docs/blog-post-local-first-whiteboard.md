# How I Built a Local-First Whiteboard with Only 3 Dependencies

> *Why I chose privacy over features, minimalism over maximalism, and what I learned along the way.*

---

Most whiteboard apps today follow the same playbook: spin up a cloud backend, require user accounts, sync everything to your servers, and charge a subscription. There's nothing inherently wrong with that model — but I wanted to build something different.

**MindNotes Pro** is a local-first whiteboard drawing app that stores everything in the browser, runs offline as a PWA, and ships with only **3 core runtime dependencies**: React, Zustand, and perfect-freehand.

In this post, I'll walk through the architecture decisions, the tradeoffs of going local-first, how I achieved a Monet-inspired aesthetic with pure Canvas rendering, and why keeping dependencies minimal mattered more than I expected.

---

## Why Local-First?

"Local-first" isn't just a technical choice — it's a philosophy. The core idea is simple: **the user's data lives on their device, not on your server.** Cloud sync, if it exists, is an enhancement, not a requirement.

Here's why this mattered for a whiteboard app:

- **Privacy by default.** Sketches, notes, and brainstorming sessions are deeply personal. Users shouldn't need to trust a third party with their raw thoughts.
- **Instant startup.** No authentication flow, no loading spinners while data fetches from a server. Open the tab and start drawing.
- **Offline resilience.** Trains, planes, cafés with bad Wi-Fi — a whiteboard should work everywhere, not just where there's a stable connection.
- **Zero operational cost.** No servers to maintain, no database to scale, no cloud bills. The app is a static site.

The tradeoff is real: no real-time collaboration (yet), no cross-device sync out of the box, and storage limits tied to the browser. But for a personal whiteboard tool, these tradeoffs are acceptable — and they unlock a radically simpler architecture.

---

## The Minimal Dependency Philosophy

When I started MindNotes Pro, I set a constraint: **no dependency unless it solves a problem I can't reasonably solve myself.**

The result:

| Dependency | Purpose | Why I Didn't Build It |
|---|---|---|
| **React 18** | UI framework | Building a reactive UI framework from scratch is not a good use of time |
| **Zustand** | State management | 1.1kB, no providers, no boilerplate — too good to pass up |
| **perfect-freehand** | Pressure-sensitive strokes | The math behind natural-looking strokes is non-trivial |

That's it. Everything else — canvas rendering, PDF export, document management, keyboard shortcuts, selection logic — is custom code.

### Why This Matters

**Bundle size.** The entire app loads in under 1 second on a fast connection. The production JavaScript bundle is remarkably small because we're not shipping utility libraries, date formatters, or component frameworks we don't need.

**Auditability.** When something breaks, there are exactly 3 places to look besides my own code. Debugging is predictable.

**Long-term maintenance.** No transitive dependency vulnerabilities from a 
ode_modules tree with 800 packages. No breaking changes from upstream libraries I barely use.

**Philosophical alignment.** A privacy-first, local-first app shouldn't depend on a sprawling dependency graph. Minimalism in dependencies reflects minimalism in the product philosophy.

---

## Architecture: Zustand Slices

State management in MindNotes Pro is built on a **slice pattern** with Zustand. Instead of one monolithic store, the state is divided into 6 focused slices:

`
src/store/slices/
├── canvasElements.ts   # Drawing elements (strokes, shapes, text, images)
├── docManagement.ts    # Document CRUD, current document tracking
├── folderManagement.ts # Folder hierarchy and organization
├── history.ts          # Undo/redo stack
├── toolSettings.ts     # Active tool, color, brush type, size
└── uiState.ts          # Sidebar visibility, modals, toasts
`

Each slice is a function that receives Zustand's set and get and returns its piece of state plus actions. The main store composes them:

`	ypescript
export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...createToolSettingsSlice(set, get),
  ...createCanvasElementsSlice(set, get),
  ...createHistorySlice(set, get),
  ...createDocManagementSlice(set, get),
  ...createFolderManagementSlice(set, get),
  ...createUISlice(set, get),
}))
`

This pattern gives us:
- **Separation of concerns.** Each slice handles one domain.
- **Type safety.** Each slice exports its own state and action types.
- **Testability.** Slices can be tested in isolation.
- **Flat structure.** No nested providers, no context hell. Just useAppStore() anywhere.

### The Save Manager

One interesting design choice was making the save manager **imperative rather than reactive.** Instead of subscribing to the entire store and diffing on every change, the save manager is called explicitly:

`	ypescript
// Called after drawing, moving, deleting, etc.
scheduleSave()  // debounce 1.5s
saveDocNow()    // immediate save
`

This avoids the classic Zustand anti-pattern of subscribing to the full store just to detect changes. The save manager holds a reference to the store's getState and setState, reads exactly what it needs, and writes to IndexedDB.

### Storage Layer: IndexedDB with Encryption

Documents are persisted to **IndexedDB** (not localStorage, despite what the README suggests — the storage layer abstracts this). The storage module handles:

- Database versioning and migrations
- XOR encryption with Base64 encoding for data at rest
- Graceful fallback to plain text if decryption fails (for migration from older versions)
- Typed CRUD operations (getAll, get, put, del)

The encryption is deliberately lightweight. It's not meant to defend against a determined attacker with access to the device — it's meant to prevent casual reading of raw data from the IndexedDB panel in DevTools. For a local-first app, this is a reasonable threat model.

---

## The Canvas Rendering Pipeline

The canvas is where most of the complexity lives. MindNotes Pro uses a **dual-canvas architecture**:

1. **Elements canvas** (offscreen): Renders all persistent elements (strokes, shapes, text, images) into an offscreen <canvas>.
2. **Main canvas** (visible): Composites the elements canvas, then draws transient UI on top (current stroke, selection boxes, eraser preview, snap lines, minimap).

`
┌─────────────────────────────────────────┐
│ Main Canvas (visible)                   │
│  ┌───────────────────────────────────┐  │
│  │ Background (gradient)             │  │
│  ├───────────────────────────────────┤  │
│  │ Elements Canvas (offscreen cache) │  │
│  │  └─ Grid, Strokes, Shapes, Text  │  │
│  ├───────────────────────────────────┤  │
│  │ Transient Layer                   │  │
│  │  └─ Current stroke, selection,    │  │
│  │     eraser cursor, snap lines     │  │
│  ├───────────────────────────────────┤  │
│  │ UI Overlay                        │  │
│  │  └─ Minimap, zoom level           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
`

### Why Offscreen Caching?

Redrawing every element on every frame is expensive. Instead, the elements canvas is only redrawn when the elements array changes (tracked via a dirty flag). On most frames — when the user is just moving the mouse or panning — only the main canvas redraws, compositing the cached image and painting transient UI.

This is implemented with equestAnimationFrame and Zustand's subscribe:

`	ypescript
useAppStore.subscribe((s) => {
  if (s.elements !== prev) {
    elementsDirtyRef.current = true
    boundsCacheRef.current.clear()
  }
  requestAnimationFrame(() => redraw())
})
`

### Brush Rendering

The drawing engine supports 6 brush types, each with distinct rendering logic:

- **Pen**: Quadratic curve smoothing + perfect-freehand pressure simulation (the subtle fill behind the stroke gives it a natural, ink-like quality)
- **Highlighter**: Wide, semi-transparent strokes with square caps
- **Pencil**: Jittered line segments that simulate graphite texture
- **Calligraphy**: Variable-width strokes based on stroke angle
- **Dashed**: Standard dashed lines with configurable dash/gap ratios
- **Glow**: Shadow-blur based neon effect, tuned differently for light and dark modes

The pen brush is the most interesting. It uses perfect-freehand to generate a pressure-sensitive outline, then draws both a clean quadratic curve stroke and a faint fill of the pressure outline beneath it. This creates a look that's more natural than a simple line but less "computational" than pure pressure rendering.

### Hit Testing and Selection

Hit testing on a canvas is inherently harder than with DOM elements. There's no elementFromPoint(). MindNotes Pro uses bounding-box hit testing: each element type has a elementBounds() function that returns its axis-aligned bounding box, with a 5px padding for easier targeting.

For multi-selection, a marquee rectangle is drawn, and any element whose bounds intersect the marquee is selected. The selection engine handles:

- Shift+click for additive selection
- Drag to move selected elements
- Resize handles (8 cardinal + diagonal directions)
- Snap alignment guides during move/resize

---

## The Monet-Inspired Aesthetic

The visual design of MindNotes Pro draws from Claude Monet's impressionist palette. This wasn't just an aesthetic whim — it was a deliberate choice to make a digital tool feel **warm, organic, and handcrafted.**

### Color System

The color palette is built around soft, muted tones:

- **Light mode**: Warm parchment background with lavender, sage, and terracotta accents
- **Dark mode**: Deep plum-charcoal with rose, dusty blue, and gold accents

These aren't random pretty colors. They're derived from Monet's paintings — the water lilies, the haystacks, the Rouen Cathedral series. The goal is a palette that feels cohesive and calm, not garish.

### Background Rendering

The canvas background isn't a flat color. It's composed of multiple overlapping radial gradients, creating a subtle watercolor wash effect:

`	ypescript
// Light mode: 3 radial gradients at different positions
const g1 = ctx.createRadialGradient(w*0.12, h*0.18, 0, w*0.12, h*0.18, w*0.55)
g1.addColorStop(0, 'rgba(184,160,208,0.16)')  // lavender
g1.addColorStop(1, 'transparent')
// ... additional gradients for sage and warm tones
`

The effect is subtle enough that it doesn't interfere with drawing, but present enough that the canvas feels alive — more like paper than a screen.

### Glass Morphism UI

The toolbar and sidebar use a glass morphism effect: semi-transparent backgrounds with ackdrop-filter: blur(), soft borders, and layered shadows. This creates depth without visual heaviness, and it works beautifully in both light and dark modes.

---

## Performance Considerations

### What We Measure

On a mid-range laptop (M1 MacBook Air), MindNotes Pro achieves:

- **First contentful paint**: < 500ms
- **Time to interactive**: < 1s
- **Frame rate during drawing**: Consistent 60fps with up to ~500 elements
- **Memory usage**: ~30-50MB typical session

### Key Optimizations

1. **Offscreen canvas caching** (described above) — avoids re-rendering static elements
2. **Bounds cache** — a Map<string, Bounds> that's invalidated when elements change
3. **Viewport culling** — only elements visible in the current viewport are drawn
4. **Debounced saves** — writing to IndexedDB is debounced at 1.5 seconds
5. **Dynamic imports** — jsPDF is loaded only when the user exports to PDF
6. **ResizeObserver** — canvas resizing is handled via ResizeObserver, not window resize events

### What We Don't Do (Yet)

- **Virtualization for large canvases.** With thousands of elements, performance will degrade. A spatial index (R-tree or grid) would help.
- **Web Workers for rendering.** The main thread handles both UI and canvas rendering. Offloading to a worker could free up the UI thread.
- **WASM for stroke math.** perfect-freehand is fast, but a WASM implementation could be faster for very complex strokes.

---

## Challenges and Lessons

### Canvas Sizing and DPR

Getting canvas rendering right on high-DPI displays is deceptively tricky. The canvas element's CSS size and its internal pixel buffer must be scaled by devicePixelRatio, and all drawing coordinates must account for this. Get it wrong and everything looks blurry.

`	ypescript
const dpr = window.devicePixelRatio || 1
canvas.width = cssWidth * dpr
canvas.height = cssHeight * dpr
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
`

### Undo/Redo with Composite Operations

Undo/redo in a canvas app isn't as simple as Ctrl+Z on a text editor. MindNotes Pro uses an **action-based history stack** where each undo action is a typed union:

`	ypescript
type UndoAction =
  | { type: 'add'; ids: string[]; els?: CanvasElement[] }
  | { type: 'remove'; items: { el: CanvasElement; index: number }[] }
  | { type: 'clear'; snapshot: CanvasElement[] }
  | { type: 'move'; deltas: { id: string; dx: number; dy: number }[] }
  | { type: 'erase'; before: CanvasElement[]; after: CanvasElement[] }
`

Each action knows how to undo itself. A "move" action, for example, stores the deltas so it can reverse them. A "clear" action stores the entire previous state. This is more memory-efficient than snapshot-based history and more flexible than command-pattern undo.

### The "Only 3 Dependencies" Constraint

Maintaining this constraint required discipline. When I needed PDF export, the temptation to pull in a heavy library was real. Instead, jsPDF is dynamically imported only at export time — it's not counted as a core dependency because it never loads during normal usage.

When I needed date formatting for the sidebar, I wrote a 15-line helper instead of importing date-fns. When I needed a unique ID generator, crypto.randomUUID() was enough.

The lesson: **most "essential" dependencies aren't.** A few hours of custom code often replaces a package that would add 20kB to your bundle and a maintenance surface you don't need.

---

## What's Next

MindNotes Pro is functional but far from done. The roadmap includes:

- **Real-time collaboration** via WebRTC or WebSocket — the biggest missing feature
- **IndexedDB migration** for larger storage capacity (partially done)
- **Spatial indexing** for better performance with thousands of elements
- **Plugin system** for community extensions
- **Mobile optimization** with touch and stylus support
- **AI features** — handwriting recognition, smart shapes, content suggestions

---

## Try It

MindNotes Pro is open source under the MIT license.

- **Live demo**: [https://11suixing11.github.io/mindnotes-pro](https://11suixing11.github.io/mindnotes-pro)
- **Source code**: [https://github.com/11suixing11/mindnotes-pro](https://github.com/11suixing11/mindnotes-pro)

If you're interested in local-first architecture, minimal dependency design, or Canvas rendering, I'd love your feedback. Open an issue, submit a PR, or just give it a star.

---

*Published on Dev.to / Medium — June 2026*
