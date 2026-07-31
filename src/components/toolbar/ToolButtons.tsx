import { memo, type ReactNode } from 'react'
import {
  TOOL_SHORTCUT_ACTIONS,
  formatShortcutBadge,
  formatShortcutBinding,
} from '../../keyboard/shortcuts'
import { useShortcutStore } from '../../store/useShortcutStore'
import type { ToolType } from '../../store/types'
import { icons } from './icons'
import Tooltip from './Tooltip'

interface ToolButtonDefinition {
  id: ToolType
  icon: ReactNode
  tip: string
}

const TOOLS: ToolButtonDefinition[] = [
  { id: 'select', icon: icons.select, tip: '选择' },
  { id: 'pen', icon: icons.pen, tip: '画笔' },
  { id: 'eraser', icon: icons.eraser, tip: '橡皮擦' },
  { id: 'pan', icon: icons.pan, tip: '平移' },
  { id: 'text', icon: icons.text, tip: '文字' },
]

const SHAPES: ToolButtonDefinition[] = [
  {
    id: 'rectangle',
    icon: icons.rect,
    tip: '矩形',
  },
  { id: 'circle', icon: icons.circle, tip: '圆形' },
  { id: 'line', icon: icons.line, tip: '直线' },
  { id: 'arrow', icon: icons.arrow, tip: '箭头' },
]

interface ToolButtonsProps {
  tool: ToolType
  setTool: (t: ToolType) => void
}

const ToolButtons = memo(function ToolButtons({ tool, setTool }: ToolButtonsProps) {
  const bindings = useShortcutStore((s) => s.bindings)

  const renderToolButton = (t: ToolButtonDefinition) => {
    const binding = bindings[TOOL_SHORTCUT_ACTIONS[t.id]]
    const shortcut = formatShortcutBinding(binding)
    const badge = formatShortcutBadge(binding)

    return (
      <Tooltip key={t.id} content={t.tip} shortcut={shortcut}>
        <button
          onClick={() => setTool(t.id)}
          className={`tbtn ${tool === t.id ? 'on' : ''}`}
          aria-label={`${t.tip}工具（${shortcut}）`}
          aria-pressed={tool === t.id}
        >
          {t.icon}
          {badge && (
            <span className="k" aria-hidden="true">
              {badge}
            </span>
          )}
        </button>
      </Tooltip>
    )
  }

  return (
    <>
      <div className="sb-group" role="group" aria-label="基础工具">
        {TOOLS.map(renderToolButton)}
      </div>
      <div className="sb-sep" role="separator" />
      <div className="sb-group" role="group" aria-label="形状工具">
        {SHAPES.map(renderToolButton)}
      </div>
    </>
  )
})

export default ToolButtons
