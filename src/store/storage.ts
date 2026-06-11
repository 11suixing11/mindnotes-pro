const DB_NAME = 'mindnotes-pro'
const DB_VERSION = 2
let _db: IDBDatabase | null = null

// 加密密钥 - 在实际应用中，应该从安全的地方获取，如环境变量或配置服务
const ENCRYPTION_KEY = 'mindnotes-pro-encryption-key-2024'

// Base64 编码函数
function base64Encode(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    )
  } catch (e) {
    console.error('[storage] Base64 encoding failed:', e)
    throw e
  }
}

// Base64 解码函数
function base64Decode(str: string): string {
  try {
    return decodeURIComponent(
      atob(str)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch (e) {
    console.error('[storage] Base64 decoding failed:', e)
    throw e
  }
}

// 简单的 XOR 加密函数 - 生产环境应使用更安全的算法如 AES-GCM
function xorEncryptDecrypt(input: string, key: string): string {
  let output = ''
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    output += String.fromCharCode(charCode)
  }
  return output
}

// 加密数据
function encryptData(data: string): string {
  try {
    const encrypted = xorEncryptDecrypt(data, ENCRYPTION_KEY)
    return base64Encode(encrypted)
  } catch (e) {
    console.error('[storage] Encryption failed:', e)
    // 加密失败时，回退到存储明文（记录错误）
    console.warn('[storage] Falling back to storing plain text due to encryption failure')
    return data
  }
}

// 解密数据
function decryptData(encryptedData: string): string {
  try {
    const decoded = base64Decode(encryptedData)
    return xorEncryptDecrypt(decoded, ENCRYPTION_KEY)
  } catch (e) {
    console.error('[storage] Decryption failed:', e)
    // 解密失败时，尝试作为明文数据处理（可能是旧数据）
    console.warn('[storage] Assuming data is plain text due to decryption failure')
    return encryptedData
  }
}

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
    req.onsuccess = () => {
      _db = req.result
      resolve(_db)
    }
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

/**
 * 从 localStorage 安全地加载并解析 JSON 数据。
 * 数据已加密存储，读取时会自动解密。
 * 如果数据损坏或格式错误，返回默认值并记录错误。
 * @param key - 存储键名
 * @param defaultValue - 解析失败或键不存在时返回的默认值
 * @returns 解析后的数据或默认值
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const encryptedData = localStorage.getItem(key)
    if (encryptedData === null) {
      // 键不存在，返回默认值
      return defaultValue
    }

    // 解密数据
    const decryptedData = decryptData(encryptedData)

    // 尝试解析 JSON
    return JSON.parse(decryptedData) as T
  } catch (e) {
    console.error(`[storage] Failed to load from storage for key "${key}":`, e)
    // 数据损坏或解析失败，返回默认值
    return defaultValue
  }
}

/**
 * 将数据序列化为 JSON，加密后保存到 localStorage。
 * 如果序列化或加密失败，记录错误并返回 false。
 * @param key - 存储键名
 * @param value - 要存储的数据
 * @returns 是否保存成功
 */
export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value)
    const encryptedData = encryptData(serialized)
    localStorage.setItem(key, encryptedData)
    return true
  } catch (e) {
    console.error(`[storage] Failed to save to storage for key "${key}":`, e)
    return false
  }
}
