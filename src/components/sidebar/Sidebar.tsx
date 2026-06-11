import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../../store/appStore'
import CanvasPreview from './CanvasPreview'
import SidebarContextMenu from './SidebarContextMenu'
import type { CanvasDoc, CanvasFolder } from '../../store/types'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
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
    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [sidebarOpen])
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const createDoc = useAppStore((s) => s.createDoc)
  const openDoc = useAppStore((s) => s.openDoc)
  const renameDoc = useAppStore((s) => s.renameDoc)
  const renameFolder = useAppStore((s) => s.renameFolder)
  const createFolder = useAppStore((s) => s.createFolder)
  const toggleFolder = useAppStore((s) => s.toggleFolder)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [ctx, setCtx] = useState<{
    x: number
    y: number
    type: 'doc' | 'folder'
    id: string
  } | null>(null)

  const openDocAndClose = useCallback(
    (id: string) => {
      openDoc(id)
      if (isMobile) setSidebarOpen(false)
    },
    [openDoc, isMobile, setSidebarOpen]
  )

  if (!sidebarOpen) {
    return (
      <button
        aria-label="打开侧边栏"
        aria-expanded="false"
        onClick={() => setSidebarOpen(true)}
        className="sb-toggle-btn fixed left-[8px] top-1/2 -translate-y-1/2 z-25"
      >
        ☰
      </button>
    )
  }

  const rootFolders = folders.filter((f) => f.parentId === null).sort((a, b) => a.order - b.order)
  const folderDocs = (folderId: string | null) =>
    docs.filter((d) => d.folderId === folderId).sort((a, b) => b.updatedAt - a.updatedAt)
  const orphanDocs = docs.filter((d) => !d.folderId).sort((a, b) => b.updatedAt - a.updatedAt)

  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const handleRename = (id: string, type: 'doc' | 'folder') => {
    if (renameVal.trim()) {
      type === 'doc' ? renameDoc(id, renameVal.trim()) : renameFolder(id, renameVal.trim())
    }
    setRenamingId(null)
  }

  const handleContext = (e: React.MouseEvent, type: 'doc' | 'folder', id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setCtx({ x: e.clientX, y: e.clientY, type, id })
  }

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
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }
  const handleLongPressEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
    longPressPosRef.current = null
  }

  const renderDoc = (doc: CanvasDoc) => {
    const isActive = doc.id === currentDocId
    const previewElements = isActive ? liveElements : doc.elements
    return (
      <div
        key={doc.id}
        role="treeitem"
        aria-current={isActive ? 'true' : undefined}
        aria-label={`画布: ${doc.title}`}
        onClick={() => openDocAndClose(doc.id)}
        onContextMenu={(e) => handleContext(e, 'doc', doc.id)}
        onTouchStart={(e) => handleLongPressStart(e, 'doc', doc.id)}
        onTouchEnd={handleLongPressEnd}
        onTouchMove={handleLongPressMove}
        className={`sb-doc-item${isActive ? ' sb-doc-item-active' : ''}`}
      >
        <CanvasPreview
          elements={previewElements}
          width={40}
          height={28}
          bgColor={isActive ? 'var(--primary-bg)' : 'var(--canvas)'}
        />
        {renamingId === doc.id ? (
          <input
            autoFocus
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={() => handleRename(doc.id, 'doc')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename(doc.id, 'doc')
              if (e.key === 'Escape') setRenamingId(null)
            }}
            onClick={(e) => e.stopPropagation()}
            className="sb-rename-input rounded-[6px] py-[2px] px-[6px]"
          />
        ) : (
          <div className="sb-doc-content">
            <div className={`sb-doc-title${isActive ? ' sb-doc-title-active' : ''}`}>
              {doc.title}
            </div>
            <div className="sb-doc-meta">{fmtTime(doc.updatedAt)}</div>
          </div>
        )}
      </div>
    )
  }

  const renderFolder = (folder: CanvasFolder, depth: number = 0) => {
    const children = folders
      .filter((f) => f.parentId === folder.id)
      .sort((a, b) => a.order - b.order)
    const docsInFolder = folderDocs(folder.id)
    return (
      <div key={folder.id}>
        <div
          role="treeitem"
          aria-expanded={folder.expanded}
          aria-label={`文件夹: ${folder.name}`}
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(e) => handleContext(e, 'folder', folder.id)}
          onTouchStart={(e) => handleLongPressStart(e, 'folder', folder.id)}
          onTouchEnd={handleLongPressEnd}
          onTouchMove={handleLongPressMove}
          className="sb-folder-item"
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          <span className={`sb-folder-arrow ${folder.expanded ? 'rotate-90' : ''}`}>▶</span>
          {renamingId === folder.id ? (
            <input
              autoFocus
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onBlur={() => handleRename(folder.id, 'folder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(folder.id, 'folder')
                if (e.key === 'Escape') setRenamingId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="sb-rename-input"
            />
          ) : (
            <span className="sb-folder-name">{folder.name}</span>
          )}
          <span className="sb-folder-count">{docsInFolder.length}</span>
        </div>
        {folder.expanded && (
          <div className="sb-folder-children">
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
      <nav
        role="navigation"
        aria-label="画布管理"
        className={`sb-panel h-full shrink-0 ${isMobile ? 'fixed inset-y-0 left-0 w-[260px] z-30 shadow-[4px_0_24px_rgba(0,0,0,0.15)]' : 'relative w-[240px] z-20'}`}
        style={isMobile ? { animation: 'slideRight 0.25s cubic-bezier(0.16,1,0.3,1)' } : undefined}
      >
        <div className="sb-header">
          <div className="sb-header-row">
            <div className="sb-brand">
              <div className="sb-brand-logo">M</div>
              <span className="sb-brand-name">MindNotes</span>
            </div>
            <button
              aria-label="关闭侧边栏"
              onClick={() => setSidebarOpen(false)}
              className="sb-close-btn"
            >
              ×
            </button>
          </div>
          <div className="sb-actions">
            <button onClick={() => createDoc()} className="sb-btn-new" aria-label="新建画布">
              + 新画布
            </button>
            <button
              onClick={() => createFolder('新文件夹')}
              className="sb-btn-folder"
              aria-label="新建文件夹"
            >
              + 文件夹
            </button>
          </div>
        </div>
        <div role="tree" aria-label="画布和文件夹列表" className="sb-tree">
          {rootFolders.map((f) => renderFolder(f))}
          {orphanDocs.map((d) => renderDoc(d))}
        </div>
        <div className="sb-footer" aria-live="polite">
          {docs.length} 画布
        </div>
      </nav>

      <SidebarContextMenu
        ctx={ctx}
        setCtx={setCtx}
        setRenamingId={setRenamingId}
        setRenameVal={setRenameVal}
      />
    </>
  )
}
