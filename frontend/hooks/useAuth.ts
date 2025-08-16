/**
 * 认证相关的自定义Hook
 * 基于全局状态管理的认证功能
 */

import {useCallback} from 'react';

// 登录凭据接口
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// 注册数据接口
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// 认证Hook
export const useAuth = () => {
  // 临时解决方案：使用默认状态而不是 AppContext
  const defaultAuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  };

  const auth = defaultAuthState;
  const dispatch = () => { }; // 临时的空 dispatch

  // 验证token
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // 登录
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_LOGIN_START' });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '登录失败');
      }

      const { user, token } = data;

      // 保存到本地存储
      if (credentials.rememberMe) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
      } else {
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('userData', JSON.stringify(user));
      }

      dispatch({
        type: 'AUTH_LOGIN_SUCCESS',
        payload: { user, token }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败';
      dispatch({
        type: 'AUTH_LOGIN_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    }
  }, [dispatch]);

  // 注册
  const register = useCallback(async (data: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_LOGIN_START' });

      if (data.password !== data.confirmPassword) {
        throw new Error('密码确认不匹配');
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || '注册失败');
      }

      // 注册成功后自动登录
      await login({
        email: data.email,
        password: data.password
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '注册失败';
      dispatch({
        type: 'AUTH_LOGIN_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    }
  }, [dispatch, login]);

  // 登出
  const logout = useCallback(async (): Promise<void> => {
    try {
      // 调用服务器登出接口
      if (auth.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 清除本地存储
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('userData');

      // 重置状态
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, [auth.token, dispatch]);

  // 更新用户信息
  const updateUser = useCallback(async (updates: Partial<User>): Promise<void> => {
    try {
      if (!auth.user || !auth.token) {
        throw new Error('用户未登录');
      }

      dispatch({ type: 'UI_SET_LOADING', payload: { key: 'auth', loading: true } });

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '更新失败');
      }

      const updatedUser = { ...auth.user, ...data.user };

      // 更新本地存储
      const storageKey = localStorage.getItem('authToken') ? 'localStorage' : 'sessionStorage';
      const storage = storageKey === 'localStorage' ? localStorage : sessionStorage;
      storage.setItem('userData', JSON.stringify(updatedUser));

      dispatch({
        type: 'AUTH_UPDATE_USER',
        payload: { user: updatedUser }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新失败';
      dispatch({
        type: 'AUTH_LOGIN_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    } finally {
      dispatch({ type: 'UI_SET_LOADING', payload: { key: 'auth', loading: false } });
    }
  }, [auth.user, auth.token, dispatch]);

  // 修改密码
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      if (!auth.token) {
        throw new Error('用户未登录');
      }

      dispatch({ type: 'UI_SET_LOADING', payload: { key: 'auth', loading: true } });

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '密码修改失败');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '密码修改失败';
      dispatch({
        type: 'AUTH_LOGIN_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    } finally {
      dispatch({ type: 'UI_SET_LOADING', payload: { key: 'auth', loading: false } });
    }
  }, [auth.token, dispatch]);

  // 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, [dispatch]);

  // 检查权限
  const hasPermission = useCallback((permission: string): boolean => {
    if (!auth.user) return false;

    // 这里可以根据实际的权限系统实现
    // 例如检查用户角色或权限列表
    const userRole = auth.user.role;

    // 简单的角色权限检查
    const rolePermissions: Record<string, string[]> = {
      'admin': ['*'], // 管理员拥有所有权限
      'user': ['read', 'test', 'export'],
      'viewer': ['read']
    };

    const permissions = rolePermissions[userRole] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }, [auth.user]);

  return {
    // 状态
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,

    // 方法
    login,
    register,
    logout,
    updateUser,
    changePassword,
    clearError,
    hasPermission
  };
};

export default useAuth;