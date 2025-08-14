/**
 * API响应格式单元测试
 */

const {
    ErrorCodes,
    createSuccessResponse,
    createErrorResponse,
    createPaginatedResponse,
    isRetryableError,
    getErrorSuggestions,
    getStatusCode
} = require('../types/ApiResponse');

const { ApiError, ErrorFactory } = require('../utils/ApiError');

describe('API响应格式测试', () => {
    describe('createSuccessResponse', () => {
        test('应该创建基本成功响应', () => {
            const response = createSuccessResponse();

            expect(response.success).toBe(true);
            expect(response.meta).toBeDefined();
            expect(response.meta.timestamp).toBeDefined();
            expect(response.meta.requestId).toBeDefined();
            expect(response.meta.version).toBeDefined();
        });

        test('应该创建带数据的成功响应', () => {
            const testData = { id: 1, name: 'test' };
            const response = createSuccessResponse(testData, '操作成功');

            expect(response.success).toBe(true);
            expect(response.data).toEqual(testData);
            expect(response.message).toBe('操作成功');
        });

        test('应该创建带元数据的成功响应', () => {
            const meta = { customField: 'value' };
            const response = createSuccessResponse(null, null, meta);

            expect(response.meta.customField).toBe('value');
            expect(response.meta.timestamp).toBeDefined();
        });
    });

    describe('createErrorResponse', () => {
        test('应该创建基本错误响应', () => {
            const response = createErrorResponse(ErrorCodes.INTERNAL_ERROR);

            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
            expect(response.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
            expect(response.error.message).toBe('服务器内部错误');
            expect(response.error.retryable).toBe(true);
            expect(response.meta).toBeDefined();
        });

        test('应该创建带自定义消息的错误响应', () => {
            const customMessage = '自定义错误消息';
            const response = createErrorResponse(ErrorCodes.VALIDATION_ERROR, customMessage);

            expect(response.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
            expect(response.error.message).toBe(customMessage);
        });

        test('应该创建带详情的错误响应', () => {
            const details = { field: 'email', reason: '格式无效' };
            const response = createErrorResponse(ErrorCodes.VALIDATION_ERROR, null, details);

            expect(response.error.details).toEqual(details);
        });

        test('应该包含错误建议', () => {
            const response = createErrorResponse(ErrorCodes.TOKEN_EXPIRED);

            expect(response.error.suggestions).toBeDefined();
            expect(response.error.suggestions.length).toBeGreaterThan(0);
        });
    });

    describe('createPaginatedResponse', () => {
        test('应该创建分页响应', () => {
            const data = [1, 2, 3];
            const response = createPaginatedResponse(data, 1, 10, 25);

            expect(response.success).toBe(true);
            expect(response.data).toEqual(data);
            expect(response.meta.pagination).toBeDefined();
            expect(response.meta.pagination.page).toBe(1);
            expect(response.meta.pagination.limit).toBe(10);
            expect(response.meta.pagination.total).toBe(25);
            expect(response.meta.pagination.totalPages).toBe(3);
            expect(response.meta.pagination.hasNext).toBe(true);
            expect(response.meta.pagination.hasPrev).toBe(false);
        });

        test('应该正确计算分页信息', () => {
            const response = createPaginatedResponse([], 2, 10, 25);

            expect(response.meta.pagination.page).toBe(2);
            expect(response.meta.pagination.hasNext).toBe(true);
            expect(response.meta.pagination.hasPrev).toBe(true);
        });

        test('应该处理最后一页', () => {
            const response = createPaginatedResponse([], 3, 10, 25);

            expect(response.meta.pagination.page).toBe(3);
            expect(response.meta.pagination.hasNext).toBe(false);
            expect(response.meta.pagination.hasPrev).toBe(true);
        });
    });

    describe('错误代码工具函数', () => {
        test('isRetryableError应该正确识别可重试错误', () => {
            expect(isRetryableError(ErrorCodes.TIMEOUT)).toBe(true);
            expect(isRetryableError(ErrorCodes.SERVICE_UNAVAILABLE)).toBe(true);
            expect(isRetryableError(ErrorCodes.INTERNAL_ERROR)).toBe(true);
            expect(isRetryableError(ErrorCodes.VALIDATION_ERROR)).toBe(false);
            expect(isRetryableError(ErrorCodes.UNAUTHORIZED)).toBe(false);
        });

        test('getErrorSuggestions应该返回相关建议', () => {
            const suggestions = getErrorSuggestions(ErrorCodes.TOKEN_EXPIRED);
            expect(suggestions).toBeInstanceOf(Array);
            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions[0]).toContain('重新登录');
        });

        test('getStatusCode应该返回正确的HTTP状态码', () => {
            expect(getStatusCode(ErrorCodes.VALIDATION_ERROR)).toBe(400);
            expect(getStatusCode(ErrorCodes.UNAUTHORIZED)).toBe(401);
            expect(getStatusCode(ErrorCodes.FORBIDDEN)).toBe(403);
            expect(getStatusCode(ErrorCodes.RESOURCE_NOT_FOUND)).toBe(404);
            expect(getStatusCode(ErrorCodes.INTERNAL_ERROR)).toBe(500);
        });
    });
});

describe('ApiError类测试', () => {
    test('应该创建基本API错误', () => {
        const error = new ApiError(ErrorCodes.VALIDATION_ERROR, '验证失败');

        expect(error.name).toBe('ApiError');
        expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
        expect(error.message).toBe('验证失败');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error.timestamp).toBeDefined();
    });

    test('应该使用默认错误消息', () => {
        const error = new ApiError(ErrorCodes.INTERNAL_ERROR);

        expect(error.message).toBe('服务器内部错误');
    });

    test('应该包含错误详情', () => {
        const details = { field: 'email' };
        const error = new ApiError(ErrorCodes.VALIDATION_ERROR, null, null, details);

        expect(error.details).toEqual(details);
    });

    test('toJSON应该返回正确格式', () => {
        const error = new ApiError(ErrorCodes.VALIDATION_ERROR, '验证失败');
        const json = error.toJSON();

        expect(json.name).toBe('ApiError');
        expect(json.code).toBe(ErrorCodes.VALIDATION_ERROR);
        expect(json.message).toBe('验证失败');
        expect(json.statusCode).toBe(400);
        expect(json.timestamp).toBeDefined();
    });
});

describe('ErrorFactory测试', () => {
    test('validation应该创建验证错误', () => {
        const errors = ['邮箱格式无效', '密码过短'];
        const error = ErrorFactory.validation(errors);

        expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
        expect(error.details.fields).toEqual(errors);
        expect(error.details.count).toBe(2);
    });

    test('unauthorized应该创建未授权错误', () => {
        const error = ErrorFactory.unauthorized('需要登录');

        expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
        expect(error.message).toBe('需要登录');
        expect(error.statusCode).toBe(401);
    });

    test('notFound应该创建资源不存在错误', () => {
        const error = ErrorFactory.notFound('用户');

        expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
        expect(error.message).toBe('用户不存在');
        expect(error.statusCode).toBe(404);
    });

    test('token应该创建令牌错误', () => {
        const expiredError = ErrorFactory.token('expired');
        expect(expiredError.code).toBe(ErrorCodes.TOKEN_EXPIRED);

        const invalidError = ErrorFactory.token('invalid');
        expect(invalidError.code).toBe(ErrorCodes.TOKEN_INVALID);

        const missingError = ErrorFactory.token('missing');
        expect(missingError.code).toBe(ErrorCodes.TOKEN_MISSING);
    });

    test('database应该创建数据库错误', () => {
        const connectionError = ErrorFactory.database('connection');
        expect(connectionError.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);

        const duplicateError = ErrorFactory.database('duplicate');
        expect(duplicateError.code).toBe(ErrorCodes.DUPLICATE_ENTRY);
    });

    test('fromError应该从原生错误创建API错误', () => {
        const nativeError = new Error('原生错误');
        nativeError.code = '23505';

        const apiError = ErrorFactory.fromError(nativeError);

        expect(apiError).toBeInstanceOf(ApiError);
        expect(apiError.code).toBe(ErrorCodes.DUPLICATE_ENTRY);
        expect(apiError.message).toBe('原生错误');
    });

    test('fromError应该直接返回ApiError实例', () => {
        const originalError = new ApiError(ErrorCodes.VALIDATION_ERROR);
        const result = ErrorFactory.fromError(originalError);

        expect(result).toBe(originalError);
    });
});

describe('错误代码完整性测试', () => {
    test('所有错误代码都应该有对应的HTTP状态码', () => {
        Object.values(ErrorCodes).forEach(code => {
            const statusCode = getStatusCode(code);
            expect(statusCode).toBeGreaterThanOrEqual(400);
            expect(statusCode).toBeLessThan(600);
        });
    });

    test('所有错误代码都应该有中文错误消息', () => {
        Object.values(ErrorCodes).forEach(code => {
            const response = createErrorResponse(code);
            expect(response.error.message).toBeDefined();
            expect(response.error.message.length).toBeGreaterThan(0);
        });
    });
});

describe('响应格式一致性测试', () => {
    test('成功响应应该有一致的结构', () => {
        const responses = [
            createSuccessResponse(),
            createSuccessResponse({ data: 'test' }),
            createSuccessResponse(null, '成功'),
            createPaginatedResponse([], 1, 10, 0)
        ];

        responses.forEach(response => {
            expect(response).toHaveProperty('success', true);
            expect(response).toHaveProperty('meta');
            expect(response.meta).toHaveProperty('timestamp');
            expect(response.meta).toHaveProperty('requestId');
            expect(response.meta).toHaveProperty('version');
        });
    });

    test('错误响应应该有一致的结构', () => {
        const responses = [
            createErrorResponse(ErrorCodes.INTERNAL_ERROR),
            createErrorResponse(ErrorCodes.VALIDATION_ERROR, '验证失败'),
            createErrorResponse(ErrorCodes.UNAUTHORIZED, null, { reason: 'token' })
        ];

        responses.forEach(response => {
            expect(response).toHaveProperty('success', false);
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code');
            expect(response.error).toHaveProperty('message');
            expect(response.error).toHaveProperty('retryable');
            expect(response).toHaveProperty('meta');
            expect(response.meta).toHaveProperty('timestamp');
            expect(response.meta).toHaveProperty('requestId');
        });
    });
});