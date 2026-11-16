import { createHash } from 'node:crypto'
import { PNG } from 'pngjs'

const seed = 20261113
const timestamp = 1794528000000
function countWithin(value, minimum, maximum, name) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new RangeError(`${name} is out of range.`)
}

export function makeStrokes(count = 1000, pointsPerStroke = 160) {
  countWithin(count, 0, 1000, 'Stroke count')
  countWithin(pointsPerStroke, 1, 8000, 'Points per stroke')
  if (count * pointsPerStroke > 160000) throw new RangeError('Total points exceed the draft limit.')
  return Array.from({ length: count }, (_, index) => ({
    id: `fixture-stroke-${index}`, tool: index % 4 === 0 ? 'highlight' : 'pen', color: '#e05d52',
    width: index % 4 === 0 ? 12 : 4,
    points: Array.from({ length: pointsPerStroke }, (_, point) => ({
      x: (seed + index * 37 + point * 7) % 1920,
      y: (seed + index * 53 + point * 11) % 1080,
    })),
  }))
}

function fixturePng() {
  const png = new PNG({ width: 4, height: 4 })
  for (let pixel = 0; pixel < 16; pixel++) {
    const offset = pixel * 4
    png.data[offset] = (seed + pixel * 17) % 256
    png.data[offset + 1] = (seed + pixel * 31) % 256
    png.data[offset + 2] = (seed + pixel * 47) % 256
    png.data[offset + 3] = 255
  }
  return PNG.sync.write(png)
}

/** Repository import entries, not serialized backup entries. */
export function makeScreenEntries(count) {
  countWithin(count, 0, 10000, 'Screen note count')
  const image = fixturePng()
  const thumbnail = `data:image/png;base64,${image.toString('base64')}`
  return Array.from({ length: count }, (_, index) => {
    const strokes = makeStrokes(2, 4).map(stroke => ({ ...stroke, width: 2,
      points: stroke.points.map(point => ({ x: point.x % 4, y: point.y % 4 })) }))
    return { note: { id: `fixture-screen-${index}`, title: `Baseline screen note ${index}`,
      comment: `Generated local baseline note ${index}; group ${index % 10}.`,
      source: { app: 'Local baseline', title: `Generated screen ${index}`, display: 'fixture-display' },
      width: 4, height: 4, strokes, createdAt: timestamp + index, updatedAt: timestamp + index,
      revision: 1, trashedAt: null }, png: new Uint8Array(image), thumbnail }
  })
}

export function makePageNotebooks(count = 100) {
  countWithin(count, 0, 2000, 'Page count')
  return Array.from({ length: count }, (_, index) => ({
    url: `https://baseline.invalid/article/${index}`, title: `Baseline article ${index}`,
    createdAt: timestamp + index, updatedAt: timestamp + index,
    annotations: [{ id: `fixture-page-${index}-note`, kind: 'note', color: '#e05d52',
      points: [{ x: 40, y: 80 }], anchor: { selector: 'article', text: `Generated article ${index}`, x: 40, y: 80 },
      quote: null, comment: `Generated offline page note ${index}.`, createdAt: timestamp + index, updatedAt: timestamp + index }],
  }))
}

/** JSON data is preserved; binary data has an explicit, byte-exact representation. */
export function fixtureIdentity(data) {
  const active = new Set()
  function normalize(value) {
    if (value instanceof Uint8Array) return { $bytes: Buffer.from(value).toString('base64') }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (!value || typeof value !== 'object' || active.has(value)) throw new TypeError('Fixture data must be finite JSON or binary data.')
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError('Fixture data contains an unsupported object.')
    active.add(value)
    const result = Array.isArray(value) ? Array.from(value, normalize) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]))
    active.delete(value)
    return result
  }
  const content = JSON.stringify(normalize(data))
  return { version: 'local-fixture-v1', seed, sha256: createHash('sha256').update(content).digest('hex') }
}
