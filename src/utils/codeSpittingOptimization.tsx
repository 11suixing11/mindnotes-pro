// @ts-nocheck
/**
 * 代码分割和懒加载最佳实践
 * 优化首屏加载性能和内存占用
 */

import { lazy, Suspense } from 'react'

// 1️⃣ 路由级别的代码分割
export const Canvas = lazy(() => import('./Canvas'))
export const Toolbar = lazy(() => import('./Toolbar'))
export const LayersPanel = lazy(() => import('./LayersPanel'))

// 2️⃣ 功能模块的延迟加载
export const AIAssistant = lazy(() => 
  import(/* webpackChunkName: "ai-assistant" */ './features/AIAssistant')
)

export const ExportTools = lazy(() =>
  import(/* webpackChunkName: "export-tools" */ './features/ExportTools')
)

export const CollaborationFeatures = lazy(() =>
  import(/* webpackChunkName: "collaboration" */ './features/Collaboration')
)

export const ThirdPartyIntegrations = lazy(() =>
  import(/* webpackChunkName: "integrations" */ './features/Integrations')
)

// 3️⃣ 动态导入工具函数
export async function loadHeavyLibrary() {
  // 仅在需要时加载重型库
  const module = await import(/* webpackChunkName: "heavy-lib" */ 'some-heavy-library')
  return module.default
}

// 4️⃣ 路由配置（与 react-router 配合）
export const appRoutes = [
  {
    path: '/',
    element: lazy(() => import('./pages/HomePage')),
    name: 'Home'
  },
  {
    path: '/editor',
    element: lazy(() => import('./pages/Editor')),
    name: 'Editor'
  },
  {
    path: '/settings',
    element: lazy(() => import('./pages/Settings')),
    name: 'Settings'
  },
  {
    path: '/about',
    element: lazy(() => import('./pages/About')),
    name: 'About'
  }
]

// 5️⃣ 条件加载（基于用户权限或功能标志）
export const loadConditionalFeature = async (featureFlag: string) => {
  if (featureFlag === 'beta-ai') {
    return import(/* webpackChunkName: "beta-ai" */ './features/BetaAI')
  }
  if (featureFlag === 'enterprise-sync') {
    return import(/* webpackChunkName: "enterprise" */ './features/EnterpriseSync')
  }
  // 默认功能
  return import(/* webpackChunkName: "standard" */ './features/StandardSync')
}

// 6️⃣ 预加载策略（与 React Router 配合）
export const preloadRoute = (moduleName: string) => {
  // 在空闲时预加载常用的路由
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import(moduleName)
    })
  }
}

// 7️⃣ 组件级别的代码分割
import { defineAsyncComponent } from 'react'

export const AsyncDrawingBoard = lazy(() =>
  import(/* webpackChunkName: "drawing-board" */ './components/DrawingBoard')
    .then(module => ({ default: module.DrawingBoard }))
)

// 8️⃣ 虚拟列表加载（大数据列表优化）
export const VirtualLayerList = lazy(() =>
  import(/* webpackChunkName: "virtual-list" */ './components/VirtualLayerList')
)

// 9️⃣ 动态样式加载
export const loadStylesheet = async (href: string) => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve(true)
    link.onerror = () => reject(new Error(`Failed to load ${href}`))
    document.head.appendChild(link)
  })
}

// 🔟 Worker 线程加载（CPU 密集操作）
export const createWorker = (scriptUrl: string) => {
  return new Worker(
    new URL(scriptUrl, import.meta.url),
    { type: 'module' }
  )
}

// Loading 占位符组件
export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">加载中...</p>
      </div>
    </div>
  )
}

// 错误边界组件
export function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center h-screen bg-red-50 dark:bg-red-900/20">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">加载失败</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重新加载
        </button>
      </div>
    </div>
  )
}

// 使用示例
export function OptimizedApp() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div>
        <Toolbar />
        
        <Suspense fallback={<div>绘图板加载中...</div>}>
          <Canvas />
        </Suspense>
        
        <Suspense fallback={<div>图层面板加载中...</div>}>
          <LayersPanel />
        </Suspense>

        {/* 按需显示高级功能 */}
        {/* <Suspense fallback={<div>AI 助手加载中...</div>}>
          <AIAssistant />
        </Suspense> */}
      </div>
    </Suspense>
  )
}

export default {
  LoadingFallback,
  ErrorFallback,
  OptimizedApp
}
