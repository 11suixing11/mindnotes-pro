export interface WhiteboardAnalysisResult {
  summary: string
  text: string
  suggestions: string[]
}

// 兼容现有调用侧类型名
export type CanvasAnalysisResult = WhiteboardAnalysisResult

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
  error?: {
    message?: string
  }
}

interface AIServiceConfig {
  apiKey: string
  baseUrl: string
  model: string
  timeoutMs: number
}

const SYSTEM_PROMPT =
  '你是一个智能白板分析专家。请识别用户画板截图中的手写文字、逻辑流程或思维导图，并以结构化的 JSON 格式返回分析结果：{ "summary": "核心主题", "text": "识别到的所有文字", "suggestions": ["下一步建议1", "建议2"] }'

function toDataUrl(base64Image: string): string {
  if (base64Image.startsWith('data:image/')) {
    return base64Image
  }
  return `data:image/png;base64,${base64Image}`
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()

  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1]) as Record<string, unknown>
    }

    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
    if (jsonMatch?.[0]) {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>
    }

    throw new Error('模型返回内容不是有效 JSON')
  }
}

function normalizeResult(payload: Record<string, unknown>): WhiteboardAnalysisResult {
  const summary = typeof payload.summary === 'string' ? payload.summary.trim() : ''
  const text = typeof payload.text === 'string' ? payload.text.trim() : ''
  const suggestions = Array.isArray(payload.suggestions)
    ? payload.suggestions.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []

  return {
    summary: summary || '未能提取核心主题',
    text: text || '未识别到明确文字内容',
    suggestions: suggestions.length > 0 ? suggestions : ['请补充更清晰的白板截图后重试'],
  }
}

export class AIService {
  private static instance: AIService | null = null
  private readonly config: AIServiceConfig

  private constructor(customConfig?: Partial<AIServiceConfig>) {
    const env = import.meta.env as unknown as Record<string, string | undefined>

    this.config = {
      apiKey: customConfig?.apiKey ?? env.VITE_AI_API_KEY ?? '',
      baseUrl: (customConfig?.baseUrl ?? env.VITE_AI_BASE_URL ?? 'https://api.openai.com').replace(/\/$/, ''),
      model: customConfig?.model ?? env.VITE_AI_MODEL ?? 'gpt-4o-mini',
      timeoutMs: customConfig?.timeoutMs ?? Number(env.VITE_AI_TIMEOUT_MS ?? 30000),
    }
  }

  static getInstance(customConfig?: Partial<AIServiceConfig>): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService(customConfig)
    }
    return AIService.instance
  }

  async analyzeWhiteboard(base64Image: string): Promise<WhiteboardAnalysisResult> {
    if (!base64Image || typeof base64Image !== 'string') {
      const message = '[AIService] analyzeWhiteboard 需要有效的 base64Image 字符串'
      console.error(message)
      throw new Error(message)
    }

    if (!this.config.apiKey) {
      const message = '[AIService] 缺少 AI API Key，请配置 VITE_AI_API_KEY'
      console.error(message)
      throw new Error(message)
    }

    const imageUrl = toDataUrl(base64Image)
    const requestBody = {
      model: this.config.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请分析这张白板截图并严格输出 JSON。',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    }

    try {
      let response = await this.requestChatCompletion(requestBody)

      // 兼容部分不支持 response_format 的网关，失败后自动回退一次
      if (!response.ok) {
        const fallbackBody = { ...requestBody }
        delete (fallbackBody as { response_format?: unknown }).response_format
        response = await this.requestChatCompletion(fallbackBody)
      }

      if (!response.ok) {
        const errorText = await response.text()
        const message = `[AIService] AI 接口调用失败 (${response.status}): ${errorText}`
        console.error(message)
        throw new Error(message)
      }

      const data = (await response.json()) as OpenAICompatibleResponse
      const content = this.getMessageContent(data)
      if (!content) {
        const message = '[AIService] 模型返回为空，无法解析分析结果'
        console.error(message)
        throw new Error(message)
      }

      const jsonPayload = extractJsonObject(content)
      return normalizeResult(jsonPayload)
    } catch (error) {
      if (error instanceof Error) {
        console.error('[AIService] 白板分析失败:', error.message)
        throw new Error(`白板分析失败: ${error.message}`)
      }
      console.error('[AIService] 白板分析失败: 未知错误')
      throw new Error('白板分析失败: 未知错误')
    }
  }

  // 兼容旧调用方（批次内不强制改动 UI）
  async analyzeCanvas(base64Image: string): Promise<CanvasAnalysisResult> {
    return this.analyzeWhiteboard(base64Image)
  }

  private async requestChatCompletion(body: object): Promise<Response> {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      return await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const message = `[AIService] 请求超时（>${this.config.timeoutMs}ms）`
        console.error(message)
        throw new Error(message)
      }
      throw error
    } finally {
      window.clearTimeout(timer)
    }
  }

  private getMessageContent(data: OpenAICompatibleResponse): string {
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    const content = data.choices?.[0]?.message?.content
    if (typeof content === 'string') {
      return content
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => part.text || '')
        .join('\n')
        .trim()
    }

    return ''
  }
}

export const aiService = AIService.getInstance()
