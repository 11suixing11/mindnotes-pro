// Compatibility barrel. Domain models live in core; store consumers can move
// over incrementally without reintroducing a core -> store dependency.
export type {
  BrushType,
  ShapeKind,
  ToolType,
  CanvasBackgroundStyle,
  TextFontWeight,
  TextFontStyle,
  TextDecoration,
  TextAlign,
  StrokeElement,
  Binding,
  ShapeElement,
  TextElement,
  ImageElement,
  CanvasElement,
  CanvasLayer,
  CanvasWorkspaceMetadata,
  UndoAction,
  CanvasSchemaVersion,
  CanvasDoc,
  CurrentCanvasDoc,
  CanvasFolder,
} from '../core/model'
export { CANVAS_ELEMENT_TYPES } from '../core/model'

export type { AlignmentType, DistributionType } from '../core/arrangement'
export { alignElements, distributeElements, getCommonBounds } from '../core/arrangement'
export {
  elementBounds,
  invalidateStrokeBounds,
  moveElement,
  resizeElement,
  rotateElement,
} from '../core/geometry'
