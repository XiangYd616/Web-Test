/**
 * 压力测试数据管理Hook
 * 统一管理测试数据，解决数据耦合问题
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// 数据点接口
export interface StressTestDataPoint {
  timestamp: number;
  responseTime: number;
  activeUsers: number;
  throughput: number;
  errorRate: number;
  status: number;
  success: boolean;
  phase?: 'rampup' | 'steady' | 'rampdown';
  connectionTime?: number;
  dnsTime?: number;
  errorType?: string;
}

// 测试指标接口
export interface StressTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  currentTPS: number;
  peakTPS: number;
  errorBreakdown: Record<string, number>;
  p50ResponseTime?: number;
  p75ResponseTime?: number;
  p90ResponseTime?: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
  p999ResponseTime?: number;
}

// 测试配置接口
export interface StressTestConfig {
  url: string;
  users: number;
  duration: number;
  testType: 'gradual' | 'spike' | 'constant' | 'stress';
  rampUp: number;
  method: string;
  timeout: number;
  thinkTime: number;
  warmupDuration: number;
  cooldownDuration?: number;
}

// Hook状态接口
interface UseStressTestDataState {
  realTimeData: StressTestDataPoint[];
  metrics: StressTestMetrics | null;
  isRunning: boolean;
  testProgress: string;
  error: string | null;
  testResult: any;
}

// Hook返回值接口
interface UseStressTestDataReturn extends UseStressTestDataState {
  addDataPoint: (point: StressTestDataPoint) => void;
  updateMetrics: (metrics: StressTestMetrics) => void;
  setTestProgress: (progress: string) => void;
  setError: (error: string | null) => void;
  setIsRunning: (running: boolean) => void;
  setTestResult: (result: any) => void;
  clearData: () => void;
  exportData: () => any;
  getLatestMetrics: () => StressTestMetrics | null;
  getDataInTimeRange: (startTime: number, endTime: number) => StressTestDataPoint[];
}

// 数据缓存配置
const DATA_CACHE_CONFIG = {
  maxDataPoints: 1000, // 最大数据点数量
  cleanupThreshold: 1200, // 清理阈值
  retentionTime: 5 * 60 * 1000, // 数据保留时间（5分钟）
};

export const useStressTestData = (config?: StressTestConfig): UseStressTestDataReturn => {
  // 状态管理
  const [state, setState] = useState<UseStressTestDataState>({
    realTimeData: [],
    metrics: null,
    isRunning: false,
    testProgress: '',
    error: null,
    testResult: null
  });

  // 数据缓存引用
  const dataCache = useRef<StressTestDataPoint[]>([]);
  const metricsHistory = useRef<Array<{ timestamp: number; metrics: StressTestMetrics }>>([]);

  // 数据清理函数
  const cleanupOldData = useCallback(() => {
    const now = Date.now();
    const cutoffTime = now - DATA_CACHE_CONFIG.retentionTime;

    // 清理过期数据
    dataCache.current = dataCache.current.filter(point => point.timestamp > cutoffTime);
    metricsHistory.current = metricsHistory.current.filter(entry => entry.timestamp > cutoffTime);

    // 如果数据点过多，保留最新的数据
    if (dataCache.current.length > DATA_CACHE_CONFIG.cleanupThreshold) {
      dataCache.current = dataCache.current.slice(-DATA_CACHE_CONFIG.maxDataPoints);
    }
  }, []);

  // 添加数据点
  const addDataPoint = useCallback((point: StressTestDataPoint) => {
    dataCache.current.push(point);
    
    // 定期清理数据
    if (dataCache.current.length % 100 === 0) {
      cleanupOldData();
    }

    setState(prev => ({
      ...prev,
      realTimeData: [...dataCache.current]
    }));
  }, [cleanupOldData]);

  // 更新指标
  const updateMetrics = useCallback((metrics: StressTestMetrics) => {
    const timestamp = Date.now();
    metricsHistory.current.push({ timestamp, metrics });

    setState(prev => ({
      ...prev,
      metrics
    }));
  }, []);

  // 设置测试进度
  const setTestProgress = useCallback((progress: string) => {
    setState(prev => ({
      ...prev,
      testProgress: progress
    }));
  }, []);

  // 设置错误
  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error
    }));
  }, []);

  // 设置运行状态
  const setIsRunning = useCallback((running: boolean) => {
    setState(prev => ({
      ...prev,
      isRunning: running
    }));
  }, []);

  // 设置测试结果
  const setTestResult = useCallback((result: any) => {
    setState(prev => ({
      ...prev,
      testResult: result
    }));
  }, []);

  // 清理数据
  const clearData = useCallback(() => {
    dataCache.current = [];
    metricsHistory.current = [];
    setState({
      realTimeData: [],
      metrics: null,
      isRunning: false,
      testProgress: '',
      error: null,
      testResult: null
    });
  }, []);

  // 导出数据
  const exportData = useCallback(() => {
    return {
      realTimeData: dataCache.current,
      metrics: state.metrics,
      metricsHistory: metricsHistory.current,
      testResult: state.testResult,
      exportTime: new Date().toISOString(),
      config
    };
  }, [state.metrics, state.testResult, config]);

  // 获取最新指标
  const getLatestMetrics = useCallback(() => {
    return state.metrics;
  }, [state.metrics]);

  // 获取时间范围内的数据
  const getDataInTimeRange = useCallback((startTime: number, endTime: number) => {
    return dataCache.current.filter(point => 
      point.timestamp >= startTime && point.timestamp <= endTime
    );
  }, []);

  // 自动清理定时器
  useEffect(() => {
    const interval = setInterval(cleanupOldData, 30000); // 每30秒清理一次
    return () => clearInterval(interval);
  }, [cleanupOldData]);

  // 测试阶段计算
  const calculateTestPhase = useCallback((timestamp: number): 'rampup' | 'steady' | 'rampdown' => {
    if (!config || !state.isRunning) return 'steady';

    const testStartTime = Date.now() - (dataCache.current.length * 1000);
    const elapsed = timestamp - testStartTime;
    const rampUpDuration = config.rampUp * 1000;
    const totalDuration = config.duration * 1000;
    const rampDownStart = totalDuration - (config.cooldownDuration || 5) * 1000;

    if (elapsed < rampUpDuration) return 'rampup';
    if (elapsed > rampDownStart) return 'rampdown';
    return 'steady';
  }, [config, state.isRunning]);

  // 增强的添加数据点函数，自动计算阶段
  const addDataPointWithPhase = useCallback((point: Omit<StressTestDataPoint, 'phase'>) => {
    const phase = calculateTestPhase(point.timestamp);
    addDataPoint({ ...point, phase });
  }, [addDataPoint, calculateTestPhase]);

  return {
    ...state,
    addDataPoint: addDataPointWithPhase,
    updateMetrics,
    setTestProgress,
    setError,
    setIsRunning,
    setTestResult,
    clearData,
    exportData,
    getLatestMetrics,
    getDataInTimeRange
  };
};

// 数据处理工具函数
export const processRealTimeData = (rawData: any[]): StressTestDataPoint[] => {
  return rawData.map(point => ({
    timestamp: point.timestamp || Date.now(),
    responseTime: point.responseTime || 0,
    activeUsers: point.activeUsers || 0,
    throughput: point.throughput || 1,
    errorRate: point.success === false ? 100 : 0,
    status: point.status || 200,
    success: point.success !== false,
    phase: point.phase || 'steady',
    connectionTime: point.connectionTime,
    dnsTime: point.dnsTime,
    errorType: point.errorType
  }));
};

// 指标计算工具函数
export const calculateMetrics = (data: StressTestDataPoint[]): StressTestMetrics => {
  if (!data.length) {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      currentTPS: 0,
      peakTPS: 0,
      errorBreakdown: {}
    };
  }

  const totalRequests = data.length;
  const successfulRequests = data.filter(d => d.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const averageResponseTime = data.reduce((sum, d) => sum + d.responseTime, 0) / totalRequests;

  // 计算TPS（基于最近的数据）
  const recentData = data.slice(-60); // 最近60个数据点
  const timeSpan = recentData.length > 1 
    ? (recentData[recentData.length - 1].timestamp - recentData[0].timestamp) / 1000 
    : 1;
  const currentTPS = recentData.length / timeSpan;

  // 计算峰值TPS
  const tpsHistory: number[] = [];
  for (let i = 60; i < data.length; i += 10) {
    const window = data.slice(i - 60, i);
    const windowTimeSpan = (window[window.length - 1].timestamp - window[0].timestamp) / 1000;
    tpsHistory.push(window.length / windowTimeSpan);
  }
  const peakTPS = Math.max(...tpsHistory, currentTPS);

  // 响应时间百分位数
  const sortedResponseTimes = data.map(d => d.responseTime).sort((a, b) => a - b);
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * sortedResponseTimes.length) - 1;
    return sortedResponseTimes[Math.max(0, index)] || 0;
  };

  // 错误分类
  const errorBreakdown: Record<string, number> = {};
  data.filter(d => !d.success).forEach(d => {
    const errorType = d.errorType || `HTTP_${d.status}`;
    errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
  });

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    averageResponseTime,
    currentTPS,
    peakTPS,
    errorBreakdown,
    p50ResponseTime: getPercentile(50),
    p75ResponseTime: getPercentile(75),
    p90ResponseTime: getPercentile(90),
    p95ResponseTime: getPercentile(95),
    p99ResponseTime: getPercentile(99),
    p999ResponseTime: getPercentile(99.9)
  };
};
