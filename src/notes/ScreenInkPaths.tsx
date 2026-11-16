import { memo, useMemo } from 'react'
import type { ScreenStroke } from './screenInk'

export function ScreenStrokePath({ stroke }: { stroke: ScreenStroke }) {
  return stroke.points.length === 1 ? (
    <circle
      data-stroke-id={stroke.id}
      cx={stroke.points[0].x}
      cy={stroke.points[0].y}
      r={stroke.width / 2}
      fill={stroke.color}
      opacity={stroke.tool === 'highlight' ? 0.3 : 1}
    />
  ) : (
    <polyline
      data-stroke-id={stroke.id}
      points={stroke.points.map(({ x, y }) => `${x},${y}`).join(' ')}
      fill="none"
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={stroke.tool === 'highlight' ? 0.3 : 1}
    />
  )
}

/** Static ink is reused while typing, moving the cursor or extending a draft. */
const ScreenInkPaths = memo(function ScreenInkPaths({
  strokes,
  hidden,
}: {
  strokes: ScreenStroke[]
  hidden: Set<string>
}) {
  const paths = useMemo(
    () =>
      strokes.map((stroke) => ({
        id: stroke.id,
        path: <ScreenStrokePath key={stroke.id} stroke={stroke} />,
      })),
    [strokes]
  )
  return <g>{paths.filter(({ id }) => !hidden.has(id)).map(({ path }) => path)}</g>
})

export default ScreenInkPaths
