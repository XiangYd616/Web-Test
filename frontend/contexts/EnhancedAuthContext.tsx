/**
 * 增强版认证上下文
 * 提供完整的用户认证、权限管理和会话控制功能
 */

import React, { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthContextType, User, UserRole, AuthStatus } from '../types/auth';

// 认证相关接口
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthState {
  user: User | null;
  status: AuthStatus;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  roles: UserRole[];
}

// 增强的认证上下文类型
interface EnhancedAuthContextType extends AuthContextType {
  // 基础认证
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // 权限检查
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
  
  // 用户管理
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  
  // 会话管理
  extendSession: () => Promise<void>;
  getSessionInfo: () => { expiresAt: Date; isActive: boolean };
  
  // 状态
  authState: AuthState;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

export const useEnhancedAuth = () => {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

interface EnhancedAuthProviderProps {
  children: ReactNode;
}

export const EnhancedAuthProvider: React.FC<EnhancedAuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    status: AuthStatus.LOADING,
    isLoading: true,
    error: null,
    permissions: [],
    roles: []
  });

  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // 更新认证状态
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  // 设置用户信息
  const setUser = useCallback((user: User | null) => {
    if (user) {
      updateAuthState({
        user,
        status: AuthStatus.AUTHENTICATED,
        isLoading: false,
        error: null,
        permissions: user.permissions || [],
        roles: user.roles || []
      });
    } else {
      updateAuthState({
        user: null,
        status: AuthStatus.UNAUTHENTICATED,
        isLoading: false,
        permissions: [],
        roles: []
      });
    }
  }, [updateAuthState]);

  // 设置错误状态
  const setError = useCallback((error: string | null) => {
    updateAuthState({
      error,
      status: error ? AuthStatus.ERROR : authState.status,
      isLoading: false
    });
  }, [authState.status, updateAuthState]);

  // Token自动刷新
  const setupTokenRefresh = useCallback((expiresIn: number) => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    const refreshTime = Math.max(expiresIn - 5 * 60 * 1000, 60 * 1000);
    const timer = setTimeout(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('自动刷新token失败:', error);
        await logout();
      }
    }, refreshTime);

    setRefreshTimer(timer);
  }, [refreshTimer]);

  // 登录
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      updateAuthState({ isLoading: true, error: null });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error('登录失败');
      }

      const data = await response.json();
      
      // 存储token
      if (credentials.rememberMe) {
        localStorage.setItem('authToken', data.token);
      } else {
        sessionStorage.setItem('authToken', data.token);
      }

      setUser(data.user);
      
      if (data.expiresIn) {
        setupTokenRefresh(data.expiresIn);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '登录失败');
      throw error;
    }
  }, [setUser, setError, setupTokenRefresh, updateAuthState]);

  // 注册
  const register = useCallback(async (data: RegisterData) => {
    try {
      updateAuthState({ isLoading: true, error: null });
      
      if (data.password !== data.confirmPassword) {
        throw new Error('密码确认不匹配');
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('注册失败');
      }

      const result = await response.json();
      setUser(result.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : '注册失败');
      throw error;
    }
  }, [setUser, setError, updateAuthState]);

  // 登出
  const logout = useCallback(async () => {
    try {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }

      // 清除本地存储的token
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');

      // 调用后端登出接口
      await fetch('/api/auth/logout', { method: 'POST' });
      
      setUser(null);
    } catch (error) {
      console.error('登出失败:', error);
      // 即使后端调用失败，也要清除本地状态
      setUser(null);
    }
  }, [refreshTimer, setUser]);

  // 刷新token
  const refreshToken = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // 更新token
      if (localStorage.getItem('authToken')) {
        localStorage.setItem('authToken', data.token);
      } else {
        sessionStorage.setItem('authToken', data.token);
      }

      setUser(data.user);
      
      if (data.expiresIn) {
        setupTokenRefresh(data.expiresIn);
      }
    } catch (error) {
      console.error('刷新token失败:', error);
      await logout();
      throw error;
    }
  }, [setUser, setupTokenRefresh, logout]);

  // 权限检查
  const hasPermission = useCallback((permission: string) => {
    return authState.permissions.includes(permission);
  }, [authState.permissions]);

  const hasRole = useCallback((role: UserRole) => {
    return authState.roles.includes(role);
  }, [authState.roles]);

  const hasAnyRole = useCallback((roles: UserRole[]) => {
    return roles.some(role => authState.roles.includes(role));
  }, [authState.roles]);

  const hasAllRoles = useCallback((roles: UserRole[]) => {
    return roles.every(role => authState.roles.includes(role));
  }, [authState.roles]);

  // 更新用户资料
  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      updateAuthState({ isLoading: true, error: null });
      
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('更新资料失败');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (error) {
      setError(error instanceof Error ? error.message : '更新资料失败');
      throw error;
    }
  }, [setUser, setError, updateAuthState]);

  // 修改密码
  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    try {
      updateAuthState({ isLoading: true, error: null });
      
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      if (!response.ok) {
        throw new Error('修改密码失败');
      }

      updateAuthState({ isLoading: false });
    } catch (error) {
      setError(error instanceof Error ? error.message : '修改密码失败');
      throw error;
    }
  }, [setError, updateAuthState]);

  // 延长会话
  const extendSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('/api/auth/extend-session', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('延长会话失败');
      }

      const data = await response.json();
      if (data.expiresIn) {
        setupTokenRefresh(data.expiresIn);
      }
    } catch (error) {
      console.error('延长会话失败:', error);
      throw error;
    }
  }, [setupTokenRefresh]);

  // 获取会话信息
  const getSessionInfo = useCallback(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      return { expiresAt: new Date(0), isActive: false };
    }

    try {
      // 简单的JWT解析（实际项目中应该使用专门的库）
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        expiresAt: new Date(payload.exp * 1000),
        isActive: payload.exp * 1000 > Date.now()
      };
    } catch {
      return { expiresAt: new Date(0), isActive: false };
    }
  }, []);

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
          setUser(null);
          return;
        }

        // 验证token有效性
        const response = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          
          if (data.expiresIn) {
            setupTokenRefresh(data.expiresIn);
          }
        } else {
          // Token无效，清除本地存储
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          setUser(null);
        }
      } catch (error) {
        console.error('初始化认证失败:', error);
        setUser(null);
      }
    };

    initAuth();
  }, [setUser, setupTokenRefresh]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [refreshTimer]);

  const contextValue: EnhancedAuthContextType = {
    // 基础属性
    user: authState.user,
    isAuthenticated: authState.status === AuthStatus.AUTHENTICATED,
    isLoading: authState.isLoading,
    error: authState.error,
    
    // 基础方法
    login,
    register,
    logout,
    refreshToken,
    
    // 权限检查
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    
    // 用户管理
    updateProfile,
    changePassword,
    
    // 会话管理
    extendSession,
    getSessionInfo,
    
    // 状态
    authState
  };

  return (
    <EnhancedAuthContext.Provider value={contextValue}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};

export default EnhancedAuthProvider;
