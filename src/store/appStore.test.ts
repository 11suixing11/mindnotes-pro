import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAppStore } from './appStore'
import { clearSaveTimer, resetSaveCache, saveDocNow } from './saveManager'
import { useToastStore } from './toastStore'
import type * as StorageModule from './storage'
import { RECOVERY_DRAFT_STORAGE_KEY } from './recovery'

vi.mock('./storage', () => {
  const store: Record<string, Record<string, unknown>> = {}
  return {
    getAll: vi.fn(async (storeName: string) => Object.values(store[storeName] ?? {})),
    get: vi.fn(async (storeName: string, id: string) => store[storeName]?.[id]),
    update: vi.fn(
      async (
        storeName: string,
        id: string,
        updater: (record: unknown) => { id: string } | undefined
      ) => {
        const next = updater(store[storeName]?.[id])
        if (next !== undefined) {
          if (!store[storeName]) store[storeName] = {}
          store[storeName][id] = next
        }
        return next
      }
    ),
    put: vi.fn(async (storeName: string, record: { id: string }) => {
      if (!store[storeName]) store[storeName] = {}
      store[storeName][record.id] = record
    }),
    del: vi.fn(async (storeName: string, id: string) => {
      delete store[storeName]?.[id]
    }),
    readLegacyDatabase: vi.fn(async () => null),
    __store: store,
  }
})

const storageMock = (await import('./storage')) as typeof StorageModule & {
  __store: Record<string, Record<string, unknown>>
}

function clearMockStorage() {
  for (const key of Object.keys(storageMock.__store)) delete storageMock.__store[key]
  vi.mocked(storageMock.getAll).mockClear()
  vi.mocked(storageMock.get).mockClear()
  vi.mocked(storageMock.put).mockClear()
  vi.mocked(storageMock.update).mockClear()
  vi.mocked(storageMock.del).mockClear()
}

describe('useAppStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    clearMockStorage()
    clearSaveTimer()
    resetSaveCache()
    useToastStore.setState({ toasts: [] })
    useAppStore.setState({
      elements: [],
      docs: [],
      currentDocId: null,
      tool: 'pen',
      brush: 'pen',
      color: '#2c2416',
      size: 4,
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    })
  })

  afterEach(() => {
    clearSaveTimer()
    vi.useRealTimers()
  })

  it('should initialize with correct default state', () => {
    const state = useAppStore.getState()
    expect(state.elements).toEqual([])
    expect(state.tool).toBe('pen')
    expect(state.color).toBe('#2c2416')
    expect(state.size).toBe(4)
  })

  it('should add a stroke element', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [
        [0, 0],
        [10, 10],
      ],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0].type).toBe('stroke')
  })

  it('should add a shape element', () => {
    useAppStore.getState().addElement({
      type: 'shape',
      id: 'sh1',
      kind: 'rectangle',
      x: 0,
      y: 0,
      w: 100,
      h: 50,
      color: '#000',
      size: 2,
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0].type).toBe('shape')
  })

  it('should add a text element', () => {
    useAppStore.getState().addElement({
      type: 'text',
      id: 't1',
      x: 10,
      y: 10,
      width: 200,
      height: 30,
      content: 'Hello',
      fontSize: 16,
      color: '#000',
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect((useAppStore.getState().elements[0] as any).content).toBe('Hello')
  })

  it('should add an image element', () => {
    useAppStore.getState().addElement({
      type: 'image',
      id: 'i1',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      dataUrl: 'data:image/png;base64,abc',
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0].type).toBe('image')
  })

  it('should remove an element', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [[0, 0]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's2',
      points: [[10, 10]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().removeElement('s1')
    expect(useAppStore.getState().elements).toHaveLength(1)
    expect(useAppStore.getState().elements[0].id).toBe('s2')
  })

  it('should move an element', () => {
    useAppStore.getState().addElement({
      type: 'shape',
      id: 'sh1',
      kind: 'rectangle',
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      color: '#000',
      size: 2,
    })
    useAppStore.getState().moveElementById('sh1', 5, 10)
    const el = useAppStore.getState().elements[0] as any
    expect(el.x).toBe(15)
    expect(el.y).toBe(30)
  })

  it('should clear all elements', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [[0, 0]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's2',
      points: [[10, 10]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().clearAll()
    expect(useAppStore.getState().elements).toHaveLength(0)
  })

  it('should set tool', () => {
    useAppStore.getState().setTool('eraser')
    expect(useAppStore.getState().tool).toBe('eraser')
  })

  it('should set color', () => {
    useAppStore.getState().setColor('#ff0000')
    expect(useAppStore.getState().color).toBe('#ff0000')
  })

  it('should set size', () => {
    useAppStore.getState().setSize(8)
    expect(useAppStore.getState().size).toBe(8)
  })

  it('should set the canvas background style', () => {
    useAppStore.getState().setBackgroundStyle('ruled')
    expect(useAppStore.getState().backgroundStyle).toBe('ruled')
  })

  it('should undo', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [[0, 0]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    expect(useAppStore.getState().elements).toHaveLength(1)
    useAppStore.getState().undo()
    expect(useAppStore.getState().elements).toHaveLength(0)
  })

  it('should redo', () => {
    useAppStore.getState().addElement({
      type: 'stroke',
      id: 's1',
      points: [[0, 0]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })
    useAppStore.getState().undo()
    useAppStore.getState().redo()
    expect(useAppStore.getState().elements).toHaveLength(1)
  })

  describe('save scheduling', () => {
    it('should set saveStatus to saving when element is added', () => {
      useAppStore.getState().addElement({
        type: 'stroke',
        id: 's1',
        points: [[0, 0]],
        color: '#000',
        size: 2,
        brush: 'pen',
      })
      expect(useAppStore.getState().saveStatus).toBe('saving')
    })

    it('should reset saveStatus to idle after save completes', async () => {
      // Initialize with a doc first
      await useAppStore.getState().createDoc('Test Doc')
      useAppStore.setState({ saveStatus: 'idle' })

      // Add element to trigger save
      useAppStore.getState().addElement({
        type: 'stroke',
        id: 's1',
        points: [[0, 0]],
        color: '#000',
        size: 2,
        brush: 'pen',
      })
      expect(useAppStore.getState().saveStatus).toBe('saving')

      // Fast-forward timer to trigger save
      await vi.advanceTimersByTimeAsync(1500)
      expect(useAppStore.getState().saveStatus).toBe('saved')

      // Wait for saved->idle transition
      await vi.advanceTimersByTimeAsync(2000)
      expect(useAppStore.getState().saveStatus).toBe('idle')
    })

    it('reports a failed write instead of claiming the document was saved', async () => {
      await useAppStore.getState().createDoc('Test Doc')
      useAppStore.setState({ saveStatus: 'idle' })
      vi.mocked(storageMock.update).mockRejectedValueOnce(new Error('quota exceeded'))

      useAppStore.getState().addElement({
        type: 'shape',
        id: 'shape-1',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 40,
        h: 40,
        color: '#000',
        size: 2,
      })
      await vi.advanceTimersByTimeAsync(1500)

      expect(useAppStore.getState().saveStatus).toBe('error')
      const toasts = useToastStore.getState().toasts
      expect(toasts[toasts.length - 1]?.message).toContain('保存失败')
      expect(localStorage.getItem(RECOVERY_DRAFT_STORAGE_KEY)).not.toBeNull()
    })

    it('preserves a rename that completes while an automatic save is waiting', async () => {
      const id = await useAppStore.getState().createDoc('Original')
      let releaseSave: (() => void) | undefined
      const saveGate = new Promise<void>((resolve) => {
        releaseSave = resolve
      })
      const defaultUpdate = vi.mocked(storageMock.update).getMockImplementation()
      if (!defaultUpdate) throw new Error('Expected an update mock implementation')
      vi.mocked(storageMock.update).mockImplementationOnce(async (...args) => {
        await saveGate
        return defaultUpdate(...args)
      })

      useAppStore.getState().addElement({
        type: 'shape',
        id: 'shape-during-save',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#000000',
        size: 2,
      })
      const savePromise = saveDocNow()
      await vi.waitFor(() => expect(storageMock.update).toHaveBeenCalledTimes(1))

      await useAppStore.getState().renameDoc(id, 'Renamed while saving')
      releaseSave?.()
      await savePromise

      expect(useAppStore.getState().docs.find((doc) => doc.id === id)?.title).toBe(
        'Renamed while saving'
      )
      expect(storageMock.__store.docs[id]).toMatchObject({
        title: 'Renamed while saving',
        elements: [expect.objectContaining({ id: 'shape-during-save' })],
      })
    })

    it('serializes overlapping saves and persists the newest generation', async () => {
      const id = await useAppStore.getState().createDoc('Concurrent')
      let releaseFirstSave: (() => void) | undefined
      const firstSaveGate = new Promise<void>((resolve) => {
        releaseFirstSave = resolve
      })
      const defaultUpdate = vi.mocked(storageMock.update).getMockImplementation()
      if (!defaultUpdate) throw new Error('Expected an update mock implementation')
      let updateCount = 0
      vi.mocked(storageMock.update).mockImplementation(async (...args) => {
        updateCount += 1
        if (updateCount === 1) await firstSaveGate
        return defaultUpdate(...args)
      })

      useAppStore.getState().addElement({
        type: 'shape',
        id: 'first-save',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#000000',
        size: 2,
      })
      const firstSave = saveDocNow()
      await vi.waitFor(() => expect(storageMock.update).toHaveBeenCalledTimes(1))

      useAppStore.getState().addElement({
        type: 'shape',
        id: 'second-save',
        kind: 'circle',
        x: 40,
        y: 40,
        w: 20,
        h: 20,
        color: '#000000',
        size: 2,
      })
      const secondSave = saveDocNow()
      expect(updateCount).toBe(1)

      releaseFirstSave?.()
      await Promise.all([firstSave, secondSave])

      expect(updateCount).toBe(2)
      const savedDoc = storageMock.__store.docs[id] as { elements: unknown[] }
      expect(savedDoc.elements).toEqual([
        expect.objectContaining({ id: 'first-save' }),
        expect.objectContaining({ id: 'second-save' }),
      ])
    })
  })
})
