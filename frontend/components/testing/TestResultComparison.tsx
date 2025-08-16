/**
 * 测试结果对比组件
 * 支持多个测试结果的并排对比
 */

import React, { useState } from 'react';
import { TestResult, TestType } from '../../types/testConfig';

interface TestResultComparisonProps {
  testType: TestType;
  results: TestResult[];
  onClose?: () => void;
}

export const TestResultComparison: React.FC<TestResultComparisonProps> = ({
  testType,
  results,
  onClose
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');

  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);
  
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
  const [selectedMetric, setSelectedMetric] = useState<string>('score');

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    if (score >= 50) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getScoreTrend = (current: number, previous: number): { icon: string; color: string; text: string } => {
    const diff = current - previous;
    if (diff > 5) return { icon: '📈', color: 'text-green-600', text: `+${diff.toFixed(1)}` };
    if (diff < -5) return { icon: '📉', color: 'text-red-600', text: `${diff.toFixed(1)}` };
    return { icon: '➡️', color: 'text-gray-600', text: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}` };
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTestTypeLabel = (testType: TestType): string => {
    const labels = {
      [TestType.API]: 'API测试',
      [TestType.PERFORMANCE]: '性能测试',
      [TestType.SECURITY]: '安全测试',
      [TestType.SEO]: 'SEO测试',
      [TestType.STRESS]: '压力测试',
      [TestType.INFRASTRUCTURE]: '基础设施测试',
      [TestType.UX]: 'UX测试',
      [TestType.COMPATIBILITY]: '兼容性测试',
      [TestType.WEBSITE]: '网站综合测试'
    };
    return labels[testType];
  };

  const getAllCheckNames = (): string[] => {
    const checkNames = new Set<string>();
    results.forEach(result => {
      if (result.checks) {
        Object.keys(result.checks).forEach(name => checkNames.add(name));
      }
    });
    return Array.from(checkNames).sort();
  };

  const getCheckDisplayName = (checkName: string): string => {
    const names: Record<string, string> = {
      ssl: 'SSL证书',
      headers: '安全头部',
      vulnerabilities: '漏洞扫描',
      meta: 'Meta标签',
      headings: '标题结构',
      images: '图片优化',
      connectivity: '网络连接',
      dns: 'DNS解析',
      accessibility: '可访问性',
      usability: '可用性',
      rendering: '页面渲染',
      javascript: 'JavaScript兼容性'
    };
    return names[checkName] || checkName;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {getTestTypeLabel(testType)} 结果对比
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            对比 {results.length} 个测试结果
          </p>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 总体评分对比 */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">总体评分对比</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((result, index) => (
                <div key={result.testId} className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getScoreBgColor(result.summary.score)} mb-2`}>
                      <span className={`text-xl font-bold ${getScoreColor(result.summary.score)}`}>
                        {result.summary.score}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(result.timestamp)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(result.timestamp)}
                    </div>
                    {index > 0 && (
                      <div className="mt-2 flex items-center justify-center space-x-1">
                        <span className="text-lg">
                          {getScoreTrend(result.summary.score, results[index - 1].summary.score).icon}
                        </span>
                        <span className={`text-sm font-medium ${getScoreTrend(result.summary.score, results[index - 1].summary.score).color}`}>
                          {getScoreTrend(result.summary.score, results[index - 1].summary.score).text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 详细检查项对比 */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">详细检查项对比</h3>
            
            {getAllCheckNames().length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        检查项
                      </th>
                      {results.map((result, index) => (
                        <th key={result.testId} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          测试 {index + 1}
                          <div className="text-xs text-gray-400 normal-case">
                            {formatDate(result.timestamp)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getAllCheckNames().map((checkName) => (
                      <tr key={checkName}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getCheckDisplayName(checkName)}
                        </td>
                        {results.map((result) => {
                          const checkResult = result.checks?.[checkName];
                          return (
                            <td key={result.testId} className="px-6 py-4 whitespace-nowrap text-center">
                              {checkResult ? (
                                <div className="space-y-1">
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    checkResult.status === 'passed' ? 'bg-green-100 text-green-800' :
                                    checkResult.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {checkResult.status === 'passed' ? '通过' :
                                     checkResult.status === 'warning' ? '警告' : '失败'}
                                  </div>
                                  {checkResult.score !== undefined && (
                                    <div className={`text-sm font-semibold ${getScoreColor(checkResult.score)}`}>
                                      {checkResult.score}分
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>没有可对比的检查项数据</p>
              </div>
            )}
          </div>

          {/* 统计信息对比 */}
          {results.some(r => r.summary.totalChecks) && (
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">统计信息对比</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        指标
                      </th>
                      {results.map((result, index) => (
                        <th key={result.testId} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          测试 {index + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">总检查项</td>
                      {results.map((result) => (
                        <td key={result.testId} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {result.summary.totalChecks || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">通过项</td>
                      {results.map((result) => (
                        <td key={result.testId} className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600">
                          {result.summary.passed || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">警告项</td>
                      {results.map((result) => (
                        <td key={result.testId} className="px-6 py-4 whitespace-nowrap text-center text-sm text-yellow-600">
                          {result.summary.warnings || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">失败项</td>
                      {results.map((result) => (
                        <td key={result.testId} className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-600">
                          {result.summary.failed || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">测试耗时</td>
                      {results.map((result) => (
                        <td key={result.testId} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {result.totalTime ? `${(result.totalTime / 1000).toFixed(1)}s` : '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                // 导出对比报告
                const comparisonData = {
                  testType,
                  comparisonDate: new Date().toISOString(),
                  results: results.map(r => ({
                    testId: r.testId,
                    timestamp: r.timestamp,
                    score: r.summary.score,
                    summary: r.summary
                  }))
                };
                
                const blob = new Blob([JSON.stringify(comparisonData, null, 2)], {
                  type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `test-comparison-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              导出对比报告
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultComparison;
