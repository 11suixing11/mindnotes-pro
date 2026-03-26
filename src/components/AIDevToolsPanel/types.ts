// AIDevToolsPanel 类型定义

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info'
  title: string
  description: string
  suggestion: string
  timestamp: number
}

export interface AIAnalysis {
  summary: string
  bottlenecks: string[]
  suggestions: string[]
  estimatedImprovement: string
}

export type DevToolsTab = 'performance' | 'analysis' | 'memory' | 'network' | 'bundle'

export interface PerformanceMetrics {
  fcp?: number
  lcp?: number
  cls?: number
  fid?: number
  ttfb?: number
  memoryUsage?: {
    used: number
    total: number
    limit: number
    percentage: number
  }
  longTasks: number
  failedRequests: number
}

export interface OptimizationSuggestion {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'performance' | 'memory' | 'bundle' | 'network'
  title: string
  description: string
  implementation: string
  expectedBenefit: string
}
