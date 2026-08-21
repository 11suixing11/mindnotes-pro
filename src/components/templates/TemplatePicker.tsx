import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { CanvasTemplate } from '../../templates/canvasTemplates'
import TemplateGallery from './TemplateGallery'
import { getBuiltInTemplateSections } from './templatePickerModel'

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
  const builtInSections = useMemo(
    () => getBuiltInTemplateSections(builtInTemplates),
    [builtInTemplates]
  )

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
      if (event.isComposing) return
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

        <TemplateGallery
          builtInSections={builtInSections}
          customTemplates={customTemplates}
          onInsert={onInsert}
          onDeleteCustom={onDeleteCustom}
        />
      </section>
    </div>,
    document.body
  )
}

export default TemplatePicker
