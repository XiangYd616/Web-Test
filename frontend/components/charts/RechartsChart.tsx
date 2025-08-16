import React from 'react';
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  // YAxis
} from 'recharts'; // 已修复
// Recharts线图组件
export interface RechartsLineChartProps {
  data: Array<Record<string, any>> | {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
      fill?: boolean;
      tension?: number;
      pointBackgroundColor?: string;
      pointBorderColor?: string;
      pointRadius?: number;
    }>;
  };
  xKey?: string;
  yKey?: string;
  title?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export const RechartsLineChart: React.FC<RechartsLineChartProps> = ({
  data,
  xKey = 'name',
  yKey = 'value',
  title,
  color = '#3B82F6',
  height = 300,
  showGrid = true,
  showTooltip = true
}) => {
  // 转换 Chart.js 格式的数据为 Recharts 格式
  const processedData = React.useMemo(() => {
    if (Array.isArray(data)) {
      return data;
    }

    // Chart.js 格式转换
    if ('labels' in data && 'datasets' in data) {
      
        return data.labels.map((label, index) => {
        const item: Record<string, any> = { [xKey]: label
      };
        data.datasets.forEach((dataset, datasetIndex) => {
          item[dataset.label || `dataset${datasetIndex}`] = dataset.data[index] || 0;
        });
        return item;
      });
    }

    return [];
  }, [data, xKey]);
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            {showGrid && (
              <>
                <XAxis
                  dataKey={xKey}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
              </>
            )}
            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Recharts环形图组件
export interface RechartsDoughnutChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }> | {
    labels: string[];
    datasets: Array<{
      data: number[];
      backgroundColor?: string[];
      borderWidth?: number;
      hoverBorderWidth?: number;
      hoverBorderColor?: string;
      cutout?: string;
    }>;
  };
  title?: string;
  centerText?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  size?: number;
}

export const RechartsDoughnutChart: React.FC<RechartsDoughnutChartProps> = ({
  data,
  title,
  centerText,
  height = 300,
  innerRadius = 60,
  outerRadius = 100,
  size = 200
}) => {
  // 转换 Chart.js 格式的数据为 Recharts 格式
  const processedData = React.useMemo(() => {
    if (Array.isArray(data)) {
      return data;
    }

    // Chart.js 格式转换
    if ('labels' in data && 'datasets' in data) {
      
        const dataset = data.datasets[0];
      if (!dataset) return [];

      return data.labels.map((label, index) => ({
        name: label,
        value: dataset.data[index] || 0,
        color: Array.isArray(dataset.backgroundColor)
          ? dataset.backgroundColor[index]
          : dataset.backgroundColor || `hsl(${index * 45
      }, 70%, 50%)`
      }));
    }

    return [];
  }, [data]);
  const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ];

  const dataWithColors = processedData.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      
        const data = payload[0];
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg">
          <p className="font-medium">{data.name
      }</p>
          <p className="text-sm">
            值: <span className="font-semibold">{data.value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithColors}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
            >
              {dataWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {centerText && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{centerText}</div>
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        {dataWithColors.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Recharts条形图组件
export interface RechartsBarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  height?: number;
}

export const RechartsBarChart: React.FC<RechartsBarChartProps> = ({
  data,
  xKey,
  yKey,
  title,
  color = '#3B82F6',
  height = 300
}) => {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 导出所有组件
export default {
  RechartsLineChart,
  RechartsDoughnutChart,
  RechartsBarChart
};
