import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rmdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { ScreenNotebookRepository } from '../dist-electron/electron/screenNotebookRepository.mjs'
import { NotebookRepository } from '../dist-electron/electron/notebookRepository.mjs'
import { NotesWorkspace } from '../dist-electron/electron/notesWorkspace.mjs'
import { readLimitedFile, writeLocalFile } from '../dist-electron/electron/localFiles.mjs'
import { PNG } from 'pngjs'
import { readScreenBackup } from '../dist-electron/electron/screenBackup.mjs'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64'
)
const stroke = {
  id: 'ink_1',
  tool: 'pen',
  color: '#e05d52',
  width: 4,
  points: [
    { x: 10, y: 20 },
    { x: 120, y: 20 },
  ],
}
const note = (id = 'note_1') => ({
  id,
  title: '会议 100%_完成',
  comment: '复盘结论',
  source: { app: 'PowerPoint', title: '课程', display: '主屏幕' },
  width: 1000,
  height: 600,
  strokes: [stroke],
  createdAt: 10,
  updatedAt: 20,
  revision: 1,
  trashedAt: null,
})
const draft = (backgroundId = null) => ({
  displayId: 'display_1',
  width: 1000,
  height: 600,
  strokes: [stroke],
  backgroundId,
  source: note().source,
  updatedAt: 30,
})
const directory = () => mkdtemp(path.join(os.tmpdir(), 'mindnotes-storage-'))

test('committed gestures, frozen backgrounds and editable notes survive repository restart', async () => {
  const data = await directory()
  let repository = new ScreenNotebookRepository(data)
  await repository.saveDraft(draft('image_1'), png)
  await repository.create(note(), png, 'thumbnail')
  const edited = await repository.update('note_1', {
    title: '新标题',
    comment: '修改后的结论',
    strokes: [stroke, { ...stroke, id: 'ink_2' }],
    expectedRevision: 1,
  })
  assert.equal(edited.revision, 2)
  await repository.close()
  repository = new ScreenNotebookRepository(data)
  try {
    assert.deepEqual((await repository.load()).drafts, [draft('image_1')])
    assert.deepEqual(Buffer.from(await repository.getBackground('image_1')), png)
    assert.deepEqual(await repository.get('note_1'), {
      ...note(),
      ...edited,
      strokes: [stroke, { ...stroke, id: 'ink_2' }],
    })
    assert.deepEqual(Buffer.from(await repository.image('note_1')), png)
    assert.equal((await repository.list('修改后的结论')).notes[0].strokeCount, 2)
  } finally {
    await repository.close()
  }
})

test('search is literal, pagination is stable, trash can be restored and stale ink cannot overwrite', async () => {
  const data = await directory()
  const repository = new ScreenNotebookRepository(data)
  try {
    await repository.create(note(), png, 'thumbnail')
    assert.equal((await repository.list('%_')).total, 1)
    assert.equal((await repository.list('%_missing')).total, 0)
    assert.equal((await repository.list('PowerPoint')).total, 1)
    await repository.update('note_1', { comment: '新的结论' })
    await assert.rejects(
      repository.update('note_1', { strokes: [], expectedRevision: 1 }),
      /新的修改/
    )
    assert.equal((await repository.get('note_1')).strokes.length, 1)
    await repository.update('note_1', { trashedAt: 100 })
    assert.equal((await repository.list()).total, 0)
    assert.equal((await repository.list('', 0, true)).total, 1)
    await repository.update('note_1', { trashedAt: null })
    for (let index = 0; index < 55; index++)
      await repository.create(
        { ...note(`note_${index + 2}`), title: `测试 ${index}` },
        png,
        'thumb'
      )
    const first = await repository.list()
    const second = await repository.list('', 50)
    assert.equal(first.total, 56)
    assert.equal(first.notes.length, 50)
    assert.equal(second.notes.length, 6)
    assert.equal(new Set([...first.notes, ...second.notes].map((item) => item.id)).size, 56)
  } finally {
    await repository.close()
  }
})

test('a rejected backup import rolls back every entry and older copies preserve newer edits', async () => {
  const repository = new ScreenNotebookRepository(await directory())
  try {
    await repository.create(note(), png, 'thumbnail')
    await repository.update('note_1', { comment: '最新的本地修改' })
    const changed = await repository.get('note_1')
    const count = await repository.import([{ note: note(), png, thumbnail: 'old' }])
    assert.equal(count, 0)
    assert.deepEqual(await repository.get('note_1'), changed)
    await assert.rejects(
      repository.import([
        { note: note('valid_new'), png, thumbnail: 'new' },
        { note: { ...note('invalid_new'), title: '' }, png, thumbnail: 'new' },
      ])
    )
    assert.equal((await repository.list()).total, 1)
  } finally {
    await repository.close()
  }
})

test('frozen draft writes are atomic and replaced backgrounds are reclaimed', async () => {
  const data = await directory()
  const repository = new ScreenNotebookRepository(data)
  try {
    await repository.saveDraft(draft('first_image'), png)
    await assert.rejects(repository.saveDraft(draft('missing_image')), /背景不存在/)
    assert.equal((await repository.load()).drafts[0].backgroundId, 'first_image')
    await repository.saveDraft(draft('second_image'), png)
    await assert.rejects(repository.getBackground('first_image'), /无法读取/)
    await repository.saveDraft(draft())
    await assert.rejects(repository.getBackground('second_image'), /无法读取/)
  } finally {
    await repository.close()
  }
})

test('streamed editable backup keeps image and ink, and failed exports preserve existing files', async () => {
  const data = await directory()
  const repository = new ScreenNotebookRepository(data)
  const target = path.join(data, 'backup.json')
  try {
    await repository.create(note(), png, 'thumbnail')
    await repository.exportFile(target)
    const backup = JSON.parse(await readFile(target, 'utf8'))
    assert.equal(backup.format, 'mindnotes-pro.screen-notes')
    assert.deepEqual(backup.notes[0].note, note())
    assert.deepEqual(Buffer.from(backup.notes[0].image, 'base64'), png)
    await repository.close()
    const connection = new DatabaseSync(path.join(data, 'screen-notes.sqlite'))
    connection.prepare('UPDATE notes SET image=zeroblob(?)').run(210 * 1024 * 1024)
    connection.close()
    const larger = new ScreenNotebookRepository(data)
    try {
      await assert.rejects(larger.exportFile(target), /256 MB/)
      assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), backup)
      assert.equal((await readdir(data)).filter((name) => name.endsWith('.writing')).length, 0)
    } finally {
      await larger.close()
    }
  } finally {
    await repository.close()
  }
})

test('corrupt and newer databases are preserved and cannot be silently overwritten', async () => {
  const data = await directory()
  const target = path.join(data, 'screen-notes.sqlite')
  const original = Buffer.from('original corrupt notebook bytes')
  await writeFile(target, original)
  const repository = new ScreenNotebookRepository(data)
  await assert.rejects(repository.load())
  await assert.rejects(repository.saveDraft(draft()))
  await repository.close().catch(() => undefined)
  assert.deepEqual(await readFile(target), original)
  const newerData = await directory()
  const connection = new DatabaseSync(path.join(newerData, 'screen-notes.sqlite'))
  connection.exec('PRAGMA user_version=99')
  connection.close()
  const newer = new ScreenNotebookRepository(newerData)
  await assert.rejects(newer.load(), /更新版本/)
  await newer.close().catch(() => undefined)
  const check = new DatabaseSync(path.join(newerData, 'screen-notes.sqlite'))
  assert.equal(check.prepare('PRAGMA user_version').get().user_version, 99)
  check.close()
})

test('v1 databases upgrade summary columns without altering editable content', async () => {
  const data = await directory()
  const connection = new DatabaseSync(path.join(data, 'screen-notes.sqlite'))
  connection.exec(
    `CREATE TABLE notes (id TEXT PRIMARY KEY,document TEXT NOT NULL,title TEXT NOT NULL,comment TEXT NOT NULL,source_text TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,trashed_at INTEGER,image BLOB NOT NULL,thumbnail TEXT NOT NULL); PRAGMA user_version=1;`
  )
  connection
    .prepare('INSERT INTO notes VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(
      'note_1',
      JSON.stringify(note()),
      note().title,
      note().comment,
      'PowerPoint 课程 主屏幕',
      10,
      20,
      null,
      png,
      'thumb'
    )
  connection.close()
  const repository = new ScreenNotebookRepository(data)
  try {
    assert.deepEqual(await repository.get('note_1'), note())
    assert.equal((await repository.list('PowerPoint')).notes[0].strokeCount, 1)
  } finally {
    await repository.close()
  }
})

test('bounded reads and atomic writes reject oversized files and retain earlier exports', async () => {
  const data = await directory()
  const target = path.join(data, 'notes.txt')
  await writeLocalFile(target, '原来的笔记')
  assert.equal((await readLimitedFile(target, 64)).toString('utf8'), '原来的笔记')
  await assert.rejects(readLimitedFile(target, 2), /过大/)
  await writeLocalFile(target, '新的笔记')
  assert.equal(await readFile(target, 'utf8'), '新的笔记')
  await assert.rejects(writeLocalFile(path.join(data, 'missing', 'notes.txt'), 'failure'))
  assert.equal(await readFile(target, 'utf8'), '新的笔记')
})

test('page repository close flush reports failures instead of claiming successful storage', async () => {
  const data = await directory()
  await writeFile(path.join(data, 'page-notes.json.writing'), 'block')
  const { mkdir } = await import('node:fs/promises')
  await mkdir(path.join(data, 'page-notes.json.previous'))
  await writeFile(
    path.join(data, 'page-notes.json'),
    JSON.stringify({ format: 'mindnotes-pro.page-notes', version: 1, exportedAt: 0, pages: [] })
  )
  const repository = new NotebookRepository(data)
  await repository.load()
  await assert.rejects(repository.save([]))
  await assert.rejects(repository.flush())
})

test('streamed backup import validates complete files, images and IDs before committing', async () => {
  const data = await directory()
  const repository = new ScreenNotebookRepository(data)
  const target = path.join(data, 'streamed.json')
  const image = new PNG({ width: 2, height: 2 })
  image.data.fill(180)
  const encoded = PNG.sync.write(image).toString('base64')
  const entry = (id) => ({ note: note(id), image: encoded })
  const backup = (notes) => ({
    format: 'mindnotes-pro.screen-notes',
    version: 1,
    exportedAt: 0,
    notes,
  })
  try {
    // Deliberately cross a 64 KiB input boundary in UTF-8 text and geometry.
    const large = entry('streamed_large')
    large.note.comment = '中文结论'.repeat(3500)
    large.note.strokes = Array.from({ length: 250 }, (_, index) => ({
      ...stroke,
      id: `stream_${index}`,
    }))
    await writeFile(target, JSON.stringify(backup([large, entry('streamed_small')])))
    assert.equal(await repository.importFile(target), 2)
    assert.deepEqual(await repository.get('streamed_large'), large.note)
    assert.equal(
      (await repository.list()).notes[0].thumbnail.startsWith('data:image/png;base64,'),
      true
    )
    assert.equal(await repository.importFile(target), 0)
    for (const [content, message] of [
      [JSON.stringify(backup([entry('incomplete')])).slice(0, -1), /备份文件不完整或格式损坏/],
      [
        JSON.stringify(backup([entry('incomplete_string')])).slice(0, -20),
        /备份文件不完整或格式损坏/,
      ],
      [
        `{"format":"mindnotes-pro.screen-notes","version":1,"notes":[${JSON.stringify(entry('before_syntax_failure'))},broken]}`,
        /备份文件不完整或格式损坏/,
      ],
      [
        JSON.stringify(
          backup([entry('first'), { ...entry('bad_image'), image: encoded.slice(0, -8) }])
        ),
        /批注图片无法读取/,
      ],
      [JSON.stringify(backup([entry('duplicate'), entry('duplicate')])), /重复笔记/],
      [JSON.stringify({ ...backup([entry('bad_version')]), version: 99 }), /不支持的屏幕笔记备份/],
      [
        `{"format":"mindnotes-pro.screen-notes","format":"mindnotes-pro.screen-notes","version":1,"notes":[${JSON.stringify(entry('duplicate_header'))}]}`,
        /重复字段/,
      ],
      [JSON.stringify({ ...backup([]), notes: {} }), /笔记列表无效/],
      [JSON.stringify(backup([entry('trailing')])) + 'false', /备份文件不完整或格式损坏/],
    ]) {
      await writeFile(target, content)
      await assert.rejects(repository.importFile(target), message)
      assert.equal((await repository.list()).total, 2)
    }
    await writeFile(target, JSON.stringify(backup([entry('consumer_failure')])))
    const consumerFailure = new Error('存储写入失败，应保留原始错误')
    await assert.rejects(
      readScreenBackup(target, () => {
        throw consumerFailure
      }),
      (error) => error === consumerFailure
    )
  } finally {
    await repository.close()
  }
})

test('page repository atomically keeps the earlier notebook and recovers without destroying it', async () => {
  const data = await directory()
  const repository = new NotebookRepository(data)
  const first = {
    url: 'https://example.com/article',
    title: '旧标题',
    annotations: [],
    createdAt: 1,
    updatedAt: 1,
  }
  await repository.load()
  await repository.save([first])
  await repository.save([{ ...first, title: '新标题', updatedAt: 2 }])
  await repository.flush()
  await writeFile(path.join(data, 'page-notes.json'), 'corrupt current file')
  const recovered = new NotebookRepository(data)
  assert.deepEqual(await recovered.load(), [first])
  await recovered.save([{ ...first, title: '恢复后修改', updatedAt: 3 }])
  assert.deepEqual(
    JSON.parse(await readFile(path.join(data, 'page-notes.json.previous'), 'utf8')).pages,
    [first]
  )
  assert.equal(
    JSON.parse(await readFile(path.join(data, 'page-notes.json'), 'utf8')).pages[0].title,
    '恢复后修改'
  )
})

test('storage worker termination rejects pending saves promptly and preserves committed notes', async () => {
  const data = await directory()
  const repository = new ScreenNotebookRepository(data)
  await repository.create(note(), png, 'thumbnail')
  const connection = new DatabaseSync(path.join(data, 'screen-notes.sqlite'))
  connection.exec('BEGIN IMMEDIATE')
  try {
    // Hold the real SQLite write lock so the request remains outstanding when its worker exits.
    const pending = repository.update('note_1', { comment: 'must not claim this was saved' })
    const rejected = assert.rejects(pending, /存储进程已退出/)
    await repository.worker.terminate()
    await rejected
    await assert.rejects(repository.flush(), /存储进程已退出/)
    assert.equal(repository.pending.size, 0)
  } finally {
    connection.exec('ROLLBACK')
    connection.close()
    await repository.close().catch(() => undefined)
  }
  const reopened = new ScreenNotebookRepository(data)
  try {
    assert.deepEqual(await reopened.get('note_1'), note())
    await reopened.update('note_1', { comment: 'restart can save again' })
    assert.equal((await reopened.get('note_1')).comment, 'restart can save again')
  } finally {
    await reopened.close()
  }
})

const pageNotebook = (comment = '需要保存的导入笔记') => ({
  url: 'https://example.com/imported',
  title: '网页恢复样本',
  createdAt: 1,
  updatedAt: 2,
  annotations: [
    {
      id: 'imported_ink',
      kind: 'ink',
      color: '#e05d52',
      points: [
        { x: 10, y: 20 },
        { x: 120, y: 20 },
      ],
      anchor: null,
      quote: null,
      comment,
      createdAt: 1,
      updatedAt: 2,
    },
  ],
})
const pageBackup = (pages) =>
  JSON.stringify({ format: 'mindnotes-pro.page-notes', version: 1, pages })

test('page workspace tells users when an earlier copy was recovered and keeps the notice after editing', async () => {
  const data = await directory()
  const saved = pageNotebook()
  const file = path.join(data, 'page-notes.json')
  const previous = `${file}.previous`
  await writeFile(file, 'corrupt current page file')
  const recoveryBytes = pageBackup([saved])
  await writeFile(previous, recoveryBytes)
  const workspace = new NotesWorkspace(new NotebookRepository(data), () => {})
  await workspace.load()
  assert.deepEqual(workspace.snapshot.pages, [saved])
  assert.match(workspace.snapshot.recoveryNotice, /上一次成功保存.*最近修改可能缺失/)
  assert.equal(workspace.snapshot.saveState, 'saved')
  assert.equal(workspace.snapshot.error, null)
  assert.equal(await readFile(file, 'utf8'), 'corrupt current page file')
  workspace.open(saved.url, saved.title)
  workspace.update(saved.url, saved.annotations[0].id, '恢复后保存的新想法')
  await workspace.flush()
  const recoveredNotice = workspace.snapshot.recoveryNotice
  assert.match(recoveredNotice, /最近修改可能缺失/)
  assert.equal(await readFile(previous, 'utf8'), recoveryBytes)
  workspace.home()
  assert.equal(workspace.snapshot.recoveryNotice, recoveredNotice)
  const reopened = new NotesWorkspace(new NotebookRepository(data), () => {})
  await reopened.load()
  assert.equal(reopened.snapshot.pages[0].annotations[0].comment, '恢复后保存的新想法')
  assert.equal(reopened.snapshot.recoveryNotice, null)
})

test('page import rejects a failed durable save while retaining memory and both corrupt originals', async () => {
  const data = await directory()
  const file = path.join(data, 'page-notes.json')
  const previous = `${file}.previous`
  await writeFile(file, 'unreadable primary')
  await writeFile(previous, 'unreadable previous')
  const workspace = new NotesWorkspace(new NotebookRepository(data), () => {})
  await workspace.load()
  const imported = pageNotebook()
  await assert.rejects(workspace.import([imported]), /导入内容尚未保存.*已保留在当前窗口.*导出备份/)
  assert.deepEqual(workspace.snapshot.pages, [imported])
  assert.equal(workspace.snapshot.saveState, 'error')
  await assert.rejects(workspace.flush(), /无法读取/)
  assert.equal(await readFile(file, 'utf8'), 'unreadable primary')
  assert.equal(await readFile(previous, 'utf8'), 'unreadable previous')
})

test('page import retry commits the retained notes and clears only the storage error', async () => {
  const data = await directory()
  const first = pageNotebook('旧结论')
  const file = path.join(data, 'page-notes.json')
  const previous = `${file}.previous`
  await writeFile(file, pageBackup([first]))
  await mkdir(previous)
  const workspace = new NotesWorkspace(new NotebookRepository(data), () => {})
  await workspace.load()
  const imported = {
    ...first,
    updatedAt: 10,
    annotations: [{ ...first.annotations[0], comment: '导入的新结论', updatedAt: 10 }],
  }
  await assert.rejects(workspace.import([imported]), /导入内容尚未保存/)
  assert.equal(JSON.parse(await readFile(file, 'utf8')).pages[0].annotations[0].comment, '旧结论')
  await rmdir(previous)
  await workspace.flush()
  assert.equal(workspace.snapshot.saveState, 'saved')
  assert.equal(workspace.snapshot.error, null)
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')).pages, [imported])
  workspace.error('网页暂时无法打开。')
  await workspace.import([imported])
  assert.equal(workspace.snapshot.error, '网页暂时无法打开。')
  const reopened = new NotesWorkspace(new NotebookRepository(data), () => {})
  await reopened.load()
  assert.deepEqual(reopened.snapshot.pages, [imported])
})

test('page import receipt waits for its durable write and later concurrent edits', async () => {
  const writes = []
  let committed = []
  const repository = {
    recoveryNotice: null,
    load: async () => [],
    save(pages) {
      return new Promise((resolve) => {
        writes.push(() => {
          committed = pages
          resolve()
        })
      })
    },
    flush: async () => {},
  }
  const workspace = new NotesWorkspace(repository, () => {})
  await workspace.load()
  const imported = pageNotebook()
  let settled = false
  const receipt = workspace.import([imported]).then(() => {
    settled = true
  })
  assert.equal(settled, false)
  workspace.update(imported.url, imported.annotations[0].id, '导入尚在保存时继续编辑')
  assert.equal(writes.length, 2)
  writes[0]()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(settled, false)
  assert.equal(workspace.snapshot.saveState, 'saving')
  writes[1]()
  await receipt
  assert.equal(settled, true)
  assert.equal(workspace.snapshot.saveState, 'saved')
  assert.equal(committed[0].annotations[0].comment, '导入尚在保存时继续编辑')
})
