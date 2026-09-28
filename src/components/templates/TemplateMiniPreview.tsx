import { memo } from 'react'
import type { CanvasElement } from '../../core/model'
import { getTemplateBounds } from '../../templates/canvasTemplates'

interface TemplateMiniPreviewProps {
  elements: CanvasElement[]
  width?: number
  height?: number
}

const PADDING = 6

/**
 * Tiny faithful-to-structure preview of a template: shapes render as
 * outlines, strokes as polylines, text as soft node chips. Lets the
 * quick-start cards show what each template looks like instead of
 * describing it in words.
 */
export const TemplateMiniPreview = memo(function TemplateMiniPreview({
  elements,
  width = 120,
  height = 60,
}: TemplateMiniPreviewProps) {
  const bounds = getTemplateBounds(elements)
  if (!bounds || bounds.w === 0 || bounds.h === 0) return null

  const scale = Math.min(
    (width - PADDING * 2) / bounds.w,
    (height - PADDING * 2) / bounds.h
  )
  const offsetX = PADDING + (width - PADDING * 2 - bounds.w * scale) / 2 - bounds.x * scale
  const offsetY = PADDING + (height - PADDING * 2 - bounds.h * scale) / 2 - bounds.y * scale
  const tx = (x: number) => +(x * scale + offsetX).toFixed(2)
  const ty = (y: number) => +(y * scale + offsetY).toFixed(2)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      {elements.map((el) => {
        if (el.type === 'stroke') {
          const points = el.points
            .map((p: number[]) => `${tx(p[0])},${ty(p[1])}`)
            .join(' ')
          return (
            <polyline
              key={el.id}
              points={points}
              stroke={el.color}
              strokeWidth={Math.max(1, el.size * scale)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }

        if (el.type === 'shape') {
          if (el.kind === 'rectangle') {
            return (
              <rect
                key={el.id}
                x={tx(el.x)}
                y={ty(el.y)}
                width={Math.max(2, el.w * scale)}
                height={Math.max(2, el.h * scale)}
                stroke={el.color}
                fill={el.fillColor ?? 'none'}
                strokeWidth={Math.max(1, el.size * scale)}
                rx={2}
              />
            )
          }
          if (el.kind === 'circle') {
            return (
              <ellipse
                key={el.id}
                cx={tx(el.x + el.w / 2)}
                cy={ty(el.y + el.h / 2)}
                rx={Math.max(1.5, (el.w / 2) * scale)}
                ry={Math.max(1.5, (el.h / 2) * scale)}
                stroke={el.color}
                fill={el.fillColor ?? 'none'}
                strokeWidth={Math.max(1, el.size * scale)}
              />
            )
          }
          // line / arrow
          const x1 = tx(el.x)
          const y1 = ty(el.y)
          const x2 = tx(el.x + el.w)
          const y2 = ty(el.y + el.h)
          return (
            <g key={el.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={el.color}
                strokeWidth={Math.max(1, el.size * scale)}
                strokeLinecap="round"
              />
              {el.kind === 'arrow' && (
                <polyline
                  points={`${x2 - 4},${y2 - 2} ${x2},${y2} ${x2 - 5},${y2 + 3}`}
                  stroke={el.color}
                  strokeWidth={Math.max(1, el.size * scale)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </g>
          )
        }

        if (el.type === 'text') {
          // Text reads as node chips at thumbnail scale: a soft rounded
          // block tinted with the element's own color.
          const w = Math.max(8, el.width * scale)
          const h = Math.max(5, el.height * scale)
          return (
            <rect
              key={el.id}
              x={tx(el.x)}
              y={ty(el.y)}
              width={w}
              height={h}
              rx={Math.min(4, h / 2)}
              fill={el.color}
              opacity={0.14}
            />
          )
        }

        // images: light placeholder tile
        return (
          <rect
            key={el.id}
            x={tx(el.x)}
            y={ty(el.y)}
            width={Math.max(2, el.width * scale)}
            height={Math.max(2, el.height * scale)}
            rx={2}
            fill="var(--border)"
          />
        )
      })}
    </svg>
  )
})

export default TemplateMiniPreview
