/**
 * 优化的实时压力测试图表组件
 * 解决性能问题，支持大数据量显示
 */

import { BarChart3, Settings, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// 数据点接口
interface DataPoint {
  timestamp: number;
  responseTime: number;
  activeUsers: number;
  throughput: number;
  errorRate: number;
  success: boolean;
}

// 图表配置
interface ChartConfig {
  maxDataPoints: number;
  updateInterval: number;
  enableVirtualization: boolean;
  showGrid: boolean;
}

// 组件Props
interface OptimizedRealTimeChartProps {
  data: DataPoint[];
  isRunning: boolean;
  height?: number;
  className?: string;
  onConfigChange?: (config: ChartConfig) => void;
}

// 默认配置
const defaultConfig: ChartConfig = {
  maxDataPoints: 500, // 限制数据点数量
  updateInterval: 1000,
  enableVirtualization: true,
  showGrid: true
};

// 数据采样函数，减少渲染的数据点
const sampleData = (data: DataPoint[], maxPoints: number): DataPoint[] => {
  if (data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  const sampled: DataPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }

  return sampled;
};

export const OptimizedRealTimeChart: React.FC<OptimizedRealTimeChartProps> = ({
  data,
  isRunning,
  height = 400,
  className = '',
  onConfigChange
}) => {
  const [config, setConfig] = useState<ChartConfig>(defaultConfig);
  const [showSettings, setShowSettings] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  // 处理配置变更
  const handleConfigChange = useCallback((newConfig: Partial<ChartConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  }, [config, onConfigChange]);

  // 优化的数据处理
  const processedData = useMemo((): { data: DataPoint[]; stats: { avgResponseTime: number; maxResponseTime: number; currentThroughput: number; currentErrorRate: number; } } | any[] => {
    if (!data || data.length === 0) return [];

    // 数据采样，避免渲染过多点
    const sampledData = sampleData(data, config.maxDataPoints);

    // 计算统计信息
    const stats = {
      avgResponseTime: sampledData.reduce((sum, d) => sum + d.responseTime, 0) / sampledData.length,
      maxResponseTime: Math.max(...sampledData.map(d => d.responseTime)),
      currentThroughput: sampledData[sampledData.length - 1]?.throughput || 0,
      currentErrorRate: sampledData[sampledData.length - 1]?.errorRate || 0
    };

    return { data: sampledData, stats };
  }, [data, config.maxDataPoints]);

  // Canvas绘制函数
  const drawChart = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas || Array.isArray(processedData) || !processedData.data.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { data: chartData } = processedData;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 设置样式
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';

    // 计算缩放比例
    const maxResponseTime = Math.max(...chartData.map(d => d.responseTime));
    const xScale = width / (chartData.length - 1);
    const yScale = (height - 40) / maxResponseTime;

    // 绘制网格（如果启用）
    if (config.showGrid) {
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.3)';
      ctx.lineWidth = 1;

      // 水平网格线
      for (let i = 0; i <= 5; i++) {
        const y = (height - 20) * i / 5 + 20;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 垂直网格线
      for (let i = 0; i <= 10; i++) {
        const x = width * i / 10;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, height - 20);
        ctx.stroke();
      }
    }

    // 绘制响应时间曲线
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    chartData.forEach((point, index) => {
      const x = index * xScale;
      const y = height - 20 - (point.responseTime * yScale);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 绘制填充区域
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineTo(width, height - 20);
    ctx.lineTo(0, height - 20);
    ctx.closePath();
    ctx.fill();

  }, [processedData, config.showGrid]);

  // 动画循环
  const animate = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= config.updateInterval) {
      drawChart();
      lastUpdateRef.current = now;
    }

    if (isRunning) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [drawChart, config.updateInterval, isRunning]);

  // 启动/停止动画
  useEffect(() => {
    if (isRunning) {
      animate();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      drawChart(); // 绘制最终状态
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, animate, drawChart]);

  // 调整Canvas尺寸
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }

      drawChart();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawChart]);

  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">
            {isRunning ? '实时性能监控' : '测试结果'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* 性能指标 */}
          {!Array.isArray(processedData) && processedData.stats && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-blue-400">
                平均响应: {processedData.stats.avgResponseTime.toFixed(1)}ms
              </div>
              <div className="text-green-400">
                吞吐量: {processedData.stats.currentThroughput.toFixed(1)}/s
              </div>
              <div className="text-red-400">
                错误率: {(processedData.stats.currentErrorRate * 100).toFixed(1)}%
              </div>
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">最大数据点</label>
              <input
                type="number"
                value={config.maxDataPoints}
                onChange={(e) => handleConfigChange({ maxDataPoints: parseInt(e.target.value) })}
                className="w-full px-3 py-1 bg-gray-600 text-white rounded text-sm"
                min="100"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">更新间隔(ms)</label>
              <input
                type="number"
                value={config.updateInterval}
                onChange={(e) => handleConfigChange({ updateInterval: parseInt(e.target.value) })}
                className="w-full px-3 py-1 bg-gray-600 text-white rounded text-sm"
                min="100"
                max="5000"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={config.showGrid}
                onChange={(e) => handleConfigChange({ showGrid: e.target.checked })}
                className="rounded"
              />
              显示网格
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={config.enableVirtualization}
                onChange={(e) => handleConfigChange({ enableVirtualization: e.target.checked })}
                className="rounded"
              />
              启用虚拟化
            </label>
          </div>
        </div>
      )}

      {/* 图表区域 */}
      <div className="relative" style={{ height: `${height}px` }}>
        {!Array.isArray(processedData) && processedData.data.length > 0 ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded-lg"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500 font-medium text-lg">优化图表组件</div>
              <div className="text-gray-400 text-base mt-2">
                {isRunning ? '等待测试数据...' : '开始测试后将显示实时数据'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizedRealTimeChart;
