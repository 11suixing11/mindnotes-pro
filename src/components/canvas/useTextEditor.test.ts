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
      act(() => { result.current.startEditText(100, 200, 150, 250, '#333') })
      expect(result.current.editingText).not.toBeNull()
      expect(result.current.editingText!.x).toBe(100)
      expect(result.current.editingText!.y).toBe(200)
      expect(result.current.editingText!.screenX).toBe(150)
      expect(result.current.editingText!.screenY).toBe(250)
      expect(result.current.editingText!.color).toBe('#333')
      expect(result.current.editingText!.content).toBe('')
      expect(result.current.editingText!.fontSize).toBe(16)
      expect(result.current.editingText!.id).toMatch(/^new-/)
    })

    it('should set editingText for existing text element', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => { result.current.startEditText(50, 60, 70, 80, '#000', { id: 'text-1', content: 'hello', fontSize: 20 }) })
      expect(result.current.editingText).not.toBeNull()
      expect(result.current.editingText!.id).toBe('text-1')
      expect(result.current.editingText!.content).toBe('hello')
      expect(result.current.editingText!.fontSize).toBe(20)
    })
  })

  describe('cancelEdit', () => {
    it('should clear editingText', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => { result.current.startEditText(0, 0, 0, 0, '#000') })
      expect(result.current.editingText).not.toBeNull()
      act(() => { result.current.cancelEdit() })
      expect(result.current.editingText).toBeNull()
    })
  })

  describe('commitTextEdit', () => {
    it('should add new text element when committing new text with content', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => { result.current.startEditText(100, 200, 150, 250, '#333') })
      act(() => { result.current.commitTextEdit('Hello World') })
      expect(result.current.editingText).toBeNull()
      const els = useAppStore.getState().elements
      expect(els).toHaveLength(1)
      expect(els[0].type).toBe('text')
      expect((els[0] as any).content).toBe('Hello World')
      expect((els[0] as any).x).toBe(100)
      expect((els[0] as any).y).toBe(200)
    })

    it('should not add element when committing new text with empty content', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => { result.current.startEditText(100, 200, 150, 250, '#333') })
      act(() => { result.current.commitTextEdit('   ') })
      expect(useAppStore.getState().elements).toHaveLength(0)
      expect(result.current.editingText).toBeNull()
    })

    it('should update existing text element on commit', () => {
      useAppStore.getState().addElement({ type: 'text', id: 'text-1', x: 50, y: 60, width: 100, height: 30, content: 'old', fontSize: 16, color: '#000' })
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => { result.current.startEditText(50, 60, 70, 80, '#000', { id: 'text-1', content: 'old', fontSize: 16 }) })
      act(() => { result.current.commitTextEdit('new content') })
      expect(result.current.editingText).toBeNull()
      const el = useAppStore.getState().elements.find((e) => e.id === 'text-1') as any
      expect(el.content).toBe('new content')
    })

    it('should not add element when editingText is null', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => { result.current.commitTextEdit('no effect') })
      expect(useAppStore.getState().elements).toHaveLength(0)
    })

    it('should handle multiline text', () => {
      const { result } = renderHook(() => useTextEditor(createMockCanvasRef()))
      act(() => { result.current.startEditText(0, 0, 0, 0, '#000') })
      act(() => { result.current.commitTextEdit('line1\nline2\nline3') })
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
