
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Activity, Cpu, HardDrive, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';

interface SystemResources {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
    available: number;
  };
  network: {
    activeConnections: number;
    bandwidth: {
      upload: number;
      download: number;
    };
  };
  disk: {
    usage: number;
    available: number;
  };
  timestamp: number;
}

interface SystemResourceMonitorProps {
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

const SystemResourceMonitor: React.FC<SystemResourceMonitorProps> = ({
  className = '',
  compact = false,
  showDetails = true
}) => {
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [status, setStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 获取资源信息
  const fetchResources = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/system/resources', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setResources(data.resources);
        setStatus(evaluateStatus(data.resources));
        setError('');
      } else {
        throw new Error(data.message || '获取资源信息失败');
      }
    } catch (err) {
      console.error('获取系统资源失败:', err);
      setError(err instanceof Error ? err.message : '获取资源信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 评估系统状态
  const evaluateStatus = (res: SystemResources): 'healthy' | 'warning' | 'critical' => {
    if (res.cpu.usage > 85 || res.memory.usage > 90 || res.disk.usage > 95) {
      return 'critical';
    }
    if (res.cpu.usage > 70 || res.memory.usage > 75 || res.disk.usage > 85) {
      return 'warning';
    }
    return 'healthy';
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // 格式化百分比
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // 格式化大小
  const formatSize = (bytes: number, unit: string = 'MB') => {
    if (unit === 'GB') {
      return `${(bytes / 1024).toFixed(1)}GB`;
    }
    return `${bytes.toFixed(0)}${unit}`;
  };

  useEffect(() => {
    fetchResources();

    // 每5秒更新一次
    const interval = setInterval(fetchResources, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-800/50 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-500/10 border border-red-500/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-red-400">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="text-sm">资源监控不可用</span>
        </div>
        <p className="text-xs text-red-300 mt-1">{error}</p>
      </div>
    );
  }

  if (!resources) {
    return null;
  }

  if (compact) {
    return (
      <div className={`${getStatusColor(status)} rounded-lg border p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(status)}
            <span className="text-sm font-medium">系统资源</span>
          </div>
          <div className="text-xs">
            CPU: {formatPercentage(resources.cpu.usage)} |
            内存: {formatPercentage(resources.memory.usage)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-400" />
          系统资源监控
        </h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
          <span className="text-sm font-medium capitalize">{status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">{resources.cpu.cores} 核</span>
          </div>
          <div className="text-lg font-bold text-white">
            {formatPercentage(resources.cpu.usage)}
          </div>
          <div className="text-xs text-gray-400">CPU 使用率</div>
          <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                resources.cpu.usage > 85 ? 'bg-red-500' :
                resources.cpu.usage > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(resources.cpu.usage, 100)}%` }}
            />
          </div>
        </div>

        {/* 内存 */}
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">{formatSize(resources.memory.total)}</span>
          </div>
          <div className="text-lg font-bold text-white">
            {formatPercentage(resources.memory.usage)}
          </div>
          <div className="text-xs text-gray-400">内存使用率</div>
          <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                resources.memory.usage > 90 ? 'bg-red-500' :
                resources.memory.usage > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(resources.memory.usage, 100)}%` }}
            />
          </div>
        </div>

        {/* 网络 */}
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <Wifi className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">{resources.network.activeConnections}</span>
          </div>
          <div className="text-lg font-bold text-white">
            {resources.network.bandwidth.download.toFixed(1)}
          </div>
          <div className="text-xs text-gray-400">下载 Mbps</div>
          <div className="text-xs text-gray-500 mt-1">
            上传: {resources.network.bandwidth.upload.toFixed(1)} Mbps
          </div>
        </div>

        {/* 磁盘 */}
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <HardDrive className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-400">{formatSize(resources.disk.available, 'GB')}</span>
          </div>
          <div className="text-lg font-bold text-white">
            {formatPercentage(resources.disk.usage)}
          </div>
          <div className="text-xs text-gray-400">磁盘使用率</div>
          <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                resources.disk.usage > 95 ? 'bg-red-500' :
                resources.disk.usage > 85 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(resources.disk.usage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 flex items-center justify-between">
            <span>最后更新: {new Date(resources.timestamp).toLocaleTimeString()}</span>
            <span>负载平均: {resources.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemResourceMonitor;
