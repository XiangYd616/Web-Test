/**
 * 网络测试专用状态管理Hook
 * 可选的升级方案，NetworkTest.tsx可以选择使用或保持现有实现
 *
 * 已迁移到新的类型系统，使用统一的类型定义
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import backgroundTestManager from '../services/backgroundTestManager';
import type {
  NetworkTestConfig,
  NetworkTestHook,
  NetworkTestResult
} from '../types';
import { TestStatus } from '@shared/types';

// 所有类型定义已迁移到统一的类型系统
// 请从 '../types' 导入所需的类型

interface NetworkTestConfigLocal {
  // 带宽测试配置
  bandwidthConfig: {
    downloadTest: boolean;
    uploadTest: boolean;
    testFileSize: number; // MB
  };

  // DNS测试配置
  dnsConfig: {
    dnsServers: string[];
    recordTypes: ('A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS')[];
  };

  // 端口扫描配置
  portConfig: {
    ports: number[];
    scanType: 'tcp' | 'udp' | 'both';
  };

  // 路由追踪配置
  tracerouteConfig: {
    maxHops: number;
    timeout: number;
  };
}

// 网络测试结果接口（本地扩展版本）
export interface LocalNetworkTestResult {
  id: string;
  config: NetworkTestConfig;
  status: 'completed' | 'failed' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number;
  summary: {
    overallStatus: 'healthy' | 'warning' | 'critical';
    connectivityScore: number;
    latencyScore: number;
    bandwidthScore: number;
    dnsScore: number;
    securityScore: number;
  };

  // 连通性结果
  connectivityResults: {
    status: 'success' | 'failed';
    packetsTransmitted: number;
    packetsReceived: number;
    packetLoss: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    jitter: number;
  };

  // 延迟结果
  latencyResults: {
    status: 'good' | 'acceptable' | 'poor';
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    latencyDistribution: Array<{
      range: string;
      count: number;
    }>;
  };

  // 带宽结果
  bandwidthResults: {
    downloadSpeed: number; // Mbps
    uploadSpeed: number; // Mbps
    downloadLatency: number;
    uploadLatency: number;
    stability: number; // 0-100
  };

  // DNS结果
  dnsResults: {
    status: 'healthy' | 'slow' | 'failed';
    averageResolutionTime: number;
    records: Array<{
      type: string;
      value: string;
      ttl: number;
      resolutionTime: number;
    }>;
    dnsServerResults: Array<{
      server: string;
      status: 'success' | 'failed';
      resolutionTime: number;
    }>;
  };

  // 端口扫描结果
  portResults: {
    openPorts: number[];
    closedPorts: number[];
    filteredPorts: number[];
    services: Array<{
      port: number;
      service: string;
      version?: string;
      banner?: string;
    }>;
  };

  // 路由追踪结果
  tracerouteResults: {
    status: 'completed' | 'timeout' | 'failed';
    hops: Array<{
      hop: number;
      ip: string;
      hostname?: string;
      latency: number[];
      averageLatency: number;
    }>;
    totalHops: number;
    pathMTU?: number;
  };

  // 安全检查结果
  securityResults: {
    sslStatus: 'secure' | 'insecure' | 'not_applicable';
    openPorts: number[];
    vulnerabilities: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
    }>;
  };

  recommendations: string[];
}

// Hook状态接口
export interface UseNetworkTestStateReturn {
  // 配置状态
  config: NetworkTestConfig;
  updateConfig: (updates: Partial<NetworkTestConfig>) => void;
  resetConfig: () => void;

  // 测试状态
  isRunning: boolean;
  progress: number;
  currentStep: string;
  testId: string | null;

  // 结果状态
  result: NetworkTestResult | null;
  error: string | null;

  // 操作方法
  startTest: () => Promise<void>;
  stopTest: () => Promise<void>;
  resetTest: () => void;

  // 配置管理
  addDnsServer: (server: string) => void;
  removeDnsServer: (server: string) => void;
  addPort: (port: number) => void;
  removePort: (port: number) => void;
  addRecordType: (type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS') => void;
  removeRecordType: (type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS') => void;

  // 预设配置
  loadPreset: (preset: 'basic' | 'comprehensive' | 'security' | 'performance') => void;

  // 验证方法
  validateConfig: () => { isValid: boolean; errors: string[] };
}

/**
 * 网络测试专用状态管理Hook
 * 已迁移到新的类型系统，返回 NetworkTestHook 类型
 */
export const useNetworkTestState = (): NetworkTestHook => {
  // 基础状态 - 使用本地扩展配置
  const [localConfig, setLocalConfig] = useState({
    target: '',
    testType: 'comprehensive',
    timeout: process.env.REQUEST_TIMEOUT || 30000,
    retries: 3,
    interval: 1000,
    duration: 60,

    connectivityConfig: {
      pingCount: 10,
      packetSize: 64
    },

    latencyConfig: {
      testCount: 20,
      maxLatency: 1000
    },

    bandwidthConfig: {
      downloadTest: true,
      uploadTest: false,
      testFileSize: 10
    },

    dnsConfig: {
      dnsServers: ['8.8.8.8', '1.1.1.1'],
      recordTypes: ['A', 'AAAA']
    },

    portConfig: {
      ports: [80, 443, 22, 21, 25, 53, 110, 143, 993, 995],
      scanType: 'tcp'
    },

    tracerouteConfig: {
      maxHops: 30,
      timeout: 5000
    }
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [testId, setTestId] = useState<string | null>(null);
  const [result, setResult] = useState<LocalNetworkTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 引用
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 更新配置
   */
  const updateLocalConfig = useCallback((updates: any) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  /**
   * 重置配置
   */
  const resetConfig = useCallback(() => {
    setLocalConfig({
      target: '',
      testType: 'comprehensive',
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      retries: 3,
      interval: 1000,
      duration: 60,

      connectivityConfig: {
        pingCount: 10,
        packetSize: 64
      },

      latencyConfig: {
        testCount: 20,
        maxLatency: 1000
      },

      bandwidthConfig: {
        downloadTest: true,
        uploadTest: false,
        testFileSize: 10
      },

      dnsConfig: {
        dnsServers: ['8.8.8.8', '1.1.1.1'],
        recordTypes: ['A', 'AAAA']
      },

      portConfig: {
        ports: [80, 443, 22, 21, 25, 53, 110, 143, 993, 995],
        scanType: 'tcp'
      },

      tracerouteConfig: {
        maxHops: 30,
        timeout: 5000
      }
    });
  }, []);

  /**
   * 验证配置
   */
  const validateConfig = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!localConfig.target) {
      errors.push('请输入目标地址（URL或IP）');
    }

    if (localConfig.connectivityConfig?.pingCount < 1 || localConfig.connectivityConfig?.pingCount > 100) {
      errors.push('Ping次数应在1-100之间');
    }

    if (localConfig.latencyConfig?.testCount < 1 || localConfig.latencyConfig?.testCount > 100) {
      errors.push('延迟测试次数应在1-100之间');
    }

    if (!localConfig.dnsConfig?.dnsServers || localConfig.dnsConfig.dnsServers.length === 0) {
      errors.push('请至少添加一个DNS服务器');
    }

    if (!localConfig.portConfig?.ports || localConfig.portConfig.ports.length === 0) {
      errors.push('请至少添加一个端口');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [localConfig]);

  /**
   * 启动测试
   */
  const startTest = useCallback(async () => {
    const validation = validateConfig();
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      return;
    }

    try {
      setIsRunning(true);
      setProgress(0);
      setCurrentStep('正在初始化网络测试...');
      setError(null);
      setResult(null);

      abortControllerRef.current = new AbortController();

      // 启动后台测试
      const newTestId = backgroundTestManager.startTest(
        'network' as any,
        localConfig,
        (progress: number, step: string) => {
          setProgress(progress);
          setCurrentStep(step);
        },
        (testResult: any) => {
          setResult(testResult);
          setIsRunning(false);
          setProgress(100);
          setCurrentStep('测试完成');
        },
        (testError: any) => {
          setError(testError.message);
          setIsRunning(false);
          setCurrentStep('测试失败');
        }
      );

      setTestId(newTestId);

    } catch (err: any) {
      setError(err.message || '网络测试启动失败');
      setIsRunning(false);
      setCurrentStep('');
    }
  }, [localConfig, validateConfig]);

  /**
   * 停止测试
   */
  const stopTest = useCallback(async () => {
    if (testId) {
      try {
        backgroundTestManager.cancelTest(testId);
        abortControllerRef.current?.abort();
        setIsRunning(false);
        setCurrentStep('测试已停止');
      } catch (err: any) {
        setError(err.message || '停止测试失败');
      }
    }
  }, [testId]);

  /**
   * 重置测试
   */
  const resetTest = useCallback(() => {
    setIsRunning(false);
    setProgress(0);
    setCurrentStep('');
    setTestId(null);
    setResult(null);
    setError(null);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  /**
   * 添加DNS服务器
   */
  const addDnsServer = useCallback((server: string) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      dnsConfig: {
        ...prev.dnsConfig,
        dnsServers: [...(prev.dnsConfig?.dnsServers || []), server].filter((s: unknown, i: number, arr: unknown[]) => arr.indexOf(s) === i)
      }
    }));
  }, []);

  /**
   * 移除DNS服务器
   */
  const removeDnsServer = useCallback((server: string) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      dnsConfig: {
        ...prev.dnsConfig,
        dnsServers: (prev.dnsConfig?.dnsServers || []).filter((s: any) => s !== server)
      }
    }));
  }, []);

  /**
   * 添加端口
   */
  const addPort = useCallback((port: number) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      portConfig: {
        ...prev.portConfig,
        ports: [...(prev.portConfig?.ports || []), port].filter((p: unknown, i: number, arr: unknown[]) => arr.indexOf(p) === i).sort((a: number, b: number) => a - b)
      }
    }));
  }, []);

  /**
   * 移除端口
   */
  const removePort = useCallback((port: number) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      portConfig: {
        ...prev.portConfig,
        ports: (prev.portConfig?.ports || []).filter((p: any) => p !== port)
      }
    }));
  }, []);

  /**
   * 添加记录类型
   */
  const addRecordType = useCallback((type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS') => {
    setLocalConfig((prev: any) => ({
      ...prev,
      dnsConfig: {
        ...prev.dnsConfig,
        recordTypes: [...(prev.dnsConfig?.recordTypes || []), type].filter((t: unknown, i: number, arr: unknown[]) => arr.indexOf(t) === i)
      }
    }));
  }, []);

  /**
   * 移除记录类型
   */
  const removeRecordType = useCallback((type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS') => {
    setLocalConfig((prev: any) => ({
      ...prev,
      dnsConfig: {
        ...prev.dnsConfig,
        recordTypes: (prev.dnsConfig?.recordTypes || []).filter((t: any) => t !== type)
      }
    }));
  }, []);

  /**
   * 加载预设配置
   */
  const loadPreset = useCallback((preset: 'basic' | 'comprehensive' | 'security' | 'performance') => {
    const presets = {
      basic: {
        testType: 'connectivity' as const,
        connectivityConfig: { pingCount: 5, packetSize: 64 },
        dnsConfig: { dnsServers: ['8.8.8.8'], recordTypes: ['A'] as const },
        portConfig: { ports: [80, 443], scanType: 'tcp' as const }
      },
      comprehensive: {
        testType: 'comprehensive' as const,
        connectivityConfig: { pingCount: 20, packetSize: 64 },
        bandwidthConfig: { downloadTest: true, uploadTest: true, testFileSize: 50 },
        dnsConfig: { dnsServers: ['8.8.8.8', '1.1.1.1', '208.67.222.222'], recordTypes: ['A', 'AAAA', 'MX', 'TXT'] as const },
        portConfig: { ports: [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995], scanType: 'both' as const }
      },
      security: {
        testType: 'port' as const,
        portConfig: { ports: [21, 22, 23, 25, 53, 80, 135, 139, 443, 445, 993, 995, 3389], scanType: 'tcp' as const },
        dnsConfig: { dnsServers: ['8.8.8.8', '1.1.1.1'], recordTypes: ['A', 'MX', 'TXT'] as const }
      },
      performance: {
        testType: 'bandwidth' as const,
        bandwidthConfig: { downloadTest: true, uploadTest: true, testFileSize: 100 },
        latencyConfig: { testCount: 50, maxLatency: 500 },
        connectivityConfig: { pingCount: 30, packetSize: 1024 }
      }
    };

    const presetConfig = presets[preset];
    setLocalConfig((prev: any) => ({
      ...prev,
      ...presetConfig
    }));
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // 计算派生状态
  const status = isRunning ? TestStatus.RUNNING : (result ? TestStatus.COMPLETED : (error ? TestStatus.FAILED : TestStatus.PENDING));
  const isCompleted = status === 'completed';
  const hasError = status === 'failed';
  const currentPort = localConfig.portConfig?.ports?.[0] || null;

  // 适配配置格式以匹配NetworkTestConfig接口
  const adaptedConfig: NetworkTestConfig = {
    host: localConfig.target,
    ports: localConfig.portConfig?.ports || [],
    protocols: ['tcp', 'udp', 'http', 'https'],
    timeout: localConfig.timeout,
    retries: localConfig.retries
  };

  return {
    // ==================== BaseTestState ====================
    status,
    progress,
    currentStep,
    result: result as unknown as NetworkTestResult | null,
    error,
    isRunning,
    isCompleted,
    hasError,

    // ==================== NetworkTestState ====================
    config: adaptedConfig,
    currentPort,

    // ==================== BaseTestActions ====================
    startTest: (config: NetworkTestConfig) => startTest(),
    stopTest,
    reset: resetTest,
    clearError: () => setError(null),

    /**
     * 更新updateConfig数据
     * @param {string} id - 对象ID
     * @param {Object} data - 更新数据
     * @returns {Promise<Object>} 更新后的对象
     */
    // ==================== NetworkTestActions ====================
    updateConfig: (updates: Partial<NetworkTestConfig>) => {
      // 适配更新格式
      const adaptedUpdates = {
        target: updates.host || localConfig.target,
        timeout: updates.timeout || localConfig.timeout,
        retries: updates.retries || localConfig.retries,
        portConfig: {
          ...localConfig.portConfig,
          ports: updates.ports || localConfig.portConfig?.ports || []
        }
      };
      updateLocalConfig(adaptedUpdates);
    },

    // 注意：validateConfig等方法不属于NetworkTestHook接口
    // 如果需要这些方法，请使用扩展的返回类型
  };
};

export default useNetworkTestState;
