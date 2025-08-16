import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Database, Globe, Server, Wifi } from 'lucide-react';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  value: string;
  description: string;
  icon: React.ReactNode;
}

interface SystemHealthCheckProps {
  className?: string;
}

const SystemHealthCheck: React.FC<SystemHealthCheckProps> = ({ className = '' }) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    
    try {
      onClick?.(event);
    } catch (error) {
      console.error('Click handler error:', error);
      setError('操作失败，请重试');
    }
  }, [disabled, loading, onClick]);
  
  const handleChange = useCallback((newValue: any) => {
    updateState({ value: newValue, touched: true, error: null });
    
    try {
      onChange?.(newValue);
    } catch (error) {
      console.error('Change handler error:', error);
      updateState({ error: '值更新失败' });
    }
  }, [onChange, updateState]);
  
  const handleFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: true });
    onFocus?.(event);
  }, [onFocus, updateState]);
  
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: false });
    onBlur?.(event);
  }, [onBlur, updateState]);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const checkSystemHealth = async () => {
      setLoading(true);
      try {
        // 模拟健康检查
        await new Promise(resolve => setTimeout(resolve, 1000));

        const healthMetrics: HealthMetric[] = [
          {
            name: '数据库连接',
            status: 'healthy',
            value: '正常',
            description: '数据库响应时间 < 100ms',
            icon: <Database className="w-5 h-5" />
          },
          {
            name: 'API 服务',
            status: 'healthy',
            value: '运行中',
            description: '所有 API 端点正常响应',
            icon: <Server className="w-5 h-5" />
          },
          {
            name: '网络连接',
            status: 'healthy',
            value: '稳定',
            description: '网络延迟 < 50ms',
            icon: <Wifi className="w-5 h-5" />
          },
          {
            name: '外部服务',
            status: 'warning',
            value: '部分异常',
            description: '某些第三方服务响应较慢',
            icon: <Globe className="w-5 h-5" />
          },
          {
            name: '系统负载',
            status: 'healthy',
            value: '正常',
            description: 'CPU 使用率 < 70%',
            icon: <Activity className="w-5 h-5" />
          }
        ];

        setMetrics(healthMetrics);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('健康检查失败:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // 每30秒检查一次

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const overallStatus = metrics.some(m => m.status === 'error') ? 'error' :
                       metrics.some(m => m.status === 'warning') ? 'warning' : 'healthy';

  if (loading) {
    
        return (
      <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 ${className
      }`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-300">检查系统健康状态...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">系统健康检查</h3>
          {getStatusIcon(overallStatus)}
        </div>
        <div className="text-sm text-gray-400">
          最后更新: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={getStatusColor(metric.status)}>
                  {metric.icon}
                </div>
                <span className="font-medium text-white">{metric.name}</span>
              </div>
              {getStatusIcon(metric.status)}
            </div>
            <div className={`text-sm font-medium ${getStatusColor(metric.status)}`}>
              {metric.value}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {metric.description}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-700/20 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-white">系统状态总览</span>
        </div>
        <div className="text-sm text-gray-300">
          {overallStatus === 'healthy' && '所有系统组件运行正常'}
          {overallStatus === 'warning' && '系统运行正常，但有部分组件需要关注'}
          {overallStatus === 'error' && '检测到系统异常，请立即处理'}
        </div>
      </div>
    </div>
  );
};

export default SystemHealthCheck;
