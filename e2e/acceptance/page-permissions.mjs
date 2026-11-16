import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { extractFile } from '@electron/asar'

const execute = promisify(execFile)
const sourceRoot = path.resolve(process.env.MINDNOTES_PERMISSION_SOURCE_ROOT ?? '.')
const outputRoot = path.resolve('tmp/qa')
const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-page-permissions-'))
const archive = process.env.MINDNOTES_PERMISSION_ARCHIVE
  ? path.resolve(process.env.MINDNOTES_PERMISSION_ARCHIVE)
  : null
const contentRoot = archive ?? sourceRoot
const modulePath = path.join(contentRoot, 'dist-electron/electron/pagePermissions.mjs')
const policyBytes = archive
  ? extractFile(archive, 'dist-electron/electron/pagePermissions.mjs'.replaceAll('/', path.sep))
  : await readFile(modulePath)
const packageBytes = archive
  ? extractFile(archive, 'package.json')
  : await readFile(path.join(sourceRoot, 'package.json'))
const version = JSON.parse(packageBytes.toString('utf8')).version
const electronExecutable =
  process.env.MINDNOTES_ELECTRON_EXECUTABLE ??
  path.resolve('node_modules/electron/dist/electron.exe')
const server = createServer((request, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end(
    request.url === '/frame'
      ? '<!doctype html><html><body>Same-origin permission frame</body></html>'
      : '<!doctype html><html><body><p id="reader">Reading text remains available.</p><iframe id="frame" src="/frame"></iframe></body></html>'
  )
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const url = `http://127.0.0.1:${server.address().port}/`
const resultFile = path.join(directory, 'permissions.json')
const baseline = process.env.MINDNOTES_PERMISSION_BASELINE === '1'
const integration = process.env.MINDNOTES_PERMISSION_APP_INTEGRATION === '1'
assert.ok(!(baseline && integration), 'Baseline and application integration are separate runs')
assert.ok(
  !archive || (integration && !baseline),
  'Archive verification requires application integration'
)
let failure
try {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE')
  )
  const runner = integration ? 'page-permissions-app-runner.cjs' : 'page-permissions-runner.cjs'
  await execute(electronExecutable, [path.resolve('e2e/acceptance', runner)], {
    env: {
      ...env,
      MINDNOTES_PERMISSION_POLICY: modulePath,
      MINDNOTES_PERMISSION_DATA: directory,
      MINDNOTES_PERMISSION_URL: url,
      MINDNOTES_PERMISSION_RESULT: resultFile,
      MINDNOTES_PERMISSION_VERSION: version,
      MINDNOTES_PERMISSION_APP_MAIN: path.join(contentRoot, 'dist-electron/electron/main.mjs'),
      ...(integration
        ? {
            MINDNOTES_START_WORKSPACE: '1',
            MINDNOTES_USE_DIST: '1',
            MINDNOTES_USER_DATA_DIR: directory,
          }
        : {}),
    },
    windowsHide: true,
    timeout: 55_000,
    maxBuffer: 32_000,
  })
} catch (error) {
  failure = { message: error.message, code: error.code, stderr: error.stderr }
} finally {
  await new Promise((resolve) => server.close(() => resolve()))
}
const result = JSON.parse(await readFile(resultFile, 'utf8'))
result.schema = 'mindnotes-pro.page-permissions-acceptance'
result.schemaVersion = 1
result.recordedAt = new Date().toISOString()
result.directory = directory
result.sourceRoot = sourceRoot
result.archive = archive
result.policy = { path: modulePath, sha256: createHash('sha256').update(policyBytes).digest('hex') }
result.scope = integration
  ? `${archive ? 'Actual packaged asar loaded by the matching development Electron runtime' : 'Actual application source main process'}, WebContentsView, injected page bridge and trusted shell; window show/focus methods held hidden for shared-desktop input coordination. Permission denial and note persistence, no packaged-executable startup, compositor or human usability claim.`
  : baseline
    ? 'Actual local Electron defaults in hidden isolated fixture windows; notification permission alone confirms the permissive baseline. No camera, microphone, location or user clipboard accessed.'
    : 'Actual local Electron runtime, hidden isolated HTTP fixture windows; source policy module, not final-package integration. No OS permission prompt accepted or user clipboard read.'
if (failure) result.processFailure = failure
await mkdir(outputRoot, { recursive: true })
await writeFile(
  path.join(
    outputRoot,
    archive
      ? `page-permissions-app-${version.replace(/^6\.0\.0-beta\./, 'beta')}-asar.json`
      : integration
        ? 'page-permissions-app-source.json'
        : baseline
          ? 'page-permissions-electron-baseline.json'
          : 'page-permissions-source.json'
  ),
  JSON.stringify(result, null, 2) + '\n'
)
console.log(JSON.stringify(result, null, 2))
assert.equal(result.status, 'passed')
assert.ok(!failure)
