/**
 * 优化的压力测试Hook
 * 集成新的状态管理器和数据处理管道
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { dataNormalizationPipeline } from '../services/DataNormalizationPipeline';
import { testStateManager, TestState, TestPhase, type TestConfig, type RealTimeMetrics, type TestDataPoint } from '../services/TestStateManager';

// Hook返回类型
export interface UseOptimizedStressTestReturn {
  // 状态
  testState: TestState;
  testPhase: TestPhase;
  testConfig: TestConfig | null;
  metrics: RealTimeMetrics | null;
  dataPoints: TestDataPoint[];
  error: Error | null;
  progress: { progress: number; message: string };
  duration: number;
  
  // 操作
  startTest: (testId: string, config: TestConfig) => void;
  stopTest: () => void;
  resetTest: () => void;
  
  // 数据管理
  getLatestDataPoints: (count?: number) => TestDataPoint[];
  getCurrentDataSource: () => string;
  
  // 事件监听
  isConnected: boolean;
}

// Hook配置
export interface UseOptimizedStressTestConfig {
  enableWebSocket: boolean;
  enableAPIPolling: boolean;
  pollingInterval: number;
  maxDataPoints: number;
  autoReconnect: boolean;
}

/**
 * 优化的压力测试Hook
 */
export function useOptimizedStressTest(
  config: Partial<UseOptimizedStressTestConfig> = {}
): UseOptimizedStressTestReturn {
  
  const hookConfig = {
    enableWebSocket: true,
    enableAPIPolling: true,
    pollingInterval: 2000,
    maxDataPoints: 1000,
    autoReconnect: true,
    ...config
  };

  // 状态
  const [testState, setTestState] = useState<TestState>(TestState.IDLE);
  const [testPhase, setTestPhase] = useState<TestPhase>(TestPhase.INITIALIZATION);
  const [testConfig, setTestConfig] = useState<TestConfig | null>(null);
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [dataPoints, setDataPoints] = useState<TestDataPoint[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState({ progress: 0, message: '' });
  const [duration, setDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket引用
  const socketRef = useRef<any>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTestIdRef = useRef<string | null>(null);

  // 同步状态管理器状态
  const syncStateFromManager = useCallback(() => {
    setTestState(testStateManager.getState());
    setTestPhase(testStateManager.getPhase());
    setTestConfig(testStateManager.getConfig());
    setMetrics(testStateManager.getMetrics());
    setDataPoints(testStateManager.getDataPoints());
    setError(testStateManager.getError());
    setProgress(testStateManager.getProgress());
    setDuration(testStateManager.getDuration());
  }, []);

  // 初始化WebSocket连接
  const initializeWebSocket = useCallback(async () => {
    if (!hookConfig.enableWebSocket) return;

    try {
      const { io } = await import('socket.io-client');
      
      const socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('🔌 WebSocket连接成功');
        setIsConnected(true);
        testStateManager.switchDataSource('websocket' as any);
      });

      socket.on('disconnect', () => {
        console.log('🔌 WebSocket连接断开');
        setIsConnected(false);
        if (hookConfig.autoReconnect && hookConfig.enableAPIPolling) {
          testStateManager.switchDataSource('api-polling' as any);
          startAPIPolling();
        }
      });

      // 压力测试实时数据
      socket.on('stress-test-data', (rawData) => {
        console.log('📊 收到WebSocket数据:', rawData);
        
        const processed = dataNormalizationPipeline.processWebSocketData(rawData);
        
        if (processed.dataPoint) {
          testStateManager.addDataPoint(processed.dataPoint);
        }
        
        if (processed.metrics) {
          testStateManager.updateMetrics(processed.metrics);
        }
      });

      // 压力测试状态更新
      socket.on('stress-test-status', (data) => {
        console.log('📊 收到状态更新:', data);
        if (data.progress !== undefined) {
          testStateManager.updateProgress(data.progress, data.message || '测试进行中...');
        }
      });

      // 压力测试完成
      socket.on('stress-test-complete', (data) => {
        console.log('✅ 测试完成:', data);
        testStateManager.completeTest(data.results);
      });

    } catch (error) {
      console.error('WebSocket初始化失败:', error);
      if (hookConfig.enableAPIPolling) {
        testStateManager.switchDataSource('api-polling' as any);
        startAPIPolling();
      }
    }
  }, [hookConfig.enableWebSocket, hookConfig.autoReconnect, hookConfig.enableAPIPolling]);

  // 启动API轮询
  const startAPIPolling = useCallback(() => {
    if (!hookConfig.enableAPIPolling || !currentTestIdRef.current) return;

    pollingTimerRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/test/stress/status/${currentTestIdRef.current}`);
        const rawData = await response.json();
        
        const processed = dataNormalizationPipeline.processAPIData(rawData);
        
        if (processed.dataPoints && processed.dataPoints.length > 0) {
          processed.dataPoints.forEach(point => {
            testStateManager.addDataPoint(point);
          });
        }
        
        if (processed.metrics) {
          testStateManager.updateMetrics(processed.metrics);
        }

        // 检查测试是否完成
        if (rawData.data?.status === 'completed' || rawData.data?.status === 'failed') {
          stopAPIPolling();
          if (rawData.data?.status === 'completed') {
            testStateManager.completeTest(rawData.data);
          } else {
            testStateManager.failTest(new Error(rawData.message || '测试失败'));
          }
        }

      } catch (error) {
        console.error('API轮询失败:', error);
      }
    }, hookConfig.pollingInterval);
  }, [hookConfig.enableAPIPolling, hookConfig.pollingInterval]);

  // 停止API轮询
  const stopAPIPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // 开始测试
  const startTest = useCallback((testId: string, config: TestConfig) => {
    try {
      currentTestIdRef.current = testId;
      testStateManager.startTest(testId, config);
      
      // 加入WebSocket房间
      if (socketRef.current && isConnected) {
        socketRef.current.emit('join-stress-test', testId);
      }
      
      // 启动API轮询作为备用
      if (hookConfig.enableAPIPolling) {
        setTimeout(() => startAPIPolling(), 1000); // 延迟1秒启动轮询
      }
      
    } catch (error) {
      console.error('启动测试失败:', error);
      testStateManager.failTest(error as Error);
    }
  }, [isConnected, hookConfig.enableAPIPolling, startAPIPolling]);

  // 停止测试
  const stopTest = useCallback(() => {
    testStateManager.cancelTest();
    currentTestIdRef.current = null;
    
    // 离开WebSocket房间
    if (socketRef.current && currentTestIdRef.current) {
      socketRef.current.emit('leave-stress-test', currentTestIdRef.current);
    }
    
    stopAPIPolling();
  }, [stopAPIPolling]);

  // 重置测试
  const resetTest = useCallback(() => {
    testStateManager.reset();
    currentTestIdRef.current = null;
    stopAPIPolling();
  }, [stopAPIPolling]);

  // 获取最新数据点
  const getLatestDataPoints = useCallback((count: number = 50) => {
    return testStateManager.getLatestDataPoints(count);
  }, []);

  // 获取当前数据源
  const getCurrentDataSource = useCallback(() => {
    return testStateManager.getCurrentDataSource();
  }, []);

  // 监听状态管理器事件
  useEffect(() => {
    const unsubscribeStateChange = testStateManager.onStateChange((event) => {
      console.log('状态变更:', event);
      syncStateFromManager();
    });

    const unsubscribeDataUpdate = testStateManager.onDataUpdate((dataPoint) => {
      console.log('数据更新:', dataPoint);
      syncStateFromManager();
    });

    const unsubscribeMetricsUpdate = testStateManager.onMetricsUpdate((metrics) => {
      console.log('指标更新:', metrics);
      syncStateFromManager();
    });

    // 初始同步
    syncStateFromManager();

    return () => {
      unsubscribeStateChange();
      unsubscribeDataUpdate();
      unsubscribeMetricsUpdate();
    };
  }, [syncStateFromManager]);

  // 初始化WebSocket
  useEffect(() => {
    initializeWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      stopAPIPolling();
    };
  }, [initializeWebSocket, stopAPIPolling]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopAPIPolling();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [stopAPIPolling]);

  return {
    // 状态
    testState,
    testPhase,
    testConfig,
    metrics,
    dataPoints,
    error,
    progress,
    duration,
    
    // 操作
    startTest,
    stopTest,
    resetTest,
    
    // 数据管理
    getLatestDataPoints,
    getCurrentDataSource,
    
    // 连接状态
    isConnected
  };
}
