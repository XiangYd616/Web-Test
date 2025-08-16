
import {BarChart3, Download, Settings, TrendingUp} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {TestPhase, TestState} from '../../services/testing/testStateManager';

import '../../styles/components.css';

// 图表配置接口
export interface ChartConfig {
  showResponseTime: boolean;
  showThroughput: boolean;
  showActiveUsers: boolean;
  showErrorRate: boolean;
  timeWindow: number; // 显示的时间窗口（秒）
  refreshInterval: number; // 刷新间隔（毫秒）
  enableAnimation: boolean;
  showGrid: boolean;
  showLegend: boolean;
}

// 组件属性接口
export interface StressTestChartProps {
  testState: TestState;
  testPhase: TestPhase;
  dataPoints: TestDataPoint[];
  metrics: RealTimeMetrics | null;
  height?: number;
  config?: Partial<ChartConfig>;
  onExportData?: () => void;
  onConfigChange?: (config: ChartConfig) => void;
}

// 默认配置
const defaultConfig: ChartConfig = {
  showResponseTime: true,
  showThroughput: true,
  showActiveUsers: true,
  showErrorRate: true,
  timeWindow: 300, // 5分钟
  refreshInterval: 1000, // 1秒
  enableAnimation: true,
  showGrid: true,
  showLegend: true
};

export const StressTestChart: React.FC<StressTestChartProps> = ({
  testState,
  testPhase,
  dataPoints,
  metrics,
  height = 400,
  config: configProp,
  onExportData,
  onConfigChange
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    ...defaultConfig,
    ...configProp
  });

  // 处理配置变更
  const handleConfigChange = (newConfig: Partial<ChartConfig>) => {
    const updatedConfig = { ...chartConfig, ...newConfig };
    setChartConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  // 计算图表数据
  const chartData = useMemo(() => {
    if (!dataPoints.length) return {
      points: [] as any[],
      scales: {
        responseTime: { min: 0, max: 100 },
        throughput: { min: 0, max: 10 },
        activeUsers: { min: 0, max: 10 },
        errorRate: { min: 0, max: 100 }
      },
      timeLabels: [] as string[],
      yAxisLabels: {
        left: [] as string[],
        right: [] as string[]
      }
    };

    // 获取时间窗口内的数据
    const now = Date.now();
    const windowStart = now - (chartConfig.timeWindow * 1000);
    const filteredData = dataPoints.filter(point => point.timestamp >= windowStart);

    if (!filteredData.length) return {
      points: [],
      scales: {
        responseTime: { min: 0, max: 100 },
        throughput: { min: 0, max: 10 },
        activeUsers: { min: 0, max: 10 },
        errorRate: { min: 0, max: 100 }
      },
      timeLabels: [],
      yAxisLabels: { left: [], right: [] }
    };

    // 计算动态比例尺
    const responseTimeValues = filteredData.map(d => d.responseTime);
    const throughputValues = filteredData.map(d => d.throughput);
    const activeUsersValues = filteredData.map(d => d.activeUsers);
    const errorRateValues = filteredData.map(d => d.errorRate);

    const scales = {
      responseTime: {
        min: Math.min(...responseTimeValues, 0),
        max: Math.max(...responseTimeValues, 100)
      },
      throughput: {
        min: Math.min(...throughputValues, 0),
        max: Math.max(...throughputValues, 10)
      },
      activeUsers: {
        min: Math.min(...activeUsersValues, 0),
        max: Math.max(...activeUsersValues, 10)
      },
      errorRate: {
        min: 0, // 错误率始终从0开始
        max: Math.max(...errorRateValues, 100)
      }
    };

    // 生成Y轴标签
    const generateYAxisLabels = (min: number, max: number, steps: number = 5) => {
      const labels = [];
      for (let i = 0; i <= steps; i++) {
        const value = min + (max - min) * (i / steps);
        labels.push(value.toFixed(value < 10 ? 1 : 0));
      }
      return labels.reverse(); // 从上到下
    };

    const yAxisLabels = {
      left: generateYAxisLabels(scales.responseTime.min, scales.responseTime.max),
      right: generateYAxisLabels(scales.throughput.min, scales.throughput.max)
    };

    // 生成时间标签（减少标签数量避免重叠）
    const timeLabels = [];
    const labelStep = Math.max(1, Math.floor(filteredData.length / 8)); // 最多8个时间标签
    for (let i = 0; i < filteredData.length; i += labelStep) {
      timeLabels.push(
        new Date(filteredData[i].timestamp).toLocaleTimeString('zh-CN', {
          hour12: false,
          minute: '2-digit',
          second: '2-digit'
        })
      );
    }

    // 转换数据点，使用独立的归一化
    const points = filteredData.map((point, index) => {
      const normalizeValue = (value: number, min: number, max: number) => {
        if (max === min) return 0.5; // 避免除零
        return (value - min) / (max - min);
      };

      return {
        x: index,
        timestamp: point.timestamp,
        responseTime: point.responseTime,
        throughput: point.throughput,
        activeUsers: point.activeUsers,
        errorRate: point.errorRate,
        success: point.success,
        phase: point.phase,
        // 使用独立的归一化比例（0-1）
        responseTimeRatio: normalizeValue(point.responseTime, scales.responseTime.min, scales.responseTime.max),
        throughputRatio: normalizeValue(point.throughput, scales.throughput.min, scales.throughput.max),
        activeUsersRatio: normalizeValue(point.activeUsers, scales.activeUsers.min, scales.activeUsers.max),
        errorRateRatio: normalizeValue(point.errorRate, scales.errorRate.min, scales.errorRate.max)
      };
    });

    return {
      points,
      scales,
      timeLabels,
      yAxisLabels
    };
  }, [dataPoints, chartConfig.timeWindow]);

  // 获取状态颜色
  const getStateColor = (state: TestState) => {
    switch (state) {
      case TestState.IDLE: return 'text-gray-400';
      case TestState.STARTING: return 'text-yellow-400';
      case TestState.RUNNING: return 'text-green-400';
      case TestState.COMPLETED: return 'text-blue-400';
      case TestState.FAILED: return 'text-red-400';
      case TestState.CANCELLED: return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  // 获取阶段描述
  const getPhaseDescription = (phase: TestPhase) => {
    switch (phase) {
      case TestPhase.INITIALIZATION: return '初始化';
      case TestPhase.RAMP_UP: return '加压阶段';
      case TestPhase.STEADY_STATE: return '稳定阶段';
      case TestPhase.RAMP_DOWN: return '减压阶段';
      case TestPhase.CLEANUP: return '清理阶段';
      default: return '未知阶段';
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      {/* 图表头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">
              {testState === TestState.RUNNING ? '实时性能监控' :
                testState === TestState.COMPLETED ? '测试结果分析' : '压力测试图表'}
            </h3>
            <div className="flex items-center space-x-2 text-sm">
              <span className={`font-medium ${getStateColor(testState)}`}>
                {testState.toUpperCase()}
              </span>
              {testState === TestState.RUNNING && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-300">{getPhaseDescription(testPhase)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 实时状态指示器 */}
          {testState === TestState.RUNNING && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-300 font-medium">实时更新</span>
            </div>
          )}

          {/* 配置按钮 */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            title="图表设置"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 导出按钮 */}
          {onExportData && (
            <button
              type="button"
              onClick={onExportData}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
              title="导出数据"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 配置面板 */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
          <h4 className="text-sm font-medium text-white mb-3">图表配置</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={chartConfig.showResponseTime}
                onChange={(e) => handleConfigChange({ showResponseTime: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">响应时间</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={chartConfig.showThroughput}
                onChange={(e) => handleConfigChange({ showThroughput: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-300">吞吐量</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={chartConfig.showActiveUsers}
                onChange={(e) => handleConfigChange({ showActiveUsers: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">活跃用户</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={chartConfig.showErrorRate}
                onChange={(e) => handleConfigChange({ showErrorRate: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-300">错误率</span>
            </label>
          </div>
          <div className="mt-3 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="timeWindow" className="text-sm text-gray-300">时间窗口:</label>
              <select
                id="timeWindow"
                value={chartConfig.timeWindow}
                onChange={(e) => handleConfigChange({ timeWindow: Number(e.target.value) })}
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                title="选择图表显示的时间窗口"
              >
                <option value={60}>1分钟</option>
                <option value={300}>5分钟</option>
                <option value={600}>10分钟</option>
                <option value={1800}>30分钟</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 关键指标卡片 */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-3 border-l-4 border-blue-500">
            <div className="text-xs text-gray-400 mb-1">平均响应时间</div>
            <div className="text-lg font-semibold text-blue-400">
              {metrics.averageResponseTime.toFixed(0)}ms
            </div>
            <div className="text-xs text-gray-500 mt-1">
              范围: {chartData.scales.responseTime.min.toFixed(0)}-{chartData.scales.responseTime.max.toFixed(0)}ms
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 border-l-4 border-green-500">
            <div className="text-xs text-gray-400 mb-1">当前TPS</div>
            <div className="text-lg font-semibold text-green-400">
              {metrics.currentTPS.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              峰值: {metrics.peakTPS?.toFixed(1) || metrics.currentTPS.toFixed(1)}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 border-l-4 border-purple-500">
            <div className="text-xs text-gray-400 mb-1">活跃用户</div>
            <div className="text-lg font-semibold text-purple-400">
              {metrics.activeUsers}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              最大: {chartData.scales.activeUsers.max}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 border-l-4 border-red-500">
            <div className="text-xs text-gray-400 mb-1">错误率</div>
            <div className="text-lg font-semibold text-red-400">
              {metrics.errorRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.failedRequests}/{metrics.totalRequests} 失败
            </div>
          </div>
        </div>
      )}

      {/* 图表区域 */}
      <div className={`relative ${height <= 300 ? 'chart-container-sm' :
        height <= 400 ? 'chart-container-md' :
          height <= 500 ? 'chart-container-lg' : 'chart-container-xl'
        }`}>
        {chartData.points.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-300 text-lg">
                {testState === TestState.IDLE ? '等待测试开始' : '暂无数据'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {testState === TestState.IDLE ? '配置测试参数并开始测试以查看实时图表' : '数据加载中...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full bg-gray-900/50 rounded-lg relative">
            {/* Y轴标签 - 左侧（响应时间） */}
            <div className="absolute left-2 top-4 bottom-4 flex flex-col justify-between text-xs text-gray-400">
              <div className="text-blue-400 font-medium mb-1">响应时间(ms)</div>
              {chartData.yAxisLabels.left.map((label, index) => (
                <div key={index} className="text-right">{label}</div>
              ))}
            </div>

            {/* Y轴标签 - 右侧（吞吐量/用户） */}
            <div className="absolute right-2 top-4 bottom-4 flex flex-col justify-between text-xs text-gray-400">
              <div className="text-green-400 font-medium mb-1">TPS/用户</div>
              {chartData.yAxisLabels.right.map((label, index) => (
                <div key={index} className="text-left">{label}</div>
              ))}
            </div>

            {/* 主图表区域 */}
            <div className="mx-12 h-full pt-8 pb-8">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                {/* 网格线 */}
                {chartConfig.showGrid && (
                  <g className="opacity-20">
                    {[0, 25, 50, 75, 100].map(y => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke="#6B7280"
                        strokeWidth="0.2"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                    {chartData.timeLabels.map((_, index) => {
                      const x = (index / Math.max(1, chartData.timeLabels.length - 1)) * 100;
                      return (
                        <line
                          key={index}
                          x1={x}
                          y1="0"
                          x2={x}
                          y2="100"
                          stroke="#6B7280"
                          strokeWidth="0.1"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}
                  </g>
                )}

                {/* 响应时间曲线 */}
                {chartConfig.showResponseTime && chartData.points.length > 1 && (
                  <g>
                    <polyline
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="0.8"
                      vectorEffect="non-scaling-stroke"
                      points={chartData.points.map((point, index) =>
                        `${(index / (chartData.points.length - 1)) * 100},${(1 - point.responseTimeRatio) * 100}`
                      ).join(' ')}
                      className={chartConfig.enableAnimation ? 'transition-all duration-300' : ''}
                    />
                    {/* 数据点 */}
                    {chartData.points.map((point, index) => (
                      <circle
                        key={`rt-${index}`}
                        cx={(index / (chartData.points.length - 1)) * 100}
                        cy={(1 - point.responseTimeRatio) * 100}
                        r="0.8"
                        fill="#3B82F6"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </g>
                )}

                {/* 吞吐量曲线 */}
                {chartConfig.showThroughput && chartData.points.length > 1 && (
                  <g>
                    <polyline
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="0.8"
                      vectorEffect="non-scaling-stroke"
                      points={chartData.points.map((point, index) =>
                        `${(index / (chartData.points.length - 1)) * 100},${(1 - point.throughputRatio) * 100}`
                      ).join(' ')}
                      className={chartConfig.enableAnimation ? 'transition-all duration-300' : ''}
                    />
                    {/* 数据点 */}
                    {chartData.points.map((point, index) => (
                      <circle
                        key={`tp-${index}`}
                        cx={(index / (chartData.points.length - 1)) * 100}
                        cy={(1 - point.throughputRatio) * 100}
                        r="0.8"
                        fill="#10B981"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </g>
                )}

                {/* 活跃用户曲线 */}
                {chartConfig.showActiveUsers && chartData.points.length > 1 && (
                  <g>
                    <polyline
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="0.8"
                      vectorEffect="non-scaling-stroke"
                      points={chartData.points.map((point, index) =>
                        `${(index / (chartData.points.length - 1)) * 100},${(1 - point.activeUsersRatio) * 100}`
                      ).join(' ')}
                      className={chartConfig.enableAnimation ? 'transition-all duration-300' : ''}
                    />
                    {/* 数据点 */}
                    {chartData.points.map((point, index) => (
                      <circle
                        key={`au-${index}`}
                        cx={(index / (chartData.points.length - 1)) * 100}
                        cy={(1 - point.activeUsersRatio) * 100}
                        r="0.8"
                        fill="#8B5CF6"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </g>
                )}

                {/* 错误率曲线 */}
                {chartConfig.showErrorRate && chartData.points.length > 1 && (
                  <g>
                    <polyline
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="0.8"
                      vectorEffect="non-scaling-stroke"
                      points={chartData.points.map((point, index) =>
                        `${(index / (chartData.points.length - 1)) * 100},${(1 - point.errorRateRatio) * 100}`
                      ).join(' ')}
                      className={chartConfig.enableAnimation ? 'transition-all duration-300' : ''}
                    />
                    {/* 数据点 */}
                    {chartData.points.map((point, index) => (
                      <circle
                        key={`er-${index}`}
                        cx={(index / (chartData.points.length - 1)) * 100}
                        cy={(1 - point.errorRateRatio) * 100}
                        r="0.8"
                        fill="#EF4444"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </g>
                )}
              </svg>
            </div>

            {/* X轴时间标签 */}
            <div className="absolute bottom-2 left-12 right-12 flex justify-between text-xs text-gray-400">
              {chartData.timeLabels.map((label, index) => (
                <div key={index} className="text-center">{label}</div>
              ))}
            </div>

            {/* 图例 */}
            {chartConfig.showLegend && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center space-x-6 text-xs bg-gray-800/80 px-4 py-2 rounded-lg">
                {chartConfig.showResponseTime && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-0.5 bg-blue-500"></div>
                    <span className="text-blue-300">响应时间</span>
                  </div>
                )}
                {chartConfig.showThroughput && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-0.5 bg-green-500"></div>
                    <span className="text-green-300">吞吐量</span>
                  </div>
                )}
                {chartConfig.showActiveUsers && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-0.5 bg-purple-500"></div>
                    <span className="text-purple-300">活跃用户</span>
                  </div>
                )}
                {chartConfig.showErrorRate && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-0.5 bg-red-500"></div>
                    <span className="text-red-300">错误率</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
