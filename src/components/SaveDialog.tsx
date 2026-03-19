import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'

interface SaveDialogProps {
  isOpen: boolean
  onClose: () => void
  canvas: HTMLCanvasElement | null
}

const SaveDialog: React.FC<SaveDialogProps> = ({ isOpen, onClose, canvas }) => {
  const { strokes } = useAppStore()
  const [format, setFormat] = useState<'png' | 'json' | 'pdf' | 'svg'>('png')
  const [isSaving, setIsSaving] = useState(false)
  
  if (!isOpen) return null
  
  // 导出为 PNG
  const exportAsPNG = () => {
    if (!canvas) return
    
    setIsSaving(true)
    canvas.toBlob((blob) => {
      if (!blob) return
      saveAs(blob, `mindnotes-${Date.now()}.png`)
      setIsSaving(false)
      onClose()
    }, 'image/png')
  }
  
  // 导出为 JSON（原始笔迹数据）
  const exportAsJSON = () => {
    setIsSaving(true)
    try {
      const data = JSON.stringify(strokes, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      saveAs(blob, `mindnotes-${Date.now()}.json`)
    } catch (error) {
      console.error('导出 JSON 失败:', error)
      alert('导出失败，请重试')
    }
    setIsSaving(false)
    onClose()
  }
  
  // 导出为 SVG
  const exportAsSVG = () => {
    setIsSaving(true)
    try {
      const { shapes } = useAppStore.getState()
      
      // 生成 SVG 内容
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <rect width="100%" height="100%" fill="white"/>
`
      
      // 添加形状
      shapes.forEach(shape => {
        if (shape.hidden) return
        
        svgContent += `  <${shape.type === 'rectangle' ? 'rect' : shape.type === 'circle' ? 'ellipse' : 'path'}
    stroke="${shape.color}"
    stroke-width="${shape.size}"
    fill="none"
`
        
        if (shape.type === 'rectangle') {
          svgContent += `    x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"
`
        } else if (shape.type === 'circle') {
          const rx = shape.width / 2
          const ry = shape.height / 2
          const cx = shape.x + rx
          const cy = shape.y + ry
          svgContent += `    cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
`
        }
        
        svgContent += `  />
`
      })
      
      svgContent += `</svg>`
      
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      saveAs(blob, `mindnotes-${Date.now()}.svg`)
    } catch (error) {
      console.error('导出 SVG 失败:', error)
      alert('导出失败，请重试')
    }
    setIsSaving(false)
    onClose()
  }
  
  // 导出为 PDF
  const exportAsPDF = () => {
    if (!canvas) return
    
    setIsSaving(true)
    try {
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`mindnotes-${Date.now()}.pdf`)
    } catch (error) {
      console.error('导出 PDF 失败:', error)
      alert('导出失败，请重试')
    }
    setIsSaving(false)
    onClose()
  }
  
  const handleSave = () => {
    switch (format) {
      case 'png':
        exportAsPNG()
        break
      case 'svg':
        exportAsSVG()
        break
      case 'json':
        exportAsJSON()
        break
      case 'pdf':
        exportAsPDF()
        break
    }
  }
  
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">💾 保存笔记</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择导出格式
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setFormat('png')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                format === 'png'
                  ? 'border-primary bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">🖼️</div>
              <div className="text-sm font-medium text-gray-700">PNG 图片</div>
              <div className="text-xs text-gray-500 mt-1">适合分享</div>
            </button>
            
            <button
              onClick={() => setFormat('json')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                format === 'json'
                  ? 'border-primary bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="text-sm font-medium text-gray-700">JSON 数据</div>
              <div className="text-xs text-gray-500 mt-1">可再次编辑</div>
            </button>
            
            <button
              onClick={() => setFormat('pdf')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                format === 'pdf'
                  ? 'border-primary bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">📕</div>
              <div className="text-sm font-medium text-gray-700">PDF 文档</div>
              <div className="text-xs text-gray-500 mt-1">适合打印</div>
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              <>
                💾 保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SaveDialog
