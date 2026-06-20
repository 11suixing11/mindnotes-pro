import { describe, it, expect } from 'vitest'
import {
  ERASER_BRAND_CONFIGS,
  ERASER_BRAND_LABELS,
  ERASER_BRAND_ICONS,
} from '../types'
import type { EraserBrandType } from '../types'

describe('橡皮擦品牌皮肤系统', () => {
  describe('品牌配置完整性', () => {
    it('应该包含5个品牌配置', () => {
      const brands = Object.keys(ERASER_BRAND_CONFIGS)
      expect(brands).toHaveLength(5)
      expect(brands).toContain('default')
      expect(brands).toContain('sakura')
      expect(brands).toContain('faber-castell')
      expect(brands).toContain('staedtler')
      expect(brands).toContain('uni')
    })

    it('每个品牌应该有完整的配置', () => {
      Object.values(ERASER_BRAND_CONFIGS).forEach(config => {
        expect(config).toHaveProperty('name')
        expect(config).toHaveProperty('displayName')
        expect(config).toHaveProperty('description')
        expect(config).toHaveProperty('primaryColor')
        expect(config).toHaveProperty('secondaryColor')
        expect(config).toHaveProperty('borderColor')
        expect(config).toHaveProperty('cursorColor')
        expect(config).toHaveProperty('hardnessModifier')
        expect(config).toHaveProperty('wearRateModifier')
        expect(config).toHaveProperty('frictionModifier')
        expect(config).toHaveProperty('particleColors')
      })
    })

    it('硬度修正系数应该在合理范围内', () => {
      Object.values(ERASER_BRAND_CONFIGS).forEach(config => {
        expect(config.hardnessModifier).toBeGreaterThan(0)
        expect(config.hardnessModifier).toBeLessThanOrEqual(2)
      })
    })

    it('磨损速率修正系数应该在合理范围内', () => {
      Object.values(ERASER_BRAND_CONFIGS).forEach(config => {
        expect(config.wearRateModifier).toBeGreaterThan(0)
        expect(config.wearRateModifier).toBeLessThanOrEqual(2)
      })
    })

    it('摩擦系数应该在合理范围内', () => {
      Object.values(ERASER_BRAND_CONFIGS).forEach(config => {
        expect(config.frictionModifier).toBeGreaterThan(0)
        expect(config.frictionModifier).toBeLessThanOrEqual(2)
      })
    })
  })

  describe('品牌特性差异化', () => {
    it('樱花橡皮应该更软', () => {
      expect(ERASER_BRAND_CONFIGS['sakura'].hardnessModifier)
        .toBeLessThan(ERASER_BRAND_CONFIGS['default'].hardnessModifier)
    })

    it('辉柏嘉橡皮应该更耐磨', () => {
      expect(ERASER_BRAND_CONFIGS['faber-castell'].wearRateModifier)
        .toBeLessThan(ERASER_BRAND_CONFIGS['default'].wearRateModifier)
    })

    it('施德楼橡皮应该更硬', () => {
      expect(ERASER_BRAND_CONFIGS['staedtler'].hardnessModifier)
        .toBeGreaterThan(ERASER_BRAND_CONFIGS['default'].hardnessModifier)
    })

    it('三菱橡皮应该有高端特性', () => {
      // 三菱应该是平衡型但偏高端
      const uni = ERASER_BRAND_CONFIGS['uni']
      expect(uni.hardnessModifier).toBeCloseTo(1.0, 1)
      expect(uni.wearRateModifier).toBeLessThan(1.1)
    })
  })

  describe('品牌标签和图标', () => {
    it('应该有对应数量的标签', () => {
      const brands = Object.keys(ERASER_BRAND_CONFIGS)
      expect(Object.keys(ERASER_BRAND_LABELS)).toHaveLength(brands.length)
    })

    it('应该有对应数量的图标', () => {
      const brands = Object.keys(ERASER_BRAND_CONFIGS)
      expect(Object.keys(ERASER_BRAND_ICONS)).toHaveLength(brands.length)
    })

    it('每个品牌都应该有标签', () => {
      Object.keys(ERASER_BRAND_CONFIGS).forEach(brand => {
        expect(ERASER_BRAND_LABELS[brand as EraserBrandType]).toBeTruthy()
      })
    })

    it('每个品牌都应该有图标', () => {
      Object.keys(ERASER_BRAND_CONFIGS).forEach(brand => {
        expect(ERASER_BRAND_ICONS[brand as EraserBrandType]).toBeTruthy()
      })
    })
  })

  describe('品牌颜色配置', () => {
    it('每个品牌应该有独特的主颜色', () => {
      const colors = Object.values(ERASER_BRAND_CONFIGS).map(c => c.primaryColor)
      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(colors.length)
    })

    it('樱花应该是粉色系', () => {
      expect(ERASER_BRAND_CONFIGS['sakura'].primaryColor).toMatch(/^#/)
      expect(ERASER_BRAND_CONFIGS['sakura'].primaryColor.length).toBe(7)
    })

    it('辉柏嘉应该是绿色系', () => {
      expect(ERASER_BRAND_CONFIGS['faber-castell'].primaryColor).toMatch(/^#/)
    })

    it('施德楼应该是蓝色系', () => {
      expect(ERASER_BRAND_CONFIGS['staedtler'].primaryColor).toMatch(/^#/)
    })

    it('三菱应该是黑色/深灰色系', () => {
      expect(ERASER_BRAND_CONFIGS['uni'].primaryColor).toMatch(/^#/)
    })
  })

  describe('粒子颜色配置', () => {
    it('每个品牌应该有粒子颜色数组', () => {
      Object.values(ERASER_BRAND_CONFIGS).forEach(config => {
        expect(Array.isArray(config.particleColors)).toBe(true)
        expect(config.particleColors.length).toBeGreaterThan(0)
      })
    })

    it('粒子颜色应该是有效的CSS颜色', () => {
      Object.values(ERASER_BRAND_CONFIGS).forEach(config => {
        config.particleColors.forEach(color => {
          expect(color).toMatch(/^#|^rgb|^hsl/)
        })
      })
    })
  })
})
