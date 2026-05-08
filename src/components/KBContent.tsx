import { useState, useEffect, useRef } from 'react'
import { marked } from 'marked'
import { useKBStore } from '../store/useKBStore'

marked.setOptions({ breaks: true, gfm: true })

export default function KBContent() {
  const activeNoteId = useKBStore((s) => s.activeNoteId)
  const notes = useKBStore((s) => s.notes)
  const dirs = useKBStore((s) => s.dirs)
  const saveNote = useKBStore((s) => s.saveNote)
  const getStats = useKBStore((s) => s.getStats)
  const importMarkdown = useKBStore((s) => s.importMarkdown)
  const createNote = useKBStore((s) => s.createNote)

  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const note = notes.find((n) => n.id === activeNoteId) ?? null
  const stats = getStats()

  useEffect(() => { setEditing(false) }, [activeNoteId])

  const handleEdit = () => { if (note) { setEditContent(note.content); setEditing(true) } }

  const handleSave = (content: string) => {
    if (!note) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNote(note.id, content), 500)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return
    for (const f of Array.from(files)) { if (f.name.endsWith('.md')) await importMarkdown(f) }
    e.target.value = ''
  }

  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const dirName = (dirId: string | null) => dirs.find((d) => d.id === dirId)?.name ?? '未分类'

  const renderMarkdown = (content: string) => {
    const html = marked.parse(content) as string
    return { __html: html }
  }

  if (!note) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', gap: 12 }}>
        <div style={{ fontSize: 40, opacity: 0.3 }}>📝</div>
        <div style={{ fontSize: 14 }}>选择一个笔记开始阅读</div>
        <button onClick={() => createNote()} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>新建笔记</button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{note.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{dirName(note.dirId)} · {note.wordCount} 字 · 更新于 {fmtTime(note.updatedAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-4)', padding: '4px 10px', borderRadius: 6, background: 'var(--primary-bg)' }}>{stats.docCount} 文档 · {stats.totalWords} 字</div>
          <button onClick={() => fileRef.current?.click()} style={topBtnStyle} title="导入 .md">导入</button>
          <button onClick={handleEdit} style={{ ...topBtnStyle, background: editing ? 'var(--primary)' : topBtnStyle.background, color: editing ? '#fff' : topBtnStyle.color }}>{editing ? '阅读' : '编辑'}</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        {editing ? (
          <textarea
            autoFocus
            value={editContent}
            onChange={(e) => { setEditContent(e.target.value); handleSave(e.target.value) }}
            style={{
              width: '100%', height: '100%', minHeight: 400, border: 'none', outline: 'none', resize: 'none',
              fontSize: 14, lineHeight: 1.8, color: 'var(--text)', background: 'transparent',
              fontFamily: "'Noto Sans SC', 'PingFang SC', monospace",
            }}
          />
        ) : (
          <div className="kb-content" dangerouslySetInnerHTML={renderMarkdown(note.content)} style={{
            fontSize: 14, lineHeight: 1.8, color: 'var(--text)', maxWidth: 720,
          }} />
        )}
      </div>

      <input ref={fileRef} type="file" accept=".md" multiple onChange={handleImport} style={{ display: 'none' }} />
    </div>
  )
}

const topBtnStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
