/**
 * API工具函数测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildQueryString, formatApiResponse, handleApiError } from '../apiUtils';

describe('API工具函数', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('formatApiResponse', () => {
        it('应该正确格式化成功响应', () => {
            const data = { id: 1, name: 'test' };
            const result = formatApiResponse(data);

            expect(result).toEqual({
                success: true,
                data,
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                }),
            });
        });

        it('应该正确格式化错误响应', () => {
            const error = new Error('测试错误');
            const result = formatApiResponse(null, error);

            expect(result).toEqual({
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: '测试错误',
                },
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                }),
            });
        });
    });

    describe('handleApiError', () => {
        it('应该处理网络错误', () => {
            const networkError = {
                code: 'NETWORK_ERROR',
                message: '网络连接失败',
            };

            const result = handleApiError(networkError);

            expect(result).toEqual({
                type: 'network',
                message: '网络连接失败，请检查网络设置',
                canRetry: true,
            });
        });

        it('应该处理认证错误', () => {
            const authError = {
                response: { status: 401 },
                message: '未授权',
            };

            const result = handleApiError(authError);

            expect(result).toEqual({
                type: 'auth',
                message: '登录已过期，请重新登录',
                canRetry: false,
            });
        });

        it('应该处理服务器错误', () => {
            const serverError = {
                response: { status: 500 },
                message: '服务器内部错误',
            };

            const result = handleApiError(serverError);

            expect(result).toEqual({
                type: 'server',
                message: '服务器错误，请稍后重试',
                canRetry: true,
            });
        });
    });

    describe('buildQueryString', () => {
        it('应该构建正确的查询字符串', () => {
            const params = {
                page: 1,
                limit: 10,
                search: 'test',
                active: true,
            };

            const result = buildQueryString(params);

            expect(result).toBe('page=1&limit=10&search=test&active=true');
        });

        it('应该忽略空值', () => {
            const params = {
                page: 1,
                search: '',
                active: null,
                undefined: undefined,
            };

            const result = buildQueryString(params);

            expect(result).toBe('page=1');
        });

        it('应该处理数组参数', () => {
            const params = {
                tags: ['tag1', 'tag2'],
                ids: [1, 2, 3],
            };

            const result = buildQueryString(params);

            expect(result).toBe('tags=tag1%2Ctag2&ids=1%2C2%2C3');
        });

        it('应该处理空对象', () => {
            const result = buildQueryString({});
            expect(result).toBe('');
        });
    });
});