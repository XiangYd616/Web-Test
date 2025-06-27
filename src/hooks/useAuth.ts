import { useState, useEffect, useCallback } from 'react';
import { unifiedAuthService } from '../services/unifiedAuthService';
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  UpdateUserData,
  ChangePasswordData
} from '../types/user';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化认证状态
  useEffect(() => {
    const currentUser = unifiedAuthService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);

    // 监听认证状态变化
    const unsubscribe = unifiedAuthService.onAuthStateChange((user) => {
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
      const response = await unifiedAuthService.login(credentials);

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
      const response = await unifiedAuthService.register(data);

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
    unifiedAuthService.logout();
    setError(null);
    // unifiedAuthService.logout() 会触发 onAuthStateChange，所以不需要手动设置 user
  }, []);

  // 更新用户信息
  const updateProfile = useCallback(async (updates: UpdateUserData): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await unifiedAuthService.updateProfile(updates);

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
      const response = await unifiedAuthService.changePassword(data);

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
    return unifiedAuthService.hasPermission(permission);
  }, []);

  // 检查角色
  const hasRole = useCallback((role: string): boolean => {
    return unifiedAuthService.hasRole(role);
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 获取环境信息
  const getEnvironmentInfo = useCallback(() => {
    return unifiedAuthService.getEnvironmentInfo();
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
