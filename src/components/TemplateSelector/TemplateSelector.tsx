import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TEMPLATES, Template, incrementTemplateUsage } from '../../data/templates'

interface TemplateSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect?: (template: Template) => void
}

export default function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 分类
  const categories = [
    { id: 'all', name: '全部', icon: '📋' },
    { id: 'meeting', name: '会议', icon: '📝' },
    { id: 'study', name: '学习', icon: '📚' },
    { id: 'brainstorm', name: '创意', icon: '💡' },
    { id: 'todo', name: '待办', icon: '📋' },
    { id: 'goal', name: '目标', icon: '🎯' },
    { id: 'note', name: '笔记', icon: '📔' },
  ]

  // 过滤模板
  const filteredTemplates = TEMPLATES.filter(template => {
    const matchCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.nameZh.includes(searchQuery) ||
      template.description.includes(searchQuery) ||
      template.tags.some(tag => tag.includes(searchQuery))
    
    return matchCategory && matchSearch
  })

  // 使用模板
  const handleSelectTemplate = (template: Template) => {
    incrementTemplateUsage(template.id)
    onSelect?.(template)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  📋 选择模板开始
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  选择一个模板快速开始你的笔记
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索模板..."
                className="w-full px-4 py-3 pl-12 bg-gray-100 dark:bg-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            </div>
          </div>

          {/* 分类标签 */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-3 overflow-x-auto">
            <div className="flex space-x-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* 模板网格 */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <span className="text-6xl block mb-4">🔍</span>
                <p className="text-lg">未找到匹配的模板</p>
                <p className="text-sm mt-2">尝试其他关键词或分类</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="group text-left bg-white dark:bg-gray-700 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-lg hover:scale-105 overflow-hidden"
                  >
                    {/* 模板预览 */}
                    <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 p-4 flex items-center justify-center">
                      <span className="text-6xl group-hover:scale-110 transition-transform">
                        {template.icon}
                      </span>
                    </div>

                    {/* 模板信息 */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                        {template.nameZh}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                        {template.description}
                      </p>

                      {/* 标签 */}
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* 使用次数 */}
                      {template.usageCount > 0 && (
                        <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                          🔥 {template.usageCount} 次使用
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 底部 */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{filteredTemplates.length} 个模板</span>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
