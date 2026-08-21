import type { KeyboardEvent } from 'react'
import { getContentBounds } from '../../canvas/canvasUtils'
import { FEEDBACK_DISCUSSION_URL } from '../../productLinks'
import { useAppStore } from '../../store/appStore'
import type { ToolType } from '../../store/types'
import { useViewStore } from '../../store/useViewStore'

const TOOL_LABELS: Record<ToolType, string> = {
  select: '选择',
  pen: '画笔',
  eraser: '橡皮擦',
  pan: '平移',
  text: '文字',
  rectangle: '矩形',
  circle: '圆形',
  line: '直线',
  arrow: '箭头',
}

interface AppStatusBarProps {
  onOpenShortcuts: () => void
}

export function AppStatusBar({ onOpenShortcuts }: AppStatusBarProps) {
  const tool = useAppStore((state) => state.tool)
  const elementCount = useAppStore((state) => state.elements.length)
  const docCount = useAppStore((state) => state.docs.length)
  const saveStatus = useAppStore((state) => state.saveStatus)
  const zoom = useViewStore((state) => state.viewBox.zoom)
  const zoomToFit = useViewStore((state) => state.zoomToFit)

  const fitContent = () => {
    const bounds = getContentBounds(useAppStore.getState().elements)
    if (bounds) zoomToFit(bounds)
  }

  const handleZoomKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    fitContent()
  }

  return (
    <div className="status panel" role="status" aria-label="应用状态">
      <span className="dot" aria-hidden="true" />
      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{TOOL_LABELS[tool]}</span>
      <span className="vl" aria-hidden="true" />
      <span>{elementCount} 个元素</span>
      <span className="vl" aria-hidden="true" />
      <span>{docCount} 个文档</span>
      <span className="vl" aria-hidden="true" />
      <span
        style={{ cursor: 'pointer' }}
        onClick={fitContent}
        onKeyDown={handleZoomKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`缩放 ${Math.round(zoom * 100)}%，点击适应内容`}
      >
        {Math.round(zoom * 100)}%
      </span>
      <span className="vl" aria-hidden="true" />
      <span
        style={{
          fontSize: '10px',
          color:
            saveStatus === 'error'
              ? 'var(--danger)'
              : saveStatus === 'saving'
                ? 'var(--text-4)'
                : 'var(--success)',
          transition: 'color 0.3s',
        }}
        aria-live="polite"
        aria-label={
          saveStatus === 'saving'
            ? '正在保存'
            : saveStatus === 'saved'
              ? '已保存'
              : saveStatus === 'error'
                ? '保存失败'
                : ''
        }
      >
        {saveStatus === 'saving'
          ? '\u00b7\u00b7\u00b7'
          : saveStatus === 'saved'
            ? '\u2713'
            : saveStatus === 'error'
              ? '保存失败'
              : ''}
      </span>
      <span className="vl" aria-hidden="true" />
      <a
        href={FEEDBACK_DISCUSSION_URL}
        target="_blank"
        rel="noreferrer"
        className="status-feedback"
        title="提交反馈"
        aria-label="提交反馈"
      >
        反馈
      </a>
      <span className="vl" aria-hidden="true" />
      <button
        onClick={onOpenShortcuts}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-4)',
          cursor: 'pointer',
          fontSize: '12px',
          padding: '0 2px',
          lineHeight: 1,
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(event) => (event.currentTarget.style.color = 'var(--primary)')}
        onMouseLeave={(event) => (event.currentTarget.style.color = 'var(--text-4)')}
        title="键盘快捷键（?）"
        aria-label="键盘快捷键"
      >
        ?
      </button>
    </div>
  )
}
