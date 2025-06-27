import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { actualTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查邮箱和密码');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 theme-transition relative overflow-hidden"
         style={{ background: 'var(--gradient-primary)' }}>

      {/* 主题切换按钮 */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl backdrop-blur-xl border-2 transition-all duration-300 hover:scale-110 shadow-lg"
          style={{
            background: 'var(--card-background)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
          title={actualTheme === 'light' ? '切换到深色主题' : '切换到浅色主题'}
        >
          {actualTheme === 'light' ? (
            <Moon className="w-6 h-6" />
          ) : (
            <Sun className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* 动态背景装饰 - 适配主题 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full opacity-20 blur-3xl"
             style={{
               background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
             }}></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full opacity-20 blur-3xl"
             style={{
               background: 'linear-gradient(135deg, var(--accent-secondary), #8b5cf6)'
             }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
             style={{
               background: 'radial-gradient(circle, var(--accent-primary), transparent)'
             }}></div>
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Logo和标题区域 - 优化设计 */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-3">
            Test Web App
          </h1>
          <p className="text-xl font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            专业的网站测试平台
          </p>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            欢迎回来
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            还没有账户？{' '}
            <Link to="/register" className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
              立即注册
            </Link>
          </p>
        </div>
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="backdrop-blur-xl rounded-3xl border p-8 sm:p-10"
             style={{
               background: 'var(--card-background)',
               boxShadow: 'var(--card-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
               borderColor: 'var(--border-color)'
             }}>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="backdrop-blur border rounded-2xl p-4 animate-pulse"
                   style={{
                     background: 'var(--error-background)',
                     borderColor: 'var(--error-border)',
                     color: 'var(--error-text)'
                   }}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label htmlFor="email" className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                邮箱地址
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 transition-colors duration-200" style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-12 pr-4 py-4 rounded-2xl text-sm transition-all duration-200 border-2"
                  style={{
                    background: 'var(--input-background)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--text-primary)',
                    boxShadow: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent-primary)';
                    e.target.style.boxShadow = '0 0 0 3px var(--input-focus-ring, rgba(59, 130, 246, 0.15))';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--input-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="请输入邮箱地址"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="password" className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                密码
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 transition-colors duration-200" style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-12 pr-12 py-4 rounded-2xl text-sm transition-all duration-200 border-2"
                  style={{
                    background: 'var(--input-background)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--text-primary)',
                    boxShadow: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent-primary)';
                    e.target.style.boxShadow = '0 0 0 3px var(--input-focus-ring, rgba(59, 130, 246, 0.15))';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--input-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="请输入密码"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center z-10">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none transition-colors duration-200 hover:scale-110 transform"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-5 w-5 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500/50"
                  style={{
                    borderColor: 'var(--input-border)',
                    backgroundColor: 'var(--input-background)',
                    accentColor: 'var(--accent-primary)'
                  }}
                />
                <label htmlFor="remember-me" className="ml-3 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  记住我
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
                  忘记密码？
                </a>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-semibold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-300 hover:scale-[1.02] ${
                  isLoading ? 'opacity-50 cursor-not-allowed scale-100' : ''
                }`}
                style={{
                  boxShadow: isLoading ? 'none' : 'var(--button-shadow, 0 10px 15px -3px rgba(59, 130, 246, 0.2))'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(59, 130, 246, 0.3), 0 10px 10px -5px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.boxShadow = 'var(--button-shadow, 0 10px 15px -3px rgba(59, 130, 246, 0.2))';
                  }
                }}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>登录中...</span>
                  </div>
                ) : (
                  <span className="flex items-center space-x-3">
                    <span>登录</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--border-color)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-6 py-1 rounded-full font-medium backdrop-blur-sm"
                      style={{
                        background: 'var(--card-background)',
                        color: 'var(--text-secondary)'
                      }}>
                  或者
                </span>
              </div>
            </div>

            <div className="mt-8">
              <Link
                to="/download-desktop"
                className="w-full inline-flex justify-center items-center py-4 px-6 rounded-2xl shadow-lg backdrop-blur text-base font-semibold transition-all duration-300 group hover:scale-[1.02] border-2"
                style={{
                  background: 'var(--secondary-button-background)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)'
                }}
              >
                <svg className="w-6 h-6 mr-3 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                     style={{ color: 'var(--text-tertiary)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                下载桌面版应用
              </Link>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              登录即表示您同意我们的{' '}
              <a href="#" className="font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200 underline underline-offset-2">
                服务条款
              </a>{' '}
              和{' '}
              <a href="#" className="font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200 underline underline-offset-2">
                隐私政策
              </a>
            </p>

            {/* 功能特色展示 - 优化设计 */}
            <div className="mt-8 grid grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center space-y-2 group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 group-hover:scale-110"
                     style={{
                       background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                       borderColor: '#3b82f6'
                     }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>快速测试</span>
              </div>
              <div className="flex flex-col items-center space-y-2 group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 group-hover:scale-110"
                     style={{
                       background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                       borderColor: '#8b5cf6'
                     }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>专业分析</span>
              </div>
              <div className="flex flex-col items-center space-y-2 group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 group-hover:scale-110"
                     style={{
                       background: 'linear-gradient(135deg, #10b981, #059669)',
                       borderColor: '#10b981'
                     }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>安全可靠</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
