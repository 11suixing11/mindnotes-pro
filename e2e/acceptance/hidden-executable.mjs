import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import console from 'node:console'
import process from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import { clearTimeout, setTimeout } from 'node:timers'
import os from 'node:os'
import path from 'node:path'
import { PNG } from 'pngjs'
import { chromium } from '@playwright/test'

const { WebSocket } = globalThis

const executable = process.env.MINDNOTES_EXECUTABLE
if (!executable) throw new Error('Set MINDNOTES_EXECUTABLE to the packaged application.')
const version = JSON.parse(await readFile('package.json', 'utf8')).version
const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-hidden-executable-'))
const output = path.resolve('tmp/qa', `hidden-executable-${version.replace(/^6\.0\.0-beta\./, 'beta')}.json`)
const visualDirectory = output.replace(/\.json$/, '-screenshots')
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const result = {
  schema: 'mindnotes-pro.hidden-executable-acceptance',
  schemaVersion: 1,
  version,
  executable: path.resolve(executable),
  directory,
  startedAt: new Date().toISOString(),
  scope: 'Actual packaged executable, isolated data, inspector suppresses show/focus before app windows exist. Generated ink and PNG fixtures, programmatic preload IPC, real storage, exports, permission denial and process restarts. No native pointer, visible compositor, desktop capture, latency or usability claim.',
  stages: [],
  launches: [],
}
async function digest(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
result.executableSha256 = await digest(executable)
result.archive = path.join(path.dirname(executable), 'resources/app.asar')
result.archiveSha256 = await digest(result.archive)
const fixtureText = '页面批注必须随正文滚动，保存后仍可编辑。'
const server = createServer((_request, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end(`<!doctype html><html lang="zh-CN"><head><title>隐藏发行包验收</title></head><body><p id="target">${fixtureText}</p><div style="height:1800px"></div></body></html>`)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const url = `http://127.0.0.1:${server.address().port}/article`
let active
async function launch() {
  const record = { startedAt: new Date().toISOString(), logs: '', blockedShows: 0, workerResumes: 0 }
  result.launches.push(record)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !['ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS', 'MINDNOTES_START_WORKSPACE'].includes(key)))
  const child = spawn(executable, ['--inspect-brk=0', '--remote-debugging-port=0'], {
    env: { ...env, NODE_ENV: 'production', MINDNOTES_USER_DATA_DIR: directory },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let processError
  child.once('error', (error) => { processError = error })
  const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })))
  child.stdout.on('data', (data) => { record.logs += data })
  child.stderr.on('data', (data) => { record.logs += data })
  const instance = { child, exited, record, socket: null }
  active = instance
  async function until(read, verify, timeoutMs = 20_000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (processError) throw processError
      if (child.exitCode !== null) throw new Error(`Packaged process exited ${child.exitCode}: ${record.logs}`)
      const value = await read()
      if (verify(value)) return value
      await pause(50)
    }
    throw new Error(`Hidden executable state timed out: ${record.logs}`)
  }
  const endpoint = await until(() => record.logs.match(/Debugger listening on (ws:\/\/[^\s]+)/)?.[1], Boolean)
  const socket = new WebSocket(endpoint)
  instance.socket = socket
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  const requests = new Map()
  const workerRequests = new Map()
  const workerTasks = []
  const pauses = []
  let sequence = 0
  let workerSequence = 0
  let protocolError
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      const timer = setTimeout(() => { requests.delete(id); reject(new Error(`Inspector timeout: ${method}`)) }, 12_000)
      timer.unref()
      requests.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }
  function workerSend(sessionId, method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++workerSequence
      const timer = setTimeout(() => { workerRequests.delete(id); reject(new Error(`Worker inspector timeout: ${method}`)) }, 12_000)
      timer.unref()
      workerRequests.set(id, { resolve, reject, timer })
      send('NodeWorker.sendMessageToWorker', { sessionId, message: JSON.stringify({ id, method, params }) }).catch(reject)
    })
  }
  function trackWorker(task) {
    task.catch((error) => { protocolError = error })
    workerTasks.push(task)
  }
  function respond(map, message) {
    const pending = map.get(message.id)
    if (!pending) return
    map.delete(message.id)
    clearTimeout(pending.timer)
    if (message.error) pending.reject(new Error(JSON.stringify(message.error)))
    else pending.resolve(message.result)
  }
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data))
    if (message.id) respond(requests, message)
    else if (message.method === 'Debugger.paused') pauses.push(message.params)
    else if (message.method === 'NodeWorker.receivedMessageFromWorker') {
      const workerMessage = JSON.parse(message.params.message)
      if (workerMessage.id) respond(workerRequests, workerMessage)
      else if (workerMessage.method === 'Debugger.paused')
        trackWorker(workerSend(message.params.sessionId, 'Debugger.resume'))
    } else if (message.method === 'NodeWorker.attachedToWorker') {
      const sessionId = message.params.sessionId
      // --inspect-brk is inherited by the storage worker. Resume its own
      // inspector as well; leaving it paused would create a false save timeout.
      trackWorker((async () => {
        await workerSend(sessionId, 'Runtime.enable')
        await workerSend(sessionId, 'Debugger.enable')
        await workerSend(sessionId, 'Debugger.setSkipAllPauses', { skip: true })
        await workerSend(sessionId, 'Runtime.runIfWaitingForDebugger')
        record.workerResumes++
      })())
    }
  })
  async function main(expression, awaitPromise = true) {
    if (protocolError) throw protocolError
    const value = await send('Runtime.evaluate', { expression, includeCommandLineAPI: true, returnByValue: true, awaitPromise })
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails))
    return value.result.value
  }
  async function renderer(surface, expression, userGesture = false) {
    const selector = surface === 'shell'
      ? `w.webContents.getURL().startsWith('file:') && !w.webContents.getURL().includes('surface=')`
      : `w.webContents.getURL().includes('surface=${surface}')`
    return main(`require('electron').BrowserWindow.getAllWindows().find(w=>${selector}).webContents.executeJavaScript(${JSON.stringify(expression)},${userGesture})`)
  }
  await send('Runtime.enable')
  await send('NodeWorker.enable', { waitForDebuggerOnStart: false })
  await send('Debugger.enable')
  await send('Runtime.runIfWaitingForDebugger')
  await until(() => pauses.length, (count) => count === 1)
  const hook = await main(`(() => {
    const {app,BrowserWindow}=require('electron');
    if(BrowserWindow.getAllWindows().length)throw new Error('Windows existed before visibility suppression');
    globalThis.__hiddenAcceptance={blockedShows:0,unexpectedShows:0};
    app.on('browser-window-created',(_event,window)=>{
      window.on('show',()=>{globalThis.__hiddenAcceptance.unexpectedShows++;window.hide()});
      for(const method of ['show','showInactive','restore'])window[method]=()=>{globalThis.__hiddenAcceptance.blockedShows++;window.hide()};
      window.focus=()=>{};window.moveTop=()=>{};
    });
    return {packaged:app.isPackaged,version:app.getVersion(),appPath:app.getAppPath()};
  })()`, false)
  assert.equal(hook.packaged, true)
  assert.equal(hook.version, version)
  assert.equal(path.resolve(hook.appPath), path.resolve(result.archive))
  await send('Debugger.resume')
  await until(() => main(`require('electron').BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().startsWith('file:')&&!w.webContents.isLoading()).length`), (count) => count === 2)
  await Promise.all(workerTasks)
  assert.ok(!record.logs.includes('[floating:recovery]'), 'Recovery must not time out')
  const state = await renderer('toolbar', 'window.mindnotesFloating.getState()')
  assert.equal(state.saveState, 'saved')
  instance.main = main
  instance.renderer = renderer
  instance.until = until
  instance.checkHidden = async () => {
    const hidden = await main(`({windows:require('electron').BrowserWindow.getAllWindows().map(w=>({visible:w.isVisible(),focused:w.isFocused()})),...globalThis.__hiddenAcceptance})`)
    assert.ok(hidden.windows.every((window) => !window.visible && !window.focused))
    assert.equal(hidden.unexpectedShows, 0)
    record.blockedShows = hidden.blockedShows
  }
  if (process.env.MINDNOTES_HIDDEN_SCREENSHOTS === '1') {
    const browserEndpoint = await until(() => record.logs.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1], Boolean)
    instance.browser = await chromium.connectOverCDP(browserEndpoint)
    instance.capture = async (label, surface = 'shell') => {
      await instance.checkHidden()
      const pages = instance.browser.contexts()[0].pages()
      const page = pages.find((candidate) => surface === 'shell'
        ? candidate.url().startsWith('file:') && !candidate.url().includes('surface=')
        : surface === 'page' ? candidate.url() === url : candidate.url().includes(`surface=${surface}`))
      assert.ok(page, `Missing screenshot surface ${surface}`)
      await mkdir(visualDirectory, { recursive: true })
      const file = path.join(visualDirectory, `${label}.png`)
      await main(`(() => {const {webContents}=require('electron');const fs=require('node:fs/promises');const wc=webContents.getAllWebContents().find(w=>w.getURL()===${JSON.stringify(page.url())});wc.setBackgroundThrottling(false);return wc.capturePage(undefined,{stayHidden:true,stayAwake:true}).then(()=>new Promise(resolve=>setTimeout(resolve,250))).then(()=>wc.capturePage(undefined,{stayHidden:true,stayAwake:true})).then(image=>fs.writeFile(${JSON.stringify(file)},image.toPNG()))})()`)
      await instance.checkHidden()
      result.screenshots ??= []
      result.screenshots.push({ label, surface, path: file, sha256: await digest(file), scope: 'Actual packaged renderer raster while native window remains hidden; no visible-desktop compositor claim.' })
    }
  }
  instance.close = async () => {
    await instance.checkHidden()
    await main(`require('electron').app.quit()`, false)
    socket.close()
    instance.socket = null
    const ending = await Promise.race([exited, pause(15_000).then(() => { throw new Error('Packaged process did not quit') })])
    assert.equal(ending.code, 0)
    assert.equal(protocolError, undefined)
    record.exit = ending
    record.endedAt = new Date().toISOString()
    await instance.browser?.close().catch(() => {})
    active = null
  }
  await instance.checkHidden()
  return instance
}
try {
  active = await launch()
  const display = await active.main(`(() => {const d=require('electron').screen.getPrimaryDisplay();return {id:String(d.id),width:d.bounds.width,height:d.bounds.height,label:d.label}})()`)
  result.stages.push({ name: 'empty-actual-executable-startup', state: await active.renderer('toolbar', 'window.mindnotesFloating.getState()'), display })
  if (active.capture) {
    await active.capture('empty-floating-bubble', 'toolbar')
    await active.renderer('toolbar', `window.mindnotesFloating.command('workspace')`)
    await active.until(() => active.main(`require('electron').BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().startsWith('file:')&&!w.webContents.getURL().includes('surface=')&&!w.webContents.isLoading()).length`), (count) => count === 1)
    await active.capture('empty-unified-library')
  }
  await active.close()

  const strokes = Array.from({ length: 1000 }, (_, index) => ({
    id: `hidden_ink_${index}`, tool: 'pen', color: '#e05d52', width: 4,
    points: Array.from({ length: 13 }, (_, point) => ({
      x: 70 + (index % 8) * 100 + point * 8,
      y: 80 + (Math.floor(index / 8) % 12) * 40 + point,
    })),
  }))
  const inkHash = createHash('sha256').update(JSON.stringify(strokes)).digest('hex')
  const draft = { displayId: display.id, width: display.width, height: display.height, strokes, backgroundId: null,
    source: { app: 'Generated test fixture', title: 'Synthetic ink; no screen capture', display: display.label }, updatedAt: Date.now() }
  const image = new PNG({ width: 320, height: 200 })
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = 25; image.data[offset + 1] = 87; image.data[offset + 2] = 147; image.data[offset + 3] = 255
  }
  const png = PNG.sync.write(image)
  const note = { id: 'hidden_saved_note', title: '隐藏发行包复用验收', comment: '保留截图与可编辑笔迹。', source: draft.source,
    width: display.width, height: display.height, strokes: strokes.slice(0, 3), createdAt: 1, updatedAt: 1, revision: 1, trashedAt: null }
  const db = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'))
  try {
    db.prepare('INSERT INTO drafts(display_id,document) VALUES(?,?)').run(display.id, JSON.stringify(draft))
    db.prepare('INSERT INTO notes(id,document,title,comment,source_text,created_at,updated_at,trashed_at,image,thumbnail,source_app,source_title,source_display,stroke_count) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(note.id, JSON.stringify(note), note.title, note.comment, 'Generated fixture', 1, 1, null, png,
        `data:image/png;base64,${png.toString('base64')}`, note.source.app, note.source.title, note.source.display, note.strokes.length)
  } finally { db.close() }
  const annotation = { id: 'hidden_page_note', kind: 'ink', color: '#3979cf',
    points: [{ x: 12, y: 12 }, { x: 64, y: 12 }], anchor: { selector: '#target', text: fixtureText, x: 0, y: 0 },
    quote: null, comment: '网页复盘验收。', createdAt: 1, updatedAt: 1 }
  const page = { url, title: '隐藏网页笔记', annotations: [annotation], createdAt: 1, updatedAt: 1 }
  await writeFile(path.join(directory, 'page-notes.json'), JSON.stringify({ format: 'mindnotes-pro.page-notes', version: 1, pages: [page] }))

  active = await launch()
  const recovered = await active.renderer('toolbar', 'window.mindnotesFloating.getState()')
  assert.equal(recovered.count, 1000)
  assert.equal(recovered.recovered, true)
  assert.equal(recovered.collapsed, true)
  assert.equal(recovered.tool, 'pointer')
  assert.deepEqual((await active.renderer('screen', 'window.mindnotesScreen.getState()')).strokes, strokes)
  result.stages.push({ name: 'seeded-1000-stroke-recovery', count: 1000, points: 13000, geometrySha256: inkHash })
  await active.renderer('toolbar', `window.mindnotesFloating.command('expand')`)
  await active.renderer('toolbar', `window.mindnotesFloating.configure('erase','#e05d52','medium')`)
  await active.renderer('screen', `window.mindnotesScreen.erase([{x:50,y:80},{x:180,y:100}])`)
  const erased = await active.renderer('toolbar', 'window.mindnotesFloating.getState()')
  assert.ok(erased.count > 0 && erased.count < 1000)
  await active.renderer('toolbar', `window.mindnotesFloating.command('undo')`)
  await active.until(() => active.renderer('toolbar', 'window.mindnotesFloating.getState()'), (state) => state.count === 1000 && state.saveState === 'saved')
  assert.deepEqual((await active.renderer('screen', 'window.mindnotesScreen.getState()')).strokes, strokes)
  result.stages.push({ name: 'programmatic-erase-and-undo', afterErase: erased.count, afterUndo: 1000, geometrySha256: inkHash })
  await active.renderer('toolbar', `window.mindnotesFloating.command('pointer')`)
  assert.equal((await active.renderer('screen', 'window.mindnotesScreen.getState()')).inputEnabled, false)
  if (active.capture) {
    await active.capture('expanded-toolbar', 'toolbar')
    await active.renderer('toolbar', `window.mindnotesFloating.command('more-panel')`)
    await active.capture('more-panel', 'toolbar')
    await active.renderer('toolbar', `window.mindnotesFloating.command('brush-panel')`)
    await active.capture('brush-panel', 'toolbar')
    await active.renderer('toolbar', `window.mindnotesFloating.command('close-panel')`)
  }
  await active.renderer('toolbar', `window.mindnotesFloating.command('workspace')`)
  await active.until(() => active.main(`require('electron').BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().startsWith('file:')&&!w.webContents.getURL().includes('surface=')&&!w.webContents.isLoading()).length`), (count) => count === 1)
  assert.deepEqual((await active.renderer('shell', 'window.mindnotes.getState()')).pages, [page])
  assert.deepEqual(await active.renderer('shell', `window.mindnotesNotebook.getNote('${note.id}')`), note)
  const comment = '当前发行 exe 的修改在重启后仍完整保留。'
  await active.renderer('shell', `window.mindnotesNotebook.updateNote('${note.id}',{comment:${JSON.stringify(comment)},expectedRevision:1})`)
  const savedNote = await active.renderer('shell', `window.mindnotesNotebook.getNote('${note.id}')`)
  assert.equal(savedNote.comment, comment)
  assert.deepEqual(savedNote.strokes, note.strokes)
  if (active.capture) {
    await active.capture('unified-library')
    await active.until(() => active.renderer('shell', `Boolean(document.querySelector('button[aria-label="打开屏幕笔记 ${note.title}"]'))`), Boolean)
    await active.renderer('shell', `document.querySelector('button[aria-label="打开屏幕笔记 ${note.title}"]').click()`)
    await active.until(() => active.renderer('shell', `Boolean(document.querySelector('textarea[aria-label="屏幕笔记结论"]'))`), Boolean)
    await active.capture('screen-note-editor')
    await active.main(`require('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('file:')&&!w.webContents.getURL().includes('surface=')).setSize(900,640)`, false)
    await active.capture('small-screen-note-editor')
    await active.renderer('shell', `Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes('返回')).click()`)
  }

  const corrupted = path.join(directory, 'truncated-import.json')
  const validBackup = path.join(directory, 'valid-import.json')
  const importedNote = { ...note, id: 'hidden_imported_note', updatedAt: Date.now() }
  const backup = JSON.stringify({ format: 'mindnotes-pro.screen-notes', version: 1, notes: [{ note: importedNote, image: png.toString('base64') }] })
  await writeFile(corrupted, backup.slice(0, -1))
  await writeFile(validBackup, backup)
  const beforeImport = await active.renderer('shell', 'window.mindnotesNotebook.list()')
  await active.main(`require('electron').dialog.showOpenDialog=async()=>({canceled:false,filePaths:[${JSON.stringify(corrupted)}]})`, false)
  const importFailure = await active.renderer('shell', `window.mindnotesNotebook.importBackup().then(()=>({accepted:true}),error=>({accepted:false,message:error.message}))`)
  assert.equal(importFailure.accepted, false)
  assert.match(importFailure.message, /备份文件不完整或格式损坏，请重新导出后再导入/)
  assert.deepEqual(await active.renderer('shell', 'window.mindnotesNotebook.list()'), beforeImport)
  await active.main(`require('electron').dialog.showOpenDialog=async()=>({canceled:false,filePaths:[${JSON.stringify(validBackup)}]})`, false)
  assert.equal(await active.renderer('shell', 'window.mindnotesNotebook.importBackup()'), 1)
  assert.equal((await active.renderer('shell', 'window.mindnotesNotebook.list()')).total, 2)
  result.stages.push({ name: 'actual-executable-corrupt-import-message-rollback-and-retry', message: importFailure.message, unchangedAfterFailure: true, importedOnRetry: 1 })

  await active.renderer('shell', `window.mindnotes.navigate(${JSON.stringify(url)})`)
  async function remote(expression, userGesture = false) {
    return active.main(`require('electron').webContents.getAllWebContents().find(w=>w.getURL()===${JSON.stringify(url)}).executeJavaScript(${JSON.stringify(expression)},${userGesture})`)
  }
  await active.until(() => remote('Boolean(window.__mindnotesOverlay)'), Boolean)
  const permissionChecks = await remote(`Promise.all(['geolocation','notifications','camera','microphone'].map(async name=>({name,state:(await navigator.permissions.query({name})).state})))`)
  assert.ok(permissionChecks.every((permission) => permission.state === 'denied'))
  const denied = await remote(`Promise.all([
    Notification.requestPermission(),
    new Promise(resolve=>navigator.geolocation.getCurrentPosition(()=>resolve('granted'),error=>resolve(error.code))),
    navigator.mediaDevices.getUserMedia({audio:true,video:true}).then(stream=>{stream.getTracks().forEach(track=>track.stop());return 'granted'},error=>error.name)
  ])`)
  assert.deepEqual(denied, ['denied', 1, 'NotAllowedError'])
  assert.equal(await remote(`navigator.mediaDevices.getDisplayMedia({video:true}).then(stream=>{stream.getTracks().forEach(track=>track.stop());return 'granted'},error=>error.name)`, true), 'NotAllowedError')
  assert.deepEqual(await remote('({require:typeof require,process:typeof process,shell:typeof window.mindnotes,notebook:typeof window.mindnotesNotebook})'),
    { require: 'undefined', process: 'undefined', shell: 'undefined', notebook: 'undefined' })
  const pageComment = '网页权限拒绝后仍可复盘和导出。'
  await active.renderer('shell', `window.mindnotes.updateAnnotation(${JSON.stringify(url)},'${annotation.id}',${JSON.stringify(pageComment)})`)
  await active.until(() => active.renderer('shell', 'window.mindnotes.getState()'), (state) => state.saveState === 'saved')
  const savedPages = (await active.renderer('shell', 'window.mindnotes.getState()')).pages
  assert.equal(savedPages[0].annotations[0].comment, pageComment)
  assert.deepEqual(savedPages[0].annotations[0].points, annotation.points)
  if (active.capture) {
    await active.capture('small-page-workspace')
    await active.capture('injected-article', 'page')
    await active.main(`require('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('file:')&&!w.webContents.getURL().includes('surface=')).setSize(1380,920)`, false)
    await active.capture('page-workspace')
  }
  result.stages.push({ name: 'actual-executable-remote-permission-denial-and-note-edit', checks: permissionChecks, requests: denied, displayCapture: 'NotAllowedError', pageComment })

  const exports = []
  for (const [name, expression] of [
    ['page-notes.md', `window.mindnotes.exportNotes('markdown','all')`],
    ['page-notes.json', `window.mindnotes.exportNotes('json','all')`],
    ['screen-note.md', `window.mindnotesNotebook.exportNote('${note.id}','markdown')`],
    ['screen-note.json', `window.mindnotesNotebook.exportNote('${note.id}','json')`],
    ['screen-note.png', `window.mindnotesNotebook.exportNote('${note.id}','png')`],
  ]) {
    const file = path.join(directory, 'exports', name)
    await mkdir(path.dirname(file), { recursive: true })
    await active.main(`require('electron').dialog.showSaveDialog=async()=>({canceled:false,filePath:${JSON.stringify(file)}})`, false)
    assert.equal(await active.renderer('shell', expression), file)
    exports.push({ name, sha256: await digest(file) })
  }
  assert.match(await readFile(path.join(directory, 'exports/page-notes.md'), 'utf8'), /网页权限拒绝后仍可复盘和导出/)
  assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'exports/page-notes.json'), 'utf8')).pages, savedPages)
  assert.match(await readFile(path.join(directory, 'exports/screen-note.md'), 'utf8'), /当前发行 exe 的修改在重启后仍完整保留/)
  assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'exports/screen-note.json'), 'utf8')).notes[0].note, savedNote)
  const composed = PNG.sync.read(await readFile(path.join(directory, 'exports/screen-note.png')))
  assert.equal(composed.width, image.width)
  assert.equal(composed.height, image.height)
  assert.deepEqual(Array.from(composed.data.subarray(0, 4)), [25, 87, 147, 255])
  const penX = Math.round(118 * composed.width / display.width)
  const penY = Math.round(86 * composed.height / display.height)
  let redPixel = false
  for (let y = penY - 2; y <= penY + 2; y++) {
    for (let x = penX - 2; x <= penX + 2; x++) {
      const at = (y * composed.width + x) * 4
      if (composed.data[at] > 100 && composed.data[at + 3] === 255) redPixel = true
    }
  }
  assert.ok(redPixel, 'Composited PNG must contain the editable ink at its scaled coordinates')
  result.stages.push({ name: 'actual-executable-generated-background-png-composition', width: composed.width, height: composed.height, scaledInkPixelFound: redPixel, realDesktopCapture: false })
  result.stages.push({ name: 'reusable-page-and-screen-exports', exports })
  await active.renderer('shell', 'window.mindnotesNotebook.flushEdits()')
  await active.close()

  active = await launch()
  assert.deepEqual((await active.renderer('screen', 'window.mindnotesScreen.getState()')).strokes, strokes)
  assert.equal((await active.renderer('toolbar', 'window.mindnotesFloating.getState()')).count, 1000)
  await active.renderer('toolbar', `window.mindnotesFloating.command('workspace')`)
  await active.until(() => active.main(`require('electron').BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().startsWith('file:')&&!w.webContents.getURL().includes('surface=')&&!w.webContents.isLoading()).length`), (count) => count === 1)
  assert.deepEqual((await active.renderer('shell', 'window.mindnotes.getState()')).pages, savedPages)
  assert.deepEqual(await active.renderer('shell', `window.mindnotesNotebook.getNote('${note.id}')`), savedNote)
  assert.deepEqual(await active.renderer('shell', `window.mindnotesNotebook.getNote('${importedNote.id}')`), importedNote)
  result.stages.push({ name: 'second-restart-preserves-all-edits-and-exact-geometry', strokes: 1000, geometrySha256: inkHash, screenNotes: 2, pageNotes: savedPages.length })
  await active.close()
  result.status = 'passed'
} catch (error) {
  result.status = 'failed'
  result.error = String(error.stack ?? error)
  process.exitCode = 1
} finally {
  if (active) {
    active.socket?.close()
    await active.browser?.close().catch(() => {})
    if (active.child.exitCode === null) active.child.kill()
    await Promise.race([active.exited, pause(3000)])
  }
  await new Promise((resolve) => server.close(resolve))
  result.endedAt = new Date().toISOString()
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify({ status: result.status, output, stages: result.stages.map((stage) => stage.name), error: result.error }, null, 2))
}
