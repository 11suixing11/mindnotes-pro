const DB_NAME = 'mindnotes-pro'
const DB_VERSION = 2
let _db: IDBDatabase | null = null

type Migration = (db: IDBDatabase, tx: IDBTransaction) => void

const migrations: Record<number, Migration> = {
  1: (db) => {
    if (!db.objectStoreNames.contains('docs')) {
      const s = db.createObjectStore('docs', { keyPath: 'id' })
      s.createIndex('updatedAt', 'updatedAt')
      s.createIndex('folderId', 'folderId')
    }
    if (!db.objectStoreNames.contains('folders')) db.createObjectStore('folders', { keyPath: 'id' })
  },
  2: (_db, tx) => {
    // v2: add undo/redo persistence fields (already optional in schema)
    // Future: add tags store, star index, etc.
    // This migration is a no-op placeholder — existing docs keep working
    // because undoStack/redoStack are optional fields.
    void tx
  },
}

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = req.result
      const tx = req.transaction!
      for (let v = (e as IDBVersionChangeEvent).oldVersion + 1; v <= DB_VERSION; v++) {
        const migrate = migrations[v]
        if (migrate) migrate(db, tx)
      }
    }
    req.onsuccess = () => { _db = req.result; resolve(_db) }
    req.onerror = () => {
      console.error('[storage] Failed to open IndexedDB:', req.error)
      reject(req.error)
    }
  })
}

function txReq<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result)
    r.onerror = () => {
      console.error('[storage] Transaction error:', r.error)
      rej(r.error)
    }
  })
}

export async function getAll<T>(store: string): Promise<T[]> {
  try {
    const db = await openDB()
    return txReq(db.transaction(store, 'readonly').objectStore(store).getAll())
  } catch (e) {
    console.error('[storage] getAll failed for store:', store, e)
    return []
  }
}

export async function get<T>(store: string, id: string): Promise<T | undefined> {
  try {
    const db = await openDB()
    return txReq(db.transaction(store, 'readonly').objectStore(store).get(id))
  } catch (e) {
    console.error('[storage] get failed for store:', store, 'id:', id, e)
    return undefined
  }
}

export async function put<T>(store: string, record: T): Promise<void> {
  try {
    const db = await openDB()
    await txReq(db.transaction(store, 'readwrite').objectStore(store).put(record))
  } catch (e) {
    console.error('[storage] put failed for store:', store, e)
  }
}

export async function del(store: string, id: string): Promise<void> {
  try {
    const db = await openDB()
    await txReq(db.transaction(store, 'readwrite').objectStore(store).delete(id))
  } catch (e) {
    console.error('[storage] delete failed for store:', store, 'id:', id, e)
  }
}