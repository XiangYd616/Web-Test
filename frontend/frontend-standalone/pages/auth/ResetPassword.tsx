/**
 * 密码重置页面组件
 * 通过重置链接访问，允许用户设置新密码
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Shield,
  ArrowLeft,
  Key
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface ResetPasswordState {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isLoading: boolean;
  isValidating: boolean;
  isValidToken: boolean;
  resetComplete: boolean;
  error: string | null;
  validationErrors: {
    password?: string;
    confirmPassword?: string;
  };
}

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [state, setState] = useState<ResetPasswordState>({
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    isLoading: false,
    isValidating: true,
    isValidToken: false,
    resetComplete: false,
    error: null,
    validationErrors: {}
  });

  // 验证重置token
  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token || !email) {
      setState(prev => ({
        ...prev,
        isValidating: false,
        isValidToken: false,
        error: '无效的重置链接'
      }));
      return;
    }

    try {
      // 模拟API调用验证token
      const response = await fetch(`/api/auth/validate-reset-token?token=${token}&email=${email}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!response.ok) {
        throw new Error('重置链接已过期或无效');
      }

      setState(prev => ({
        ...prev,
        isValidating: false,
        isValidToken: true
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isValidating: false,
        isValidToken: false,
        error: error instanceof Error ? error.message : '验证重置链接失败'
      }));
    }
  };

  // 密码强度验证
  const validatePassword = (password: string): string | null => {
    if (!password) {
      return '请输入密码';
    }
    if (password.length < 8) {
      return '密码至少需要8个字符';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return '密码必须包含大小写字母和数字';
    }
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      return '密码必须包含特殊字符';
    }
    return null;
  };

  // 实时验证
  const handlePasswordChange = (password: string) => {
    setState(prev => ({
      ...prev,
      password,
      validationErrors: {
        ...prev.validationErrors,
        password: validatePassword(password)
      }
    }));
  };

  const handleConfirmPasswordChange = (confirmPassword: string) => {
    setState(prev => ({
      ...prev,
      confirmPassword,
      validationErrors: {
        ...prev.validationErrors,
        confirmPassword: confirmPassword !== state.password ? '两次输入的密码不一致' : undefined
      }
    }));
  };

  // 密码强度指示器
  const getPasswordStrength = (password: string): { score: number; text: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) score++;
    if (password.length >= 12) score++;

    if (score <= 2) return { score, text: '弱', color: 'text-red-500' };
    if (score <= 3) return { score, text: '中等', color: 'text-yellow-500' };
    if (score <= 4) return { score, text: '强', color: 'text-green-500' };
    return { score, text: '很强', color: 'text-green-600' };
  };

  // 提交密码重置
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    const passwordError = validatePassword(state.password);
    const confirmError = state.password !== state.confirmPassword ? '两次输入的密码不一致' : null;

    if (passwordError || confirmError) {
      setState(prev => ({
        ...prev,
        validationErrors: {
          password: passwordError,
          confirmPassword: confirmError
        }
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 提交新密码
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password: state.password
        })
      });

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!response.ok) {
        throw new Error('重置密码失败');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        resetComplete: true
      }));

      toast.success('密码重置成功！');

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '重置密码失败'
      }));
      toast.error('重置密码失败，请重试');
    }
  }, [state.password, state.confirmPassword, token, email]);

  // 返回登录
  const handleBackToLogin = () => {
    navigate('/login');
  };

  // 正在验证token
  if (state.isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">正在验证重置链接...</p>
        </div>
      </div>
    );
  }

  // 无效的token
  if (!state.isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-12 w-12 bg-red-600 rounded-lg flex items-center justify-center mb-6">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">链接无效或已过期</h2>
          <p className="text-gray-600 mb-8">
            {state.error || '重置链接已过期或无效，请重新申请密码重置。'}
          </p>
          <div className="space-y-4">
            <Link
              to="/forgot-password"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              重新申请重置
            </Link>
            <Link
              to="/login"
              className="block w-full border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-md font-medium transition-colors"
            >
              返回登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 重置完成
  if (state.resetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">密码重置成功！</h2>
          <p className="text-gray-600 mb-8">
            您的密码已成功重置。现在可以使用新密码登录您的账户。
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-8">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-green-800 font-medium mb-1">安全提示</p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• 请记住您的新密码</li>
                  <li>• 建议定期更换密码</li>
                  <li>• 不要在其他网站使用相同密码</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleBackToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors"
          >
            立即登录
          </button>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(state.password);

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
            <Key className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">设置新密码</h2>
          <p className="mt-2 text-sm text-gray-600">
            为账户 <strong>{email}</strong> 设置新密码
          </p>
        </div>

        {/* 重置表单 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* 新密码 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              新密码
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={state.showPassword ? 'text' : 'password'}
                value={state.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  state.validationErrors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="输入新密码"
                disabled={state.isLoading}
              />
              <button
                type="button"
                onClick={() => setState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {state.showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            {/* 密码强度指示器 */}
            {state.password && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">密码强度</span>
                  <span className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      passwordStrength.score <= 2 ? 'bg-red-500' :
                      passwordStrength.score <= 3 ? 'bg-yellow-500' :
                      passwordStrength.score <= 4 ? 'bg-green-500' : 'bg-green-600'
                    }`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {state.validationErrors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {state.validationErrors.password}
              </p>
            )}
          </div>

          {/* 确认密码 */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              确认新密码
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                type={state.showConfirmPassword ? 'text' : 'password'}
                value={state.confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  state.validationErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="再次输入新密码"
                disabled={state.isLoading}
              />
              <button
                type="button"
                onClick={() => setState(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {state.showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {state.validationErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {state.validationErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* 密码要求 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">密码要求：</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li className={state.password.length >= 8 ? 'text-green-600' : ''}>
                • 至少8个字符
              </li>
              <li className={/(?=.*[a-z])(?=.*[A-Z])/.test(state.password) ? 'text-green-600' : ''}>
                • 包含大小写字母
              </li>
              <li className={/(?=.*\d)/.test(state.password) ? 'text-green-600' : ''}>
                • 包含数字
              </li>
              <li className={/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(state.password) ? 'text-green-600' : ''}>
                • 包含特殊字符
              </li>
            </ul>
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
              disabled={state.isLoading || !!state.validationErrors.password || !!state.validationErrors.confirmPassword}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.isLoading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>重置中...</span>
                </div>
              ) : (
                '重置密码'
              )}
            </button>
          </div>
        </form>

        {/* 安全提示 */}
        <div className="mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">安全提示</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 使用强密码保护您的账户</li>
                  <li>• 不要使用与其他网站相同的密码</li>
                  <li>• 定期更换密码以保证安全</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
