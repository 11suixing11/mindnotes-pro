import { performance } from 'node:perf_hooks'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ScreenNotebookRepository } from '../dist-electron/electron/screenNotebookRepository.mjs'
import { screenEraserHitTest } from '../dist-electron/src/notes/screenInk.js'
import { PNG } from 'pngjs'
import { randomBytes } from 'node:crypto'

const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-performance-'))
const repository = new ScreenNotebookRepository(directory)
const strokes = Array.from({ length: 1000 }, (_, index) => ({
  id: `ink_${index}`,
  tool: 'pen',
  color: '#e05d52',
  width: 4,
  points: Array.from({ length: 160 }, (_, point) => ({
    x: 20 + point * 6,
    y: 40 + (index % 50) * 18 + Math.sin(point / 10) * 3,
  })),
}))
const eraser = Array.from({ length: 1000 }, (_, point) => ({ x: 20 + point * 0.9, y: 25 }))
const metrics = { pointCount: 160000, strokeCount: 1000, dataDirectory: directory, timings: {} }
try {
  let start = performance.now()
  const touches = screenEraserHitTest(eraser)
  const hit = strokes.filter(touches).length
  metrics.timings.longEraseMs = performance.now() - start
  metrics.erasedStrokes = hit
  start = performance.now()
  await repository.saveDraft({
    displayId: 'screen_1',
    width: 1707,
    height: 1067,
    strokes,
    backgroundId: null,
    source: { app: '', title: '', display: 'perf' },
    updatedAt: Date.now(),
  })
  metrics.timings.maxDraftSaveMs = performance.now() - start
  const pixel = new PNG({ width: 1, height: 1 })
  pixel.data.fill(180)
  const image = PNG.sync.write(pixel)
  const base = {
    title: '性能测试',
    comment: '检索结论',
    source: { app: 'PowerPoint', title: '课程', display: 'perf' },
    width: 1707,
    height: 1067,
    strokes: [],
    createdAt: 1,
    updatedAt: 1,
    revision: 1,
    trashedAt: null,
  }
  start = performance.now()
  await repository.import(
    Array.from({ length: 1000 }, (_, index) => ({
      note: { ...base, id: `note_${index}` },
      png: image,
      thumbnail: 'data:image/png;base64,' + image.toString('base64'),
    }))
  )
  metrics.timings.import1000Ms = performance.now() - start
  start = performance.now()
  await repository.list('课程')
  metrics.timings.search1000Ms = performance.now() - start
  start = performance.now()
  await repository.exportFile(path.join(directory, 'backup.json'))
  metrics.timings.backup1000Ms = performance.now() - start
  start = performance.now()
  await repository.importFile(path.join(directory, 'backup.json'))
  metrics.timings.streamImport1000Ms = performance.now() - start
  const noise = new PNG({ width: 512, height: 512 })
  noise.data = randomBytes(noise.data.length)
  const noisyPng = PNG.sync.write(noise)
  await repository.import(
    Array.from({ length: 80 }, (_, index) => ({
      note: { ...base, id: `large_${index}` },
      png: noisyPng,
      thumbnail: '',
    }))
  )
  const larger = path.join(directory, 'large-backup.json')
  start = performance.now()
  await repository.exportFile(larger)
  metrics.timings.largeBackupMs = performance.now() - start
  start = performance.now()
  await repository.importFile(larger)
  metrics.timings.largeStreamImportMs = performance.now() - start
  metrics.memory = process.memoryUsage()
} finally {
  await repository.close()
}
await writeFile(path.join(directory, 'performance.json'), JSON.stringify(metrics, null, 2))
console.log(JSON.stringify(metrics, null, 2))
