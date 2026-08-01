import { describe, expect, it } from 'vitest'
import { createBenchmarkStrokes, runCanvasSpatialBenchmark } from './canvasBenchmark'

describe('canvas performance benchmark', () => {
  it('generates deterministic large-document fixtures', () => {
    const elements = createBenchmarkStrokes(100)

    expect(elements).toHaveLength(100)
    expect(new Set(elements.map((element) => element.id)).size).toBe(100)
    expect(elements[0]).toMatchObject({ type: 'stroke', id: 'benchmark-0' })
    expect(elements[99]).toMatchObject({ type: 'stroke', id: 'benchmark-99' })
  })

  it('keeps indexed viewport queries equivalent to the linear baseline', () => {
    const report = runCanvasSpatialBenchmark({ elementCount: 10_000, queryCount: 24 })

    expect(report).toMatchObject({
      elementCount: 10_000,
      queryCount: 24,
      indexedMatchesLinear: true,
    })
    expect(report.indexedResultCount).toBeGreaterThan(0)
    expect(report.indexedResultCount).toBe(report.linearResultCount)
    expect(report.indexedMs).toBeGreaterThanOrEqual(0)
    expect(report.linearMs).toBeGreaterThanOrEqual(0)
  })

  it('rejects non-finite benchmark sizes before allocating work', () => {
    expect(() => createBenchmarkStrokes(Number.POSITIVE_INFINITY)).toThrow(
      'elementCount must be finite'
    )
    expect(() => runCanvasSpatialBenchmark({ queryCount: Number.POSITIVE_INFINITY })).toThrow(
      'queryCount must be finite'
    )
  })
})
