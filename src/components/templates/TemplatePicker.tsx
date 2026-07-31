import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  getTemplateBounds,
  TEMPLATE_CATEGORY_LABELS,
  type CanvasTemplate,
} from '../../templates/canvasTemplates'

interface TemplatePickerProps {
  isOpen: boolean
  builtInTemplates: CanvasTemplate[]
  customTemplates: CanvasTemplate[]
  sourceElementCount: number
  onClose: () => void
  onInsert: (template: CanvasTemplate) => void
  onSaveCustom: (name: string) => void
  onDeleteCustom: (templateId: string) => void
}

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
      {template.elements.map((el) => {
        if (el.type === 'shape') {
          const x = sx(Math.min(el.x, el.x + el.w))
          const y = sy(Math.min(el.y, el.y + el.h))
          const w = Math.abs(el.w) * scale
          const h = Math.abs(el.h) * scale
          const stroke = el.color
          const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'transparent'
          const strokeWidth = Math.max(1, Math.min(2.4, el.size * scale))

          if (el.kind === 'line' || el.kind === 'arrow') {
            return (
              <line
                key={el.id}
                x1={sx(el.x)}
                y1={sy(el.y)}
                x2={sx(el.x + el.w)}
                y2={sy(el.y + el.h)}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                markerEnd={el.kind === 'arrow' ? `url(#${markerId})` : undefined}
              />
            )
          }

          const transform = el.rotation
            ? `rotate(${(el.rotation * 180) / Math.PI} ${x + w / 2} ${y + h / 2})`
            : undefined

          if (el.kind === 'circle') {
            return (
              <ellipse
                key={el.id}
                cx={x + w / 2}
                cy={y + h / 2}
                rx={w / 2}
                ry={h / 2}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                transform={transform}
              />
            )
          }

          return (
            <rect
              key={el.id}
              x={x}
              y={y}
              width={w}
              height={h}
              rx="3"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              transform={transform}
            />
          )
        }

        if (el.type === 'text') {
          return (
            <rect
              key={el.id}
              x={sx(el.x)}
              y={sy(el.y + el.height / 2)}
              width={Math.max(8, el.width * scale * 0.65)}
              height={Math.max(2, el.height * scale * 0.18)}
              rx="1"
              fill={el.color}
              opacity="0.55"
            />
          )
        }

        if (el.type === 'stroke') {
          const points = el.points.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')
          return (
            <polyline
              key={el.id}
              points={points}
              fill="none"
              stroke={el.color}
              strokeWidth={Math.max(1, el.size * scale)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <rect
            key={el.id}
            x={sx(el.x)}
            y={sy(el.y)}
            width={el.width * scale}
            height={el.height * scale}
            rx="3"
            fill="#CBD5E1"
            stroke="#64748B"
          />
        )
      })}
    </svg>
  )
}

function TemplateCard({
  template,
  isCustom,
  onInsert,
  onDelete,
}: {
  template: CanvasTemplate
  isCustom: boolean
  onInsert: (template: CanvasTemplate) => void
  onDelete: (templateId: string) => void
}) {
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

export function TemplatePicker({
  isOpen,
  builtInTemplates,
  customTemplates,
  sourceElementCount,
  onClose,
  onInsert,
  onSaveCustom,
  onDeleteCustom,
}: TemplatePickerProps) {
  const [customName, setCustomName] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) {
      const previousFocus = previousFocusRef.current
      previousFocusRef.current = null
      if (previousFocus?.isConnected) queueMicrotask(() => previousFocus.focus())
      return
    }

    const activeElement = document.activeElement
    previousFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusTimer = window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
      firstFocusable?.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current
        ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        : []
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) setCustomName('')
  }, [isOpen])

  if (!isOpen) return null

  const builtInByCategory = builtInTemplates.reduce<Record<string, CanvasTemplate[]>>(
    (groups, template) => {
      const key = template.category
      groups[key] = [...(groups[key] ?? []), template]
      return groups
    },
    {}
  )

  return createPortal(
    <div className="template-picker" role="presentation">
      <div className="template-picker-bg" onClick={onClose} />
      <section
        ref={dialogRef}
        className="template-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
        tabIndex={-1}
      >
        <header className="template-picker-header">
          <h2 id="template-picker-title">模板库</h2>
          <button
            type="button"
            className="template-close"
            onClick={onClose}
            aria-label="关闭模板库"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <form
          className="template-save-row"
          onSubmit={(event) => {
            event.preventDefault()
            onSaveCustom(customName)
            setCustomName('')
          }}
        >
          <input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            aria-label="自定义模板名称"
            maxLength={80}
            placeholder="自定义模板"
          />
          <button type="submit" className="template-save-btn" disabled={sourceElementCount === 0}>
            保存为模板
          </button>
        </form>

        <div className="template-picker-body">
          {Object.entries(builtInByCategory).map(([category, templates]) => (
            <section
              key={category}
              className="template-section"
              aria-label={
                TEMPLATE_CATEGORY_LABELS[category as keyof typeof TEMPLATE_CATEGORY_LABELS]
              }
            >
              <h3>{TEMPLATE_CATEGORY_LABELS[category as keyof typeof TEMPLATE_CATEGORY_LABELS]}</h3>
              <div className="template-grid">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isCustom={false}
                    onInsert={onInsert}
                    onDelete={onDeleteCustom}
                  />
                ))}
              </div>
            </section>
          ))}

          <section className="template-section" aria-label={TEMPLATE_CATEGORY_LABELS.custom}>
            <h3>{TEMPLATE_CATEGORY_LABELS.custom}</h3>
            {customTemplates.length > 0 ? (
              <div className="template-grid">
                {customTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isCustom
                    onInsert={onInsert}
                    onDelete={onDeleteCustom}
                  />
                ))}
              </div>
            ) : (
              <div className="template-empty">暂无自定义模板</div>
            )}
          </section>
        </div>
      </section>
    </div>,
    document.body
  )
}

export default TemplatePicker
