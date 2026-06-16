# How I Built a Zero-Cloud Whiteboard with Only 3 Dependencies

_A deep dive into building MindNotes Pro — a local-first, privacy-respecting whiteboard app that runs entirely in your browser with just three runtime dependencies._

---

## 1. Why Build a Local-Cloud Whiteboard?

Every whiteboard app I tried had the same problem: **my drawings lived on someone else's server.** Miro, Excalidraw, FigJam — they all require an account, an internet connection, and a willingness to hand your brainstorming sessions to a third party.

I wanted something different. A canvas app that:

- **Works offline** — on a plane, in a café with bad Wi-Fi, anywhere
- **Never phones home** — zero network requests, zero telemetry
- **Starts instantly** — no loading spinners, no auth flows
- **Feels as good as paper** — pressure-sensitive strokes, multiple brush types

The result is **MindNotes Pro**, a Progressive Web App built with React 18, TypeScript, and a total of **3 runtime dependencies**. Yes, three. Let me explain how.

---

## 2. Architecture Decisions: React + Zustand + Canvas API

The stack was chosen with intentionality:

- **React 18** for the component layer (toolbar, sidebar, modals)
- **HTML5 Canvas API** for the drawing surface — no SVG overhead, no DOM pollution for thousands of stroke points
- **Zustand** for state management — tiny, no boilerplate, perfect for slices
- **Vite** as the build tool — sub-second HMR, native ESM, dead-simple config
- **Tailwind CSS** for styling — utility-first, zero runtime CSS-in-JS

The key architectural insight was **separating the React component tree from the canvas rendering loop.** React manages the toolbar, sidebar, and UI chrome. The `<canvas>` element is a first-class citizen with its own pointer event engine, rendering pipeline, and coordinate system.

```tsx
// The canvas is a "dumb" element — React owns the DOM node,
// but all drawing logic lives in custom hooks.
<canvas
  ref={canvasRef}
  className="absolute inset-0 w-full h-full"
  style={{ touchAction: 'none' }}
/>
```

The canvas doesn't re-render on state changes. Instead, it uses a `scheduleRedraw()` callback pattern — a `requestAnimationFrame`-gated function that batches state reads and redraws the entire canvas when needed.

---

## 3. The 3-Dependency Challenge

Here's the entire `dependencies` section of `package.json`:

```json
{
  "dependencies": {
    "jspdf": "^4.2.1",
    "perfect-freehand": "^1.2.3",
    "zustand": "^4.5.0"
  }
}
```

That's it. No lodash. No date-fns. No UUID library. No form library. Let's talk about each one.

### perfect-freehand (1.2 KB gzipped)

This library by Steve Ruiz takes an array of input points and returns an outline polygon that simulates a natural pen stroke with pressure variation. It's the secret sauce behind every handwriting app you've used, and it's tiny.

### Zustand (1.1 KB gzipped)

The lightest serious state management library for React. No context providers, no reducers, no action creators. Just a store with getters and setters. We use its slice pattern to split the store into 6 logical domains.

### jsPDF (280 KB gzipped)

The only "large" dependency, and it's lazy-loaded. jsPDF handles PDF export — a feature users expect but don't need on first paint. We dynamically import it only when the user clicks "Export PDF."

The philosophy: **if you can write it yourself in <100 lines, don't add a dependency.** UUID? `crypto.randomUUID()`. Date formatting? `Intl.DateTimeFormat`. Deep clone? `structuredClone()`. The browser has evolved — use it.

---

## 4. Drawing Engine Design: Strokes with perfect-freehand

The drawing engine lives in `canvasDrawing.ts` and handles six different brush types. The `pen` brush is the most interesting because it layers two rendering passes:

```ts
import getStroke from 'perfect-freehand'

export function drawStrokeEl(
  ctx: CanvasRenderingContext2D,
  el: StrokeElement,
  isDarkMode: boolean
) {
  if (el.points.length < 2) return
  const pts = el.points

  if (el.brush === 'pen') {
    // Pass 1: Smooth quadratic curve (fast, always works)
    ctx.beginPath()
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i]
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2)
    }
    ctx.stroke()

    // Pass 2: perfect-freehand pressure outline (soft overlay)
    try {
      const outline = getStroke(pts, {
        size: el.size,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      })
      if (outline.length > 2) {
        ctx.globalAlpha = 0.15
        ctx.fillStyle = el.color
        ctx.beginPath()
        ctx.moveTo(outline[0][0], outline[0][1])
        for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1])
        ctx.closePath()
        ctx.fill()
      }
    } catch {
      /* fallback — main stroke already drawn */
    }
    ctx.globalAlpha = 1
  }
}
```

**Why two passes?** The quadratic curve gives a clean, fast line. The perfect-freehand outline adds a subtle pressure-varying fill at 15% opacity, creating a natural pen feel. If perfect-freehand fails (e.g., degenerate input), the stroke still renders correctly — graceful degradation.

Other brushes have their own tricks:

- **Calligraphy**: varies line width using `Math.sin(atan2(...))` to simulate a nib angle
- **Pencil**: adds deterministic jitter using a prime-number hash for a sketchy feel
- **Glow**: layers two strokes with canvas `shadowBlur` for a neon effect
- **Highlighter**: wide, semi-transparent strokes with `globalAlpha = 0.3`

The type system ensures every brush variant is type-safe:

```ts
export type BrushType = 'pen' | 'highlighter' | 'pencil' | 'calligraphy' | 'dashed' | 'glow'
export type ShapeKind = 'rectangle' | 'circle' | 'line' | 'arrow'
export type ToolType = 'select' | 'pen' | 'eraser' | 'pan' | 'text' | ShapeKind

export interface StrokeElement {
  type: 'stroke'
  id: string
  points: number[][]
  color: string
  size: number
  brush: BrushType
  opacity?: number
}

export type CanvasElement = StrokeElement | ShapeElement | TextElement | ImageElement
```

---

## 5. State Management with Zustand Slices

The store is split into 6 slices, each managing a single domain:

```ts
export const useAppStore = create<AppState & AppActions>((set, get) => {
  const storeApi = { getState: get, setState: set }
  initSaveManager(storeApi)

  return {
    ...createToolSettingsSlice(set, get), // tool, color, size, brush
    ...createCanvasElementsSlice(set, get), // elements array, add/remove/move
    ...createHistorySlice(set, get), // undo/redo stacks
    ...createDocManagementSlice(set, get), // document CRUD
    ...createFolderManagementSlice(set, get), // folder hierarchy
    ...createUISlice(set, get), // sidebar open, modals, etc.
  }
})
```

Each slice is a function that returns state + actions. Here's the tool settings slice as an example:

```ts
export function createToolSettingsSlice(set, get): ToolSettingsState & ToolSettingsActions {
  return {
    tool: 'pen',
    brush: 'pen',
    color: '#2c2416',
    fillColor: 'transparent',
    size: 4,
    bgColor: '#ffffff',
    colorHistory: [],

    setTool: (t) => set({ tool: t }),
    setBrush: (b) => set({ brush: b }),
    setColor: (c) => {
      set({ color: c })
      get().addColorToHistory(c)
    },
    setSize: (s) => set({ size: s }),
    setBgColor: (c) => {
      set({ bgColor: c })
      scheduleSave() // background color changes persist immediately
    },
    addColorToHistory: (c) => {
      const current = get().colorHistory
      const filtered = current.filter((h) => h !== c)
      set({ colorHistory: [c, ...filtered].slice(0, 5) })
    },
  }
}
```

**Performance tip**: The pointer engine uses `useShallow` to avoid re-renders when unrelated state changes:

```ts
const { addElement, removeElement, moveElementById } = useAppStore(
  useShallow((s) => ({
    addElement: s.addElement,
    removeElement: s.removeElement,
    moveElementById: s.moveElementById,
  }))
)
```

Since the canvas never re-renders on state changes (it's imperatively redrawn), we also use refs to cache current values for use inside event handlers — a pattern that avoids stale closures without re-registering listeners:

```ts
const toolRef = useRef(tool)
useEffect(() => {
  toolRef.current = tool
}, [tool])
```

---

## 6. Local-First Data Persistence

MindNotes Pro uses a **two-tier storage strategy**:

### localStorage — Session State

Small, frequently-accessed data (theme preference, sidebar state) goes into localStorage with XOR encryption:

```ts
export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value)
    const encryptedData = encryptData(serialized)
    localStorage.setItem(key, encryptedData)
    return true
  } catch (e) {
    console.error(`[storage] Failed to save for key "${key}":`, e)
    return false
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const encryptedData = localStorage.getItem(key)
    if (encryptedData === null) return defaultValue
    const decryptedData = decryptData(encryptedData)
    return JSON.parse(decryptedData) as T
  } catch (e) {
    return defaultValue // graceful fallback on corrupted data
  }
}
```

### IndexedDB — Document Storage

Documents (which can be large — thousands of stroke points) are stored in IndexedDB with a versioned migration system:

```ts
const DB_NAME = 'mindnotes-pro'
const DB_VERSION = 2

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = req.result
      const tx = req.transaction
      for (let v = e.oldVersion + 1; v <= DB_VERSION; v++) {
        const migrate = migrations[v]
        if (migrate) migrate(db, tx)
      }
    }
    req.onsuccess = () => {
      _db = req.result
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}
```

### Auto-Save with Debouncing

The save manager uses a 1.5-second debounce to avoid thrashing IndexedDB on every stroke:

```ts
const SAVE_DELAY = 1500

export function scheduleSave(): void {
  if (!_storeRef) return
  clearSaveTimer()
  _storeRef.setState({ saveStatus: 'saving' })
  _saveTimer = setTimeout(() => {
    saveDocNow()
  }, SAVE_DELAY)
}
```

The UI shows a subtle "Saving..." → "Saved ✓" status indicator, so users know their work is safe without being distracted.

---

## 7. PWA Offline Support

The service worker (`sw.js`) implements a **three-strategy routing system**:

```js
// Strategy 1: API requests → Network-first
if (isApiRequest(url)) {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, response.clone()))
        return response
      })
      .catch(() => caches.match(event.request))
  )
  return
}

// Strategy 2: Static assets → Stale-while-revalidate
if (isStaticAsset(url)) {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          caches
            .open(STATIC_CACHE)
            .then((cache) => cache.put(event.request, networkResponse.clone()))
          return networkResponse
        })
        .catch(() => null)
      return cachedResponse || fetchPromise
    })
  )
  return
}

// Strategy 3: Everything else → Network with runtime cache fallback
event.respondWith(
  fetch(event.request)
    .then((response) => {
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, response.clone()))
      return response
    })
    .catch(() => caches.match(event.request))
)
```

On install, the service worker precaches the app shell (HTML, manifest, icons). On activate, it cleans up old cache versions and notifies all clients via `postMessage` that an update is available.

The result: **MindNotes Pro works completely offline after the first visit.** All data is local. All rendering is local. The only thing the network provides is the initial app bundle.

---

## 8. Monet-Inspired Design System

The visual design draws from Claude Monet's impressionist palette — soft lavenders, muted teals, warm ochres. The canvas background isn't flat white; it's a layered composition of radial gradients:

```ts
export function drawCanvasBackground(ctx, canvasSize, bgColor, isDarkMode) {
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

  // Layer 1: Soft lavender wash (top-left)
  const g1 = ctx.createRadialGradient(
    canvasSize.w * 0.12,
    canvasSize.h * 0.18,
    0,
    canvasSize.w * 0.12,
    canvasSize.h * 0.18,
    canvasSize.w * 0.55
  )
  g1.addColorStop(0, 'rgba(184, 160, 208, 0.16)')
  g1.addColorStop(0.5, 'rgba(184, 160, 208, 0.05)')
  g1.addColorStop(1, 'transparent')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

  // Layer 2: Cool teal mist (bottom-right)
  // Layer 3: Warm golden glow (center)
  // Layer 4: Rose accent (upper-right)
  // ... each adds a subtle colored gradient
}
```

The dot grid also uses Monet-inspired colors — warm gray-brown in light mode, cool purple-gray in dark mode — with `Path2D` caching for performance:

```ts
if (paramsChanged || !cachedMonetGridPath) {
  const path = new Path2D()
  for (let x = sx; x <= ex; x += gs) {
    for (let y = sy; y <= ey; y += gs) {
      path.moveTo(x + dotSize, y)
      path.arc(x, y, dotSize, 0, Math.PI * 2)
    }
  }
  cachedMonetGridPath = path
  cachedMonetGridParams = currentParams
}
ctx.fill(cachedMonetGridPath) // single draw call for entire grid
```

Tailwind CSS handles the UI chrome with a custom color palette that extends the Monet theme into buttons, toolbars, and modals.

---

## 9. Performance Optimizations

### Lazy Loading jsPDF

jsPDF is 280KB gzipped. We never load it until the user explicitly requests a PDF export:

```ts
// Dynamic import — only loads when "Export PDF" is clicked
const { jsPDF } = await import('jspdf')
```

This keeps the initial bundle lean and the first meaningful paint fast.

### Canvas Rendering Pipeline

- **`requestAnimationFrame` gating**: Multiple state changes within a single frame are batched into one redraw
- **`Path2D` caching**: The dot grid is pre-built into a `Path2D` object and only regenerated when the viewport parameters change
- **Ref-based value access**: Event handlers read current values from refs instead of triggering re-renders
- **Bounds caching**: Element bounding boxes are computed once and invalidated only when elements change

### Eraser with Stroke Splitting

The eraser doesn't just delete — it **splits strokes** at the erase point, preserving the untouched segments:

```ts
const eraseAt = useCallback((x: number, y: number) => {
  const r = sizeRef.current * 2 + 10,
    r2 = r * r
  for (const el of state.elements) {
    if (el.type === 'stroke') {
      const segments: number[][][] = []
      let cur: number[][] = []
      for (const p of el.points) {
        if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < r2) {
          if (cur.length >= 2) segments.push(cur)
          cur = []
        } else cur.push(p)
      }
      if (cur.length >= 2) segments.push(cur)
      if (segments.length > 0 || cur.length >= 2) {
        removeElement(el.id)
        for (const seg of segments)
          addElement({
            ...el,
            id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            points: seg,
          })
      }
    }
  }
}, [])
```

This feels much more natural than a binary delete-or-keep approach.

---

## 10. Lessons Learned and What's Next

### What I Learned

1. **The browser is more capable than you think.** `structuredClone`, `crypto.randomUUID`, `Intl.DateTimeFormat`, `IndexedDB` — the platform has solved most problems we used to need libraries for.

2. **Canvas + React is a powerful hybrid.** React manages the UI shell; the canvas owns the drawing surface. The boundary is clean and each side plays to its strengths.

3. **Fewer dependencies = fewer surprises.** With 3 runtime deps, there are no version conflicts, no security audit fatigue, and no "leftpad" moments. The dependency tree is shallow and stable.

4. **Local-first is a feature, not a limitation.** Users don't care where the bytes live. They care that the app opens instantly, never loses their work, and works on a plane.

5. **Graceful degradation matters.** Every rendering function has a fallback. If perfect-freehand fails, the stroke still renders. If IndexedDB is blocked, we fall back to localStorage. If decryption fails, we treat data as plaintext.

### What's Next

- **Collaborative editing** via WebRTC — still local-first, but with optional peer-to-peer sync
- **Stylus pressure support** using the Pointer Events API's `pressure` property
- **Custom fonts** for the text tool
- **Infinite canvas** with virtualized rendering for very large documents
- **Plugin system** for custom brushes and export formats

---

## Try It Yourself

MindNotes Pro is open source and runs entirely in your browser. No account required. No data leaves your machine.

**→ [Launch MindNotes Pro](https://11suixing11.github.io/mindnotes-pro)**

Or clone and run locally:

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

Open `http://localhost:3000` and start drawing. Your work auto-saves to your browser — no cloud, no cookies, no tracking.

If you find it useful, ⭐ the repo and share it with someone who values privacy in their creative tools.

---

_MindNotes Pro is built with React 18, TypeScript, Zustand, perfect-freehand, Tailwind CSS, Vite, and jsPDF. Total runtime dependency count: 3. Total cloud dependency count: 0._
