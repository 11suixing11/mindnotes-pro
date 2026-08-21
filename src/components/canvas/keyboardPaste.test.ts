import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import {
  getViewportCenter,
  pasteClipboardImageOrCanvasSelection,
  pasteImageAtViewportCenter,
  pastePlainTextAtViewportCenter,
} from './keyboardPaste'

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function setClipboard(value: Clipboard | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value,
  })
}

describe('keyboard paste helpers', () => {
  beforeEach(() => {
    useAppStore.setState({
      elements: [],
      selectedIds: [],
      undoStack: [],
      redoStack: [],
      clipboard: [],
    })
    useViewStore.setState({ viewBox: { x: 100, y: 50, zoom: 2 } })
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard)
    } else {
      delete (navigator as { clipboard?: Clipboard }).clipboard
    }
  })

  it('projects the browser viewport center into canvas coordinates', () => {
    expect(getViewportCenter()).toEqual({ x: 400, y: 250 })
  })

  it('adds non-empty plain text at the viewport center', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123)

    pastePlainTextAtViewportCenter('hello\nworld')

    expect(useAppStore.getState().elements).toEqual([
      expect.objectContaining({
        type: 'text',
        id: 'text-123',
        x: 350,
        y: 219.5,
        width: 100,
        height: 61,
        content: 'hello\nworld',
        fontSize: 16,
        color: '#1a1a1a',
      }),
    ])
  })

  it('ignores empty plain-text clipboard content', () => {
    pastePlainTextAtViewportCenter('  \n ')

    expect(useAppStore.getState().elements).toEqual([])
  })

  it('sanitizes and scales pasted images to a 400px maximum dimension', () => {
    vi.spyOn(Date, 'now').mockReturnValue(456)

    class MockImage {
      width = 800
      height = 200
      onload: (() => void) | null = null
      private value = ''

      set src(nextValue: string) {
        this.value = nextValue
        this.onload?.()
      }

      get src(): string {
        return this.value
      }
    }

    vi.stubGlobal('Image', MockImage)
    pasteImageAtViewportCenter(
      `data:image/svg+xml,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10" /></svg>'
      )}`
    )

    const [element] = useAppStore.getState().elements
    expect(element).toMatchObject({
      type: 'image',
      id: 'img-456',
      x: 200,
      y: 200,
      width: 400,
      height: 100,
    })
    if (element.type !== 'image') return
    expect(decodeURIComponent(element.dataUrl)).not.toContain('<script')
  })

  it('falls back to the canvas clipboard when browser clipboard reading is unavailable', async () => {
    const pasteSpy = vi.spyOn(useAppStore.getState(), 'paste')
    setClipboard(undefined)

    await pasteClipboardImageOrCanvasSelection()

    expect(pasteSpy).toHaveBeenCalledTimes(1)
  })

  it('falls back to the canvas clipboard when browser clipboard reading fails', async () => {
    const pasteSpy = vi.spyOn(useAppStore.getState(), 'paste')
    setClipboard({ read: vi.fn().mockRejectedValue(new Error('denied')) } as unknown as Clipboard)

    await pasteClipboardImageOrCanvasSelection()

    expect(pasteSpy).toHaveBeenCalledTimes(1)
  })
})
