import { vi } from 'vitest'

/** jsdom lacks SVGPointList; emulate list ownership/float storage, never native attribute mutations. */
export function installNativeSvgPoints({ failOnAppend = 0, failOnCreate = 0 } = {}) {
  const originalCreate = document.createElementNS.bind(document)
  const originalGetAttribute = Element.prototype.getAttribute
  const originalSetAttribute = Element.prototype.setAttribute
  const originalPoint = Object.getOwnPropertyDescriptor(SVGSVGElement.prototype, 'createSVGPoint')
  const lists = new WeakMap<Element, DOMPoint[]>()
  const appended: { line: Element; point: DOMPoint }[] = []
  const pointAttributeWrites: Element[] = []
  let attempts = 0
  let creations = 0
  const newPoint = () => {
    let x = 0
    let y = 0
    return {
      get x() {
        return x
      },
      set x(value: number) {
        x = Math.fround(value)
      },
      get y() {
        return y
      },
      set y(value: number) {
        y = Math.fround(value)
      },
    } as DOMPoint
  }
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', {
    configurable: true,
    value: () => {
      creations += 1
      if (creations === failOnCreate)
        throw new DOMException('point creation failed', 'InvalidStateError')
      return newPoint()
    },
  })
  const create = vi
    .spyOn(document, 'createElementNS')
    .mockImplementation((namespace, name, options) => {
      const element = originalCreate(namespace, name, options)
      if (namespace === 'http://www.w3.org/2000/svg' && name === 'polyline') {
        const items: DOMPoint[] = []
        lists.set(element, items)
        Object.defineProperty(element, 'points', {
          value: {
            get numberOfItems() {
              return items.length
            },
            getItem(index: number) {
              return items[index]
            },
            clear() {
              items.length = 0
            },
            appendItem(point: DOMPoint) {
              attempts += 1
              if (attempts === failOnAppend)
                throw new DOMException('append failed', 'InvalidStateError')
              const existing = items.indexOf(point)
              if (existing !== -1) items.splice(existing, 1)
              items.push(point)
              appended.push({ line: element, point })
              return point
            },
          },
        })
      }
      return element
    })
  const getAttribute = vi.spyOn(Element.prototype, 'getAttribute').mockImplementation(function (
    this: Element,
    name
  ) {
    const items = lists.get(this)
    if (name === 'points' && items) return items.map(({ x, y }) => `${x},${y}`).join(' ')
    return originalGetAttribute.call(this, name)
  })
  const setAttribute = vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(function (
    this: Element,
    name,
    value
  ) {
    const items = lists.get(this)
    if (name === 'points' && items) {
      pointAttributeWrites.push(this)
      items.length = 0
      for (const token of value.trim().split(/\s+/).filter(Boolean)) {
        const [x, y] = token.split(',').map(Number)
        const point = newPoint()
        point.x = x
        point.y = y
        items.push(point)
      }
    }
    originalSetAttribute.call(this, name, value)
  })
  return {
    appended,
    pointAttributeWrites,
    restore() {
      create.mockRestore()
      getAttribute.mockRestore()
      setAttribute.mockRestore()
      if (originalPoint)
        Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', originalPoint)
      else Reflect.deleteProperty(SVGSVGElement.prototype, 'createSVGPoint')
    },
  }
}
