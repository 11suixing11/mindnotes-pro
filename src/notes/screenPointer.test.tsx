import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScreenAnnotationLayer from './ScreenAnnotationLayer'
import ScreenNoteEditor from './ScreenNoteEditor'
import type { ScreenInkBridge, ScreenInkState } from './floating'
import type { ScreenNote, ScreenNotebookBridge } from './screenNotebook'
import type { ScreenStroke } from './screenInk'
import { installNativeSvgPoints } from './nativeSvgPoints.test-support'

let native: ReturnType<typeof installNativeSvgPoints> | undefined

let dispatchingPointer = false

function pointer(
  svg: SVGSVGElement,
  type: string,
  pointerId: number,
  x = 80,
  y = 120,
  pointerType = 'touch'
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    buttons: 1,
    clientX: x,
    clientY: y,
  })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
    isPrimary: { value: pointerId === 1 },
  })
  act(() => {
    const previous = dispatchingPointer
    dispatchingPointer = true
    try {
      fireEvent(svg, event)
    } finally {
      dispatchingPointer = previous
    }
  })
}

function captures(svg: SVGSVGElement) {
  const active = new Set<number>()
  Object.defineProperties(svg, {
    setPointerCapture: { configurable: true, value: vi.fn((id: number) => active.add(id)) },
    hasPointerCapture: { value: (id: number) => active.has(id) },
    releasePointerCapture: { value: vi.fn((id: number) => active.delete(id)) },
  })
  return active
}

afterEach(() => {
  cleanup()
  native?.restore()
  native = undefined
  delete window.mindnotesScreen
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const ink: ScreenInkState = {
  strokes: [],
  tool: 'pen',
  color: '#e05d52',
  size: 'medium',
  inputEnabled: true,
  capturing: false,
  width: 1024,
  height: 768,
  background: null,
  source: { app: '', title: '', display: '' },
}
const note: ScreenNote = {
  id: 'pointer-note',
  title: '保存笔迹',
  comment: '',
  width: 1024,
  height: 768,
  strokes: [],
  source: { app: 'fixture', title: '独立样本', display: '' },
  createdAt: 1,
  updatedAt: 1,
  revision: 1,
  trashedAt: null,
}

type InkFixture = { tool: 'pen' | 'highlight' | 'erase'; strokes: ScreenStroke[] }

function microtasks() {
  const nativeQueueMicrotask = queueMicrotask
  const pending: VoidFunction[] = []
  const requested: VoidFunction[] = []
  vi.stubGlobal('queueMicrotask', (callback: VoidFunction) => {
    // Capture only application dispatch inside act; React's own jobs run natively.
    if (!dispatchingPointer) return nativeQueueMicrotask(callback)
    requested.push(callback)
    pending.push(callback)
  })
  return {
    pending,
    requested,
    flush() {
      const callbacks = pending.splice(0)
      act(() => callbacks.forEach((callback) => callback()))
    },
  }
}

async function checkpoint() {
  await act(async () => {
    await Promise.resolve()
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept
    reject = fail
  })
  return { promise, resolve, reject }
}

async function floating(fixture?: InkFixture, pending?: Promise<unknown>) {
  const save = vi.fn<(stroke: ScreenStroke) => Promise<void>>().mockResolvedValue(undefined)
  if (pending) save.mockImplementationOnce(() => pending.then(() => undefined))
  const erase = vi.fn().mockResolvedValue(undefined)
  let patch!: (patch: Partial<ScreenInkState>) => void
  window.mindnotesScreen = {
    surface: 'screen',
    getState: vi.fn().mockResolvedValue(fixture ? { ...ink, ...fixture } : ink),
    subscribe: (listener) => {
      patch = listener
      return () => {}
    },
    addStroke: save,
    erase,
    releasePointer: vi.fn(),
  } satisfies ScreenInkBridge
  let unmount!: () => void
  await act(async () => {
    const rendered = render(<ScreenAnnotationLayer />)
    unmount = rendered.unmount
  })
  const svg = screen.getByLabelText('透明屏幕批注层') as unknown as SVGSVGElement
  return { svg, save, erase, capture: captures(svg), patch, unmount }
}

async function editor(fixture?: InkFixture, pending?: Promise<unknown>) {
  const update = vi.fn().mockResolvedValue({ ...note, revision: 2 })
  if (pending) update.mockImplementationOnce(() => pending.then(() => ({ ...note, revision: 2 })))
  const bridge = {
    getNote: vi.fn().mockResolvedValue(fixture ? { ...note, strokes: fixture.strokes } : note),
    getImage: vi.fn().mockResolvedValue('data:image/png;base64,iVBORw0KGgo='),
    updateNote: update,
  } as unknown as ScreenNotebookBridge
  let unmount!: () => void
  await act(async () => {
    const rendered = render(<ScreenNoteEditor id={note.id} bridge={bridge} back={() => {}} />)
    unmount = rendered.unmount
  })
  const svg = screen.getByLabelText('可编辑截图批注') as unknown as SVGSVGElement
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1024, 768))
  if (fixture?.tool === 'erase') fireEvent.click(screen.getByRole('button', { name: '橡皮' }))
  if (fixture?.tool === 'highlight') fireEvent.click(screen.getByRole('button', { name: '荧光笔' }))
  return { svg, save: update, erase: update, capture: captures(svg), unmount }
}

for (const [label, mount] of [
  ['floating screen', floating],
  ['saved-screen editor', editor],
] as const) {
  describe(`${label} pointer ownership`, () => {
    it('extends the real native preview across unrelated parent updates without reappending old points', async () => {
      native = installNativeSvgPoints()
      const receipt = deferred<void>()
      const mounted = await mount(undefined, receipt.promise)
      const { svg, save } = mounted
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      await checkpoint()
      const line = svg.querySelector('polyline') as SVGPolylineElement
      expect(line?.points.numberOfItems).toBe(2)
      const id = line.getAttribute('data-stroke-id')
      if ('patch' in mounted) act(() => mounted.patch({ capturing: true }))
      else {
        fireEvent.change(screen.getByLabelText('屏幕笔记标题'), {
          target: { value: 'unrelated edit' },
        })
        fireEvent.change(screen.getByLabelText('笔记画笔颜色'), { target: { value: '#3979cf' } })
        fireEvent.change(screen.getByLabelText('笔记画笔粗细'), { target: { value: 'thick' } })
      }
      await checkpoint()
      expect(svg.querySelector('polyline')).toBe(line)
      pointer(svg, 'pointermove', 1, 220, 150)
      await checkpoint()
      expect(line.points.numberOfItems).toBe(3)
      expect(line.points.getItem(2).x).toBe(220)
      expect(line.points.getItem(2).y).toBe(150)
      expect(native.appended.filter((entry) => entry.line === line)).toHaveLength(3)
      expect(native.pointAttributeWrites.filter((entry) => entry === line)).toHaveLength(0)
      expect(line.getAttribute('stroke')).toBe('#e05d52')
      expect(line.getAttribute('stroke-width')).toBe('4')
      pointer(svg, 'pointerup', 1, 300, 180)
      await act(async () => receipt.resolve())
      const saved =
        label === 'floating screen'
          ? save.mock.calls[0][0]
          : save.mock.calls.find((call) => call[1].strokes)?.[1].strokes[0]
      expect(saved).toMatchObject({ id, color: '#e05d52', width: 4 })
      expect(saved.points).toEqual([
        { x: 80, y: 120 },
        { x: 140, y: 135 },
        { x: 220, y: 150 },
        { x: 300, y: 180 },
      ])
    })

    it('recovers a failed native append without losing pointer ownership or saved geometry', async () => {
      native = installNativeSvgPoints({ failOnAppend: 3 })
      const { svg, save, capture } = await mount()
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      expect(() => pointer(svg, 'pointermove', 1, 220, 150)).not.toThrow()
      expect(capture.has(1)).toBe(true)
      await checkpoint()
      expect(svg.querySelector('polyline')?.getAttribute('points')).toBe('80,120 140,135 220,150')
      await act(async () => pointer(svg, 'pointerup', 1, 300, 180))
      expect(capture.has(1)).toBe(false)
      const saved =
        label === 'floating screen' ? save.mock.calls[0][0] : save.mock.calls[0][1].strokes[0]
      expect(saved.points).toEqual([
        { x: 80, y: 120 },
        { x: 140, y: 135 },
        { x: 220, y: 150 },
        { x: 300, y: 180 },
      ])
    })

    it('batches accepted movements without interleaving SVG suffix writes before the checkpoint', async () => {
      const jobs = microtasks()
      const { svg, capture } = await mount()
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      pointer(svg, 'pointermove', 1, 180, 145)
      expect(svg.querySelector('polyline')).toBeNull()
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
      expect(capture.has(1)).toBe(true)
      expect(jobs.requested).toHaveLength(1)
      jobs.flush()
      await checkpoint()
      expect(svg.querySelector('polyline')?.getAttribute('points')).toBe('80,120 140,135 180,145')
    })

    it('renders a same-task movement burst at the microtask checkpoint without a frame delay', async () => {
      const waitingFrames: FrameRequestCallback[] = []
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        waitingFrames.push(callback)
        return waitingFrames.length
      })
      vi.stubGlobal('cancelAnimationFrame', () => {})
      const { svg } = await mount()
      pointer(svg, 'pointerdown', 1)
      await act(async () => {
        pointer(svg, 'pointermove', 1, 140, 135)
        pointer(svg, 'pointermove', 1, 180, 145)
        pointer(svg, 'pointermove', 1, 220, 150)
        await Promise.resolve()
      })
      await checkpoint()
      expect(svg.querySelector('polyline')?.getAttribute('points')).toBe(
        '80,120 140,135 180,145 220,150'
      )
      expect(waitingFrames).toHaveLength(0)
    })

    it('projects movement bursts while preserving every accepted canonical sample', async () => {
      const { svg, save } = await mount()
      pointer(svg, 'pointerdown', 1)
      const initial = svg.querySelector('[data-stroke-id]')!
      const id = initial.getAttribute('data-stroke-id')
      expect(initial.tagName).toBe('circle')
      pointer(svg, 'pointermove', 1, 140, 135)
      pointer(svg, 'pointermove', 1, 180, 145)
      pointer(svg, 'pointermove', 1, 220, 150)
      expect(svg.querySelector('[data-stroke-id]')!.tagName).toBe('circle')
      await checkpoint()
      expect(svg.querySelector('polyline')!.getAttribute('points')).toBe(
        '80,120 140,135 180,145 220,150'
      )
      await checkpoint()
      expect(svg.querySelector('polyline')!.getAttribute('data-stroke-id')).toBe(id)
      pointer(svg, 'pointermove', 1, 300, 180)
      pointer(svg, 'pointermove', 1, 360, 190)
      await checkpoint()
      expect(svg.querySelector('polyline')!.getAttribute('points')).toBe(
        '80,120 140,135 180,145 220,150 300,180 360,190'
      )
      await act(async () => pointer(svg, 'pointerup', 1, 400, 200))
      const saved =
        label === 'floating screen' ? save.mock.calls[0][0] : save.mock.calls[0][1].strokes[0]
      expect(saved.id).toBe(id)
      expect(saved.points).toEqual([
        { x: 80, y: 120 },
        { x: 140, y: 135 },
        { x: 180, y: 145 },
        { x: 220, y: 150 },
        { x: 300, y: 180 },
        { x: 360, y: 190 },
        { x: 400, y: 200 },
      ])
    })

    it('shows complete released geometry before an pending save receipt without a duplicate', async () => {
      const receipt = deferred<void>()
      const { svg, save } = await mount(undefined, receipt.promise)
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      pointer(svg, 'pointerup', 1, 220, 150)
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
      await checkpoint()
      expect(svg.querySelector('polyline')!.getAttribute('points')).toBe('80,120 140,135 220,150')
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
      await checkpoint()
      expect(svg.querySelector('polyline')!.getAttribute('points')).toBe('80,120 140,135 220,150')
      const saved =
        label === 'floating screen' ? save.mock.calls[0][0] : save.mock.calls[0][1].strokes[0]
      expect(saved.points.at(-1)).toEqual({ x: 220, y: 150 })
      await act(async () => receipt.resolve())
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(
        label === 'floating screen' ? 0 : 1
      )
    })

    for (const cancellation of ['pointercancel', 'lostpointercapture'] as const) {
      it(`clears ${cancellation} geometry before a same-pointer successor`, async () => {
        const { svg, save, capture } = await mount()
        pointer(svg, 'pointerdown', 1, 80, 120, 'mouse')
        const oldId = svg.querySelector('[data-stroke-id]')!.getAttribute('data-stroke-id')
        pointer(svg, 'pointermove', 1, 140, 135, 'mouse')
        if (cancellation === 'lostpointercapture') capture.delete(1)
        pointer(svg, cancellation, 1, 140, 135, 'mouse')
        expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
        pointer(svg, 'pointerdown', 1, 300, 250, 'mouse')
        const newId = svg.querySelector('[data-stroke-id]')!.getAttribute('data-stroke-id')
        pointer(svg, 'pointermove', 1, 360, 265, 'mouse')
        expect(svg.querySelector('[data-stroke-id]')!.getAttribute('data-stroke-id')).toBe(newId)
        expect(newId).not.toBe(oldId)
        await checkpoint()
        expect(svg.querySelector('polyline')!.getAttribute('points')).toBe('300,250 360,265')
        await act(async () => pointer(svg, 'pointerup', 1, 400, 280, 'mouse'))
        expect(save).toHaveBeenCalledTimes(1)
        const saved =
          label === 'floating screen' ? save.mock.calls[0][0] : save.mock.calls[0][1].strokes[0]
        expect(saved.id).toBe(newId)
        expect(saved.points).toEqual([
          { x: 300, y: 250 },
          { x: 360, y: 265 },
          { x: 400, y: 280 },
        ])
      })
    }

    it('isolates unmounted preview geometry and an older save receipt from the next instance', async () => {
      const receipt = deferred<void>()
      const first = await mount(undefined, receipt.promise)
      pointer(first.svg, 'pointerdown', 1)
      pointer(first.svg, 'pointermove', 1, 140, 135)
      pointer(first.svg, 'pointerup', 1, 220, 150)
      pointer(first.svg, 'pointerdown', 1, 300, 250)
      pointer(first.svg, 'pointermove', 1, 360, 265)
      first.unmount()
      const next = await mount()
      pointer(next.svg, 'pointerdown', 1, 500, 400)
      const nextId = next.svg.querySelector('[data-stroke-id]')!.getAttribute('data-stroke-id')
      pointer(next.svg, 'pointermove', 1, 560, 420)
      await act(async () => {
        receipt.resolve()
      })
      expect(next.svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
      await checkpoint()
      expect(next.svg.querySelector('polyline')!.getAttribute('data-stroke-id')).toBe(nextId)
      await checkpoint()
      expect(next.svg.querySelector('polyline')!.getAttribute('points')).toBe('500,400 560,420')
    })

    it('keeps the captured highlighter brush and immediate dot through batched line projection', async () => {
      const { svg, save } = await mount({ tool: 'highlight', strokes: [] })
      pointer(svg, 'pointerdown', 1)
      const initial = svg.querySelector('circle')!
      const id = initial.getAttribute('data-stroke-id')
      expect(initial.getAttribute('r')).toBe('11')
      expect(initial.getAttribute('fill')).toBe('#e05d52')
      expect(initial.getAttribute('opacity')).toBe('0.3')
      if (label === 'saved-screen editor') {
        fireEvent.change(screen.getByLabelText('笔记画笔颜色'), { target: { value: '#3979cf' } })
        fireEvent.change(screen.getByLabelText('笔记画笔粗细'), { target: { value: 'thick' } })
      }
      pointer(svg, 'pointermove', 1, 140, 135)
      await checkpoint()
      const line = svg.querySelector('polyline')!
      expect(line.getAttribute('data-stroke-id')).toBe(id)
      expect(line.getAttribute('stroke')).toBe('#e05d52')
      expect(line.getAttribute('stroke-width')).toBe('22')
      expect(line.getAttribute('stroke-linecap')).toBe('round')
      expect(line.getAttribute('stroke-linejoin')).toBe('round')
      expect(line.getAttribute('opacity')).toBe('0.3')
      await act(async () => pointer(svg, 'pointerup', 1, 220, 150))
      const saved =
        label === 'floating screen' ? save.mock.calls[0][0] : save.mock.calls[0][1].strokes[0]
      expect(saved).toMatchObject({ id, tool: 'highlight', width: 22, color: '#e05d52' })
    })

    for (const pointCount of [7_999, 8_000]) {
      it(`preserves the 8000-point cap when releasing after ${pointCount} accepted points`, async () => {
        const receipt = deferred<void>()
        const { svg, save } = await mount(undefined, receipt.promise)
        pointer(svg, 'pointerdown', 1, 80, 120)
        act(() => {
          for (let index = 1; index < pointCount; index++)
            pointer(svg, 'pointermove', 1, index % 2 ? 140 : 80, 120)
        })
        pointer(svg, 'pointerup', 1, 220, 150)
        const saved =
          label === 'floating screen' ? save.mock.calls[0][0] : save.mock.calls[0][1].strokes[0]
        expect(saved.points).toHaveLength(8_000)
        expect(saved.points[0]).toEqual({ x: 80, y: 120 })
        expect(saved.points.at(-1)).toEqual(
          pointCount === 7_999 ? { x: 220, y: 150 } : { x: 140, y: 120 }
        )
        await checkpoint()
        expect(svg.querySelector('polyline')!.getAttribute('points')!.split(' ')).toHaveLength(
          8_000
        )
        await act(async () => receipt.resolve())
      })
    }

    it('keeps the active stroke when a rejected second touch is cancelled', async () => {
      const { svg, save, capture } = await mount()
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      pointer(svg, 'pointerdown', 2, 500, 400)
      pointer(svg, 'pointercancel', 2, 500, 400)
      expect(capture.has(1)).toBe(true)
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
      pointer(svg, 'pointermove', 1, 220, 150)
      await act(async () => {
        pointer(svg, 'pointerup', 1, 220, 150)
      })
      expect(save).toHaveBeenCalledTimes(1)
      const saved =
        label === 'floating screen' ? save.mock.calls[0][0] : save.mock.calls[0][1].strokes[0]
      expect(saved.points).toHaveLength(3)
      expect(saved.points[0]).toEqual({ x: 80, y: 120 })
      expect(saved.points[2]).toEqual({ x: 220, y: 150 })
      expect(capture.has(1)).toBe(false)
    })

    it('discards an owned cancellation and accepts the next stroke', async () => {
      const { svg, save, capture } = await mount()
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      pointer(svg, 'pointercancel', 1)
      expect(capture.has(1)).toBe(false)
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
      expect(save).not.toHaveBeenCalled()
      pointer(svg, 'pointerdown', 1, 300, 250)
      pointer(svg, 'pointermove', 1, 360, 265)
      await act(async () => {
        pointer(svg, 'pointerup', 1, 360, 265)
      })
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('ignores a delayed lost-capture event while the current pointer owns capture', async () => {
      const { svg, save, capture } = await mount()
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      pointer(svg, 'lostpointercapture', 1)
      expect(capture.has(1)).toBe(true)
      pointer(svg, 'pointermove', 1, 220, 150)
      await act(async () => {
        pointer(svg, 'pointerup', 1, 220, 150)
      })
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('preserves the released endpoint after the last movement sample', async () => {
      const { svg, save } = await mount()
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      await act(async () => {
        pointer(svg, 'pointerup', 1, 220, 150)
      })
      const saved =
        label === 'floating screen' ? save.mock.calls[0][0] : save.mock.calls[0][1].strokes[0]
      expect(saved.points).toEqual([
        { x: 80, y: 120 },
        { x: 140, y: 135 },
        { x: 220, y: 150 },
      ])
    })

    it('records a rapid released line even when no move event was delivered', async () => {
      const { svg, save } = await mount()
      pointer(svg, 'pointerdown', 1)
      await act(async () => {
        pointer(svg, 'pointerup', 1, 220, 150)
      })
      const saved =
        label === 'floating screen' ? save.mock.calls[0][0] : save.mock.calls[0][1].strokes[0]
      expect(saved.points).toEqual([
        { x: 80, y: 120 },
        { x: 220, y: 150 },
      ])
    })

    it('ignores capture acquisition failure and accepts the next actual gesture', async () => {
      const { svg, save, capture } = await mount()
      vi.mocked(svg.setPointerCapture).mockImplementationOnce(() => {
        throw new DOMException('Contact already cancelled', 'NotFoundError')
      })
      expect(() => pointer(svg, 'pointerdown', 1)).not.toThrow()
      expect(capture.has(1)).toBe(false)
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
      pointer(svg, 'pointermove', 1, 140, 135)
      await act(async () => {
        pointer(svg, 'pointerup', 1, 220, 150)
      })
      expect(save).not.toHaveBeenCalled()
      pointer(svg, 'pointerdown', 1, 300, 250)
      await act(async () => {
        pointer(svg, 'pointerup', 1, 360, 265)
      })
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('rejects a nonprimary touch arriving after the primary began outside this surface', async () => {
      const { svg, save, capture } = await mount()
      pointer(svg, 'pointerdown', 2, 300, 250)
      pointer(svg, 'pointermove', 2, 360, 265)
      await act(async () => {
        pointer(svg, 'pointerup', 2, 360, 265)
      })
      expect(capture.size).toBe(0)
      expect(save).not.toHaveBeenCalled()
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
    })

    it('erases a stroke crossed only by the released endpoint', async () => {
      const stroke: ScreenStroke = {
        id: 'crossed-at-release',
        tool: 'pen',
        color: '#e05d52',
        width: 4,
        points: [
          { x: 220, y: 100 },
          { x: 220, y: 180 },
        ],
      }
      const { svg, erase } = await mount({ tool: 'erase', strokes: [stroke] })
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
      await act(async () => {
        pointer(svg, 'pointerup', 1, 220, 150)
      })
      expect(erase).toHaveBeenCalledTimes(1)
      if (label === 'floating screen') {
        expect(erase.mock.calls[0][0]).toEqual([
          { x: 80, y: 120 },
          { x: 140, y: 135 },
          { x: 220, y: 150 },
        ])
      } else {
        expect(erase.mock.calls[0][1].strokes).toEqual([])
      }
    })
  })
}

describe('floating preview receipts and resets', () => {
  for (const outcome of ['resolve', 'reject'] as const) {
    it(`isolates an older ${outcome} receipt's final cleanup from the newer draft before any mode patch`, async () => {
      const receipt = deferred<void>()
      const { svg } = await floating(undefined, receipt.promise)
      // Deliberately defer the external pointer-mode broadcast to isolate .finally.
      // A rejected receipt still requests releasePointer; the next test covers its patch.
      pointer(svg, 'pointerdown', 1)
      pointer(svg, 'pointermove', 1, 140, 135)
      pointer(svg, 'pointerup', 1, 220, 150)
      pointer(svg, 'pointerdown', 1, 300, 250)
      const id = svg.querySelector('[data-stroke-id]')!.getAttribute('data-stroke-id')
      pointer(svg, 'pointermove', 1, 360, 265)
      await act(async () => {
        if (outcome === 'resolve') receipt.resolve()
        else receipt.reject(new Error('durable save unavailable'))
      })
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
      await checkpoint()
      expect(svg.querySelector('polyline')!.getAttribute('data-stroke-id')).toBe(id)
      await checkpoint()
      expect(svg.querySelector('polyline')!.getAttribute('points')).toBe('300,250 360,265')
    })
  }

  it('cancels a newer gesture when an older rejected receipt broadcasts the existing pointer-mode policy', async () => {
    const receipt = deferred<void>()
    const { svg, save, capture, patch } = await floating(undefined, receipt.promise)
    vi.mocked(window.mindnotesScreen!.releasePointer).mockImplementation(() => {
      patch({ tool: 'pointer', inputEnabled: false })
    })
    pointer(svg, 'pointerdown', 1)
    pointer(svg, 'pointermove', 1, 140, 135)
    pointer(svg, 'pointerup', 1, 220, 150)
    pointer(svg, 'pointerdown', 1, 300, 250)
    pointer(svg, 'pointermove', 1, 360, 265)
    await act(async () => receipt.reject(new Error('durable save unavailable')))
    expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
    expect(svg.style.pointerEvents).toBe('none')
    expect(capture.has(1)).toBe(false)
    await act(async () => pointer(svg, 'pointerup', 1, 400, 280))
    expect(save).toHaveBeenCalledTimes(1)
  })

  for (const patch of [
    { inputEnabled: false },
    { tool: 'highlight' },
    { color: '#e0a11b' },
    { size: 'thick' },
  ] as const) {
    it(`cancels active geometry when state changes ${Object.keys(patch)[0]}`, async () => {
      const mounted = await floating()
      pointer(mounted.svg, 'pointerdown', 1)
      pointer(mounted.svg, 'pointermove', 1, 140, 135)
      act(() => mounted.patch(patch))
      expect(mounted.capture.has(1)).toBe(false)
      expect(mounted.svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
      act(() => mounted.patch(ink))
      pointer(mounted.svg, 'pointerdown', 1, 300, 250)
      pointer(mounted.svg, 'pointermove', 1, 360, 265)
      await checkpoint()
      expect(mounted.svg.querySelector('polyline')!.getAttribute('points')).toBe('300,250 360,265')
    })
  }

  it('suppresses the final preview when the matching stroke arrives before its receipt', async () => {
    const receipt = deferred<void>()
    const { svg, save, patch } = await floating(undefined, receipt.promise)
    pointer(svg, 'pointerdown', 1)
    pointer(svg, 'pointermove', 1, 140, 135)
    pointer(svg, 'pointerup', 1, 220, 150)
    const saved = save.mock.calls[0][0]
    act(() => patch({ strokes: [saved] }))
    expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
    await checkpoint()
    expect(svg.querySelector('polyline')!.getAttribute('points')).toBe('80,120 140,135 220,150')
    await act(async () => receipt.resolve())
    expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
  })
})

describe('editor preview cancellation and saving', () => {
  it('clears Escape geometry before starting another stroke with the same pointer', async () => {
    const { svg, save } = await editor()
    pointer(svg, 'pointerdown', 1)
    pointer(svg, 'pointermove', 1, 140, 135)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
    pointer(svg, 'pointerdown', 1, 300, 250)
    pointer(svg, 'pointermove', 1, 360, 265)
    await checkpoint()
    expect(svg.querySelector('polyline')!.getAttribute('points')).toBe('300,250 360,265')
    await act(async () => pointer(svg, 'pointerup', 1, 400, 280))
    expect(save.mock.calls[0][1].strokes[0].points[0]).toEqual({ x: 300, y: 250 })
  })

  it('retains one optimistic committed stroke after a rejected pending save', async () => {
    const receipt = deferred<void>()
    const { svg } = await editor(undefined, receipt.promise)
    pointer(svg, 'pointerdown', 1)
    pointer(svg, 'pointermove', 1, 140, 135)
    pointer(svg, 'pointerup', 1, 220, 150)
    await act(async () => receipt.reject(new Error('durable save unavailable')))
    expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
    await checkpoint()
    expect(svg.querySelector('polyline')!.getAttribute('points')).toBe('80,120 140,135 220,150')
    expect(screen.getByLabelText('屏幕笔记保存状态').textContent).toBe('保存失败')
    expect(screen.getByRole('button', { name: '重试保存' })).not.toBeNull()
  })
})
