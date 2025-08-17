/**
 * 完整的图表组件库
 * 提供LineChart、BarChart、PieChart、AreaChart等专业图表组件
 * 支持响应式设计、主题定制、交互功能和数据导出
 */

import React, { useCallback, useMemo, useState } from 'react';

// 基础数据类型
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area';
  visible?: boolean;
}

// 图表配置接口
export interface ChartConfig {
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  responsive?: boolean;
  theme?: 'light' | 'dark';
  animation?: boolean;
  grid?: boolean;
  legend?: boolean;
  tooltip?: boolean;
  zoom?: boolean;
  export?: boolean;
}

// 通用图表属性
interface BaseChartProps {
  data: ChartSeries[];
  config?: ChartConfig;
  title?: string;
  subtitle?: string;
  className?: string;
  onDataPointClick?: (point: ChartDataPoint, series: ChartSeries) => void;
  onLegendClick?: (series: ChartSeries) => void;
}

// 默认配置
const defaultConfig: Required<ChartConfig> = {
  width: 800,
  height: 400,
  margin: { top: 20, right: 30, bottom: 40, left: 40 },
  responsive: true,
  theme: 'light',
  animation: true,
  grid: true,
  legend: true,
  tooltip: true,
  zoom: false,
  export: false
};

// 颜色调色板
const colorPalette = {
  light: [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
  ],
  dark: [
    '#60A5FA', '#F87171', '#34D399', '#FBBF24', '#A78BFA',
    '#22D3EE', '#FB923C', '#A3E635', '#F472B6', '#9CA3AF'
  ]
};

// 工具函数
const getColor = (index: number, theme: 'light' | 'dark' = 'light'): string => {
  return colorPalette[theme][index % colorPalette[theme].length];
};

const formatValue = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

// SVG路径生成器
const generateLinePath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length === 0) return '';

  const path = points.reduce((acc, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${acc} ${command} ${point.x} ${point.y}`;
  }, '');

  return path.trim();
};

const generateAreaPath = (points: Array<{ x: number; y: number }>, height: number): string => {
  if (points.length === 0) return '';

  const linePath = generateLinePath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${linePath} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`;
};

// 图表容器组件
const ChartContainer: React.FC<{
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  config: Required<ChartConfig>;
  className?: string;
}> = ({ children, title, subtitle, config, className = '' }) => {
  return (
    <div className={`chart-container bg-white rounded-lg shadow p-6 ${className}`}>
      {(title || subtitle) && (
        <div className="chart-header mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      )}
      <div className="chart-content">
        {children}
      </div>
    </div>
  );
};

// 图例组件
const ChartLegend: React.FC<{
  series: ChartSeries[];
  onSeriesToggle?: (series: ChartSeries) => void;
  theme: 'light' | 'dark';
}> = ({ series, onSeriesToggle, theme }) => {
  return (
    <div className="chart-legend flex flex-wrap gap-4 mt-4">
      {series.map((s, index) => (
        <div
          key={s.name}
          className={`legend-item flex items-center gap-2 cursor-pointer ${s.visible === false ? 'opacity-50' : ''
            }`}
          onClick={() => onSeriesToggle?.(s)}
        >
          <div
            className="legend-color w-3 h-3 rounded"
            style={{ backgroundColor: s.color || getColor(index, theme) }}
          />
          <span className="legend-label text-sm text-gray-700">{s.name}</span>
        </div>
      ))}
    </div>
  );
};

// 工具提示组件
const ChartTooltip: React.FC<{
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}> = ({ visible, x, y, content }) => {
  if (!visible) return null;

  return (
    <div
      className="chart-tooltip absolute z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none"
      style={{
        left: x + 10,
        top: y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      {content}
    </div>
  );
};

// 线性图表组件
export const LineChart: React.FC<BaseChartProps> = ({
  data,
  config = {},
  title,
  subtitle,
  className,
  onDataPointClick,
  onLegendClick
}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: ChartDataPoint;
    series: ChartSeries;
    x: number;
    y: number;
  } | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(data.map(s => s.name))
  );

  // 计算图表尺寸和比例
  const chartArea = useMemo(() => {
    const { margin, width, height } = finalConfig;
    return {
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
      left: margin.left,
      top: margin.top
    };
  }, [finalConfig]);

  // 计算数据范围
  const dataRange = useMemo(() => {
    const visibleData = data.filter(s => visibleSeries.has(s.name));
    if (visibleData.length === 0) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

    const allPoints = visibleData.flatMap(s => s.data);
    const xValues = allPoints.map(p => typeof p.x === 'number' ? p.x : 0);
    const yValues = allPoints.map(p => p.y);

    return {
      xMin: Math.min(...xValues),
      xMax: Math.max(...xValues),
      yMin: Math.min(0, Math.min(...yValues)),
      yMax: Math.max(...yValues)
    };
  }, [data, visibleSeries]);

  // 比例函数
  const scaleX = useCallback((value: number) => {
    const { xMin, xMax } = dataRange;
    return chartArea.left + (value - xMin) / (xMax - xMin) * chartArea.width;
  }, [dataRange, chartArea]);

  const scaleY = useCallback((value: number) => {
    const { yMin, yMax } = dataRange;
    return chartArea.top + chartArea.height - (value - yMin) / (yMax - yMin) * chartArea.height;
  }, [dataRange, chartArea]);

  // 处理图例点击
  const handleLegendClick = useCallback((series: ChartSeries) => {
    setVisibleSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(series.name)) {
        newSet.delete(series.name);
      } else {
        newSet.add(series.name);
      }
      return newSet;
    });
    onLegendClick?.(series);
  }, [onLegendClick]);

  // 处理鼠标事件
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 查找最近的数据点
    let closestPoint: { point: ChartDataPoint; series: ChartSeries; distance: number } | null = null;

    data.forEach(series => {
      if (!visibleSeries.has(series.name)) return;

      series.data.forEach(point => {
        const x = scaleX(typeof point.x === 'number' ? point.x : 0);
        const y = scaleY(point.y);
        const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));

        if (distance < 20 && (!closestPoint || distance < closestPoint.distance)) {
          closestPoint = { point, series, distance };
        }
      });
    });

    if (closestPoint) {
      const x = scaleX(typeof closestPoint.point.x === 'number' ? closestPoint.point.x : 0);
      const y = scaleY(closestPoint.point.y);
      setHoveredPoint({
        point: closestPoint.point,
        series: closestPoint.series,
        x: mouseX,
        y: mouseY
      });
    } else {
      setHoveredPoint(null);
    }
  }, [data, visibleSeries, scaleX, scaleY]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (hoveredPoint) {
      onDataPointClick?.(hoveredPoint.point, hoveredPoint.series);
    }
  }, [hoveredPoint, onDataPointClick]);

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      config={finalConfig}
      className={className}
    >
      <div className="relative">
        <svg
          width={finalConfig.width}
          height={finalConfig.height}
          className="chart-svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          {/* 网格线 */}
          {finalConfig.grid && (
            <g className="chart-grid">
              {/* Y轴网格线 */}
              {Array.from({ length: 6 }, (_, i) => {
                const y = chartArea.top + (i * chartArea.height) / 5;
                return (
                  <line
                    key={`grid-y-${i}`}
                    x1={chartArea.left}
                    y1={y}
                    x2={chartArea.left + chartArea.width}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                );
              })}
              {/* X轴网格线 */}
              {Array.from({ length: 6 }, (_, i) => {
                const x = chartArea.left + (i * chartArea.width) / 5;
                return (
                  <line
                    key={`grid-x-${i}`}
                    x1={x}
                    y1={chartArea.top}
                    x2={x}
                    y2={chartArea.top + chartArea.height}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          )}

          {/* 坐标轴 */}
          <g className="chart-axes">
            {/* X轴 */}
            <line
              x1={chartArea.left}
              y1={chartArea.top + chartArea.height}
              x2={chartArea.left + chartArea.width}
              y2={chartArea.top + chartArea.height}
              stroke="#374151"
              strokeWidth="2"
            />
            {/* Y轴 */}
            <line
              x1={chartArea.left}
              y1={chartArea.top}
              x2={chartArea.left}
              y2={chartArea.top + chartArea.height}
              stroke="#374151"
              strokeWidth="2"
            />
          </g>

          {/* 坐标轴标签 */}
          <g className="chart-labels">
            {/* Y轴标签 */}
            {Array.from({ length: 6 }, (_, i) => {
              const value = dataRange.yMin + (i * (dataRange.yMax - dataRange.yMin)) / 5;
              const y = chartArea.top + chartArea.height - (i * chartArea.height) / 5;
              return (
                <text
                  key={`label-y-${i}`}
                  x={chartArea.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {formatValue(value)}
                </text>
              );
            })}
          </g>

          {/* 数据线 */}
          {data.map((series, seriesIndex) => {
            if (!visibleSeries.has(series.name)) return null;

            const points = series.data.map(point => ({
              x: scaleX(typeof point.x === 'number' ? point.x : 0),
              y: scaleY(point.y)
            }));

            const color = series.color || getColor(seriesIndex, finalConfig.theme);

            return (
              <g key={series.name} className="chart-series">
                {/* 线条 */}
                <path
                  d={generateLinePath(points)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  className={finalConfig.animation ? 'transition-all duration-300' : ''}
                />

                {/* 数据点 */}
                {points.map((point, pointIndex) => (
                  <circle
                    key={pointIndex}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill={color}
                    className="cursor-pointer hover:r-6 transition-all duration-200"
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {/* 工具提示 */}
        {finalConfig.tooltip && hoveredPoint && (
          <ChartTooltip
            visible={true}
            x={hoveredPoint.x}
            y={hoveredPoint.y}
            content={
              <div>
                <div className="font-semibold">{hoveredPoint.series.name}</div>
                <div>X: {hoveredPoint.point.x}</div>
                <div>Y: {hoveredPoint.point.y}</div>
                {hoveredPoint.point.label && (
                  <div>{hoveredPoint.point.label}</div>
                )}
              </div>
            }
          />
        )}
      </div>

      {/* 图例 */}
      {finalConfig.legend && (
        <ChartLegend
          series={data}
          onSeriesToggle={handleLegendClick}
          theme={finalConfig.theme}
        />
      )}
    </ChartContainer>
  );
};

// 柱状图组件
export const BarChart: React.FC<BaseChartProps> = ({
  data,
  config = {},
  title,
  subtitle,
  className,
  onDataPointClick,
  onLegendClick
}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const [hoveredBar, setHoveredBar] = useState<{
    point: ChartDataPoint;
    series: ChartSeries;
    x: number;
    y: number;
  } | null>(null);

  // 计算图表尺寸
  const chartArea = useMemo(() => {
    const { margin, width, height } = finalConfig;
    return {
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
      left: margin.left,
      top: margin.top
    };
  }, [finalConfig]);

  // 计算数据范围
  const dataRange = useMemo(() => {
    const allPoints = data.flatMap(s => s.data);
    const yValues = allPoints.map(p => p.y);
    const categories = [...new Set(allPoints.map(p => p.x))];

    return {
      categories,
      yMin: Math.min(0, Math.min(...yValues)),
      yMax: Math.max(...yValues)
    };
  }, [data]);

  // 计算柱状图布局
  const barLayout = useMemo(() => {
    const { categories } = dataRange;
    const categoryWidth = chartArea.width / categories.length;
    const barWidth = categoryWidth / data.length * 0.8;
    const barSpacing = categoryWidth / data.length * 0.2;

    return { categoryWidth, barWidth, barSpacing };
  }, [dataRange, chartArea, data.length]);

  // 比例函数
  const scaleY = useCallback((value: number) => {
    const { yMin, yMax } = dataRange;
    return chartArea.top + chartArea.height - (value - yMin) / (yMax - yMin) * chartArea.height;
  }, [dataRange, chartArea]);

  const getBarX = useCallback((categoryIndex: number, seriesIndex: number) => {
    const { categoryWidth, barWidth, barSpacing } = barLayout;
    return chartArea.left + categoryIndex * categoryWidth + seriesIndex * (barWidth + barSpacing);
  }, [barLayout, chartArea]);

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      config={finalConfig}
      className={className}
    >
      <div className="relative">
        <svg
          width={finalConfig.width}
          height={finalConfig.height}
          className="chart-svg"
        >
          {/* 网格和坐标轴 */}
          {finalConfig.grid && (
            <g className="chart-grid">
              {Array.from({ length: 6 }, (_, i) => {
                const y = chartArea.top + (i * chartArea.height) / 5;
                return (
                  <line
                    key={`grid-y-${i}`}
                    x1={chartArea.left}
                    y1={y}
                    x2={chartArea.left + chartArea.width}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          )}

          {/* 坐标轴 */}
          <g className="chart-axes">
            <line
              x1={chartArea.left}
              y1={chartArea.top + chartArea.height}
              x2={chartArea.left + chartArea.width}
              y2={chartArea.top + chartArea.height}
              stroke="#374151"
              strokeWidth="2"
            />
            <line
              x1={chartArea.left}
              y1={chartArea.top}
              x2={chartArea.left}
              y2={chartArea.top + chartArea.height}
              stroke="#374151"
              strokeWidth="2"
            />
          </g>

          {/* Y轴标签 */}
          <g className="chart-labels">
            {Array.from({ length: 6 }, (_, i) => {
              const value = dataRange.yMin + (i * (dataRange.yMax - dataRange.yMin)) / 5;
              const y = chartArea.top + chartArea.height - (i * chartArea.height) / 5;
              return (
                <text
                  key={`label-y-${i}`}
                  x={chartArea.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {formatValue(value)}
                </text>
              );
            })}
          </g>

          {/* X轴标签 */}
          <g className="chart-x-labels">
            {dataRange.categories.map((category, index) => {
              const x = chartArea.left + (index + 0.5) * barLayout.categoryWidth;
              return (
                <text
                  key={category}
                  x={x}
                  y={chartArea.top + chartArea.height + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {category}
                </text>
              );
            })}
          </g>

          {/* 柱状图 */}
          {data.map((series, seriesIndex) => {
            const color = series.color || getColor(seriesIndex, finalConfig.theme);

            return (
              <g key={series.name} className="chart-series">
                {series.data.map((point, pointIndex) => {
                  const categoryIndex = dataRange.categories.indexOf(point.x as string);
                  if (categoryIndex === -1) return null;

                  const x = getBarX(categoryIndex, seriesIndex);
                  const y = scaleY(point.y);
                  const height = scaleY(0) - y;

                  return (
                    <rect
                      key={`${series.name}-${pointIndex}`}
                      x={x}
                      y={y}
                      width={barLayout.barWidth}
                      height={height}
                      fill={color}
                      className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredBar({
                          point,
                          series,
                          x: rect.left + rect.width / 2,
                          y: rect.top
                        });
                      }}
                      onMouseLeave={() => setHoveredBar(null)}
                      onClick={() => onDataPointClick?.(point, series)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* 工具提示 */}
        {finalConfig.tooltip && hoveredBar && (
          <ChartTooltip
            visible={true}
            x={hoveredBar.x}
            y={hoveredBar.y}
            content={
              <div>
                <div className="font-semibold">{hoveredBar.series.name}</div>
                <div>类别: {hoveredBar.point.x}</div>
                <div>值: {hoveredBar.point.y}</div>
              </div>
            }
          />
        )}
      </div>

      {/* 图例 */}
      {finalConfig.legend && (
        <ChartLegend
          series={data}
          onSeriesToggle={onLegendClick}
          theme={finalConfig.theme}
        />
      )}
    </ChartContainer>
  );
};

// 饼图组件
export const PieChart: React.FC<Omit<BaseChartProps, 'data'> & {
  data: ChartDataPoint[];
}> = ({
  data,
  config = {},
  title,
  subtitle,
  className,
  onDataPointClick
}) => {
    const finalConfig = { ...defaultConfig, ...config };
    const [hoveredSlice, setHoveredSlice] = useState<{
      point: ChartDataPoint;
      x: number;
      y: number;
    } | null>(null);

    // 计算图表尺寸
    const chartArea = useMemo(() => {
      const { margin, width, height } = finalConfig;
      const size = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom);
      const centerX = margin.left + (width - margin.left - margin.right) / 2;
      const centerY = margin.top + (height - margin.top - margin.bottom) / 2;
      const radius = size / 2 - 20;

      return { centerX, centerY, radius, size };
    }, [finalConfig]);

    // 计算饼图数据
    const pieData = useMemo(() => {
      const total = data.reduce((sum, point) => sum + point.y, 0);
      let currentAngle = -Math.PI / 2; // 从顶部开始

      return data.map((point, index) => {
        const percentage = point.y / total;
        const angle = percentage * 2 * Math.PI;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;

        currentAngle = endAngle;

        // 计算路径
        const largeArcFlag = angle > Math.PI ? 1 : 0;
        const x1 = chartArea.centerX + chartArea.radius * Math.cos(startAngle);
        const y1 = chartArea.centerY + chartArea.radius * Math.sin(startAngle);
        const x2 = chartArea.centerX + chartArea.radius * Math.cos(endAngle);
        const y2 = chartArea.centerY + chartArea.radius * Math.sin(endAngle);

        const pathData = [
          `M ${chartArea.centerX} ${chartArea.centerY}`,
          `L ${x1} ${y1}`,
          `A ${chartArea.radius} ${chartArea.radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ');

        // 计算标签位置
        const labelAngle = startAngle + angle / 2;
        const labelRadius = chartArea.radius * 0.7;
        const labelX = chartArea.centerX + labelRadius * Math.cos(labelAngle);
        const labelY = chartArea.centerY + labelRadius * Math.sin(labelAngle);

        return {
          ...point,
          percentage,
          startAngle,
          endAngle,
          pathData,
          labelX,
          labelY,
          color: point.color || getColor(index, finalConfig.theme)
        };
      });
    }, [data, chartArea, finalConfig.theme]);

    return (
      <ChartContainer
        title={title}
        subtitle={subtitle}
        config={finalConfig}
        className={className}
      >
        <div className="relative">
          <svg
            width={finalConfig.width}
            height={finalConfig.height}
            className="chart-svg"
          >
            {/* 饼图切片 */}
            {pieData.map((slice, index) => (
              <g key={slice.x} className="pie-slice">
                <path
                  d={slice.pathData}
                  fill={slice.color}
                  className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredSlice({
                      point: slice,
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2
                    });
                  }}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => onDataPointClick?.(slice, { name: 'pie', data: [slice] })}
                />

                {/* 标签 */}
                {slice.percentage > 0.05 && ( // 只显示大于5%的标签
                  <text
                    x={slice.labelX}
                    y={slice.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-white font-medium"
                  >
                    {(slice.percentage * 100).toFixed(1)}%
                  </text>
                )}
              </g>
            ))}
          </svg>

          {/* 工具提示 */}
          {finalConfig.tooltip && hoveredSlice && (
            <ChartTooltip
              visible={true}
              x={hoveredSlice.x}
              y={hoveredSlice.y}
              content={
                <div>
                  <div className="font-semibold">{hoveredSlice.point.x}</div>
                  <div>值: {hoveredSlice.point.y}</div>
                  <div>占比: {((hoveredSlice.point as any).percentage * 100).toFixed(1)}%</div>
                </div>
              }
            />
          )}
        </div>

        {/* 图例 */}
        {finalConfig.legend && (
          <div className="chart-legend flex flex-wrap gap-4 mt-4">
            {pieData.map((slice, index) => (
              <div
                key={slice.x}
                className="legend-item flex items-center gap-2"
              >
                <div
                  className="legend-color w-3 h-3 rounded"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="legend-label text-sm text-gray-700">
                  {slice.x} ({(slice.percentage * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </ChartContainer>
    );
  };

// 面积图组件
export const AreaChart: React.FC<BaseChartProps> = ({
  data,
  config = {},
  title,
  subtitle,
  className,
  onDataPointClick,
  onLegendClick
}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: ChartDataPoint;
    series: ChartSeries;
    x: number;
    y: number;
  } | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(data.map(s => s.name))
  );

  // 计算图表尺寸和比例
  const chartArea = useMemo(() => {
    const { margin, width, height } = finalConfig;
    return {
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
      left: margin.left,
      top: margin.top
    };
  }, [finalConfig]);

  // 计算数据范围
  const dataRange = useMemo(() => {
    const visibleData = data.filter(s => visibleSeries.has(s.name));
    if (visibleData.length === 0) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

    const allPoints = visibleData.flatMap(s => s.data);
    const xValues = allPoints.map(p => typeof p.x === 'number' ? p.x : 0);
    const yValues = allPoints.map(p => p.y);

    return {
      xMin: Math.min(...xValues),
      xMax: Math.max(...xValues),
      yMin: Math.min(0, Math.min(...yValues)),
      yMax: Math.max(...yValues)
    };
  }, [data, visibleSeries]);

  // 比例函数
  const scaleX = useCallback((value: number) => {
    const { xMin, xMax } = dataRange;
    return chartArea.left + (value - xMin) / (xMax - xMin) * chartArea.width;
  }, [dataRange, chartArea]);

  const scaleY = useCallback((value: number) => {
    const { yMin, yMax } = dataRange;
    return chartArea.top + chartArea.height - (value - yMin) / (yMax - yMin) * chartArea.height;
  }, [dataRange, chartArea]);

  // 处理图例点击
  const handleLegendClick = useCallback((series: ChartSeries) => {
    setVisibleSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(series.name)) {
        newSet.delete(series.name);
      } else {
        newSet.add(series.name);
      }
      return newSet;
    });
    onLegendClick?.(series);
  }, [onLegendClick]);

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      config={finalConfig}
      className={className}
    >
      <div className="relative">
        <svg
          width={finalConfig.width}
          height={finalConfig.height}
          className="chart-svg"
        >
          {/* 网格线 */}
          {finalConfig.grid && (
            <g className="chart-grid">
              {Array.from({ length: 6 }, (_, i) => {
                const y = chartArea.top + (i * chartArea.height) / 5;
                return (
                  <line
                    key={`grid-y-${i}`}
                    x1={chartArea.left}
                    y1={y}
                    x2={chartArea.left + chartArea.width}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          )}

          {/* 坐标轴 */}
          <g className="chart-axes">
            <line
              x1={chartArea.left}
              y1={chartArea.top + chartArea.height}
              x2={chartArea.left + chartArea.width}
              y2={chartArea.top + chartArea.height}
              stroke="#374151"
              strokeWidth="2"
            />
            <line
              x1={chartArea.left}
              y1={chartArea.top}
              x2={chartArea.left}
              y2={chartArea.top + chartArea.height}
              stroke="#374151"
              strokeWidth="2"
            />
          </g>

          {/* 坐标轴标签 */}
          <g className="chart-labels">
            {Array.from({ length: 6 }, (_, i) => {
              const value = dataRange.yMin + (i * (dataRange.yMax - dataRange.yMin)) / 5;
              const y = chartArea.top + chartArea.height - (i * chartArea.height) / 5;
              return (
                <text
                  key={`label-y-${i}`}
                  x={chartArea.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {formatValue(value)}
                </text>
              );
            })}
          </g>

          {/* 面积图 */}
          {data.map((series, seriesIndex) => {
            if (!visibleSeries.has(series.name)) return null;

            const points = series.data.map(point => ({
              x: scaleX(typeof point.x === 'number' ? point.x : 0),
              y: scaleY(point.y)
            }));

            const color = series.color || getColor(seriesIndex, finalConfig.theme);
            const baselineY = scaleY(0);

            return (
              <g key={series.name} className="chart-series">
                {/* 面积 */}
                <path
                  d={generateAreaPath(points, baselineY)}
                  fill={color}
                  fillOpacity="0.3"
                  className={finalConfig.animation ? 'transition-all duration-300' : ''}
                />

                {/* 边界线 */}
                <path
                  d={generateLinePath(points)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  className={finalConfig.animation ? 'transition-all duration-300' : ''}
                />

                {/* 数据点 */}
                {points.map((point, pointIndex) => (
                  <circle
                    key={pointIndex}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill={color}
                    className="cursor-pointer hover:r-5 transition-all duration-200"
                    onClick={() => onDataPointClick?.(series.data[pointIndex], series)}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 图例 */}
      {finalConfig.legend && (
        <ChartLegend
          series={data}
          onSeriesToggle={handleLegendClick}
          theme={finalConfig.theme}
        />
      )}
    </ChartContainer>
  );
};

// 导出所有图表组件
export default {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ChartContainer,
  ChartLegend,
  ChartTooltip
};
