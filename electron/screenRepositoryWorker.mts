import { parentPort, workerData } from 'node:worker_threads'
import { DatabaseSync } from 'node:sqlite'
import { closeSync, fsyncSync, mkdirSync, openSync, renameSync, rmSync, writeSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  MAX_SCREEN_BACKUP_BYTES,
  SCREEN_NOTE_FORMAT,
  SCREEN_NOTE_VERSION,
  screenPreferences,
  validateScreenDraft,
  validateScreenNote,
  validateScreenPatch,
} from '../src/notes/screenNotebook.js'
import type { ScreenNote, ScreenNoteSummary } from '../src/notes/screenNotebook.js'
import type { RepositoryEnvelope, RepositoryRequest } from './screenRepositoryProtocol.mjs'
import { readScreenBackup } from './screenBackup.mjs'

let database: DatabaseSync | null = null
let startupError: string | null = null
try {
  mkdirSync(workerData.directory as string, { recursive: true })
  database = new DatabaseSync(path.join(workerData.directory as string, 'screen-notes.sqlite'))
  const check = database.prepare('PRAGMA quick_check').get()
  if (!check || Object.values(check)[0] !== 'ok')
    throw new Error('本地笔记数据库完整性检查失败，原文件已保留。')
  const version = Number(database.prepare('PRAGMA user_version').get()?.user_version)
  if (version > 2) throw new Error('本地笔记来自更新版本，请使用新版应用打开。')
  database.exec(
    'PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;'
  )
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY, document TEXT NOT NULL, title TEXT NOT NULL, comment TEXT NOT NULL,
      source_text TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      trashed_at INTEGER, image BLOB NOT NULL, thumbnail TEXT NOT NULL,
      source_app TEXT NOT NULL DEFAULT '', source_title TEXT NOT NULL DEFAULT '',
      source_display TEXT NOT NULL DEFAULT '', stroke_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS notes_updated ON notes(trashed_at, updated_at DESC);
    CREATE TABLE IF NOT EXISTS backgrounds (id TEXT PRIMARY KEY, image BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS drafts (display_id TEXT PRIMARY KEY, document TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
  const columns = new Set(
    database
      .prepare('PRAGMA table_info(notes)')
      .all()
      .map((row) => row.name)
  )
  if (!columns.has('stroke_count')) {
    database.exec(`BEGIN IMMEDIATE;
      ALTER TABLE notes ADD COLUMN source_app TEXT NOT NULL DEFAULT '';
      ALTER TABLE notes ADD COLUMN source_title TEXT NOT NULL DEFAULT '';
      ALTER TABLE notes ADD COLUMN source_display TEXT NOT NULL DEFAULT '';
      ALTER TABLE notes ADD COLUMN stroke_count INTEGER NOT NULL DEFAULT 0;
      UPDATE notes SET source_app=json_extract(document,'$.source.app'),
        source_title=json_extract(document,'$.source.title'),
        source_display=json_extract(document,'$.source.display'),
        stroke_count=json_array_length(document,'$.strokes');
      PRAGMA user_version=2; COMMIT;`)
  } else database.exec('PRAGMA user_version=2')
  // Interrupted captures cannot remain referenced by a committed draft.
  database.exec(
    "DELETE FROM backgrounds WHERE id NOT IN (SELECT json_extract(document,'$.backgroundId') FROM drafts WHERE json_extract(document,'$.backgroundId') IS NOT NULL)"
  )
} catch (error) {
  startupError = error instanceof Error ? error.message : '本地笔记无法打开，原数据已保留。'
}

function db(): DatabaseSync {
  if (!database || startupError) throw new Error(startupError ?? '笔记数据库未就绪。')
  return database
}

function document(id: string): ScreenNote {
  const row = db().prepare('SELECT document FROM notes WHERE id=?').get(id)
  if (!row) throw new Error('找不到这条笔记。')
  return validateScreenNote(JSON.parse(String(row.document)))
}

function putNote(note: ScreenNote, png: Uint8Array, thumbnail: string): void {
  db()
    .prepare(
      `INSERT INTO notes(id,document,title,comment,source_text,created_at,updated_at,trashed_at,image,thumbnail,source_app,source_title,source_display,stroke_count)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document,title=excluded.title,
    comment=excluded.comment,source_text=excluded.source_text,updated_at=excluded.updated_at,
    trashed_at=excluded.trashed_at,image=excluded.image,thumbnail=excluded.thumbnail,
    source_app=excluded.source_app,source_title=excluded.source_title,source_display=excluded.source_display,stroke_count=excluded.stroke_count`
    )
    .run(
      note.id,
      JSON.stringify(note),
      note.title,
      note.comment,
      `${note.source.app} ${note.source.title} ${note.source.display}`,
      note.createdAt,
      note.updatedAt,
      note.trashedAt,
      png,
      thumbnail,
      note.source.app,
      note.source.title,
      note.source.display,
      note.strokes.length
    )
}

function transaction<T>(work: () => T): T {
  db().exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db().exec('COMMIT')
    return result
  } catch (error) {
    db().exec('ROLLBACK')
    throw error
  }
}

function perform(request: RepositoryRequest): unknown {
  const connection = db()
  if (request.operation === 'load') {
    return {
      drafts: connection
        .prepare('SELECT document FROM drafts')
        .all()
        .map((row) => validateScreenDraft(JSON.parse(String(row.document)))),
      preferences: screenPreferences(
        JSON.parse(
          String(
            connection.prepare("SELECT value FROM settings WHERE key='preferences'").get()?.value ??
              '{}'
          )
        )
      ),
    }
  }
  if (request.operation === 'draft') {
    const draft = validateScreenDraft(request.draft)
    transaction(() => {
      const old = connection
        .prepare('SELECT document FROM drafts WHERE display_id=?')
        .get(draft.displayId)
      const oldBackground = old
        ? validateScreenDraft(JSON.parse(String(old.document))).backgroundId
        : null
      if (draft.backgroundId && request.png)
        connection
          .prepare('INSERT INTO backgrounds(id,image) VALUES(?,?) ON CONFLICT(id) DO NOTHING')
          .run(draft.backgroundId, request.png)
      if (
        draft.backgroundId &&
        !connection.prepare('SELECT id FROM backgrounds WHERE id=?').get(draft.backgroundId)
      )
        throw new Error('草稿背景不存在，无法保存。')
      connection
        .prepare(
          'INSERT INTO drafts(display_id,document) VALUES(?,?) ON CONFLICT(display_id) DO UPDATE SET document=excluded.document'
        )
        .run(draft.displayId, JSON.stringify(draft))
      if (oldBackground && oldBackground !== draft.backgroundId)
        connection
          .prepare(
            "DELETE FROM backgrounds WHERE id=? AND NOT EXISTS (SELECT 1 FROM drafts WHERE json_extract(document,'$.backgroundId')=?)"
          )
          .run(oldBackground, oldBackground)
    })
    return null
  }
  if (request.operation === 'background') {
    connection
      .prepare('INSERT INTO backgrounds(id,image) VALUES(?,?) ON CONFLICT(id) DO NOTHING')
      .run(request.id, request.png)
    return null
  }
  if (request.operation === 'getBackground') {
    const row = connection.prepare('SELECT image FROM backgrounds WHERE id=?').get(request.id)
    if (!row) throw new Error('草稿背景无法读取。')
    return row.image
  }
  if (request.operation === 'preferences') {
    connection
      .prepare(
        "INSERT INTO settings(key,value) VALUES('preferences',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
      )
      .run(JSON.stringify(screenPreferences(request.preferences)))
    return null
  }
  if (request.operation === 'create') {
    const note = validateScreenNote(request.note)
    if (connection.prepare('SELECT id FROM notes WHERE id=?').get(note.id))
      throw new Error('笔记已经存在。')
    transaction(() => putNote(note, request.png, request.thumbnail))
    return note
  }
  if (request.operation === 'get') return document(request.id)
  if (request.operation === 'image') {
    const row = connection.prepare('SELECT image FROM notes WHERE id=?').get(request.id)
    if (!row) throw new Error('笔记图片无法读取。')
    return row.image
  }
  if (request.operation === 'list') {
    const query = `%${request.query.replace(/[%_^]/g, '^$&')}%`
    const condition = `trashed_at IS ${request.trash ? 'NOT ' : ''}NULL AND (title LIKE ? ESCAPE '^' OR comment LIKE ? ESCAPE '^' OR source_text LIKE ? ESCAPE '^')`
    const total = Number(
      connection
        .prepare(`SELECT COUNT(*) AS total FROM notes WHERE ${condition}`)
        .get(query, query, query)?.total ?? 0
    )
    const notes = connection
      .prepare(
        `SELECT id,title,comment,source_app,source_title,source_display,created_at,updated_at,stroke_count,trashed_at,thumbnail FROM notes WHERE ${condition} ORDER BY updated_at DESC, id LIMIT 50 OFFSET ?`
      )
      .all(query, query, query, request.offset)
      .map((row): ScreenNoteSummary => {
        return {
          id: String(row.id),
          title: String(row.title),
          preview: String(row.comment).slice(0, 300),
          source: {
            app: String(row.source_app),
            title: String(row.source_title),
            display: String(row.source_display),
          },
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
          strokeCount: Number(row.stroke_count),
          trashedAt: row.trashed_at === null ? null : Number(row.trashed_at),
          thumbnail: String(row.thumbnail),
        }
      })
    return { notes, total, offset: request.offset }
  }
  if (request.operation === 'update') {
    const patch = validateScreenPatch(request.patch)
    return transaction(() => {
      const previous = document(request.id)
      if (
        patch.strokes &&
        patch.expectedRevision !== undefined &&
        patch.expectedRevision !== previous.revision
      )
        throw new Error('笔记已有新的修改，请重新打开后再编辑笔迹。')
      const note = validateScreenNote({
        ...previous,
        ...patch,
        revision: previous.revision + 1,
        updatedAt: Math.max(Date.now(), previous.updatedAt + 1),
      })
      connection
        .prepare(
          'UPDATE notes SET document=?,title=?,comment=?,updated_at=?,trashed_at=?,stroke_count=? WHERE id=?'
        )
        .run(
          JSON.stringify(note),
          note.title,
          note.comment,
          note.updatedAt,
          note.trashedAt,
          note.strokes.length,
          note.id
        )
      return {
        id: note.id,
        title: note.title,
        comment: note.comment,
        updatedAt: note.updatedAt,
        revision: note.revision,
        trashedAt: note.trashedAt,
      }
    })
  }
  if (request.operation === 'export') {
    return connection
      .prepare(`SELECT document,image,thumbnail FROM notes ${request.id ? 'WHERE id=?' : ''}`)
      .all(...(request.id ? [request.id] : []))
      .map((row) => ({
        note: validateScreenNote(JSON.parse(String(row.document))),
        png: row.image,
        thumbnail: String(row.thumbnail),
      }))
  }
  if (request.operation === 'exportFile') {
    // Stream one entry at a time in the worker, with a preflight limit and atomic replacement.
    const estimate = connection
      .prepare(
        `SELECT COALESCE(SUM(length(document) + ((length(image)+2)/3)*4 + 100),0) AS bytes FROM notes ${request.id ? 'WHERE id=?' : ''}`
      )
      .get(...(request.id ? [request.id] : []))
    if (Number(estimate?.bytes) + 256 > MAX_SCREEN_BACKUP_BYTES)
      throw new Error('备份超过 256 MB，请分条导出。')
    const temporary = `${request.filePath}.${randomUUID()}.writing`
    let file: number | null = null
    try {
      file = openSync(temporary, 'wx')
      let written = 0
      const append = (content: string) => {
        const bytes = Buffer.from(content, 'utf8')
        written += bytes.byteLength
        if (written > MAX_SCREEN_BACKUP_BYTES) throw new Error('备份超过 256 MB，请分条导出。')
        let offset = 0
        while (offset < bytes.byteLength) offset += writeSync(file as number, bytes, offset)
      }
      append(
        `{"format":${JSON.stringify(SCREEN_NOTE_FORMAT)},"version":${SCREEN_NOTE_VERSION},"exportedAt":${Date.now()},"notes":[`
      )
      let first = true
      for (const row of connection
        .prepare(`SELECT document,image FROM notes ${request.id ? 'WHERE id=?' : ''} ORDER BY id`)
        .iterate(...(request.id ? [request.id] : []))) {
        const note = validateScreenNote(JSON.parse(String(row.document)))
        append(
          `${first ? '' : ','}${JSON.stringify({ note, image: Buffer.from(row.image as Uint8Array).toString('base64') })}`
        )
        first = false
      }
      append(']}')
      fsyncSync(file)
      closeSync(file)
      file = null
      renameSync(temporary, request.filePath)
    } finally {
      if (file !== null) closeSync(file)
      rmSync(temporary, { force: true })
    }
    return null
  }
  if (request.operation === 'import') {
    return transaction(() => {
      let count = 0
      for (const entry of request.entries) {
        const note = validateScreenNote(entry.note)
        const row = connection.prepare('SELECT updated_at FROM notes WHERE id=?').get(note.id)
        if (row && Number(row.updated_at) >= note.updatedAt) continue
        putNote(note, entry.png, entry.thumbnail)
        count += 1
      }
      return count
    })
  }
  if (request.operation === 'importFile') {
    return importFile(request.filePath)
  }
  if (request.operation === 'flush') {
    connection.exec('PRAGMA wal_checkpoint(PASSIVE)')
    return null
  }
  if (request.operation === 'close') {
    connection.close()
    database = null
    return null
  }
}

async function importFile(filePath: string): Promise<number> {
  const connection = db()
  connection.exec('BEGIN IMMEDIATE')
  let count = 0
  try {
    await readScreenBackup(filePath, (note, png, thumbnail) => {
      const row = connection.prepare('SELECT updated_at FROM notes WHERE id=?').get(note.id)
      if (row && Number(row.updated_at) >= note.updatedAt) return
      putNote(note, png, thumbnail)
      count++
    })
    connection.exec('COMMIT')
    return count
  } catch (error) {
    connection.exec('ROLLBACK')
    throw error
  }
}

let requests = Promise.resolve()
parentPort?.on('message', (envelope: RepositoryEnvelope) => {
  requests = requests.then(async () => {
    try {
      parentPort?.postMessage({ id: envelope.id, value: await perform(envelope.request) })
    } catch (error) {
      parentPort?.postMessage({
        id: envelope.id,
        error: error instanceof Error ? error.message : '笔记保存失败。',
      })
    }
  })
})
