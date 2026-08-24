import type { ReactNode } from 'react'
import { Image as ImageIcon } from 'lucide-react'

interface ExportItemButtonProps {
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
}

export function ExportItemButton({ icon, label, description, onClick }: ExportItemButtonProps) {
  return (
    <button type="button" onClick={onClick} className="ditem" aria-label={label}>
      <span className="di em-icon">{icon}</span>
      <span className="em-labels">
        <span className="dl">{label}</span>
        <span className="dd">{description}</span>
      </span>
    </button>
  )
}

interface JpegExportPanelProps {
  quality: number
  estimate: string
  onExport: () => void
  onQualityChange: (quality: number) => void
}

export function JpegExportPanel({
  quality,
  estimate,
  onExport,
  onQualityChange,
}: JpegExportPanelProps) {
  return (
    <div className="em-jpeg-panel" role="group" aria-label="JPEG 导出设置">
      <ExportItemButton
        icon={<ImageIcon size={16} />}
        label="JPEG 图片"
        description={`文档背景 · ${quality}%`}
        onClick={onExport}
      />
      <label className="em-quality-row">
        <span>质量</span>
        <strong>{quality}%</strong>
        <input
          aria-label="JPEG 质量"
          type="range"
          min="1"
          max="100"
          value={quality}
          onChange={(event) => onQualityChange(Number(event.target.value))}
        />
      </label>
      <div className="em-estimate" aria-live="polite">
        预计大小：{estimate}
      </div>
    </div>
  )
}
