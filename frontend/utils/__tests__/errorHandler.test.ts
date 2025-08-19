/**
 * 错误处理工具单元测试
 * 
 * 测试错误处理系统的各种功能，包括错误分类、处理配置、
 * 用户友好消息转换等
 * 
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
  ErrorType,
  ErrorSeverity,
  createAppError,
  fromNativeError,
  fromHttpResponse,
  ErrorHandler,
  handleError,
  handleHttpError
} from '../errorHandler';

describe('错误处理工具', () => {
  describe('createAppError', () => {
    it('应该创建标准化的错误对象', () => {
      const error = createAppError(ErrorType.NETWORK_ERROR, '网络连接失败');
      
      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.message).toBe('网络连接失败');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.userMessage).toBe('网络连接失败，请检查网络设置');
      expect(error.timestamp).toBeDefined();
    });

    it('应该支持自定义选项', () => {
      const error = createAppError(
        ErrorType.VALIDATION_ERROR, 
        '验证失败',
        {
          severity: ErrorSeverity.LOW,
          code: 'VALIDATION_001',
          context: { field: 'email' }
        }
      );
      
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.code).toBe('VALIDATION_001');
      expect(error.context).toEqual({ field: 'email' });
    });
  });

  describe('fromNativeError', () => {
    it('应该从原生错误创建应用错误', () => {
      const nativeError = new Error('网络请求失败');
      const appError = fromNativeError(nativeError);
      
      expect(appError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(appError.message).toBe('网络请求失败');
      expect(appError.stack).toBe(nativeError.stack);
    });

    it('应该正确分类网络错误', () => {
      const networkError = new Error('Network request failed');
      const appError = fromNativeError(networkError);
      
      expect(appError.type).toBe(ErrorType.NETWORK_ERROR);
    });

    it('应该正确分类超时错误', () => {
      const timeoutError = new Error('Request timeout');
      const appError = fromNativeError(timeoutError);
      
      expect(appError.type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    it('应该正确分类验证错误', () => {
      const validationError = new Error('Invalid input data');
      const appError = fromNativeError(validationError);
      
      expect(appError.type).toBe(ErrorType.VALIDATION_ERROR);
    });
  });

  describe('fromHttpResponse', () => {
    it('应该从400响应创建验证错误', () => {
      const response = new Response('Bad Request', { 
        status: 400, 
        statusText: 'Bad Request' 
      });
      const appError = fromHttpResponse(response);
      
      expect(appError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(appError.severity).toBe(ErrorSeverity.LOW);
      expect(appError.code).toBe('400');
    });

    it('应该从401响应创建认证错误', () => {
      const response = new Response('Unauthorized', { 
        status: 401, 
        statusText: 'Unauthorized' 
      });
      const appError = fromHttpResponse(response);
      
      expect(appError.type).toBe(ErrorType.AUTHENTICATION_ERROR);
      expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('应该从403响应创建授权错误', () => {
      const response = new Response('Forbidden', { 
        status: 403, 
        statusText: 'Forbidden' 
      });
      const appError = fromHttpResponse(response);
      
      expect(appError.type).toBe(ErrorType.AUTHORIZATION_ERROR);
    });

    it('应该从404响应创建未找到错误', () => {
      const response = new Response('Not Found', { 
        status: 404, 
        statusText: 'Not Found' 
      });
      const appError = fromHttpResponse(response);
      
      expect(appError.type).toBe(ErrorType.NOT_FOUND_ERROR);
      expect(appError.severity).toBe(ErrorSeverity.LOW);
    });

    it('应该从500响应创建服务器错误', () => {
      const response = new Response('Internal Server Error', { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
      const appError = fromHttpResponse(response);
      
      expect(appError.type).toBe(ErrorType.SERVER_ERROR);
      expect(appError.severity).toBe(ErrorSeverity.HIGH);
    });

    it('应该包含响应上下文信息', () => {
      const response = new Response('Server Error', { 
        status: 500, 
        statusText: 'Internal Server Error',
        url: 'https://api.example.com/test'
      });
      const data = { message: '数据库连接失败' };
      const appError = fromHttpResponse(response, data);
      
      expect(appError.context).toEqual({
        url: 'https://api.example.com/test',
        status: 500,
        statusText: 'Internal Server Error',
        data
      });
      expect(appError.message).toBe('数据库连接失败');
    });
  });

  describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler;
    let mockToastService: jest.Mock;
    let mockErrorReportingService: jest.Mock;

    beforeEach(() => {
      errorHandler = ErrorHandler.getInstance();
      mockToastService = jest.fn();
      mockErrorReportingService = jest.fn();
      
      errorHandler.setToastService(mockToastService);
      errorHandler.setErrorReportingService(mockErrorReportingService);
      
      // 清除之前的调用
      mockToastService.mockClear();
      mockErrorReportingService.mockClear();
    });

    it('应该是单例模式', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('应该根据配置处理错误', () => {
      const error = createAppError(ErrorType.NETWORK_ERROR, '网络错误');
      const result = errorHandler.handle(error);
      
      expect(result.canRetry).toBe(true);
      expect(result.error).toBe(error);
      expect(mockToastService).toHaveBeenCalledWith(
        '网络连接失败，请检查网络设置',
        'warning'
      );
      expect(mockErrorReportingService).toHaveBeenCalledWith(error);
    });

    it('应该支持自定义配置', () => {
      const error = createAppError(ErrorType.VALIDATION_ERROR, '验证错误');
      const customConfig = {
        showToast: false,
        reportToService: true
      };
      
      const result = errorHandler.handle(error, customConfig);
      
      expect(mockToastService).not.toHaveBeenCalled();
      expect(mockErrorReportingService).toHaveBeenCalledWith(error);
    });

    it('应该正确映射严重级别到UI类型', () => {
      const lowSeverityError = createAppError(
        ErrorType.VALIDATION_ERROR, 
        '验证错误',
        { severity: ErrorSeverity.LOW }
      );
      
      errorHandler.handle(lowSeverityError);
      
      expect(mockToastService).toHaveBeenCalledWith(
        expect.any(String),
        'info'
      );
    });

    it('应该处理高严重级别错误', () => {
      const criticalError = createAppError(
        ErrorType.SERVER_ERROR, 
        '服务器错误',
        { severity: ErrorSeverity.CRITICAL }
      );
      
      errorHandler.handle(criticalError);
      
      expect(mockToastService).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      );
    });
  });

  describe('便捷函数', () => {
    let mockToastService: jest.Mock;

    beforeEach(() => {
      mockToastService = jest.fn();
      ErrorHandler.getInstance().setToastService(mockToastService);
      mockToastService.mockClear();
    });

    it('handleError应该处理原生错误', () => {
      const nativeError = new Error('测试错误');
      const result = handleError(nativeError);
      
      expect(result.error.message).toBe('测试错误');
      expect(mockToastService).toHaveBeenCalled();
    });

    it('handleError应该处理应用错误', () => {
      const appError = createAppError(ErrorType.NETWORK_ERROR, '网络错误');
      const result = handleError(appError);
      
      expect(result.error).toBe(appError);
    });

    it('handleHttpError应该处理HTTP响应', () => {
      const response = new Response('Unauthorized', { 
        status: 401, 
        statusText: 'Unauthorized' 
      });
      
      const result = handleHttpError(response);
      
      expect(result.error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
      expect(mockToastService).toHaveBeenCalled();
    });
  });

  describe('错误分类', () => {
    it('应该正确识别网络相关错误', () => {
      const errors = [
        new Error('Network error occurred'),
        new Error('fetch failed'),
        new Error('Connection refused')
      ];
      
      errors.forEach(error => {
        const appError = fromNativeError(error);
        expect(appError.type).toBe(ErrorType.NETWORK_ERROR);
      });
    });

    it('应该正确识别超时相关错误', () => {
      const timeoutError = new Error('Request timeout exceeded');
      const appError = fromNativeError(timeoutError);
      
      expect(appError.type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    it('应该正确识别验证相关错误', () => {
      const validationErrors = [
        new Error('Validation failed'),
        new Error('Invalid email format')
      ];
      
      validationErrors.forEach(error => {
        const appError = fromNativeError(error);
        expect(appError.type).toBe(ErrorType.VALIDATION_ERROR);
      });
    });

    it('应该将未知错误归类为UNKNOWN_ERROR', () => {
      const unknownError = new Error('Some random error');
      const appError = fromNativeError(unknownError);
      
      expect(appError.type).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });
});
