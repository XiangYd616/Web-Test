/**
 * StressTestCharts.tsx - React组件
 * 
 * 文件路径: frontend\components\charts\StressTestCharts.tsx
 * 创建时间: 2025-09-25
 */


import { RotateCcw } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { Bar, BarChart, Brush, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TestPhase {
  name: string;
  startTime: number;
  endTime?: number;
  color: string;
  description?: string;
}

// 增强的实时数据接口
interface EnhancedRealTimeData {
  timestamp: number;
  responseTime: number;
  status: number;
  success: boolean;
  activeUsers: number;
  throughput: number;
  errorType?: string;
  connectionTime?: number;
  dnsTime?: number;
  phase?: string;
}

interface TestResultData {
  timestamp: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeUsers: number;
  phase: string;
  p50ResponseTime?: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
}

// 基线对比数据
interface BaselineData {
  name: string;
  data: TestResultData[];
  color: string;
  date: string;
}

// 主组件属性
interface EnhancedStressTestChartsProps {
  // 实时数据（测试进行中）
  realTimeData?: EnhancedRealTimeData[];

  testResultData?: TestResultData[];

  // 当前状态
  isRunning: boolean;
  testCompleted: boolean;

  // 基线对比数据
  baselineData?: BaselineData[];

  testPhases?: TestPhase[];

  // 配置选项
  height?: number;
  enableZoom?: boolean;
  dataPointDensity?: 'low' | 'medium' | 'high';
  showAdvancedMetrics?: boolean;

  // 当前测试指标
  currentMetrics?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    currentTPS: number;
    peakTPS: number;
    errorBreakdown: Record<string, number>;
    p50ResponseTime?: number;
    p75ResponseTime?: number;
    p90ResponseTime?: number;
    p95ResponseTime?: number;
    p99ResponseTime?: number;
    p999ResponseTime?: number;
  };
}

export const EnhancedStressTestCharts: React.FC<EnhancedStressTestChartsProps> = ({
  realTimeData = [],
  testResultData = [],
  isRunning,
  testCompleted,
  baselineData = [],
  testPhases = [],
  height = 400,
  enableZoom = true,
  dataPointDensity = 'medium',
  showAdvancedMetrics = true,
  currentMetrics
}) => {
  // 状态管理
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['responseTime', 'throughput', 'activeUsers', 'errorRate']);
  const [chartType, setChartType] = useState<'realtime' | 'results' | 'comparison' | 'distribution'>('realtime');
  const [zoomDomain, setZoomDomain] = useState<{ left?: number, right?: number }>({});
  const [showErrorBreakdown, setShowErrorBreakdown] = useState(false);
  const [densityControl, setDensityControl] = useState(dataPointDensity);
  const [timeDisplayMode, setTimeDisplayMode] = useState<'relative' | 'absolute'>('relative');

  // 根据测试状态自动切换图表类型
  React.useEffect(() => {
    if (isRunning) {
      setChartType('realtime');
    } else if (testCompleted && testResultData.length > 0) {
      setChartType('results');
    }
  }, [isRunning, testCompleted, testResultData.length]);

  // 数据处理 - 根据密度控制采样
  const processedData = useMemo(() => {
    // 明确区分数据源：实时数据用于实时监控，测试结果数据用于结果视图
    let sourceData: any[] = [];

    console.log('📊 EnhancedStressTestCharts 处理数据:', {
      chartType,
      realTimeDataLength: realTimeData?.length || 0,
      testResultDataLength: testResultData?.length || 0,
      densityControl,
      isRunning,
      testCompleted,
      realTimeDataSample: realTimeData?.slice(0, 2),
      testResultDataSample: testResultData?.slice(0, 2)
    });

    if (realTimeData && realTimeData.length > 0) {
      // 使用实时数据（用于实时监控视图）
      sourceData = realTimeData;
      // 只在数据量变化时打印日志
      if (realTimeData.length % 100 === 0 || realTimeData.length < 10) {
        console.log('📊 EnhancedStressTestCharts 使用实时数据:', sourceData.length, '个数据点');
      }
    } else if (testResultData && testResultData.length > 0) {
      // 使用测试结果数据（用于测试结果视图）
      sourceData = testResultData;
      console.log('📊 EnhancedStressTestCharts 使用测试结果数据:', sourceData.length, '个数据点');
    } else {
      // 减少空数据警告的频率，只在组件首次渲染时打印
      console.log('⚠️ EnhancedStressTestCharts: 没有可用数据');
    }

    if (!sourceData || sourceData.length === 0) {
      console.log('❌ EnhancedStressTestCharts: 返回空数据');
      return [];
    }

    // 根据密度控制设置采样步长
    const step = densityControl === 'low' ? 5 : densityControl === 'medium' ? 2 : 1;
    const filtered = sourceData.filter((_, index) => index % step === 0);

    // 只在数据量变化时打印处理结果
    if (filtered.length % 50 === 0 || filtered.length < 10) {
      console.log('📊 EnhancedStressTestCharts 处理后数据:', filtered.length, '个数据点', filtered.slice(0, 2));
    }

    return filtered;
  }, [realTimeData, testResultData, densityControl, chartType, isRunning, testCompleted]);

  // 响应时间分布数据
  const responseTimeDistribution = useMemo(() => {
    if (!processedData.length) return [];

    // 🔧 修复：过滤有效的响应时间数据
    const responseTimes = processedData
      .map(d => d.responseTime)
      .filter(time => typeof time === 'number' && !isNaN(time) && time > 0)
      .sort((a, b) => a - b);

    if (responseTimes.length === 0) return [];

    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);

    // 🔧 修复：使用更合理的分布区间策略
    let bins: Array<{ min: number; max: number; label: string }> = [];

    if (max <= 100) {
      // 响应时间在100ms以内，使用10ms间隔
      bins = [
        { min: 0, max: 10, label: '0-10ms' },
        { min: 10, max: 20, label: '10-20ms' },
        { min: 20, max: 30, label: '20-30ms' },
        { min: 30, max: 50, label: '30-50ms' },
        { min: 50, max: 100, label: '50-100ms' }
      ];
    } else if (max <= 500) {
      // 响应时间在500ms以内，使用50ms间隔
      bins = [
        { min: 0, max: 50, label: '0-50ms' },
        { min: 50, max: 100, label: '50-100ms' },
        { min: 100, max: 200, label: '100-200ms' },
        { min: 200, max: 300, label: '200-300ms' },
        { min: 300, max: 500, label: '300-500ms' }
      ];
    } else if (max <= 2000) {
      // 响应时间在2秒以内，使用200ms间隔
      bins = [
        { min: 0, max: 100, label: '0-100ms' },
        { min: 100, max: 300, label: '100-300ms' },
        { min: 300, max: 500, label: '300-500ms' },
        { min: 500, max: 1000, label: '500ms-1s' },
        { min: 1000, max: 2000, label: '1-2s' }
      ];
    } else {
      // 响应时间超过2秒，使用更大间隔
      bins = [
        { min: 0, max: 500, label: '0-500ms' },
        { min: 500, max: 1000, label: '500ms-1s' },
        { min: 1000, max: 2000, label: '1-2s' },
        { min: 2000, max: 5000, label: '2-5s' },
        { min: 5000, max: Infinity, label: '5s+' }
      ];
    }

    // 计算每个区间的数据
    const distribution = bins.map(bin => ({
      range: bin.label,
      count: 0,
      percentage: 0,
      min: bin.min,
      max: bin.max
    }));

    responseTimes.forEach(time => {
      const binIndex = distribution.findIndex(bin => time >= bin.min && time < bin.max);
      if (binIndex !== -1) {
        distribution[binIndex].count++;
      } else if (time >= distribution[distribution.length - 1].min) {
        // 处理最后一个区间（包含上边界）
        distribution[distribution.length - 1].count++;
      }
    });

    // 计算百分比
    distribution.forEach(bin => {
      bin.percentage = responseTimes.length > 0 ? (bin.count / responseTimes.length) * 100 : 0;
    });

    // 🔧 修复：过滤掉空的区间以减少显示混乱
    return distribution.filter(bin => bin.count > 0);
  }, [processedData]);

  // 错误类型分布数据
  const errorTypeDistribution = useMemo(() => {
    if (!currentMetrics?.errorBreakdown) return [];

    const totalFailedRequests = currentMetrics.failedRequests || 0;
    return Object.entries(currentMetrics.errorBreakdown).map(([type, count]) => ({
      name: type,
      value: count,
      percentage: totalFailedRequests > 0 ? (count / totalFailedRequests) * 100 : 0
    }));
  }, [currentMetrics]);

  // 缩放处理
  const handleZoom = useCallback((domain: any) => {
    setZoomDomain(domain);
  }, []);

  const resetZoom = useCallback(() => {
    setZoomDomain({});
  }, []);

  // 🔧 新增：时间格式化函数
  const formatTimeLabel = useCallback((value: any) => {
    if (timeDisplayMode === 'absolute') {
      // 显示实际时间 (HH:MM:SS)
      return new Date(value).toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else {
      // 🔧 改进：显示相对时间，提高到0.01秒精度 (M:SS.CC)
      if (processedData.length > 0) {
        const startTime = new Date(processedData[0].timestamp).getTime();
        const currentTime = new Date(value).getTime();
        const elapsedSeconds = (currentTime - startTime) / 1000; // 保留小数

        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = Math.floor(elapsedSeconds % 60);
        const ms = Math.floor((elapsedSeconds % 1) * 100); // 0.01秒精度

        return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}` : `${seconds}.${ms.toString().padStart(2, '0')}`;
      }
      return new Date(value).toLocaleTimeString();
    }
  }, [timeDisplayMode, processedData]);

  // 渲染实时监控图表
  const renderRealTimeChart = () => (
    <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis
        dataKey="timestamp"
        stroke="#9CA3AF"
        fontSize={12}
        tickFormatter={formatTimeLabel}
        label={{
          value: timeDisplayMode === 'absolute' ? '实际时间' : '测试时间 (分:秒)',
          position: 'insideBottom',
          offset: -5,
          style: { textAnchor: 'middle', fill: '#9CA3AF' }
        }}
      />
      <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
      <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} />

      <Tooltip
        contentStyle={{
          backgroundColor: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#F9FAFB'
        }}
        formatter={(value: any, name: string) => {
          if (name === 'responseTime') return [`${value}ms`, '响应时间'];
          if (name === 'averageResponseTime') return [`${value.toFixed(3)}ms`, '平均响应时间'];
          if (name === 'throughput') return [`${value.toFixed(1)}`, '吞吐量'];
          if (name === 'activeUsers') return [`${value}`, '活跃用户'];
          return [value, name];
        }}
        labelFormatter={(value) => {
          const timeLabel = formatTimeLabel(value);
          return timeDisplayMode === 'absolute' ? `时间: ${timeLabel}` : `测试时间: ${timeLabel}`;
        }}
      />
      <Legend />

      {enableZoom && (
        <Brush
          dataKey="timestamp"
          height={30}
          stroke="#3B82F6"
          tickFormatter={formatTimeLabel}
        />
      )}

      {/* 测试阶段标注 */}
      {testPhases.map((phase, index) => (
        <ReferenceArea
          key={index}
          yAxisId="left"
          x1={phase.startTime}
          x2={phase.endTime || Date.now()}
          fill={phase.color}
          fillOpacity={0.1}
          label={phase.name}
        />
      ))}

      {/* 多Y轴指标 - 先渲染柱状图，再渲染线条确保线条在上层 */}
      {selectedMetrics.includes('throughput') && (
        <Bar
          yAxisId="right"
          dataKey="throughput"
          fill="#10B981"
          name="吞吐量 (req/s)"
          opacity={0.6}
        />
      )}

      {selectedMetrics.includes('responseTime') && (
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="responseTime"
          stroke="#EF4444"
          strokeWidth={4}
          dot={false}
          name="响应时间 (ms)"
          strokeDasharray="0"
          strokeOpacity={1}
        />
      )}

      {selectedMetrics.includes('activeUsers') && (
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="activeUsers"
          stroke="#F59E0B"
          strokeWidth={3}
          dot={false}
          name="活跃用户数"
          strokeDasharray="8 4"
          strokeOpacity={0.9}
        />
      )}

      {selectedMetrics.includes('errorRate') && (
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="errorRate"
          stroke="#DC2626"
          strokeWidth={2}
          dot={false}
          name="错误率 (%)"
          strokeDasharray="4 2"
          strokeOpacity={0.8}
        />
      )}
    </ComposedChart>
  );

  // 渲染响应时间分布直方图
  const renderDistributionChart = () => (
    <BarChart data={responseTimeDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis
        dataKey="range"
        stroke="#9CA3AF"
        fontSize={11}
        angle={-45}
        textAnchor="end"
        height={60}
        interval={0}
      />
      <YAxis
        stroke="#9CA3AF"
        fontSize={12}
        label={{ value: '请求数量', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#F9FAFB'
        }}
          /**
           * if功能函数
           * @param {Object} params - 参数对象
           * @returns {Promise<Object>} 返回结果
           */
        formatter={(value: any, name: string) => {
          if (name === 'count') {
            const percentage = responseTimeDistribution.find(item => item.count === value)?.percentage || 0;
            return [`${value} 个请求 (${percentage.toFixed(1)}%)`, '请求数量'];
          }
          return [value, name];
        }}
        labelFormatter={(label) => `响应时间范围: ${label}`}
      />
      <Bar
        dataKey="count"
        fill="#3B82F6"
        name="count"
        radius={[2, 2, 0, 0]}
      />
    </BarChart>
  );

  // 渲染错误类型分布饼图
  const renderErrorBreakdownChart = () => {
    const COLORS = ['#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16'];

    return (
      <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <Pie
          data={errorTypeDistribution}
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
        >
          {errorTypeDistribution.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    );
  };

  return (
    <div className="space-y-4">
      {/* 简化的控制面板 - 移除重复的图表类型按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-gray-800/30 rounded-lg">
        {/* 数据统计信息 */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>
            数据点: {processedData.length.toLocaleString()}
            {densityControl !== 'high' && (
              <span className="text-gray-500">
                / {(realTimeData.length + testResultData.length).toLocaleString()}
              </span>
            )}
          </span>
          {densityControl !== 'high' && (
            <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs">
              {densityControl === 'low' ? '1/5 采样' : '1/2 采样'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 🔧 新增：时间显示模式切换按钮 */}
          <button
            type="button"
            onClick={() => setTimeDisplayMode(timeDisplayMode === 'relative' ? 'absolute' : 'relative')}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 flex items-center gap-1"
            title={timeDisplayMode === 'relative' ? '切换到实际时间' : '切换到相对时间'}
          >
            🕐 {timeDisplayMode === 'relative' ? '相对时间' : '实际时间'}
          </button>

          {enableZoom && (
            <button
              type="button"
              onClick={resetZoom}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              重置缩放
            </button>
          )}

          <select
            id="chart-density-select"
            value={densityControl}
            onChange={(e) => setDensityControl(e.target.value as any)}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm"
            aria-label="选择图表数据密度"
            title="数据密度控制"
          >
            <option value="low">低密度</option>
            <option value="medium">中密度</option>
            <option value="high">高密度</option>
          </select>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="bg-gray-800/50 rounded-lg p-4" style={{ height: `${height}px`, minHeight: '400px' }}>
        {processedData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-lg mb-2">📊 等待数据...</div>
              <div className="text-sm">
                {isRunning ? '测试正在运行中，数据即将显示' : '暂无测试数据'}
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {(() => {
              switch (chartType) {
                case 'realtime':
                  return renderRealTimeChart();
                case 'distribution':
                  return renderDistributionChart();
                case 'results':
                  return renderRealTimeChart();
                default:
                  return renderRealTimeChart();
              }
            })()}
          </ResponsiveContainer>
        )}
      </div>

      {/* 错误分布图 */}
      {showErrorBreakdown && errorTypeDistribution.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-lg font-medium text-white mb-4">错误类型分布</h4>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderErrorBreakdownChart()}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedStressTestCharts;
