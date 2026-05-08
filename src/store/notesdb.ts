const DB_NAME = 'mindnotes-kb'
const DB_VERSION = 1
let dbInstance: IDBDatabase | null = null

export function initDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('dirs')) db.createObjectStore('dirs', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('notes')) {
        const s = db.createObjectStore('notes', { keyPath: 'id' })
        s.createIndex('dirId', 'dirId')
        s.createIndex('updatedAt', 'updatedAt')
      }
    }
    req.onsuccess = () => { dbInstance = req.result; resolve() }
    req.onerror = () => reject(req.error)
  })
}

function tx(store: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
  return dbInstance!.transaction(store, mode).objectStore(store)
}

function reqToPromise<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
}

export interface DirRecord { id: string; name: string; parentId: string | null; order: number; expanded: boolean }
export interface NoteRecord { id: string; title: string; content: string; dirId: string | null; createdAt: number; updatedAt: number; wordCount: number }

export const getAllDirs = () => reqToPromise(tx('dirs').getAll()) as Promise<DirRecord[]>
export const putDir = (d: DirRecord) => reqToPromise(tx('dirs', 'readwrite').put(d)) as Promise<void>
export const deleteDir = (id: string) => reqToPromise(tx('dirs', 'readwrite').delete(id)) as Promise<void>

export const getAllNotes = () => reqToPromise(tx('notes').getAll()) as Promise<NoteRecord[]>
export const getNote = (id: string) => reqToPromise(tx('notes').get(id)) as Promise<NoteRecord | undefined>
export const putNote = (n: NoteRecord) => reqToPromise(tx('notes', 'readwrite').put(n)) as Promise<void>
export const deleteNote = (id: string) => reqToPromise(tx('notes', 'readwrite').delete(id)) as Promise<void>
