/**
 * API响应格式化中间件
 * 确保所有API返回统一的数据结构
 */

const {
    createSuccessResponse,
    createErrorResponse,
    createPaginatedResponse,
    generateRequestId,
    ErrorCodes,
    getStatusCode
} = require('../types/ApiResponse');

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
     * 发送成功响应
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
            ...meta
        });

        return res.status(statusCode).json(response);
    };

    /**
     * 发送错误响应
     * @param {string} code - 错误代码
     * @param {string} [message] - 自定义错误消息
     * @param {*} [details] - 错误详情
     * @param {number} [statusCode] - HTTP状态码（可选，会根据错误代码自动推断）
     * @param {Object} [meta] - 额外元数据
     */
    res.error = (code, message = null, details = null, statusCode = null, meta = {}) => {
        const duration = Date.now() - req.startTime;
        const httpStatusCode = statusCode || getStatusCode(code);

        const response = createErrorResponse(code, message, details, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            ...meta
        });

        return res.status(httpStatusCode).json(response);
    };

    /**
     * 发送分页响应
     * @param {Array} data - 数据数组
     * @param {number} page - 当前页码
     * @param {number} limit - 每页数量
     * @param {number} total - 总记录数
     * @param {string} [message] - 响应消息
     * @param {Object} [meta] - 额外元数据
     */
    res.paginated = (data, page, limit, total, message = null, meta = {}) => {
        const duration = Date.now() - req.startTime;

        const response = createPaginatedResponse(data, page, limit, total, message, {
            requestId,
            duration,
            path: req.originalUrl,
            method: req.method,
            ...meta
        });

        return res.status(200).json(response);
    };

    /**
     * 发送验证错误响应
     * @param {Array|Object} errors - 验证错误数组或对象
     * @param {string} [message] - 自定义错误消息
     */
    res.validationError = (errors, message = null) => {
        const formattedErrors = Array.isArray(errors) ? errors : [errors];

        return res.error(
            ErrorCodes.VALIDATION_ERROR,
            message || '数据验证失败',
            {
                fields: formattedErrors,
                count: formattedErrors.length
            }
        );
    };

    /**
     * 发送未授权响应
     * @param {string} [message] - 自定义错误消息
     */
    res.unauthorized = (message = null) => {
        return res.error(ErrorCodes.UNAUTHORIZED, message);
    };

    /**
     * 发送禁止访问响应
     * @param {string} [message] - 自定义错误消息
     */
    res.forbidden = (message = null) => {
        return res.error(ErrorCodes.FORBIDDEN, message);
    };

    /**
     * 发送资源不存在响应
     * @param {string} [resource] - 资源名称
     * @param {string} [message] - 自定义错误消息
     */
    res.notFound = (resource = null, message = null) => {
        const defaultMessage = resource ? `${resource}不存在` : null;
        return res.error(ErrorCodes.RESOURCE_NOT_FOUND, message || defaultMessage);
    };

    /**
     * 发送资源冲突响应
     * @param {string} [resource] - 资源名称
     * @param {string} [message] - 自定义错误消息
     */
    res.conflict = (resource = null, message = null) => {
        const defaultMessage = resource ? `${resource}已存在` : null;
        return res.error(ErrorCodes.RESOURCE_ALREADY_EXISTS, message || defaultMessage);
    };

    /**
     * 发送服务器错误响应
     * @param {string} [message] - 自定义错误消息
     * @param {*} [details] - 错误详情
     */
    res.serverError = (message = null, details = null) => {
        return res.error(ErrorCodes.INTERNAL_ERROR, message, details);
    };

    /**
     * 发送服务不可用响应
     * @param {string} [service] - 服务名称
     * @param {string} [message] - 自定义错误消息
     */
    res.serviceUnavailable = (service = null, message = null) => {
        const defaultMessage = service ? `${service}服务暂时不可用` : null;
        return res.error(ErrorCodes.SERVICE_UNAVAILABLE, message || defaultMessage);
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
    let errorCode = ErrorCodes.INTERNAL_ERROR;
    let statusCode = 500;
    let details = null;

    // JWT错误
    if (err.name === 'JsonWebTokenError') {
        errorCode = ErrorCodes.TOKEN_INVALID;
    } else if (err.name === 'TokenExpiredError') {
        errorCode = ErrorCodes.TOKEN_EXPIRED;
    }
    // 数据库错误
    else if (err.code === 'ECONNREFUSED') {
        errorCode = ErrorCodes.DATABASE_CONNECTION_ERROR;
    } else if (err.code === '23505') {
        errorCode = ErrorCodes.DUPLICATE_ENTRY;
    } else if (err.code === '23503') {
        errorCode = ErrorCodes.FOREIGN_KEY_CONSTRAINT;
    } else if (err.code === '23502') {
        errorCode = ErrorCodes.NOT_NULL_CONSTRAINT;
    }
    // 文件上传错误
    else if (err.code === 'LIMIT_FILE_SIZE') {
        errorCode = ErrorCodes.FILE_TOO_LARGE;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        errorCode = ErrorCodes.INVALID_FILE_TYPE;
    }
    // 网络错误
    else if (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') {
        errorCode = ErrorCodes.THIRD_PARTY_SERVICE_ERROR;
    } else if (err.code === 'ETIMEDOUT') {
        errorCode = ErrorCodes.TIMEOUT;
    }
    // 验证错误
    else if (err.name === 'ValidationError') {
        errorCode = ErrorCodes.VALIDATION_ERROR;
        details = err.errors;
    }
    // 自定义应用错误
    else if (err.code && Object.values(ErrorCodes).includes(err.code)) {
        errorCode = err.code;
        statusCode = err.statusCode || getStatusCode(errorCode);
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

    return res.error(errorCode, err.message, details, statusCode, meta);
};

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
    return res.error(
        ErrorCodes.RESOURCE_NOT_FOUND,
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
        user: '/api/user',
        admin: '/api/admin',
        monitoring: '/api/monitoring',
        reports: '/api/reports',
        system: '/api/system',
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