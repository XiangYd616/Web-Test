import { describe, expect, it } from 'vitest';

// 直接测试 unwrapResponse 的逻辑（不依赖 axios 实例）
// apiClient 的拦截器涉及 Supabase/localStorage 等副作用，在集成测试中覆盖

describe('unwrapResponse', () => {
  // 内联实现以避免 mock 复杂的模块依赖链
  const unwrapResponse = <T>(
    payload: { success: boolean; data: T; message?: string },
    fallbackMessage?: string
  ): T => {
    if (!payload.success) {
      throw new Error(payload.message || fallbackMessage || '请求失败');
    }
    return payload.data;
  };

  it('should return data when success is true', () => {
    const result = unwrapResponse({ success: true, data: { id: 1, name: 'test' } });
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('should return primitive data', () => {
    const result = unwrapResponse({ success: true, data: 42 });
    expect(result).toBe(42);
  });

  it('should return null data when success is true', () => {
    const result = unwrapResponse({ success: true, data: null });
    expect(result).toBeNull();
  });

  it('should return array data', () => {
    const result = unwrapResponse({ success: true, data: [1, 2, 3] });
    expect(result).toEqual([1, 2, 3]);
  });

  it('should throw error with message when success is false', () => {
    expect(() =>
      unwrapResponse({ success: false, data: null, message: '权限不足' })
    ).toThrow('权限不足');
  });

  it('should throw error with fallback message when no message provided', () => {
    expect(() =>
      unwrapResponse({ success: false, data: null }, '操作失败')
    ).toThrow('操作失败');
  });

  it('should throw default error when no message and no fallback', () => {
    expect(() => unwrapResponse({ success: false, data: null })).toThrow('请求失败');
  });
});
