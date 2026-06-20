import React, { useState, useCallback } from 'react'
import { useEraserStore } from '../../eraser/eraserStore'
import { SHORTCUT_CATEGORY_LABELS } from '../../eraser/types'
import type { ShortcutMap, ShortcutConfig } from '../../eraser/types'

/**
 * 快捷键自定义面板
 * 按分类显示所有快捷键，支持修改和重置
 */
export const ShortcutSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { shortcuts, setShortcut, resetShortcutsToDefault } = useEraserStore()
  const [editingKey, setEditingKey] = useState<keyof ShortcutMap | null>(null)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // 按分类分组快捷键
  const shortcutsByCategory = Object.entries(shortcuts).reduce(
    (acc, [key, config]) => {
      const category = (config as ShortcutConfig).category
      if (!acc[category]) acc[category] = []
      acc[category].push([key, config as ShortcutConfig])
      return acc
    },
    {} as Record<string, [string, ShortcutConfig][]>
  )

  // 检查快捷键冲突
  const checkConflict = useCallback(
    (newKey: string, excludeKey: keyof ShortcutMap): string | null => {
      for (const [key, config] of Object.entries(shortcuts)) {
        if (key !== excludeKey && config.enabled && config.key.toLowerCase() === newKey.toLowerCase()) {
          return `与"${config.description}"冲突`
        }
      }
      return null
    },
    [shortcuts]
  )

  // 处理按键捕获
  const handleKeyCapture = useCallback(
    (e: React.KeyboardEvent, shortcutKey: keyof ShortcutMap) => {
      e.preventDefault()
      e.stopPropagation()

      let key = e.key.toLowerCase()

      // 特殊键处理
      if (key === 'escape') {
        setEditingKey(null)
        setConflictWarning(null)
        return
      }
      if (key === 'backspace' || key === 'delete') {
        key = ''
      }

      // 只允许单个字符或特殊键
      if (key.length > 1 && !['[', ']', '-', '=', '+'].includes(key)) {
        return
      }

      const conflict = checkConflict(key, shortcutKey)
      if (conflict) {
        setConflictWarning(conflict)
        return
      }

      setShortcut(shortcutKey, { key })
      setEditingKey(null)
      setConflictWarning(null)
    },
    [checkConflict, setShortcut]
  )

  // 切换启用状态
  const toggleEnabled = (shortcutKey: keyof ShortcutMap, current: boolean) => {
    setShortcut(shortcutKey, { enabled: !current })
  }

  // 渲染单个快捷键行
  const renderShortcutRow = ([key, config]: [string, ShortcutConfig]) => {
    const shortcutKey = key as keyof ShortcutMap
    const isEditing = editingKey === shortcutKey

    return (
      <div
        key={key}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: isEditing ? 'rgba(147, 112, 98, 0.1)' : 'transparent',
          transition: 'background-color 0.2s',
        }}
      >
        <div style={{ flex: 1, opacity: config.enabled ? 1 : 0.5 }}>
          <div style={{ fontSize: '13px', color: '#5D4037', fontWeight: 500 }}>
            {config.description}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 快捷键显示/编辑 */}
          <button
            onClick={() => setEditingKey(isEditing ? null : shortcutKey)}
            onKeyDown={(e) => isEditing && handleKeyCapture(e, shortcutKey)}
            style={{
              minWidth: '40px',
              padding: '4px 10px',
              fontSize: '12px',
              fontFamily: 'monospace',
              backgroundColor: isEditing ? '#8D6E63' : '#EFEBE9',
              color: isEditing ? '#FFF' : '#5D4037',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            {isEditing ? '...' : config.key || '—'}
          </button>

          {/* 启用开关 */}
          <button
            onClick={() => toggleEnabled(shortcutKey, config.enabled)}
            style={{
              width: '36px',
              height: '20px',
              borderRadius: '10px',
              backgroundColor: config.enabled ? '#8D6E63' : '#D7CCC8',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 0.2s',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: config.enabled ? '18px' : '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#FFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        width: '320px',
        maxHeight: '400px',
        overflowY: 'auto',
        backgroundColor: '#FFFBF7',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(93, 64, 55, 0.15)',
        border: '1px solid #D7CCC8',
        zIndex: 1000,
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #EFEBE9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#5D4037',
          }}
        >
          快捷键设置
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            color: '#8D6E63',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* 冲突警告 */}
      {conflictWarning && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFEBEE',
            color: '#C62828',
            fontSize: '12px',
            borderBottom: '1px solid #FFCDD2',
          }}
        >
          ⚠️ {conflictWarning}
        </div>
      )}

      {/* 快捷键列表 */}
      <div style={{ padding: '8px 0' }}>
        {Object.entries(shortcutsByCategory).map(([category, items]) => (
          <div key={category}>
            <div
              style={{
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#8D6E63',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {SHORTCUT_CATEGORY_LABELS[category as keyof typeof SHORTCUT_CATEGORY_LABELS]}
            </div>
            {items.map(renderShortcutRow)}
          </div>
        ))}
      </div>

      {/* 底部操作 */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #EFEBE9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={resetShortcutsToDefault}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            color: '#8D6E63',
            backgroundColor: 'transparent',
            border: '1px solid #D7CCC8',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EFEBE9'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          恢复默认
        </button>
        <div style={{ fontSize: '11px', color: '#A1887F' }}>
          点击按键可修改
        </div>
      </div>
    </div>
  )
}
