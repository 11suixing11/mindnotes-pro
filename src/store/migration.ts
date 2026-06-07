import type { CanvasElement, CanvasDoc } from './types'

const MIGRATE_KEY = 'mindnotes-drawing-data'

/**
 * Migrate old localStorage format to new CanvasDoc format.
 * Returns null if no old data exists or migration fails.
 */
export function migrateOld(): CanvasDoc | null {
  try {
    const raw = localStorage.getItem(MIGRATE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const elements: CanvasElement[] = []

    // Migrate strokes
    for (const s of data.strokes ?? []) {
      if (s.imageData) {
        elements.push({
          type: 'image',
          id: s.id,
          x: s.points[0][0],
          y: s.points[0][1],
          width: s.imageWidth ?? 200,
          height: s.imageHeight ?? 200,
          dataUrl: s.imageData,
          opacity: s.opacity,
        })
      } else if (s.name) {
        elements.push({
          type: 'text',
          id: s.id,
          x: s.points[0][0],
          y: s.points[0][1],
          width: 200,
          height: 30,
          content: s.name,
          fontSize: Math.max(s.size * 4, 16),
          color: s.color,
        })
      } else {
        elements.push({
          type: 'stroke',
          id: s.id,
          points: s.points,
          color: s.color,
          size: s.size,
          brush: s.brush ?? 'pen',
          opacity: s.opacity,
        })
      }
    }

    // Migrate shapes
    for (const s of data.shapes ?? []) {
      const sx = s.startX ?? s.x
      const sy = s.startY ?? s.y
      const ex = s.endX ?? s.x + s.width
      const ey = s.endY ?? s.y + s.height
      if (s.type === 'text') continue
      elements.push({
        type: 'shape',
        id: s.id,
        kind: s.type,
        x: Math.min(sx, ex),
        y: Math.min(sy, ey),
        w: Math.abs(ex - sx),
        h: Math.abs(ey - sy),
        color: s.color,
        size: s.size,
      })
    }

    if (elements.length === 0) return null
    const now = Date.now()
    return {
      id: `doc-${now}`,
      title: '我的画板',
      elements,
      bgColor: data.canvasBg ?? '#ffffff',
      folderId: null,
      createdAt: now,
      updatedAt: now,
    }
  } catch {
    return null
  }
}

/**
 * Remove migrated data from localStorage.
 */
export function removeMigratedData(): void {
  localStorage.removeItem(MIGRATE_KEY)
}
