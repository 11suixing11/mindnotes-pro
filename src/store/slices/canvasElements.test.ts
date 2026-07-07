import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAppStore } from '../appStore'
import type { ShapeElement, StrokeElement, TextElement, ImageElement } from '../types'

const makeStroke = (id: string, overrides?: Partial<StrokeElement>): StrokeElement => ({
  type: 'stroke',
  id,
  points: [
    [0, 0],
    [10, 10],
  ],
  color: '#000',
  size: 2,
  brush: 'pen',
  ...overrides,
})

const makeShape = (id: string, overrides?: Partial<ShapeElement>): ShapeElement => ({
  type: 'shape',
  id,
  kind: 'rectangle',
  x: 10,
  y: 20,
  w: 100,
  h: 50,
  color: '#000',
  size: 2,
  ...overrides,
})

const makeText = (id: string, overrides?: Partial<TextElement>): TextElement => ({
  type: 'text',
  id,
  x: 50,
  y: 50,
  width: 200,
  height: 30,
  content: 'Hello',
  fontSize: 16,
  color: '#000',
  ...overrides,
})

const makeImage = (id: string, overrides?: Partial<ImageElement>): ImageElement => ({
  type: 'image',
  id,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  dataUrl: 'data:image/png;base64,abc',
  ...overrides,
})

describe('canvasElements slice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    useAppStore.setState({
      elements: [],
      selectedIds: [],
      clipboard: [],
      undoStack: [],
      redoStack: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('addElement', () => {
    it('appends a stroke element', () => {
      const s = makeStroke('s1')
      useAppStore.getState().addElement(s)
      expect(useAppStore.getState().elements).toHaveLength(1)
      expect(useAppStore.getState().elements[0].id).toBe('s1')
    })

    it('appends a shape element', () => {
      useAppStore.getState().addElement(makeShape('sh1'))
      expect(useAppStore.getState().elements).toHaveLength(1)
      expect(useAppStore.getState().elements[0].type).toBe('shape')
    })

    it('appends a text element', () => {
      useAppStore.getState().addElement(makeText('t1'))
      expect(useAppStore.getState().elements).toHaveLength(1)
    })

    it('appends an image element', () => {
      useAppStore.getState().addElement(makeImage('i1'))
      expect(useAppStore.getState().elements).toHaveLength(1)
    })

    it('pushes an undo action', () => {
      useAppStore.getState().addElement(makeStroke('s1'))
      expect(useAppStore.getState().undoStack).toHaveLength(1)
      expect(useAppStore.getState().undoStack[0].type).toBe('add')
    })

    it('clears redo stack', () => {
      useAppStore.setState({ redoStack: [{ type: 'add', ids: ['x'] }] })
      useAppStore.getState().addElement(makeStroke('s1'))
      expect(useAppStore.getState().redoStack).toHaveLength(0)
    })
  })

  describe('addElements', () => {
    it('appends multiple elements', () => {
      useAppStore.getState().addElements([makeStroke('s1'), makeShape('sh1')])
      expect(useAppStore.getState().elements).toHaveLength(2)
    })

    it('pushes a single undo action for the batch', () => {
      useAppStore.getState().addElements([makeStroke('s1'), makeStroke('s2')])
      expect(useAppStore.getState().undoStack).toHaveLength(1)
      expect(useAppStore.getState().undoStack[0].type).toBe('add')
    })
  })

  describe('removeElement', () => {
    it('removes the matching element', () => {
      useAppStore.setState({ elements: [makeStroke('s1'), makeStroke('s2')] })
      useAppStore.getState().removeElement('s1')
      expect(useAppStore.getState().elements).toHaveLength(1)
      expect(useAppStore.getState().elements[0].id).toBe('s2')
    })

    it('does nothing if id is not found', () => {
      useAppStore.setState({ elements: [makeStroke('s1')] })
      useAppStore.getState().removeElement('missing')
      expect(useAppStore.getState().elements).toHaveLength(1)
    })

    it('removes the id from selectedIds', () => {
      useAppStore.setState({
        elements: [makeStroke('s1'), makeStroke('s2')],
        selectedIds: ['s1', 's2'],
      })
      useAppStore.getState().removeElement('s1')
      expect(useAppStore.getState().selectedIds).toEqual(['s2'])
    })

    it('pushes an undo action', () => {
      useAppStore.setState({ elements: [makeStroke('s1')] })
      useAppStore.getState().removeElement('s1')
      expect(useAppStore.getState().undoStack).toHaveLength(1)
      expect(useAppStore.getState().undoStack[0].type).toBe('remove')
    })
  })

  describe('removeElements', () => {
    it('removes multiple elements by ids', () => {
      useAppStore.setState({
        elements: [makeStroke('s1'), makeStroke('s2'), makeStroke('s3')],
      })
      useAppStore.getState().removeElements(['s1', 's3'])
      expect(useAppStore.getState().elements).toHaveLength(1)
      expect(useAppStore.getState().elements[0].id).toBe('s2')
    })

    it('clears selectedIds', () => {
      useAppStore.setState({
        elements: [makeStroke('s1'), makeStroke('s2')],
        selectedIds: ['s1', 's2'],
      })
      useAppStore.getState().removeElements(['s1', 's2'])
      expect(useAppStore.getState().selectedIds).toEqual([])
    })
  })

  describe('updateElement', () => {
    it('updates matching element via callback', () => {
      useAppStore.setState({ elements: [makeShape('sh1', { x: 10, y: 20 })] })
      useAppStore.getState().updateElement('sh1', (el) => ({ ...el, x: 99 }) as any)
      expect((useAppStore.getState().elements[0] as any).x).toBe(99)
    })

    it('does not affect other elements', () => {
      useAppStore.setState({ elements: [makeStroke('s1'), makeStroke('s2')] })
      useAppStore.getState().updateElement('s1', (el) => ({ ...el, color: '#fff' }) as any)
      expect((useAppStore.getState().elements[1] as any).color).toBe('#000')
    })
  })

  describe('moveElementById', () => {
    it('translates a shape element', () => {
      useAppStore.setState({ elements: [makeShape('sh1', { x: 10, y: 20 })] })
      useAppStore.getState().moveElementById('sh1', 5, 10)
      const el = useAppStore.getState().elements[0] as ShapeElement
      expect(el.x).toBe(15)
      expect(el.y).toBe(30)
    })

    it('translates stroke points', () => {
      useAppStore.setState({
        elements: [
          makeStroke('s1', {
            points: [
              [0, 0],
              [10, 10],
            ],
          }),
        ],
      })
      useAppStore.getState().moveElementById('s1', 5, 5)
      const el = useAppStore.getState().elements[0] as StrokeElement
      expect(el.points).toEqual([
        [5, 5],
        [15, 15],
      ])
    })

    it('translates a text element', () => {
      useAppStore.setState({ elements: [makeText('t1', { x: 50, y: 60 })] })
      useAppStore.getState().moveElementById('t1', -10, -20)
      const el = useAppStore.getState().elements[0] as TextElement
      expect(el.x).toBe(40)
      expect(el.y).toBe(40)
    })
  })

  describe('moveElementsById', () => {
    it('translates multiple elements at once', () => {
      useAppStore.setState({
        elements: [makeShape('sh1', { x: 0, y: 0 }), makeShape('sh2', { x: 50, y: 50 })],
      })
      useAppStore.getState().moveElementsById(['sh1', 'sh2'], 10, 20)
      const els = useAppStore.getState().elements as ShapeElement[]
      expect(els[0].x).toBe(10)
      expect(els[0].y).toBe(20)
      expect(els[1].x).toBe(60)
      expect(els[1].y).toBe(70)
    })
  })

  describe('resizeElementById', () => {
    it('resizes a shape with scale factors', () => {
      useAppStore.setState({ elements: [makeShape('sh1', { x: 0, y: 0, w: 100, h: 50 })] })
      useAppStore.getState().resizeElementById('sh1', 0, 0, 2, 0.5)
      const el = useAppStore.getState().elements[0] as ShapeElement
      expect(el.w).toBe(200)
      expect(el.h).toBe(25)
    })
  })

  describe('clearAll', () => {
    it('removes all elements', () => {
      useAppStore.setState({ elements: [makeStroke('s1'), makeStroke('s2')] })
      useAppStore.getState().clearAll()
      expect(useAppStore.getState().elements).toEqual([])
    })

    it('clears selectedIds', () => {
      useAppStore.setState({
        elements: [makeStroke('s1')],
        selectedIds: ['s1'],
      })
      useAppStore.getState().clearAll()
      expect(useAppStore.getState().selectedIds).toEqual([])
    })

    it('pushes a clear undo action with snapshot', () => {
      useAppStore.setState({ elements: [makeStroke('s1')] })
      useAppStore.getState().clearAll()
      const undo = useAppStore.getState().undoStack
      expect(undo).toHaveLength(1)
      expect(undo[0].type).toBe('clear')
    })
  })

  describe('setSelectedIds', () => {
    it('replaces selectedIds', () => {
      useAppStore.getState().setSelectedIds(['a', 'b'])
      expect(useAppStore.getState().selectedIds).toEqual(['a', 'b'])
    })

    it('clears selectedIds with empty array', () => {
      useAppStore.setState({ selectedIds: ['x'] })
      useAppStore.getState().setSelectedIds([])
      expect(useAppStore.getState().selectedIds).toEqual([])
    })
  })

  describe('copySelected / paste', () => {
    it('copies selected elements to clipboard', () => {
      useAppStore.setState({
        elements: [makeStroke('s1'), makeStroke('s2')],
        selectedIds: ['s1'],
      })
      useAppStore.getState().copySelected()
      expect(useAppStore.getState().clipboard).toHaveLength(1)
      expect(useAppStore.getState().clipboard[0].id).toBe('s1')
    })

    it('does nothing when nothing is selected', () => {
      useAppStore.setState({ elements: [makeStroke('s1')], selectedIds: [] })
      useAppStore.getState().copySelected()
      expect(useAppStore.getState().clipboard).toHaveLength(0)
    })

    it('pastes clipboard contents with new ids and offset', () => {
      useAppStore.setState({
        elements: [makeShape('sh1', { x: 10, y: 10 })],
        clipboard: [makeShape('sh1', { x: 10, y: 10 })],
      })
      useAppStore.getState().paste()
      const els = useAppStore.getState().elements
      expect(els).toHaveLength(2)
      // The pasted element should have a different id
      expect(els[1].id).not.toBe('sh1')
      // Should be offset by 20,20
      expect((els[1] as ShapeElement).x).toBe(30)
      expect((els[1] as ShapeElement).y).toBe(30)
    })

    it('selects pasted elements', () => {
      useAppStore.setState({
        elements: [],
        clipboard: [makeStroke('s1')],
      })
      useAppStore.getState().paste()
      expect(useAppStore.getState().selectedIds.length).toBe(1)
    })

    it('does nothing when clipboard is empty', () => {
      useAppStore.setState({ elements: [makeStroke('s1')], clipboard: [] })
      useAppStore.getState().paste()
      expect(useAppStore.getState().elements).toHaveLength(1)
    })
  })

  describe('batchErase', () => {
    it('pushes an erase undo action', () => {
      const before = [makeStroke('s1')]
      useAppStore.setState({ elements: [makeStroke('s1'), makeStroke('s2')] })
      useAppStore.getState().batchErase(before, [])
      expect(useAppStore.getState().undoStack).toHaveLength(1)
      expect(useAppStore.getState().undoStack[0].type).toBe('erase')
    })

    it('clears selectedIds', () => {
      useAppStore.setState({
        elements: [makeStroke('s1')],
        selectedIds: ['s1'],
      })
      useAppStore.getState().batchErase([], [])
      expect(useAppStore.getState().selectedIds).toEqual([])
    })
  })
})
