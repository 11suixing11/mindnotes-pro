import type { CanvasElement } from '../store/types'

/**
 * Mermaid → native canvas elements.
 *
 * AI assistants (Doubao, ChatGPT, Claude…) emit diagrams as Mermaid code.
 * This importer parses the subset they actually generate — `flowchart` /
 * `graph` and `mindmap` — and lays it out as editable shapes, text and
 * arrows, so a pasted diagram becomes a real whiteboard object instead of
 * a dead picture.
 */

export type MermaidNodeShape = 'rect' | 'round' | 'circle' | 'diamond'

export interface MermaidNode {
  id: string
  label: string
  shape: MermaidNodeShape
}

export interface MermaidEdge {
  from: string
  to: string
  label?: string
  arrow: boolean
}

export interface MermaidDiagram {
  kind: 'flowchart' | 'mindmap'
  direction: 'TD' | 'LR'
  nodes: MermaidNode[]
  edges: MermaidEdge[]
}

export interface MermaidImportResult {
  elements: CanvasElement[]
  width: number
  height: number
  nodeCount: number
  edgeCount: number
}

export type MermaidImportOutcome =
  | { ok: true; result: MermaidImportResult }
  | { ok: false; error: string }

interface FlowNode {
  id: string
  label: string
  shape: MermaidNodeShape
}

type FlowEdge = MermaidEdge

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const NODE_RE = /([A-Za-z0-9_]+)\s*(?:\(\(([^)]*)\)\)|\(([^()]*)\)|\[([^\][]*)\]|\{([^}]*)\})?/y

const ARROW_RE =
  /(?<op>-{2}>|-\.+->|={2}>|={3}|-{3}|--\s*[^>|;\r\n]*?-->|-\.+-|--)(?:\|(?<label>[^|]*)\|)?/y

const NO_ARROWHEAD_OPS = new Set(['===', '---', '-.-', '--'])

const SKIP_LINE_RE =
  /^\s*(?:%%|classDef\s|class\s+|style\s+|linkStyle\s|click\s|subgraph\b|end\b|direction\b)/

function stripFences(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*```/.test(line))
    .join('\n')
}

function cleanLabel(raw: string | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .trim()
}

interface NodeToken {
  id: string
  label: string
  shape: MermaidNodeShape
  /** true when the token carried an explicit shape/label wrapper like [x] or ((x)). */
  explicit: boolean
  end: number
}

function parseNodeToken(line: string, start: number): NodeToken | null {
  NODE_RE.lastIndex = start
  const match = NODE_RE.exec(line)
  if (!match || match.index !== start) return null
  const [, id, circleLabel, roundLabel, rectLabel, diamondLabel] = match
  const explicit =
    circleLabel !== undefined ||
    roundLabel !== undefined ||
    rectLabel !== undefined ||
    diamondLabel !== undefined
  const label = explicit ? cleanLabel(circleLabel ?? roundLabel ?? rectLabel ?? diamondLabel) : id
  const shape: MermaidNodeShape =
    circleLabel !== undefined
      ? 'circle'
      : diamondLabel !== undefined
        ? 'diamond'
        : roundLabel !== undefined
          ? 'round'
          : 'rect'
  return { id, label, shape, explicit, end: NODE_RE.lastIndex }
}

interface ArrowToken {
  arrow: boolean
  label?: string
  end: number
}

function parseArrowToken(line: string, start: number): ArrowToken | null {
  ARROW_RE.lastIndex = start
  const match = ARROW_RE.exec(line)
  if (!match || match.index !== start) return null
  const { op, label } = match.groups as { op: string; label?: string }
  const bareOp = op.replace(/\s*[^>|;\r\n]*?-->$/, '-->')
  return {
    arrow: !NO_ARROWHEAD_OPS.has(bareOp),
    label: cleanLabel(label) || undefined,
    end: ARROW_RE.lastIndex,
  }
}

function parseFlowLine(line: string, nodes: Map<string, FlowNode>, edges: FlowEdge[]): void {
  let pos = 0
  const skipSpaces = () => {
    while (pos < line.length && /\s/.test(line[pos])) pos += 1
  }
  skipSpaces()
  const first = parseNodeToken(line, pos)
  if (!first) return
  const existing = nodes.get(first.id)
  if (!existing) {
    nodes.set(first.id, { id: first.id, label: first.label, shape: first.shape })
  } else if (first.explicit) {
    // Mermaid semantics: a later definition overrides shape and label.
    existing.label = first.label
    existing.shape = first.shape
  }
  let last: NodeToken = first
  pos = first.end

  for (;;) {
    pos = pos + (line.slice(pos).length - line.slice(pos).trimStart().length)
    const arrow = parseArrowToken(line, pos)
    if (!arrow) return
    pos = arrow.end
    while (pos < line.length && /\s/.test(line[pos])) pos += 1
    const next = parseNodeToken(line, pos)
    if (!next) return
    const existingNext = nodes.get(next.id)
    if (!existingNext) {
      nodes.set(next.id, { id: next.id, label: next.label, shape: next.shape })
    } else if (next.explicit) {
      existingNext.label = next.label
      existingNext.shape = next.shape
    }
    edges.push({ from: last.id, to: next.id, label: arrow.label, arrow: arrow.arrow })
    last = next
    pos = next.end
  }
}

export function parseMermaidDiagram(source: string): MermaidDiagram | null {
  const text = stripFences(source.replace(/\r\n/g, '\n'))
  const lines = text.split('\n')
  const headerIndex = lines.findIndex((line) => line.trim().length > 0)
  if (headerIndex === -1) return null
  const headerLine = lines[headerIndex].trim()

  if (/^mindmap\b/i.test(headerLine)) {
    return parseMindmap(lines.slice(headerIndex + 1))
  }

  const flowMatch = /^(?:flowchart|graph)\b(?:\s+(TD|TB|LR|RL|BT))?/i.exec(headerLine)
  if (!flowMatch) return null

  const direction = /LR|RL/i.test(flowMatch[1] ?? 'TD') ? 'LR' : 'TD'
  const nodes = new Map<string, FlowNode>()
  const edges: FlowEdge[] = []

  let inSubgraph = false
  for (const raw of lines.slice(headerIndex + 1)) {
    const line = raw.trim()
    if (!line) continue
    if (/^subgraph\b/i.test(line)) {
      inSubgraph = true
      continue
    }
    if (/^end\b/i.test(line)) {
      inSubgraph = false
      continue
    }
    if (inSubgraph || SKIP_LINE_RE.test(raw)) continue
    parseFlowLine(line, nodes, edges)
  }

  if (nodes.size === 0) return null
  return {
    kind: 'flowchart',
    direction,
    nodes: [...nodes.values()],
    edges: edges.filter(
      (edge) => edge.from !== edge.to && nodes.has(edge.from) && nodes.has(edge.to)
    ),
  }
}

interface MindmapTreeNode {
  label: string
  shape: MermaidNodeShape
  children: MindmapTreeNode[]
}

function parseMindmap(lines: string[]): MermaidDiagram | null {
  const stack: { depth: number; node: MindmapTreeNode }[] = []
  let root: MindmapTreeNode | null = null

  for (const raw of lines) {
    if (!raw.trim() || SKIP_LINE_RE.test(raw)) continue
    const content = raw.replace(/::icon\([^)]*\)/g, '').trim()
    if (!content) continue
    const indent = raw.length - raw.trimStart().length
    const depth = Math.max(0, Math.floor(indent / 2))
    const parsed = parseNodeToken(content, 0) ?? {
      id: content,
      label: cleanLabel(content),
      shape: 'rect' as MermaidNodeShape,
      end: content.length,
    }
    const node: MindmapTreeNode = {
      label: parsed.label || parsed.id,
      shape: parsed.shape,
      children: [],
    }
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop()
    if (stack.length === 0) {
      if (!root) root = node
    } else {
      stack[stack.length - 1].node.children.push(node)
    }
    stack.push({ depth, node })
  }

  if (!root) return null

  const nodes: MermaidNode[] = []
  const edges: FlowEdge[] = []
  let counter = 0
  const walk = (node: MindmapTreeNode, isRoot: boolean): string => {
    const id = `mm${counter}`
    counter += 1
    nodes.push({
      id,
      label: node.label,
      shape: isRoot ? 'circle' : node.shape === 'circle' ? 'round' : node.shape,
    })
    for (const child of node.children) {
      const childId = walk(child, false)
      edges.push({ from: id, to: childId, arrow: false })
    }
    return id
  }
  walk(root, true)

  if (nodes.length === 0) return null
  return { kind: 'mindmap', direction: 'LR', nodes, edges }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PALETTE = [
  { fill: '#EDE9F7', stroke: '#6B5B95', text: '#4A3F78' },
  { fill: '#E6F2EA', stroke: '#4E7A58', text: '#2F5238' },
  { fill: '#E4EEF8', stroke: '#3F6E96', text: '#2B4E6B' },
  { fill: '#F7EDE2', stroke: '#9A6A45', text: '#6E4A2E' },
]

const EDGE_COLOR = '#64748B'
const NODE_FONT = 16
const NODE_H = 48
const RANK_GAP = 68
const SIBLING_GAP = 36
const EDGE_PULL = 6

function measureLabel(label: string, fontSize: number): number {
  let width = 0
  for (const char of label) {
    width += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char) ? fontSize : fontSize * 0.58
  }
  return width
}

function computeRanks(nodeIds: string[], edges: FlowEdge[]): Map<string, number> {
  const incoming = new Map<string, string[]>()
  for (const id of nodeIds) incoming.set(id, [])
  for (const edge of edges) incoming.get(edge.to)?.push(edge.from)

  const memo = new Map<string, number>()
  const active = new Set<string>()
  const rankOf = (id: string): number => {
    const cached = memo.get(id)
    if (cached !== undefined) return cached
    if (active.has(id)) return 0
    active.add(id)
    let rank = 0
    for (const prev of incoming.get(id) ?? []) {
      rank = Math.max(rank, rankOf(prev) + 1)
    }
    active.delete(id)
    memo.set(id, rank)
    return rank
  }
  for (const id of nodeIds) rankOf(id)
  return memo
}

interface LaidBox {
  x: number
  y: number
  w: number
  h: number
}

function edgePoint(box: LaidBox, towards: { x: number; y: number }): { x: number; y: number } {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = towards.x - cx
  const dy = towards.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const scaleX = dx !== 0 ? box.w / 2 / Math.abs(dx) : Infinity
  const scaleY = dy !== 0 ? box.h / 2 / Math.abs(dy) : Infinity
  const scale = Math.min(scaleX, scaleY)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

function nodeShape(
  id: string,
  kind: 'rectangle' | 'circle',
  box: LaidBox,
  palette: (typeof PALETTE)[number],
  rotation?: number
): CanvasElement {
  return {
    type: 'shape',
    id: `mm-node-${id}`,
    kind,
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    color: palette.stroke,
    size: 2,
    fillColor: palette.fill,
    rotation,
  }
}

function nodeText(
  id: string,
  label: string,
  box: LaidBox,
  palette: (typeof PALETTE)[number],
  fontSize: number
): CanvasElement {
  const labelWidth = measureLabel(label, fontSize)
  return {
    type: 'text',
    id: `mm-text-${id}`,
    x: box.x + (box.w - (labelWidth + 12)) / 2,
    y: box.y + (box.h - fontSize * 1.6) / 2,
    width: labelWidth + 12,
    height: Math.round(fontSize * 1.6),
    content: label,
    originalContent: label,
    autoResize: false,
    fontSize,
    color: palette.text,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'transparent',
  }
}

function layoutFlowchart(diagram: MermaidDiagram): CanvasElement[] {
  const ids = diagram.nodes.map((node) => node.id)
  const ranks = computeRanks(ids, diagram.edges)
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]))
  const vertical = diagram.direction === 'TD'

  const rows = new Map<number, string[]>()
  for (const id of ids) {
    const rank = ranks.get(id) ?? 0
    const row = rows.get(rank) ?? []
    row.push(id)
    rows.set(rank, row)
  }
  const rankedRanks = [...rows.keys()].sort((a, b) => a - b)

  const boxes = new Map<string, LaidBox & { shape: MermaidNodeShape; label: string }>()
  let cursor = 0
  for (const rank of rankedRanks) {
    const rowNodes = (rows.get(rank) ?? []).map((id) => byId.get(id)!)
    const widths = rowNodes.map((node) => {
      const labelWidth = measureLabel(node.label, NODE_FONT)
      if (node.shape === 'diamond') return Math.max(96, labelWidth + 56) * 1.32
      return Math.max(96, labelWidth + 40)
    })
    const rowWidth = widths.reduce((sum, w) => sum + w, 0) + SIBLING_GAP * (rowNodes.length - 1)
    let cross = vertical ? -rowWidth / 2 : cursor
    rowNodes.forEach((node, index) => {
      const w = widths[index]
      boxes.set(node.id, {
        x: vertical ? cross : cursor,
        y: vertical ? cursor : -rowWidth / 2,
        w,
        h: NODE_H + 16,
        shape: node.shape,
        label: node.label,
      })
      cross += w + SIBLING_GAP
    })
    cursor += NODE_H + 16 + RANK_GAP
  }

  const elements: CanvasElement[] = []
  diagram.nodes.forEach((node, index) => {
    const box = boxes.get(node.id)!
    const palette = PALETTE[index % PALETTE.length]
    if (node.shape === 'diamond') {
      const side = Math.max(84, (measureLabel(node.label, NODE_FONT) + 56) / 1.2)
      const cx = box.x + box.w / 2
      const cy = box.y + box.h / 2
      elements.push(
        nodeShape(`diamond-${node.id}`, 'rectangle', { x: cx - side / 2, y: cy - side / 2, w: side, h: side }, palette, Math.PI / 4)
      )
      elements.push(nodeText(`diamond-${node.id}`, node.label, { x: cx - 80, y: cy - 24, w: 160, h: 48 }, palette, NODE_FONT))
      return
    }
    const kind = node.shape === 'circle' || node.shape === 'round' ? 'circle' : 'rectangle'
    elements.push(nodeShape(node.id, kind, box, palette))
    elements.push(nodeText(node.id, node.label, box, palette, NODE_FONT))
  })

  diagram.edges.forEach((edge, index) => {
    const from = boxes.get(edge.from)!
    const to = boxes.get(edge.to)!
    const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 }
    const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 }
    const start = edgePoint(from, toCenter)
    const end = edgePoint(to, fromCenter)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (length < 12) return
    const pull = EDGE_PULL / length
    const sx = start.x + dx * pull
    const sy = start.y + dy * pull
    const ex = end.x - dx * pull
    const ey = end.y - dy * pull
    elements.push({
      type: 'shape',
      id: `mm-edge-${index}`,
      kind: edge.arrow ? 'arrow' : 'line',
      x: sx,
      y: sy,
      w: ex - sx,
      h: ey - sy,
      color: EDGE_COLOR,
      size: 2.5,
    })
    if (edge.label) {
      const labelWidth = measureLabel(edge.label, 13) + 10
      elements.push({
        type: 'text',
        id: `mm-edge-label-${index}`,
        x: (sx + ex) / 2 - labelWidth / 2,
        y: (sy + ey) / 2 - 11,
        width: labelWidth,
        height: 22,
        content: edge.label,
        originalContent: edge.label,
        autoResize: false,
        fontSize: 13,
        color: EDGE_COLOR,
        fontWeight: 'normal',
        textAlign: 'center',
        backgroundColor: 'transparent',
      })
    }
  })

  return elements
}

interface MindmapLayoutNode {
  id: string
  label: string
  shape: MermaidNodeShape
  depth: number
  children: MindmapLayoutNode[]
  x: number
  y: number
  w: number
  h: number
}

function layoutMindmap(diagram: MermaidDiagram): CanvasElement[] {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]))
  const childrenOf = new Map<string, string[]>()
  const isChild = new Set<string>()
  for (const edge of diagram.edges) {
    const list = childrenOf.get(edge.from) ?? []
    list.push(edge.to)
    childrenOf.set(edge.from, list)
    isChild.add(edge.to)
  }
  const rootId = diagram.nodes.find((node) => !isChild.has(node.id))?.id ?? diagram.nodes[0].id

  const build = (id: string, depth: number): MindmapLayoutNode => {
    const node = byId.get(id)!
    const labelWidth = measureLabel(node.label, depth === 0 ? 18 : NODE_FONT)
    return {
      id,
      label: node.label,
      shape: node.shape,
      depth,
      children: (childrenOf.get(id) ?? []).map((childId) => build(childId, depth + 1)),
      x: 0,
      y: 0,
      w: depth === 0 ? Math.max(150, labelWidth + 44) : Math.max(88, labelWidth + 32),
      h: depth === 0 ? 76 : 44,
    }
  }
  const root = build(rootId, 0)

  let rowCursor = 0
  const assignRows = (node: MindmapLayoutNode) => {
    if (node.children.length === 0) {
      node.y = rowCursor * 66
      rowCursor += 1
      return
    }
    node.children.forEach(assignRows)
    const first = node.children[0]
    const last = node.children[node.children.length - 1]
    node.y = (first.y + last.y) / 2
  }
  assignRows(root)

  const depthMax = new Map<number, number>()
  const collect = (node: MindmapLayoutNode) => {
    depthMax.set(node.depth, Math.max(depthMax.get(node.depth) ?? 0, node.w))
    node.children.forEach(collect)
  }
  collect(root)
  const columnX = new Map<number, number>()
  let xCursor = 0
  for (const depth of [...depthMax.keys()].sort((a, b) => a - b)) {
    columnX.set(depth, xCursor)
    xCursor += (depthMax.get(depth) ?? 0) + 110
  }
  const place = (node: MindmapLayoutNode) => {
    node.x = columnX.get(node.depth) ?? 0
    node.children.forEach(place)
  }
  place(root)

  const elements: CanvasElement[] = []
  const walk = (node: MindmapLayoutNode, paletteIndex: number) => {
    const palette = PALETTE[paletteIndex % PALETTE.length]
    const right = { x: node.x + node.w, y: node.y + node.h / 2 }
    for (const child of node.children) {
      elements.push({
        type: 'shape',
        id: `mm-line-${node.id}-${child.id}`,
        kind: 'line',
        x: right.x,
        y: right.y,
        w: child.x - right.x,
        h: child.y + child.h / 2 - right.y,
        color: palette.stroke,
        size: 2.5,
      })
    }
    const fontSize = node.depth === 0 ? 18 : NODE_FONT
    const kind = node.depth === 0 || node.shape === 'round' || node.shape === 'circle' ? 'circle' : 'rectangle'
    elements.push(nodeShape(node.id, kind, node, palette))
    elements.push(nodeText(node.id, node.label, node, palette, fontSize))
    node.children.forEach((child, index) => walk(child, paletteIndex + index + 1))
  }
  walk(root, 1)
  return elements
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

export function importMermaidDiagram(source: string): MermaidImportOutcome {
  const diagram = parseMermaidDiagram(source)
  if (!diagram) {
    return {
      ok: false,
      error: '无法识别 Mermaid 代码：需要以 flowchart / graph / mindmap 开头',
    }
  }

  const elements =
    diagram.kind === 'mindmap' ? layoutMindmap(diagram) : layoutFlowchart(diagram)
  if (elements.length === 0) {
    return { ok: false, error: 'Mermaid 代码里没有可绘制的节点' }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const element of elements) {
    if (element.type !== 'shape' && element.type !== 'text') continue
    const x = element.x
    const y = element.y
    const w = element.type === 'shape' ? element.w : element.width
    const h = element.type === 'shape' ? element.h : element.height
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  }

  return {
    ok: true,
    result: {
      elements,
      width: maxX - minX,
      height: maxY - minY,
      nodeCount: diagram.nodes.length,
      edgeCount: diagram.edges.length,
    },
  }
}
