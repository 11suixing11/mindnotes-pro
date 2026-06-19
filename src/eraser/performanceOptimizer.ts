/**
 * Canvas 渲染性能优化模块
 * 
 * 实现:
 * 1. 脏矩形裁剪 - 只重绘被修改的区域
 * 2. 对象池复用 - 减少GC压力
 * 3. 批量渲染 - 减少Canvas上下文切换
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 脏矩形管理器
 * 追踪需要重绘的区域，合并重叠区域
 */
export class DirtyRectManager {
  private dirtyRects: Rect[] = []
  private mergedRect: Rect | null = null
  private enabled = true

  /**
   * 添加脏区域
   */
  addDirtyRect(rect: Rect): void {
    if (!this.enabled) return
    this.dirtyRects.push({ ...rect })
    this.mergedRect = null // 标记需要重新合并
  }

  /**
   * 添加点周围的脏区域
   */
  addDirtyPoint(x: number, y: number, radius: number): void {
    this.addDirtyRect({
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
    })
  }

  /**
   * 合并所有脏区域为一个矩形
   */
  getMergedRect(): Rect | null {
    if (this.dirtyRects.length === 0) return null
    
    if (this.mergedRect) return this.mergedRect
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const rect of this.dirtyRects) {
      minX = Math.min(minX, rect.x)
      minY = Math.min(minY, rect.y)
      maxX = Math.max(maxX, rect.x + rect.width)
      maxY = Math.max(maxY, rect.y + rect.height)
    }
    
    this.mergedRect = {
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY),
    }
    
    return this.mergedRect
  }

  /**
   * 清除所有脏区域
   */
  clear(): void {
    this.dirtyRects = []
    this.mergedRect = null
  }

  /**
   * 获取脏区域数量
   */
  get count(): number {
    return this.dirtyRects.length
  }

  /**
   * 启用/禁用脏矩形优化
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }
}

/**
 * 对象池
 * 复用频繁创建的对象，减少GC压力
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize = 100
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize
  }

  /**
   * 从池中获取对象
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createFn()
  }

  /**
   * 将对象归还池中
   */
  release(obj: T): void {
    if (this.pool.length >= this.maxSize) return
    this.resetFn(obj)
    this.pool.push(obj)
  }

  /**
   * 清空池
   */
  clear(): void {
    this.pool = []
  }

  /**
   * 获取池大小
   */
  get size(): number {
    return this.pool.length
  }
}

/**
 * 点对象池
 */
export const pointPool = new ObjectPool<number[]>(
  () => [0, 0, 0],
  (p) => { p[0] = 0; p[1] = 0; p[2] = 0 }
)

/**
 * 矩形对象池
 */
export const rectPool = new ObjectPool<Rect>(
  () => ({ x: 0, y: 0, width: 0, height: 0 }),
  (r) => { r.x = 0; r.y = 0; r.width = 0; r.height = 0 }
)

/**
 * 批量渲染器
 * 减少Canvas上下文切换
 */
export class BatchRenderer {
  private pendingOperations: Array<() => void> = []
  private batchSize: number
  private flushing = false

  constructor(batchSize = 50) {
    this.batchSize = batchSize
  }

  /**
   * 添加渲染操作到批次
   */
  enqueue(op: () => void): void {
    this.pendingOperations.push(op)
    if (this.pendingOperations.length >= this.batchSize) {
      this.flush()
    }
  }

  /**
   * 执行所有待处理操作
   */
  flush(): void {
    if (this.flushing) return
    this.flushing = true
    
    for (const op of this.pendingOperations) {
      op()
    }
    this.pendingOperations = []
    
    this.flushing = false
  }

  /**
   * 获取待处理操作数
   */
  get pendingCount(): number {
    return this.pendingOperations.length
  }
}

/**
 * 资源清理管理器
 * 追踪并清理事件监听器和定时器
 */
export class ResourceCleanupManager {
  private listeners: Array<{ target: EventTarget; event: string; handler: EventListener }> = []
  private timers: number[] = []
  private intervals: number[] = []

  /**
   * 添加事件监听器并追踪
   */
  addEventListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(event, handler, options)
    this.listeners.push({ target, event, handler })
  }

  /**
   * 设置超时并追踪
   */
  setTimeout(handler: () => void, delay: number): number {
    const id = window.setTimeout(() => {
      handler()
      this.timers = this.timers.filter(t => t !== id)
    }, delay)
    this.timers.push(id)
    return id
  }

  /**
   * 设置间隔并追踪
   */
  setInterval(handler: () => void, delay: number): number {
    const id = window.setInterval(handler, delay)
    this.intervals.push(id)
    return id
  }

  /**
   * 清理所有追踪的资源
   */
  cleanup(): void {
    // 清理事件监听器
    for (const { target, event, handler } of this.listeners) {
      target.removeEventListener(event, handler)
    }
    this.listeners = []

    // 清理定时器
    for (const id of this.timers) {
      window.clearTimeout(id)
    }
    this.timers = []

    // 清理间隔
    for (const id of this.intervals) {
      window.clearInterval(id)
    }
    this.intervals = []
  }
}

// 单例实例
export const globalDirtyRectManager = new DirtyRectManager()
export const globalBatchRenderer = new BatchRenderer()
export const globalResourceCleanup = new ResourceCleanupManager()

/**
 * 辅助函数：扩展CanvasRenderingContext2D
 * 使用脏矩形裁剪渲染
 */
export function withClipping(
  ctx: CanvasRenderingContext2D,
  rect: Rect | null,
  fn: () => void
): void {
  if (!rect) {
    fn()
    return
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.width, rect.height)
  ctx.clip()
  fn()
  ctx.restore()
}

/**
 * 计算两个矩形的并集
 */
export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const width = Math.max(a.x + a.width, b.x + b.width) - x
  const height = Math.max(a.y + a.height, b.y + b.height) - y
  return { x, y, width, height }
}

/**
 * 检查两个矩形是否相交
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}
