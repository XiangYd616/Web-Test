import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock 依赖模块
vi.mock('../utils/environment', () => ({
  isDesktop: () => false,
  isLocalMode: () => true,
}));

vi.mock('./apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { apiClient } from './apiClient';
import { getCurrentUser, login, logout, register } from './authApi';

describe('authApi (local mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('login', () => {
    it('should call apiClient.post and store tokens', async () => {
      const mockResponse = {
        data: {
          data: {
            tokens: { accessToken: 'test-token', refreshToken: 'test-refresh' },
            user: { id: '1', name: 'Test User' },
          },
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await login({ username: 'test@example.com', password: 'password123' });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.tokens?.accessToken).toBe('test-token');
      expect(result.user).toEqual({ id: '1', name: 'Test User' });
      expect(window.localStorage.getItem('accessToken')).toBe('test-token');
      expect(window.localStorage.getItem('refreshToken')).toBe('test-refresh');
    });

    it('should handle login without refresh token', async () => {
      const mockResponse = {
        data: {
          data: {
            tokens: { accessToken: 'only-access' },
            user: { id: '2' },
          },
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await login({ username: 'user@test.com', password: 'pass' });

      expect(result.tokens?.accessToken).toBe('only-access');
      expect(window.localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('register', () => {
    it('should call apiClient.post and return user info', async () => {
      const mockResponse = {
        data: {
          data: {
            tokens: { accessToken: 'reg-token' },
            user: { id: '3', name: 'New User' },
            emailVerificationRequired: false,
          },
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await register({
        username: 'newuser',
        email: 'new@test.com',
        password: 'securepass',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        email: 'new@test.com',
        password: 'securepass',
      });
      expect(result.user).toEqual({ id: '3', name: 'New User' });
      expect(window.localStorage.getItem('accessToken')).toBe('reg-token');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from localStorage if available', async () => {
      const user = { id: '1', name: 'Cached User' };
      window.localStorage.setItem('current_user', JSON.stringify(user));

      const result = await getCurrentUser();

      expect(result.user).toEqual(user);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should fetch from API when localStorage is empty', async () => {
      const mockResponse = {
        data: { data: { user: { id: '2', name: 'API User' } } },
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/users/me');
      expect(result.user).toEqual({ id: '2', name: 'API User' });
    });

    it('should handle API failure gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      const result = await getCurrentUser();

      expect(result.user).toBeUndefined();
    });

    it('should handle corrupted localStorage gracefully', async () => {
      window.localStorage.setItem('current_user', '{invalid json');

      const mockResponse = {
        data: { data: { user: { id: '3' } } },
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/users/me');
      expect(result.user).toEqual({ id: '3' });
    });
  });

  describe('logout', () => {
    it('should clear localStorage tokens', async () => {
      window.localStorage.setItem('accessToken', 'token');
      window.localStorage.setItem('refreshToken', 'refresh');
      window.localStorage.setItem('current_user', '{}');

      await logout();

      expect(window.localStorage.getItem('accessToken')).toBeNull();
      expect(window.localStorage.getItem('refreshToken')).toBeNull();
      expect(window.localStorage.getItem('current_user')).toBeNull();
    });
  });
});
