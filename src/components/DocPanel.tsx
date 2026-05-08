import { useState } from 'react'
import { useDocStore } from '../store/useDocStore'
import { useDrawingStore } from '../store/useDrawingStore'
import type { DocMeta } from '../store/db'

export default function DocPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const docs = useDocStore((s) => s.docs)
  const currentId = useDocStore((s) => s.currentId)
  const createDoc = useDocStore((s) => s.createDoc)
  const openDoc = useDocStore((s) => s.openDoc)
  const renameDoc = useDocStore((s) => s.renameDoc)
  const deleteDoc = useDocStore((s) => s.deleteDoc)
  const saveCurrent = useDocStore((s) => s.saveCurrent)
  const loadFromDoc = useDrawingStore((s) => s.loadFromDoc)
  const strokes = useDrawingStore((s) => s.strokes)
  const shapes = useDrawingStore((s) => s.shapes)
  const canvasBg = useDrawingStore((s) => s.canvasBg)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  if (!open) return null

  const handleOpen = async (id: string) => {
    await saveCurrent(strokes, shapes, canvasBg)
    const doc = await openDoc(id)
    if (doc) loadFromDoc(doc.strokes, doc.shapes, doc.canvasBg)
    onClose()
  }

  const handleNew = async () => {
    await saveCurrent(strokes, shapes, canvasBg)
    const id = await createDoc('未命名画布')
    const doc = await openDoc(id)
    if (doc) loadFromDoc([], [], '#ffffff')
    onClose()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (docs.length <= 1) return alert('至少保留一个画布')
    if (!confirm('删除此画布？')) return
    await deleteDoc(id)
    const remaining = useDocStore.getState().docs
    const curId = useDocStore.getState().currentId
    if (curId) {
      const doc = await openDoc(curId)
      if (doc) loadFromDoc(doc.strokes, doc.shapes, doc.canvasBg)
    }
  }

  const handleRename = async (id: string) => {
    if (renameValue.trim()) await renameDoc(id, renameValue.trim())
    setRenamingId(null)
  }

  const startRename = (e: React.MouseEvent, doc: DocMeta) => {
    e.stopPropagation()
    setRenamingId(doc.id)
    setRenameValue(doc.title)
  }

  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={onClose} />
      <div className="panel" style={{
        position: 'fixed', left: 64, top: '50%', transform: 'translateY(-50%)',
        width: 280, maxHeight: '70vh', overflow: 'auto', zIndex: 100,
        animation: 'popIn 0.2s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>我的画布</span>
          <button onClick={handleNew} style={{
            background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8,
            padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>+ 新建</button>
        </div>
        <div style={{ padding: '0 8px 8px' }}>
          {docs.map((doc) => (
            <div key={doc.id} onClick={() => handleOpen(doc.id)} style={{
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
              background: doc.id === currentId ? 'var(--primary-bg)' : 'transparent',
              marginBottom: 2, transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: doc.id === currentId ? 'var(--primary)' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: doc.id === currentId ? '#fff' : 'var(--text-3)',
                fontSize: 14, fontWeight: 700,
              }}>
                {(doc.strokeCount + doc.shapeCount) || '—'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {renamingId === doc.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(doc.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(doc.id); if (e.key === 'Escape') setRenamingId(null) }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%', border: '1px solid var(--primary)', borderRadius: 6,
                      padding: '2px 6px', fontSize: 13, fontWeight: 600, background: 'var(--card)',
                      color: 'var(--text)', outline: 'none',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {doc.strokeCount + doc.shapeCount} 个对象 · {fmtTime(doc.updatedAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={(e) => startRename(e, doc)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)',
                  fontSize: 12, padding: '2px 4px', borderRadius: 4,
                }}>重命名</button>
                {docs.length > 1 && (
                  <button onClick={(e) => handleDelete(e, doc.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)',
                    fontSize: 12, padding: '2px 4px', borderRadius: 4,
                  }}>删除</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
