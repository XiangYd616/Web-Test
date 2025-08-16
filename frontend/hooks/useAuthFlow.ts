/**
 * 认证流程相关Hook
 * 提供认证流程的状态管理和操作
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAsyncErrorHandler } from './useAsyncErrorHandler';

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const useAuthFlow = () => {
  const { login, register, logout } = useAuth();
  const { executeAsync, state } = useAsyncErrorHandler();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 验证登录表单
  const validateLoginForm = useCallback((data: LoginFormData) => {
    const errors: Record<string, string> = {};

    if (!data.email || !data.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!data.password || !data.password.trim()) {
      errors.password = '密码不能为空';
    } else if (data.password.length < 6) {
      errors.password = '密码长度至少6位';
    }

    return errors;
  }, []);

  // 验证注册表单
  const validateRegisterForm = useCallback((data: RegisterFormData) => {
    const errors: Record<string, string> = {};

    if (!data.username || !data.username.trim()) {
      errors.username = '用户名不能为空';
    } else if (data.username.length < 3) {
      errors.username = '用户名长度至少3位';
    }

    if (!data.email || !data.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!data.password || !data.password.trim()) {
      errors.password = '密码不能为空';
    } else if (data.password.length < 6) {
      errors.password = '密码长度至少6位';
    }

    if (data.password !== data.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    return errors;
  }, []);

  // 处理登录
  const handleLogin = useCallback(async (formData: LoginFormData) => {
    const errors = validateLoginForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return false;
    }

    const result = await executeAsync(
      () => login({
        username: formData.email, // 使用邮箱作为用户名
        password: formData.password
      }),
      { context: 'AuthFlow.login' }
    );

    return !!result;
  }, [login, validateLoginForm, executeAsync]);

  // 处理注册
  const handleRegister = useCallback(async (formData: RegisterFormData) => {
    const errors = validateRegisterForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return false;
    }

    const result = await executeAsync(
      () => register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      }),
      { context: 'AuthFlow.register' }
    );

    return !!result;
  }, [register, validateRegisterForm, executeAsync]);

  // 处理登出
  const handleLogout = useCallback(async () => {
    const result = await executeAsync(
      () => logout(),
      { context: 'AuthFlow.logout' }
    );

    return !!result;
  }, [logout, executeAsync]);

  return {
    // 状态
    isLoading: state.isLoading,
    error: state.error,
    formErrors,

    // 方法
    handleLogin,
    handleRegister,
    handleLogout,
    validateLoginForm,
    validateRegisterForm,
    clearFormErrors: () => setFormErrors({}),
    clearError: () => state.error && setFormErrors({})
  };
};

export default useAuthFlow;