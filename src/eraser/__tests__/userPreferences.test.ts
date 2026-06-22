import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadEraserPreferences,
  saveEraserPreferences,
  getEraserConfigFromPreferences,
  clearEraserPreferences,
} from '../userPreferences'
import type { EraserUserPreferences } from '../userPreferences'
import { ERASER_PRESET_CONFIGS, DEFAULT_ERASER_CONFIG, ERASER_BRAND_CONFIGS } from '../types'

describe('userPreferences - 用户偏好持久化', () => {
  const STORAGE_KEY = 'mindnotes-eraser-preferences'

  beforeEach(() => {
    // 每次测试前清除localStorage
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('默认值', () => {
    it('没有存储数据时应该返回默认偏好', () => {
      const prefs = loadEraserPreferences()

      expect(prefs.preset).toBe('4b')
      expect(prefs.brand).toBe('default')
      expect(prefs.shape).toBe('circle')
      expect(prefs.baseRadius).toBe(DEFAULT_ERASER_CONFIG.baseRadius)
      expect(prefs.audioEnabled).toBe(true)
      expect(prefs.rotation).toBe(0)
      expect(prefs.particlesEnabled).toBe(true)
    })

    it('默认值应该包含所有字段', () => {
      const prefs = loadEraserPreferences()

      expect(prefs).toHaveProperty('preset')
      expect(prefs).toHaveProperty('brand')
      expect(prefs).toHaveProperty('shape')
      expect(prefs).toHaveProperty('baseRadius')
      expect(prefs).toHaveProperty('audioEnabled')
      expect(prefs).toHaveProperty('rotation')
      expect(prefs).toHaveProperty('particlesEnabled')
    })
  })

  describe('保存与加载', () => {
    it('保存的偏好应该能够正确加载', () => {
      const testPrefs: Partial<EraserUserPreferences> = {
        preset: '6b',
        brand: 'sakura',
        shape: 'chisel',
        baseRadius: 20,
        audioEnabled: false,
        rotation: 45,
        particlesEnabled: false,
      }

      saveEraserPreferences(testPrefs)
      const loaded = loadEraserPreferences()

      expect(loaded.preset).toBe('6b')
      expect(loaded.brand).toBe('sakura')
      expect(loaded.shape).toBe('chisel')
      expect(loaded.baseRadius).toBe(20)
      expect(loaded.audioEnabled).toBe(false)
      expect(loaded.rotation).toBe(45)
      expect(loaded.particlesEnabled).toBe(false)
    })

    it('应该正确存储到localStorage', () => {
      saveEraserPreferences({ preset: '2b', brand: 'faber-castell' })

      const stored = localStorage.getItem(STORAGE_KEY)
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.preset).toBe('2b')
      expect(parsed.brand).toBe('faber-castell')
    })

    it('部分保存应该合并而不是覆盖', () => {
      // 先保存一些值
      saveEraserPreferences({ preset: '6b', shape: 'square' })

      // 再保存另一些值
      saveEraserPreferences({ audioEnabled: false })

      const loaded = loadEraserPreferences()

      // 旧值应该保留
      expect(loaded.preset).toBe('6b')
      expect(loaded.shape).toBe('square')
      // 新值应该生效
      expect(loaded.audioEnabled).toBe(false)
    })

    it('多次保存应该正确更新', () => {
      saveEraserPreferences({ preset: '2b' })
      expect(loadEraserPreferences().preset).toBe('2b')

      saveEraserPreferences({ preset: '4b' })
      expect(loadEraserPreferences().preset).toBe('4b')

      saveEraserPreferences({ preset: '6b' })
      expect(loadEraserPreferences().preset).toBe('6b')
    })
  })

  describe('品牌偏好', () => {
    it('brand应该正确保存和加载', () => {
      saveEraserPreferences({ brand: 'sakura' })
      let loaded = loadEraserPreferences()
      expect(loaded.brand).toBe('sakura')

      saveEraserPreferences({ brand: 'uni' })
      loaded = loadEraserPreferences()
      expect(loaded.brand).toBe('uni')
    })

    it('brand默认值应该为default', () => {
      const prefs = loadEraserPreferences()
      expect(prefs.brand).toBe('default')
    })

    it('brand应该可以独立修改', () => {
      // 设置其他偏好
      saveEraserPreferences({ preset: '6b', audioEnabled: false })

      // 只修改品牌
      saveEraserPreferences({ brand: 'staedtler' })

      const loaded = loadEraserPreferences()
      expect(loaded.preset).toBe('6b') // 保持不变
      expect(loaded.audioEnabled).toBe(false) // 保持不变
      expect(loaded.brand).toBe('staedtler') // 修改生效
    })
  })

  describe('清除功能', () => {
    it('clearEraserPreferences应该清除所有保存的偏好', () => {
      saveEraserPreferences({ preset: '6b', shape: 'chisel', brand: 'sakura' })
      expect(loadEraserPreferences().preset).toBe('6b')

      clearEraserPreferences()
      const loaded = loadEraserPreferences()

      // 应该恢复默认值
      expect(loaded.preset).toBe('4b')
      expect(loaded.brand).toBe('default')
      expect(loaded.shape).toBe('circle')
    })

    it('清除空存储应该安全', () => {
      expect(() => clearEraserPreferences()).not.toThrow()
    })
  })

  describe('配置生成', () => {
    it('应该根据偏好生成正确的橡皮擦配置', () => {
      const prefs: EraserUserPreferences = {
        preset: '2b',
        brand: 'default',
        shape: 'square',
        baseRadius: 15,
        audioEnabled: false,
        rotation: 30,
        particlesEnabled: true,
        shortcuts: {},
      }
      const config = getEraserConfigFromPreferences(prefs)

      expect(config.shape).toBe('square')
      expect(config.baseRadius).toBe(15)
      expect(config.audioEnabled).toBe(false)
      expect(config.rotation).toBe(30)
      // 预设的硬度等参数应该来自2B配置
      expect(config.hardness).toBe(
        ERASER_PRESET_CONFIGS['2b'].hardness * ERASER_BRAND_CONFIGS['default'].hardnessModifier
      )
      expect(config.wearRate).toBe(
        ERASER_PRESET_CONFIGS['2b'].wearRate * ERASER_BRAND_CONFIGS['default'].wearRateModifier
      )
    })

    it('4B预设应该生成对应配置', () => {
      const prefs: EraserUserPreferences = {
        preset: '4b',
        brand: 'default',
        shape: 'circle',
        baseRadius: DEFAULT_ERASER_CONFIG.baseRadius,
        audioEnabled: true,
        rotation: 0,
        particlesEnabled: true,
        shortcuts: {},
      }
      const config = getEraserConfigFromPreferences(prefs)

      expect(config.hardness).toBe(
        ERASER_PRESET_CONFIGS['4b'].hardness * ERASER_BRAND_CONFIGS['default'].hardnessModifier
      )
    })

    it('6B预设应该生成对应配置', () => {
      const prefs: EraserUserPreferences = {
        preset: '6b',
        brand: 'default',
        shape: 'circle',
        baseRadius: DEFAULT_ERASER_CONFIG.baseRadius,
        audioEnabled: true,
        rotation: 0,
        particlesEnabled: true,
        shortcuts: {},
      }
      const config = getEraserConfigFromPreferences(prefs)

      expect(config.hardness).toBe(
        ERASER_PRESET_CONFIGS['6b'].hardness * ERASER_BRAND_CONFIGS['default'].hardnessModifier
      )
    })

    it('品牌修正系数应该正确应用', () => {
      const prefs: EraserUserPreferences = {
        preset: '4b',
        brand: 'sakura',
        shape: 'circle',
        baseRadius: 12,
        audioEnabled: true,
        rotation: 0,
        particlesEnabled: true,
        shortcuts: {},
      }
      const config = getEraserConfigFromPreferences(prefs)

      // 樱花橡皮应该更软、更耐用（磨损更慢）
      expect(config.hardness).toBeLessThan(ERASER_PRESET_CONFIGS['4b'].hardness)
      expect(config.wearRate).toBeLessThan(ERASER_PRESET_CONFIGS['4b'].wearRate)
    })
  })

  describe('向后兼容', () => {
    it('旧版本存储数据（缺少particlesEnabled）应该补全默认值', () => {
      // 模拟旧版本数据（没有particlesEnabled字段）
      const oldData = {
        preset: '4b',
        brand: 'default',
        shape: 'circle',
        baseRadius: 12,
        audioEnabled: true,
        rotation: 0,
        // 注意：没有 particlesEnabled 字段
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(oldData))
      const loaded = loadEraserPreferences()

      // 旧字段应该正确加载
      expect(loaded.preset).toBe('4b')
      expect(loaded.shape).toBe('circle')
      // 新字段应该有默认值
      expect(loaded.particlesEnabled).toBe(true)
    })

    it('旧版本存储数据（缺少brand）应该补全默认值', () => {
      // 模拟旧版本数据（没有brand字段）
      const oldData = {
        preset: '4b',
        shape: 'circle',
        baseRadius: 12,
        audioEnabled: true,
        rotation: 0,
        particlesEnabled: true,
        // 注意：没有 brand 字段
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(oldData))
      const loaded = loadEraserPreferences()

      // 旧字段应该正确加载
      expect(loaded.preset).toBe('4b')
      expect(loaded.shape).toBe('circle')
      // 新字段应该有默认值
      expect(loaded.brand).toBe('default')
    })

    it('部分字段缺失应该使用默认值', () => {
      const partialData = {
        preset: '6b',
        // 缺少其他字段
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(partialData))
      const loaded = loadEraserPreferences()

      expect(loaded.preset).toBe('6b')
      expect(loaded.brand).toBe('default') // 默认值
      expect(loaded.shape).toBe('circle') // 默认值
      expect(loaded.audioEnabled).toBe(true) // 默认值
      expect(loaded.particlesEnabled).toBe(true) // 默认值
    })
  })

  describe('异常处理与优雅降级', () => {
    it('localStorage不可用时应该静默失败并返回默认值', () => {
      // 模拟localStorage抛出异常
      const originalGetItem = localStorage.getItem
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage disabled')
      })

      const prefs = loadEraserPreferences()
      expect(prefs.preset).toBe('4b') // 应该返回默认值
      expect(prefs.brand).toBe('default') // 应该返回默认值

      localStorage.getItem = originalGetItem
    })

    it('JSON解析失败应该返回默认值', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json {{{')

      const prefs = loadEraserPreferences()
      expect(prefs.preset).toBe('4b') // 应该返回默认值
      expect(prefs.brand).toBe('default') // 应该返回默认值
    })

    it('保存失败应该静默失败', () => {
      const originalSetItem = localStorage.setItem
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded')
      })

      expect(() => saveEraserPreferences({ preset: '6b' })).not.toThrow()

      localStorage.setItem = originalSetItem
    })

    it('清除失败应该静默失败', () => {
      const originalRemoveItem = localStorage.removeItem
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Permission denied')
      })

      expect(() => clearEraserPreferences()).not.toThrow()

      localStorage.removeItem = originalRemoveItem
    })
  })

  describe('边界情况', () => {
    it('保存空对象应该不改变现有值', () => {
      saveEraserPreferences({ preset: '6b', brand: 'sakura' })
      saveEraserPreferences({}) // 空对象

      const loaded = loadEraserPreferences()
      expect(loaded.preset).toBe('6b') // 应该保持不变
      expect(loaded.brand).toBe('sakura') // 应该保持不变
    })

    it('保存undefined值应该被忽略', () => {
      saveEraserPreferences({ preset: '6b', brand: 'sakura' })
      saveEraserPreferences({ preset: undefined as any, brand: undefined as any })

      const loaded = loadEraserPreferences()
      expect(loaded.preset).toBe('6b') // 应该保持不变
      expect(loaded.brand).toBe('sakura') // 应该保持不变
    })

    it('极端数值应该正确保存', () => {
      saveEraserPreferences({
        baseRadius: 0,
        rotation: 360,
      })

      const loaded = loadEraserPreferences()
      expect(loaded.baseRadius).toBe(0)
      expect(loaded.rotation).toBe(360)
    })
  })

  describe('粒子偏好', () => {
    it('particlesEnabled应该正确保存和加载', () => {
      saveEraserPreferences({ particlesEnabled: false })
      let loaded = loadEraserPreferences()
      expect(loaded.particlesEnabled).toBe(false)

      saveEraserPreferences({ particlesEnabled: true })
      loaded = loadEraserPreferences()
      expect(loaded.particlesEnabled).toBe(true)
    })

    it('particlesEnabled默认值应该为true', () => {
      const prefs = loadEraserPreferences()
      expect(prefs.particlesEnabled).toBe(true)
    })

    it('particlesEnabled应该可以独立修改', () => {
      // 设置其他偏好
      saveEraserPreferences({ preset: '6b', audioEnabled: false })

      // 只修改粒子开关
      saveEraserPreferences({ particlesEnabled: false })

      const loaded = loadEraserPreferences()
      expect(loaded.preset).toBe('6b') // 保持不变
      expect(loaded.audioEnabled).toBe(false) // 保持不变
      expect(loaded.particlesEnabled).toBe(false) // 修改生效
    })
  })
})
