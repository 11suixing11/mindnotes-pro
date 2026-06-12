# MindNotes Pro

Local-first whiteboard drawing app. React 18 + TypeScript + Zustand + perfect-freehand + Tailwind CSS + Vite + jsPDF.

## Project Structure

```
src/
├── canvas/              # Canvas drawing utilities
├── components/
│   ├── canvas/          # Canvas component + hooks (renderer, pointer, selection, keyboard, text editor)
│   ├── confirm-modal/   # Confirmation dialogs
│   ├── export-menu/     # PDF/PNG export
│   ├── first-run-guide/ # First-time user guide
│   ├── sidebar/         # Document/folder sidebar
│   ├── toast/           # Toast notifications
│   └── toolbar/         # Tool selection, color picker, brush selector
├── store/
│   ├── slices/          # Zustand slices (canvasElements, docManagement, folderManagement, history, toolSettings, uiState)
│   ├── appStore.ts      # Main store combining all slices
│   ├── saveManager.ts   # Auto-save logic
│   ├── storage.ts       # LocalStorage persistence
│   ├── migration.ts     # Data migration
│   └── types.ts         # TypeScript types
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

## Architecture

- **State**: Zustand store with 6 slices, auto-persisted to localStorage via saveManager
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
