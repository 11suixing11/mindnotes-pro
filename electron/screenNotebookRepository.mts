import { Worker } from 'node:worker_threads'
import type {
  ScreenDraft,
  ScreenNote,
  ScreenNotePage,
  ScreenNotePatch,
  ScreenNoteReceipt,
  ScreenPreferences,
} from '../src/notes/screenNotebook.js'
import type { RepositoryRequest, RepositoryResponse } from './screenRepositoryProtocol.mjs'

export class ScreenNotebookRepository {
  private readonly worker: Worker
  private sequence = 0
  private stopped = false
  private failure: Error | null = null
  private readonly pending = new Map<
    number,
    { resolve(value: unknown): void; reject(error: Error): void }
  >()

  constructor(directory: string) {
    this.worker = new Worker(new URL('./screenRepositoryWorker.mjs', import.meta.url), {
      workerData: { directory },
    })
    this.worker.on('message', (response: RepositoryResponse) => {
      const request = this.pending.get(response.id)
      if (!request) return
      this.pending.delete(response.id)
      if (response.error) request.reject(new Error(response.error))
      else request.resolve(response.value)
    })
    this.worker.on('error', (error) =>
      this.fail(error instanceof Error ? error : new Error(String(error)))
    )
    this.worker.on('exit', (code) => {
      if (!this.stopped)
        this.fail(new Error(`笔记存储进程已退出 (${code})。请导出恢复备份后重启。`))
    })
  }

  private fail(error: Error): void {
    this.failure = error
    for (const request of this.pending.values()) request.reject(error)
    this.pending.clear()
  }

  private request<T>(request: RepositoryRequest): Promise<T> {
    if (this.failure || this.stopped)
      return Promise.reject(this.failure ?? new Error('笔记存储已经关闭。'))
    const id = ++this.sequence
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => {
          this.pending.delete(id)
          reject(new Error('本地保存超过等待时间，修改仍保留。请重试或导出恢复。'))
        },
        request.operation === 'importFile' || request.operation === 'exportFile' ? 120_000 : 15_000
      )
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value as T)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
      try {
        this.worker.postMessage({ id, request })
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(error)
      }
    })
  }

  load(): Promise<{ drafts: ScreenDraft[]; preferences: ScreenPreferences }> {
    return this.request({ operation: 'load' })
  }
  saveDraft(draft: ScreenDraft, png?: Uint8Array): Promise<void> {
    return this.request({ operation: 'draft', draft, png })
  }
  savePreferences(preferences: ScreenPreferences): Promise<void> {
    return this.request({ operation: 'preferences', preferences })
  }
  saveBackground(id: string, png: Uint8Array): Promise<void> {
    return this.request({ operation: 'background', id, png })
  }
  getBackground(id: string): Promise<Uint8Array> {
    return this.request({ operation: 'getBackground', id })
  }
  create(note: ScreenNote, png: Uint8Array, thumbnail: string): Promise<ScreenNote> {
    return this.request({ operation: 'create', note, png, thumbnail })
  }
  list(query = '', offset = 0, trash = false): Promise<ScreenNotePage> {
    return this.request({ operation: 'list', query, offset, trash })
  }
  get(id: string): Promise<ScreenNote> {
    return this.request({ operation: 'get', id })
  }
  image(id: string): Promise<Uint8Array> {
    return this.request({ operation: 'image', id })
  }
  update(id: string, patch: ScreenNotePatch): Promise<ScreenNoteReceipt> {
    return this.request({ operation: 'update', id, patch })
  }
  export(id?: string): Promise<{ note: ScreenNote; png: Uint8Array; thumbnail: string }[]> {
    return this.request({ operation: 'export', id })
  }
  exportFile(filePath: string, id?: string): Promise<void> {
    return this.request({ operation: 'exportFile', filePath, id })
  }
  import(entries: { note: ScreenNote; png: Uint8Array; thumbnail: string }[]): Promise<number> {
    return this.request({ operation: 'import', entries })
  }
  importFile(filePath: string): Promise<number> {
    return this.request({ operation: 'importFile', filePath })
  }
  flush(): Promise<void> {
    return this.request({ operation: 'flush' })
  }

  async close(): Promise<void> {
    if (this.stopped) return
    try {
      await this.request({ operation: 'close' })
    } finally {
      this.stopped = true
      await this.worker.terminate()
    }
  }
}
