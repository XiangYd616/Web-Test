/**
 * API工具函数
 * 提供API响应格式化、错误处理和查询字符串构建等功能
 */

import type { ApiResponse } from '../types/common';

/**
 * 格式化API响应
 * @param data 响应数据
 * @param error 错误信息
 * @returns 格式化后的API响应
 */
export function formatApiResponse<T>(
    data: T | null = null,
    error: Error | null = null
): ApiResponse<T> {
    const timestamp = new Date().toISOString();

    if (error) {
        return {
            success: false,
            error: {
                code: 'UNKNOWN_ERROR',
                message: error.message,
            },
            meta: {
                timestamp,
                requestId: generateRequestId(),
                version: '1.0.0',
            },
        };
    }

    return {
        success: true,
        data: data || undefined,
        meta: {
            timestamp,
            requestId: generateRequestId(),
            version: '1.0.0',
        },
    };
}

/**
 * 处理API错误
 * @param error 错误对象
 * @returns 错误处理结果
 */
export function handleApiError(error: any) {
    // 网络错误
    if (error.code === 'NETWORK_ERROR' || !error.response) {
        return {
            type: 'network',
            message: '网络连接失败，请检查网络设置',
            canRetry: true,
        };
    }

    const status = error.response?.status;

    // 认证错误
    if (status === 401) {
        return {
            type: 'auth',
            message: '登录已过期，请重新登录',
            canRetry: false,
        };
    }

    // 权限错误
    if (status === 403) {
        return {
            type: 'permission',
            message: '没有权限执行此操作',
            canRetry: false,
        };
    }

    // 资源不存在
    if (status === 404) {
        return {
            type: 'notFound',
            message: '请求的资源不存在',
            canRetry: false,
        };
    }

    // 请求错误
    if (status >= 400 && status < 500) {
        return {
            type: 'client',
            message: error.response?.data?.message || '请求参数错误',
            canRetry: false,
        };
    }

    // 服务器错误
    if (status >= 500) {
        return {
            type: 'server',
            message: '服务器错误，请稍后重试',
            canRetry: true,
        };
    }

    // 未知错误
    return {
        type: 'unknown',
        message: error.message || '未知错误',
        canRetry: true,
    };
}

/**
 * 构建查询字符串
 * @param params 查询参数对象
 * @returns 查询字符串
 */
export function buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value)) {
                searchParams.append(key, value.join(','));
            } else {
                searchParams.append(key, String(value));
            }
        }
    });

    return searchParams.toString();
}

/**
 * 生成请求ID
 * @returns 唯一的请求ID
 */
function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 检查响应是否成功
 * @param response API响应
 * @returns 是否成功
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true } {
    return response.success === true;
}

/**
 * 提取API响应数据
 * @param response API响应
 * @returns 响应数据
 */
export function extractApiData<T>(response: ApiResponse<T>): T | null {
    return isApiSuccess(response) ? response.data || null : null;
}

/**
 * 提取API错误信息
 * @param response API响应
 * @returns 错误信息
 */
export function extractApiError<T>(response: ApiResponse<T>): string | null {
    return !isApiSuccess(response) ? response.error?.message || '未知错误' : null;
}