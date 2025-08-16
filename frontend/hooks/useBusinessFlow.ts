/**
 * 业务流程状态Hook
 * 提供业务流程的统一状态管理
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import testFlowManager, { TestConfig } from '../services/testFlowManager';
import dataFlowManager, { DataQuery } from '../services/dataFlowManager';
import { useAsyncErrorHandler } from './useAsyncErrorHandler';

export const useBusinessFlow = () => {
  const { isAuthenticated } = useAuth();
  const { executeAsync, state } = useAsyncErrorHandler();
  const [activeFlows, setActiveFlows] = useState<string[]>([]);

  // 执行测试流程
  const executeTestFlow = useCallback(async (config: TestConfig) => {
    if (!isAuthenticated) {
      throw new Error('请先登录');
    }

    const flowId = `test_${Date.now()}`;
    setActiveFlows(prev => [...prev, flowId]);

    try {
      const executionId = await executeAsync(
        () => testFlowManager.startTest(config),
        { context: 'BusinessFlow.executeTest' }
      );

      return executionId;
    } finally {
      setActiveFlows(prev => prev.filter(id => id !== flowId));
    }
  }, [isAuthenticated, executeAsync]);

  // 执行数据管理流程
  const executeDataFlow = useCallback(async (operation: 'query' | 'create' | 'update' | 'delete', data?: any) => {
    if (!isAuthenticated) {
      throw new Error('请先登录');
    }

    const flowId = `data_${Date.now()}`;
    setActiveFlows(prev => [...prev, flowId]);

    try {
      let result;
      switch (operation) {
        case 'query':
          result = await executeAsync(
            () => dataFlowManager.queryData(data as DataQuery),
            { context: 'BusinessFlow.queryData' }
          );
          break;
        case 'create':
          result = await executeAsync(
            () => dataFlowManager.createData(data),
            { context: 'BusinessFlow.createData' }
          );
          break;
        case 'update':
          result = await executeAsync(
            () => dataFlowManager.updateData(data.id, data),
            { context: 'BusinessFlow.updateData' }
          );
          break;
        case 'delete':
          result = await executeAsync(
            () => dataFlowManager.deleteData(data.id),
            { context: 'BusinessFlow.deleteData' }
          );
          break;
        default:
          throw new Error(`不支持的操作: ${operation}`);
      }

      return result;
    } finally {
      setActiveFlows(prev => prev.filter(id => id !== flowId));
    }
  }, [isAuthenticated, executeAsync]);

  // 检查流程状态
  const isFlowActive = useCallback((flowType?: string) => {
    if (!flowType) {
      return activeFlows.length > 0;
    }
    return activeFlows.some(id => id.startsWith(flowType));
  }, [activeFlows]);

  return {
    // 状态
    isLoading: state.isLoading,
    error: state.error,
    activeFlows,
    isAuthenticated,

    // 方法
    executeTestFlow,
    executeDataFlow,
    isFlowActive,

    // 流程状态检查
    isTestFlowActive: () => isFlowActive('test'),
    isDataFlowActive: () => isFlowActive('data'),
    hasActiveFlows: () => activeFlows.length > 0
  };
};

export default useBusinessFlow;