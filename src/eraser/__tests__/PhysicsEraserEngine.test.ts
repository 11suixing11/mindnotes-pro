import { describe, it, expect, beforeEach } from 'vitest'
import { PhysicsEraserEngine } from '../PhysicsEraserEngine'
import type { StrokeElement } from '../../store/types'
import type { EraserPoint, Intersection } from '../types'

describe('PhysicsEraserEngine', () => {
  let engine: PhysicsEraserEngine

  beforeEach(() => {
    engine = new PhysicsEraserEngine()
    engine.setBaseSize(10)
  })

  describe('物理公式计算', () => {
    it('computeEffectiveRadius - 压力影响半径', () => {
      // 压力越大，半径越大
      const r1 = engine.computeEffectiveRadius(0)
      const r2 = engine.computeEffectiveRadius(0.5)
      const r3 = engine.computeEffectiveRadius(1)
      
      expect(r1).toBeLessThan(r2)
      expect(r2).toBeLessThan(r3)
    })

    it('computeEffectiveRadius - 硬度影响半径', () => {
      const softEngine = new PhysicsEraserEngine({ hardness: 0.1 })
      const hardEngine = new PhysicsEraserEngine({ hardness: 0.9 })
      softEngine.setBaseSize(10)
      hardEngine.setBaseSize(10)
      
      // 硬橡皮半径更小（更精确）
      const softR = softEngine.computeEffectiveRadius(0.5)
      const hardR = hardEngine.computeEffectiveRadius(0.5)
      
      expect(hardR).toBeLessThan(softR)
    })

    it('computeEraseStrength - 压力影响强度', () => {
      // 创建测试点
      const createPoint = (pressure: number): EraserPoint => ({
        x: 100,
        y: 100,
        pressure,
        velocity: 2, // 最优速度
        direction: 0,
        timestamp: Date.now(),
      })

      const s1 = engine.computeEraseStrength(createPoint(0.1))
      const s2 = engine.computeEraseStrength(createPoint(0.5))
      const s3 = engine.computeEraseStrength(createPoint(1))
      
      // 压力越大，强度越高
      expect(s1).toBeLessThan(s2)
      expect(s2).toBeLessThan(s3)
    })

    it('computeEraseStrength - 速度高斯分布', () => {
      const createPoint = (velocity: number): EraserPoint => ({
        x: 100,
        y: 100,
        pressure: 0.5,
        velocity,
        direction: 0,
        timestamp: Date.now(),
      })

      // 最优速度 2px/ms 强度最高
      const sOptimal = engine.computeEraseStrength(createPoint(2))
      const sSlow = engine.computeEraseStrength(createPoint(0.1))
      const sFast = engine.computeEraseStrength(createPoint(10))
      
      expect(sOptimal).toBeGreaterThan(sSlow)
      expect(sOptimal).toBeGreaterThan(sFast)
    })

    it('computeEraseStrength - 边界值不溢出', () => {
      const createPoint = (pressure: number, velocity: number): EraserPoint => ({
        x: 100, y: 100, pressure, velocity,
        direction: 0, timestamp: Date.now(),
      })

      // 极端参数也不会超过 [0, 1] 范围
      const sMax = engine.computeEraseStrength(createPoint(1, 2))
      const sMin = engine.computeEraseStrength(createPoint(0, 100))
      
      expect(sMax).toBeLessThanOrEqual(1)
      expect(sMin).toBeGreaterThanOrEqual(0)
    })
  })

  describe('笔触分割算法', () => {
    const createTestStroke = (): StrokeElement => ({
      type: 'stroke',
      id: 'test-stroke',
      points: [
        [0, 0], [50, 0], [100, 0], [150, 0], [200, 0],
      ],
      color: '#000',
      size: 2,
      brush: 'pen',
    })

    it('splitStroke - 空相交点返回空数组', () => {
      const stroke = createTestStroke()
      const result = engine.splitStroke(stroke, [])
      expect(result).toEqual([])
    })

    it('splitStroke - 单点分割', () => {
      const stroke = createTestStroke()
      const intersections: Intersection[] = [
        { t: 0.5, point: [100, 0], strength: 0.8 }
      ]

      const result = engine.splitStroke(stroke, intersections)
      
      // 应该分割成2段
      expect(result.length).toBe(2)
      expect(result[0].points.length).toBeGreaterThanOrEqual(2)
      expect(result[1].points.length).toBeGreaterThanOrEqual(2)
    })

    it('splitStroke - 多点分割', () => {
      const stroke = createTestStroke()
      const intersections: Intersection[] = [
        { t: 0.25, point: [50, 0], strength: 0.8 },
        { t: 0.75, point: [150, 0], strength: 0.8 },
      ]

      const result = engine.splitStroke(stroke, intersections)
      
      // 应该分割成3段
      expect(result.length).toBe(3)
    })

    it('splitStroke - 过近点合并', () => {
      const stroke = createTestStroke()
      const intersections: Intersection[] = [
        { t: 0.5, point: [100, 0], strength: 0.8 },
        { t: 0.52, point: [104, 0], strength: 0.8 }, // 距离太近
      ]

      const result = engine.splitStroke(stroke, intersections)
      
      // 距离小于0.05应该合并，只产生2段
      expect(result.length).toBeLessThanOrEqual(2)
    })

    it('splitStroke - 生成新ID不重复', () => {
      const stroke = createTestStroke()
      const intersections: Intersection[] = [
        { t: 0.5, point: [100, 0], strength: 0.8 }
      ]

      const result1 = engine.splitStroke(stroke, intersections)
      const result2 = engine.splitStroke(stroke, intersections)
      
      // 两次调用ID应该不同
      expect(result1[0].id).not.toBe(result2[0].id)
    })

    it('splitStroke - 透明度渐变', () => {
      const stroke = createTestStroke()
      stroke.opacity = 1
      
      const intersections: Intersection[] = [
        { t: 0.5, point: [100, 0], strength: 0.8 }
      ]

      const result = engine.splitStroke(stroke, intersections)
      
      // 第一段应该有透明度降低
      expect(result[0].opacity).toBeLessThan(1)
      expect(result[0].opacity).toBeGreaterThan(0)
    })
  })

  describe('边界条件防御', () => {
    it('空笔触处理', () => {
      const emptyStroke: StrokeElement = {
        type: 'stroke',
        id: 'empty',
        points: [],
        color: '#000',
        size: 2,
        brush: 'pen',
      }

      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }

      // 不应该抛出异常
      expect(() => {
        engine.addErasePoint(point, [emptyStroke])
      }).not.toThrow()
    })

    it('单点笔触处理', () => {
      const singlePointStroke: StrokeElement = {
        type: 'stroke',
        id: 'single',
        points: [[100, 100]],
        color: '#000',
        size: 2,
        brush: 'pen',
      }

      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }

      // 不应该抛出异常
      expect(() => {
        engine.addErasePoint(point, [singlePointStroke])
      }).not.toThrow()
    })

    it('极端压力值', () => {
      // 压力为0
      const r0 = engine.computeEffectiveRadius(0)
      expect(r0).toBeGreaterThan(0)

      // 压力为1
      const r1 = engine.computeEffectiveRadius(1)
      expect(r1).toBeGreaterThan(r0)

      // 压力超出范围（应该被clamp）
      const rNeg = engine.computeEffectiveRadius(-1)
      expect(rNeg).toBeGreaterThan(0)
    })

    it('空元素数组', () => {
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }

      const result = engine.addErasePoint(point, [])
      
      expect(result.modifiedStrokes).toEqual([])
      expect(result.affectedElementIds).toEqual([])
    })
  })

  describe('擦除流程', () => {
    const createStrokeAt = (x: number, y: number): StrokeElement => ({
      type: 'stroke',
      id: `stroke-${x}-${y}`,
      points: [[x - 20, y], [x, y], [x + 20, y]],
      color: '#000',
      size: 2,
      brush: 'pen',
    })

    it('startErase - 初始化轨迹', () => {
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 0,
        direction: 0, timestamp: Date.now(),
      }

      engine.startErase(point)
      expect(engine.getTrail()).toHaveLength(1)
    })

    it('addErasePoint - 追加轨迹', () => {
      const p1: EraserPoint = { x: 100, y: 100, pressure: 0.5, velocity: 0, direction: 0, timestamp: 1 }
      const p2: EraserPoint = { x: 110, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 2 }

      engine.startErase(p1)
      engine.addErasePoint(p2, [])

      expect(engine.getTrail()).toHaveLength(2)
    })

    it('endErase - 清空轨迹', () => {
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 0,
        direction: 0, timestamp: Date.now(),
      }

      engine.startErase(point)
      engine.endErase()

      expect(engine.getTrail()).toHaveLength(0)
    })

    it('命中笔触产生分割动作', () => {
      const stroke = createStrokeAt(100, 100)
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 1, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }

      engine.startErase(point)
      const result = engine.addErasePoint(point, [stroke])

      // 应该检测到笔触
      expect(result.affectedElementIds).toContain(stroke.id)
    })
  })
})
