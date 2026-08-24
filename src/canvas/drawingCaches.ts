export class LRUCache<K, V> {
  private cache = new Map<K, { value: V; prev: K | null; next: K | null; lastAccess: number }>()
  private head: K | null = null
  private tail: K | null = null

  constructor(
    private readonly maxSize: number,
    private readonly ttl: number
  ) {}

  get(key: K): V | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.lastAccess > this.ttl) {
      this.delete(key)
      return null
    }

    this.moveToHead(key, entry)
    entry.lastAccess = now
    return entry.value
  }

  set(key: K, value: V): void {
    const existing = this.cache.get(key)
    if (existing) {
      existing.value = value
      existing.lastAccess = Date.now()
      this.moveToHead(key, existing)
      return
    }

    if (this.cache.size >= this.maxSize && this.tail !== null) {
      this.delete(this.tail)
    }

    const entry = { value, prev: null, next: this.head, lastAccess: Date.now() }
    this.cache.set(key, entry)

    if (this.head !== null) {
      const headEntry = this.cache.get(this.head)
      if (headEntry) headEntry.prev = key
    }
    this.head = key

    if (this.tail === null) {
      this.tail = key
    }
  }

  private moveToHead(key: K, entry: { prev: K | null; next: K | null }): void {
    if (key === this.head) return

    if (entry.prev !== null) {
      const prevEntry = this.cache.get(entry.prev)
      if (prevEntry) prevEntry.next = entry.next
    }
    if (entry.next !== null) {
      const nextEntry = this.cache.get(entry.next)
      if (nextEntry) nextEntry.prev = entry.prev
    }

    if (key === this.tail && entry.prev !== null) {
      this.tail = entry.prev
    }

    entry.prev = null
    entry.next = this.head

    if (this.head !== null) {
      const headEntry = this.cache.get(this.head)
      if (headEntry) headEntry.prev = key
    }
    this.head = key
  }

  private delete(key: K): void {
    const entry = this.cache.get(key)
    if (!entry) return

    if (entry.prev !== null) {
      const prevEntry = this.cache.get(entry.prev)
      if (prevEntry) prevEntry.next = entry.next
    }
    if (entry.next !== null) {
      const nextEntry = this.cache.get(entry.next)
      if (nextEntry) nextEntry.prev = entry.prev
    }

    if (key === this.head) this.head = entry.next
    if (key === this.tail) this.tail = entry.prev

    this.cache.delete(key)
  }

  size(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
  }
}
