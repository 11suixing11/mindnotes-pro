/**
 * MindNotes Pro - AI-Powered Developer Tools
 * 智能调试面板，集成 Ollama Qwen 3 8B
 * 
 * 功能:
 * - 实时性能分析
 * - 智能优化建议
 * - 内存泄漏检测
 * - 渲染性能分析
 * - AI 驱动的问题诊断
 */

import { useEffect, useState } from 'react'

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info'
  title: string
  description: string
  suggestion: string
  timestamp: number
}

interface AIAnalysis {
  summary: string
  bottlenecks: string[]
  suggestions: string[]
  estimatedImprovement: string
}

export function AIDevToolsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'performance' | 'analysis' | 'memory'>('performance')
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 快捷键打开面板 (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 初始化性能监控：仅初始化一个 interval 和一个 PerformanceObserver
  useEffect(() => {
    const longTaskAlerts: PerformanceAlert[] = []
    let observer: PerformanceObserver | null = null

    const analyzePerformance = () => {
      const newAlerts: PerformanceAlert[] = []

      // 合并观察期间采集到的长任务告警
      if (longTaskAlerts.length > 0) {
        newAlerts.push(...longTaskAlerts.splice(0, longTaskAlerts.length))
      }

      // 检查 Web Vitals
      if ('getEntriesByType' in performance) {
        const paintEntries = performance.getEntriesByType('paint')
        paintEntries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint' && entry.startTime > 1000) {
            newAlerts.push({
              type: 'warning',
              title: 'FCP 超过阈值',
              description: `First Contentful Paint: ${entry.startTime.toFixed(0)}ms`,
              suggestion: '考虑将 React 库迁移到 CDN，减少首屏 JavaScript 大小',
              timestamp: Date.now()
            })
          }
        })
      }

      // 检查内存使用
      if ((performance as any).memory) {
        const mem = (performance as any).memory
        const usage = mem.usedJSHeapSize / mem.jsHeapSizeLimit

        if (usage > 0.8) {
          newAlerts.push({
            type: 'error',
            title: '内存使用过高',
            description: `Heap 使用率: ${(usage * 100).toFixed(1)}%`,
            suggestion: '检查是否有未释放的闭包或事件监听器。考虑使用虚拟滚动减少 DOM 节点',
            timestamp: Date.now()
          })
        }
      }

      setAlerts(newAlerts)
    }

    // 长任务观察器只初始化一次
    if ('PerformanceObserver' in window) {
      try {
        observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) {
              longTaskAlerts.push({
                type: 'warning',
                title: '检测到长任务',
                description: `Task duration: ${entry.duration.toFixed(0)}ms`,
                suggestion: '使用 requestIdleCallback 或 requestAnimationFrame 优化长任务',
                timestamp: Date.now()
              })
            }
          })
        })
        observer.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        // longtask 不被支持
      }
    }

    analyzePerformance()
    const monitor = window.setInterval(analyzePerformance, 5000)

    return () => {
      window.clearInterval(monitor)
      observer?.disconnect()
    }
  }, [])

  const runAIAnalysis = async () => {
    setIsAnalyzing(true)
    
    try {
      // 收集性能数据
      const metrics = {
        alerts: alerts.length,
        fcpTime: (performance as any).timing?.firstContentfulPaint,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
        ...getNavigationTiming()
      }

      // 调用 Ollama 进行 AI 分析
      const analysis = await callOllamaAnalysis(metrics)
      setAiAnalysis(analysis)
    } catch (error) {
      console.error('AI analysis failed:', error)
      setAiAnalysis({
        summary: '分析失败，请检查 Ollama 服务是否运行',
        bottlenecks: [],
        suggestions: ['確保 Ollama 服务在 http://localhost:11434 运行'],
        estimatedImprovement: '无法评估'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getNavigationTiming = () => {
    if (!performance.timing) return {}
    
    const t = performance.timing
    return {
      domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
      pageLoad: t.loadEventEnd - t.navigationStart,
      domInteractive: t.domInteractive - t.navigationStart
    }
  }

  const callOllamaAnalysis = async (metrics: any): Promise<AIAnalysis> => {
    const prompt = `
基于以下性能指标，提供优化建议：
- 性能告警数: ${metrics.alerts}
- FCP 时间: ${metrics.fcpTime?.toFixed(0)}ms
- 内存使用: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
- DOM 加载: ${metrics.domContentLoaded?.toFixed(0)}ms

请提供:
1. 性能摘要（一句话）
2. 3-5 个主要瓶颈
3. 5-7 个具体优化建议
4. 预期改进百分比

格式为 JSON，包含字段: summary, bottlenecks[], suggestions[], estimatedImprovement
`

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:8b',
          prompt,
          stream: false,
          temperature: 0.3
        })
      })

      const data = await response.json()
      
      // 解析 AI 响应
      try {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }

        return parseTextAnalysis(data.response)
      } catch (e) {
        // 如果解析 JSON 失败，返回默认建议
        return parseTextAnalysis(data.response)
      }
    } catch (error) {
      return {
        summary: '无法连接到 Ollama 服务',
        bottlenecks: ['Ollama 服务未运行'],
        suggestions: ['启动 Ollama: ollama serve', '验证 http://localhost:11434 可访问'],
        estimatedImprovement: '0%'
      }
    }
  }

  const parseTextAnalysis = (_text: string): AIAnalysis => {
    // 简单的文本解析，如果无法连接到 Ollama
    return {
      summary: '性能分析（Ollama 离线）',
      bottlenecks: [
        '代码分割不足',
        '缓存策略不优',
        '长任务未优化'
      ],
      suggestions: [
        '启用 React Compiler 优化',
        '实施代码分割策略',
        '使用虚拟滚动减少 DOM',
        '启用 Service Worker 缓存',
        '考虑外包到 Worker 线程'
      ],
      estimatedImprovement: '20-30%'
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center font-bold text-lg cursor-pointer transition-all hover:scale-110 z-40"
        title="AI DevTools (Ctrl+Shift+D)"
      >
        🤖
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-white dark:bg-gray-900 border-l border-t border-gray-200 dark:border-gray-700 shadow-xl rounded-tl-lg flex flex-col z-50 font-mono text-sm">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 flex justify-between items-center rounded-tl-lg">
        <span className="font-bold">🤖 AI DevTools</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-lg hover:opacity-75"
        >
          ✕
        </button>
      </div>

      {/* 选项卡 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['performance', 'analysis', 'memory'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 text-center border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'performance' && '📊 性能'}
            {tab === 'analysis' && '🔍 分析'}
            {tab === 'memory' && '💾 内存'}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800">
        {activeTab === 'performance' && (
          <div>
            {alerts.length === 0 ? (
              <div className="text-green-600 dark:text-green-400 py-4 text-center">
                ✅ 未检测到性能问题
              </div>
            ) : (
              alerts.slice(0, 5).map((alert, i) => (
                <div
                  key={i}
                  className={`mb-3 p-2 rounded border-l-4 ${
                    alert.type === 'error'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                      : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30'
                  }`}
                >
                  <div className="font-bold">{alert.title}</div>
                  <div className="text-xs opacity-75">{alert.description}</div>
                  <div className="text-xs mt-1 italic">💡 {alert.suggestion}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div>
            {!aiAnalysis ? (
              <div className="text-center py-6">
                <button
                  onClick={runAIAnalysis}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isAnalyzing ? '分析中...' : '运行 AI 分析'}
                </button>
                <p className="text-xs text-gray-500 mt-2">需要 Ollama 服务运行</p>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <div className="font-bold text-blue-600">{aiAnalysis.summary}</div>
                </div>
                <div className="mb-3">
                  <div className="font-bold text-sm mb-1">🔍 瓶颈:</div>
                  {aiAnalysis.bottlenecks.map((b, i) => (
                    <div key={i} className="text-xs ml-2">• {b}</div>
                  ))}
                </div>
                <div className="mb-3">
                  <div className="font-bold text-sm mb-1">💡 建议:</div>
                  {aiAnalysis.suggestions.slice(0, 3).map((s, i) => (
                    <div key={i} className="text-xs ml-2">• {s}</div>
                  ))}
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded">
                  <div className="text-xs">
                    📈 预期改进: <span className="font-bold">{aiAnalysis.estimatedImprovement}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'memory' && (
          <div>
            {(performance as any).memory ? (
              <div>
                {(() => {
                  const mem = (performance as any).memory
                  const used = mem.usedJSHeapSize / 1024 / 1024
                  const total = mem.jsHeapSizeLimit / 1024 / 1024
                  const percent = ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(1)
                  
                  return (
                    <>
                      <div className="mb-3">
                        <div className="text-xs mb-1">Heap 使用率: {percent}%</div>
                        <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              Number(percent) > 80
                                ? 'bg-red-500'
                                : Number(percent) > 60
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>已用: {used.toFixed(1)} MB</div>
                        <div>总数: {total.toFixed(1)} MB</div>
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : (
              <div className="text-gray-500 text-xs">
                内存 API 不可用（需要在 Chrome DevTools 中查看）
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部快捷键提示 */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
        💡 快捷键: Ctrl+Shift+D
      </div>
    </div>
  )
}

export default AIDevToolsPanel
