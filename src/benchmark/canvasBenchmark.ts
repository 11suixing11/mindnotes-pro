import { elementBounds } from '../canvas/canvasUtils'
import { SpatialIndex } from '../eraser/SpatialIndex'
import type { CanvasElement } from '../store/types'

export interface CanvasSpatialBenchmarkOptions {
  elementCount?: number
  queryCount?: number
}

export interface CanvasSpatialBenchmarkReport {
  elementCount: number
  queryCount: number
  indexedMs: number
  linearMs: number
  indexedResultCount: number
  linearResultCount: number
  indexedMatchesLinear: boolean
}

function normalizeCount(value: number | undefined, fallback: number, name: string): number {
  const count = value ?? fallback
  if (!Number.isFinite(count)) throw new RangeError(`${name} must be finite`)
  return Math.max(1, Math.floor(count))
}

export function createBenchmarkStrokes(elementCount: number): CanvasElement[] {
  if (!Number.isFinite(elementCount)) throw new RangeError('elementCount must be finite')
  const normalizedCount = Math.max(0, Math.floor(elementCount))
  const sideLength = Math.max(1, Math.ceil(Math.sqrt(normalizedCount)))
  const elements: CanvasElement[] = []

  for (let index = 0; index < normalizedCount; index += 1) {
    const x = (index % sideLength) * 40
    const y = Math.floor(index / sideLength) * 40
    elements.push({
      type: 'stroke',
      id: `benchmark-${index}`,
      points: [
        [x, y],
        [x + 12, y + 8],
      ],
      color: '#334155',
      size: 2,
      brush: 'pen',
    })
  }

  return elements
}

function queryBounds(queryIndex: number) {
  return {
    x: (queryIndex % 10) * 400,
    y: Math.floor(queryIndex / 10) * 400,
    w: 360,
    h: 360,
  }
}

function queryLinear(elements: CanvasElement[], bounds: ReturnType<typeof queryBounds>): string[] {
  const maxX = bounds.x + bounds.w
  const maxY = bounds.y + bounds.h
  return elements
    .filter((element) => {
      const boundsForElement = elementBounds(element)
      return (
        boundsForElement.x <= maxX &&
        boundsForElement.x + boundsForElement.w >= bounds.x &&
        boundsForElement.y <= maxY &&
        boundsForElement.y + boundsForElement.h >= bounds.y
      )
    })
    .map((element) => element.id)
}

export function runCanvasSpatialBenchmark(
  options: CanvasSpatialBenchmarkOptions = {}
): CanvasSpatialBenchmarkReport {
  const elementCount = normalizeCount(options.elementCount, 10_000, 'elementCount')
  const queryCount = normalizeCount(options.queryCount, 24, 'queryCount')
  const elements = createBenchmarkStrokes(elementCount)
  const index = new SpatialIndex()
  index.bulkLoad(elements)
  const queries = Array.from({ length: queryCount }, (_, queryIndex) => queryBounds(queryIndex))
  const indexedResults: string[][] = []

  let indexedResultCount = 0
  let linearResultCount = 0
  let indexedMatchesLinear = true

  const indexedStart = performance.now()
  for (const bounds of queries) {
    const indexedIds = index.search(bounds)
    indexedResults.push(indexedIds)
    indexedResultCount += indexedIds.length
  }
  const indexedMs = performance.now() - indexedStart

  const linearStart = performance.now()
  const linearResults = queries.map((bounds) => queryLinear(elements, bounds))
  for (const linearIds of linearResults) {
    linearResultCount += linearIds.length
  }
  const linearMs = performance.now() - linearStart

  for (let queryIndex = 0; queryIndex < queryCount; queryIndex += 1) {
    const indexedIds = new Set(indexedResults[queryIndex])
    const linearIds = linearResults[queryIndex]
    if (indexedIds.size !== linearIds.length || linearIds.some((id) => !indexedIds.has(id))) {
      indexedMatchesLinear = false
      break
    }
  }

  return {
    elementCount,
    queryCount,
    indexedMs,
    linearMs,
    indexedResultCount,
    linearResultCount,
    indexedMatchesLinear,
  }
}
