import { STORAGE_DB_NAME } from './schema'

const DB_VERSION = 1
let database: IDBDatabase | null = null

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

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'))
      return
    }

    const request = indexedDB.open(STORAGE_DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => createStores(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another tab'))
    request.onsuccess = () => {
      database = request.result
      database.onversionchange = () => {
        database?.close()
        database = null
      }
      resolve(database)
    }
  })
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

export async function del(storeName: string, id: string): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).delete(id)
  await transactionComplete(transaction)
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
