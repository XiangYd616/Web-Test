
import { ArrowDown, ArrowUp, Calendar, ChevronDown, ChevronRight, Minus, Shield, TrendingDown, TrendingUp, X } from 'lucide-react';
import React, { useState } from 'react';
import { SecurityTestResult } from '../../services/testing/securityTestService';

interface SecurityTestComparisonProps {
  results: SecurityTestResult[];
  onClose: () => void;
}

interface ComparisonMetric {
  name: string;
  key: string;
  getValue: (result: SecurityTestResult) => number | string;
  format?: (value: any) => string;
  isNumeric?: boolean;
}

const SecurityTestComparison: React.FC<SecurityTestComparisonProps> = ({
  results,
  onClose
}) => {
  
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // 定义对比指标
  const comparisonMetrics: ComparisonMetric[] = [
    {
      name: '总体评分',
      key: 'overallScore',
      getValue: (result) => result.overallScore,
      format: (value) => `${value}/100`,
      isNumeric: true
    },
    {
      name: '风险等级',
      key: 'riskLevel',
      getValue: (result) => result.riskLevel,
      format: (value) => value
    },
    {
      name: '等级',
      key: 'grade',
      getValue: (result) => result.grade,
      format: (value) => value
    },
    {
      name: '测试时长',
      key: 'duration',
      getValue: (result) => Math.round(result.duration / 1000),
      format: (value) => `${value}秒`,
      isNumeric: true
    },
    {
      name: '发现问题',
      key: 'findings',
      getValue: (result) => result.findings.length,
      format: (value) => `${value}个`,
      isNumeric: true
    },
    {
      name: '修复建议',
      key: 'recommendations',
      getValue: (result) => result.recommendations.length,
      format: (value) => `${value}条`,
      isNumeric: true
    }
  ];

  // 获取变化趋势
  const getTrend = (values: (number | string)[], index: number) => {
    if (index === 0 || typeof values[index] !== 'number' || typeof values[index - 1] !== 'number') {
      
        return null;
      }

    const current = values[index] as number;
    const previous = values[index - 1] as number;

    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'same';
  };

  // 获取趋势图标
  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-400" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-400" />;
      case 'same':
        return <Minus className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  // 获取风险等级颜色
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // 获取等级颜色
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'text-green-400 bg-green-900/30';
      case 'B': return 'text-blue-400 bg-blue-900/30';
      case 'C': return 'text-yellow-400 bg-yellow-900/30';
      case 'D': return 'text-orange-400 bg-orange-900/30';
      case 'F': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  // 格式化日期
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (results.length < 2) {
    
        return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">需要至少2个测试结果</h3>
          <p className="text-gray-400">请选择至少2个测试结果进行对比分析</p>
          <button
            onClick={onClose
      }
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-blue-400" />
              安全测试结果对比
            </h2>
            <p className="text-gray-300 mt-1">对比 {results.length} 个测试结果的安全指标变化</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 概览对比 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
        <div
          className="flex items-center justify-between p-6 cursor-pointer"
          onClick={() => toggleSection('overview')}
        >
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-400" />
            概览对比
          </h3>
          {expandedSections.has('overview') ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {expandedSections.has('overview') && (
          <div className="px-6 pb-6">
            {/* 测试信息表头 */}
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `200px repeat(${results.length}, 1fr)` }}>
              <div className="font-semibold text-gray-300">测试信息</div>
              {results.map((result, index) => (
                <div key={result.id} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50">
                  <div className="text-sm text-gray-300 mb-1">测试 #{index + 1}</div>
                  <div className="text-xs text-gray-400 mb-2">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {formatDate(result.timestamp)}
                  </div>
                  <div className="text-xs text-gray-400 truncate" title={result.url}>
                    {result.url}
                  </div>
                </div>
              ))}
            </div>

            {/* 指标对比 */}
            <div className="space-y-3">
              {comparisonMetrics.map((metric) => {
                const values = results.map(result => metric.getValue(result));

                return (
                  <div key={metric.key} className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${results.length}, 1fr)` }}>
                    <div className="flex items-center text-gray-300 font-medium">
                      {metric.name}
                    </div>
                    {values.map((value, index) => {
                      const trend = getTrend(values, index);
                      const isScore = metric.key === 'overallScore';
                      const isRisk = metric.key === 'riskLevel';
                      const isGrade = metric.key === 'grade';

                      return (
                        <div key={index} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                          <span className={`font-semibold ${isRisk ? getRiskColor(value as string) :
                            isGrade ? getGradeColor(value as string) :
                              'text-white'
                            }`}>
                            {metric.format ? metric.format(value) : value}
                          </span>
                          {getTrendIcon(trend)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 模块对比 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
        <div
          className="flex items-center justify-between p-6 cursor-pointer"
          onClick={() => toggleSection('modules')}
        >
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Shield className="h-5 w-5 mr-2 text-green-400" />
            模块对比
          </h3>
          {expandedSections.has('modules') ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {expandedSections.has('modules') && (
          <div className="px-6 pb-6">
            {/* 模块分数对比 */}
            <div className="space-y-4">
              {Object.keys(results[0].modules || {}).map((moduleKey) => {
                const moduleScores = results.map(result => (result.modules as any)[moduleKey]?.score || 0);
                const moduleNames = {
                  ssl: 'SSL/TLS安全',
                  headers: '安全头检查',
                  vulnerabilities: '漏洞扫描',
                  cookies: 'Cookie安全',
                  content: '内容安全',
                  network: '网络安全',
                  compliance: '合规检查'
                };

                return (
                  <div key={moduleKey} className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3">
                      {moduleNames[moduleKey as keyof typeof moduleNames] || moduleKey}
                    </h4>
                    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${results.length}, 1fr)` }}>
                      {moduleScores.map((score, index) => {
                        const trend = getTrend(moduleScores, index);
                        return (
                          <div key={index} className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <span className={`text-lg font-bold ${score >= 90 ? 'text-green-400' :
                                score >= 70 ? 'text-yellow-400' :
                                  score >= 50 ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                {score}
                              </span>
                              {getTrendIcon(trend)}
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${score >= 90 ? 'bg-green-500' :
                                  score >= 70 ? 'bg-yellow-500' :
                                    score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                style={{ width: `${score}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 问题对比 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
        <div
          className="flex items-center justify-between p-6 cursor-pointer"
          onClick={() => toggleSection('findings')}
        >
          <h3 className="text-lg font-semibold text-white flex items-center">
            <TrendingDown className="h-5 w-5 mr-2 text-red-400" />
            问题对比
          </h3>
          {expandedSections.has('findings') ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {expandedSections.has('findings') && (
          <div className="px-6 pb-6">
            {/* 问题严重程度统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {['critical', 'high', 'medium', 'low'].map((severity) => {
                const severityNames = {
                  critical: '严重',
                  high: '高危',
                  medium: '中危',
                  low: '低危'
                };
                const severityColors = {
                  critical: 'text-red-400',
                  high: 'text-orange-400',
                  medium: 'text-yellow-400',
                  low: 'text-blue-400'
                };

                const counts = results.map(result =>
                  result.findings.filter(f => f.severity === severity).length
                );

                return (
                  <div key={severity} className="bg-gray-700/30 rounded-lg p-3 text-center">
                    <div className={`text-sm font-medium mb-2 ${severityColors[severity as keyof typeof severityColors]}`}>
                      {severityNames[severity as keyof typeof severityNames]}
                    </div>
                    <div className="flex justify-center space-x-2">
                      {counts.map((count, index) => {
                        const trend = getTrend(counts, index);
                        return (
                          <div key={index} className="flex items-center space-x-1">
                            <span className="text-white font-bold">{count}</span>
                            {getTrendIcon(trend)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 新增和解决的问题 */}
            {results.length >= 2 && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* 新增问题 */}
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                  <h4 className="text-red-400 font-semibold mb-3 flex items-center">
                    <ArrowUp className="h-4 w-4 mr-2" />
                    新增问题
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(() => {
                      const latestResult = results[results.length - 1];
                      const previousResult = results[results.length - 2];
                      const newFindings = latestResult.findings.filter(finding =>
                        !previousResult.findings.some(prevFinding =>
                          prevFinding.title === finding.title && prevFinding.category === finding.category
                        )
                      );

                      return newFindings.length > 0 ? newFindings.map((finding, index) => (
                        <div key={index} className="text-sm text-red-300 bg-red-900/30 rounded p-2">
                          <div className="font-medium">{finding.title}</div>
                          <div className="text-xs text-red-400">{finding.category}</div>
                        </div>
                      )) : (
                        <div className="text-sm text-gray-400">无新增问题</div>
                      );
                    })()}
                  </div>
                </div>

                {/* 已解决问题 */}
                <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-3 flex items-center">
                    <ArrowDown className="h-4 w-4 mr-2" />
                    已解决问题
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(() => {
                      const latestResult = results[results.length - 1];
                      const previousResult = results[results.length - 2];
                      const resolvedFindings = previousResult.findings.filter(finding =>
                        !latestResult.findings.some(currentFinding =>
                          currentFinding.title === finding.title && currentFinding.category === finding.category
                        )
                      );

                      return resolvedFindings.length > 0 ? resolvedFindings.map((finding, index) => (
                        <div key={index} className="text-sm text-green-300 bg-green-900/30 rounded p-2">
                          <div className="font-medium">{finding.title}</div>
                          <div className="text-xs text-green-400">{finding.category}</div>
                        </div>
                      )) : (
                        <div className="text-sm text-gray-400">无已解决问题</div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 趋势分析 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
        <div
          className="flex items-center justify-between p-6 cursor-pointer"
          onClick={() => toggleSection('trends')}
        >
          <h3 className="text-lg font-semibold text-white flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
            趋势分析
          </h3>
          {expandedSections.has('trends') ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {expandedSections.has('trends') && (
          <div className="px-6 pb-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 评分趋势 */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4">评分趋势</h4>
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div key={result.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">
                        测试 #{index + 1}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${result.overallScore >= 90 ? 'bg-green-500' :
                              result.overallScore >= 70 ? 'bg-yellow-500' :
                                result.overallScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${result.overallScore}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-semibold w-12 text-right">
                          {result.overallScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 改进建议 */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4">改进建议</h4>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const latestResult = results[results.length - 1];
                    const suggestions = [];

                    if (results.length >= 2) {
                      const previousResult = results[results.length - 2];
                      const scoreDiff = latestResult.overallScore - previousResult.overallScore;

                      if (scoreDiff > 0) {
                        suggestions.push(`✅ 安全评分提升了 ${scoreDiff} 分，继续保持！`);
                      } else if (scoreDiff < 0) {
                        suggestions.push(`⚠️ 安全评分下降了 ${Math.abs(scoreDiff)} 分，需要关注`);
                      } else {
                        suggestions.push(`➡️ 安全评分保持稳定`);
                      }
                    }

                    if (latestResult.findings.length > 0) {
                      const criticalCount = latestResult.findings.filter(f => f.severity === 'critical').length;
                      const highCount = latestResult.findings.filter(f => f.severity === 'high').length;

                      if (criticalCount > 0) {
                        suggestions.push(`🚨 优先处理 ${criticalCount} 个严重安全问题`);
                      }
                      if (highCount > 0) {
                        suggestions.push(`⚡ 尽快修复 ${highCount} 个高危安全问题`);
                      }
                    }

                    if (suggestions.length === 0) {
                      suggestions.push('🎉 安全状况良好，继续保持最佳实践！');
                    }

                    return suggestions.map((suggestion, index) => (
                      <div key={index} className="text-gray-300 bg-gray-600/30 rounded p-2">
                        {suggestion}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityTestComparison;
