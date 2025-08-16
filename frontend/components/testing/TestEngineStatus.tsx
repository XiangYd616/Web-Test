import React, { useEffect, useState } from 'react';

import {AlertTriangle, CheckCircle, Code, Globe, RefreshCw, Shield, XCircle, Zap} from 'lucide-react';

interface EngineStatus {
  name: string;
  type: 'k6' | 'playwright' | 'api' | 'security';
  status: 'available' | 'unavailable' | 'checking' | 'error';
  version?: string;
  lastCheck: string;
  capabilities: string[];
  errorMessage?: string;
}

export interface TestEngineStatusProps {
  compact?: boolean;
}

const TestEngineStatus: React.FC<TestEngineStatusProps> = ({ compact = false }) => {
  const [engines, setEngines] = useState<EngineStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  const checkEngineStatus = async () => {
    // 缓存机制：如果距离上次检查不到2分钟，跳过检查
    const now = Date.now();
    if (now - lastCheckTime < 2 * 60 * 1000 && engines.length > 0) {
      console.log('⏰ 跳过引擎状态检查（缓存有效）');
      return;
    }

    setIsRefreshing(true);
    setLastCheckTime(now);

    try {
      // 检查各个测试引擎的状态
      const engineChecks = await Promise.allSettled([
        checkK6Status(),
        checkPlaywrightStatus(),
        checkAPITestStatus(),
        checkSecurityScanStatus()
      ]);

      const results = engineChecks.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const engineNames = ['k6', 'playwright', 'api', 'security'];
          return {
            name: engineNames[index],
            type: engineNames[index] as any,
            status: 'error' as const,
            lastCheck: new Date().toLocaleTimeString(),
            capabilities: [] as string[],
            errorMessage: result.reason?.message || '检查失败'
          };
        }
      });

      setEngines(results);
    } catch (error) {
      console.error('测试引擎状态检查失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const checkK6Status = async (): Promise<EngineStatus> => {
    try {
      const response = await fetch('/api/test/stress/engines');
      if (response.ok) {
        const data = await response.json();
        return {
          name: 'k6 压力测试',
          type: 'k6',
          status: data.success && data.data.k6?.available ? 'available' : 'unavailable',
          version: data.data.k6?.version,
          lastCheck: new Date().toLocaleTimeString(),
          capabilities: ['负载测试', '性能测试', '压力测试', '并发测试'],
          errorMessage: data.data.k6?.error
        };
      } else {
        return {
          name: 'k6 压力测试',
          type: 'k6',
          status: 'unavailable',
          lastCheck: new Date().toLocaleTimeString(),
          capabilities: ['负载测试', '性能测试', '压力测试', '并发测试'],
          errorMessage: '服务不可用'
        };
      }
    } catch (error) {
      return {
        name: 'k6 压力测试',
        type: 'k6',
        status: 'error',
        lastCheck: new Date().toLocaleTimeString(),
        capabilities: ['负载测试', '性能测试', '压力测试', '并发测试'],
        errorMessage: error instanceof Error ? error.message : '连接失败'
      };
    }
  };

  const checkPlaywrightStatus = async (): Promise<EngineStatus> => {
    try {
      const response = await fetch('/api/test/compatibility/engines');
      if (response.ok) {
        const data = await response.json();
        return {
          name: 'Playwright 兼容性测试',
          type: 'playwright',
          status: data.success && data.data.playwright?.available ? 'available' : 'unavailable',
          version: data.data.playwright?.version,
          lastCheck: new Date().toLocaleTimeString(),
          capabilities: ['浏览器兼容性', 'UI测试', '端到端测试', '截图对比'],
          errorMessage: data.data.playwright?.error
        };
      } else {
        return {
          name: 'Playwright 兼容性测试',
          type: 'playwright',
          status: 'unavailable',
          lastCheck: new Date().toLocaleTimeString(),
          capabilities: ['浏览器兼容性', 'UI测试', '端到端测试', '截图对比'],
          errorMessage: '服务不可用'
        };
      }
    } catch (error) {
      return {
        name: 'Playwright 兼容性测试',
        type: 'playwright',
        status: 'error',
        lastCheck: new Date().toLocaleTimeString(),
        capabilities: ['浏览器兼容性', 'UI测试', '端到端测试', '截图对比'],
        errorMessage: error instanceof Error ? error.message : '连接失败'
      };
    }
  };

  const checkAPITestStatus = async (): Promise<EngineStatus> => {
    try {
      const response = await fetch('/api/test/api/engines');
      if (response.ok) {
        const data = await response.json();
        return {
          name: 'API 测试引擎',
          type: 'api',
          status: data.success ? 'available' : 'unavailable',
          lastCheck: new Date().toLocaleTimeString(),
          capabilities: ['REST API测试', 'GraphQL测试', '接口性能测试', '数据验证'],
          errorMessage: data.error
        };
      } else {
        return {
          name: 'API 测试引擎',
          type: 'api',
          status: 'unavailable',
          lastCheck: new Date().toLocaleTimeString(),
          capabilities: ['REST API测试', 'GraphQL测试', '接口性能测试', '数据验证'],
          errorMessage: '服务不可用'
        };
      }
    } catch (error) {
      return {
        name: 'API 测试引擎',
        type: 'api',
        status: 'error',
        lastCheck: new Date().toLocaleTimeString(),
        capabilities: ['REST API测试', 'GraphQL测试', '接口性能测试', '数据验证'],
        errorMessage: error instanceof Error ? error.message : '连接失败'
      };
    }
  };

  const checkSecurityScanStatus = async (): Promise<EngineStatus> => {
    try {
      const response = await fetch('/api/test/security/engines');
      if (response.ok) {
        const data = await response.json();
        return {
          name: '安全扫描引擎',
          type: 'security',
          status: data.success ? 'available' : 'unavailable',
          lastCheck: new Date().toLocaleTimeString(),
          capabilities: ['漏洞扫描', 'SQL注入检测', 'XSS检测', '安全配置检查'],
          errorMessage: data.error
        };
      } else {
        return {
          name: '安全扫描引擎',
          type: 'security',
          status: 'unavailable',
          lastCheck: new Date().toLocaleTimeString(),
          capabilities: ['漏洞扫描', 'SQL注入检测', 'XSS检测', '安全配置检查'],
          errorMessage: '服务不可用'
        };
      }
    } catch (error) {
      return {
        name: '安全扫描引擎',
        type: 'security',
        status: 'error',
        lastCheck: new Date().toLocaleTimeString(),
        capabilities: ['漏洞扫描', 'SQL注入检测', 'XSS检测', '安全配置检查'],
        errorMessage: error instanceof Error ? error.message : '连接失败'
      };
    }
  };

  const getEngineIcon = (type: EngineStatus['type']) => {
    switch (type) {
      case 'k6':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'playwright':
        return <Globe className="w-5 h-5 text-purple-500" />;
      case 'api':
        return <Code className="w-5 h-5 text-green-500" />;
      case 'security':
        return <Shield className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusIcon = (status: EngineStatus['status']) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unavailable':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    }
  };

  const getStatusColor = (status: EngineStatus['status']) => {
    switch (status) {
      case 'available':
        return 'border-green-200 bg-green-50';
      case 'unavailable':
        return 'border-red-200 bg-red-50';
      case 'checking':
        return 'border-blue-200 bg-blue-50';
      case 'error':
        return 'border-orange-200 bg-orange-50';
    }
  };

  useEffect(() => {
    checkEngineStatus();

    // 减少检查频率：每5分钟检查一次，避免429错误
    const interval = setInterval(checkEngineStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center space-x-4">
        {engines.map((engine) => (
          <div key={engine.type} className="flex items-center space-x-1">
            {getEngineIcon(engine.type)}
            {getStatusIcon(engine.status)}
          </div>
        ))}
        <button
          type="button"
          onClick={checkEngineStatus}
          disabled={isRefreshing}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label={isRefreshing ? "正在刷新测试引擎状态" : "刷新测试引擎状态"}
          title={isRefreshing ? "正在刷新测试引擎状态" : "刷新测试引擎状态"}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">测试引擎状态</h3>
        <button
          type="button"
          onClick={checkEngineStatus}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>刷新</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {engines.map((engine) => (
          <div key={engine.type} className={`p-4 rounded-lg border ${getStatusColor(engine.status)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getEngineIcon(engine.type)}
                <span className="font-medium text-gray-900">{engine.name}</span>
              </div>
              {getStatusIcon(engine.status)}
            </div>

            {engine.version && (
              <p className="text-sm text-gray-600 mb-2">版本: {engine.version}</p>
            )}

            {engine.errorMessage && (
              <p className="text-sm text-red-600 mb-2">{engine.errorMessage}</p>
            )}

            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">支持功能:</p>
              <div className="flex flex-wrap gap-1">
                {engine.capabilities.map((capability, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-white border border-gray-200 rounded"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400">
              最后检查: {engine.lastCheck}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestEngineStatus;
