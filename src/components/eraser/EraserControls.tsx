import { useShallow } from 'zustand/react/shallow'
import { useEraserStore } from '../../eraser/eraserStore'
import type { EraserShape } from '../../eraser/types'

const shapeLabels: Record<EraserShape, string> = {
  circle: '● 圆形',
  square: '■ 方形',
  chisel: '◢ 凿形',
}

export default function EraserControls() {
  const { eraserConfig, updateEraserConfig, getWearLevel, resetWear } = useEraserStore(
    useShallow((s) => ({
      eraserConfig: s.eraserConfig,
      updateEraserConfig: s.updateEraserConfig,
      getWearLevel: s.getWearLevel,
      resetWear: s.resetWear,
    }))
  )

  const wearLevel = getWearLevel()
  const currentShape = eraserConfig.shape ?? 'circle'
  const audioEnabled = eraserConfig.audioEnabled ?? true

  const handleShapeChange = (shape: EraserShape) => {
    updateEraserConfig({ shape })
  }

  const handleResetWear = () => {
    resetWear()
  }

  const toggleAudio = () => {
    updateEraserConfig({ audioEnabled: !audioEnabled })
  }

  return (
    <div className="eraser-controls panel" style={{ 
      position: 'absolute',
      top: '80px',
      right: '16px',
      padding: '12px',
      borderRadius: '12px',
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      minWidth: '180px',
      zIndex: 100,
    }}>
      <div style={{ 
        fontSize: '12px', 
        fontWeight: 600, 
        color: 'var(--text-2)',
        marginBottom: '8px',
        letterSpacing: '0.5px',
      }}>
        橡皮擦设置
      </div>

      {/* 形状选择 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '11px', 
          color: 'var(--text-3)', 
          marginBottom: '6px' 
        }}>
          橡皮擦形状
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '4px',
          flexWrap: 'wrap',
        }}>
          {(['circle', 'square', 'chisel'] as EraserShape[]).map((shape) => (
            <button
              key={shape}
              onClick={() => handleShapeChange(shape)}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: currentShape === shape ? 'var(--primary)' : 'var(--bg-2)',
                color: currentShape === shape ? 'white' : 'var(--text-2)',
                fontWeight: currentShape === shape ? 600 : 400,
              }}
            >
              {shapeLabels[shape]}
            </button>
          ))}
        </div>
      </div>

      {/* 磨损程度 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '11px', 
          color: 'var(--text-3)', 
          marginBottom: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>磨损程度</span>
          <span style={{ 
            fontSize: '10px', 
            color: wearLevel > 0.7 ? 'var(--danger)' : 'var(--text-3)',
            fontWeight: 500,
          }}>
            {Math.round(wearLevel * 100)}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: 'var(--bg-2)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${wearLevel * 100}%`,
            background: wearLevel > 0.7 
              ? 'linear-gradient(90deg, var(--danger), #ff6b6b)' 
              : wearLevel > 0.3 
                ? 'linear-gradient(90deg, var(--warning), #feca57)'
                : 'linear-gradient(90deg, var(--success), #48dbfb)',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{
          fontSize: '10px',
          color: 'var(--text-3)',
          marginTop: '4px',
          fontStyle: 'italic',
        }}>
          {wearLevel < 0.1 ? '✨ 全新' : 
           wearLevel < 0.3 ? '状态良好' :
           wearLevel < 0.6 ? '有些磨损' :
           wearLevel < 0.8 ? '磨损较严重' : '该削橡皮了！'}
        </div>
      </div>

      {/* 削橡皮按钮 */}
      <button
        onClick={handleResetWear}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 500,
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          background: wearLevel > 0.3 ? 'var(--primary)' : 'var(--bg-2)',
          color: wearLevel > 0.3 ? 'white' : 'var(--text-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '8px',
        }}
      >
        ✏️ 削橡皮
      </button>

      {/* 音效开关 */}
      <button
        onClick={toggleAudio}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 500,
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          background: audioEnabled ? 'var(--success)' : 'var(--bg-2)',
          color: audioEnabled ? 'white' : 'var(--text-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        {audioEnabled ? '🔊 音效开启' : '🔇 音效关闭'}
      </button>
    </div>
  )
}
