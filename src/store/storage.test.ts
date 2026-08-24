import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  openDB,
  getAll,
  get,
  put,
  putMany,
  putManyStores,
  update,
  del,
  loadFromStorage,
  migrateLegacyStorageKey,
  readLegacyDatabase,
  saveToStorage,
} from './storage'
import { encodeLegacyStorageValue } from '../test/legacyStorage'

interface FakeLegacyDatabase {
  objectStoreNames: { contains: (name: string) => boolean }
  transaction: (storeNames: string[], _mode: IDBTransactionMode) => FakeLegacyTransaction
  close: () => void
}

interface FakeLegacyTransaction {
  objectStore: (name: string) => {
    getAll: () => { result: unknown[]; onsuccess: (() => void) | null }
  }
  oncomplete: (() => void) | null
  onerror: (() => void) | null
  onabort: (() => void) | null
}

function makeLegacyDatabase(data: { docs?: unknown[]; folders?: unknown[] }): FakeLegacyDatabase {
  const stores = new Map<string, unknown[]>()
  if (data.docs) stores.set('docs', data.docs)
  if (data.folders) stores.set('folders', data.folders)

  return {
    objectStoreNames: { contains: (name) => stores.has(name) },
    transaction: (storeNames) => {
      let remaining = storeNames.length
      const transaction: FakeLegacyTransaction = {
        objectStore: () => ({ getAll: () => ({ result: [], onsuccess: null }) }),
        oncomplete: null,
        onerror: null,
        onabort: null,
      }

      // Each request object must remain stable so the storage reader can set
      // its handler after getAll() returns.
      transaction.objectStore = (name) => {
        const request = {
          result: stores.get(name) ?? [],
          onsuccess: null as (() => void) | null,
        }
        queueMicrotask(() => {
          request.onsuccess?.()
          remaining -= 1
          if (remaining === 0) queueMicrotask(() => transaction.oncomplete?.())
        })
        return { getAll: () => request }
      }
      return transaction
    },
    close: vi.fn(),
  }
}

function installLegacyIndexedDb(databases: Record<string, FakeLegacyDatabase>) {
  const openedNames: string[] = []
  const indexedDb = {
    databases: async () => Object.keys(databases).map((name) => ({ name })),
    open: (name: string) => {
      openedNames.push(name)
      const request: {
        result?: FakeLegacyDatabase
        onsuccess: (() => void) | null
        onerror: (() => void) | null
      } = { onsuccess: null, onerror: null }
      queueMicrotask(() => {
        const database = databases[name]
        if (!database) {
          request.onerror?.()
          return
        }
        request.result = database
        request.onsuccess?.()
      })
      return request
    },
  }
  vi.stubGlobal('indexedDB', indexedDb)
  return openedNames
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

    it('should export atomic batch functions', () => {
      expect(putMany).toBeTypeOf('function')
      expect(putManyStores).toBeTypeOf('function')
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
      localStorage.setItem('legacy-key', encodeLegacyStorageValue(legacyValue))

      expect(migrateLegacyStorageKey('legacy-key', 'current-key')).toBe(true)
      expect(loadFromStorage('current-key', [])).toEqual(legacyValue)
      expect(localStorage.getItem('legacy-key')).toBeNull()

      localStorage.setItem('legacy-key', encodeLegacyStorageValue([{ id: 'template-2' }]))
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

    it('batch writes reject when DB is unavailable', async () => {
      await expect(putMany('docs', [{ id: 'test' }])).rejects.toThrow('IndexedDB is unavailable')
      await expect(
        putManyStores([{ storeName: 'docs', records: [{ id: 'test' }] }])
      ).rejects.toThrow('IndexedDB is unavailable')
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

  describe('legacy database reads', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('falls back from a folder-only v4 database and merges folders by id', async () => {
      const openedNames = installLegacyIndexedDb({
        'mindnotes-pro-v4': makeLegacyDatabase({
          folders: [
            { id: 'shared', name: 'v4 folder' },
            { id: 'v4-only', name: 'V4 only' },
          ],
        }),
        'mindnotes-pro': makeLegacyDatabase({
          docs: [{ id: 'old-doc', title: 'Recovered document' }],
          folders: [
            { id: 'shared', name: 'old folder' },
            { id: 'old-only', name: 'Old only' },
          ],
        }),
      })

      await expect(readLegacyDatabase()).resolves.toEqual({
        docs: [{ id: 'old-doc', title: 'Recovered document' }],
        folders: [
          { id: 'shared', name: 'v4 folder' },
          { id: 'v4-only', name: 'V4 only' },
          { id: 'old-only', name: 'Old only' },
        ],
      })
      expect(openedNames).toEqual(['mindnotes-pro-v4', 'mindnotes-pro'])
    })

    it('does not combine older documents when v4 already has documents', async () => {
      const openedNames = installLegacyIndexedDb({
        'mindnotes-pro-v4': makeLegacyDatabase({
          docs: [{ id: 'v4-doc', title: 'V4 document' }],
          folders: [{ id: 'shared', name: 'v4 folder' }],
        }),
        'mindnotes-pro': makeLegacyDatabase({
          docs: [{ id: 'old-doc', title: 'Older document' }],
          folders: [{ id: 'old-only', name: 'Old only' }],
        }),
      })

      await expect(readLegacyDatabase()).resolves.toEqual({
        docs: [{ id: 'v4-doc', title: 'V4 document' }],
        folders: [{ id: 'shared', name: 'v4 folder' }],
      })
      expect(openedNames).toEqual(['mindnotes-pro-v4'])
    })
  })
})
