import type { EraserConfig, EraserPresetType, EraserShape, EraserBrandType, ShortcutMap } from './types'
import { ERASER_PRESET_CONFIGS, ERASER_BRAND_CONFIGS, DEFAULT_ERASER_CONFIG, DEFAULT_SHORTCUTS } from './types'

const STORAGE_KEY = 'mindnotes-eraser-preferences'

export interface EraserUserPreferences {
  preset: EraserPresetType
  brand: EraserBrandType
  shape: EraserShape
  baseRadius: number
  audioEnabled: boolean
  rotation: number
  particlesEnabled: boolean
  shortcuts: Partial<ShortcutMap>
}

const DEFAULT_PREFERENCES: EraserUserPreferences = {
  preset: '4b',
  brand: 'default',
  shape: 'circle',
  baseRadius: DEFAULT_ERASER_CONFIG.baseRadius,
  audioEnabled: true,
  rotation: 0,
  particlesEnabled: true,
  shortcuts: {},
}

/**
 * 从localStorage加载用户橡皮擦偏好
 * 失败时返回默认值
 */
export function loadEraserPreferences(): EraserUserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
      }
    }
  } catch {
    // localStorage不可用或解析失败，使用默认值
  }
  return { ...DEFAULT_PREFERENCES }
}

/**
 * 保存用户橡皮擦偏好到localStorage
 */
export function saveEraserPreferences(prefs: Partial<EraserUserPreferences>): void {
  try {
    const current = loadEraserPreferences()
    const updated: Partial<EraserUserPreferences> = { ...current }
    
    // 只更新非undefined的值
    if (prefs.preset !== undefined) updated.preset = prefs.preset
    if (prefs.brand !== undefined) updated.brand = prefs.brand
    if (prefs.shape !== undefined) updated.shape = prefs.shape
    if (prefs.baseRadius !== undefined) updated.baseRadius = prefs.baseRadius
    if (prefs.audioEnabled !== undefined) updated.audioEnabled = prefs.audioEnabled
    if (prefs.rotation !== undefined) updated.rotation = prefs.rotation
    if (prefs.particlesEnabled !== undefined) updated.particlesEnabled = prefs.particlesEnabled
    if (prefs.shortcuts !== undefined) updated.shortcuts = prefs.shortcuts
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage不可用，静默失败
  }
}

/**
 * 获取合并后的快捷键配置（用户自定义 + 默认）
 */
export function getMergedShortcuts(prefs: EraserUserPreferences): ShortcutMap {
  return {
    ...DEFAULT_SHORTCUTS,
    ...prefs.shortcuts,
  }
}

/**
 * 根据用户偏好生成橡皮擦配置
 * 应用品牌修正系数
 */
export function getEraserConfigFromPreferences(prefs: EraserUserPreferences): EraserConfig {
  const baseConfig = ERASER_PRESET_CONFIGS[prefs.preset]
  const brandConfig = ERASER_BRAND_CONFIGS[prefs.brand]
  
  return {
    ...baseConfig,
    shape: prefs.shape,
    baseRadius: prefs.baseRadius,
    audioEnabled: prefs.audioEnabled,
    rotation: prefs.rotation,
    // 应用品牌修正系数
    hardness: baseConfig.hardness * brandConfig.hardnessModifier,
    wearRate: baseConfig.wearRate * brandConfig.wearRateModifier,
    friction: baseConfig.friction * brandConfig.frictionModifier,
  }
}

/**
 * 清除所有保存的偏好
 */
export function clearEraserPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 静默失败
  }
}
