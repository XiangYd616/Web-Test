/**
 * 专业级实时压力测试图表组件
 * 解决耦合问题，提供真实数据展示，保持JMeter风格的专业外观
 */

import { BarChart3, Settings, TrendingUp, Users, Zap } from 'lucide-react';
import React, { useMemo, useState } from 'react';

// 数据点接口
interface StressTestDataPoint {
  timestamp: number;
  responseTime: number;
  activeUsers: number;
  throughput: number;
  errorRate: number;
  status: number;
  success: boolean;
  phase?: 'rampup' | 'steady' | 'rampdown';
}

// 图表配置接口
interface ChartConfig {
  showResponseTime: boolean;
  showActiveUsers: boolean;
  showErrorRate: boolean;
  showThroughput: boolean;
  timeWindow: number; // 显示的时间窗口（秒）
  updateInterval: number; // 更新间隔（毫秒）
}

// 组件Props
interface RealTimeStressChartProps {
  data: StressTestDataPoint[];
  isRunning: boolean;
  testConfig?: {
    users: number;
    duration: number;
    testType: string;
  };
  height?: number;
  className?: string;
  onConfigChange?: (config: ChartConfig) => void;
}

// 默认配置
const defaultConfig: ChartConfig = {
  showResponseTime: true,
  showActiveUsers: true,
  showErrorRate: true,
  showThroughput: false,
  timeWindow: 60,
  updateInterval: 1000
};

export const RealTimeStressChart: React.FC<RealTimeStressChartProps> = ({
  data,
  isRunning,
  testConfig,
  height = 400,
  className = '',
  onConfigChange
}) => {
  const [config, setConfig] = useState<ChartConfig>(defaultConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: StressTestDataPoint } | null>(null);

  // 处理配置变更
  const handleConfigChange = (newConfig: Partial<ChartConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  // 计算图表数据
  const chartData = useMemo(() => {
    if (!data.length) return {
      points: [] as any[],
      scales: {
        x: [] as any[],
        y: [] as any[]
      }
    };

    // 获取时间窗口内的数据
    const now = Date.now();
    const windowStart = now - (config.timeWindow * 1000);
    const filteredData = data.filter(point => point.timestamp >= windowStart);

    // 计算比例尺，确保不为0
    const maxUsers = Math.max(testConfig?.users || 10, ...filteredData.map(d => d.activeUsers || 0), 1);
    const maxResponseTime = Math.max(...filteredData.map(d => d.responseTime || 0), 100); // 至少100ms
    const maxThroughput = Math.max(...filteredData.map(d => d.throughput || 0), 1); // 至少1 TPS

    // 生成时间轴标签
    const timeLabels = [];
    for (let i = 0; i <= config.timeWindow; i += 10) {
      timeLabels.push(`${i}s`);
    }

    return {
      points: filteredData,
      scales: {
        x: timeLabels,
        y: {
          users: maxUsers,
          responseTime: maxResponseTime,
          throughput: maxThroughput
        }
      }
    };
  }, [data, config.timeWindow, testConfig]);

  // 生成SVG路径
  const generatePath = (dataKey: keyof StressTestDataPoint, scale: number) => {
    if (!chartData.points.length) return '';

    const chartWidth = 720; // SVG宽度减去边距
    const chartHeight = 280; // SVG高度减去边距

    // 使用数据的实际时间范围
    const timestamps = chartData.points.map(p => p.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeSpan = Math.max(maxTime - minTime, 1000); // 至少1秒的时间跨度

    // 过滤并映射数据点
    const validPoints = chartData.points
      .map((point, index) => {
        // 计算x坐标 - 基于数据的实际时间范围
        const xRatio = timeSpan > 0 ? (point.timestamp - minTime) / timeSpan : 0;
        const x = 60 + (xRatio * chartWidth);

        // 确保y坐标有效，防止NaN和无限值
        const value = point[dataKey] as number || 0;
        const yRatio = scale > 0 ? Math.max(0, Math.min(1, value / scale)) : 0;
        const y = chartHeight - 40 - (yRatio * (chartHeight - 80));

        return { x, y, index };
      })
      .filter(point => !isNaN(point.x) && !isNaN(point.y)); // 过滤掉无效坐标

    if (validPoints.length === 0) return '';

    // 生成路径字符串
    const pathData = validPoints.map(({ x, y, index }) =>
      `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
    );

    return pathData.join(' ');
  };

  // 当前指标计算
  const currentMetrics = useMemo(() => {
    if (!chartData.points.length) return null;

    const latest = chartData.points[chartData.points.length - 1];
    const recent = chartData.points.slice(-10); // 最近10个数据点

    // 安全的数值计算，避免NaN
    const avgResponseTime = recent.length > 0
      ? recent.reduce((sum, p) => sum + (p.responseTime || 0), 0) / recent.length
      : 0;

    const currentThroughput = recent.length > 0
      ? recent.reduce((sum, p) => sum + (p.throughput || 0), 0) / recent.length
      : 0;

    const errorRate = recent.length > 0
      ? (recent.filter(p => !p.success).length / recent.length) * 100
      : 0;

    return {
      activeUsers: latest.activeUsers || 0,
      avgResponseTime: isNaN(avgResponseTime) ? 0 : avgResponseTime,
      currentThroughput: isNaN(currentThroughput) ? 0 : currentThroughput,
      errorRate: isNaN(errorRate) ? 0 : errorRate,
      phase: latest.phase || 'steady'
    };
  }, [chartData.points]);

  return (
    <div className={`bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 ${className}`}>
      {/* 图表标题和控制 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <TrendingUp className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Active Threads Over Time</h3>
          {isRunning && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-300 font-medium">实时监控中</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            title="图表设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
          <h4 className="text-sm font-medium text-gray-300 mb-3">图表配置</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'showActiveUsers', label: '活跃用户', icon: Users, color: 'text-green-400' },
              { key: 'showResponseTime', label: '响应时间', icon: Zap, color: 'text-blue-400' },
              { key: 'showErrorRate', label: '错误率', icon: BarChart3, color: 'text-red-400' },
              { key: 'showThroughput', label: '吞吐量', icon: TrendingUp, color: 'text-purple-400' }
            ].map(({ key, label, icon: Icon, color }) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[key as keyof ChartConfig] as boolean}
                  onChange={(e) => handleConfigChange({ [key]: e.target.checked })}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                />
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-sm text-gray-300">{label}</span>
              </label>
            ))}
          </div>

          <div className="mt-3 flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">时间窗口:</span>
              <select
                value={config.timeWindow}
                onChange={(e) => handleConfigChange({ timeWindow: parseInt(e.target.value) })}
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value={30}>30秒</option>
                <option value={60}>60秒</option>
                <option value={120}>2分钟</option>
                <option value={300}>5分钟</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {/* 当前指标显示 */}
      {currentMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">活跃用户</span>
            </div>
            <div className="text-lg font-bold text-green-400">{currentMetrics.activeUsers}</div>
          </div>

          <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">响应时间</span>
            </div>
            <div className="text-lg font-bold text-blue-400">{currentMetrics.avgResponseTime.toFixed(0)}ms</div>
          </div>

          <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-500/30">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">吞吐量</span>
            </div>
            <div className="text-lg font-bold text-purple-400">{currentMetrics.currentThroughput.toFixed(1)} TPS</div>
          </div>

          <div className="bg-red-500/20 rounded-lg p-3 border border-red-500/30">
            <div className="flex items-center space-x-2 mb-1">
              <BarChart3 className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">错误率</span>
            </div>
            <div className="text-lg font-bold text-red-400">{currentMetrics.errorRate.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* 主图表区域 */}
      <div className="bg-white rounded-lg p-4 relative" style={{ height: `${height}px` }}>
        {chartData.points.length > 0 ? (
          <svg className="w-full h-full" viewBox="0 0 800 320">
            {/* 网格线 */}
            <defs>
              <pattern id="grid" width="40" height="32" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 32" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="320" fill="url(#grid)" />

            {/* Y轴标签 */}
            <g className="text-sm" fill="#6b7280">
              {[0, 25, 50, 75, 100].map((percent, index) => (
                <text key={index} x="8" y={280 - (percent * 2.4)} fontSize="12">
                  {testConfig ? Math.floor((testConfig.users * percent) / 100) : percent}
                </text>
              ))}
            </g>

            {/* X轴标签 */}
            <g className="text-sm" fill="#6b7280">
              {chartData.scales.x.map((label, index) => (
                <text key={index} x={60 + (index * 72)} y="310" fontSize="12">
                  {label}
                </text>
              ))}
            </g>

            {/* 图例 */}
            <g className="text-sm">
              {config.showActiveUsers && (
                <g>
                  <line x1="620" y1="20" x2="640" y2="20" stroke="#22c55e" strokeWidth="3" />
                  <text x="645" y="25" fontSize="12" fill="#22c55e">活跃用户</text>
                </g>
              )}
              {config.showResponseTime && (
                <g>
                  <line x1="620" y1="40" x2="640" y2="40" stroke="#3b82f6" strokeWidth="3" />
                  <text x="645" y="45" fontSize="12" fill="#3b82f6">响应时间</text>
                </g>
              )}
              {config.showErrorRate && (
                <g>
                  <line x1="620" y1="60" x2="640" y2="60" stroke="#ef4444" strokeWidth="3" />
                  <text x="645" y="65" fontSize="12" fill="#ef4444">错误率</text>
                </g>
              )}
              {config.showThroughput && (
                <g>
                  <line x1="620" y1="80" x2="640" y2="80" stroke="#8b5cf6" strokeWidth="3" />
                  <text x="645" y="85" fontSize="12" fill="#8b5cf6">吞吐量</text>
                </g>
              )}
            </g>

            {/* 数据曲线 */}
            {config.showActiveUsers && (
              <path
                d={generatePath('activeUsers', (chartData.scales.y as any)?.users || [])}
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
                className="transition-all duration-300"
              />
            )}

            {config.showResponseTime && (
              <path
                d={generatePath('responseTime', (chartData.scales.y as any)?.responseTime || [])}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                className="transition-all duration-300"
              />
            )}

            {config.showErrorRate && (
              <path
                d={generatePath('errorRate', 100)}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                className="transition-all duration-300"
              />
            )}

            {config.showThroughput && (
              <path
                d={generatePath('throughput', (chartData.scales.y as any)?.throughput || [])}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="3"
                className="transition-all duration-300"
              />
            )}
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500 font-medium text-lg">专业级压力测试图表</div>
              <div className="text-gray-400 text-base mt-2">
                {isRunning ? '等待测试数据...' : '开始测试后将显示实时数据'}
              </div>
            </div>
          </div>
        )}

        {/* 悬停提示 */}
        {hoveredPoint && (
          <div
            className="absolute bg-gray-800 text-white p-2 rounded shadow-lg pointer-events-none z-10"
            style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
          >
            <div className="text-xs">
              <div>时间: {new Date(hoveredPoint.data.timestamp).toLocaleTimeString()}</div>
              <div>用户: {hoveredPoint.data.activeUsers}</div>
              <div>响应: {hoveredPoint.data.responseTime}ms</div>
              <div>错误率: {hoveredPoint.data.errorRate.toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {config.showActiveUsers && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span className="text-green-400">活跃线程</span>
          </div>
        )}
        {config.showResponseTime && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span className="text-blue-400">响应时间</span>
          </div>
        )}
        {config.showErrorRate && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span className="text-red-400">错误率</span>
          </div>
        )}
        {config.showThroughput && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-purple-500"></div>
            <span className="text-purple-400">吞吐量</span>
          </div>
        )}
      </div>


    </div>
  );
};

export default RealTimeStressChart;
