import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
}

interface SystemResource {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [systemResources, setSystemResources] = useState<SystemResource>({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const generateMetrics = useCallback((): PerformanceMetric[] => {
    return [
      {
        id: 'response-time',
        name: 'Response Time',
        value: Math.floor(Math.random() * 200) + 50,
        unit: 'ms',
        threshold: 200,
        status: Math.random() > 0.7 ? 'warning' : 'good',
        trend: Math.random() > 0.5 ? 'up' : 'down',
        icon: Clock,
        color: 'blue'
      },
      {
        id: 'throughput',
        name: 'Throughput',
        value: Math.floor(Math.random() * 50) + 20,
        unit: 'req/s',
        threshold: 100,
        status: 'good',
        trend: 'stable',
        icon: Zap,
        color: 'green'
      },
      {
        id: 'error-rate',
        name: 'Error Rate',
        value: Math.random() * 5,
        unit: '%',
        threshold: 5,
        status: Math.random() > 0.8 ? 'critical' : 'good',
        trend: Math.random() > 0.6 ? 'down' : 'up',
        icon: AlertTriangle,
        color: 'red'
      },
      {
        id: 'active-users',
        name: 'Active Users',
        value: Math.floor(Math.random() * 500) + 100,
        unit: 'users',
        threshold: 1000,
        status: 'good',
        trend: 'up',
        icon: Activity,
        color: 'purple'
      }
    ];
  }, []);

  const updateSystemResources = useCallback(() => {
    setSystemResources({
      cpu: Math.random() * 80 + 10,
      memory: Math.random() * 70 + 20,
      disk: Math.random() * 60 + 15,
      network: Math.random() * 50 + 10
    });
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isMonitoring) {
      interval = setInterval(() => {
        setMetrics(generateMetrics());
        updateSystemResources();
        setLastUpdate(new Date());
      }, 2000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring, generateMetrics, updateSystemResources]);

  useEffect(() => {
    // Initialize with default metrics
    setMetrics(generateMetrics());
    updateSystemResources();
  }, [generateMetrics, updateSystemResources]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getResourceColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') {
      return `${value.toFixed(1)}${unit}`;
    }
    return `${Math.round(value)} ${unit}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Performance Monitor</h2>
            <p className="text-sm text-gray-600">Real-time system performance metrics</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              isMonitoring 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}</span>
          </button>
          <button
            onClick={() => {
              setMetrics(generateMetrics());
              updateSystemResources();
              setLastUpdate(new Date());
            }}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <metric.icon className={`w-5 h-5 text-${metric.color}-600`} />
                <span className="font-medium text-gray-900">{metric.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(metric.status)}
                {getTrendIcon(metric.trend)}
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatValue(metric.value, metric.unit)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(metric.status)}`}>
                {metric.status.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">
                Threshold: {formatValue(metric.threshold, metric.unit)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* System Resources */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">System Resources</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-red-600" />
              <span className="font-medium text-gray-900">CPU Usage</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getResourceColor(systemResources.cpu)}`}
                style={{ width: `${systemResources.cpu}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{systemResources.cpu.toFixed(1)}%</span>
              <span className="text-gray-500">100%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900">Memory Usage</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getResourceColor(systemResources.memory)}`}
                style={{ width: `${systemResources.memory}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{systemResources.memory.toFixed(1)}%</span>
              <span className="text-gray-500">100%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-gray-900">Disk Usage</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getResourceColor(systemResources.disk)}`}
                style={{ width: `${systemResources.disk}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{systemResources.disk.toFixed(1)}%</span>
              <span className="text-gray-500">100%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Network className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-900">Network Usage</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getResourceColor(systemResources.network)}`}
                style={{ width: `${systemResources.network}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{systemResources.network.toFixed(1)}%</span>
              <span className="text-gray-500">100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-6">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
        </div>
        
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Performance chart would be rendered here</p>
            <p className="text-sm text-gray-400">Showing metrics over time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
