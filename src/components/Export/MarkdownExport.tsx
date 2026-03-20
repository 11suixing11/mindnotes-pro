import { useCallback } from 'react'

interface ExportOptions {
  includeImages?: boolean
  includeMetadata?: boolean
  format?: 'markdown' | 'html' | 'pdf'
}

/**
 * Markdown 导出工具
 * 支持导出为 Markdown + 图片混合格式
 */
export function useMarkdownExport() {
  /**
   * 导出笔记为 Markdown
   */
  const exportToMarkdown = useCallback((content: any, options: ExportOptions = {}) => {
    const { includeImages = true, includeMetadata = true } = options
    
    let markdown = ''
    
    // 元数据
    if (includeMetadata) {
      markdown += `---\n`
      markdown += `title: 未命名笔记\n`
      markdown += `createdAt: ${new Date().toISOString()}\n`
      markdown += `updatedAt: ${new Date().toISOString()}\n`
      markdown += `tags: []\n`
      markdown += `---\n\n`
    }
    
    // 内容转换
    if (content.textBlocks) {
      content.textBlocks.forEach((block: any) => {
        if (block.type === 'text') {
          markdown += `${block.content}\n\n`
        } else if (block.type === 'image' && includeImages) {
          markdown += `![Image](${block.src})\n\n`
        }
      })
    }
    
    return markdown
  }, [])

  /**
   * 导出并下载
   */
  const downloadMarkdown = useCallback((content: any, filename: string, options?: ExportOptions) => {
    const markdown = exportToMarkdown(content, options)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [exportToMarkdown])

  /**
   * 导出为 HTML
   */
  const exportToHtml = useCallback((content: any, options: ExportOptions = {}) => {
    const markdown = exportToMarkdown(content, options)
    
    // 简单的 Markdown 转 HTML
    const html = markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>')
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MindNotes Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${html}
</body>
</html>`
  }, [exportToMarkdown])

  /**
   * 导出 HTML 并下载
   */
  const downloadHtml = useCallback((content: any, filename: string, options?: ExportOptions) => {
    const html = exportToHtml(content, options)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [exportToHtml])

  return {
    exportToMarkdown,
    downloadMarkdown,
    exportToHtml,
    downloadHtml
  }
}

/**
 * 导出组件
 */
interface ExportButtonProps {
  content: any
  filename?: string
  format?: 'markdown' | 'html'
  className?: string
}

export function ExportButton({ content, filename = 'note', format = 'markdown', className = '' }: ExportButtonProps) {
  const { downloadMarkdown, downloadHtml } = useMarkdownExport()

  const handleExport = () => {
    if (format === 'markdown') {
      downloadMarkdown(content, filename)
    } else {
      downloadHtml(content, filename)
    }
  }

  return (
    <button
      onClick={handleExport}
      className={className || 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'}
    >
      📤 导出为 {format === 'markdown' ? 'Markdown' : 'HTML'}
    </button>
  )
}
