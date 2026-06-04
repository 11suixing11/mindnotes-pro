import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import CanvasPreview from './CanvasPreview'
import { useConfirm } from './ConfirmModal'
import type { CanvasDoc, CanvasFolder } from '../store/types'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

const sidebarBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 48, borderRadius: '0 10px 10px 0',
  border: '1px solid var(--border)', borderLeft: 'none',
  background: 'var(--card)', backdropFilter: 'var(--glass)', WebkitBackdropFilter: 'var(--glass)',
  color: 'var(--text-3)', cursor: 'pointer', fontSize: 14,
  boxShadow: 'var(--shadow-sm)',
}

export default function Sidebar() {
  const isMobile = useIsMobile()
  const docs = useAppStore((s) => s.docs)
  const folders = useAppStore((s) => s.folders)
  const currentDocId = useAppStore((s) => s.currentDocId)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const [liveElements, setLiveElements] = useState(() => useAppStore.getState().elements)
  useEffect(() => {
    if (!sidebarOpen) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsub = useAppStore.subscribe((state) => {
      clearTimeout(timer)
      timer = setTimeout(() => setLiveElements(state.elements), 300)
    })
    return () => { clearTimeout(timer); unsub() }
  }, [sidebarOpen])
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const createDoc = useAppStore((s) => s.createDoc)
  const openDoc = useAppStore((s) => s.openDoc)
  const renameDoc = useAppStore((s) => s.renameDoc)
  const deleteDoc = useAppStore((s) => s.deleteDoc)
  const duplicateDoc = useAppStore((s) => s.duplicateDoc)
  const createFolder = useAppStore((s) => s.createFolder)
  const renameFolder = useAppStore((s) => s.renameFolder)
  const deleteFolder = useAppStore((s) => s.deleteFolder)
  const toggleFolder = useAppStore((s) => s.toggleFolder)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [ctx, setCtx] = useState<{ x: number; y: number; type: 'doc' | 'folder'; id: string } | null>(null)
  const confirm = useConfirm()

  const openDocAndClose = useCallback((id: string) => {
    openDoc(id)
    if (isMobile) setSidebarOpen(false)
  }, [openDoc, isMobile, setSidebarOpen])

  if (!sidebarOpen) {
    return (
      <button onClick={() => setSidebarOpen(true)} style={{ position: 'fixed', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 25, ...sidebarBtnStyle }}>☰</button>
    )
  }

  const rootFolders = folders.filter((f) => f.parentId === null).sort((a, b) => a.order - b.order)
  const folderDocs = (folderId: string | null) => docs.filter((d) => d.folderId === folderId).sort((a, b) => b.updatedAt - a.updatedAt)
  const orphanDocs = docs.filter((d) => !d.folderId).sort((a, b) => b.updatedAt - a.updatedAt)

  const fmtTime = (ts: number) => {
    const d = new Date(ts); const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const handleRename = (id: string, type: 'doc' | 'folder') => {
    if (renameVal.trim()) { type === 'doc' ? renameDoc(id, renameVal.trim()) : renameFolder(id, renameVal.trim()) }
    setRenamingId(null)
  }

  const handleContext = (e: React.MouseEvent, type: 'doc' | 'folder', id: string) => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, type, id }) }

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressPosRef = useRef<{ x: number; y: number } | null>(null)
  const handleLongPressStart = (e: React.TouchEvent, type: 'doc' | 'folder', id: string) => {
    const touch = e.touches[0]
    longPressPosRef.current = { x: touch.clientX, y: touch.clientY }
    longPressRef.current = setTimeout(() => {
      setCtx({ x: touch.clientX, y: touch.clientY, type, id })
    }, 500)
  }
  const handleLongPressMove = (e: React.TouchEvent) => {
    if (!longPressRef.current || !longPressPosRef.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - longPressPosRef.current.x)
    const dy = Math.abs(touch.clientY - longPressPosRef.current.y)
    if (dx > 10 || dy > 10) { clearTimeout(longPressRef.current); longPressRef.current = null }
  }
  const handleLongPressEnd = () => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null }; longPressPosRef.current = null }

  const renderDoc = (doc: CanvasDoc) => {
    const isActive = doc.id === currentDocId
    const previewElements = isActive ? liveElements : doc.elements
    return (
      <div key={doc.id} onClick={() => openDocAndClose(doc.id)} onContextMenu={(e) => handleContext(e, 'doc', doc.id)}
        onTouchStart={(e) => handleLongPressStart(e, 'doc', doc.id)} onTouchEnd={handleLongPressEnd} onTouchMove={handleLongPressMove}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', paddingLeft: 28,
          cursor: 'pointer', borderRadius: 10, margin: '1px 4px',
          background: isActive ? 'var(--primary-bg)' : 'transparent',
          transition: 'all 0.18s ease',
          borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--primary-bg)' }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = '' }}>
        <CanvasPreview elements={previewElements} width={40} height={28} bgColor={isActive ? 'var(--primary-bg)' : 'var(--canvas)'} />
        {renamingId === doc.id ? (
          <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onBlur={() => handleRename(doc.id, 'doc')} onKeyDown={(e) => { if (e.key === 'Enter') handleRename(doc.id, 'doc'); if (e.key === 'Escape') setRenamingId(null) }} onClick={(e) => e.stopPropagation()} style={{ flex: 1, border: '1px solid var(--primary)', borderRadius: 6, padding: '2px 6px', fontSize: 12, background: 'var(--card)', color: 'var(--text)', outline: 'none' }} />
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--primary)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>{fmtTime(doc.updatedAt)}</div>
          </div>
        )}
      </div>
    )
  }

  const renderFolder = (folder: CanvasFolder, depth: number = 0) => {
    const children = folders.filter((f) => f.parentId === folder.id).sort((a, b) => a.order - b.order)
    const docsInFolder = folderDocs(folder.id)
    return (
      <div key={folder.id}>
        <div onClick={() => toggleFolder(folder.id)} onContextMenu={(e) => handleContext(e, 'folder', folder.id)}
          onTouchStart={(e) => handleLongPressStart(e, 'folder', folder.id)} onTouchEnd={handleLongPressEnd} onTouchMove={handleLongPressMove}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
            paddingLeft: 8 + depth * 14, cursor: 'pointer', borderRadius: 8,
            margin: '1px 4px', transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-bg)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
          <span style={{ fontSize: 9, color: 'var(--text-4)', width: 12, textAlign: 'center', transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)', transform: folder.expanded ? 'rotate(90deg)' : '' }}>▶</span>
          {renamingId === folder.id ? (
            <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onBlur={() => handleRename(folder.id, 'folder')} onKeyDown={(e) => { if (e.key === 'Enter') handleRename(folder.id, 'folder'); if (e.key === 'Escape') setRenamingId(null) }} onClick={(e) => e.stopPropagation()} style={{ flex: 1, border: '1px solid var(--primary)', borderRadius: 5, padding: '1px 4px', fontSize: 12, background: 'var(--card)', color: 'var(--text)', outline: 'none' }} />
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-4)', minWidth: 16, textAlign: 'center' }}>{docsInFolder.length}</span>
        </div>
        {folder.expanded && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {children.map((c) => renderFolder(c, depth + 1))}
            {docsInFolder.map((d) => renderDoc(d))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <div style={{
        width: isMobile ? 260 : 240, height: '100%', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--card-solid)', flexShrink: 0,
        zIndex: isMobile ? 30 : 20,
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? 0 : undefined,
        top: isMobile ? 0 : undefined,
        bottom: isMobile ? 0 : undefined,
        boxShadow: isMobile ? '4px 0 24px rgba(0,0,0,0.15)' : undefined,
        animation: isMobile ? 'slideRight 0.25s cubic-bezier(0.16,1,0.3,1)' : undefined,
      }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'linear-gradient(135deg, #B8A0D0, #D49898, #90B4D0, #90B888)',
                backgroundSize: '300% 300%',
                animation: 'gradientFlow 10s ease infinite',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 800,
                boxShadow: '0 3px 12px rgba(184,160,208,0.35)',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}>M</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>MindNotes</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 16, padding: '0 4px', transition: 'color 0.15s' }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => createDoc()} style={{
              flex: 1, padding: '6px 0', borderRadius: 8, border: 'none',
              background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.18s ease',
              boxShadow: '0 2px 8px var(--glow)',
            }}>+ 新画布</button>
            <button onClick={() => createFolder('新文件夹')} style={{
              flex: 1, padding: '6px 0', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-2)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.18s ease',
            }}>+ 文件夹</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
          {rootFolders.map((f) => renderFolder(f))}
          {orphanDocs.map((d) => renderDoc(d))}
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-4)', textAlign: 'center' }}>{docs.length} 画布</div>
      </div>

      {ctx && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setCtx(null)} />
          <div className="panel" style={{ position: 'fixed', left: ctx.x, top: ctx.y, minWidth: 130, padding: 4, zIndex: 101, animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
            {ctx.type === 'folder' ? (
              <>
                <button onClick={() => { createDoc('未命名画布', ctx.id); setCtx(null) }} style={ctxStyle}>新建画布</button>
                <button onClick={() => { const f = folders.find((x) => x.id === ctx.id); if (f) { setRenamingId(f.id); setRenameVal(f.name) }; setCtx(null) }} style={ctxStyle}>重命名</button>
                <div style={{ height: 1, background: 'var(--border)', margin: '3px 6px' }} />
                <button onClick={async () => { if (await confirm('删除文件夹？')) deleteFolder(ctx.id); setCtx(null) }} style={{ ...ctxStyle, color: 'var(--danger)' }}>删除</button>
              </>
            ) : (
              <>
                <button onClick={() => { duplicateDoc(ctx.id); setCtx(null) }} style={ctxStyle}>复制</button>
                <button onClick={() => { const d = docs.find((x) => x.id === ctx.id); if (d) { setRenamingId(d.id); setRenameVal(d.title) }; setCtx(null) }} style={ctxStyle}>重命名</button>
                <div style={{ height: 1, background: 'var(--border)', margin: '3px 6px' }} />
                <button onClick={async () => { if (await confirm('删除此画布？')) deleteDoc(ctx.id); setCtx(null) }} style={{ ...ctxStyle, color: 'var(--danger)' }}>删除</button>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

const ctxStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '7px 10px', border: 'none',
  background: 'transparent', color: 'var(--text)', fontSize: 12,
  cursor: 'pointer', textAlign: 'left', borderRadius: 8, transition: 'background 0.12s',
}
