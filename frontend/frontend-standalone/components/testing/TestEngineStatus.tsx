/**
 * 测试引擎状态管理组件
 * 提供所有测试引擎的状态监控、配置管理和执行控制
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {Activity, AlertCircle, BarChart3, Clock, Globe, Loader, Pause, Play, RefreshCw, Settings, Shield, Square, Wifi, XCircle, Zap, Server, Terminal, Monitor} from 'lucide-react';
import {Bar, Doughnut} from 'react-chartjs-2';
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
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 测试引擎类型定义
interface TestEngine {
  id: string;
  name: string;
  type: 'performance' | 'security' | 'seo' | 'api' | 'stress' | 'compatibility' | 'ux' | 'database';
  status: 'running' | 'idle' | 'error' | 'maintenance' | 'starting' | 'stopping';
  version: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  capabilities: string[];
  config: {
    maxConcurrent: number;
    timeout: number;
    retryAttempts: number;
    priority: number;
  };
  metrics: {
    totalTests: number;
    successRate: number;
    avgExecutionTime: number;
    lastExecuted?: Date;
    queueSize: number;
    activeTests: number;
  };
  resources: {
    cpu: number;
    memory: number;
    threads: number;
    connections: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    uptime: number;
    errors: number;
    warnings: number;
  };
}

interface TestQueue {
  id: string;
  engineId: string;
  name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTime?: number;
  result?: unknown;
  error?: string;
}

interface EngineConfig {
  engineId: string;
  settings: {
    enabled: boolean;
    autoStart: boolean;
    maxConcurrent: number;
    timeout: number;
    retryAttempts: number;
    priority: number;
    resourceLimits: {
      maxCpu: number;
      maxMemory: number;
      maxThreads: number;
    };
  };
}

const TestEngineStatus: React.FC = () => {
  // 状态管理
  const [engines, setEngines] = useState<TestEngine[]>([]);
  const [testQueue, setTestQueue] = useState<TestQueue[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<TestEngine | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [engineConfigs, setEngineConfigs] = useState<Map<string, EngineConfig>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detailed'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // WebSocket和定时器引用
  const wsRef = useRef<WebSocket | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  // 初始化测试引擎数据
  const initializeEngines = (): TestEngine[] => {
    return [
      {
        id: 'engine_performance',
        name: '性能测试引擎',
        type: 'performance',
        status: 'running',
        version: '2.1.0',
        description: '基于Lighthouse的性能分析引擎',
        icon: Zap,
        color: 'text-yellow-500',
        capabilities: ['Core Web Vitals', 'Lighthouse审计', '性能评分', '资源分析'],
        config: {
          maxConcurrent: 5,
          timeout: 60000,
          retryAttempts: 3,
          priority: 1
        },
        metrics: {
          totalTests: 1523,
          successRate: 98.5,
          avgExecutionTime: 12.5,
          lastExecuted: new Date(Date.now() - 5 * 60000),
          queueSize: 3,
          activeTests: 2
        },
        resources: {
          cpu: 45,
          memory: 62,
          threads: 8,
          connections: 15
        },
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          uptime: 99.9,
          errors: 2,
          warnings: 5
        }
      },
      {
        id: 'engine_security',
        name: '安全测试引擎',
        type: 'security',
        status: 'running',
        version: '1.8.2',
        description: 'OWASP标准安全漏洞扫描引擎',
        icon: Shield,
        color: 'text-red-500',
        capabilities: ['漏洞扫描', 'SQL注入检测', 'XSS检测', 'CSRF检测'],
        config: {
          maxConcurrent: 3,
          timeout: 120000,
          retryAttempts: 2,
          priority: 2
        },
        metrics: {
          totalTests: 892,
          successRate: 95.2,
          avgExecutionTime: 25.8,
          lastExecuted: new Date(Date.now() - 10 * 60000),
          queueSize: 5,
          activeTests: 1
        },
        resources: {
          cpu: 68,
          memory: 45,
          threads: 12,
          connections: 8
        },
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          uptime: 98.5,
          errors: 5,
          warnings: 12
        }
      },
      {
        id: 'engine_seo',
        name: 'SEO分析引擎',
        type: 'seo',
        status: 'idle',
        version: '1.5.0',
        description: '搜索引擎优化分析和建议引擎',
        icon: Globe,
        color: 'text-blue-500',
        capabilities: ['元标签分析', '关键词密度', '站点地图检查', '结构化数据'],
        config: {
          maxConcurrent: 10,
          timeout: process.env.REQUEST_TIMEOUT || 30000,
          retryAttempts: 3,
          priority: 3
        },
        metrics: {
          totalTests: 3421,
          successRate: 99.1,
          avgExecutionTime: 8.2,
          lastExecuted: new Date(Date.now() - 30 * 60000),
          queueSize: 0,
          activeTests: 0
        },
        resources: {
          cpu: 12,
          memory: 25,
          threads: 4,
          connections: 5
        },
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          uptime: 99.99,
          errors: 0,
          warnings: 1
        }
      },
      {
        id: 'engine_api',
        name: 'API测试引擎',
        type: 'api',
        status: 'running',
        version: '2.0.1',
        description: 'RESTful和GraphQL API测试引擎',
        icon: Terminal,
        color: 'text-green-500',
        capabilities: ['端点测试', '响应验证', '性能基准', '契约测试'],
        config: {
          maxConcurrent: 20,
          timeout: 10000,
          retryAttempts: 5,
          priority: 1
        },
        metrics: {
          totalTests: 8932,
          successRate: 97.8,
          avgExecutionTime: 3.5,
          lastExecuted: new Date(Date.now() - 2 * 60000),
          queueSize: 12,
          activeTests: 5
        },
        resources: {
          cpu: 35,
          memory: 40,
          threads: 16,
          connections: 50
        },
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          uptime: 99.5,
          errors: 3,
          warnings: 8
        }
      },
      {
        id: 'engine_stress',
        name: '压力测试引擎',
        type: 'stress',
        status: 'maintenance',
        version: '1.9.5',
        description: '高并发负载和压力测试引擎',
        icon: BarChart3,
        color: 'text-purple-500',
        capabilities: ['负载测试', '并发测试', '峰值测试', '持续压力'],
        config: {
          maxConcurrent: 1,
          timeout: process.env.REQUEST_TIMEOUT || 300000,
          retryAttempts: 1,
          priority: 4
        },
        metrics: {
          totalTests: 234,
          successRate: 92.3,
          avgExecutionTime: 180.5,
          lastExecuted: new Date(Date.now() - 2 * 3600000),
          queueSize: 2,
          activeTests: 0
        },
        resources: {
          cpu: 0,
          memory: 0,
          threads: 0,
          connections: 0
        },
        health: {
          status: 'unhealthy',
          lastCheck: new Date(),
          uptime: 95.2,
          errors: 15,
          warnings: 23
        }
      },
      {
        id: 'engine_compatibility',
        name: '兼容性测试引擎',
        type: 'compatibility',
        status: 'starting',
        version: '1.3.2',
        description: '跨浏览器和设备兼容性测试引擎',
        icon: Monitor,
        color: 'text-indigo-500',
        capabilities: ['浏览器测试', '设备模拟', '响应式测试', 'PWA检测'],
        config: {
          maxConcurrent: 8,
          timeout: 45000,
          retryAttempts: 2,
          priority: 3
        },
        metrics: {
          totalTests: 1567,
          successRate: 96.4,
          avgExecutionTime: 15.7,
          queueSize: 4,
          activeTests: 0
        },
        resources: {
          cpu: 20,
          memory: 35,
          threads: 6,
          connections: 10
        },
        health: {
          status: 'degraded',
          lastCheck: new Date(),
          uptime: 97.8,
          errors: 7,
          warnings: 15
        }
      }
    ];
  };

  // 初始化测试队列
  const initializeQueue = (): TestQueue[] => {
    const priorities: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
    const statuses: TestQueue['status'][] = ['queued', 'running', 'completed', 'failed'];
    
    return Array.from({ length: 20 }, (_, i) => ({
      id: `test_${i + 1}`,
      engineId: engines[Math.floor(Math.random() * engines.length)]?.id || 'engine_performance',
      name: `测试任务 ${i + 1}`,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status: i < 5 ? 'running' : i < 10 ? 'queued' : statuses[Math.floor(Math.random() * statuses.length)],
      progress: i < 5 ? Math.random() * 100 : i < 10 ? 0 : 100,
      createdAt: new Date(Date.now() - Math.random() * 3600000),
      startedAt: i < 10 ? new Date(Date.now() - Math.random() * 600000) : undefined,
      completedAt: i >= 10 ? new Date(Date.now() - Math.random() * 300000) : undefined,
      estimatedTime: Math.floor(Math.random() * 300)
    }));
  };

  // 初始化数据
  useEffect(() => {
    const initialEngines = initializeEngines();
    setEngines(initialEngines);
    setTestQueue(initializeQueue());
    
    // 初始化配置
    const configs = new Map<string, EngineConfig>();
    initialEngines.forEach(engine => {
      configs.set(engine.id, {
        engineId: engine.id,
        settings: {
          enabled: engine.status !== 'maintenance',
          autoStart: true,
          maxConcurrent: engine.config.maxConcurrent,
          timeout: engine.config.timeout,
          retryAttempts: engine.config.retryAttempts,
          priority: engine.config.priority,
          resourceLimits: {
            maxCpu: 80,
            maxMemory: 1024,
            maxThreads: 32
          }
        }
      });
    });
    setEngineConfigs(configs);
  }, []);

  // WebSocket连接
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(`ws://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/engines`);
      
      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({ type: 'subscribe', channels: ['engines', 'queue'] }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        
        // 自动重连
        if (autoRefresh) {
          setTimeout(connectWebSocket, 5000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  }, [autoRefresh]);

  // 处理WebSocket消息
  const handleWebSocketMessage = (data: unknown) => {
    switch (data.type) {
      case 'engine_update':
        updateEngine(data.engineId, data.update);
        break;
      case 'queue_update':
        updateQueue(data.queue);
        break;
      case 'engine_health':
        updateEngineHealth(data.engineId, data.health);
        break;
      default:
    }
  };

  // 更新引擎状态
  const updateEngine = (engineId: string, update: Partial<TestEngine>) => {
    setEngines(prev => prev.map(engine => 
      engine.id === engineId ? { ...engine, ...update } : engine
    ));
  };

  // 更新队列
  const updateQueue = (newQueue: TestQueue[]) => {
    setTestQueue(newQueue);
  };

  // 更新引擎健康状态
  const updateEngineHealth = (engineId: string, health: TestEngine['health']) => {
    setEngines(prev => prev.map(engine => 
      engine.id === engineId ? { ...engine, health } : engine
    ));
  };

  // 模拟数据更新
  const simulateDataUpdate = useCallback(() => {
    // 更新引擎资源使用
    setEngines(prev => prev.map(engine => ({
      ...engine,
      resources: {
        cpu: Math.max(0, Math.min(100, engine.resources.cpu + (Math.random() - 0.5) * 20)),
        memory: Math.max(0, Math.min(100, engine.resources.memory + (Math.random() - 0.5) * 15)),
        threads: engine.resources.threads,
        connections: Math.max(0, engine.resources.connections + Math.floor((Math.random() - 0.5) * 5))
      },
      metrics: {
        ...engine.metrics,
        activeTests: Math.max(0, Math.min(engine.config.maxConcurrent, 
          engine.metrics.activeTests + Math.floor((Math.random() - 0.5) * 3))),
        queueSize: Math.max(0, engine.metrics.queueSize + Math.floor((Math.random() - 0.5) * 2))
      }
    })));

    // 更新测试队列进度
    setTestQueue(prev => prev.map(test => {
      if (test.status === 'running' && test.progress < 100) {
        const newProgress = Math.min(100, test.progress + Math.random() * 10);
        if (newProgress >= 100) {
          return {
            ...test,
            progress: 100,
            status: Math.random() > 0.1 ? 'completed' : 'failed',
            completedAt: new Date()
          };
        }
        return { ...test, progress: newProgress };
      }
      return test;
    }));
  }, []);

  // 启动模拟更新
  useEffect(() => {
    if (autoRefresh && !isConnected) {
      refreshIntervalRef.current = setInterval(simulateDataUpdate, 2000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, isConnected, simulateDataUpdate]);

  // 控制引擎
  const controlEngine = (engineId: string, action: 'start' | 'stop' | 'restart' | 'pause') => {
    const engine = engines.find(e => e.id === engineId);
    if (!engine) return;

    let newStatus: TestEngine['status'];
    let message: string;

    switch (action) {
      case 'start':
        newStatus = 'starting';
        message = `正在启动${engine.name}...`;
        setTimeout(() => updateEngine(engineId, { status: 'running' }), 2000);
        break;
      case 'stop':
        newStatus = 'stopping';
        message = `正在停止${engine.name}...`;
        setTimeout(() => updateEngine(engineId, { status: 'idle' }), 2000);
        break;
      case 'restart':
        newStatus = 'starting';
        message = `正在重启${engine.name}...`;
        updateEngine(engineId, { status: 'stopping' });
        setTimeout(() => updateEngine(engineId, { status: 'starting' }), 1000);
        setTimeout(() => updateEngine(engineId, { status: 'running' }), 3000);
        break;
      case 'pause':
        newStatus = 'idle';
        message = `已暂停${engine.name}`;
        break;
      default:
        return;
    }

    updateEngine(engineId, { status: newStatus });
    toast.success(message);

    // 发送WebSocket命令
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'engine_control',
        engineId,
        action
      }));
    }
  };

  // 保存引擎配置
  const _saveEngineConfig = (engineId: string, config: EngineConfig['settings']) => {
    const newConfig: EngineConfig = { engineId, settings: config };
    setEngineConfigs(prev => new Map(prev).set(engineId, newConfig));
    
    // 更新引擎配置
    updateEngine(engineId, {
      config: {
        maxConcurrent: config.maxConcurrent,
        timeout: config.timeout,
        retryAttempts: config.retryAttempts,
        priority: config.priority
      }
    });

    toast.success('配置已保存');
    setShowConfig(false);
  };

  // 清空队列
  const clearQueue = (engineId?: string) => {
    if (engineId) {
      setTestQueue(prev => prev.filter(test => test.engineId !== engineId));
      toast.success('队列已清空');
    } else {
      setTestQueue([]);
      toast.success('所有队列已清空');
    }
  };

  // 筛选引擎
  const filteredEngines = engines.filter(engine => {
    const matchesSearch = searchTerm === '' || 
      engine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      engine.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || engine.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // 获取引擎统计数据
  const getEngineStats = () => {
    const total = engines.length;
    const running = engines.filter(e => e.status === 'running').length;
    const idle = engines.filter(e => e.status === 'idle').length;
    const error = engines.filter(e => e.status === 'error').length;
    const maintenance = engines.filter(e => e.status === 'maintenance').length;

    return { total, running, idle, error, maintenance };
  };

  // 获取队列统计
  const getQueueStats = () => {
    const total = testQueue.length;
    const running = testQueue.filter(t => t.status === 'running').length;
    const queued = testQueue.filter(t => t.status === 'queued').length;
    const completed = testQueue.filter(t => t.status === 'completed').length;
    const failed = testQueue.filter(t => t.status === 'failed').length;

    return { total, running, queued, completed, failed };
  };

  // 获取状态颜色
  const getStatusColor = (status: TestEngine['status']) => {
    switch (status) {
      case 'running': return 'text-green-500 bg-green-100';
      case 'idle': return 'text-gray-500 bg-gray-100';
      case 'error': return 'text-red-500 bg-red-100';
      case 'maintenance': return 'text-yellow-500 bg-yellow-100';
      case 'starting': return 'text-blue-500 bg-blue-100';
      case 'stopping': return 'text-orange-500 bg-orange-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: TestEngine['status']) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4" />;
      case 'idle': return <Pause className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      case 'starting': return <Loader className="h-4 w-4 animate-spin" />;
      case 'stopping': return <Square className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: TestQueue['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 获取健康状态颜色
  const _getHealthColor = (status: TestEngine['health']['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'unhealthy': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const stats = getEngineStats();
  const queueStats = getQueueStats();

  // 图表数据
  const resourceChartData = {
    labels: filteredEngines.map(e => e?.name),
    datasets: [
      {
        label: 'CPU使用率 (%)',
        data: filteredEngines.map(e => e?.resources.cpu),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
      {
        label: '内存使用率 (%)',
        data: filteredEngines.map(e => e?.resources.memory),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      }
    ]
  };

  const statusChartData = {
    labels: ['运行中', '空闲', '错误', '维护'],
    datasets: [{
      data: [stats.running, stats.idle, stats.error, stats.maintenance],
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',
        'rgba(156, 163, 175, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)'
      ],
      borderWidth: 0
    }]
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Server className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">测试引擎管理</h1>
                <p className="text-sm text-gray-600">监控和管理所有测试引擎的运行状态</p>
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

              {/* 自动刷新 */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  autoRefresh 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">自动刷新</span>
              </button>

              {/* 视图切换 */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : ''
                  } transition-all`}
                >
                  网格
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : ''
                  } transition-all`}
                >
                  列表
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-1 rounded ${
                    viewMode === 'detailed' ? 'bg-white shadow-sm' : ''
                  } transition-all`}
                >
                  详细
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总引擎数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Server className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">运行中</p>
                <p className="text-2xl font-bold text-green-600">{stats.running}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">队列任务</p>
                <p className="text-2xl font-bold text-blue-600">{queueStats.queued}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">活跃测试</p>
                <p className="text-2xl font-bold text-purple-600">{queueStats.running}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="搜索引擎..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e?.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e?.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有状态</option>
              <option value="running">运行中</option>
              <option value="idle">空闲</option>
              <option value="error">错误</option>
              <option value="maintenance">维护</option>
            </select>
          </div>
        </div>

        {/* 引擎视图 */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {filteredEngines.map((engine) => (
              <div key={engine.id} className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* 引擎头部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-gray-100 ${engine.color}`}>
                        <engine.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{engine.name}</h3>
                        <p className="text-xs text-gray-500">v{engine.version}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(engine.status)}`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(engine.status)}
                        <span>{engine.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* 指标 */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CPU使用率</span>
                      <span className="font-medium">{engine.resources.cpu.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          engine.resources.cpu > 80 ? 'bg-red-500' : 
                          engine.resources.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${engine.resources.cpu}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">内存使用率</span>
                      <span className="font-medium">{engine.resources.memory.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          engine.resources.memory > 80 ? 'bg-red-500' : 
                          engine.resources.memory > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${engine.resources.memory}%` }}
                      />
                    </div>
                  </div>

                  {/* 统计信息 */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-600">活跃测试</p>
                      <p className="font-semibold">{engine.metrics.activeTests}/{engine.config.maxConcurrent}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-600">队列长度</p>
                      <p className="font-semibold">{engine.metrics.queueSize}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-600">成功率</p>
                      <p className="font-semibold">{engine.metrics.successRate}%</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-600">平均耗时</p>
                      <p className="font-semibold">{engine.metrics.avgExecutionTime}s</p>
                    </div>
                  </div>

                  {/* 控制按钮 */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      {engine.status === 'running' ? (
                        <>
                          <button
                            onClick={() => controlEngine(engine.id, 'pause')}
                            className="p-2 text-gray-600 hover:text-yellow-600 transition-colors"
                            title="暂停"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => controlEngine(engine.id, 'stop')}
                            className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                            title="停止"
                          >
                            <Square className="h-4 w-4" />
                          </button>
                        </>
                      ) : engine.status === 'idle' || engine.status === 'error' ? (
                        <button
                          onClick={() => controlEngine(engine.id, 'start')}
                          className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                          title="启动"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      ) : null}
                      
                      <button
                        onClick={() => controlEngine(engine.id, 'restart')}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="重启"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedEngine(engine);
                        setShowConfig(true);
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                      title="配置"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">资源使用情况</h3>
            <Bar
              data={resourceChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom' as const
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
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">引擎状态分布</h3>
            <div className="flex items-center justify-center">
              <div className="w-64">
                <Doughnut
                  data={statusChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'right' as const
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 测试队列 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">测试队列</h3>
              <button
                onClick={() => clearQueue()}
                className="text-sm text-red-600 hover:text-red-700"
              >
                清空所有队列
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testQueue.slice(0, 10).map((test) => (
                <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(test.priority)}`}>
                      {test.priority}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{test.name}</p>
                      <p className="text-xs text-gray-500">
                        引擎: {engines.find(e => e.id === test.engineId)?.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {test.status === 'running' && (
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
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
                    
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      test.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      test.status === 'completed' ? 'bg-green-100 text-green-700' :
                      test.status === 'failed' ? 'bg-red-100 text-red-700' :
                      test.status === 'queued' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {test.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 配置弹窗 */}
        {showConfig && selectedEngine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  配置 {selectedEngine.name}
                </h2>
                <button
                  onClick={() => setShowConfig(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* 基本设置 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">基本设置</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最大并发数
                      </label>
                      <input
                        type="number"
                        defaultValue={selectedEngine.config.maxConcurrent}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        超时时间 (ms)
                      </label>
                      <input
                        type="number"
                        defaultValue={selectedEngine.config.timeout}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        重试次数
                      </label>
                      <input
                        type="number"
                        defaultValue={selectedEngine.config.retryAttempts}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        优先级
                      </label>
                      <select
                        defaultValue={selectedEngine.config.priority}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1">高</option>
                        <option value="2">中</option>
                        <option value="3">低</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 资源限制 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">资源限制</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最大CPU (%)
                      </label>
                      <input
                        type="number"
                        defaultValue="80"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最大内存 (MB)
                      </label>
                      <input
                        type="number"
                        defaultValue="1024"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最大线程数
                      </label>
                      <input
                        type="number"
                        defaultValue="32"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowConfig(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      // 这里应该收集表单数据并保存
                      toast.success('配置已保存');
                      setShowConfig(false);
                    }}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    保存配置
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

export default TestEngineStatus;
