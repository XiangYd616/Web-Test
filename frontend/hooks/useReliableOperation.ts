/**
 * useReliableOperation Hook - 可靠操作 Hook（断线重连 + 乐观 UI）
 * 适用于测试执行、配置保存、报告生成等长时间操作
 */

import Logger from '@/utils/logger';
import { createWebSocketManager } from '@/utils/websocketManager';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ReliableOperationOptions {
  /** 操作唯一标识，用于重连后恢复 */
  operationId: string;
  /** WebSocket 服务路径 */
  wsPath?: string;
  /** 重连间隔范围（毫秒） */
  reconnectIntervalRange?: [number, number];
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 心跳间隔 */
  heartbeatInterval?: number;
  /** 操作超时时间（毫秒） */
  operationTimeout?: number;
  /** 是否启用乐观 UI */
  enableOptimisticUI?: boolean;
}

export interface OperationState {
  status: 'idle' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'reconnecting';
  progress?: number;
  error?: string;
  lastSyncTime?: number;
  isOnline: boolean;
  pendingOperations: number;
}

export interface ReliableOperationReturn {
  /** 当前操作状态 */
  state: OperationState;
  /** 执行操作 */
  executeOperation: (data: Record<string, unknown>) => Promise<void>;
  /** 手动重连 */
  reconnect: () => Promise<void>;
  /** 强制同步 */
  sync: () => Promise<void>;
  /** 清理资源 */
  cleanup: () => void;
}

/**
 * 可靠操作 Hook
 * 提供断线重连、乐观 UI、操作恢复等功能
 */
export const useReliableOperation = (
  options: ReliableOperationOptions
): ReliableOperationReturn => {
  const {
    operationId,
    wsPath = '/ws/operations',
    reconnectIntervalRange = [5000, 15000],
    maxReconnectAttempts = 8,
    heartbeatInterval = 15000,
    operationTimeout = 300000, // 5分钟
    enableOptimisticUI = true,
  } = options;

  // 状态管理
  const [state, setState] = useState<OperationState>({
    status: 'idle',
    isOnline: false,
    pendingOperations: 0,
  });

  // 引用管理
  const managerRef = useRef<ReturnType<typeof createWebSocketManager> | null>(null);
  const operationQueueRef = useRef<
    Array<{ id: string; data: Record<string, unknown>; timestamp: number }>
  >([]);
  const currentOperationRef = useRef<string | null>(null);
  const operationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 构建 WebSocket URL
  const buildWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${wsPath}`;
  }, [wsPath]);

  // 清理操作超时
  const clearOperationTimeout = useCallback(() => {
    if (operationTimeoutRef.current) {
      clearTimeout(operationTimeoutRef.current);
      operationTimeoutRef.current = null;
    }
  }, []);

  // 设置操作超时
  const setOperationTimeout = useCallback(() => {
    clearOperationTimeout();
    operationTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: '操作超时',
      }));
    }, operationTimeout);
  }, [clearOperationTimeout, operationTimeout]);

  // 处理 WebSocket 消息
  const handleWebSocketMessage = useCallback(
    (event: unknown) => {
      const message = event as { type?: string; data?: unknown } | undefined;
      if (!message?.type) return;

      switch (message.type) {
        case 'operation_started':
          setState(prev => ({
            ...prev,
            status: 'in_progress',
            isOnline: true,
            pendingOperations: Math.max(0, prev.pendingOperations - 1),
          }));
          setOperationTimeout();
          break;

        case 'operation_progress':
          setState(prev => ({
            ...prev,
            status: 'in_progress',
            progress: (message.data as { progress?: number })?.progress,
          }));
          break;

        case 'operation_completed':
          clearOperationTimeout();
          setState(prev => ({
            ...prev,
            status: 'completed',
            progress: 100,
            lastSyncTime: Date.now(),
          }));
          currentOperationRef.current = null;
          break;

        case 'operation_failed':
          clearOperationTimeout();
          setState(prev => ({
            ...prev,
            status: 'failed',
            error: (message.data as { error?: string })?.error || '操作失败',
          }));
          currentOperationRef.current = null;
          break;

        case 'sync_response':
          setState(prev => ({
            ...prev,
            lastSyncTime: Date.now(),
          }));
          break;

        default:
          break;
      }
    },
    [clearOperationTimeout, setOperationTimeout]
  );

  // 处理连接状态变化
  const handleConnectionChange = useCallback((isConnected: boolean) => {
    setState(prev => ({
      ...prev,
      isOnline: isConnected,
      status: isConnected && prev.status === 'reconnecting' ? 'in_progress' : prev.status,
    }));

    // 重连后恢复队列中的操作
    if (isConnected && operationQueueRef.current.length > 0) {
      const manager = managerRef.current;
      if (manager && manager.isConnected()) {
        operationQueueRef.current.forEach(op => {
          manager
            .send('execute_operation', {
              operationId: op.id,
              data: op.data,
            })
            .catch(error => Logger.error('恢复操作失败:', error));
        });
        operationQueueRef.current = [];
        setState(prev => ({
          ...prev,
          pendingOperations: 0,
        }));
      }
    }
  }, []);

  // 初始化 WebSocket 连接
  useEffect(() => {
    const manager = createWebSocketManager({
      url: buildWsUrl(),
      reconnectAttempts: maxReconnectAttempts,
      reconnectIntervalRange,
      heartbeatInterval,
    });

    managerRef.current = manager;

    // 事件监听
    const handleConnected = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      handleConnectionChange(true);
    };
    const handleDisconnected = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      handleConnectionChange(false);
    };
    const handleReconnecting = () => {
      setState(prev => ({ ...prev, status: 'reconnecting' }));
    };

    manager.on('connected', handleConnected);
    manager.on('disconnected', handleDisconnected);
    manager.on('reconnecting', handleReconnecting);
    manager.on('message', handleWebSocketMessage);

    // 自动连接
    manager.connect().catch(error => Logger.error('WebSocket 连接失败:', error));

    return () => {
      manager.off('connected', handleConnected);
      manager.off('disconnected', handleDisconnected);
      manager.off('reconnecting', handleReconnecting);
      manager.off('message', handleWebSocketMessage);
      manager.destroy();
      clearOperationTimeout();
    };
  }, [
    buildWsUrl,
    maxReconnectAttempts,
    reconnectIntervalRange,
    heartbeatInterval,
    handleConnectionChange,
    handleWebSocketMessage,
    clearOperationTimeout,
  ]);

  // 执行操作
  const executeOperation = useCallback(
    async (data: Record<string, unknown>) => {
      const manager = managerRef.current;
      if (!manager) {
        throw new Error('WebSocket 管理器未初始化');
      }

      const opId = `${operationId}_${Date.now()}`;
      currentOperationRef.current = opId;

      setState(prev => ({
        ...prev,
        status: 'pending',
        error: undefined,
        progress: undefined,
      }));

      try {
        if (manager.isConnected()) {
          // 在线时直接发送
          await manager.send('execute_operation', {
            operationId: opId,
            data,
          });
          setState(prev => ({
            ...prev,
            status: 'in_progress',
            pendingOperations: prev.pendingOperations + 1,
          }));
          setOperationTimeout();
        } else if (enableOptimisticUI) {
          // 离线时加入队列（乐观 UI）
          operationQueueRef.current.push({
            id: opId,
            data,
            timestamp: Date.now(),
          });
          setState(prev => ({
            ...prev,
            status: 'in_progress',
            pendingOperations: prev.pendingOperations + 1,
          }));
          Logger.info('操作已加入队列，等待重连后执行');
        } else {
          throw new Error('网络连接不可用');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: error instanceof Error ? error.message : '操作执行失败',
        }));
        currentOperationRef.current = null;
        throw error;
      }
    },
    [managerRef, operationId, enableOptimisticUI, setOperationTimeout]
  );

  // 手动重连
  const reconnect = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) {
      throw new Error('WebSocket 管理器未初始化');
    }

    setState(prev => ({ ...prev, status: 'reconnecting' }));
    await manager.connect();
  }, [managerRef]);

  // 强制同步
  const sync = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager || !manager.isConnected()) {
      throw new Error('网络连接不可用');
    }

    await manager.send('sync_operation', { operationId });
  }, [managerRef, operationId]);

  // 清理资源
  const cleanup = useCallback(() => {
    clearOperationTimeout();
    const manager = managerRef.current;
    if (manager) {
      manager.destroy();
    }
    operationQueueRef.current = [];
    currentOperationRef.current = null;
  }, [clearOperationTimeout]);

  return {
    state,
    executeOperation,
    reconnect,
    sync,
    cleanup,
  };
};

export default useReliableOperation;
