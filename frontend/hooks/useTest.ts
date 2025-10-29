/**
 * 测试相关的自定义Hook
 * 基于全局状态管理的测试功能
 */

import Logger from '@/utils/logger';
import { useCallback, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

// 测试配置接口
export interface TestConfig {
    id?: string;
    name: string;
    type: string;
    url: string;
    options: Record<string, any>;
}

// 测试结果接口
export interface TestResult {
    id: string;
    type: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    score?: number;
    startTime: string;
    endTime?: string;
    duration?: number;
    summary?: string;
    details?: any;
    recommendations?: Array<{
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        solution: string;
    }>;
    error?: string;
}

// 测试Hook
export const useTest = () => {
    const [error, setError] = useState<string | null>(null);

    const { state, dispatch } = useAppContext();
    const { test } = state;

    // 开始测试
    const startTest = useCallback(async (config: TestConfig): Promise<string> => {
        try {
            const testId = Date.now().toString();
            const testData = {
                id: testId,
                type: config.type,
                status: 'running' as const,
                progress: 0,
                startTime: new Date().toISOString()
            };

            dispatch({
                type: 'TEST_START',
                payload: { test: testData }
            });

            dispatch({ type: 'UI_SET_LOADING', payload: { key: 'test', loading: true } });

            // 模拟测试执行
            const response = await fetch('/api/test/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.auth.token}`
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                throw new Error('测试启动失败');
            }

            const result = await response.json();

            return result.testId || testId;

        } catch (error) {
            const errorMessage = error instanceof Error ? error?.message : '测试启动失败';
            dispatch({
                type: 'TEST_FAIL',
                payload: { testId: Date.now().toString(), error: errorMessage }
            });
            throw error;
        } finally {
            dispatch({ type: 'UI_SET_LOADING', payload: { key: 'test', loading: false } });
        }
    }, [state.auth.token, dispatch]);

    // 更新测试进度
    const updateTestProgress = useCallback((testId: string, progress: number) => {
        dispatch({
            type: 'TEST_UPDATE_PROGRESS',
            payload: { testId, progress }
        });
    }, [dispatch]);

    // 完成测试
    const completeTest = useCallback((testId: string, result: TestResult) => {
        dispatch({
            type: 'TEST_COMPLETE',
            payload: { testId, result }
        });
    }, [dispatch]);

    // 取消测试
    const cancelTest = useCallback(async (testId: string): Promise<void> => {
        try {
            // 调用API取消测试
            if (state.auth.token) {
                await fetch(`/api/test/${testId}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${state.auth.token}`
                    }
                });
            }

            dispatch({
                type: 'TEST_CANCEL',
                payload: { testId }
            });

        } catch (error) {
            Logger.error('Cancel test error:', error);
            // 即使API调用失败，也要取消本地状态
            dispatch({
                type: 'TEST_CANCEL',
                payload: { testId }
            });
        }
    }, [state.auth.token, dispatch]);

    // 获取测试历史
    const getTestHistory = useCallback(async (filters?: {
        type?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<TestResult[]> => {
        try {
            const queryParams = new URLSearchParams();
            if (filters?.type) queryParams.append('type', filters?.type);
            if (filters?.status) queryParams.append('status', filters?.status);
            if (filters?.limit) queryParams.append('limit', filters?.limit.toString());
            if (filters?.offset) queryParams.append('offset', filters?.offset.toString());

            const response = await fetch(`/api/test/history?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取测试历史失败');
            }

            const data = await response.json();
            return (data.results || []).map((item: any): TestResult => ({
                id: item.id || '',
                type: item.type || '',
                status: item.status || 'completed',
                score: item.score,
                startTime: item.startTime || new Date().toISOString(),
                endTime: item.endTime,
                duration: item.duration,
                summary: item.summary,
                details: item.details,
                recommendations: item.recommendations,
                error: item.error
            }));

        } catch (error) {
            Logger.error('Get test history error:', error);
            return test.history as TestResult[];
        }
    }, [state.auth.token, test.history]);

    // 保存测试配置
    const saveConfiguration = useCallback(async (config: TestConfig): Promise<void> => {
        try {
            const response = await fetch('/api/test/configurations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.auth.token}`
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                throw new Error('保存配置失败');
            }

            const savedConfig = await response.json();

            dispatch({
                type: 'TEST_SAVE_CONFIGURATION',
                payload: { config: savedConfig }
            });

        } catch (error) {
            Logger.error('Save configuration error:', error);
            throw error;
        }
    }, [state.auth.token, dispatch]);

    // 获取测试配置
    const getConfigurations = useCallback(async (): Promise<TestConfig[]> => {
        try {
            const response = await fetch('/api/test/configurations', {
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取配置失败');
            }

            const data = await response.json();
            const mappedConfigs: TestConfig[] = (data.configurations || []).map((item: any) => ({
                id: item.id,
                name: item.name || '',
                type: item.type || '',
                url: item.url || '',
                options: item.config || item.options || {}
            }));
            return mappedConfigs;

        } catch (error) {
            Logger.error('Get configurations error:', error);
            return test.configurations as unknown as TestConfig[];
        }
    }, [state.auth.token, test.configurations]);

    // 删除测试配置
    const deleteConfiguration = useCallback(async (configId: string): Promise<void> => {
        try {
            const response = await fetch(`/api/test/configurations/${configId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('删除配置失败');
            }

            // 更新本地状态
            // 这里可以添加删除配置的action

        } catch (error) {
            Logger.error('Delete configuration error:', error);
            throw error;
        }
    }, [state.auth.token]);

    // 获取测试详情
    const getTestDetails = useCallback(async (testId: string): Promise<TestResult | null> => {
        try {
            const response = await fetch(`/api/test/${testId}`, {
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取测试详情失败');
            }

            const data = await response.json();
            return data.result;

        } catch (error) {
            Logger.error('Get test details error:', error);
            return null;
        }
    }, [state.auth.token]);

    // 重新运行测试
    const retryTest = useCallback(async (testId: string): Promise<string> => {
        try {
            // 获取原测试配置
            const testDetails = await getTestDetails(testId);
            if (!testDetails) {
                throw new Error('无法获取测试配置');
            }

            // 使用原配置重新开始测试
            const config: TestConfig = {
                name: `重试-${testDetails.type}`,
                type: testDetails.type,
                url: '', // 需要从详情中获取
                options: testDetails.details?.config || {}
            };

            return await startTest(config);

        } catch (error) {
            Logger.error('Retry test error:', error);
            throw error;
        }
    }, [getTestDetails, startTest]);

    // 导出测试结果
    const exportTestResult = useCallback(async (testId: string, format: 'json' | 'pdf' | 'csv'): Promise<Blob> => {
        try {
            const response = await fetch(`/api/test/${testId}/export?format=${format}`, {
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('导出测试结果失败');
            }

            return await response.blob();

        } catch (error) {
            Logger.error('Export test result error:', error);
            throw error;
        }
    }, [state.auth.token]);

    // 清除测试错误
    const clearError = useCallback(() => {
        dispatch({ type: 'TEST_CLEAR_ERROR' });
    }, [dispatch]);

    // 获取活跃测试
    const getActiveTest = useCallback((testId: string) => {
        return test.activeTests.find(t => t.id === testId);
    }, [test.activeTests]);

    // 检查是否有正在运行的测试
    const hasRunningTests = useCallback(() => {
        return test.activeTests.length > 0;
    }, [test.activeTests]);

    return {
        // 状态
        activeTests: test.activeTests,
        history: test.history,
        configurations: test.configurations,
        isRunning: test.isRunning,
        error: test.error,

        // 方法
        startTest,
        updateTestProgress,
        completeTest,
        cancelTest,
        getTestHistory,
        saveConfiguration,
        getConfigurations,
        deleteConfiguration,
        getTestDetails,
        retryTest,
        exportTestResult,
        clearError,
        getActiveTest,
        hasRunningTests
    };
};

export default useTest;