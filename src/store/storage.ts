import { STORAGE_DB_NAME } from './schema'

const DB_VERSION = 1
const LEGACY_DB_NAME = 'mindnotes-pro'
const LEGACY_STORAGE_ENCRYPTION_KEY = 'mindnotes-pro-encryption-key-2024'
let database: IDBDatabase | null = null
let databasePromise: Promise<IDBDatabase> | null = null

export interface LegacyDatabaseSnapshot<TDoc = unknown, TFolder = unknown> {
  docs: TDoc[]
  folders: TFolder[]
}

function createStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains('docs')) {
    const docs = db.createObjectStore('docs', { keyPath: 'id' })
    docs.createIndex('updatedAt', 'updatedAt')
    docs.createIndex('folderId', 'folderId')
  }

  if (!db.objectStoreNames.contains('folders')) {
    db.createObjectStore('folders', { keyPath: 'id' })
  }
}

export function openDB(): Promise<IDBDatabase> {
  if (database) return Promise.resolve(database)
  if (databasePromise) return databasePromise

  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'))
      return
    }

    const request = indexedDB.open(STORAGE_DB_NAME, DB_VERSION)
    let settled = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    request.onupgradeneeded = () => createStores(request.result)
    request.onerror = () => fail(request.error ?? new Error('Failed to open IndexedDB'))
    request.onblocked = () => fail(new Error('IndexedDB upgrade is blocked by another tab'))
    request.onsuccess = () => {
      const openedDatabase = request.result
      if (settled) {
        openedDatabase.close()
        return
      }
      settled = true
      database = openedDatabase
      databasePromise = null
      const clearCachedDatabase = () => {
        if (database === openedDatabase) database = null
        databasePromise = null
      }
      openedDatabase.onversionchange = () => {
        openedDatabase.close()
        clearCachedDatabase()
      }
      openedDatabase.onclose = clearCachedDatabase
      resolve(openedDatabase)
    }
  })

  databasePromise = pending
  void pending.catch(() => {
    if (databasePromise === pending) databasePromise = null
  })
  return pending
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted'))
  })
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  const transaction = db.transaction(storeName, 'readonly')
  return requestResult(transaction.objectStore(storeName).getAll())
}

export async function get<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDB()
  const transaction = db.transaction(storeName, 'readonly')
  return requestResult(transaction.objectStore(storeName).get(id))
}

export async function put<T>(storeName: string, record: T): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).put(record)
  await transactionComplete(transaction)
}

export async function update<T>(
  storeName: string,
  id: string,
  updater: (record: T | undefined) => T | undefined
): Promise<T | undefined> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.get(id)
    let next: T | undefined
    let updaterError: unknown

    request.onsuccess = () => {
      try {
        next = updater(request.result as T | undefined)
        if (next !== undefined) store.put(next)
      } catch (error) {
        updaterError = error
        transaction.abort()
      }
    }
    transaction.oncomplete = () => resolve(next)
    transaction.onerror = () =>
      reject(updaterError ?? transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () =>
      reject(updaterError ?? transaction.error ?? new Error('IndexedDB transaction was aborted'))
  })
}

export async function del(storeName: string, id: string): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).delete(id)
  await transactionComplete(transaction)
}

export function readLegacyDatabase<TDoc, TFolder>(): Promise<LegacyDatabaseSnapshot<
  TDoc,
  TFolder
> | null> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }

    const request = indexedDB.open(LEGACY_DB_NAME)
    let createdEmptyDatabase = false

    request.onupgradeneeded = (event) => {
      createdEmptyDatabase = (event as IDBVersionChangeEvent).oldVersion === 0
    }
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open the legacy IndexedDB database'))
    request.onsuccess = () => {
      const db = request.result
      const hasDocs = db.objectStoreNames.contains('docs')
      const hasFolders = db.objectStoreNames.contains('folders')

      if (createdEmptyDatabase || (!hasDocs && !hasFolders)) {
        db.close()
        if (createdEmptyDatabase) indexedDB.deleteDatabase(LEGACY_DB_NAME)
        resolve(null)
        return
      }

      const storeNames = [hasDocs ? 'docs' : null, hasFolders ? 'folders' : null].filter(
        (name): name is string => name !== null
      )
      const transaction = db.transaction(storeNames, 'readonly')
      let docs: TDoc[] = []
      let folders: TFolder[] = []

      if (hasDocs) {
        const docsRequest = transaction.objectStore('docs').getAll()
        docsRequest.onsuccess = () => {
          docs = docsRequest.result as TDoc[]
        }
      }
      if (hasFolders) {
        const foldersRequest = transaction.objectStore('folders').getAll()
        foldersRequest.onsuccess = () => {
          folders = foldersRequest.result as TFolder[]
        }
      }

      transaction.oncomplete = () => {
        db.close()
        resolve({ docs, folders })
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error ?? new Error('Failed to read the legacy IndexedDB database'))
      }
      transaction.onabort = transaction.onerror
    }
  })
}

function decodeLegacyStorageValue(serialized: string): unknown {
  try {
    const decoded = decodeURIComponent(
      atob(serialized)
        .split('')
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    )
    let decrypted = ''
    for (let index = 0; index < decoded.length; index++) {
      decrypted += String.fromCharCode(
        decoded.charCodeAt(index) ^
          LEGACY_STORAGE_ENCRYPTION_KEY.charCodeAt(index % LEGACY_STORAGE_ENCRYPTION_KEY.length)
      )
    }
    return JSON.parse(decrypted) as unknown
  } catch {
    return JSON.parse(serialized) as unknown
  }
}

export function migrateLegacyStorageKey(legacyKey: string, currentKey: string): boolean {
  try {
    if (localStorage.getItem(currentKey) !== null) return false
    const serialized = localStorage.getItem(legacyKey)
    if (serialized === null) return false

    const value = decodeLegacyStorageValue(serialized)
    localStorage.setItem(currentKey, JSON.stringify(value))
    localStorage.removeItem(legacyKey)
    return true
  } catch (error) {
    console.error(`[storage] Failed to migrate legacy local storage key "${legacyKey}"`, error)
    return false
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const serialized = localStorage.getItem(key)
    return serialized === null ? defaultValue : (JSON.parse(serialized) as T)
  } catch (error) {
    console.error(`[storage] Failed to load "${key}" from local storage`, error)
    return defaultValue
  }
}

export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[storage] Failed to save "${key}" to local storage`, error)
    return false
  }
}
