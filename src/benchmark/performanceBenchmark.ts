import type { CanvasElement, CanvasDoc, CanvasLayer } from '../core/model'
import { getRenderableElements } from '../store/layers'
import { createCanvasBackup } from '../store/backup'
import { elementBounds } from '../canvas/canvasUtils'
import { buildSVGString } from '../canvas/svgExport'
import { canvasToBlob, renderDocumentToCanvas } from '../canvas/documentExport'
import { findTopmostElementAtPoint } from '../canvas/hitTesting'
import { worldToClient, zoomViewBoxAtScreenPoint } from '../canvas/coordinates'
import { panViewBox } from '../core/viewport'
import { SpatialIndex } from '../eraser/SpatialIndex'

/** Fixed document sizes used by the release performance baseline. */
export const PERFORMANCE_DATASET_SIZES = [100, 1_000, 5_000] as const

export type PerformanceDatasetSize = (typeof PERFORMANCE_DATASET_SIZES)[number]

export interface PerformanceDataset {
  elements: CanvasElement[]
  layers: CanvasLayer[]
  document: CanvasDoc
}

export interface PerformanceBenchmarkOptions {
  /** Number of repetitions per metric. Defaults to one. */
  iterations?: number
  /** Number of deterministic hit-test points per repetition. */
  queryCount?: number
  /** Override the default fixed dataset sizes for focused local runs. */
  sizes?: readonly number[]
}

export interface PerformanceBenchmarkReport {
  elementCount: number
  iterations: number
  queryCount: number
  /** Headless render preparation time (element ordering and bounds). */
  firstRenderMs: number
  dragZoomMs: number
  hitTestIndexedMs: number
  hitTestLinearMs: number
  hitTestMatches: boolean
  /** Structured-clone snapshot cost used by IndexedDB as an autosave baseline. */
  autosaveMs: number
  /** JSON backup serialization cost, useful for recovery/export comparisons. */
  backupJsonMs: number
  svgMs: number
  backupBytes: number
  svgBytes: number
  /** PNG/PDF require a real browser Canvas and are measured by the browser helper. */
  pngMs: number | null
  pdfMs: number | null
}

export interface BrowserExportBenchmarkReport {
  elementCount: number
  renderMs: number
  pngMs: number
  pdfMs: number
  svgMs: number
  /** Average steady-state IndexedDB put transaction time in a temp DB. */
  autosaveMs: number
  pngBytes: number
  pdfBytes: number
  svgBytes: number
}

const BENCHMARK_LAYER: CanvasLayer = {
  id: 'benchmark-layer',
  name: 'Benchmark',
  visible: true,
  locked: false,
  order: 0,
  createdAt: 0,
  updatedAt: 0,
}

function normalizeCount(value: number, name: string, minimum = 1): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
  const count = Math.floor(value)
  if (count < minimum) throw new RangeError(`${name} must be at least ${minimum}`)
  return count
}

function measure(operation: () => void): number {
  const startedAt = performance.now()
  operation()
  return Math.max(0, performance.now() - startedAt)
}

function averageMeasure(iterations: number, operation: () => void): number {
  let total = 0
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    total += measure(operation)
  }
  return total / iterations
}

function benchmarkPoint(index: number): { x: number; y: number } {
  const column = index % 20
  const row = Math.floor(index / 20)
  return { x: column * 90 + 24, y: row * 64 + 24 }
}

function createStroke(index: number, x: number, y: number): CanvasElement {
  return {
    type: 'stroke',
    id: `benchmark-${index}`,
    layerId: BENCHMARK_LAYER.id,
    points: [
      [x, y],
      [x + 12, y + 4],
      [x + 24, y + 1],
      [x + 36, y + 8],
    ],
    color: '#334155',
    size: 2,
    brush: 'pen',
  }
}

function createShape(index: number, x: number, y: number): CanvasElement {
  const kind = (['rectangle', 'circle', 'line', 'arrow'] as const)[index % 4]
  return {
    type: 'shape',
    id: `benchmark-${index}`,
    layerId: BENCHMARK_LAYER.id,
    kind,
    x,
    y,
    w: 48,
    h: 32,
    color: '#2563eb',
    size: 2,
    fillColor: kind === 'rectangle' && index % 8 === 0 ? '#dbeafe' : undefined,
  }
}

function createText(index: number, x: number, y: number): CanvasElement {
  return {
    type: 'text',
    id: `benchmark-${index}`,
    layerId: BENCHMARK_LAYER.id,
    x,
    y,
    width: 120,
    height: 24,
    content: `Note ${index}`,
    fontSize: 16,
    color: '#0f172a',
  }
}

/**
 * Generate the fixed, deterministic fixture used by all performance runs.
 * The fixture intentionally mixes the element types exercised by rendering,
 * hit testing, SVG export, and persistence without embedding image payloads.
 */
export function createPerformanceDataset(elementCount: number): PerformanceDataset {
  const count = normalizeCount(elementCount, 'elementCount')
  const elements: CanvasElement[] = []

  for (let index = 0; index < count; index += 1) {
    const point = benchmarkPoint(index)
    const kind = index % 3
    elements.push(
      kind === 0
        ? createStroke(index, point.x, point.y)
        : kind === 1
          ? createShape(index, point.x, point.y)
          : createText(index, point.x, point.y)
    )
  }

  const layers = [{ ...BENCHMARK_LAYER }]
  const document: CanvasDoc = {
    schemaVersion: 5,
    id: `benchmark-document-${count}`,
    title: `Performance fixture ${count}`,
    elements,
    layers,
    activeLayerId: BENCHMARK_LAYER.id,
    bgColor: '#ffffff',
    backgroundStyle: 'plain',
    folderId: null,
    createdAt: 0,
    updatedAt: 0,
  }

  return { elements, layers, document }
}

function runHitTestBenchmark(
  fixture: PerformanceDataset,
  queryCount: number,
  iterations: number
): Pick<PerformanceBenchmarkReport, 'hitTestIndexedMs' | 'hitTestLinearMs' | 'hitTestMatches'> {
  const { elements, layers } = fixture
  const renderableElements = getRenderableElements(elements, layers)
  const idToElement = new Map(elements.map((element) => [element.id, element]))
  const idToIndex = new Map(elements.map((element, index) => [element.id, index]))
  const layerOrder = new Map(layers.map((layer) => [layer.id, layer.order]))
  const index = new SpatialIndex()
  index.bulkLoad(elements)
  const points = Array.from({ length: queryCount }, (_, queryIndex) => benchmarkPoint(queryIndex))
  let hitTestMatches = true
  let indexedSink = 0
  let linearSink = 0

  const commonOptions = {
    tolerance: 12,
    elements,
    layers,
    idToElement,
    idToIndex,
    getBounds: elementBounds,
    isElementEditable: () => true,
    getLayerId: (element: CanvasElement) => element.layerId ?? BENCHMARK_LAYER.id,
    getLayerOrder: () => layerOrder,
    getRenderableElements: () => renderableElements,
  }

  // Resolve the linear answers once so indexed and linear timings measure
  // separate workloads. The comparison itself is outside the timed path.
  const expectedHits = points.map(
    (point) => findTopmostElementAtPoint({ ...commonOptions, point })?.id ?? null
  )

  const indexedMs = averageMeasure(iterations, () => {
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const point = points[pointIndex]
      const candidateIds = index.search({ x: point.x - 40, y: point.y - 40, w: 80, h: 80 })
      const indexedHit = findTopmostElementAtPoint({
        ...commonOptions,
        point,
        candidateIds,
      })
      if ((indexedHit?.id ?? null) !== expectedHits[pointIndex]) hitTestMatches = false
      indexedSink += indexedHit ? 1 : 0
    }
  })

  const linearMs = averageMeasure(iterations, () => {
    for (const point of points) {
      const linearHit = findTopmostElementAtPoint({ ...commonOptions, point })
      linearSink += linearHit ? 1 : 0
    }
  })

  // Both paths should observe the same number of hits. This also keeps the
  // benchmark honest if a future candidate filter accidentally drops a hit.
  if (indexedSink !== linearSink) hitTestMatches = false

  return { hitTestIndexedMs: indexedMs, hitTestLinearMs: linearMs, hitTestMatches }
}

function measureAutosaveSnapshot(document: CanvasDoc, iterations: number): number {
  let sink: CanvasDoc | string = document
  const clone = (
    globalThis as typeof globalThis & {
      structuredClone?: <T>(value: T) => T
    }
  ).structuredClone
  const duration = averageMeasure(iterations, () => {
    sink = clone ? clone(document) : JSON.stringify(document)
  })
  if (!sink) throw new Error('autosave benchmark produced an empty snapshot')
  return duration
}

/** Run the repeatable headless baseline for each requested document size. */
export function runPerformanceBenchmark(
  options: PerformanceBenchmarkOptions = {}
): PerformanceBenchmarkReport[] {
  const iterations = normalizeCount(options.iterations ?? 1, 'iterations')
  const queryCount = normalizeCount(options.queryCount ?? 24, 'queryCount')
  const sizes = options.sizes ?? PERFORMANCE_DATASET_SIZES
  if (sizes.length === 0) throw new RangeError('sizes must not be empty')

  return sizes.map((requestedCount) => {
    const elementCount = normalizeCount(requestedCount, 'elementCount')
    const fixture = createPerformanceDataset(elementCount)
    let renderSink = 0
    const firstRenderMs = averageMeasure(iterations, () => {
      const visibleElements = getRenderableElements(fixture.elements, fixture.layers)
      for (const element of visibleElements) renderSink += elementBounds(element).w
    })
    if (!Number.isFinite(renderSink)) throw new Error('render benchmark produced an invalid result')

    let viewBox = { x: 0, y: 0, zoom: 1 }
    const viewportIndex = new SpatialIndex()
    viewportIndex.bulkLoad(fixture.elements)
    const renderableElements = getRenderableElements(fixture.elements, fixture.layers)
    const elementById = new Map(fixture.elements.map((element) => [element.id, element]))
    let frameSink = 0
    const dragZoomMs = averageMeasure(iterations, () => {
      viewBox = { x: 0, y: 0, zoom: 1 }
      for (let step = 0; step < queryCount * 8; step += 1) {
        const previous = { x: step, y: step * 0.5 }
        const next = { x: step + 3, y: step * 0.5 + 2 }
        viewBox = panViewBox(viewBox, previous, next)
        viewBox = zoomViewBoxAtScreenPoint(viewBox, { x: 240, y: 180 }, 1 + ((step % 8) + 1) / 10)

        // Model the renderer's per-frame viewport work in addition to the
        // arithmetic: query the spatial index, filter renderable elements,
        // and project visible bounds into screen coordinates. Canvas paint is
        // measured separately by the browser benchmark.
        const visibleIds = viewportIndex.queryVisible(
          viewBox.x,
          viewBox.y,
          1_280 / viewBox.zoom,
          800 / viewBox.zoom
        )
        const visibleSet = new Set(visibleIds)
        for (const element of renderableElements) {
          if (!visibleSet.has(element.id)) continue
          const bounds = elementBounds(element)
          const screenPoint = worldToClient(
            { x: bounds.x, y: bounds.y },
            { left: 0, top: 0 },
            viewBox
          )
          frameSink += screenPoint.x + screenPoint.y + bounds.w + bounds.h
          // Keep the map lookup in the same shape as the renderer's ID-based
          // candidate path and make accidental stale IDs observable.
          if (!elementById.has(element.id)) throw new Error('viewport index returned an unknown ID')
        }
      }
    })
    if (!Number.isFinite(viewBox.zoom) || !Number.isFinite(frameSink))
      throw new Error('drag/zoom benchmark produced an invalid result')

    const hitTest = runHitTestBenchmark(fixture, queryCount, iterations)

    let backupBytes = 0
    let svgBytes = 0
    let backupJsonSink = ''
    const backupJsonMs = averageMeasure(iterations, () => {
      backupJsonSink = JSON.stringify(createCanvasBackup(fixture.document))
      backupBytes = new TextEncoder().encode(backupJsonSink).byteLength
    })
    const svgMs = averageMeasure(iterations, () => {
      const svg = buildSVGString(fixture.elements, {
        width: 1_920,
        height: 1_080,
        backgroundColor: fixture.document.bgColor,
      })
      svgBytes = new TextEncoder().encode(svg).byteLength
    })
    if (!backupJsonSink || backupBytes <= 0 || svgBytes <= 0) {
      throw new Error('export benchmark produced an empty payload')
    }

    return {
      elementCount,
      iterations,
      queryCount,
      firstRenderMs,
      dragZoomMs,
      ...hitTest,
      autosaveMs: measureAutosaveSnapshot(fixture.document, iterations),
      backupJsonMs,
      svgMs,
      backupBytes,
      svgBytes,
      pngMs: null,
      pdfMs: null,
    }
  })
}

/** Plural alias for callers that want to emphasize the three fixed datasets. */
export const runPerformanceBenchmarks = runPerformanceBenchmark

export interface BrowserExportBenchmarkOptions {
  bgColor?: string
  backgroundStyle?: CanvasDoc['backgroundStyle']
  isDarkMode?: boolean
  /** Number of isolated IndexedDB put transactions to average. */
  autosaveIterations?: number
}

function openBenchmarkDatabase(databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser'))
      return
    }

    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('docs')) {
        database.createObjectStore('docs', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open benchmark IndexedDB'))
    request.onblocked = () => reject(new Error('Benchmark IndexedDB open was blocked'))
  })
}

function completeBenchmarkTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const resolveOnce = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const rejectOnce = () => {
      if (settled) return
      settled = true
      reject(transaction.error ?? new Error('Benchmark IndexedDB transaction failed'))
    }
    transaction.oncomplete = resolveOnce
    transaction.onerror = rejectOnce
    transaction.onabort = rejectOnce
  })
}

function deleteBenchmarkDatabase(databaseName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    const request = indexedDB.deleteDatabase(databaseName)
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to delete benchmark IndexedDB'))
    request.onblocked = () => reject(new Error('Benchmark IndexedDB delete was blocked'))
  })
}

function createBenchmarkDatabaseName(): string {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `mindnotes-pro-performance-${Date.now()}-${randomId}`
}

/**
 * Measure actual IndexedDB write transactions in an isolated temporary DB.
 * Database open/setup is intentionally outside the timed loop; each timed
 * operation is the same `put` used by the document repository's autosave.
 * The database is always closed and deleted before this promise resolves.
 */
export async function measureBrowserIndexedDbWrite(
  document: CanvasDoc,
  iterations = 3
): Promise<number> {
  const normalizedIterations = normalizeCount(iterations, 'autosaveIterations')
  const databaseName = createBenchmarkDatabaseName()
  let database: IDBDatabase | null = null

  try {
    database = await openBenchmarkDatabase(databaseName)
    let total = 0
    for (let iteration = 0; iteration < normalizedIterations; iteration += 1) {
      const startedAt = performance.now()
      const transaction = database.transaction('docs', 'readwrite')
      transaction.objectStore('docs').put(document)
      await completeBenchmarkTransaction(transaction)
      total += Math.max(0, performance.now() - startedAt)
    }
    return total / normalizedIterations
  } finally {
    database?.close()
    await deleteBenchmarkDatabase(databaseName)
  }
}

/** Verify that no temporary benchmark databases remain after a browser run. */
export async function verifyBenchmarkDatabaseCleanup(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false
  const databases = (
    indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string }>>
    }
  ).databases
  if (typeof databases !== 'function') return false
  const knownDatabases = await databases.call(indexedDB)
  const leaked = knownDatabases
    .map((database) => database.name)
    .filter((name): name is string => !!name && name.startsWith('mindnotes-pro-performance-'))
  if (leaked.length > 0) {
    throw new Error(`Temporary benchmark IndexedDB cleanup failed: ${leaked.join(', ')}`)
  }
  return true
}

/**
 * Measure real PNG/PDF export in a browser. This intentionally is not called
 * from the jsdom unit suite because jsdom does not implement Canvas encoding.
 */
export async function runBrowserExportBenchmark(
  fixture: PerformanceDataset,
  options: BrowserExportBenchmarkOptions = {}
): Promise<BrowserExportBenchmarkReport> {
  const renderStartedAt = performance.now()
  const rendered = await renderDocumentToCanvas(fixture.elements, {
    bgColor: options.bgColor ?? fixture.document.bgColor,
    backgroundStyle: options.backgroundStyle ?? fixture.document.backgroundStyle,
    isDarkMode: options.isDarkMode ?? false,
  })
  const renderMs = Math.max(0, performance.now() - renderStartedAt)

  const pngStartedAt = performance.now()
  const pngBlob = await canvasToBlob(rendered.canvas, 'image/png')
  const pngMs = Math.max(0, performance.now() - pngStartedAt)

  const pdfStartedAt = performance.now()
  const { jsPDF } = await import('jspdf')
  const imageData = rendered.canvas.toDataURL('image/png')
  const widthMm = rendered.canvas.width * 0.264583
  const heightMm = rendered.canvas.height * 0.264583
  const pdf = new jsPDF({
    orientation: widthMm > heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
  })
  pdf.addImage(imageData, 'PNG', 0, 0, widthMm, heightMm)
  const pdfBlob = pdf.output('blob')
  const pdfMs = Math.max(0, performance.now() - pdfStartedAt)

  const svgStartedAt = performance.now()
  const svg = buildSVGString(fixture.elements, {
    x: rendered.bounds.x,
    y: rendered.bounds.y,
    width: rendered.bounds.w,
    height: rendered.bounds.h,
    isDarkMode: options.isDarkMode ?? false,
    backgroundColor: options.bgColor ?? fixture.document.bgColor,
    backgroundStyle: options.backgroundStyle ?? fixture.document.backgroundStyle,
  })
  const svgMs = Math.max(0, performance.now() - svgStartedAt)
  const autosaveMs = await measureBrowserIndexedDbWrite(
    fixture.document,
    options.autosaveIterations ?? 3
  )

  return {
    elementCount: fixture.elements.length,
    renderMs,
    pngMs,
    pdfMs,
    svgMs,
    autosaveMs,
    pngBytes: pngBlob.size,
    pdfBytes: pdfBlob.size,
    svgBytes: new TextEncoder().encode(svg).byteLength,
  }
}
