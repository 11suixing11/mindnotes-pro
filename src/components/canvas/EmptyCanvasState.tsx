import { FileUp, PenLine, Shapes } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { createOpenFileEvent, OPEN_TEMPLATES_EVENT } from '../../appEvents'

export function EmptyCanvasState() {
  const hasElements = useAppStore((state) => state.elements.length > 0)
  const setTool = useAppStore((state) => state.setTool)

  if (hasElements) return null

  return (
    <section className="empty-canvas-state" aria-labelledby="empty-canvas-title">
      <h2 id="empty-canvas-title">开始记录</h2>
      <p>在画布上绘制、插入模板，或恢复已有备份。</p>
      <div className="empty-canvas-actions">
        <button
          type="button"
          className="empty-canvas-action empty-canvas-action-primary"
          onClick={() => setTool('pen')}
        >
          <PenLine size={18} aria-hidden="true" />
          <span>开始绘制</span>
        </button>
        <button
          type="button"
          className="empty-canvas-action"
          onClick={() => window.dispatchEvent(new Event(OPEN_TEMPLATES_EVENT))}
        >
          <Shapes size={18} aria-hidden="true" />
          <span>插入模板</span>
        </button>
        <button
          type="button"
          className="empty-canvas-action"
          onClick={() => window.dispatchEvent(createOpenFileEvent('import'))}
        >
          <FileUp size={18} aria-hidden="true" />
          <span>导入备份</span>
        </button>
      </div>
    </section>
  )
}

export default EmptyCanvasState
