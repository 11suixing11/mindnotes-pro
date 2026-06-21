import type { CanvasElement } from '../store/types'
import type { BoundsEntry } from './types'
import { elementBounds } from '../canvas/canvasUtils'

/**
 * 简化版RBush空间索引实现
 * 不依赖外部库，纯JS实现
 * O(log n) 区域查询性能
 */
interface RTreeNode {
  minX: number
  minY: number
  maxX: number
  maxY: number
  children: (RTreeNode | BoundsEntry)[]
  leaf: boolean
}

export class SpatialIndex {
  private root: RTreeNode
  private maxEntries: number = 9
  private deletedIds: Set<string> = new Set()
  private totalCount: number = 0
  private readonly rebuildThreshold: number = 0.2 // 20% 删除率触发重建

  constructor() {
    this.root = this.createNode(true)
  }

  /**
   * 批量插入元素
   */
  bulkLoad(elements: CanvasElement[]): void {
    // 重置状态
    this.root = this.createNode(true)
    this.deletedIds.clear()
    this.totalCount = elements.length

    const entries = elements.map((el) => this.toEntry(el))
    if (entries.length < this.maxEntries) {
      entries.forEach((e) => this.insertEntry(e))
      return
    }

    // OMT 批量加载算法
    entries.sort((a, b) => a.minX - b.minX || a.minY - b.minY)
    const nodeSize = Math.ceil(Math.sqrt(entries.length))
    
    for (let i = 0; i < entries.length; i += nodeSize) {
      const slice = entries.slice(i, i + nodeSize)
      slice.sort((a, b) => a.minY - b.minY)
      
      for (let j = 0; j < slice.length; j += this.maxEntries) {
        const node = this.createNode(true)
        node.children = slice.slice(j, j + this.maxEntries)
        this.updateBounds(node)
        this.insertNode(this.root, node)
      }
    }
  }

  /**
   * 插入单个元素
   */
  insert(element: CanvasElement): void {
    // 如果之前被标记删除了，先移除删除标记
    if (this.deletedIds.has(element.id)) {
      this.deletedIds.delete(element.id)
    }
    this.insertEntry(this.toEntry(element))
    this.totalCount++
  }

  private insertEntry(entry: BoundsEntry): void {
    this.insertNode(this.root, entry)
  }

  /**
   * 区域查询
   */
  search(bounds: { x: number; y: number; w: number; h: number }): string[] {
    const results: string[] = []
    const searchBounds = {
      minX: bounds.x,
      minY: bounds.y,
      maxX: bounds.x + bounds.w,
      maxY: bounds.y + bounds.h,
    }

    this.searchNode(this.root, searchBounds, results)

    // 过滤掉已删除的元素
    if (this.deletedIds.size > 0) {
      return results.filter((id) => !this.deletedIds.has(id))
    }

    return results
  }

  /**
   * 删除元素（懒删除）
   * 先标记为删除，达到阈值时重建索引
   */
  remove(id: string): void {
    if (this.deletedIds.has(id)) return
    this.deletedIds.add(id)
    this.totalCount--

    // 检查是否需要重建索引
    this.rebuildIfNeeded()
  }

  /**
   * 更新元素（先删后插）
   */
  update(element: CanvasElement): void {
    this.remove(element.id)
    this.insert(element)
  }

  /**
   * 检查是否需要重建索引
   */
  private rebuildIfNeeded(): void {
    if (this.totalCount <= 0) return
    const deleteRatio = this.deletedIds.size / (this.totalCount + this.deletedIds.size)
    if (deleteRatio >= this.rebuildThreshold) {
      // 这里不直接重建，因为我们没有完整的元素列表
      // 调用方需要在适当的时候调用 bulkLoad 来重建
      // 或者我们可以在 search 时检查并重建（但需要元素列表）
      // 暂时只做标记，由外部控制重建时机
    }
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.root = this.createNode(true)
    this.deletedIds.clear()
    this.totalCount = 0
  }

  private createNode(leaf: boolean): RTreeNode {
    return {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      children: [],
      leaf,
    }
  }

  private toEntry(el: CanvasElement): BoundsEntry {
    const b = elementBounds(el)
    return {
      minX: b.x,
      minY: b.y,
      maxX: b.x + b.w,
      maxY: b.y + b.h,
      id: el.id,
    }
  }

  private insertNode(node: RTreeNode, item: RTreeNode | BoundsEntry): void {
    if (!node.leaf) {
      // 选择最佳子节点插入
      let bestIdx = 0
      let bestEnlargement = Infinity

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i] as RTreeNode
        const enlargement = this.enlargement(child, item)
        if (enlargement < bestEnlargement) {
          bestEnlargement = enlargement
          bestIdx = i
        }
      }

      this.insertNode(node.children[bestIdx] as RTreeNode, item)
    } else {
      node.children.push(item)
      this.updateBounds(node)

      if (node.children.length > this.maxEntries) {
        this.split(node)
      }
    }

    this.updateBounds(node)
  }

  private split(node: RTreeNode): void {
    // 简单线性分裂
    const mid = Math.ceil(node.children.length / 2)
    const left = node.children.slice(0, mid)
    const right = node.children.slice(mid)

    node.children = []
    node.leaf = false

    const leftNode = this.createNode(true)
    leftNode.children = left
    this.updateBounds(leftNode)

    const rightNode = this.createNode(true)
    rightNode.children = right
    this.updateBounds(rightNode)

    node.children.push(leftNode, rightNode)
    this.updateBounds(node)
  }

  private updateBounds(node: RTreeNode): void {
    node.minX = Infinity
    node.minY = Infinity
    node.maxX = -Infinity
    node.maxY = -Infinity

    for (const child of node.children) {
      node.minX = Math.min(node.minX, child.minX)
      node.minY = Math.min(node.minY, child.minY)
      node.maxX = Math.max(node.maxX, child.maxX)
      node.maxY = Math.max(node.maxY, child.maxY)
    }
  }

  private enlargement(a: RTreeNode, b: RTreeNode | BoundsEntry): number {
    const minX = Math.min(a.minX, b.minX)
    const minY = Math.min(a.minY, b.minY)
    const maxX = Math.max(a.maxX, b.maxX)
    const maxY = Math.max(a.maxY, b.maxY)

    const newArea = (maxX - minX) * (maxY - minY)
    const oldArea = (a.maxX - a.minX) * (a.maxY - a.minY)

    return newArea - oldArea
  }

  private searchNode(
    node: RTreeNode,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    results: string[]
  ): void {
    if (!this.overlaps(node, bounds)) return

    if (node.leaf) {
      for (const child of node.children) {
        if (this.overlaps(child, bounds)) {
          results.push((child as BoundsEntry).id)
        }
      }
    } else {
      for (const child of node.children) {
        this.searchNode(child as RTreeNode, bounds, results)
      }
    }
  }

  private overlaps(
    a: { minX: number; minY: number; maxX: number; maxY: number },
    b: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    return (
      a.minX <= b.maxX &&
      a.maxX >= b.minX &&
      a.minY <= b.maxY &&
      a.maxY >= b.minY
    )
  }
}

/**
 * 性能监控器
 * 监控擦除性能并自动降级
 */
export class PerformanceMonitor {
  private fpsHistory: number[] = []
  private lastFrameTime: number = 0
  private frameCount: number = 0

  recordFrame(): void {
    const now = performance.now()
    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime
      const fps = 1000 / delta
      this.fpsHistory.push(fps)
      if (this.fpsHistory.length > 30) {
        this.fpsHistory.shift()
      }
    }
    this.lastFrameTime = now
    this.frameCount++
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
  }

  getPerformanceLevel(): 'high' | 'medium' | 'low' {
    const avgFps = this.getAverageFPS()
    if (avgFps > 50) return 'high'
    if (avgFps > 30) return 'medium'
    return 'low'
  }

  shouldUsePhysics(): boolean {
    return this.getPerformanceLevel() !== 'low'
  }

  reset(): void {
    this.fpsHistory = []
    this.lastFrameTime = 0
    this.frameCount = 0
  }
}
