import { describe, expect, it } from 'vitest'
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
