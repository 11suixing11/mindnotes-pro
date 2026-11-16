import { createRef } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScreenStrokePreview from './ScreenStrokePreview'
import type { ScreenStrokePreviewHandle } from './ScreenStrokePreview'
import type { ScreenStroke } from './screenInk'
import { installNativeSvgPoints } from './nativeSvgPoints.test-support'

let native: ReturnType<typeof installNativeSvgPoints> | undefined

afterEach(() => {
  cleanup()
  native?.restore()
  native = undefined
  vi.unstubAllGlobals()
})

function stroke(id = 'first'): ScreenStroke {
  return { id, tool: 'highlight', color: '#e05d52', width: 22, points: [{ x: 10, y: 20 }] }
}

function mount() {
  const ref = createRef<ScreenStrokePreviewHandle>()
  const rendered = render(
    <svg>
      <ScreenStrokePreview ref={ref} strokes={[]} />
    </svg>
  )
  const handle = ref.current!
  const svg = rendered.container.querySelector('svg')!
  return {
    ...rendered,
    svg,
    handle,
    rerenderWith(strokes: ScreenStroke[] = []) {
      rendered.rerender(
        <svg data-unrelated="changed">
          <ScreenStrokePreview ref={ref} strokes={strokes} />
        </svg>
      )
      expect(ref.current).toBe(handle)
    },
  }
}

for (const mode of ['native', 'fallback'] as const) {
  describe(`ScreenStrokePreview ${mode}`, () => {
    it('shows an immediate dot and replaces it with the complete line using captured brush metadata', async () => {
      if (mode === 'native') native = installNativeSvgPoints()
      const { svg, handle } = mount()
      const current = stroke()
      act(() => handle.begin(current))
      const dot = svg.querySelector('circle')!
      expect(dot).not.toBeNull()
      expect(dot.getAttribute('cx')).toBe('10')
      expect(dot.getAttribute('cy')).toBe('20')
      expect(dot.getAttribute('r')).toBe('11')
      expect(dot.getAttribute('fill')).toBe('#e05d52')
      expect(dot.getAttribute('opacity')).toBe('0.3')
      current.color = '#3979cf'
      current.width = 40
      current.id = 'mutated-source-id'
      current.points.push({ x: 30, y: 40 }, { x: 50, y: 60 })
      await act(async () => handle.append(current))
      const line = svg.querySelector('polyline')!
      expect(svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
      expect(svg.querySelector('circle')).toBeNull()
      expect(line.getAttribute('data-stroke-id')).toBe('first')
      expect(line.getAttribute('points')).toBe('10,20 30,40 50,60')
      expect(line.getAttribute('stroke')).toBe('#e05d52')
      expect(line.getAttribute('stroke-width')).toBe('22')
      expect(line.getAttribute('stroke-linecap')).toBe('round')
      expect(line.getAttribute('stroke-linejoin')).toBe('round')
      expect(line.getAttribute('opacity')).toBe('0.3')
      expect(line.getAttribute('fill')).toBe('none')
      expect(svg.querySelector('g')!.hasAttribute('data-stroke-id')).toBe(false)
    })

    it('retains finished endpoint geometry through unrelated renders until matching committed ink arrives', async () => {
      if (mode === 'native') native = installNativeSvgPoints()
      const view = mount()
      const current = stroke()
      act(() => view.handle.begin(current))
      current.points.push({ x: 30, y: 40 })
      await act(async () => view.handle.append(current))
      const line = view.svg.querySelector('polyline')!
      view.rerenderWith([stroke('unrelated')])
      expect(view.svg.querySelector('polyline')).toBe(line)
      current.points.push({ x: 50, y: 60 })
      act(() => view.handle.finish(current))
      current.points.push({ x: 70, y: 80 })
      await act(async () => view.handle.append(current))
      view.rerenderWith()
      expect(line.getAttribute('points')).toBe('10,20 30,40 50,60')
      view.rerenderWith([stroke('first')])
      expect(view.svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
    })

    it('ignores stale source objects and retained calls after clear or unmount', async () => {
      if (mode === 'native') native = installNativeSvgPoints()
      const view = mount()
      const previous = stroke('second')
      const current = stroke('second')
      act(() => view.handle.begin(previous))
      act(() => view.handle.begin(current))
      previous.points.push({ x: 30, y: 40 })
      act(() => {
        view.handle.append(previous)
        view.handle.finish(previous)
      })
      expect(view.svg.querySelector('circle')!.getAttribute('data-stroke-id')).toBe('second')
      current.points.push({ x: 50, y: 60 })
      await act(async () => view.handle.append(current))
      expect(view.svg.querySelector('polyline')!.getAttribute('points')).toBe('10,20 50,60')
      act(() => view.handle.clear())
      await act(async () => view.handle.append(current))
      expect(view.svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
      view.unmount()
      act(() => {
        view.handle.begin(current)
        view.handle.append(current)
        view.handle.finish(current)
      })
      expect(view.svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
    })
  })
}

it('appends only unseen suffix points with distinct native objects and no points attribute rewrites', async () => {
  native = installNativeSvgPoints()
  const view = mount()
  const current = stroke()
  act(() => view.handle.begin(current))
  current.points.push({ x: 30, y: 40 })
  await act(async () => view.handle.append(current))
  const line = view.svg.querySelector('polyline') as SVGPolylineElement
  current.points.push({ x: 50, y: 60 }, { x: 70, y: 80 })
  expect(line.points.numberOfItems).toBe(2)
  await act(async () => view.handle.append(current))
  await act(async () => view.handle.append(current))
  view.rerenderWith()
  expect(line.points.numberOfItems).toBe(4)
  expect(native.appended).toHaveLength(4)
  expect(new Set(native.appended.map(({ point }) => point)).size).toBe(4)
  expect(native.pointAttributeWrites).toHaveLength(0)
  expect(line.getAttribute('points')).toBe('10,20 30,40 50,60 70,80')
})

it('keeps canonical fractional coordinates exact despite native float storage', async () => {
  native = installNativeSvgPoints()
  const view = mount()
  const current = stroke()
  current.points[0] = { x: 10.123456789, y: 20.987654321 }
  act(() => view.handle.begin(current))
  current.points.push({ x: 30.333333333, y: 40.666666666 })
  await act(async () => view.handle.append(current))
  const line = view.svg.querySelector('polyline') as SVGPolylineElement
  expect(line.points.getItem(1).x).toBeCloseTo(30.333333333, 4)
  expect(line.points.getItem(1).y).toBeCloseTo(40.666666666, 4)
  expect(current.points).toEqual([
    { x: 10.123456789, y: 20.987654321 },
    { x: 30.333333333, y: 40.666666666 },
  ])
})

for (const failOnAppend of [2, 4]) {
  it(`recovers all accepted geometry when native append ${failOnAppend} throws and continues with fallback`, async () => {
    native = installNativeSvgPoints({ failOnAppend })
    const view = mount()
    const current = stroke()
    act(() => view.handle.begin(current))
    current.points.push({ x: 30, y: 40 })
    await act(async () => view.handle.append(current))
    current.points.push({ x: 50, y: 60 }, { x: 70, y: 80 }, { x: 90, y: 100 })
    await act(async () => view.handle.append(current))
    expect(view.svg.querySelector('polyline')!.getAttribute('points')).toBe(
      '10,20 30,40 50,60 70,80 90,100'
    )
    const nativeCount = native.appended.length
    current.points.push({ x: 110, y: 120 })
    act(() => view.handle.finish(current))
    expect(view.svg.querySelector('polyline')!.getAttribute('points')).toBe(
      '10,20 30,40 50,60 70,80 90,100 110,120'
    )
    expect(view.svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
    expect(native.appended).toHaveLength(nativeCount)
    expect(current.points).toHaveLength(6)
  })
}

it('uses fallback when point-list support exists but createSVGPoint is unavailable', async () => {
  native = installNativeSvgPoints()
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', {
    configurable: true,
    value: undefined,
  })
  const view = mount()
  const current = stroke()
  act(() => view.handle.begin(current))
  current.points.push({ x: 30, y: 40 })
  await act(async () => view.handle.append(current))
  expect(view.svg.querySelector('polyline')!.getAttribute('points')).toBe('10,20 30,40')
  expect(native.appended).toHaveLength(0)
})

it('recovers complete geometry when creating a native point throws after initial progress', async () => {
  native = installNativeSvgPoints({ failOnCreate: 3 })
  const view = mount()
  const current = stroke()
  act(() => view.handle.begin(current))
  current.points.push({ x: 30, y: 40 })
  await act(async () => view.handle.append(current))
  current.points.push({ x: 50, y: 60 })
  await act(async () => view.handle.append(current))
  expect(view.svg.querySelector('polyline')!.getAttribute('points')).toBe('10,20 30,40 50,60')
  current.points.push({ x: 70, y: 80 })
  act(() => view.handle.finish(current))
  expect(view.svg.querySelector('polyline')!.getAttribute('points')).toBe('10,20 30,40 50,60 70,80')
})

function previewJobs() {
  const realQueue = queueMicrotask
  const pending: VoidFunction[] = []
  let holding = false
  vi.stubGlobal('queueMicrotask', (callback: VoidFunction) => {
    if (!holding) return realQueue(callback)
    pending.push(callback)
  })
  return {
    pending,
    run(callback: VoidFunction) {
      act(() => {
        holding = true
        try {
          callback()
        } finally {
          holding = false
        }
      })
    },
    flush() {
      const callbacks = pending.splice(0)
      act(() => callbacks.forEach((callback) => callback()))
    },
  }
}

for (const mode of ['native', 'fallback'] as const) {
  describe(`batched ${mode} publication`, () => {
    it('defers all suffix DOM writes to one same-task checkpoint while canonical samples stay exact', () => {
      if (mode === 'native') native = installNativeSvgPoints()
      const jobs = previewJobs()
      const view = mount()
      const current = stroke()
      jobs.run(() => view.handle.begin(current))
      current.points.push({ x: 30, y: 40 })
      jobs.run(() => view.handle.append(current))
      current.points.push({ x: 50, y: 60 })
      jobs.run(() => view.handle.append(current))
      expect(view.svg.querySelector('polyline')).toBeNull()
      expect(view.svg.querySelector('circle')!.getAttribute('cx')).toBe('10')
      expect(current.points).toEqual([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
      ])
      expect(jobs.pending).toHaveLength(1)
      jobs.flush()
      const line = view.svg.querySelector('polyline')!
      expect(line.getAttribute('points')).toBe('10,20 30,40 50,60')
      current.points.push({ x: 70, y: 80 })
      jobs.run(() => view.handle.append(current))
      current.points.push({ x: 90, y: 100 })
      jobs.run(() => view.handle.append(current))
      expect(line.getAttribute('points')).toBe('10,20 30,40 50,60')
      expect(jobs.pending).toHaveLength(1)
      jobs.flush()
      expect(view.svg.querySelector('polyline')).toBe(line)
      expect(line.getAttribute('points')).toBe('10,20 30,40 50,60 70,80 90,100')
      if (native) {
        expect(native.appended).toHaveLength(5)
        expect(new Set(native.appended.map(({ point }) => point)).size).toBe(5)
        expect(native.pointAttributeWrites).toHaveLength(0)
      }
    })

    it('flushes the released endpoint synchronously and ignores the physically retained pending callback', () => {
      if (mode === 'native') native = installNativeSvgPoints()
      const jobs = previewJobs()
      const view = mount()
      const current = stroke()
      jobs.run(() => view.handle.begin(current))
      current.points.push({ x: 30, y: 40 })
      jobs.run(() => view.handle.append(current))
      expect(jobs.pending).toHaveLength(1)
      const stale = jobs.pending[0]
      current.points.push({ x: 50, y: 60 })
      jobs.run(() => view.handle.finish(current))
      const line = view.svg.querySelector('polyline')!
      expect(line.getAttribute('points')).toBe('10,20 30,40 50,60')
      current.points.push({ x: 70, y: 80 })
      jobs.run(() => {
        stale()
        view.handle.append(current)
      })
      jobs.flush()
      expect(line.getAttribute('points')).toBe('10,20 30,40 50,60')
      expect(view.svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
    })

    for (const cancellation of ['clear', 'begin', 'unmount', 'committed'] as const) {
      it(`rejects retained callbacks after ${cancellation} without consuming a same-UUID successor job`, () => {
        if (mode === 'native') native = installNativeSvgPoints()
        const jobs = previewJobs()
        const view = mount()
        const previous = stroke('same-id')
        jobs.run(() => view.handle.begin(previous))
        previous.points.push({ x: 30, y: 40 })
        jobs.run(() => view.handle.append(previous))
        expect(jobs.pending).toHaveLength(1)
        const stale = jobs.pending[0]
        if (cancellation === 'clear') jobs.run(() => view.handle.clear())
        if (cancellation === 'committed') view.rerenderWith([stroke('same-id')])
        if (cancellation === 'unmount') view.unmount()
        const successor = cancellation === 'unmount' ? mount() : view
        const current = stroke('same-id')
        current.points[0] = { x: 100, y: 200 }
        jobs.run(() => successor.handle.begin(current))
        current.points.push({ x: 300, y: 400 })
        jobs.run(() => successor.handle.append(current))
        jobs.run(() => {
          stale()
          successor.handle.append(previous)
          successor.handle.finish(previous)
        })
        expect(successor.svg.querySelector('polyline')).toBeNull()
        expect(successor.svg.querySelector('circle')!.getAttribute('cx')).toBe('100')
        jobs.flush()
        expect(successor.svg.querySelectorAll('[data-stroke-id]')).toHaveLength(1)
        expect(successor.svg.querySelector('polyline')!.getAttribute('points')).toBe(
          '100,200 300,400'
        )
        if (cancellation === 'unmount') {
          jobs.run(() => view.handle.begin(previous))
          expect(view.svg.querySelectorAll('[data-stroke-id]')).toHaveLength(0)
        }
      })
    }
  })
}

it('continues batching fallback suffix writes after a partially successful native operation fails', () => {
  native = installNativeSvgPoints({ failOnAppend: 3 })
  const jobs = previewJobs()
  const view = mount()
  const current = stroke()
  jobs.run(() => view.handle.begin(current))
  current.points.push({ x: 30, y: 40 })
  jobs.run(() => view.handle.append(current))
  jobs.flush()
  current.points.push({ x: 50, y: 60 })
  jobs.run(() => view.handle.append(current))
  jobs.flush()
  const line = view.svg.querySelector('polyline')!
  expect(line.getAttribute('points')).toBe('10,20 30,40 50,60')
  current.points.push({ x: 70, y: 80 })
  jobs.run(() => view.handle.append(current))
  expect(line.getAttribute('points')).toBe('10,20 30,40 50,60')
  jobs.flush()
  expect(line.getAttribute('points')).toBe('10,20 30,40 50,60 70,80')
  expect(native.appended).toHaveLength(2)
})

it('does not let an invalidated callback consume a new job for the identical canonical source object', () => {
  const jobs = previewJobs()
  const view = mount()
  const current = stroke()
  jobs.run(() => view.handle.begin(current))
  current.points.push({ x: 30, y: 40 })
  jobs.run(() => view.handle.append(current))
  const stale = jobs.pending[0]
  jobs.run(() => view.handle.begin(current))
  current.points.push({ x: 50, y: 60 })
  jobs.run(() => view.handle.append(current))
  jobs.run(() => stale())
  expect(view.svg.querySelector('polyline')!.getAttribute('points')).toBe('10,20 30,40')
  jobs.flush()
  expect(view.svg.querySelector('polyline')!.getAttribute('points')).toBe('10,20 30,40 50,60')
})
