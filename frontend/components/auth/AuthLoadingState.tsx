/**
 * AuthLoadingState.tsx - React组件
 * 
 * 文件路径: frontend\components\auth\AuthLoadingState.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import type { ReactNode } from 'react';
import { Loader2, Shield, User, Key, Mail, RefreshCw } from 'lucide-react';

export enum AuthLoadingType {
  LOGIN = 'login',
  REGISTER = 'register',
  LOGOUT = 'logout',
  VERIFY_TOKEN = 'verify_token',
  REFRESH_TOKEN = 'refresh_token',
  CHANGE_PASSWORD = 'change_password',
  FORGOT_PASSWORD = 'forgot_password',
  RESET_PASSWORD = 'reset_password',
  VERIFY_EMAIL = 'verify_email',
  SEND_VERIFICATION = 'send_verification',
  UPDATE_PROFILE = 'update_profile'
}

const LOADING_MESSAGES = {
  [AuthLoadingType.LOGIN]: '正在登录...',
  [AuthLoadingType.REGISTER]: '正在注册...',
  [AuthLoadingType.LOGOUT]: '正在登出...',
  [AuthLoadingType.VERIFY_TOKEN]: '验证登录状态...',
  [AuthLoadingType.REFRESH_TOKEN]: '刷新登录状态...',
  [AuthLoadingType.CHANGE_PASSWORD]: '正在修改密码...',
  [AuthLoadingType.FORGOT_PASSWORD]: '正在发送重置邮件...',
  [AuthLoadingType.RESET_PASSWORD]: '正在重置密码...',
  [AuthLoadingType.VERIFY_EMAIL]: '正在验证邮箱...',
  [AuthLoadingType.SEND_VERIFICATION]: '正在发送验证邮件...',
  [AuthLoadingType.UPDATE_PROFILE]: '正在更新资料...'
};

const LOADING_ICONS = {
  [AuthLoadingType.LOGIN]: User,
  [AuthLoadingType.REGISTER]: User,
  [AuthLoadingType.LOGOUT]: User,
  [AuthLoadingType.VERIFY_TOKEN]: Shield,
  [AuthLoadingType.REFRESH_TOKEN]: RefreshCw,
  [AuthLoadingType.CHANGE_PASSWORD]: Key,
  [AuthLoadingType.FORGOT_PASSWORD]: Mail,
  [AuthLoadingType.RESET_PASSWORD]: Key,
  [AuthLoadingType.VERIFY_EMAIL]: Mail,
  [AuthLoadingType.SEND_VERIFICATION]: Mail,
  [AuthLoadingType.UPDATE_PROFILE]: User
};

interface AuthLoadingStateProps {
  type?: AuthLoadingType;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  overlay?: boolean;
}

const AuthLoadingState: React.FC<AuthLoadingStateProps> = ({
  type = AuthLoadingType.LOGIN,
  message,
  size = 'md',
  showIcon = true,
  className = "",
  overlay = false
}) => {
  const loadingMessage = message || LOADING_MESSAGES[type];
  const IconComponent = LOADING_ICONS[type];

  // 尺寸配置
  const sizeConfig = {
    sm: {
      spinner: 'w-4 h-4',
      icon: 'w-4 h-4',
      text: 'text-sm',
      container: 'p-2'
    },
    md: {
      spinner: 'w-6 h-6',
      icon: 'w-5 h-5',
      text: 'text-base',
      container: 'p-4'
    },
    lg: {
      spinner: 'w-8 h-8',
      icon: 'w-6 h-6',
      text: 'text-lg',
      container: 'p-6'
    }
  };

  const config = sizeConfig[size];

  const content = (
    <div className={`flex items-center justify-center space-x-3 ${config.container} ${className}`}>
      {/* 加载图标 */}
      <div className="relative">
        {/* 旋转的加载器 */}
        <Loader2 className={`${config.spinner} animate-spin text-blue-600`} />

        {/* 功能图标（可选） */}
        {showIcon && IconComponent && (
          <div className="absolute inset-0 flex items-center justify-center">
            <IconComponent className={`${config.icon} text-blue-400 opacity-60`} />
          </div>
        )}
      </div>

      {/* 加载消息 */}
      <span className={`${config.text} text-gray-700 font-medium`}>
        {loadingMessage}
      </span>
    </div>
  );

  // 如果是覆盖层模式
  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export const AuthSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = "" }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 ${className}`} />
  );
};

export const InlineAuthLoading: React.FC<{
  type?: AuthLoadingType;
  message?: string;
}> = ({ type = AuthLoadingType.LOGIN, message }) => {
  const loadingMessage = message || LOADING_MESSAGES[type];

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <AuthSpinner size="sm" />
      <span>{loadingMessage}</span>
    </div>
  );
};

export const ButtonLoading: React.FC<{
  type?: AuthLoadingType;
  message?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({
  type = AuthLoadingType.LOGIN,
  message,
  disabled = true,
  className = "",
  children
}) => {
  const loadingMessage = message || LOADING_MESSAGES[type];

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
      } ${className}`}
    >
      <AuthSpinner size="sm" className="text-white" />
      <span>{children || loadingMessage}</span>
    </button>
  );
};

export const PageAuthLoading: React.FC<{
  type?: AuthLoadingType;
  message?: string;
  description?: string;
}> = ({
  type = AuthLoadingType.VERIFY_TOKEN,
  message,
  description
}) => {
  const loadingMessage = message || LOADING_MESSAGES[type];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <AuthLoadingState
            type={type}
            message={loadingMessage}
            size="lg"
            showIcon={true}
          />
        </div>

        {description && (
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export const CardAuthLoading: React.FC<{
  type?: AuthLoadingType;
  message?: string;
  className?: string;
}> = ({ type = AuthLoadingType.LOGIN, message, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <AuthLoadingState
        type={type}
        message={message}
        size="md"
        showIcon={true}
        className="py-8"
      />
    </div>
  );
};

export default AuthLoadingState;
