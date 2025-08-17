/**
 * 简化的图表组件
 * 提供基本的数据可视化功能
 */

import React from 'react';

// 简化的图表数据类型
interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface SimpleChartProps {
  title: string;
  data: ChartData[];
  type?: 'bar' | 'line' | 'pie';
  className?: string;
}

// 简单的条形图组件
export const SimpleBarChart: React.FC<SimpleChartProps> = ({ 
  title, 
  data, 
  className = '' 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-20 text-sm text-gray-600 truncate">
              {item.name}
            </div>
            <div className="flex-1 mx-3">
              <div className="bg-gray-200 rounded-full h-4 relative">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || '#3B82F6'
                  }}
                />
              </div>
            </div>
            <div className="w-12 text-sm font-medium text-right">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 简单的统计卡片组件
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className = ''
}) => {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// 简单的进度环组件
interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#3B82F6',
  label,
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg
          height={size}
          width={size}
          className="transform -rotate-90"
        >
          <circle
            stroke="#E5E7EB"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      {label && (
        <p className="mt-2 text-sm text-gray-600 text-center">{label}</p>
      )}
    </div>
  );
};

// 简单的线性图表组件
interface LineChartProps {
  title: string;
  data: Array<{ x: string; y: number }>;
  className?: string;
}

export const SimpleLineChart: React.FC<LineChartProps> = ({
  title,
  data,
  className = ''
}) => {
  const maxValue = Math.max(...data.map(d => d.y));
  const minValue = Math.min(...data.map(d => d.y));
  const range = maxValue - minValue || 1;

  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-48 relative">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          {/* 网格线 */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="0"
              y1={i * 40}
              x2="400"
              y2={i * 40}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          ))}
          
          {/* 数据线 */}
          <polyline
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            points={data.map((point, index) => {
              const x = (index / (data.length - 1)) * 400;
              const y = 200 - ((point.y - minValue) / range) * 200;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* 数据点 */}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 400;
            const y = 200 - ((point.y - minValue) / range) * 200;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#3B82F6"
              />
            );
          })}
        </svg>
        
        {/* X轴标签 */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {data.map((point, index) => (
            <span key={index}>{point.x}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// 导出所有组件
export default {
  SimpleBarChart,
  StatCard,
  ProgressRing,
  SimpleLineChart
};
