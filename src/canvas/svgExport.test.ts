import { describe, it, expect } from 'vitest'
import { buildSVGString } from './svgExport'
import type {
  CanvasElement,
  StrokeElement,
  ShapeElement,
  TextElement,
  ImageElement,
} from '../store/types'

describe('buildSVGString', () => {
  const W = 800
  const H = 600

  it('should return a valid SVG wrapper with background rect', () => {
    const svg = buildSVGString([], { width: W, height: H })
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain(`width="${W}"`)
    expect(svg).toContain(`height="${H}"`)
    expect(svg).toContain('</svg>')
    expect(svg).toContain('<rect width="100%" height="100%"')
  })

  it('should use dark background when isDarkMode is true', () => {
    const svg = buildSVGString([], { width: W, height: H, isDarkMode: true })
    expect(svg).toContain('#1C1A24')
  })

  it('should use white background when isDarkMode is false', () => {
    const svg = buildSVGString([], { width: W, height: H, isDarkMode: false })
    expect(svg).toContain('#ffffff')
  })

  it('should default to light mode', () => {
    const svg = buildSVGString([], { width: W, height: H })
    expect(svg).toContain('#ffffff')
  })

  it('should include arrowhead marker in defs', () => {
    const svg = buildSVGString([], { width: W, height: H })
    expect(svg).toContain('id="arrowhead"')
    expect(svg).toContain('<defs>')
    expect(svg).toContain('</defs>')
  })

  // ── strokes ─────────────────────────────────────────────────────────────

  describe('strokes', () => {
    it('should render a stroke with 2+ points as an SVG path', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        color: '#ff0000',
        size: 3,
        brush: 'pen',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('<path')
      expect(svg).toContain('M10 20L30 40L50 60')
      expect(svg).toContain('stroke="#ff0000"')
      expect(svg).toContain('stroke-width="3"')
      expect(svg).toContain('fill="none"')
      expect(svg).toContain('stroke-linecap="round"')
    })

    it('should skip stroke with fewer than 2 points', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [[10, 20]],
        color: '#000',
        size: 2,
        brush: 'pen',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).not.toContain('<path')
    })

    it('should render highlighter stroke with lower opacity', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [100, 100],
        ],
        color: '#ffff00',
        size: 4,
        brush: 'highlighter',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('opacity="0.3"')
    })

    it('should render highlighter with custom opacity', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [100, 100],
        ],
        color: '#ffff00',
        size: 4,
        brush: 'highlighter',
        opacity: 0.5,
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('opacity="0.5"')
    })

    it('should render pencil stroke with opacity', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [50, 50],
        ],
        color: '#000',
        size: 2,
        brush: 'pencil',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('opacity="0.65"')
    })

    it('should render dashed stroke with stroke-dasharray', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [100, 100],
        ],
        color: '#000',
        size: 2,
        brush: 'dashed',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('stroke-dasharray="4 3"')
    })

    it('should render marker stroke as a bold semi-opaque path', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [100, 100],
        ],
        color: '#111111',
        size: 5,
        brush: 'marker',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('stroke-width="11"')
      expect(svg).toContain('opacity="0.9"')
    })

    it('should render watercolor stroke with transparent wider output', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [100, 100],
        ],
        color: '#228be6',
        size: 5,
        brush: 'watercolor',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('stroke-width="13"')
      expect(svg).toContain('opacity="0.28"')
    })

    it('should render crayon stroke with rough-style opacity', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [100, 100],
        ],
        color: '#d9480f',
        size: 5,
        brush: 'crayon',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('stroke-width="5.75"')
      expect(svg).toContain('opacity="0.78"')
    })

    it('should render glow stroke with filter', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [100, 100],
        ],
        color: '#ff00ff',
        size: 4,
        brush: 'glow',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('filter="url(#glow)"')
      expect(svg).toContain('<filter id="glow">')
    })
  })

  // ── shapes ──────────────────────────────────────────────────────────────

  describe('shapes', () => {
    it('should render a rectangle', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh1',
        kind: 'rectangle',
        x: 10,
        y: 20,
        w: 100,
        h: 50,
        color: '#0000ff',
        size: 2,
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('<rect')
      expect(svg).toContain('x="10"')
      expect(svg).toContain('y="20"')
      expect(svg).toContain('width="100"')
      expect(svg).toContain('height="50"')
      expect(svg).toContain('stroke="#0000ff"')
      expect(svg).toContain('fill="none"')
      expect(svg).toContain('rx="3"')
    })

    it('should render a rectangle with fill color', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh1',
        kind: 'rectangle',
        x: 10,
        y: 20,
        w: 100,
        h: 50,
        color: '#0000ff',
        size: 2,
        fillColor: '#ffcc00',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('fill="#ffcc00"')
    })

    it('should treat transparent fillColor as none', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh1',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 50,
        h: 50,
        color: '#000',
        size: 1,
        fillColor: 'transparent',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('fill="none"')
    })

    it('should render an ellipse for circle kind', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh2',
        kind: 'circle',
        x: 50,
        y: 50,
        w: 100,
        h: 80,
        color: '#00ff00',
        size: 3,
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('<ellipse')
      expect(svg).toContain('cx="100"')
      expect(svg).toContain('cy="90"')
      expect(svg).toContain('rx="50"')
      expect(svg).toContain('ry="40"')
    })

    it('should render a line', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh3',
        kind: 'line',
        x: 0,
        y: 0,
        w: 200,
        h: 100,
        color: '#333',
        size: 1,
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('<line')
      expect(svg).toContain('x1="0"')
      expect(svg).toContain('y1="0"')
      expect(svg).toContain('x2="200"')
      expect(svg).toContain('y2="100"')
      expect(svg).not.toContain('marker-end')
    })

    it('should render an arrow with arrowhead marker', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh4',
        kind: 'arrow',
        x: 10,
        y: 10,
        w: 150,
        h: 75,
        color: '#ff0000',
        size: 2,
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('<line')
      expect(svg).toContain('marker-end="url(#arrowhead)"')
    })
  })

  // ── text ────────────────────────────────────────────────────────────────

  describe('text', () => {
    it('should render single-line text', () => {
      const el: TextElement = {
        type: 'text',
        id: 't1',
        x: 100,
        y: 200,
        width: 200,
        height: 30,
        content: 'Hello World',
        fontSize: 16,
        color: '#000000',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('<text')
      expect(svg).toContain('x="100"')
      expect(svg).toContain('y="216"')
      expect(svg).toContain('font-size="16"')
      expect(svg).toContain('Hello World')
      expect(svg).toContain('font-family="sans-serif"')
    })

    it('should render multi-line text with tspan', () => {
      const el: TextElement = {
        type: 'text',
        id: 't1',
        x: 50,
        y: 50,
        width: 200,
        height: 60,
        content: 'Line 1\nLine 2\nLine 3',
        fontSize: 12,
        color: '#333',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('<tspan')
      expect(svg).toContain('Line 1')
      expect(svg).toContain('Line 2')
      expect(svg).toContain('Line 3')
    })

    it('should escape XML special characters in text', () => {
      const el: TextElement = {
        type: 'text',
        id: 't1',
        x: 0,
        y: 0,
        width: 200,
        height: 30,
        content: '<script>alert("xss")</script>',
        fontSize: 14,
        color: '#000',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).not.toContain('<script>')
      expect(svg).toContain('&lt;script&gt;')
      expect(svg).toContain('&quot;xss&quot;')
    })

    it('should escape ampersands', () => {
      const el: TextElement = {
        type: 'text',
        id: 't1',
        x: 0,
        y: 0,
        width: 200,
        height: 30,
        content: 'A & B',
        fontSize: 14,
        color: '#000',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('A &amp; B')
    })
  })

  // ── images ──────────────────────────────────────────────────────────────

  describe('images', () => {
    it('should render an image element', () => {
      const el: ImageElement = {
        type: 'image',
        id: 'img1',
        x: 10,
        y: 20,
        width: 200,
        height: 150,
        dataUrl: 'data:image/png;base64,abc123',
      }
      const svg = buildSVGString([el], { width: W, height: H })
      expect(svg).toContain('<image')
      expect(svg).toContain('x="10"')
      expect(svg).toContain('y="20"')
      expect(svg).toContain('width="200"')
      expect(svg).toContain('height="150"')
      expect(svg).toContain('href="data:image/png;base64,abc123"')
      expect(svg).toContain('preserveAspectRatio="none"')
    })
  })

  // ── mixed elements ──────────────────────────────────────────────────────

  describe('mixed elements', () => {
    it('should render multiple elements in order', () => {
      const els: CanvasElement[] = [
        {
          type: 'stroke',
          id: 's1',
          points: [
            [0, 0],
            [100, 100],
          ],
          color: '#f00',
          size: 2,
          brush: 'pen',
        },
        {
          type: 'shape',
          id: 'sh1',
          kind: 'rectangle',
          x: 50,
          y: 50,
          w: 100,
          h: 100,
          color: '#00f',
          size: 2,
        },
        {
          type: 'text',
          id: 't1',
          x: 60,
          y: 60,
          width: 80,
          height: 20,
          content: 'Label',
          fontSize: 14,
          color: '#000',
        },
      ]
      const svg = buildSVGString(els, { width: W, height: H })
      // Elements should appear in order
      const pathIdx = svg.indexOf('<path')
      const rectIdx = svg.indexOf('<rect x="50"')
      const textIdx = svg.indexOf('<text x="60"')
      expect(pathIdx).toBeGreaterThan(0)
      expect(rectIdx).toBeGreaterThan(pathIdx)
      expect(textIdx).toBeGreaterThan(rectIdx)
    })

    it('should handle empty elements array', () => {
      const svg = buildSVGString([], { width: W, height: H })
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('<rect width="100%"')
    })

    it('should handle all element types together', () => {
      const els: CanvasElement[] = [
        {
          type: 'stroke',
          id: 's1',
          points: [
            [0, 0],
            [10, 10],
          ],
          color: '#f00',
          size: 2,
          brush: 'pen',
        },
        {
          type: 'shape',
          id: 'sh1',
          kind: 'circle',
          x: 10,
          y: 10,
          w: 50,
          h: 50,
          color: '#0f0',
          size: 1,
        },
        {
          type: 'text',
          id: 't1',
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          content: 'Test',
          fontSize: 14,
          color: '#00f',
        },
        {
          type: 'image',
          id: 'img1',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          dataUrl: 'data:image/png;base64,test',
        },
      ]
      const svg = buildSVGString(els, { width: W, height: H })
      expect(svg).toContain('<path')
      expect(svg).toContain('<ellipse')
      expect(svg).toContain('<text')
      expect(svg).toContain('<image')
    })
  })
})
