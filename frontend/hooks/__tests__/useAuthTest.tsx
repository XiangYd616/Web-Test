/**
 * useAuth Hook 单元测试
 */

import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppProvider } from '../../contexts/AppContext';
import { useAuth } from '../useAuth';

// Mock fetch
global.fetch = vi.fn();

// 创建测试包装器
const createWrapper = ({ children }: { children: ReactNode }) => (
    <AppProvider>{ children } </AppProvider>
);

describe('useAuth', () => {
    beforeEach(() => {
        // 清理localStorage
        localStorage.clear();
        sessionStorage.clear();

        // 重置fetch mock
        vi.mocked(fetch).mockClear();
    });

    describe('初始状态', () => {
        it('应该返回初始的认证状态', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper
            });

            expect(result.current.user).toBeNull();
            expect(result.current.token).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('登录功能', () => {
        it('应该成功登录用户', async () => {
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                username: 'testuser',
                role: 'user'
            };

            const mockResponse = {
                success: true,
                user: mockUser,
                token: 'mock-jwt-token'
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            } as Response);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper
            });

            await act(async () => {
                await result.current.login({
                    email: 'test@example.com',
                    password: 'password'
                });
            });

            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.token).toBe('mock-jwt-token');
        });

        it('应该处理登录失败', async () => {
            const mockErrorResponse = {
                success: false,
                message: '用户名或密码错误'
            };

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockErrorResponse
            } as Response);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper
            });

            await act(async () => {
                try {
                    await result.current.login({
                        email: 'test@example.com',
                        password: 'wrongpassword'
                    });
                } catch (error) {
                    // 预期会抛出错误
                }
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.error).toBe('用户名或密码错误');
        });
    });

    describe('工具方法', () => {
        it('应该能够检查用户权限', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper
            });

            // 未登录用户没有权限
            expect(result.current.hasPermission('admin')).toBe(false);
        });

        it('应该能够清除错误', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper
            });

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });
});