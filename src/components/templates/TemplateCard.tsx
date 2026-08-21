import { useMemo } from 'react'
import { X } from 'lucide-react'
import { getTemplateBounds, type CanvasTemplate } from '../../templates/canvasTemplates'

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const bounds = useMemo(() => getTemplateBounds(template.elements), [template])
  const markerId = `${template.id}-arrow-preview`

  if (!bounds) return <div className="template-preview" aria-hidden="true" />

  const previewWidth = 180
  const previewHeight = 96
  const padding = 12
  const scale = Math.min(
    (previewWidth - padding * 2) / Math.max(bounds.w, 1),
    (previewHeight - padding * 2) / Math.max(bounds.h, 1)
  )
  const offsetX = (previewWidth - bounds.w * scale) / 2
  const offsetY = (previewHeight - bounds.h * scale) / 2
  const sx = (x: number) => offsetX + (x - bounds.x) * scale
  const sy = (y: number) => offsetY + (y - bounds.y) * scale

  return (
    <svg
      className="template-preview"
      viewBox={`0 0 ${previewWidth} ${previewHeight}`}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#64748B" />
        </marker>
      </defs>
      {template.elements.map((element) => {
        if (element.type === 'shape') {
          const x = sx(Math.min(element.x, element.x + element.w))
          const y = sy(Math.min(element.y, element.y + element.h))
          const width = Math.abs(element.w) * scale
          const height = Math.abs(element.h) * scale
          const fill =
            element.fillColor && element.fillColor !== 'transparent'
              ? element.fillColor
              : 'transparent'
          const strokeWidth = Math.max(1, Math.min(2.4, element.size * scale))

          if (element.kind === 'line' || element.kind === 'arrow') {
            return (
              <line
                key={element.id}
                x1={sx(element.x)}
                y1={sy(element.y)}
                x2={sx(element.x + element.w)}
                y2={sy(element.y + element.h)}
                stroke={element.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                markerEnd={element.kind === 'arrow' ? `url(#${markerId})` : undefined}
              />
            )
          }

          const transform = element.rotation
            ? `rotate(${(element.rotation * 180) / Math.PI} ${x + width / 2} ${y + height / 2})`
            : undefined

          if (element.kind === 'circle') {
            return (
              <ellipse
                key={element.id}
                cx={x + width / 2}
                cy={y + height / 2}
                rx={width / 2}
                ry={height / 2}
                fill={fill}
                stroke={element.color}
                strokeWidth={strokeWidth}
                transform={transform}
              />
            )
          }

          return (
            <rect
              key={element.id}
              x={x}
              y={y}
              width={width}
              height={height}
              rx="3"
              fill={fill}
              stroke={element.color}
              strokeWidth={strokeWidth}
              transform={transform}
            />
          )
        }

        if (element.type === 'text') {
          return (
            <rect
              key={element.id}
              x={sx(element.x)}
              y={sy(element.y + element.height / 2)}
              width={Math.max(8, element.width * scale * 0.65)}
              height={Math.max(2, element.height * scale * 0.18)}
              rx="1"
              fill={element.color}
              opacity="0.55"
            />
          )
        }

        if (element.type === 'stroke') {
          const points = element.points.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')
          return (
            <polyline
              key={element.id}
              points={points}
              fill="none"
              stroke={element.color}
              strokeWidth={Math.max(1, element.size * scale)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <rect
            key={element.id}
            x={sx(element.x)}
            y={sy(element.y)}
            width={element.width * scale}
            height={element.height * scale}
            rx="3"
            fill="#CBD5E1"
            stroke="#64748B"
          />
        )
      })}
    </svg>
  )
}

interface TemplateCardProps {
  template: CanvasTemplate
  isCustom: boolean
  onInsert: (template: CanvasTemplate) => void
  onDelete: (templateId: string) => void
}

export default function TemplateCard({
  template,
  isCustom,
  onInsert,
  onDelete,
}: TemplateCardProps) {
  return (
    <div className="template-card">
      <button
        type="button"
        className="template-card-main"
        onClick={() => onInsert(template)}
        aria-label={`插入 ${template.name} 模板`}
      >
        <TemplatePreview template={template} />
        <span className="template-card-meta">
          <span className="template-card-title">{template.name}</span>
          <span className="template-card-desc">{template.description}</span>
        </span>
      </button>
      {isCustom && (
        <button
          type="button"
          className="template-delete"
          onClick={() => onDelete(template.id)}
          aria-label={`删除 ${template.name} 模板`}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
