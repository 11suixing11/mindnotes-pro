import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import Canvas from './Canvas'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'

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

HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx()) as any

describe('Canvas', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      elements: [],
      tool: 'pen',
      brush: 'pen',
      color: '#2c2416',
      size: 4,
      bgColor: '#ffffff',
      selectedIds: [],
      undoStack: [],
      redoStack: [],
      loaded: true,
      docs: [],
      folders: [],
      currentDocId: null,
    })
    useViewStore.setState({ viewBox: { x: 0, y: 0, zoom: 1 } })
  })

  it('should render canvas element', () => {
    const { container } = render(<Canvas />)
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('should render container div with overflow hidden', () => {
    const { container } = render(<Canvas />)
    const div = container.querySelector('div')
    expect(div).not.toBeNull()
    if (div) expect(div.classList.contains('overflow-hidden')).toBe(true)
  })

  it('should set canvas touch-action to none', () => {
    const { container } = render(<Canvas />)
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    if (!canvas) return
    expect(canvas.classList.contains('touch-none')).toBe(true)
  })

  it('should not render text editor initially', () => {
    const { container } = render(<Canvas />)
    expect(container.querySelector('textarea')).toBeNull()
  })
})
