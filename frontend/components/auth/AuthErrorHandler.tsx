import React from 'react';
import {AlertTriangle, X, RefreshCw, LogIn} from 'lucide-react';

export enum AuthErrorType {
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  LOGIN_FAILED = 'LOGIN_FAILED',
  REGISTER_FAILED = 'REGISTER_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

const ERROR_MESSAGES = {
  [AuthErrorType.TOKEN_MISSING]: '请先登录以访问此功能',
  [AuthErrorType.TOKEN_INVALID]: '登录状态无效，请重新登录',
  [AuthErrorType.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [AuthErrorType.USER_NOT_FOUND]: '用户不存在或已被删除',
  [AuthErrorType.USER_INACTIVE]: '账户已被禁用，请联系管理员',
  [AuthErrorType.INSUFFICIENT_PERMISSIONS]: '权限不足，无法执行此操作',
  [AuthErrorType.SESSION_EXPIRED]: '会话已过期，请重新登录',
  [AuthErrorType.LOGIN_FAILED]: '登录失败，请检查用户名和密码',
  [AuthErrorType.REGISTER_FAILED]: '注册失败，请检查输入信息',
  [AuthErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [AuthErrorType.SERVER_ERROR]: '服务器错误，请稍后重试'
};

const FRIENDLY_MESSAGES = {
  [AuthErrorType.TOKEN_MISSING]: '您需要登录才能使用此功能',
  [AuthErrorType.TOKEN_INVALID]: '您的登录状态有问题，建议重新登录',
  [AuthErrorType.TOKEN_EXPIRED]: '您的登录已过期，请重新登录',
  [AuthErrorType.USER_NOT_FOUND]: '找不到您的账户信息',
  [AuthErrorType.USER_INACTIVE]: '您的账户暂时无法使用',
  [AuthErrorType.INSUFFICIENT_PERMISSIONS]: '您没有权限执行此操作',
  [AuthErrorType.SESSION_EXPIRED]: '您的会话已过期，请重新登录',
  [AuthErrorType.LOGIN_FAILED]: '用户名或密码不正确',
  [AuthErrorType.REGISTER_FAILED]: '注册信息有误，请重新填写',
  [AuthErrorType.NETWORK_ERROR]: '网络连接有问题，请检查网络',
  [AuthErrorType.SERVER_ERROR]: '服务暂时不可用，请稍后再试'
};

const SOLUTIONS = {
  [AuthErrorType.TOKEN_MISSING]: '点击登录按钮进行登录',
  [AuthErrorType.TOKEN_INVALID]: '清除浏览器缓存后重新登录',
  [AuthErrorType.TOKEN_EXPIRED]: '点击重新登录按钮',
  [AuthErrorType.USER_NOT_FOUND]: '检查账户是否正确或联系管理员',
  [AuthErrorType.USER_INACTIVE]: '联系管理员激活账户',
  [AuthErrorType.INSUFFICIENT_PERMISSIONS]: '联系管理员申请相应权限',
  [AuthErrorType.SESSION_EXPIRED]: '重新登录以继续使用',
  [AuthErrorType.LOGIN_FAILED]: '检查用户名和密码是否正确',
  [AuthErrorType.REGISTER_FAILED]: '检查邮箱格式和密码强度',
  [AuthErrorType.NETWORK_ERROR]: '检查网络连接或稍后重试',
  [AuthErrorType.SERVER_ERROR]: '稍后重试或联系技术支持'
};

interface AuthErrorHandlerProps {
  error: string | AuthErrorType | null;
  onRetry?: () => void;
  onLogin?: () => void;
  onClose?: () => void;
  showSolution?: boolean;
  className?: string;
}

const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({
  error,
  onRetry,
  onLogin,
  onClose,
  showSolution = true,
  className = ""
}) => {
  if (!error) return null;

  // 确定错误类型
  const errorType = Object.values(AuthErrorType).includes(error as AuthErrorType)
    ? error as AuthErrorType
    : AuthErrorType.SERVER_ERROR;

  const friendlyMessage = FRIENDLY_MESSAGES[errorType] || error;
  const solution = SOLUTIONS[errorType];

  // 确定是否需要登录
  const needsLogin = [
    AuthErrorType.TOKEN_MISSING,
    AuthErrorType.TOKEN_INVALID,
    AuthErrorType.TOKEN_EXPIRED,
    AuthErrorType.SESSION_EXPIRED
  ].includes(errorType);

  // 确定是否可以重试
  const canRetry = [
    AuthErrorType.NETWORK_ERROR,
    AuthErrorType.SERVER_ERROR
  ].includes(errorType);

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        {/* 错误图标 */}
        <div className="flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>

        {/* 错误内容 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            出现了问题
          </h3>
          <p className="text-sm text-red-700 mb-2">
            {friendlyMessage}
          </p>

          {showSolution && solution && (
            <p className="text-xs text-red-600 mb-3">
              建议：{solution}
            </p>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            {needsLogin && onLogin && (
              <button
                onClick={onLogin}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
              >
                <LogIn className="w-3 h-3" />
                <span>重新登录</span>
              </button>
            )}

            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>重试</span>
              </button>
            )}
          </div>
        </div>

        {/* 关闭按钮 */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export const parseAuthError = (error: any): AuthErrorType => {
  if (typeof error === 'string') {
    // 尝试从错误消息中推断错误类型
    const message = error.toLowerCase();

    if (message.includes('token') && message.includes('missing')) {
      return AuthErrorType.TOKEN_MISSING;
    }
    if (message.includes('token') && message.includes('invalid')) {
      return AuthErrorType.TOKEN_INVALID;
    }
    if (message.includes('token') && message.includes('expired')) {
      return AuthErrorType.TOKEN_EXPIRED;
    }
    if (message.includes('user') && message.includes('not found')) {
      return AuthErrorType.USER_NOT_FOUND;
    }
    if (message.includes('permission')) {
      return AuthErrorType.INSUFFICIENT_PERMISSIONS;
    }
    if (message.includes('network') || message.includes('connection')) {
      return AuthErrorType.NETWORK_ERROR;
    }

    return AuthErrorType.SERVER_ERROR;
  }

  if (error?.error && Object.values(AuthErrorType).includes(error.error)) {
    return error.error;
  }

  if (error?.response?.status === 401) {
    return AuthErrorType.TOKEN_INVALID;
  }

  if (error?.response?.status === 403) {
    return AuthErrorType.INSUFFICIENT_PERMISSIONS;
  }

  if (error?.response?.status >= 500) {
    return AuthErrorType.SERVER_ERROR;
  }

  if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
    return AuthErrorType.NETWORK_ERROR;
  }

  return AuthErrorType.SERVER_ERROR;
};

export const getErrorMessage = (error: any): string => {
  const errorType = parseAuthError(error);
  return FRIENDLY_MESSAGES[errorType] || '发生了未知错误';
};

export const shouldRelogin = (error: any): boolean => {
  const errorType = parseAuthError(error);
  return [
    AuthErrorType.TOKEN_MISSING,
    AuthErrorType.TOKEN_INVALID,
    AuthErrorType.TOKEN_EXPIRED,
    AuthErrorType.SESSION_EXPIRED
  ].includes(errorType);
};

export default AuthErrorHandler;
