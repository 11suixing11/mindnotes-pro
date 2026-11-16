import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { PNG } from 'pngjs'
import { validScreenStrokes, validateScreenNote } from '../../dist-electron/src/notes/screenNotebook.js'
import { createBackup, decodeBackup } from '../../dist-electron/src/notes/model.js'
import { importedScreenThumbnail } from '../../dist-electron/electron/screenImages.mjs'
import { makeStrokes, makeScreenEntries, makePageNotebooks, fixtureIdentity } from './fixtures.mjs'

test('default strokes fill the valid workload and the standalone long stroke stays valid', () => {
  const strokes = makeStrokes()
  assert.equal(strokes.length, 1000)
  assert.equal(strokes.reduce((sum, stroke) => sum + stroke.points.length, 0), 160000)
  assert.equal(validScreenStrokes(strokes), true)
  assert.equal(validScreenStrokes(makeStrokes(1, 8000)), true)
  assert.deepEqual(makeStrokes(2, 3), makeStrokes(2, 3))
  assert.notStrictEqual(makeStrokes(2, 3)[0].points, makeStrokes(2, 3)[1].points)
  for (const args of [[1001], [1000, 161], [1, 8001], [-1], [1, 0], [NaN], [1.5]])
    assert.throws(() => makeStrokes(...args))
})

test('screen entries contain independent v1 notes and fully decodable deterministic PNG data', () => {
  const entries = makeScreenEntries(100)
  assert.equal(entries.length, 100)
  assert.equal(new Set(entries.map(entry => entry.note.id)).size, 100)
  for (const { note, png, thumbnail } of entries) {
    assert.deepEqual(validateScreenNote(note), note)
    assert.ok(png instanceof Uint8Array)
    const decoded = PNG.sync.read(Buffer.from(png))
    assert.equal(decoded.width, note.width)
    assert.equal(decoded.height, note.height)
    assert.equal(importedScreenThumbnail(png), thumbnail)
  }
  assert.deepEqual(makeScreenEntries(2), makeScreenEntries(2))
  const original = entries[1].note.strokes[0].points[0].x
  entries[0].note.strokes[0].points[0].x = 999
  assert.equal(entries[1].note.strokes[0].points[0].x, original)
  for (const count of [-1, NaN, 1.5, 10001]) assert.throws(() => makeScreenEntries(count))
})

test('page fixtures satisfy the actual v1 annotation/backup contract and stay within page limits', () => {
  const pages = makePageNotebooks()
  assert.equal(pages.length, 100)
  assert.equal(pages[0].url, 'https://baseline.invalid/article/0')
  assert.ok(pages.every(page => page.annotations.length > 0))
  assert.deepEqual(decodeBackup(JSON.stringify(createBackup(pages))).pages, pages)
  assert.equal(decodeBackup(JSON.stringify(createBackup(makePageNotebooks(2000)))).pages.length, 2000)
  assert.deepEqual(makePageNotebooks(2), makePageNotebooks(2))
  for (const count of [2001, -1, NaN, 1.5]) assert.throws(() => makePageNotebooks(count))
})

test('fixture identity hashes actual serialized fixture data with fixed version and seed', () => {
  assert.deepEqual(fixtureIdentity({ value: 42 }), { version: 'local-fixture-v1', seed: 20261113,
    sha256: createHash('sha256').update('{"value":42}').digest('hex') })
  assert.notEqual(fixtureIdentity(makePageNotebooks(1)).sha256, fixtureIdentity(makePageNotebooks(2)).sha256)
  const data = makeScreenEntries(1), before = fixtureIdentity(data).sha256
  data[0].note.comment += ' changed'
  assert.notEqual(fixtureIdentity(data).sha256, before)
  const binaryBefore = fixtureIdentity(data).sha256
  data[0].png[0] ^= 1
  assert.notEqual(fixtureIdentity(data).sha256, binaryBefore)
  assert.throws(() => fixtureIdentity(undefined))
  assert.throws(() => fixtureIdentity({ invalid: NaN }))
})
