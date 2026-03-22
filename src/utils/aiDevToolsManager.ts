/**
 * AI DevTools Integration Wrapper
 * 集成性能监控、调试面板和优化建议
 */

import { useEffect, useState } from 'react'
import { optimizationEngine, OptimizationSuggestion } from '../utils/optimizationEngine'

interface DevToolsConfig {
  enabled: boolean
  enablePerformanceMonitoring: boolean
  enableDebugPanel: boolean
  enableAIAnalysis: boolean
  enableAutoOptimization: boolean
}

export class AIDevToolsManager {
  private static instance: AIDevToolsManager
  private config: DevToolsConfig = {
    enabled: process.env.NODE_ENV === 'development',
    enablePerformanceMonitoring: true,
    enableDebugPanel: false,
    enableAIAnalysis: false,
    enableAutoOptimization: false
  }

  private suggestions: OptimizationSuggestion[] = []
  private metrics: Record<string, number> = {}
  private listeners: ((data: any) => void)[] = []

  static getInstance(): AIDevToolsManager {
    if (!AIDevToolsManager.instance) {
      AIDevToolsManager.instance = new AIDevToolsManager()
    }
    return AIDevToolsManager.instance
  }

  // 配置管理
  configure(config: Partial<DevToolsConfig>): void {
    this.config = { ...this.config, ...config }
    if (this.config.enabled) {
      this.initialize()
    }
  }

  // 初始化
  private initialize(): void {
    if (!this.config.enabled) return

    // 收集性能指标
    this.collectMetrics()

    // 启用调试面板快捷方式
    this.setupShortcuts()

    // 启用控制台 helpers
    this.setupConsoleHelpers()
  }

  // 收集性能指标
  private collectMetrics(): void {
    setInterval(() => {
      const newMetrics: Record<string, number> = {
        fcp: 0,
        lcp: 0,
        cls: 0,
        heapUsage: 0,
        slowComponents: 0
      }

      // 收集 Web Vitals
      performance.getEntriesByType('paint').forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          newMetrics.fcp = entry.startTime
        }
      })

      // 内存使用
      if ((performance as any).memory) {
        const mem = (performance as any).memory
        newMetrics.heapUsage = mem.usedJSHeapSize / 1024 / 1024
      }

      this.metrics = newMetrics

      // 通知所有监听器
      this.notify({ type: 'metrics-updated', data: newMetrics })
    }, 5000)
  }

  // 设置快捷方式
  private setupShortcuts(): void {
    // Ctrl+Shift+D: 显示/隐藏调试面板
    // Ctrl+Shift+A: 运行 AI 分析
    // Ctrl+Shift+O: 显示优化建议

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.code) {
          case 'KeyD':
            this.toggleDebugPanel()
            break
          case 'KeyA':
            this.runAIAnalysis()
            break
          case 'KeyO':
            this.showOptimizationSuggestions()
            break
        }
      }
    })
  }

  // 设置控制台 helpers
  private setupConsoleHelpers(): void {
    const self = this
    
    ;(window as any).__devtools = {
      // 查看当前指标
      metrics: () => this.metrics,

      // 生成优化建议
      optimize: () => {
        const suggestions = optimizationEngine.generateSuggestions(this.metrics)
        console.table(suggestions.map(s => ({
          title: s.title,
          priority: s.priority,
          category: s.category,
          benefit: s.expectedBenefit
        })))
        return suggestions
      },

      // 显示实施计划
      plan: () => {
        const suggestions = optimizationEngine.generateSuggestions(this.metrics)
        const plan = optimizationEngine.generateImplementationPlan(suggestions)
        
        console.group('📋 实施计划')
        console.log('第 1 周:', plan.week1.map(s => s.title))
        console.log('第 2 周:', plan.week2.map(s => s.title))
        console.log('第 3 周:', plan.week3.map(s => s.title))
        console.log('第 4 周:', plan.week4.map(s => s.title))
        console.groupEnd()

        return plan
      },

      // 运行 AI 分析
      analyze: async () => {
        const suggestions = optimizationEngine.generateSuggestions(this.metrics)
        const analysis = await optimizationEngine.analyzeWithAI(this.metrics, suggestions)
        console.log(analysis)
        return analysis
      },

      // 计算优化分数
      score: () => {
        return optimizationEngine.calculateOptimizationScore(this.metrics)
      },

      // 帮助文本
      help: () => {
        console.log(`
        🤖 MindNotes Pro - AI DevTools

        可用命令:
        - __devtools.metrics()         查看当前指标
        - __devtools.optimize()        生成优化建议
        - __devtools.plan()            显示 4 周实施计划
        - __devtools.analyze()         运行 AI 分析（需要 Ollama）
        - __devtools.score()           计算优化分数
        - __devtools.help()            显示此帮助信息

        快捷键:
        - Ctrl+Shift+D                 显示/隐藏调试面板
        - Ctrl+Shift+A                 运行 AI 分析
        - Ctrl+Shift+O                 显示优化建议
        `)
      }
    }

    console.log('🤖 AI DevTools 已加载。运行 __devtools.help() 查看可用命令。')
  }

  // 切换调试面板
  toggleDebugPanel(): void {
    this.config.enableDebugPanel = !this.config.enableDebugPanel
    this.notify({ type: 'debug-panel-toggled', enabled: this.config.enableDebugPanel })
  }

  // 运行 AI 分析
  async runAIAnalysis(): Promise<void> {
    if (!this.config.enableAIAnalysis) {
      console.warn('AI 分析未启用')
      return
    }

    const suggestions = optimizationEngine.generateSuggestions(this.metrics)
    const analysis = await optimizationEngine.analyzeWithAI(this.metrics, suggestions)
    
    this.notify({ type: 'ai-analysis-complete', data: analysis })
  }

  // 显示优化建议
  showOptimizationSuggestions(): void {
    const suggestions = optimizationEngine.generateSuggestions(this.metrics)
    const topSuggestions = optimizationEngine.getTopSuggestions(5)

    console.group('💡 优化建议')
    topSuggestions.forEach(s => {
      console.group(`${s.title} [${s.priority}]`)
      console.log('描述:', s.description)
      console.log('预期收益:', s.expectedBenefit)
      console.log('实施时间:', s.estimatedDuration)
      console.groupEnd()
    })
    console.groupEnd()

    this.suggestions = suggestions
    this.notify({ type: 'suggestions-generated', data: suggestions })
  }

  // 订阅事件
  subscribe(listener: (data: any) => void): void {
    this.listeners.push(listener)
  }

  // 取消订阅
  unsubscribe(listener: (data: any) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  // 通知监听器
  private notify(data: any): void {
    this.listeners.forEach(listener => listener(data))
  }

  // 获取当前配置
  getConfig(): DevToolsConfig {
    return { ...this.config }
  }

  // 获取当前指标
  getMetrics(): Record<string, number> {
    return { ...this.metrics }
  }

  // 获取建议
  getSuggestions(): OptimizationSuggestion[] {
    return [...this.suggestions]
  }
}

// 创建全局实例
export const aiDevToolsManager = AIDevToolsManager.getInstance()

// 开发环境自动初始化
if (process.env.NODE_ENV === 'development') {
  aiDevToolsManager.configure({
    enabled: true,
    enablePerformanceMonitoring: true,
    enableDebugPanel: false,
    enableAIAnalysis: true,
    enableAutoOptimization: false
  })
}
