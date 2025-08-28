
import React from 'react';
import { useState } from 'react';

import { AlertTriangle, BarChart3, CheckCircle, Clock, TrendingDown, TrendingUp, Users, Zap } from 'lucide-react';

interface StressTestMetricsType {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  activeUsers: number;
  peakUsers: number;
  throughput: number;
  errorBreakdown: { [key: string]: number };
  // 添加缺少的属性
  currentTPS: number;
  peakTPS: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<any>;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  warning?: boolean;
  critical?: boolean;
  description?: string;
}

interface StressTestMetricsProps {
  metrics: StressTestMetricsType | null;
  isRunning: boolean;
  testConfig?: {
    users: number;
    duration: number;
  };
  thresholds?: {
    responseTime: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
    tps: { warning: number; critical: number };
  };
  className?: string;
}

// 默认阈值
const defaultThresholds = {
  responseTime: { warning: 1000, critical: 3000 },
  errorRate: { warning: 5, critical: 10 },
  tps: { warning: 10, critical: 5 }
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  color,
  trend,
  warning,
  critical,
  description
}) => {
  const getCardStyle = () => {
    const [error, setError] = useState<string | null>(null);

    if (critical) return 'bg-red-500/20 border-red-500/50';
    if (warning) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-gray-700/30 border-gray-600/50';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-400" />;
    return null;
  };

  const getStatusIcon = () => {
    if (critical) return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (warning) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <CheckCircle className="w-4 h-4 text-green-400" />;
  };

  return (
    <div className={`rounded-lg p-4 border transition-all duration-200 ${getCardStyle()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          {getStatusIcon()}
        </div>
      </div>

      <div className="flex items-baseline space-x-1">
        <span className={`text-2xl font-bold ${color}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>

      {description && (
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      )}

      {(warning || critical) && (
        <div className="mt-2 text-xs">
          {critical ? (
            <span className="text-red-300">⚠ 超出临界值</span>
          ) : (
            <span className="text-yellow-300">⚠ 超出警告值</span>
          )}
        </div>
      )}
    </div>
  );
};

export const StressTestMetrics: React.FC<StressTestMetricsProps> = ({
  metrics,
  isRunning,
  testConfig,
  thresholds = defaultThresholds,
  className = ''
}) => {
  if (!metrics) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {[
          { title: '总请求数', icon: BarChart3, color: 'text-blue-400' },
          { title: '成功率', icon: CheckCircle, color: 'text-green-400' },
          { title: '响应时间', icon: Zap, color: 'text-yellow-400' },
          { title: '当前TPS', icon: TrendingUp, color: 'text-purple-400' }
        ].map((metric, index) => (
          <div key={index} className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
              <span className="text-sm font-medium text-gray-300">{metric.title}</span>
            </div>
            <div className="text-2xl font-bold text-gray-500">--</div>
            <p className="text-xs text-gray-400 mt-1">等待数据...</p>
          </div>
        ))}
      </div>
    );
  }

  // 计算指标状态
  const successRate = metrics.totalRequests > 0
    ? (metrics.successfulRequests / metrics.totalRequests) * 100
    : 0;

  const errorRate = metrics.totalRequests > 0
    ? (metrics.failedRequests / metrics.totalRequests) * 100
    : 0;

  // 阈值检查
  const responseTimeWarning = metrics.averageResponseTime > thresholds.responseTime.warning;
  const responseTimeCritical = metrics.averageResponseTime > thresholds.responseTime.critical;

  const errorRateWarning = errorRate > thresholds.errorRate.warning;
  const errorRateCritical = errorRate > thresholds.errorRate.critical;

  const tpsWarning = metrics.currentTPS < thresholds.tps.warning;
  const tpsCritical = metrics.currentTPS < thresholds.tps.critical;

  const metricsData = [
    {
      title: '总请求数',
      value: metrics.totalRequests,
      icon: BarChart3,
      color: 'text-blue-400',
      description: isRunning ? '实时累计' : '测试总计'
    },
    {
      title: '成功率',
      value: successRate.toFixed(1),
      unit: '%',
      icon: CheckCircle,
      color: successRate >= 95 ? 'text-green-400' : successRate >= 90 ? 'text-yellow-400' : 'text-red-400',
      warning: successRate < 95 && successRate >= 90,
      critical: successRate < 90,
      description: `${metrics.successfulRequests}/${metrics.totalRequests} 成功`
    },
    {
      title: '平均响应时间',
      value: Math.round(metrics.averageResponseTime),
      unit: 'ms',
      icon: Zap,
      color: responseTimeCritical ? 'text-red-400' : responseTimeWarning ? 'text-yellow-400' : 'text-green-400',
      warning: responseTimeWarning && !responseTimeCritical,
      critical: responseTimeCritical,
      description: metrics.p95ResponseTime ? `P95: ${Math.round(metrics.p95ResponseTime)}ms` : undefined
    },
    {
      title: '当前TPS',
      value: metrics.currentTPS.toFixed(1),
      icon: TrendingUp,
      color: tpsCritical ? 'text-red-400' : tpsWarning ? 'text-yellow-400' : 'text-purple-400',
      warning: tpsWarning && !tpsCritical,
      critical: tpsCritical,
      description: `峰值: ${metrics.peakTPS.toFixed(1)} TPS`
    },
    {
      title: '错误率',
      value: errorRate.toFixed(2),
      unit: '%',
      icon: AlertTriangle,
      color: errorRateCritical ? 'text-red-400' : errorRateWarning ? 'text-yellow-400' : 'text-green-400',
      warning: errorRateWarning && !errorRateCritical,
      critical: errorRateCritical,
      description: `${metrics.failedRequests} 个错误`
    },
    {
      title: '活跃用户',
      value: testConfig?.users || '--',
      icon: Users,
      color: 'text-indigo-400',
      description: isRunning ? '目标并发数' : '测试配置'
    }
  ];

  // 如果有高级指标，添加更多卡片
  const advancedMetrics = [];
  if (metrics.p99ResponseTime) {
    advancedMetrics.push({
      title: 'P99响应时间',
      value: Math.round(metrics.p99ResponseTime),
      unit: 'ms',
      icon: Clock,
      color: 'text-orange-400',
      description: '99%请求响应时间'
    });
  }

  const allMetrics = [...metricsData, ...advancedMetrics];

  return (
    <div className={className}>
      {/* 主要指标 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        {metricsData.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* 高级指标（如果有） */}
      {advancedMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {advancedMetrics.map((metric, index) => (
            <MetricCard key={`advanced-${index}`} {...metric} />
          ))}
        </div>
      )}

      {/* 错误分类（如果有错误） */}
      {Object.keys(metrics.errorBreakdown).length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-300 mb-3 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            错误分类
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(metrics.errorBreakdown || {}).map(([errorType, count]) => (
              <div key={errorType} className="bg-red-500/20 rounded p-2">
                <div className="text-sm font-medium text-red-300">{errorType}</div>
                <div className="text-lg font-bold text-red-400">{count as number}</div>
                <div className="text-xs text-red-200">
                  {(((count as number) / metrics.totalRequests) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 性能总结 */}
      <div className="mt-4 p-4 bg-gray-700/30 border border-gray-600/50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-2">性能总结</h4>
        <div className="text-sm text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>测试状态:</span>
            <span className={isRunning ? 'text-green-400' : 'text-blue-400'}>
              {isRunning ? '进行中' : '已完成'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>整体评级:</span>
            <span className={
              errorRate < 1 && metrics.averageResponseTime < 500 ? 'text-green-400' :
                errorRate < 5 && metrics.averageResponseTime < 1000 ? 'text-yellow-400' : 'text-red-400'
            }>
              {errorRate < 1 && metrics.averageResponseTime < 500 ? '优秀' :
                errorRate < 5 && metrics.averageResponseTime < 1000 ? '良好' : '需要优化'}
            </span>
          </div>
          {metrics.peakTPS > 0 && (
            <div className="flex justify-between">
              <span>峰值性能:</span>
              <span className="text-purple-400">{metrics.peakTPS.toFixed(1)} TPS</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StressTestMetrics;
