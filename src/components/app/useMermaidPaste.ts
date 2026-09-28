import { useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { useToastStore } from '../../store/toastStore'
import { importMermaidDiagram } from '../../core/mermaidImport'
import { insertTemplateIntoCanvas } from '../templates/templateInsertion'
import type { CanvasTemplate } from '../../templates/canvasTemplates'

/** 豆包 / ChatGPT 等生成的图几乎都是 Mermaid：粘贴即导入。 */
const MERMAID_START_RE = /^\s*(?:```[a-z]*\s*)?(?:flowchart|graph|mindmap)\b/

/**
 * Global paste listener: pasting Mermaid source anywhere on the canvas
 * inserts the same diagram as editable elements. Skipped while a text
 * element is being edited so normal text paste still works.
 */
export function useMermaidPaste(): void {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (useAppStore.getState().activeTextEditingId) return
      const text = event.clipboardData?.getData('text/plain') ?? ''
      if (!MERMAID_START_RE.test(text)) return

      event.preventDefault()
      const outcome = importMermaidDiagram(text)
      const toast = useToastStore.getState().show
      if (!outcome.ok) {
        toast(outcome.error, 'warning')
        return
      }
      const template: CanvasTemplate = {
        id: 'mermaid-paste',
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
        toast('这张图没有可绘制的内容', 'warning')
        return
      }
      toast(`已从 Mermaid 生成 ${outcome.result.nodeCount} 个节点`, 'success')
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])
}

export default useMermaidPaste
