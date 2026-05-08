import { create } from 'zustand'
import * as db from './notesdb'

export interface NoteDir {
  id: string
  name: string
  parentId: string | null
  order: number
  expanded: boolean
}

export interface NoteFile {
  id: string
  title: string
  content: string
  dirId: string | null
  createdAt: number
  updatedAt: number
  wordCount: number
  canvasData?: { strokes: any[]; shapes: any[]; canvasBg: string }
}

interface KBState {
  dirs: NoteDir[]
  notes: NoteFile[]
  activeNoteId: string | null
  loaded: boolean
}

interface KBActions {
  init: () => Promise<void>
  createDir: (name: string, parentId?: string | null) => Promise<string>
  renameDir: (id: string, name: string) => Promise<void>
  deleteDir: (id: string) => Promise<void>
  toggleDir: (id: string) => void
  createNote: (title?: string, dirId?: string | null) => Promise<string>
  openNote: (id: string) => Promise<void>
  saveNote: (id: string, content: string) => Promise<void>
  renameNote: (id: string, title: string) => Promise<void>
  moveNote: (id: string, dirId: string | null) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  importMarkdown: (file: File, dirId?: string | null) => Promise<void>
  exportNote: (id: string) => Promise<void>
  saveCanvas: (id: string, strokes: any[], shapes: any[], canvasBg: string) => Promise<void>
  getStats: () => { docCount: number; totalWords: number }
  getActiveNote: () => NoteFile | null
}

const calcWords = (text: string): number => {
  const clean = text.replace(/[#*`\-\[\]()>\|]/g, '').trim()
  return clean.length
}

export const useKBStore = create<KBState & KBActions>((set, get) => ({
  dirs: [],
  notes: [],
  activeNoteId: null,
  loaded: false,

  init: async () => {
    await db.initDB()
    const [dirs, notes] = await Promise.all([db.getAllDirs(), db.getAllNotes()])
    if (dirs.length === 0) {
      const now = Date.now()
      await db.putDir({ id: 'dir-default', name: '默认笔记', parentId: null, order: 0, expanded: true })
      const welcomeContent = `# 欢迎使用 MindNotes 知识库\n\n这是一个本地优先的笔记知识库，支持：\n\n- **Markdown** 编辑和渲染\n- 多级目录管理\n- 文件导入导出\n- 自动统计\n\n开始创建你的第一个笔记吧！`
      await db.putNote({ id: `note-${now}`, title: '欢迎', content: welcomeContent, dirId: 'dir-default', createdAt: now, updatedAt: now, wordCount: calcWords(welcomeContent) })
      const d = await db.getAllDirs()
      const n = await db.getAllNotes()
      set({ dirs: d, notes: n, activeNoteId: n[0]?.id ?? null, loaded: true })
    } else {
      set({ dirs, notes, activeNoteId: notes[0]?.id ?? null, loaded: true })
    }
  },

  createDir: async (name, parentId = null) => {
    const id = `dir-${Date.now()}`
    const dirs = get().dirs
    const maxOrder = dirs.filter((d) => d.parentId === parentId).reduce((m, d) => Math.max(m, d.order), -1)
    await db.putDir({ id, name, parentId, order: maxOrder + 1, expanded: true })
    set({ dirs: await db.getAllDirs() })
    return id
  },

  renameDir: async (id, name) => {
    const dir = (await db.getAllDirs()).find((d) => d.id === id)
    if (dir) { await db.putDir({ ...dir, name }); set({ dirs: await db.getAllDirs() }) }
  },

  deleteDir: async (id) => {
    const allDirs = await db.getAllDirs()
    const allNotes = await db.getAllNotes()
    const childDirIds = allDirs.filter((d) => d.parentId === id).map((d) => d.id)
    const noteIds = allNotes.filter((n) => n.dirId === id || childDirIds.includes(n.dirId ?? '')).map((n) => n.id)
    for (const nid of noteIds) await db.deleteNote(nid)
    for (const cid of childDirIds) await db.deleteDir(cid)
    await db.deleteDir(id)
    const remaining = await db.getAllNotes()
    const { activeNoteId } = get()
    set({
      dirs: await db.getAllDirs(),
      notes: remaining,
      activeNoteId: noteIds.includes(activeNoteId ?? '') ? (remaining[0]?.id ?? null) : activeNoteId,
    })
  },

  toggleDir: (id) => {
    set((s) => ({ dirs: s.dirs.map((d) => d.id === id ? { ...d, expanded: !d.expanded } : d) }))
  },

  createNote: async (title = '未命名笔记', dirId = null) => {
    const id = `note-${Date.now()}`
    const now = Date.now()
    await db.putNote({ id, title, content: '', dirId, createdAt: now, updatedAt: now, wordCount: 0 })
    set({ notes: await db.getAllNotes(), activeNoteId: id })
    return id
  },

  openNote: async (id) => {
    set({ activeNoteId: id })
  },

  saveNote: async (id, content) => {
    const note = (await db.getAllNotes()).find((n) => n.id === id)
    if (!note) return
    await db.putNote({ ...note, content, updatedAt: Date.now(), wordCount: calcWords(content) })
    set({ notes: await db.getAllNotes() })
  },

  renameNote: async (id, title) => {
    const note = (await db.getAllNotes()).find((n) => n.id === id)
    if (!note) return
    await db.putNote({ ...note, title, updatedAt: Date.now() })
    set({ notes: await db.getAllNotes() })
  },

  moveNote: async (id, dirId) => {
    const note = (await db.getAllNotes()).find((n) => n.id === id)
    if (!note) return
    await db.putNote({ ...note, dirId, updatedAt: Date.now() })
    set({ notes: await db.getAllNotes() })
  },

  deleteNote: async (id) => {
    await db.deleteNote(id)
    const { activeNoteId } = get()
    const remaining = await db.getAllNotes()
    set({
      notes: remaining,
      activeNoteId: activeNoteId === id ? (remaining[0]?.id ?? null) : activeNoteId,
    })
  },

  importMarkdown: async (file, dirId = null) => {
    const text = await file.text()
    const title = file.name.replace(/\.md$/i, '')
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const now = Date.now()
    await db.putNote({ id, title, content: text, dirId, createdAt: now, updatedAt: now, wordCount: calcWords(text) })
    set({ notes: await db.getAllNotes() })
  },

  exportNote: async (id) => {
    const note = (await db.getAllNotes()).find((n) => n.id === id)
    if (!note) return
    const blob = new Blob([note.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${note.title}.md`
    document.body.appendChild(a); a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 200)
  },

  saveCanvas: async (id, strokes, shapes, canvasBg) => {
    const note = (await db.getAllNotes()).find((n) => n.id === id)
    if (!note) return
    await db.putNote({ ...note, canvasData: { strokes, shapes, canvasBg }, updatedAt: Date.now() })
    set({ notes: await db.getAllNotes() })
  },

  getStats: () => {
    const { notes } = get()
    return { docCount: notes.length, totalWords: notes.reduce((s, n) => s + n.wordCount, 0) }
  },

  getActiveNote: () => {
    const { notes, activeNoteId } = get()
    return notes.find((n) => n.id === activeNoteId) ?? null
  },
}))

export default useKBStore
