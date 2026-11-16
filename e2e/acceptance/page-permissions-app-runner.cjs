const { app, BrowserWindow, webContents } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

app.setPath('userData', process.env.MINDNOTES_PERMISSION_DATA)
const result = {
  version: process.env.MINDNOTES_PERMISSION_VERSION,
  status: 'running',
  hiddenWindows: true,
  stages: [],
}
app.on('browser-window-created', (_event, window) => {
  window.show = () => {
    window.hide()
  }
  window.showInactive = () => {
    window.hide()
  }
  window.focus = () => {}
})
const timer = setTimeout(() => {
  result.status = 'failed'
  result.error = 'Application permission acceptance exceeded 45 seconds'
  fs.writeFile(process.env.MINDNOTES_PERMISSION_RESULT, JSON.stringify(result, null, 2)).finally(
    () => app.exit(1)
  )
}, 45_000)
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function waitFor(read, verify) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const value = await read().catch(() => null)
    if (verify(value)) return value
    await pause(100)
  }
  throw new Error('Application acceptance state was not reached')
}
async function run() {
  await import(pathToFileURL(process.env.MINDNOTES_PERMISSION_APP_MAIN).href)
  await app.whenReady()
  const shell = await waitFor(
    async () =>
      BrowserWindow.getAllWindows().find(
        (window) =>
          window.webContents.getURL().startsWith('file:') && !window.webContents.isLoading()
      ),
    Boolean
  )
  await waitFor(
    () => shell.webContents.executeJavaScript('Boolean(window.mindnotes?.isDesktop)'),
    Boolean
  )
  await shell.webContents.executeJavaScript(
    `window.mindnotes.navigate(${JSON.stringify(process.env.MINDNOTES_PERMISSION_URL)})`
  )
  const page = await waitFor(
    async () =>
      webContents
        .getAllWebContents()
        .find(
          (contents) =>
            contents.getURL() === process.env.MINDNOTES_PERMISSION_URL && !contents.isLoading()
        ),
    Boolean
  )
  await waitFor(() => page.executeJavaScript('Boolean(window.__mindnotesOverlay)'), Boolean)
  const checks = await page.executeJavaScript(
    `Promise.all(['geolocation','notifications','camera','microphone'].map(async name => ({name,state:(await navigator.permissions.query({name})).state})))`
  )
  for (const check of checks) assert.equal(check.state, 'denied', check.name)
  result.stages.push({ name: 'actual-app-permission-checks', results: checks })
  const requests = await page.executeJavaScript(`Promise.all([
    Notification.requestPermission().then(value=>({name:'notifications',value})),
    new Promise(resolve=>navigator.geolocation.getCurrentPosition(()=>resolve({name:'geolocation',code:0}),error=>resolve({name:'geolocation',code:error.code}))),
    navigator.mediaDevices.getUserMedia({audio:true,video:true}).then(stream=>{stream.getTracks().forEach(track=>track.stop());return {name:'media',value:'granted'}},error=>({name:'media',value:error.name}))
  ])`)
  assert.equal(requests.find((value) => value.name === 'notifications').value, 'denied')
  assert.equal(requests.find((value) => value.name === 'geolocation').code, 1)
  assert.equal(requests.find((value) => value.name === 'media').value, 'NotAllowedError')
  result.stages.push({ name: 'actual-app-permission-requests', results: requests })
  const capture = await page.executeJavaScript(
    `navigator.mediaDevices.getDisplayMedia({video:true}).then(stream=>{stream.getTracks().forEach(track=>track.stop());return 'granted'},error=>error.name)`,
    true
  )
  assert.equal(capture, 'NotAllowedError')
  result.stages.push({ name: 'actual-app-display-capture', denied: capture })
  assert.notEqual(page.session, shell.webContents.session)
  assert.deepEqual(
    await page.executeJavaScript(
      '({require:typeof require,process:typeof process,shell:typeof window.mindnotes,notebook:typeof window.mindnotesNotebook})'
    ),
    { require: 'undefined', process: 'undefined', shell: 'undefined', notebook: 'undefined' }
  )
  const at = Date.now()
  const annotation = {
    id: 'permission_reading_note',
    kind: 'note',
    color: '#e0a11b',
    points: [{ x: 24, y: 24 }],
    anchor: null,
    quote: null,
    comment: '',
    createdAt: at,
    updatedAt: at,
  }
  await shell.webContents.executeJavaScript(`window.mindnotes.configure('note','#e0a11b')`)
  await page.executeJavaScript(
    `window.__mindnotesPage.edit(${JSON.stringify({ type: 'add', annotation })})`
  )
  await waitFor(
    () => shell.webContents.executeJavaScript('window.mindnotes.getState()'),
    (state) =>
      state?.pages.some((value) => value.annotations.some((item) => item.id === annotation.id))
  )
  const comment = '权限拒绝后网页批注和保存继续正常。'
  await shell.webContents.executeJavaScript(
    `window.mindnotes.updateAnnotation(${JSON.stringify(process.env.MINDNOTES_PERMISSION_URL)},${JSON.stringify(annotation.id)},${JSON.stringify(comment)})`
  )
  const saved = await waitFor(
    () => shell.webContents.executeJavaScript('window.mindnotes.getState()'),
    (state) =>
      state?.saveState === 'saved' &&
      state.pages.some((value) => value.annotations.some((item) => item.comment === comment))
  )
  const persisted = JSON.parse(
    await fs.readFile(path.join(process.env.MINDNOTES_PERMISSION_DATA, 'page-notes.json'), 'utf8')
  )
  assert.ok(
    persisted.pages.some((value) =>
      value.annotations.some((item) => item.id === annotation.id && item.comment === comment)
    )
  )
  result.stages.push({
    name: 'actual-app-annotation-and-save',
    annotationId: annotation.id,
    comment,
    saveState: saved.saveState,
    persisted: true,
  })
  assert.ok(BrowserWindow.getAllWindows().every((window) => !window.isVisible()))
  result.status = 'passed'
}
run()
  .catch((error) => {
    result.status = 'failed'
    result.error = String(error.stack ?? error)
  })
  .finally(async () => {
    clearTimeout(timer)
    await fs.writeFile(process.env.MINDNOTES_PERMISSION_RESULT, JSON.stringify(result, null, 2))
    app.exit(result.status === 'passed' ? 0 : 1)
  })
