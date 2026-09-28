/**
 * Layer boundary rules mirroring ARCHITECTURE.md.
 * Run via `npm run deps:check` (also part of `npm run check`).
 */
module.exports = {
  forbidden: [
    {
      name: 'core-stays-pure',
      severity: 'error',
      comment: 'src/core must stay dependency-free: no store, UI, rendering, or runtime imports.',
      from: { path: '^src/core/' },
      to: {
        path: [
          '^src/(store|components|canvas|keyboard|templates|eraser|benchmark)/',
          '^src/(App|main|appEvents)\\.tsx?$',
          '^(react|react-dom|zustand)$',
        ],
      },
    },
    {
      name: 'pure-plans-stay-pure',
      severity: 'error',
      comment:
        'Pure plan modules (canvasElement*/document*/historyTransitions/selectionCapabilities, no Actions suffix) must not reach into slice runtimes or the save manager.',
      from: {
        path: '^src/store/slices/(?!.*Actions\\.ts$)(?!canvasElements\\.ts$)(canvasElement|document|historyTransitions|selectionCapabilities)[^/]*\\.ts$',
      },
      to: {
        path: [
          '^src/store/slices/(history|toolSettings|uiState|docManagement|canvasElements)\\.ts$',
          '^src/store/slices/.*Actions\\.ts$',
          '^src/store/saveManager\\.ts$',
        ],
      },
    },
    {
      name: 'action-modules-stay-in-slice',
      severity: 'error',
      comment:
        'canvasElement* Actions modules are wired by canvasElements.ts; cross-slice imports are forbidden.',
      from: { path: '^src/store/slices/.*Actions\\.ts$' },
      to: { path: '^src/store/slices/(toolSettings|history|uiState|docManagement|canvasElements)\\.ts$' },
    },
    {
      name: 'sibling-stores-no-appstore',
      severity: 'error',
      comment:
        'Sibling stores must not import appStore; cross-store coordination uses explicit ports or caller-passed data.',
      from: { path: '^src/store/(useThemeStore|useShortcutStore|useViewStore|toastStore)\\.ts$' },
      to: { path: '^src/store/appStore\\.ts$' },
    },
    {
      name: 'slices-no-direct-save-scheduling',
      severity: 'error',
      comment:
        'Save scheduling is centralized in autoSaveScheduler; slices must not call the save manager. docManagement keeps lifecycle controls (immediate saves, timer clears, hydration guards, rename marking).',
      from: {
        path: '^src/store/slices/',
        pathNot: '^src/store/slices/docManagement\\.ts$',
      },
      to: { path: '^src/store/saveManager\\.ts$' },
    },
    {
      name: 'persistence-only-via-port',
      severity: 'error',
      comment:
        'Application code must talk to persistence through application/ports, never the store-side repository or its IndexedDB implementation.',
      from: {
        path: ['^src/(components|core|canvas|eraser|keyboard|templates)/', '^src/(App|main|appEvents)\\.tsx?$'],
      },
      to: { path: ['^src/store/(documentRepository|indexedDbDocumentRepository)\\.ts$'] },
    },
    {
      name: 'store-no-react',
      severity: 'error',
      comment: 'Store slices must not import React components (ARCHITECTURE.md).',
      from: { path: '^src/store/' },
      to: { path: ['^src/components/', '^src/App\\.tsx?$', '^(react|react-dom)$'] },
    },
    {
      name: 'store-no-canvas',
      severity: 'error',
      comment:
        'store must not import the rendering layer (src/canvas). Waived legacy: brush/text metadata, content-bounds helpers, and the backup SVG sanitizer still live in canvas/.',
      from: {
        path: '^src/store/',
        pathNot: [
          '^src/store/slices/canvasElementStyle\\.ts$',
          '^src/store/slices/history\\.ts$',
          '^src/store/slices/toolSettings\\.ts$',
          '^src/store/backup\\.ts$',
        ],
      },
      to: { path: '^src/canvas/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: ['\\.test\\.(ts|tsx)$', '\\.d\\.ts$'],
    tsConfig: { fileName: 'tsconfig.json' },
  },
}
