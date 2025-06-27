import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Server, Wifi } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'checking';
  message: string;
  details?: any;
  lastCheck?: string;
}

interface SystemHealth {
  database: HealthStatus;
  api: HealthStatus;
  network: HealthStatus;
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

const SystemHealthCheck: React.FC<{ 
  showDetails?: boolean; 
  autoRefresh?: boolean;
  refreshInterval?: number;
}> = ({ 
  showDetails = false, 
  autoRefresh = true,
  refreshInterval = 30000 // 30秒
}) => {
  const [health, setHealth] = useState<SystemHealth>({
    database: { status: 'checking', message: '检查中...' },
    api: { status: 'checking', message: '检查中...' },
    network: { status: 'checking', message: '检查中...' },
    overall: 'unhealthy'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    
    try {
      // 检查API健康状态
      const apiHealth = await checkAPIHealth();
      
      // 检查数据库健康状态
      const dbHealth = await checkDatabaseHealth();
      
      // 检查网络连接
      const networkHealth = await checkNetworkHealth();

      // 计算总体健康状态
      const overall = calculateOverallHealth(apiHealth, dbHealth, networkHealth);

      setHealth({
        database: dbHealth,
        api: apiHealth,
        network: networkHealth,
        overall
      });
    } catch (error) {
      console.error('健康检查失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const checkAPIHealth = async (): Promise<HealthStatus> => {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'healthy',
          message: 'API服务正常',
          details: data,
          lastCheck: new Date().toLocaleTimeString()
        };
      } else {
        return {
          status: 'unhealthy',
          message: `API服务异常 (${response.status})`,
          lastCheck: new Date().toLocaleTimeString()
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'API服务无法连接',
        details: error instanceof Error ? error.message : '未知错误',
        lastCheck: new Date().toLocaleTimeString()
      };
    }
  };

  const checkDatabaseHealth = async (): Promise<HealthStatus> => {
    try {
      const response = await fetch('/api/admin/system/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.database?.status === 'healthy') {
          return {
            status: 'healthy',
            message: '数据库连接正常',
            details: data.data.database.details,
            lastCheck: new Date().toLocaleTimeString()
          };
        } else {
          return {
            status: 'unhealthy',
            message: '数据库连接异常',
            details: data.data?.database?.details,
            lastCheck: new Date().toLocaleTimeString()
          };
        }
      } else {
        return {
          status: 'unhealthy',
          message: '无法获取数据库状态',
          lastCheck: new Date().toLocaleTimeString()
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: '数据库健康检查失败',
        details: error instanceof Error ? error.message : '未知错误',
        lastCheck: new Date().toLocaleTimeString()
      };
    }
  };

  const checkNetworkHealth = async (): Promise<HealthStatus> => {
    try {
      // 检查网络连接
      if (!navigator.onLine) {
        return {
          status: 'unhealthy',
          message: '网络连接断开',
          lastCheck: new Date().toLocaleTimeString()
        };
      }

      // 简单的网络延迟测试
      const start = Date.now();
      await fetch('/api/health', { method: 'HEAD' });
      const latency = Date.now() - start;

      let status: 'healthy' | 'unhealthy' | 'checking' = 'healthy';
      let message = '网络连接正常';

      if (latency > 2000) {
        status = 'unhealthy';
        message = '网络延迟较高';
      } else if (latency > 1000) {
        message = '网络延迟中等';
      }

      return {
        status,
        message,
        details: { latency: `${latency}ms` },
        lastCheck: new Date().toLocaleTimeString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: '网络连接测试失败',
        details: error instanceof Error ? error.message : '未知错误',
        lastCheck: new Date().toLocaleTimeString()
      };
    }
  };

  const calculateOverallHealth = (api: HealthStatus, db: HealthStatus, network: HealthStatus): 'healthy' | 'degraded' | 'unhealthy' => {
    const healthyCount = [api, db, network].filter(h => h.status === 'healthy').length;
    
    if (healthyCount === 3) return 'healthy';
    if (healthyCount >= 2) return 'degraded';
    return 'unhealthy';
  };

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  const getOverallStatusColor = () => {
    switch (health.overall) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  useEffect(() => {
    checkHealth();

    if (autoRefresh) {
      const interval = setInterval(checkHealth, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, refreshInterval]);

  return (
    <div className="space-y-4">
      {/* 总体状态 */}
      <div className={`p-4 rounded-lg border ${getOverallStatusColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {health.overall === 'healthy' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {health.overall === 'degraded' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              {health.overall === 'unhealthy' && <XCircle className="w-5 h-5 text-red-500" />}
            </div>
            <span className="font-medium">
              系统状态: {health.overall === 'healthy' ? '正常' : health.overall === 'degraded' ? '部分异常' : '异常'}
            </span>
          </div>
          <button
            onClick={checkHealth}
            disabled={isRefreshing}
            className="p-1 rounded hover:bg-white/50 transition-colors"
            aria-label={isRefreshing ? "正在刷新系统状态" : "刷新系统状态"}
            title={isRefreshing ? "正在刷新系统状态" : "刷新系统状态"}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 详细状态 */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* API状态 */}
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Server className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">API服务</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(health.api.status)}
              <span className="text-sm text-gray-600">{health.api.message}</span>
            </div>
            {health.api.lastCheck && (
              <p className="text-xs text-gray-400 mt-1">
                最后检查: {health.api.lastCheck}
              </p>
            )}
          </div>

          {/* 数据库状态 */}
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">数据库</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(health.database.status)}
              <span className="text-sm text-gray-600">{health.database.message}</span>
            </div>
            {health.database.lastCheck && (
              <p className="text-xs text-gray-400 mt-1">
                最后检查: {health.database.lastCheck}
              </p>
            )}
          </div>

          {/* 网络状态 */}
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Wifi className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">网络连接</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(health.network.status)}
              <span className="text-sm text-gray-600">{health.network.message}</span>
            </div>
            {health.network.lastCheck && (
              <p className="text-xs text-gray-400 mt-1">
                最后检查: {health.network.lastCheck}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthCheck;
