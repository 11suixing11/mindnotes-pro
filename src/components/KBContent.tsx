import { useState, useEffect, useRef } from 'react'
import { marked } from 'marked'
import { useKBStore } from '../store/useKBStore'
import { useDrawingStore } from '../store/useDrawingStore'
import Canvas from './Canvas'
import Toolbar from './Toolbar'
import DocPanel from './DocPanel'

marked.setOptions({ breaks: true, gfm: true })

const TOOL_NAMES: Record<string, string> = {
  select: '选择', pen: '画笔', eraser: '橡皮', pan: '平移', text: '文字',
  rectangle: '矩形', circle: '圆形', line: '直线', arrow: '箭头',
}

export default function KBContent() {
  const activeNoteId = useKBStore((s) => s.activeNoteId)
  const notes = useKBStore((s) => s.notes)
  const dirs = useKBStore((s) => s.dirs)
  const saveNote = useKBStore((s) => s.saveNote)
  const saveCanvas = useKBStore((s) => s.saveCanvas)
  const getStats = useKBStore((s) => s.getStats)
  const importMarkdown = useKBStore((s) => s.importMarkdown)
  const createNote = useKBStore((s) => s.createNote)
  const loadFromDoc = useDrawingStore((s) => s.loadFromDoc)
  const strokes = useDrawingStore((s) => s.strokes)
  const shapes = useDrawingStore((s) => s.shapes)
  const canvasBg = useDrawingStore((s) => s.canvasBg)
  const tool = useDrawingStore((s) => s.tool)

  const [tab, setTab] = useState<'doc' | 'canvas'>('doc')
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [showDocs, setShowDocs] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const prevNoteId = useRef<string | null>(null)

  const note = notes.find((n) => n.id === activeNoteId) ?? null
  const stats = getStats()

  useEffect(() => {
    if (note && note.id !== prevNoteId.current) {
      prevNoteId.current = note.id
      setTab('doc')
      setEditing(false)
      if (note.canvasData) {
        loadFromDoc(note.canvasData.strokes, note.canvasData.shapes, note.canvasData.canvasBg)
      } else {
        loadFromDoc([], [], '#ffffff')
      }
    }
  }, [note?.id])

  useEffect(() => {
    if (tab === 'canvas' && note) {
      if (canvasSaveTimer.current) clearTimeout(canvasSaveTimer.current)
      canvasSaveTimer.current = setTimeout(() => {
        saveCanvas(note.id, strokes, shapes, canvasBg)
      }, 2000)
    }
  }, [strokes, shapes, canvasBg, tab])

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

  const fmtTime = (ts: number) => new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  const dirName = (dirId: string | null) => dirs.find((d) => d.id === dirId)?.name ?? '未分类'
  const renderMarkdown = (content: string) => ({ __html: marked.parse(content) as string })

  if (!note) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', gap: 12 }}>
        <div style={{ fontSize: 40, opacity: 0.3 }}>📝</div>
        <div style={{ fontSize: 14 }}>选择一个笔记开始阅读</div>
        <button onClick={() => createNote()} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>新建笔记</button>
      </div>
    )
  }

  if (tab === 'canvas') {
    return (
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: canvasBg }}>
        <Canvas />
        <Toolbar onToggleDocs={() => setShowDocs(!showDocs)} />
        <DocPanel open={showDocs} onClose={() => setShowDocs(false)} />

        <div className="status panel" style={{ position: 'fixed', bottom: 16, left: 260, zIndex: 20 }}>
          <span onClick={() => { setTab('doc'); if (note) saveCanvas(note.id, strokes, shapes, canvasBg) }} style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>← 返回文档</span>
          <span className="vl" />
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{TOOL_NAMES[tool] ?? tool}</span>
          <span className="vl" />
          <span>{strokes.length + shapes.length} 对象</span>
        </div>

        <div className="hints panel" style={{ position: 'fixed', bottom: 16, right: 18, zIndex: 20 }}>
          <kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销 · 滚轮缩放 · <kbd>0</kbd>-<kbd>8</kbd> 工具
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{dirName(note.dirId)} · {note.wordCount} 字 · {fmtTime(note.updatedAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button onClick={() => setTab('doc')} style={{ ...tabBtn, background: 'var(--primary)', color: '#fff' }}>文档</button>
            <button onClick={() => setTab('canvas')} style={{ ...tabBtn, background: 'transparent', color: 'var(--text-2)', borderLeft: '1px solid var(--border)' }}>画板</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-4)', padding: '3px 8px', borderRadius: 5, background: 'var(--primary-bg)' }}>{stats.docCount} 文档 · {stats.totalWords} 字</div>
          <button onClick={() => fileRef.current?.click()} style={topBtnStyle}>导入</button>
          <button onClick={handleEdit} style={{ ...topBtnStyle, background: editing ? 'var(--primary)' : undefined, color: editing ? '#fff' : undefined }}>{editing ? '阅读' : '编辑'}</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px' }}>
        {editing ? (
          <textarea autoFocus value={editContent} onChange={(e) => { setEditContent(e.target.value); handleSave(e.target.value) }}
            style={{ width: '100%', height: '100%', minHeight: 400, border: 'none', outline: 'none', resize: 'none', fontSize: 14, lineHeight: 1.8, color: 'var(--text)', background: 'transparent', fontFamily: "'Noto Sans SC', monospace" }} />
        ) : (
          <div className="kb-content" dangerouslySetInnerHTML={renderMarkdown(note.content)} style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', maxWidth: 720 }} />
        )}
      </div>

      <input ref={fileRef} type="file" accept=".md" multiple onChange={handleImport} style={{ display: 'none' }} />
    </div>
  )
}

const tabBtn: React.CSSProperties = {
  padding: '5px 14px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
}
const topBtnStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
