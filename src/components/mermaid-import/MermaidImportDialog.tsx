import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot } from 'lucide-react'
import { useDialogFocus } from '../useDialogFocus'
import { importMermaidDiagram } from '../../core/mermaidImport'
import { insertTemplateIntoCanvas } from '../templates/templateInsertion'
import { useToastStore } from '../../store/toastStore'
import type { CanvasTemplate } from '../../templates/canvasTemplates'

const PLACEHOLDER = `flowchart TD
    A[开始] --> B{数据是否有效?}
    B -->|是| C[处理数据]
    B -->|否| D[提示错误]
    C --> E((结束))
    D --> E`

interface MermaidImportDialogProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Paste a Mermaid snippet from any AI chat (Doubao / ChatGPT / Claude…) and
 * get the same diagram as editable native elements on the canvas.
 */
export function MermaidImportDialog({ isOpen, onClose }: MermaidImportDialogProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const toast = useToastStore((state) => state.show)
  const dialogRef = useDialogFocus<HTMLElement>({ open: isOpen, onClose })

  useEffect(() => {
    if (!isOpen) {
      setCode('')
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleImport = () => {
    const outcome = importMermaidDiagram(code)
    if (!outcome.ok) {
      setError(outcome.error)
      return
    }
    const template: CanvasTemplate = {
      id: 'mermaid-import',
      name: 'Mermaid 导入',
      description: 'AI 生成的图表',
      category: 'diagram',
      width: outcome.result.width,
      height: outcome.result.height,
      elements: outcome.result.elements,
      createdAt: Date.now(),
    }
    const inserted = insertTemplateIntoCanvas(template)
    if (inserted.length === 0) {
      setError('这张图没有可绘制的内容')
      return
    }
    toast(`已从 Mermaid 生成 ${outcome.result.nodeCount} 个节点`, 'success')
    onClose()
  }

  return createPortal(
    <div className="template-picker" role="presentation">
      <div className="template-picker-bg" onClick={onClose} />
      <section
        ref={dialogRef}
        className="template-picker-dialog mermaid-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mermaid-dialog-title"
        tabIndex={-1}
      >
        <header className="template-picker-header">
          <h2 id="mermaid-dialog-title">
            <Bot size={18} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 6 }} />
            从 AI 粘贴 Mermaid 代码
          </h2>
          <button type="button" className="template-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="mermaid-dialog-body">
          <p className="mermaid-dialog-hint">
            把豆包、ChatGPT 等生成的流程图 / 思维导图代码粘到这里，将生成同样的可编辑图形。
          </p>
          <textarea
            className="mermaid-code-input"
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setError(null)
            }}
            placeholder={PLACEHOLDER}
            rows={12}
            spellCheck={false}
            aria-label="Mermaid 代码"
          />
          {error && (
            <p className="mermaid-dialog-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="mermaid-dialog-actions">
          <button type="button" className="mermaid-cancel" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="template-save-btn"
            onClick={handleImport}
            disabled={code.trim().length === 0}
          >
            生成到画布
          </button>
        </footer>
      </section>
    </div>,
    document.body
  )
}

export default MermaidImportDialog
