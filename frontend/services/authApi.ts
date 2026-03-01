import { apiClient } from './apiClient';

type LoginPayload = {
  username: string;
  password: string;
  rememberMe?: boolean;
};

type LoginResponse = {
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
  user?: Record<string, unknown>;
};

type CurrentUserResponse = {
  user?: Record<string, unknown>;
};

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

type RegisterResponse = {
  user?: Record<string, unknown>;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
  emailVerificationRequired?: boolean;
};

/**
 * 注册
 */
export const register = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  const { data } = await apiClient.post('/auth/register', {
    username: payload.username,
    email: payload.email,
    password: payload.password,
  });
  const result = data?.data || data;
  // 邮箱验证模式下后端不返回 token，前端也不应存储
  if (result?.tokens?.accessToken && !result?.emailVerificationRequired) {
    window.localStorage.setItem('accessToken', result.tokens.accessToken);
    if (result.tokens.refreshToken) {
      window.localStorage.setItem('refreshToken', result.tokens.refreshToken);
    }
  }
  return {
    user: result?.user ?? undefined,
    tokens: result?.tokens,
    emailVerificationRequired: result?.emailVerificationRequired ?? false,
  };
};

/**
 * 登录
 */
export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const { data } = await apiClient.post('/auth/login', {
    username: payload.username,
    password: payload.password,
  });
  const result = data?.data || data;
  if (result?.tokens?.accessToken) {
    window.localStorage.setItem('accessToken', result.tokens.accessToken);
    if (result.tokens.refreshToken) {
      window.localStorage.setItem('refreshToken', result.tokens.refreshToken);
    }
  }
  return {
    user: result?.user ?? undefined,
    tokens: result?.tokens,
  };
};

/**
 * 获取当前用户
 */
export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  const stored = window.localStorage.getItem('current_user');
  if (stored) {
    try {
      return { user: JSON.parse(stored) };
    } catch {
      // ignore
    }
  }
  try {
    const { data } = await apiClient.get('/auth/me');
    const user = data?.data?.user || data?.data || null;
    if (user) {
      window.localStorage.setItem('current_user', JSON.stringify(user));
    }
    return { user: user ?? undefined };
  } catch (err) {
    console.error('[authApi] 获取当前用户失败:', err);
    return { user: undefined };
  }
};

/**
 * 登出
 */
export const logout = async () => {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('refreshToken');
  window.localStorage.removeItem('current_user');
  return {};
};
