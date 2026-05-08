import { useState } from 'react'
import { useKBStore } from '../store/useKBStore'
import type { NoteDir, NoteFile } from '../store/useKBStore'

export default function KBSidebar({ onOpenWhiteboard }: { onOpenWhiteboard?: () => void }) {
  const dirs = useKBStore((s) => s.dirs)
  const notes = useKBStore((s) => s.notes)
  const activeNoteId = useKBStore((s) => s.activeNoteId)
  const toggleDir = useKBStore((s) => s.toggleDir)
  const createDir = useKBStore((s) => s.createDir)
  const renameDir = useKBStore((s) => s.renameDir)
  const deleteDir = useKBStore((s) => s.deleteDir)
  const createNote = useKBStore((s) => s.createNote)
  const openNote = useKBStore((s) => s.openNote)
  const renameNote = useKBStore((s) => s.renameNote)
  const deleteNote = useKBStore((s) => s.deleteNote)
  const importMarkdown = useKBStore((s) => s.importMarkdown)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'dir' | 'note'; id: string } | null>(null)
  const fileInput = (globalThis as any).__kbFileInput as HTMLInputElement | undefined

  const rootDirs = dirs.filter((d) => d.parentId === null).sort((a, b) => a.order - b.order)
  const childDirs = (parentId: string) => dirs.filter((d) => d.parentId === parentId).sort((a, b) => a.order - b.order)
  const dirNotes = (dirId: string | null) => notes.filter((n) => n.dirId === dirId).sort((a, b) => b.updatedAt - a.updatedAt)

  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const handleContext = (e: React.MouseEvent, type: 'dir' | 'note', id: string) => {
    e.preventDefault(); e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, type, id })
  }

  const handleRename = (id: string, type: 'dir' | 'note') => {
    if (renameVal.trim()) { type === 'dir' ? renameDir(id, renameVal.trim()) : renameNote(id, renameVal.trim()) }
    setRenamingId(null)
  }

  const renderDir = (dir: NoteDir, depth: number = 0) => {
    const children = childDirs(dir.id)
    const notesInDir = dirNotes(dir.id)
    return (
      <div key={dir.id}>
        <div
          onClick={() => toggleDir(dir.id)}
          onContextMenu={(e) => handleContext(e, 'dir', dir.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', paddingLeft: 8 + depth * 16,
            cursor: 'pointer', borderRadius: 8, margin: '1px 4px',
            transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-bg)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
        >
          <span style={{ fontSize: 10, color: 'var(--text-4)', width: 14, textAlign: 'center', transition: 'transform 0.15s', transform: dir.expanded ? 'rotate(90deg)' : '' }}>▶</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dir.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{notesInDir.length + notes.filter((n) => childDirs(dir.id).some((c) => c.id === n.dirId)).length}</span>
        </div>
        {dir.expanded && (
          <div>
            {children.map((c) => renderDir(c, depth + 1))}
            {notesInDir.map((n) => renderNote(n, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderNote = (note: NoteFile, depth: number) => {
    const isActive = note.id === activeNoteId
    return (
      <div
        key={note.id}
        onClick={() => openNote(note.id)}
        onContextMenu={(e) => handleContext(e, 'note', note.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', paddingLeft: 8 + depth * 16 + 14,
          cursor: 'pointer', borderRadius: 8, margin: '1px 4px',
          background: isActive ? 'var(--primary-bg)' : 'transparent',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--primary-bg)' }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = '' }}
      >
        {renamingId === note.id ? (
          <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onBlur={() => handleRename(note.id, 'note')} onKeyDown={(e) => { if (e.key === 'Enter') handleRename(note.id, 'note'); if (e.key === 'Escape') setRenamingId(null) }} onClick={(e) => e.stopPropagation()} style={{ flex: 1, border: '1px solid var(--primary)', borderRadius: 4, padding: '1px 4px', fontSize: 12, background: 'var(--card)', color: 'var(--text)', outline: 'none' }} />
        ) : (
          <>
            <span style={{ fontSize: 12, color: isActive ? 'var(--primary)' : 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>{note.title}</span>
            <span style={{ fontSize: 10, color: 'var(--text-4)', flexShrink: 0 }}>{fmtTime(note.updatedAt)}</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{
      width: 240, height: '100%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      background: 'var(--card-solid)', flexShrink: 0,
    }}>
      <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>M</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>MindNotes</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onOpenWhiteboard} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>白板</button>
          <button onClick={() => createDir('新文件夹')} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ 文件夹</button>
          <button onClick={() => createNote()} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ 笔记</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
        {rootDirs.map((d) => renderDir(d, 0))}
        {dirNotes(null).map((n) => renderNote(n, 0))}
      </div>

      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setContextMenu(null)} />
          <div className="panel" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, minWidth: 140, padding: 4, zIndex: 201, animation: 'popIn 0.15s ease' }}>
            {contextMenu.type === 'dir' ? (
              <>
                <button onClick={() => { createNote('未命名笔记', contextMenu.id); setContextMenu(null) }} style={ctxItemStyle}>新建笔记</button>
                <button onClick={() => { const d = dirs.find((x) => x.id === contextMenu.id); if (d) { setRenamingId(d.id); setRenameVal(d.name) } setContextMenu(null) }} style={ctxItemStyle}>重命名</button>
                <div style={{ height: 1, background: 'var(--border)', margin: '3px 6px' }} />
                <button onClick={() => { if (confirm('删除文件夹及所有内容？')) deleteDir(contextMenu.id); setContextMenu(null) }} style={{ ...ctxItemStyle, color: 'var(--danger)' }}>删除</button>
              </>
            ) : (
              <>
                <button onClick={() => { const n = notes.find((x) => x.id === contextMenu.id); if (n) { setRenamingId(n.id); setRenameVal(n.title) } setContextMenu(null) }} style={ctxItemStyle}>重命名</button>
                <button onClick={() => { useKBStore.getState().exportNote(contextMenu.id); setContextMenu(null) }} style={ctxItemStyle}>导出 .md</button>
                <div style={{ height: 1, background: 'var(--border)', margin: '3px 6px' }} />
                <button onClick={() => { if (confirm('删除此笔记？')) deleteNote(contextMenu.id); setContextMenu(null) }} style={{ ...ctxItemStyle, color: 'var(--danger)' }}>删除</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const ctxItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '7px 10px', border: 'none', background: 'transparent',
  color: 'var(--text)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 6,
}
