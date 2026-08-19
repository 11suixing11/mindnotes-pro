/**
 * The active persisted document contract. v5 intentionally starts in a new
 * IndexedDB database so a failed migration can never damage the v4 source.
 */
export const CANVAS_SCHEMA_VERSION = 5 as const

/** The last persisted contract that v5 knows how to import read-only. */
export const LEGACY_CANVAS_SCHEMA_VERSION = 4 as const

export const STORAGE_DB_NAME = 'mindnotes-pro-v5'
export const LEGACY_STORAGE_DB_NAME = 'mindnotes-pro-v4'

/** Older releases used this database name before the v4 storage boundary. */
export const OLDEST_LEGACY_STORAGE_DB_NAME = 'mindnotes-pro'
