/**
 * 密码强度指示器组件
 * 实时显示密码强度和安全建议
 * 版本: v1.0.0
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Info,
  Shield,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// ==================== 类型定义 ====================

interface PasswordValidationResult {
  score: number;
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
  };
  estimatedCrackTime: string;
}

// Mock password policy service
const defaultPasswordPolicyService = {
  validatePassword: (password: string): PasswordValidationResult => {
    const score = Math.min(password.length * 10, 100);
    const strength = score < 20 ? 'weak' : score < 40 ? 'fair' : score < 60 ? 'good' : score < 80 ? 'strong' : 'very-strong';

    return {
      score,
      strength,
      feedback: [],
      requirements: {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        numbers: /\d/.test(password),
        symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      },
      estimatedCrackTime: '1 day'
    };
  },
  getPasswordPolicy: () => ({
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbidCommonPasswords: true,
    forbidPersonalInfo: true,
    passwordHistory: 5
  })
};

interface PasswordStrengthIndicatorProps {
  password: string;
  userInfo?: {
    email?: string;
    username?: string;
    name?: string;
  };
  userId?: string;
  showDetails?: boolean;
  className?: string;
  onValidationChange?: (result: PasswordValidationResult) => void;
}

interface PasswordInputProps extends Omit<PasswordStrengthIndicatorProps, 'password'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
}

// ==================== 强度等级配置 ====================

const STRENGTH_CONFIG = {
  weak: {
    label: '弱',
    color: 'bg-orange-500',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    borderColor: 'border-orange-700',
    icon: AlertTriangle,
    width: '25%'
  },
  fair: {
    label: '一般',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-700',
    icon: Info,
    width: '50%'
  },
  good: {
    label: '良好',
    color: 'bg-blue-500',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-700',
    icon: Shield,
    width: '75%'
  },
  strong: {
    label: '强',
    color: 'bg-green-500',
    textColor: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-700',
    icon: CheckCircle,
    width: '90%'
  },
  'very-strong': {
    label: '极强',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-900/20',
    borderColor: 'border-emerald-700',
    icon: CheckCircle,
    width: '100%'
  }
} as const;

// ==================== 密码强度指示器组件 ====================

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  userInfo,
  userId,
  showDetails = true,
  className = '',
  onValidationChange
}) => {
  const [validationResult, setValidationResult] = useState<PasswordValidationResult | null>(null);

  // 计算密码强度
  const validation = useMemo(() => {
    if (!password) return null;
    return defaultPasswordPolicyService.validatePassword(password);
  }, [password]);

  // 更新验证结果
  useEffect(() => {
    setValidationResult(validation);
    onValidationChange?.(validation!);
  }, [validation, onValidationChange]);

  if (!password || !validation) {
    return null;
  }

  const { strength, feedback } = validation;
  const config = STRENGTH_CONFIG[strength];
  const IconComponent = config.icon;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 强度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">密码强度</span>
          <div className="flex items-center space-x-2">
            <IconComponent className={`w-4 h-4 ${config.textColor}`} />
            <span className={`text-sm font-medium ${config.textColor}`}>
              {config.label} ({validation.score}/100)
            </span>
          </div>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${config.color}`}
            style={{ width: config.width }}
          />
        </div>
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="space-y-3">
          {/* 破解时间估算 */}
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>估算破解时间: {validation.estimatedCrackTime}</span>
          </div>

          {/* 反馈信息 */}
          {feedback.length > 0 && (
            <div className={`rounded-lg p-3 ${config.bgColor} border ${config.borderColor}`}>
              <div className="flex items-start space-x-2">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-300 mb-1">需要改进</h4>
                  <ul className="text-sm text-red-200 space-y-1">
                    {feedback.map((violation: string, index: number) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span className="text-red-400">•</span>
                        <span>{violation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}




        </div>
      )}
    </div>
  );
};

// ==================== 密码输入组件 ====================

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  userInfo,
  userId,
  showDetails = true,
  placeholder = '请输入密码',
  disabled = false,
  required = false,
  name,
  id,
  className = '',
  onValidationChange
}) => {
  const [showPassword, setShowPassword] = useState(false);

  /**

   * togglePasswordVisibility功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
  const [isFocused, setIsFocused] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 密码输入框 */}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e?.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          name={name}
          id={id}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors disabled:cursor-not-allowed"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 密码强度指示器 */}
      {(value || isFocused) && (
        <PasswordStrengthIndicator
          password={value}
          userInfo={userInfo}
          userId={userId}
          showDetails={showDetails}
          onValidationChange={onValidationChange}
        />
      )}
    </div>
  );
};

// ==================== 密码策略显示组件 ====================

export const PasswordPolicyDisplay: React.FC<{ className?: string }> = ({
  className = ''
}) => {
  const policy = defaultPasswordPolicyService.getPasswordPolicy();

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
        <Shield className="w-4 h-4 mr-2" />
        密码要求
      </h3>

      <ul className="space-y-2 text-sm text-gray-400">
        <li className="flex items-center space-x-2">
          <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
          <span>长度: {policy.minLength}-{policy.maxLength} 个字符</span>
        </li>

        {policy.requireUppercase && (
          <li className="flex items-center space-x-2">
            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
            <span>包含大写字母 (A-Z)</span>
          </li>
        )}

        {policy.requireLowercase && (
          <li className="flex items-center space-x-2">
            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
            <span>包含小写字母 (a-z)</span>
          </li>
        )}

        {policy.requireNumbers && (
          <li className="flex items-center space-x-2">
            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
            <span>包含数字 (0-9)</span>
          </li>
        )}

        {policy.requireSpecialChars && (
          <li className="flex items-center space-x-2">
            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
            <span>包含特殊字符 (!@#$%^&*)</span>
          </li>
        )}

        {policy.forbidCommonPasswords && (
          <li className="flex items-center space-x-2">
            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
            <span>不能使用常见密码</span>
          </li>
        )}

        {policy.forbidPersonalInfo && (
          <li className="flex items-center space-x-2">
            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
            <span>不能包含个人信息</span>
          </li>
        )}

        {policy.passwordHistory > 0 && (
          <li className="flex items-center space-x-2">
            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
            <span>不能重复使用最近 {policy.passwordHistory} 个密码</span>
          </li>
        )}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
