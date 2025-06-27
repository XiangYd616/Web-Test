import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: 'user' | 'admin';
  status?: string;
  emailVerified?: boolean;
  permissions?: string[];
  preferences?: any;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

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

  useEffect(() => {
    // 检查本地存储中的用户信息并验证token
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');

        if (token && userData) {
          // 验证token是否仍然有效
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
              console.log('✅ Token验证成功，用户已登录:', result.user.email);
            } else {
              throw new Error('Token验证失败');
            }
          } else {
            throw new Error('Token验证请求失败');
          }
        }
      } catch (error) {
        console.error('❌ Auth检查失败:', error);
        // 清除无效的认证信息
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('session_id');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
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
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
      } else if (result.tokens?.accessToken) {
        localStorage.setItem('auth_token', result.tokens.accessToken);
      }

      if (result.refreshToken) {
        localStorage.setItem('refresh_token', result.refreshToken);
      } else if (result.tokens?.refreshToken) {
        localStorage.setItem('refresh_token', result.tokens.refreshToken);
      }
      localStorage.setItem('user_data', JSON.stringify(result.user));

      setUser(result.user);

      console.log('✅ 登录成功:', result.user.email);

    } catch (error) {
      console.error('❌ 登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, confirmPassword: string) => {
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
      // 清除本地存储
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      setUser(null);
      console.log('✅ 用户已登出');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
