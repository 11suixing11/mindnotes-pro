import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createSessionId, useTextEditor } from './useTextEditor'
import { useAppStore } from '../../store/appStore'
import { createDefaultLayer } from '../../store/layers'

function createMockCanvasRef() {
  const canvas = document.createElement('canvas')
  const ref = { current: canvas }
  return ref as React.RefObject<HTMLCanvasElement | null>
}

describe('useTextEditor', () => {
  beforeEach(() => {
    localStorage.clear()
    const defaultLayer = createDefaultLayer(1)
    useAppStore.setState({
      elements: [],
      layers: [defaultLayer],
      activeLayerId: defaultLayer.id,
      undoStack: [],
      redoStack: [],
      selectedIds: [],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('createSessionId', () => {
    it('prefers randomUUID when Web Crypto provides it', () => {
      const randomUUID = vi.fn(() => 'uuid-1')
      const getRandomValues = vi.fn()
      vi.stubGlobal('crypto', { randomUUID, getRandomValues })

      expect(createSessionId('text-')).toBe('text-uuid-1')
      expect(randomUUID).toHaveBeenCalledOnce()
      expect(getRandomValues).not.toHaveBeenCalled()
    })

    it('uses getRandomValues when randomUUID is unavailable', () => {
      const getRandomValues = vi.fn((values: Uint32Array) => {
        values[0] = 1
        values[1] = 35
        return values
      })
      vi.stubGlobal('crypto', { getRandomValues })
      vi.spyOn(Date, 'now').mockReturnValue(123)

      expect(createSessionId('text-')).toBe('text-123-1-z')
      expect(getRandomValues).toHaveBeenCalledOnce()
      expect(getRandomValues.mock.calls[0][0]).toBeInstanceOf(Uint32Array)
    })

    it('uses a monotonic fallback when Web Crypto is unavailable', () => {
      vi.stubGlobal('crypto', undefined)
      vi.spyOn(Date, 'now').mockReturnValue(123)

      const first = createSessionId('text-')
      const second = createSessionId('text-')

      expect(first).toMatch(/^text-123-\d+$/)
      expect(second).toMatch(/^text-123-\d+$/)
      expect(second).not.toBe(first)
    })
  })

  it('should initialize with no editing text', () => {
    const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
    expect(result.current.editingText).toBeNull()
  })

  describe('startEditText', () => {
    it('should set editingText for new text', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(100, 200, 150, 250, '#333')
      })
      const et = result.current.editingText
      expect(et).not.toBeNull()
      if (!et) return
      expect(et.x).toBe(100)
      expect(et.y).toBe(200)
      expect(et.screenX).toBe(150)
      expect(et.screenY).toBe(250)
      expect(et.color).toBe('#333')
      expect(et.content).toBe('')
      expect(et.fontSize).toBe(16)
      expect(et.width).toBe(40)
      expect(et.autoResize).toBe(true)
      expect(et.wraps).toBe(false)
      expect(et.fontWeight).toBe('normal')
      expect(et.fontStyle).toBe('normal')
      expect(et.textDecoration).toBe('none')
      expect(et.textAlign).toBe('left')
      expect(et.backgroundColor).toBeUndefined()
      expect(et.id).toMatch(/^text-/)
    })

    it('should set editingText for existing text element with formatting', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(50, 60, 70, 80, '#000', {
          id: 'text-1',
          content: 'hello',
          fontSize: 20,
          color: '#123456',
          width: 180,
          height: 40,
          fontWeight: 'bold',
          fontStyle: 'italic',
          textDecoration: 'underline',
          textAlign: 'center',
          backgroundColor: '#ffe8a3',
        })
      })
      const et2 = result.current.editingText
      expect(et2).not.toBeNull()
      if (!et2) return
      expect(et2.id).toBe('text-1')
      expect(et2.content).toBe('hello')
      expect(et2.fontSize).toBe(20)
      expect(et2.color).toBe('#123456')
      expect(et2.width).toBe(180)
      expect(et2.height).toBe(32)
      expect(et2.autoResize).toBe(false)
      expect(et2.fontWeight).toBe('bold')
      expect(et2.fontStyle).toBe('italic')
      expect(et2.textDecoration).toBe('underline')
      expect(et2.textAlign).toBe('center')
      expect(et2.backgroundColor).toBe('#ffe8a3')
    })
  })

  describe('cancelEdit', () => {
    it('should clear editingText', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(0, 0, 0, 0, '#000')
      })
      expect(result.current.editingText).not.toBeNull()
      act(() => {
        result.current.cancelEdit()
      })
      expect(result.current.editingText).toBeNull()
    })
  })

  describe('commitTextEdit', () => {
    it('should add new text element when committing new text with content', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(100, 200, 150, 250, '#333')
      })
      act(() => {
        result.current.commitTextEdit('Hello World')
      })
      expect(result.current.editingText).toBeNull()
      const els = useAppStore.getState().elements
      expect(els).toHaveLength(1)
      expect(els[0].type).toBe('text')
      expect((els[0] as any).content).toBe('Hello World')
      expect((els[0] as any).x).toBe(100)
      expect((els[0] as any).y).toBe(200)
    })

    it('should add new text with selected formatting', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(100, 200, 150, 250, '#333')
      })
      act(() => {
        result.current.setEditingText((current) =>
          current
            ? {
                ...current,
                fontSize: 24,
                color: '#1971c2',
                fontWeight: 'bold',
                fontStyle: 'italic',
                textDecoration: 'underline',
                textAlign: 'right',
                backgroundColor: '#fff3bf',
              }
            : current
        )
      })
      act(() => {
        result.current.commitTextEdit('Formatted')
      })

      const el = useAppStore.getState().elements[0] as any
      expect(el.fontSize).toBe(24)
      expect(el.color).toBe('#1971c2')
      expect(el.fontWeight).toBe('bold')
      expect(el.fontStyle).toBe('italic')
      expect(el.textDecoration).toBe('underline')
      expect(el.textAlign).toBe('right')
      expect(el.backgroundColor).toBe('#fff3bf')
    })

    it('should not add element when committing new text with empty content', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(100, 200, 150, 250, '#333')
      })
      act(() => {
        result.current.commitTextEdit('   ')
      })
      expect(useAppStore.getState().elements).toHaveLength(0)
      expect(result.current.editingText).toBeNull()
    })

    it('should keep a new editor open when no writable layer can save it', () => {
      useAppStore.setState({
        layers: useAppStore.getState().layers.map((layer) => ({ ...layer, locked: true })),
      })
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      let committed = true

      act(() => {
        result.current.startEditText(100, 200, 150, 250, '#333')
        result.current.updateEditingTextContent('Keep this draft')
        committed = result.current.commitTextEdit('Keep this draft')
      })

      expect(committed).toBe(false)
      expect(result.current.editingText?.content).toBe('Keep this draft')
      expect(useAppStore.getState().elements).toEqual([])
    })

    it('should update existing text element on commit', () => {
      useAppStore.getState().addElement({
        type: 'text',
        id: 'text-1',
        x: 50,
        y: 60,
        width: 100,
        height: 30,
        content: 'old',
        fontSize: 16,
        color: '#000',
        textAlign: 'center',
      })
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(50, 60, 70, 80, '#000', {
          id: 'text-1',
          content: 'old',
          fontSize: 16,
          color: '#000',
          width: 100,
          height: 30,
          textAlign: 'center',
        })
      })
      act(() => {
        result.current.setEditingText((current) =>
          current
            ? {
                ...current,
                fontSize: 20,
                color: '#e03131',
                fontWeight: 'bold',
                textAlign: 'left',
              }
            : current
        )
      })
      act(() => {
        result.current.commitTextEdit('new content')
      })
      expect(result.current.editingText).toBeNull()
      const el = useAppStore.getState().elements.find((e) => e.id === 'text-1') as any
      expect(el.originalContent).toBe('new content')
      expect(el.content).toBe('new\ncontent')
      expect(el.fontSize).toBe(20)
      expect(el.color).toBe('#e03131')
      expect(el.fontWeight).toBe('bold')
      expect(el.textAlign).toBeUndefined()
    })

    it('should record one undo snapshot for an existing text edit', () => {
      useAppStore.getState().addElements([
        {
          type: 'shape',
          id: 'shape-1',
          kind: 'rectangle',
          x: 0,
          y: 0,
          w: 20,
          h: 20,
          color: '#000',
          size: 2,
        },
        {
          type: 'text',
          id: 'text-undo',
          x: 50,
          y: 60,
          width: 100,
          height: 30,
          content: 'before',
          fontSize: 16,
          color: '#000',
        },
      ])
      useAppStore.setState({ undoStack: [], redoStack: [] })
      const existing = useAppStore.getState().elements.find((element) => element.id === 'text-undo')
      expect(existing?.type).toBe('text')
      if (!existing || existing.type !== 'text') return

      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(50, 60, 70, 80, '#000', existing)
        result.current.commitTextEdit('after')
      })

      expect(useAppStore.getState().undoStack).toHaveLength(1)
      expect(useAppStore.getState().undoStack[0]).toEqual(
        expect.objectContaining({
          type: 'snapshot',
          label: 'Edit text',
          affectedIds: ['text-undo'],
        })
      )

      act(() => useAppStore.getState().undo())

      expect(useAppStore.getState().elements).toHaveLength(2)
      expect(
        useAppStore.getState().elements.find((element) => element.id === 'shape-1')
      ).toBeDefined()
      expect(
        useAppStore.getState().elements.find((element) => element.id === 'text-undo')
      ).toMatchObject({ content: 'before' })
    })

    it('does not undo an unrelated element changed during the text session', () => {
      useAppStore.getState().addElements([
        {
          type: 'shape',
          id: 'shape-concurrent',
          kind: 'rectangle',
          x: 0,
          y: 0,
          w: 20,
          h: 20,
          color: '#000',
          size: 2,
        },
        {
          type: 'text',
          id: 'text-concurrent',
          x: 50,
          y: 60,
          width: 100,
          height: 30,
          content: 'before',
          fontSize: 16,
          color: '#000',
        },
      ])
      useAppStore.setState({ undoStack: [], redoStack: [] })
      const existing = useAppStore
        .getState()
        .elements.find((element) => element.id === 'text-concurrent')
      if (!existing || existing.type !== 'text') return

      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(50, 60, 70, 80, '#000', existing)
        result.current.updateEditingTextContent('after')
        useAppStore
          .getState()
          .updateElement('shape-concurrent', (element) =>
            element.type === 'shape' ? { ...element, x: 100 } : element
          )
        result.current.commitTextEdit('after')
      })

      act(() => useAppStore.getState().undo())

      expect(useAppStore.getState().elements).toEqual([
        expect.objectContaining({ id: 'shape-concurrent', x: 100 }),
        expect.objectContaining({ id: 'text-concurrent', content: 'before' }),
      ])
    })

    it('should close an unchanged existing edit without updating or adding history', () => {
      useAppStore.getState().addElement({
        type: 'text',
        id: 'text-noop',
        x: 50,
        y: 60,
        width: 100,
        height: 30,
        content: 'unchanged',
        fontSize: 16,
        color: '#000',
      })
      useAppStore.setState({ undoStack: [], redoStack: [] })
      const before = useAppStore.getState().elements[0]
      const updateElement = vi.spyOn(useAppStore.getState(), 'updateElement')
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))

      act(() => {
        result.current.startEditText(50, 60, 70, 80, '#000', before as any)
        result.current.commitTextEdit('unchanged')
      })

      expect(result.current.editingText).toBeNull()
      expect(updateElement).not.toHaveBeenCalled()
      expect(useAppStore.getState().elements[0]).toBe(before)
      expect(useAppStore.getState().undoStack).toEqual([])
      updateElement.mockRestore()
    })

    it('should keep the editor open when the target cannot be updated', () => {
      useAppStore.getState().addElement({
        type: 'text',
        id: 'text-locked',
        x: 50,
        y: 60,
        width: 100,
        height: 30,
        content: 'before',
        fontSize: 16,
        color: '#000',
        locked: true,
      })
      useAppStore.setState({ undoStack: [], redoStack: [] })
      const existing = useAppStore.getState().elements[0]
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      let committed = true

      act(() => {
        result.current.startEditText(50, 60, 70, 80, '#000', existing as any)
        committed = result.current.commitTextEdit('after')
      })

      expect(committed).toBe(false)
      expect(result.current.editingText?.id).toBe('text-locked')
      expect(useAppStore.getState().elements[0]).toMatchObject({ content: 'before' })
      expect(useAppStore.getState().undoStack).toEqual([])
    })

    it('should keep the editor open when its target disappeared', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      let committed = true

      act(() => {
        result.current.startEditText(50, 60, 70, 80, '#000', {
          id: 'missing-text',
          content: 'before',
          fontSize: 16,
          color: '#000',
          width: 100,
          height: 30,
        })
        committed = result.current.commitTextEdit('after')
      })

      expect(committed).toBe(false)
      expect(result.current.editingText?.id).toBe('missing-text')
      expect(useAppStore.getState().elements).toEqual([])
    })

    it('should remove an existing text element when its content is cleared', () => {
      useAppStore.getState().addElement({
        type: 'text',
        id: 'text-empty',
        x: 50,
        y: 60,
        width: 100,
        height: 30,
        content: 'remove me',
        fontSize: 16,
        color: '#000',
      })
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))

      act(() => {
        result.current.startEditText(50, 60, 70, 80, '#000', {
          id: 'text-empty',
          content: 'remove me',
          fontSize: 16,
          color: '#000',
          width: 100,
          height: 30,
        })
        result.current.commitTextEdit('   ')
      })

      expect(result.current.editingText).toBeNull()
      expect(useAppStore.getState().elements).toHaveLength(0)
    })

    it('allows an existing text edit to recover after it is temporarily cleared', () => {
      useAppStore.getState().addElement({
        type: 'text',
        id: 'text-recover-empty',
        x: 50,
        y: 60,
        width: 100,
        height: 30,
        content: 'before',
        fontSize: 16,
        color: '#000',
      })
      const existing = useAppStore.getState().elements[0]
      if (!existing || existing.type !== 'text') return
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))

      act(() => {
        result.current.startEditText(50, 60, 70, 80, '#000', existing)
        result.current.updateEditingTextContent('')
        result.current.updateEditingTextContent('restored')
      })

      expect(useAppStore.getState().elements).toEqual([
        expect.objectContaining({ id: 'text-recover-empty', originalContent: 'restored' }),
      ])
      let committed = false
      act(() => {
        committed = result.current.commitTextEdit('restored')
      })
      expect(committed).toBe(true)
    })

    it('should not add element when editingText is null', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.commitTextEdit('no effect')
      })
      expect(useAppStore.getState().elements).toHaveLength(0)
    })

    it('should handle multiline text', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(0, 0, 0, 0, '#000')
      })
      act(() => {
        result.current.commitTextEdit('line1\nline2\nline3')
      })
      const el = useAppStore.getState().elements[0] as any
      expect(el.content).toBe('line1\nline2\nline3')
      expect(el.originalContent).toBe('line1\nline2\nline3')
      expect(el.height).toBeCloseTo(16 * 1.6 * 3)
    })

    it('should preserve meaningful leading and trailing whitespace', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(0, 0, 0, 0, '#000')
      })
      act(() => {
        result.current.commitTextEdit('  note  ')
      })

      const el = useAppStore.getState().elements[0] as any
      expect(el.originalContent).toBe('  note  ')
      expect(el.content).toBe('  note  ')
    })

    it('should commit the latest batched format before React rerenders', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))

      act(() => {
        result.current.startEditText(0, 0, 0, 0, '#000')
        result.current.updateEditingTextFormat({ fontWeight: 'bold', color: '#1971c2' })
        result.current.commitTextEdit('latest')
      })

      expect(result.current.editingText).toBeNull()
      expect(useAppStore.getState().elements[0]).toMatchObject({
        type: 'text',
        originalContent: 'latest',
        fontWeight: 'bold',
        color: '#1971c2',
      })
    })

    it('should ignore a stale session commit without closing the active editor', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => {
        result.current.startEditText(0, 0, 0, 0, '#000')
      })
      const activeId = result.current.editingText?.id

      act(() => {
        result.current.commitTextEdit('stale content', 'an-older-session')
      })

      expect(useAppStore.getState().elements).toHaveLength(0)
      expect(result.current.editingText?.id).toBe(activeId)
      expect(result.current.editingText?.content).toBe('')
    })
  })

  it('should resize an auto-width editor in both directions while typing', () => {
    const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
    act(() => {
      result.current.startEditText(0, 0, 0, 0, '#000')
    })
    act(() => {
      result.current.updateEditingTextContent('This text is wider')
    })
    const expandedWidth = result.current.editingText?.width ?? 0
    act(() => {
      result.current.updateEditingTextContent('x')
    })

    expect(expandedWidth).toBeGreaterThan(40)
    expect(result.current.editingText?.width).toBe(40)
  })

  it('mirrors typing into the live store without adding undo entries until commit', () => {
    const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))

    act(() => result.current.startEditText(0, 0, 0, 0, '#000'))
    act(() => result.current.updateEditingTextContent('Live draft'))

    expect(useAppStore.getState().elements).toEqual([
      expect.objectContaining({ type: 'text', originalContent: 'Live draft' }),
    ])
    expect(useAppStore.getState().undoStack).toEqual([])

    act(() => result.current.commitTextEdit('Live draft'))

    expect(useAppStore.getState().undoStack).toHaveLength(1)
    act(() => useAppStore.getState().undo())
    expect(useAppStore.getState().elements).toEqual([])
  })

  it('cancels only the active text while preserving unrelated live changes', () => {
    useAppStore.getState().addElements([
      {
        type: 'shape',
        id: 'shape-live',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#000',
        size: 2,
      },
    ])
    useAppStore.setState({ undoStack: [], redoStack: [] })
    const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))

    act(() => {
      result.current.startEditText(40, 40, 40, 40, '#000')
      result.current.updateEditingTextContent('Keep shape')
      useAppStore
        .getState()
        .updateElement('shape-live', (element) =>
          element.type === 'shape' ? { ...element, x: 100 } : element
        )
      result.current.cancelEdit()
    })

    expect(useAppStore.getState().elements).toEqual([
      expect.objectContaining({ id: 'shape-live', x: 100 }),
    ])
  })

  describe('measureTextWidth', () => {
    it('should return a deterministic fallback when canvas is null', () => {
      const { result } = renderHook(() => useTextEditor({ current: null }))
      const w = result.current.measureTextWidth('hello', 16)
      expect(w).toBeGreaterThanOrEqual(40)
      expect(w).toBeLessThan(200)
    })

    it('should return at least 40 for short text', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      const w = result.current.measureTextWidth('hi', 16)
      expect(w).toBeGreaterThanOrEqual(40)
    })
  })
})
