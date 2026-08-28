import { describe, expect, it } from 'vitest'
import {
  PERFORMANCE_REGRESSION_THRESHOLD,
  comparePerformanceReports,
} from './performanceComparison'

function payload(overrides: Record<string, unknown> = {}) {
  return {
    reports: [
      {
        elementCount: 100,
        hitTestMatches: true,
        firstRenderMs: 10,
        dragZoomMs: 5,
        hitTestIndexedMs: 2,
        hitTestLinearMs: 4,
        autosaveMs: 3,
        backupJsonMs: 6,
        svgMs: 8,
        ...overrides,
      },
    ],
  }
}

describe('performance baseline comparison', () => {
  it('passes values within the 20 percent gate', () => {
    const result = comparePerformanceReports(payload(), payload({ firstRenderMs: 12 }))
    expect(result.threshold).toBe(PERFORMANCE_REGRESSION_THRESHOLD)
    expect(result.passed).toBe(true)
    expect(result.regressions).toEqual([])
  })

  it('fails when any key metric exceeds the threshold', () => {
    const result = comparePerformanceReports(payload(), payload({ svgMs: 9.61 }))
    expect(result.passed).toBe(false)
    expect(result.regressions).toEqual([
      expect.objectContaining({
        elementCount: 100,
        metric: 'svgMs',
        status: 'regressed',
      }),
    ])
  })

  it('fails closed for missing sizes and metrics', () => {
    const result = comparePerformanceReports(payload(), { reports: [] })
    expect(result.passed).toBe(false)
    expect(result.regressions.every((comparison) => comparison.status === 'missing')).toBe(true)
  })

  it('skips metrics intentionally unavailable on both sides', () => {
    const browserPayload = {
      reports: [
        {
          elementCount: 100,
          renderMs: 10,
          pngMs: null,
          pdfMs: null,
          svgMs: 8,
          autosaveMs: 3,
        },
      ],
    }
    const result = comparePerformanceReports(browserPayload, browserPayload)
    expect(result.passed).toBe(true)
    expect(result.comparisons.filter((comparison) => comparison.status === 'skipped')).toHaveLength(
      2
    )
  })

  it('handles a zero baseline without dividing by zero', () => {
    const result = comparePerformanceReports(
      payload({ firstRenderMs: 0 }),
      payload({ firstRenderMs: 0 })
    )
    expect(result.passed).toBe(true)
    expect(
      result.comparisons.find((comparison) => comparison.metric === 'firstRenderMs')
    ).toMatchObject({ changeRatio: 0, status: 'ok' })
  })

  it('rejects headless reports that did not prove indexed hit-test equivalence', () => {
    expect(() =>
      comparePerformanceReports(
        { reports: [{ ...payload().reports[0], hitTestMatches: false }] },
        payload()
      )
    ).toThrow('did not validate indexed hit testing')
  })
})
