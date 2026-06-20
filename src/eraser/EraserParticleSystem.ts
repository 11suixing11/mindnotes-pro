/**
 * 橡皮屑粒子系统
 * 模拟真实擦除时产生的橡皮屑飞散效果
 * 支持气流交互：快速移动鼠标/笔可以吹走橡皮屑
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

// ==================== 命名常量 ====================

/** 对象池大小相对于 maxParticles 的倍数 */
const POOL_SIZE_MULTIPLIER = 1.5

/** deltaTime 的最小值，防止除零 */
const MIN_DELTA_TIME = 0.001

/** 时间-帧率换算基准（假设 60fps 基准） */
const FRAME_RATE_BASE = 60

/** 粒子发射位置的随机抖动范围（像素） */
const EMIT_JITTER_RADIUS = 10

/** 速度对初速度的混合系数：基础 + 速度 * 系数 */
const SPEED_FACTOR_BASE = 0.5
const SPEED_FACTOR_VELOCITY = 0.5

/** 压力对粒子大小的混合系数：基础 + 压力 * 系数 */
const PRESSURE_FACTOR_BASE = 0.6
const PRESSURE_FACTOR_PRESSURE = 0.8

/** 粒子质量范围 */
const MASS_BASE = 0.8
const MASS_VARIANCE = 0.4

/** 防止除零的 epsilon 值 */
const EPSILON = 0.001

/** 气流方向中指针移动方向的占比 */
const WIND_DIR_WEIGHT = 0.7

/** 气流方向中向外推开方向的占比 */
const WIND_PUSH_WEIGHT = 0.3

/** 气流引起的旋转增强系数 */
const WIND_ROTATION_BOOST = 0.02

export class EraserParticleSystem {
  private particles: EraserParticle[] = []
  private config: ParticleSystemConfig
  private particlePool: EraserParticle[] = []
  private poolSize: number = 0

  // 气流相关状态
  private pointerX: number = 0
  private pointerY: number = 0
  private pointerVx: number = 0
  private pointerVy: number = 0
  private pointerSpeed: number = 0
  private lastPointerX: number = 0
  private lastPointerY: number = 0
  private pointerInitialized: boolean = false
  private windEnabled: boolean = true

  // 气流常量
  private static readonly WIND_THRESHOLD = 8 // 产生气流的最小速度
  private static readonly WIND_RADIUS = 80 // 气流影响半径
  private static readonly WIND_FORCE = 0.8 // 气流强度系数
  private static readonly WIND_DECAY = 0.92 // 气流速度衰减

  constructor(config?: Partial<ParticleSystemConfig>) {
    this.config = { ...DEFAULT_PARTICLE_CONFIG, ...config }
    this.poolSize = Math.floor(this.config.maxParticles * POOL_SIZE_MULTIPLIER)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ParticleSystemConfig>): void {
    this.config = { ...this.config, ...config }
    this.poolSize = Math.floor(this.config.maxParticles * POOL_SIZE_MULTIPLIER)

    // 当 maxParticles 减少时，裁剪多余的活跃粒子并回收
    while (this.particles.length > this.config.maxParticles) {
      const removed = this.particles.pop()
      if (removed) {
        this.recycleParticle(removed)
      }
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ParticleSystemConfig {
    return { ...this.config }
  }

  /**
   * 更新指针位置，用于计算气流
   */
  updatePointerPosition(x: number, y: number, deltaTime: number = 1/60): void {
    if (!this.windEnabled) return

    const dt = Math.max(deltaTime, MIN_DELTA_TIME)

    // 首次调用时只记录位置，不计算速度（避免从原点 (0,0) 到当前位置的虚假大速度）
    if (!this.pointerInitialized) {
      this.lastPointerX = x
      this.lastPointerY = y
      this.pointerX = x
      this.pointerY = y
      this.pointerVx = 0
      this.pointerVy = 0
      this.pointerSpeed = 0
      this.pointerInitialized = true
      return
    }

    // 计算速度
    this.pointerVx = (x - this.lastPointerX) / dt
    this.pointerVy = (y - this.lastPointerY) / dt
    this.pointerSpeed = Math.sqrt(this.pointerVx ** 2 + this.pointerVy ** 2)

    // 更新位置
    this.pointerX = x
    this.pointerY = y
    this.lastPointerX = x
    this.lastPointerY = y
  }

  /**
   * 启用/禁用气流效果
   */
  setWindEnabled(enabled: boolean): void {
    this.windEnabled = enabled
    if (!enabled) {
      this.pointerInitialized = false
    }
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
    const speedFactor = SPEED_FACTOR_BASE + params.velocity * SPEED_FACTOR_VELOCITY
    const speed = (speedMin + Math.random() * (speedMax - speedMin)) * speedFactor

    // 随机大小（受压力影响：压力越大粒子越多越大）
    const pressureFactor = PRESSURE_FACTOR_BASE + params.pressure * PRESSURE_FACTOR_PRESSURE
    const size = (baseSize + Math.random() * sizeVariance) * pressureFactor

    // 随机生命周期
    const life = lifeMin + Math.random() * (lifeMax - lifeMin)

    // 随机颜色
    const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]

    // 随机旋转
    const rotation = Math.random() * Math.PI * 2
    const rotationSpeed = (Math.random() - 0.5) * rotationSpeedMax * 2

    particle.id = `particle-${++particleIdCounter}`
    particle.x = params.x + (Math.random() - 0.5) * EMIT_JITTER_RADIUS
    particle.y = params.y + (Math.random() - 0.5) * EMIT_JITTER_RADIUS
    particle.vx = Math.cos(direction) * speed
    particle.vy = Math.sin(direction) * speed
    particle.size = size
    particle.rotation = rotation
    particle.rotationSpeed = rotationSpeed
    particle.color = color
    particle.opacity = 1
    particle.life = 1
    particle.maxLife = life
    particle.mass = MASS_BASE + Math.random() * MASS_VARIANCE

    return particle
  }

  /**
   * 更新所有粒子
   * @param deltaTime 时间增量（秒）
   */
  update(deltaTime: number): void {
    if (!this.config.enabled) return

    const { gravity, friction, fadeOutStart } = this.config

    // 衰减指针速度（防止快速停止后还有强气流）
    this.pointerVx *= EraserParticleSystem.WIND_DECAY
    this.pointerVy *= EraserParticleSystem.WIND_DECAY
    this.pointerSpeed *= EraserParticleSystem.WIND_DECAY

    // 只有速度超过阈值时才产生气流
    const hasWind = this.windEnabled && this.pointerSpeed > EraserParticleSystem.WIND_THRESHOLD

    // swap-and-pop 删除：用末尾元素替换已死亡粒子，避免 splice 的 O(n) 开销
    let i = 0
    while (i < this.particles.length) {
      const p = this.particles[i]

      // 应用气流影响
      if (hasWind) {
        this.applyWindForce(p, deltaTime)
      }

      // 应用重力
      p.vy += gravity * p.mass * deltaTime

      // 应用空气阻力
      p.vx *= friction
      p.vy *= friction

      // 更新位置
      p.x += p.vx * deltaTime * FRAME_RATE_BASE
      p.y += p.vy * deltaTime * FRAME_RATE_BASE

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

      // 回收死亡粒子：swap-and-pop
      if (p.life <= 0) {
        this.recycleParticle(p)
        const last = this.particles.length - 1
        if (i !== last) {
          this.particles[i] = this.particles[last]
        }
        this.particles.pop()
        // 不递增 i，因为新的 this.particles[i] 还没被检查过
      } else {
        i++
      }
    }
  }

  /**
   * 应用气流作用力到粒子
   */
  private applyWindForce(particle: EraserParticle, deltaTime: number): void {
    // 计算粒子到指针的距离
    const dx = particle.x - this.pointerX
    const dy = particle.y - this.pointerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    // 只影响气流半径内的粒子
    if (distance > EraserParticleSystem.WIND_RADIUS) return

    // 距离衰减：越近影响越大
    const distanceFactor = 1 - distance / EraserParticleSystem.WIND_RADIUS
    const distanceFactorSq = distanceFactor * distanceFactor

    // 气流强度（速度 × 距离因子）
    const windStrength = this.pointerSpeed * distanceFactorSq * EraserParticleSystem.WIND_FORCE

    // 气流方向（指针移动方向 + 向外扩散）
    const windDirX = this.pointerVx / (this.pointerSpeed + EPSILON)
    const windDirY = this.pointerVy / (this.pointerSpeed + EPSILON)

    // 向外扩散分量（防止粒子被吸向指针）
    const pushDirX = dx / (distance + EPSILON)
    const pushDirY = dy / (distance + EPSILON)

    // 组合方向：主要沿移动方向，带一点向外推开
    const forceX = (windDirX * WIND_DIR_WEIGHT + pushDirX * WIND_PUSH_WEIGHT) * windStrength
    const forceY = (windDirY * WIND_DIR_WEIGHT + pushDirY * WIND_PUSH_WEIGHT) * windStrength

    // 应用力到粒子（质量越小影响越大）
    const massFactor = 1 / particle.mass
    particle.vx += forceX * massFactor * deltaTime * FRAME_RATE_BASE
    particle.vy += forceY * massFactor * deltaTime * FRAME_RATE_BASE

    // 增加旋转
    particle.rotationSpeed += (Math.random() - 0.5) * windStrength * WIND_ROTATION_BOOST
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

    for (const particle of this.particles) {
      this.renderParticle(ctx, particle)
    }
  }

  /**
   * 渲染单个粒子（内部自行 save/restore，独立管理变换状态）
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

  /**
   * 获取气流状态
   */
  getWindState(): { speed: number; enabled: boolean } {
    return {
      speed: this.pointerSpeed,
      enabled: this.windEnabled,
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
