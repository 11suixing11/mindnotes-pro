import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import Canvas from './Canvas'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { createDefaultLayer, DEFAULT_LAYER_ID } from '../../store/layers'
import { loadRecoveryDraft } from '../../store/recovery'
import { resetSaveCache } from '../../store/saveManager'

// Mock browser APIs missing from jsdom
globalThis.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any

globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(cb, 0) as unknown as number
globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id)

// Proxy-based Path2D: auto-stub any method
globalThis.Path2D = new Proxy(class {}, {
  construct() {
    return new Proxy(
      {},
      {
        get(_t, prop) {
          return typeof prop === 'string' ? () => {} : undefined
        },
      }
    )
  },
}) as any

// Proxy-based canvas context: auto-stub any missing property/method
const mockGradient = { addColorStop: vi.fn() }
function createMockCtx(): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'canvas') return document.createElement('canvas')
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient')
        return () => mockGradient
      if (prop === 'createPattern') return () => null
      if (prop === 'measureText') return () => ({ width: 50 })
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(0) })
      return typeof prop === 'string' ? () => {} : undefined
    },
    set(_target, _prop, _value) {
      return true
    },
  }
  return new Proxy({}, handler)
}

function mockCanvasRect(canvas: HTMLCanvasElement) {
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  })
}

function dispatchCanvasPointer(
  canvas: HTMLCanvasElement,
  type: 'pointerdown' | 'pointerup',
  {
    pointerId = 1,
    clientX = 120,
    clientY = 140,
  }: { pointerId?: number; clientX?: number; clientY?: number } = {}
) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: 'mouse' },
    clientX: { value: clientX },
    clientY: { value: clientY },
    pressure: { value: 0.5 },
    button: { value: 0 },
    buttons: { value: type === 'pointerdown' ? 1 : 0 },
    ctrlKey: { value: false },
    metaKey: { value: false },
  })

  act(() => canvas.dispatchEvent(event))
}

function startTextEditor(
  canvas: HTMLCanvasElement,
  options: { pointerId?: number; clientX?: number; clientY?: number } = {}
) {
  dispatchCanvasPointer(canvas, 'pointerdown', options)
  dispatchCanvasPointer(canvas, 'pointerup', options)
  return screen.getByTestId('canvas-text-editor') as HTMLTextAreaElement
}

function renderTextCanvas() {
  useAppStore.setState({ tool: 'text' })
  const rendered = render(<Canvas />)
  const canvas = rendered.container.querySelector('canvas')
  if (!canvas) throw new Error('Expected Canvas to render a canvas element')
  mockCanvasRect(canvas)
  return { ...rendered, canvas }
}

async function flushAnimationFrames(count = 2) {
  for (let index = 0; index < count; index += 1) {
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        })
    )
  }
}

function storedTextContents() {
  return useAppStore
    .getState()
    .elements.filter((element) => element.type === 'text')
    .map((element) => element.originalContent ?? element.content)
}

HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx()) as any

describe('Canvas', () => {
  beforeEach(() => {
    resetSaveCache()
    localStorage.clear()
    const collectionState = useAppStore.getState()
    collectionState.idToElement.clear()
    collectionState.idToIndex.clear()
    collectionState.spatialIndex.clear()
    const defaultLayer = createDefaultLayer(1)
    useAppStore.setState({
      elements: [],
      layers: [defaultLayer],
      activeLayerId: DEFAULT_LAYER_ID,
      tool: 'pen',
      brush: 'pen',
      color: '#2c2416',
      size: 4,
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      selectedIds: [],
      undoStack: [],
      redoStack: [],
      _indexDirty: false,
      loaded: true,
      docs: [],
      currentDocId: null,
    })
    useViewStore.setState({ viewBox: { x: 0, y: 0, zoom: 1 } })
  })

  afterEach(() => {
    resetSaveCache()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should render canvas element', () => {
    const { container } = render(<Canvas />)
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('should render a size-contained canvas surface', () => {
    const { container } = render(<Canvas />)
    const div = container.querySelector('div')
    expect(div).not.toBeNull()
    if (div) expect(div.classList.contains('canvas-surface')).toBe(true)
  })

  it('should set canvas touch-action to none', () => {
    const { container } = render(<Canvas />)
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    if (!canvas) return
    expect(canvas.classList.contains('main-canvas')).toBe(true)
    expect(canvas.style.touchAction).toBe('none')
  })

  it('should expose the canvas as a keyboard focus target', () => {
    const { container } = render(<Canvas />)
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas?.getAttribute('tabindex')).toBe('0')
  })

  it('should not render text editor initially', () => {
    const { container } = render(<Canvas />)
    expect(container.querySelector('textarea')).toBeNull()
  })

  it('keeps an empty text editor visible, removes its empty state on input, and commits it', () => {
    const { canvas } = renderTextCanvas()

    const editor = startTextEditor(canvas)
    expect(editor.classList.contains('canvas-text-editor')).toBe(true)
    expect(editor.classList.contains('canvas-text-editor-empty')).toBe(true)
    expect(document.activeElement).toBe(editor)

    fireEvent.change(editor, { target: { value: 'Visible text' } })
    expect(editor.classList.contains('canvas-text-editor-empty')).toBe(false)

    fireEvent.keyDown(editor, { key: 'Enter', keyCode: 13, ctrlKey: true })

    expect(screen.queryByTestId('canvas-text-editor')).toBeNull()
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0]).toMatchObject({
      type: 'text',
      originalContent: 'Visible text',
    })
  })

  it('commits with Escape instead of discarding the current text', () => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)

    fireEvent.change(editor, { target: { value: 'Escape keeps this' } })
    fireEvent.keyDown(editor, { key: 'Escape', keyCode: 27 })

    expect(screen.queryByTestId('canvas-text-editor')).toBeNull()
    expect(storedTextContents()).toEqual(['Escape keeps this'])
  })

  it('keeps plain Enter as a newline and does not submit', () => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: 'first line' } })

    expect(fireEvent.keyDown(editor, { key: 'Enter', keyCode: 13 })).toBe(true)
    fireEvent.change(editor, { target: { value: 'first line\nsecond line' } })

    expect(screen.getByTestId('canvas-text-editor')).toBe(editor)
    expect(editor.value).toBe('first line\nsecond line')
    expect(storedTextContents()).toEqual(['first line\nsecond line'])
    expect(useAppStore.getState().undoStack).toEqual([])
  })

  it.each([
    ['Ctrl+Enter', { ctrlKey: true }],
    ['Cmd+Enter', { metaKey: true }],
  ])('commits with %s', (_label, modifier) => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: 'Explicit submit' } })

    fireEvent.keyDown(editor, { key: 'Enter', keyCode: 13, ...modifier })

    expect(screen.queryByTestId('canvas-text-editor')).toBeNull()
    expect(storedTextContents()).toEqual(['Explicit submit'])
  })

  it('indents with Tab and outdents with Shift+Tab without ending the edit', async () => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: 'one\ntwo' } })
    editor.setSelectionRange(0, editor.value.length)

    fireEvent.keyDown(editor, { key: 'Tab', keyCode: 9 })
    await flushAnimationFrames()

    expect(editor.value).toBe('    one\n    two')
    expect(storedTextContents()).toEqual(['    one\n    two'])
    expect(useAppStore.getState().undoStack).toEqual([])
    expect(screen.getByTestId('canvas-text-editor')).toBe(editor)

    fireEvent.keyDown(editor, { key: 'Tab', keyCode: 9, shiftKey: true })
    await flushAnimationFrames()

    expect(editor.value).toBe('one\ntwo')
    expect(storedTextContents()).toEqual(['one\ntwo'])
    expect(useAppStore.getState().undoStack).toEqual([])
    expect(screen.getByTestId('canvas-text-editor')).toBe(editor)
  })

  it('does not submit Ctrl+Enter while IME composition is active or keyCode is 229', () => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: '正在输入' } })

    fireEvent.keyDown(editor, {
      key: 'Enter',
      keyCode: 13,
      ctrlKey: true,
      isComposing: true,
    })
    fireEvent.keyDown(editor, {
      key: 'Enter',
      keyCode: 229,
      ctrlKey: true,
    })

    expect(screen.getByTestId('canvas-text-editor')).toBe(editor)
    expect(storedTextContents()).toEqual(['正在输入'])
    expect(useAppStore.getState().undoStack).toEqual([])
  })

  it('does not submit when the browser window loses focus', async () => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: 'Keep editing after alt-tab' } })

    act(() => window.dispatchEvent(new Event('blur')))
    await flushAnimationFrames()

    expect(screen.getByTestId('canvas-text-editor')).toBe(editor)
    expect(storedTextContents()).toEqual(['Keep editing after alt-tab'])
    expect(useAppStore.getState().undoStack).toEqual([])
  })

  it('submits the latest DOM value before the page unloads', () => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: 'Almost final' } })
    editor.value = 'Almost final!'

    act(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true })))

    expect(screen.queryByTestId('canvas-text-editor')).toBeNull()
    expect(storedTextContents()).toEqual(['Almost final!'])
  })

  it('keeps editing while formatting text and opening a color picker', async () => {
    const hasFocusSpy = vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: 'Formatted in place' } })

    const boldButton = screen.getByLabelText('Bold')
    fireEvent.pointerDown(boldButton)
    fireEvent.mouseDown(boldButton)
    fireEvent.click(boldButton)
    await flushAnimationFrames()

    expect(screen.getByTestId('canvas-text-editor')).toBe(editor)
    expect(boldButton.getAttribute('aria-pressed')).toBe('true')
    expect(useAppStore.getState().elements[0]).toMatchObject({
      type: 'text',
      originalContent: 'Formatted in place',
      fontWeight: 'bold',
    })
    expect(useAppStore.getState().undoStack).toEqual([])

    const colorInput = screen.getByLabelText('Text color') as HTMLInputElement
    fireEvent.pointerDown(colorInput)
    colorInput.focus()
    act(() => window.dispatchEvent(new Event('blur')))
    fireEvent.change(colorInput, { target: { value: '#1971c2' } })
    act(() => window.dispatchEvent(new Event('focus')))
    await flushAnimationFrames()

    expect(hasFocusSpy).toHaveBeenCalled()
    expect(screen.getByTestId('canvas-text-editor')).toBe(editor)
    expect(useAppStore.getState().elements[0]).toMatchObject({
      type: 'text',
      originalContent: 'Formatted in place',
      fontWeight: 'bold',
      color: '#1971c2',
    })
    expect(useAppStore.getState().undoStack).toEqual([])
  })

  it('commits the old session once and leaves one fresh editor on a new canvas click', async () => {
    const { canvas } = renderTextCanvas()
    const firstEditor = startTextEditor(canvas, { pointerId: 1, clientX: 120, clientY: 140 })
    fireEvent.change(firstEditor, { target: { value: 'First session' } })
    fireEvent.blur(firstEditor, { relatedTarget: canvas })

    const secondEditor = startTextEditor(canvas, {
      pointerId: 2,
      clientX: 360,
      clientY: 280,
    })
    await flushAnimationFrames(3)

    expect(storedTextContents()).toEqual(['First session'])
    expect(screen.getAllByTestId('canvas-text-editor')).toHaveLength(1)
    expect(secondEditor.value).toBe('')
  })

  it('keeps two consecutive text sessions isolated from stale blur callbacks', async () => {
    const { canvas } = renderTextCanvas()
    const firstEditor = startTextEditor(canvas, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.change(firstEditor, { target: { value: 'First' } })
    fireEvent.blur(firstEditor, { relatedTarget: canvas })

    const secondEditor = startTextEditor(canvas, {
      pointerId: 2,
      clientX: 420,
      clientY: 320,
    })
    fireEvent.change(secondEditor, { target: { value: 'Second' } })
    await flushAnimationFrames(3)

    expect(storedTextContents()).toEqual(['First', 'Second'])
    expect(useAppStore.getState().undoStack).toHaveLength(1)
    expect(screen.getByTestId('canvas-text-editor')).toBe(secondEditor)
    expect(secondEditor.value).toBe('Second')

    fireEvent.keyDown(secondEditor, { key: 'Enter', keyCode: 13, ctrlKey: true })
    expect(storedTextContents()).toEqual(['First', 'Second'])
  })

  it('commits the final character directly from the textarea DOM', () => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: 'Last char' } })
    editor.value = 'Last char!'

    fireEvent.keyDown(editor, { key: 'Enter', keyCode: 13, ctrlKey: true })

    expect(storedTextContents()).toEqual(['Last char!'])
  })

  it('mirrors an active text edit to the store and checkpoints the same stable element', async () => {
    const now = Date.now()
    const layer = createDefaultLayer(now)
    useAppStore.setState({
      currentDocId: 'doc-active-text',
      docs: [
        {
          schemaVersion: 5,
          id: 'doc-active-text',
          title: 'Active text',
          elements: [],
          layers: [layer],
          activeLayerId: layer.id,
          bgColor: '#ffffff',
          backgroundStyle: 'plain',
          folderId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    })
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)

    fireEvent.change(editor, { target: { value: 'Crash-safe draft' } })
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)))

    fireEvent.change(editor, { target: { value: 'Crash-safe draft updated' } })
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)))

    expect(storedTextContents()).toEqual(['Crash-safe draft updated'])
    expect(useAppStore.getState().undoStack).toEqual([])
    expect(loadRecoveryDraft('doc-active-text')?.elements).toEqual([
      expect.objectContaining({
        type: 'text',
        originalContent: 'Crash-safe draft updated',
      }),
    ])
  })

  it('checkpoints the textarea DOM value on exit, including the last unrendered character', () => {
    const now = Date.now()
    const layer = createDefaultLayer(now)
    useAppStore.setState({
      currentDocId: 'doc-active-exit',
      docs: [
        {
          schemaVersion: 5,
          id: 'doc-active-exit',
          title: 'Active exit',
          elements: [],
          layers: [layer],
          activeLayerId: layer.id,
          bgColor: '#ffffff',
          backgroundStyle: 'plain',
          folderId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    })
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: 'Almost final' } })
    editor.value = 'Almost final!'

    act(() => window.dispatchEvent(new Event('pagehide')))

    expect(loadRecoveryDraft('doc-active-exit')?.elements).toEqual([
      expect.objectContaining({
        type: 'text',
        originalContent: 'Almost final!',
      }),
    ])
  })

  it('commits the active editor synchronously before the same canvas pointer event continues', () => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    fireEvent.change(editor, { target: { value: 'Available to pointer handlers' } })

    let storeContentsDuringPointerDown: string[] = []
    canvas.addEventListener('pointerdown', () => {
      storeContentsDuringPointerDown = storedTextContents()
    })
    act(() => useAppStore.setState({ tool: 'select' }))
    dispatchCanvasPointer(canvas, 'pointerdown', { pointerId: 2, clientX: 360, clientY: 280 })

    expect(storeContentsDuringPointerDown).toEqual(['Available to pointer handlers'])
  })

  it('does not steal focus back from another control when the window regains focus', async () => {
    const { canvas } = renderTextCanvas()
    const editor = startTextEditor(canvas)
    await flushAnimationFrames()
    const externalInput = document.createElement('input')
    document.body.appendChild(externalInput)

    act(() => window.dispatchEvent(new Event('blur')))
    externalInput.focus()
    await flushAnimationFrames()
    act(() => window.dispatchEvent(new Event('focus')))
    await flushAnimationFrames()

    expect(document.activeElement).toBe(externalInput)
    expect(screen.getByTestId('canvas-text-editor')).toBe(editor)
    externalInput.remove()
  })
})
