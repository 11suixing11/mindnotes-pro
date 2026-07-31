import { parseCanvasImport } from './backup'
import { CANVAS_SCHEMA_VERSION } from './schema'
import type { CanvasDoc } from './types'

const MIGRATE_KEY = 'mindnotes-drawing-data'

export function migrateOld(): CanvasDoc | null {
  try {
    const serialized = localStorage.getItem(MIGRATE_KEY)
    if (!serialized) return null
    const imported = parseCanvasImport(JSON.parse(serialized) as unknown)
    const now = Date.now()
    return {
      schemaVersion: CANVAS_SCHEMA_VERSION,
      id: `doc-${now}`,
      title: imported.title,
      elements: imported.elements,
      layers: imported.layers,
      activeLayerId: imported.activeLayerId,
      bgColor: imported.bgColor,
      backgroundStyle: imported.backgroundStyle,
      folderId: null,
      createdAt: now,
      updatedAt: now,
    }
  } catch {
    return null
  }
}

export function removeMigratedData(): void {
  localStorage.removeItem(MIGRATE_KEY)
}
