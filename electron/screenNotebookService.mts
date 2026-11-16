import { app, dialog, nativeImage } from 'electron'
import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { ipcMain } from 'electron'
import path from 'node:path'
import {
  MAX_SCREEN_NOTE_BYTES,
  SCREEN_NOTE_FORMAT,
  SCREEN_NOTE_VERSION,
  validateScreenNote,
  validateScreenPatch,
  validScreenId,
} from '../src/notes/screenNotebook.js'
import type { ScreenNote } from '../src/notes/screenNotebook.js'
import { screenCaptureSource } from '../src/notes/screenCapture.js'
import type { ScreenNotebookRepository } from './screenNotebookRepository.mjs'
import { writeLocalFile } from './localFiles.mjs'
import { validScreenPng } from './screenImages.mjs'
export { validScreenPng } from './screenImages.mjs'

interface NotebookOptions {
  repository: ScreenNotebookRepository
  window(): BrowserWindow | null
  compose(source: string): Promise<string>
}

export function screenThumbnail(png: Uint8Array): string {
  if (!validScreenPng(png)) throw new Error('批注图片无效或过大。')
  const image = nativeImage.createFromBuffer(Buffer.from(png))
  if (image.isEmpty()) throw new Error('批注图片无法读取。')
  return image.resize({ width: 360 }).toDataURL()
}

export class ScreenNotebookService {
  constructor(private readonly options: NotebookOptions) {}

  changed(): void {
    const window = this.options.window()
    if (window && !window.webContents.isDestroyed()) window.webContents.send('notebook:changed')
  }

  private trusted(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
    const window = this.options.window()
    return Boolean(
      window &&
      event.sender === window.webContents &&
      event.senderFrame === window.webContents.mainFrame
    )
  }

  register(): void {
    const handle = (name: string, callback: (...args: unknown[]) => unknown) => {
      ipcMain.handle(name, (event, ...args: unknown[]) => {
        if (!this.trusted(event)) throw new Error('不支持的请求。')
        return callback(...args)
      })
    }
    const id = (input: unknown) => {
      if (!validScreenId(input)) throw new Error('笔记标识无效。')
      return input
    }
    handle('notebook:list', (query, offset, trash) => {
      if (query !== undefined && (typeof query !== 'string' || query.length > 500))
        throw new Error('搜索文字过长。')
      if (
        offset !== undefined &&
        (!Number.isSafeInteger(offset) || Number(offset) < 0 || Number(offset) > 1_000_000)
      )
        throw new Error('分页无效。')
      return this.options.repository.list(String(query ?? ''), Number(offset ?? 0), trash === true)
    })
    handle('notebook:get', (input) => this.options.repository.get(id(input)))
    handle(
      'notebook:image',
      async (input) =>
        `data:image/png;base64,${Buffer.from(await this.options.repository.image(id(input))).toString('base64')}`
    )
    handle('notebook:update', async (input, patch) => {
      const note = await this.options.repository.update(id(input), validateScreenPatch(patch))
      this.changed()
      return note
    })
    handle('notebook:export', (input, format) => {
      if (!['png', 'json', 'markdown'].includes(String(format))) throw new Error('导出格式无效。')
      return this.exportNote(id(input), format as 'png' | 'json' | 'markdown')
    })
    handle('notebook:export-all', () => this.exportBackup())
    handle('notebook:export-recovery', (note, image) => this.exportRecovery(note, image))
    handle('notebook:import', () => this.importBackup())
  }

  async create(note: ScreenNote, png: Uint8Array): Promise<ScreenNote> {
    const saved = await this.options.repository.create(
      validateScreenNote(note),
      png,
      screenThumbnail(png)
    )
    this.changed()
    return saved
  }

  private async exportRecovery(input: unknown, image: unknown): Promise<string | null> {
    const note = validateScreenNote(input)
    if (
      typeof image !== 'string' ||
      image.length > MAX_SCREEN_NOTE_BYTES * 1.4 ||
      !image.startsWith('data:image/png;base64,')
    )
      throw new Error('恢复图片无效或过大。')
    const png = Buffer.from(image.slice(22), 'base64')
    if (!validScreenPng(png) || nativeImage.createFromBuffer(png).isEmpty())
      throw new Error('恢复图片无法读取。')
    const result = await dialog.showSaveDialog({
      title: '保存当前修改的恢复备份',
      defaultPath: path.join(app.getPath('downloads'), `MindNotes-recovery-${Date.now()}.json`),
      filters: [{ name: 'MindNotes 屏幕笔记备份', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return null
    await writeLocalFile(
      result.filePath,
      JSON.stringify({
        format: SCREEN_NOTE_FORMAT,
        version: SCREEN_NOTE_VERSION,
        exportedAt: Date.now(),
        notes: [{ note, image: png.toString('base64') }],
      })
    )
    return result.filePath
  }

  private async exportNote(
    id: string,
    format: 'png' | 'json' | 'markdown'
  ): Promise<string | null> {
    const note = await this.options.repository.get(id)
    const safeTitle =
      note.title
        .split('')
        .map((character) => (character.charCodeAt(0) < 32 ? '-' : character))
        .join('')
        .replace(/[<>:"/\\|?*]/g, '-')
        .replace(/[. ]+$/g, '')
        .slice(0, 80) || '屏幕笔记'
    const result = await dialog.showSaveDialog({
      title:
        format === 'json'
          ? '导出可编辑批注备份'
          : format === 'markdown'
            ? '导出批注笔记'
            : '导出批注图片',
      defaultPath: path.join(
        app.getPath('downloads'),
        `${safeTitle}.${format === 'markdown' ? 'md' : format}`
      ),
      filters: [
        {
          name:
            format === 'png'
              ? 'PNG 图片'
              : format === 'json'
                ? 'MindNotes 批注备份'
                : 'Markdown 笔记',
          extensions: [format === 'markdown' ? 'md' : format],
        },
      ],
    })
    if (result.canceled || !result.filePath) return null
    if (format === 'json') {
      await this.options.repository.exportFile(result.filePath, id)
    } else if (format === 'markdown') {
      const text = `# ${note.title.replace(/[\r\n]/g, ' ')}\n\n${note.comment}\n\n来源：${note.source.app} · ${note.source.title}\n\n时间：${new Date(note.createdAt).toISOString()}\n\n此笔记包含 ${note.strokes.length} 条手写批注。完整截图和可编辑笔迹请导出 JSON 备份或 PNG。\n`
      await writeLocalFile(result.filePath, text)
    } else {
      const png = await this.options.repository.image(id)
      const composed = await this.options.compose(
        screenCaptureSource(
          `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
          note.strokes,
          note.width,
          note.height
        )
      )
      const image = nativeImage.createFromDataURL(composed)
      if (image.isEmpty()) throw new Error('无法生成批注图片。')
      await writeLocalFile(result.filePath, image.toPNG())
    }
    return result.filePath
  }

  private async exportBackup(): Promise<string | null> {
    const result = await dialog.showSaveDialog({
      title: '备份全部屏幕笔记',
      defaultPath: path.join(
        app.getPath('downloads'),
        `MindNotes-screen-${new Date().toISOString().slice(0, 10)}.json`
      ),
      filters: [{ name: 'MindNotes 批注备份', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return null
    await this.options.repository.exportFile(result.filePath)
    return result.filePath
  }

  private async importBackup(): Promise<number | null> {
    const result = await dialog.showOpenDialog({
      title: '导入屏幕批注备份',
      properties: ['openFile'],
      filters: [{ name: 'MindNotes 批注备份', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const count = await this.options.repository.importFile(result.filePaths[0])
    this.changed()
    return count
  }
}
