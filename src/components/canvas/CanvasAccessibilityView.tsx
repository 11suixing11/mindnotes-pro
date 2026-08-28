import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import type { TextElement, ToolType } from '../../store/types'
import { formatCanvasAccessibilityItem, getCanvasAccessibilityItems } from './canvasAccessibility'

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

interface CanvasAccessibilityViewProps {
  onEditText?: (element: TextElement) => void
}

const NUDGE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

export function CanvasAccessibilityView({ onEditText }: CanvasAccessibilityViewProps) {
  const { elements, layers, selectedIds, tool, setSelectedIds, moveElementsById, removeElements } =
    useAppStore(
      useShallow((state) => ({
        elements: state.elements,
        layers: state.layers,
        selectedIds: state.selectedIds,
        tool: state.tool,
        setSelectedIds: state.setSelectedIds,
        moveElementsById: state.moveElementsById,
        removeElements: state.removeElements,
      }))
    )
  const [actionStatus, setActionStatus] = useState('')
  const [focusAfterDeleteIndex, setFocusAfterDeleteIndex] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const items = useMemo(
    () => getCanvasAccessibilityItems(elements, layers, selectedIds),
    [elements, layers, selectedIds]
  )

  useEffect(() => {
    if (focusAfterDeleteIndex === null) return
    const buttons = sectionRef.current?.querySelectorAll<HTMLButtonElement>('ol button') ?? []
    const target =
      buttons[Math.min(focusAfterDeleteIndex, buttons.length - 1)] ?? sectionRef.current
    target?.focus()
    setFocusAfterDeleteIndex(null)
  }, [focusAfterDeleteIndex, items])

  const getElement = (id: string) => elements.find((element) => element.id === id)

  const handleElementKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const item = items.find((candidate) => candidate.id === id)
    const element = getElement(id)
    if (!item || !element) return

    if (event.key === 'F2' && element.type === 'text') {
      event.preventDefault()
      if (item.hidden || item.locked) {
        setActionStatus(`${item.label}无法编辑：${item.hidden ? '图层已隐藏' : '元素已锁定'}`)
        return
      }
      setSelectedIds([id])
      onEditText?.(element)
      setActionStatus(`正在编辑文字：${item.label}`)
      return
    }

    if (NUDGE_KEYS.has(event.key)) {
      event.preventDefault()
      if (item.hidden || item.locked) {
        setActionStatus(`${item.label}无法移动：${item.hidden ? '图层已隐藏' : '元素已锁定'}`)
        return
      }
      const step = event.ctrlKey || event.metaKey ? 10 : event.shiftKey ? 50 : 1
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
      setSelectedIds([id])
      moveElementsById([id], dx, dy)
      setActionStatus(`${item.label}已移动`)
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      if (item.hidden || item.locked) {
        setActionStatus(`${item.label}无法删除：${item.hidden ? '图层已隐藏' : '元素已锁定'}`)
        return
      }
      setFocusAfterDeleteIndex(items.findIndex((candidate) => candidate.id === id))
      removeElements([id])
      setActionStatus(`已删除${item.label}`)
    }
  }

  const handleElementSelect = (id: string) => {
    setSelectedIds([id])
    const item = items.find((candidate) => candidate.id === id)
    if (item) setActionStatus(`已选择${item.label}`)
  }

  return (
    <section
      ref={sectionRef}
      className="canvas-accessibility sr-only"
      aria-labelledby="canvas-accessibility-title"
      tabIndex={-1}
    >
      <h2 id="canvas-accessibility-title">画布元素</h2>
      <p id="canvas-keyboard-instructions">
        聚焦画布后可使用快捷键切换工具、撤销或重做；在元素列表中按 Enter 选择、方向键移动、Delete
        删除， 文字元素按 F2 编辑。
      </p>
      <p id="canvas-accessibility-status" role="status" aria-live="polite" aria-atomic="true">
        当前工具：{TOOL_LABELS[tool]}；画布中有 {items.length} 个元素；已选择 {selectedIds.length}{' '}
        个元素。
      </p>
      <p id="canvas-accessibility-action-status" aria-live="polite" aria-atomic="true">
        {actionStatus}
      </p>
      {items.length === 0 ? (
        <p>画布为空。</p>
      ) : (
        <ol aria-label="画布元素列表">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-label={`${item.elementTypeLabel}：${formatCanvasAccessibilityItem(item)}`}
                aria-pressed={item.selected}
                onClick={() => handleElementSelect(item.id)}
                onKeyDown={(event) => handleElementKeyDown(event, item.id)}
              >
                {formatCanvasAccessibilityItem(item)}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
