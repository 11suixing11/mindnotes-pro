import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'

interface SaveDialogProps {
  isOpen: boolean
  onClose: () => void
  canvasRef: React.RefObject<HTMLCanvasElement>
}

const SaveDialog: React.FC<SaveDialogProps> = ({ isOpen, onClose, canvasRef }) => {
  const { strokes } = useAppStore()
  const [format, setFormat] = useState<'png' | 'json' | 'pdf'>('png')
  
  if (!isOpen) return null
  
  // 导出为 PNG
  const exportAsPNG = () => {
    if (!canvasRef.current) return
    
    canvasRef.current.toBlob((blob) => {
      if (!blob) return
      saveAs(blob, `mindnotes-${Date.now()}.png`)
      onClose()
    }, 'image/png')
  }
  
  // 导出为 JSON（原始笔迹数据）
  const exportAsJSON = () => {
    const data = JSON.stringify(strokes, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    saveAs(blob, `mindnotes-${Date.now()}.json`)
    onClose()
  }
  
  // 导出为 PDF
  const exportAsPDF = () => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const imgData = canvas.toDataURL('image/png')
    
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    })
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    pdf.save(`mindnotes-${Date.now()}.pdf`)
    onClose()
  }
  
  const handleSave = () => {
    switch (format) {
      case 'png':
        exportAsPNG()
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
        <h2 className="text-2xl font-bold mb-4">💾 保存笔记</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择格式
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setFormat('png')}
              className={`p-4 rounded-lg border-2 transition-all ${
                format === 'png'
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">🖼️</div>
              <div className="text-sm font-medium">PNG 图片</div>
            </button>
            
            <button
              onClick={() => setFormat('json')}
              className={`p-4 rounded-lg border-2 transition-all ${
                format === 'json'
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">📄</div>
              <div className="text-sm font-medium">JSON 数据</div>
            </button>
            
            <button
              onClick={() => setFormat('pdf')}
              className={`p-4 rounded-lg border-2 transition-all ${
                format === 'pdf'
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">📕</div>
              <div className="text-sm font-medium">PDF 文档</div>
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default SaveDialog
