/**
 * 智能模板系统
 * 提供预设模板帮助用户快速开始
 */

export interface Template {
  id: string
  name: string
  nameZh: string
  description: string
  category: TemplateCategory
  icon: string
  content: TemplateContent
  tags: string[]
  usageCount: number
  createdAt: string
}

export type TemplateCategory = 
  | 'meeting'      // 会议
  | 'study'        // 学习
  | 'brainstorm'   // 头脑风暴
  | 'todo'         // 待办
  | 'goal'         // 目标
  | 'note'         // 笔记
  | 'custom'       // 自定义

export interface TemplateContent {
  textBlocks: TextBlock[]
  shapes?: Shape[]
  drawings?: Drawing[]
}

export interface TextBlock {
  id: string
  type: 'text'
  content: string
  x: number
  y: number
  style?: {
    fontSize?: number
    fontWeight?: string
    color?: string
  }
}

export interface Shape {
  id: string
  type: 'rectangle' | 'circle' | 'arrow' | 'line'
  x: number
  y: number
  width?: number
  height?: number
  style?: {
    fill?: string
    stroke?: string
    strokeWidth?: number
  }
}

export interface Drawing {
  id: string
  type: 'draw'
  points: Array<{ x: number; y: number }>
  color: string
  strokeWidth: number
}

// 预设模板库
export const TEMPLATES: Template[] = [
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    nameZh: '会议纪要',
    description: '记录会议要点、决策和待办事项',
    category: 'meeting',
    icon: '📝',
    content: {
      textBlocks: [
        {
          id: 'title',
          type: 'text',
          content: '# 会议纪要\n\n**日期**: _________\n**时间**: _________\n**地点**: _________\n**参会人**: _________\n\n---\n\n## 会议议题\n\n1. _______________\n2. _______________\n3. _______________\n\n---\n\n## 讨论要点\n\n### 议题 1\n- \n- \n\n### 议题 2\n- \n- \n\n---\n\n## 决策事项\n\n- [ ] \n- [ ] \n- [ ] \n\n---\n\n## 待办行动\n\n| 事项 | 负责人 | 截止日期 |\n|------|--------|----------|\n|      |        |          |\n|      |        |          |\n\n---\n\n## 下次会议\n\n**时间**: _________\n**议题**: _________\n',
          x: 100,
          y: 100,
          style: {
            fontSize: 16,
          }
        }
      ]
    },
    tags: ['会议', '纪要', '工作', '团队'],
    usageCount: 0,
    createdAt: '2026-03-20'
  },
  
  {
    id: 'study-notes',
    name: 'Study Notes',
    nameZh: '学习笔记',
    description: '结构化学习笔记，支持康奈尔笔记法',
    category: 'study',
    icon: '📚',
    content: {
      textBlocks: [
        {
          id: 'title',
          type: 'text',
          content: '# 学习笔记\n\n**主题**: _________\n**日期**: _________\n**来源**: _________\n\n---\n\n## 核心概念\n\n### 概念 1\n**定义**: \n\n**要点**:\n- \n- \n\n### 概念 2\n**定义**: \n\n**要点**:\n- \n- \n\n---\n\n## 重点总结\n\n> 💡 关键要点：\n> - \n> - \n\n---\n\n## 疑问与思考\n\n❓ 不理解的地方:\n- \n\n💭 我的思考:\n- \n\n---\n\n## 复习计划\n\n- [ ] 1 天后复习\n- [ ] 1 周后复习\n- [ ] 1 月后复习\n',
          x: 100,
          y: 100,
          style: {
            fontSize: 16,
          }
        }
      ]
    },
    tags: ['学习', '笔记', '康奈尔', '复习'],
    usageCount: 0,
    createdAt: '2026-03-20'
  },
  
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    nameZh: '头脑风暴',
    description: '自由发散思维，收集创意想法',
    category: 'brainstorm',
    icon: '💡',
    content: {
      textBlocks: [
        {
          id: 'title',
          type: 'text',
          content: '# 💡 头脑风暴\n\n**主题**: _________\n**时间**: _________\n\n---\n\n## 🎯 核心问题\n\n?\n\n---\n\n## 💭 想法收集\n\n### 想法 1\n\n### 想法 2\n\n### 想法 3\n\n---\n\n## 🏆 最佳创意\n\n1. \n2. \n3. \n\n---\n\n## 📋 下一步行动\n\n- [ ] 完善创意 1\n- [ ] 调研可行性\n- [ ] 制定实施计划\n',
          x: 100,
          y: 100,
          style: {
            fontSize: 16,
          }
        }
      ]
    },
    tags: ['创意', '头脑风暴', '想法', '策划'],
    usageCount: 0,
    createdAt: '2026-03-20'
  },
  
  {
    id: 'todo-list',
    name: 'To-Do List',
    nameZh: '待办事项',
    description: '清晰的任务清单，提升效率',
    category: 'todo',
    icon: '📋',
    content: {
      textBlocks: [
        {
          id: 'title',
          type: 'text',
          content: '# 📋 待办事项\n\n**日期**: _________\n\n---\n\n## 🔥 今日必做 (Top 3)\n\n- [ ] \n- [ ] \n- [ ] \n\n---\n\n## 📝 其他任务\n\n- [ ] \n- [ ] \n- [ ] \n- [ ] \n- [ ] \n\n---\n\n## ⏰ 时间安排\n\n| 时间 | 任务 | 完成 |\n|------|------|------|\n| 09:00 |      |      |\n| 10:00 |      |      |\n| 11:00 |      |      |\n| 14:00 |      |      |\n| 15:00 |      |      |\n| 16:00 |      |      |\n\n---\n\n## ✅ 今日完成\n\n- \n- \n- \n\n---\n\n## 📊 明日计划\n\n- \n- \n',
          x: 100,
          y: 100,
          style: {
            fontSize: 16,
          }
        }
      ]
    },
    tags: ['待办', '任务', '效率', '时间管理'],
    usageCount: 0,
    createdAt: '2026-03-20'
  },
  
  {
    id: 'goal-setting',
    name: 'Goal Setting',
    nameZh: '目标规划',
    description: 'SMART 原则制定可执行目标',
    category: 'goal',
    icon: '🎯',
    content: {
      textBlocks: [
        {
          id: 'title',
          type: 'text',
          content: '# 🎯 目标规划\n\n**目标名称**: _________\n**制定日期**: _________\n**截止日期**: _________\n\n---\n\n## 🎯 SMART 分析\n\n### S - Specific (具体的)\n我要实现什么？\n\n\n### M - Measurable (可衡量的)\n如何衡量成功？\n\n\n### A - Achievable (可实现的)\n我有哪些资源和能力？\n\n\n### R - Relevant (相关的)\n为什么这个目标重要？\n\n\n### T - Time-bound (有时限的)\n时间节点是什么？\n\n\n---\n\n## 📋 行动计划\n\n### 阶段 1: 准备期 (___ 至 ___)\n- [ ] \n- [ ] \n\n### 阶段 2: 执行期 (___ 至 ___)\n- [ ] \n- [ ] \n\n### 阶段 3: 收尾期 (___ 至 ___)\n- [ ] \n- [ ] \n\n---\n\n## 📊 进度追踪\n\n| 日期 | 进度 | 备注 |\n|------|------|------|\n|      | 0%   |      |\n|      |      |      |\n|      |      |      |\n|      | 100% |      |\n\n---\n\n## 💪 激励语\n\n> \n',
          x: 100,
          y: 100,
          style: {
            fontSize: 16,
          }
        }
      ]
    },
    tags: ['目标', '规划', 'SMART', '执行'],
    usageCount: 0,
    createdAt: '2026-03-20'
  },
  
  {
    id: 'daily-note',
    name: 'Daily Note',
    nameZh: '每日笔记',
    description: '记录每天的思考和收获',
    category: 'note',
    icon: '📔',
    content: {
      textBlocks: [
        {
          id: 'title',
          type: 'text',
          content: '# 📔 每日笔记\n\n**日期**: _________\n**天气**: _________\n**心情**: _________\n\n---\n\n## 🌅 晨间日记\n\n### 今日目标\n1. \n2. \n3. \n\n### 今日感恩\n- \n- \n- \n\n---\n\n## 🌃 晚间复盘\n\n### 今日完成\n- \n- \n- \n\n### 今日收获\n- \n- \n\n### 今日反思\n- \n- \n\n### 改进计划\n- \n- \n\n---\n\n## 💡 灵感记录\n\n- \n- \n\n---\n\n## 📚 今日学习\n\n**阅读**: \n**课程**: \n**其他**: \n',
          x: 100,
          y: 100,
          style: {
            fontSize: 16,
          }
        }
      ]
    },
    tags: ['日记', '每日', '复盘', '反思'],
    usageCount: 0,
    createdAt: '2026-03-20'
  }
]

// 工具函数
export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return TEMPLATES.filter(t => t.category === category)
}

export function searchTemplates(query: string): Template[] {
  const q = query.toLowerCase()
  return TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.nameZh.includes(q) ||
    t.description.includes(q) ||
    t.tags.some(tag => tag.includes(q))
  )
}

export function getPopularTemplates(limit = 3): Template[] {
  return [...TEMPLATES]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit)
}

export function incrementTemplateUsage(templateId: string) {
  const template = TEMPLATES.find(t => t.id === templateId)
  if (template) {
    template.usageCount++
  }
}
