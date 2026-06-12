import type { ToolType } from '../../store/types'
import { icons } from './icons'
import Tooltip from './Tooltip'

const TOOLS: {
  id: ToolType
  icon: React.ReactNode
  tip: string
  key: string
  ariaLabel: string
}[] = [
  { id: 'select', icon: icons.select, tip: '选择', key: '0', ariaLabel: '选择工具 (0)' },
  { id: 'pen', icon: icons.pen, tip: '画笔', key: '1', ariaLabel: '画笔工具 (1)' },
  { id: 'eraser', icon: icons.eraser, tip: '橡皮', key: '2', ariaLabel: '橡皮擦 (2)' },
  { id: 'pan', icon: icons.pan, tip: '平移', key: '3', ariaLabel: '平移 (3)' },
  { id: 'text', icon: icons.text, tip: '文字', key: '6', ariaLabel: '文字 (6)' },
]

const SHAPES: {
  id: ToolType
  icon: React.ReactNode
  tip: string
  key: string
  ariaLabel: string
}[] = [
  { id: 'rectangle', icon: icons.rect, tip: '矩形', key: '4', ariaLabel: '矩形 (4)' },
  { id: 'circle', icon: icons.circle, tip: '圆形', key: '5', ariaLabel: '圆形 (5)' },
  { id: 'line', icon: icons.line, tip: '直线', key: '7', ariaLabel: '直线 (7)' },
  { id: 'arrow', icon: icons.arrow, tip: '箭头', key: '8', ariaLabel: '箭头 (8)' },
]

interface ToolButtonsProps {
  tool: ToolType
  setTool: (t: ToolType) => void
}

export default function ToolButtons({ tool, setTool }: ToolButtonsProps) {
  return (
    <>
      <div className="sb-group">
        {TOOLS.map((t) => (
          <Tooltip key={t.id} content={t.tip} shortcut={t.key}>
            <button
              onClick={() => setTool(t.id)}
              className={`tbtn ${tool === t.id ? 'on' : ''}`}
              aria-label={t.ariaLabel}
            >
              {t.icon}
              <span className="k">{t.key}</span>
            </button>
          </Tooltip>
        ))}
      </div>
      <div className="sb-sep" />
      <div className="sb-group">
        {SHAPES.map((t) => (
          <Tooltip key={t.id} content={t.tip} shortcut={t.key}>
            <button
              onClick={() => setTool(t.id)}
              className={`tbtn ${tool === t.id ? 'on' : ''}`}
              aria-label={t.ariaLabel}
            >
              {t.icon}
              <span className="k">{t.key}</span>
            </button>
          </Tooltip>
        ))}
      </div>
    </>
  )
}
