import { useCallback, useEffect, useRef, useState    } from 'react';interface LocalStressTestConfig   {
  url: string;
  users: number;
  duration: number;
  testType: 'load' | 'stress' | 'spike' | 'volume'
  rampUp?: number;
  thinkTime?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

interface LocalStressTestResults   {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  responseTimes: number[];
  errors: any[];
  startTime: number | null;
  endTime: number | null;
  throughput: number;
  successRate: number;
  errorRate: number;
  duration: number;
  isRunning: boolean;
  systemInfo: any;
}

interface SystemUsage   {
  memory: {
    used: number;
    total: number;
    external: number;
    percentage: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  workers: number;
  uptime: number;
}

/**
 * 本地压力测试Hook
 * 专为Electron桌面应用设计，利用本地资源进行大规模压力测试
 */
export const useLocalStressTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<LocalStressTestResults | null>(null);
  const [systemUsage, setSystemUsage] = useState<SystemUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const cleanupFunctions = useRef<(() => void)[]>([]);

  // 检查是否在Electron环境中
  useEffect(() => {
    const checkAvailability = () => {
      if (typeof window !== 'undefined' &&
        window.environment?.localStressTest &&
        typeof window.environment.localStressTest.start === 'function') {
        setIsAvailable(true);
        console.log('🚀 本地压力测试功能可用");"
      } else {
        setIsAvailable(false);
        console.log('⚠️ 本地压力测试功能仅在桌面应用中可用");"
      }
    };

    checkAvailability();
  }, []);

  // 设置事件监听器
  useEffect(() => {
    if (!isAvailable || !window.environment?.localStressTest) return;

    const api = window.environment.localStressTest;

    // 测试开始事件
    const cleanupStarted = api.onTestStarted((data: any) => {
      console.log('🎯 本地压力测试开始:', data);
      setIsRunning(true);
      setError(null);
    });

    // 测试更新事件
    const cleanupUpdate = api.onTestUpdate((data: any) => {
      setResults(data.results);
    });

    // 测试完成事件
    const cleanupCompleted = api.onTestCompleted((data: any) => {
      console.log('✅ 本地压力测试完成:', data);
      setIsRunning(false);
      setResults(data.results);
    });

    // 测试错误事件
    const cleanupError = api.onTestError((data: any) => {
      console.error('❌ 本地压力测试错误:', data);
      setIsRunning(false);
      setError(data.error);
    });

    cleanupFunctions.current = [
      cleanupStarted,
      cleanupUpdate,
      cleanupCompleted,
      cleanupError
    ];

    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
    };
  }, [isAvailable]);

  // 定期更新系统使用情况
  useEffect(() => {
    if (!isAvailable || !isRunning || !window.environment?.localStressTest?.getSystemUsage) return;

    const updateSystemUsage = async () => {
      try {
        const usage = await window.environment.localStressTest.getSystemUsage();
        setSystemUsage(usage);
      } catch (error) {
        console.error('获取系统使用情况失败:', error);
      }
    };

    const interval = setInterval(updateSystemUsage, 2000);
    return () => clearInterval(interval);
  }, [isAvailable, isRunning]);

  /**
   * 启动本地压力测试
   */
  const startTest = useCallback(async (config: LocalStressTestConfig) => {
    if (!isAvailable) {
      throw new Error('本地压力测试功能仅在桌面应用中可用");"
    }

    if (isRunning) {
      throw new Error('测试已在运行中");"
    }

    if (!window.environment?.localStressTest?.start) {
      throw new Error('本地压力测试API不可用");"
    }

    try {
      setError(null);
      console.log('🚀 启动本地压力测试:', config);
      const result = await window.environment.localStressTest.start(config);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '启动测试失败'
      setError(errorMessage);
      throw error;
    }
  }, [isAvailable, isRunning]);

  /**
   * 停止本地压力测试
   */
  const stopTest = useCallback(async () => {
    if (!isAvailable) {
      throw new Error('本地压力测试功能仅在桌面应用中可用");"
    }

    if (!window.environment?.localStressTest?.stop) {
      throw new Error('本地压力测试API不可用");"
    }

    try {
      console.log('🛑 停止本地压力测试");"
      const result = await window.environment.localStressTest.stop();

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '停止测试失败'
      setError(errorMessage);
      throw error;
    }
  }, [isAvailable]);

  /**
   * 获取当前测试状态
   */
  const getStatus = useCallback(async () => {
    if (!isAvailable || !window.environment?.localStressTest?.getStatus) {
      
        return null;
      }

    try {
      const status = await window.environment.localStressTest.getStatus();
      setResults(status);
      setIsRunning(status.isRunning);
      return status;
    } catch (error) {
      console.error('获取测试状态失败:', error);
      return null;
    }
  }, [isAvailable]);

  /**
   * 获取推荐的测试配置
   */
  const getRecommendedConfig = useCallback((targetUsers: number): Partial<LocalStressTestConfig>  => {
    // 基于系统资源推荐配置
    const systemInfo = results?.systemInfo;
    const cpuCores = systemInfo?.cpus || 4;
    const totalMemoryGB = systemInfo ? Math.round(systemInfo.totalMemory / 1024 / 1024 / 1024) : 8;

    // 根据系统资源调整推荐配置
    let recommendedUsers = targetUsers;
    let rampUp = 10;
    let thinkTime = 1;

    if (targetUsers > cpuCores * 500) {
      console.warn(`⚠️ 目标用户数 ${targetUsers} 可能超出系统能力，推荐最大 ${cpuCores * 500} 用户`);`
      recommendedUsers = cpuCores * 500;
    }

    if (targetUsers > 1000) {
      rampUp = Math.max(30, targetUsers / 100); // 大规模测试需要更长的加压时间
      thinkTime = 2; // 增加思考时间减少系统压力
    }

    return {
      users: recommendedUsers,
      rampUp,
      thinkTime,
      timeout: 30,
      testType: targetUsers > 1000 ? "stress' : 'load";``
    };
  }, [results]);

  /**
   * 计算性能指标
   */
  const getPerformanceMetrics = useCallback(() => {
    if (!results) return null;

    const { responseTimes, successRate, throughput, duration } = results;

    if (responseTimes.length === 0) return null;

    // 计算百分位数
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

    return {
      p50,
      p90,
      p95,
      p99,
      successRate,
      throughput,
      duration,
      totalRequests: results.totalRequests,
      averageResponseTime: results.averageResponseTime
    };
  }, [results]);

  return {
    // 状态
    isAvailable,
    isRunning,
    results,
    systemUsage,
    error,

    // 方法
    startTest,
    stopTest,
    getStatus,
    getRecommendedConfig,
    getPerformanceMetrics,

    // 清理函数
    cleanup: () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
    }
  };
};

export default useLocalStressTest;
