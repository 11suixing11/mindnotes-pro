import { performance } from 'node:perf_hooks'
import { access, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { collectIdentity, collectEnvironment, parseOptions, withWorkspace, writeReport } from './runtime.mjs'
import { createReport, summarize } from './report.mjs'
import { makeStrokes, makeScreenEntries, makePageNotebooks, fixtureIdentity } from './fixtures.mjs'

const compiled = [
  'dist-electron/electron/screenNotebookRepository.mjs', 'dist-electron/electron/notebookRepository.mjs',
  'dist-electron/src/notes/model.js', 'dist-electron/src/notes/screenInk.js',
  'dist-electron/src/notes/screenNotebook.js', 'dist-electron/electron/screenBackup.mjs',
]
const meanings = {
  repositoryReadyMs: 'Repository construction through load completion, including creation and reopen for SQLite and page JSON.',
  eraseMs: 'Deterministic whole-stroke geometric hit test over 1000 strokes and 160000 points.',
  draftSaveMs: 'Initialized SQLite repository saveDraft through durable acknowledgement for 1000 strokes and 160000 points.',
  searchMs: 'Prepared SQLite library list query group 3 with summary result retrieval.',
  detailReadMs: 'Prepared SQLite library get first fixture note with complete geometry.',
  exportMs: 'Prepared SQLite library exportFile through complete streamed JSON write.',
  streamImportMs: 'Initialized empty SQLite target importFile through durable transaction acknowledgement.',
  pageJsonSaveMs: 'Initialized page repository save 100 pages and annotations through atomic JSON write acknowledgement.',
  pageJsonReloadMs: 'Page repository reopen and load after save, including validated backup decoding.',
  rssBytes: 'Node runner process RSS after operations, including worker threads in this process.',
  heapUsedBytes: 'Node runner main isolate heapUsed after operations; worker isolate heaps are not separately measured.',
  externalBytes: 'Node runner main isolate external allocation after operations; worker allocations are not separately measured.',
}

const same = (actual, expected, message) => {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(message)
}

function optionsFor(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Storage options must be an object.')
  const argv = []
  for (const [key, value] of Object.entries(input)) {
    if (!['iterations', 'warmups', 'notes', 'output'].includes(key)) throw new TypeError('Unknown storage option.')
    if (value !== undefined) argv.push(`--${key}`, String(value))
  }
  return parseOptions(argv, 'storage')
}

/** Loads current production modules only after invocation; importing this module starts no workers. */
export async function runStorageBenchmark(input = {}) {
  const options = optionsFor(input)
  const projectRoot = await realpath(process.cwd())
  const parameters = { iterations: options.iterations, warmups: options.warmups, notes: options.notes, measurementVersion: 'local-measurement-v1' }
  const strokes = makeStrokes(), entries = makeScreenEntries(options.notes), pages = makePageNotebooks()
  const eraser = Array.from({ length: 1000 }, (_, point) => ({ x: point * 1919 / 999, y: 500 }))
  const draftInput = { displayId: 'fixture-display', width: 1920, height: 1080,
    strokes, backgroundId: null, source: { app: 'Local baseline', title: 'Generated draft', display: 'fixture-display' }, updatedAt: 1794528000000 }
  const initialDraft = { ...draftInput, updatedAt: draftInput.updatedAt - 1 }
  const initialPages = pages.map(page => ({ ...page, annotations: page.annotations.map(annotation => ({ ...annotation, comment: '' })) }))
  const fixture = fixtureIdentity({ draft: draftInput, initialDraft, entries, pages, initialPages, eraser })
  const samples = Object.fromEntries(Object.keys(meanings).map(name => [name, []]))
  const checks = new Map()
  let identity, environment, failed = false
  const limitations = [
    'Generated PNG verifies storage and backups; this runner does not perform native Windows screen capture or physical pen latency measurement.',
    'Memory covers the Node runner process. SQLite workers are threads, not separately measured processes; heapUsed/external describe the main isolate only.',
    'Repository readiness records creation and reopen separately from steady operations. Page reload records the reopen load; its duration also appears in repositoryReadyMs.',
    'Default five measured samples use nearest-rank p95 (the maximum); results are an exploratory baseline on this machine.',
  ]
  const check = async (name, operation) => {
    try {
      const value = await operation()
      if (checks.get(name)?.status !== 'failed') checks.set(name, { name, status: 'passed' })
      return value
    } catch (error) {
      // Keep reports free of fixture values or assertion diffs containing notebook contents.
      checks.set(name, { name, status: 'failed', error: error.message })
      throw error
    }
  }
  try {
    await withWorkspace(projectRoot, async directory => {
      environment = collectEnvironment(directory)
      const previousEnvironment = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR }
      for (const key of Object.keys(previousEnvironment)) process.env[key] = directory
      try {
        identity = await collectIdentity(projectRoot, ['package.json'])
        await check('compiled-modules', async () => {
          try {
            for (const file of compiled) await access(path.join(projectRoot, file))
            identity = await collectIdentity(projectRoot, [...compiled, 'benchmark/local/run-storage.mjs'])
          } catch (error) {
            throw new Error(`Current compiled storage modules are unavailable or cannot be identified (${error.code ?? 'invalid input'}); run npm run build:electron explicitly.`, { cause: error })
          }
        })
        const [{ ScreenNotebookRepository }, { NotebookRepository }, model, ink, validation, backup] =
          await Promise.all(compiled.map(file => import(pathToFileURL(path.join(projectRoot, file)).href)))
        await check('fixtures-valid', async () => {
          for (const entry of entries) same(validation.validateScreenNote(entry.note), entry.note, 'Screen fixture validation changed data.')
          same(model.decodeBackup(JSON.stringify(model.createBackup(pages))).pages, pages, 'Page fixture validation changed data.')
          if (!validation.validScreenStrokes(strokes)) throw new Error('Draft fixture failed stroke validation.')
        })
        const expectedEntries = new Map(entries.map(entry => [entry.note.id, entry]))
        const verifyEntries = actual => {
          if (actual.length !== entries.length || new Set(actual.map(entry => entry.note.id)).size !== entries.length)
            throw new Error('Screen library count or IDs differ from fixtures.')
          for (const entry of actual) {
            const expected = expectedEntries.get(entry.note.id)
            if (!expected) throw new Error('Screen library contains an unexpected note ID.')
            same(validation.validateScreenNote(entry.note), expected.note, 'Screen note content differs from fixtures.')
            same(new Uint8Array(entry.png), expected.png, 'Screen note PNG differs from fixtures.')
            if (entry.thumbnail !== expected.thumbnail) throw new Error('Screen thumbnail differs from fixtures.')
          }
        }
        for (let iteration = 0; iteration < options.warmups + options.iterations; iteration++) {
          const measured = iteration >= options.warmups
          const measure = async (name, operation) => {
            const start = performance.now()
            const value = await operation()
            if (measured) samples[name].push(performance.now() - start)
            return value
          }
          const workers = new Set(), pageRepositories = new Set()
          const screenDirectory = path.join(directory, `sample-${iteration}/screen`)
          const pageDirectory = path.join(directory, `sample-${iteration}/page`)
          const importDirectory = path.join(directory, `sample-${iteration}/import`)
          const openScreen = async ownDirectory => {
            let repository
            const loaded = await measure('repositoryReadyMs', async () => {
              repository = new ScreenNotebookRepository(ownDirectory)
              workers.add(repository)
              return repository.load()
            })
            return { repository, loaded }
          }
          const closeScreen = async repository => { await repository.close(); workers.delete(repository) }
          const openPage = async () => {
            let repository
            const loaded = await measure('repositoryReadyMs', async () => {
              repository = new NotebookRepository(pageDirectory)
              pageRepositories.add(repository)
              return repository.load()
            })
            return { repository, loaded }
          }
          let operationError, operationFailed = false
          try {
            const { repository: screen, loaded } = await openScreen(screenDirectory)
            same(loaded.drafts, [], 'Fresh screen repository contains drafts.')
            await check('prepare-library', async () => {
              if (await screen.import(entries) !== entries.length) throw new Error('Fixture preparation import count differs.')
              verifyEntries(await screen.export())
            })
            await check('erase-results', async () => {
              const hit = await measure('eraseMs', () => {
                const touches = ink.screenEraserHitTest(eraser)
                return strokes.filter(touches).map(stroke => stroke.id)
              })
              // 160 points step through 1749 vertical pixels modulo 1080: every stroke crosses
              // y=500, and the eraser covers the entire x range. All 1000 IDs must be hit.
              same(hit, strokes.map(stroke => stroke.id), 'Erase results differ from the fixture geometry.')
              const touches = ink.screenEraserHitTest(eraser)
              if (!touches({ id: 'on-path', tool: 'pen', color: '#e05d52', width: 4, points: [{ x: 500, y: 500 }] }) ||
                touches({ id: 'far-away', tool: 'pen', color: '#e05d52', width: 4, points: [{ x: 0, y: 0 }] }))
                throw new Error('Erase known-point geometry check failed.')
            })
            const draft = validation.validateScreenDraft(draftInput)
            await screen.saveDraft(validation.validateScreenDraft(initialDraft))
            await check('draft-save', () => measure('draftSaveMs', () => screen.saveDraft(draft)))
            await check('search-results', async () => {
              const result = await measure('searchMs', () => screen.list('group 3'))
              const selected = entries.filter((_entry, index) => index % 10 === 3).slice().reverse().slice(0, 50)
              if (result.total !== entries.length / 10 || result.offset !== 0) throw new Error('Search result count/offset differs from fixtures.')
              same(result.notes, selected.map(({ note, thumbnail }) => ({ id: note.id, title: note.title,
                preview: note.comment, source: note.source, createdAt: note.createdAt, updatedAt: note.updatedAt,
                strokeCount: note.strokes.length, trashedAt: null, thumbnail })), 'Search summaries differ from fixtures.')
            })
            await check('detail-content', async () => {
              same(await measure('detailReadMs', () => screen.get(entries[0].note.id)), entries[0].note, 'Detail content differs from fixture.')
              same(new Uint8Array(await screen.image(entries[0].note.id)), entries[0].png, 'Detail image differs from fixture.')
            })
            const exportPath = path.join(directory, `sample-${iteration}/export.json`)
            await check('export-content', async () => {
              await measure('exportMs', () => screen.exportFile(exportPath))
              const exported = []
              await backup.readScreenBackup(exportPath, (note, png, thumbnail) => exported.push({ note, png, thumbnail }))
              verifyEntries(exported)
            })
            const { repository: imported, loaded: emptyTarget } = await openScreen(importDirectory)
            same(emptyTarget.drafts, [], 'Fresh import target contains drafts.')
            if ((await imported.list()).total !== 0) throw new Error('Import target must start empty.')
            await check('stream-import-content', async () => {
              if (await measure('streamImportMs', () => imported.importFile(exportPath)) !== entries.length)
                throw new Error('Stream import count differs from fixtures.')
              verifyEntries(await imported.export())
            })
            await closeScreen(imported)
            await check('stream-import-restart', async () => {
              const restarted = await openScreen(importDirectory)
              if ((await restarted.repository.list()).total !== entries.length) throw new Error('Restarted import target count differs.')
              verifyEntries(await restarted.repository.export())
            })
            await closeScreen(screen)
            await check('draft-restart', async () => {
              const restarted = await openScreen(screenDirectory)
              same(restarted.loaded.drafts, [draft], 'Restarted draft content differs from fixture.')
              if ((await restarted.repository.list()).total !== entries.length) throw new Error('Restarted library count differs.')
              verifyEntries(await restarted.repository.export())
            })
            const { repository: page, loaded: emptyPages } = await openPage()
            same(emptyPages, [], 'Fresh page repository contains notes.')
            const validatedPages = model.decodeBackup(JSON.stringify(model.createBackup(pages))).pages
            await page.save(model.decodeBackup(JSON.stringify(model.createBackup(initialPages))).pages)
            await page.flush()
            await check('page-json-save', () => measure('pageJsonSaveMs', () => page.save(validatedPages)))
            await page.flush()
            await check('page-json-restart', async () => {
              const reopened = await measure('pageJsonReloadMs', openPage)
              same(reopened.loaded, validatedPages, 'Restarted page annotations or counts differ from fixtures.')
            })
            if (measured) {
              const memory = process.memoryUsage()
              for (const name of ['rssBytes', 'heapUsedBytes', 'externalBytes']) {
                const key = name.replace('Bytes', '')
                samples[name].push(memory[key])
              }
            }
          } catch (error) { operationError = error; operationFailed = true }
          const results = await Promise.allSettled([...workers].map(worker => worker.close()).concat([...pageRepositories].map(page => page.flush())))
          const failures = results.filter(result => result.status === 'rejected')
          if (failures.length) {
            const cleanupError = new AggregateError(failures.map(result => result.reason),
              'Repository cleanup failed; one or more workers or page saves could not close/flush.')
            if (operationFailed) throw new AggregateError([operationError, cleanupError],
              'Repository operation and cleanup failed; validation and close/flush errors were retained.', { cause: operationError })
            throw cleanupError
          }
          if (operationFailed) throw operationError
        }
      } finally {
        for (const [key, value] of Object.entries(previousEnvironment)) {
          if (value === undefined) delete process.env[key]
          else process.env[key] = value
        }
      }
    })
    checks.set('workspace-cleanup', { name: 'workspace-cleanup', status: 'passed' })
  } catch (error) {
    failed = true
    checks.set('runner', { name: 'runner', status: 'failed', error: error.message })
  }
  if (!identity) identity = await collectIdentity(projectRoot, ['package.json'])
  if (!environment) environment = collectEnvironment(projectRoot)
  const metrics = Object.fromEntries(Object.entries(samples).filter(([, values]) => values.length)
    .map(([name, values]) => [name, summarize(values, name.endsWith('Bytes') ? 'bytes' : 'ms', meanings[name])]))
  return createReport({ runner: 'storage', status: failed ? 'failed' : 'passed', identity, environment, parameters, fixture, metrics,
    checks: [...checks.values()], limitations })
}

async function main() {
  try {
    const options = parseOptions(process.argv.slice(2), 'storage')
    const report = await runStorageBenchmark(options)
    await writeReport(report, options.output, process.cwd())
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    process.exitCode = report.status === 'passed' ? 0 : 1
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
