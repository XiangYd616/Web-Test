/**
 * 邮箱验证页面组件
 * 用于验证用户注册时的邮箱地址
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Shield,
  ArrowLeft,
  Send,
  Clock
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface EmailVerificationState {
  isVerifying: boolean;
  verificationComplete: boolean;
  verificationFailed: boolean;
  isResending: boolean;
  error: string | null;
  success: string | null;
  resendCooldown: number;
}

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [state, setState] = useState<EmailVerificationState>({
    isVerifying: !!token, // 如果有token则自动开始验证
    verificationComplete: false,
    verificationFailed: false,
    isResending: false,
    error: null,
    success: null,
    resendCooldown: 0
  });

  // 自动验证邮箱
  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  // 验证邮箱
  const verifyEmail = async (verificationToken: string) => {
    setState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken })
      });

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '验证失败');
      }

      setState(prev => ({
        ...prev,
        isVerifying: false,
        verificationComplete: true,
        success: '邮箱验证成功！'
      }));

      toast.success('邮箱验证成功！');

    } catch (error) {
      setState(prev => ({
        ...prev,
        isVerifying: false,
        verificationFailed: true,
        error: error instanceof Error ? error.message : '验证失败'
      }));

      toast.error('邮箱验证失败');
    }
  };

  // 重新发送验证邮件
  const resendVerificationEmail = useCallback(async () => {
    if (state.resendCooldown > 0) return;

    setState(prev => ({ ...prev, isResending: true, error: null }));

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!response.ok) {
        throw new Error('发送验证邮件失败');
      }

      setState(prev => ({
        ...prev,
        isResending: false,
        success: '验证邮件已重新发送',
        resendCooldown: 60
      }));

      // 启动倒计时
      startResendCooldown();
      toast.success('验证邮件已重新发送，请查看您的邮箱');

    } catch (error) {
      setState(prev => ({
        ...prev,
        isResending: false,
        error: error instanceof Error ? error.message : '发送失败'
      }));

      toast.error('发送验证邮件失败');
    }
  }, [state.resendCooldown]);

  // 重发倒计时
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

  // 跳转到登录页面
  const handleGoToLogin = () => {
    navigate('/login?verified=true');
  };

  // 返回首页
  const handleGoHome = () => {
    navigate('/');
  };

  // 正在验证状态
  if (state.isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">正在验证邮箱</h2>
          <p className="text-gray-600">请稍候，我们正在验证您的邮箱地址...</p>
        </div>
      </div>
    );
  }

  // 验证成功状态
  if (state.verificationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">邮箱验证成功！</h2>
          <p className="text-gray-600 mb-8">
            恭喜您！您的邮箱 <strong>{email || '邮箱地址'}</strong> 已成功验证。
            现在您可以享受 Test-Web 的全部功能。
          </p>

          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-8">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-green-800 font-medium mb-1">验证成功</p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• 您的账户安全性已提升</li>
                  <li>• 现在可以接收重要的系统通知</li>
                  <li>• 可以使用密码重置功能</li>
                  <li>• 享受完整的平台功能</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoToLogin}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-medium transition-colors"
            >
              立即登录
            </button>
            
            <button
              onClick={handleGoHome}
              className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-md font-medium transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 验证失败或无token的状态
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 返回按钮 */}
        <div>
          <Link
            to="/"
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回首页</span>
          </Link>
        </div>

        {/* 头部 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            {state.verificationFailed ? (
              <AlertCircle className="h-6 w-6 text-white" />
            ) : (
              <Mail className="h-6 w-6 text-white" />
            )}
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {state.verificationFailed ? '验证失败' : '验证您的邮箱'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {state.verificationFailed 
              ? '验证链接可能已过期或无效'
              : '请检查您的邮箱并点击验证链接'
            }
          </p>
        </div>

        {/* 主要内容 */}
        <div className="space-y-6">
          {state.verificationFailed ? (
            /* 验证失败内容 */
            <div className="bg-red-50 border border-red-200 rounded-md p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 mb-2">
                    邮箱验证失败
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    {state.error || '验证链接已过期或无效。请重新发送验证邮件。'}
                  </p>
                  <div className="space-y-2 text-xs text-red-600">
                    <p>• 验证链接有效期为24小时</p>
                    <p>• 每个验证链接只能使用一次</p>
                    <p>• 请确保使用最新收到的验证邮件</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 正常验证引导内容 */
            <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
              <div className="flex items-start space-x-3">
                <Mail className="h-6 w-6 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">
                    验证邮件已发送
                  </h3>
                  <p className="text-sm text-blue-700 mb-3">
                    我们已向您的邮箱发送了验证链接。请检查您的邮箱（包括垃圾邮件文件夹）。
                  </p>
                  <div className="space-y-2 text-xs text-blue-600">
                    <p>• 验证链接有效期为24小时</p>
                    <p>• 点击邮件中的验证链接即可完成验证</p>
                    <p>• 如果没有收到邮件，请检查垃圾邮件文件夹</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 重新发送选项 */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              {state.verificationFailed ? '重新发送验证邮件？' : '没有收到邮件？'}
            </p>
            <button
              onClick={resendVerificationEmail}
              disabled={state.isResending || state.resendCooldown > 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
            >
              {state.isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>发送中...</span>
                </>
              ) : state.resendCooldown > 0 ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>{state.resendCooldown}秒后可重新发送</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>重新发送验证邮件</span>
                </>
              )}
            </button>
          </div>

          {/* 成功消息 */}
          {state.success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-sm text-green-700">{state.success}</p>
              </div>
            </div>
          )}

          {/* 错误消息 */}
          {state.error && !state.verificationFailed && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{state.error}</p>
              </div>
            </div>
          )}

          {/* 其他操作 */}
          <div className="text-center space-y-3">
            <div className="text-sm text-gray-600">
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                已验证？立即登录
              </Link>
            </div>
            <div className="text-sm text-gray-600">
              <Link
                to="/help/email-verification"
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                需要帮助？
              </Link>
            </div>
          </div>
        </div>

        {/* 安全提示 */}
        <div className="mt-8">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-800 font-medium mb-1">安全提示</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 验证邮件只会发送到您注册时使用的邮箱</li>
                  <li>• 请勿将验证链接分享给他人</li>
                  <li>• 如果您没有注册账户，请忽略此邮件</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
