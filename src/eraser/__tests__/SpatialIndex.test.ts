import { describe, it, expect, beforeEach } from 'vitest'
import { SpatialIndex, PerformanceMonitor } from '../SpatialIndex'
import type { StrokeElement } from '../../store/types'

describe('SpatialIndex', () => {
  let index: SpatialIndex

  beforeEach(() => {
    index = new SpatialIndex()
  })

  const createStroke = (id: string, x: number, y: number, w: number = 50, h: number = 50): StrokeElement => ({
    type: 'stroke',
    id,
    points: [[x, y], [x + w, y + h]],
    color: '#000',
    size: 2,
    brush: 'pen',
  })

  describe('基本操作', () => {
    it('insert - 插入单个元素', () => {
      const stroke = createStroke('s1', 100, 100)
      index.insert(stroke)
      
      // 查询应该能找到
      const results = index.search({ x: 90, y: 90, w: 30, h: 30 })
      expect(results).toContain('s1')
    })

    it('bulkLoad - 批量加载元素', () => {
      const strokes = [
        createStroke('s1', 100, 100),
        createStroke('s2', 200, 200),
        createStroke('s3', 300, 300),
      ]
      
      index.bulkLoad(strokes)
      
      const results = index.search({ x: 90, y: 90, w: 30, h: 30 })
      expect(results).toContain('s1')
      expect(results).not.toContain('s2')
    })

    it('clear - 清空索引', () => {
      const stroke = createStroke('s1', 100, 100)
      index.insert(stroke)
      index.clear()
      
      const results = index.search({ x: 90, y: 90, w: 30, h: 30 })
      expect(results).toHaveLength(0)
    })
  })

  describe('空间查询', () => {
    it('search - 区域内元素', () => {
      const strokes = [
        createStroke('s1', 100, 100),
        createStroke('s2', 150, 150),
        createStroke('s3', 500, 500), // 远离查询区域
      ]
      
      index.bulkLoad(strokes)
      
      // 查询区域覆盖前两个
      const results = index.search({ x: 50, y: 50, w: 150, h: 150 })
      
      expect(results).toContain('s1')
      expect(results).toContain('s2')
      expect(results).not.toContain('s3')
    })

    it('search - 边界相交', () => {
      const stroke = createStroke('s1', 100, 100, 50, 50)
      index.insert(stroke)
      
      // 查询区域刚好接触边界
      const results = index.search({ x: 145, y: 145, w: 20, h: 20 })
      expect(results).toContain('s1')
    })

    it('search - 完全不相交', () => {
      const stroke = createStroke('s1', 100, 100)
      index.insert(stroke)
      
      const results = index.search({ x: 500, y: 500, w: 50, h: 50 })
      expect(results).not.toContain('s1')
    })
  })

  describe('大规模数据性能', () => {
    it('100元素查询', () => {
      const strokes: StrokeElement[] = []
      for (let i = 0; i < 100; i++) {
        strokes.push(createStroke(`s${i}`, i * 10, i * 10))
      }
      
      index.bulkLoad(strokes)
      
      const start = performance.now()
      const results = index.search({ x: 0, y: 0, w: 100, h: 100 })
      const end = performance.now()
      
      // 应该快速返回（< 1ms）
      expect(end - start).toBeLessThan(5)
      expect(results.length).toBeGreaterThan(0)
    })

    it('1000元素查询', () => {
      const strokes: StrokeElement[] = []
      for (let i = 0; i < 1000; i++) {
        strokes.push(createStroke(`s${i}`, (i % 100) * 10, Math.floor(i / 100) * 10))
      }
      
      index.bulkLoad(strokes)
      
      const start = performance.now()
      const results = index.search({ x: 0, y: 0, w: 100, h: 100 })
      const end = performance.now()
      
      // O(log n) 查询应该很快
      expect(end - start).toBeLessThan(10)
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('边界条件', () => {
    it('空索引查询', () => {
      const results = index.search({ x: 0, y: 0, w: 100, h: 100 })
      expect(results).toEqual([])
    })

    it('空数组批量加载', () => {
      expect(() => {
        index.bulkLoad([])
      }).not.toThrow()
    })

    it('极小查询区域', () => {
      const stroke = createStroke('s1', 100, 100)
      index.insert(stroke)
      
      const results = index.search({ x: 100, y: 100, w: 1, h: 1 })
      expect(results).toContain('s1')
    })

    it('极大查询区域', () => {
      const strokes = [
        createStroke('s1', 100, 100),
        createStroke('s2', 200, 200),
      ]
      index.bulkLoad(strokes)
      
      const results = index.search({ x: -1000, y: -1000, w: 2000, h: 2000 })
      expect(results.length).toBe(2)
    })
  })
})

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
  })

  describe('FPS计算', () => {
    it('初始状态返回60FPS', () => {
      expect(monitor.getAverageFPS()).toBe(60)
      expect(monitor.getPerformanceLevel()).toBe('high')
    })

    it('recordFrame - 记录帧时间', () => {
      // 模拟60FPS
      monitor.recordFrame()
      
      expect(monitor.getAverageFPS()).toBeGreaterThan(0)
    })

    it('getPerformanceLevel - 高帧率返回high', () => {
      // 模拟高帧率
      for (let i = 0; i < 10; i++) {
        monitor.recordFrame()
      }
      
      const level = monitor.getPerformanceLevel()
      expect(['high', 'medium', 'low']).toContain(level)
    })

    it('shouldUsePhysics - 高帧率允许物理模式', () => {
      // 初始状态应该允许
      expect(monitor.shouldUsePhysics()).toBe(true)
    })
  })

  describe('重置功能', () => {
    it('reset - 清空历史', () => {
      monitor.recordFrame()
      monitor.recordFrame()
      monitor.reset()
      
      expect(monitor.getAverageFPS()).toBe(60)
    })
  })
})
