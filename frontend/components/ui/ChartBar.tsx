import React from 'react';

interface ChartBarData {
  label: string;
  value: number;
  color?: string;
  description?: string;
}

interface ChartBarProps {
  /** 图表数据 */
  data: ChartBarData[];
  /** 图表标题 */
  title?: string;
  /** 图表高度 */
  height?: number;
  /** 是否显示值标签 */
  showValues?: boolean;
  /** 是否显示网格线 */
  showGrid?: boolean;
  /** 是否水平显示 */
  horizontal?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 最大值（用于计算比例） */
  maxValue?: number;
  /** 条形图间距 */
  barSpacing?: 'sm' | 'md' | 'lg';
  /** 动画延迟 */
  animationDelay?: number;
}

export const ChartBar: React.FC<ChartBarProps> = ({
  data,
  title,
  height = 300,
  showValues = true,
  showGrid = true,
  horizontal = false,
  className = '',
  maxValue,
  barSpacing = 'md',
  animationDelay = 100
}) => {
  // 计算最大值
  const calculatedMaxValue = maxValue || Math.max(...data.map(item => item.value));
  
  // 获取条形图间距类名
  const getSpacingClass = () => {
    switch (barSpacing) {
      case 'sm': return 'gap-1';
      case 'md': return 'gap-2';
      case 'lg': return 'gap-4';
      default: return 'gap-2';
    }
  };

  // 获取默认颜色
  const getDefaultColor = (index: number) => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // yellow
      '#EF4444', // red
      '#8B5CF6', // purple
      '#06B6D4', // cyan
      '#F97316', // orange
      '#84CC16'  // lime
    ];
    return colors[index % colors.length];
  };

  // 渲染垂直条形图
  const renderVerticalChart = () => (
    <div className={`flex items-end justify-center ${getSpacingClass()} h-full`}>
      {data.map((item, index) => {
        const percentage = (item.value / calculatedMaxValue) * 100;
        const color = item.color || getDefaultColor(index);
        
        return (
          <div
            key={index}
            className="flex flex-col items-center flex-1 min-w-0"
            style={{ animationDelay: `${index * animationDelay}ms` }}
          >
            {/* 值标签 */}
            {showValues && (
              <div className="text-xs font-medium text-gray-600 mb-1">
                {item.value}
              </div>
            )}
            
            {/* 条形图 */}
            <div
              className="w-full rounded-t-md transition-all duration-500 ease-out hover:opacity-80 cursor-pointer"
              style={{
                height: `${percentage}%`,
                backgroundColor: color,
                minHeight: '4px'
              }}
              title={item.description || `${item.label}: ${item.value}`}
            />
            
            {/* 标签 */}
            <div className="text-xs text-gray-700 mt-2 text-center truncate w-full">
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );

  // 渲染水平条形图
  const renderHorizontalChart = () => (
    <div className={`flex flex-col ${getSpacingClass()}`}>
      {data.map((item, index) => {
        const percentage = (item.value / calculatedMaxValue) * 100;
        const color = item.color || getDefaultColor(index);
        
        return (
          <div
            key={index}
            className="flex items-center"
            style={{ animationDelay: `${index * animationDelay}ms` }}
          >
            {/* 标签 */}
            <div className="w-20 text-xs text-gray-700 text-right mr-3 truncate">
              {item.label}
            </div>
            
            {/* 条形图容器 */}
            <div className="flex-1 bg-gray-200 rounded-md h-6 relative">
              <div
                className="h-full rounded-md transition-all duration-500 ease-out hover:opacity-80 cursor-pointer"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                  minWidth: '4px'
                }}
                title={item.description || `${item.label}: ${item.value}`}
              />
            </div>
            
            {/* 值标签 */}
            {showValues && (
              <div className="text-xs font-medium text-gray-600 ml-3 w-12 text-left">
                {item.value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // 渲染网格线
  const renderGrid = () => {
    if (!showGrid || horizontal) return null;
    
    const gridLines = [];
    const steps = 5;
    
    for (let i = 0; i <= steps; i++) {
      const percentage = (i / steps) * 100;
      const value = Math.round((calculatedMaxValue * i) / steps);
      
      gridLines.push(
        <div
          key={i}
          className="absolute w-full border-t border-gray-200 flex items-center"
          style={{ bottom: `${percentage}%` }}
        >
          <span className="text-xs text-gray-500 -ml-8 bg-white px-1">
            {value}
          </span>
        </div>
      );
    }
    
    return <div className="absolute inset-0 pointer-events-none">{gridLines}</div>;
  };

  return (
    <div className={`chart-bar ${className}`}>
      {/* 标题 */}
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      
      {/* 图表容器 */}
      <div 
        className="relative bg-white border border-gray-200 rounded-lg p-4"
        style={{ height: `${height}px` }}
      >
        {/* 网格线 */}
        {renderGrid()}
        
        {/* 图表内容 */}
        <div className="relative h-full">
          {horizontal ? renderHorizontalChart() : renderVerticalChart()}
        </div>
      </div>
      
      {/* 图例 */}
      {data.some(item => item.description) && (
        <div className="mt-4 flex flex-wrap gap-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color || getDefaultColor(index) }}
              />
              <span className="text-xs text-gray-600">
                {item.description || item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 简化的条形图组件
interface SimpleChartBarProps {
  value: number;
  maxValue?: number;
  label?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export const SimpleChartBar: React.FC<SimpleChartBarProps> = ({
  value,
  maxValue = 100,
  label,
  color = '#3B82F6',
  size = 'md',
  showValue = true,
  className = ''
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-2';
      case 'md': return 'h-4';
      case 'lg': return 'h-6';
      default: return 'h-4';
    }
  };

  return (
    <div className={`simple-chart-bar ${className}`}>
      {/* 标签和值 */}
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showValue && (
            <span className="text-sm text-gray-600">{value}</span>
          )}
        </div>
      )}
      
      {/* 条形图 */}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${getSizeClasses()}`}>
        <div
          className="h-full transition-all duration-500 ease-out rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
};

export default ChartBar;
