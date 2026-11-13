import { createHash, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, realpath, rm, lstat, open, rename } from 'node:fs/promises'
import { statfsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import ts from 'typescript'

const execute = promisify(execFile)
const runtimePath = 'tmp/local-baseline-20261113/runtime'
const inside = (root, file) => { const relative = path.relative(root, file); return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) }

/** Reports have their own atomic target, separate from the disposable data workspace. */
export async function writeReport(report, outputPath, projectRoot) {
  if (outputPath === undefined) return
  if (typeof outputPath !== 'string' || !outputPath.trim() || path.extname(outputPath) !== '.json')
    throw new TypeError('Report output path must name a workspace .json file.')
  const root = await realpath(projectRoot)
  const target = path.resolve(root, outputPath)
  if (!inside(root, target)) throw new Error('Report output path is outside the workspace.')
  const parent = path.dirname(target)
  let existing = parent
  while (true) {
    try {
      if (!inside(root, await realpath(existing))) throw new Error('Report output path resolves outside the workspace.')
      break
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      const next = path.dirname(existing)
      if (next === existing) throw error
      existing = next
    }
  }
  try {
    if ((await lstat(target)).isSymbolicLink()) throw new Error('Report output path cannot be a symlink.')
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  await mkdir(parent, { recursive: true })
  if (!inside(root, await realpath(parent))) throw new Error('Report output parent resolves outside the workspace.')
  const temporary = path.join(parent, `.local-report-${randomUUID()}.tmp`)
  const content = `${JSON.stringify(report, null, 2)}\n`
  let owned = false
  try {
    const file = await open(temporary, 'wx')
    owned = true
    try { await file.writeFile(content) }
    finally { await file.close() }
    await rename(temporary, target)
  } finally { if (owned) await rm(temporary, { force: true }) }
}

function localDependencies(file, content) {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true,
    /\.(?:ts|mts|cts)$/.test(file) ? ts.ScriptKind.TS : ts.ScriptKind.JS)
  if (source.parseDiagnostics.length) throw new Error('Measured source has invalid syntax.')
  const dependencies = new Set()
  function visit(node) {
    let specifier
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier
    else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) specifier = node.arguments[0]
    else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL') {
      const base = node.arguments?.[1]
      if (base && ts.isPropertyAccessExpression(base) && base.name.text === 'url' &&
        ts.isMetaProperty(base.expression) && base.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
        base.expression.name.text === 'meta') specifier = node.arguments[0]
    }
    if (specifier && ts.isStringLiteralLike(specifier) && specifier.text.startsWith('.')) dependencies.add(specifier.text)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return dependencies
}

/** Hash only explicit/generated code inputs and literal project-local dependencies. */
export async function collectIdentity(projectRoot, measuredFiles) {
  if (!Array.isArray(measuredFiles) || measuredFiles.length === 0 || !measuredFiles.every(file => typeof file === 'string' && file.length))
    throw new TypeError('Measured files are required.')
  const root = await realpath(projectRoot)
  const pending = [...measuredFiles, 'package.json', 'package-lock.json']
  const files = {}
  const seen = new Set()
  while (pending.length) {
    const requested = path.resolve(root, pending.pop())
    if (!inside(root, requested)) throw new Error('Measured file is outside the project.')
    const file = await realpath(requested)
    if (!inside(root, file)) throw new Error('Measured file resolves outside the project.')
    if (seen.has(file)) continue
    seen.add(file)
    const bytes = await readFile(file)
    files[path.relative(root, file).split(path.sep).join('/')] = createHash('sha256').update(bytes).digest('hex')
    if (!/\.(?:mjs|cjs|js|mts|cts|ts)$/.test(file)) continue
    for (const dependency of localDependencies(file, bytes.toString('utf8')))
      pending.push(path.resolve(path.dirname(file), dependency))
  }
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  if (typeof pkg.version !== 'string' || !pkg.version) throw new Error('Application version is missing.')
  const { stdout: head } = await execute('git', ['-C', root, 'rev-parse', 'HEAD'])
  const { stdout: summary } = await execute('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=normal'])
  return { applicationVersion: pkg.version, gitHead: head.trim(), workingTree: { dirty: summary.length > 0, summary: summary.trimEnd() },
    files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) }
}

export function collectEnvironment(dataDirectory) {
  let fileSystemType
  try { fileSystemType = String(statfsSync(dataDirectory).type) }
  catch (error) { fileSystemType = { available: false, error: `Filesystem query unavailable (${error.code ?? 'unknown'}).` } }
  const cpus = os.cpus()
  return { platform: process.platform, arch: process.arch, osRelease: os.release(), node: process.version,
    cpuModel: cpus[0]?.model || 'unavailable', cpuCount: cpus.length, totalMemoryBytes: os.totalmem(), fileSystemType }
}

export async function withWorkspace(projectRoot, callback) {
  const parent = path.join(projectRoot, runtimePath)
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(path.join(parent, 'run-'))
  let value, callbackError, failed = false
  try { value = await callback(directory) }
  catch (error) { callbackError = error; failed = true }
  finally {
    try { await rm(directory, { recursive: true, force: true }) }
    catch (error) {
      const cleanupError = new Error(`Workspace cleanup failed; inspect ${directory}`, { cause: error })
      if (failed) throw new AggregateError([callbackError, cleanupError], cleanupError.message)
      throw cleanupError
    }
  }
  if (failed) throw callbackError
  return value
}

export function parseOptions(argv, mode) {
  if (!['storage', 'desktop'].includes(mode) || !Array.isArray(argv)) throw new TypeError('Runner/options are invalid.')
  const options = { iterations: 5, warmups: 1, notes: 1000, output: undefined }
  const names = { '--iterations': 'iterations', '--warmups': 'warmups', '--notes': 'notes', '--output': 'output' }
  const ranges = { iterations: [1, 30], warmups: [0, 10], idleSeconds: [0, 900], frameSeconds: [1, 60] }
  if (mode === 'desktop') {
    Object.assign(options, { allowVisible: false, executable: undefined, idleSeconds: 5, frameSeconds: 5 })
    Object.assign(names, { '--allow-visible': 'allowVisible', '--executable': 'executable', '--idle-seconds': 'idleSeconds', '--frame-seconds': 'frameSeconds' })
  }
  const seen = new Set()
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index], key = names[argument]
    if (!Object.hasOwn(names, argument) || seen.has(argument)) throw new TypeError('Unknown or repeated runner option.')
    seen.add(argument)
    if (key === 'allowVisible') { options.allowVisible = true; continue }
    const value = argv[++index]
    if (typeof value !== 'string' || !value.trim() || value.startsWith('--')) throw new TypeError(`Missing value for ${argument}.`)
    if (key === 'output' || key === 'executable') { options[key] = value; continue }
    if (!/^\d+$/.test(value)) throw new TypeError(`Invalid numeric value for ${argument}.`)
    const number = Number(value)
    if (!Number.isSafeInteger(number) || (key === 'notes' ? ![100, 1000, 10000].includes(number) : number < ranges[key][0] || number > ranges[key][1]))
      throw new TypeError(`Value out of range for ${argument}.`)
    options[key] = number
  }
  return options
}
