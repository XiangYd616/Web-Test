import {useCallback, useEffect, useRef, useState} from 'react';
import backgroundTestManager from '../services/testing/backgroundTestManager.ts';
import {testAPI} from '../services/testing/testService';

export interface StressTestConfig {
  url: string;
  users: number;
  duration: number;
  rampUp: number;
  testType: 'gradual' | 'spike' | 'constant' | 'stress' | 'load' | 'volume';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  timeout: number;
  thinkTime: number;
  warmupDuration: number;
  cooldownDuration: number;
  headers?: Record<string, string>;
  body?: string;
  authentication?: {
    type: 'basic' | 'bearer' | 'api-key';
    credentials: Record<string, string>;
  };
  proxy?: {
    enabled: boolean;
    type?: 'http' | 'https' | 'socks5';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
  scenarios?: TestScenario[];
  thresholds?: TestThresholds;
  regions?: string[];
  protocols?: ('http1' | 'http2' | 'http3')[];
}

export interface TestScenario {
  name: string;
  weight: number;
  steps: TestStep[];
}

export interface TestStep {
  name: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  checks?: string[];
  thinkTime?: number;
}

export interface TestThresholds {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
}

export interface DetailedTestProgress {
  currentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  throughput: number;
  timeoutCount: number;
  progress: number;
  currentPhase: 'warmup' | 'rampup' | 'steady' | 'cooldown' | 'completed';
  phaseProgress: number;
  bytesReceived: number;
  bytesSent: number;
  connectionsActive: number;
  connectionsTotal: number;
  errorsByType: Record<string, number>;
  responseTimeDistribution: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface TestDataPoint {
  timestamp: number;
  responseTime: number;
  users: number;
  errors: number;
  rps: number;
  throughput: number;
  errorRate: number;
  p95ResponseTime: number;
  bytesReceived: number;
  bytesSent: number;
  connectionsActive: number;
  phase: string;
  region?: string;
  protocol?: string;
}

export interface BrowserCapabilities {
  fetch: boolean;
  webWorkers: boolean;
  serviceWorker: boolean;
  webAssembly: boolean;
  webRTC: boolean;
  webGL: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  geolocation: boolean;
  notifications: boolean;
  camera: boolean;
  microphone: boolean;
  bluetooth: boolean;
  nfc: boolean;
}

export const useAdvancedTestEngine = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<DetailedTestProgress | null>(null);
  const [testData, setTestData] = useState<TestDataPoint[]>([]);
  const [testResults, setTestResults] = useState<any>(null);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);
  const currentTestId = useRef<string | null>(null);
  const metricsInterval = useRef<NodeJS.Timeout | null>(null);

  // 检测增强的浏览器能力
  const browserCapabilities: BrowserCapabilities = {
    fetch: typeof fetch !== 'undefined',
    webWorkers: typeof Worker !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
    webAssembly: typeof WebAssembly !== 'undefined',
    webRTC: 'RTCPeerConnection' in window,
    webGL: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch (e) {
        return false;
      }
    })(),
    indexedDB: 'indexedDB' in window,
    localStorage: 'localStorage' in window,
    sessionStorage: 'sessionStorage' in window,
    geolocation: 'geolocation' in navigator,
    notifications: 'Notification' in window,
    camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    bluetooth: 'bluetooth' in navigator,
    nfc: 'nfc' in navigator
  };

  // 初始化引擎状态检查
  useEffect(() => {
    const checkEngineStatus = async () => {
      try {
        const response = await testAPI.checkEngineStatus();
        setEngineStatus(response.data);
      } catch (error) {
        console.error('Failed to check engine status:', error);
        setEngineStatus({
          k6: false,
          lighthouse: false,
          playwright: false,
          artillery: false,
          jmeter: false
        });
      }
    };

    checkEngineStatus();
    // 减少检查频率：每3分钟检查一次，避免429错误
    const interval = setInterval(checkEngineStatus, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // 实时指标更新
  const startRealTimeMetrics = useCallback((testId: string) => {
    if (metricsInterval.current) {
      clearInterval(metricsInterval.current);
    }

    metricsInterval.current = setInterval(async () => {
      try {
        const response = await (testAPI as any).getTestMetrics(testId);
        if (response.data) {
          setRealTimeMetrics(response.data);

          // 更新进度数据
          const metrics = response.data;
          const detailedProgress: DetailedTestProgress = {
            currentUsers: metrics.currentUsers || 0,
            totalRequests: metrics.totalRequests || 0,
            successfulRequests: metrics.successfulRequests || 0,
            failedRequests: metrics.failedRequests || 0,
            averageResponseTime: metrics.averageResponseTime || 0,
            p95ResponseTime: metrics.p95ResponseTime || 0,
            p99ResponseTime: metrics.p99ResponseTime || 0,
            minResponseTime: metrics.minResponseTime || 0,
            maxResponseTime: metrics.maxResponseTime || 0,
            errorRate: metrics.errorRate || 0,
            throughput: metrics.throughput || 0,
            timeoutCount: metrics.timeoutCount || 0,
            progress: metrics.progress || 0,
            currentPhase: metrics.currentPhase || 'steady',
            phaseProgress: metrics.phaseProgress || 0,
            bytesReceived: metrics.bytesReceived || 0,
            bytesSent: metrics.bytesSent || 0,
            connectionsActive: metrics.connectionsActive || 0,
            connectionsTotal: metrics.connectionsTotal || 0,
            errorsByType: metrics.errorsByType || {},
            responseTimeDistribution: metrics.responseTimeDistribution || {
              p50: 0, p90: 0, p95: 0, p99: 0
            }
          };

          setProgress(detailedProgress);

          // 更新数据点
          if (metrics.dataPoints && Array.isArray(metrics.dataPoints)) {
            setTestData(prev => {
              const newData = [...prev, ...metrics.dataPoints];
              return newData.slice(-100); // 保留最近100个数据点
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch real-time metrics:', error);
      }
    }, 2000); // 每2秒更新一次
  }, []);

  const stopRealTimeMetrics = useCallback(() => {
    if (metricsInterval.current) {
      clearInterval(metricsInterval.current);
      metricsInterval.current = null;
    }
  }, []);

  const runAdvancedStressTest = useCallback(async (config: StressTestConfig) => {
    setIsRunning(true);
    setProgress(null);
    setTestData([]);
    setTestResults(null);

    try {
      // 验证配置
      if (!config.url) {
        throw new Error('测试URL不能为空');
      }

      // 启动后台测试
      const testId = backgroundTestManager.startTest(
        'stress',
        config,
        // onProgress 回调
        (progress: number, step: string, metrics?: any) => {
          if (metrics) {
            const detailedProgress: DetailedTestProgress = {
              currentUsers: metrics.currentUsers || 0,
              totalRequests: metrics.totalRequests || 0,
              successfulRequests: metrics.successfulRequests || 0,
              failedRequests: metrics.failedRequests || 0,
              averageResponseTime: metrics.averageResponseTime || 0,
              p95ResponseTime: metrics.p95ResponseTime || 0,
              p99ResponseTime: metrics.p99ResponseTime || 0,
              minResponseTime: metrics.minResponseTime || 0,
              maxResponseTime: metrics.maxResponseTime || 0,
              errorRate: metrics.errorRate || 0,
              throughput: metrics.throughput || 0,
              timeoutCount: metrics.timeoutCount || 0,
              progress: progress,
              currentPhase: metrics.currentPhase || 'steady',
              phaseProgress: metrics.phaseProgress || 0,
              bytesReceived: metrics.bytesReceived || 0,
              bytesSent: metrics.bytesSent || 0,
              connectionsActive: metrics.connectionsActive || 0,
              connectionsTotal: metrics.connectionsTotal || 0,
              errorsByType: metrics.errorsByType || {},
              responseTimeDistribution: metrics.responseTimeDistribution || {
                p50: 0, p90: 0, p95: 0, p99: 0
              }
            };
            setProgress(detailedProgress);
          }
        },
        // onComplete 回调
        (result: any) => {
          setTestResults(result);
          setIsRunning(false);
          stopRealTimeMetrics();
          currentTestId.current = null;

          // 保存到历史记录
          setTestHistory(prev => [result, ...prev.slice(0, 9)]); // 保留最近10次测试
        },
        // onError 回调
        (error: any) => {
          console.error('Advanced stress test failed:', error);
          setIsRunning(false);
          stopRealTimeMetrics();
          currentTestId.current = null;
        }
      );

      currentTestId.current = testId;
      startRealTimeMetrics(testId);

    } catch (error) {
      console.error('Failed to start advanced stress test:', error);
      setIsRunning(false);
    }
  }, [startRealTimeMetrics, stopRealTimeMetrics]);

  const stopTest = useCallback(() => {
    if (currentTestId.current) {
      (backgroundTestManager as any).stopTest(currentTestId.current);
      currentTestId.current = null;
    }
    stopRealTimeMetrics();
    setIsRunning(false);
  }, [stopRealTimeMetrics]);

  const resumeTest = useCallback(() => {
    if (currentTestId.current) {
      (backgroundTestManager as any).resumeTest(currentTestId.current);
    }
  }, []);

  const getTestHistory = useCallback(async () => {
    try {
      const response = await testAPI.getTestHistory(10); // 获取最近10条记录
      const data = Array.isArray(response) ? response : (response as any)?.data || [];
      setTestHistory(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch test history:', error);
      return [];
    }
  }, []);

  const exportTestResults = useCallback(async (testId: string, format: 'json' | 'csv' | 'pdf' | 'html') => {
    try {
      const response = await testAPI.exportTestResults(testId, format);
      return response.data;
    } catch (error) {
      console.error('Failed to export test results:', error);
      throw error;
    }
  }, []);

  const scheduleTest = useCallback(async (config: StressTestConfig, schedule: any) => {
    try {
      const response = await (testAPI as any).scheduleTest('stress', config, schedule);
      return response.data;
    } catch (error) {
      console.error('Failed to schedule test:', error);
      throw error;
    }
  }, []);

  const getTestTemplates = useCallback(async () => {
    try {
      const response = await testAPI.getTestTemplates('stress');
      return Array.isArray(response) ? response : (response as any)?.data || [];
    } catch (error) {
      console.error('Failed to fetch test templates:', error);
      return [];
    }
  }, []);

  const saveTestTemplate = useCallback(async (name: string, config: StressTestConfig) => {
    try {
      const response = await testAPI.saveTestTemplate({ testType: 'stress', name, description: `${name} 压力测试模板`, config });
      return response.data;
    } catch (error) {
      console.error('Failed to save test template:', error);
      throw error;
    }
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      stopRealTimeMetrics();
      if (currentTestId.current) {
        (backgroundTestManager as any).stopTest(currentTestId.current);
      }
    };
  }, [stopRealTimeMetrics]);

  return {
    // 状态
    isRunning,
    progress,
    testData,
    testResults,
    testHistory,
    engineStatus,
    realTimeMetrics,
    browserCapabilities,

    runStressTest: runAdvancedStressTest,
    stopTest,

    // 数据管理
    getTestHistory,
    exportTestResults,

    // 调度和模板
    scheduleTest,
    getTestTemplates,
    saveTestTemplate,

    // 实时监控
    startRealTimeMetrics,
    stopRealTimeMetrics
  };
};

// 向后兼容的导出
export const useSimpleTestEngine = useAdvancedTestEngine;
