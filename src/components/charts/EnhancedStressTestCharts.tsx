
import React, { useCallback, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';

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

    if (realTimeData && realTimeData.length > 0) {
      // 使用实时数据（用于实时监控视图）
      sourceData = realTimeData;
      console.log('📊 使用实时数据:', sourceData.length, '个数据点');
    } else if (testResultData && testResultData.length > 0) {
      // 使用测试结果数据（用于测试结果视图）
      sourceData = testResultData;
      console.log('📊 使用测试结果数据:', sourceData.length, '个数据点');
    }

    if (!sourceData || sourceData.length === 0) return [];

    const step = densityControl === 'low' ? 5 : densityControl === 'medium' ? 2 : 1;
    return sourceData.filter((_, index) => index % step === 0);
  }, [realTimeData, testResultData, densityControl]);

  // 响应时间分布数据
  const responseTimeDistribution = useMemo(() => {
    if (!processedData.length) return [];

    const bins = 20;
    const responseTimes = processedData.map(d => d.responseTime).filter(time => typeof time === 'number' && !isNaN(time));

    if (responseTimes.length === 0) return [];

    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);
    const binSize = max === min ? 1 : (max - min) / bins;

    const distribution = Array.from({ length: bins }, (_, i) => ({
      range: `${Math.round(min + i * binSize)}-${Math.round(min + (i + 1) * binSize)}ms`,
      count: 0,
      percentage: 0
    }));

    responseTimes.forEach(time => {
      const binIndex = Math.min(Math.max(0, Math.floor((time - min) / binSize)), bins - 1);
      if (distribution[binIndex]) {
        distribution[binIndex].count++;
      }
    });

    distribution.forEach(bin => {
      bin.percentage = responseTimes.length > 0 ? (bin.count / responseTimes.length) * 100 : 0;
    });

    return distribution;
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

  // 渲染实时监控图表
  const renderRealTimeChart = () => (
    <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis
        dataKey="timestamp"
        stroke="#9CA3AF"
        fontSize={12}
        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
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
        labelFormatter={(value) => new Date(value).toLocaleString()}
      />
      <Legend />

      {enableZoom && (
        <Brush
          dataKey="timestamp"
          height={30}
          stroke="#3B82F6"
          tickFormatter={(value) => new Date(value).toLocaleTimeString()}
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
    <BarChart data={responseTimeDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="range" stroke="#9CA3AF" fontSize={12} />
      <YAxis stroke="#9CA3AF" fontSize={12} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#F9FAFB'
        }}
      />
      <Bar dataKey="count" fill="#3B82F6" name="请求数量" />
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
      <div className="flex flex-wrap items-center justify-end gap-4 p-3 bg-gray-800/30 rounded-lg">
        <div className="flex items-center gap-2">
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
      <div className="bg-gray-800/50 rounded-lg p-4" style={{ height: `${height}px` }}>
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
