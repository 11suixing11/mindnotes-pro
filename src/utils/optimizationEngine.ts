/**
 * 智能优化建议引擎
 * 基于性能数据自动生成优化建议
 * 可集成 Ollama 进行 AI 分析
 */

export interface OptimizationSuggestion {
  id: string
  category: 'performance' | 'memory' | 'rendering' | 'bundling' | 'caching'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  implementation: string
  expectedBenefit: string
  estimatedDuration: string // e.g., "2 hours"
  resources: string[]
}

export class OptimizationEngine {
  private suggestions: OptimizationSuggestion[] = []
  private ollamaUrl = 'http://localhost:11434'

  /**
   * 基于性能指标生成建议
   */
  generateSuggestions(metrics: Record<string, number>): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    // FCP 分析
    if (metrics.fcp > 1000) {
      suggestions.push({
        id: 'fcp-001',
        category: 'bundling',
        priority: 'critical',
        title: '减小 First Paint 时间',
        description: `FCP 时间为 ${metrics.fcp}ms，超过目标 700ms`,
        implementation: `
1. 使用 dynamic import() 延迟加载非关键组件
2. 启用 CSS-in-JS 树摇（如 styled-components）
3. 启用 React 编译器的自动代码分割
4. 将大集合库拆分为独立块
        `.trim(),
        expectedBenefit: '预期改进 30-40%',
        estimatedDuration: '3-4 hours',
        resources: [
          'https://web.dev/fcp/',
          'https://vitejs.dev/guide/features.html#dynamic-import'
        ]
      })
    }

    // LCP 分析
    if (metrics.lcp > 2500) {
      suggestions.push({
        id: 'lcp-001',
        category: 'performance',
        priority: 'critical',
        title: '改善最大内容绘制',
        description: `LCP 时间为 ${metrics.lcp}ms，超过建议值 2.5s`,
        implementation: `
1. 预加载关键 LCP 图像
2. 使用 requestIdleCallback 推迟非关键渲染
3. 启用 React 18 并发渲染特性
4. 实施图像优化（WEBP，懒加载）
        `.trim(),
        expectedBenefit: '预期改进 20-30%',
        estimatedDuration: '4-5 hours',
        resources: [
          'https://web.dev/lcp/',
          'https://react.dev/reference/react/useTransition'
        ]
      })
    }

    // CLS 分析
    if (metrics.cls > 0.1) {
      suggestions.push({
        id: 'cls-001',
        category: 'rendering',
        priority: 'high',
        title: '消除累积布局移位',
        description: `CLS 分数为 ${metrics.cls}，超过目标 0.05`,
        implementation: `
1. 为媒体元素设置长宽比
2. 避免在现有内容上插入内容
3. 使用 transform 属性代替 margin/padding
4. 预分配广告和嵌入空间
        `.trim(),
        expectedBenefit: '预期改进 50-70%',
        estimatedDuration: '2-3 hours',
        resources: [
          'https://web.dev/cls/',
          'https://github.com/GoogleChrome/web-vitals'
        ]
      })
    }

    // 内存分析
    if (metrics.heapUsage > 100) {
      suggestions.push({
        id: 'memory-001',
        category: 'memory',
        priority: 'high',
        title: '优化内存使用',
        description: `Heap 使用量 ${metrics.heapUsage}MB，可能导致内存泄漏`,
        implementation: `
1. 检查 useEffect 中未清理的监听器
2. 运行 Chrome DevTools 进行内存快照
3. 使用 WeakMap/WeakSet 存储对象引用
4. 启用虚拟滚动减少 DOM 节点数
5. 检查传感器 API 订阅未取消
        `.trim(),
        expectedBenefit: '预期改进 30-50%',
        estimatedDuration: '4-6 hours',
        resources: [
          'https://developer.chrome.com/docs/devtools/memory-problems/',
          'https://react.dev/learn/lifecycle-of-reactive-effect'
        ]
      })
    }

    // 渲染分析
    if (metrics.slowComponents > 5) {
      suggestions.push({
        id: 'render-001',
        category: 'rendering',
        priority: 'high',
        title: '优化组件渲染性能',
        description: `检测到 ${metrics.slowComponents} 个渲染缓慢的组件`,
        implementation: `
1. 使用 React.memo 包装 FC 组件
2. 移动状态到最近的共同祖先
3. 使用 useCallback 稳定函数引用
4. 启用 React Profiler 找出瓶颈
5. 考虑使用 Recoil/Zustand 优化状态管理
        `.trim(),
        expectedBenefit: '预期改进 20-35%',
        estimatedDuration: '3-4 hours',
        resources: [
          'https://react.dev/reference/react/memo',
          'https://developer.chrome.com/docs/devtools/performance/'
        ]
      })
    }

    this.suggestions = [...suggestions]
    return suggestions
  }

  /**
   * 获取优先级最高的建议
   */
  getTopSuggestions(limit = 5): OptimizationSuggestion[] {
    const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 }
    return this.suggestions
      .sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority])
      .slice(0, limit)
  }

  /**
   * 调用 Ollama 进行 AI 增强分析
   */
  async analyzeWithAI(metrics: Record<string, number>, existingSuggestions: OptimizationSuggestion[]): Promise<string> {
    const prompt = `
基于以下性能指标和建议，提供详细的优化路线图：

指标：
${JSON.stringify(metrics, null, 2)}

现有建议：
${existingSuggestions.map(s => `- ${s.title}: ${s.description}`).join('\n')}

请提供：
1. 优化的优先顺序和理由
2. 快速胜利（可在 1 小时内实现的改进）
3. 长期战略（需要重构的部分）
4. 风险评估
5. 测试策略

使用 Markdown 格式回答。
    `.trim()

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:8b',
          prompt,
          stream: false,
          temperature: 0.3
        })
      })

      if (!response.ok) throw new Error('Ollama request failed')
      const data = await response.json()
      return data.response
    } catch (error) {
      console.error('AI analysis failed:', error)
      return this.generateFallbackAnalysis(existingSuggestions)
    }
  }

  /**
   * 生成备选分析（当 Ollama 不可用时）
   */
  private generateFallbackAnalysis(suggestions: OptimizationSuggestion[]): string {
    const critical = suggestions.filter(s => s.priority === 'critical')
    const high = suggestions.filter(s => s.priority === 'high')

    return `
## 优化路线图

### 快速胜利（第 1-2 周）
${critical.slice(0, 2).map(s => `- **${s.title}**: ${s.expectedBenefit}`).join('\n')}

### 中期改进（第 3-4 周）
${high.slice(0, 3).map(s => `- **${s.title}**: ${s.expectedBenefit}`).join('\n')}

### 预期总体改进
- **FCP**: 30-40% ↓
- **LCP**: 20-30% ↓
- **内存**: 30-50% ↓
- **总体得分**: 90+ → 95+

### 实施顺序
1. 解决关键瓶颈（${critical[0]?.title || '性能优化'}）
2. 优化内存使用
3. 改善渲染性能
4. 完成缓存策略
    `.trim()
  }

  /**
   * 生成实施计划
   */
  generateImplementationPlan(suggestions: OptimizationSuggestion[]): {
    week1: OptimizationSuggestion[]
    week2: OptimizationSuggestion[]
    week3: OptimizationSuggestion[]
    week4: OptimizationSuggestion[]
  } {
    const plan = {
      week1: [] as OptimizationSuggestion[],
      week2: [] as OptimizationSuggestion[],
      week3: [] as OptimizationSuggestion[],
      week4: [] as OptimizationSuggestion[]
    }

    const sorted = [...suggestions].sort((a, b) => {
      const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 }
      return priorityMap[a.priority] - priorityMap[b.priority]
    })

    // 分配到各周
    sorted.forEach((suggestion, index) => {
      if (index < 2) plan.week1.push(suggestion)
      else if (index < 4) plan.week2.push(suggestion)
      else if (index < 6) plan.week3.push(suggestion)
      else plan.week4.push(suggestion)
    })

    return plan
  }

  /**
   * 计算综合优化分数
   */
  calculateOptimizationScore(metrics: Record<string, number>): number {
    let score = 100
    
    // FCP 评分
    if (metrics.fcp > 1000) score -= 15
    else if (metrics.fcp > 700) score -= 5
    
    // LCP 评分
    if (metrics.lcp > 2500) score -= 15
    else if (metrics.lcp > 1000) score -= 5
    
    // CLS 评分
    if (metrics.cls > 0.1) score -= 10
    else if (metrics.cls > 0.05) score -= 5
    
    // 内存评分
    if (metrics.heapUsage > 100) score -= 15
    else if (metrics.heapUsage > 50) score -= 5
    
    return Math.max(0, score)
  }
}

export const optimizationEngine = new OptimizationEngine()
