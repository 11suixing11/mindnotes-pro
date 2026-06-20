/**
 * 橡皮屑粒子系统
 * 模拟真实擦除时产生的橡皮屑飞散效果
 */

import type {
  EraserParticle,
  ParticleSystemConfig,
  ParticleEmitParams,
} from './types'
import {
  DEFAULT_PARTICLE_CONFIG,
  PARTICLE_COLORS,
} from './types'

// 粒子ID计数器
let particleIdCounter = 0

export class EraserParticleSystem {
  private particles: EraserParticle[] = []
  private config: ParticleSystemConfig
  private particlePool: EraserParticle[] = []
  private poolSize: number = 0

  constructor(config?: Partial<ParticleSystemConfig>) {
    this.config = { ...DEFAULT_PARTICLE_CONFIG, ...config }
    this.poolSize = Math.floor(this.config.maxParticles * 1.5)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ParticleSystemConfig>): void {
    this.config = { ...this.config, ...config }
    this.poolSize = Math.floor(this.config.maxParticles * 1.5)
  }

  /**
   * 获取当前配置
   */
  getConfig(): ParticleSystemConfig {
    return { ...this.config }
  }

  /**
   * 发射粒子
   */
  emit(params: ParticleEmitParams): void {
    if (!this.config.enabled) return
    if (this.particles.length >= this.config.maxParticles) return

    const emitCount = Math.min(
      params.count,
      this.config.maxParticles - this.particles.length
    )

    for (let i = 0; i < emitCount; i++) {
      const particle = this.createParticle(params)
      this.particles.push(particle)
    }
  }

  /**
   * 从对象池获取或创建新粒子
   */
  private createParticle(params: ParticleEmitParams): EraserParticle {
    // 尝试从对象池获取
    let particle = this.particlePool.pop()

    if (!particle) {
      particle = this.createNewParticle()
    }

    return this.initializeParticle(particle, params)
  }

  /**
   * 创建全新粒子
   */
  private createNewParticle(): EraserParticle {
    return {
      id: '',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      rotation: 0,
      rotationSpeed: 0,
      color: '',
      opacity: 0,
      life: 0,
      maxLife: 0,
      mass: 0,
    }
  }

  /**
   * 初始化粒子属性
   */
  private initializeParticle(
    particle: EraserParticle,
    params: ParticleEmitParams
  ): EraserParticle {
    const {
      baseSize,
      sizeVariance,
      speedMin,
      speedMax,
      lifeMin,
      lifeMax,
      rotationSpeedMax,
    } = this.config

    // 随机方向（在扩散角度范围内）
    const angleOffset = (Math.random() - 0.5) * params.spread
    const direction = params.direction + angleOffset

    // 随机速度（受擦除速度影响）
    const speedFactor = 0.5 + params.velocity * 0.5
    const speed = (speedMin + Math.random() * (speedMax - speedMin)) * speedFactor

    // 随机大小（受压力影响：压力越大粒子越多越大）
    const pressureFactor = 0.6 + params.pressure * 0.8
    const size = (baseSize + Math.random() * sizeVariance) * pressureFactor

    // 随机生命周期
    const life = lifeMin + Math.random() * (lifeMax - lifeMin)

    // 随机颜色
    const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]

    // 随机旋转
    const rotation = Math.random() * Math.PI * 2
    const rotationSpeed = (Math.random() - 0.5) * rotationSpeedMax * 2

    particle.id = `particle-${++particleIdCounter}`
    particle.x = params.x + (Math.random() - 0.5) * 10
    particle.y = params.y + (Math.random() - 0.5) * 10
    particle.vx = Math.cos(direction) * speed
    particle.vy = Math.sin(direction) * speed
    particle.size = size
    particle.rotation = rotation
    particle.rotationSpeed = rotationSpeed
    particle.color = color
    particle.opacity = 1
    particle.life = 1
    particle.maxLife = life
    particle.mass = 0.8 + Math.random() * 0.4

    return particle
  }

  /**
   * 更新所有粒子
   * @param deltaTime 时间增量（秒）
   */
  update(deltaTime: number): void {
    if (!this.config.enabled) return

    const { gravity, friction, fadeOutStart } = this.config

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      // 应用重力
      p.vy += gravity * p.mass * deltaTime

      // 应用空气阻力
      p.vx *= friction
      p.vy *= friction

      // 更新位置
      p.x += p.vx * deltaTime * 60
      p.y += p.vy * deltaTime * 60

      // 更新旋转
      p.rotation += p.rotationSpeed * deltaTime

      // 更新生命值
      p.life -= deltaTime / p.maxLife

      // 计算透明度（后期淡出）
      if (p.life < fadeOutStart) {
        p.opacity = p.life / fadeOutStart
      } else {
        p.opacity = 1
      }

      // 回收死亡粒子
      if (p.life <= 0) {
        this.recycleParticle(this.particles.splice(i, 1)[0])
      }
    }
  }

  /**
   * 回收粒子到对象池
   */
  private recycleParticle(particle: EraserParticle): void {
    if (this.particlePool.length < this.poolSize) {
      this.particlePool.push(particle)
    }
  }

  /**
   * 渲染所有粒子到Canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.config.enabled) return
    if (this.particles.length === 0) return

    ctx.save()

    for (const particle of this.particles) {
      this.renderParticle(ctx, particle)
    }

    ctx.restore()
  }

  /**
   * 渲染单个粒子
   */
  private renderParticle(
    ctx: CanvasRenderingContext2D,
    particle: EraserParticle
  ): void {
    ctx.save()
    ctx.translate(particle.x, particle.y)
    ctx.rotate(particle.rotation)
    ctx.globalAlpha = particle.opacity

    // 绘制不规则橡皮屑形状（小椭圆）
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.ellipse(
      0,
      0,
      particle.size,
      particle.size * 0.6,
      0,
      0,
      Math.PI * 2
    )
    ctx.fill()

    // 添加细微阴影增加立体感
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.beginPath()
    ctx.ellipse(
      1,
      1,
      particle.size * 0.8,
      particle.size * 0.5,
      0,
      0,
      Math.PI * 2
    )
    ctx.fill()

    ctx.restore()
  }

  /**
   * 获取所有活动粒子
   */
  getParticles(): readonly EraserParticle[] {
    return this.particles
  }

  /**
   * 获取活动粒子数量
   */
  getParticleCount(): number {
    return this.particles.length
  }

  /**
   * 清除所有粒子
   */
  clear(): void {
    // 将所有粒子回收到对象池
    while (this.particles.length > 0) {
      const particle = this.particles.pop()
      if (particle) {
        this.recycleParticle(particle)
      }
    }
  }

  /**
   * 启用/禁用粒子系统
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    if (!enabled) {
      this.clear()
    }
  }

  /**
   * 获取粒子系统启用状态
   */
  isEnabled(): boolean {
    return this.config.enabled ?? true
  }

  /**
   * 获取对象池统计
   */
  getPoolStats(): { active: number; pooled: number; max: number } {
    return {
      active: this.particles.length,
      pooled: this.particlePool.length,
      max: this.config.maxParticles,
    }
  }
}

// 单例实例
let particleSystemInstance: EraserParticleSystem | null = null

/**
 * 获取粒子系统单例
 */
export function getParticleSystem(): EraserParticleSystem {
  if (!particleSystemInstance) {
    particleSystemInstance = new EraserParticleSystem()
  }
  return particleSystemInstance
}
