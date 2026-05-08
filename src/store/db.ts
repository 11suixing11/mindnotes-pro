const DB_NAME = 'mindnotes'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('docs')) {
        const store = db.createObjectStore('docs', { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
      if (!db.objectStoreNames.contains('versions')) {
        const vs = db.createObjectStore('versions', { keyPath: 'id' })
        vs.createIndex('docId', 'docId')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface DocMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  strokeCount: number
  shapeCount: number
}

export interface DocData extends DocMeta {
  strokes: any[]
  shapes: any[]
  canvasBg: string
}

export interface DocVersion {
  id: string
  docId: string
  timestamp: number
  strokes: any[]
  shapes: any[]
}

const store = <T>(db: IDBDatabase, name: string, mode: IDBTransactionMode): IDBObjectStore =>
  db.transaction(name, mode).objectStore(name)

export async function listDocs(): Promise<DocMeta[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const idx = store(db, 'docs', 'readonly').index('updatedAt')
    const req = idx.openCursor(null, 'prev')
    const results: DocMeta[] = []
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) { results.push(cursor.value); cursor.continue() }
      else resolve(results)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getDoc(id: string): Promise<DocData | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'docs', 'readonly').get(id)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function saveDoc(doc: DocData): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'docs', 'readwrite').put(doc)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function deleteDoc(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['docs', 'versions'], 'readwrite')
    tx.objectStore('docs').delete(id)
    const idx = tx.objectStore('versions').index('docId')
    const req = idx.openCursor(IDBKeyRange.only(id))
    req.onsuccess = () => {
      if (req.result) { req.result.delete(); req.result.continue() }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveVersion(v: DocVersion): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'versions', 'readwrite').put(v)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function listVersions(docId: string): Promise<DocVersion[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const idx = store(db, 'versions', 'readonly').index('docId')
    const req = idx.getAll(IDBKeyRange.only(docId))
    req.onsuccess = () => resolve((req.result ?? []).sort((a, b) => b.timestamp - a.timestamp))
    req.onerror = () => reject(req.error)
  })
}

export async function restoreVersion(versionId: string): Promise<DocVersion | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'versions', 'readonly').get(versionId)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export function migrateLocalStorage(): DocData | null {
  try {
    const raw = localStorage.getItem('mindnotes-drawing-data')
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data.strokes && !data.shapes) return null
    return {
      id: `doc-${Date.now()}`,
      title: '我的画布',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      strokes: data.strokes ?? [],
      shapes: data.shapes ?? [],
      canvasBg: '#ffffff',
      strokeCount: (data.strokes ?? []).length,
      shapeCount: (data.shapes ?? []).length,
    }
  } catch { return null }
}
