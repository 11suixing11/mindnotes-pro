import { memo } from 'react'
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
  { id: 'select', icon: icons.select, tip: 'Select', key: '0', ariaLabel: 'Select tool (0)' },
  { id: 'pen', icon: icons.pen, tip: 'Pen', key: '1', ariaLabel: 'Pen tool (1)' },
  { id: 'eraser', icon: icons.eraser, tip: 'Eraser', key: '2', ariaLabel: 'Eraser tool (2)' },
  { id: 'pan', icon: icons.pan, tip: 'Pan', key: '3', ariaLabel: 'Pan tool (3)' },
  { id: 'text', icon: icons.text, tip: 'Text', key: '6', ariaLabel: 'Text tool (6)' },
]

const SHAPES: {
  id: ToolType
  icon: React.ReactNode
  tip: string
  key: string
  ariaLabel: string
}[] = [
  {
    id: 'rectangle',
    icon: icons.rect,
    tip: 'Rectangle',
    key: '4',
    ariaLabel: 'Rectangle tool (4)',
  },
  { id: 'circle', icon: icons.circle, tip: 'Circle', key: '5', ariaLabel: 'Circle tool (5)' },
  { id: 'line', icon: icons.line, tip: 'Line', key: '7', ariaLabel: 'Line tool (7)' },
  { id: 'arrow', icon: icons.arrow, tip: 'Arrow', key: '8', ariaLabel: 'Arrow tool (8)' },
]

interface ToolButtonsProps {
  tool: ToolType
  setTool: (t: ToolType) => void
}

const ToolButtons = memo(function ToolButtons({ tool, setTool }: ToolButtonsProps) {
  return (
    <>
      <div className="sb-group" role="group" aria-label="Basic tools">
        {TOOLS.map((t) => (
          <Tooltip key={t.id} content={t.tip} shortcut={t.key}>
            <button
              onClick={() => setTool(t.id)}
              className={`tbtn ${tool === t.id ? 'on' : ''}`}
              aria-label={t.ariaLabel}
              aria-pressed={tool === t.id}
            >
              {t.icon}
              <span className="k" aria-hidden="true">
                {t.key}
              </span>
            </button>
          </Tooltip>
        ))}
      </div>
      <div className="sb-sep" role="separator" />
      <div className="sb-group" role="group" aria-label="Shape tools">
        {SHAPES.map((t) => (
          <Tooltip key={t.id} content={t.tip} shortcut={t.key}>
            <button
              onClick={() => setTool(t.id)}
              className={`tbtn ${tool === t.id ? 'on' : ''}`}
              aria-label={t.ariaLabel}
              aria-pressed={tool === t.id}
            >
              {t.icon}
              <span className="k" aria-hidden="true">
                {t.key}
              </span>
            </button>
          </Tooltip>
        ))}
      </div>
    </>
  )
})

export default ToolButtons
