import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { CanvasTemplate } from '../../templates/canvasTemplates'
import { useDialogFocus } from '../useDialogFocus'
import TemplateGallery from './TemplateGallery'
import { getBuiltInTemplateSections } from './templatePickerModel'

interface TemplatePickerProps {
  isOpen: boolean
  builtInTemplates: CanvasTemplate[]
  customTemplates: CanvasTemplate[]
  sourceElementCount: number
  onClose: () => void
  onInsert: (template: CanvasTemplate) => void
  onSaveCustom: (name: string) => boolean
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
  const builtInSections = useMemo(
    () => getBuiltInTemplateSections(builtInTemplates),
    [builtInTemplates]
  )
  const dialogRef = useDialogFocus<HTMLElement>({ open: isOpen, onClose })

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
        aria-describedby="template-picker-description"
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
        <p id="template-picker-description" className="sr-only">
          选择模板插入画布，或为当前内容保存自定义模板。
        </p>

        <form
          className="template-save-row"
          onSubmit={(event) => {
            event.preventDefault()
            if (onSaveCustom(customName)) setCustomName('')
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
