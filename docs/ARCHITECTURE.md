# MindNotes Pro — Architecture

> Detailed system architecture, design patterns, and data flow documentation.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Zustand Slice Pattern](#zustand-slice-pattern)
- [Canvas Rendering Pipeline](#canvas-rendering-pipeline)
- [Data Flow](#data-flow)
- [Storage Layer](#storage-layer)
- [Brush Engine](#brush-engine)
- [Performance Architecture](#performance-architecture)
- [Testing Architecture](#testing-architecture)

---

## Overview

MindNotes Pro is a local-first whiteboard application built with a minimal dependency philosophy. The entire runtime consists of only 3 core dependencies:

| Dependency | Version | Size | Purpose |
|---|---|---|---|
| React | 18.x | ~42kB gzip | UI framework |
| Zustand | 4.x | ~1.1kB gzip | State management |
| perfect-freehand | 1.x | ~2.5kB gzip | Pressure-sensitive stroke rendering |

All other functionality — canvas rendering, PDF export, document management, keyboard shortcuts, hit testing, selection logic — is implemented from scratch.

### High-Level Architecture

`mermaid
graph TB
    subgraph "Browser"
        UI["React UI Layer"]
        Store["Zustand Store"]
        Canvas["Canvas 2D Engine"]
        Storage["IndexedDB + Encrypted localStorage"]
    end

    subgraph "User Interaction"
        Pointer["Pointer Events"]
        Keyboard["Keyboard Shortcuts"]
        Touch["Touch / Stylus"]
    end

    Pointer --> UI
    Keyboard --> UI
    Touch --> UI
    UI --> Store
    Store --> Canvas
    Store --> Storage
    Canvas --> UI
`

---

## Zustand Slice Pattern

The application state is organized into 6 independent slices, each responsible for a single domain. This pattern provides separation of concerns while maintaining a unified store interface.

### Slice Architecture

`mermaid
graph LR
    subgraph "useAppStore"
        direction TB
        TS["toolSettings<br/>activeTool, color, size, brush"]
        CE["canvasElements<br/>elements, selectedIds"]
        HI["history<br/>undoStack, redoStack"]
        DM["docManagement<br/>docs, currentDocId"]
        FM["folderManagement<br/>folders, folderTree"]
        UI_SLICE["uiState<br/>sidebar, modals, toasts"]
    end

    TS --> |"set, get"| AppStore["AppStore"]
    CE --> |"set, get"| AppStore
    HI --> |"set, get"| AppStore
    DM --> |"set, get"| AppStore
    FM --> |"set, get"| AppStore
    UI_SLICE --> |"set, get"| AppStore
`

### Slice Details

#### 	oolSettings — Tool Configuration
`
State:
  - activeTool: 'select' | 'pen' | 'eraser' | 'pan' | 'text' | ShapeKind
  - color: string (hex color)
  - size: number (stroke width)
  - brush: BrushType
  - showGrid: boolean
  - showRulers: boolean

Actions:
  - setActiveTool(tool)
  - setColor(color)
  - setSize(size)
  - setBrush(brush)
  - toggleGrid()
  - toggleRulers()
`

#### canvasElements — Drawing Elements
`
State:
  - elements: CanvasElement[]
  - selectedIds: string[]
  - editingTextId: string | null

Actions:
  - addElement(el)
  - removeElements(ids)
  - updateElement(id, changes)
  - moveElements(ids, dx, dy)
  - resizeElement(id, anchor, sx, sy)
  - setElements(els)
  - clearCanvas()
  - setSelectedIds(ids)
  - setEditingTextId(id)
`

#### history — Undo/Redo
`
State:
  - undoStack: UndoAction[]
  - redoStack: UndoAction[]

Actions:
  - pushUndo(action)
  - undo()
  - redo()
  - clearHistory()
`

#### docManagement — Document CRUD
`
State:
  - docs: CanvasDoc[]
  - currentDocId: string | null
  - saveStatus: 'idle' | 'saving' | 'saved'

Actions:
  - createDoc(folderId?)
  - deleteDoc(id)
  - renameDoc(id, title)
  - switchDoc(id)
  - loadDocs()
`

#### olderManagement — Folder Hierarchy
`
State:
  - folders: CanvasFolder[]

Actions:
  - createFolder(name, parentId?)
  - deleteFolder(id)
  - renameFolder(id, name)
  - moveFolder(id, parentId)
  - toggleFolder(id)
`

#### uiState — UI Controls
`
State:
  - sidebarOpen: boolean
  - showExportMenu: boolean
  - confirmModal: ConfirmModalState | null

Actions:
  - toggleSidebar()
  - setShowExportMenu(show)
  - setConfirmModal(modal)
  - clearConfirmModal()
`

### Type Composition

The final store type is composed using intersection types:

`	ypescript
type AppState = ToolSettingsState & CanvasElementsState & HistoryState
              & DocManagementState & FolderManagementState & UIState

type AppActions = ToolSettingsActions & CanvasElementsActions & HistoryActions
               & DocManagementActions & FolderManagementActions & UIActions

type AppStore = AppState & AppActions
`

---

## Canvas Rendering Pipeline

The canvas rendering system uses a **dual-canvas architecture** for performance optimization.

### Rendering Architecture

`mermaid
graph TD
    subgraph "Rendering Pipeline"
        RAF["requestAnimationFrame Loop"]
        BG["Background Layer<br/>(gradient + grid)"]
        EC["Elements Canvas<br/>(offscreen cache)"]
        TL["Transient Layer<br/>(current stroke, selection)"]
        UI_L["UI Overlay<br/>(minimap, zoom)"]
    end

    RAF --> BG
    BG --> EC
    EC --> TL
    TL --> UI_L

    subgraph "Cache Management"
        Dirty["Dirty Flag"]
        Subscribe["Zustand subscribe()"]
        BoundsCache["Bounds Cache Map"]
    end

    Subscribe -->|"elements changed"| Dirty
    Dirty -->|"invalidate"| EC
    Dirty -->|"clear"| BoundsCache
`

### Dual-Canvas Strategy

1. **Offscreen Elements Canvas** (elementsCanvasRef)
   - Renders all persistent elements (strokes, shapes, text, images)
   - Only redraws when the elements array changes (tracked via dirty flag)
   - Stored as an offscreen <canvas> element

2. **Main Canvas** (visible <canvas>)
   - Draws background
   - Composites the offscreen elements canvas
   - Paints transient UI: current stroke, selection boxes, eraser cursor, snap lines
   - Draws overlay UI: minimap, zoom level indicator

### Render Loop

`
┌─────────────────────────────────────────────────────┐
│                   requestAnimationFrame              │
│                                                      │
│  1. Clear main canvas                                │
│  2. Draw background (gradient based on bgColor)      │
│  3. Check dirty flag:                                │
│     ├─ If dirty → re-render elements to offscreen    │
│     └─ If clean → reuse cached offscreen canvas      │
│  4. Composite offscreen → main canvas                │
│  5. Draw transient layer:                            │
│     ├─ Current freehand stroke (if drawing)          │
│     ├─ Current shape (if shape tool active)          │
│     ├─ Eraser cursor (if eraser tool)                │
│     ├─ Marquee selection (if selecting)              │
│     └─ Snap alignment guides                         │
│  6. Draw overlay:                                    │
│     ├─ Minimap                                       │
│     └─ Zoom level percentage                         │
└─────────────────────────────────────────────────────┘
`

### Viewport Culling

Only elements visible in the current viewport are drawn:

`	ypescript
const vl = viewBox.x           // view left
const vt = viewBox.y           // view top
const vw = canvasSize.w / zoom // view width in canvas coords
const vh = canvasSize.h / zoom // view height in canvas coords

for (const el of elements) {
  if (!isVisibleInView(el, vl, vt, vw, vh)) continue
  drawElement(ctx, el, isDarkMode)
}
`

### DPR Handling

High-DPI displays are handled by scaling the canvas buffer:

`	ypescript
const dpr = window.devicePixelRatio || 1
canvas.width = cssWidth * dpr
canvas.height = cssHeight * dpr
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
`

---

## Data Flow

### Drawing Flow

`mermaid
sequenceDiagram
    participant U as User
    participant PE as Pointer Engine
    participant Store as Zustand Store
    participant SM as Save Manager
    participant IDB as IndexedDB
    participant CR as Canvas Renderer

    U->>PE: pointerdown
    PE->>PE: Start stroke recording
    U->>PE: pointermove (multiple)
    PE->>CR: scheduleRedraw()
    CR->>CR: Draw current stroke (transient)
    U->>PE: pointerup
    PE->>Store: addElement(stroke)
    Store->>Store: Update elements array
    Store->>CR: subscribe triggers redraw
    CR->>CR: Mark elementsDirty = true
    CR->>CR: Re-render offscreen canvas
    Store->>SM: scheduleSave()
    SM->>SM: Debounce 1.5s
    SM->>IDB: put('docs', document)
`

### Document Switch Flow

`mermaid
sequenceDiagram
    participant U as User
    participant SB as Sidebar
    participant Store as Zustand Store
    participant SM as Save Manager
    participant IDB as IndexedDB

    U->>SB: Click document
    SB->>SM: saveDocNow()
    SM->>IDB: Save current document
    SM->>Store: Update docs list
    SB->>Store: switchDoc(newId)
    Store->>IDB: get('docs', newId)
    IDB->>Store: Load elements, undo/redo stacks
    Store->>Store: Set elements, bgColor, history
`

### Undo/Redo Flow

`mermaid
sequenceDiagram
    participant U as User
    participant Store as Zustand Store
    participant HI as History Slice
    participant CE as Canvas Elements

    U->>Store: Perform action (e.g., delete elements)
    Store->>HI: pushUndo({ type: 'remove', items: [...] })
    Store->>CE: Remove elements from state
    U->>Store: Ctrl+Z (undo)
    Store->>HI: pop from undoStack
    HI->>CE: Restore deleted elements
    HI->>HI: Push to redoStack
    U->>Store: Ctrl+Shift+Z (redo)
    Store->>HI: pop from redoStack
    HI->>CE: Re-delete elements
    HI->>HI: Push back to undoStack
`

---

## Storage Layer

### IndexedDB Schema

`mermaid
erDiagram
    IDB_Database {
        string name "mindnotes-pro"
        int version "2"
    }

    docs_store {
        string id PK "UUID"
        string title "Document title"
        array elements "CanvasElement[]"
        string bgColor "Background color hex"
        string folderId FK "Parent folder ID or null"
        number createdAt "Unix timestamp"
        number updatedAt "Unix timestamp"
        array undoStack "UndoAction[]"
        array redoStack "UndoAction[]"
    }

    folders_store {
        string id PK "UUID"
        string name "Folder name"
        string parentId FK "Parent folder ID or null"
        number order "Sort order"
        boolean expanded "UI state"
    }

    IDB_Database ||--o{ docs_store : contains
    IDB_Database ||--o{ folders_store : contains
    docs_store }o--|| folder_folder : "belongs to"
`

### Save Manager

The save manager uses an **imperative** pattern rather than reactive subscriptions:

`
scheduleSave() → clearTimeout existing → set saveStatus='saving'
               → setTimeout 1.5s → saveDocNow()

saveDocNow()   → Read current state from store
               → Merge with existing document metadata
               → Write to IndexedDB
               → Update docs list in store
               → Set saveStatus='saved'
               → Reset to 'idle' after 2s
`

### Encryption

Data at rest is encrypted using XOR + Base64:

`
Plaintext → JSON.stringify → XOR encrypt → Base64 encode → Store
Retrieve  → Base64 decode  → XOR decrypt → JSON.parse    → Use
`

This provides obfuscation against casual inspection (DevTools), not cryptographic security.

---

## Brush Engine

### Supported Brush Types

`mermaid
graph TD
    BT["Brush Type Router"]
    BT --> PEN["Pen<br/>Quadratic curve + perfect-freehand fill"]
    BT --> HIGHLIGHTER["Highlighter<br/>Wide semi-transparent stroke"]
    BT --> PENCIL["Pencil<br/>Jittered line segments"]
    BT --> CALLIGRAPHY["Calligraphy<br/>Variable-width angle-based"]
    BT --> DASHED["Dashed<br/>Configurable dash/gap"]
    BT --> GLOW["Glow<br/>Shadow-blur neon effect"]

    PEN --> |"primary stroke"| QC["Quadratic Curve"]
    PEN --> |"pressure fill"| PF["perfect-freehand outline"]
`

### Pen Brush Rendering

The pen brush combines two rendering passes:

1. **Primary stroke**: Quadratic curve smoothing through control points
2. **Pressure fill**: perfect-freehand generated outline at 15% opacity

This creates a natural ink-like appearance that's more organic than a pure vector line but more performant than full pressure simulation.

### Monet Background Rendering

The canvas background uses layered radial gradients to create a watercolor wash effect:

- **Light mode**: Lavender (top-left), sage (bottom-right), warm gold (center)
- **Dark mode**: Deep plum (top-left), dusty blue (bottom-right), muted gold (center)

Each gradient uses 2-3 color stops at very low opacity (4-16%), creating a subtle but living background.

---

## Performance Architecture

### Optimization Strategies

| Strategy | Implementation | Impact |
|---|---|---|
| Offscreen canvas cache | Dirty flag + offscreen <canvas> | Avoids re-rendering static elements |
| Bounds cache | Map<string, Bounds> invalidated on change | Avoids recalculating element bounds |
| Viewport culling | AABB intersection test | Skips off-screen elements |
| Debounced saves | 1.5s delay via setTimeout | Reduces IndexedDB writes |
| Dynamic imports | jsPDF loaded on export only | Smaller initial bundle |
| ResizeObserver | Canvas size tracking | No window resize event overhead |
| RAF batching | equestAnimationFrame for all redraws | Smooth 60fps rendering |

### Memory Management

- Bounds cache is cleared entirely when elements change
- Offscreen canvas is reused (not recreated) between redraws
- Stroke points are stored as 
umber[][] (flat arrays, not objects)
- Undo history uses action-based deltas, not full snapshots

---

## Testing Architecture

`
src/
├── canvas/
│   ├── canvasDrawing.test.ts    # Drawing function unit tests
│   └── canvasUtils.test.ts      # Utility function tests
├── components/
│   └── canvas/
│       ├── Canvas.test.tsx       # Component integration tests
│       ├── useCanvasRenderer.test.ts
│       ├── useKeyboardBindings.test.ts
│       ├── usePointerEngine.test.ts
│       ├── useSelectionEngine.test.ts
│       └── useTextEditor.test.ts
└── store/
    ├── appStore.test.ts          # Store integration tests
    ├── storage.test.ts           # Storage layer tests
    ├── toastStore.test.ts
    ├── types.test.ts
    ├── useThemeStore.test.ts
    └── useViewStore.test.ts
`

Tests use **Vitest** with **jsdom** environment and **@testing-library/react** for component tests.

### Test Coverage Priorities

1. **Store slices** — State transitions and action logic
2. **Canvas utilities** — Bounds calculation, hit testing, coordinate transforms
3. **Custom hooks** — Pointer engine, selection engine, keyboard bindings
4. **Drawing functions** — Element rendering, brush algorithms

---

## File Structure

`
src/
├── canvas/                        # Canvas drawing utilities
│   ├── canvasDrawing.ts           # Element rendering, backgrounds, minimap
│   ├── canvasDrawing.test.ts
│   ├── canvasUtils.ts             # Bounds, hit testing, coordinate math
│   └── canvasUtils.test.ts
├── components/
│   ├── canvas/                    # Canvas component + hooks
│   │   ├── Canvas.tsx             # Main canvas component
│   │   ├── useCanvasRenderer.ts   # Dual-canvas rendering pipeline
│   │   ├── usePointerEngine.ts    # Pointer event handling
│   │   ├── useSelectionEngine.ts  # Selection, move, resize
│   │   ├── useKeyboardBindings.ts # Keyboard shortcuts
│   │   └── useTextEditor.ts       # Inline text editing
│   ├── confirm-modal/             # Confirmation dialogs
│   ├── export-menu/               # PDF/PNG export
│   ├── first-run-guide/           # Onboarding guide
│   ├── sidebar/                   # Document/folder sidebar
│   ├── toast/                     # Toast notifications
│   └── toolbar/                   # Tool selection UI
├── store/
│   ├── slices/                    # Zustand state slices
│   │   ├── canvasElements.ts      # Drawing elements
│   │   ├── docManagement.ts       # Document CRUD
│   │   ├── folderManagement.ts    # Folder hierarchy
│   │   ├── history.ts             # Undo/redo
│   │   ├── toolSettings.ts        # Active tool configuration
│   │   └── uiState.ts             # UI state
│   ├── appStore.ts                # Store composition
│   ├── saveManager.ts             # Auto-save logic
│   ├── storage.ts                 # IndexedDB + encryption
│   ├── migration.ts               # Data migration
│   └── types.ts                   # TypeScript types
├── App.tsx                        # Root component
├── AppWrapper.tsx                 # Theme/provider wrapper
└── main.tsx                       # Entry point
`

---

*Last updated: 2026-06-12*
