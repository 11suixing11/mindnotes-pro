import {
  PERFORMANCE_DATASET_SIZES,
  createPerformanceDataset,
  runBrowserExportBenchmark,
  verifyBenchmarkDatabaseCleanup,
  type BrowserExportBenchmarkReport,
} from './performanceBenchmark'

export interface BrowserPerformancePayload {
  generatedAt: string
  environment: {
    userAgent: string
    devicePixelRatio: number
    viewport: { width: number; height: number }
  }
  reports: BrowserExportBenchmarkReport[]
  temporaryIndexedDbCleanupVerified: boolean
}

declare global {
  interface Window {
    __MINDNOTES_PERFORMANCE_RESULT__?: BrowserPerformancePayload
    __MINDNOTES_PERFORMANCE_ERROR__?: string
  }
}

async function run(): Promise<void> {
  const reports: BrowserExportBenchmarkReport[] = []
  for (const elementCount of PERFORMANCE_DATASET_SIZES) {
    reports.push(await runBrowserExportBenchmark(createPerformanceDataset(elementCount)))
  }
  const temporaryIndexedDbCleanupVerified = await verifyBenchmarkDatabaseCleanup()

  window.__MINDNOTES_PERFORMANCE_RESULT__ = {
    generatedAt: new Date().toISOString(),
    environment: {
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    },
    reports,
    temporaryIndexedDbCleanupVerified,
  }
  document.body.dataset.status = 'complete'
}

void run().catch((error: unknown) => {
  window.__MINDNOTES_PERFORMANCE_ERROR__ =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  document.body.dataset.status = 'error'
})
