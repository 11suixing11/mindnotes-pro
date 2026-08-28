import { describe, expect, it } from 'vitest'
import {
  PERFORMANCE_DATASET_SIZES,
  createPerformanceDataset,
  measureBrowserIndexedDbWrite,
  runPerformanceBenchmark,
} from './performanceBenchmark'

describe('release performance baseline', () => {
  it('exposes the fixed 100/1000/5000 dataset sizes', () => {
    expect(PERFORMANCE_DATASET_SIZES).toEqual([100, 1_000, 5_000])
    for (const size of PERFORMANCE_DATASET_SIZES) {
      const fixture = createPerformanceDataset(size)
      expect(fixture.elements).toHaveLength(size)
      expect(new Set(fixture.elements.map((element) => element.id)).size).toBe(size)
      expect(fixture.layers).toHaveLength(1)
      expect(fixture.document.elements).toBe(fixture.elements)
    }
  })

  it('produces deterministic mixed element fixtures', () => {
    const first = createPerformanceDataset(100)
    const second = createPerformanceDataset(100)
    expect(first.elements).toEqual(second.elements)
    expect(first.document).toEqual(second.document)
    expect(new Set(first.elements.map((element) => element.type))).toEqual(
      new Set(['stroke', 'shape', 'text'])
    )
  })

  it('runs all headless metrics and validates indexed hit testing', () => {
    const [report] = runPerformanceBenchmark({ sizes: [100], iterations: 1, queryCount: 8 })
    expect(report).toMatchObject({
      elementCount: 100,
      iterations: 1,
      queryCount: 8,
      hitTestMatches: true,
      pngMs: null,
      pdfMs: null,
    })
    for (const metric of [
      report.firstRenderMs,
      report.dragZoomMs,
      report.hitTestIndexedMs,
      report.hitTestLinearMs,
      report.autosaveMs,
      report.backupJsonMs,
      report.svgMs,
    ]) {
      expect(metric).toBeGreaterThanOrEqual(0)
    }
    expect(report.backupBytes).toBeGreaterThan(0)
    expect(report.svgBytes).toBeGreaterThan(0)
  })

  it('rejects invalid benchmark options before allocating a fixture', () => {
    expect(() => createPerformanceDataset(0)).toThrow('elementCount must be at least 1')
    expect(() => runPerformanceBenchmark({ iterations: 0 })).toThrow(
      'iterations must be at least 1'
    )
    expect(() => runPerformanceBenchmark({ sizes: [] })).toThrow('sizes must not be empty')
  })

  it('validates browser autosave iteration count before opening IndexedDB', async () => {
    const fixture = createPerformanceDataset(1)
    await expect(measureBrowserIndexedDbWrite(fixture.document, 0)).rejects.toThrow(
      'autosaveIterations must be at least 1'
    )
  })
})
