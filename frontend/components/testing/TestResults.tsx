/**
 * 测试结果组件
 * 统一的测试结果展示界面
 */

import React, { useState } from 'react';
import { Button } from '../ui/Button';

export interface TestResultsProps {
  result: TestResult;
  onDownload?: () => void;
  onRetry?: () => void;
  onShare?: () => void;
}

export interface TestResult {
  id: string;
  testType: string;
  url: string;
  status: 'success' | 'failed' | 'warning';
  score?: number;
  startTime: string;
  endTime: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  details: TestResultDetail[];
  recommendations?: string[];
}

export interface TestResultDetail {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  value?: string | number;
  expected?: string | number;
  description?: string;
  impact?: 'low' | 'medium' | 'high';
}

const TestResults: React.FC<TestResultsProps> = ({
  result,
  onDownload,
  onRetry,
  onShare
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'pass':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
      case 'fail':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success':
      case 'pass':
        return 'bg-green-100 dark:bg-green-900';
      case 'failed':
      case 'fail':
        return 'bg-red-100 dark:bg-red-900';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900';
      default:
        return 'bg-gray-100 dark:bg-gray-900';
    }
  };

  return (
    <div className="test-results bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* 结果头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {result.testType} 测试结果
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {result.url} • 耗时 {result.duration}ms
            </p>
          </div>
          
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBg(result.status)} ${getStatusColor(result.status)}`}>
            {result.status === 'success' ? '通过' : result.status === 'failed' ? '失败' : '警告'}
            {result.score && ` • 评分: ${result.score}`}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-3 mt-4">
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              重新测试
            </Button>
          )}
          {onDownload && (
            <Button variant="secondary" onClick={onDownload}>
              下载报告
            </Button>
          )}
          {onShare && (
            <Button variant="secondary" onClick={onShare}>
              分享结果
            </Button>
          )}
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: '概览' },
            { key: 'details', label: '详细结果' },
            { key: 'recommendations', label: '建议' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 统计概览 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.summary.total}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">总计</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {result.summary.passed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">通过</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {result.summary.failed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">失败</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {result.summary.warnings}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">警告</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-4">
            {result.details.map((detail, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {detail.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {detail.category}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBg(detail.status)} ${getStatusColor(detail.status)}`}>
                    {detail.status === 'pass' ? '通过' : detail.status === 'fail' ? '失败' : '警告'}
                  </div>
                </div>
                
                {detail.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {detail.description}
                  </p>
                )}
                
                {(detail.value || detail.expected) && (
                  <div className="mt-2 text-sm">
                    {detail.value && (
                      <span className="text-gray-900 dark:text-white">
                        实际值: {detail.value}
                      </span>
                    )}
                    {detail.expected && (
                      <span className="text-gray-600 dark:text-gray-400 ml-4">
                        期望值: {detail.expected}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {result.recommendations && result.recommendations.length > 0 ? (
              result.recommendations.map((recommendation, index) => (
                <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200">
                    {recommendation}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                暂无优化建议
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults;
