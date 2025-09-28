/**
 * StressTestRecordDetail.tsx - React组件
 * 
 * 文件路径: frontend\components\stress\StressTestRecordDetail.tsx
 * 创建时间: 2025-09-25
 * 更新时间: 2025-09-26 - 修复类型安全和结构问题
 */

import React, { useMemo, useState, useCallback } from 'react';
import { 
  Activity, 
  AlertCircle, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  Download, 
  TrendingUp, 
  Users, 
  XCircle, 
  Zap 
} from 'lucide-react';
import type { StressTestRecord } from '../../services/stressTestRecordService';

// 定义更安全的类型
interface ProcessedMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number;
  errorRate: number;
  [key: string]: unknown;
}

interface ProcessedData {
  config: Record<string, unknown>;
  results: Record<string, unknown>;
  metrics: ProcessedMetrics;
  hasValidData: boolean;
}

interface StressTestRecordDetailProps {
  record: StressTestRecord;
  onClose?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

const StressTestRecordDetail: React.FC<StressTestRecordDetailProps> = ({
  record,
  onClose,
  onExport,
  onDelete
}) => {
  const [error, setError] = useState<string | null>(null);

  // 使用安全的数据处理逻辑
  const processedData = useMemo((): ProcessedData => {
    if (!record) {
      return {
        config: {},
        results: {},
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          throughput: 0,
          errorRate: 0
        },
        hasValidData: false
      };
    }

    try {
      // 安全的类型检查和转换
      const config = typeof record.config === 'object' && record.config !== null 
        ? record.config as Record<string, unknown>
        : {};
      
      const results = typeof record.results === 'object' && record.results !== null
        ? record.results as Record<string, unknown>
        : {};
      
      const rawMetrics = (results as { metrics?: unknown }).metrics;
      const metricsData = typeof rawMetrics === 'object' && rawMetrics !== null 
        ? rawMetrics as Record<string, unknown>
        : {};

      // 安全的数值转换
      const safeNumber = (value: unknown): number => {
        if (typeof value === 'number' && !isNaN(value)) {
          return value;
        }
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          return !isNaN(parsed) ? parsed : 0;
        }
        return 0;
      };

      const processedMetrics: ProcessedMetrics = {
        totalRequests: safeNumber(metricsData.totalRequests),
        successfulRequests: safeNumber(metricsData.successfulRequests),
        failedRequests: safeNumber(metricsData.failedRequests),
        averageResponseTime: safeNumber(metricsData.averageResponseTime),
        minResponseTime: safeNumber(metricsData.minResponseTime),
        maxResponseTime: safeNumber(metricsData.maxResponseTime),
        throughput: safeNumber(metricsData.throughput),
        errorRate: safeNumber(metricsData.errorRate),
        // 保留其他属性，但进行类型检查
        ...Object.fromEntries(
          Object.entries(metricsData).filter(([key]) => 
            !['totalRequests', 'successfulRequests', 'failedRequests', 
              'averageResponseTime', 'minResponseTime', 'maxResponseTime', 
              'throughput', 'errorRate'].includes(key)
          )
        )
      };

      return {
        config,
        results,
        metrics: processedMetrics,
        hasValidData: Boolean(record && (Object.keys(config).length > 0 || Object.keys(results).length > 0))
      };
      
    } catch (err) {
      console.error('数据处理错误:', err);
      setError(err instanceof Error ? err.message : '数据处理失败');
      return {
        config: {},
        results: {},
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          throughput: 0,
          errorRate: 0
        },
        hasValidData: false
      };
    }
  }, [record]);

  const { config, results, metrics, hasValidData } = processedData;

  // 格式化时间 - 使用useCallback优化性能
  const formatTime = useCallback((timestamp?: string): string => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString('zh-CN');
    } catch (err) {
      console.warn('时间格式化失败:', err);
      setError('时间格式化错误');
      return 'N/A';
    }
  }, []);

  // 错误边界处理
  if (!record) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4 mx-auto" />
            <h3 className="text-lg font-medium text-white mb-2">数据加载错误</h3>
            <p className="text-gray-400">无法加载测试记录详情</p>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (!hasValidData) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-400 mb-4 mx-auto" />
            <h3 className="text-lg font-medium text-white mb-2">数据不完整</h3>
            <p className="text-gray-400">测试记录数据不完整或损坏</p>
          </div>
        </div>
      </div>
    );
  }

  // 格式化持续时间
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}分${remainingSeconds}秒` : `${remainingSeconds}秒`;
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'failed':
        return <XCircle className="w-5 h-5" />;
      case 'running':
        return <Activity className="w-5 h-5 animate-pulse" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  // 获取性能等级颜色
  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-orange-400';
      case 'F': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      {/* 头部信息 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              {record.testName}
            </h2>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusStyle(record.status)}`}>
                {getStatusIcon(record.status)}
                <span className="capitalize">
                  {record.status === 'completed' ? '已完成' :
                    record.status === 'failed' ? '失败' :
                      record.status === 'cancelled' ? '已取消' :
                        record.status === 'running' ? '运行中' : '已取消'}
                </span>
              </div>
              {record.performanceGrade && (
                <div className={`text-lg font-bold ${getGradeColor(record.performanceGrade)}`}>
                  等级: {record.performanceGrade}
                </div>
              )}
              {record.overallScore && (
                <div className="text-sm text-gray-400">
                  评分: {record.overallScore}/100
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
              title="导出测试数据"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
              title="关闭详情"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 测试信息 */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3 flex items-center">
            <Globe className="w-4 h-4 mr-2 text-blue-400" />
            测试信息
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">目标URL:</span>
              <span className="text-white truncate ml-2" title={record.url}>{record.url}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">开始时间:</span>
              <span className="text-white">{formatTime(record.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">结束时间:</span>
              <span className="text-white">{formatTime(record.endTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">实际持续时间:</span>
              <span className="text-white">{formatDuration(record.actualDuration)}</span>
            </div>
          </div>
        </div>

        {/* 测试配置 */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3 flex items-center">
            <Settings className="w-4 h-4 mr-2 text-green-400" />
            测试配置
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">并发用户:</span>
              <span className="text-white">{config.users}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">测试类型:</span>
              <span className="text-white">{config.testType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">请求方法:</span>
              <span className="text-white">{config.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">超时时间:</span>
              <span className="text-white">{config.timeout}秒</span>
            </div>
          </div>
        </div>
      </div>

      {/* 性能指标 */}
      {metrics && (
        <div className="mb-6">
          <h3 className="text-white font-medium mb-4 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-purple-400" />
            性能指标
          </h3>

          {/* 关键指标 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400">总请求数</span>
              </div>
              <div className="text-lg font-semibold text-blue-400">
                {metrics.totalRequests?.toLocaleString() || 0}
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">成功请求</span>
              </div>
              <div className="text-lg font-semibold text-green-400">
                {metrics.successfulRequests?.toLocaleString() || 0}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-yellow-400">平均响应时间</span>
              </div>
              <div className="text-lg font-semibold text-yellow-400">
                {metrics.averageResponseTime || 0}ms
              </div>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400">吞吐量</span>
              </div>
              <div className="text-lg font-semibold text-purple-400">
                {metrics.throughput || metrics.requestsPerSecond || metrics.rps || 0} req/s
              </div>
            </div>
          </div>

          {/* 详细指标 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-gray-700/20 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">失败请求</div>
              <div className="text-lg font-semibold text-red-400">
                {metrics.failedRequests || 0}
              </div>
            </div>

            <div className="bg-gray-700/20 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">错误率</div>
              <div className="text-lg font-semibold text-red-400">
                {metrics.errorRate || 0}%
              </div>
            </div>

            <div className="bg-gray-700/20 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">最小响应时间</div>
              <div className="text-lg font-semibold text-green-400">
                {metrics.minResponseTime || 0}ms
              </div>
            </div>

            <div className="bg-gray-700/20 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">最大响应时间</div>
              <div className="text-lg font-semibold text-orange-400">
                {metrics.maxResponseTime || 0}ms
              </div>
            </div>

            {metrics.p95ResponseTime && (
              <div className="bg-gray-700/20 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">P95响应时间</div>
                <div className="text-lg font-semibold text-purple-400">
                  {metrics.p95ResponseTime}ms
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {record.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <h3 className="text-red-400 font-medium mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            错误信息
          </h3>
          <p className="text-red-300 text-sm">{record.error}</p>
        </div>
      )}
    </div>
  );
};

export default StressTestRecordDetail;
