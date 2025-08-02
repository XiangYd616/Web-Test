import { AlertTriangle, CheckCircle, Download, Info, Share2, XCircle } from 'lucide-react';
import React from 'react';
import { TestResult } from '../../services/advancedTestEngine';
// CSS样式已迁移到组件库，不再需要外部CSS文件

interface EnhancedSEOAnalysisProps {
  results: TestResult;
  onExportReport: (format: 'pdf' | 'html' | 'json' | 'csv') => void;
  onShareResults: () => void;
}

const EnhancedSEOAnalysis: React.FC<EnhancedSEOAnalysisProps> = ({
  results,
  onExportReport,
  onShareResults
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getIssueIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
  };

  const getRecommendationIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const categoryNames = {
    technical: '技术SEO',
    content: '内容质量',
    onPage: '页面SEO',
    performance: '性能优化',
    mobile: '移动友好',
    social: '社交媒体',
    coreWebVitals: 'Core Web Vitals',
    pageExperience: '页面体验'
  };

  return (
    <div className="space-y-6">
      {/* 总体评分和操作按钮 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">SEO分析结果</h3>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => onExportReport('pdf')}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>PDF报告</span>
            </button>
            <button
              type="button"
              onClick={() => onExportReport('html')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>HTML报告</span>
            </button>
            <button
              type="button"
              onClick={onShareResults}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>分享</span>
            </button>
          </div>
        </div>

        {/* 总体分数显示 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#374151"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke={results.overallScore >= 80 ? "#10B981" : results.overallScore >= 60 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(results.overallScore / 100) * 314} 314`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{results.overallScore}</div>
                  <div className="text-sm text-gray-300">总分</div>
                </div>
              </div>
            </div>
            <div className={`text-lg font-semibold ${getScoreColor(results.overallScore)}`}>
              {results.scoreGrade || 'N/A'}
            </div>
            <div className="text-sm text-gray-300">
              {results.scoreDescription || '评分等级'}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white">分项评分</h4>
            {Object.entries(results.scores || {}).map(([key, score]) => {
              const name = categoryNames[key as keyof typeof categoryNames] || key;
              const numScore = typeof score === 'number' ? score : 0;
              const color = getScoreBarColor(numScore);

              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${numScore}%` }}
                      />
                    </div>
                    <span className="text-sm text-white w-8">{numScore}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white">统计信息</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">分析时长</span>
                <span className="text-white">{Math.round((results.duration || 0) / 1000)}秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">发现问题</span>
                <span className="text-white">{results.issues?.length || 0}个</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">优化建议</span>
                <span className="text-white">{Array.isArray(results.recommendations) ? results.recommendations.length : 0}条</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">页面大小</span>
                <span className="text-white">{Math.round((results.metadata?.pageSize || 0) / 1024)}KB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 问题和建议 */}
      {((results.issues && results.issues.length > 0) || (Array.isArray(results.recommendations) && results.recommendations.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 发现的问题 */}
          {results.issues && results.issues.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">发现的问题</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.issues.slice(0, 10).map((issue, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${issue.severity === 'critical' || issue.severity === 'high' ? 'bg-red-500/10 border-red-500' :
                    issue.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500' :
                      'bg-blue-500/10 border-blue-500'
                    }`}>
                    <div className="flex items-start space-x-2">
                      {getIssueIcon(issue.severity)}
                      <div className="flex-1">
                        <p className="text-sm text-white">{issue.message}</p>
                        {issue.impact && (
                          <p className="text-xs text-gray-400 mt-1">影响: {issue.impact}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 优化建议 */}
          {Array.isArray(results.recommendations) && results.recommendations.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">优化建议</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.recommendations.slice(0, 8).map((rec, index) => {
                  if (typeof rec === 'string') {
                    return (
                      <div key={index} className="p-3 rounded-lg border-l-4 bg-blue-500/10 border-blue-500">
                        <p className="text-sm text-white">{rec}</p>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${rec.priority === 'high' ? 'bg-red-500/10 border-red-500' :
                      rec.priority === 'medium' ? 'bg-yellow-500/10 border-yellow-500' :
                        'bg-green-500/10 border-green-500'
                      }`}>
                      <div className="flex items-start space-x-2">
                        {getRecommendationIcon(rec.priority)}
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-white">{rec.title}</h4>
                          <p className="text-xs text-gray-300 mt-1">{rec.description}</p>
                          {rec.actionItems && rec.actionItems.length > 0 && (
                            <ul className="text-xs text-gray-400 mt-2 space-y-1">
                              {rec.actionItems.slice(0, 3).map((item, i) => (
                                <li key={i}>• {item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 关键词分析结果 */}
      {results.keywords && Object.keys(results.keywords.density || {}).length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">关键词分析</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(results.keywords.density).map(([keyword, data]) => (
              <div key={keyword} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{keyword}</span>
                  <span className={`text-xs px-2 py-1 rounded ${data.status === 'optimal' ? 'bg-green-500/20 text-green-400' :
                    data.status === 'high' ? 'bg-red-500/20 text-red-400' :
                      data.status === 'low' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                    }`}>
                    {data.status === 'optimal' ? '最佳' :
                      data.status === 'high' ? '过高' :
                        data.status === 'low' ? '偏低' : '缺失'}
                  </span>
                </div>
                <div className="text-xs text-gray-300">
                  <div>密度: {data.density.toFixed(1)}%</div>
                  <div>出现: {data.count}次</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSEOAnalysis;
