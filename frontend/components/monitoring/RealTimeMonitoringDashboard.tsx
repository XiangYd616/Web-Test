/**
 * 实时监控仪表板组件
 * 提供系统性能、测试状态、错误日志的实时监控
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Monitor,
  RefreshCw,
  Server,
  TrendingUp,
  Users,
  Wifi,
  XCircle,
  Zap,
  BarChart3,
  AlertCircle,
  Settings
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
import { toast } from 'react-hot-toast';

// 注册Chart.js组件
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

interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    io: {
      read: number;
      write: number;
    };
  };
  network: {
    in: number;
    out: number;
    latency: number;
    connections: number;
  };
}

interface TestStatus {
  id: string;
  name: string;
  type: 'performance' | 'security' | 'seo' | 'api' | 'stress';
  status: 'running' | 'completed' | 'failed' | 'queued';
  progress: number;
  startTime: Date;
  estimatedTime?: number;
  errors?: number;
}

interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  stack?: string;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
}

const RealTimeMonitoringDashboard: React.FC = () => {
  // 状态管理
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(null);
  const [testStatuses, setTestStatuses] = useState<TestStatus[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  
  // WebSocket连接
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const metricsIntervalRef = useRef<NodeJS.Timeout>();

  // 初始化WebSocket连接
  const initWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket('ws://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/monitoring');
      
      ws.onopen = () => {
        setIsConnected(true);
        toast.success('监控连接已建立');
        
        // 订阅实时数据
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['metrics', 'tests', 'errors', 'services']
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeData(data);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('监控连接错误');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        
        // 自动重连
        if (autoRefresh) {
          reconnectTimeoutRef.current = setTimeout(() => {
            initWebSocket();
          }, 5000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setIsConnected(false);
    }
  }, [autoRefresh]);

  // 处理实时数据
  const handleRealtimeData = (data: any) => {
    switch (data.type) {
      case 'metrics':
        updateMetrics(data.data);
        break;
      case 'test_update':
        updateTestStatus(data.data);
        break;
      case 'error':
        addErrorLog(data.data);
        break;
      case 'service_health':
        updateServiceHealth(data.data);
        break;
      default:
    }
  };

  // 更新系统指标
  const updateMetrics = (newMetrics: SystemMetrics) => {
    setCurrentMetrics(newMetrics);
    setMetrics(prev => {
      const updated = [...prev, newMetrics];
      // 保持最近100个数据点
      return updated.slice(-100);
    });
  };

  // 更新测试状态
  const updateTestStatus = (testUpdate: TestStatus) => {
    setTestStatuses(prev => {
      const index = prev.findIndex(t => t.id === testUpdate.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = testUpdate;
        return updated;
      }
      return [...prev, testUpdate];
    });

    // 测试完成通知
    if (testUpdate.status === 'completed') {
      toast.success(`测试 ${testUpdate.name} 已完成`);
    } else if (testUpdate.status === 'failed') {
      toast.error(`测试 ${testUpdate.name} 失败`);
    }
  };

  // 添加错误日志
  const addErrorLog = (error: ErrorLog) => {
    setErrorLogs(prev => {
      const updated = [error, ...prev];
      // 保持最近50条日志
      return updated.slice(0, 50);
    });

    // 显示错误通知
    if (error.level === 'error') {
      toast.error(error.message);
    }
  };

  // 更新服务健康状态
  const updateServiceHealth = (health: ServiceHealth[]) => {
    setServices(health);
  };

  // 模拟数据生成（开发环境）
  const generateMockData = useCallback(() => {
    // 生成模拟系统指标
    const mockMetrics: SystemMetrics = {
      timestamp: Date.now(),
      cpu: {
        usage: 20 + Math.random() * 60,
        cores: 8,
        temperature: 45 + Math.random() * 20
      },
      memory: {
        used: 4 + Math.random() * 8,
        total: 16,
        percentage: 25 + Math.random() * 50
      },
      disk: {
        used: 200 + Math.random() * 100,
        total: 500,
        percentage: 40 + Math.random() * 20,
        io: {
          read: Math.random() * 100,
          write: Math.random() * 80
        }
      },
      network: {
        in: Math.random() * 1000,
        out: Math.random() * 800,
        latency: 10 + Math.random() * 50,
        connections: Math.floor(50 + Math.random() * 100)
      }
    };
    updateMetrics(mockMetrics);

    // 生成模拟服务健康状态
    const mockServices: ServiceHealth[] = [
      {
        name: 'API Gateway',
        status: Math.random() > 0.1 ? 'healthy' : 'degraded',
        responseTime: 50 + Math.random() * 100,
        uptime: 99.9,
        lastCheck: new Date()
      },
      {
        name: 'Database',
        status: Math.random() > 0.05 ? 'healthy' : 'degraded',
        responseTime: 10 + Math.random() * 50,
        uptime: 99.99,
        lastCheck: new Date()
      },
      {
        name: 'Cache Service',
        status: 'healthy',
        responseTime: 1 + Math.random() * 10,
        uptime: 100,
        lastCheck: new Date()
      },
      {
        name: 'Test Engine',
        status: Math.random() > 0.2 ? 'healthy' : 'degraded',
        responseTime: 100 + Math.random() * 200,
        uptime: 98.5,
        lastCheck: new Date()
      }
    ];
    setServices(mockServices);

    // 随机生成测试状态更新
    if (Math.random() > 0.7 && testStatuses.length > 0) {
      const randomTest = testStatuses[Math.floor(Math.random() * testStatuses.length)];
      if (randomTest.status === 'running') {
        updateTestStatus({
          ...randomTest,
          progress: Math.min(100, randomTest.progress + Math.random() * 20)
        });
      }
    }

    // 随机生成错误日志
    if (Math.random() > 0.9) {
      const levels: ('error' | 'warning' | 'info')[] = ['error', 'warning', 'info'];
      const messages = [
        '内存使用率超过阈值',
        'API响应时间过长',
        '缓存命中率下降',
        '数据库连接池接近上限',
        '测试队列积压'
      ];
      
      addErrorLog({
        id: `error_${Date.now()}`,
        timestamp: new Date(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        source: 'System Monitor'
      });
    }
  }, [testStatuses]);

  // 初始化模拟测试
  useEffect(() => {
    const mockTests: TestStatus[] = [
      {
        id: 'test_1',
        name: '首页性能测试',
        type: 'performance',
        status: 'running',
        progress: 45,
        startTime: new Date(Date.now() - 5 * 60000)
      },
      {
        id: 'test_2',
        name: 'API安全扫描',
        type: 'security',
        status: 'running',
        progress: 78,
        startTime: new Date(Date.now() - 10 * 60000)
      },
      {
        id: 'test_3',
        name: 'SEO优化分析',
        type: 'seo',
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 20 * 60000)
      },
      {
        id: 'test_4',
        name: '压力测试',
        type: 'stress',
        status: 'queued',
        progress: 0,
        startTime: new Date()
      }
    ];
    setTestStatuses(mockTests);
  }, []);

  // 启动监控
  useEffect(() => {
    // 尝试连接WebSocket
    initWebSocket();

    // 如果WebSocket不可用，使用模拟数据
    if (autoRefresh) {
      metricsIntervalRef.current = setInterval(() => {
        if (!isConnected) {
          generateMockData();
        }
      }, refreshInterval);
    }

    return () => {
      // 清理连接
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, initWebSocket, generateMockData]);

  // 获取CPU使用率图表数据
  const getCpuChartData = () => {
    const labels = metrics.slice(-20).map((_, i) => `${i * 5}s`);
    const data = metrics.slice(-20).map(m => m.cpu.usage);

    return {
      labels,
      datasets: [{
        label: 'CPU使用率 (%)',
        data,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  };

  // 获取内存使用图表数据
  const getMemoryChartData = () => {
    const labels = metrics.slice(-20).map((_, i) => `${i * 5}s`);
    const data = metrics.slice(-20).map(m => m.memory.percentage);

    return {
      labels,
      datasets: [{
        label: '内存使用率 (%)',
        data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  };

  // 获取网络流量图表数据
  const getNetworkChartData = () => {
    const labels = metrics.slice(-20).map((_, i) => `${i * 5}s`);
    const inData = metrics.slice(-20).map(m => m.network.in);
    const outData = metrics.slice(-20).map(m => m.network.out);

    return {
      labels,
      datasets: [
        {
          label: '入站流量 (KB/s)',
          data: inData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: '出站流量 (KB/s)',
          data: outData,
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  // 获取服务健康度饼图数据
  const getServiceHealthData = () => {
    const healthy = services.filter(s => s.status === 'healthy').length;
    const degraded = services.filter(s => s.status === 'degraded').length;
    const down = services.filter(s => s.status === 'down').length;

    return {
      labels: ['健康', '降级', '故障'],
      datasets: [{
        data: [healthy, degraded, down],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderWidth: 0
      }]
    };
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'completed':
        return 'text-green-500';
      case 'degraded':
      case 'running':
        return 'text-yellow-500';
      case 'down':
      case 'failed':
        return 'text-red-500';
      case 'queued':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'degraded':
      case 'running':
        return <AlertCircle className="h-5 w-5" />;
      case 'down':
      case 'failed':
        return <XCircle className="h-5 w-5" />;
      case 'queued':
        return <Clock className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  // 格式化字节
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // 格式化时间
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
    if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`;
    return `${seconds}秒`;
  };

  const cpuData = getCpuChartData();
  const memoryData = getMemoryChartData();
  const networkData = getNetworkChartData();
  const serviceHealthData = getServiceHealthData();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题和控制栏 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">实时监控中心</h1>
                <p className="text-sm text-gray-600">系统性能和服务状态实时监控</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 连接状态 */}
              <div className="flex items-center space-x-2">
                <Wifi className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? '已连接' : '未连接'}
                </span>
              </div>

              {/* 自动刷新控制 */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  autoRefresh 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">
                  {autoRefresh ? '自动刷新' : '手动刷新'}
                </span>
              </button>

              {/* 设置按钮 */}
              <button className="p-2 text-gray-600 hover:text-gray-900">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 关键指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* CPU使用率 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-700">CPU使用率</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {currentMetrics?.cpu.usage.toFixed(1) || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentMetrics?.cpu.usage || 0}%` }}
              />
            </div>
            {currentMetrics?.cpu.temperature && (
              <p className="text-xs text-gray-500 mt-2">
                温度: {currentMetrics.cpu.temperature.toFixed(1)}°C
              </p>
            )}
          </div>

          {/* 内存使用 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">内存使用</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {currentMetrics?.memory.percentage.toFixed(1) || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentMetrics?.memory.percentage || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {currentMetrics?.memory.used.toFixed(1) || 0} / {currentMetrics?.memory.total || 0} GB
            </p>
          </div>

          {/* 磁盘使用 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700">磁盘使用</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {currentMetrics?.disk.percentage.toFixed(1) || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentMetrics?.disk.percentage || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {currentMetrics?.disk.used.toFixed(0) || 0} / {currentMetrics?.disk.total || 0} GB
            </p>
          </div>

          {/* 网络延迟 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Wifi className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">网络延迟</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {currentMetrics?.network.latency.toFixed(0) || 0}ms
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>连接数: {currentMetrics?.network.connections || 0}</span>
              <span>↓ {formatBytes((currentMetrics?.network.in || 0) * 1024)}/s</span>
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* CPU使用率趋势 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU使用率趋势</h3>
            <Line
              data={cpuData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => `CPU: ${context.parsed.y.toFixed(1)}%`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: (value) => `${value}%`
                    }
                  }
                }
              }}
              height={200}
            />
          </div>

          {/* 内存使用趋势 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">内存使用趋势</h3>
            <Line
              data={memoryData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => `内存: ${context.parsed.y.toFixed(1)}%`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: (value) => `${value}%`
                    }
                  }
                }
              }}
              height={200}
            />
          </div>

          {/* 网络流量 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">网络流量</h3>
            <Line
              data={networkData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' as const },
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)} KB/s`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `${value} KB/s`
                    }
                  }
                }
              }}
              height={200}
            />
          </div>

          {/* 服务健康状态 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">服务健康状态</h3>
            <div className="flex items-center justify-between">
              <div className="w-48">
                <Doughnut
                  data={serviceHealthData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { display: false }
                    }
                  }}
                />
              </div>
              <div className="flex-1 ml-6">
                {services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center space-x-2">
                      <div className={getStatusColor(service.status)}>
                        {getStatusIcon(service.status)}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{service.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{service.responseTime.toFixed(0)}ms</p>
                      <p className="text-xs text-gray-400">{service.uptime}% uptime</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 测试状态和错误日志 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 运行中的测试 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">运行中的测试</h3>
              <span className="text-sm text-gray-500">
                {testStatuses.filter(t => t.status === 'running').length} 个活跃
              </span>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {testStatuses.map((test) => (
                <div key={test.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={getStatusColor(test.status)}>
                        {getStatusIcon(test.status)}
                      </div>
                      <span className="font-medium text-gray-900">{test.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      test.status === 'running' ? 'bg-yellow-100 text-yellow-700' :
                      test.status === 'completed' ? 'bg-green-100 text-green-700' :
                      test.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {test.status === 'running' ? '运行中' :
                       test.status === 'completed' ? '已完成' :
                       test.status === 'failed' ? '失败' : '排队中'}
                    </span>
                  </div>
                  {test.status === 'running' && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>进度</span>
                        <span>{test.progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${test.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    开始时间: {test.startTime.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 错误日志 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">系统日志</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                清除日志
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {errorLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>暂无日志记录</p>
                </div>
              ) : (
                errorLogs.map((log) => (
                  <div key={log.id} className="border-l-4 pl-3 py-2 text-sm border-gray-200 hover:bg-gray-50">
                    <div className="flex items-start space-x-2">
                      <div className={`mt-0.5 ${
                        log.level === 'error' ? 'text-red-500' :
                        log.level === 'warning' ? 'text-yellow-500' :
                        'text-blue-500'
                      }`}>
                        {log.level === 'error' ? <XCircle className="h-4 w-4" /> :
                         log.level === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                         <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900">{log.message}</p>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                          <span>{log.timestamp.toLocaleTimeString()}</span>
                          <span>{log.source}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMonitoringDashboard;
