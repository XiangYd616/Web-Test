/**
 * useTest Hook 单元测试
 */

import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppProvider } from '../../contexts/AppContext';
import { useTest } from '../useTest';
import { TestProgress } from '../../services/api/testProgressService';

// Mock fetch
global.fetch = vi.fn();

// 创建测试包装器
const createWrapper = ({ children }: { children: ReactNode }) => (
    <AppProvider>{ children } </AppProvider>
);

describe('useTest', () => {
    beforeEach(() => {
        // 重置fetch mock
        vi.mocked(fetch).mockClear();
    });

    describe('初始状态', () => {
        it('应该返回初始的测试状态', () => {
            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            expect(result.current.activeTests).toEqual([]);
            expect(result.current.history).toEqual([]);
            expect(result.current.configurations).toEqual([]);
            expect(result.current.isRunning).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('开始测试', () => {
        it('应该成功开始测试', async () => {
            const mockTestId = 'test-123';

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    testId: mockTestId
                })
            } as Response);

            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            const testConfig = {
                name: '压力测试',
                type: 'stress',
                url: 'https://example.com',
                options: { users: 10, duration: 60 }
            };

            let testId: string = '';
            await act(async () => {
                testId = await result.current.startTest(testConfig);
            });

            expect(testId).toBe(mockTestId);
            expect(result.current.activeTests).toHaveLength(1);
            expect(result.current.isRunning).toBe(true);
        });

        it('应该处理测试启动失败', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    message: '测试启动失败'
                })
            } as Response);

            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            const testConfig = {
                name: '压力测试',
                type: 'stress',
                url: 'https://example.com',
                options: { users: 10, duration: 60 }
            };

            await act(async () => {
                try {
                    await result.current.startTest(testConfig);
                } catch (error) {
                    // 预期会抛出错误
                }
            });

            expect(result.current.error).toBe('测试启动失败');
        });
    });

    describe('测试进度更新', () => {
        it('应该能够更新测试进度', () => {
            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            const testId = 'test-123';
            const progress = 50;

            act(() => {
                result.current.updateTestProgress(testId, progress);
            });

            // 由于没有活跃测试，这里主要测试函数不会报错
            expect(result.current.activeTests).toEqual([]);
        });
    });

    describe('完成测试', () => {
        it('应该能够完成测试', () => {
            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            const testResult = {
                id: 'test-123',
                type: 'stress',
                status: 'completed' as const,
                score: 85,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                summary: '测试完成'
            };

            act(() => {
                result.current.completeTest('test-123', testResult);
            });

            expect(result.current.history).toHaveLength(1);
            expect(result.current.history[0]).toEqual(testResult);
        });
    });

    describe('取消测试', () => {
        it('应该能够取消测试', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true
            } as Response);

            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            await act(async () => {
                await result.current.cancelTest('test-123');
            });

            expect(fetch).toHaveBeenCalledWith(
                '/api/test/test-123/cancel',
                expect.objectContaining({
                    method: 'POST'
                })
            );
        });

        it('应该处理取消测试的API错误', async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            await act(async () => {
                await result.current.cancelTest('test-123');
            });

            // 即使API失败，也应该取消本地状态
            // 这里主要测试不会抛出未捕获的错误
        });
    });

    describe('获取测试历史', () => {
        it('应该能够获取测试历史', async () => {
            const mockHistory = [
                {
                    id: 'test-1',
                    type: 'stress',
                    status: 'completed',
                    score: 85,
                    startTime: new Date().toISOString()
                },
                {
                    id: 'test-2',
                    type: 'seo',
                    status: 'completed',
                    score: 92,
                    startTime: new Date().toISOString()
                }
            ];

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: mockHistory
                })
            } as Response);

            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            let history: any[] = [];
            await act(async () => {
                history = await result.current.getTestHistory();
            });

            expect(history).toEqual(mockHistory);
        });

        it('应该能够使用过滤器获取测试历史', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: []
                })
            } as Response);

            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            await act(async () => {
                await result.current.getTestHistory({
                    type: 'stress',
                    status: 'completed',
                    limit: 10
                });
            });

            expect(fetch).toHaveBeenCalledWith(
                '/api/test/history?type=stress&status=completed&limit=10',
                expect.any(Object)
            );
        });
    });

    describe('保存测试配置', () => {
        it('应该能够保存测试配置', async () => {
            const mockConfig = {
                id: 'config-1',
                name: '压力测试配置',
                type: 'stress',
                url: 'https://example.com',
                options: { users: 10, duration: 60 }
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockConfig
            } as Response);

            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            await act(async () => {
                await result.current.saveConfiguration(mockConfig);
            });

            expect(result.current.configurations).toHaveLength(1);
            expect(result.current.configurations[0]).toEqual(mockConfig);
        });
    });

    describe('工具方法', () => {
        it('应该能够检查是否有正在运行的测试', () => {
            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            expect(result.current.hasRunningTests()).toBe(false);
        });

        it('应该能够获取活跃测试', () => {
            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            const activeTest = result.current.getActiveTest('test-123');
            expect(activeTest).toBeUndefined();
        });

        it('应该能够清除错误', () => {
            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('导出测试结果', () => {
        it('应该能够导出测试结果', async () => {
            const mockBlob = new Blob(['test data'], { type: 'application/json' });

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                blob: async () => mockBlob
            } as Response);

            const { result } = renderHook(() => useTest(), {
                wrapper: createWrapper
            });

            let blob: Blob | null = null;
            await act(async () => {
                blob = await result.current.exportTestResult('test-123', 'json');
            });

            expect(blob).toBe(mockBlob);
            expect(fetch).toHaveBeenCalledWith(
                '/api/test/test-123/export?format=json',
                expect.any(Object)
            );
        });
    });
});