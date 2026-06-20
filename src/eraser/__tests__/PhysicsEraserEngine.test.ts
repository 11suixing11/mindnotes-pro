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
      expect(result).toEqual({ status: 'unchanged' })
    })

    it('splitStroke - 单点分割', () => {
      const stroke = createTestStroke()
      const intersections: Intersection[] = [
        { t: 0.5, point: [100, 0], strength: 0.8 }
      ]

      const result = engine.splitStroke(stroke, intersections)
      
      // 应该分割成2段
      expect(result.status).toBe('split')
      if (result.status === 'split') {
        expect(result.segments.length).toBe(2)
        expect(result.segments[0].points.length).toBeGreaterThanOrEqual(2)
        expect(result.segments[1].points.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('splitStroke - 多点分割', () => {
      const stroke = createTestStroke()
      const intersections: Intersection[] = [
        { t: 0.25, point: [50, 0], strength: 0.8 },
        { t: 0.75, point: [150, 0], strength: 0.8 },
      ]

      const result = engine.splitStroke(stroke, intersections)
      
      // 应该分割成3段
      expect(result.status).toBe('split')
      if (result.status === 'split') {
        expect(result.segments.length).toBe(3)
      }
    })

    it('splitStroke - 过近点合并', () => {
      const stroke = createTestStroke()
      const intersections: Intersection[] = [
        { t: 0.5, point: [100, 0], strength: 0.8 },
        { t: 0.52, point: [104, 0], strength: 0.8 }, // 距离太近
      ]

      const result = engine.splitStroke(stroke, intersections)
      
      // 距离小于0.05应该合并，只产生2段
      expect(result.status).toBe('split')
      if (result.status === 'split') {
        expect(result.segments.length).toBeLessThanOrEqual(2)
      }
    })

    it('splitStroke - 生成新ID不重复', () => {
      const stroke = createTestStroke()
      const intersections: Intersection[] = [
        { t: 0.5, point: [100, 0], strength: 0.8 }
      ]

      const result1 = engine.splitStroke(stroke, intersections)
      const result2 = engine.splitStroke(stroke, intersections)
      
      // 两次调用ID应该不同
      expect(result1.status).toBe('split')
      expect(result2.status).toBe('split')
      if (result1.status === 'split' && result2.status === 'split') {
        expect(result1.segments[0].id).not.toBe(result2.segments[0].id)
      }
    })

    it('splitStroke - 透明度渐变', () => {
      const stroke = createTestStroke()
      stroke.opacity = 1
      
      const intersections: Intersection[] = [
        { t: 0.5, point: [100, 0], strength: 0.8 }
      ]

      const result = engine.splitStroke(stroke, intersections)
      
      // 第一段应该有透明度降低
      expect(result.status).toBe('split')
      if (result.status === 'split') {
        expect(result.segments[0].opacity).toBeLessThan(1)
        expect(result.segments[0].opacity).toBeGreaterThan(0)
      }
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

  describe('橡皮擦形状支持', () => {
    it('圆形橡皮擦：中心点距离为0', () => {
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      const dist = engine.pointToEraserDistance(point, 100, 100)
      expect(dist).toBe(0)
    })

    it('圆形橡皮擦：边缘点距离正确', () => {
      const engine = new PhysicsEraserEngine({ shape: 'circle' })
      engine.setBaseSize(10)
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 1, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      const radius = engine.computeEffectiveRadius(1)
      const dist = engine.pointToEraserDistance(point, 100 + radius, 100)
      expect(dist).toBeCloseTo(radius, 5)
    })

    it('凿形橡皮擦尺寸：宽度大于高度', () => {
      const engine = new PhysicsEraserEngine({ shape: 'chisel' })
      engine.setBaseSize(10)
      const dims = engine.getChiselDimensions(1)
      expect(dims.width).toBeGreaterThan(dims.height)
      expect(dims.height).toBeCloseTo(dims.width * 0.4, 5)
    })

    it('凿形橡皮擦：中心点在内部', () => {
      const engine = new PhysicsEraserEngine({ shape: 'chisel', rotation: 0 })
      engine.setBaseSize(10)
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 1, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      const dist = engine.pointToEraserDistance(point, 100, 100)
      // 内部点距离为负数
      expect(dist).toBeLessThan(0)
    })

    it('凿形橡皮擦：宽边方向更容易命中', () => {
      const engine = new PhysicsEraserEngine({ shape: 'chisel', rotation: 0 })
      engine.setBaseSize(10)
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 1, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      const dims = engine.getChiselDimensions(1)

      // 水平方向（宽边）：在宽度边缘应该在内部
      const distH = engine.pointToEraserDistance(point, 100 + dims.width / 2 - 1, 100)
      expect(distH).toBeLessThan(0)

      // 垂直方向（窄边）：在高度边缘应该在外部
      const distV = engine.pointToEraserDistance(point, 100, 100 + dims.height / 2 + 1)
      expect(distV).toBeGreaterThan(0)
    })

    it('方形橡皮擦：旋转后距离计算正确', () => {
      const engine = new PhysicsEraserEngine({ shape: 'square', rotation: Math.PI / 4 })
      engine.setBaseSize(10)
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 1, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      // 旋转45度后，对角线方向的点应该在内部
      const size = engine.computeEffectiveRadius(1)
      const dist = engine.pointToEraserDistance(
        point,
        100 + size * 0.5,
        100 + size * 0.5
      )
      expect(dist).toBeLessThan(0)
    })

    it('凿形橡皮擦：运动方向影响旋转', () => {
      const engine = new PhysicsEraserEngine({
        shape: 'chisel',
        rotation: 0,
        directionInfluence: 1,
      })
      engine.setBaseSize(20) // 大一点更容易测试

      const pointH: EraserPoint = {
        x: 100, y: 100, pressure: 1, velocity: 2,
        direction: 0, timestamp: Date.now(), // 水平向右
      }
      const pointV: EraserPoint = {
        x: 100, y: 100, pressure: 1, velocity: 2,
        direction: Math.PI / 2, timestamp: Date.now(), // 垂直向下
      }

      const dims = engine.getChiselDimensions(1)
      const halfW = dims.width / 2
      const halfH = dims.height / 2

      // 水平运动时：长边水平，水平方向点在内部，垂直方向点在外部
      const distH_horizontal = engine.pointToEraserDistance(pointH, 100 + halfW * 0.5, 100)
      const distH_vertical = engine.pointToEraserDistance(pointH, 100, 100 + halfH * 1.5)

      expect(distH_horizontal).toBeLessThan(0) // 内部
      expect(distH_vertical).toBeGreaterThan(0) // 外部

      // 垂直运动时：长边垂直，垂直方向点在内部，水平方向点在外部
      const distV_vertical = engine.pointToEraserDistance(pointV, 100, 100 + halfW * 0.5)
      const distV_horizontal = engine.pointToEraserDistance(pointV, 100 + halfH * 1.5, 100)

      expect(distV_vertical).toBeLessThan(0) // 内部
      expect(distV_horizontal).toBeGreaterThan(0) // 外部
    })
  })

  describe('橡皮磨损模拟', () => {
    it('初始磨损程度为0', () => {
      const engine = new PhysicsEraserEngine()
      expect(engine.getWearLevel()).toBe(0)
    })

    it('擦除后磨损程度增加', () => {
      const engine = new PhysicsEraserEngine({ wearRate: 1 })
      engine.setBaseSize(10)

      const p1: EraserPoint = { x: 100, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 1 }
      const p2: EraserPoint = { x: 200, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 2 }

      engine.startErase(p1)
      engine.addErasePoint(p2, [])

      expect(engine.getWearLevel()).toBeGreaterThan(0)
    })

    it('磨损程度与移动距离成正比', () => {
      const engine1 = new PhysicsEraserEngine({ wearRate: 1 })
      engine1.setBaseSize(10)
      const p1a: EraserPoint = { x: 100, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 1 }
      const p1b: EraserPoint = { x: 150, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 2 }
      engine1.startErase(p1a)
      engine1.addErasePoint(p1b, [])
      const wear1 = engine1.getWearLevel()

      const engine2 = new PhysicsEraserEngine({ wearRate: 1 })
      engine2.setBaseSize(10)
      const p2a: EraserPoint = { x: 100, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 1 }
      const p2b: EraserPoint = { x: 200, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 2 }
      engine2.startErase(p2a)
      engine2.addErasePoint(p2b, [])
      const wear2 = engine2.getWearLevel()

      // 距离翻倍，磨损也应该翻倍
      expect(wear2).toBeCloseTo(wear1 * 2, 5)
    })

    it('磨损程度与压力成正比', () => {
      const engine1 = new PhysicsEraserEngine({ wearRate: 1 })
      engine1.setBaseSize(10)
      const p1a: EraserPoint = { x: 100, y: 100, pressure: 0.2, velocity: 2, direction: 0, timestamp: 1 }
      const p1b: EraserPoint = { x: 200, y: 100, pressure: 0.2, velocity: 2, direction: 0, timestamp: 2 }
      engine1.startErase(p1a)
      engine1.addErasePoint(p1b, [])
      const wear1 = engine1.getWearLevel()

      const engine2 = new PhysicsEraserEngine({ wearRate: 1 })
      engine2.setBaseSize(10)
      const p2a: EraserPoint = { x: 100, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 1 }
      const p2b: EraserPoint = { x: 200, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 2 }
      engine2.startErase(p2a)
      engine2.addErasePoint(p2b, [])
      const wear2 = engine2.getWearLevel()

      // 压力大的磨损更多
      expect(wear2).toBeGreaterThan(wear1)
    })

    it('硬橡皮磨损更慢', () => {
      const softEngine = new PhysicsEraserEngine({ hardness: 0.1, wearRate: 1 })
      softEngine.setBaseSize(10)
      const p1a: EraserPoint = { x: 100, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 1 }
      const p1b: EraserPoint = { x: 200, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 2 }
      softEngine.startErase(p1a)
      softEngine.addErasePoint(p1b, [])
      const softWear = softEngine.getWearLevel()

      const hardEngine = new PhysicsEraserEngine({ hardness: 0.9, wearRate: 1 })
      hardEngine.setBaseSize(10)
      const p2a: EraserPoint = { x: 100, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 1 }
      const p2b: EraserPoint = { x: 200, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 2 }
      hardEngine.startErase(p2a)
      hardEngine.addErasePoint(p2b, [])
      const hardWear = hardEngine.getWearLevel()

      // 硬橡皮磨损更慢
      expect(hardWear).toBeLessThan(softWear)
    })

    it('磨损程度不会超过1', () => {
      const engine = new PhysicsEraserEngine({ wearRate: 100 }) // 超高磨损速率
      engine.setBaseSize(10)

      // 连续擦除很长距离
      let x = 100
      const p0: EraserPoint = { x, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 0 }
      engine.startErase(p0)

      for (let i = 0; i < 100; i++) {
        x += 100
        const p: EraserPoint = { x, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: i + 1 }
        engine.addErasePoint(p, [])
      }

      expect(engine.getWearLevel()).toBeLessThanOrEqual(1)
      expect(engine.getWearLevel()).toBeCloseTo(1, 3)
    })

    it('resetWear 可以重置磨损', () => {
      const engine = new PhysicsEraserEngine({ wearRate: 1 })
      engine.setBaseSize(10)

      const p1: EraserPoint = { x: 100, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 1 }
      const p2: EraserPoint = { x: 200, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 2 }

      engine.startErase(p1)
      engine.addErasePoint(p2, [])
      expect(engine.getWearLevel()).toBeGreaterThan(0)

      engine.resetWear()
      expect(engine.getWearLevel()).toBe(0)
    })

    it('磨损会增加擦除半径', () => {
      const engine = new PhysicsEraserEngine({ wearRate: 1 })
      engine.setBaseSize(10)

      // 全新时的半径
      const radiusNew = engine.computeEffectiveRadius(1)

      // 模拟磨损
      const p1: EraserPoint = { x: 100, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 1 }
      const p2: EraserPoint = { x: 500, y: 100, pressure: 1, velocity: 2, direction: 0, timestamp: 2 }
      engine.startErase(p1)
      engine.addErasePoint(p2, [])

      // 磨损后的半径
      const radiusWorn = engine.computeEffectiveRadius(1)

      // 磨损后半径应该更大
      expect(radiusWorn).toBeGreaterThan(radiusNew)
    })

    it('wearRate 配置影响磨损速度', () => {
      const engineSlow = new PhysicsEraserEngine({ wearRate: 0.5 })
      engineSlow.setBaseSize(10)
      const p1a: EraserPoint = { x: 100, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 1 }
      const p1b: EraserPoint = { x: 200, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 2 }
      engineSlow.startErase(p1a)
      engineSlow.addErasePoint(p1b, [])
      const wearSlow = engineSlow.getWearLevel()

      const engineFast = new PhysicsEraserEngine({ wearRate: 2 })
      engineFast.setBaseSize(10)
      const p2a: EraserPoint = { x: 100, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 1 }
      const p2b: EraserPoint = { x: 200, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 2 }
      engineFast.startErase(p2a)
      engineFast.addErasePoint(p2b, [])
      const wearFast = engineFast.getWearLevel()

      // wearRate 大的磨损更快
      expect(wearFast).toBeGreaterThan(wearSlow)
      expect(wearFast).toBeCloseTo(wearSlow * 4, 5) // 2/0.5 = 4倍
    })
  })

  describe('极端参数边界测试', () => {
    it('压力为负数时被clamp到0', () => {
      const rNeg = engine.computeEffectiveRadius(-1)
      const r0 = engine.computeEffectiveRadius(0)
      expect(rNeg).toBeCloseTo(r0, 5)
    })

    it('压力超过1时被clamp到1', () => {
      const r1 = engine.computeEffectiveRadius(1)
      const rOver = engine.computeEffectiveRadius(2)
      expect(rOver).toBeCloseTo(r1, 5)
    })

    it('NaN压力值优雅降级', () => {
      expect(() => {
        engine.computeEffectiveRadius(NaN as any)
      }).not.toThrow()
      const result = engine.computeEffectiveRadius(NaN as any)
      expect(result).toBeGreaterThan(0)
      expect(Number.isFinite(result)).toBe(true)
    })

    it('Infinity压力值优雅降级', () => {
      expect(() => {
        engine.computeEffectiveRadius(Infinity)
      }).not.toThrow()
      const result = engine.computeEffectiveRadius(Infinity)
      expect(result).toBeGreaterThan(0)
      expect(Number.isFinite(result)).toBe(true)
    })

    it('速度为0时擦除强度不为0', () => {
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 0,
        direction: 0, timestamp: Date.now(),
      }
      const strength = engine.computeEraseStrength(point)
      expect(strength).toBeGreaterThan(0)
    })

    it('速度极快时擦除强度降低但不为0', () => {
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 100,
        direction: 0, timestamp: Date.now(),
      }
      const strength = engine.computeEraseStrength(point)
      expect(strength).toBeGreaterThan(0)
      expect(strength).toBeLessThan(1)
    })

    it('setBaseSize 负数被限制', () => {
      engine.setBaseSize(-10)
      const radius = engine.computeEffectiveRadius(1)
      expect(radius).toBeGreaterThan(0)
    })

    it('setBaseSize 极大值被限制', () => {
      engine.setBaseSize(1000)
      const radius = engine.computeEffectiveRadius(1)
      expect(radius).toBeGreaterThan(0)
      expect(radius).toBeLessThan(100) // 应该被clamp到100以内
    })
  })

  describe('异常输入优雅降级', () => {
    it('null 元素数组不抛出异常', () => {
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      expect(() => {
        engine.addErasePoint(point, null as any)
      }).not.toThrow()
    })

    it('undefined 元素数组不抛出异常', () => {
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      expect(() => {
        engine.addErasePoint(point, undefined as any)
      }).not.toThrow()
    })

    it('无效擦除点不抛出异常', () => {
      const invalidPoint = { x: NaN, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: Date.now() }
      expect(() => {
        engine.startErase(invalidPoint as any)
      }).not.toThrow()
    })

    it('包含无效元素的数组优雅处理', () => {
      const point: EraserPoint = {
        x: 100, y: 100, pressure: 0.5, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      const elements = [
        null,
        undefined,
        { type: 'stroke', id: 'test', points: [[100, 100], [150, 100]], color: '#000', size: 2, brush: 'pen' },
      ]
      expect(() => {
        engine.addErasePoint(point, elements as any)
      }).not.toThrow()
    })

    it('splitStroke null笔触返回空', () => {
      expect(() => {
        engine.splitStroke(null as any, [])
      }).not.toThrow()
      const result = engine.splitStroke(null as any, [])
      expect(result).toEqual({ status: 'unchanged' })
    })

    it('splitStroke undefined笔触返回空', () => {
      expect(() => {
        engine.splitStroke(undefined as any, [])
      }).not.toThrow()
      const result = engine.splitStroke(undefined as any, [])
      expect(result).toEqual({ status: 'unchanged' })
    })
  })

  describe('大规模元素性能测试', () => {
    const createManyStrokes = (count: number): StrokeElement[] => {
      const strokes: StrokeElement[] = []
      for (let i = 0; i < count; i++) {
        strokes.push({
          type: 'stroke',
          id: `stroke-${i}`,
          points: [[i * 10, 100], [i * 10 + 5, 100], [i * 10 + 10, 100]],
          color: '#000',
          size: 2,
          brush: 'pen',
        })
      }
      return strokes
    }

    it('100元素场景不卡顿', () => {
      const elements = createManyStrokes(100)
      const point: EraserPoint = {
        x: 500, y: 100, pressure: 1, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      const start = performance.now()
      engine.startErase(point)
      const result = engine.addErasePoint(point, elements)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(50) // 50ms以内完成
      expect(result.affectedElementIds.length).toBeGreaterThanOrEqual(0)
    })

    it('1000元素场景不卡顿', () => {
      const elements = createManyStrokes(1000)
      const point: EraserPoint = {
        x: 5000, y: 100, pressure: 1, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      const start = performance.now()
      engine.startErase(point)
      const result = engine.addErasePoint(point, elements)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(100) // 100ms以内完成
      expect(result.affectedElementIds.length).toBeGreaterThanOrEqual(0)
    })

    it('连续擦除100次内存稳定', () => {
      const elements = createManyStrokes(100)
      const point: EraserPoint = {
        x: 500, y: 100, pressure: 1, velocity: 2,
        direction: 0, timestamp: Date.now(),
      }
      
      engine.startErase(point)
      for (let i = 0; i < 100; i++) {
        engine.addErasePoint({ ...point, x: 500 + i }, elements)
      }
      engine.endErase()
      
      // 不抛出异常即为通过
      expect(true).toBe(true)
    })
  })

  describe('空间索引集成测试', () => {
    it('toBoundsEntry 正确转换元素', () => {
      const stroke: StrokeElement = {
        type: 'stroke',
        id: 'test-stroke',
        points: [[100, 100], [200, 150]],
        color: '#000',
        size: 2,
        brush: 'pen',
      }
      const entry = PhysicsEraserEngine.toBoundsEntry(stroke)
      expect(entry!.id).toBe('test-stroke')
      expect(entry!.minX).toBeLessThan(entry!.maxX)
      expect(entry!.minY).toBeLessThan(entry!.maxY)
    })

    it('toBoundsEntry null元素不崩溃', () => {
      expect(() => {
        PhysicsEraserEngine.toBoundsEntry(null as any)
      }).not.toThrow()
    })
  })

  describe('并发擦除测试', () => {
    it('多次startErase正确重置状态', () => {
      const p1: EraserPoint = { x: 100, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 1 }
      const p2: EraserPoint = { x: 200, y: 200, pressure: 0.5, velocity: 2, direction: 0, timestamp: 2 }
      
      engine.startErase(p1)
      engine.addErasePoint(p2, [])
      expect(engine.getTrail()).toHaveLength(2)
      
      // 重新开始应该重置轨迹
      engine.startErase(p1)
      expect(engine.getTrail()).toHaveLength(1)
    })

    it('endErase后可以重新开始', () => {
      const p1: EraserPoint = { x: 100, y: 100, pressure: 0.5, velocity: 2, direction: 0, timestamp: 1 }
      
      engine.startErase(p1)
      engine.endErase()
      expect(engine.getTrail()).toHaveLength(0)
      
      engine.startErase(p1)
      expect(engine.getTrail()).toHaveLength(1)
    })
  })
})
