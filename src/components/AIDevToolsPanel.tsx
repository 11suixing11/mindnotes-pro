/**
 * MindNotes Pro - AI-Powered Developer Tools
 * 智能调试面板
 * 
 * 功能:
 * - 实时性能监控
 * - 智能优化建议
 * - 内存泄漏检测
 * - AI 驱动的问题诊断
 */

import { useEffect, useCallback, useState } from 'react'
import { performanceMonitor } from './AIDevToolsPanel/performanceMonitor'
import { AlertList } from './AIDevToolsPanel/AlertList'
import { MetricsDisplay } from './AIDevToolsPanel/MetricsDisplay'
import { AnalysisPanel } from './AIDevToolsPanel/AnalysisPanel'
import type { PerformanceAlert, AIAnalysis, OptimizationSuggestion, DevToolsTab } from './AIDevToolsPanel/types'

interface AIDevToolsPanelProps {
  isOpen?: boolean
  onClose?: () => void
}

export function AIDevToolsPanel({ isOpen = false, onClose }: AIDevToolsPanelProps) {
  const [_isOpen, _setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DevToolsTab>('performance')
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 快捷键打开面板 (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        if (onClose) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // 初始化性能监控
  useEffect(() => {
    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [...prev, alert])
    }

    performanceMonitor.init(handleAlert)

    return () => {
      performanceMonitor.destroy()
    }
  }, [])

  // AI 分析
  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    
    try {
      // 模拟 AI 分析（实际应调用 Ollama API）
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const metrics = performanceMonitor.getMetrics()
      const analysis: AIAnalysis = {
        summary: '应用整体性能良好，但存在少量优化空间。',
        bottlenecks: [],
        suggestions: [],
        estimatedImprovement: '预期性能提升 15-20%',
      }

      if (metrics.fcp && metrics.fcp > 1000) {
        analysis.bottlenecks.push('首屏加载时间较长')
        analysis.suggestions.push('考虑使用 CDN 加载 React 等第三方库')
      }

      if (metrics.longTasks > 5) {
        analysis.bottlenecks.push('存在较多长任务')
        analysis.suggestions.push('使用代码分割和懒加载优化')
      }

      if (metrics.memoryUsage && metrics.memoryUsage.percentage > 60) {
        analysis.bottlenecks.push('内存使用率偏高')
        analysis.suggestions.push('检查内存泄漏，使用虚拟滚动')
      }

      setAiAnalysis(analysis)

      // 生成优化建议
      const newSuggestions: OptimizationSuggestion[] = []
      
      if (metrics.fcp && metrics.fcp > 1000) {
        newSuggestions.push({
          id: 'fcp-001',
          priority: 'high',
          category: 'performance',
          title: '优化首屏加载时间',
          description: `当前 FCP 为 ${metrics.fcp.toFixed(0)}ms，超过推荐值 1000ms`,
          implementation: `
1. 使用 CDN 加载 React 和 ReactDOM
2. 启用 Vite 的代码分割
3. 预加载关键资源
          `.trim(),
          expectedBenefit: '预期 FCP 减少 40-50%',
        })
      }

      if (metrics.longTasks > 5) {
        newSuggestions.push({
          id: 'longtask-001',
          priority: 'medium',
          category: 'performance',
          title: '减少长任务数量',
          description: `检测到 ${metrics.longTasks} 个长任务，影响交互流畅度`,
          implementation: `
1. 使用 Web Worker 处理重计算
2. 将大任务拆分为小任务
3. 使用 requestIdleCallback 延迟非关键任务
          `.trim(),
          expectedBenefit: '提升交互流畅度',
        })
      }

      setSuggestions(newSuggestions)
    } catch (error) {
      console.error('AI 分析失败:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const handleDismissAlert = useCallback((index: number) => {
    setAlerts((prev: PerformanceAlert[]) => prev.filter((_: PerformanceAlert, i: number) => i !== index))
  }, [])

  const tabs: { id: DevToolsTab; label: string; icon: string }[] = [
    { id: 'performance', label: '性能', icon: '⚡' },
    { id: 'analysis', label: 'AI 分析', icon: '🤖' },
    { id: 'memory', label: '内存', icon: '💾' },
  ]

  return (
    <div className={`ai-devtools-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h3>🛠️ AI 开发工具</h3>
        {onClose && (
          <button onClick={onClose} className="panel-close" aria-label="关闭面板">
            ×
          </button>
        )}
      </div>

      <div className="panel-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="panel-content">
        {activeTab === 'performance' && (
          <>
            <MetricsDisplay metrics={performanceMonitor.getMetrics()} />
            <AlertList alerts={alerts} onDismiss={handleDismissAlert} />
          </>
        )}

        {activeTab === 'analysis' && (
          <AnalysisPanel
            isAnalyzing={isAnalyzing}
            analysis={aiAnalysis}
            suggestions={suggestions}
            onAnalyze={handleAnalyze}
          />
        )}

        {activeTab === 'memory' && (
          <div className="memory-panel">
            <h4>内存监控</h4>
            <p>内存监控功能开发中...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIDevToolsPanel
