import type { PageAnnotation } from './model.js'

export interface AnnotationHistory {
  past: PageAnnotation[][]
  present: PageAnnotation[]
  future: PageAnnotation[][]
}

export function startHistory(annotations: PageAnnotation[]): AnnotationHistory {
  return { past: [], present: annotations, future: [] }
}

export function commitHistory(
  history: AnnotationHistory,
  annotations: PageAnnotation[]
): AnnotationHistory {
  return { past: [...history.past, history.present].slice(-40), present: annotations, future: [] }
}

export function undoHistory(history: AnnotationHistory): AnnotationHistory {
  if (!history.past.length) return history
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future].slice(0, 40),
  }
}

export function redoHistory(history: AnnotationHistory): AnnotationHistory {
  if (!history.future.length) return history
  return {
    past: [...history.past, history.present].slice(-40),
    present: history.future[0],
    future: history.future.slice(1),
  }
}
