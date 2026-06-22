import { describe, it, expect, beforeEach } from 'vitest'
import { PhysicsEraserEngine } from '../PhysicsEraserEngine'

describe('磨损历史记录（撤销/重做）', () => {
  let engine: PhysicsEraserEngine

  beforeEach(() => {
    engine = new PhysicsEraserEngine()
  })

  // ==========================================
  // 初始化测试
  // ==========================================

  describe('初始化状态', () => {
    it('初始状态没有历史记录', () => {
      expect(engine.canUndoWear()).toBe(false)
      expect(engine.canRedoWear()).toBe(false)
    })

    it('初始历史统计为空', () => {
      const stats = engine.getWearHistoryStats()
      expect(stats.historyCount).toBe(0)
      expect(stats.redoCount).toBe(0)
      expect(stats.maxHistory).toBe(20)
    })

    it('初始磨损程度为0', () => {
      expect(engine.getWearLevel()).toBe(0)
    })
  })

  // ==========================================
  // 历史记录保存测试
  // ==========================================

  describe('历史记录保存', () => {
    it('resetWear保存历史记录', () => {
      // 先让橡皮擦有磨损
      const startPoint = {
        x: 100,
        y: 100,
        pressure: 1,
        velocity: 2,
        direction: 0,
        timestamp: Date.now(),
      }
      engine.startErase(startPoint)

      // 添加多个点产生磨损
      for (let i = 0; i < 10; i++) {
        engine.addErasePoint(
          {
            x: 100 + i * 10,
            y: 100,
            pressure: 1,
            velocity: 2,
            direction: 0,
            timestamp: Date.now(),
          },
          []
        )
      }
      engine.endErase()

      const wearBeforeReset = engine.getWearLevel()
      expect(wearBeforeReset).toBeGreaterThan(0)

      // 重置磨损（削橡皮）
      engine.resetWear()

      // 磨损应该归零
      expect(engine.getWearLevel()).toBe(0)

      // 应该可以撤销
      expect(engine.canUndoWear()).toBe(true)
      expect(engine.canRedoWear()).toBe(false)

      const stats = engine.getWearHistoryStats()
      expect(stats.historyCount).toBe(1)
      expect(stats.redoCount).toBe(0)
    })

    it('多次resetWear累积历史记录', () => {
      // 第一次重置
      engine.resetWear()
      expect(engine.getWearHistoryStats().historyCount).toBe(1)

      // 第二次重置
      engine.resetWear()
      expect(engine.getWearHistoryStats().historyCount).toBe(2)

      // 第三次重置
      engine.resetWear()
      expect(engine.getWearHistoryStats().historyCount).toBe(3)
    })
  })

  // ==========================================
  // 撤销测试
  // ==========================================

  describe('撤销磨损（undoWear）', () => {
    it('撤销恢复之前的磨损状态', () => {
      // 先让橡皮擦有磨损
      const startPoint = {
        x: 100,
        y: 100,
        pressure: 1,
        velocity: 2,
        direction: 0,
        timestamp: Date.now(),
      }
      engine.startErase(startPoint)

      for (let i = 0; i < 10; i++) {
        engine.addErasePoint(
          {
            x: 100 + i * 10,
            y: 100,
            pressure: 1,
            velocity: 2,
            direction: 0,
            timestamp: Date.now(),
          },
          []
        )
      }
      engine.endErase()

      const wearBeforeReset = engine.getWearLevel()
      expect(wearBeforeReset).toBeGreaterThan(0)

      // 重置磨损
      engine.resetWear()
      expect(engine.getWearLevel()).toBe(0)

      // 撤销
      const undoResult = engine.undoWear()
      expect(undoResult).toBe(true)

      // 磨损应该恢复
      expect(engine.getWearLevel()).toBeCloseTo(wearBeforeReset, 5)

      // 现在可以重做
      expect(engine.canUndoWear()).toBe(false)
      expect(engine.canRedoWear()).toBe(true)
    })

    it('没有历史记录时撤销返回false', () => {
      const result = engine.undoWear()
      expect(result).toBe(false)
    })

    it('多次撤销依次恢复历史', () => {
      // 产生一些磨损并多次重置
      engine.resetWear() // 历史1: 0
      engine.resetWear() // 历史2: 0
      engine.resetWear() // 历史3: 0

      expect(engine.getWearHistoryStats().historyCount).toBe(3)

      // 撤销3次
      expect(engine.undoWear()).toBe(true)
      expect(engine.undoWear()).toBe(true)
      expect(engine.undoWear()).toBe(true)

      // 没有更多历史了
      expect(engine.undoWear()).toBe(false)
      expect(engine.getWearHistoryStats().historyCount).toBe(0)
      expect(engine.getWearHistoryStats().redoCount).toBe(3)
    })
  })

  // ==========================================
  // 重做测试
  // ==========================================

  describe('重做磨损（redoWear）', () => {
    it('重做恢复撤销的操作', () => {
      // 产生磨损并重置
      const startPoint = {
        x: 100,
        y: 100,
        pressure: 1,
        velocity: 2,
        direction: 0,
        timestamp: Date.now(),
      }
      engine.startErase(startPoint)

      for (let i = 0; i < 10; i++) {
        engine.addErasePoint(
          {
            x: 100 + i * 10,
            y: 100,
            pressure: 1,
            velocity: 2,
            direction: 0,
            timestamp: Date.now(),
          },
          []
        )
      }
      engine.endErase()

      const wearBeforeReset = engine.getWearLevel()

      // 重置 -> 撤销 -> 重做
      engine.resetWear()
      engine.undoWear()

      expect(engine.getWearLevel()).toBeCloseTo(wearBeforeReset, 5)
      expect(engine.canRedoWear()).toBe(true)

      // 重做
      const redoResult = engine.redoWear()
      expect(redoResult).toBe(true)

      // 应该回到重置后的状态（磨损=0）
      expect(engine.getWearLevel()).toBe(0)

      // 重做栈清空
      expect(engine.canRedoWear()).toBe(false)
      expect(engine.canUndoWear()).toBe(true)
    })

    it('没有重做记录时重做返回false', () => {
      const result = engine.redoWear()
      expect(result).toBe(false)
    })

    it('撤销-重做循环正确工作', () => {
      engine.resetWear()

      // 撤销
      engine.undoWear()
      expect(engine.canRedoWear()).toBe(true)

      // 重做
      engine.redoWear()
      expect(engine.canUndoWear()).toBe(true)
      expect(engine.canRedoWear()).toBe(false)

      // 再次撤销
      engine.undoWear()
      expect(engine.canRedoWear()).toBe(true)
    })
  })

  // ==========================================
  // 历史记录上限测试
  // ==========================================

  describe('历史记录上限保护', () => {
    it('超过最大历史记录时丢弃最旧的记录', () => {
      // 重置25次（超过20的上限）
      for (let i = 0; i < 25; i++) {
        engine.resetWear()
      }

      const stats = engine.getWearHistoryStats()
      expect(stats.historyCount).toBe(20) // 上限20
      expect(stats.maxHistory).toBe(20)

      // 可以撤销20次
      for (let i = 0; i < 20; i++) {
        expect(engine.undoWear()).toBe(true)
      }

      // 第21次撤销失败
      expect(engine.undoWear()).toBe(false)
    })
  })

  // ==========================================
  // 新操作清空重做栈
  // ==========================================

  describe('新操作清空重做栈', () => {
    it('执行新的resetWear后清空重做栈', () => {
      engine.resetWear()
      engine.resetWear()

      // 撤销一次
      engine.undoWear()
      expect(engine.canRedoWear()).toBe(true)
      expect(engine.getWearHistoryStats().redoCount).toBe(1)

      // 执行新操作
      engine.resetWear()

      // 重做栈应该被清空
      expect(engine.canRedoWear()).toBe(false)
      expect(engine.getWearHistoryStats().redoCount).toBe(0)
    })
  })

  // ==========================================
  // 边界情况
  // ==========================================

  describe('边界情况', () => {
    it('连续撤销重做不丢失状态', () => {
      // 执行多次操作
      for (let i = 0; i < 5; i++) {
        engine.resetWear()
      }

      // 全部撤销
      for (let i = 0; i < 5; i++) {
        expect(engine.undoWear()).toBe(true)
      }

      // 全部重做
      for (let i = 0; i < 5; i++) {
        expect(engine.redoWear()).toBe(true)
      }

      // 最终状态
      expect(engine.getWearLevel()).toBe(0)
      expect(engine.canUndoWear()).toBe(true)
      expect(engine.canRedoWear()).toBe(false)
    })

    it('空历史记录安全操作', () => {
      // 这些操作都不应该抛出异常
      expect(() => engine.undoWear()).not.toThrow()
      expect(() => engine.redoWear()).not.toThrow()
      expect(() => engine.canUndoWear()).not.toThrow()
      expect(() => engine.canRedoWear()).not.toThrow()
      expect(() => engine.getWearHistoryStats()).not.toThrow()
    })
  })
})
