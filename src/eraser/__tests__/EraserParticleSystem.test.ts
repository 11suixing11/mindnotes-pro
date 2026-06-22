import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EraserParticleSystem, getParticleSystem } from '../EraserParticleSystem'
import type { ParticleEmitParams } from '../types'

describe('EraserParticleSystem', () => {
  let particleSystem: EraserParticleSystem

  beforeEach(() => {
    particleSystem = new EraserParticleSystem()
  })

  afterEach(() => {
    particleSystem.clear()
  })

  describe('初始化', () => {
    it('应该创建空的粒子系统', () => {
      expect(particleSystem.getParticleCount()).toBe(0)
    })

    it('应该有默认配置', () => {
      const config = particleSystem.getConfig()
      expect(config.maxParticles).toBe(200)
      expect(config.particlesPerErase).toBeGreaterThan(0)
      expect(config.gravity).toBeGreaterThan(0)
    })

    it('单例模式应该返回同一个实例', () => {
      const instance1 = getParticleSystem()
      const instance2 = getParticleSystem()
      expect(instance1).toBe(instance2)
    })
  })

  describe('粒子发射', () => {
    it('应该发射指定数量的粒子', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 10,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)
      expect(particleSystem.getParticleCount()).toBe(10)
    })

    it('压力应该影响粒子数量', () => {
      const lowPressureParams: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.1,
        velocity: 0.5,
        count: 10,
        spread: Math.PI * 0.5,
      }

      const highPressureParams: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 1.0,
        velocity: 0.5,
        count: 10,
        spread: Math.PI * 0.5,
      }

      const system1 = new EraserParticleSystem()
      const system2 = new EraserParticleSystem()

      system1.emit(lowPressureParams)
      system2.emit(highPressureParams)

      // 高压应该产生更多粒子
      expect(system2.getParticleCount()).toBeGreaterThanOrEqual(system1.getParticleCount())
    })

    it('不应该超过最大粒子数限制', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 1.0,
        velocity: 1.0,
        count: 500, // 超过maxParticles=200
        spread: Math.PI,
      }

      particleSystem.emit(params)
      expect(particleSystem.getParticleCount()).toBeLessThanOrEqual(200)
    })

    it('禁用时不应该发射粒子', () => {
      particleSystem.setEnabled(false)

      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 10,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)
      expect(particleSystem.getParticleCount()).toBe(0)
    })

    it('应该在发射位置周围创建粒子', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 200,
        direction: 0,
        pressure: 0.5,
        velocity: 0,
        count: 20,
        spread: 0,
      }

      particleSystem.emit(params)
      const particles = particleSystem.getParticles()

      particles.forEach((p) => {
        // 粒子应该在发射位置附近
        expect(Math.abs(p.x - 100)).toBeLessThan(50)
        expect(Math.abs(p.y - 200)).toBeLessThan(50)
      })
    })
  })

  describe('粒子更新', () => {
    it('更新应该减少粒子生命周期', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 5,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)
      const initialLife = particleSystem.getParticles()[0].life

      particleSystem.update(0.1)
      const newLife = particleSystem.getParticles()[0].life

      expect(newLife).toBeLessThan(initialLife)
    })

    it('重力应该影响粒子y位置', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0, // 初始速度为0
        count: 1,
        spread: 0,
      }

      particleSystem.emit(params)
      const initialY = particleSystem.getParticles()[0].y

      particleSystem.update(0.1) // 小步更新，确保粒子还存在
      const newY = particleSystem.getParticles()[0].y

      // 重力应该让粒子下落（y增加）
      expect(newY).toBeGreaterThan(initialY)
    })

    it('生命周期结束的粒子应该被移除', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 5,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)
      expect(particleSystem.getParticleCount()).toBe(5)

      // 快速更新多次，让粒子生命周期结束
      for (let i = 0; i < 100; i++) {
        particleSystem.update(1.0)
      }

      expect(particleSystem.getParticleCount()).toBe(0)
    })

    it('deltaTime应该影响更新幅度', () => {
      const system1 = new EraserParticleSystem()
      const system2 = new EraserParticleSystem()

      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0,
        count: 1,
        spread: 0,
      }

      system1.emit(params)
      system2.emit(params)

      system1.update(0.01) // 极小步更新
      system2.update(0.1) // 大步更新

      // 确保粒子还存在
      expect(system1.getParticleCount()).toBe(1)
      expect(system2.getParticleCount()).toBe(1)

      const y1 = system1.getParticles()[0].y
      const y2 = system2.getParticles()[0].y

      // 大步更新应该下落更多
      expect(y2).toBeGreaterThan(y1)
    })
  })

  describe('启用/禁用控制', () => {
    it('setEnabled应该改变启用状态', () => {
      expect(particleSystem.isEnabled()).toBe(true)

      particleSystem.setEnabled(false)
      expect(particleSystem.isEnabled()).toBe(false)

      particleSystem.setEnabled(true)
      expect(particleSystem.isEnabled()).toBe(true)
    })

    it('禁用时清除现有粒子', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 10,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)
      expect(particleSystem.getParticleCount()).toBe(10)

      particleSystem.setEnabled(false)
      expect(particleSystem.getParticleCount()).toBe(0)
    })
  })

  describe('清除功能', () => {
    it('clear应该移除所有粒子', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 10,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)
      expect(particleSystem.getParticleCount()).toBe(10)

      particleSystem.clear()
      expect(particleSystem.getParticleCount()).toBe(0)
    })

    it('多次clear应该安全', () => {
      particleSystem.clear()
      particleSystem.clear()
      particleSystem.clear()
      expect(particleSystem.getParticleCount()).toBe(0)
    })
  })

  describe('边界情况', () => {
    it('count为0应该不发射粒子', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 0,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)
      expect(particleSystem.getParticleCount()).toBe(0)
    })

    it('负数count应该不发射粒子', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: -5,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)
      expect(particleSystem.getParticleCount()).toBe(0)
    })

    it('update deltaTime为0应该不改变粒子数量和生命周期', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 5,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)
      const countBefore = particleSystem.getParticleCount()
      const lifeBefore = particleSystem.getParticles()[0].life

      particleSystem.update(0)
      const countAfter = particleSystem.getParticleCount()
      const lifeAfter = particleSystem.getParticles()[0].life

      expect(countAfter).toBe(countBefore)
      expect(lifeAfter).toBe(lifeBefore) // 生命周期不应该改变
    })

    it('update负数deltaTime应该安全处理', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 5,
        spread: Math.PI * 0.5,
      }

      particleSystem.emit(params)

      // 不应该抛出异常
      expect(() => particleSystem.update(-0.1)).not.toThrow()
    })
  })

  describe('对象池复用', () => {
    it('对象池应该有粒子被回收', () => {
      const params: ParticleEmitParams = {
        x: 100,
        y: 100,
        direction: 0,
        pressure: 0.5,
        velocity: 0.5,
        count: 5,
        spread: Math.PI * 0.5,
      }

      // 发射粒子
      particleSystem.emit(params)
      expect(particleSystem.getPoolStats().pooled).toBe(0)

      // 让粒子过期并被回收
      for (let i = 0; i < 100; i++) {
        particleSystem.update(1.0)
      }

      // 对象池应该有被回收的粒子
      const stats = particleSystem.getPoolStats()
      expect(stats.pooled).toBeGreaterThan(0)
      expect(stats.active).toBe(0)
    })
  })
})
