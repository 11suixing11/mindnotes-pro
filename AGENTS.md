# MindNotes Pro

Local-first whiteboard drawing app. React 19 + TypeScript + Zustand + perfect-freehand + Tailwind CSS + Vite + jsPDF.

## Project Structure

```
src/
├── core/                # Pure models, geometry, and arrangement algorithms
├── canvas/              # Canvas rendering, brushes, and export helpers
├── components/
│   ├── app/             # App lifecycle and status UI
│   ├── canvas/          # Canvas component + hooks (renderer, pointer, selection, keyboard, text editor)
│   ├── confirm-modal/   # Confirmation dialogs
│   ├── context-menu/    # Selection and canvas context menus
│   ├── export-menu/     # Visual and JSON import/export
│   ├── layers/          # Layer management panel
│   ├── templates/       # Built-in and custom template UI
│   ├── toast/           # Toast notifications
│   └── toolbar/         # Tool selection, color picker, brush selector
├── eraser/              # Geometric erasing and spatial index
├── keyboard/            # Shortcut definitions and matching
├── store/
│   ├── slices/          # Zustand slices and pure state transforms
│   ├── appStore.ts      # Main store combining all slices
│   ├── saveManager.ts   # Auto-save logic
│   ├── storage.ts       # IndexedDB storage and legacy decoding
│   ├── migration.ts     # Data migration
│   └── types.ts         # TypeScript types
├── templates/           # Template definitions and transforms
└── App.tsx / AppWrapper.tsx / main.tsx
```

## Development Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # tsc + vite build
npm run test         # vitest (watch mode)
npm run test:run     # vitest (single run)
npm run lint         # eslint src --ext .ts,.tsx
```

## Environment Notes

- Run tests with `NODE_ENV=test` on machines where `NODE_ENV=production` is set globally;
  otherwise React loads its production build and every component test fails with
  `React.act is not a function`.
- If the user-level `.npmrc` sets `omit=dev`, install with `npm ci --include=dev`, or the
  dev toolchain (vite, vitest, playwright) will be missing.

## Architecture

- **State**: Zustand store with 5 slices; the canonical board is auto-persisted to IndexedDB via saveManager
- **Drawing**: perfect-freehand for strokes, custom canvas rendering
- **Styling**: Tailwind CSS with custom Monet-inspired color palette
- **Export**: jsPDF for PDF export (dynamically imported)
- **Testing**: Vitest + jsdom + @testing-library/react

## Conventions

- TypeScript strict mode enabled
- No unused locals/parameters (enforced by tsc)
- Component files: PascalCase (e.g., `Canvas.tsx`)
- Hook files: camelCase with `use` prefix (e.g., `useCanvasRenderer.ts`)
- Store slices in `src/store/slices/`
- Test files co-located with source (e.g., `foo.test.ts`)
- Barrel exports via `index.ts` in component directories
