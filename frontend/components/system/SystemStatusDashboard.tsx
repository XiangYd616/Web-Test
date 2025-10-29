/**
 * 系统状态仪表板组件
 * 提供系统健康状态、服务监控、资源使用情况的实时视图
 */

import React, { useState, useEffect, useMemo } from 'react';
import {CheckCircle, XCircle, Settings, RefreshCw, AlertTriangle, Info} from 'lucide-react';
import {Line, Doughnut} from 'react-chartjs-2';
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

// 系统服务接口
interface SystemService {
  id: string;
  name: string;
  description: string;
  status: 'healthy' | 'warning' | 'error' | 'maintenance';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
  version: string;
  dependencies: string[];
  metrics: {
    requests: number;
    errors: number;
    avgResponseTime: number;
  };
}

// 资源使用情况接口
interface ResourceUsage {
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    cached: number;
  };
  disk: {
    used: number;
    total: number;
    io: {
      read: number;
      write: number;
    };
  };
  network: {
    inbound: number;
    outbound: number;
    latency: number;
    connections: number;
  };
}

// 系统告警接口
interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  resolved: boolean;
}

// 性能指标历史接口
interface PerformanceHistory {
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  responseTime: number;
}

interface SystemStatusDashboardProps {
  refreshInterval?: number;
  showAlerts?: boolean;
  showPerformanceHistory?: boolean;
  compactView?: boolean;
  className?: string;
}

const SystemStatusDashboard: React.FC<SystemStatusDashboardProps> = ({
  refreshInterval = 30000, // 30秒刷新一次
  showAlerts = true,
  showPerformanceHistory = true,
  compactView = false,
  className = ''
}) => {
  // 状态管理
  const [services, setServices] = useState<SystemService[]>([]);
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 模拟数据生成
  const generateMockServices = (): SystemService[] => {
    return [
      {
        id: 'web_server',
        name: 'Web服务器',
        description: 'Nginx Web服务器',
        status: 'healthy',
        uptime: 99.9,
        responseTime: 45,
        lastCheck: new Date(),
        version: '1.20.1',
        dependencies: ['database', 'redis'],
        metrics: {
          requests: 15420,
          errors: 12,
          avgResponseTime: 42
        }
      },
      {
        id: 'database',
        name: '数据库服务',
        description: 'PostgreSQL主数据库',
        status: 'healthy',
        uptime: 99.95,
        responseTime: 15,
        lastCheck: new Date(),
        version: '13.7',
        dependencies: [],
        metrics: {
          requests: 8930,
          errors: 3,
          avgResponseTime: 18
        }
      },
      {
        id: 'redis',
        name: '缓存服务',
        description: 'Redis缓存服务器',
        status: 'warning',
        uptime: 98.2,
        responseTime: 2,
        lastCheck: new Date(),
        version: '6.2.6',
        dependencies: [],
        metrics: {
          requests: 45230,
          errors: 45,
          avgResponseTime: 3
        }
      },
      {
        id: 'test_engine',
        name: '测试引擎',
        description: '统一测试执行引擎',
        status: 'healthy',
        uptime: 99.1,
        responseTime: 120,
        lastCheck: new Date(),
        version: '2.1.0',
        dependencies: ['web_server', 'database'],
        metrics: {
          requests: 2340,
          errors: 8,
          avgResponseTime: 135
        }
      },
      {
        id: 'monitoring',
        name: '监控服务',
        description: '系统监控和告警服务',
        status: 'healthy',
        uptime: 99.8,
        responseTime: 25,
        lastCheck: new Date(),
        version: '1.5.2',
        dependencies: ['database'],
        metrics: {
          requests: 3450,
          errors: 2,
          avgResponseTime: 28
        }
      }
    ];
  };

  const generateMockResourceUsage = (): ResourceUsage => {
    return {
      cpu: {
        usage: 45 + Math.random() * 20,
        cores: 8,
        temperature: 55 + Math.random() * 10
      },
      memory: {
        used: 6.2 + Math.random() * 2,
        total: 16,
        cached: 2.1 + Math.random() * 1
      },
      disk: {
        used: 125 + Math.random() * 50,
        total: 500,
        io: {
          read: Math.random() * 100,
          write: Math.random() * 80
        }
      },
      network: {
        inbound: Math.random() * 50,
        outbound: Math.random() * 30,
        latency: 15 + Math.random() * 10,
        connections: 150 + Math.random() * 50
      }
    };
  };

  const generateMockAlerts = (): SystemAlert[] => {
    const now = new Date();
    return [
      {
        id: 'alert_1',
        level: 'warning',
        title: '缓存服务响应延迟',
        message: 'Redis缓存服务响应时间超过阈值',
        timestamp: new Date(now.getTime() - 15 * 60000),
        source: 'redis',
        resolved: false
      },
      {
        id: 'alert_2',
        level: 'info',
        title: '系统更新完成',
        message: '系统安全更新已成功应用',
        timestamp: new Date(now.getTime() - 60 * 60000),
        source: 'system',
        resolved: true
      },
      {
        id: 'alert_3',
        level: 'error',
        title: '磁盘空间不足',
        message: '主磁盘使用率超过80%，建议清理',
        timestamp: new Date(now.getTime() - 30 * 60000),
        source: 'system',
        resolved: false
      }
    ];
  };

  const generateMockPerformanceHistory = (): PerformanceHistory[] => {
    const history: PerformanceHistory[] = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      history.push({
        timestamp: new Date(now.getTime() - i * 60 * 60000),
        cpu: 30 + Math.random() * 40,
        memory: 40 + Math.random() * 30,
        disk: 25 + Math.random() * 15,
        network: 10 + Math.random() * 20,
        responseTime: 20 + Math.random() * 80
      });
    }
    
    return history;
  };

  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setServices(generateMockServices());
        setResourceUsage(generateMockResourceUsage());
        setAlerts(generateMockAlerts());
        setPerformanceHistory(generateMockPerformanceHistory());
        setLastUpdate(new Date());
      } catch (error) {
        console.error('加载系统状态失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setResourceUsage(generateMockResourceUsage());
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // 计算系统整体状态
  const systemOverallStatus = useMemo(() => {
    const errorServices = services.filter(s => s.status === 'error').length;
    const warningServices = services.filter(s => s.status === 'warning').length;
    
    if (errorServices > 0) return 'error';
    if (warningServices > 0) return 'warning';
    return 'healthy';
  }, [services]);

  // 获取状态配置
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
      case 'warning':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle };
      case 'error':
        return { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle };
      case 'maintenance':
        return { color: 'text-blue-600', bg: 'bg-blue-100', icon: Settings };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Info };
    }
  };

  // 渲染资源使用图表
  const renderResourceChart = (label: string, usage: number, total?: number) => {
    const percentage = total ? (usage / total) * 100 : usage;
    const color = percentage > 80 ? '#ef4444' : percentage > 60 ? '#f59e0b' : '#10b981';

    const data = {
      datasets: [{
        data: [percentage, 100 - percentage],
        backgroundColor: [color, '#e5e7eb'],
        borderWidth: 0,
        cutout: '70%'
      }]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    };

    return (
      <div className="relative w-24 h-24">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{Math.round(percentage)}%</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染性能历史图表
  const renderPerformanceChart = () => {
    const data = {
      labels: performanceHistory.map(h => h.timestamp.getHours() + ':00'),
      datasets: [
        {
          label: 'CPU使用率',
          data: performanceHistory.map(h => h.cpu),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false,
          tension: 0.4
        },
        {
          label: '内存使用率',
          data: performanceHistory.map(h => h.memory),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false,
          tension: 0.4
        },
        {
          label: '响应时间',
          data: performanceHistory.map(h => h.responseTime),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.4
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    };

    return <Line data={data} options={options} />;
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">加载系统状态...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 系统概览 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">系统状态</h2>
            <p className="text-sm text-gray-500 mt-1">
              最后更新: {lastUpdate.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-3 py-2 rounded-full ${getStatusConfig(systemOverallStatus).bg}`}>
              {React.createElement(getStatusConfig(systemOverallStatus).icon, {
                className: `h-5 w-5 ${getStatusConfig(systemOverallStatus).color}`
              })}
              <span className={`ml-2 font-medium ${getStatusConfig(systemOverallStatus).color}`}>
                {systemOverallStatus === 'healthy' ? '正常' :
                 systemOverallStatus === 'warning' ? '警告' : '异常'}
              </span>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-md ${autoRefresh ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <RefreshCw className={`h-5 w-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 资源使用概览 */}
        {resourceUsage && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center">
              {renderResourceChart('CPU', resourceUsage.cpu.usage)}
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-900">处理器</p>
                <p className="text-xs text-gray-500">{resourceUsage.cpu.cores} 核心</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              {renderResourceChart('内存', resourceUsage.memory.used, resourceUsage.memory.total)}
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-900">内存</p>
                <p className="text-xs text-gray-500">
                  {resourceUsage.memory.used.toFixed(1)}GB / {resourceUsage.memory.total}GB
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              {renderResourceChart('存储', resourceUsage.disk.used, resourceUsage.disk.total)}
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-900">磁盘</p>
                <p className="text-xs text-gray-500">
                  {resourceUsage.disk.used}GB / {resourceUsage.disk.total}GB
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              {renderResourceChart('网络', resourceUsage.network.inbound + resourceUsage.network.outbound, 100)}
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-900">网络</p>
                <p className="text-xs text-gray-500">
                  延迟: {resourceUsage.network.latency.toFixed(0)}ms
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 服务状态 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">服务状态</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => {
            const statusConfig = getStatusConfig(service.status);
            return (
              <div key={service.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{service.name}</h4>
                  <div className={`p-1 rounded-full ${statusConfig.bg}`}>
                    {React.createElement(statusConfig.icon, {
                      className: `h-4 w-4 ${statusConfig.color}`
                    })}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">运行时间:</span>
                    <span className="font-medium">{service.uptime}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">响应时间:</span>
                    <span className="font-medium">{service.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">版本:</span>
                    <span className="font-medium">{service.version}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 性能历史图表 */}
      {showPerformanceHistory && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">24小时性能趋势</h3>
          <div className="h-64">
            {renderPerformanceChart()}
          </div>
        </div>
      )}

      {/* 系统告警 */}
      {showAlerts && alerts.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近告警</h3>
          <div className="space-y-3">
            {alerts.slice(0, 5).map(alert => {
              const alertConfig = getStatusConfig(alert.level === 'critical' || alert.level === 'error' ? 'error' : 
                                                   alert.level === 'warning' ? 'warning' : 'healthy');
              return (
                <div key={alert.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
                  alert.resolved ? 'bg-gray-50' : alertConfig.bg
                }`}>
                  {React.createElement(alertConfig.icon, {
                    className: `h-5 w-5 ${alertConfig.color} mt-0.5`
                  })}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                      <span className="text-xs text-gray-500">
                        {alert.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className="text-xs text-gray-500">来源: {alert.source}</span>
                      {alert.resolved && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          已解决
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatusDashboard;
