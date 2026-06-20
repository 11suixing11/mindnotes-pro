import { useShallow } from 'zustand/react/shallow'
import { useState } from 'react'
import { useEraserStore } from '../../eraser/eraserStore'
import type { EraserShape, EraserPresetType, EraserBrandType } from '../../eraser/types'
import { 
  ERASER_PRESET_LABELS, 
  ERASER_PRESET_DESCRIPTIONS, 
  ERASER_BRAND_LABELS,
  ERASER_BRAND_ICONS,
  ERASER_BRAND_CONFIGS,
} from '../../eraser/types'
import { ShortcutSettings } from './ShortcutSettings'

const shapeLabels: Record<EraserShape, string> = {
  circle: '●',
  square: '■',
  chisel: '◢',
}

export default function EraserControls() {
  const [showShortcutSettings, setShowShortcutSettings] = useState(false)
  
  const {
    eraserConfig,
    eraserPreset,
    eraserBrand,
    updateEraserConfig,
    setEraserPreset,
    setEraserBrand,
    getWearLevel,
    resetWear,
    undoWear,
    redoWear,
    canUndoWear,
    canRedoWear,
    particlesEnabled,
    setParticlesEnabled,
  } = useEraserStore(
    useShallow((s) => ({
      eraserConfig: s.eraserConfig,
      eraserPreset: s.eraserPreset,
      eraserBrand: s.eraserBrand,
      updateEraserConfig: s.updateEraserConfig,
      setEraserPreset: s.setEraserPreset,
      setEraserBrand: s.setEraserBrand,
      getWearLevel: s.getWearLevel,
      resetWear: s.resetWear,
      undoWear: s.undoWear,
      redoWear: s.redoWear,
      canUndoWear: s.canUndoWear,
      canRedoWear: s.canRedoWear,
      particlesEnabled: s.particlesEnabled,
      setParticlesEnabled: s.setParticlesEnabled,
    }))
  )

  const wearLevel = getWearLevel()
  const currentShape = eraserConfig.shape ?? 'circle'
  const audioEnabled = eraserConfig.audioEnabled ?? true
  const currentPreset = eraserPreset
  const currentBrand = eraserBrand
  const currentSize = eraserConfig.baseRadius ?? 12

  const handleShapeChange = (shape: EraserShape) => {
    updateEraserConfig({ shape })
  }

  const handlePresetChange = (preset: EraserPresetType) => {
    setEraserPreset(preset)
  }

  const handleBrandChange = (brand: EraserBrandType) => {
    setEraserBrand(brand)
  }

  const handleResetWear = () => {
    resetWear()
  }

  const handleUndoWear = () => {
    undoWear()
  }

  const handleRedoWear = () => {
    redoWear()
  }

  const toggleAudio = () => {
    updateEraserConfig({ audioEnabled: !audioEnabled })
  }

  const toggleParticles = () => {
    setParticlesEnabled(!particlesEnabled)
  }

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value, 10)
    updateEraserConfig({ baseRadius: newSize })
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
      minWidth: '200px',
      zIndex: 100,
    }}>
      <div style={{ 
        fontSize: '12px', 
        fontWeight: 600, 
        color: 'var(--text-2)',
        marginBottom: '10px',
        letterSpacing: '0.5px',
      }}>
        橡皮擦设置
      </div>

      {/* 橡皮品牌选择 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '11px', 
          color: 'var(--text-3)', 
          marginBottom: '6px' 
        }}>
          橡皮品牌
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '4px',
          flexWrap: 'wrap',
        }}>
          {(['default', 'sakura', 'faber-castell', 'staedtler', 'uni'] as EraserBrandType[]).map((brand) => (
            <button
              key={brand}
              onClick={() => handleBrandChange(brand)}
              title={ERASER_BRAND_CONFIGS[brand].description}
              style={{
                flex: 1,
                minWidth: '36px',
                padding: '6px 4px',
                fontSize: '14px',
                borderRadius: '6px',
                border: currentBrand === brand ? '2px solid var(--primary)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: currentBrand === brand 
                  ? ERASER_BRAND_CONFIGS[brand].primaryColor + '20' 
                  : 'var(--bg-2)',
                color: 'var(--text-2)',
                fontWeight: currentBrand === brand ? 600 : 400,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <span>{ERASER_BRAND_ICONS[brand]}</span>
              <span style={{ fontSize: '9px', opacity: 0.8 }}>
                {ERASER_BRAND_LABELS[brand]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 橡皮预设选择 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '11px', 
          color: 'var(--text-3)', 
          marginBottom: '6px' 
        }}>
          橡皮类型
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '4px',
          flexDirection: 'column',
        }}>
          {(['2b', '4b', '6b'] as EraserPresetType[]).map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetChange(preset)}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: currentPreset === preset ? 'var(--primary)' : 'var(--bg-2)',
                color: currentPreset === preset ? 'white' : 'var(--text-2)',
                fontWeight: currentPreset === preset ? 600 : 400,
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{ERASER_PRESET_LABELS[preset]}</span>
              <span style={{ 
                fontSize: '10px', 
                opacity: 0.7,
                fontWeight: 400,
              }}>
                {ERASER_PRESET_DESCRIPTIONS[preset]}
              </span>
            </button>
          ))}
        </div>
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
        }}>
          {(['circle', 'square', 'chisel'] as EraserShape[]).map((shape) => (
            <button
              key={shape}
              onClick={() => handleShapeChange(shape)}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '14px',
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

      {/* 橡皮擦大小 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '11px', 
          color: 'var(--text-3)', 
          marginBottom: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>橡皮擦大小</span>
          <span style={{ 
            fontSize: '10px', 
            color: 'var(--primary)',
            fontWeight: 600,
            background: 'var(--primary-bg)',
            padding: '2px 6px',
            borderRadius: '4px',
          }}>
            {currentSize}px
          </span>
        </div>
        <input
          type="range"
          min="4"
          max="40"
          value={currentSize}
          onChange={handleSizeChange}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: 'var(--bg-2)',
            outline: 'none',
            cursor: 'pointer',
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--primary);
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--primary);
            cursor: pointer;
            border: none;
          }
        `}</style>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'var(--text-4)',
          marginTop: '2px',
        }}>
          <span>精细</span>
          <span>标准</span>
          <span>大面积</span>
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

      {/* 撤销/重做按钮 */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '8px',
      }}>
        <button
          onClick={handleUndoWear}
          disabled={!canUndoWear()}
          title="撤销削橡皮 (Ctrl+Z)"
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '8px',
            border: 'none',
            cursor: canUndoWear() ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            background: canUndoWear() ? 'var(--bg-2)' : 'var(--bg-3)',
            color: canUndoWear() ? 'var(--text-2)' : 'var(--text-4)',
            opacity: canUndoWear() ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          ↩️ 撤销
        </button>
        <button
          onClick={handleRedoWear}
          disabled={!canRedoWear()}
          title="重做削橡皮 (Ctrl+Y)"
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '8px',
            border: 'none',
            cursor: canRedoWear() ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            background: canRedoWear() ? 'var(--bg-2)' : 'var(--bg-3)',
            color: canRedoWear() ? 'var(--text-2)' : 'var(--text-4)',
            opacity: canRedoWear() ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          ↪️ 重做
        </button>
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
          marginBottom: '8px',
        }}
      >
        {audioEnabled ? '🔊 音效开启' : '🔇 音效关闭'}
      </button>

      {/* 粒子效果开关 */}
      <button
        onClick={toggleParticles}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 500,
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          background: particlesEnabled ? 'var(--primary)' : 'var(--bg-2)',
          color: particlesEnabled ? 'white' : 'var(--text-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '8px',
        }}
      >
        {particlesEnabled ? '✨ 粒子效果开启' : '⭕ 粒子效果关闭'}
      </button>

      {/* 快捷键设置按钮 */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowShortcutSettings(!showShortcutSettings)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: showShortcutSettings ? 'var(--primary)' : 'var(--bg-2)',
            color: showShortcutSettings ? 'white' : 'var(--text-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          ⌨️ 快捷键设置
        </button>
        {showShortcutSettings && (
          <ShortcutSettings onClose={() => setShowShortcutSettings(false)} />
        )}
      </div>
    </div>
  )
}
