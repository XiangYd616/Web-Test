import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { parseAuthError } from '../components/auth/AuthErrorHandler';
import type { AuthContextType, User } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Token自动刷新功能
  const setupTokenRefresh = (expiresIn: number) => {
    // 在token过期前5分钟刷新
    const refreshTime = Math.max(expiresIn - 5 * 60 * 1000, 60 * 1000);

    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    const timer = setTimeout(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('自动刷新token失败:', error);
        await logout();
      }
    }, refreshTime);

    setRefreshTimer(timer);
  };

  // 解析JWT token获取过期时间
  const parseTokenExpiry = (token: string): number => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // 转换为毫秒
    } catch (error) {
      console.error('解析token失败:', error);
      return 0;
    }
  };

  // 清除认证数据
  const clearAuthData = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('session_id');
    setUser(null);
    setError(null);

    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }
  };

  useEffect(() => {
    // 检查本地存储中的用户信息并验证token
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const refreshTokenValue = localStorage.getItem('refresh_token');
        const userData = localStorage.getItem('user_data');
        const rememberMe = localStorage.getItem('remember_me') === 'true';

        if (token && userData) {
          // 检查token是否即将过期
          const expiryTime = parseTokenExpiry(token);
          const currentTime = Date.now();

          if (expiryTime > currentTime) {
            // Token仍然有效，验证并设置用户
            const response = await fetch('http://localhost:3001/api/auth/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success && result.tokenValid) {
                setUser(result.user);

                // 设置自动刷新
                if (rememberMe && refreshTokenValue) {
                  setupTokenRefresh(expiryTime - currentTime);
                }

                console.log('✅ Token验证成功，用户已登录:', result.user.email);
              } else {
                throw new Error('Token验证失败');
              }
            } else {
              throw new Error('Token验证请求失败');
            }
          } else if (rememberMe && refreshTokenValue) {
            // Token过期但有refresh token，尝试刷新
            try {
              await refreshToken();
            } catch (error) {
              throw new Error('Token刷新失败');
            }
          } else {
            throw new Error('Token已过期');
          }
        }
      } catch (error) {
        console.error('❌ 认证检查失败:', error);
        // 清除无效的认证信息
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // 清理定时器
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const { email, password, rememberMe = false } = credentials;

    // 验证必填字段
    if (!email || !password) {
      throw new Error('邮箱和密码都是必填的');
    }

    setIsLoading(true);
    try {
      // 调用真实的登录API - 兼容简化版和完整版后端
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,           // 简化版后端使用
          identifier: email,      // 完整版后端使用
          password,
          rememberMe
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '登录失败');
      }

      // 检查登录是否成功 - 兼容两种后端格式
      if (!result.success && !result.user) {
        throw new Error(result.message || '登录失败');
      }

      // 保存token和用户信息 - 兼容简化版和完整版后端
      let token = '';
      if (result.token) {
        token = result.token;
        localStorage.setItem('auth_token', result.token);
      } else if (result.tokens?.accessToken) {
        token = result.tokens.accessToken;
        localStorage.setItem('auth_token', result.tokens.accessToken);
      }

      if (result.refreshToken) {
        localStorage.setItem('refresh_token', result.refreshToken);
      } else if (result.tokens?.refreshToken) {
        localStorage.setItem('refresh_token', result.tokens.refreshToken);
      }

      localStorage.setItem('user_data', JSON.stringify(result.user));
      localStorage.setItem('remember_me', rememberMe.toString());

      setUser(result.user);

      // 如果选择记住登录状态，设置自动刷新
      if (rememberMe && token && (result.refreshToken || result.tokens?.refreshToken)) {
        const expiryTime = parseTokenExpiry(token);
        const currentTime = Date.now();
        if (expiryTime > currentTime) {
          setupTokenRefresh(expiryTime - currentTime);
        }
      }

      console.log('✅ 登录成功:', result.user.email);

    } catch (error: any) {
      console.error('❌ 登录失败:', error);

      // 解析并设置错误
      const errorType = parseAuthError(error);
      setError(errorType);

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    const { username, email, password, confirmPassword } = data;
    setIsLoading(true);
    try {
      // 调用真实的注册API
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, confirmPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '注册失败');
      }

      // 检查是否有用户信息（表示注册成功）
      if (!result.user) {
        throw new Error(result.message || '注册失败');
      }

      // 保存token和用户信息
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
      }
      if (result.refreshToken) {
        localStorage.setItem('refresh_token', result.refreshToken);
      }
      localStorage.setItem('user_data', JSON.stringify(result.user));

      setUser(result.user);

      console.log('✅ 注册成功:', result.user.email);

    } catch (error) {
      console.error('❌ 注册失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      // 调用真实的登出API
      if (token) {
        await fetch('http://localhost:3001/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('❌ 登出API调用失败:', error);
      // 即使API调用失败，也要清除本地存储
    } finally {
      // 清除认证数据
      clearAuthData();
      console.log('✅ 用户已登出');
    }
  };

  // 添加缺失的方法
  const updateProfile = async (data: any) => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('http://localhost:3001/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '更新资料失败');
      }

      // 更新本地用户数据
      if (result.user) {
        setUser(result.user);
        localStorage.setItem('user_data', JSON.stringify(result.user));
      }

      console.log('✅ 用户资料更新成功');
    } catch (error) {
      console.error('❌ 更新用户资料失败:', error);
      throw error;
    }
  };

  const changePassword = async (data: any) => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('http://localhost:3001/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '修改密码失败');
      }

      console.log('✅ 密码修改成功');
    } catch (error) {
      console.error('❌ 修改密码失败:', error);
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '发送重置邮件失败');
      }

      console.log('✅ 重置邮件发送成功');
      return result;
    } catch (error) {
      console.error('❌ 发送重置邮件失败:', error);
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string, confirmPassword: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '重置密码失败');
      }

      console.log('✅ 密码重置成功');
      return result;
    } catch (error) {
      console.error('❌ 重置密码失败:', error);
      throw error;
    }
  };

  const sendEmailVerification = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('http://localhost:3001/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '发送验证邮件失败');
      }

      console.log('✅ 验证邮件发送成功');
      return result;
    } catch (error) {
      console.error('❌ 发送验证邮件失败:', error);
      throw error;
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '邮箱验证失败');
      }

      // 更新用户状态
      if (user) {
        const updatedUser = { ...user, emailVerified: true };
        setUser(updatedUser);
        localStorage.setItem('user_data', JSON.stringify(updatedUser));
      }

      console.log('✅ 邮箱验证成功');
      return result;
    } catch (error) {
      console.error('❌ 邮箱验证失败:', error);
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token');

      if (!refreshTokenValue) {
        throw new Error('没有刷新令牌');
      }

      const response = await fetch('http://localhost:3001/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: refreshTokenValue
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '刷新令牌失败');
      }

      // 更新存储的token
      const newToken = result.token || result.accessToken;
      localStorage.setItem('auth_token', newToken);

      if (result.refreshToken) {
        localStorage.setItem('refresh_token', result.refreshToken);
      }

      if (result.user) {
        localStorage.setItem('user_data', JSON.stringify(result.user));
        setUser(result.user);
      }

      // 设置下次自动刷新
      const rememberMe = localStorage.getItem('remember_me') === 'true';
      if (rememberMe) {
        const expiryTime = parseTokenExpiry(newToken);
        const currentTime = Date.now();
        if (expiryTime > currentTime) {
          setupTokenRefresh(expiryTime - currentTime);
        }
      }

      console.log('✅ Token刷新成功');
    } catch (error) {
      console.error('❌ Token刷新失败:', error);
      // 刷新失败，清除认证数据
      clearAuthData();
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => user?.role === role);
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
    hasPermission,
    hasRole,
    hasAnyRole,
    clearError,
    forgotPassword,
    resetPassword,
    sendEmailVerification,
    verifyEmail,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
