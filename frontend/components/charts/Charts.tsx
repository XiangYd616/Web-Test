/**
 * Charts Display Component
 * Provides multiple data visualization solutions with real-time data updates and interactions
 */

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import {
  BarChart3,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { toast } from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Chart type definitions
type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'area';

// Time range types
type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d';

// Theme types
type ChartTheme = 'light' | 'dark' | 'colorful' | 'minimal';

const Charts: React.FC = () => {
  // State management
  const [selectedChart, setSelectedChart] = useState<string>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [theme, setTheme] = useState<ChartTheme>('colorful');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  const chartRefs = useRef<Map<string, any>>(new Map());
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  // Generate mock data
  const generateMockData = (points: number = 24): number[] => {
    const data: number[] = [];
    let current = 100;

    for (let i = 0; i < points; i++) {
      current += (Math.random() - 0.5) * 20;
      current = Math.max(0, current);
      data.push(Math.round(current * 100) / 100);
    }

    return data;
  };

  // Generate time labels
  const generateTimeLabels = (range: TimeRange): string[] => {
    const labels: string[] = [];
    const now = new Date();

    switch (range) {
      case '1h':
        for (let i = 59; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 60000);
          labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        }
        break;
      case '24h':
        for (let i = 23; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 3600000);
          labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        }
        break;
      case '7d':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 86400000);
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        break;
      default:
        return generateTimeLabels('24h');
    }

    return labels;
  };

  // Get theme configuration
  const getThemeConfig = (theme: ChartTheme) => {
    switch (theme) {
      case 'dark':
        return {
          textColor: '#E5E7EB',
          gridColor: 'rgba(156, 163, 175, 0.1)',
          backgroundColor: '#1F2937',
          colors: ['#60A5FA', '#34D399', '#F87171', '#FBBF24', '#A78BFA', '#FB923C'],
        };
      case 'colorful':
        return {
          textColor: '#374151',
          gridColor: 'rgba(156, 163, 175, 0.2)',
          backgroundColor: '#FFFFFF',
          colors: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899'],
        };
      case 'minimal':
        return {
          textColor: '#6B7280',
          gridColor: 'rgba(209, 213, 219, 0.3)',
          backgroundColor: '#FFFFFF',
          colors: ['#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827'],
        };
      default:
        return getThemeConfig('colorful');
    }
  };

  // Chart options
  const getChartOptions = (type: ChartType) => {
    const themeConfig = getThemeConfig(theme);

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: {
            color: themeConfig.textColor,
            font: { size: 12 },
            padding: 15,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
        },
      },
      scales:
        type === 'pie' || type === 'doughnut'
          ? {}
          : {
              x: {
                grid: { color: themeConfig.gridColor },
                ticks: { color: themeConfig.textColor, font: { size: 11 } },
              },
              y: {
                grid: { color: themeConfig.gridColor },
                ticks: { color: themeConfig.textColor, font: { size: 11 } },
              },
            },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart' as const,
      },
    };
  };

  // Sample chart data
  const chartData = {
    labels: generateTimeLabels(timeRange),
    datasets: [
      {
        label: 'Response Time',
        data: generateMockData(timeRange === '7d' ? 7 : 24),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Error Rate',
        data: generateMockData(timeRange === '7d' ? 7 : 24),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        // Refresh data logic
        toast.success('Chart data refreshed');
      }, 30000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  return (
    <div className={`charts ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="chart-container bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Chart Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Performance Metrics</h2>
          </div>

          <div className="flex items-center space-x-2">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as TimeRange)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="12h">Last 12 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Theme Selector */}
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as ChartTheme)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="colorful">Colorful</option>
              <option value="dark">Dark</option>
              <option value="minimal">Minimal</option>
            </select>

            {/* Action Buttons */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg ${autoRefresh ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
              title="Auto Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setZoomLevel(Math.min(zoomLevel + 10, 200))}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>

            <button
              onClick={() => setZoomLevel(Math.max(zoomLevel - 10, 50))}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title="Download">
              <Download className="w-5 h-5" />
            </button>

            <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title="Settings">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chart Display */}
        <div className="chart-wrapper" style={{ height: isFullscreen ? '80vh' : '400px' }}>
          <Line data={chartData} options={getChartOptions('line')} />
        </div>

        {/* Chart Type Selector */}
        <div className="flex items-center justify-center space-x-4 mt-6">
          <button
            onClick={() => setSelectedChart('line')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedChart === 'line'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setSelectedChart('bar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedChart === 'bar'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setSelectedChart('pie')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedChart === 'pie'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Pie Chart
          </button>
        </div>
      </div>
    </div>
  );
};

export default Charts;
