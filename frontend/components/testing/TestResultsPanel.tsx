/**
 * 统一的测试结果展示面板
 * 支持所有测试类型的结果可视化
 */

import React, { useState } from 'react';
import { TestResult, TestType } from '../../types/testConfig';

interface TestResultsPanelProps {
  testType: TestType;
  result: TestResult;
  onExport?: (format: 'pdf' | 'html' | 'json') => void;
  onCompare?: () => void;
  onSaveTemplate?: () => void;
}

export const TestResultsPanel: React.FC<TestResultsPanelProps> = ({
  testType,
  result,
  onExport,
  onCompare,
  onSaveTemplate
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
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'recommendations'>('summary');

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

  const renderSummary = () => (
    <div className="space-y-6">
      {/* 总体评分 */}
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(result.summary.score)}`}>
          <span className={`text-3xl font-bold ${getScoreColor(result.summary.score)}`}>
            {result.summary.score}
          </span>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">
          总体评分
        </h3>
        <p className="text-sm text-gray-600">
          {getScoreDescription(result.summary.score)}
        </p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {result.summary.totalChecks && (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{result.summary.totalChecks}</div>
            <div className="text-sm text-gray-600">总检查项</div>
          </div>
        )}
        {result.summary.passed !== undefined && (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{result.summary.passed}</div>
            <div className="text-sm text-gray-600">通过</div>
          </div>
        )}
        {result.summary.warnings !== undefined && (
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{result.summary.warnings}</div>
            <div className="text-sm text-gray-600">警告</div>
          </div>
        )}
        {result.summary.failed !== undefined && (
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{result.summary.failed}</div>
            <div className="text-sm text-gray-600">失败</div>
          </div>
        )}
      </div>

      {/* 测试信息 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">测试信息</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">测试URL:</span>
            <span className="ml-2 font-mono text-blue-600">{result.url}</span>
          </div>
          <div>
            <span className="text-gray-600">测试时间:</span>
            <span className="ml-2">{new Date(result.timestamp).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-600">测试ID:</span>
            <span className="ml-2 font-mono">{result.testId}</span>
          </div>
          {result.totalTime && (
            <div>
              <span className="text-gray-600">耗时:</span>
              <span className="ml-2">{formatDuration(result.totalTime)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-4">
      {result.checks && Object.entries(result.checks).map(([checkName, checkResult]) => (
        <div key={checkName} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 capitalize">
              {getCheckDisplayName(checkName)}
            </h4>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(checkResult.status)}`}>
                {getStatusDisplayName(checkResult.status)}
              </span>
              {checkResult.score !== undefined && (
                <span className={`text-sm font-semibold ${getScoreColor(checkResult.score)}`}>
                  {checkResult.score}分
                </span>
              )}
            </div>
          </div>
          
          {checkResult.message && (
            <p className="text-sm text-gray-600 mb-2">{checkResult.message}</p>
          )}

          {checkResult.details && (
            <div className="mt-2">
              <details className="text-sm">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  查看详细信息
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded border">
                  <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
                    {JSON.stringify(checkResult.details, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderRecommendations = () => (
    <div className="space-y-4">
      {result.recommendations && result.recommendations.length > 0 ? (
        result.recommendations.map((rec, index) => (
          <div key={index} className={`border-l-4 p-4 ${getPriorityBorderClass(rec.priority)} bg-gray-50`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{rec.category}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClass(rec.priority)}`}>
                {getPriorityDisplayName(rec.priority)}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
            <p className="text-sm text-blue-700 font-medium">💡 {rec.suggestion}</p>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🎉</div>
          <p>太棒了！没有发现需要改进的地方。</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* 头部 */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {getTestTypeLabel(testType)} 测试结果
          </h2>
          <div className="flex space-x-2">
            {onCompare && (
              <button
                onClick={onCompare}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                对比历史
              </button>
            )}
            {onSaveTemplate && (
              <button
                onClick={onSaveTemplate}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                保存模板
              </button>
            )}
            {onExport && (
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onExport(e.target.value as any);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  defaultValue=""
                >
                  <option value="">导出报告</option>
                  <option value="pdf">PDF格式</option>
                  <option value="html">HTML格式</option>
                  <option value="json">JSON格式</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'summary', label: '概览' },
            { key: 'details', label: '详细结果' },
            { key: 'recommendations', label: '改进建议' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.key === 'recommendations' && result.recommendations && result.recommendations.length > 0 && (
                <span className="ml-1 bg-red-100 text-red-600 text-xs rounded-full px-2 py-0.5">
                  {result.recommendations.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'recommendations' && renderRecommendations()}
      </div>
    </div>
  );
};

// 辅助函数
function getScoreDescription(score: number): string {
  if (score >= 90) return '优秀';
  if (score >= 70) return '良好';
  if (score >= 50) return '需要改进';
  return '存在问题';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function getCheckDisplayName(checkName: string): string {
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
}

function getStatusDisplayName(status: string): string {
  const names: Record<string, string> = {
    passed: '通过',
    warning: '警告',
    failed: '失败'
  };
  return names[status] || status;
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    passed: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

function getPriorityDisplayName(priority: string): string {
  const names: Record<string, string> = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  };
  return names[priority] || priority;
}

function getPriorityBorderClass(priority: string): string {
  const classes: Record<string, string> = {
    high: 'border-red-400',
    medium: 'border-yellow-400',
    low: 'border-blue-400'
  };
  return classes[priority] || 'border-gray-400';
}

function getPriorityBadgeClass(priority: string): string {
  const classes: Record<string, string> = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800'
  };
  return classes[priority] || 'bg-gray-100 text-gray-800';
}

function getTestTypeLabel(testType: TestType): string {
  const labels = {
    [TestType.API]: 'API',
    [TestType.PERFORMANCE]: '性能',
    [TestType.SECURITY]: '安全',
    [TestType.SEO]: 'SEO',
    [TestType.STRESS]: '压力',
    [TestType.INFRASTRUCTURE]: '基础设施',
    [TestType.UX]: 'UX',
    [TestType.COMPATIBILITY]: '兼容性',
    [TestType.WEBSITE]: '网站综合'
  };
  return labels[testType];
}
