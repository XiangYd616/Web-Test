/**
 * MFA验证组件
 * 用于登录时的双因素验证界面，支持TOTP验证码和备用码验证
 * 版本: v1.0.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Key,
  Loader2,
  RefreshCw,
  Shield,
  Smartphone
} from 'lucide-react';

// ==================== 类型定义 ====================

export interface MFAVerificationProps {
  userEmail: string;
  onVerificationSuccess: (method: 'totp' | 'backup') => void;
  onCancel: () => void;
  onResendCode?: () => void;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

interface VerificationMethod {
  id: 'totp' | 'backup';
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

// ==================== 主组件 ====================

export const MFAVerification: React.FC<MFAVerificationProps> = ({
  userEmail,
  onVerificationSuccess,
  onCancel,
  onResendCode,
  isLoading = false,
  error,
  className = ''
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'totp' | 'backup' | null>('totp');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [showBackupCode, setShowBackupCode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // 验证方法配置
  const verificationMethods: VerificationMethod[] = [
    {
      id: 'totp',
      name: '身份验证器',
      description: '使用身份验证器应用生成的6位数字',
      icon: <Smartphone className="w-5 h-5" />,
      available: true
    },
    {
      id: 'backup',
      name: '备用码',
      description: '使用之前保存的8位备用代码',
      icon: <Key className="w-5 h-5" />,
      available: true
    }
  ];

  // 倒计时效果
  useEffect(() => {
    if (selectedMethod === 'totp' && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      setTimeRemaining(30);
    }
  }, [selectedMethod, timeRemaining]);

  // TOTP输入框自动焦点管理
  useEffect(() => {
    if (selectedMethod === 'totp' && verificationCode.length < 6) {
      const nextIndex = verificationCode.length;
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
      }
    }
  }, [verificationCode, selectedMethod]);

  // 备用码输入框焦点管理
  useEffect(() => {
    if (selectedMethod === 'backup' && backupInputRef.current) {
      backupInputRef.current.focus();
    }
  }, [selectedMethod]);

  const handleTOTPInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = verificationCode.split('');
    newCode[index] = value;
    const updatedCode = newCode.join('').slice(0, 6);
    
    setVerificationCode(updatedCode);

    // 自动移动到下一个输入框
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // 自动提交完整的验证码
    if (updatedCode.length === 6) {
      handleVerification('totp', updatedCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      // 如果当前输入框为空，删除前一个字符并移动焦点
      const newCode = verificationCode.split('');
      newCode[index - 1] = '';
      setVerificationCode(newCode.join(''));
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackupCodeInput = (value: string) => {
    // 只允许字母数字，转换为大写，最大8位
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    setBackupCode(cleanValue);

    // 自动提交完整的备用码
    if (cleanValue.length === 8) {
      handleVerification('backup', cleanValue);
    }
  };

  const handleVerification = async (method: 'totp' | 'backup', code: string) => {
    if (isVerifying || isLoading) return;

    setIsVerifying(true);
    try {
      // 模拟验证过程
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟验证成功
      if ((method === 'totp' && code.length === 6) || (method === 'backup' && code.length === 8)) {
        onVerificationSuccess(method);
      }
    } catch (error) {
      console.error('验证失败:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    setTimeRemaining(30);
    onResendCode?.();
  };

  const handleClearInput = () => {
    if (selectedMethod === 'totp') {
      setVerificationCode('');
      inputRefs.current[0]?.focus();
    } else {
      setBackupCode('');
      backupInputRef.current?.focus();
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">验证您的身份</h2>
        <p className="text-gray-400">
          为了保护您的账户安全，请完成双因素认证
        </p>
        <p className="text-sm text-gray-500 mt-1">
          登录账户: {userEmail}
        </p>
      </div>

      <div className="space-y-3">
        {verificationMethods.map((method) => (
          <div
            key={method.id}
            onClick={() => method.available && setSelectedMethod(method.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
              method.available
                ? 'bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-750'
                : 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed'
            } ${selectedMethod === method.id ? 'border-blue-500 bg-blue-900/20' : ''}`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                method.available 
                  ? selectedMethod === method.id 
                    ? 'bg-blue-600' 
                    : 'bg-gray-600'
                  : 'bg-gray-700'
              }`}>
                {method.icon}
              </div>
              <div className="flex-1">
                <h3 className={`font-medium ${method.available ? 'text-white' : 'text-gray-500'}`}>
                  {method.name}
                </h3>
                <p className={`text-sm ${method.available ? 'text-gray-400' : 'text-gray-600'}`}>
                  {method.description}
                </p>
              </div>
              {selectedMethod === method.id && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTOTPVerification = () => (
    <div className="space-y-6">
      <div className="text-center">
        <button
          onClick={() => setSelectedMethod(null)}
          className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回选择验证方式
        </button>
        
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">输入验证码</h3>
        <p className="text-gray-400 mb-2">
          请输入身份验证器应用中显示的6位数字
        </p>
        <p className="text-sm text-gray-500">
          验证码每 {timeRemaining}s 更新一次
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center space-x-2">
          {Array.from({ length: 6 }, (_, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={verificationCode[index] || ''}
              onChange={(e) => handleTOTPInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-xl font-mono bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={isVerifying || isLoading}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleClearInput}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            disabled={isVerifying || isLoading}
          >
            清除
          </button>
          <button
            onClick={handleResend}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
            disabled={isVerifying || isLoading || timeRemaining > 25}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重新同步
          </button>
        </div>

        {(isVerifying || isLoading) && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-400">正在验证...</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderBackupVerification = () => (
    <div className="space-y-6">
      <div className="text-center">
        <button
          onClick={() => setSelectedMethod(null)}
          className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回选择验证方式
        </button>
        
        <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">使用备用码</h3>
        <p className="text-gray-400">
          请输入您之前保存的8位备用代码
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div className="text-sm text-yellow-300">
              <p className="font-medium mb-1">提示：</p>
              <p>每个备用码只能使用一次，使用后将自动失效</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <input
            ref={backupInputRef}
            type={showBackupCode ? "text" : "password"}
            value={backupCode}
            onChange={(e) => handleBackupCodeInput(e.target.value)}
            placeholder="请输入8位备用码"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white text-center text-lg font-mono tracking-widest focus:outline-none focus:border-yellow-500"
            maxLength={8}
            disabled={isVerifying || isLoading}
          />
          <button
            type="button"
            onClick={() => setShowBackupCode(!showBackupCode)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showBackupCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleClearInput}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          disabled={isVerifying || isLoading || !backupCode}
        >
          清除输入
        </button>

        {(isVerifying || isLoading) && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-yellow-500 mr-2" />
            <span className="text-gray-400">正在验证...</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-gray-900 rounded-lg p-6">
        {!selectedMethod && renderMethodSelection()}
        {selectedMethod === 'totp' && renderTOTPVerification()}
        {selectedMethod === 'backup' && renderBackupVerification()}
        
        {/* 底部操作 */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            disabled={isVerifying || isLoading}
          >
            取消登录
          </button>
        </div>
      </div>
    </div>
  );
};

export default MFAVerification;
