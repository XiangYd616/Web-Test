/**
 * 增强图表展示组件
 * 提供多种数据可视化方案，支持实时数据更新和交互
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Fullscreen,
  Grid,
  Layers,
  LineChart,
  Maximize2,
  Minimize2,
  MoreVertical,
  PieChart,
  RefreshCw,
  Settings,
  Share2,
  TrendingDown,
  TrendingUp,
  Upload,
  ZoomIn,
  ZoomOut,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  DollarSign,
  Users,
  Package,
  Target,
  Zap,
  Globe,
  Database,
  Cpu,
  HardDrive,
  AlertTriangle
} from 'lucide-react';
import {
  Line,
  Bar,
  Pie,
  Doughnut,
  Radar,
  Scatter,
  Bubble,
  PolarArea
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
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
  Filler,
  ScriptableContext,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import { toast } from 'react-hot-toast';

// 注册Chart.js组件
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

// 图表类型定义
type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'area' | 'scatter' | 'bubble' | 'polar' | 'mixed';

// 时间范围类型
type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | 'custom';

// 主题类型
type ChartTheme = 'light' | 'dark' | 'colorful' | 'gradient' | 'minimal';

// 数据点定义
interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
  value?: number;
  category?: string;
  metadata?: any;
}

// 数据集定义
interface Dataset {
  id: string;
  label: string;
  data: DataPoint[] | number[];
  color?: string;
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  tension?: number;
  fill?: boolean;
  type?: 'line' | 'bar';
  yAxisID?: string;
  hidden?: boolean;
}

// 图表配置
interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  datasets: Dataset[];
  options?: ChartOptions;
  theme?: ChartTheme;
  refreshInterval?: number;
  interactive?: boolean;
  exportable?: boolean;
  fullscreenable?: boolean;
}

// KPI指标定义
interface KPIMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
  icon: React.ComponentType<any>;
  color: string;
  sparklineData?: number[];
}

// 仪表板配置
interface DashboardConfig {
  layout: 'grid' | 'flex' | 'custom';
  columns?: number;
  charts: ChartConfig[];
  kpis?: KPIMetric[];
  refreshInterval?: number;
  theme?: ChartTheme;
}

const EnhancedCharts: React.FC = () => {
  // 状态管理
  const [selectedChart, setSelectedChart] = useState<string>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [theme, setTheme] = useState<ChartTheme>('colorful');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showSettings, setShowSettings] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'svg' | 'csv'>('png');
  const [compareMode, setCompareMode] = useState(false);
  const [annotations, setAnnotations] = useState<any[]>([]);
  
  // 引用
  const chartRefs = useRef<Map<string, any>>(new Map());
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // KPI指标数据
  const kpiMetrics: KPIMetric[] = [
    {
      id: 'total_revenue',
      name: '总收入',
      value: 1256789,
      previousValue: 1150000,
      unit: '¥',
      trend: 'up',
      changePercent: 9.3,
      icon: DollarSign,
      color: 'text-green-500',
      sparklineData: [45, 52, 48, 61, 58, 63, 70, 68, 72, 78, 82, 85]
    },
    {
      id: 'active_users',
      name: '活跃用户',
      value: 45678,
      previousValue: 42000,
      unit: '',
      trend: 'up',
      changePercent: 8.8,
      icon: Users,
      color: 'text-blue-500',
      sparklineData: [320, 342, 338, 361, 358, 363, 370, 368, 372, 378, 382, 385]
    },
    {
      id: 'conversion_rate',
      name: '转化率',
      value: 3.45,
      previousValue: 3.12,
      unit: '%',
      trend: 'up',
      changePercent: 10.6,
      icon: Target,
      color: 'text-purple-500',
      sparklineData: [2.8, 2.9, 3.0, 3.1, 3.15, 3.2, 3.25, 3.3, 3.35, 3.4, 3.42, 3.45]
    },
    {
      id: 'response_time',
      name: '响应时间',
      value: 125,
      previousValue: 145,
      unit: 'ms',
      trend: 'down',
      changePercent: -13.8,
      icon: Zap,
      color: 'text-yellow-500',
      sparklineData: [180, 175, 160, 155, 150, 145, 140, 135, 130, 128, 126, 125]
    },
    {
      id: 'error_rate',
      name: '错误率',
      value: 0.12,
      previousValue: 0.18,
      unit: '%',
      trend: 'down',
      changePercent: -33.3,
      icon: AlertTriangle,
      color: 'text-red-500',
      sparklineData: [0.25, 0.22, 0.20, 0.18, 0.17, 0.16, 0.15, 0.14, 0.13, 0.13, 0.12, 0.12]
    },
    {
      id: 'server_load',
      name: '服务器负载',
      value: 65,
      previousValue: 72,
      unit: '%',
      trend: 'down',
      changePercent: -9.7,
      icon: Cpu,
      color: 'text-indigo-500',
      sparklineData: [78, 76, 74, 72, 70, 68, 67, 66, 65, 65, 65, 65]
    }
  ];

  // 生成模拟数据
  const generateMockData = (points: number = 24, baseValue: number = 100): number[] => {
    const data: number[] = [];
    let current = baseValue;
    
    for (let i = 0; i < points; i++) {
      current += (Math.random() - 0.5) * 20;
      current = Math.max(0, current);
      data.push(Math.round(current * 100) / 100);
    }
    
    return data;
  };

  // 生成时间标签
  const generateTimeLabels = (range: TimeRange): string[] => {
    const labels: string[] = [];
    const now = new Date();
    
    switch (range) {
      case '1h':
        for (let i = 59; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 60000);
          labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
        }
        break;
      case '24h':
        for (let i = 23; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 3600000);
          labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
        }
        break;
      case '7d':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 86400000);
          labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        }
        break;
      case '30d':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 86400000);
          labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        }
        break;
      default:
        return generateTimeLabels('24h');
    }
    
    return labels;
  };

  // 获取主题配置
  const getThemeConfig = (theme: ChartTheme) => {
    switch (theme) {
      case 'dark':
        return {
          textColor: '#E5E7EB',
          gridColor: 'rgba(156, 163, 175, 0.1)',
          backgroundColor: '#1F2937',
          colors: ['#60A5FA', '#34D399', '#F87171', '#FBBF24', '#A78BFA', '#FB923C']
        };
      case 'colorful':
        return {
          textColor: '#374151',
          gridColor: 'rgba(156, 163, 175, 0.2)',
          backgroundColor: '#FFFFFF',
          colors: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899']
        };
      case 'gradient':
        return {
          textColor: '#4B5563',
          gridColor: 'rgba(156, 163, 175, 0.15)',
          backgroundColor: '#F9FAFB',
          colors: [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
          ]
        };
      case 'minimal':
        return {
          textColor: '#6B7280',
          gridColor: 'rgba(209, 213, 219, 0.3)',
          backgroundColor: '#FFFFFF',
          colors: ['#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827']
        };
      default:
        return getThemeConfig('colorful');
    }
  };

  // 创建渐变
  const createGradient = (ctx: CanvasRenderingContext2D, color1: string, color2: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  };

  // 图表配置选项
  const getChartOptions = (type: ChartType, theme: ChartTheme): ChartOptions => {
    const themeConfig = getThemeConfig(theme);
    
    const baseOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: {
            color: themeConfig.textColor,
            font: {
              size: 12
            },
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context: TooltipItem<any>) {

              /**

               * if功能函数

               * @param {Object} params - 参数对象

               * @returns {Promise<Object>} 返回结果

               */
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('zh-CN').format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: type === 'pie' || type === 'doughnut' || type === 'polar' || type === 'radar' ? {} : {
        x: {
          grid: {
            color: themeConfig.gridColor,
            },
          ticks: {
            color: themeConfig.textColor,
            font: {
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: themeConfig.gridColor,
            },
          ticks: {
            color: themeConfig.textColor,
            font: {
              size: 11
            }
          }
        }
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart' as const
      }
    };

    return baseOptions;
  };

  // 主要图表数据
  const getMainChartData = () => {
    const labels = generateTimeLabels(timeRange);
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels,
      datasets: [
        {
          label: '销售额',
          data: generateMockData(labels.length, 50000),
          borderColor: themeConfig.colors[0],
          backgroundColor: themeConfig.colors[0] + '20',
          tension: 0.4,
          fill: true
        },
        {
          label: '订单数',
          data: generateMockData(labels.length, 800),
          borderColor: themeConfig.colors[1],
          backgroundColor: themeConfig.colors[1] + '20',
          tension: 0.4,
          fill: true
        },
        {
          label: '访问量',
          data: generateMockData(labels.length, 12000),
          borderColor: themeConfig.colors[2],
          backgroundColor: themeConfig.colors[2] + '20',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  // 性能监控图表数据
  const getPerformanceChartData = () => {
    const labels = generateTimeLabels(timeRange);
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels,
      datasets: [
        {
          label: 'CPU使用率 (%)',
          data: generateMockData(labels.length, 65),
          borderColor: themeConfig.colors[0],
          backgroundColor: themeConfig.colors[0] + '20',
          tension: 0.3,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: '内存使用率 (%)',
          data: generateMockData(labels.length, 72),
          borderColor: themeConfig.colors[1],
          backgroundColor: themeConfig.colors[1] + '20',
          tension: 0.3,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: '响应时间 (ms)',
          data: generateMockData(labels.length, 125),
          borderColor: themeConfig.colors[2],
          backgroundColor: themeConfig.colors[2] + '20',
          tension: 0.3,
          fill: true,
          yAxisID: 'y1'
        },
        {
          label: '请求数/秒',
          data: generateMockData(labels.length, 450),
          borderColor: themeConfig.colors[3],
          backgroundColor: themeConfig.colors[3] + '20',
          tension: 0.3,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    };
  };

  // 分类统计图表数据
  const getCategoryChartData = () => {
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels: ['电子产品', '服装', '食品', '家居', '图书', '运动', '美妆', '其他'],
      datasets: [
        {
          label: '销售额',
          data: [45000, 38000, 28000, 32000, 18000, 22000, 25000, 15000],
          backgroundColor: themeConfig.colors,
          borderWidth: 0
        }
      ]
    };
  };

  // 用户分析图表数据
  const getUserAnalyticsData = () => {
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels: ['新用户', '活跃用户', '流失用户', '回流用户', '忠实用户'],
      datasets: [
        {
          label: '本月',
          data: [1200, 3500, 450, 280, 2100],
          backgroundColor: themeConfig.colors[0] + '80',
          borderColor: themeConfig.colors[0],
          borderWidth: 2
        },
        {
          label: '上月',
          data: [1000, 3200, 520, 230, 1900],
          backgroundColor: themeConfig.colors[1] + '80',
          borderColor: themeConfig.colors[1],
          borderWidth: 2
        }
      ]
    };
  };

  // 地理分布数据
  const getGeographicData = () => {
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels: ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆'],
      datasets: [
        {
          label: '用户数',
          data: [850, 920, 680, 750, 520, 450, 380, 320, 410, 360],
          backgroundColor: themeConfig.colors[0],
          borderColor: themeConfig.colors[0],
          borderWidth: 1
        },
        {
          label: '订单数',
          data: [2100, 2450, 1680, 1920, 1320, 1150, 980, 820, 1050, 920],
          backgroundColor: themeConfig.colors[1],
          borderColor: themeConfig.colors[1],
          borderWidth: 1
        }
      ]
    };
  };

  // 热力图数据
  const getHeatmapData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const data: any[] = [];
    
    days.forEach((day, dayIndex) => {
      hours.forEach((hour, hourIndex) => {
        data.push({
          x: hourIndex,
          y: dayIndex,
          v: Math.floor(Math.random() * 100)
        });
      });
    });
    
    return {
      labels: {
        x: hours,
        y: days
      },
      datasets: [{
        label: '活跃度',
        data: data,
        backgroundColor: (context: ScriptableContext<'bubble'>) => {
          const value = (context.raw as any).v;
          const alpha = value / 100;
          return `rgba(59, 130, 246, ${alpha})`;
        },
        borderWidth: 1
      }]
    };
  };

  // 混合图表数据
  const getMixedChartData = () => {
    const labels = generateTimeLabels(timeRange);
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: '销售额',
          data: generateMockData(labels.length, 50000),
          backgroundColor: themeConfig.colors[0] + '80',
          borderColor: themeConfig.colors[0],
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          type: 'line' as const,
          label: '增长率',
          data: generateMockData(labels.length, 15),
          borderColor: themeConfig.colors[1],
          backgroundColor: themeConfig.colors[1] + '20',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1'
        },
        {
          type: 'line' as const,
          label: '目标值',
          data: Array(labels.length).fill(55000),
          borderColor: themeConfig.colors[2],
          borderDash: [5, 5],
          borderWidth: 2,
          fill: false,
          yAxisID: 'y'
        }
      ]
    };
  };

  // 更新数据
  const updateChartData = () => {
    // 这里可以调用API获取真实数据
    // 现在使用模拟数据更新
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach(chart => {
      // 触发图表更新
      const event = new CustomEvent('updateChart');
      chart.dispatchEvent(event);
    });
    
    toast.success('数据已更新');
  };

  // 导出图表
  const exportChart = (chartId: string, format: 'png' | 'jpg' | 'svg' | 'csv') => {
    const chartRef = chartRefs.current.get(chartId);
    if (!chartRef) return;
    
    switch (format) {
      case 'png':
      case 'jpg':
        const url = chartRef.toBase64Image();
        const link = document.createElement('a');
        link.download = `chart-${chartId}-${Date.now()}.${format}`;
        link.href = url;
        link.click();
        break;
      case 'csv':
        // 导出CSV数据
        const csvData = generateCSVData(chartId);
        const blob = new Blob([csvData], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(blob);
        const csvLink = document.createElement('a');
        csvLink.download = `chart-${chartId}-${Date.now()}.csv`;
        csvLink.href = csvUrl;
        csvLink.click();
        break;
      case 'svg':
        // SVG导出需要额外的处理
        toast('SVG导出功能开发中');
        break;
    }
    
    toast.success(`图表已导出为${format.toUpperCase()}格式`);
  };

  // 生成CSV数据
  const generateCSVData = (chartId: string): string => {
    // 这里应该根据实际图表数据生成CSV
    // 示例实现
    const headers = ['时间', '数值1', '数值2', '数值3'];
    const rows = [
      ['2024-01-01', '100', '200', '300'],
      ['2024-01-02', '110', '210', '310'],
      ['2024-01-03', '120', '220', '320']
    ];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 添加注释
  const addAnnotation = (chartId: string, annotation: any) => {
    setAnnotations(prev => [...prev, { chartId, ...annotation }]);
    toast.success('注释已添加');
  };

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        updateChartData();
      }, 30000); // 30秒刷新一次
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  // 渲染KPI卡片
  const renderKPICard = (metric: KPIMetric) => {
    const Icon = metric.icon;
    const trendIcon = metric.trend === 'up' ? 
      <ArrowUpRight className="h-4 w-4" /> : 
      <ArrowDownRight className="h-4 w-4" />;
    const trendColor = metric.trend === 'up' ? 
      (metric.changePercent! > 0 ? 'text-green-600' : 'text-red-600') : 
      (metric.changePercent! < 0 ? 'text-green-600' : 'text-red-600');
    
    return (
      <div key={metric.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg bg-gray-100 ${metric.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className={`flex items-center space-x-1 text-sm font-medium ${trendColor}`}>
            {trendIcon}
            <span>{Math.abs(metric.changePercent!).toFixed(1)}%</span>
          </div>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-1">{metric.name}</p>
          <p className="text-2xl font-bold text-gray-900">
            {metric.unit === '¥' && metric.unit}
            {metric.value.toLocaleString('zh-CN')}
            {metric.unit && metric.unit !== '¥' && metric.unit}
          </p>
          {metric.previousValue && (
            <p className="text-xs text-gray-500 mt-1">
              对比上期: {metric.unit === '¥' && metric.unit}
              {metric.previousValue.toLocaleString('zh-CN')}
              {metric.unit && metric.unit !== '¥' && metric.unit}
            </p>
          )}
        </div>
        
        {/* 迷你趋势图 */}
        {metric.sparklineData && (
          <div className="h-12">
            <Line
              data={{
                labels: metric.sparklineData.map((_, i) => i),
                datasets: [{
                  data: metric.sparklineData,
                  borderColor: metric.color.replace('text-', '#').replace('-500', ''),
                  borderWidth: 2,
                  fill: false,
                  tension: 0.4,
                  pointRadius: 0,
                  pointHoverRadius: 0
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { enabled: false }
                },
                scales: {
                  x: { display: false },
                  y: { display: false }
                }
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // 渲染图表
  const renderChart = (chartId: string, type: ChartType, data: any, options?: ChartOptions) => {
    const ChartComponent = {
      line: Line,
      bar: Bar,
      pie: Pie,
      doughnut: Doughnut,
      radar: Radar,
      area: Line,
      scatter: Scatter,
      bubble: Bubble,
      polar: PolarArea,
      mixed: Bar
    }[type] || Line;
    
    return (
      <div className="chart-container h-full">
        <ChartComponent
          ref={(ref: any) => chartRefs.current.set(chartId, ref)}
          data={data}
          options={options || getChartOptions(type, theme)}
        />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题和控制栏 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">数据可视化中心</h1>
                <p className="text-sm text-gray-600">实时监控和分析业务数据</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 时间范围选择 */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">过去1小时</option>
                <option value="6h">过去6小时</option>
                <option value="12h">过去12小时</option>
                <option value="24h">过去24小时</option>
                <option value="7d">过去7天</option>
                <option value="30d">过去30天</option>
                <option value="90d">过去90天</option>
              </select>
              
              {/* 主题选择 */}
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ChartTheme)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">浅色主题</option>
                <option value="dark">深色主题</option>
                <option value="colorful">彩色主题</option>
                <option value="gradient">渐变主题</option>
                <option value="minimal">极简主题</option>
              </select>
              
              {/* 自动刷新 */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm ${
                  autoRefresh 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span>自动刷新</span>
              </button>
              
              {/* 全屏按钮 */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title={isFullscreen ? '退出全屏' : '全屏'}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              
              {/* 设置按钮 */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="设置"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {kpiMetrics.map(metric => renderKPICard(metric))}
        </div>

        {/* 主图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 业务趋势图 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">业务趋势</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportChart('business-trend', 'png')}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title="导出"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => updateChartData()}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title="刷新"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-80">
              {renderChart('business-trend', 'line', getMainChartData())}
            </div>
          </div>

          {/* 性能监控图 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">性能监控</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportChart('performance', 'png')}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title="导出"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => updateChartData()}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title="刷新"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-80">
              {renderChart('performance', 'line', getPerformanceChartData(), {
                ...getChartOptions('line', theme),
                scales: {
                  x: {
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)',
                      },
                    ticks: {
                      color: '#6B7280',
                      font: { size: 11 }
                    }
                  },
                  y: {
                    type: 'linear' as const,
                    display: true,
                    position: 'left' as const,
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)',
                      },
                    ticks: {
                      color: '#6B7280',
                      font: { size: 11 }
                    },
                    title: {
                      display: true,
                      text: '百分比 (%)',
                      color: '#6B7280'
                    }
                  },
                  y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    grid: {
                      drawOnChartArea: false
                    },
                    ticks: {
                      color: '#6B7280',
                      font: { size: 11 }
                    },
                    title: {
                      display: true,
                      text: '数值',
                      color: '#6B7280'
                    }
                  }
                }
              })}
            </div>
          </div>
        </div>

        {/* 次要图表区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* 分类统计 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">分类统计</h3>
              <button
                onClick={() => exportChart('category', 'png')}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="导出"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            <div className="h-64">
              {renderChart('category', 'doughnut', getCategoryChartData())}
            </div>
          </div>

          {/* 用户分析 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">用户分析</h3>
              <button
                onClick={() => exportChart('user-analytics', 'png')}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="导出"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            <div className="h-64">
              {renderChart('user-analytics', 'radar', getUserAnalyticsData())}
            </div>
          </div>

          {/* 地理分布 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">地理分布</h3>
              <button
                onClick={() => exportChart('geographic', 'png')}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="导出"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            <div className="h-64">
              {renderChart('geographic', 'bar', getGeographicData())}
            </div>
          </div>
        </div>

        {/* 混合图表 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">综合分析</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`px-3 py-1 rounded text-sm ${
                  compareMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                } transition-colors`}
              >
                对比模式
              </button>
              <button
                onClick={() => exportChart('mixed', 'png')}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="导出"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-96">
            {renderChart('mixed', 'mixed', getMixedChartData(), {
              ...getChartOptions('bar', theme),
              scales: {
                x: {
                  grid: {
                    color: 'rgba(156, 163, 175, 0.1)',
                    },
                  ticks: {
                    color: '#6B7280',
                    font: { size: 11 }
                  }
                },
                y: {
                  type: 'linear' as const,
                  display: true,
                  position: 'left' as const,
                  grid: {
                    color: 'rgba(156, 163, 175, 0.1)',
                    },
                  ticks: {
                    color: '#6B7280',
                    font: { size: 11 },
                    callback: function(value: any) {
                      return '¥' + value.toLocaleString('zh-CN');
                    }
                  },
                  title: {
                    display: true,
                    text: '销售额',
                    color: '#6B7280'
                  }
                },
                y1: {
                  type: 'linear' as const,
                  display: true,
                  position: 'right' as const,
                  grid: {
                    drawOnChartArea: false
                  },
                  ticks: {
                    color: '#6B7280',
                    font: { size: 11 },
                    callback: function(value: any) {
                      return value + '%';
                    }
                  },
                  title: {
                    display: true,
                    text: '增长率',
                    color: '#6B7280'
                  }
                }
              }
            })}
          </div>
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-50 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">图表设置</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 导出设置 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">导出设置</h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">导出格式</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="png">PNG图片</option>
                    <option value="jpg">JPG图片</option>
                    <option value="svg">SVG矢量图</option>
                    <option value="csv">CSV数据</option>
                  </select>
                </div>
              </div>
              
              {/* 缩放设置 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">缩放设置</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                    className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-center">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                    className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* 数据源设置 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">数据源</h3>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">生产环境</span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>
                  <button className="w-full px-4 py-2 text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">测试环境</span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>
                </div>
              </div>
              
              {/* 快捷操作 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">快捷操作</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      updateChartData();
                      toast.success('所有图表已刷新');
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    刷新所有图表
                  </button>
                  <button
                    onClick={() => {
                      // 导出所有图表
                      toast('批量导出功能开发中');
                    }}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    导出所有图表
                  </button>
                  <button
                    onClick={() => {
                      // 重置设置
                      setTheme('colorful');
                      setTimeRange('24h');
                      setZoomLevel(100);
                      toast.success('设置已重置');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    重置设置
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 导入XCircle组件，补充缺失的导入
import { XCircle } from 'lucide-react';

export default EnhancedCharts;
