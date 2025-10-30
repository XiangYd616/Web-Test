/**
 * ͳһAPI��������
 * �汾: v2.0.0
 */

import type { ApiError, ApiResponse } from '../../types/api';
import { ErrorCode } from '../../types/api';

// ��������ö��
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// ���������ӿ�
export interface ErrorHandler {
  handle(error: any): ApiError;
  canHandle(error: any): boolean;
}

// �����������
export class NetworkErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.name === 'NetworkError' || error.code === 'NETWORK_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: '��������ʧ�ܣ�������������',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// ��֤��������
export class ValidationErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status === 400 || error.code === 'VALIDATION_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: error.message || '���������֤ʧ��',
      details: error.details || error.errors,
      timestamp: new Date().toISOString()
    };
  }
}

// ��֤��������
export class AuthenticationErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status === 401 || error.code === 'AUTHENTICATION_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.UNAUTHORIZED,
      message: '�����֤ʧ�ܣ������µ�¼',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// ��Ȩ��������
export class AuthorizationErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status === 403 || error.code === 'AUTHORIZATION_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.FORBIDDEN,
      message: 'Ȩ�޲��㣬�޷�ִ�д˲���',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// 404��������
export class NotFoundErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status === 404 || error.code === 'NOT_FOUND';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.NOT_FOUND,
      message: '�������Դ������',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// ��������������
export class ServerErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status >= 500 || error.code === 'SERVER_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: '�������ڲ��������Ժ�����',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// ��ʱ��������
export class TimeoutErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.name === 'TimeoutError' || error.code === 'TIMEOUT';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.TIMEOUT_ERROR,
      message: '����ʱ�����Ժ�����',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// Ĭ�ϴ�������
export class DefaultErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return true;
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message || 'δ֪����',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// ͳһ��������
export class UnifiedErrorHandler {
  private handlers: ErrorHandler[] = [
    new NetworkErrorHandler(),
    new ValidationErrorHandler(),
    new AuthenticationErrorHandler(),
    new AuthorizationErrorHandler(),
    new NotFoundErrorHandler(),
    new ServerErrorHandler(),
    new TimeoutErrorHandler(),
    new DefaultErrorHandler()
  ];

  handle(error: any): ApiError {
    const handler = this.handlers.find(h => h.canHandle(error));
    return handler!.handle(error);
  }

  createErrorResponse<T = never>(error: any): ApiResponse<T> {
    const apiError = this.handle(error);
    return {
      success: false,
      error: apiError.message,
      meta: {
        timestamp: apiError.timestamp,
        code: apiError.code,
        details: apiError.details
      }
    };
  }
}

// ����Ĭ��ʵ��
export const _errorHandler = new UnifiedErrorHandler();

// �����������ͺ��������������

