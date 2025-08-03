import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/auth';

import type {
  AuthResponse,
  ChangePasswordData,
  LoginCredentials,
  RegisterData,
  UpdateUserData,
  User
} from '../types/user';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化认证状态
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);

    // 监听认证状态变化
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // 登录
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(credentials);

      if (!response.success) {
        setError(response.message || '登录失败');
      }

      return response;
    } catch (error: unknown) {
      const errorMessage = '登录失败，请稍后重试';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 注册
  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.register(data);

      if (!response.success) {
        setError(response.message || '注册失败');
      }

      return response;
    } catch (error: unknown) {
      const errorMessage = '注册失败，请稍后重试';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    setIsLoading(true);
    authService.logout();
    setError(null);
    // authService.logout() 会触发 onAuthStateChange，所以不需要手动设置 user
  }, []);

  // 更新用户信息
  const updateProfile = useCallback(async (updates: UpdateUserData): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.updateProfile(updates);

      if (!response.success) {
        setError(response.message || '更新失败');
      }

      return response;
    } catch (error: unknown) {
      const errorMessage = '更新失败，请稍后重试';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 修改密码
  const changePassword = useCallback(async (data: ChangePasswordData): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.changePassword(data);

      if (!response.success) {
        setError(response.message || '密码修改失败');
      }

      return response;
    } catch (error: unknown) {
      const errorMessage = '密码修改失败，请稍后重试';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 检查权限
  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(permission);
  }, []);

  // 检查角色
  const hasRole = useCallback((role: string): boolean => {
    return authService.hasRole(role);
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 获取环境信息
  const getEnvironmentInfo = useCallback(() => {
    return authService.getEnvironmentInfo();
  }, []);

  return {
    // 状态
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || hasRole('admin'),

    // 方法
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    hasPermission,
    hasRole,
    clearError,
    getEnvironmentInfo,
  };
};

export default useAuth;
