import React from 'react'
import type { AIAnalysis, OptimizationSuggestion } from './types'

interface AnalysisPanelProps {
  isAnalyzing: boolean
  analysis: AIAnalysis | null
  suggestions: OptimizationSuggestion[]
  onAnalyze: () => void
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isAnalyzing,
  analysis,
  suggestions,
  onAnalyze,
}) => {
  return (
    <div className="analysis-panel">
      <div className="analysis-header">
        <h3 className="analysis-title">AI 智能分析</h3>
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="btn-analyze"
        >
          {isAnalyzing ? '⏳ 分析中...' : '🤖 开始分析'}
        </button>
      </div>

      {analysis && (
        <div className="analysis-result">
          <div className="analysis-summary">
            <h4>分析摘要</h4>
            <p>{analysis.summary}</p>
          </div>

          <div className="analysis-bottlenecks">
            <h4>性能瓶颈</h4>
            <ul>
              {analysis.bottlenecks.map((bottleneck, i) => (
                <li key={i}>{bottleneck}</li>
              ))}
            </ul>
          </div>

          <div className="analysis-suggestions">
            <h4>优化建议</h4>
            <ul>
              {analysis.suggestions.map((suggestion, i) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </div>

          <div className="analysis-improvement">
            <strong>预期改进:</strong> {analysis.estimatedImprovement}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="optimization-suggestions">
          <h4>优化建议列表</h4>
          <div className="suggestion-list">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className={`suggestion-card priority-${suggestion.priority}`}>
                <div className="suggestion-header">
                  <span className="suggestion-icon">
                    {suggestion.priority === 'critical' ? '🔴' :
                     suggestion.priority === 'high' ? '🟠' :
                     suggestion.priority === 'medium' ? '🟡' : '🟢'}
                  </span>
                  <span className="suggestion-title">{suggestion.title}</span>
                  <span className="suggestion-category">{suggestion.category}</span>
                </div>
                <p className="suggestion-description">{suggestion.description}</p>
                <details className="suggestion-details">
                  <summary>实施方案</summary>
                  <pre className="suggestion-implementation">{suggestion.implementation}</pre>
                </details>
                <div className="suggestion-benefit">
                  <strong>预期收益:</strong> {suggestion.expectedBenefit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalysisPanel
