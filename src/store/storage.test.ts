import { describe, it, expect, beforeEach } from 'vitest'
import { openDB, getAll, get, put, del, loadFromStorage, saveToStorage } from './storage'

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
      // Store raw unencrypted data which will fail to parse as JSON after decryption
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
  })

  describe('IndexedDB operations', () => {
    it('getAll returns empty array when DB is unavailable', async () => {
      // In jsdom, indexedDB is not defined, so it should return []
      const result = await getAll('docs')
      expect(result).toEqual([])
    })

    it('get returns undefined when DB is unavailable', async () => {
      const result = await get('docs', 'id-1')
      expect(result).toBeUndefined()
    })

    it('put does not throw when DB is unavailable', async () => {
      await expect(put('docs', { id: 'test' })).resolves.toBeUndefined()
    })

    it('del does not throw when DB is unavailable', async () => {
      await expect(del('docs', 'test')).resolves.toBeUndefined()
    })
  })
})
