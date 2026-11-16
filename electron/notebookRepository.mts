import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createBackup, decodeBackup, MAX_BACKUP_BYTES } from '../src/notes/model.js'
import type { PageNotebook } from '../src/notes/model.js'
import { readLimitedFile, writeLocalFile } from './localFiles.mjs'

export class NotebookRepository {
  private readonly file: string
  private pending: Promise<void> = Promise.resolve()
  private loadFailed = false
  private recoveredPrevious = false

  constructor(private readonly directory: string) {
    this.file = path.join(directory, 'page-notes.json')
  }

  get recoveryNotice(): string | null {
    return this.recoveredPrevious
      ? '已从上一次成功保存的副本恢复网页笔记，最近修改可能缺失。请核对笔记，并导出备份。'
      : null
  }

  async load(): Promise<PageNotebook[]> {
    let lastError: unknown
    let found = false
    for (const file of [this.file, `${this.file}.previous`]) {
      try {
        const content = (await readLimitedFile(file, MAX_BACKUP_BYTES)).toString('utf8')
        const pages = decodeBackup(content).pages
        this.recoveredPrevious = file !== this.file
        return pages
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          found = true
          lastError = error
        }
      }
    }
    if (found) {
      this.loadFailed = true
      throw new Error(
        `本地笔记文件无法读取，原文件已保留。${lastError instanceof Error ? lastError.message : ''}`
      )
    }
    return []
  }

  save(pages: PageNotebook[]): Promise<void> {
    if (this.loadFailed)
      return Promise.reject(
        new Error('原笔记文件无法读取，请先备份 page-notes.json 再重新打开应用。')
      )
    const content = JSON.stringify(createBackup(pages), null, 2)
    if (Buffer.byteLength(content) > MAX_BACKUP_BYTES)
      return Promise.reject(new Error('网页笔记超过 20 MB，请导出备份并整理已有笔记。'))
    this.pending = this.pending
      .catch(() => undefined)
      .then(async () => {
        await mkdir(this.directory, { recursive: true })
        try {
          const previous = (await readLimitedFile(this.file, MAX_BACKUP_BYTES)).toString('utf8')
          decodeBackup(previous)
          await writeLocalFile(`${this.file}.previous`, previous)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            // Never replace the recovery copy with an unreadable file.
            if (error instanceof Error && !('code' in error))
              console.error('[notes:recovery]', error.message)
            else throw error
          }
        }
        await writeLocalFile(this.file, content)
      })
    return this.pending
  }

  flush(): Promise<void> {
    if (this.loadFailed) return Promise.reject(new Error('原网页笔记文件无法读取，原文件已保留。'))
    return this.pending
  }
}
