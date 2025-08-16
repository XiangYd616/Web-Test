import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Mail, Moon, Sun, User    } from 'lucide-react';import { useState, useEffect    } from 'react';import { useAsyncErrorHandler    } from '../hooks/useAsyncErrorHandler';import authService from '../services/authService';import React, { useState    } from 'react';import { Link, useNavigate    } from 'react-router-dom';import { useAuth    } from '../../../contexts/AuthContext.tsx';import { useTheme    } from '../../../contexts/ThemeContext.tsx';const Register: React.FC  = () => {'
  // 页面级功能
  const [pageTitle, setPageTitle] = useState("');'
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;`
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'`
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);'
    return () => {
      document.removeEventListener("visibilitychange', handleVisibilityChange);'
    };
  }, [fetchData]);
  
  // 表单验证
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  const validateForm = useCallback((data) => {
    const errors = {};
    
    // 添加验证规则
    if (!data.name?.trim()) {
      errors.name = '名称不能为空';
    }
    
    if (!data.email?.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = '邮箱格式不正确';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.post('/api/submit', formData);'
      // 处理成功提交
    } catch (err) {
      setError(err.message || '提交失败');'
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm]);
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });'
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });'
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback("error', state.error.message);'
    }
  }, [state.error]);
  
  const [formErrors, setFormErrors] = useState({});
  
  const validateForm = (data) => {
    const errors = {};
    
    // 基础验证规则
    if (!data.name || data.name.trim() === '') {'
      errors.name = '名称不能为空';
    }
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    return errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    // 提交表单
    await submitForm(formData);
  };
  
  
  const handleLogin = async (credentials) => {
    const result = await executeAsync(
      () => authService.login(credentials),
      { context: 'Login.handleLogin' }'
    );
    
    if (result) {
      setUser(result.user);
      setIsAuthenticated(true);
      // 重定向到主页或之前的页面
      navigate('/dashboard');'
    }
  };
  
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = authService.getUser();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
    };
    
    checkAuth();
  }, []);
  const { executeAsync, state } = useAsyncErrorHandler();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [formData, setFormData] = useState({
    username: '','
    email: '','
    password: '','
    confirmPassword: '','
    acceptTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');'
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("');'
    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      
        setError('两次输入的密码不一致');'
      setIsLoading(false);
      return;
      }

    if (passwordStrength < 3) {
      
        setError('密码强度不够，请设置更复杂的密码');'
      setIsLoading(false);
      return;
      }

    try {
      await register(formData);
      navigate('/');'
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试');'
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password') {'
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { text: '弱', color: 'text-red-600' };'
      case 2:
      case 3:
        return { text: '中等', color: 'text-yellow-600' };'
      case 4:
      case 5:
        return { text: '强', color: 'text-green-600' };'
      default:
        return { text: '', color: "' };'
    }
  };

  const strengthInfo = getPasswordStrengthText();

  
  if (state.isLoading || loading) {
    return (
      <div className= 'flex justify-center items-center h-64'>
        <div className= 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
        <span className= 'ml-3 text-gray-600'>加载中...</span>
      </div>
    );
  }

  if (state.error) {
    return (<div className= 'bg-red-50 border border-red-200 rounded-md p-4'>
        <div className= 'flex'>
          <div className= 'flex-shrink-0'>
            <svg className= 'h-5 w-5 text-red-400' viewBox= '0 0 20 20' fill= 'currentColor'>
              <path fillRule= 'evenodd' d= 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule= 'evenodd' />
            </svg>
          </div>
          <div className= 'ml-3'>
            <h3 className= 'text-sm font-medium text-red-800'>
              操作失败
            </h3>
            <div className= 'mt-2 text-sm text-red-700'>
              <p>{state.error.message}</p>
            </div>
            <div className= 'mt-4'>
              <button
                onClick={() => window.location.reload()}
                className= 'bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200';
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className= 'min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative';
      style={{ background: 'var(--gradient-primary)' }}>
      {/* 主题切换按钮 */}
      <button
        type= 'button';
        onClick={toggleTheme}
        className= 'fixed top-6 right-6 z-50 p-3 rounded-full transition-all duration-300 hover:scale-110';
        style={{
          background: 'var(--bg-secondary)','
          border: '1px solid var(--border-primary)','
          color: 'var(--text-primary)';
        }}
        title={theme === 'dark' ? "切换到浅色主题" : "切换到深色主题'}'
      >
        {theme === 'dark' ? <Sun className= 'w-5 h-5'    /> : <Moon className= 'w-5 h-5'    />}'
      </button>

      <div className= 'sm:mx-auto sm:w-full sm:max-w-md'>
        <div className= 'text-center mb-8'>
          <div className= 'flex justify-center mb-4'>
            <div className= 'w-16 h-16 rounded-full flex items-center justify-center';
              style={{ background: 'var(--accent-primary)' }}>
              <User className= 'w-8 h-8 text-white'    />
            </div>
          </div>
          <h1 className= 'text-4xl font-bold mb-2';
            style={{
              background: 'var(--text-gradient, linear-gradient(135deg, #1e293b 0%, #475569 100%))','
              WebkitBackgroundClip: 'text','
              WebkitTextFillColor: 'transparent','
              backgroundClip: 'text','
              color: 'var(--text-primary)';
            }}>
            Test Web App
          </h1>
          <p className= 'text-lg' style={{ color: 'var(--text-secondary)' }}>专业的网站测试平台</p>
        </div>

        <div className= 'text-center mb-8'>
          <h2 className= 'text-3xl font-bold mb-4' style={{ color: 'var(--text-primary)' }}>
            创建新账户
          </h2>
          <p className= 'text-base' style={{ color: 'var(--text-secondary)' }}>
            已有账户？{' '}'
            <Link to= '/login';
              className= 'font-semibold hover:underline transition-colors duration-200';
              style={{
                background: 'var(--link-gradient, linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%))','
                WebkitBackgroundClip: 'text','
                WebkitTextFillColor: 'transparent','
                backgroundClip: 'text';
              }}>
              立即登录
            </Link>
          </p>
        </div>
      </div>

      <div className= 'sm:mx-auto sm:w-full sm:max-w-md'>
        <div className= 'backdrop-blur-xl rounded-3xl border p-8 sm:p-10';
          style={{
            background: 'var(--card-background)','
            boxShadow: 'var(--card-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.25))','
            borderColor: 'var(--border-color)';
          }}>
          <form className= 'space-y-6' onSubmit={handleSubmit}>
            {error && (
              <div className= 'rounded-2xl p-4 flex items-start space-x-3';
                style={{
                  background: 'var(--error-background)','
                  border: '1px solid var(--error-border)','
                  color: 'var(--error-text)';
                }}>
                <AlertCircle className= 'w-5 h-5 flex-shrink-0 mt-0.5'    />
                <p className= 'text-sm font-medium'>{error}</p>
              </div>
            )}

            <div>
              <label htmlFor= 'username' className= 'block text-sm font-medium mb-2';
                style={{ color: 'var(--text-secondary)' }}>
                用户名
              </label>
              <div className= 'relative'>
                <div className= 'absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <User className= 'h-5 w-5' style={{ color: 'var(--text-tertiary)' }}    />
                </div>
                <input
                  id= 'username';
                  name= 'username';
                  type= 'text';
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className= 'appearance-none block w-full pl-12 pr-4 py-4 rounded-2xl text-sm transition-all duration-200 border-2';
                  style={{
                    background: 'var(--input-background)','
                    borderColor: 'var(--input-border)','
                    color: 'var(--text-primary)','
                    boxShadow: 'none';
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent-primary)';
                    e.target.style.boxShadow = '0 0 0 3px var(--input-focus-ring, rgba(59, 130, 246, 0.15))';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--input-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder= '请输入用户名';
                />
              </div>
            </div>

            <div>
              <label htmlFor= 'email' className= 'block text-sm font-medium mb-2';
                style={{ color: 'var(--text-secondary)' }}>
                邮箱地址
              </label>
              <div className= 'relative'>
                <div className= 'absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <Mail className= 'h-5 w-5' style={{ color: 'var(--text-tertiary)' }}    />
                </div>
                <input
                  id= 'email';
                  name= 'email';
                  type= 'email';
                  autoComplete= 'email';
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className= 'appearance-none block w-full pl-12 pr-4 py-4 rounded-2xl text-sm transition-all duration-200 border-2';
                  style={{
                    background: 'var(--input-background)','
                    borderColor: 'var(--input-border)','
                    color: 'var(--text-primary)','
                    boxShadow: 'none';
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent-primary)';
                    e.target.style.boxShadow = '0 0 0 3px var(--input-focus-ring, rgba(59, 130, 246, 0.15))';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--input-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder= '请输入邮箱地址';
                />
              </div>
            </div>

            <div>
              <label htmlFor= 'password' className= 'block text-sm font-medium text-gray-700'>
                密码
              </label>
              <div className= 'mt-1 relative'>
                <div className= 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Lock className= 'h-5 w-5 text-gray-400'    />
                </div>
                <input
                  id= 'password';
                  name= 'password';
                  type={showPassword ? 'text" : 'password'}'
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className= 'appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
                  placeholder= '请输入密码';
                />
                <div className= 'absolute inset-y-0 right-0 pr-3 flex items-center'>
                  <button
                    type= 'button';
                    onClick={() => setShowPassword(!showPassword)}
                    className= 'text-gray-400 hover:text-gray-500 focus:outline-none';
                  >
                    {showPassword ? (
                      <EyeOff className= 'h-5 w-5'    />
                    ) : (
                      <Eye className= 'h-5 w-5'    />
                    )}
                  </button>
                </div>
              </div>
              {formData.password && (
                <div className= 'mt-2'>
                  <div className= 'flex items-center justify-between text-xs'>
                    <span className= 'text-gray-500'>密码强度:</span>
                    <span className={strengthInfo.color}>{strengthInfo.text}</span>
                  </div>
                  <div className= 'mt-1 w-full bg-gray-200 rounded-full h-1'>
                    <div
                      className={`h-1 rounded-full transition-all ${passwordStrength <= 2 ? "bg-red-500' : ''`}
                        passwordStrength <= 3 ? "bg-yellow-500' : 'bg-green-500';'`
                        }`}`
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}`
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor= "confirmPassword' className= 'block text-sm font-medium text-gray-700'>`
                确认密码
              </label>
              <div className= 'mt-1 relative'>
                <div className= 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Lock className= 'h-5 w-5 text-gray-400'    />
                </div>
                <input
                  id= 'confirmPassword';
                  name= 'confirmPassword';
                  type={showConfirmPassword ? 'text' : "password'}'
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className= 'appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
                  placeholder= '请再次输入密码';
                />
                <div className= 'absolute inset-y-0 right-0 pr-3 flex items-center'>
                  <button
                    type= 'button';
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className= 'text-gray-400 hover:text-gray-500 focus:outline-none';
                  >
                    {showConfirmPassword ? (
                      <EyeOff className= 'h-5 w-5'    />
                    ) : (
                      <Eye className= 'h-5 w-5'    />
                    )}
                  </button>
                </div>
              </div>
              {formData.confirmPassword && (
                <div className= 'mt-1 flex items-center'>
                  {formData.password === formData.confirmPassword ? (
                    <div className= 'flex items-center text-green-600'>
                      <CheckCircle className= 'w-4 h-4 mr-1'    />
                      <span className= 'text-xs'>密码匹配</span>
                    </div>
                  ) : (
                    <div className= 'flex items-center text-red-600'>
                      <AlertCircle className= 'w-4 h-4 mr-1'    />
                      <span className= 'text-xs'>密码不匹配</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className= 'flex items-center'>
              <input
                id= 'agree-terms';
                name= 'agree-terms';
                type= 'checkbox';
                required
                className= 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded';
              />
              <label htmlFor= 'agree-terms' className= 'ml-2 block text-sm text-gray-900'>
                我同意{' '}'
                <a href= '#' className= 'text-blue-600 hover:text-blue-500'>
                  服务条款
                </a>{" '}'
                和{' '}'
                <a href= '#' className= 'text-blue-600 hover:text-blue-500'>
                  隐私政策
                </a>
              </label>
            </div>

            <div>
              <button
                type= 'submit';
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : '';'`}
                  }`}`
              >
                {isLoading ? (
                  <div className= "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>`
                ) : (
                  '注册账户';
                )}
              </button>
            </div>
          </form>

          <div className= 'mt-6'>
            <div className= 'relative'>
              <div className= 'absolute inset-0 flex items-center'>
                <div className= 'w-full border-t border-gray-300' />
              </div>
              <div className= 'relative flex justify-center text-sm'>
                <span className= 'px-2 bg-white text-gray-500'>或者</span>
              </div>
            </div>

            <div className= 'mt-6'>
              <Link
                to= '/download-desktop';
                className= 'w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50';
              >
                下载桌面版应用
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
