import { open } from 'node:fs/promises'
import { JSONParser, TokenType } from '@streamparser/json'
import type { ParsedElementInfo, ParsedTokenInfo } from '@streamparser/json'
import {
  MAX_SCREEN_BACKUP_BYTES,
  MAX_SCREEN_NOTE_BYTES,
  SCREEN_NOTE_FORMAT,
  SCREEN_NOTE_VERSION,
  validateScreenNote,
} from '../src/notes/screenNotebook.js'
import type { ScreenNote } from '../src/notes/screenNotebook.js'
import { importedScreenThumbnail } from './screenImages.mjs'

/** Entries are consumed immediately; a caller commits only after the entire file validates. */
export async function readScreenBackup(
  filePath: string,
  consume: (note: ScreenNote, png: Uint8Array, thumbnail: string) => void
): Promise<void> {
  const file = await open(filePath, 'r')
  try {
    const info = await file.stat()
    if (!info.isFile() || info.size > MAX_SCREEN_BACKUP_BYTES)
      throw new Error('备份过大，最多支持 256 MB。')
    const ids = new Set<string>()
    const fields = new Set<string>()
    let format: unknown
    let version: unknown
    let notesArray = false
    let depth = 0
    let rootKey: string | null = null
    let expectingRootKey = false
    let expectingRootValue = false
    let offset = 0
    let entryStart = 0
    let firstToken = true
    const parser = new JSONParser({
      paths: ['$.format', '$.version', '$.notes.*'],
      keepStack: false,
      stringBufferSize: 64 * 1024,
    })
    let callbackFailed = false
    let callbackFailure: unknown
    const checkedCallback =
      <T,>(callback: (value: T) => void) =>
      (value: T) => {
        try {
          callback(value)
        } catch (error) {
          callbackFailed = true
          callbackFailure = error
          throw error
        }
      }
    const parse = (chunk?: Uint8Array) => {
      callbackFailed = false
      try {
        if (chunk) parser.write(chunk)
        else parser.end()
      } catch (error) {
        // Domain validation and storage failures already explain the problem.
        // Only parser syntax failures need a user-facing recovery instruction.
        if (callbackFailed) throw callbackFailure
        throw new Error('备份文件不完整或格式损坏，请重新导出后再导入。', { cause: error })
      }
    }
    parser.onToken = checkedCallback<ParsedTokenInfo>(({ token, value, offset: tokenOffset }) => {
      if (firstToken) {
        firstToken = false
        if (token !== TokenType.LEFT_BRACE) throw new Error('备份根节点无效。')
      }
      if (depth === 1 && token === TokenType.COMMA) expectingRootKey = true
      if (depth === 1 && expectingRootKey && token === TokenType.STRING) {
        rootKey = String(value)
        if (fields.has(rootKey)) throw new Error('备份包含重复字段。')
        fields.add(rootKey)
        expectingRootKey = false
      }
      if (depth === 1 && token === TokenType.COLON) expectingRootValue = true
      else if (depth === 1 && expectingRootValue) {
        if (rootKey === 'notes') {
          if (token !== TokenType.LEFT_BRACKET) throw new Error('备份中的笔记列表无效。')
          notesArray = true
        }
        expectingRootValue = false
      }
      if (token === TokenType.LEFT_BRACE || token === TokenType.LEFT_BRACKET) {
        depth++
        if (depth === 1) expectingRootKey = true
        if (depth === 3 && rootKey === 'notes') entryStart = tokenOffset
        if (depth > 32) throw new Error('备份数据嵌套过深。')
      } else if (token === TokenType.RIGHT_BRACE || token === TokenType.RIGHT_BRACKET) depth--
      if (depth >= 3 && rootKey === 'notes' && tokenOffset - entryStart > 64 * 1024 * 1024)
        throw new Error('单条笔记数据过大。')
    })
    parser.onValue = checkedCallback<ParsedElementInfo>(({ key, value, stack }) => {
      if (stack.length === 1 && key === 'format') format = value
      else if (stack.length === 1 && key === 'version') version = value
      else if (stack.length === 2 && stack[1].key === 'notes') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error('备份中的笔记无效。')
        const entry = value as { note: unknown; image: unknown }
        const note = validateScreenNote(entry.note)
        if (ids.has(note.id)) throw new Error('备份包含重复笔记。')
        ids.add(note.id)
        if (ids.size > 10_000) throw new Error('备份超过 10,000 条笔记。')
        if (
          typeof entry.image !== 'string' ||
          entry.image.length > Math.ceil(MAX_SCREEN_NOTE_BYTES / 3) * 4 ||
          entry.image.length % 4 !== 0 ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(entry.image)
        )
          throw new Error('备份图片无效或过大。')
        const png = Buffer.from(entry.image, 'base64')
        consume(note, png, importedScreenThumbnail(png))
      }
    })
    const buffer = Buffer.alloc(64 * 1024)
    while (offset < info.size) {
      const { bytesRead } = await file.read(
        buffer,
        0,
        Math.min(buffer.length, info.size - offset),
        offset
      )
      if (!bytesRead) throw new Error('备份在读取期间发生变化，请重试。')
      parse(buffer.subarray(0, bytesRead))
      offset += bytesRead
    }
    if (!parser.isEnded) parse()
    if (format !== SCREEN_NOTE_FORMAT || version !== SCREEN_NOTE_VERSION || !notesArray)
      throw new Error('不支持的屏幕笔记备份。')
    const after = await file.stat()
    const extra = await file.read(buffer, 0, 1, offset)
    if (extra.bytesRead || after.size !== info.size || after.mtimeMs !== info.mtimeMs)
      throw new Error('备份在读取期间发生变化，请重试。')
  } finally {
    await file.close()
  }
}
