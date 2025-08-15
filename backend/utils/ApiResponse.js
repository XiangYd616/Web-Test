/**
 * 统一API响应格式工具
 * 版本: v2.0.0 - 重构为与responseFormatter中间件兼容
 *
 * 注意：此文件已重构为使用responseFormatter中间件的格式
 * 主要用于非Express环境或需要手动构建响应的场景
 */

const Logger = require('./logger');

class ApiResponse {
  /**
   * 成功响应 - 兼容responseFormatter格式
   */
  static success(data = null, message = '操作成功', meta = {}) {
    const response = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };

    return response;
  }

  /**
   * 错误响应 - 兼容responseFormatter格式
   */
  static error(code = 'UNKNOWN_ERROR', message = '操作失败', details = null) {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 验证错误响应
   */
  static validationError(errors = [], message = '请求参数验证失败') {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: {
          timestamp: new Date().toISOString(),
          validationErrors: errors
        },
        retryable: false,
        suggestions: [
          '请检查请求参数格式',
          '确保所有必需字段都已提供',
          '参考API文档了解正确的参数格式'
        ]
      }
    };
  }

  /**
   * 认证错误响应
   */
  static authError(message = '认证失败', code = 'AUTH_ERROR') {
    return {
      success: false,
      error: {
        code,
        message,
        details: {
          timestamp: new Date().toISOString()
        },
        retryable: false,
        suggestions: [
          '请检查认证令牌是否有效',
          '确认令牌未过期',
          '重新登录获取新的令牌'
        ]
      }
    };
  }

  /**
   * 权限错误响应
   */
  static permissionError(message = '权限不足', resource = '') {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message,
        details: {
          timestamp: new Date().toISOString(),
          resource
        },
        retryable: false,
        suggestions: [
          '请联系管理员获取相应权限',
          '确认您的账户具有访问此资源的权限'
        ]
      }
    };
  }

  /**
   * 资源未找到响应
   */
  static notFound(resource = '资源', id = '') {
    return {
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: `${resource}不存在`,
        details: {
          timestamp: new Date().toISOString(),
          resource,
          id
        },
        retryable: false,
        suggestions: [
          '请检查资源ID是否正确',
          '确认资源未被删除',
          '联系管理员确认资源状态'
        ]
      }
    };
  }

  /**
   * 服务器错误响应
   */
  static serverError(message = '服务器内部错误', code = 'INTERNAL_ERROR', details = {}) {
    return {
      success: false,
      error: {
        code,
        message,
        details: {
          timestamp: new Date().toISOString(),
          ...details
        },
        retryable: true,
        suggestions: [
          '请稍后重试',
          '如果问题持续存在，请联系技术支持',
          '检查网络连接是否正常'
        ]
      }
    };
  }

  /**
   * 分页响应
   */
  static paginated(data = [], pagination = {}) {
    const {
      page = 1,
      limit = 10,
      total = 0,
      totalPages = 0
    } = pagination;

    return {
      success: true,
      message: '获取数据成功',
      data,
      meta: {
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: parseInt(totalPages),
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 测试结果响应
   */
  static testResult(testId, results, status = 'completed') {
    return {
      success: true,
      message: '测试完成',
      data: {
        testId,
        status,
        results,
        completedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 测试进度响应
   */
  static testProgress(testId, progress) {
    return {
      success: true,
      message: '获取测试进度成功',
      data: {
        testId,
        ...progress,
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 判断错误是否可重试
   */
  static isRetryableError(code) {
    const retryableCodes = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'CONNECTION_REFUSED',
      'SERVICE_UNAVAILABLE',
      'INTERNAL_ERROR',
      'RATE_LIMITED'
    ];
    return retryableCodes.includes(code);
  }

  /**
   * 获取默认建议
   */
  static getDefaultSuggestions(code) {
    const suggestions = {
      'TIMEOUT': ['增加超时时间', '检查网络连接', '稍后重试'],
      'NETWORK_ERROR': ['检查网络连接', '确认URL可访问', '稍后重试'],
      'VALIDATION_ERROR': ['检查请求参数', '参考API文档', '确认数据格式'],
      'AUTH_ERROR': ['检查认证令牌', '重新登录', '确认权限'],
      'RATE_LIMITED': ['降低请求频率', '稍后重试', '联系管理员提升限制'],
      'INTERNAL_ERROR': ['稍后重试', '联系技术支持', '检查系统状态']
    };

    return suggestions[code] || ['稍后重试', '联系技术支持'];
  }

  /**
   * 中间件：统一响应格式
   *
   * @deprecated 推荐使用 backend/api/middleware/responseFormatter.js 中间件
   * 该中间件提供更完整的功能，包括请求ID、性能监控等
   */
  static middleware() {
    console.warn('ApiResponse.middleware() 已废弃，请使用 responseFormatter 中间件');

    return (req, res, next) => {
      // 为了向后兼容，保留这些方法，但建议迁移到responseFormatter
      res.apiSuccess = (data, message, meta) => {
        return res.json(ApiResponse.success(data, message, meta));
      };

      res.apiError = (code, message, details) => {
        return res.status(400).json(ApiResponse.error(code, message, details));
      };

      next();
    };
  }

  /**
   * 记录API响应
   */
  static logResponse(req, res, responseData, statusCode) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      success: responseData.success,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - req.startTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    if (!responseData.success) {
      Logger.warn('API错误响应', logData);
    } else {
      Logger.info('API成功响应', logData);
    }
  }
}

module.exports = ApiResponse;
