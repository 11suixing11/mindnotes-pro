import { parseCanvasImport } from './backup'
import type { CanvasDoc } from './types'
import { CANVAS_SCHEMA_VERSION } from './schema'

const MIGRATE_KEY = 'mindnotes-drawing-data'

// Kept as a compatibility export; the persistence-specific implementation
// lives in its own module so callers can mock local-storage migration alone.
export { migrateV4ToV5, parseV4Snapshot } from './v4Import'
export type { V4MigrationReport, V4MigrationResult, V4MigrationStatus } from './v4Import'

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
