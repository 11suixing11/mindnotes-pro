import { describe, expect, it } from 'vitest'
import { sanitizeSvg, sanitizeSvgDataUrl } from './svgSanitizer'

describe('SVG sanitizer', () => {
  it('preserves safe mixed-case SVG tags and attributes', () => {
    const sanitized = sanitizeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" preserveAspectRatio="xMidYMid">
        <defs>
          <linearGradient id="paint" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fff" />
          </linearGradient>
          <filter id="blur"><feGaussianBlur stdDeviation="2" /></filter>
          <marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" />
        </defs>
        <path d="M0 0 L20 20" fill="url(#paint)" filter="url(#blur)" marker-end="url(#arrow)" />
      </svg>
    `)

    expect(sanitized).toContain('viewBox="0 0 20 20"')
    expect(sanitized).toContain('<linearGradient')
    expect(sanitized).toContain('gradientUnits="userSpaceOnUse"')
    expect(sanitized).toContain('<feGaussianBlur')
    expect(sanitized).toContain('stdDeviation="2"')
    expect(sanitized).toContain('markerWidth="4"')
    expect(sanitized).toContain('filter="url(#blur)"')
    expect(sanitized).toContain('marker-end="url(#arrow)"')
  })

  it('removes executable SVG content while retaining safe artwork', () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><circle cx="5" cy="5" r="5"/></svg>'
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(source)}`
    const sanitized = decodeURIComponent(sanitizeSvgDataUrl(dataUrl).split(',')[1])

    expect(sanitized).toContain('<circle')
    expect(sanitized).not.toContain('<script')
    expect(sanitized).not.toContain('onload')
  })
})
