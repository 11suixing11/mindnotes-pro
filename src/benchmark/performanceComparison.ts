export const PERFORMANCE_REGRESSION_THRESHOLD = 0.2

export const HEADLESS_PERFORMANCE_METRICS = [
  'firstRenderMs',
  'dragZoomMs',
  'hitTestIndexedMs',
  'hitTestLinearMs',
  'autosaveMs',
  'backupJsonMs',
  'svgMs',
] as const

export const BROWSER_PERFORMANCE_METRICS = [
  'renderMs',
  'pngMs',
  'pdfMs',
  'svgMs',
  'autosaveMs',
] as const

export type PerformanceMetric =
  (typeof HEADLESS_PERFORMANCE_METRICS)[number] | (typeof BROWSER_PERFORMANCE_METRICS)[number]

export interface ComparablePerformanceReport {
  elementCount: number
  [metric: string]: unknown
}

export interface PerformanceComparison {
  elementCount: number
  metric: PerformanceMetric
  baselineMs: number | null
  currentMs: number | null
  changeRatio: number | null
  status: 'ok' | 'regressed' | 'missing' | 'invalid' | 'skipped'
}

export interface PerformanceComparisonResult {
  threshold: number
  passed: boolean
  comparisons: PerformanceComparison[]
  regressions: PerformanceComparison[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isUnavailableMetric(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

function normalizeReports(value: unknown): ComparablePerformanceReport[] {
  const reports = Array.isArray(value)
    ? value
    : typeof value === 'object' && value !== null && 'reports' in value
      ? (value as { reports?: unknown }).reports
      : undefined
  if (!Array.isArray(reports)) throw new TypeError('benchmark JSON must contain a reports array')

  const seenSizes = new Set<number>()
  return reports.map((report) => {
    if (typeof report !== 'object' || report === null) {
      throw new TypeError('each benchmark report must be an object')
    }
    const elementCount = (report as { elementCount?: unknown }).elementCount
    if (typeof elementCount !== 'number' || !Number.isInteger(elementCount) || elementCount < 1) {
      throw new TypeError('each benchmark report must have a positive elementCount')
    }
    if (seenSizes.has(elementCount)) {
      throw new TypeError(`benchmark reports contain duplicate elementCount ${elementCount}`)
    }
    seenSizes.add(elementCount)
    return report as ComparablePerformanceReport
  })
}

function validateBenchmarkCorrectness(reports: ComparablePerformanceReport[]): void {
  for (const report of reports) {
    // Headless reports include the indexed-vs-linear equivalence assertion.
    // Treat a false or missing assertion as a hard gate failure instead of
    // allowing timing numbers from an incorrect benchmark to pass.
    if ('firstRenderMs' in report && report.hitTestMatches !== true) {
      throw new TypeError(
        `benchmark report ${report.elementCount} did not validate indexed hit testing`
      )
    }
  }
}

function metricList(
  baseline: ComparablePerformanceReport,
  current: ComparablePerformanceReport
): PerformanceMetric[] {
  const metrics = new Set<PerformanceMetric>()
  const isHeadless = 'firstRenderMs' in baseline || 'firstRenderMs' in current
  const isBrowser =
    'renderMs' in baseline ||
    'renderMs' in current ||
    isFiniteNumber(baseline.pngMs) ||
    isFiniteNumber(current.pngMs) ||
    isFiniteNumber(baseline.pdfMs) ||
    isFiniteNumber(current.pdfMs)
  if (isHeadless) for (const metric of HEADLESS_PERFORMANCE_METRICS) metrics.add(metric)
  if (isBrowser) for (const metric of BROWSER_PERFORMANCE_METRICS) metrics.add(metric)
  if (metrics.size === 0) {
    throw new TypeError('benchmark report does not identify a headless or browser metric set')
  }
  // Compare only metrics that are represented by at least one report. This
  // keeps optional browser timings (for example renderMs) out of a headless
  // comparison when neither side emitted the field, while still preserving
  // explicit null values as intentional, skippable measurements.
  return [...metrics].filter((metric) => metric in baseline || metric in current)
}

function compareMetric(
  baseline: unknown,
  current: unknown,
  elementCount: number,
  metric: PerformanceMetric,
  threshold: number
): PerformanceComparison {
  // Headless runs intentionally report PNG/PDF as null. When both sides are
  // unavailable there is no comparable timing and the gate should skip it;
  // a one-sided value still fails closed as a missing measurement.
  if (isUnavailableMetric(baseline) && isUnavailableMetric(current)) {
    return {
      elementCount,
      metric,
      baselineMs: null,
      currentMs: null,
      changeRatio: null,
      status: 'skipped',
    }
  }

  if (!isFiniteNumber(baseline) || !isFiniteNumber(current)) {
    return {
      elementCount,
      metric,
      baselineMs: isFiniteNumber(baseline) ? baseline : null,
      currentMs: isFiniteNumber(current) ? current : null,
      changeRatio: null,
      status: isUnavailableMetric(baseline) || isUnavailableMetric(current) ? 'missing' : 'invalid',
    }
  }

  if (baseline === 0) {
    return {
      elementCount,
      metric,
      baselineMs: baseline,
      currentMs: current,
      changeRatio: current === 0 ? 0 : null,
      status: current === 0 ? 'ok' : 'regressed',
    }
  }

  const changeRatio = (current - baseline) / baseline
  return {
    elementCount,
    metric,
    baselineMs: baseline,
    currentMs: current,
    changeRatio,
    status: changeRatio > threshold ? 'regressed' : 'ok',
  }
}

/**
 * Compare two benchmark payloads and identify metrics that exceed the allowed
 * relative regression. Missing or malformed metrics fail closed so a broken
 * benchmark cannot silently pass a release gate.
 */
export function comparePerformanceReports(
  baselinePayload: unknown,
  currentPayload: unknown,
  threshold = PERFORMANCE_REGRESSION_THRESHOLD
): PerformanceComparisonResult {
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new RangeError('threshold must be a finite non-negative number')
  }

  const baselineReports = normalizeReports(baselinePayload)
  const currentReports = normalizeReports(currentPayload)
  validateBenchmarkCorrectness(baselineReports)
  validateBenchmarkCorrectness(currentReports)
  const currentBySize = new Map(currentReports.map((report) => [report.elementCount, report]))
  const comparisons: PerformanceComparison[] = []

  for (const baseline of baselineReports) {
    const current = currentBySize.get(baseline.elementCount)
    if (!current) {
      for (const metric of metricList(baseline, {} as ComparablePerformanceReport)) {
        comparisons.push({
          elementCount: baseline.elementCount,
          metric,
          baselineMs: isFiniteNumber(baseline[metric]) ? baseline[metric] : null,
          currentMs: null,
          changeRatio: null,
          status: 'missing',
        })
      }
      continue
    }

    for (const metric of metricList(baseline, current)) {
      comparisons.push(
        compareMetric(baseline[metric], current[metric], baseline.elementCount, metric, threshold)
      )
    }
  }

  for (const current of currentReports) {
    if (baselineReports.some((report) => report.elementCount === current.elementCount)) continue
    for (const metric of metricList({} as ComparablePerformanceReport, current)) {
      comparisons.push({
        elementCount: current.elementCount,
        metric,
        baselineMs: null,
        currentMs: isFiniteNumber(current[metric]) ? current[metric] : null,
        changeRatio: null,
        status: 'missing',
      })
    }
  }

  const regressions = comparisons.filter(
    (comparison) => comparison.status !== 'ok' && comparison.status !== 'skipped'
  )
  return {
    threshold,
    passed: regressions.length === 0,
    comparisons,
    regressions,
  }
}
