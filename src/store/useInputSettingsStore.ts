import { create } from 'zustand'

export const INPUT_SETTINGS_STORAGE_KEY = 'mindnotes-input-settings-v1'

export interface InputSettings {
  pressureEnabled: boolean
  pressureSensitivity: number
  stylusEraserEnabled: boolean
  secondaryButtonAction: 'pan' | 'eraser' | 'ignore'
}

interface InputSettingsStore extends InputSettings {
  setPressureEnabled: (enabled: boolean) => void
  setPressureSensitivity: (sensitivity: number) => void
  setStylusEraserEnabled: (enabled: boolean) => void
  setSecondaryButtonAction: (action: InputSettings['secondaryButtonAction']) => void
  resetInputSettings: () => void
}

export const DEFAULT_INPUT_SETTINGS: InputSettings = {
  pressureEnabled: true,
  pressureSensitivity: 50,
  stylusEraserEnabled: true,
  secondaryButtonAction: 'pan',
}

export function normalizeInputSettings(value: unknown): InputSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_INPUT_SETTINGS }
  const record = value as Record<string, unknown>
  return {
    pressureEnabled:
      typeof record.pressureEnabled === 'boolean'
        ? record.pressureEnabled
        : DEFAULT_INPUT_SETTINGS.pressureEnabled,
    pressureSensitivity:
      typeof record.pressureSensitivity === 'number' && Number.isFinite(record.pressureSensitivity)
        ? Math.round(Math.max(0, Math.min(100, record.pressureSensitivity)))
        : DEFAULT_INPUT_SETTINGS.pressureSensitivity,
    stylusEraserEnabled:
      typeof record.stylusEraserEnabled === 'boolean'
        ? record.stylusEraserEnabled
        : DEFAULT_INPUT_SETTINGS.stylusEraserEnabled,
    secondaryButtonAction:
      record.secondaryButtonAction === 'pan' ||
      record.secondaryButtonAction === 'eraser' ||
      record.secondaryButtonAction === 'ignore'
        ? record.secondaryButtonAction
        : DEFAULT_INPUT_SETTINGS.secondaryButtonAction,
  }
}

function loadInputSettings(): InputSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_INPUT_SETTINGS }
  try {
    const saved = localStorage.getItem(INPUT_SETTINGS_STORAGE_KEY)
    return saved ? normalizeInputSettings(JSON.parse(saved)) : { ...DEFAULT_INPUT_SETTINGS }
  } catch {
    return { ...DEFAULT_INPUT_SETTINGS }
  }
}

function persistInputSettings(settings: InputSettings) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(INPUT_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Keep the active settings usable when local persistence is unavailable.
  }
}

export const useInputSettingsStore = create<InputSettingsStore>((set, get) => ({
  ...loadInputSettings(),
  setPressureEnabled: (pressureEnabled) => {
    const next = { ...get(), pressureEnabled }
    set({ pressureEnabled })
    persistInputSettings(next)
  },
  setPressureSensitivity: (pressureSensitivity) => {
    const bounded = Math.round(Math.max(0, Math.min(100, pressureSensitivity)))
    const next = { ...get(), pressureSensitivity: bounded }
    set({ pressureSensitivity: bounded })
    persistInputSettings(next)
  },
  setStylusEraserEnabled: (stylusEraserEnabled) => {
    const next = { ...get(), stylusEraserEnabled }
    set({ stylusEraserEnabled })
    persistInputSettings(next)
  },
  setSecondaryButtonAction: (secondaryButtonAction) => {
    const next = { ...get(), secondaryButtonAction }
    set({ secondaryButtonAction })
    persistInputSettings(next)
  },
  resetInputSettings: () => {
    const next = { ...DEFAULT_INPUT_SETTINGS }
    set(next)
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(INPUT_SETTINGS_STORAGE_KEY)
    } catch {
      persistInputSettings(next)
    }
  },
}))
