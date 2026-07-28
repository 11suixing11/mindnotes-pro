import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTextEditor } from './useTextEditor'
import { useAppStore } from '../../store/appStore'

function createMockCanvasRef() {
  const canvas = document.createElement('canvas')
  const ref = { current: canvas }
  return ref as React.RefObject<HTMLCanvasElement | null>
}

describe('useTextEditor', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ elements: [], undoStack: [], redoStack: [], selectedIds: [] })
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
      expect(et.width).toBe(240)
      expect(et.fontWeight).toBe('normal')
      expect(et.fontStyle).toBe('normal')
      expect(et.textDecoration).toBe('none')
      expect(et.textAlign).toBe('left')
      expect(et.backgroundColor).toBeUndefined()
      expect(et.id).toMatch(/^new-/)
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
      expect(et2.height).toBe(40)
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
      expect(el.content).toBe('new content')
      expect(el.fontSize).toBe(20)
      expect(el.color).toBe('#e03131')
      expect(el.fontWeight).toBe('bold')
      expect(el.textAlign).toBeUndefined()
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
      expect(el.height).toBeCloseTo(16 * 1.6 * 3)
    })
  })

  describe('measureTextWidth', () => {
    it('should return fallback when canvas is null', () => {
      const { result } = renderHook(() => useTextEditor({ current: null }))
      const w = result.current.measureTextWidth('hello', 16)
      expect(w).toBeGreaterThanOrEqual(200)
    })

    it('should return at least 40 for short text', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      const w = result.current.measureTextWidth('hi', 16)
      expect(w).toBeGreaterThanOrEqual(40)
    })
  })
})
