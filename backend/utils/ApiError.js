/**
 * API错误处理类
 * 统一的错误处理和错误创建工具
 */

const { ErrorCodes, getStatusCode, ErrorMessages } = require('../types/ApiResponse');

/**
 * 自定义API错误类
 */
class ApiError extends Error {
    /**
     * 创建API错误实例
     * @param {string} code - 错误代码
     * @param {string} [message] - 错误消息
     * @param {number} [statusCode] - HTTP状态码
     * @param {*} [details] - 错误详情
     * @param {boolean} [isOperational=true] - 是否为可操作的错误
     */
    constructor(code, message = null, statusCode = null, details = null, isOperational = true) {
        const errorMessage = message || ErrorMessages[code] || '未知错误';
        super(errorMessage);

        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode || getStatusCode(code);
        this.details = details;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();

        // 捕获堆栈跟踪
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * 转换为JSON格式
     * @returns {Object} JSON格式的错误信息
     */
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp,
            ...(process.env.NODE_ENV === 'development' && {
                stack: this.stack
            })
        };
    }
}

/**
 * 错误工厂类 - 创建常用错误的便捷方法
 */
class ErrorFactory {
    /**
     * 创建验证错误
     * @param {string|Array} errors - 验证错误信息
     * @param {string} [message] - 自定义错误消息
     * @returns {ApiError} 验证错误实例
     */
    static validation(errors, message = null) {
        const details = Array.isArray(errors) ? errors : [errors];
        return new ApiError(
            ErrorCodes.VALIDATION_ERROR,
            message,
            400,
            { fields: details, count: details.length }
        );
    }

    /**
     * 创建未授权错误
     * @param {string} [message] - 自定义错误消息
     * @returns {ApiError} 未授权错误实例
     */
    static unauthorized(message = null) {
        return new ApiError(ErrorCodes.UNAUTHORIZED, message);
    }

    /**
     * 创建禁止访问错误
     * @param {string} [message] - 自定义错误消息
     * @returns {ApiError} 禁止访问错误实例
     */
    static forbidden(message = null) {
        return new ApiError(ErrorCodes.FORBIDDEN, message);
    }

    /**
     * 创建资源不存在错误
     * @param {string} [resource] - 资源名称
     * @param {string} [message] - 自定义错误消息
     * @returns {ApiError} 资源不存在错误实例
     */
    static notFound(resource = null, message = null) {
        const defaultMessage = resource ? `${resource}不存在` : null;
        return new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, message || defaultMessage);
    }

    /**
     * 创建资源冲突错误
     * @param {string} [resource] - 资源名称
     * @param {string} [message] - 自定义错误消息
     * @returns {ApiError} 资源冲突错误实例
     */
    static conflict(resource = null, message = null) {
        const defaultMessage = resource ? `${resource}已存在` : null;
        return new ApiError(ErrorCodes.RESOURCE_ALREADY_EXISTS, message || defaultMessage);
    }

    /**
     * 创建服务器内部错误
     * @param {string} [message] - 自定义错误消息
     * @param {*} [details] - 错误详情
     * @returns {ApiError} 服务器内部错误实例
     */
    static internal(message = null, details = null) {
        return new ApiError(ErrorCodes.INTERNAL_ERROR, message, 500, details);
    }

    /**
     * 创建服务不可用错误
     * @param {string} [service] - 服务名称
     * @param {string} [message] - 自定义错误消息
     * @returns {ApiError} 服务不可用错误实例
     */
    static serviceUnavailable(service = null, message = null) {
        const defaultMessage = service ? `${service}服务暂时不可用` : null;
        return new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, message || defaultMessage);
    }

    /**
     * 创建请求超时错误
     * @param {string} [message] - 自定义错误消息
     * @returns {ApiError} 请求超时错误实例
     */
    static timeout(message = null) {
        return new ApiError(ErrorCodes.TIMEOUT, message);
    }

    /**
     * 创建频率限制错误
     * @param {string} [message] - 自定义错误消息
     * @param {Object} [details] - 限制详情
     * @returns {ApiError} 频率限制错误实例
     */
    static rateLimitExceeded(message = null, details = null) {
        return new ApiError(ErrorCodes.RATE_LIMIT_EXCEEDED, message, 429, details);
    }

    /**
     * 创建令牌相关错误
     * @param {string} type - 令牌错误类型 ('missing', 'invalid', 'expired')
     * @param {string} [message] - 自定义错误消息
     * @returns {ApiError} 令牌错误实例
     */
    static token(type, message = null) {
        const tokenErrors = {
            missing: ErrorCodes.TOKEN_MISSING,
            invalid: ErrorCodes.TOKEN_INVALID,
            expired: ErrorCodes.TOKEN_EXPIRED
        };

        const code = tokenErrors[type] || ErrorCodes.TOKEN_INVALID;
        return new ApiError(code, message);
    }

    /**
     * 创建数据库相关错误
     * @param {string} type - 数据库错误类型
     * @param {string} [message] - 自定义错误消息
     * @param {*} [details] - 错误详情
     * @returns {ApiError} 数据库错误实例
     */
    static database(type, message = null, details = null) {
        const dbErrors = {
            connection: ErrorCodes.DATABASE_CONNECTION_ERROR,
            duplicate: ErrorCodes.DUPLICATE_ENTRY,
            foreignKey: ErrorCodes.FOREIGN_KEY_CONSTRAINT,
            notNull: ErrorCodes.NOT_NULL_CONSTRAINT,
            general: ErrorCodes.DATABASE_ERROR
        };

        const code = dbErrors[type] || ErrorCodes.DATABASE_ERROR;
        return new ApiError(code, message, null, details);
    }

    /**
     * 创建文件相关错误
     * @param {string} type - 文件错误类型
     * @param {string} [message] - 自定义错误消息
     * @param {*} [details] - 错误详情
     * @returns {ApiError} 文件错误实例
     */
    static file(type, message = null, details = null) {
        const fileErrors = {
            notFound: ErrorCodes.FILE_NOT_FOUND,
            tooLarge: ErrorCodes.FILE_TOO_LARGE,
            invalidType: ErrorCodes.INVALID_FILE_TYPE,
            uploadError: ErrorCodes.FILE_UPLOAD_ERROR,
            processingError: ErrorCodes.FILE_PROCESSING_ERROR
        };

        const code = fileErrors[type] || ErrorCodes.FILE_UPLOAD_ERROR;
        return new ApiError(code, message, null, details);
    }

    /**
     * 创建测试相关错误
     * @param {string} type - 测试错误类型
     * @param {string} [message] - 自定义错误消息
     * @param {*} [details] - 错误详情
     * @returns {ApiError} 测试错误实例
     */
    static test(type, message = null, details = null) {
        const testErrors = {
            configuration: ErrorCodes.TEST_CONFIGURATION_ERROR,
            execution: ErrorCodes.TEST_EXECUTION_ERROR,
            timeout: ErrorCodes.TEST_TIMEOUT,
            cancelled: ErrorCodes.TEST_CANCELLED,
            engineUnavailable: ErrorCodes.TEST_ENGINE_UNAVAILABLE,
            invalidType: ErrorCodes.INVALID_TEST_TYPE
        };

        const code = testErrors[type] || ErrorCodes.TEST_EXECUTION_ERROR;
        return new ApiError(code, message, null, details);
    }

    /**
     * 从原生错误创建API错误
     * @param {Error} error - 原生错误对象
     * @param {string} [defaultCode] - 默认错误代码
     * @returns {ApiError} API错误实例
     */
    static fromError(error, defaultCode = ErrorCodes.INTERNAL_ERROR) {
        // 如果已经是ApiError，直接返回
        if (error instanceof ApiError) {
            return error;
        }

        let code = defaultCode;
        let details = null;

        // 根据错误类型映射错误代码
        if (error.name === 'JsonWebTokenError') {
            code = ErrorCodes.TOKEN_INVALID;
        } else if (error.name === 'TokenExpiredError') {
            code = ErrorCodes.TOKEN_EXPIRED;
        } else if (error.code === 'ECONNREFUSED') {
            code = ErrorCodes.DATABASE_CONNECTION_ERROR;
        } else if (error.code === '23505') {
            code = ErrorCodes.DUPLICATE_ENTRY;
        } else if (error.code === '23503') {
            code = ErrorCodes.FOREIGN_KEY_CONSTRAINT;
        } else if (error.code === '23502') {
            code = ErrorCodes.NOT_NULL_CONSTRAINT;
        } else if (error.code === 'LIMIT_FILE_SIZE') {
            code = ErrorCodes.FILE_TOO_LARGE;
        } else if (error.code === 'ETIMEDOUT') {
            code = ErrorCodes.TIMEOUT;
        } else if (error.name === 'ValidationError') {
            code = ErrorCodes.VALIDATION_ERROR;
            details = error.errors;
        }

        return new ApiError(code, error.message, null, details);
    }
}

/**
 * 错误处理工具函数
 */
class ErrorUtils {
    /**
     * 判断是否为可操作的错误
     * @param {Error} error - 错误对象
     * @returns {boolean} 是否为可操作的错误
     */
    static isOperational(error) {
        if (error instanceof ApiError) {
            return error.isOperational;
        }
        return false;
    }

    /**
     * 记录错误日志
     * @param {Error} error - 错误对象
     * @param {Object} [context] - 上下文信息
     */
    static logError(error, context = {}) {
        const logData = {
            timestamp: new Date().toISOString(),
            error: {
                name: error.name,
                message: error.message,
                code: error.code,
                statusCode: error.statusCode,
                stack: error.stack
            },
            context
        };

        if (error instanceof ApiError && error.statusCode >= 500) {
            console.error('API服务器错误:', logData);
        } else if (error instanceof ApiError && error.statusCode >= 400) {
            console.warn('API客户端错误:', logData);
        } else {
            console.error('未知错误:', logData);
        }
    }

    /**
     * 格式化错误信息用于响应
     * @param {Error} error - 错误对象
     * @param {boolean} [includeStack=false] - 是否包含堆栈信息
     * @returns {Object} 格式化的错误信息
     */
    static formatError(error, includeStack = false) {
        const formatted = {
            name: error.name,
            message: error.message,
            timestamp: new Date().toISOString()
        };

        if (error instanceof ApiError) {
            formatted.code = error.code;
            formatted.statusCode = error.statusCode;
            if (error.details) {
                formatted.details = error.details;
            }
        }

        if (includeStack && error.stack) {
            formatted.stack = error.stack;
        }

        return formatted;
    }
}

module.exports = {
    ApiError,
    ErrorFactory,
    ErrorUtils
};