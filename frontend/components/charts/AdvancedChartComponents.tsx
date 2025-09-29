/**
 * 高级数据可视化组件库
 * 提供实时数据更新、多维度展示、交互式图表等功能
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, ReferenceLine, ReferenceArea, Brush, FunnelChart, Funnel, LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== 类型定义 ====================

interface ChartDataPoint {
  [key: string]: any;
  timestamp?: number;
  value?: number;
  label?: string;
}

interface ChartConfig {
  theme?: 'light' | 'dark';
  animated?: boolean;
  realtime?: boolean;
  refreshInterval?: number;
  maxDataPoints?: number;
  colors?: string[];
}

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  coordinate?: { x: number; y: number };
}

// ==================== 配色方案 ====================

const chartColors = {
  primary: ['#3b82f6', '#8b5cf6', '#06d6a0', '#ffd23f', '#f72585', '#4cc9f0'],
  gradient: [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  ],
  dark: ['#1e293b', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'],
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

// ==================== 自定义工具提示组件 ====================

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3"
      >
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {entry.name}: <span className="font-semibold">{entry.value}</span>
              {entry.unit && <span className="text-xs ml-1">{entry.unit}</span>}
            </span>
          </div>
        ))}
      </motion.div>
    );
  }
  return null;
};

// ==================== 实时折线图组件 ====================

interface RealTimeLineChartProps {
  data: ChartDataPoint[];
  config?: ChartConfig;
  title?: string;
  height?: number;
  onDataUpdate?: (newData: ChartDataPoint[]) => void;
}

export const RealTimeLineChart: React.FC<RealTimeLineChartProps> = ({
  data,
  config = {},
  title,
  height = 300,
  onDataUpdate,
}) => {
  const [chartData, setChartData] = useState(data);
  const intervalRef = useRef<NodeJS.Timeout>();

  const {
    animated = true,
    realtime = false,
    refreshInterval = 3000,
    maxDataPoints = 50,
    colors = chartColors.primary,
  } = config;

  // 实时数据更新
  useEffect(() => {
    if (realtime) {
      intervalRef.current = setInterval(() => {
        const newPoint: ChartDataPoint = {
          timestamp: Date.now(),
          value: Math.random() * 100,
          label: new Date().toLocaleTimeString(),
        };

        setChartData(prev => {
          const updated = [...prev, newPoint];
          if (updated.length > maxDataPoints) {
            updated.shift();
          }
          onDataUpdate?.(updated);
          return updated;
        });
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [realtime, refreshInterval, maxDataPoints, onDataUpdate]);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
          {realtime && (
            <span className="ml-2 inline-flex items-center">
              <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full mr-1" />
              <span className="text-sm text-green-600 dark:text-green-400">实时</span>
            </span>
          )}
        </h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="label" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors[0]}
            strokeWidth={2}
            dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: colors[0], strokeWidth: 2 }}
            animationDuration={animated ? 1000 : 0}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ==================== 多维度数据对比图 ====================

interface MultiDimensionChartProps {
  data: ChartDataPoint[];
  dimensions: string[];
  title?: string;
  type?: 'bar' | 'line' | 'area';
  height?: number;
  config?: ChartConfig;
}

export const MultiDimensionChart: React.FC<MultiDimensionChartProps> = ({
  data,
  dimensions,
  title,
  type = 'bar',
  height = 300,
  config = {},
}) => {
  const { colors = chartColors.primary, animated = true } = config;

  const ChartComponent = useMemo(() => {
    switch (type) {
      case 'line': return LineChart;
      case 'area': return AreaChart;
      default: return BarChart;
    }
  }, [type]);

  const renderElements = () => {
    return dimensions.map((dimension, index) => {
      const color = colors[index % colors.length];
      
      if (type === 'line') {
        return (
          <Line
            key={dimension}
            type="monotone"
            dataKey={dimension}
            stroke={color}
            strokeWidth={2}
            animationDuration={animated ? 1000 : 0}
          />
        );
      } else if (type === 'area') {
        return (
          <Area
            key={dimension}
            type="monotone"
            dataKey={dimension}
            stackId="1"
            stroke={color}
            fill={color}
            fillOpacity={0.6}
            animationDuration={animated ? 1000 : 0}
          />
        );
      } else {
        return (
          <Bar
            key={dimension}
            dataKey={dimension}
            fill={color}
            animationDuration={animated ? 1000 : 0}
          />
        );
      }
    });
  };

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {renderElements()}
        </ChartComponent>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ==================== 交互式仪表板图表 ====================

interface InteractiveDashboardProps {
  data: ChartDataPoint[];
  title?: string;
  config?: ChartConfig;
  height?: number;
}

export const InteractiveDashboard: React.FC<InteractiveDashboardProps> = ({
  data,
  title,
  config = {},
  height = 400,
}) => {
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null);
  const [brushData, setBrushData] = useState(data);
  const { colors = chartColors.primary, animated = true } = config;

  const handleBrushChange = useCallback((brushArea: any) => {
    if (brushArea) {
      const { startIndex, endIndex } = brushArea;
      setSelectedRange([startIndex, endIndex]);
      setBrushData(data.slice(startIndex, endIndex + 1));
    } else {
      setSelectedRange(null);
      setBrushData(data);
    }
  }, [data]);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {selectedRange && (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              选择范围: {selectedRange[0]} - {selectedRange[1]}
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Area
            type="monotone"
            dataKey="value"
            fill={colors[0]}
            fillOpacity={0.3}
            stroke={colors[0]}
            strokeWidth={2}
          />
          
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors[1]}
            strokeWidth={3}
            dot={false}
          />

          <Brush
            dataKey="label"
            height={30}
            stroke={colors[0]}
            onChange={handleBrushChange}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ==================== 性能指标雷达图 ====================

interface PerformanceRadarProps {
  data: Array<{
    subject: string;
    current: number;
    target: number;
    fullMark: number;
  }>;
  title?: string;
  height?: number;
  config?: ChartConfig;
}

export const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  data,
  title,
  height = 300,
  config = {},
}) => {
  const { colors = chartColors.primary, animated = true } = config;

  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.95 } : {}}
      animate={animated ? { opacity: 1, scale: 1 } : {}}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
          {title}
        </h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="subject" 
            className="text-xs fill-gray-600 dark:fill-gray-300"
          />
          <PolarRadiusAxis 
            className="text-xs fill-gray-500 dark:fill-gray-400"
            tickCount={5}
          />
          <Radar
            name="当前值"
            dataKey="current"
            stroke={colors[0]}
            fill={colors[0]}
            fillOpacity={0.3}
            strokeWidth={2}
            animationDuration={animated ? 1500 : 0}
          />
          <Radar
            name="目标值"
            dataKey="target"
            stroke={colors[1]}
            fill={colors[1]}
            fillOpacity={0.1}
            strokeWidth={2}
            strokeDasharray="5 5"
            animationDuration={animated ? 1500 : 0}
          />
          <Legend />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ==================== 数据流向图 ====================

interface DataFlowNode {
  id: string;
  label: string;
  value: number;
  x: number;
  y: number;
  color?: string;
}

interface DataFlowProps {
  nodes: DataFlowNode[];
  title?: string;
  height?: number;
  config?: ChartConfig;
}

export const DataFlowChart: React.FC<DataFlowProps> = ({
  nodes,
  title,
  height = 300,
  config = {},
}) => {
  const { colors = chartColors.primary, animated = true } = config;

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" dataKey="x" hide />
          <YAxis type="number" dataKey="y" hide />
          <Tooltip content={<CustomTooltip />} />
          <Scatter 
            data={nodes} 
            fill={colors[0]}
            animationDuration={animated ? 1000 : 0}
          >
            {nodes.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || colors[index % colors.length]} 
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ==================== 漏斗图组件 ====================

interface FunnelData {
  value: number;
  name: string;
  fill?: string;
}

interface ConversionFunnelProps {
  data: FunnelData[];
  title?: string;
  height?: number;
  config?: ChartConfig;
}

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  data,
  title,
  height = 300,
  config = {},
}) => {
  const { colors = chartColors.primary, animated = true } = config;

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
          {title}
        </h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <FunnelChart>
          <Tooltip content={<CustomTooltip />} />
          <Funnel
            dataKey="value"
            data={data}
            isAnimationActive={animated}
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.fill || colors[index % colors.length]} 
              />
            ))}
            <LabelList position="center" className="fill-white text-sm font-medium" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ==================== 热力图组件 ====================

interface HeatmapData {
  x: string;
  y: string;
  value: number;
}

interface HeatmapProps {
  data: HeatmapData[];
  title?: string;
  width?: number;
  height?: number;
  config?: ChartConfig;
}

export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  title,
  width = 400,
  height = 300,
  config = {},
}) => {
  const { animated = true } = config;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制热力图
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));

    data.forEach(point => {
      const intensity = (point.value - minValue) / (maxValue - minValue);
      const alpha = Math.max(0.1, intensity);
      
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.fillRect(
        parseInt(point.x) * 20, 
        parseInt(point.y) * 20, 
        20, 
        20
      );
    });
  }, [data, width, height]);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-200 dark:border-gray-600 rounded"
        />
      </div>
    </motion.div>
  );
};

// ==================== 综合图表面板 ====================

interface ChartDashboardProps {
  charts: Array<{
    id: string;
    type: 'line' | 'bar' | 'pie' | 'radar' | 'funnel' | 'heatmap';
    data: any[];
    title: string;
    config?: ChartConfig;
  }>;
  layout?: 'grid' | 'masonry';
  columns?: number;
}

export const ChartDashboard: React.FC<ChartDashboardProps> = ({
  charts,
  layout = 'grid',
  columns = 2,
}) => {
  const renderChart = (chart: any) => {
    const commonProps = {
      data: chart.data,
      title: chart.title,
      config: chart.config,
      key: chart.id,
    };

    switch (chart.type) {
      case 'line':
        return <RealTimeLineChart {...commonProps} />;
      case 'bar':
        return <MultiDimensionChart {...commonProps} type="bar" dimensions={Object.keys(chart.data[0] || {})} />;
      case 'radar':
        return <PerformanceRadar {...commonProps} />;
      case 'funnel':
        return <ConversionFunnel {...commonProps} />;
      case 'heatmap':
        return <Heatmap {...commonProps} />;
      default:
        return <RealTimeLineChart {...commonProps} />;
    }
  };

  return (
    <div className={`grid gap-6 ${layout === 'grid' ? `grid-cols-1 md:grid-cols-${columns}` : 'masonry'}`}>
      <AnimatePresence>
        {charts.map((chart, index) => (
          <motion.div
            key={chart.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              transition: { delay: index * 0.1 }
            }}
            exit={{ opacity: 0, y: -20 }}
            layout
          >
            {renderChart(chart)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default {
  RealTimeLineChart,
  MultiDimensionChart,
  InteractiveDashboard,
  PerformanceRadar,
  DataFlowChart,
  ConversionFunnel,
  Heatmap,
  ChartDashboard,
};
