/**
 * 澧炲己鍥捐〃灞曠ず缁勪欢
 * 鎻愪緵澶氱鏁版嵁鍙鍖栨柟妗堬紝鏀寔瀹炴椂鏁版嵁鏇存柊鍜屼氦浜?
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {BarChart3, ChevronDown, Download, Maximize2, Minimize2, RefreshCw, Settings, ZoomIn, ZoomOut, ArrowUpRight, ArrowDownRight, DollarSign, Users, Target, Zap, Cpu, AlertTriangle} from 'lucide-react';
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

// 娉ㄥ唽Chart.js缁勪欢
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

// 鍥捐〃绫诲瀷瀹氫箟
type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'area' | 'scatter' | 'bubble' | 'polar' | 'mixed';

// 鏃堕棿鑼冨洿绫诲瀷
type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | 'custom';

// 涓婚绫诲瀷
type ChartTheme = 'light' | 'dark' | 'colorful' | 'gradient' | 'minimal';

// 鏁版嵁鐐瑰畾涔?
interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
  value?: number;
  category?: string;
  metadata?: unknown;
}

// 鏁版嵁闆嗗畾涔?
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

// 鍥捐〃閰嶇疆
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

// KPI鎸囨爣瀹氫箟
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

// 浠〃鏉块厤缃?
interface DashboardConfig {
  layout: 'grid' | 'flex' | 'custom';
  columns?: number;
  charts: ChartConfig[];
  kpis?: KPIMetric[];
  refreshInterval?: number;
  theme?: ChartTheme;
}

const Charts: React.FC = () => {
  // 鐘舵€佺鐞?
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
  
  // 寮曠敤
  const chartRefs = useRef<Map<string, any>>(new Map());
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // KPI鎸囨爣鏁版嵁
  const kpiMetrics: KPIMetric[] = [
    {
      id: 'total_revenue',
      name: '鎬绘敹鍏?,
      value: 1256789,
      previousValue: 1150000,
      unit: '楼',
      trend: 'up',
      changePercent: 9.3,
      icon: DollarSign,
      color: 'text-green-500',
      sparklineData: [45, 52, 48, 61, 58, 63, 70, 68, 72, 78, 82, 85]
    },
    {
      id: 'active_users',
      name: '娲昏穬鐢ㄦ埛',
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
      name: '杞寲鐜?,
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
      name: '鍝嶅簲鏃堕棿',
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
      name: '閿欒鐜?,
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
      name: '鏈嶅姟鍣ㄨ礋杞?,
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

  // 鐢熸垚妯℃嫙鏁版嵁
  const generateMockData = (points: number = 24, baseValue: number = 100): number[] => {
    const data: number[] = [];
    let current = baseValue;
    
    for (let i = 0; i < points; i++) {
      current += (Math.random() - 0.5) * 20;
      current = Math.max(0, current);
      data?.push(Math.round(current * 100) / 100);
    }
    
    return data;
  };

  // 鐢熸垚鏃堕棿鏍囩
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

  // 鑾峰彇涓婚閰嶇疆
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

  // 鍒涘缓娓愬彉
  const _createGradient = (ctx: CanvasRenderingContext2D, color1: string, color2: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  };

  // 鍥捐〃閰嶇疆閫夐」
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

               * if鍔熻兘鍑芥暟

               * @param {Object} params - 鍙傛暟瀵硅薄

               * @returns {Promise<Object>} 杩斿洖缁撴灉

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

  // 涓昏鍥捐〃鏁版嵁
  const getMainChartData = () => {
    const labels = generateTimeLabels(timeRange);
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels,
      datasets: [
        {
          label: '閿€鍞',
          data: generateMockData(labels.length, 50000),
          borderColor: themeConfig.colors[0],
          backgroundColor: themeConfig.colors[0] + '20',
          tension: 0.4,
          fill: true
        },
        {
          label: '璁㈠崟鏁?,
          data: generateMockData(labels.length, 800),
          borderColor: themeConfig.colors[1],
          backgroundColor: themeConfig.colors[1] + '20',
          tension: 0.4,
          fill: true
        },
        {
          label: '璁块棶閲?,
          data: generateMockData(labels.length, 12000),
          borderColor: themeConfig.colors[2],
          backgroundColor: themeConfig.colors[2] + '20',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  // 鎬ц兘鐩戞帶鍥捐〃鏁版嵁
  const getPerformanceChartData = () => {
    const labels = generateTimeLabels(timeRange);
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels,
      datasets: [
        {
          label: 'CPU浣跨敤鐜?(%)',
          data: generateMockData(labels.length, 65),
          borderColor: themeConfig.colors[0],
          backgroundColor: themeConfig.colors[0] + '20',
          tension: 0.3,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: '鍐呭瓨浣跨敤鐜?(%)',
          data: generateMockData(labels.length, 72),
          borderColor: themeConfig.colors[1],
          backgroundColor: themeConfig.colors[1] + '20',
          tension: 0.3,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: '鍝嶅簲鏃堕棿 (ms)',
          data: generateMockData(labels.length, 125),
          borderColor: themeConfig.colors[2],
          backgroundColor: themeConfig.colors[2] + '20',
          tension: 0.3,
          fill: true,
          yAxisID: 'y1'
        },
        {
          label: '璇锋眰鏁?绉?,
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

  // 鍒嗙被缁熻鍥捐〃鏁版嵁
  const getCategoryChartData = () => {
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels: ['鐢靛瓙浜у搧', '鏈嶈', '椋熷搧', '瀹跺眳', '鍥句功', '杩愬姩', '缇庡', '鍏朵粬'],
      datasets: [
        {
          label: '閿€鍞',
          data: [45000, 38000, 28000, 32000, 18000, 22000, 25000, 15000],
          backgroundColor: themeConfig.colors,
          borderWidth: 0
        }
      ]
    };
  };

  // 鐢ㄦ埛鍒嗘瀽鍥捐〃鏁版嵁
  const getUserAnalyticsData = () => {
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels: ['鏂扮敤鎴?, '娲昏穬鐢ㄦ埛', '娴佸け鐢ㄦ埛', '鍥炴祦鐢ㄦ埛', '蹇犲疄鐢ㄦ埛'],
      datasets: [
        {
          label: '鏈湀',
          data: [1200, 3500, 450, 280, 2100],
          backgroundColor: themeConfig.colors[0] + '80',
          borderColor: themeConfig.colors[0],
          borderWidth: 2
        },
        {
          label: '涓婃湀',
          data: [1000, 3200, 520, 230, 1900],
          backgroundColor: themeConfig.colors[1] + '80',
          borderColor: themeConfig.colors[1],
          borderWidth: 2
        }
      ]
    };
  };

  // 鍦扮悊鍒嗗竷鏁版嵁
  const getGeographicData = () => {
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels: ['鍖椾含', '涓婃捣', '骞垮窞', '娣卞湷', '鏉窞', '鎴愰兘', '姝︽眽', '瑗垮畨', '鍗椾含', '閲嶅簡'],
      datasets: [
        {
          label: '鐢ㄦ埛鏁?,
          data: [850, 920, 680, 750, 520, 450, 380, 320, 410, 360],
          backgroundColor: themeConfig.colors[0],
          borderColor: themeConfig.colors[0],
          borderWidth: 1
        },
        {
          label: '璁㈠崟鏁?,
          data: [2100, 2450, 1680, 1920, 1320, 1150, 980, 820, 1050, 920],
          backgroundColor: themeConfig.colors[1],
          borderColor: themeConfig.colors[1],
          borderWidth: 1
        }
      ]
    };
  };

  // 鐑姏鍥炬暟鎹?
  const _getHeatmapData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const days = ['鍛ㄤ竴', '鍛ㄤ簩', '鍛ㄤ笁', '鍛ㄥ洓', '鍛ㄤ簲', '鍛ㄥ叚', '鍛ㄦ棩'];
    const data: unknown[] = [];
    
    days.forEach((day, dayIndex) => {
      hours.forEach((hour, hourIndex) => {
        data?.push({
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
        label: '娲昏穬搴?,
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

  // 娣峰悎鍥捐〃鏁版嵁
  const getMixedChartData = () => {
    const labels = generateTimeLabels(timeRange);
    const themeConfig = getThemeConfig(theme);
    
    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: '閿€鍞',
          data: generateMockData(labels.length, 50000),
          backgroundColor: themeConfig.colors[0] + '80',
          borderColor: themeConfig.colors[0],
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          type: 'line' as const,
          label: '澧為暱鐜?,
          data: generateMockData(labels.length, 15),
          borderColor: themeConfig.colors[1],
          backgroundColor: themeConfig.colors[1] + '20',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1'
        },
        {
          type: 'line' as const,
          label: '鐩爣鍊?,
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

  // 鏇存柊鏁版嵁
  const updateChartData = () => {
    // 杩欓噷鍙互璋冪敤API鑾峰彇鐪熷疄鏁版嵁
    // 鐜板湪浣跨敤妯℃嫙鏁版嵁鏇存柊
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach(chart => {
      // 瑙﹀彂鍥捐〃鏇存柊
      const event = new CustomEvent('updateChart');
      chart.dispatchEvent(event);
    });
    
    toast.success('鏁版嵁宸叉洿鏂?);
  };

  // 瀵煎嚭鍥捐〃
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
        // 瀵煎嚭CSV鏁版嵁
        const csvData = generateCSVData(chartId);
        const blob = new Blob([csvData], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(blob);
        const csvLink = document.createElement('a');
        csvLink.download = `chart-${chartId}-${Date.now()}.csv`;
        csvLink.href = csvUrl;
        csvLink.click();
        break;
      case 'svg':
        // SVG瀵煎嚭闇€瑕侀澶栫殑澶勭悊
        toast('SVG瀵煎嚭鍔熻兘寮€鍙戜腑');
        break;
    }
    
    toast.success(`鍥捐〃宸插鍑轰负${format.toUpperCase()}鏍煎紡`);
  };

  // 鐢熸垚CSV鏁版嵁
  const generateCSVData = (chartId: string): string => {
    // 杩欓噷搴旇鏍规嵁瀹為檯鍥捐〃鏁版嵁鐢熸垚CSV
    // 绀轰緥瀹炵幇
    const headers = ['鏃堕棿', '鏁板€?', '鏁板€?', '鏁板€?'];
    const rows = [
      ['2024-01-01', '100', '200', '300'],
      ['2024-01-02', '110', '210', '310'],
      ['2024-01-03', '120', '220', '320']
    ];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // 鍏ㄥ睆鍒囨崲
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 娣诲姞娉ㄩ噴
  const _addAnnotation = (chartId: string, annotation: unknown) => {
    setAnnotations(prev => [...prev, { chartId, ...annotation }]);
    toast.success('娉ㄩ噴宸叉坊鍔?);
  };

  // 鑷姩鍒锋柊
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        updateChartData();
      }, 30000); // 30绉掑埛鏂颁竴娆?
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  // 娓叉煋KPI鍗＄墖
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
            {metric.unit === '楼' && metric.unit}
            {metric.value.toLocaleString('zh-CN')}
            {metric.unit && metric.unit !== '楼' && metric.unit}
          </p>
          {metric.previousValue && (
            <p className="text-xs text-gray-500 mt-1">
              瀵规瘮涓婃湡: {metric.unit === '楼' && metric.unit}
              {metric.previousValue.toLocaleString('zh-CN')}
              {metric.unit && metric.unit !== '楼' && metric.unit}
            </p>
          )}
        </div>
        
        {/* 杩蜂綘瓒嬪娍鍥?*/}
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

  // 娓叉煋鍥捐〃
  const renderChart = (chartId: string, type: ChartType, data: unknown, options?: ChartOptions) => {
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
          ref={(ref: unknown) => chartRefs.current.set(chartId, ref)}
          data={data}
          options={options || getChartOptions(type, theme)}
        />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 椤甸潰鏍囬鍜屾帶鍒舵爮 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">鏁版嵁鍙鍖栦腑蹇?/h1>
                <p className="text-sm text-gray-600">瀹炴椂鐩戞帶鍜屽垎鏋愪笟鍔℃暟鎹?/p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 鏃堕棿鑼冨洿閫夋嫨 */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e?.target.value as TimeRange)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">杩囧幓1灏忔椂</option>
                <option value="6h">杩囧幓6灏忔椂</option>
                <option value="12h">杩囧幓12灏忔椂</option>
                <option value="24h">杩囧幓24灏忔椂</option>
                <option value="7d">杩囧幓7澶?/option>
                <option value="30d">杩囧幓30澶?/option>
                <option value="90d">杩囧幓90澶?/option>
              </select>
              
              {/* 涓婚閫夋嫨 */}
              <select
                value={theme}
                onChange={(e) => setTheme(e?.target.value as ChartTheme)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">娴呰壊涓婚</option>
                <option value="dark">娣辫壊涓婚</option>
                <option value="colorful">褰╄壊涓婚</option>
                <option value="gradient">娓愬彉涓婚</option>
                <option value="minimal">鏋佺畝涓婚</option>
              </select>
              
              {/* 鑷姩鍒锋柊 */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm ${
                  autoRefresh 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span>鑷姩鍒锋柊</span>
              </button>
              
              {/* 鍏ㄥ睆鎸夐挳 */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title={isFullscreen ? '閫€鍑哄叏灞? : '鍏ㄥ睆'}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              
              {/* 璁剧疆鎸夐挳 */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="璁剧疆"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI鎸囨爣鍗＄墖 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {kpiMetrics.map(metric => renderKPICard(metric))}
        </div>

        {/* 涓诲浘琛ㄥ尯鍩?*/}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 涓氬姟瓒嬪娍鍥?*/}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">涓氬姟瓒嬪娍</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportChart('business-trend', 'png')}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title="瀵煎嚭"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => updateChartData()}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title="鍒锋柊"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-80">
              {renderChart('business-trend', 'line', getMainChartData())}
            </div>
          </div>

          {/* 鎬ц兘鐩戞帶鍥?*/}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">鎬ц兘鐩戞帶</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportChart('performance', 'png')}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title="瀵煎嚭"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => updateChartData()}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title="鍒锋柊"
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
                      text: '鐧惧垎姣?(%)',
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
                      text: '鏁板€?,
                      color: '#6B7280'
                    }
                  }
                }
              })}
            </div>
          </div>
        </div>

        {/* 娆¤鍥捐〃鍖哄煙 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* 鍒嗙被缁熻 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">鍒嗙被缁熻</h3>
              <button
                onClick={() => exportChart('category', 'png')}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="瀵煎嚭"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            <div className="h-64">
              {renderChart('category', 'doughnut', getCategoryChartData())}
            </div>
          </div>

          {/* 鐢ㄦ埛鍒嗘瀽 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">鐢ㄦ埛鍒嗘瀽</h3>
              <button
                onClick={() => exportChart('user-analytics', 'png')}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="瀵煎嚭"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            <div className="h-64">
              {renderChart('user-analytics', 'radar', getUserAnalyticsData())}
            </div>
          </div>

          {/* 鍦扮悊鍒嗗竷 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">鍦扮悊鍒嗗竷</h3>
              <button
                onClick={() => exportChart('geographic', 'png')}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="瀵煎嚭"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            <div className="h-64">
              {renderChart('geographic', 'bar', getGeographicData())}
            </div>
          </div>
        </div>

        {/* 娣峰悎鍥捐〃 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">缁煎悎鍒嗘瀽</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`px-3 py-1 rounded text-sm ${
                  compareMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                } transition-colors`}
              >
                瀵规瘮妯″紡
              </button>
              <button
                onClick={() => exportChart('mixed', 'png')}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="瀵煎嚭"
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
                    callback: function(value: unknown) {
                      return '楼' + value?.toLocaleString('zh-CN');
                    }
                  },
                  title: {
                    display: true,
                    text: '閿€鍞',
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
                    callback: function(value: unknown) {
                      return value + '%';
                    }
                  },
                  title: {
                    display: true,
                    text: '澧為暱鐜?,
                    color: '#6B7280'
                  }
                }
              }
            })}
          </div>
        </div>

        {/* 璁剧疆闈㈡澘 */}
        {showSettings && (
          <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-50 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">鍥捐〃璁剧疆</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 瀵煎嚭璁剧疆 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">瀵煎嚭璁剧疆</h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">瀵煎嚭鏍煎紡</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e?.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="png">PNG鍥剧墖</option>
                    <option value="jpg">JPG鍥剧墖</option>
                    <option value="svg">SVG鐭㈤噺鍥?/option>
                    <option value="csv">CSV鏁版嵁</option>
                  </select>
                </div>
              </div>
              
              {/* 缂╂斁璁剧疆 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">缂╂斁璁剧疆</h3>
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
              
              {/* 鏁版嵁婧愯缃?*/}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">鏁版嵁婧?/h3>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">鐢熶骇鐜</span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>
                  <button className="w-full px-4 py-2 text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">娴嬭瘯鐜</span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>
                </div>
              </div>
              
              {/* 蹇嵎鎿嶄綔 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">蹇嵎鎿嶄綔</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      updateChartData();
                      toast.success('鎵€鏈夊浘琛ㄥ凡鍒锋柊');
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    鍒锋柊鎵€鏈夊浘琛?
                  </button>
                  <button
                    onClick={() => {
                      // 瀵煎嚭鎵€鏈夊浘琛?
                      toast('鎵归噺瀵煎嚭鍔熻兘寮€鍙戜腑');
                    }}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    瀵煎嚭鎵€鏈夊浘琛?
                  </button>
                  <button
                    onClick={() => {
                      // 閲嶇疆璁剧疆
                      setTheme('colorful');
                      setTimeRange('24h');
                      setZoomLevel(100);
                      toast.success('璁剧疆宸查噸缃?);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    閲嶇疆璁剧疆
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

// 瀵煎叆XCircle缁勪欢锛岃ˉ鍏呯己澶辩殑瀵煎叆
import { XCircle } from 'lucide-react';

export default Charts;
