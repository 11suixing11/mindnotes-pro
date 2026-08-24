import { sanitizeSvgDataUrl } from '../../canvas/svgSanitizer'
import {
  DEFAULT_TEXT_FONT_SIZE,
  getTextLayout,
  normalizeTextFormat,
} from '../../canvas/textFormatting'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'

export function getViewportCenter(): { x: number; y: number } {
  const viewBox = useViewStore.getState().viewBox
  return {
    x: viewBox.x + window.innerWidth / 2 / viewBox.zoom,
    y: viewBox.y + window.innerHeight / 2 / viewBox.zoom,
  }
}

export function pastePlainTextAtViewportCenter(text: string): void {
  if (!text || text.trim().length === 0) return

  const store = useAppStore.getState()
  const center = getViewportCenter()
  const format = normalizeTextFormat({ color: '#1a1a1a', fontSize: DEFAULT_TEXT_FONT_SIZE })
  const layout = getTextLayout(text, format, { autoResize: true, maxWidth: 600 })

  store.addElement({
    type: 'text',
    id: `text-${Date.now()}`,
    x: center.x - layout.width / 2,
    y: center.y - layout.height / 2,
    width: layout.width,
    height: layout.height,
    content: layout.renderedContent,
    originalContent: layout.originalContent,
    autoResize: true,
    fontSize: format.fontSize,
    color: format.color,
  })
}

export function pasteImageAtViewportCenter(dataUrl: string): void {
  const safeDataUrl = sanitizeSvgDataUrl(dataUrl)
  const image = new Image()
  image.onload = () => {
    const store = useAppStore.getState()
    const center = getViewportCenter()
    const maxDimension = 400
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const width = Math.round(image.width * scale)
    const height = Math.round(image.height * scale)
    store.addElement({
      type: 'image',
      id: `img-${Date.now()}`,
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      dataUrl: safeDataUrl,
    })
  }
  image.src = safeDataUrl
}

export async function pasteClipboardImageOrCanvasSelection(): Promise<void> {
  const store = useAppStore.getState()
  const readClipboard = navigator.clipboard?.read?.bind(navigator.clipboard)
  if (!readClipboard) {
    store.paste()
    return
  }

  try {
    const items = await readClipboard()
    for (const item of items) {
      for (const type of item.types) {
        if (!type.startsWith('image/')) continue

        const blob = await item.getType(type)
        const reader = new FileReader()
        reader.onload = () => pasteImageAtViewportCenter(reader.result as string)
        reader.readAsDataURL(blob)
        return
      }
    }
    store.paste()
  } catch {
    store.paste()
  }
}
