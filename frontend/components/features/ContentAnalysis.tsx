import React from 'react';

import { AlertTriangle, CheckCircle, Info, TrendingDown, TrendingUp, XCircle } from 'lucide-react';

interface ContentAnalysisResult {
  seoScore: number;
  performanceScore: number;
  accessibilityScore: number;
  overallScore: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    category: 'seo' | 'performance' | 'accessibility' | 'content';
    message: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    category: 'seo' | 'performance' | 'accessibility' | 'content';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  metrics: {
    pageSize: number;
    loadTime: number;
    imageCount: number;
    linkCount: number;
    headingStructure: boolean;
    metaDescription: boolean;
    altTexts: number;
    totalImages: number;
  };
}

interface ContentAnalysisProps {
  result: ContentAnalysisResult;
}

export const ContentAnalysis: React.FC<ContentAnalysisProps> = ({ result }) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    
    try {
      onClick?.(event);
    } catch (error) {
      console.error('Click handler error:', error);
      setError('操作失败，请重试');
    }
  }, [disabled, loading, onClick]);
  
  const handleChange = useCallback((newValue: any) => {
    updateState({ value: newValue, touched: true, error: null });
    
    try {
      onChange?.(newValue);
    } catch (error) {
      console.error('Change handler error:', error);
      updateState({ error: '值更新失败' });
    }
  }, [onChange, updateState]);
  
  const handleFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: true });
    onFocus?.(event);
  }, [onFocus, updateState]);
  
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: false });
    onBlur?.(event);
  }, [onBlur, updateState]);
  
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    if (score >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (score >= 70) return <TrendingUp className="w-5 h-5 text-yellow-500" />;
    return <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-500/20 border-red-500/30';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'info': return 'bg-blue-500/20 border-blue-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* 总体评分 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
            {result.overallScore}
          </div>
          <div className="mt-2 text-sm font-medium text-white">总体评分</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            {getScoreIcon(result.seoScore)}
            <span className="ml-1 text-2xl font-bold text-white">{result.seoScore}</span>
          </div>
          <div className="text-sm text-gray-300">SEO优化</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            {getScoreIcon(result.performanceScore)}
            <span className="ml-1 text-2xl font-bold text-white">{result.performanceScore}</span>
          </div>
          <div className="text-sm text-gray-300">性能表现</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            {getScoreIcon(result.accessibilityScore)}
            <span className="ml-1 text-2xl font-bold text-white">{result.accessibilityScore}</span>
          </div>
          <div className="text-sm text-gray-300">可访问性</div>
        </div>
      </div>

      {/* 详细指标 */}
      <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">详细指标</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-600/30 rounded-lg">
            <div className="text-lg font-bold text-white">{(result.metrics.pageSize / 1024).toFixed(1)}KB</div>
            <div className="text-xs text-gray-300">页面大小</div>
          </div>

          <div className="text-center p-3 bg-gray-600/30 rounded-lg">
            <div className="text-lg font-bold text-white">{result.metrics.loadTime}ms</div>
            <div className="text-xs text-gray-300">加载时间</div>
          </div>

          <div className="text-center p-3 bg-gray-600/30 rounded-lg">
            <div className="text-lg font-bold text-white">{result.metrics.imageCount}</div>
            <div className="text-xs text-gray-300">图片数量</div>
          </div>

          <div className="text-center p-3 bg-gray-600/30 rounded-lg">
            <div className="text-lg font-bold text-white">{result.metrics.linkCount}</div>
            <div className="text-xs text-gray-300">链接数量</div>
          </div>

          <div className="text-center p-3 bg-gray-600/30 rounded-lg">
            <div className="flex items-center justify-center">
              {result.metrics.headingStructure ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className="text-xs text-gray-300">标题结构</div>
          </div>

          <div className="text-center p-3 bg-gray-600/30 rounded-lg">
            <div className="flex items-center justify-center">
              {result.metrics.metaDescription ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className="text-xs text-gray-300">Meta描述</div>
          </div>

          <div className="text-center p-3 bg-gray-600/30 rounded-lg">
            <div className="text-lg font-bold text-white">
              {result.metrics.altTexts}/{result.metrics.totalImages}
            </div>
            <div className="text-xs text-gray-300">Alt文本覆盖</div>
          </div>
        </div>
      </div>

      {/* 问题列表 */}
      {result.issues.length > 0 && (
        <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">发现的问题</h4>
          <div className="space-y-3">
            {result.issues.map((issue, index) => (
              <div key={index} className={`flex items-start space-x-3 p-3 border rounded-lg ${getIssueColor(issue.type)}`}>
                {getIssueIcon(issue.type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">{issue.message}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(issue.impact)}`}>
                      {issue.impact === 'high' ? '高' : issue.impact === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    分类: {issue.category === 'seo' ? 'SEO' :
                      issue.category === 'performance' ? '性能' :
                        issue.category === 'accessibility' ? '可访问性' : '内容'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 优化建议 */}
      {result.recommendations.length > 0 && (
        <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">优化建议</h4>
          <div className="space-y-3">
            {result.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-blue-300">{recommendation.message}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(recommendation.priority)}`}>
                      {recommendation.priority === 'high' ? '高优先级' :
                        recommendation.priority === 'medium' ? '中优先级' : '低优先级'}
                    </span>
                  </div>
                  <div className="text-xs text-blue-400 mt-1">
                    分类: {recommendation.category === 'seo' ? 'SEO' :
                      recommendation.category === 'performance' ? '性能' :
                        recommendation.category === 'accessibility' ? '可访问性' : '内容'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentAnalysis;
