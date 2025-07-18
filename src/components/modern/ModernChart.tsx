import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import '../../styles/modern-design-system.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 现代化图表配色方案
export const chartColors = {
  primary: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899'
};

// 默认图表选项
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#b4b7c1',
        font: {
          family: 'Inter',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: '#2a2f3e',
      titleColor: '#ffffff',
      bodyColor: '#b4b7c1',
      borderColor: '#3a3f4e',
      borderWidth: 1,
      cornerRadius: 8,
      titleFont: {
        family: 'Inter',
        size: 14,
        weight: '600'
      },
      bodyFont: {
        family: 'Inter',
        size: 12
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: '#3a3f4e',
        borderColor: '#3a3f4e'
      },
      ticks: {
        color: '#8b8fa3',
        font: {
          family: 'Inter',
          size: 11
        }
      }
    },
    y: {
      grid: {
        color: '#3a3f4e',
        borderColor: '#3a3f4e'
      },
      ticks: {
        color: '#8b8fa3',
        font: {
          family: 'Inter',
          size: 11
        }
      }
    }
  }
};

export interface LineChartProps {
  data: any;
  options?: any;
  height?: number;
  className?: string;
}

export const ModernLineChart: React.FC<LineChartProps> = ({
  data,
  options = {},
  height = 300,
  className = ''
}) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options
  };

  return (
    <div className={`modern-chart-container ${className}`} style={{ height }}>
      <Line data={data} options={mergedOptions} />
    </div>
  );
};

export interface BarChartProps {
  data: any;
  options?: any;
  height?: number;
  className?: string;
}

export const ModernBarChart: React.FC<BarChartProps> = ({
  data,
  options = {},
  height = 300,
  className = ''
}) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options
  };

  return (
    <div className={`modern-chart-container ${className}`} style={{ height }}>
      <Bar data={data} options={mergedOptions} />
    </div>
  );
};

export interface DoughnutChartProps {
  data: any;
  options?: any;
  size?: number;
  className?: string;
}

export const ModernDoughnutChart: React.FC<DoughnutChartProps> = ({
  data,
  options = {},
  size = 200,
  className = ''
}) => {
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#b4b7c1',
          font: {
            family: 'Inter',
            size: 12
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#2a2f3e',
        titleColor: '#ffffff',
        bodyColor: '#b4b7c1',
        borderColor: '#3a3f4e',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          family: 'Inter',
          size: 14,
          weight: '600'
        },
        bodyFont: {
          family: 'Inter',
          size: 12
        }
      }
    },
    cutout: '70%',
    ...options
  };

  return (
    <div className={`modern-chart-container ${className}`} style={{ height: size, width: size }}>
      <Doughnut data={data} options={doughnutOptions} />
    </div>
  );
};

// 进度环图组件
export interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showText?: boolean;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = chartColors.primary,
  backgroundColor = '#3a3f4e',
  showText = true,
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`progress-ring ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="progress-ring-svg">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%'
          }}
        />
      </svg>
      {showText && (
        <div className="progress-ring-text">
          <span className="text-2xl font-bold text-primary">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

// 迷你图表组件
export interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export const MiniLineChart: React.FC<MiniChartProps> = ({
  data,
  color = chartColors.primary,
  height = 40,
  className = ''
}) => {
  const width = data.length * 8;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = index * 8;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={`mini-chart ${className}`}>
      <svg width={width} height={height} className="mini-chart-svg">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

// CSS样式
const chartStyles = `
.modern-chart-container {
  position: relative;
}

.progress-ring {
  position: relative;
  display: inline-block;
}

.progress-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.mini-chart {
  display: inline-block;
}

.mini-chart-svg {
  display: block;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = chartStyles;
  document.head.appendChild(styleElement);
}
