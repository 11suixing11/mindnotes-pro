/**
 * Phase 2 AI Developer Tools - 集成指南
 * 
 * 在您的应用中集成 Phase 2 工具的快速指南
 */

/**
 * 使用 AI DevTools 的步骤
 */
export function Phase2IntegrationGuide() {
  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg">
      <h1 className="text-3xl font-bold mb-6">🤖 Phase 2: AI 开发者工具集成</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">📦 安装步骤</h2>
        <div className="bg-white dark:bg-gray-700 p-4 rounded border-l-4 border-blue-500">
          <pre className="overflow-x-auto text-sm">
{`# 1. 确保依赖已安装
npm install

# 2. 在 App.tsx 中导入组件
import { AIDevToolsPanel } from './components/AIDevToolsPanel'
import { PerformanceDebugView } from './components/PerformanceDebugView'

# 3. 在 JSX 中使用（仅开发环境）
{process.env.NODE_ENV === 'development' && (
  <>
    <AIDevToolsPanel />
    <PerformanceDebugView />
  </>
)}

# 4. （可选）启动 Ollama 进行 AI 分析
ollama serve

# 5. 在另一个终端中拉取模型
ollama pull qwen3:8b`}
          </pre>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">🎮 使用快捷键</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-700 p-4 rounded">
            <code className="font-bold text-blue-600">Ctrl+Shift+D</code>
            <p className="text-sm text-gray-600 mt-1">显示/隐藏调试面板</p>
          </div>
          <div className="bg-white dark:bg-gray-700 p-4 rounded">
            <code className="font-bold text-blue-600">Ctrl+Shift+A</code>
            <p className="text-sm text-gray-600 mt-1">运行 AI 分析</p>
          </div>
          <div className="bg-white dark:bg-gray-700 p-4 rounded">
            <code className="font-bold text-blue-600">Ctrl+Shift+O</code>
            <p className="text-sm text-gray-600 mt-1">显示优化建议</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">💻 控制台命令</h2>
        <div className="bg-white dark:bg-gray-700 p-4 rounded">
          <pre className="overflow-x-auto text-sm">
{`// 查看当前性能指标
__devtools.metrics()

// 生成优化建议
__devtools.optimize()

// 显示 4 周实施计划
__devtools.plan()

// 运行 AI 分析（需要 Ollama）
await __devtools.analyze()

// 计算优化分数
__devtools.score()

// 显示帮助
__devtools.help()`}
          </pre>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">📊 多版本发布策略</h2>
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 rounded">
            <h3 className="font-bold text-green-700">Stable (85% 用户)</h3>
            <p className="text-sm text-gray-600 mt-1">2 周发布周期，渐进式推送 (1% → 5% → 10% → 25% → 50% → 100%)</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded">
            <h3 className="font-bold text-yellow-700">Beta (10-15% 用户)</h3>
            <p className="text-sm text-gray-600 mt-1">每周发布，新功能测试</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500 p-4 rounded">
            <h3 className="font-bold text-purple-700">Canary (1% 用户)</h3>
            <p className="text-sm text-gray-600 mt-1">每日发布，最新开发版本</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">📈 性能目标 (v1.4.0)</h2>
        <div className="bg-white dark:bg-gray-700 p-6 rounded">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">FCP (首页绘制)</p>
              <p className="text-2xl font-bold text-blue-600">0.9s → 0.7s ↓30%</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">LCP (最大内容绘制)</p>
              <p className="text-2xl font-bold text-blue-600">1.2s → 1.0s ↓17%</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">内存使用</p>
              <p className="text-2xl font-bold text-green-600">45MB → 38MB ↓15%</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Lighthouse</p>
              <p className="text-2xl font-bold text-green-600">92 → 95 ↑3</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// 推荐的运行配置
export const recommendedConfig = {
  development: {
    enabledTools: ['AIDevToolsPanel', 'PerformanceDebugView', 'performanceMonitor'],
    enableAIAnalysis: true,
    enableConsoleHelpers: true
  },
  production: {
    enabledTools: ['performanceMonitor'],
    enableAIAnalysis: false,
    enableConsoleHelpers: false
  }
}
