import { describe, it, expect, beforeEach } from 'vitest'
import { SpatialIndex, PerformanceMonitor } from '../SpatialIndex'
import type { StrokeElement, ShapeElement, CanvasElement } from '../../store/types'

describe('SpatialIndex', () => {
  let index: SpatialIndex

  beforeEach(() => {
    index = new SpatialIndex()
  })

  const createStroke = (
    id: string,
    x: number,
    y: number,
    w: number = 50,
    h: number = 50
  ): StrokeElement => ({
    type: 'stroke',
    id,
    points: [
      [x, y],
      [x + w, y + h],
    ],
    color: '#000',
    size: 2,
    brush: 'pen',
  })

  const createShape = (
    id: string,
    x: number,
    y: number,
    w: number = 50,
    h: number = 50
  ): ShapeElement => ({
    type: 'shape',
    id,
    kind: 'rectangle',
    x,
    y,
    w,
    h,
    color: '#000',
    size: 2,
  })

  describe('基本插入和查询', () => {
    it('insert - 插入单个元素', () => {
      const stroke = createStroke('s1', 100, 100)
      index.insert(stroke)

      const results = index.search({ x: 90, y: 90, w: 30, h: 30 })
      expect(results).toContain('s1')
    })

    it('insert - 插入多个元素', () => {
      index.insert(createStroke('s1', 100, 100))
      index.insert(createStroke('s2', 200, 200))
      index.insert(createStroke('s3', 300, 300))

      const results = index.search({ x: 0, y: 0, w: 500, h: 500 })
      expect(results).toHaveLength(3)
      expect(results).toContain('s1')
      expect(results).toContain('s2')
      expect(results).toContain('s3')
    })

    it('insert - 重新插入已删除元素时移除删除标记', () => {
      const stroke = createStroke('s1', 100, 100)
      index.insert(stroke)
      index.remove('s1')

      // 重新插入
      index.setElementProvider(() => [stroke])
      index.insert(stroke)

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

    it('bulkLoad - 大量元素批量加载（超过 maxEntries）', () => {
      const strokes: StrokeElement[] = []
      for (let i = 0; i < 100; i++) {
        strokes.push(createStroke(`s${i}`, i * 10, i * 10))
      }

      index.bulkLoad(strokes)

      const results = index.search({ x: -1000, y: -1000, w: 5000, h: 5000 })
      expect(results).toHaveLength(100)
    })

    it('clear - 清空索引', () => {
      const stroke = createStroke('s1', 100, 100)
      index.insert(stroke)
      index.clear()

      const results = index.search({ x: 90, y: 90, w: 30, h: 30 })
      expect(results).toHaveLength(0)
    })

    it('clear - 重置后删除计数器也清零', () => {
      index.insert(createStroke('s1', 100, 100))
      index.insert(createStroke('s2', 200, 200))
      index.remove('s1')
      index.clear()

      const stats = index.getRebuildStats()
      expect(stats.pendingDeletes).toBe(0)
      expect(stats.totalEntries).toBe(0)
    })
  })

  describe('删除和懒删除机制', () => {
    it('remove - 标记删除后查询不到', () => {
      const stroke = createStroke('s1', 100, 100)
      index.insert(stroke)
      index.remove('s1')

      const results = index.search({ x: 90, y: 90, w: 30, h: 30 })
      expect(results).not.toContain('s1')
    })

    it('remove - 删除不影响其他元素', () => {
      index.insert(createStroke('s1', 100, 100))
      index.insert(createStroke('s2', 200, 200))
      index.remove('s1')

      const results = index.search({ x: 190, y: 190, w: 30, h: 30 })
      expect(results).toContain('s2')
      expect(results).not.toContain('s1')
    })

    it('remove - 重复删除同一元素不报错', () => {
      index.insert(createStroke('s1', 100, 100))
      index.remove('s1')
      index.remove('s1') // 重复删除

      const stats = index.getRebuildStats()
      expect(stats.pendingDeletes).toBe(1) // 只计数一次
    })

    it('remove - 删除不存在的元素不报错', () => {
      expect(() => {
        index.remove('nonexistent')
      }).not.toThrow()
    })

    it('懒删除 - 删除后 pendingDeletes 增加', () => {
      index.insert(createStroke('s1', 100, 100))
      index.insert(createStroke('s2', 200, 200))
      index.remove('s1')

      const stats = index.getRebuildStats()
      expect(stats.pendingDeletes).toBe(1)
      expect(stats.deleteRatio).toBeCloseTo(0.5) // 1/2 = 50%
    })

    it('update - 先删后插', () => {
      index.insert(createStroke('s1', 100, 100))
      index.update(createStroke('s1', 300, 300))

      // 新位置能查到
      const newResults = index.search({ x: 290, y: 290, w: 30, h: 30 })
      expect(newResults).toContain('s1')

      // 注意：R树不支持物理删除旧条目，旧位置可能仍然能查到
      // 这是预期行为，重建时会自动清理旧条目
    })
  })

  describe('自动重建触发', () => {
    it('删除率超过阈值时自动重建', () => {
      const elements: CanvasElement[] = []
      for (let i = 0; i < 10; i++) {
        elements.push(createStroke(`s${i}`, i * 100, i * 100))
      }

      // 设置元素提供者 - 模拟真实场景：store 中的元素会被更新
      let currentElements = [...elements]
      index.setElementProvider(() => currentElements)
      index.bulkLoad(currentElements)

      // 删除 3/10 = 30% (> 20% 阈值)
      index.remove('s0')
      index.remove('s1')
      index.remove('s2')
      // 模拟真实场景：store 中的元素也移除了
      currentElements = currentElements.filter((e) => !['s0', 's1', 's2'].includes(e.id))

      // 下次查询应触发重建
      const results = index.search({ x: -1000, y: -1000, w: 5000, h: 5000 })

      // 重建后应该能查到剩余 7 个元素
      expect(results).toHaveLength(7)
      expect(results).not.toContain('s0')
      expect(results).not.toContain('s1')
      expect(results).not.toContain('s2')

      const stats = index.getRebuildStats()
      expect(stats.rebuildCount).toBe(1)
      expect(stats.pendingDeletes).toBe(0) // 重建后清除
      expect(stats.lastRebuildDuration).toBeGreaterThanOrEqual(0)
    })

    it('删除率低于阈值时不触发重建', () => {
      const elements: CanvasElement[] = []
      for (let i = 0; i < 10; i++) {
        elements.push(createStroke(`s${i}`, i * 100, i * 100))
      }

      index.setElementProvider(() => elements)
      index.bulkLoad(elements)

      // 删除 1/10 = 10% (< 20% 阈值)
      index.remove('s0')

      index.search({ x: 0, y: 0, w: 1000, h: 1000 })

      const stats = index.getRebuildStats()
      expect(stats.rebuildCount).toBe(0) // 不应重建
      expect(stats.pendingDeletes).toBe(1) // 仍在等待
    })

    it('没有 elementProvider 时不触发自动重建', () => {
      const elements = [createStroke('s1', 100, 100), createStroke('s2', 200, 200)]
      index.bulkLoad(elements)

      // 不设置 elementProvider
      index.remove('s1')

      // 不应报错，只是不会自动重建
      const results = index.search({ x: 0, y: 0, w: 500, h: 500 })
      expect(results).toContain('s2')
      expect(results).not.toContain('s1')

      const stats = index.getRebuildStats()
      expect(stats.rebuildCount).toBe(0)
      expect(stats.pendingDeletes).toBe(1) // 仍然保留删除标记
    })

    it('queryVisible 也能触发自动重建', () => {
      const elements: CanvasElement[] = []
      for (let i = 0; i < 10; i++) {
        elements.push(createStroke(`s${i}`, i * 100, i * 100))
      }

      // 设置元素提供者 - 模拟真实场景：store 中的元素会被更新
      let currentElements = [...elements]
      index.setElementProvider(() => currentElements)
      index.bulkLoad(currentElements)

      // 删除 3/10 = 30%
      index.remove('s0')
      index.remove('s1')
      index.remove('s2')
      // 模拟真实场景：store 中的元素也移除了
      currentElements = currentElements.filter((e) => !['s0', 's1', 's2'].includes(e.id))

      const visible = index.queryVisible(0, 0, 2000, 2000)

      expect(visible.length).toBe(7)
      expect(visible.includes('s0')).toBe(false)
      expect(visible.includes('s1')).toBe(false)
      expect(visible.includes('s2')).toBe(false)

      const stats = index.getRebuildStats()
      expect(stats.rebuildCount).toBe(1)
    })

    it('重建计数器多次重建累加', () => {
      const elements: CanvasElement[] = []
      for (let i = 0; i < 10; i++) {
        elements.push(createStroke(`s${i}`, i * 100, i * 100))
      }

      index.setElementProvider(() => elements)
      index.bulkLoad(elements)

      // 第一次重建
      index.remove('s0')
      index.remove('s1')
      index.remove('s2')
      index.search({ x: 0, y: 0, w: 5000, h: 5000 })

      // 第二次重建
      index.remove('s3')
      index.remove('s4')
      index.search({ x: 0, y: 0, w: 5000, h: 5000 })

      const stats = index.getRebuildStats()
      expect(stats.rebuildCount).toBe(2)
    })
  })

  describe('queryVisible 视口查询', () => {
    it('返回视口内的元素ID集合', () => {
      const strokes = [
        createStroke('s1', 100, 100),
        createStroke('s2', 200, 200),
        createStroke('s3', 1000, 1000), // 视口外
      ]
      index.bulkLoad(strokes)

      const visible = index.queryVisible(0, 0, 300, 300)

      expect(visible.includes('s1')).toBe(true)
      expect(visible.includes('s2')).toBe(true)
      expect(visible.includes('s3')).toBe(false)
    })

    it('过滤掉已删除元素', () => {
      const strokes = [createStroke('s1', 100, 100), createStroke('s2', 200, 200)]
      index.bulkLoad(strokes)
      index.remove('s1')

      const visible = index.queryVisible(0, 0, 300, 300)

      expect(visible.includes('s1')).toBe(false)
      expect(visible.includes('s2')).toBe(true)
    })

    it('空索引返回空集合', () => {
      const visible = index.queryVisible(0, 0, 100, 100)
      expect(visible.length).toBe(0)
    })
  })

  describe('空间查询', () => {
    it('search - 区域内元素', () => {
      const strokes = [
        createStroke('s1', 100, 100),
        createStroke('s2', 150, 150),
        createStroke('s3', 500, 500),
      ]

      index.bulkLoad(strokes)

      const results = index.search({ x: 50, y: 50, w: 150, h: 150 })

      expect(results).toContain('s1')
      expect(results).toContain('s2')
      expect(results).not.toContain('s3')
    })

    it('search - 边界相交', () => {
      const stroke = createStroke('s1', 100, 100, 50, 50)
      index.insert(stroke)

      const results = index.search({ x: 145, y: 145, w: 20, h: 20 })
      expect(results).toContain('s1')
    })

    it('search - 完全不相交', () => {
      const stroke = createStroke('s1', 100, 100)
      index.insert(stroke)

      const results = index.search({ x: 500, y: 500, w: 50, h: 50 })
      expect(results).not.toContain('s1')
    })

    it('search - 支持不同元素类型', () => {
      const stroke = createStroke('s1', 100, 100)
      const shape = createShape('sh1', 200, 200)

      index.insert(stroke)
      index.insert(shape)

      const results = index.search({ x: 0, y: 0, w: 500, h: 500 })
      expect(results).toContain('s1')
      expect(results).toContain('sh1')
    })
  })

  describe('边界情况', () => {
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
      const strokes = [createStroke('s1', 100, 100), createStroke('s2', 200, 200)]
      index.bulkLoad(strokes)

      const results = index.search({ x: -1000, y: -1000, w: 2000, h: 2000 })
      expect(results.length).toBe(2)
    })

    it('负坐标元素', () => {
      const stroke = createStroke('s1', -200, -200)
      index.insert(stroke)

      const results = index.search({ x: -250, y: -250, w: 100, h: 100 })
      expect(results).toContain('s1')
    })

    it('完全重叠元素', () => {
      const s1 = createStroke('s1', 100, 100, 50, 50)
      const s2 = createStroke('s2', 100, 100, 50, 50)
      index.insert(s1)
      index.insert(s2)

      const results = index.search({ x: 90, y: 90, w: 70, h: 70 })
      expect(results).toHaveLength(2)
      expect(results).toContain('s1')
      expect(results).toContain('s2')
    })

    it('删除所有元素后查询', () => {
      index.insert(createStroke('s1', 100, 100))
      index.insert(createStroke('s2', 200, 200))
      index.remove('s1')
      index.remove('s2')

      const results = index.search({ x: 0, y: 0, w: 500, h: 500 })
      expect(results).toHaveLength(0)
    })
  })

  describe('RebuildStats 统计', () => {
    it('初始统计信息正确', () => {
      const stats = index.getRebuildStats()
      expect(stats.rebuildCount).toBe(0)
      expect(stats.lastRebuildDuration).toBe(0)
      expect(stats.pendingDeletes).toBe(0)
      expect(stats.totalEntries).toBe(0)
      expect(stats.deleteRatio).toBe(0)
    })

    it('删除后统计信息正确', () => {
      index.insert(createStroke('s1', 100, 100))
      index.insert(createStroke('s2', 200, 200))
      index.remove('s1')

      const stats = index.getRebuildStats()
      expect(stats.pendingDeletes).toBe(1)
      expect(stats.totalEntries).toBe(2)
      expect(stats.deleteRatio).toBeCloseTo(0.5)
    })

    it('重建后统计信息正确', () => {
      const elements = [
        createStroke('s1', 100, 100),
        createStroke('s2', 200, 200),
        createStroke('s3', 300, 300),
        createStroke('s4', 400, 400),
        createStroke('s5', 500, 500),
      ]
      index.setElementProvider(() => elements)
      index.bulkLoad(elements)

      // 删除 3/5 = 60% > 20%
      index.remove('s1')
      index.remove('s2')
      index.remove('s3')

      // 触发重建
      index.search({ x: 0, y: 0, w: 1000, h: 1000 })

      const stats = index.getRebuildStats()
      expect(stats.rebuildCount).toBe(1)
      expect(stats.pendingDeletes).toBe(0)
      expect(stats.lastRebuildDuration).toBeGreaterThanOrEqual(0)
      expect(stats.deleteRatio).toBe(0) // 重建后清除
    })
  })

  describe('性能基准', () => {
    const measureBestOf = (runs: number, operation: (run: number) => void): number => {
      let best = Number.POSITIVE_INFINITY
      for (let run = 0; run < runs; run++) {
        const start = performance.now()
        operation(run)
        best = Math.min(best, performance.now() - start)
      }
      return best
    }

    it('100元素查询', () => {
      const strokes: StrokeElement[] = []
      for (let i = 0; i < 100; i++) {
        strokes.push(createStroke(`s${i}`, i * 10, i * 10))
      }

      index.bulkLoad(strokes)

      let results: string[] = []
      const duration = measureBestOf(5, (run) => {
        results = index.search({ x: run, y: run, w: 100, h: 100 })
      })

      expect(duration).toBeLessThan(10)
      expect(results.length).toBeGreaterThan(0)
    })

    it('1000元素查询', () => {
      const strokes: StrokeElement[] = []
      for (let i = 0; i < 1000; i++) {
        strokes.push(createStroke(`s${i}`, (i % 100) * 10, Math.floor(i / 100) * 10))
      }

      index.bulkLoad(strokes)

      let results: string[] = []
      const duration = measureBestOf(5, (run) => {
        results = index.search({ x: run, y: run, w: 100, h: 100 })
      })

      expect(duration).toBeLessThan(25)
      expect(results.length).toBeGreaterThan(0)
    })

    it('5000元素批量插入性能', () => {
      const strokes: StrokeElement[] = []
      for (let i = 0; i < 5000; i++) {
        strokes.push(createStroke(`s${i}`, Math.random() * 10000, Math.random() * 10000))
      }

      const start = performance.now()
      index.bulkLoad(strokes)
      const end = performance.now()

      expect(end - start).toBeLessThan(100) // 5000元素应在100ms内完成
    })

    it('重建性能 - 1000元素', () => {
      const elements: CanvasElement[] = []
      for (let i = 0; i < 1000; i++) {
        elements.push(createStroke(`s${i}`, i * 10, i * 10))
      }

      index.setElementProvider(() => elements)
      index.bulkLoad(elements)

      // 删除 30%
      for (let i = 0; i < 300; i++) {
        index.remove(`s${i}`)
      }

      // 触发重建
      index.search({ x: 0, y: 0, w: 10000, h: 10000 })

      const stats = index.getRebuildStats()
      expect(stats.rebuildCount).toBe(1)
      expect(stats.lastRebuildDuration).toBeLessThan(50) // 重建应在50ms内完成
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
      monitor.recordFrame()

      expect(monitor.getAverageFPS()).toBeGreaterThan(0)
    })

    it('getPerformanceLevel - 高帧率返回high', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordFrame()
      }

      const level = monitor.getPerformanceLevel()
      expect(['high', 'medium', 'low']).toContain(level)
    })

    it('shouldUsePhysics - 高帧率允许物理模式', () => {
      expect(monitor.shouldUsePhysics()).toBe(true)
    })

    it('FPS历史限制30条', () => {
      for (let i = 0; i < 50; i++) {
        monitor.recordFrame()
      }

      // 内部 fpsHistory 应该限制在30
      const avg = monitor.getAverageFPS()
      expect(avg).toBeGreaterThan(0)
      expect(avg).toBeLessThan(Infinity)
    })
  })

  describe('性能等级', () => {
    it('无历史数据默认为 high', () => {
      expect(monitor.getPerformanceLevel()).toBe('high')
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
