import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import process from 'node:process'
import { log } from 'node:console'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { extractFile, listPackage, statFile } from '@electron/asar'
import semver from 'semver'

const execute = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const buildRoot = path.resolve(process.env.MINDNOTES_ARTIFACT_BUILD_ROOT ?? root)
const release = path.join(buildRoot, 'release')
const output = path.resolve(process.env.MINDNOTES_ARTIFACT_OUTPUT ?? path.join(root, 'tmp/qa'))
const packageJson = JSON.parse(await readFile(path.join(buildRoot, 'package.json'), 'utf8'))
const version = packageJson.version
if (JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version !== version)
  throw new Error('The selected build version differs from the source checkout.')
const archive = path.join(release, 'win-unpacked/resources/app.asar')
const slash = (value) => value.replaceAll('\\', '/')

async function digest(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

async function fileRecord(relative, directory = root) {
  const file = path.resolve(directory, relative)
  if (!file.toLowerCase().startsWith(`${directory}${path.sep}`.toLowerCase()))
    throw new Error(`Manifest path exits its directory: ${relative}`)
  const details = await stat(file)
  return {
    path: slash(relative),
    bytes: details.size,
    modifiedAt: details.mtime.toISOString(),
    sha256: await digest(file),
  }
}

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(file)))
    else if (entry.isFile()) files.push(slash(path.relative(buildRoot, file)))
    else throw new Error(`Unexpected non-file build asset: ${file}`)
  }
  return files.sort()
}

// Read the actual bytes in the final archive, rather than trusting its stored
// integrity metadata. A development build in dist must fail this comparison.
const localAssets = [
  ...(await walk(path.join(buildRoot, 'dist'))),
  ...(await walk(path.join(buildRoot, 'dist-electron'))),
].sort()
const archivedAssets = listPackage(archive)
  .map((entry) => slash(entry).replace(/^\/+/, ''))
  .filter((entry) => /^(dist|dist-electron)\//.test(entry))
  .filter((entry) => !statFile(archive, entry.replaceAll('/', path.sep)).files)
  .sort()
if (JSON.stringify(localAssets) !== JSON.stringify(archivedAssets))
  throw new Error('Packaged asset paths differ from the current production output.')

const assetRecords = []
for (const relative of localAssets) {
  const record = await fileRecord(relative, buildRoot)
  const packagedHash = createHash('sha256')
    .update(extractFile(archive, relative.replaceAll('/', path.sep)))
    .digest('hex')
  if (record.sha256 !== packagedHash) throw new Error(`Packaged asset mismatch: ${relative}`)
  assetRecords.push({ ...record, asarSha256: packagedHash, match: true })
}

const packagedJson = JSON.parse(extractFile(archive, 'package.json').toString('utf8'))
const packageFields = [
  'name',
  'version',
  'type',
  'description',
  'author',
  'homepage',
  'repository',
  'main',
  'engines',
  'dependencies',
  'overrides',
]
for (const key of packageFields)
  if (JSON.stringify(packageJson[key]) !== JSON.stringify(packagedJson[key]))
    throw new Error(`Packaged package.json differs in ${key}`)

// npm dependency links can make electron-builder collect direct dependencies
// while omitting their children. Validate the actual archived dependency tree.
const archivedPaths = new Set(listPackage(archive).map((entry) => slash(entry).replace(/^\/+/, '')))
const runtimeDependencies = []
const checkedPackages = new Set()
function dependencyPath(name, parent) {
  let directory = parent ? path.posix.dirname(parent) : ''
  for (;;) {
    if (path.posix.basename(directory) !== 'node_modules') {
      const candidate = path.posix.join(directory, 'node_modules', name, 'package.json')
      if (archivedPaths.has(candidate)) return candidate
    }
    if (!directory || directory === '.')
      throw new Error(
        `Packaged runtime dependency is missing: ${name} required by ${parent || 'app'}`
      )
    directory = path.posix.dirname(directory)
  }
}
function checkDependencies(parent, manifest) {
  const required = {
    ...manifest.dependencies,
    ...Object.fromEntries(
      Object.entries(manifest.peerDependencies ?? {}).filter(
        ([name]) => !manifest.peerDependenciesMeta?.[name]?.optional
      )
    ),
  }
  for (const [name, range] of Object.entries(required)) {
    if (Object.hasOwn(manifest.optionalDependencies ?? {}, name)) continue
    const relative = dependencyPath(name, parent)
    const bytes = extractFile(archive, relative.replaceAll('/', path.sep))
    const dependency = JSON.parse(bytes.toString('utf8'))
    if (dependency.name !== name || !semver.satisfies(dependency.version, range))
      throw new Error(
        `Packaged dependency version mismatch: ${name}@${dependency.version} / ${range}`
      )
    if (checkedPackages.has(relative)) continue
    checkedPackages.add(relative)
    runtimeDependencies.push({
      path: relative,
      name,
      version: dependency.version,
      packageJsonSha256: createHash('sha256').update(bytes).digest('hex'),
    })
    checkDependencies(relative, dependency)
  }
}
checkDependencies('', packagedJson)

const artifactPaths = [
  `release/MindNotes-Pro-${version}-Setup-x64.exe`,
  `release/MindNotes-Pro-${version}-Portable-x64.exe`,
  'release/win-unpacked/MindNotes Pro.exe',
  'release/win-unpacked/resources/app.asar',
]
const artifacts = []
for (const relative of artifactPaths) artifacts.push(await fileRecord(relative, buildRoot))

// Inspect both NSIS payloads without launching or installing them. These
// temporary extraction directories contain only the two requested app files.
const payloadDirectory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-artifact-payload-'))
const sevenZip =
  process.env.MINDNOTES_SEVENZIP_EXECUTABLE ??
  path.join(root, 'node_modules/electron-winstaller/vendor/7z-x64.exe')
const payloads = []
for (const artifact of artifacts.slice(0, 2)) {
  const destination = path.join(
    payloadDirectory,
    artifact.path.includes('Setup') ? 'setup' : 'portable'
  )
  await mkdir(destination)
  await execute(
    sevenZip,
    ['x', '-y', `-o${destination}`, path.join(buildRoot, artifact.path), '$PLUGINSDIR/app-64.7z'],
    { windowsHide: true }
  )
  const nestedArchive = path.join(destination, '$PLUGINSDIR/app-64.7z')
  const extracted = path.join(destination, 'app')
  await execute(
    sevenZip,
    ['x', '-y', `-o${extracted}`, nestedArchive, 'resources/app.asar', 'MindNotes Pro.exe'],
    { windowsHide: true }
  )
  const files = []
  for (const relative of ['MindNotes Pro.exe', 'resources/app.asar']) {
    const expected = artifacts.find((item) => item.path === `release/win-unpacked/${relative}`)
    const actual = await digest(path.join(extracted, relative))
    if (actual !== expected.sha256)
      throw new Error(`Installer/portable payload mismatch: ${artifact.path} / ${relative}`)
    files.push({ path: relative, sha256: actual, match: true })
  }
  payloads.push({ artifact: artifact.path, artifactSha256: artifact.sha256, files })
}

const signatureTargets = artifactPaths
  .filter((file) => file.endsWith('.exe'))
  .map((file) => `'${path.join(buildRoot, file).replaceAll("'", "''")}'`)
  .join(',')
const signatures = await execute(
  process.env.MINDNOTES_POWERSHELL_EXECUTABLE ?? 'pwsh.exe',
  [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); @(@(${signatureTargets}) | ForEach-Object { $qaFile=Get-Item -LiteralPath $_; $qaSignature=Get-AuthenticodeSignature -LiteralPath $_; @{name=$qaFile.Name;status=$qaSignature.Status.ToString()} }) | ConvertTo-Json -Compress`,
  ],
  { windowsHide: true }
)

const git = async (args) =>
  (await execute('git', args, { cwd: root, maxBuffer: 8 * 1024 * 1024 })).stdout
const head = (await git(['rev-parse', 'HEAD'])).trim()
const dirty = (await git(['status', '--porcelain=v1'])).trim().split(/\r?\n/).filter(Boolean)
const sourcePaths = [
  ...new Set(
    (await git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']))
      .split('\0')
      .filter(Boolean)
  ),
].sort()
const sourceRecords = []
const deletedSourcePaths = []
for (const relative of sourcePaths) {
  try {
    sourceRecords.push(await fileRecord(relative))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    deletedSourcePaths.push(relative)
  }
}
const sourceManifest = {
  schema: 'mindnotes-pro.source-manifest',
  schemaVersion: 1,
  version,
  capturedAt: new Date().toISOString(),
  gitHead: head,
  dirty: dirty.length > 0,
  changedPaths: dirty,
  deletedPaths: deletedSourcePaths,
  scope:
    'Existing Git files and non-ignored new files; current working-tree bytes, without user data, dependencies or build outputs. A source inventory, not proof of reproducible compilation.',
  files: sourceRecords,
}
await mkdir(output, { recursive: true })
await writeFile(
  path.join(output, 'source-manifest.json'),
  `${JSON.stringify(sourceManifest, null, 2)}\n`
)

const manifest = {
  schema: 'mindnotes-pro.artifact-manifest',
  schemaVersion: 1,
  version,
  capturedAt: new Date().toISOString(),
  productionReady: false,
  buildRoot,
  sourceRoot: root,
  runtime: {
    electron: JSON.parse(
      await readFile(path.join(root, 'node_modules/electron/package.json'), 'utf8')
    ).version,
    electronBuilder: JSON.parse(
      await readFile(path.join(root, 'node_modules/electron-builder/package.json'), 'utf8')
    ).version,
    platform: process.platform,
    arch: process.arch,
  },
  artifacts,
  distributionPayloads: { match: true, directory: payloadDirectory, files: payloads },
  signatures: JSON.parse(signatures.stdout),
  packageJson: {
    checkedFields: packageFields,
    match: true,
    packagedSha256: createHash('sha256').update(extractFile(archive, 'package.json')).digest('hex'),
    note: 'electron-builder removes scripts, devDependencies and build configuration; production fields were compared.',
  },
  productionAssets: { count: assetRecords.length, match: true, files: assetRecords },
  runtimeDependencies: {
    count: runtimeDependencies.length,
    complete: true,
    files: runtimeDependencies,
  },
  sourceManifest: await fileRecord('source-manifest.json', output),
  source: { gitHead: head, dirty: dirty.length > 0 },
  evidenceAssociation:
    'Artifact and production-asset paths are relative to buildRoot; source files are relative to sourceRoot. Capture these hashes after final-package acceptance, with no artifact replacements in between. This inventories local artifacts and matching production assets; it does not claim tests have run, publisher signing or reproducible compilation.',
}
await writeFile(
  path.join(output, 'artifact-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
)
log(
  JSON.stringify(
    {
      version,
      assets: assetRecords.length,
      sourceFiles: sourceRecords.length,
      artifacts,
      signatures: manifest.signatures,
    },
    null,
    2
  )
)
