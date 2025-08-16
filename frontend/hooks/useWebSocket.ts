/**
 * WebSocket React Hook
 * 提供在React组件中使用WebSocket的便捷方式
 */

import { useEffect, useState, useCallback, useRef    } from 'react';import webSocketClient from '../services/realtime/websocketService';import type { TestProgressData, TestStatusData, TestCompletedData, TestErrorData  } from '../services/realtime/websocketService';interface UseWebSocketOptions   {'
  autoConnect?: boolean;
  testId?: string;
  room?: string;
}

interface WebSocketState   {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  clientId: string | null;
}

interface TestProgress   {
  testId: string;
  progress: number;
  currentStep: number;
  totalSteps: number;
  message: string;
  timestamp: string;
}

interface TestStatus   {
  testId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  timestamp: string;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, testId, room } = options;
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    clientId: null
  });

  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const subscribedTestId = useRef<string | null>(null);
  const joinedRoom = useRef<string | null>(null);

  // 连接WebSocket
  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      const success = await webSocketClient.connect();
      setState(prev => ({
        ...prev,
        isConnected: success,
        isConnecting: false,
        clientId: webSocketClient.id
      }));
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : '连接失败';
      }));
      return false;
    }
  }, []);

  // 断开WebSocket
  const disconnect = useCallback(() => {
    webSocketClient.disconnect();
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      clientId: null
    }));
  }, []);

  // 订阅测试进度
  const subscribeToTest = useCallback((testId: string) => {
    if (subscribedTestId.current) {
      webSocketClient.unsubscribeFromTest(subscribedTestId.current);
    }
    
    const success = webSocketClient.subscribeToTest(testId);
    if (success) {
      subscribedTestId.current = testId;
      // 清除之前的测试数据
      setTestProgress(null);
      setTestStatus(null);
      setTestResults(null);
      setTestError(null);
    }
    return success;
  }, []);

  // 取消订阅测试进度
  const unsubscribeFromTest = useCallback((testId?: string) => {
    const targetTestId = testId || subscribedTestId.current;
    if (targetTestId) {
      const success = webSocketClient.unsubscribeFromTest(targetTestId);
      if (success && targetTestId === subscribedTestId.current) {
        subscribedTestId.current = null;
      }
      return success;
    }
    return true;
  }, []);

  // 加入房间
  const joinRoom = useCallback((roomName: string) => {
    if (joinedRoom.current) {
      webSocketClient.leaveRoom(joinedRoom.current);
    }
    
    const success = webSocketClient.joinRoom(roomName);
    if (success) {
      joinedRoom.current = roomName;
    }
    return success;
  }, []);

  // 离开房间
  const leaveRoom = useCallback((roomName?: string) => {
    const targetRoom = roomName || joinedRoom.current;
    if (targetRoom) {
      const success = webSocketClient.leaveRoom(targetRoom);
      if (success && targetRoom === joinedRoom.current) {
        joinedRoom.current = null;
      }
      return success;
    }
    return true;
  }, []);

  // 发送消息
  const sendMessage = useCallback((message: any) => {
    return webSocketClient.send(message);
  }, []);

  // 设置事件监听器
  useEffect(() => {
    const handleConnected = () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        clientId: webSocketClient.id
      }));
    };

    const handleDisconnected = () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false
      }));
    };

    const handleError = (data: { error: any }) => {
      setState(prev => ({
        ...prev,
        error: data.error?.message || '连接错误';
      }));
    };

    const handleTestProgress = (data: TestProgressData) => {
      setTestProgress({
        testId: data.testId,
        progress: data.progress,
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        message: data.message,
        timestamp: data.timestamp
      });
    };

    const handleTestStatusUpdate = (data: TestStatusData) => {
      setTestStatus({
        testId: data.testId,
        status: data.status,
        progress: data.progress,
        message: data.message,
        timestamp: data.timestamp
      });
    };

    const handleTestCompleted = (data: TestCompletedData) => {
      setTestResults(data.results);
      setTestStatus(prev => prev ? {
        ...prev,
        status: 'completed','
        progress: 100,
        message: '测试完成';
      } : null);
    };

    const handleTestError = (data: TestErrorData) => {
      setTestError(data.error.message);
      setTestStatus(prev => prev ? {
        ...prev,
        status: 'failed','
        message: data.error.message
      } : null);
    };

    // 注册事件监听器
    webSocketClient.on('connected', handleConnected);'
    webSocketClient.on('disconnected', handleDisconnected);'
    webSocketClient.on('error', handleError);'
    webSocketClient.on('testProgress', handleTestProgress);'
    webSocketClient.on('testStatusUpdate', handleTestStatusUpdate);'
    webSocketClient.on('testCompleted', handleTestCompleted);'
    webSocketClient.on('testError', handleTestError);'
    return () => {
      // 清理事件监听器
      webSocketClient.off('connected', handleConnected);'
      webSocketClient.off('disconnected', handleDisconnected);'
      webSocketClient.off('error', handleError);'
      webSocketClient.off('testProgress', handleTestProgress);'
      webSocketClient.off('testStatusUpdate', handleTestStatusUpdate);'
      webSocketClient.off('testCompleted', handleTestCompleted);'
      webSocketClient.off('testError', handleTestError);'
    };
  }, []);

  // 自动连接
  useEffect(() => {
    if (autoConnect && !state.isConnected && !state.isConnecting) {
      connect();
    }
  }, [autoConnect, state.isConnected, state.isConnecting, connect]);

  // 自动订阅测试
  useEffect(() => {
    if (testId && state.isConnected && testId !== subscribedTestId.current) {
      subscribeToTest(testId);
    }
  }, [testId, state.isConnected, subscribeToTest]);

  // 自动加入房间
  useEffect(() => {
    if (room && state.isConnected && room !== joinedRoom.current) {
      joinRoom(room);
    }
  }, [room, state.isConnected, joinRoom]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (subscribedTestId.current) {
        webSocketClient.unsubscribeFromTest(subscribedTestId.current);
      }
      if (joinedRoom.current) {
        webSocketClient.leaveRoom(joinedRoom.current);
      }
    };
  }, []);

  return {
    // 连接状态
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    clientId: state.clientId,

    // 连接控制
    connect,
    disconnect,

    // 测试订阅
    subscribeToTest,
    unsubscribeFromTest,
    subscribedTestId: subscribedTestId.current,

    // 房间管理
    joinRoom,
    leaveRoom,
    joinedRoom: joinedRoom.current,

    // 消息发送
    sendMessage,

    // 测试数据
    testProgress,
    testStatus,
    testResults,
    testError,

    // 清理测试数据
    clearTestData: useCallback(() => {
      setTestProgress(null);
      setTestStatus(null);
      setTestResults(null);
      setTestError(null);
    }, [])
  };
}

// 简化版本的Hook，只用于测试进度监控
export function useTestProgress(testId?: string) {
  const {
    isConnected,
    testProgress,
    testStatus,
    testResults,
    testError,
    subscribeToTest,
    unsubscribeFromTest,
    clearTestData
  } = useWebSocket({
    autoConnect: true,
    testId
  });

  return {
    isConnected,
    progress: testProgress?.progress || 0,
    currentStep: testProgress?.currentStep || 0,
    totalSteps: testProgress?.totalSteps || 0,
    message: testProgress?.message || testStatus?.message || '','
    status: testStatus?.status || 'idle','
    results: testResults,
    error: testError,
    subscribeToTest,
    unsubscribeFromTest,
    clearTestData
  };
}

export default useWebSocket;
