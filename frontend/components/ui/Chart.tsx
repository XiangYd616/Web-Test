import { Activity, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import React from 'react';
import { cn } from '../../utils/cn';

interface ChartContainerProps {
  /** 图表标题 */
  title?: string;
  /** 图表描述 */
  description?: string;
  /** 图表类型 */
  type?: 'line' | 'bar' | 'pie' | 'area';
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 是否显示错误状态 */
  error?: boolean;
  /** 错误信息 */
  errorMessage?: string;
  /** 自定义类名 */
  className?: string;
  /** 子组件 */
  children?: React.ReactNode;
  /** 图表高度 */
  height?: string | number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  type = 'line',
  loading = false,
  error = false,
  errorMessage = '图表加载失败',
  className,
  children,
  height = 300
}) => {
  // 图表容器样式
  const containerClasses = cn(
    "bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4",
    className
  );

  const chartHeight = typeof height === 'number' ? `${height}px` : height;

  // 图表类型图标
  const typeIcons = {
    line: TrendingUp,
    bar: BarChart3,
    pie: PieChart,
    area: Activity
  };

  const Icon = typeIcons[type];
  return (
    <div className={containerClasses}>
      {/* 图表标题 */}
      {(title || description) && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-gray-400" />
            {title && (
              <h3 className="text-sm font-medium text-white">{title}</h3>
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-400">{description}</p>
          )}
        </div>
      )}

      {/* 图表内容区域 */}
      <div
        className="relative"
        style={{ height: chartHeight }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/30 rounded">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">加载中...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/30 rounded">
            <div className="text-center text-gray-400">
              <div className="text-red-400 mb-2">⚠️</div>
              <p className="text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {!loading && !error && children}
      </div>
    </div>
  );
};

interface SimpleChartProps {
  /** 图表数据 */
  data?: Array<{ label: string; value: number; color?: string }>;
  /** 图表类型 */
  type?: 'bar' | 'line' | 'pie';
  /** 图表高度 */
  height?: number;
  /** 自定义类名 */
  className?: string;
  /** 占位符文本 */
  placeholder?: string;
}

export const SimpleChart: React.FC<SimpleChartProps> = ({
  data,
  type = 'bar',
  height = 200,
  className,
  placeholder = '暂无数据'
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-700/30 rounded border border-gray-600/50",
          className
        )}
        style={{ height: `${height}px` }}
      >
        <span className="text-sm text-gray-400">{placeholder}</span>
      </div>
    );
  }

  // 简单的条形图实现
  if (type === 'bar') {
    const maxValue = Math.max(...data.map(d => d.value));
    return (
      <div
        className={cn("p-4 bg-gray-700/30 rounded border border-gray-600/50", className)}
        style={{ height: `${height}px` }}
      >
        <div className="flex items-end justify-between h-full gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "w-full rounded-t transition-all duration-300",
                  item.color || "bg-blue-500"
                )}
                style={{
                  height: `${(item.value / maxValue) * 80}%`,
                  minHeight: "4px"
                }}
              />
              <span className="text-xs text-gray-400 mt-2 truncate">
                {item.label}
              </span>
              <span className="text-xs text-gray-300 font-medium">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 其他图表类型的占位符
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gray-700/30 rounded border border-gray-600/50",
        className
      )}
      style={{ height: `${height}px` }}
    >
      <div className="text-center text-gray-400">
        <div className="mb-2">📊</div>
        <span className="text-sm">{type.toUpperCase()} 图表</span>
      </div>
    </div>
  );
};

interface MetricChartProps {
  /** 指标名称 */
  name: string;
  /** 当前值 */
  value: number;
  /** 单位 */
  unit?: string;
  /** 趋势数据 */
  trend?: number[];
  /** 是否显示趋势 */
  showTrend?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const MetricChart: React.FC<MetricChartProps> = ({
  name,
  value,
  unit = "",
  trend = [],
  showTrend = true,
  className
}) => {
  return (
    <div className={cn('bg-gray-700/30 rounded-lg p-4 border border-gray-600/50', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{name}</span>
        <TrendingUp className="w-4 h-4 text-gray-400" />
      </div>
      <div className="text-2xl font-bold text-white mb-2">
        {value.toLocaleString()}{unit}
      </div>
      {showTrend && trend.length > 0 && (
        <div className="h-8 flex items-end gap-1">
          {trend.slice(-10).map((point, index) => {
            const maxTrend = Math.max(...trend);
            const height = maxTrend > 0 ? (point / maxTrend) * 100 : 0;
            return (
              <div
                key={index}
                className="flex-1 bg-blue-500/50 rounded-sm transition-all duration-300"
                style={{ height: `${Math.max(height, 4)}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
export default ChartContainer;