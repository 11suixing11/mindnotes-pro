import { describe, it, expect, beforeEach } from 'vitest'
import { migrateOld, removeMigratedData } from './migration'

const MIGRATE_KEY = 'mindnotes-drawing-data'

describe('migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('migrateOld', () => {
    it('returns null when no old data exists', () => {
      expect(migrateOld()).toBeNull()
    })

    it('returns null when data has a non-old version', () => {
      localStorage.setItem(MIGRATE_KEY, JSON.stringify({ version: '2.0', strokes: [] }))
      expect(migrateOld()).toBeNull()
    })

    it('returns null when data has no strokes or shapes', () => {
      localStorage.setItem(MIGRATE_KEY, JSON.stringify({ version: 'old', strokes: [], shapes: [] }))
      expect(migrateOld()).toBeNull()
    })

    it('returns null when elements array ends up empty', () => {
      localStorage.setItem(
        MIGRATE_KEY,
        JSON.stringify({
          strokes: [{ id: null, points: [] }], // invalid, will be skipped
          shapes: [],
        })
      )
      expect(migrateOld()).toBeNull()
    })

    it('migrates a stroke element', () => {
      const data = {
        strokes: [
          {
            id: 's1',
            points: [
              [10, 20],
              [30, 40],
            ],
            color: '#000',
            size: 2,
            brush: 'pen',
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result).not.toBeNull()
      expect(result!.elements).toHaveLength(1)
      expect(result!.elements[0]).toEqual({
        type: 'stroke',
        id: 's1',
        points: [
          [10, 20],
          [30, 40],
        ],
        color: '#000',
        size: 2,
        brush: 'pen',
        opacity: undefined,
      })
    })

    it('migrates an image element', () => {
      const data = {
        strokes: [
          {
            id: 'img1',
            points: [[50, 60]],
            imageData: 'data:image/png;base64,abc',
            imageWidth: 300,
            imageHeight: 200,
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result).not.toBeNull()
      expect(result!.elements[0]).toMatchObject({
        type: 'image',
        id: 'img1',
        x: 50,
        y: 60,
        width: 300,
        height: 200,
        dataUrl: 'data:image/png;base64,abc',
      })
    })

    it('migrates a text element (stroke with name)', () => {
      const data = {
        strokes: [
          {
            id: 't1',
            points: [[100, 200]],
            name: 'Hello World',
            size: 4,
            color: '#2c2416',
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result).not.toBeNull()
      expect(result!.elements[0]).toMatchObject({
        type: 'text',
        id: 't1',
        x: 100,
        y: 200,
        content: 'Hello World',
        fontSize: 16, // Math.max(4*4, 16) = 16
        color: '#2c2416',
      })
    })

    it('migrates text element with larger font size', () => {
      const data = {
        strokes: [
          {
            id: 't2',
            points: [[0, 0]],
            name: 'Big text',
            size: 10,
            color: '#000',
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result!.elements[0]).toMatchObject({
        type: 'text',
        fontSize: 40, // 10 * 4 = 40
      })
    })

    it('migrates shapes', () => {
      const data = {
        shapes: [
          {
            id: 'sh1',
            type: 'rectangle',
            startX: 10,
            startY: 20,
            endX: 110,
            endY: 70,
            color: '#ff0000',
            size: 3,
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result).not.toBeNull()
      expect(result!.elements[0]).toMatchObject({
        type: 'shape',
        id: 'sh1',
        kind: 'rectangle',
        x: 10,
        y: 20,
        w: 100,
        h: 50,
        color: '#ff0000',
        size: 3,
      })
    })

    it('skips text-type shapes', () => {
      const data = {
        shapes: [
          {
            id: 'sh-text',
            type: 'text',
            startX: 10,
            startY: 20,
            endX: 110,
            endY: 70,
          },
          {
            id: 'sh-rect',
            type: 'rectangle',
            startX: 10,
            startY: 20,
            endX: 110,
            endY: 70,
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result).not.toBeNull()
      expect(result!.elements).toHaveLength(1)
      expect(result!.elements[0].id).toBe('sh-rect')
    })

    it('skips shapes without id', () => {
      const data = {
        shapes: [{ type: 'rectangle', startX: 10, startY: 20, endX: 110, endY: 70 }],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      expect(migrateOld()).toBeNull()
    })

    it('uses fallback coordinates for shapes', () => {
      const data = {
        shapes: [
          {
            id: 'sh1',
            type: 'circle',
            x: 50,
            y: 60,
            width: 100,
            height: 80,
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result).not.toBeNull()
      // startX falls back to x, endX falls back to x + width
      expect(result!.elements[0]).toMatchObject({
        type: 'shape',
        kind: 'circle',
        x: 50,
        y: 60,
        w: 100,
        h: 80,
      })
    })

    it('migrates strokes without brush type defaults to pen', () => {
      const data = {
        strokes: [
          {
            id: 's1',
            points: [[0, 0]],
            color: '#000',
            size: 2,
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect((result!.elements[0] as any).brush).toBe('pen')
    })

    it('sets canvasBg from data', () => {
      const data = {
        canvasBg: '#f0f0f0',
        strokes: [{ id: 's1', points: [[0, 0]], color: '#000', size: 2 }],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result!.bgColor).toBe('#f0f0f0')
    })

    it('defaults bgColor to white when canvasBg is missing', () => {
      const data = {
        strokes: [{ id: 's1', points: [[0, 0]], color: '#000', size: 2 }],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result!.bgColor).toBe('#ffffff')
    })

    it('produces valid doc structure', () => {
      const data = {
        strokes: [{ id: 's1', points: [[0, 0]], color: '#000', size: 2 }],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result!.id).toMatch(/^doc-/)
      expect(result!.title).toBeTruthy()
      expect(result!.folderId).toBeNull()
      expect(result!.createdAt).toBeGreaterThan(0)
      expect(result!.updatedAt).toBeGreaterThan(0)
    })

    it('skips strokes without id', () => {
      const data = {
        strokes: [
          { points: [[0, 0]], color: '#000', size: 2 },
          { id: 's1', points: [[0, 0]], color: '#000', size: 2 },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result!.elements).toHaveLength(1)
    })

    it('skips strokes without points', () => {
      const data = {
        strokes: [
          { id: 's1', color: '#000', size: 2 },
          { id: 's2', points: [], color: '#000', size: 2 },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      expect(migrateOld()).toBeNull()
    })

    it('skips strokes with non-array points', () => {
      const data = {
        strokes: [{ id: 's1', points: 'not-an-array', color: '#000', size: 2 }],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      expect(migrateOld()).toBeNull()
    })

    it('handles malformed JSON gracefully', () => {
      localStorage.setItem(MIGRATE_KEY, 'not valid json{{{')
      expect(migrateOld()).toBeNull()
    })

    it('handles image with default dimensions', () => {
      const data = {
        strokes: [
          {
            id: 'img1',
            points: [[0, 0]],
            imageData: 'data:image/png;base64,xyz',
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result!.elements[0]).toMatchObject({
        type: 'image',
        width: 200,
        height: 200,
      })
    })

    it('normalizes shape coordinates (negative width/height)', () => {
      const data = {
        shapes: [
          {
            id: 'sh1',
            type: 'rectangle',
            startX: 100,
            startY: 100,
            endX: 50,
            endY: 50,
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect(result!.elements[0]).toMatchObject({
        x: 50,
        y: 50,
        w: 50,
        h: 50,
      })
    })

    it('skips shapes with undefined coordinates', () => {
      const data = {
        shapes: [
          {
            id: 'sh1',
            type: 'rectangle',
            // no startX, startY, endX, endY, x, y, width, height
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      // startX falls back to s.x which is undefined
      // The shape should be skipped since coordinates are undefined
      // But actually s.x and s.y are undefined so sx and sy are undefined
      // The check `if (sx === undefined || sy === undefined || ex === undefined || ey === undefined)` should skip it
      const result = migrateOld()
      // Either null or shape is skipped
      if (result) {
        // The shape may have NaN values but won't be undefined
        expect(result.elements).toHaveLength(0)
      }
    })

    it('includes opacity on strokes', () => {
      const data = {
        strokes: [
          {
            id: 's1',
            points: [[0, 0]],
            color: '#000',
            size: 2,
            opacity: 0.5,
          },
        ],
      }
      localStorage.setItem(MIGRATE_KEY, JSON.stringify(data))
      const result = migrateOld()
      expect((result!.elements[0] as any).opacity).toBe(0.5)
    })
  })

  describe('removeMigratedData', () => {
    it('removes the migration key from localStorage', () => {
      localStorage.setItem(MIGRATE_KEY, 'some data')
      removeMigratedData()
      expect(localStorage.getItem(MIGRATE_KEY)).toBeNull()
    })

    it('does nothing when key does not exist', () => {
      expect(() => removeMigratedData()).not.toThrow()
    })
  })
})
