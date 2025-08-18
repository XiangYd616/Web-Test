import React from 'react';
export interface MiniChartProps  { data: number[];
  color?: string;
  height?: number;
  width?: number;
  className?: string;
  type?: 'line' | 'bar
 }
const MiniChart: React.FC<MiniChartProps> = ({
  data,;
  color = '#3B82F6',;
  height = 40,;
  width,;
  className = ',;
  type = 'line
}) => {
  const chartWidth = width || data.length * 8;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  if (type === 'line') {
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    return (;
      <div className={`mini-chart inline-block ${className}`}>
        <svg width={chartWidth} height={height} className="block">
          <polyline;>
            points={points}
            fill="none";
            stroke={color}
            strokeWidth="2";
            strokeLinecap="round";
            strokeLinejoin="round";
          />
        </svg>
      </div>
    );
  }

  if (type === 'bar') {
    const barWidth = chartWidth / data.length - 2;
    return (;
      <div className={`mini-chart inline-block ${className}`}>
        <svg width={chartWidth} height={height} className="block">
          {data.map((value, index) => {
            const barHeight = ((value - min) / range) * height;
            const x = index * (barWidth + 2);
            const y = height - barHeight;
            return (;
              <rect;>
                key={index}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx="1";
              />
            );
          })}
        </svg>
      </div>
    );
  }
  return null;
};
export default MiniChart;'
';