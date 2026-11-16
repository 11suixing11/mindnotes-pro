const { app, BrowserWindow, session } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { pathToFileURL } = require('node:url')
const { randomUUID } = require('node:crypto')

app.setPath('userData', process.env.MINDNOTES_PERMISSION_DATA)
const result = {
  version: process.env.MINDNOTES_PERMISSION_VERSION,
  status: 'running',
  hiddenWindows: true,
  stages: [],
}
const timer = setTimeout(() => {
  result.status = 'failed'
  result.error = 'Permission acceptance exceeded 45 seconds'
  fs.writeFile(process.env.MINDNOTES_PERMISSION_RESULT, JSON.stringify(result, null, 2)).finally(
    () => app.exit(1)
  )
}, 45_000)
let tested
let trusted
app
  .whenReady()
  .then(async () => {
    const baseline = process.env.MINDNOTES_PERMISSION_BASELINE === '1'
    const { restrictPagePermissions } = baseline
      ? { restrictPagePermissions() {} }
      : await import(pathToFileURL(process.env.MINDNOTES_PERMISSION_POLICY).href)
    const remoteSession = session.fromPartition(`mindnotes-permission-remote-${randomUUID()}`)
    const trustedSession = session.fromPartition(`mindnotes-permission-trusted-${randomUUID()}`)
    restrictPagePermissions(remoteSession)
    tested = new BrowserWindow({
      show: false,
      webPreferences: {
        session: remoteSession,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    trusted = new BrowserWindow({
      show: false,
      webPreferences: {
        session: trustedSession,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    await tested.loadURL(process.env.MINDNOTES_PERMISSION_URL)
    await trusted.loadURL(process.env.MINDNOTES_PERMISSION_URL)
    if (baseline) {
      const status = await tested.webContents.executeJavaScript('Notification.permission')
      const requested = await tested.webContents.executeJavaScript(
        'Notification.requestPermission()'
      )
      assert.equal(status, 'granted')
      assert.equal(requested, 'granted')
      result.stages.push({ name: 'previous-electron-defaults', notification: status, requested })
      result.status = 'passed'
      return
    }
    const state = await tested.webContents.executeJavaScript(
      `Promise.all(['geolocation', 'notifications', 'camera', 'microphone'].map(async name => ({ name, state: (await navigator.permissions.query({ name })).state })))`
    )
    for (const item of state) assert.equal(item.state, 'denied', item.name)
    result.stages.push({ name: 'permission-checks', results: state })
    const requests = await tested.webContents.executeJavaScript(`Promise.all([
    Notification.requestPermission().then(value => ({ name: 'notifications', value })),
    new Promise(resolve => navigator.geolocation.getCurrentPosition(() => resolve({ name: 'geolocation', code: 0 }), error => resolve({ name: 'geolocation', code: error.code }))),
    navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => { stream.getTracks().forEach(track => track.stop()); return { name: 'media', value: 'granted' } }, error => ({ name: 'media', value: error.name }))
  ])`)
    assert.equal(requests.find((item) => item.name === 'notifications').value, 'denied')
    assert.equal(requests.find((item) => item.name === 'geolocation').code, 1)
    assert.equal(requests.find((item) => item.name === 'media').value, 'NotAllowedError')
    result.stages.push({ name: 'permission-requests', results: requests })
    const frameState = await tested.webContents.executeJavaScript(
      `Promise.all(['geolocation', 'notifications', 'camera', 'microphone'].map(async name => ({ name, state: (await document.querySelector('iframe').contentWindow.navigator.permissions.query({ name })).state })))`
    )
    for (const item of frameState) assert.equal(item.state, 'denied', item.name)
    result.stages.push({ name: 'iframe-checks', results: frameState })
    const available = await tested.webContents.executeJavaScript(
      `({ hid: Boolean(navigator.hid), serial: Boolean(navigator.serial), usb: Boolean(navigator.usb) })`
    )
    const devices = await tested.webContents.executeJavaScript(`Promise.all([
    navigator.hid ? navigator.hid.getDevices().then(value => ({ name: 'hid', count: value.length }), error => ({ name: 'hid', error: error.name })) : { name: 'hid', unsupported: true },
    navigator.serial ? navigator.serial.getPorts().then(value => ({ name: 'serial', count: value.length }), error => ({ name: 'serial', error: error.name })) : { name: 'serial', unsupported: true },
    navigator.usb ? navigator.usb.getDevices().then(value => ({ name: 'usb', count: value.length }), error => ({ name: 'usb', error: error.name })) : { name: 'usb', unsupported: true }
  ])`)
    for (const item of devices)
      assert.ok(
        item.unsupported ||
          item.count === 0 ||
          ['SecurityError', 'NotAllowedError'].includes(item.error),
        item.name
      )
    result.stages.push({ name: 'device-access', available, results: devices })
    const capture = await tested.webContents.executeJavaScript(
      `navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => { stream.getTracks().forEach(track => track.stop()); return 'granted' }, error => error.name)`,
      true
    )
    assert.equal(capture, 'NotAllowedError')
    result.stages.push({ name: 'display-capture', denied: capture })
    const reading = await tested.webContents.executeJavaScript(
      `document.getElementById('reader').textContent`
    )
    assert.equal(reading, 'Reading text remains available.')
    const isolation = await tested.webContents.executeJavaScript(
      `({ require: typeof require, process: typeof process })`
    )
    assert.deepEqual(isolation, { require: 'undefined', process: 'undefined' })
    const trustedNotifications =
      await trusted.webContents.executeJavaScript(`Notification.permission`)
    assert.notEqual(trustedNotifications, 'denied')
    result.stages.push({
      name: 'ordinary-reading-and-session-isolation',
      reading,
      isolation,
      trustedNotifications,
    })
    assert.equal(tested.isVisible(), false)
    assert.equal(trusted.isVisible(), false)
    result.status = 'passed'
  })
  .catch((error) => {
    result.status = 'failed'
    result.error = String(error.stack ?? error)
  })
  .finally(async () => {
    clearTimeout(timer)
    tested?.destroy()
    trusted?.destroy()
    await fs.writeFile(process.env.MINDNOTES_PERMISSION_RESULT, JSON.stringify(result, null, 2))
    app.exit(result.status === 'passed' ? 0 : 1)
  })
