/**
 * 忘记密码页面组件
 * 提供密码重置申请功能
 */

import React, { useState, useCallback } from 'react';
import { 
  Mail, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Key,
  Shield
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface ForgotPasswordState {
  email: string;
  isLoading: boolean;
  emailSent: boolean;
  error: string | null;
  resendCooldown: number;
}

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  
  const [state, setState] = useState<ForgotPasswordState>({
    email: '',
    isLoading: false,
    emailSent: false,
    error: null,
    resendCooldown: 0
  });

  // 验证邮箱格式
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 发送重置邮件
  const handleSendResetEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.email.trim()) {
      toast.error('请输入邮箱地址');
      return;
    }

    if (!validateEmail(state.email)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 模拟API调用
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.email })
      });

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!response.ok) {
        throw new Error('发送重置邮件失败');
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        emailSent: true,
        resendCooldown: 60 // 60秒倒计时
      }));
      
      toast.success('重置邮件已发送，请查看您的邮箱');

      // 启动倒计时
      startResendCooldown();

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : '发送邮件失败' 
      }));
      toast.error('发送重置邮件失败，请稍后重试');
    }
  }, [state.email]);

  // 重新发送倒计时
  const startResendCooldown = () => {
    const timer = setInterval(() => {
      setState(prev => {
        if (prev.resendCooldown <= 1) {
          clearInterval(timer);
          return { ...prev, resendCooldown: 0 };
        }
        return { ...prev, resendCooldown: prev.resendCooldown - 1 };
      });
    }, 1000);
  };

  // 重新发送邮件
  const handleResendEmail = useCallback(() => {
    if (state.resendCooldown > 0) return;
    
    setState(prev => ({ 
      ...prev, 
      emailSent: false,
      resendCooldown: 60 
    }));
    
    // 重新发送
    handleSendResetEmail({ preventDefault: () => {} } as React.FormEvent);
  }, [state.resendCooldown, handleSendResetEmail]);

  // 返回登录页面
  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 返回按钮 */}
        <div>
          <button
            onClick={handleBackToLogin}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回登录</span>
          </button>
        </div>

        {/* 头部 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            {state.emailSent ? (
              <CheckCircle className="h-6 w-6 text-white" />
            ) : (
              <Key className="h-6 w-6 text-white" />
            )}
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {state.emailSent ? '邮件已发送' : '重置密码'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {state.emailSent 
              ? '我们已向您的邮箱发送重置链接'
              : '输入您的邮箱地址，我们将发送重置链接'
            }
          </p>
        </div>

        {!state.emailSent ? (
          /* 邮箱输入表单 */
          <form className="mt-8 space-y-6" onSubmit={handleSendResetEmail}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={state.email}
                  onChange={(e) => setState(prev => ({ ...prev, email: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入您的邮箱地址"
                  disabled={state.isLoading}
                  required
                />
              </div>
            </div>

            {/* 错误显示 */}
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-700">{state.error}</p>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={state.isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {state.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>发送中...</span>
                  </div>
                ) : (
                  '发送重置邮件'
                )}
              </button>
            </div>
          </form>
        ) : (
          /* 邮件已发送状态 */
          <div className="mt-8 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-800 mb-2">
                    重置邮件已发送
                  </h3>
                  <p className="text-sm text-green-700 mb-3">
                    我们已向 <strong>{state.email}</strong> 发送了密码重置链接。
                    请检查您的邮箱（包括垃圾邮件文件夹）。
                  </p>
                  <div className="space-y-2 text-xs text-green-600">
                    <p>• 重置链接有效期为24小时</p>
                    <p>• 如果找不到邮件，请检查垃圾邮件文件夹</p>
                    <p>• 每个重置链接只能使用一次</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 重新发送选项 */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                没有收到邮件？
              </p>
              <button
                onClick={handleResendEmail}
                disabled={state.resendCooldown > 0}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {state.resendCooldown > 0 
                  ? `${state.resendCooldown}秒后可重新发送`
                  : '重新发送邮件'
                }
              </button>
            </div>

            {/* 返回登录 */}
            <div className="text-center">
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                返回登录页面
              </Link>
            </div>
          </div>
        )}

        {/* 安全提示 */}
        <div className="mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">安全提示</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 重置邮件只会发送到您注册时使用的邮箱</li>
                  <li>• 如果您没有申请重置密码，请忽略此邮件</li>
                  <li>• 为了账户安全，建议使用强密码</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 需要帮助 */}
        <div className="text-center text-sm text-gray-600">
          <p>
            仍然无法访问账户？{' '}
            <Link
              to="/help/account-recovery"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              联系客服
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
