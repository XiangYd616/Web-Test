import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DataPoint, dataVisualizationOptimizer, OptimizationConfig } from '../../utils/DataVisualizationOptimizer';

interface OptimizedPerformanceChartProps {
  data: DataPoint[];
  dataKey: string;
  name: string;
  color: string;
  height?: number;
  showAverage?: boolean;
  maxDataPoints?: number;
  samplingStrategy?: 'uniform' | 'adaptive' | 'importance';
  enableOptimization?: boolean;
  onOptimizationResult?: (result: any) => void;
}

interface PerformanceStats {
  renderTime: number;
  dataPoints: number;
  compressionRatio: number;
  cacheHit: boolean;
}

const OptimizedPerformanceChart: React.FC<OptimizedPerformanceChartProps> = ({
  data,
  dataKey,
  name,
  color,
  height = 300,
  showAverage = false,
  maxDataPoints = 1000,
  samplingStrategy = 'adaptive',
  enableOptimization = true,
  onOptimizationResult
}) => {
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 优化数据处理
  const optimizedData = useMemo(() => {
    if (!enableOptimization || data.length <= maxDataPoints) {
      return {
        data: data,
        originalCount: data.length,
        optimizedCount: data.length,
        compressionRatio: 1,
        processingTime: 0,
        cacheHit: false
      };
    }

    const startTime = performance.now();
    setIsLoading(true);

    const config: Partial<OptimizationConfig> = {
      maxDataPoints,
      samplingStrategy,
      preserveKeyPoints: true,
      enableCaching: true,
      performanceThreshold: 50
    };

    const result = dataVisualizationOptimizer.optimizeDataset(data, config);

    const renderTime = performance.now() - startTime;
    setPerformanceStats({
      renderTime,
      dataPoints: result.optimizedCount,
      compressionRatio: result.compressionRatio,
      cacheHit: result.cacheHit
    });

    setIsLoading(false);

    if (onOptimizationResult) {
      onOptimizationResult(result);
    }

    return result;
  }, [data, maxDataPoints, samplingStrategy, enableOptimization, onOptimizationResult]);

  // 计算平均值
  const averageValue = useMemo(() => {
    if (!showAverage || optimizedData.data.length === 0) return null;

    const values = optimizedData.data
      .map(item => item[dataKey] as number)
      .filter(val => val !== undefined && val !== null && !isNaN(val));

    if (values.length === 0) return null;

    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }, [optimizedData.data, dataKey, showAverage]);

  // 优化的时间格式化函数
  const formatTime = useCallback((value: any) => {
    if (!optimizedData.data.length) return '';

    try {
      const startTime = new Date(optimizedData.data[0].timestamp).getTime();
      const currentTime = new Date(value).getTime();
      const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);

      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch {
      const date = new Date(value);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  }, [optimizedData.data]);

  // 优化的工具提示格式化
  const formatTooltip = useCallback((value: any, name: string) => {
    if (name === dataKey) {
      const unit = dataKey === 'responseTime' ? 'ms' :
        dataKey === 'throughput' || dataKey === 'tps' ? '' : '';
      return [`${typeof value === 'number' ? value.toFixed(3) : value}${unit}`, name];
    }
    return [value, name];
  }, [dataKey]);

  // 优化的标签格式化
  const formatLabel = useCallback((value: any) => {
    if (!optimizedData.data.length) return '';

    try {
      const startTime = new Date(optimizedData.data[0].timestamp).getTime();
      const currentTime = new Date(value).getTime();
      const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);

      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      return `测试时间: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch {
      const date = new Date(value);
      return `时间: ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  }, [optimizedData.data]);

  // 计算合适的间隔
  const tickInterval = useMemo(() => {
    return Math.max(1, Math.floor(optimizedData.data.length / 8));
  }, [optimizedData.data.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">优化数据中...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 性能统计信息 */}
      {performanceStats && (
        <div className="absolute top-2 right-2 z-10 bg-gray-900/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-300">
          <div>数据点: {performanceStats.dataPoints}</div>
          {performanceStats.compressionRatio > 1 && (
            <div>压缩比: {performanceStats.compressionRatio.toFixed(1)}x</div>
          )}
          {performanceStats.cacheHit && (
            <div className="text-green-400">缓存命中</div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={optimizedData.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            tickFormatter={formatTime}
            interval={tickInterval}
            label={{
              value: '测试时间 (分:秒)',
              position: 'insideBottom',
              offset: -5,
              style: { textAnchor: 'middle', fill: '#9CA3AF' }
            }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            label={{
              value: name,
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#9CA3AF' }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={formatTooltip}
            labelFormatter={formatLabel}
          />

          {/* 平均线 */}
          {showAverage && averageValue !== null && (
            <ReferenceLine
              y={averageValue}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `平均: ${averageValue.toFixed(3)}`,
                position: 'topRight',
                style: { fill: '#f59e0b', fontSize: '12px' }
              }}
            />
          )}

          {/* 数据线 */}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={optimizedData.data.length <= 100 ? { fill: color, strokeWidth: 2, r: 3 } : false}
            activeDot={{ r: 5, stroke: color, strokeWidth: 2 }}
            strokeOpacity={0.8}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(OptimizedPerformanceChart);

// 导出性能监控组件
export const PerformanceMonitor: React.FC<{
  onStatsUpdate?: (stats: any) => void
}> = ({ onStatsUpdate }) => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const updateStats = () => {
      const perfMetrics = dataVisualizationOptimizer.getPerformanceMetrics();
      const cacheStats = dataVisualizationOptimizer.getCacheStats();

      const combinedStats = {
        ...perfMetrics,
        ...cacheStats,
        timestamp: Date.now()
      };

      setStats(combinedStats);
      if (onStatsUpdate) {
        onStatsUpdate(combinedStats);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, [onStatsUpdate]);

  if (!stats) return null;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 text-xs text-gray-300">
      <h4 className="font-semibold mb-2">性能监控</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>缓存命中率: {(stats.hitRate * 100).toFixed(1)}%</div>
        <div>缓存大小: {stats.size}</div>
        <div>平均压缩比: {stats.averageCompressionRatio.toFixed(1)}x</div>
        <div>总处理时间: {stats.totalProcessingTime.toFixed(1)}ms</div>
      </div>
    </div>
  );
};
