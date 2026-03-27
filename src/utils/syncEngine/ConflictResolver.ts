import type { ConflictInfo } from './types'

/**
 * 冲突解决器
 */
export class ConflictResolver {
  private conflicts: Map<string, ConflictInfo> = new Map()

  detect(
    localDoc: { id: string; content: string; version: number; lastModified: number },
    remoteDoc: { id: string; content: string; version: number; lastModified: number }
  ): ConflictInfo | null {
    if (localDoc.version !== remoteDoc.version && localDoc.content !== remoteDoc.content) {
      const conflict: ConflictInfo = {
        documentId: localDoc.id,
        localVersion: localDoc.version,
        remoteVersion: remoteDoc.version,
        localContent: localDoc.content,
        remoteContent: remoteDoc.content,
        timestamp: Date.now(),
      }

      this.conflicts.set(localDoc.id, conflict)
      return conflict
    }

    return null
  }

  resolve(documentId: string): ConflictInfo | null {
    const conflict = this.conflicts.get(documentId)
    if (!conflict) return null

    this.conflicts.delete(documentId)
    return conflict
  }

  getConflict(documentId: string): ConflictInfo | undefined {
    return this.conflicts.get(documentId)
  }

  getAllConflicts(): ConflictInfo[] {
    return Array.from(this.conflicts.values())
  }

  getConflictCount(): number {
    return this.conflicts.size
  }

  clear(): void {
    this.conflicts.clear()
  }
}

export default ConflictResolver
