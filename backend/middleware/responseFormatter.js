/**
 * API响应格式化中间件 - 标准版本
 * 版本: v2.0.0
 * 确保所有API返回统一的标准数据结构
 */

// 导入标准API响应构建工具
const {
    createSuccessResponse,
    createErrorResponse,
    createPaginatedResponse,
    createValidationErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
    createNotFoundResponse,
    createConflictResponse,
    createRateLimitResponse,
    createInternalErrorResponse,
    createCreatedResponse,
    createNoContentResponse,
    generateRequestId,
    getHttpStatusCode,
    createPaginationMeta
} = require('../../shared/utils/apiResponseBuilder');

const {
    StandardErrorCode
} = require('../../shared/types/standardApiResponse.js');

/**
 * 响应格式化中间件
 * 在所有路由处理之前添加响应格式化方法
 */
const responseFormatter = (req, res, next) => {
    // 生成请求ID
    const requestId = generateRequestId();
    req.requestId = requestId;

    // 记录请求开始时间
    req.startTime = Date.now();

    /**
     * 发送标准成功响应
     * @param {*} data - 响应数据
     * @param {string} [message] - 响应消息
     * @param {number} [statusCode=200] - HTTP状态码
     * @param {Object} [meta] - 额外元数据
     */
    res.success = (data = null, message = null, statusCode = 200, meta = {}) => {
        const duration = Date.now() - req.startTime;

        const response = createSuccessResponse(data, message, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0',
            ...meta
        });

        return res.status(statusCode).json(response);
    };

    /**
     * 发送标准错误响应
     * @param {string} code - 错误代码
     * @param {string} [message] - 自定义错误消息
     * @param {*} [details] - 错误详情
     * @param {number} [statusCode] - HTTP状态码（可选，会根据错误代码自动推断）
     * @param {Object} [meta] - 额外元数据
     */
    res.error = (code, message = null, details = null, statusCode = null, meta = {}) => {
        const duration = Date.now() - req.startTime;
        const httpStatusCode = statusCode || getHttpStatusCode(code);

        const response = createErrorResponse(code, message, details, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0',
            ...meta
        });

        return res.status(httpStatusCode).json(response);
    };

    /**
     * 发送标准分页响应
     * @param {Array} data - 数据数组
     * @param {number} page - 当前页码
     * @param {number} limit - 每页数量
     * @param {number} total - 总记录数
     * @param {string} [message] - 响应消息
     * @param {Object} [meta] - 额外元数据
     */
    res.paginated = (data, page, limit, total, message = null, meta = {}) => {
        const duration = Date.now() - req.startTime;
        const pagination = createPaginationMeta(page, limit, total);

        const response = createPaginatedResponse(data, pagination, message, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0',
            ...meta
        });

        return res.status(200).json(response);
    };

    /**
     * 发送标准验证错误响应
     * @param {Array|Object} errors - 验证错误数组或对象
     * @param {string} [message] - 自定义错误消息
     */
    res.validationError = (errors, message = null) => {
        const duration = Date.now() - req.startTime;
        const formattedErrors = Array.isArray(errors) ? errors : [errors];

        const response = createValidationErrorResponse(formattedErrors, message, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0'
        });

        return res.status(400).json(response);
    };

    /**
     * 发送创建成功响应 (201)
     * @param {*} data - 创建的资源数据
     * @param {string} [message] - 响应消息
     * @param {Object} [meta] - 额外元数据
     */
    res.created = (data, message = '创建成功', meta = {}) => {
        const duration = Date.now() - req.startTime;

        const response = createCreatedResponse(data, message, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0',
            ...meta
        });

        return res.status(201).json(response);
    };

    /**
     * 发送无内容响应 (204)
     * @param {string} [message] - 响应消息
     * @param {Object} [meta] - 额外元数据
     */
    res.noContent = (message = '操作成功', meta = {}) => {
        const duration = Date.now() - req.startTime;

        const response = createNoContentResponse(message, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0',
            ...meta
        });

        return res.status(204).json(response);
    };

    /**
     * 发送未授权错误响应 (401)
     * @param {string} [message] - 错误消息
     */
    res.unauthorized = (message = '未授权访问') => {
        const duration = Date.now() - req.startTime;

        const response = createUnauthorizedResponse(message, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0'
        });

        return res.status(401).json(response);
    };

    /**
     * 发送禁止访问错误响应 (403)
     * @param {string} [message] - 错误消息
     */
    res.forbidden = (message = '禁止访问') => {
        const duration = Date.now() - req.startTime;

        const response = createForbiddenResponse(message, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0'
        });

        return res.status(403).json(response);
    };

    /**
     * 发送资源未找到错误响应 (404)
     * @param {string} [resource] - 资源名称
     */
    res.notFound = (resource = '资源') => {
        const duration = Date.now() - req.startTime;

        const response = createNotFoundResponse(resource, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0'
        });

        return res.status(404).json(response);
    };

    /**
     * 发送资源冲突错误响应 (409)
     * @param {string} [resource] - 资源名称
     * @param {string} [message] - 自定义消息
     */
    res.conflict = (resource = '资源', message = null) => {
        const duration = Date.now() - req.startTime;

        const response = createConflictResponse(resource, message, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0'
        });

        return res.status(409).json(response);
    };

    /**
     * 发送限流错误响应 (429)
     * @param {string} [message] - 错误消息
     * @param {number} [retryAfter] - 重试等待时间(秒)
     */
    res.rateLimit = (message = '请求过于频繁', retryAfter = null) => {
        const duration = Date.now() - req.startTime;

        const response = createRateLimitResponse(message, retryAfter, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0'
        });

        if (retryAfter) {
            res.set('Retry-After', retryAfter.toString());
        }

        return res.status(429).json(response);
    };

    /**
     * 发送服务器内部错误响应 (500)
     * @param {string} [message] - 错误消息
     * @param {Object} [details] - 错误详情
     */
    res.serverError = (message = '服务器内部错误', details = null) => {
        const duration = Date.now() - req.startTime;

        const response = createInternalErrorResponse(message, details, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            version: '2.0.0'
        });

        return res.status(500).json(response);
    };



    next();
};

/**
 * 错误响应格式化中间件
 * 捕获并格式化所有未处理的错误
 */
const errorResponseFormatter = (err, req, res, next) => {
    // 如果响应已经发送，则跳过
    if (res.headersSent) {

        return next(err);
    }

    console.error('API错误:', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        error: err.message,
        stack: err.stack
    });

    // 根据错误类型映射到标准错误代码
    let errorCode = StandardErrorCode.INTERNAL_SERVER_ERROR;
    let statusCode = 500;
    let details = null;

    // JWT错误
    if (err.name === 'JsonWebTokenError') {
        errorCode = StandardErrorCode.INVALID_TOKEN;
    } else if (err.name === 'TokenExpiredError') {
        errorCode = StandardErrorCode.TOKEN_EXPIRED;
    }
    // 数据库错误
    else if (err.code === 'ECONNREFUSED') {
        errorCode = StandardErrorCode.EXTERNAL_SERVICE_ERROR;
    } else if (err.code === '23505') {
        errorCode = StandardErrorCode.DUPLICATE_RESOURCE;
    } else if (err.code === '23503') {
        errorCode = StandardErrorCode.BUSINESS_LOGIC_ERROR;
    } else if (err.code === '23502') {
        errorCode = StandardErrorCode.MISSING_REQUIRED_FIELD;
    }
    // 文件上传错误
    else if (err.code === 'LIMIT_FILE_SIZE') {
        errorCode = StandardErrorCode.VALIDATION_ERROR;
        details = { reason: 'file_too_large' };
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        errorCode = StandardErrorCode.VALIDATION_ERROR;
        details = { reason: 'invalid_file_type' };
    }
    // 网络错误
    else if (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') {
        errorCode = StandardErrorCode.EXTERNAL_SERVICE_ERROR;
    } else if (err.code === 'ETIMEDOUT') {
        errorCode = StandardErrorCode.TIMEOUT_ERROR;
    }
    // 验证错误
    else if (err.name === 'ValidationError') {
        errorCode = StandardErrorCode.VALIDATION_ERROR;
        details = err.errors;
    }
    // 自定义应用错误
    else if (err.code && Object.values(StandardErrorCode).includes(err.code)) {
        errorCode = err.code;
        statusCode = err.statusCode || getHttpStatusCode(errorCode);
        details = err.details;
    }

    // 在开发环境中添加调试信息
    const meta = {};
    if (process.env.NODE_ENV === 'development') {
        meta.debug = {
            originalError: err.message,
            stack: err.stack,
            code: err.code
        };
    }

    return res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message: err.message,
            details
        },
        meta
    });
};

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, _next) => {
    return res.error(
        StandardErrorCode.NOT_FOUND,
        `接口 ${req.method} ${req.originalUrl} 不存在`,
        {
            method: req.method,
            path: req.originalUrl,
            availableEndpoints: getAvailableEndpoints()
        },
        404
    );
};

/**
 * 获取可用的API端点列表
 * @returns {Object} 可用端点列表
 */
const getAvailableEndpoints = () => {
    return {
        auth: '/api/auth',
        test: '/api/test',
        oauth: '/api/oauth',
        security: '/api/security',
        users: '/api/users',
        analytics: '/api/analytics',
        comparison: '/api/comparison',
        integrations: '/api/integrations',
        batch: '/api/batch',
        core: '/api/core',
        system: '/api/system',
        performance: '/api/performance',
        data: '/api/data',
        admin: '/api/admin',
        health: '/health'
    };
};

/**
 * 响应时间记录中间件
 */
const responseTimeLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            timestamp: new Date().toISOString()
        };

        // 记录慢请求（超过1秒）
        if (duration > 1000) {
            console.warn('慢请求警告:', logData);
        }

        // 记录错误请求
        if (res.statusCode >= 400) {
            console.error('错误请求:', logData);
        }
    });

    next();
};

module.exports = {
    responseFormatter,
    errorResponseFormatter,
    notFoundHandler,
    responseTimeLogger
};