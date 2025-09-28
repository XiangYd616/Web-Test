/**
 * useStressTestWebSocket.ts - 核心功能模块
 * 
 * 文件路径: frontend\hooks\useStressTestWebSocket.ts
 * 创建时间: 2025-09-25
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketManager, ConnectionStatus, WebSocketMessage } from '../services/websocketManager';

export interface StressTestProgress {
  testId: string;
  progress: number;
  currentStep: string;
  totalSteps: number;
  responseTime: number;
  throughput: number;
  activeUsers: number;
  errorRate: number;
  successRate: number;
  phase?: string;
  timestamp: number;
}

export interface StressTestStatus {
  testId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  message?: string;
  timestamp: number;
}

export interface StressTestResult {
  testId: string;
  results: any;
  success: boolean;
  timestamp: number;
}

export interface UseStressTestWebSocketOptions {
  testId?: string | null;
  autoConnect?: boolean;
  onProgress?: (progress: StressTestProgress) => void;
  onStatusChange?: (status: StressTestStatus) => void;
  onComplete?: (result: StressTestResult) => void;
  onError?: (error: any) => void;
}

export interface UseStressTestWebSocketReturn {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  latestProgress: StressTestProgress | null;
  latestStatus: StressTestStatus | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToTest: (testId: string) => void;
  unsubscribeFromTest: (testId: string) => void;
  sendMessage: (message: WebSocketMessage) => boolean;
}

export const useStressTestWebSocket = (
  options: UseStressTestWebSocketOptions = {}
): UseStressTestWebSocketReturn => {
  const {
    testId,
    autoConnect = true,
    onProgress,
    onStatusChange,
    onComplete,
    onError
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [latestProgress, setLatestProgress] = useState<StressTestProgress | null>(null);
  const [latestStatus, setLatestStatus] = useState<StressTestStatus | null>(null);
  
  const unsubscribeFunctionsRef = useRef<(() => void)[]>([]);
  const subscribedTestsRef = useRef<Set<string>>(new Set());

  // 连接状态监听
  useEffect(() => {
    const unsubscribe = websocketManager.onStatusChange(setConnectionStatus);
    return unsubscribe;
  }, []);

  // 消息处理器
  const handleProgressMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'test_progress' && message.data) {
      const progress: StressTestProgress = {
        testId: message.testId || '',
        progress: message.data.progress || 0,
        currentStep: message.data.currentStep || '',
        totalSteps: message.data.totalSteps || 0,
        responseTime: message.data.responseTime || 0,
        throughput: message.data.throughput || 0,
        activeUsers: message.data.activeUsers || 0,
        errorRate: message.data.errorRate || 0,
        successRate: message.data.successRate || (100 - (message.data.errorRate || 0)),
        phase: message.data.phase,
        timestamp: message.timestamp || Date.now()
      };

      setLatestProgress(progress);
      onProgress?.(progress);
    }
  }, [onProgress]);

    /**
     * if功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const handleStatusMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'test_status_update' && message.data) {
      const status: StressTestStatus = {
        testId: message.testId || '',
        status: message.data.status,
        message: message.data.message,
        timestamp: message.timestamp || Date.now()
      };

      setLatestStatus(status);
      onStatusChange?.(status);
    }
  }, [onStatusChange]);

    /**
     * if功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const handleCompleteMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'test_completed' && message.data) {
      const result: StressTestResult = {
        testId: message.testId || '',
        results: message.data.results,
        success: message.data.success || false,
        timestamp: message.timestamp || Date.now()
      };

      onComplete?.(result);
    }
  }, [onComplete]);

    /**
     * if功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const handleErrorMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'test_error' && message.data) {
      onError?.(message.data);
    }
  }, [onError]);

  // 订阅消息类型
  useEffect(() => {
    const unsubscribeFunctions = [
      websocketManager.subscribe('test_progress', handleProgressMessage),
      websocketManager.subscribe('test_status_update', handleStatusMessage),
      websocketManager.subscribe('test_completed', handleCompleteMessage),
      websocketManager.subscribe('test_error', handleErrorMessage)
    ];

    unsubscribeFunctionsRef.current = unsubscribeFunctions;

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [handleProgressMessage, handleStatusMessage, handleCompleteMessage, handleErrorMessage]);

  // 连接管理
  const connect = useCallback(async () => {
    try {
      await websocketManager.connect();
    } catch (error) {
      console.error('WebSocket连接失败:', error);
      onError?.(error);
    }
  }, [onError]);

  const disconnect = useCallback(() => {
    websocketManager.disconnect();
  }, []);

  // 订阅测试
  const subscribeToTest = useCallback((testId: string) => {
    if (subscribedTestsRef.current.has(testId)) {
      return;
    }

    const success = websocketManager.send({
      type: 'subscribe',
      testId: testId,
      data: { dataType: 'stress_test_progress' }
    });

    if (success) {
      subscribedTestsRef.current.add(testId);
    } else {
      console.warn(`❌ 订阅测试失败: ${testId}`);
    }
  }, []);

  // 取消订阅测试
  const unsubscribeFromTest = useCallback((testId: string) => {
    if (!subscribedTestsRef.current.has(testId)) {
      return;
    }

    const success = websocketManager.send({
      type: 'unsubscribe',
      testId: testId,
      data: { dataType: 'stress_test_progress' }
    });

    if (success) {
      subscribedTestsRef.current.delete(testId);
    } else {
      console.warn(`❌ 取消订阅测试失败: ${testId}`);
    }
  }, []);

  // 发送消息
  const sendMessage = useCallback((message: WebSocketMessage) => {
    return websocketManager.send(message);
  }, []);

  // 自动连接
  useEffect(() => {
    if (autoConnect && connectionStatus === 'disconnected') {
      connect();
    }
  }, [autoConnect, connectionStatus, connect]);

  // 自动订阅当前测试
  useEffect(() => {
    if (testId && connectionStatus === 'connected') {
      subscribeToTest(testId);
    }

    return () => {
      if (testId) {
        unsubscribeFromTest(testId);
      }
    };
  }, [testId, connectionStatus, subscribeToTest, unsubscribeFromTest]);

  // 清理订阅
  useEffect(() => {
    return () => {
      // 取消所有订阅
      subscribedTestsRef.current.forEach(testId => {
        unsubscribeFromTest(testId);
      });
      subscribedTestsRef.current.clear();
    };
  }, [unsubscribeFromTest]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    latestProgress,
    latestStatus,
    connect,
    disconnect,
    subscribeToTest,
    unsubscribeFromTest,
    sendMessage
  };
};

export default useStressTestWebSocket;
