import type { EraserConfig, EraserPresetType, EraserShape } from './types'
import { ERASER_PRESET_CONFIGS, DEFAULT_ERASER_CONFIG } from './types'

const STORAGE_KEY = 'mindnotes-eraser-preferences'

export interface EraserUserPreferences {
  preset: EraserPresetType
  shape: EraserShape
  baseRadius: number
  audioEnabled: boolean
  rotation: number
  particlesEnabled: boolean
}

const DEFAULT_PREFERENCES: EraserUserPreferences = {
  preset: '4b',
  shape: 'circle',
  baseRadius: DEFAULT_ERASER_CONFIG.baseRadius,
  audioEnabled: true,
  rotation: 0,
  particlesEnabled: true,
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
    const updated = { ...current, ...prefs }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage不可用，静默失败
  }
}

/**
 * 根据用户偏好生成橡皮擦配置
 */
export function getEraserConfigFromPreferences(prefs: EraserUserPreferences): EraserConfig {
  const baseConfig = ERASER_PRESET_CONFIGS[prefs.preset]
  return {
    ...baseConfig,
    shape: prefs.shape,
    baseRadius: prefs.baseRadius,
    audioEnabled: prefs.audioEnabled,
    rotation: prefs.rotation,
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
