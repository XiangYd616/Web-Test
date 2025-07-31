/**
 * 压力测试记录详情组件
 * 显示单个测试记录的详细信息
 */

import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Globe,
  Settings,
  TrendingUp,
  Users,
  XCircle,
  Zap
} from 'lucide-react';
import React, { useMemo } from 'react';
import type { StressTestRecord } from '../../services/stressTestRecordService';

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
  // 使用 useMemo 优化数据处理，避免不必要的重新计算
  const processedData = useMemo(() => {
    const config = (record?.config as any) || {};
    const results = record?.results || {};
    const metrics = (results as any)?.metrics || {};

    // 安全的数据访问，防止 undefined 错误
    const safeMetrics = {
      totalRequests: metrics.totalRequests || 0,
      successfulRequests: metrics.successfulRequests || 0,
      failedRequests: metrics.failedRequests || 0,
      averageResponseTime: metrics.averageResponseTime || 0,
      minResponseTime: metrics.minResponseTime || 0,
      maxResponseTime: metrics.maxResponseTime || 0,
      throughput: metrics.throughput || 0,
      errorRate: metrics.errorRate || 0,
      ...metrics
    };

    return {
      config,
      results,
      metrics: safeMetrics,
      hasValidData: Boolean(record && Object.keys(config).length > 0)
    };
  }, [record]);

  const { config, results, metrics, hasValidData } = processedData;

  // 错误边界处理
  if (!record) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-white mb-2">数据加载错误</h3>
            <p className="text-gray-400">无法加载测试记录详情</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasValidData) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-yellow-400 mb-4" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-white mb-2">数据不完整</h3>
            <p className="text-gray-400">测试记录数据不完整或损坏</p>
          </div>
        </div>
      </div>
    );
  }

  // 格式化时间
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString('zh-CN');
    } catch (error) {
      console.warn('时间格式化失败:', error);
      return 'N/A';
    }
  };

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
