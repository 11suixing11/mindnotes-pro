import { describe, expect, it } from 'vitest'
import type { CanvasElement } from './model'
import { importMermaidDiagram, parseMermaidDiagram } from './mermaidImport'

const DOUBAO_FLOWCHART = `flowchart TD
    A[开始] --> B{数据是否有效?}
    B -->|是| C[处理数据]
    B -->|否| D[提示错误]
    C --> E((结束))
    D --> E`

describe('parseMermaidDiagram', () => {
  it('parses a Doubao-style flowchart with labelled branches', () => {
    const diagram = parseMermaidDiagram(DOUBAO_FLOWCHART)
    expect(diagram?.kind).toBe('flowchart')
    expect(diagram?.direction).toBe('TD')
    expect(diagram?.nodes).toHaveLength(5)
    expect(diagram?.edges).toHaveLength(5)
    expect(diagram?.nodes.find((node) => node.id === 'B')?.shape).toBe('diamond')
    expect(diagram?.nodes.find((node) => node.id === 'E')?.shape).toBe('circle')
    expect(diagram?.nodes.find((node) => node.id === 'B')?.label).toBe('数据是否有效?')
    expect(diagram?.edges.filter((edge) => edge.label)).toHaveLength(2)
    expect(diagram?.edges.find((edge) => edge.label === '否')?.to).toBe('D')
  })

  it('accepts fenced code, graph keyword and chained edges', () => {
    const diagram = parseMermaidDiagram('```mermaid\ngraph LR\n A --> B --> C\n```')
    expect(diagram?.direction).toBe('LR')
    expect(diagram?.edges.map((edge) => [edge.from, edge.to])).toEqual([
      ['A', 'B'],
      ['B', 'C'],
    ])
  })

  it('parses an indented mindmap into a tree', () => {
    const diagram = parseMermaidDiagram(`mindmap
  root((中心主题))
    分支A
      A1
    分支B`)
    expect(diagram?.kind).toBe('mindmap')
    expect(diagram?.nodes).toHaveLength(4)
    const root = diagram?.nodes[0]
    expect(root?.label).toBe('中心主题')
    expect(diagram?.edges.filter((edge) => edge.from === root?.id)).toHaveLength(2)
  })

  it('lets a later node definition override shape and label (Mermaid semantics)', () => {
    const diagram = parseMermaidDiagram(`flowchart TD
    A --> B
    B --> C
    C((完成创作))`)
    const c = diagram?.nodes.find((node) => node.id === 'C')
    expect(c?.shape).toBe('circle')
    expect(c?.label).toBe('完成创作')
  })

  it('returns null for non-mermaid text', () => {
    expect(parseMermaidDiagram('随便一段文字')).toBeNull()
    expect(parseMermaidDiagram('')).toBeNull()
  })
})

describe('importMermaidDiagram', () => {
  it('renders the flowchart as shapes, texts, arrows and edge labels', () => {
    const outcome = importMermaidDiagram(DOUBAO_FLOWCHART)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const { elements, nodeCount, edgeCount } = outcome.result
    expect(nodeCount).toBe(5)
    expect(edgeCount).toBe(5)
    const shapes = elements.filter((element) => element.type === 'shape')
    const texts = elements.filter((element) => element.type === 'text')
    expect(shapes.filter((el) => el.type === 'shape' && el.kind === 'arrow')).toHaveLength(5)
    expect(shapes.filter((el) => el.type === 'shape' && el.kind === 'circle')).toHaveLength(1)
    expect(texts.some((el) => el.type === 'text' && el.content === '是')).toBe(true)
    expect(texts.some((el) => el.type === 'text' && el.content === '处理数据')).toBe(true)
  })

  it('produces finite, positive-size bounds for every element', () => {
    const outcome = importMermaidDiagram(DOUBAO_FLOWCHART)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    for (const element of outcome.result.elements) {
      if (element.type === 'shape') {
        expect(Number.isFinite(element.x)).toBe(true)
        expect(Number.isFinite(element.y)).toBe(true)
        expect(Number.isFinite(element.w)).toBe(true)
        expect(Number.isFinite(element.h)).toBe(true)
      }
      if (element.type === 'text') {
        expect(Number.isFinite(element.x)).toBe(true)
        expect(Number.isFinite(element.y)).toBe(true)
        expect(element.width).toBeGreaterThan(0)
        expect(element.height).toBeGreaterThan(0)
      }
    }
    expect(outcome.result.width).toBeGreaterThan(0)
    expect(outcome.result.height).toBeGreaterThan(0)
  })

  it('renders a mindmap with connector lines', () => {
    const outcome = importMermaidDiagram(`mindmap
  root((中心主题))
    分支A
      A1
    分支B`)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const lines = outcome.result.elements.filter(
      (element) => element.type === 'shape' && element.kind === 'line'
    )
    expect(lines).toHaveLength(3)
  })

  it('reports a readable error for unrecognised code', () => {
    const outcome = importMermaidDiagram('hello world')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.error).toContain('Mermaid')
  })
})

describe('importMermaidDiagram layout', () => {
  const LR_BRANCHES = `flowchart LR
    A[开始] --> B[校验]
    B --> C[审核]
    C -->|是| D[导出分享]
    C -->|否| E[再改改]`

  const LR_LOOP = `flowchart LR
    A[开始] --> B[校验]
    B --> C[审核]
    C -->|是| D[通过]
    C -->|否| B`

  interface Box {
    x: number
    y: number
    w: number
    h: number
  }

  const nodeBoxes = (elements: CanvasElement[]): Map<string, Box> => {
    const boxes = new Map<string, Box>()
    for (const element of elements) {
      if (element.type !== 'shape' || !element.id.startsWith('mm-node-')) continue
      boxes.set(element.id, { x: element.x, y: element.y, w: element.w, h: element.h })
    }
    return boxes
  }

  const overlaps = (a: Box, b: Box): boolean =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

  it('spreads LR branch siblings vertically instead of stacking them', () => {
    const outcome = importMermaidDiagram(LR_BRANCHES)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const { elements, edgeCount } = outcome.result
    const boxes = nodeBoxes(elements)
    const d = boxes.get('mm-node-D')
    const e = boxes.get('mm-node-E')
    expect(d).toBeDefined()
    expect(e).toBeDefined()
    expect(d!.y).not.toBe(e!.y)
    expect(overlaps(d!, e!)).toBe(false)

    const arrows = elements.filter((el) => el.type === 'shape' && el.kind === 'arrow')
    expect(arrows).toHaveLength(edgeCount)
    expect(edgeCount).toBe(4)

    const texts = elements.filter((el) => el.type === 'text')
    expect(texts.some((el) => el.type === 'text' && el.content === '是')).toBe(true)
    expect(texts.some((el) => el.type === 'text' && el.content === '否')).toBe(true)
  })

  it('keeps every LR node disjoint when a loop edge points back', () => {
    const outcome = importMermaidDiagram(LR_LOOP)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const { elements } = outcome.result
    const boxes = [...nodeBoxes(elements).values()]
    expect(boxes.length).toBeGreaterThanOrEqual(4)
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        expect(overlaps(boxes[i], boxes[j])).toBe(false)
      }
    }

    const arrows = elements.filter((el) => el.type === 'shape' && el.kind === 'arrow')
    expect(arrows.length).toBeGreaterThanOrEqual(3)
  })

  it('keeps the TD placeholder spreading siblings horizontally', () => {
    const outcome = importMermaidDiagram(DOUBAO_FLOWCHART)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const boxes = nodeBoxes(outcome.result.elements)
    const c = boxes.get('mm-node-C')
    const d = boxes.get('mm-node-D')
    expect(c).toBeDefined()
    expect(d).toBeDefined()
    expect(c!.y).toBe(d!.y)
    expect(c!.x).not.toBe(d!.x)
    expect(overlaps(c!, d!)).toBe(false)
  })
})
