/**
 * 测试结果组件
 *
 * 用于显示各种测试类型的执行结果和相关指标，包括状态展示、
 * 性能指标、建议信息以及操作按钮等功能。
 *
 * @component
 * @example
 * ```tsx
 * const result = {
 *   executionId: 'test-123',
 *   status: 'completed',
 *   testType: 'stress',
 *   score: 85,
 *   metrics: {
 *     responseTime: 250,
 *     throughput: 1000,
 *     errorRate: 0.1
 *   },
 *   recommendations: ['优化数据库查询', '启用缓存'],
 *   startTime: '2025-08-19T10:00:00Z',
 *   completedAt: '2025-08-19T10:05:00Z'
 * };
 *
 * <TestResults
 *   result={result}
 *   onRerun={() => console.log('重新运行测试')}
 *   onExport={() => console.log('导出报告')}
 * />
 * ```
 *
 * @author Test-Web Team
 * @since 1.0.0
 */

import React from 'react';

/**
 * 测试结果数据接口
 *
 * 定义测试执行结果的标准数据结构，适用于所有类型的测试
 *
 * @interface TestResult
 */
export interface TestResult {
  /** 测试执行的唯一标识符 */
  executionId: string;
  /** 测试执行状态 */
  status: 'running' | 'completed' | 'failed';
  /** 测试类型标识 */
  testType: string;
  /** 测试评分 (0-100)，可选 */
  score?: number;
  /** 测试性能指标，可选 */
  metrics?: {
    /** 响应时间 (毫秒) */
    responseTime?: number;
    /** 吞吐量 (请求/秒) */
    throughput?: number;
    /** 错误率 (0-1) */
    errorRate?: number;
  };
  /** 优化建议列表，可选 */
  recommendations?: string[];
  /** 测试开始时间 (ISO 8601格式) */
  startTime: string;
  /** 测试完成时间 (ISO 8601格式)，可选 */
  completedAt?: string;
}

/**
 * TestResults组件的属性接口
 *
 * @interface TestResultsProps
 */
interface TestResultsProps {
  /** 要显示的测试结果数据 */
  result: TestResult;
  /** 重新运行测试的回调函数，可选 */
  onRerun?: () => void;
  /** 导出报告的回调函数，可选 */
  onExport?: () => void;
}

/**
 * TestResults组件实现
 *
 * @param props - 组件属性
 * @returns 渲染的测试结果组件
 */
const TestResults: React.FC<TestResultsProps> = ({
  result,
  onRerun,
  onExport
}) => {
  /**
   * 根据测试状态获取对应的CSS颜色类名
   *
   * @param status - 测试状态
   * @returns CSS颜色类名
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'running':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  /**
   * 根据测试分数获取对应的CSS颜色类名
   *
   * @param score - 测试分数 (0-100)
   * @returns CSS颜色类名
   */
  const getScoreColor = (score?: number): string => {
    if (!score) return 'text-gray-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">测试结果</h3>
          <p className="text-sm text-gray-600">执行ID: {result.executionId}</p>
        </div>
        <div className="flex space-x-2">
          {result.status === 'completed' && onRerun && (
            <button
              type="button"
              onClick={onRerun}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重新运行
            </button>
          )}
          {result.status === 'completed' && onExport && (
            <button
              type="button"
              onClick={onExport}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              导出报告
            </button>
          )}
        </div>
      </div>

      {/* 状态信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className={`text-lg font-semibold ${getStatusColor(result.status)}`}>
            {result.status === 'running' && '运行中'}
            {result.status === 'completed' && '已完成'}
            {result.status === 'failed' && '失败'}
          </p>
          <p className="text-sm text-gray-500">状态</p>
        </div>
        <div className="text-center">
          <p className="text-lg">{result.testType}</p>
          <p className="text-sm text-gray-500">测试类型</p>
        </div>
        {result.score && (
          <div className="text-center">
            <p className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
              {result.score}
            </p>
            <p className="text-sm text-gray-500">评分</p>
          </div>
        )}
      </div>

      {/* 性能指标 */}
      {
        result.metrics && (
          <div className="mb-4">
            <h4 className="text-md font-semibold mb-2">性能指标</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.metrics.responseTime && (
                <div className="text-center p-3 bg-gray-50 rounded">
                  <label className="text-sm text-gray-600">响应时间</label>
                  <p className="text-lg font-semibold">{result.metrics.responseTime}ms</p>
                </div>
              )}
              {result.metrics.throughput && (
                <div className="text-center p-3 bg-gray-50 rounded">
                  <label className="text-sm text-gray-600">吞吐量</label>
                  <p className="text-lg font-semibold">{result.metrics.throughput}/s</p>
                </div>
              )}
              {result.metrics.errorRate !== undefined && (
                <div className="text-center p-3 bg-gray-50 rounded">
                  <label className="text-sm text-gray-600">错误率</label>
                  <p className="text-lg font-semibold">{(result.metrics.errorRate * 100).toFixed(2)}%</p>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* 建议 */}
      {
        result.recommendations && result.recommendations.length > 0 && (
          <div>
            <h4 className="text-md font-semibold mb-2">优化建议</h4>
            <ul className="space-y-2">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1"></span>
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      }

      {/* 时间信息 */}
      <div className="text-xs text-gray-500 border-t pt-4">
        <p>开始时间: {new Date(result.startTime).toLocaleString()}</p>
        {result.completedAt && (
          <p>完成时间: {new Date(result.completedAt).toLocaleString()}</p>
        )}
      </div>
    </div >
  );
};

export default TestResults;
