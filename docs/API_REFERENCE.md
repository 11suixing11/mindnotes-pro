# API Reference - MindNotes Pro v1.3.1

## Quick Start Integration

```javascript
// Initialize MindNotes Pro
import MindNotes from '@mindnotes-pro/core'

const app = new MindNotes({
  container: '#app',
  theme: 'auto',
  autoSave: true,
  baseUrl: 'https://11suixing11.github.io/mindnotes-pro/'
})

// Listen for save events
app.on('save', (data) => {
  console.log('Note saved:', data)
})

// Export note
const exported = app.export({ format: 'png' })
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | string | - | CSS selector for app mount point |
| `theme` | string | 'auto' | 'light', 'dark', or 'auto' for system preference |
| `autoSave` | boolean | true | Enable automatic saving to localStorage |
| `baseUrl` | string | '/' | Application base path for GitHub Pages support |
| `debugMode` | boolean | false | Enable debug logging (set via VITE_ENABLE_DEBUG_LOGS) |

## Core Methods

### `app.save(data): Promise<void>`
Explicitly save current note state.

```javascript
await app.save()
```

### `app.export(options): Promise<Blob>`
Export note in specified format (png, svg, pdf, markdown).

```javascript
const blob = await app.export({ 
  format: 'pdf',
  quality: 'high' 
})
```

### `app.loadTemplate(templateName): void`
Load one of the built-in templates.

```javascript
app.loadTemplate('grid') // 'blank', 'grid', 'dots', 'lines', 'planner', 'diary'
```

### `app.undo(): void` / `app.redo(): void`
Navigate undo/redo stack.

## Event Handling

```javascript
// Note events
app.on('save', (data) => {})
app.on('load', (data) => {})
app.on('export', (blob) => {})
app.on('error', (error) => {})

// Update available event
app.on('update-available', () => {
  console.log('New version available!')
  // Show in-app notification
})
```

## Error Handling

```javascript
try {
  await app.export({ format: 'pdf' })
} catch (error) {
  if (error.code === 'EXPORT_FAILED') {
    console.error('Export failed:', error.message)
  }
  if (error.code === 'STORAGE_QUOTA_EXCEEDED') {
    console.error('Browser storage full')
  }
}
```

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Mobile: iOS Safari 14+, Chrome Android 90+

## Performance Tips

1. Use `autoSave: false` for large documents and manually call `save()`
2. Export in chunks for better performance
3. Use PNG/SVG for better browser compatibility
4. Enable Service Worker for offline support (automatic)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+P / Cmd+P | Open command palette |
| Ctrl+S / Cmd+S | Save note |
| Ctrl+Z / Cmd+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+E / Cmd+E | Export note |

## Resources

- GitHub: https://github.com/11suixing11/mindnotes-pro
- Live Demo: https://11suixing11.github.io/mindnotes-pro/
- Issues: https://github.com/11suixing11/mindnotes-pro/issues
