import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  openDB,
  getAll,
  get,
  put,
  update,
  del,
  loadFromStorage,
  migrateLegacyStorageKey,
  saveToStorage,
} from './storage'

const LEGACY_KEY = 'mindnotes-pro-encryption-key-2024'

function encodeLegacyValue(value: unknown): string {
  const serialized = JSON.stringify(value)
  let encrypted = ''
  for (let index = 0; index < serialized.length; index++) {
    encrypted += String.fromCharCode(
      serialized.charCodeAt(index) ^ LEGACY_KEY.charCodeAt(index % LEGACY_KEY.length)
    )
  }
  return btoa(
    encodeURIComponent(encrypted).replace(/%([0-9A-F]{2})/g, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
  )
}

describe('storage', () => {
  describe('exports', () => {
    it('should export openDB function', () => {
      expect(openDB).toBeTypeOf('function')
    })

    it('should export getAll function', () => {
      expect(getAll).toBeTypeOf('function')
    })

    it('should export get function', () => {
      expect(get).toBeTypeOf('function')
    })

    it('should export put function', () => {
      expect(put).toBeTypeOf('function')
    })

    it('should export update function', () => {
      expect(update).toBeTypeOf('function')
    })

    it('should export del function', () => {
      expect(del).toBeTypeOf('function')
    })

    it('should export loadFromStorage function', () => {
      expect(loadFromStorage).toBeTypeOf('function')
    })

    it('should export saveToStorage function', () => {
      expect(saveToStorage).toBeTypeOf('function')
    })
  })

  describe('function signatures', () => {
    it('getAll should accept store name', () => {
      expect(getAll.length).toBe(1)
    })

    it('get should accept store name and id', () => {
      expect(get.length).toBe(2)
    })

    it('put should accept store name and record', () => {
      expect(put.length).toBe(2)
    })

    it('del should accept store name and id', () => {
      expect(del.length).toBe(2)
    })
  })

  describe('loadFromStorage and saveToStorage', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('loadFromStorage returns default when key does not exist', () => {
      expect(loadFromStorage('nonexistent', 42)).toBe(42)
    })

    it('loadFromStorage returns default for null key', () => {
      expect(loadFromStorage('missing', { a: 1 })).toEqual({ a: 1 })
    })

    it('saveToStorage saves and loadFromStorage retrieves data', () => {
      const data = { name: 'test', value: 123 }
      const result = saveToStorage('test-key', data)
      expect(result).toBe(true)
      const loaded = loadFromStorage('test-key', null)
      expect(loaded).toEqual(data)
    })

    it('saveToStorage handles nested objects', () => {
      const data = { nested: { deep: { value: [1, 2, 3] } } }
      saveToStorage('nested-key', data)
      expect(loadFromStorage('nested-key', null)).toEqual(data)
    })

    it('saveToStorage handles arrays', () => {
      const data = [1, 2, 3, 'a', 'b']
      saveToStorage('array-key', data)
      expect(loadFromStorage('array-key', [])).toEqual(data)
    })

    it('loadFromStorage returns default for corrupted data', () => {
      localStorage.setItem('corrupted-key', 'not-valid-encrypted-data{{{')
      const result = loadFromStorage('corrupted-key', 'default')
      // Should return default because decryption+JSON.parse fails
      expect(result).toBe('default')
    })

    it('saveToStorage returns true on success', () => {
      expect(saveToStorage('key', 'value')).toBe(true)
    })

    it('roundtrips string values', () => {
      saveToStorage('str-key', 'hello world')
      expect(loadFromStorage('str-key', '')).toBe('hello world')
    })

    it('roundtrips number values', () => {
      saveToStorage('num-key', 42)
      expect(loadFromStorage('num-key', 0)).toBe(42)
    })

    it('roundtrips boolean values', () => {
      saveToStorage('bool-key', true)
      expect(loadFromStorage('bool-key', false)).toBe(true)
    })

    it('roundtrips null values', () => {
      saveToStorage('null-key', null)
      expect(loadFromStorage('null-key', 'default')).toBeNull()
    })

    it('migrates an encrypted legacy value without overwriting current data', () => {
      const legacyValue = [{ id: 'template-1', name: '旧模板' }]
      localStorage.setItem('legacy-key', encodeLegacyValue(legacyValue))

      expect(migrateLegacyStorageKey('legacy-key', 'current-key')).toBe(true)
      expect(loadFromStorage('current-key', [])).toEqual(legacyValue)
      expect(localStorage.getItem('legacy-key')).toBeNull()

      localStorage.setItem('legacy-key', encodeLegacyValue([{ id: 'template-2' }]))
      expect(migrateLegacyStorageKey('legacy-key', 'current-key')).toBe(false)
      expect(loadFromStorage('current-key', [])).toEqual(legacyValue)
    })

    it('keeps corrupt legacy data available for manual recovery', () => {
      localStorage.setItem('legacy-key', 'not-valid-legacy-data')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      expect(migrateLegacyStorageKey('legacy-key', 'current-key')).toBe(false)
      expect(localStorage.getItem('legacy-key')).toBe('not-valid-legacy-data')
      expect(localStorage.getItem('current-key')).toBeNull()

      consoleSpy.mockRestore()
    })
  })

  describe('IndexedDB operations', () => {
    it('getAll rejects when DB is unavailable', async () => {
      await expect(getAll('docs')).rejects.toThrow('IndexedDB is unavailable')
    })

    it('get rejects when DB is unavailable', async () => {
      await expect(get('docs', 'id-1')).rejects.toThrow('IndexedDB is unavailable')
    })

    it('put rejects when DB is unavailable', async () => {
      await expect(put('docs', { id: 'test' })).rejects.toThrow('IndexedDB is unavailable')
    })

    it('update rejects when DB is unavailable', async () => {
      await expect(update('docs', 'test', (record) => record)).rejects.toThrow(
        'IndexedDB is unavailable'
      )
    })

    it('del rejects when DB is unavailable', async () => {
      await expect(del('docs', 'test')).rejects.toThrow('IndexedDB is unavailable')
    })
  })
})
